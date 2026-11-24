import { useTitle } from "../useTitle";
import { Link } from "react-router-dom";
import Scrolly from "../Scrolly";
import Exhibit from "../Exhibit";

export default function Home() {
  useTitle(null);
  return (
    <main>
      <Scrolly />

      <section aria-labelledby="more" className="border-b-[1.5px] border-ink bg-paper-2/80 py-20 lg:py-28">
        <div className="mx-auto max-w-[88rem] px-5 sm:px-8">
          <h2 id="more" className="cond max-w-[20ch] text-[clamp(2.4rem,5vw,3.8rem)] font-extrabold uppercase leading-[0.95] text-balance">
            And the rest of the job.
          </h2>
          <p className="mt-4 max-w-[40rem] text-[1.1rem] text-ink-2">
            Real screens from the app, loaded with made-up owners. Nothing here is a customer.
          </p>

          <div className="mt-12 grid gap-x-12 gap-y-16 lg:grid-cols-2">
            <div>
              <Exhibit src="/shots/d-dashboard.webp" phoneSrc="/shots/m-dashboard.webp" alt="Dashboard: calls due today and follow-ups across every project" title="Dashboard" />
              <h3 className="cond mt-5 text-[1.7rem] font-extrabold uppercase leading-none">What’s due, across every project</h3>
              <p className="mt-3 max-w-[34rem] text-[1.05rem] text-ink-2">
                Calls due today, overdue follow-ups and what’s coming this week, with a Call button on each. Open
                the app and you know who to ring first.
              </p>
            </div>
            <div>
              <Exhibit src="/shots/d-billing.webp" phoneSrc="/shots/m-billing.webp" alt="Billing page: hours, mileage and expenses totalled into an invoice" title="Billing" />
              <h3 className="cond mt-5 text-[1.7rem] font-extrabold uppercase leading-none">Hours and mileage, billed to the prospect</h3>
              <p className="mt-3 max-w-[34rem] text-[1.05rem] text-ink-2">
                Log the day’s hours, miles and expenses against the prospect number. Print the invoice, mark the
                entries billed, and don’t bill them twice.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="landman" className="mx-auto max-w-[88rem] px-5 py-20 sm:px-8 lg:py-28">
        <div className="grid gap-10 lg:grid-cols-12">
          <h2 id="landman" className="cond text-[clamp(2.4rem,5vw,3.8rem)] font-extrabold uppercase leading-[0.95] text-balance lg:col-span-6">
            Built by a working landman.
          </h2>
          <div className="prose-log max-w-[36rem] text-[1.12rem] text-ink-2 lg:col-span-6">
            <p>
              Spreadsheets don’t know a prospect number from a section number. This does. It was built for a
              real leasing project, a section, an operator, a boss who wants a weekly status, and a list of
              owners who don’t pick up.
            </p>
            <p>
              It’s in private use today. If you lease minerals for a living, ask to be told if it opens up
              to more landmen. Nothing is promised, and nothing is charged for asking.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/access" className="btn btn-primary">Request early access</Link>
              <Link to="/features" className="btn btn-quiet">Everything it does</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
