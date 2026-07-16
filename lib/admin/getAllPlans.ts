import { getAdminSession } from './getAdminSession';
import { shouldUseAdminFallback } from './rpc';
import type { AdminPlanListItem } from './types';
import { supabase } from '../supabase';

function normalizePlanRows(rows: Array<Record<string, unknown>>): AdminPlanListItem[] {
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
    is_active: typeof row.is_active === 'boolean' ? row.is_active : null,
    is_visible: typeof row.is_visible === 'boolean' ? row.is_visible : null,
    is_recommended:
      typeof row.is_recommended === 'boolean' ? row.is_recommended : null,
    is_archived: typeof row.is_archived === 'boolean' ? row.is_archived : null,
    sort_order: typeof row.sort_order === 'number' ? row.sort_order : null,
    member_count:
      typeof row.member_count === 'number'
        ? row.member_count
        : typeof row.member_count === 'string'
          ? Number(row.member_count)
          : null,
    created_at: typeof row.created_at === 'string' ? row.created_at : null,
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : null,
  }));
}

export async function getAllPlans(): Promise<AdminPlanListItem[]> {
  await getAdminSession('plans.read');

  const { data: rpcData, error: rpcError } = await supabase.rpc('admin_get_plans');

  if (!rpcError) {
    return normalizePlanRows((rpcData as Array<Record<string, unknown>>) || []);
  }

  if (!shouldUseAdminFallback(rpcError)) {
    throw new Error(rpcError.message || 'Could not load plans.');
  }

  const { data, error } = await supabase
    .from('subscription_plans')
    .select(
      'id, name, description, price_amount, currency_code, billing_interval, feature_list, tour_limit, scene_limit, storage_limit_mb, share_link_limit, embed_limit, is_active, is_visible, is_recommended, is_archived, sort_order, created_at, updated_at',
    )
    .order('is_archived', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('price_amount', { ascending: true });

  if (error) {
    throw new Error('Finish the plan setup step before opening plan management.');
  }

  return normalizePlanRows(
    (((data as Array<Record<string, unknown>>) || []).map(plan => ({
      ...plan,
      member_count: null,
    })) as Array<Record<string, unknown>>),
  );
}
