import { type User } from '@supabase/supabase-js';
import {
  hasAdminPermission,
  resolveAdminAccess,
  type AdminAccess,
  type AdminPermission,
  type AdminRole,
} from '../adminAccess';
import { ensureProfile } from '../getProfile';
import { supabase } from '../supabase';

export type AdminProfileRow = {
  id: string;
  full_name: string | null;
  is_admin?: boolean | null;
  admin_role?: AdminRole | string | null;
  admin_permissions?: string[] | null;
};

export type AdminSession = {
  user: User;
  profile: AdminProfileRow;
  access: AdminAccess;
};

export async function getAdminSession(
  requiredPermission?: AdminPermission,
): Promise<AdminSession> {
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    throw new Error(authError?.message || 'Please sign in again.');
  }

  const profile = (await ensureProfile(authData.user)) as AdminProfileRow;
  const access = resolveAdminAccess(profile);

  if (!access.isAdmin) {
    throw new Error('You do not have access to this admin area.');
  }

  if (requiredPermission && !hasAdminPermission(access, requiredPermission)) {
    throw new Error('You do not have access to this admin area.');
  }

  return {
    user: authData.user,
    profile,
    access,
  };
}
