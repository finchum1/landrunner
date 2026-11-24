import { useTitle } from "../useTitle";
import { Link } from "react-router-dom";
import Scrolly from "../Scrolly";
import Exhibit from "../Exhibit";

export default function Home() {
  useTitle(null);
  return (
    <main>
      <Scrolly />

      <section aria-labelledby="screens" className="border-y-[1.5px] border-ink bg-paper-2/80 py-20 lg:py-28">
        <div className="mx-auto max-w-[88rem] px-5 sm:px-8">
          <h2 id="screens" className="cond max-w-[18ch] text-[clamp(2.4rem,5vw,3.8rem)] font-extrabold uppercase leading-[0.95] text-balance">
            The same project, from the driver’s seat.
          </h2>
          <p className="mt-4 max-w-[40rem] text-[1.1rem] text-ink-2">
            Real screens from the app, loaded with made-up owners. Nothing here is a customer.
          </p>

          <div className="mt-12 grid gap-x-12 gap-y-16 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <Exhibit src="/shots/project.webp" alt="Project page: offer terms, status counts and the owner table ranked by net mineral acres" title="The project" priority />
            </div>
            <div className="self-end lg:col-span-4">
              <h3 className="cond text-[1.7rem] font-bold uppercase leading-none">Everyone, ranked by acres</h3>
              <p className="mt-3 text-[1.05rem] text-ink-2">
                Offer terms up top, status counts you can click to filter, and a table that already knows who
                has no phone number, who’s overdue, and who owns nothing worth a call.
              </p>
            </div>

            <div className="self-end lg:col-span-4 lg:order-none">
              <h3 className="cond text-[1.7rem] font-bold uppercase leading-none">One tap per call</h3>
              <p className="mt-3 text-[1.05rem] text-ink-2">
                Pick what happened and the status and follow-up date move with it. The note is optional. The
                next owner in the queue is already open.
              </p>
            </div>
            <div className="lg:col-span-8">
              <Exhibit src="/shots/owner.webp" alt="Owner panel with call outcome buttons, offer terms and files" title="The call" />
            </div>

            <div className="lg:col-span-6">
              <Exhibit src="/shots/letters.webp" alt="Offer letter dialog with a live preview of the letter" title="Offer letters" />
              <p className="mt-4 max-w-[34rem] text-[1.05rem] text-ink-2">
                Pick the terms, check the preview, download. One Word file, a page per owner, in the
                operator’s name and yours.
              </p>
            </div>
            <div className="lg:col-span-6">
              <Exhibit src="/shots/report.webp" alt="Client status report: percent leased, progress by status, leased owners and bonus" title="The status report" />
              <p className="mt-4 max-w-[34rem] text-[1.05rem] text-ink-2">
                No phone numbers, no internal notes. Safe to forward to the operator as it stands.
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
