import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ThemeToggle from './ThemeToggle';

export default function Header({ email }: { email?: string }) {
  return (
    <header className="border-b border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-base font-semibold tracking-tight text-stone-900 dark:text-stone-100">
          Landrunner
        </Link>
        <div className="flex items-center gap-3">
          {email && <span className="hidden text-sm text-stone-500 sm:inline dark:text-stone-400">{email}</span>}
          <ThemeToggle />
          <button
            onClick={() => supabase.auth.signOut()}
            className="rounded-md px-2 py-1 text-sm font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
