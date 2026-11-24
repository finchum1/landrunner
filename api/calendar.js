// Calendar subscription feed: /api/calendar?token=... Subscribe to it from
// Apple Calendar, Google Calendar or Outlook and every follow-up shows up as an
// all-day event with a 9am alert. The token is the secret; regenerate it in
// the app (Reminders) to cut off an old link.
import { buildIcs, fetchEvents, todayIn } from "./_lib/reminders.js";

export default async function handler(req, res) {
  const token = typeof req.query?.token === "string" ? req.query.token : "";
  if (!/^[a-f0-9]{32,128}$/i.test(token)) return res.status(404).send("Not found");
  try {
    const events = await fetchEvents(token);
    // A wrong token returns no rows, same as an empty calendar, so a guess
    // learns nothing: both answer with a valid (empty) calendar.
    const ics = buildIcs(events, todayIn());
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", 'inline; filename="follow-ups.ics"');
    res.setHeader("Cache-Control", "private, max-age=300");
    return res.status(200).send(ics);
  } catch (err) {
    console.error("[calendar]", err);
    return res.status(500).send("Could not build the calendar right now.");
  }
}
