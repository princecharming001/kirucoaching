/**
 * Email Kiru when a new row is inserted into public.applications.
 * Trigger: Supabase Database Webhook (INSERT) → this function URL.
 * Provider: Resend (https://resend.com)
 *
 * Secrets (Dashboard → Edge Functions → Secrets, or `supabase secrets set`):
 *   RESEND_API_KEY, NOTIFY_TO_EMAIL, WEBHOOK_SECRET, RESEND_FROM (optional)
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const FITNESS_LABELS: Record<string, string> = {
  fat_loss: "Lose fat and get leaner",
  muscle: "Build muscle and get stronger",
  both: "Both — recomp / body transformation",
  performance: "Improve overall health and performance",
};

const INVEST_LABELS: Record<string, string> = {
  A: "A — lower budget (<$150)",
  B: "B — room for a substantial investment if it’s the right fit",
  C: "C — strong position, ready for a significant investment",
};

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}

function fitnessLabel(v: string): string {
  return FITNESS_LABELS[v] ?? v;
}

function investLabel(v: string): string {
  return INVEST_LABELS[v] ?? v;
}

function formatRecord(record: Record<string, unknown>): { text: string; html: string } {
  const lines: string[] = [
    "New call-request form submission",
    "─────────────────────────────",
    `Name: ${record.first_name ?? ""} ${record.last_name ?? ""}`.trim(),
    `Email: ${record.email ?? ""}`,
    `Phone: ${record.phone ?? ""}`,
    `Instagram: ${record.instagram ?? ""}`,
    `Over 23: ${record.over_23 === true ? "Yes" : record.over_23 === false ? "No" : String(record.over_23)}`,
    `Fitness goal: ${fitnessLabel(String(record.fitness_goal ?? ""))}`,
    `How they heard about you: ${record.heard_about ?? ""}`,
    `Location: ${record.location ?? ""}`,
    `Age: ${record.age ?? ""}`,
    `Occupation: ${record.occupation ?? ""}`,
    "",
    "Commitment / barriers:",
    String(record.commitment_barriers ?? ""),
    "",
    `Investment readiness: ${investLabel(String(record.investment_readiness ?? ""))}`,
    `Consent: ${record.consent === true ? "Yes" : "No"}`,
    `Submitted: ${record.created_at ?? "(see DB)"}`,
    `Row id: ${record.id ?? ""}`,
  ];

  const text = lines.join("\n");

  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const p = (label: string, val: string) =>
    `<tr><td style="padding:6px 12px 6px 0;vertical-align:top;font-weight:600;color:#1a2e4a;">${esc(label)}</td><td style="padding:6px 0;">${esc(val).replace(/\n/g, "<br/>")}</td></tr>`;

  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;font-size:15px;color:#1a1a1a;line-height:1.5;">
<p style="margin:0 0 16px;font-weight:700;">New call-request form submission</p>
<table style="border-collapse:collapse;max-width:560px;">
${p("Name", `${record.first_name ?? ""} ${record.last_name ?? ""}`.trim())}
${p("Email", String(record.email ?? ""))}
${p("Phone", String(record.phone ?? ""))}
${p("Instagram", String(record.instagram ?? ""))}
${p("Over 23", record.over_23 === true ? "Yes" : record.over_23 === false ? "No" : String(record.over_23 ?? ""))}
${p("Fitness goal", fitnessLabel(String(record.fitness_goal ?? "")))}
${p("How they heard about you", String(record.heard_about ?? ""))}
${p("Location", String(record.location ?? ""))}
${p("Age", String(record.age ?? ""))}
${p("Occupation", String(record.occupation ?? ""))}
${p("Commitment / barriers", String(record.commitment_barriers ?? ""))}
${p("Investment readiness", investLabel(String(record.investment_readiness ?? "")))}
${p("Consent", record.consent === true ? "Yes" : "No")}
${p("Submitted", String(record.created_at ?? ""))}
${p("Row id", String(record.id ?? ""))}
</table>
</body></html>`;

  return { text, html };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const webhookSecret = Deno.env.get("WEBHOOK_SECRET") ?? "";
  const authHeader = req.headers.get("Authorization") ?? "";
  const bearer = /^Bearer\s+(\S+)\s*$/i.exec(authHeader);
  const token = bearer?.[1] ?? "";
  if (!webhookSecret || !timingSafeEqual(token, webhookSecret)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const notifyTo = Deno.env.get("NOTIFY_TO_EMAIL");
  if (!resendKey || !notifyTo) {
    return new Response("Server misconfigured: missing RESEND_API_KEY or NOTIFY_TO_EMAIL", {
      status: 500,
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const record = (body.record ?? body) as Record<string, unknown>;
  if (!record || typeof record.email !== "string") {
    return new Response("Missing record or email", { status: 400 });
  }

  const { text, html } = formatRecord(record);
  const first = String(record.first_name ?? "").trim();
  const last = String(record.last_name ?? "").trim();
  const subject = `New call request: ${[first, last].filter(Boolean).join(" ") || record.email}`;

  const from =
    Deno.env.get("RESEND_FROM") ?? "Elevated Potential Coaching <onboarding@resend.dev>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [notifyTo],
      subject,
      text,
      html,
    }),
  });

  if (!res.res.ok) {
    const errText = await res.text();
    console.error("Resend error:", res.status, errText);
    return new Response(`Email provider error: ${errText}`, { status: 502 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
