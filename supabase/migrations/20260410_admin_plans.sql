create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price_amount numeric(12, 2) not null default 0,
  currency_code text not null default 'USD',
  billing_interval text not null default 'monthly',
  feature_list text[] not null default '{}'::text[],
  tour_limit integer,
  scene_limit integer,
  storage_limit_mb integer,
  share_link_limit integer,
  embed_limit integer,
  is_active boolean not null default true,
  is_visible boolean not null default true,
  is_recommended boolean not null default false,
  is_archived boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint subscription_plans_name_check check (char_length(trim(name)) > 0),
  constraint subscription_plans_price_amount_check check (price_amount >= 0),
  constraint subscription_plans_billing_interval_check check (
    billing_interval in ('monthly', 'quarterly', 'yearly', 'one_time', 'custom')
  ),
  constraint subscription_plans_tour_limit_check check (tour_limit is null or tour_limit >= 0),
  constraint subscription_plans_scene_limit_check check (scene_limit is null or scene_limit >= 0),
  constraint subscription_plans_storage_limit_check check (
    storage_limit_mb is null or storage_limit_mb >= 0
  ),
  constraint subscription_plans_share_link_limit_check check (
    share_link_limit is null or share_link_limit >= 0
  ),
  constraint subscription_plans_embed_limit_check check (
    embed_limit is null or embed_limit >= 0
  )
);

alter table if exists public.subscription_plans
  add column if not exists share_link_limit integer;

alter table if exists public.subscription_plans
  add column if not exists embed_limit integer;

create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id uuid not null references public.subscription_plans (id) on delete restrict,
  status text not null default 'active',
  started_at timestamptz not null default timezone('utc', now()),
  ends_at timestamptz,
  is_current boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_subscriptions_status_check check (
    status in ('trialing', 'active', 'past_due', 'canceled', 'expired')
  ),
  constraint user_subscriptions_date_check check (ends_at is null or ends_at >= started_at)
);

create index if not exists subscription_plans_sort_idx
  on public.subscription_plans (is_archived, sort_order, price_amount);

create unique index if not exists user_subscriptions_current_user_idx
  on public.user_subscriptions (user_id)
  where is_current = true;

create index if not exists user_subscriptions_plan_idx
  on public.user_subscriptions (plan_id);

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

drop trigger if exists set_subscription_plans_updated_at on public.subscription_plans;
create trigger set_subscription_plans_updated_at
before update on public.subscription_plans
for each row
execute function public.set_updated_at_timestamp();

drop trigger if exists set_user_subscriptions_updated_at on public.user_subscriptions;
create trigger set_user_subscriptions_updated_at
before update on public.user_subscriptions
for each row
execute function public.set_updated_at_timestamp();

drop function if exists public.admin_get_plans();

create or replace function public.admin_get_plans()
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
  is_active boolean,
  is_visible boolean,
  is_recommended boolean,
  is_archived boolean,
  sort_order integer,
  member_count bigint,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.admin_require('plans.read');

  return query
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
    p.is_active,
    p.is_visible,
    p.is_recommended,
    p.is_archived,
    p.sort_order,
    coalesce((
      select count(*)::bigint
      from public.user_subscriptions s
      where s.plan_id = p.id
        and s.is_current = true
        and s.status in ('trialing', 'active', 'past_due')
    ), 0),
    p.created_at,
    p.updated_at
  from public.subscription_plans p
  order by p.is_archived asc, p.sort_order asc, p.price_amount asc, lower(p.name) asc;
end;
$$;

drop function if exists public.admin_save_plan(
  uuid,
  text,
  text,
  numeric,
  text,
  text,
  text[],
  integer,
  integer,
  integer,
  integer,
  integer,
  boolean,
  boolean,
  boolean,
  integer
);

create or replace function public.admin_save_plan(
  target_plan_id uuid default null,
  plan_name text default null,
  plan_description text default null,
  plan_price_amount numeric default 0,
  plan_currency_code text default 'USD',
  plan_billing_interval text default 'monthly',
  plan_feature_list text[] default null,
  plan_tour_limit integer default null,
  plan_scene_limit integer default null,
  plan_storage_limit_mb integer default null,
  plan_share_link_limit integer default null,
  plan_embed_limit integer default null,
  plan_is_active boolean default true,
  plan_is_visible boolean default true,
  plan_is_recommended boolean default false,
  plan_sort_order integer default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_name text := nullif(trim(plan_name), '');
  normalized_description text := nullif(trim(plan_description), '');
  normalized_currency text := upper(coalesce(nullif(trim(plan_currency_code), ''), 'USD'));
  normalized_interval text := coalesce(nullif(trim(plan_billing_interval), ''), 'monthly');
  normalized_features text[] := coalesce((
    select array_agg(trim(feature))
    from unnest(coalesce(plan_feature_list, array[]::text[])) feature
    where nullif(trim(feature), '') is not null
  ), array[]::text[]);
  saved_plan_id uuid;
begin
  perform public.admin_require('plans.manage');

  if normalized_name is null then
    raise exception 'Please enter a plan name.';
  end if;

  if normalized_interval not in ('monthly', 'quarterly', 'yearly', 'one_time', 'custom') then
    raise exception 'Please choose a valid billing interval.';
  end if;

  if plan_price_amount < 0 then
    raise exception 'Price cannot be below zero.';
  end if;

  if plan_tour_limit is not null and plan_tour_limit < 0 then
    raise exception 'Tour limit cannot be below zero.';
  end if;

  if plan_scene_limit is not null and plan_scene_limit < 0 then
    raise exception 'Scene limit cannot be below zero.';
  end if;

  if plan_storage_limit_mb is not null and plan_storage_limit_mb < 0 then
    raise exception 'Storage limit cannot be below zero.';
  end if;

  if plan_share_link_limit is not null and plan_share_link_limit < 0 then
    raise exception 'Share link limit cannot be below zero.';
  end if;

  if plan_embed_limit is not null and plan_embed_limit < 0 then
    raise exception 'Embed limit cannot be below zero.';
  end if;

  if target_plan_id is null then
    insert into public.subscription_plans (
      name,
      description,
      price_amount,
      currency_code,
      billing_interval,
      feature_list,
      tour_limit,
      scene_limit,
      storage_limit_mb,
      share_link_limit,
      embed_limit,
      is_active,
      is_visible,
      is_recommended,
      sort_order
    )
    values (
      normalized_name,
      normalized_description,
      plan_price_amount,
      normalized_currency,
      normalized_interval,
      normalized_features,
      plan_tour_limit,
      plan_scene_limit,
      plan_storage_limit_mb,
      plan_share_link_limit,
      plan_embed_limit,
      coalesce(plan_is_active, true),
      coalesce(plan_is_visible, true),
      coalesce(plan_is_recommended, false),
      coalesce(plan_sort_order, 0)
    )
    returning id into saved_plan_id;
  else
    update public.subscription_plans
    set
      name = normalized_name,
      description = normalized_description,
      price_amount = plan_price_amount,
      currency_code = normalized_currency,
      billing_interval = normalized_interval,
      feature_list = normalized_features,
      tour_limit = plan_tour_limit,
      scene_limit = plan_scene_limit,
      storage_limit_mb = plan_storage_limit_mb,
      share_link_limit = plan_share_link_limit,
      embed_limit = plan_embed_limit,
      is_active = coalesce(plan_is_active, true),
      is_visible = coalesce(plan_is_visible, true),
      is_recommended = coalesce(plan_is_recommended, false),
      sort_order = coalesce(plan_sort_order, 0)
    where id = target_plan_id
    returning id into saved_plan_id;

    if saved_plan_id is null then
      raise exception 'Plan not found.';
    end if;
  end if;

  if coalesce(plan_is_recommended, false) then
    update public.subscription_plans
    set is_recommended = false
    where id <> saved_plan_id;

    update public.subscription_plans
    set is_recommended = true
    where id = saved_plan_id;
  end if;

  return saved_plan_id;
end;
$$;

drop function if exists public.admin_set_plan_archived(uuid, boolean);

create or replace function public.admin_set_plan_archived(
  target_plan_id uuid,
  next_is_archived boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rows_updated integer;
begin
  perform public.admin_require('plans.manage');

  update public.subscription_plans
  set
    is_archived = next_is_archived,
    is_active = case when next_is_archived then false else is_active end,
    is_visible = case when next_is_archived then false else is_visible end,
    is_recommended = case when next_is_archived then false else is_recommended end
  where id = target_plan_id;

  get diagnostics rows_updated = row_count;

  if rows_updated = 0 then
    raise exception 'Plan not found.';
  end if;
end;
$$;

grant execute on function public.admin_get_plans() to authenticated;
grant execute on function public.admin_save_plan(
  uuid,
  text,
  text,
  numeric,
  text,
  text,
  text[],
  integer,
  integer,
  integer,
  integer,
  integer,
  boolean,
  boolean,
  boolean,
  integer
) to authenticated;
grant execute on function public.admin_set_plan_archived(uuid, boolean) to authenticated;
