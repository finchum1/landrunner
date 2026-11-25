import { supabase } from './supabase';
import { parseOrWorkbook, type ParsedOr, type RawSheet } from './orParse';
import { linkByName } from './orLink';
import type { MineralOwner, OrInterest, OrNote, OrReport, OrRun, OrTract } from './types';

export async function readOrFile(file: File): Promise<ParsedOr> {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
  const sheets: RawSheet[] = wb.SheetNames.map((name) => ({
    name,
    rows: XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: '' }) as RawSheet['rows'],
  }));
  return parseOrWorkbook(sheets);
}

export interface OrBundle {
  report: OrReport;
  tracts: OrTract[];
  interests: OrInterest[];
  notes: OrNote[];
}

// The report currently on file for a project (a project has at most one).
export async function fetchOrBundle(projectId: string): Promise<OrBundle | null> {
  const { data: reports, error } = await supabase
    .from('or_reports')
    .select('*')
    .eq('project_id', projectId)
    .order('imported_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  const report = reports?.[0];
  if (!report) return null;
  const [t, i, n] = await Promise.all([
    supabase.from('or_tracts').select('*').eq('report_id', report.id).order('sort_order'),
    supabase.from('or_interests').select('*').eq('report_id', report.id).order('row_order'),
    supabase.from('or_notes').select('*').eq('report_id', report.id).order('sort_order'),
  ]);
  for (const r of [t, i, n]) if (r.error) throw r.error;
  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  return {
    report: { ...report, gross_acres: num(report.gross_acres) },
    tracts: (t.data ?? []).map((x) => ({ ...x, gross_acres: num(x.gross_acres) })),
    interests: (i.data ?? []).map((x) => ({ ...x, interest: num(x.interest), net_acres: num(x.net_acres), tract_acres: x.tract_acres ?? {} })),
    notes: n.data ?? [],
  };
}

export async function fetchRunsheet(reportId: string): Promise<OrRun[]> {
  const out: OrRun[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('or_runsheet').select('*').eq('report_id', reportId).order('row_order').range(from, from + 999);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

async function insertChunks(table: string, rows: Record<string, unknown>[]) {
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await supabase.from(table).insert(rows.slice(i, i + 200));
    if (error) throw error;
  }
}

// Replace the project's report with a freshly imported one.
export async function saveOrReport(
  projectId: string,
  parsed: ParsedOr,
  filename: string,
  owners: Pick<MineralOwner, 'id' | 'name'>[]
): Promise<{ reportId: string; linked: number; unlinked: number }> {
  await supabase.from('or_reports').delete().eq('project_id', projectId);
  const r = parsed.report;
  const { data: rep, error } = await supabase
    .from('or_reports')
    .insert({
      project_id: projectId,
      prospect_number: r.prospectNumber || null,
      section: r.section || null,
      township: r.township || null,
      range: r.range || null,
      county: r.county || null,
      state: r.state || null,
      description: r.description || null,
      gross_acres: r.grossAcres,
      or_date: r.orDate || null,
      last_entry: r.lastEntry || null,
      examiner: r.examiner || null,
      report_type: r.reportType || 'OR',
      begin_date: r.beginDate || null,
      end_date: r.endDate || null,
      source_filename: filename,
    })
    .select()
    .single();
  if (error) throw error;
  const reportId = rep.id as string;
  try {
    await insertChunks('or_tracts', parsed.tracts.map((t, i) => ({ report_id: reportId, label: t.label, description: t.description || null, gross_acres: t.grossAcres, sort_order: i })));
    const links = linkByName(parsed.interests.map((i) => ({ name: i.name, net: i.netAcres })), owners);
    await insertChunks(
      'or_interests',
      parsed.interests.map((i, idx) => ({
        report_id: reportId,
        project_id: projectId,
        owner_id: links[idx],
        name: i.name,
        address: i.address || null,
        interest: i.interest,
        net_acres: i.netAcres,
        note_refs: i.noteRefs || null,
        tract_acres: i.tractAcres,
        row_order: i.rowOrder,
      }))
    );
    await insertChunks('or_notes', parsed.notes.map((n, i) => ({ report_id: reportId, kind: n.kind, ref: n.ref, body: n.body, sort_order: i })));
    await insertChunks(
      'or_runsheet',
      parsed.runsheet.map((x, i) => ({
        report_id: reportId,
        book_page: x.bookPage || null,
        instrument: x.instrument || null,
        effective_date: x.effectiveDate || null,
        file_date: x.fileDate || null,
        grantor: x.grantor || null,
        grantee: x.grantee || null,
        legal: x.legal || null,
        conveyance: x.conveyance || null,
        notes: x.notes || null,
        row_order: i,
      }))
    );
    const linked = links.filter(Boolean).length;
    return { reportId, linked, unlinked: parsed.interests.filter((i) => (i.netAcres ?? 0) > 0).length - linked };
  } catch (err) {
    await supabase.from('or_reports').delete().eq('id', reportId);
    throw err;
  }
}

export async function setInterestOwner(interestId: string, ownerId: string | null): Promise<void> {
  const { error } = await supabase.from('or_interests').update({ owner_id: ownerId }).eq('id', interestId);
  if (error) throw error;
}

export async function deleteOrReport(reportId: string): Promise<void> {
  const { error } = await supabase.from('or_reports').delete().eq('id', reportId);
  if (error) throw error;
}


// Create project owners from ownership lines that carry acres but have no
// matching person yet, and link them. Returns how many were added.
export async function addUnlinkedAsOwners(projectId: string, lines: OrInterest[]): Promise<{ added: number; links: Record<string, string> }> {
  const todo = lines.filter((l) => !l.owner_id && (l.net_acres ?? 0) > 0);
  const links: Record<string, string> = {};
  for (let i = 0; i < todo.length; i += 100) {
    const chunk = todo.slice(i, i + 100);
    const { data, error } = await supabase
      .from('mineral_owners')
      .insert(chunk.map((l) => ({ project_id: projectId, name: l.name, nma: l.net_acres ?? 0, interest_decimal: l.interest, address: l.address || null })))
      .select('id');
    if (error) throw error;
    // rows come back in insert order
    await Promise.all(
      chunk.map(async (l, k) => {
        const id = data?.[k]?.id as string | undefined;
        if (!id) return;
        links[l.id] = id;
        const { error: e2 } = await supabase.from('or_interests').update({ owner_id: id }).eq('id', l.id);
        if (e2) throw e2;
      })
    );
  }
  return { added: Object.keys(links).length, links };
}
