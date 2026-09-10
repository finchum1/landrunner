import { supabase } from './supabase';
import type { ProjectOfferTerms } from './types';

export interface OfferTermsInput {
  label: string | null;
  rate_per_acre: number | null;
  royalty_label: string | null;
  royalty_fraction: number | null;
  lease_term_months: number | null;
}

export async function fetchOfferTerms(projectId: string): Promise<ProjectOfferTerms[]> {
  const { data, error } = await supabase
    .from('project_offer_terms')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// Lightweight fetch across every project, for the projects list page's
// per-card preview -- avoids an N+1 fetch per project card.
export async function fetchAllOfferTermsLite(): Promise<
  Pick<ProjectOfferTerms, 'project_id' | 'label' | 'rate_per_acre' | 'royalty_label' | 'lease_term_months' | 'sort_order'>[]
> {
  const { data, error } = await supabase
    .from('project_offer_terms')
    .select('project_id, label, rate_per_acre, royalty_label, lease_term_months, sort_order')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createOfferTerms(projectId: string, input: OfferTermsInput): Promise<ProjectOfferTerms> {
  const { data, error } = await supabase
    .from('project_offer_terms')
    .insert({ project_id: projectId, ...input })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateOfferTerms(id: string, input: Partial<OfferTermsInput>): Promise<ProjectOfferTerms> {
  const { data, error } = await supabase
    .from('project_offer_terms')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteOfferTerms(id: string): Promise<void> {
  const { error } = await supabase.from('project_offer_terms').delete().eq('id', id);
  if (error) throw error;
}
