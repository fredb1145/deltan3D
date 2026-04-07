import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from './supabase';

const BUCKET = 'tour-panoramas';
const MAX_WIDTH = 4096;
const MIN_WIDTH = 1500;
const MIN_HEIGHT = 750;

export type CreatedSceneRecord = {
  id: string;
  tour_id: string;
  title: string;
  order_index: number;
  image_path: string | null;
  image_width: number | null;
  image_height: number | null;
};

type CreateSceneWithPanoramaParams = {
  tourId: string;
  title: string;
  orderIndex: number;
  localUri: string;
};

function validatePanorama(width: number, height: number) {
  if (!width || !height) {
    throw new Error('This 360 photo could not be processed.');
  }

  if (width < MIN_WIDTH || height < MIN_HEIGHT) {
    throw new Error('This 360 photo is too small.');
  }

  const ratio = width / height;

  if (ratio < 1.85 || ratio > 2.15) {
    throw new Error('Please upload a proper 360 photo.');
  }
}

async function fileUriToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const response = await fetch(uri);

  if (!response.ok) {
    throw new Error('Could not read this 360 photo.');
  }

  return await response.arrayBuffer();
}

function buildPath(userId: string, tourId: string, sceneId: string) {
  return `${userId}/${tourId}/${sceneId}/panorama-${Date.now()}.jpg`;
}

async function preparePanorama(localUri: string) {
  const firstPass = await ImageManipulator.manipulateAsync(
    localUri,
    [],
    {
      compress: 0.9,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: false,
    }
  );

  let final = firstPass;

  if (firstPass.width > MAX_WIDTH) {
    final = await ImageManipulator.manipulateAsync(
      firstPass.uri,
      [{ resize: { width: MAX_WIDTH } }],
      {
        compress: 0.9,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: false,
      }
    );
  }

  validatePanorama(final.width, final.height);

  return final;
}

export async function createSignedPanoramaUrl(path: string): Promise<string> {
  if (!path) {
    throw new Error('Could not load this 360 photo.');
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 7);

  if (error || !data?.signedUrl) {
    throw new Error('Could not load this 360 photo.');
  }

  return data.signedUrl;
}

export async function createSceneWithPanorama({
  tourId,
  title,
  orderIndex,
  localUri,
}: CreateSceneWithPanoramaParams): Promise<CreatedSceneRecord> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Please sign in again.');
  }

  const { data: createdScene, error: createError } = await supabase
    .from('scenes')
    .insert({
      tour_id: tourId,
      title,
      order_index: orderIndex,
      image_path: null,
      image_width: null,
      image_height: null,
    })
    .select('id, tour_id, title, order_index, image_path, image_width, image_height')
    .single();

  if (createError || !createdScene?.id) {
    throw new Error(createError?.message || 'Could not create this scene.');
  }

  const prepared = await preparePanorama(localUri);
  const bytes = await fileUriToArrayBuffer(prepared.uri);
  const path = buildPath(user.id, tourId, createdScene.id);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, {
      contentType: 'image/jpeg',
      cacheControl: '31536000',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message || 'Could not upload this 360 photo.');
  }

  const { data: updatedScene, error: updateError } = await supabase
    .from('scenes')
    .update({
      image_path: path,
      image_width: prepared.width,
      image_height: prepared.height,
    })
    .eq('id', createdScene.id)
    .select('id, tour_id, title, order_index, image_path, image_width, image_height')
    .single();

  if (updateError || !updatedScene) {
    throw new Error(updateError?.message || 'Upload succeeded but could not attach photo.');
  }

  return updatedScene;
}