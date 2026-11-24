import { Link } from "react-router-dom";
import { Wordmark } from "./SectionMark";

const LINKS = [
  { href: "/features", label: "Features" },
  { href: "/faq", label: "FAQ" },
];

export default function SiteNav() {
  return (
    <header className="sticky top-0 z-40 border-b-[1.5px] border-ink bg-paper/95 backdrop-blur-[2px]">
      <nav aria-label="Main" className="mx-auto flex max-w-[88rem] items-stretch justify-between px-5 sm:px-8">
        <Link to="/" aria-label="JillSpoon Leasing home" className="flex items-center py-3 no-underline">
          <Wordmark size={30} />
        </Link>
        <ul className="flex items-stretch">
          {LINKS.map((l) => (
            <li key={l.href} className="flex">
              <Link
                to={l.href}
                className="cond flex items-center border-l-[1.5px] border-ink px-3.5 text-[1rem] sm:px-6 sm:text-[1.05rem] font-semibold uppercase tracking-[0.1em] no-underline hover:bg-paper-3"
              >
                {l.label}
              </Link>
            </li>
          ))}
          <li className="hidden sm:flex">
            <Link
              to="/login"
              className="cond flex items-center border-l-[1.5px] border-ink px-6 text-[1.05rem] font-semibold uppercase tracking-[0.1em] no-underline hover:bg-paper-3"
            >
              Sign in
            </Link>
          </li>
          <li className="flex">
            <Link
              to="/access"
              className="cond flex items-center border-l-[1.5px] border-ink bg-amber px-4 text-[1rem] font-bold uppercase tracking-[0.1em] no-underline hover:bg-[#ffb92f] sm:px-7 sm:text-[1.05rem]"
            >
              <span className="sm:hidden">Access</span>
              <span className="hidden sm:inline">Request access</span>
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
