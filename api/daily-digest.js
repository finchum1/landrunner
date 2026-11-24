// Morning email of who is due today, run by a Vercel cron (see vercel.json).
// Needs, in the Vercel project's environment variables:
//   CRON_SECRET      any long random string (Vercel sends it with the cron call)
//   RESEND_API_KEY   a Resend API key
//   DIGEST_TO_EMAIL  where to send it (falls back to ACCESS_TO_EMAIL)
//   DIGEST_TOKEN     the calendar token from the app's Reminders page
// Without them it does nothing and says why.
import { buildDigest, fetchEvents, todayIn } from "./_lib/reminders.js";

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(503).json({ skipped: "CRON_SECRET is not set." });
  if (req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: "Unauthorized" });

  const key = process.env.RESEND_API_KEY;
  const to = process.env.DIGEST_TO_EMAIL || process.env.ACCESS_TO_EMAIL;
  const token = process.env.DIGEST_TOKEN;
  if (!key || !to || !token) return res.status(200).json({ skipped: "RESEND_API_KEY, DIGEST_TO_EMAIL and DIGEST_TOKEN must all be set." });

  try {
    const digest = buildDigest(await fetchEvents(token), todayIn());
    if (!digest) return res.status(200).json({ skipped: "Nothing due." });
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.ACCESS_FROM_EMAIL || "JillSpoon Leasing <onboarding@resend.dev>",
        to: [to],
        subject: digest.subject,
        html: digest.html,
      }),
    });
    if (!r.ok) {
      console.error("[digest] Resend failed:", r.status, await r.text().catch(() => ""));
      return res.status(502).json({ error: "Email provider refused the message." });
    }
    return res.status(200).json({ sent: digest.count });
  } catch (err) {
    console.error("[digest]", err);
    return res.status(500).json({ error: "Digest failed." });
  }
}
