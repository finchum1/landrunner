import { useState } from 'react';
import { todayDateString } from '../lib/format';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

// Built from local y/m/d integers (never a parsed ISO string), so this
// carries no risk of the UTC-midnight-parses-as-previous-day bug that
// formatDateOnly()/todayDateString() exist specifically to avoid elsewhere.
function toDateString(y: number, m: number, d: number): string {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

export default function DatePickerModal({
  value,
  onSelect,
  onClear,
  onClose,
}: {
  value: string | null;
  onSelect: (date: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const initial = value ? value.split('-').map(Number) : null;
  const now = new Date();
  const [viewYear, setViewYear] = useState(initial ? initial[0] : now.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial ? initial[1] - 1 : now.getMonth());

  const todayStr = todayDateString();
  const numDays = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startDow = new Date(viewYear, viewMonth, 1).getDay();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= numDays; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function goToday() {
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-xs rounded-xl bg-white p-4 shadow-xl dark:bg-stone-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={prevMonth}
            className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800"
            aria-label="Previous month"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="text-sm font-semibold text-stone-900 dark:text-stone-100">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </div>
          <button
            type="button"
            onClick={nextMonth}
            className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800"
            aria-label="Next month"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7 text-center text-xs font-medium text-stone-400">
          {WEEKDAYS.map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (d === null) return <div key={i} />;
            const dateStr = toDateString(viewYear, viewMonth, d);
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === value;
            return (
              <button
                key={i}
                type="button"
                onClick={() => onSelect(dateStr)}
                className={`rounded-md py-1.5 text-sm ${
                  isSelected
                    ? 'bg-amber-600 text-white'
                    : isToday
                      ? 'font-semibold text-amber-700 hover:bg-stone-100 dark:text-amber-400 dark:hover:bg-stone-800'
                      : 'text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800'
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-3 dark:border-stone-800">
          <button
            type="button"
            onClick={goToday}
            className="text-sm font-medium text-amber-700 hover:underline dark:text-amber-400"
          >
            Jump to today
          </button>
          {value && (
            <button
              type="button"
              onClick={onClear}
              className="text-sm font-medium text-rose-500 hover:text-rose-600 dark:text-rose-400"
            >
              Clear date
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
