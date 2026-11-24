import { Link } from "react-router-dom";
import { Wordmark } from "./SectionMark";

// The log's tail: the dark closing block real logs end with.
export default function SiteFooter() {
  return (
    <footer className="mt-auto bg-[var(--jsl-tail-bg)] text-[color:var(--jsl-tail-fg)]">
      <div
        className="mx-auto grid max-w-[88rem] gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(46,154,160,0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(46,154,160,0.16) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        <div>
          <Wordmark size={34} tone="paper" />
          <p className="mt-5 max-w-[30ch] text-[1.02rem] opacity-80">
            Lease tracking for landmen, built by a working landman.
          </p>
        </div>
        <div>
          <div className="cond text-[0.85rem] font-semibold uppercase tracking-[0.14em] text-amber">Pages</div>
          <ul className="mt-3 space-y-2 text-[1.02rem]">
            <li><Link to="/features" className="text-[color:var(--jsl-tail-fg)]">Features</Link></li>
            <li><Link to="/faq" className="text-[color:var(--jsl-tail-fg)]">FAQ</Link></li>
            <li><Link to="/access" className="text-[color:var(--jsl-tail-fg)]">Request early access</Link></li>
            <li><Link to="/login" className="text-[color:var(--jsl-tail-fg)]">Sign in</Link></li>
          </ul>
        </div>
        <div>
          <div className="cond text-[0.85rem] font-semibold uppercase tracking-[0.14em] text-amber">End of log</div>
          <p className="mt-3 max-w-[32ch] text-[0.95rem] opacity-70">
            JillSpoon Leasing is a working name. Every owner, number and screen on this site is synthetic sample
            data.
          </p>
        </div>
      </div>
    </footer>
  );
}
