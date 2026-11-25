import { supabase } from './supabase';
import { parseOrWorkbook, type ParsedOr, type RawSheet } from './orParse';
import { linkByName } from './orLink';
import { diffOr, lprImpact, matchLines } from './orDiff';
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

async function insertChunks(table: string, rows: Record<string, unknown>[], wantIds = false): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 0; i < rows.length; i += 200) {
    const q = supabase.from(table).insert(rows.slice(i, i + 200));
    const { data, error } = wantIds ? await q.select('id') : await q;
    if (error) throw error;
    if (wantIds) ids.push(...((data ?? []) as { id: string }[]).map((r) => r.id));
  }
  return ids;
}

export interface SaveResult {
  reportId: string;
  linked: number;
  unlinked: number;
  flaggedLprs: string[]; // lessors whose LPR covers something the new report changed
}

// Import a report. If one is already on file this is an UPDATE: lines that are
// still there keep their link to the person and the LPRs that cover them, the
// LPRs that touch changed lines are flagged, and only then is the old report
// removed (so a failed import never loses the one you had).
export async function saveOrReport(
  projectId: string,
  parsed: ParsedOr,
  filename: string,
  owners: Pick<MineralOwner, 'id' | 'name'>[]
): Promise<SaveResult> {
  const prev = await fetchOrBundle(projectId);
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

    // links: keep the old report's link for a line that's still there, then match the rest by name
    const matches = prev ? matchLines(prev.interests, parsed.interests) : parsed.interests.map(() => null);
    const ownerIds: (string | null)[] = matches.map((oi) => (oi !== null ? prev!.interests[oi].owner_id : null));
    const used = new Set(ownerIds.filter(Boolean) as string[]);
    const fresh = parsed.interests.map((i, idx) => ({ idx, name: i.name, net: ownerIds[idx] ? 0 : i.netAcres }));
    const todo = fresh.filter((f) => f.net);
    const byName = linkByName(todo.map((f) => ({ name: f.name, net: f.net })), owners.filter((o) => !used.has(o.id)));
    todo.forEach((f, k) => {
      ownerIds[f.idx] = byName[k];
    });

    const newIds = await insertChunks(
      'or_interests',
      parsed.interests.map((i, idx) => ({
        report_id: reportId,
        project_id: projectId,
        owner_id: ownerIds[idx],
        name: i.name,
        address: i.address || null,
        interest: i.interest,
        net_acres: i.netAcres,
        note_refs: i.noteRefs || null,
        tract_acres: i.tractAcres,
        row_order: i.rowOrder,
      })),
      true
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

    // LPRs follow their lines to the new report, and are flagged if a line changed
    const flagged: string[] = [];
    if (prev) {
      const diff = diffOr({ report: prev.report, tracts: prev.tracts, interests: prev.interests, notes: prev.notes, runsheet: [] }, parsed);
      const { data: lprs } = await supabase.from('lpr_requests').select('id, lessor, data').eq('project_id', projectId);
      const idMap = new Map<string, string>();
      prev.interests.forEach((o) => {
        const ni = diff.matches.get(o.id);
        if (ni !== null && ni !== undefined && newIds[ni]) idMap.set(o.id, newIds[ni]);
      });
      const impact = lprImpact((lprs ?? []).map((l) => ({ id: l.id, lessor: l.lessor, interestIds: (l.data?.interestIds ?? []) as string[] })), diff);
      const impactById = new Map(impact.map((i) => [i.id, i]));
      for (const l of lprs ?? []) {
        const ids = ((l.data?.interestIds ?? []) as string[]).map((x) => idMap.get(x)).filter(Boolean) as string[];
        const hit = impactById.get(l.id);
        const patch = { ...l.data, interestIds: ids, ...(hit ? { orChange: `Report updated ${parsed.report.orDate || 'now'} (was ${prev.report.or_date ?? '—'}): ${hit.reasons.join('; ')}`.slice(0, 700) } : {}) };
        if (hit) flagged.push(l.lessor);
        await supabase.from('lpr_requests').update({ data: patch }).eq('id', l.id);
      }
      await supabase.from('or_reports').delete().eq('id', prev.report.id);
    }
    const linked = ownerIds.filter(Boolean).length;
    return { reportId, linked, unlinked: parsed.interests.filter((i, idx) => (i.netAcres ?? 0) > 0 && !ownerIds[idx]).length, flaggedLprs: flagged };
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
