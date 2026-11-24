import { supabase } from './supabase';
import { safeStorageName } from './fileFormat';

const BUCKET = 'owner-files';

export interface OwnerFile {
  id: string;
  owner_id: string;
  name: string;
  path: string;
  size: number;
  content_type: string | null;
  created_at: string;
}

export async function fetchOwnerFiles(ownerId: string): Promise<OwnerFile[]> {
  const { data, error } = await supabase
    .from('owner_files')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function uploadOwnerFile(ownerId: string, file: File): Promise<OwnerFile> {
  const path = `${ownerId}/${crypto.randomUUID()}-${safeStorageName(file.name)}`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
  });
  if (upErr) throw upErr;
  const { data, error } = await supabase
    .from('owner_files')
    .insert({ owner_id: ownerId, name: file.name, path, size: file.size, content_type: file.type || null })
    .select()
    .single();
  if (error) {
    // Don't leave an orphaned object behind if the row couldn't be saved.
    await supabase.storage.from(BUCKET).remove([path]);
    throw error;
  }
  return data;
}

export async function downloadOwnerFile(file: OwnerFile): Promise<void> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(file.path, 60, { download: file.name });
  if (error || !data) throw error ?? new Error('Could not create a download link.');
  const a = document.createElement('a');
  a.href = data.signedUrl;
  a.download = file.name;
  a.click();
}

export async function deleteOwnerFile(file: OwnerFile): Promise<void> {
  await supabase.storage.from(BUCKET).remove([file.path]);
  const { error } = await supabase.from('owner_files').delete().eq('id', file.id);
  if (error) throw error;
}

// Owners' rows (and their owner_files rows) cascade away on delete, but the
// stored objects don't -- remove those first. Best effort: a failure here must
// not block deleting the owner.
export async function removeFilesForOwners(ownerIds: string[]): Promise<void> {
  if (ownerIds.length === 0) return;
  try {
    const { data } = await supabase.from('owner_files').select('path').in('owner_id', ownerIds);
    const paths = (data ?? []).map((r) => r.path as string);
    for (let i = 0; i < paths.length; i += 100) {
      await supabase.storage.from(BUCKET).remove(paths.slice(i, i + 100));
    }
  } catch {
    /* orphaned objects are harmless; ignore */
  }
}
