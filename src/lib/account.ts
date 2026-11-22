import { supabase } from './supabase';

export type Profile = {
  id: string;
  display_name: string | null;
};

/** The signed-in user's own profile (security rules only return their own). */
export async function fetchMyProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function updateDisplayName(userId: string, displayName: string): Promise<void> {
  const clean = displayName.trim();
  const { error } = await supabase
    .from('profiles')
    .update({ display_name: clean || null })
    .eq('id', userId);
  if (error) throw error;
}

/**
 * Permanently deletes the signed-in user's account, profile, items and notes
 * (see supabase/migrations/0003_delete_my_account.sql), then clears the
 * session on this phone.
 */
export async function deleteMyAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw error;
  // The account no longer exists, so only clear the session stored on this device.
  await supabase.auth.signOut({ scope: 'local' });
}
