create table if not exists public.tour_share_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tour_id uuid not null references public.tours (id) on delete cascade,
  label text,
  token text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tour_embeds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tour_id uuid not null references public.tours (id) on delete cascade,
  name text,
  embed_key text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists tour_share_links_user_idx
  on public.tour_share_links (user_id, is_active);

create index if not exists tour_embeds_user_idx
  on public.tour_embeds (user_id, is_active);

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_tour_share_links_updated_at on public.tour_share_links;
create trigger set_tour_share_links_updated_at
before update on public.tour_share_links
for each row
execute function public.set_updated_at_timestamp();

drop trigger if exists set_tour_embeds_updated_at on public.tour_embeds;
create trigger set_tour_embeds_updated_at
before update on public.tour_embeds
for each row
execute function public.set_updated_at_timestamp();

create or replace function public.member_is_admin_user(target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select p.is_admin
    from public.profiles p
    where p.id = target_user_id
  ), false)
$$;

drop function if exists public.member_resolved_plan(uuid);

create or replace function public.member_resolved_plan(target_user_id uuid default auth.uid())
returns public.subscription_plans
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  resolved_plan public.subscription_plans%rowtype;
begin
  select p.*
  into resolved_plan
  from public.user_subscriptions s
  join public.subscription_plans p on p.id = s.plan_id
  where s.user_id = target_user_id
    and s.is_current = true
    and s.status in ('trialing', 'active', 'past_due')
    and p.is_archived = false
    and p.is_active = true
  order by s.created_at desc
  limit 1;

  if resolved_plan.id is not null then
    return resolved_plan;
  end if;

  select p.*
  into resolved_plan
  from public.subscription_plans p
  where p.is_archived = false
    and p.is_active = true
    and p.is_visible = true
  order by p.price_amount asc, p.sort_order asc, lower(p.name) asc
  limit 1;

  return resolved_plan;
end;
$$;

drop function if exists public.member_calculate_nodes_storage_bytes(jsonb);

create or replace function public.member_calculate_nodes_storage_bytes(target_nodes jsonb)
returns bigint
language sql
stable
security definer
set search_path = public, storage
as $$
  with node_paths as (
    select distinct trim(path_value) as path_value
    from (
      select node ->> 'imagePath' as path_value
      from jsonb_array_elements(coalesce(target_nodes, '[]'::jsonb)) node
      union all
      select node ->> 'previewPath' as path_value
      from jsonb_array_elements(coalesce(target_nodes, '[]'::jsonb)) node
    ) raw_paths
    where nullif(trim(path_value), '') is not null
  )
  select coalesce(sum(coalesce((o.metadata ->> 'size')::bigint, 0)), 0)
  from node_paths p
  left join storage.objects o
    on o.bucket_id = 'tour-panoramas'
   and o.name = p.path_value
$$;

drop function if exists public.member_current_storage_bytes(uuid, uuid);

create or replace function public.member_current_storage_bytes(
  target_user_id uuid default auth.uid(),
  excluding_tour_id uuid default null
)
returns bigint
language sql
stable
security definer
set search_path = public, storage
as $$
  with user_paths as (
    select distinct trim(path_value) as path_value
    from public.tours t
    cross join lateral (
      select node ->> 'imagePath' as path_value
      from jsonb_array_elements(coalesce(t.nodes::jsonb, '[]'::jsonb)) node
      union all
      select node ->> 'previewPath' as path_value
      from jsonb_array_elements(coalesce(t.nodes::jsonb, '[]'::jsonb)) node
    ) raw_paths
    where t.user_id = target_user_id
      and (excluding_tour_id is null or t.id <> excluding_tour_id)
      and nullif(trim(path_value), '') is not null
  )
  select coalesce(sum(coalesce((o.metadata ->> 'size')::bigint, 0)), 0)
  from user_paths p
  left join storage.objects o
    on o.bucket_id = 'tour-panoramas'
   and o.name = p.path_value
$$;

drop function if exists public.member_create_tour(text, text, integer);

create or replace function public.member_create_tour(
  tour_title text,
  tour_location text,
  requested_scene_count integer default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid := auth.uid();
  normalized_title text := nullif(trim(tour_title), '');
  normalized_location text := nullif(trim(tour_location), '');
  resolved_plan public.subscription_plans%rowtype;
  current_tour_count integer;
  created_tour_id uuid;
begin
  if target_user_id is null then
    raise exception 'Please sign in again.';
  end if;

  if normalized_title is null or normalized_location is null then
    raise exception 'Please enter the tour name and location.';
  end if;

  if public.member_is_admin_user(target_user_id) then
    insert into public.tours (user_id, title, location, scenes, nodes)
    values (target_user_id, normalized_title, normalized_location, 0, '[]'::jsonb)
    returning id into created_tour_id;

    return created_tour_id;
  end if;

  resolved_plan := public.member_resolved_plan(target_user_id);

  if resolved_plan.id is null then
    raise exception 'A live plan must be available before new tours can be created.';
  end if;

  if resolved_plan.tour_limit is not null then
    select count(*)
    into current_tour_count
    from public.tours t
    where t.user_id = target_user_id;

    if current_tour_count >= resolved_plan.tour_limit then
      raise exception 'Your current plan has reached its tour limit.';
    end if;
  end if;

  if resolved_plan.scene_limit is not null
    and coalesce(requested_scene_count, 0) > resolved_plan.scene_limit then
    raise exception 'Your current plan does not allow that many scenes in one tour.';
  end if;

  insert into public.tours (user_id, title, location, scenes, nodes)
  values (target_user_id, normalized_title, normalized_location, 0, '[]'::jsonb)
  returning id into created_tour_id;

  return created_tour_id;
end;
$$;

drop function if exists public.member_save_tour_content(uuid, text, text, jsonb);

create or replace function public.member_save_tour_content(
  target_tour_id uuid,
  tour_title text,
  tour_location text,
  tour_nodes jsonb default '[]'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  target_user_id uuid := auth.uid();
  normalized_title text := nullif(trim(tour_title), '');
  normalized_location text := nullif(trim(tour_location), '');
  resolved_plan public.subscription_plans%rowtype;
  existing_tour_user_id uuid;
  scene_count integer := jsonb_array_length(coalesce(tour_nodes, '[]'::jsonb));
  new_storage_bytes bigint := public.member_calculate_nodes_storage_bytes(tour_nodes);
  current_storage_bytes bigint := public.member_current_storage_bytes(target_user_id, target_tour_id);
  storage_limit_bytes bigint;
begin
  if target_user_id is null then
    raise exception 'Please sign in again.';
  end if;

  if normalized_title is null or normalized_location is null then
    raise exception 'Please enter the tour name and location.';
  end if;

  select t.user_id
  into existing_tour_user_id
  from public.tours t
  where t.id = target_tour_id;

  if existing_tour_user_id is null then
    raise exception 'This tour could not be found.';
  end if;

  if existing_tour_user_id <> target_user_id then
    raise exception 'You do not have access to update this tour.';
  end if;

  if public.member_is_admin_user(target_user_id) then
    update public.tours
    set
      title = normalized_title,
      location = normalized_location,
      scenes = scene_count,
      nodes = coalesce(tour_nodes, '[]'::jsonb)
    where id = target_tour_id;

    return;
  end if;

  resolved_plan := public.member_resolved_plan(target_user_id);

  if resolved_plan.id is null then
    raise exception 'A live plan must be available before this tour can be saved.';
  end if;

  if resolved_plan.scene_limit is not null and scene_count > resolved_plan.scene_limit then
    raise exception 'Your current plan does not allow that many scenes in one tour.';
  end if;

  if resolved_plan.storage_limit_mb is not null then
    storage_limit_bytes := resolved_plan.storage_limit_mb::bigint * 1024 * 1024;

    if current_storage_bytes + new_storage_bytes > storage_limit_bytes then
      raise exception 'This plan does not have enough storage left for these 360 photos.';
    end if;
  end if;

  update public.tours
  set
    title = normalized_title,
    location = normalized_location,
    scenes = scene_count,
    nodes = coalesce(tour_nodes, '[]'::jsonb)
  where id = target_tour_id;
end;
$$;

drop function if exists public.member_create_share_link(uuid, text);

create or replace function public.member_create_share_link(
  target_tour_id uuid,
  link_label text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid := auth.uid();
  resolved_plan public.subscription_plans%rowtype;
  active_count integer;
  link_token text := replace(gen_random_uuid()::text, '-', '');
  existing_owner uuid;
begin
  if target_user_id is null then
    raise exception 'Please sign in again.';
  end if;

  select t.user_id into existing_owner
  from public.tours t
  where t.id = target_tour_id;

  if existing_owner is null then
    raise exception 'This tour could not be found.';
  end if;

  if existing_owner <> target_user_id then
    raise exception 'You do not have access to share this tour.';
  end if;

  if not public.member_is_admin_user(target_user_id) then
    resolved_plan := public.member_resolved_plan(target_user_id);

    if resolved_plan.id is null then
      raise exception 'A live plan must be available before share links can be created.';
    end if;

    if resolved_plan.share_link_limit is not null then
      select count(*)
      into active_count
      from public.tour_share_links l
      where l.user_id = target_user_id
        and l.is_active = true;

      if active_count >= resolved_plan.share_link_limit then
        raise exception 'Your current plan has reached its share link limit.';
      end if;
    end if;
  end if;

  insert into public.tour_share_links (user_id, tour_id, label, token)
  values (target_user_id, target_tour_id, nullif(trim(link_label), ''), link_token);

  return link_token;
end;
$$;

drop function if exists public.member_create_tour_embed(uuid, text);

create or replace function public.member_create_tour_embed(
  target_tour_id uuid,
  embed_name text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid := auth.uid();
  resolved_plan public.subscription_plans%rowtype;
  active_count integer;
  next_embed_key text := replace(gen_random_uuid()::text, '-', '');
  existing_owner uuid;
begin
  if target_user_id is null then
    raise exception 'Please sign in again.';
  end if;

  select t.user_id into existing_owner
  from public.tours t
  where t.id = target_tour_id;

  if existing_owner is null then
    raise exception 'This tour could not be found.';
  end if;

  if existing_owner <> target_user_id then
    raise exception 'You do not have access to embed this tour.';
  end if;

  if not public.member_is_admin_user(target_user_id) then
    resolved_plan := public.member_resolved_plan(target_user_id);

    if resolved_plan.id is null then
      raise exception 'A live plan must be available before embeds can be created.';
    end if;

    if resolved_plan.embed_limit is not null then
      select count(*)
      into active_count
      from public.tour_embeds e
      where e.user_id = target_user_id
        and e.is_active = true;

      if active_count >= resolved_plan.embed_limit then
        raise exception 'Your current plan has reached its embed limit.';
      end if;
    end if;
  end if;

  insert into public.tour_embeds (user_id, tour_id, name, embed_key)
  values (target_user_id, target_tour_id, nullif(trim(embed_name), ''), next_embed_key);

  return next_embed_key;
end;
$$;

grant execute on function public.member_is_admin_user(uuid) to authenticated;
grant execute on function public.member_resolved_plan(uuid) to authenticated;
grant execute on function public.member_calculate_nodes_storage_bytes(jsonb) to authenticated;
grant execute on function public.member_current_storage_bytes(uuid, uuid) to authenticated;
grant execute on function public.member_create_tour(text, text, integer) to authenticated;
grant execute on function public.member_save_tour_content(uuid, text, text, jsonb) to authenticated;
grant execute on function public.member_create_share_link(uuid, text) to authenticated;
grant execute on function public.member_create_tour_embed(uuid, text) to authenticated;
