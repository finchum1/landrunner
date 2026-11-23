import type { LandmanProfile, MineralOwner, Project, ProjectOfferTerms } from './types';

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`;
}

// "2026-11-20" -> "November 20th, 2026" (parsed by parts: no UTC off-by-one).
export function formatLetterDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${MONTHS[m - 1]} ${ordinal(d)}, ${y}`;
}

// 12 -> "one-year", 24 -> "two-year", 6 -> "six-month", 18 -> "eighteen-month".
export function leaseTermPhrase(months: number | null): string {
  if (!months) return '';
  if (months % 12 === 0) {
    const y = months / 12;
    return `${y <= 20 ? ONES[y] : y}-year`;
  }
  return `${months <= 20 ? ONES[months] : months}-month`;
}

// "3/16" -> "3/16th", "1/8" -> "1/8th"; anything else is used as typed.
export function royaltyPhrase(label: string | null): string {
  if (!label) return '';
  return /^\d+\/\d+$/.test(label.trim()) ? `${label.trim()}th` : label.trim();
}

export function daysPhrase(n: number): string {
  return `${n <= 20 ? ONES[n] : n} (${n})`;
}

export function moneyPerAcre(rate: number): string {
  return `$${Number.isInteger(rate) ? rate.toLocaleString('en-US') : rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function sectionLine(p: Pick<Project, 'section' | 'township' | 'range'>): string {
  const tr = [p.township, p.range].filter(Boolean).join('-');
  const parts = [p.section, tr].filter(Boolean).join('-');
  return parts ? `Section ${parts}` : '';
}

// "Lease your interest in the captioned land for a bonus consideration of $125
// per net mineral acre and 3/16th royalty, with an option to extend."
export function offerSentence(t: ProjectOfferTerms, includeTerm: boolean): string {
  const bits: string[] = [];
  if (t.rate_per_acre != null) bits.push(`a bonus consideration of ${moneyPerAcre(t.rate_per_acre)} per net mineral acre`);
  if (t.royalty_label) bits.push(`${royaltyPhrase(t.royalty_label)} royalty`);
  let s = `Lease your interest in the captioned land for ${bits.join(' and ') || 'the consideration discussed'}`;
  if (includeTerm && t.lease_term_months) s += ` for a ${leaseTermPhrase(t.lease_term_months)} term`;
  if (t.option_to_extend) s += ', with an option to extend';
  return s + '.';
}

export interface LetterModel {
  ownerId: string | null;
  dateLine: string;
  addressLines: string[];
  reLines: string[];
  greeting: string;
  intro: string;
  offers: { heading: string | null; text: string }[];
  closing: string;
  signer: { fullName: string; title: string; phone: string; email: string };
}

export interface LetterOptions {
  date: string; // YYYY-MM-DD
  greetByName: boolean;
  includeAddress: boolean;
}

// Which tiers one owner's letter shows: their assigned tier, else the chosen ones.
export function tiersForOwner(
  owner: Pick<MineralOwner, 'offer_terms_id'> | null,
  chosen: ProjectOfferTerms[],
  all: ProjectOfferTerms[]
): ProjectOfferTerms[] {
  const assigned = owner?.offer_terms_id ? all.find((t) => t.id === owner.offer_terms_id) : undefined;
  return assigned ? [assigned] : chosen;
}

export function buildLetter(
  project: Project,
  tiers: ProjectOfferTerms[],
  owner: Pick<MineralOwner, 'id' | 'name' | 'address'> | null,
  profile: Pick<LandmanProfile, 'full_name' | 'title' | 'phone' | 'email'>,
  opts: LetterOptions
): LetterModel {
  const op = project.operator_name?.trim() || 'my client';
  const multi = tiers.length > 1;
  const sameTerm = tiers.every((t) => t.lease_term_months === tiers[0]?.lease_term_months);
  const termPhrase = sameTerm ? leaseTermPhrase(tiers[0]?.lease_term_months ?? null) : '';
  const lease = `${termPhrase ? termPhrase + ' ' : ''}paid-up oil and gas lease`;
  const intro =
    `I have been authorized by ${op} to offer a ${lease} in the above-described section and hereby propose ` +
    `${multi ? 'that you choose one of the below-described offers' : 'you choose the below-described offer'} in exchange for lease of your interest:`;

  const offers = tiers.map((t, i) => ({
    heading: multi ? `Option ${i + 1}${t.label ? ` — ${t.label}` : ''}` : null,
    text: offerSentence(t, !sameTerm),
  }));

  const possessive = op.endsWith('s') ? `${op}’` : `${op}’s`;
  const closing =
    `If you are interested in leasing your mineral interest or would like to discuss the offer further, please contact me at your earliest convenience. ` +
    `My contact information is noted below. Upon confirmation, ${op} will prepare a lease and forward it to you for review and execution. ` +
    `${op} will commence title verification of your interest, and any lease will be subject to ${possessive} approval. ` +
    `${op}, in its sole opinion, will determine whether both are acceptable. ` +
    `${op} reserves the right to terminate this offer at any time for any reason. ` +
    `This offer will terminate ${daysPhrase(project.offer_valid_days || 14)} days after receipt.`;

  const addressLines =
    opts.includeAddress && owner?.address?.trim()
      ? [owner.name, ...owner.address.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)]
      : [];

  return {
    ownerId: owner?.id ?? null,
    dateLine: formatLetterDate(opts.date),
    addressLines,
    reLines: [
      'Oil & Gas Lease',
      sectionLine(project),
      project.county ? `${project.county} County, Oklahoma` : '',
    ].filter(Boolean),
    greeting: opts.greetByName && owner ? `Dear ${owner.name}:` : 'Dear Mineral Owner:',
    intro,
    offers,
    closing,
    signer: {
      fullName: profile.full_name ?? '',
      title: profile.title ?? '',
      phone: profile.phone ?? '',
      email: profile.email ?? '',
    },
  };
}

// Plain-text rendering, for the on-screen preview and tests.
export function letterToText(m: LetterModel): string {
  return [
    m.dateLine,
    m.addressLines.join('\n'),
    `Re: ${m.reLines[0]}\n${m.reLines.slice(1).join('\n')}`,
    m.greeting,
    m.intro,
    ...m.offers.map((o) => (o.heading ? `${o.heading}: ${o.text}` : o.text)),
    m.closing,
    'Best regards,',
    `${m.signer.fullName}\n${m.signer.fullName}\n${m.signer.title}`,
    m.signer.phone ? `Cell: ${m.signer.phone}` : '',
    m.signer.email ? `E-mail: ${m.signer.email}` : '',
  ]
    .filter((x) => x !== '')
    .join('\n\n');
}

// One .docx with a page per letter. Layout follows Terrence's own template:
// Letter size, 1" margins, justified Calibri 11, signature in Zapfino.
export async function buildLettersDocx(models: LetterModel[]): Promise<Blob> {
  const d = await import('docx');
  const { Document, Packer, Paragraph, TextRun, AlignmentType, TabStopType } = d;
  const FONT = 'Calibri';
  const para = (text: string, o: { bold?: boolean; font?: string; size?: number; after?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; indent?: number } = {}) =>
    new Paragraph({
      alignment: o.align ?? AlignmentType.JUSTIFIED,
      spacing: { after: o.after ?? 200, line: 276 },
      indent: o.indent ? { left: o.indent } : undefined,
      children: [new TextRun({ text, bold: o.bold, font: o.font ?? FONT, size: o.size ?? 22 })],
    });

  const sections = models.map((m) => {
    const children: InstanceType<typeof Paragraph>[] = [];
    children.push(para(m.dateLine, { align: AlignmentType.LEFT }));
    if (m.addressLines.length) {
      m.addressLines.forEach((l, i) =>
        children.push(para(l, { align: AlignmentType.LEFT, after: i === m.addressLines.length - 1 ? 200 : 0 }))
      );
    }
    m.reLines.forEach((l, i) =>
      children.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { after: i === m.reLines.length - 1 ? 200 : 0, line: 276 },
          indent: i > 0 ? { left: 540 } : undefined,
          children: [
            ...(i === 0 ? [new TextRun({ text: 'Re:\t', bold: true, font: FONT, size: 22 })] : []),
            new TextRun({ text: l, bold: true, font: FONT, size: 22 }),
          ],
          tabStops: [{ type: TabStopType.LEFT, position: 540 }],
        })
      )
    );
    children.push(para(m.greeting, { align: AlignmentType.LEFT }));
    children.push(para(m.intro));
    m.offers.forEach((o) =>
      children.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 200, line: 276 },
          indent: { left: 720, right: 360 },
          children: [
            ...(o.heading ? [new TextRun({ text: `${o.heading}: `, bold: true, font: FONT, size: 22 })] : []),
            new TextRun({ text: o.text, font: FONT, size: 22 }),
          ],
        })
      )
    );
    children.push(para(m.closing));
    children.push(para('Best regards,', { align: AlignmentType.LEFT, after: 120 }));
    children.push(para(m.signer.fullName, { font: 'Zapfino', size: 28, align: AlignmentType.LEFT, after: 120 }));
    children.push(para(m.signer.fullName, { align: AlignmentType.LEFT, after: 0 }));
    if (m.signer.title) children.push(para(m.signer.title, { align: AlignmentType.LEFT, after: 0 }));
    if (m.signer.phone) children.push(para(`Cell: ${m.signer.phone}`, { align: AlignmentType.LEFT, after: 0 }));
    if (m.signer.email) children.push(para(`E-mail: ${m.signer.email}`, { align: AlignmentType.LEFT, after: 0 }));
    return {
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1260, left: 1440 } } },
      children,
    };
  });

  const doc = new Document({ sections });
  return Packer.toBlob(doc);
}
