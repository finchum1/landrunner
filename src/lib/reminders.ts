import { supabase } from './supabase';

export interface ReminderSettings {
  id: string;
  token: string;
}

function newToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// One row holds the secret that guards the calendar feed. Created on first use.
export async function getOrCreateSettings(): Promise<ReminderSettings> {
  const { data, error } = await supabase.from('reminder_settings').select('*').limit(1);
  if (error) throw error;
  if (data && data[0]) return data[0];
  const created = await supabase.from('reminder_settings').insert({ token: newToken() }).select().single();
  if (created.error) throw created.error;
  return created.data;
}

// A new secret: the old calendar link stops working.
export async function regenerateToken(id: string): Promise<ReminderSettings> {
  const { data, error } = await supabase.from('reminder_settings').update({ token: newToken() }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export interface FeedEvent {
  next_contact_date: string;
}

// What the feed will contain right now (through the same guarded function).
export async function previewFeed(token: string): Promise<FeedEvent[]> {
  const { data, error } = await supabase.rpc('reminder_events', { p_token: token });
  if (error) throw error;
  return data ?? [];
}
