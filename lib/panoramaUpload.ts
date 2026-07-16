import * as ImageManipulator from 'expo-image-manipulator';
import { Image } from 'react-native';
import { getPanoramaValidationMessage } from './panoramaValidation';
import { supabase } from './supabase';

const PANORAMA_BUCKET = 'tour-panoramas';
const MAX_WIDTH = 2048;
const JPEG_QUALITY = 0.72;
const PREVIEW_WIDTH = 640;
const PREVIEW_QUALITY = 0.48;

export type UploadedPanorama = {
  path: string;
  previewPath: string;
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

async function getLocalImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      reject,
    );
  });
}

async function manipulatePanoramaVariant(
  localUri: string,
  maxWidth: number,
  quality: number,
): Promise<{
  uri: string;
  width: number;
  height: number;
}> {
  const sourceSize = await getLocalImageSize(localUri);
  const actions = sourceSize.width > maxWidth ? [{ resize: { width: maxWidth } }] : [];

  const result = await ImageManipulator.manipulateAsync(localUri, actions, {
    compress: quality,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: false,
  });

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
  };
}

export async function preparePanorama(localUri: string): Promise<{
  uri: string;
  width: number;
  height: number;
}> {
  const finalResult = await manipulatePanoramaVariant(localUri, MAX_WIDTH, JPEG_QUALITY);

  validatePanorama(finalResult.width, finalResult.height);

  return {
    uri: finalResult.uri,
    width: finalResult.width,
    height: finalResult.height,
  };
}

async function preparePanoramaPreview(localUri: string): Promise<{
  uri: string;
  width: number;
  height: number;
}> {
  return manipulatePanoramaVariant(localUri, PREVIEW_WIDTH, PREVIEW_QUALITY);
}

function buildPreviewStoragePath(userId: string, tourId: string, sceneId: string, stamp: number) {
  return `${userId}/${tourId}/${sceneId}/preview-${stamp}.jpg`;
}

export async function uploadPanorama(params: {
  userId: string;
  tourId: string;
  sceneId: string;
  localUri: string;
  alreadyPrepared?: boolean;
  imageWidth?: number;
  imageHeight?: number;
}): Promise<UploadedPanorama> {
  const { userId, tourId, sceneId, localUri, alreadyPrepared, imageWidth, imageHeight } = params;

  if (!userId || !tourId || !sceneId || !localUri) {
    throw new Error('Missing upload details.');
  }

  const prepared =
    alreadyPrepared && imageWidth && imageHeight
      ? (() => {
          validatePanorama(imageWidth, imageHeight);

          return {
            uri: localUri,
            width: imageWidth,
            height: imageHeight,
          };
        })()
      : await preparePanorama(localUri);

  const preview = await preparePanoramaPreview(prepared.uri);
  const [bytes, previewBytes] = await Promise.all([
    fileUriToArrayBuffer(prepared.uri),
    fileUriToArrayBuffer(preview.uri),
  ]);

  const stamp = Date.now();
  const path = buildStoragePath(userId, tourId, sceneId);
  const previewPath = buildPreviewStoragePath(userId, tourId, sceneId, stamp);

  const [fullUpload, previewUpload] = await Promise.all([
    supabase.storage.from(PANORAMA_BUCKET).upload(path, bytes, {
      contentType: 'image/jpeg',
      cacheControl: '31536000',
      upsert: false,
    }),
    supabase.storage.from(PANORAMA_BUCKET).upload(previewPath, previewBytes, {
      contentType: 'image/jpeg',
      cacheControl: '31536000',
      upsert: false,
    }),
  ]);

  if (fullUpload.error || previewUpload.error) {
    await supabase.storage.from(PANORAMA_BUCKET).remove([path, previewPath]);

    throw new Error(
      fullUpload.error?.message ||
        previewUpload.error?.message ||
        'Could not upload this 360 photo.',
    );
  }

  return {
    path,
    previewPath,
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
