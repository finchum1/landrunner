import type { MineralOwner, Project } from './types';
import { STATUS_LABELS } from './types';
import type { LatestActivity } from './owners';
import { todayDateString } from './format';

export function ownersToRows(owners: MineralOwner[], latest: Record<string, LatestActivity>) {
  return owners.map((o) => ({
    Name: o.name,
    NMA: o.nma,
    'Interest %': o.interest_decimal != null ? Number((o.interest_decimal * 100).toFixed(6)) : '',
    Status: STATUS_LABELS[o.status],
    Phone: o.phone ?? '',
    'Phone flagged wrong': o.phone_wrong ? 'Yes' : '',
    'Other phones': (o.extra_phones ?? [])
      .filter((p) => p.number.trim())
      .map((p) => `${p.label ? p.label + ': ' : ''}${p.number}${p.wrong ? ' (wrong)' : ''}`)
      .join('; '),
    Email: o.email ?? '',
    Address: o.address ?? '',
    'Last contacted': o.last_contacted_at ? o.last_contacted_at.slice(0, 10) : '',
    'Next contact': o.next_contact_date ?? '',
    'Do not contact': o.do_not_contact ? 'Yes' : '',
    Notes: o.notes ?? '',
    'Latest log': latest[o.id]?.note ?? '',
  }));
}

export async function exportOwnersXlsx(
  project: Pick<Project, 'name'>,
  owners: MineralOwner[],
  latest: Record<string, LatestActivity>
): Promise<void> {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.json_to_sheet(ownersToRows(owners, latest));
  ws['!cols'] = [30, 9, 10, 16, 16, 10, 28, 28, 36, 13, 13, 10, 36, 40].map((wch) => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Owners');
  const safe = project.name.replace(/[^\w\- ]+/g, '').trim() || 'Project';
  XLSX.writeFile(wb, `${safe} owners ${todayDateString()}.xlsx`);
}
