import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // ── Auth ────────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  const apiKey = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!apiKey) return json({ error: "Missing Authorization header" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: sub, error: subError } = await supabase
    .from("api_subscriptions")
    .select("id, user_id, plan, requests_used, requests_limit, status")
    .eq("key_value", apiKey)
    .eq("status", "active")
    .maybeSingle();

  if (subError || !sub) return json({ error: "Invalid or inactive API key" }, 401);

  if (sub.requests_used >= sub.requests_limit) {
    return json({ error: "Monthly request limit reached. Upgrade your plan." }, 429);
  }

  // Increment usage (fire-and-forget)
  supabase
    .from("api_subscriptions")
    .update({ requests_used: sub.requests_used + 1 })
    .eq("id", sub.id)
    .then(() => {});

  // ── Routing ─────────────────────────────────────────────────────────────────
  const url = new URL(req.url);
  // Strip function prefix: /api-v1/airdrops or /airdrops
  const pathParts = url.pathname.replace(/^\/api-v1/, "").split("/").filter(Boolean);
  // pathParts[0] = 'airdrops', pathParts[1] = optional slug

  if (pathParts[0] !== "airdrops") {
    return json({ error: "Not found. Available: /airdrops, /airdrops/:slug" }, 404);
  }

  // ── GET /airdrops/:slug ──────────────────────────────────────────────────────
  if (pathParts[1]) {
    const slug = pathParts[1];
    const { data: airdrop, error } = await supabase
      .from("airdrops")
      .select("*, airdrop_tasks(*)")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();

    if (error) return json({ error: error.message }, 500);
    if (!airdrop) return json({ error: "Airdrop not found" }, 404);
    return json({ data: airdrop });
  }

  // ── GET /airdrops ─────────────────────────────────────────────────────────────
  const status = url.searchParams.get("status");
  const blockchain = url.searchParams.get("blockchain");
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 200);
  const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);

  let query = supabase
    .from("airdrops")
    .select("*", { count: "exact" })
    .eq("published", true)
    .order("sort_order", { ascending: true })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);
  if (blockchain) query = query.contains("blockchain", [blockchain]);

  const { data, error, count } = await query;

  if (error) return json({ error: error.message }, 500);

  return json({
    data,
    meta: {
      total: count ?? 0,
      limit,
      offset,
      plan: sub.plan,
      requests_remaining: sub.requests_limit - sub.requests_used - 1,
    },
  });
});
