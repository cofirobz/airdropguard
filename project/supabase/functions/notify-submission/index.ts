import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Always returns success so the submission flow is never blocked.
const OK = () =>
  new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { submission_id } = body as Record<string, string>;

    // Reject anything that isn't a well-formed UUID — no DB lookup, no email.
    if (!submission_id || !UUID_RE.test(submission_id)) return OK();

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const ADMIN_EMAIL    = Deno.env.get("ADMIN_EMAIL");

    // Email is fully optional — skip entirely when not configured.
    if (!RESEND_API_KEY || !ADMIN_EMAIL) return OK();

    // Fetch the real row from the DB using service role so email content
    // is never derived from user-supplied request data.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: sub } = await supabase
      .from("airdrop_submissions")
      .select("id, project_name, website_url, status")
      .eq("id", submission_id)
      .eq("status", "pending")   // only notify for genuine new submissions
      .maybeSingle();

    if (!sub) return OK(); // no matching pending row — nothing to notify about

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Airdrop Guard <noreply@airdropguard.com>",
        to: [ADMIN_EMAIL],
        subject: `New Airdrop Submission: ${sub.project_name}`,
        html: `<p><strong>Project:</strong> ${sub.project_name}</p>
               <p><strong>Website:</strong> ${sub.website_url ?? "N/A"}</p>
               <p><strong>ID:</strong> ${sub.id}</p>`,
      }),
    }).catch(() => {/* email failure is always non-fatal */});

    return OK();
  } catch {
    return OK();
  }
});
