import * as ImageManipulator from 'expo-image-manipulator';
import { getPanoramaValidationMessage } from './panoramaValidation';
import { supabase } from './supabase';

const PANORAMA_BUCKET = 'tour-panoramas';
const MAX_WIDTH = 4096;

export type UploadedPanorama = {
  path: string;
  width: number;
  height: number;
};

function validatePanorama(width: number, height: number) {
  const message = getPanoramaValidationMessage(width, height);
  if (message) {
    throw new Error(message);
  }
}

async function fileUriToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const response = await fetch(uri);

  if (!response.ok) {
    throw new Error('Could not read this 360 photo.');
  }

  return await response.arrayBuffer();
}

function buildStoragePath(userId: string, tourId: string, sceneId: string) {
  return `${userId}/${tourId}/${sceneId}/panorama-${Date.now()}.jpg`;
}

export async function preparePanorama(localUri: string): Promise<{
  uri: string;
  width: number;
  height: number;
}> {
  const initial = await ImageManipulator.manipulateAsync(
    localUri,
    [],
    {
      compress: 0.9,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: false,
    }
  );

  let finalResult = initial;

  if (initial.width > MAX_WIDTH) {
    finalResult = await ImageManipulator.manipulateAsync(
      initial.uri,
      [{ resize: { width: MAX_WIDTH } }],
      {
        compress: 0.9,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: false,
      }
    );
  }

  validatePanorama(finalResult.width, finalResult.height);

  return {
    uri: finalResult.uri,
    width: finalResult.width,
    height: finalResult.height,
  };
}

export async function uploadPanorama(params: {
  userId: string;
  tourId: string;
  sceneId: string;
  localUri: string;
}): Promise<UploadedPanorama> {
  const { userId, tourId, sceneId, localUri } = params;

  if (!userId || !tourId || !sceneId || !localUri) {
    throw new Error('Missing upload details.');
  }

  const prepared = await preparePanorama(localUri);
  const bytes = await fileUriToArrayBuffer(prepared.uri);
  const path = buildStoragePath(userId, tourId, sceneId);

  const { error } = await supabase.storage
    .from(PANORAMA_BUCKET)
    .upload(path, bytes, {
      contentType: 'image/jpeg',
      cacheControl: '31536000',
      upsert: false,
    });

  if (error) {
    throw new Error(error.message || 'Could not upload this 360 photo.');
  }

  return {
    path,
    width: prepared.width,
    height: prepared.height,
  };
}

export async function createSignedPanoramaUrl(path: string): Promise<string> {
  if (!path) {
    throw new Error('Missing 360 photo path.');
  }

  const { data, error } = await supabase.storage
    .from(PANORAMA_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 7);

  if (error || !data?.signedUrl) {
    throw new Error('Could not load this 360 photo.');
  }

  return data.signedUrl;
}
