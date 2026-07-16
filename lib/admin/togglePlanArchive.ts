import { getAdminSession } from './getAdminSession';
import { shouldUseAdminFallback } from './rpc';
import { supabase } from '../supabase';

export async function setPlanArchived(params: {
  planId: string;
  nextArchived: boolean;
}) {
  await getAdminSession('plans.manage');

  const { planId, nextArchived } = params;
  const { error: rpcError } = await supabase.rpc('admin_set_plan_archived', {
    target_plan_id: planId,
    next_is_archived: nextArchived,
  });

  if (!rpcError) {
    return;
  }

  if (!shouldUseAdminFallback(rpcError)) {
    throw new Error(rpcError.message || 'Could not update this plan.');
  }

  const nextValues = nextArchived
    ? {
        is_archived: true,
        is_active: false,
        is_visible: false,
        is_recommended: false,
      }
    : {
        is_archived: false,
      };

  const { error } = await supabase
    .from('subscription_plans')
    .update(nextValues)
    .eq('id', planId);

  if (error) {
    throw new Error('Finish the plan setup step before updating plans.');
  }
}
