import { supabase } from './supabase';
import type { BillingEntry, BillingKind } from './billing';

export async function fetchBillingEntries(projectId: string): Promise<BillingEntry[]> {
  const { data, error } = await supabase
    .from('project_billing_entries')
    .select('*')
    .eq('project_id', projectId)
    .order('entry_date', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((e) => ({ ...e, quantity: Number(e.quantity), amount: e.amount == null ? null : Number(e.amount) }));
}

export async function addBillingEntry(
  projectId: string,
  e: { entry_date: string; kind: BillingKind; quantity: number; amount: number | null; description: string | null }
): Promise<BillingEntry> {
  const { data, error } = await supabase.from('project_billing_entries').insert({ project_id: projectId, ...e }).select().single();
  if (error) throw error;
  return { ...data, quantity: Number(data.quantity), amount: data.amount == null ? null : Number(data.amount) };
}

export async function deleteBillingEntry(id: string): Promise<void> {
  const { error } = await supabase.from('project_billing_entries').delete().eq('id', id);
  if (error) throw error;
}

export async function markEntriesBilled(ids: string[], invoiceNumber: string | null, billedAt: string): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase
    .from('project_billing_entries')
    .update({ billed_at: billedAt, invoice_number: invoiceNumber })
    .in('id', ids);
  if (error) throw error;
}
