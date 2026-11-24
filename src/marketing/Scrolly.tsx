import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Exhibit from "./Exhibit";

// Real app screens, in the order a lease project runs. SHOTS[0] is the opening
// view; SHOTS[i] belongs to STEPS[i - 1].
const SHOTS = [
  { d: "project", m: "owners", title: "The project", alt: "Project page: status counts, filters and every owner ranked by net mineral acres" },
  { d: "import", m: "import", title: "Import the spreadsheet", alt: "Upload dialog matching spreadsheet columns to owner fields, with a preview of the owners" },
  { d: "owner", m: "owner", title: "Log the call", alt: "Owner panel with one-tap call outcomes: no answer, voicemail, spoke with them, interested" },
  { d: "letters", m: "letters", title: "Offer letters", alt: "Offer letter dialog with the terms to offer and a live preview of the letter" },
  { d: "lease", m: "lease", title: "Lease and bonus", alt: "Leased owner with the bonus due, the date it was paid, and the executed lease attached" },
  { d: "report", m: "report", title: "Status report", alt: "Client status report: percent of net acres leased, progress by status, leased owners and bonus" },
] as const;

const STEPS = [
  {
    id: "import",
    title: "Start with the spreadsheet you already have.",
    body: [
      "Drop in the ownership report. Every owner lands in the project ranked by net mineral acres — name, interest, NMA, notes — with the header row and columns found for you.",
      "When the title update comes in, re-import it. Owners are matched by name, blanks get filled, and nothing you’ve already worked is overwritten.",
    ],
  },
  {
    id: "call",
    title: "Call the biggest acres first.",
    body: [
      "The call queue puts due follow-ups first, then the largest net mineral acres. Tap Call, and when you hang up, tap what happened: no answer, voicemail, spoke with them.",
      "Status and the next follow-up date move for you. Wrong numbers and do-not-contact owners are flagged and kept out of the queue, not forgotten.",
    ],
  },
  {
    id: "offer",
    title: "Offer letters in the operator’s words.",
    body: [
      "Set the project’s terms once: bonus per net mineral acre, royalty, term, an option to extend, and how many days the offer stays open. Add a second tier for the owner who wants more.",
      "Select owners and download Word letters, one page each, addressed and dated. They’re logged and marked Offer Made with a follow-up already set.",
    ],
  },
  {
    id: "lease",
    title: "Lease it. Track the bonus.",
    body: [
      "Bonus due is net acres times the owner’s rate, and you mark it paid when the check goes out. The executed lease, the division order, the title letter: attach them to the owner.",
    ],
  },
  {
    id: "report",
    title: "Send the status report. Bill the prospect.",
    body: [
      "One page for the operator: percent of net acres leased, progress by status, this week’s activity. Print it to PDF or hand over the Excel.",
      "Hours, mileage and expenses are logged against the prospect number and print as an invoice, so billing the work isn’t a second spreadsheet.",
    ],
  },
] as const;

export default function Scrolly() {
  const [active, setActive] = useState(0); // 0 = opening view, 1..5 = steps
  const refs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const els = refs.current.filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step));
        });
      },
      { rootMargin: "-42% 0px -48% 0px", threshold: 0 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section aria-label="How a lease project runs" className="log-paper border-b-[1.5px] border-ink">
      <div className="mx-auto max-w-[88rem] px-5 sm:px-8">
        <div className="grid items-start gap-x-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.45fr)]">
          <div className="lg:pb-24">
            {/* opening copy is step 0 */}
            <div
              ref={(el) => {
                refs.current[0] = el;
              }}
              data-step={0}
              className="flex flex-col justify-center pb-6 pt-8 lg:min-h-[calc(100svh-7rem)] lg:py-16"
            >
              <h1 className="cond text-[clamp(2.9rem,8vw,5.6rem)] font-extrabold uppercase leading-[0.9] tracking-[-0.005em] text-balance">
                Every net mineral acre, logged.
              </h1>
              <p className="note mt-4 max-w-[34rem] !p-3.5 text-[1rem] leading-[1.42] text-ink-2 lg:mt-6 lg:!p-[1.1rem_1.3rem] lg:text-[1.15rem]">
                Run a lease project from the ownership spreadsheet to the operator’s status report: call queue,
                offer letters, bonus tracking and billing. Built by a working landman.
              </p>
              <div className="mt-6 flex flex-wrap gap-4 lg:mt-8">
                <Link to="/access" className="btn btn-primary max-lg:w-full">
                  Request early access
                </Link>
                <a href="#import" className="btn btn-quiet hidden lg:inline-flex">
                  Watch a project run
                </a>
              </div>
              <p className="mt-5 hidden text-[0.95rem] text-ink-2 lg:block">Screens are the real app, loaded with made-up owners.</p>

              {/* phones: the opening screen sits right under the button */}
              <div className="mt-7 lg:hidden">
                <Exhibit src={`/shots/d-${SHOTS[0].d}.webp`} phoneSrc={`/shots/m-${SHOTS[0].m}.webp`} alt={SHOTS[0].alt} title={SHOTS[0].title} priority />
              </div>
            </div>

            {STEPS.map((s, i) => (
              <article
                key={s.id}
                id={s.id}
                ref={(el) => {
                  refs.current[i + 1] = el;
                }}
                data-step={i + 1}
                className="py-9 lg:flex lg:min-h-[78svh] lg:flex-col lg:justify-center lg:py-16"
              >
                {/* phones: each stage carries its own screen above its words */}
                <div className="mb-5 lg:hidden">
                  <Exhibit src={`/shots/d-${SHOTS[i + 1].d}.webp`} phoneSrc={`/shots/m-${SHOTS[i + 1].m}.webp`} alt={SHOTS[i + 1].alt} title={SHOTS[i + 1].title} />
                </div>
                <h2 className="cond max-w-[20ch] text-[clamp(2rem,4.2vw,3.2rem)] font-extrabold uppercase leading-[0.96] tracking-[-0.005em] text-balance">
                  {s.title}
                </h2>
                <div className="note prose-log mt-4 max-w-[34rem] text-[1.03rem] text-ink-2 lg:mt-5 lg:text-[1.08rem]">
                  {s.body.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                </div>
              </article>
            ))}
          </div>

          {/* desktop: the app, sticky beside the story, changing as you scroll */}
          <div className="hidden lg:col-start-2 lg:row-start-1 lg:sticky lg:top-[5.5rem] lg:block lg:pt-3">
            <figure className="border-[1.5px] border-ink bg-paper shadow-[0_14px_30px_-14px_var(--jsl-shadow)]">
              <figcaption className="flex items-center justify-between border-b-[1.5px] border-ink bg-[var(--jsl-tail-bg)] px-3 py-1.5 text-[color:var(--jsl-tail-fg)]">
                <span className="cond text-[1.05rem] font-bold uppercase tracking-[0.1em]">{SHOTS[active].title}</span>
                <span className="label !text-[color:var(--jsl-tail-fg)] opacity-60">sample data</span>
              </figcaption>
              <div className="relative aspect-[2360/1480] w-full">
                {SHOTS.map((s, i) => (
                  <img
                    key={s.d}
                    src={`/shots/d-${s.d}.webp`}
                    alt={i === active ? s.alt : ""}
                    aria-hidden={i !== active}
                    width={2360}
                    height={1480}
                    loading={i <= 1 ? "eager" : "lazy"}
                    decoding="async"
                    className="jsl-shot log-fade absolute inset-0 h-full w-full"
                    style={{ opacity: i === active ? 1 : 0 }}
                  />
                ))}
              </div>
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}
