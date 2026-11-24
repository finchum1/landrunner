// Shared by the calendar feed and the daily email: read the follow-ups through
// the token-guarded database function, and turn them into calendar events or an
// email. Pure helpers are exported so they can be tested without a server.
const TZ = process.env.REMINDER_TZ || "America/Chicago";
export const APP_URL = process.env.APP_URL || "https://jillspoon.latchpointstudios.com";

// "YYYY-MM-DD" for right now in the working time zone (Oklahoma by default).
export function todayIn(tz = TZ, now = new Date()) {
  return now.toLocaleDateString("en-CA", { timeZone: tz });
}

export async function fetchEvents(token) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env vars are missing.");
  const res = await fetch(`${url}/rest/v1/rpc/reminder_events`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_token: token }),
  });
  if (!res.ok) throw new Error(`Reminder query failed (${res.status}).`);
  return (await res.json()).map((e) => ({ ...e, nma: Number(e.nma) }));
}

export function firstPhone(e) {
  const list = [];
  if (e.phone && e.phone.trim() && !e.phone_wrong) list.push(e.phone.trim());
  for (const p of e.extra_phones || []) if (p && p.number && p.number.trim() && !p.wrong) list.push(p.number.trim());
  return list[0] || null;
}

const STATUS = {
  not_contacted: "Not contacted",
  attempted: "Attempted contact",
  contacted: "Contacted",
  offer_made: "Offer made",
  negotiating: "Negotiating",
};
const fmtNma = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, ""));

const esc = (s) => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const compact = (d) => d.replace(/-/g, "");
function nextDay(d) {
  const [y, m, day] = d.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, day + 1));
  return dt.toISOString().slice(0, 10);
}
// RFC 5545: lines are at most 75 octets; continuation lines start with a space.
function fold(line) {
  const out = [];
  let rest = line;
  while (Buffer.byteLength(rest) > 74) {
    let cut = 74;
    while (Buffer.byteLength(rest.slice(0, cut)) > 74) cut -= 1;
    out.push(rest.slice(0, cut));
    rest = " " + rest.slice(cut);
  }
  out.push(rest);
  return out.join("\r\n");
}

// Each follow-up becomes an all-day event on its date. Anything already
// overdue is placed on TODAY and marked OVERDUE, so it keeps surfacing instead
// of sinking into the past.
export function buildIcs(events, today, now = new Date()) {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//JillSpoon Leasing//Follow-ups//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Leasing follow-ups",
    "X-WR-CALDESC:Owners due for a call, from JillSpoon Leasing",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];
  for (const e of events) {
    const overdue = e.next_contact_date < today;
    const date = overdue ? today : e.next_contact_date;
    const phone = firstPhone(e);
    const desc = [
      `${e.project_name}`,
      `${STATUS[e.status] || e.status} · ${fmtNma(e.nma)} NMA`,
      overdue ? `Was due ${e.next_contact_date}` : null,
      phone ? `Call: ${phone}` : "No phone on file",
      `${APP_URL}/projects/${e.project_id}?owner=${e.owner_id}`,
    ]
      .filter(Boolean)
      .join("\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:owner-${e.owner_id}-${compact(date)}@jillspoon`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(date)}`,
      `DTEND;VALUE=DATE:${compact(nextDay(date))}`,
      `SUMMARY:${esc(`${overdue ? "OVERDUE: " : ""}Call ${e.owner_name} (${fmtNma(e.nma)} NMA)`)}`,
      `DESCRIPTION:${esc(desc)}`,
      `URL:${APP_URL}/projects/${e.project_id}?owner=${e.owner_id}`,
      "TRANSP:TRANSPARENT",
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${esc(`Call ${e.owner_name}`)}`,
      "TRIGGER:PT9H",
      "END:VALARM",
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

const h = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// The morning email: who is overdue and who is due today (nothing future).
// Returns null when there is nothing to send.
export function buildDigest(events, today) {
  const due = events.filter((e) => e.next_contact_date <= today);
  if (due.length === 0) return null;
  const overdue = due.filter((e) => e.next_contact_date < today);
  const todays = due.filter((e) => e.next_contact_date === today);
  const row = (e) => {
    const phone = firstPhone(e);
    return `<li style="margin:0 0 8px"><a href="${h(APP_URL)}/projects/${h(e.project_id)}?owner=${h(e.owner_id)}"><b>${h(e.owner_name)}</b></a> — ${h(fmtNma(e.nma))} NMA · ${h(e.project_name)}${
      e.next_contact_date < today ? ` · <span style="color:#b00020">due ${h(e.next_contact_date)}</span>` : ""
    }${phone ? ` · <a href="tel:${h(phone.replace(/[^\d+]/g, ""))}">${h(phone)}</a>` : ""}</li>`;
  };
  const section = (title, list) => (list.length ? `<h3 style="margin:18px 0 8px">${title} (${list.length})</h3><ul style="padding-left:18px;margin:0">${list.map(row).join("")}</ul>` : "");
  const subject = `${due.length} call${due.length === 1 ? "" : "s"} due today${overdue.length ? ` (${overdue.length} overdue)` : ""}`;
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;color:#1c1917">${section("Overdue", overdue)}${section("Due today", todays)}<p style="margin-top:22px"><a href="${h(APP_URL)}">Open JillSpoon Leasing</a></p></div>`;
  return { subject, html, count: due.length };
}
