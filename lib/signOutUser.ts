import { AuthError } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type SignOutMode = 'global' | 'local_fallback';

function isWeakConnectionError(error: AuthError | null) {
  const message = error?.message?.trim().toLowerCase() || '';

  return (
    message.includes('network request failed') ||
    message.includes('failed to fetch') ||
    message.includes('network error') ||
    message.includes('load failed')
  );
}

export async function signOutUser(): Promise<{
  error: AuthError | null;
  mode: SignOutMode | null;
}> {
  const globalResult = await supabase.auth.signOut();

  if (!globalResult.error) {
    return {
      error: null,
      mode: 'global',
    };
  }

  if (!isWeakConnectionError(globalResult.error)) {
    return {
      error: globalResult.error,
      mode: null,
    };
  }

  const localResult = await supabase.auth.signOut({ scope: 'local' });

  if (localResult.error) {
    return {
      error: globalResult.error,
      mode: null,
    };
  }

  return {
    error: null,
    mode: 'local_fallback',
  };
}
