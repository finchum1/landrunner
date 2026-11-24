import { useEffect, useMemo, useState } from 'react';
import { getOrCreateSettings, previewFeed, regenerateToken, type FeedEvent, type ReminderSettings } from '../lib/reminders';
import { addDays } from '../lib/callOutcomes';
import { todayDateString } from '../lib/format';

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        } catch {
          /* clipboard blocked: the text is selectable */
        }
      }}
      className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
    >
      {done ? 'Copied' : label}
    </button>
  );
}

export default function RemindersPage() {
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [feed, setFeed] = useState<FeedEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getOrCreateSettings()
      .then(async (s) => {
        setSettings(s);
        setFeed(await previewFeed(s.token).catch(() => null));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load reminder settings.'));
  }, []);

  const urls = useMemo(() => {
    if (!settings) return null;
    const https = `${window.location.origin}/api/calendar?token=${settings.token}`;
    return { https, webcal: https.replace(/^https?:/, 'webcal:') };
  }, [settings]);

  const counts = useMemo(() => {
    if (!feed) return null;
    const today = todayDateString();
    const week = addDays(today, 7);
    return {
      overdue: feed.filter((e) => e.next_contact_date < today).length,
      today: feed.filter((e) => e.next_contact_date === today).length,
      week: feed.filter((e) => e.next_contact_date > today && e.next_contact_date <= week).length,
      total: feed.length,
    };
  }, [feed]);

  async function handleRegenerate() {
    if (!settings) return;
    if (!confirm('Make a new calendar link? Any calendar already subscribed to the old link will stop updating, and you will need to subscribe again.')) return;
    try {
      const s = await regenerateToken(settings.id);
      setSettings(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not make a new link.');
    }
  }

  const card = 'rounded-lg border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900';

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-1 text-xl font-semibold text-stone-900 dark:text-stone-100">Reminders</h1>
      <p className="mb-6 text-sm text-stone-500 dark:text-stone-400">
        Get today’s calls on your phone without opening the app.
      </p>

      {error && (
        <div className="mb-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">{error}</div>
      )}

      <div className={`${card} mb-6`}>
        <h2 className="mb-1 font-semibold text-stone-900 dark:text-stone-100">Calendar feed</h2>
        <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
          Every owner with a follow-up date shows up as an all-day event with a 9 am alert and their phone number in the
          notes. Overdue calls move to today so they keep nagging. Owners who are leased, declined, client, or
          do-not-contact are left out.
        </p>

        {counts && (
          <p className="mb-4 text-sm text-stone-700 dark:text-stone-300">
            Right now the feed has <strong>{counts.total}</strong> follow-up{counts.total === 1 ? '' : 's'}:{' '}
            <strong>{counts.overdue}</strong> overdue, <strong>{counts.today}</strong> today, <strong>{counts.week}</strong> in the next 7 days.
          </p>
        )}

        {urls ? (
          <>
            <div className="mb-3 flex flex-wrap gap-2">
              <a
                href={urls.webcal}
                className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
              >
                Add to iPhone / Mac Calendar
              </a>
              <CopyButton text={urls.https} label="Copy link (Google, Outlook)" />
            </div>
            <input
              readOnly
              value={urls.https}
              onFocus={(e) => e.currentTarget.select()}
              className="mb-3 w-full rounded-md border border-stone-300 bg-stone-50 px-3 py-2 font-mono text-xs text-stone-600 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-300"
              aria-label="Calendar feed link"
            />
            <details className="mb-3 text-sm text-stone-600 dark:text-stone-300">
              <summary className="cursor-pointer font-medium">How to add it</summary>
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                <li><strong>iPhone / Mac:</strong> tap the amber button and confirm “Subscribe”. It then appears in your Calendar app.</li>
                <li><strong>Google Calendar:</strong> on a computer, open Settings → Add calendar → From URL, and paste the link. Google refreshes subscribed calendars every few hours, so changes can take a while to show up.</li>
                <li><strong>Outlook:</strong> Add calendar → Subscribe from web, paste the link.</li>
              </ul>
            </details>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Anyone with this link can see your follow-ups, so treat it like a password.{' '}
              <button type="button" onClick={handleRegenerate} className="font-medium text-rose-600 hover:underline dark:text-rose-400">
                Make a new link
              </button>
            </p>
          </>
        ) : (
          !error && <p className="text-sm text-stone-400">Loading…</p>
        )}
      </div>

      <div className={card}>
        <h2 className="mb-1 font-semibold text-stone-900 dark:text-stone-100">Morning email</h2>
        <p className="mb-3 text-sm text-stone-500 dark:text-stone-400">
          A short email at about 8 am Central listing who is overdue and who is due today, with tap-to-call numbers. It
          only sends on days when something is due. It stays off until these are set in the Vercel project’s environment
          variables:
        </p>
        <ul className="mb-3 space-y-1.5 text-sm text-stone-700 dark:text-stone-300">
          <li><code className="rounded bg-stone-100 px-1 dark:bg-stone-800">RESEND_API_KEY</code> — your Resend key</li>
          <li><code className="rounded bg-stone-100 px-1 dark:bg-stone-800">DIGEST_TO_EMAIL</code> — where to send it</li>
          <li><code className="rounded bg-stone-100 px-1 dark:bg-stone-800">CRON_SECRET</code> — any long random string</li>
          <li className="flex flex-wrap items-center gap-2">
            <code className="rounded bg-stone-100 px-1 dark:bg-stone-800">DIGEST_TOKEN</code> — your calendar token
            {settings && <CopyButton text={settings.token} label="Copy token" />}
          </li>
        </ul>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          If you make a new calendar link, update <code>DIGEST_TOKEN</code> too.
        </p>
      </div>
    </div>
  );
}
