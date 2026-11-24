import { Link } from "react-router-dom";
import { Wordmark } from "./SectionMark";
import type { Theme } from "../lib/theme";

const LINKS = [
  { href: "/features", label: "Features" },
  { href: "/faq", label: "FAQ" },
];

const CELL =
  "cond flex items-center border-l-[1.5px] border-ink text-[1rem] font-bold uppercase tracking-[0.1em] no-underline hover:bg-paper-3 sm:text-[1.2rem]";

export default function SiteNav({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const dark = theme === "dark";
  return (
    <header className="sticky top-0 z-40 border-b-[1.5px] border-ink bg-paper/95 backdrop-blur-[2px]">
      <nav aria-label="Main" className="mx-auto flex max-w-[88rem] items-stretch justify-between px-4 sm:px-8">
        <Link to="/" aria-label="JillSpoon Leasing home" className="flex items-center py-3 no-underline sm:py-3.5">
          <span className="sm:hidden">
            <Wordmark size={30} />
          </span>
          <span className="hidden sm:inline-flex">
            <Wordmark size={50} />
          </span>
        </Link>
        <ul className="flex items-stretch">
          {LINKS.map((l) => (
            <li key={l.href} className="flex">
              <Link to={l.href} className={`${CELL} px-2.5 sm:px-6`}>
                {l.label}
              </Link>
            </li>
          ))}
          <li className="hidden sm:flex">
            <Link to="/login" className={`${CELL} px-6`}>
              Sign in
            </Link>
          </li>
          <li className="flex">
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
              title={dark ? "Light theme" : "Dark theme"}
              className="flex w-10 items-center justify-center border-l-[1.5px] border-ink text-ink hover:bg-paper-3 sm:w-14"
            >
              {dark ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="4.2" />
                  <path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.3 5.3L7 7M17 17l1.7 1.7M5.3 18.7L7 17M17 7l1.7-1.7" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z" />
                </svg>
              )}
            </button>
          </li>
          <li className="flex">
            <Link
              to="/access"
              className="cond flex items-center border-l-[1.5px] border-ink bg-amber px-3 text-[1rem] font-extrabold uppercase tracking-[0.1em] text-[#12201f] no-underline hover:bg-[#ffb92f] sm:px-7 sm:text-[1.2rem]"
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
