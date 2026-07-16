alter table if exists public.profiles
  add column if not exists is_admin boolean default false;

alter table if exists public.profiles
  add column if not exists admin_role text;

alter table if exists public.profiles
  add column if not exists admin_permissions text[];

update public.profiles
set admin_role = 'super_admin'
where coalesce(is_admin, false) = true
  and admin_role is null
  and coalesce(array_length(admin_permissions, 1), 0) = 0;

create or replace function public.admin_resolved_permissions(
  profile_is_admin boolean,
  profile_admin_role text,
  profile_admin_permissions text[]
)
returns text[]
language sql
immutable
set search_path = public
as $$
  select case
    when coalesce(profile_is_admin, false) is not true then array[]::text[]
    when coalesce(array_length(profile_admin_permissions, 1), 0) > 0 then profile_admin_permissions
    when profile_admin_role is null or profile_admin_role = 'super_admin' then array[
      'users.read',
      'users.manage',
      'tours.read',
      'tours.manage',
      'plans.read',
      'plans.manage',
      'analytics.read',
      'admins.manage',
      'overview.read'
    ]::text[]
    when profile_admin_role = 'user_admin' then array[
      'users.read',
      'users.manage',
      'overview.read'
    ]::text[]
    when profile_admin_role = 'subscription_admin' then array[
      'plans.read',
      'plans.manage',
      'overview.read'
    ]::text[]
    when profile_admin_role = 'analytics_admin' then array[
      'analytics.read',
      'overview.read'
    ]::text[]
    else array[]::text[]
  end
$$;

create or replace function public.admin_current_permissions()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select public.admin_resolved_permissions(
    p.is_admin,
    p.admin_role,
    p.admin_permissions
  )
  from public.profiles p
  where p.id = auth.uid()
$$;

create or replace function public.admin_require(required_permission text)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  current_permissions text[] := coalesce(public.admin_current_permissions(), array[]::text[]);
begin
  if auth.uid() is null then
    raise exception 'Please sign in again.';
  end if;

  if not (required_permission = any(current_permissions)) then
    raise exception 'You do not have access to this admin area.';
  end if;
end;
$$;

create or replace function public.handle_new_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(new.email, '@', 1), ''),
      'User'
    )
  )
  on conflict (id) do update
  set full_name = coalesce(
    nullif(trim(public.profiles.full_name), ''),
    excluded.full_name
  );

  return new;
end;
$$;

insert into public.profiles (id, full_name)
select
  users.id,
  coalesce(
    nullif(trim(users.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(users.email, '@', 1), ''),
    'User'
  )
from auth.users as users
on conflict (id) do update
set full_name = coalesce(
  nullif(trim(public.profiles.full_name), ''),
  excluded.full_name
);

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_profile();

drop function if exists public.admin_get_stats();

create or replace function public.admin_get_stats()
returns table (
  total_users bigint,
  total_admins bigint,
  total_tours bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.admin_require('overview.read');

  return query
  select
    (select count(*) from auth.users),
    (select count(*) from public.profiles where coalesce(is_admin, false) = true),
    (select count(*) from public.tours);
end;
$$;

drop function if exists public.admin_get_profiles();

create or replace function public.admin_get_profiles()
returns table (
  id uuid,
  full_name text,
  email text,
  is_admin boolean,
  admin_role text,
  admin_permissions text[]
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.admin_require('users.read');

  return query
  select
    users.id,
    coalesce(
      nullif(trim(p.full_name), ''),
      nullif(trim(users.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(users.email, '@', 1), ''),
      'User'
    )::text,
    users.email::text,
    coalesce(p.is_admin, false),
    p.admin_role,
    p.admin_permissions
  from auth.users users
  left join public.profiles p on p.id = users.id
  order by coalesce(
    nullif(trim(p.full_name), ''),
    nullif(trim(users.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(users.email, '@', 1), ''),
    users.id::text
  );
end;
$$;

drop function if exists public.admin_get_tours();

create or replace function public.admin_get_tours()
returns table (
  id text,
  user_id text,
  owner_full_name text,
  owner_email text,
  title text,
  location text,
  scenes integer,
  nodes jsonb,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.admin_require('tours.read');

  return query
  select
    t.id::text,
    t.user_id::text,
    p.full_name::text,
    users.email::text,
    t.title::text,
    t.location::text,
    coalesce(t.scenes, 0)::integer,
    case
      when t.nodes is null then '[]'::jsonb
      else to_jsonb(t.nodes)
    end,
    t.created_at::timestamptz
  from public.tours t
  left join public.profiles p on p.id::text = t.user_id::text
  left join auth.users users on users.id::text = t.user_id::text
  order by t.created_at desc nulls last;
end;
$$;

create or replace function public.admin_set_profile_access(
  target_profile_id uuid,
  target_is_admin boolean,
  target_admin_role text default null,
  target_admin_permissions text[] default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_role text;
  normalized_permissions text[];
  rows_updated integer;
begin
  perform public.admin_require('admins.manage');

  if auth.uid() = target_profile_id then
    raise exception 'Your own admin access stays protected here.';
  end if;

  normalized_role := case
    when target_is_admin then coalesce(nullif(trim(target_admin_role), ''), 'user_admin')
    else null
  end;

  if target_is_admin and normalized_role not in (
    'super_admin',
    'user_admin',
    'subscription_admin',
    'analytics_admin',
    'custom'
  ) then
    raise exception 'Invalid admin role.';
  end if;

  normalized_permissions := case
    when target_is_admin and normalized_role = 'custom' then coalesce(target_admin_permissions, array[]::text[])
    else null
  end;

  update public.profiles
  set
    is_admin = target_is_admin,
    admin_role = normalized_role,
    admin_permissions = normalized_permissions
  where id = target_profile_id;

  get diagnostics rows_updated = row_count;

  if rows_updated = 0 then
    raise exception 'Member not found.';
  end if;
end;
$$;

create or replace function public.admin_delete_tour(
  target_tour_id uuid,
  stored_paths text[] default null
)
returns void
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  rows_deleted integer;
begin
  perform public.admin_require('tours.manage');

  if coalesce(array_length(stored_paths, 1), 0) > 0 then
    delete from storage.objects
    where bucket_id = 'tour-panoramas'
      and name = any(stored_paths);
  end if;

  delete from public.tours
  where id = target_tour_id;

  get diagnostics rows_deleted = row_count;

  if rows_deleted = 0 then
    raise exception 'Could not delete this tour.';
  end if;
end;
$$;

grant execute on function public.admin_get_stats() to authenticated;
grant execute on function public.admin_get_profiles() to authenticated;
grant execute on function public.admin_get_tours() to authenticated;
grant execute on function public.admin_set_profile_access(uuid, boolean, text, text[]) to authenticated;
grant execute on function public.admin_delete_tour(uuid, text[]) to authenticated;
