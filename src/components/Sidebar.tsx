import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ThemeToggle from './ThemeToggle';
import Logo from './Logo';

// Just one module for now ("Projects") -- more will be added here as
// Terrence decides what else belongs in the sidebar.
const NAV = [{ to: '/', label: 'Projects', match: (path: string) => path === '/' || path.startsWith('/projects') }];

export default function Sidebar({ email }: { email?: string }) {
  const location = useLocation();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
      <div className="border-b border-stone-200 px-4 py-5 dark:border-stone-800">
        <Link to="/">
          <Logo height={48} />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.map((item) => {
          const active = item.match(location.pathname);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`block rounded-md px-3 py-2 text-sm font-medium ${
                active
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                  : 'text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-stone-200 px-4 py-3 dark:border-stone-800">
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
    </aside>
  );
}
