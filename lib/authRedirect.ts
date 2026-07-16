import * as Linking from 'expo-linking';

const APP_SCHEME = 'deltan3d';

type AuthLinkParams = {
  accessToken: string | null;
  refreshToken: string | null;
  code: string | null;
  errorCode: string | null;
  errorDescription: string | null;
  type: string | null;
};

function getParamsFromSegment(segment: string) {
  const cleaned = segment.replace(/^[?#]/, '');
  return new URLSearchParams(cleaned);
}

function readParam(url: URL, name: string) {
  const hashParams = getParamsFromSegment(url.hash);
  const queryParams = getParamsFromSegment(url.search);

  return hashParams.get(name) ?? queryParams.get(name);
}

function decodeValue(value: string | null) {
  if (!value) return null;

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function emptyAuthLinkParams(): AuthLinkParams {
  return {
    accessToken: null,
    refreshToken: null,
    code: null,
    errorCode: null,
    errorDescription: null,
    type: null,
  };
}

export function createPasswordResetRedirectUrl() {
  return Linking.createURL('/reset-password', {
    scheme: APP_SCHEME,
    isTripleSlashed: true,
  });
}

export function extractAuthLinkParams(url: string | null): AuthLinkParams {
  if (!url) {
    return emptyAuthLinkParams();
  }

  try {
    const parsedUrl = new URL(url);

    return {
      accessToken: decodeValue(readParam(parsedUrl, 'access_token')),
      refreshToken: decodeValue(readParam(parsedUrl, 'refresh_token')),
      code: decodeValue(readParam(parsedUrl, 'code')),
      errorCode: decodeValue(readParam(parsedUrl, 'error_code')),
      errorDescription: decodeValue(readParam(parsedUrl, 'error_description')),
      type: decodeValue(readParam(parsedUrl, 'type')),
    };
  } catch {
    return emptyAuthLinkParams();
  }
}
