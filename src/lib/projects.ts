import { supabase } from './supabase';
import type { Project } from './types';

export interface ProjectInput {
  name: string;
  prospect_number: string | null;
  target_area: string | null;
  offer_rate_per_acre: number | null;
  offer_royalty_label: string | null;
  offer_royalty_fraction: number | null;
  offer_lease_term_months: number | null;
  notes: string | null;
}

export async function fetchProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createProject(input: ProjectInput): Promise<Project> {
  const { data, error } = await supabase.from('projects').insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateProject(id: string, input: Partial<ProjectInput> & { is_archived?: boolean }): Promise<Project> {
  const { data, error } = await supabase.from('projects').update(input).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
}
