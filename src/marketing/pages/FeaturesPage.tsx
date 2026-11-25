import { useTitle } from "../useTitle";
import { Link } from "react-router-dom";
import Exhibit from "../Exhibit";

const GROUPS: { name: string; rows: [string, string][] }[] = [
  {
    name: "Project",
    rows: [
      ["Prospect and legal description", "Name, prospect number for billing, target area, section, township, range and county, plus the operator you’re leasing for."],
      ["Offer terms, more than one", "Bonus per net mineral acre, royalty, term, option to extend, and a second or third tier for the owner who wants more."],
      ["Spreadsheet import", "CSV or Excel. The header row and columns are found for you, TOTAL rows are skipped, and percent or decimal interests both work."],
      ["Safe re-import", "Match by name: fill blanks only, overwrite, or add new owners only. A different phone number is kept as an extra, not lost."],
    ],
  },
  {
    name: "Calling",
    rows: [
      ["Call queue", "Due follow-ups first, then the largest net mineral acres. Future-dated owners wait their turn. Auto-advances after each logged call."],
      ["One-tap call outcomes", "No answer, voicemail, spoke with them, interested, call back, wrong number, not interested. Status and follow-up move with each."],
      ["Contact research", "Extra phone numbers, wrong-number flags, do-not-contact, and filters for who is missing a phone or email."],
      ["Tap to call, text, email", "On a phone the buttons open your dialer, messages or mail. You make the call; the log is one tap."],
      ["Follow-ups across projects", "A dashboard of what’s due today, overdue, and coming this week."],
      ["Related owners", "Link an estate and its heirs, or a couple, into a group. See the family’s combined net acres and everyone’s status in one panel."],
      ["Calendar reminders", "A private calendar link for iPhone, Google or Outlook. Each follow-up is an all-day event with a 9 am alert and the phone number in the notes; overdue calls move to today."],
      ["Morning email, optional", "A short email around 8 am Central on days something is due, with tap-to-call numbers. It stays off until it’s switched on."],
    ],
  },
  {
    name: "Offers and leases",
    rows: [
      ["Offer letters in Word", "Built from the project’s terms, one page per owner, addressed and dated. Offers expire after the number of days you set."],
      ["Owner-by-owner terms", "Assign an owner a different tier; their letter and their bonus follow it."],
      ["Bonus due and paid", "Net acres times rate for every leased owner, a paid date, and a running total outstanding."],
      ["Files on the owner", "Leases, division orders and title letters stored privately with the owner they belong to."],
    ],
  },
  {
    name: "Title and lease requests",
    rows: [
      ["Ownership report import", "The title company’s workbook: plat, owner summary, a tab per tract and the runsheet. Tabs are recognised by what’s on them, so a different county or tract layout still reads."],
      ["Lines linked to people", "Report lines are matched to your project’s owners by name. Link the rest by hand, or add the unlinked ones as new owners."],
      ["Title notes and chain of title", "The examiner’s general, subject and stranger-in-title notes, and the runsheet, sit with the owner they concern."],
      ["Lease Purchase Request", "Filled from the owner’s report lines: lessor, address, tract descriptions and acres, bonus, royalty and term, with title and curative flags set from the notes. Download your office’s LPR, filled in."],
      ["Drafts in bulk", "Select owners and make a draft for each. Someone who signs in two capacities gets two requests."],
      ["Request status", "Draft, sent to the leasing team, lease mailed, signed. The furthest status shows beside each owner, with a filter by status."],
      ["Newer report, compared first", "Importing an updated report shows what changed before it’s saved, keeps your links, and flags every request that covers a changed line."],
    ],
  },
  {
    name: "Reporting and billing",
    rows: [
      ["Client status report", "Percent leased, progress by status, recent activity, leased owners and bonus. Print to PDF or download Excel."],
      ["Prospect billing", "Log hours, mileage and expenses against the prospect number. Print the invoice, mark entries billed, don’t bill them twice."],
      ["Excel export", "The owner list, the status report and the invoice all export."],
      ["Bulk actions", "Select owners to set status, set a follow-up date, mark do-not-contact, or create offer letters in one go."],
    ],
  },
];

export default function Features() {
  useTitle("Features");
  return (
    <main>
      <header className="log-paper border-b-[1.5px] border-ink">
        <div className="mx-auto max-w-[88rem] px-5 py-14 sm:px-8 lg:py-20">
          <h1 className="cond max-w-[16ch] text-[clamp(3rem,8vw,5.6rem)] font-extrabold uppercase leading-[0.9] text-balance">
            What the log records.
          </h1>
          <p className="note mt-9 max-w-[36rem] text-[1.12rem] text-ink-2">
            Everything below is built and in use today. Team access is not, and is left off the list on purpose.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[72rem] space-y-12 px-5 py-14 sm:px-8 lg:py-20">
        {GROUPS.map((g) => (
          <section key={g.name} aria-labelledby={`g-${g.name}`}>
            <h2 id={`g-${g.name}`} className="cond border-b-[1.5px] border-ink pb-1 text-[1.6rem] font-bold uppercase tracking-[0.06em]">
              {g.name}
            </h2>
            <dl>
              {g.rows.map(([k, v]) => (
                <div key={k} className="grid gap-x-8 border-b border-ink/25 py-4 sm:grid-cols-[17rem_1fr]">
                  <dt className="font-body text-[1.1rem] font-semibold leading-tight">{k}</dt>
                  <dd className="mt-1 max-w-[44rem] text-[1.05rem] text-ink-2 sm:mt-0">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>

      <section aria-label="More screens" className="border-y-[1.5px] border-ink bg-paper-2/80 py-16 lg:py-24">
        <div className="mx-auto max-w-[72rem] space-y-14 px-5 sm:px-8">
          <Exhibit src="/shots/d-or.webp" phoneSrc="/shots/m-or.webp" alt="Ownership report page: owner lines with interest, net acres by tract and the linked owner" title="Ownership report: every line, linked to the owner" />
          <Exhibit src="/shots/d-lpr.webp" phoneSrc="/shots/m-lpr.webp" alt="Lease Purchase Request filled in from the ownership report" title="Lease purchase request: filled from the title" />
          <Exhibit src="/shots/d-update.webp" phoneSrc="/shots/m-update.webp" alt="Newer ownership report compared with the one on file, with lease requests flagged for revision" title="Newer report: what changed, before you save it" />
          <Exhibit src="/shots/d-dashboard.webp" phoneSrc="/shots/m-dashboard.webp" alt="Dashboard of calls due today and follow-ups across projects" title="Dashboard: what’s due, across every project" />
          <Exhibit src="/shots/d-billing.webp" phoneSrc="/shots/m-billing.webp" alt="Billing page: hours, mileage and expenses totalled into an invoice" title="Billing: hours, mileage and expenses to an invoice" />
        </div>
      </section>

      <div className="mx-auto flex max-w-[72rem] flex-wrap items-center gap-6 px-5 py-14 sm:px-8 lg:py-20">
        <p className="cond max-w-[22ch] text-[1.9rem] font-bold uppercase leading-[1.02]">Want it on your next project?</p>
        <Link to="/access" className="btn btn-primary">Request early access</Link>
      </div>
    </main>
  );
}
