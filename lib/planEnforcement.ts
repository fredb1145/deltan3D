import { supabase } from './supabase';
import type { SavedTourNode } from './tourScenes';

export async function createTourWithPlanGuard(params: {
  title: string;
  location: string;
  requestedSceneCount: number;
}): Promise<string> {
  const { title, location, requestedSceneCount } = params;

  const { data, error } = await supabase.rpc('member_create_tour', {
    tour_title: title.trim(),
    tour_location: location.trim(),
    requested_scene_count: requestedSceneCount,
  });

  if (error || !data) {
    throw new Error(error?.message || 'Your current plan cannot create this tour right now.');
  }

  return String(data);
}

export async function saveTourContentWithPlanGuard(params: {
  tourId: string;
  title: string;
  location: string;
  nodes: SavedTourNode[];
}) {
  const { tourId, title, location, nodes } = params;

  const { error } = await supabase.rpc('member_save_tour_content', {
    target_tour_id: tourId,
    tour_title: title.trim(),
    tour_location: location.trim(),
    tour_nodes: nodes,
  });

  if (error) {
    throw new Error(error.message || 'Your current plan cannot save this tour right now.');
  }
}
