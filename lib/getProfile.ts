import { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type AppProfile = {
  id: string;
  full_name: string | null;
  is_admin?: boolean | null;
  admin_role?: string | null;
  admin_permissions?: string[] | null;
};

function getDisplayName(user: User) {
  const metadataName =
    typeof user.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name.trim()
      : '';

  if (metadataName) {
    return metadataName;
  }

  if (typeof user.email === 'string' && user.email.includes('@')) {
    return user.email.split('@')[0];
  }

  return 'User';
}

export async function ensureProfile(user: User): Promise<AppProfile> {
  const { data: existingProfile, error: loadError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .limit(1)
    .maybeSingle();

  if (loadError) {
    throw new Error('We could not open your account right now.');
  }

  if (existingProfile) {
    return existingProfile as AppProfile;
  }

  const { data: createdProfile, error: createError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        full_name: getDisplayName(user),
      },
      {
        onConflict: 'id',
      },
    )
    .select('*')
    .single();

  if (createError || !createdProfile) {
    throw new Error('We could not finish setting up your account.');
  }

  return createdProfile as AppProfile;
}

export async function getProfile() {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return null;
  }

  return ensureProfile(userData.user);
}
