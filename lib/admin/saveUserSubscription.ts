import { getAdminSession } from './getAdminSession';
import { shouldUseAdminFallback } from './rpc';
import { supabase } from '../supabase';
import type { AdminSubscriptionStatus } from './types';

export type SaveUserSubscriptionInput = {
  userId: string;
  planId: string | null;
  status: AdminSubscriptionStatus;
  endsAt?: string | null;
};

export async function saveUserSubscription(input: SaveUserSubscriptionInput) {
  await getAdminSession('plans.manage');

  const { error } = await supabase.rpc('admin_set_user_subscription', {
    target_user_id: input.userId,
    target_plan_id: input.planId,
    target_status: input.status,
    target_ends_at: input.endsAt || null,
  });

  if (!error) {
    return;
  }

  if (!shouldUseAdminFallback(error)) {
    throw new Error(error.message || 'Could not save this member plan.');
  }

  throw new Error('Finish the member plan setup step before saving plan access.');
}
