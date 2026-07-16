import { getAdminSession } from './getAdminSession';
import { shouldUseAdminFallback } from './rpc';
import type { AdminStats } from './types';
import { supabase } from '../supabase';

export async function getAdminStats(): Promise<AdminStats> {
  await getAdminSession('overview.read');

  const { data: rpcData, error: rpcError } = await supabase.rpc('admin_get_stats');

  if (!rpcError && Array.isArray(rpcData) && rpcData[0]) {
    const firstRow = rpcData[0] as {
      total_users: number | null;
      total_admins: number | null;
      total_tours: number | null;
    };

    return {
      totalUsers: firstRow.total_users || 0,
      totalAdmins: firstRow.total_admins || 0,
      totalTours: firstRow.total_tours || 0,
    };
  }

  if (rpcError && !shouldUseAdminFallback(rpcError)) {
    throw new Error(rpcError.message || 'Could not load the admin overview.');
  }

  const [
    { count: usersCount, error: usersError },
    { count: adminsCount, error: adminsError },
    { count: toursCount, error: toursError },
  ] =
    await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_admin', true),
      supabase.from('tours').select('*', { count: 'exact', head: true }),
    ]);

  if (usersError || adminsError || toursError) {
    throw new Error(
      usersError?.message ||
        adminsError?.message ||
        toursError?.message ||
        'Could not load the admin overview.',
    );
  }

  return {
    totalUsers: usersCount || 0,
    totalAdmins: adminsCount || 0,
    totalTours: toursCount || 0,
  };
}
