import { zipSync } from 'fflate';
import { supabase } from './supabase';
import { fillLpr } from './lprFill';
import { lprFileName, type LprData } from './lpr';
import templateUrl from '../assets/lpr-template.xlsx?url';

export type LprStatus = 'draft' | 'sent' | 'mailed' | 'signed';
export interface LprRecord {
  id: string;
  project_id: string;
  owner_id: string | null;
  lessor: string;
  status: LprStatus;
  data: LprData;
  sent_at: string | null;
  mailed_at: string | null;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchLprs(projectId: string): Promise<LprRecord[]> {
  const { data, error } = await supabase.from('lpr_requests').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function saveLpr(projectId: string, ownerId: string | null, d: LprData, existingId?: string): Promise<LprRecord> {
  const row = { project_id: projectId, owner_id: ownerId, lessor: d.lessor || 'Lessor', data: d, updated_at: new Date().toISOString() };
  const q = existingId ? supabase.from('lpr_requests').update(row).eq('id', existingId) : supabase.from('lpr_requests').insert(row);
  const { data, error } = await q.select().single();
  if (error) throw error;
  return data;
}

export async function saveLprDrafts(projectId: string, items: { ownerId: string; data: LprData }[]): Promise<number> {
  if (items.length === 0) return 0;
  const { error } = await supabase.from('lpr_requests').insert(
    items.map((i) => ({ project_id: projectId, owner_id: i.ownerId, lessor: i.data.lessor || 'Lessor', data: i.data }))
  );
  if (error) throw error;
  return items.length;
}

export async function setLprStatus(rec: LprRecord, status: LprStatus, today: string): Promise<LprRecord> {
  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === 'sent' && !rec.sent_at) patch.sent_at = today;
  if (status === 'mailed') {
    patch.mailed_at = rec.mailed_at ?? today;
    patch.data = { ...rec.data, mailDate: rec.data.mailDate || today };
  }
  if (status === 'signed') patch.signed_at = rec.signed_at ?? today;
  const { data, error } = await supabase.from('lpr_requests').update(patch).eq('id', rec.id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteLpr(id: string): Promise<void> {
  const { error } = await supabase.from('lpr_requests').delete().eq('id', id);
  if (error) throw error;
}

let templateCache: Promise<ArrayBuffer> | null = null;
function loadTemplate(): Promise<ArrayBuffer> {
  templateCache ??= fetch(templateUrl).then((r) => {
    if (!r.ok) throw new Error('Could not load the LPR form.');
    return r.arrayBuffer();
  });
  return templateCache;
}

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// One LPR as the office's own .xlsx.
export async function downloadLpr(d: LprData): Promise<void> {
  const bytes = await fillLpr(await loadTemplate(), d);
  save(new Blob([bytes], { type: XLSX_TYPE }), lprFileName(d));
}

// Several LPRs: one file each, zipped.
export async function downloadLprZip(list: LprData[], zipName: string): Promise<void> {
  const tpl = await loadTemplate();
  const files: Record<string, Uint8Array> = {};
  for (const d of list) {
    let name = lprFileName(d);
    for (let n = 2; files[name]; n++) name = lprFileName(d).replace(/\.xlsx$/, ` (${n}).xlsx`);
    files[name] = new Uint8Array(await fillLpr(tpl, d));
  }
  save(new Blob([zipSync(files) as BlobPart], { type: 'application/zip' }), zipName);
}
