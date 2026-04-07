export const PANORAMA_MIN_WIDTH = 1500;
export const PANORAMA_MIN_HEIGHT = 750;
export const PANORAMA_RATIO_MIN = 1.85;
export const PANORAMA_RATIO_MAX = 2.15;

export function isValidPanoramaDimensions(width: number, height: number) {
  if (!width || !height) return false;
  if (width < PANORAMA_MIN_WIDTH || height < PANORAMA_MIN_HEIGHT) return false;

  const ratio = width / height;
  return ratio >= PANORAMA_RATIO_MIN && ratio <= PANORAMA_RATIO_MAX;
}

export function getPanoramaValidationMessage(width: number, height: number) {
  if (!width || !height) {
    return 'This 360 photo could not be processed.';
  }

  if (width < PANORAMA_MIN_WIDTH || height < PANORAMA_MIN_HEIGHT) {
    return 'This 360 photo is too small.';
  }

  const ratio = width / height;

  if (ratio < PANORAMA_RATIO_MIN || ratio > PANORAMA_RATIO_MAX) {
    return 'Please choose a true 360 photo with a 2:1 shape.';
  }

  return null;
}
