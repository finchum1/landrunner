// Request-early-access form for the public JillSpoon Leasing pages. Emails the
// request through Resend. Needs RESEND_API_KEY and ACCESS_TO_EMAIL in Vercel
// (ACCESS_FROM_EMAIL optional); without them it answers 503 and nothing is sent.
const clean = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  const body = typeof req.body === "string" ? safeParse(req.body) : req.body;
  if (!body || typeof body !== "object") return res.status(400).json({ error: "That didn’t look right. Please try again." });

  // Honeypot: pretend success so bots learn nothing.
  if (clean(body.website, 200)) return res.status(200).json({ ok: true });

  const name = clean(body.name, 120);
  const email = clean(body.email, 200);
  const role = clean(body.role, 80);
  const message = clean(body.message, 2000);
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !role) {
    return res.status(400).json({ error: "Please fill in your name, a valid email, and how you work." });
  }

  const key = process.env.RESEND_API_KEY;
  const to = process.env.ACCESS_TO_EMAIL;
  if (!key || !to) {
    console.error("[access] RESEND_API_KEY / ACCESS_TO_EMAIL not set; request not delivered:", { name, email, role });
    return res.status(503).json({ error: "We couldn’t send your request just now. Please try again in a little while." });
  }

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.ACCESS_FROM_EMAIL || "JillSpoon Leasing <onboarding@resend.dev>",
      to: [to],
      reply_to: email,
      subject: `Early access request: ${name}`,
      html: `<p><b>${esc(name)}</b> &lt;${esc(email)}&gt;</p><p>${esc(role)}</p><p>${esc(message || "(no message)")}</p>`,
    }),
  });
  if (!r.ok) {
    console.error("[access] Resend failed:", r.status, await r.text().catch(() => ""));
    return res.status(502).json({ error: "We couldn’t send your request just now. Please try again in a little while." });
  }
  return res.status(200).json({ ok: true });
}

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
