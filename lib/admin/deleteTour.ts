import { getAdminSession } from './getAdminSession';
import { shouldUseAdminFallback } from './rpc';
import { supabase } from '../supabase';
import type { SavedTourNode } from '../tourScenes';

export async function deleteAdminTour(params: { tourId: string; nodes: unknown }) {
  await getAdminSession('tours.manage');

  const { tourId, nodes } = params;
  const nodeList = Array.isArray(nodes) ? (nodes as SavedTourNode[]) : [];
  const storedPaths = nodeList.flatMap(node => [
    ...(typeof node?.imagePath === 'string' ? [node.imagePath] : []),
    ...(typeof node?.previewPath === 'string' ? [node.previewPath] : []),
  ]);

  const { error: rpcError } = await supabase.rpc('admin_delete_tour', {
    target_tour_id: tourId,
    stored_paths: storedPaths,
  });

  if (!rpcError) {
    return;
  }

  if (!shouldUseAdminFallback(rpcError)) {
    throw new Error(rpcError.message || 'Could not delete this tour.');
  }

  const { error: deleteTourError } = await supabase.from('tours').delete().eq('id', tourId);

  if (deleteTourError) {
    throw new Error('Finish the admin setup step before deleting tours across the platform.');
  }

  if (storedPaths.length > 0) {
    await supabase.storage.from('tour-panoramas').remove(storedPaths);
  }
}
