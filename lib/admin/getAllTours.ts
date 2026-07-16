import { getAdminSession } from './getAdminSession';
import { shouldUseAdminFallback } from './rpc';
import type { AdminTourListItem } from './types';
import { supabase } from '../supabase';

export async function getAllTours(): Promise<AdminTourListItem[]> {
  await getAdminSession('tours.read');

  const { data: rpcData, error: rpcError } = await supabase.rpc('admin_get_tours');

  if (!rpcError) {
    return (rpcData as AdminTourListItem[]) || [];
  }

  if (!shouldUseAdminFallback(rpcError)) {
    throw new Error(rpcError.message || 'Could not load tours.');
  }

  const { data, error } = await supabase
    .from('tours')
    .select('id, user_id, title, location, scenes, nodes, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error('Finish the admin setup step before showing every tour here.');
  }

  return (
    ((data as Array<{
      id: string;
      user_id: string | null;
      title: string | null;
      location: string | null;
      scenes: number | null;
      nodes: unknown;
      created_at: string | null;
    }>) || []).map(tour => ({
      ...tour,
      owner_full_name: null,
      owner_email: null,
    })) as AdminTourListItem[]
  );
}
