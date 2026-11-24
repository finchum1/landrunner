import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import SectionLog, { LogKey } from "./SectionLog";

const STEPS = [
  {
    id: "import",
    tab: "Import",
    title: "Start with the spreadsheet you already have.",
    body: [
      "Drop in the ownership report. Every owner lands in the project ranked by net mineral acres — name, interest, NMA, notes — with the header row and columns found for you.",
      "When the title update comes in, re-import it. Owners are matched by name, blanks get filled, and nothing you’ve already worked is overwritten.",
    ],
  },
  {
    id: "call",
    tab: "Call",
    title: "Call the biggest acres first.",
    body: [
      "The call queue puts due follow-ups first, then the largest net mineral acres. Tap Call, and when you hang up, tap what happened: no answer, voicemail, spoke with them.",
      "Status and the next follow-up date move for you. Wrong numbers and do-not-contact owners are flagged and kept out of the queue, not forgotten.",
    ],
  },
  {
    id: "offer",
    tab: "Offer",
    title: "Offer letters in the operator’s words.",
    body: [
      "Set the project’s terms once: bonus per net mineral acre, royalty, term, an option to extend, and how many days the offer stays open. Add a second tier for the owner who wants more.",
      "Select owners and download Word letters, one page each, addressed and dated. They’re logged and marked Offer Made with a follow-up already set.",
    ],
  },
  {
    id: "lease",
    tab: "Lease",
    title: "Lease it. Track the bonus.",
    body: [
      "A signed lease turns the interval green. Bonus due is net acres times the owner’s rate, and you mark it paid when the check goes out. The executed lease, the division order, the title letter: attach them to the owner.",
    ],
  },
  {
    id: "report",
    tab: "Report",
    title: "Send the status report. Bill the prospect.",
    body: [
      "One page for the operator: percent of net acres leased, progress by status, this week’s activity. Print it to PDF or hand over the Excel.",
      "Hours, mileage and expenses are logged against the prospect number and print as an invoice, so billing the work isn’t a second spreadsheet.",
    ],
  },
] as const;

export default function Scrolly() {
  const [active, setActive] = useState(0); // 0 = hero, 1..5 = steps
  const refs = useRef<(HTMLElement | null)[]>([]);
  const [bodyH, setBodyH] = useState(440);

  // Fit the sticky log to the window: chrome around the strip is ~380px.
  useEffect(() => {
    const fit = () => setBodyH(Math.max(260, Math.min(560, Math.round(window.innerHeight - 440))));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

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

  const mobileStep = STEPS[Math.max(active, 1) - 1];

  return (
    <section aria-label="How a lease project runs" className="log-paper border-b-[1.5px] border-ink">
      <div className="mx-auto max-w-[88rem] px-5 sm:px-8">
        <div className="grid items-start gap-x-14 lg:grid-cols-[minmax(0,1fr)_minmax(26rem,33rem)]">
          <div className="lg:pb-24">
            {/* hero copy is step 0 */}
            <div
              ref={(el) => {
                refs.current[0] = el;
              }}
              data-step={0}
              className="flex flex-col justify-center pb-6 pt-8 lg:min-h-[calc(100svh-7rem)] lg:py-16"
            >
              <h1 className="cond text-[clamp(2.9rem,9vw,6rem)] font-extrabold uppercase leading-[0.9] tracking-[-0.005em] text-balance">
                Every net mineral acre, logged.
              </h1>
              <p className="note mt-4 max-w-[34rem] !p-3.5 text-[1rem] leading-[1.42] text-ink-2 lg:mt-6 lg:!p-[1.1rem_1.3rem] lg:text-[1.18rem]">
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
              <p className="mt-5 hidden text-[0.95rem] text-ink-2 lg:block">The log beside this is sample data, not a real project.</p>
            </div>

            {STEPS.map((s, i) => (
              <article
                key={s.id}
                id={s.id}
                ref={(el) => {
                  refs.current[i + 1] = el;
                }}
                data-step={i + 1}
                className="hidden flex-col justify-center lg:flex lg:min-h-[78svh] lg:py-16"
              >
                <h2 className="cond max-w-[20ch] text-[clamp(2.2rem,4.6vw,3.4rem)] font-extrabold uppercase leading-[0.96] tracking-[-0.005em] text-balance">
                  {s.title}
                </h2>
                <div className="note prose-log mt-5 max-w-[34rem] text-[1.1rem] text-ink-2">
                  {s.body.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                </div>
              </article>
            ))}
          </div>

          {/* the log: sticky on desktop, a tabbed instrument on phones */}
          <div id="log" className="lg:col-start-2 lg:row-start-1 lg:sticky lg:top-[5.5rem] lg:pt-3">
            <div className="hidden lg:block">
              <SectionLog step={active} bodyH={bodyH} uid="d" />
            </div>
            <div className="lg:hidden">
              <SectionLog step={active || 1} compact bodyH={430} uid="m" />
            </div>
            <div className="mt-4 lg:hidden">
              <p className="label mb-1.5 !text-ink-2">Tap a stage</p>
              <div role="tablist" aria-label="Project stage" className="grid grid-cols-5 border-[1.5px] border-ink bg-paper">
                {STEPS.map((s, i) => (
                  <button
                    key={s.id}
                    role="tab"
                    aria-selected={active === i + 1}
                    onClick={() => setActive(i + 1)}
                    className={`cond py-3 text-[1.1rem] font-bold uppercase tracking-[0.08em] ${i > 0 ? "border-l-[1.5px] border-ink" : ""} ${
                      active === i + 1 ? "bg-ink text-paper" : "bg-paper text-ink"
                    }`}
                  >
                    {s.tab}
                  </button>
                ))}
              </div>
              <div className="mt-5 pb-8">
                <h2 className="cond text-[1.9rem] font-bold uppercase leading-[0.98] text-balance">{mobileStep.title}</h2>
                <div className="note prose-log mt-3 text-[1.05rem] text-ink-2">
                  {mobileStep.body.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                </div>
              </div>
              <LogKey uid="km" />
            </div>
            <div className="mt-4 hidden lg:block">
              <LogKey uid="kd" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
