import { useTitle } from "../useTitle";
import AccessForm from "../AccessForm";

export default function Access() {
  useTitle("Request early access");
  return (
    <main>
      <header className="log-paper border-b-[1.5px] border-ink">
        <div className="mx-auto max-w-[88rem] px-5 py-14 sm:px-8 lg:py-20">
          <h1 className="cond text-[clamp(3rem,8vw,5.6rem)] font-bold uppercase leading-[0.9] text-balance">Get on the log.</h1>
          <p className="note mt-9 max-w-[32rem] text-[1.12rem] text-ink-2">
            JillSpoon Leasing is in private use today. Tell us how you work and ask to be told if it opens up to
            more landmen. Nothing is promised.
          </p>
        </div>
      </header>
      <div className="mx-auto grid max-w-[88rem] gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:py-20">
        <ul className="max-w-[30rem] space-y-3 text-[1.05rem] text-ink-2">
          <li className="border-t border-ink/30 pt-3">No pricing is set yet. Nothing is charged by asking.</li>
          <li className="border-t border-ink/30 pt-3">Requests go straight to the person who built it.</li>
        </ul>
        <AccessForm />
      </div>
    </main>
  );
}
