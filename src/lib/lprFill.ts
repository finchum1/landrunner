import type { LprData } from './lpr';
import { lprTotals, lprSheetName } from './lpr';

const toDate = (s: string) => {
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3]));
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); // the report's own m/d/yyyy
  return us ? new Date(Date.UTC(+us[3], +us[1] - 1, +us[2])) : null;
};
const num = (s: string) => (s.trim() !== '' && Number.isFinite(Number(s)) ? Number(s) : s);

// Fill the office's own LPR form (kept as a blank template, formulas and
// formatting intact) with one lessor's data.
export async function fillLpr(templateBytes: ArrayBuffer, d: LprData): Promise<ArrayBuffer> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(templateBytes);
  const ws = wb.worksheets[0];
  ws.name = lprSheetName(d.lessor);
  const set = (addr: string, v: unknown) => {
    ws.getCell(addr).value = v === '' || v === undefined ? null : (v as never);
  };
  const t = lprTotals(d);

  set('D2', d.prospect);
  set('G2', d.orDate ? (toDate(d.orDate) ?? d.orDate) : '');
  set('D3', toDate(d.lprDate));
  set('G3', d.examiner);
  set('D4', d.revised === 'Y' && d.prevLprDate ? `Y - ${d.prevLprDate}` : d.revised);
  set('G4', d.lastBp);
  set('D5', d.buyer);
  set('G5', d.orType);
  set('D6', d.projectManager);
  set('G6', d.titleVerif);
  set('D7', d.rush);
  set('D8', d.delivery);
  set('D9', d.partOfGroup);
  set('C11', d.section);
  set('E11', d.township);
  set('G11', d.range);
  set('C13', d.county);
  set('F13', d.tractNumbers);
  set('C14', d.legalDescription);
  set('C15', d.lessee);
  set('C16', d.lessor);
  set('C17', d.marital);
  set('C18', d.address);
  set('C19', d.phone);
  set('C21', toDate(d.leaseDate));
  set('E21', num(d.leaseTerm));
  set('G21', num(d.optionTerm));
  set('C23', d.royalty);
  set('E23', d.pricePerAcre);
  set('G23', d.optionPrice);
  // the form's own formulas, with their results filled in so viewers that don't recalculate still show the right numbers
  set('C22', { formula: 'E30', result: t.gross });
  set('E22', { formula: 'F30', result: t.net });
  set('E24', { formula: 'E23*E22', result: t.bonus ?? 0 });
  for (let i = 0; i < 3; i++) {
    const r = 27 + i;
    const row = d.tracts[i];
    set(`B${r}`, row?.legal ?? '');
    set(`D${r}`, row ? row.tr : '');
    set(`E${r}`, row?.gross ?? '');
    set(`F${r}`, row?.net ?? '');
    if (row && row.gross) set(`G${r}`, { formula: `F${r}/E${r}`, result: (row.net ?? 0) / row.gross });
    else if (i === 2) set(`G${r}`, '');
  }
  set('E30', { formula: 'SUM(E27:E29)', result: t.gross });
  set('F30', { formula: 'SUM(F27:F29)', result: t.net });
  set('D32', d.surfaceOwner);
  set('G32', d.leaseForm);
  set('D33', d.recordOwner);
  set('G33', d.exhibitAttached);
  set('D34', d.orTitleNote);
  set('G34', d.exhibitName);
  set('D35', d.orTitleNoteNums);
  set('G35', d.approvalEmail);
  set('D36', d.curativeRequired);
  set('G36', d.trustDocs);
  set('D37', d.curativeAttached);
  set('G37', d.memoOfLease);
  set('B39', d.curativeNotes);
  set('E39', d.leaseNotes);
  set('C40', d.lprNumber);
  set('F40', toDate(d.mailDate));
  wb.calcProperties.fullCalcOnLoad = true;
  const out = await wb.xlsx.writeBuffer();
  return out as ArrayBuffer;
}
