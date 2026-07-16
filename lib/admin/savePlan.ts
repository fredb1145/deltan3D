import { getAdminSession } from './getAdminSession';
import { shouldUseAdminFallback } from './rpc';
import { supabase } from '../supabase';
import type { AdminPlanBillingInterval } from './types';

export type SavePlanInput = {
  planId?: string | null;
  name: string;
  description: string;
  priceAmount: number;
  currencyCode: string;
  billingInterval: AdminPlanBillingInterval;
  featureList: string[];
  tourLimit: number | null;
  sceneLimit: number | null;
  storageLimitMb: number | null;
  shareLinkLimit: number | null;
  embedLimit: number | null;
  isActive: boolean;
  isVisible: boolean;
  isRecommended: boolean;
  sortOrder: number;
};

function normalizePlanPayload(input: SavePlanInput) {
  return {
    name: input.name.trim(),
    description: input.description.trim() || null,
    price_amount: Number.isFinite(input.priceAmount) ? input.priceAmount : 0,
    currency_code: input.currencyCode.trim().toUpperCase() || 'USD',
    billing_interval: input.billingInterval,
    feature_list: input.featureList
      .map(feature => feature.trim())
      .filter(Boolean),
    tour_limit: input.tourLimit,
    scene_limit: input.sceneLimit,
    storage_limit_mb: input.storageLimitMb,
    share_link_limit: input.shareLinkLimit,
    embed_limit: input.embedLimit,
    is_active: input.isActive,
    is_visible: input.isVisible,
    is_recommended: input.isRecommended,
    sort_order: input.sortOrder,
  };
}

export async function savePlan(input: SavePlanInput): Promise<string> {
  await getAdminSession('plans.manage');

  const normalized = normalizePlanPayload(input);

  const { data: rpcData, error: rpcError } = await supabase.rpc('admin_save_plan', {
    target_plan_id: input.planId || null,
    plan_name: normalized.name,
    plan_description: normalized.description,
    plan_price_amount: normalized.price_amount,
    plan_currency_code: normalized.currency_code,
    plan_billing_interval: normalized.billing_interval,
    plan_feature_list: normalized.feature_list,
    plan_tour_limit: normalized.tour_limit,
    plan_scene_limit: normalized.scene_limit,
    plan_storage_limit_mb: normalized.storage_limit_mb,
    plan_share_link_limit: normalized.share_link_limit,
    plan_embed_limit: normalized.embed_limit,
    plan_is_active: normalized.is_active,
    plan_is_visible: normalized.is_visible,
    plan_is_recommended: normalized.is_recommended,
    plan_sort_order: normalized.sort_order,
  });

  if (!rpcError && rpcData) {
    return String(rpcData);
  }

  if (!shouldUseAdminFallback(rpcError)) {
    throw new Error(rpcError?.message || 'Could not save this plan.');
  }

  if (input.planId) {
    const { data, error } = await supabase
      .from('subscription_plans')
      .update(normalized)
      .eq('id', input.planId)
      .select('id')
      .single();

    if (error || !data) {
      throw new Error('Finish the plan setup step before saving plans.');
    }

    if (normalized.is_recommended) {
      await supabase
        .from('subscription_plans')
        .update({ is_recommended: false })
        .neq('id', input.planId);

      await supabase
        .from('subscription_plans')
        .update({ is_recommended: true })
        .eq('id', input.planId);
    }

    return String((data as { id: string }).id);
  }

  const { data, error } = await supabase
    .from('subscription_plans')
    .insert(normalized)
    .select('id')
    .single();

  if (error || !data) {
    throw new Error('Finish the plan setup step before saving plans.');
  }

  const planId = String((data as { id: string }).id);

  if (normalized.is_recommended) {
    await supabase
      .from('subscription_plans')
      .update({ is_recommended: false })
      .neq('id', planId);

    await supabase
      .from('subscription_plans')
      .update({ is_recommended: true })
      .eq('id', planId);
  }

  return planId;
}
