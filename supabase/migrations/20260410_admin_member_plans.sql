drop function if exists public.admin_get_profiles();

create or replace function public.admin_get_profiles()
returns table (
  id uuid,
  full_name text,
  email text,
  is_admin boolean,
  admin_role text,
  admin_permissions text[],
  current_plan_id text,
  current_plan_name text,
  current_plan_source text,
  assigned_plan_id text,
  assigned_plan_name text,
  subscription_status text,
  subscription_started_at timestamptz,
  subscription_ends_at timestamptz
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
    p.admin_permissions,
    resolved.plan_id,
    resolved.plan_name,
    case
      when resolved.plan_id is null then 'none'
      when assigned.plan_id is not null and assigned.plan_id::text = resolved.plan_id then 'assigned'
      else 'default'
    end::text,
    assigned.plan_id::text,
    assigned.plan_name::text,
    assigned.status::text,
    assigned.started_at,
    assigned.ends_at
  from auth.users users
  left join public.profiles p on p.id = users.id
  left join lateral (
    select
      s.plan_id,
      plan.name as plan_name,
      s.status,
      s.started_at,
      s.ends_at
    from public.user_subscriptions s
    join public.subscription_plans plan on plan.id = s.plan_id
    where s.user_id = users.id
      and s.is_current = true
    order by s.created_at desc
    limit 1
  ) assigned on true
  left join lateral (
    select
      resolved_plan.id::text as plan_id,
      resolved_plan.name::text as plan_name
    from public.member_resolved_plan(users.id) resolved_plan
  ) resolved on true
  order by coalesce(
    nullif(trim(p.full_name), ''),
    nullif(trim(users.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(users.email, '@', 1), ''),
    users.id::text
  );
end;
$$;

drop function if exists public.admin_set_user_subscription(uuid, uuid, text, timestamptz);

create or replace function public.admin_set_user_subscription(
  target_user_id uuid,
  target_plan_id uuid default null,
  target_status text default 'active',
  target_ends_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_status text := coalesce(nullif(trim(target_status), ''), 'active');
  user_exists boolean := false;
begin
  perform public.admin_require('plans.manage');

  select exists(select 1 from auth.users where id = target_user_id)
  into user_exists;

  if not user_exists then
    raise exception 'Member not found.';
  end if;

  if normalized_status not in ('trialing', 'active', 'past_due', 'canceled', 'expired') then
    raise exception 'Please choose a valid plan status.';
  end if;

  if target_plan_id is not null then
    if not exists(
      select 1
      from public.subscription_plans plan
      where plan.id = target_plan_id
        and plan.is_archived = false
        and plan.is_active = true
    ) then
      raise exception 'Please choose a live plan before assigning it.';
    end if;
  end if;

  update public.user_subscriptions
  set
    is_current = false,
    updated_at = timezone('utc', now())
  where user_id = target_user_id
    and is_current = true;

  if target_plan_id is null then
    return;
  end if;

  insert into public.user_subscriptions (
    user_id,
    plan_id,
    status,
    started_at,
    ends_at,
    is_current
  )
  values (
    target_user_id,
    target_plan_id,
    normalized_status,
    timezone('utc', now()),
    target_ends_at,
    true
  );
end;
$$;

grant execute on function public.admin_get_profiles() to authenticated;
grant execute on function public.admin_set_user_subscription(uuid, uuid, text, timestamptz) to authenticated;
