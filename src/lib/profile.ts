import { supabase } from './supabase';
import type { LandmanProfile } from './types';

// The sender details on offer letters. One row, created by the migration.
export async function fetchProfile(): Promise<LandmanProfile | null> {
  const { data, error } = await supabase.from('landman_profile').select('*').limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function saveProfile(
  id: string | null,
  input: Pick<LandmanProfile, 'full_name' | 'title' | 'phone' | 'email'>
): Promise<void> {
  const q = id
    ? supabase.from('landman_profile').update(input).eq('id', id)
    : supabase.from('landman_profile').insert(input);
  const { error } = await q;
  if (error) throw error;
}
