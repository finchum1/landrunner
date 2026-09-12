import type { ReactNode } from 'react';

export default function ContactActionButton({
  href,
  icon,
  label,
}: {
  href: string | null;
  icon: ReactNode;
  label: string;
}) {
  if (!href) {
    return (
      <span
        className="flex flex-1 cursor-not-allowed items-center justify-center gap-1.5 rounded-md border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-300 dark:border-stone-800 dark:text-stone-600"
        title={`No ${label.toLowerCase()} info on file`}
      >
        {icon}
        {label}
      </span>
    );
  }
  return (
    <a
      href={href}
      className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700 dark:border-stone-700 dark:text-stone-300 dark:hover:border-amber-600 dark:hover:bg-amber-900/20 dark:hover:text-amber-400"
    >
      {icon}
      {label}
    </a>
  );
}
