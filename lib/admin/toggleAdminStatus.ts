import { getAdminSession } from './getAdminSession';
import { shouldUseAdminFallback } from './rpc';
import { supabase } from '../supabase';
import { type AdminPermission, type AdminRole } from '../adminAccess';

export type SaveAdminAccessInput = {
  profileId: string;
  isAdmin: boolean;
  role: AdminRole | 'custom';
  customPermissions: AdminPermission[];
};

export async function saveAdminAccess(input: SaveAdminAccessInput) {
  const { user } = await getAdminSession('admins.manage');
  const { profileId, isAdmin, role, customPermissions } = input;

  if (profileId === user.id) {
    throw new Error('Your own admin access stays protected here.');
  }

  const nextPermissions =
    isAdmin && role === 'custom'
      ? Array.from(new Set(customPermissions))
      : null;

  const { error: rpcError } = await supabase.rpc('admin_set_profile_access', {
    target_profile_id: profileId,
    target_is_admin: isAdmin,
    target_admin_role: isAdmin ? role : null,
    target_admin_permissions: isAdmin ? nextPermissions : null,
  });

  if (!rpcError) {
    return;
  }

  if (!shouldUseAdminFallback(rpcError)) {
    throw new Error(rpcError.message || 'Could not save admin access.');
  }

  throw new Error('Finish the admin setup step before changing member access.');
}
