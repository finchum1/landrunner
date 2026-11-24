import { useTitle } from "../useTitle";
import { Link } from "react-router-dom";

const QA: [string, string][] = [
  ["Is it available now?", "It’s in private use today. There is no public sign-up yet. Ask to be told if it opens to more landmen; nothing is promised."],
  ["What does it cost?", "Pricing isn’t set. We’d rather tell you that than invent a number."],
  ["Does it dial for me?", "No. On a phone, the Call button opens your dialer with the number filled in. You make the call, then tap what happened."],
  ["Does it work on my phone?", "Yes. The owner table becomes a list of owner cards, with a Call button on each, so it works from the truck."],
  ["Can I bring my own spreadsheet?", "Yes. CSV and Excel. It finds the header row, guesses the columns, and lets you correct them before anything is imported. Re-importing later updates owners by name rather than duplicating them."],
  ["Does it write the lease?", "It writes the offer letter, as a Word document built from your project’s terms. It does not draft lease forms."],
  ["Who can see my project?", "Today each account is one landman. Team and operator access are not built yet."],
  ["Can I get my data out?", "Yes. The owner list, the status report and the invoice all export to Excel, and the report and invoice print to PDF."],
  ["Does it send reminders?", "Not yet. The dashboard shows what’s due today and this week; email and calendar reminders are not built."],
  ["Why is it called JillSpoon Leasing?", "It’s a working name and may change. Nothing about how it works depends on it."],
];

export default function Faq() {
  useTitle("FAQ");
  return (
    <main>
      <header className="log-paper border-b-[1.5px] border-ink">
        <div className="mx-auto flex max-w-[88rem] flex-wrap items-end justify-between gap-6 px-5 py-14 sm:px-8 lg:py-20">
          <div>
            <h1 className="cond text-[clamp(3rem,8vw,5.6rem)] font-bold uppercase leading-[0.9] text-balance">Plain answers.</h1>
            <p className="note mt-9 max-w-[26rem] text-[1.1rem] text-ink-2">Anything we haven’t built yet is marked as such.</p>
          </div>
          <Link to="/access" className="btn btn-primary">Request early access</Link>
        </div>
      </header>
      <div className="mx-auto max-w-[60rem] px-5 py-14 sm:px-8 lg:py-20">
        <div className="border-t-[1.5px] border-ink">
          {QA.map(([q, a]) => (
            <details key={q} className="group border-b-[1.5px] border-ink">
              <summary className="cond flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[1.45rem] font-bold uppercase leading-tight tracking-[0.02em] marker:hidden [&::-webkit-details-marker]:hidden">
                {q}
                <span aria-hidden="true" className="num grid h-8 w-8 shrink-0 place-items-center border-[1.5px] border-ink text-[1.3rem] leading-none transition-colors group-open:bg-ink group-open:text-paper">
                  <span className="group-open:hidden">+</span>
                  <span className="hidden group-open:inline">−</span>
                </span>
              </summary>
              <p className="max-w-[44rem] pb-6 text-[1.08rem] text-ink-2">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </main>
  );
}
