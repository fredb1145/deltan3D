drop function if exists public.public_get_visible_plans();

create or replace function public.public_get_visible_plans()
returns table (
  id text,
  name text,
  description text,
  price_amount numeric,
  currency_code text,
  billing_interval text,
  feature_list text[],
  tour_limit integer,
  scene_limit integer,
  storage_limit_mb integer,
  share_link_limit integer,
  embed_limit integer,
  is_recommended boolean,
  sort_order integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id::text,
    p.name::text,
    p.description::text,
    p.price_amount,
    p.currency_code::text,
    p.billing_interval::text,
    coalesce(p.feature_list, array[]::text[]),
    p.tour_limit,
    p.scene_limit,
    p.storage_limit_mb,
    p.share_link_limit,
    p.embed_limit,
    p.is_recommended,
    p.sort_order
  from public.subscription_plans p
  where p.is_archived = false
    and p.is_active = true
    and p.is_visible = true
  order by p.is_recommended desc, p.sort_order asc, p.price_amount asc, lower(p.name) asc
$$;

drop function if exists public.member_get_current_plan_overview();

create or replace function public.member_get_current_plan_overview()
returns table (
  current_plan_id text,
  current_plan_name text,
  current_plan_source text,
  subscription_status text,
  subscription_started_at timestamptz,
  subscription_ends_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  target_user_id uuid := auth.uid();
  resolved_plan public.subscription_plans%rowtype;
  assigned_plan_id uuid;
  assigned_plan_name text;
  assigned_status text;
  assigned_started_at timestamptz;
  assigned_ends_at timestamptz;
begin
  if target_user_id is null then
    return;
  end if;

  select
    s.plan_id,
    p.name,
    s.status,
    s.started_at,
    s.ends_at
  into
    assigned_plan_id,
    assigned_plan_name,
    assigned_status,
    assigned_started_at,
    assigned_ends_at
  from public.user_subscriptions s
  join public.subscription_plans p on p.id = s.plan_id
  where s.user_id = target_user_id
    and s.is_current = true
  order by s.created_at desc
  limit 1;

  resolved_plan := public.member_resolved_plan(target_user_id);

  return query
  select
    resolved_plan.id::text,
    resolved_plan.name::text,
    case
      when resolved_plan.id is null then 'none'
      when assigned_plan_id is not null and assigned_plan_id = resolved_plan.id then 'assigned'
      else 'default'
    end::text,
    assigned_status,
    assigned_started_at,
    assigned_ends_at;
end;
$$;

drop function if exists public.member_select_plan(uuid);

create or replace function public.member_select_plan(target_plan_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid := auth.uid();
begin
  if target_user_id is null then
    raise exception 'Please sign in again.';
  end if;

  if target_plan_id is not null then
    if not exists(
      select 1
      from public.subscription_plans p
      where p.id = target_plan_id
        and p.is_archived = false
        and p.is_active = true
        and p.is_visible = true
    ) then
      raise exception 'Please choose a live plan before continuing.';
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
    is_current
  )
  values (
    target_user_id,
    target_plan_id,
    'active',
    timezone('utc', now()),
    true
  );
end;
$$;

grant execute on function public.public_get_visible_plans() to anon;
grant execute on function public.public_get_visible_plans() to authenticated;
grant execute on function public.member_get_current_plan_overview() to authenticated;
grant execute on function public.member_select_plan(uuid) to authenticated;
