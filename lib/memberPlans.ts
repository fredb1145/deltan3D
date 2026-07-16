import type {
  AdminPlanBillingInterval,
  AdminSubscriptionStatus,
} from './admin/types';
import { supabase } from './supabase';

export type VisiblePlanListItem = {
  id: string;
  name: string | null;
  description: string | null;
  price_amount: number | null;
  currency_code: string | null;
  billing_interval: AdminPlanBillingInterval | string | null;
  feature_list: string[] | null;
  tour_limit: number | null;
  scene_limit: number | null;
  storage_limit_mb: number | null;
  share_link_limit: number | null;
  embed_limit: number | null;
  is_recommended: boolean | null;
  sort_order: number | null;
};

export type MemberCurrentPlanOverview = {
  current_plan_id: string | null;
  current_plan_name: string | null;
  current_plan_source: 'assigned' | 'default' | 'none' | string | null;
  subscription_status: AdminSubscriptionStatus | string | null;
  subscription_started_at: string | null;
  subscription_ends_at: string | null;
};

function normalizePlanRows(rows: Array<Record<string, unknown>>): VisiblePlanListItem[] {
  return rows.map(row => ({
    id: String(row.id ?? ''),
    name: typeof row.name === 'string' ? row.name : null,
    description: typeof row.description === 'string' ? row.description : null,
    price_amount:
      typeof row.price_amount === 'number'
        ? row.price_amount
        : typeof row.price_amount === 'string'
          ? Number(row.price_amount)
          : null,
    currency_code: typeof row.currency_code === 'string' ? row.currency_code : null,
    billing_interval:
      typeof row.billing_interval === 'string' ? row.billing_interval : null,
    feature_list: Array.isArray(row.feature_list)
      ? row.feature_list.filter(item => typeof item === 'string')
      : null,
    tour_limit: typeof row.tour_limit === 'number' ? row.tour_limit : null,
    scene_limit: typeof row.scene_limit === 'number' ? row.scene_limit : null,
    storage_limit_mb:
      typeof row.storage_limit_mb === 'number' ? row.storage_limit_mb : null,
    share_link_limit:
      typeof row.share_link_limit === 'number' ? row.share_link_limit : null,
    embed_limit: typeof row.embed_limit === 'number' ? row.embed_limit : null,
    is_recommended:
      typeof row.is_recommended === 'boolean' ? row.is_recommended : null,
    sort_order: typeof row.sort_order === 'number' ? row.sort_order : null,
  }));
}

export async function getVisiblePlans(): Promise<VisiblePlanListItem[]> {
  const { data, error } = await supabase.rpc('public_get_visible_plans');

  if (error) {
    throw new Error(error.message || 'We could not load the available plans right now.');
  }

  return normalizePlanRows((data as Array<Record<string, unknown>>) || []);
}

export async function getCurrentMemberPlan(): Promise<MemberCurrentPlanOverview | null> {
  const { data: sessionData } = await supabase.auth.getSession();

  if (!sessionData.session) {
    return null;
  }

  const { data, error } = await supabase.rpc('member_get_current_plan_overview');

  if (error) {
    throw new Error(error.message || 'We could not load your current plan right now.');
  }

  const row = Array.isArray(data) ? data[0] : null;

  if (!row || typeof row !== 'object') {
    return null;
  }

  return {
    current_plan_id:
      typeof row.current_plan_id === 'string' ? row.current_plan_id : null,
    current_plan_name:
      typeof row.current_plan_name === 'string' ? row.current_plan_name : null,
    current_plan_source:
      typeof row.current_plan_source === 'string' ? row.current_plan_source : null,
    subscription_status:
      typeof row.subscription_status === 'string' ? row.subscription_status : null,
    subscription_started_at:
      typeof row.subscription_started_at === 'string'
        ? row.subscription_started_at
        : null,
    subscription_ends_at:
      typeof row.subscription_ends_at === 'string' ? row.subscription_ends_at : null,
  };
}

export async function selectMemberPlan(planId: string | null) {
  const { error } = await supabase.rpc('member_select_plan', {
    target_plan_id: planId,
  });

  if (error) {
    throw new Error(error.message || 'We could not update your plan right now.');
  }
}
