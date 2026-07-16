import { getAdminSession } from './getAdminSession';
import { shouldUseAdminFallback } from './rpc';
import type { AdminProfileListItem } from './types';
import { supabase } from '../supabase';

export async function getAllProfiles(): Promise<AdminProfileListItem[]> {
  await getAdminSession('users.read');

  const { data: rpcData, error: rpcError } = await supabase.rpc('admin_get_profiles');

  if (!rpcError) {
    return (rpcData as AdminProfileListItem[]) || [];
  }

  if (!shouldUseAdminFallback(rpcError)) {
    throw new Error(rpcError.message || 'Could not load members.');
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, is_admin')
    .order('full_name', { ascending: true });

  if (error) {
    throw new Error('Finish the admin setup step before showing every member here.');
  }

  return ((data as Array<{ id: string; full_name: string | null; is_admin: boolean | null }>) || []).map(
    profile => ({
      ...profile,
      email: null,
      admin_role: null,
      admin_permissions: null,
      current_plan_id: null,
      current_plan_name: null,
      current_plan_source: null,
      assigned_plan_id: null,
      assigned_plan_name: null,
      subscription_status: null,
      subscription_started_at: null,
      subscription_ends_at: null,
    }),
  );
}
