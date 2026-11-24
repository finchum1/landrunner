import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ThemeToggle from './ThemeToggle';
import Logo from './Logo';

// Modeled on The Agency Dashboard's sidebar: open it's a labeled menu anywhere
// from 224px to 360px wide (drag its right edge); closed it's a 64px rail of
// icons that stays on the left. Below `md` it becomes a top bar with a slide-out
// drawer. The width and open/closed choice are remembered between visits.
const RAIL_PX = 64;
const MIN_OPEN_PX = 224;
const MAX_OPEN_PX = 360;
const DEFAULT_OPEN_PX = 256;
const NAV_KEY = 'landrunnerNav';

const clampOpen = (n: number) => Math.max(MIN_OPEN_PX, Math.min(MAX_OPEN_PX, Math.round(n)));

function readNav(): { open: boolean; px: number } {
  try {
    const v = JSON.parse(localStorage.getItem(NAV_KEY) || 'null');
    if (v && typeof v.open === 'boolean') return { open: v.open, px: clampOpen(Number(v.px) || DEFAULT_OPEN_PX) };
  } catch {
    /* storage blocked: use the default */
  }
  return { open: true, px: DEFAULT_OPEN_PX };
}

const ICON_PATHS = {
  dashboard: (
    <>
      <rect x="3.5" y="3.5" width="7" height="8" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="5" rx="1.5" />
      <rect x="13.5" y="11.5" width="7" height="9" rx="1.5" />
      <rect x="3.5" y="14.5" width="7" height="6" rx="1.5" />
    </>
  ),
  projects: (
    <>
      <path d="M12 3.5l8.5 4.7-8.5 4.7-8.5-4.7z" />
      <path d="M3.5 12.2l8.5 4.7 8.5-4.7M3.5 16.2l8.5 4.7 8.5-4.7" />
    </>
  ),
  reminders: (
    <>
      <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </>
  ),
  signout: <path d="M15 4h3.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H15M10 16l-4-4 4-4M6 12h10" />,
} as const;

function NavIcon({ name }: { name: keyof typeof ICON_PATHS }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden="true"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

// Dashboard (follow-ups across projects) and Projects. More modules get added here.
const NAV: { to: string; label: string; icon: keyof typeof ICON_PATHS; match: (p: string) => boolean }[] = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', match: (p) => p === '/' },
  { to: '/projects', label: 'Projects', icon: 'projects', match: (p) => p.startsWith('/projects') },
  { to: '/reminders', label: 'Reminders', icon: 'reminders', match: (p) => p.startsWith('/reminders') },
];

function NavItems({ rail, pathname, onNavigate }: { rail: boolean; pathname: string; onNavigate?: () => void }) {
  return (
    <div className={rail ? 'flex flex-col gap-1.5' : 'space-y-1'}>
      {NAV.map((item) => {
        const active = item.match(pathname);
        if (rail) {
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              title={item.label}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              className={`mx-auto flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
                active
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                  : 'text-stone-500 hover:bg-stone-100 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100'
              }`}
            >
              <NavIcon name={item.icon} />
            </Link>
          );
        }
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                : 'text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800'
            }`}
          >
            <NavIcon name={item.icon} />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

function ProfileBlock({ email }: { email?: string }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        {email && <span className="truncate text-xs text-stone-500 dark:text-stone-400">{email}</span>}
        <ThemeToggle />
      </div>
      <button
        onClick={() => supabase.auth.signOut()}
        className="w-full rounded-md px-2 py-1.5 text-left text-sm font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200"
      >
        Sign out
      </button>
    </div>
  );
}

export default function Sidebar({ email }: { email?: string }) {
  const location = useLocation();
  const [nav, setNav] = useState(readNav);
  const [navLive, setNavLive] = useState<number | null>(null); // width while the edge is being dragged
  const [mobileOpen, setMobileOpen] = useState(false);
  const drag = useRef<{ x: number; w: number; moved: boolean } | null>(null);

  const navWidth = navLive ?? (nav.open ? nav.px : RAIL_PX);
  const showRail = navWidth < 140;

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  function saveNav(next: { open: boolean; px: number }) {
    setNav(next);
    try {
      localStorage.setItem(NAV_KEY, JSON.stringify(next));
    } catch {
      /* storage blocked: it just won't be remembered */
    }
  }
  const toggleNav = () => saveNav({ ...nav, open: !nav.open });

  // Drag the right edge: any width from the icon rail to the widest the open
  // menu goes. Let go and it settles -- narrower than ~150px closes to the
  // rail, anything else opens (never narrower than the open minimum).
  const edgeHandlers = {
    onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button > 0) return;
      drag.current = { x: e.clientX, w: navWidth, moved: false };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => {
      const d = drag.current;
      if (!d || (!d.moved && Math.abs(e.clientX - d.x) < 4)) return;
      d.moved = true;
      setNavLive(Math.max(RAIL_PX, Math.min(MAX_OPEN_PX, d.w + (e.clientX - d.x))));
    },
    onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => {
      const d = drag.current;
      drag.current = null;
      if (!d || !d.moved) return;
      const width = Math.max(RAIL_PX, Math.min(MAX_OPEN_PX, d.w + (e.clientX - d.x)));
      setNavLive(null);
      if (width < 150) saveNav({ ...nav, open: false });
      else saveNav({ open: true, px: clampOpen(width) });
    },
    onPointerCancel: () => {
      drag.current = null;
      setNavLive(null);
    },
    onDoubleClick: toggleNav,
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        style={{ width: navWidth }}
        className={`relative z-40 hidden shrink-0 flex-col border-r border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900 md:flex md:h-full print:hidden ${
          navLive === null ? 'transition-[width] duration-200 ease-out motion-reduce:transition-none' : ''
        }`}
      >
        {showRail ? (
          <>
            <div className="flex shrink-0 justify-center px-2 pb-3 pt-12">
              <Link to="/" aria-label="JillSpoon Leasing home">
                <Logo iconOnly height={36} />
              </Link>
            </div>
            <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2" aria-label="Main">
              <NavItems rail pathname={location.pathname} />
            </nav>
            <div className="flex shrink-0 flex-col items-center gap-2 border-t border-stone-200 py-4 dark:border-stone-800">
              <ThemeToggle />
              <button
                type="button"
                onClick={() => supabase.auth.signOut()}
                aria-label="Sign out"
                title="Sign out"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
              >
                <NavIcon name="signout" />
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="shrink-0 border-b border-stone-200 px-4 py-5 dark:border-stone-800">
              <Link to="/">
                <Logo height={48} />
              </Link>
            </div>
            <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4" aria-label="Main">
              <NavItems rail={false} pathname={location.pathname} />
            </nav>
            <div className="shrink-0 overflow-hidden border-t border-stone-200 px-4 py-3 dark:border-stone-800">
              <ProfileBlock email={email} />
            </div>
          </>
        )}

        <button
          type="button"
          onClick={toggleNav}
          aria-label={showRail ? 'Open the menu' : 'Close the menu to icons'}
          title={showRail ? 'Open the menu' : 'Close the menu to icons'}
          className="absolute -right-3 top-[18px] z-40 flex h-6 w-6 items-center justify-center rounded-full border border-stone-300 bg-white text-stone-500 shadow-sm hover:border-stone-400 hover:text-stone-800 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400 dark:hover:border-stone-500 dark:hover:text-stone-100"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={showRail ? '' : 'rotate-180'}>
            <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Grab the right edge to make the menu wider or narrower, or to close it to the icon rail. */}
        <div
          {...edgeHandlers}
          role="separator"
          aria-orientation="vertical"
          aria-label="Drag to resize the menu"
          title="Drag to resize"
          className="group absolute inset-y-0 -right-1.5 z-10 w-3 cursor-col-resize touch-none"
        >
          <span
            className={`absolute inset-y-0 left-[5px] w-0.5 transition-colors ${
              navLive !== null ? 'bg-amber-500/70' : 'bg-transparent group-hover:bg-amber-500/40'
            }`}
          />
        </div>
      </aside>

      {/* Mobile top bar: the menu button opens the drawer below. */}
      <header className="shrink-0 border-b border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900 md:hidden print:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <Link to="/">
            <Logo height={32} />
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            className="-mr-1.5 p-2 text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-stone-100"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </header>

      <div className={`fixed inset-0 z-50 md:hidden ${mobileOpen ? '' : 'pointer-events-none'}`} aria-hidden={!mobileOpen}>
        <button
          type="button"
          tabIndex={mobileOpen ? 0 : -1}
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${mobileOpen ? 'opacity-100' : 'opacity-0'}`}
        />
        <div
          className={`absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl transition-transform duration-300 dark:bg-stone-900 ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="shrink-0 border-b border-stone-200 px-4 py-5 dark:border-stone-800">
            <Logo height={44} />
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main">
            <NavItems rail={false} pathname={location.pathname} onNavigate={() => setMobileOpen(false)} />
          </nav>
          <div className="shrink-0 border-t border-stone-200 px-4 py-3 dark:border-stone-800">
            <ProfileBlock email={email} />
          </div>
        </div>
      </div>
    </>
  );
}
