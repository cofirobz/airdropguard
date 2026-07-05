import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENAI_MODEL = "gpt-4o-mini";
const MAX_AIRDROPS = 24;
const MAX_TASKS_PER_AIRDROP = 4;
const MAX_TOKENS = 900;

type UserPreferences = {
  user_id: string;
  experience_level: "beginner" | "intermediate" | "advanced" | null;
  daily_time_available: "15" | "30" | "60+" | null;
  preferred_chains: string[] | null;
  risk_tolerance: "low" | "medium" | "high" | null;
};

type ChatRequest = {
  message?: string;
  context?: string;
};

type CompactAirdrop = {
  name: string;
  slug: string;
  category: string[];
  blockchain: string[];
  trust_score: number | null;
  opportunity_score: number | null;
  risk_level: string | null;
  difficulty: string | null;
  time_required: string | null;
  estimated_reward: string | null;
  funding_info: string | null;
  investors: string | null;
  team_info: string | null;
  docs_url: string | null;
  github_url: string | null;
  expiry_date: string | null;
  status: string | null;
  ai_summary: string | null;
  listing_state: string | null;
  tasks: string[];
};

type AirdropRow = Record<string, unknown>;

function buildFallbackAnswer(message: string, rows: CompactAirdrop[]): string {
  const top = rows.slice(0, 3);

  const shortlist = top.length > 0
    ? top
        .map((item, index) => {
          const trust = item.trust_score ?? "Unknown";
          const risk = item.risk_level ?? "Unknown";
          const time = item.time_required ?? "Unknown";
          return `${index + 1}. ${item.name} (Trust: ${trust}, Risk: ${risk}, Time: ${time})`;
        })
        .join("\n")
    : "1. No published airdrops are available in the current dataset.";

  return [
    "I can still help right now, but live AI generation is temporarily unavailable.",
    "",
    `You asked: ${message}`,
    "",
    "Best available shortlist from current AirdropGuard data:",
    shortlist,
    "",
    "Next step: review the first item, check task effort, and prioritize lower-risk opportunities first.",
    "",
    "AirdropGuard provides educational analysis only, not financial advice. Never share your seed phrase or connect your wallet to unknown sites.",
  ].join("\n");
}

const KNOWN_PROMPT_MAP: Record<string, string> = {
  "safe-beginner": "Show safest beginner airdrops",
  "risky-projects": "Which projects look risky and why?",
  "focus-today": "What should I focus on today?",
  "ending-soon": "What's ending soon and what should I prioritize first?",
  "worth-time": "Is this opportunity worth my time?",
  "biggest-risks": "What are the biggest risks?",
  "tasks-first": "What tasks should I do first?",
  "qualify-difficulty": "How hard is this to qualify for?",
  "what-to-avoid": "What should I avoid?",
  "simple-explain": "Explain this project simply.",
};

function normalizeQuestionInput(input: string): string {
  const trimmed = safeString(input);
  if (!trimmed) return "";
  if (KNOWN_PROMPT_MAP[trimmed]) return KNOWN_PROMPT_MAP[trimmed];

  const lower = trimmed.toLowerCase();
  if (KNOWN_PROMPT_MAP[lower]) return KNOWN_PROMPT_MAP[lower];

  const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed);
  const looksLikeHash = /^[0-9a-f]{24,}$/i.test(trimmed);
  const looksLikeOpaqueKey = /^[a-z0-9_-]{28,}$/i.test(trimmed) && !/\s/.test(trimmed);

  if (looksLikeUuid || looksLikeHash || looksLikeOpaqueKey) {
    return "Explain this project simply.";
  }

  return trimmed;
}

function detectFocusedAirdropsFromContext(context: string, airdrops: { name: string; slug: string }[]): Set<string> {
  const lower = context.toLowerCase();
  const hits = new Set<string>();

  for (const airdrop of airdrops) {
    const slug = airdrop.slug.toLowerCase();
    const name = airdrop.name.toLowerCase();
    if ((slug && lower.includes(slug)) || (name && lower.includes(name))) {
      hits.add(airdrop.slug);
    }
  }

  return hits;
}

function sanitizeModelAnswer(answer: string): string {
  const trimmed = safeString(answer);
  if (!trimmed) return "";

  if (/^[0-9a-f]{8}-[0-9a-f-]{12,}$/i.test(trimmed) || /^[a-z0-9_-]{28,}$/i.test(trimmed)) {
    return "I could not produce a clean readable answer. Please ask again using plain language.";
  }

  if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    return "I could not produce a clean readable answer. Please ask again using plain language.";
  }

  const cleanedLines = trimmed
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => !/^\s*(id|slug|hash|key)\s*[:=]/i.test(line));

  return cleanedLines.join("\n").trim();
}

async function fetchAirdropsForCopilot(supabase: ReturnType<typeof createClient>) {
  const selectFields = "name, slug, category, blockchain, trust_score, opportunity_score, risk_level, difficulty, time_required, estimated_reward, funding_info, investors, team_info, docs_url, github_url, expiry_date, status, ai_summary, listing_state, airdrop_tasks(title, sort_order)";

  const withReviewStatus = await supabase
    .from("airdrops")
    .select(selectFields)
    .eq("published", true)
    .eq("is_demo", false)
    .not("review_status", "eq", "replaced_demo")
    .order("sort_order", { ascending: true });

  if (!withReviewStatus.error) {
    return withReviewStatus;
  }

  const reviewStatusMissing = withReviewStatus.error.message.toLowerCase().includes("review_status")
    || withReviewStatus.error.message.toLowerCase().includes("column");

  if (!reviewStatusMissing) {
    return withReviewStatus;
  }

  return await supabase
    .from("airdrops")
    .select(selectFields)
    .eq("published", true)
    .eq("is_demo", false)
    .order("sort_order", { ascending: true });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function errorToMessage(error: unknown): string {
  if (error instanceof Error) {
    return safeString(error.message) || "Unexpected error";
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const message = safeString(record.message);
    const details = safeString(record.details);
    const hint = safeString(record.hint);
    const code = safeString(record.code);

    return (
      message
      || details
      || hint
      || code
      || "Unexpected error"
    );
  }

  return safeString(error) || "Unexpected error";
}

function compactText(value: string, limit = 180): string {
  const next = safeString(value).replace(/\s+/g, " ");
  return next.length > limit ? `${next.slice(0, limit - 1)}…` : next;
}

function detectRelevantAirdrops(message: string, airdrops: { name: string; slug: string }[]): Set<string> {
  const lower = message.toLowerCase();
  const hits = new Set<string>();
  for (const airdrop of airdrops) {
    const name = airdrop.name.toLowerCase();
    if (lower.includes(name) || lower.includes(airdrop.slug.toLowerCase())) {
      hits.add(airdrop.slug);
    }
  }
  return hits;
}

function sortForCopilot(airdrop: Record<string, unknown>): number {
  const trust = typeof airdrop.trust_score === "number" ? airdrop.trust_score : 50;
  const opportunity = typeof airdrop.opportunity_score === "number" ? airdrop.opportunity_score : 40;
  const riskPenalty = airdrop.risk_level === "High" ? 20 : airdrop.risk_level === "Medium" ? 8 : 0;
  const statusBonus = airdrop.status === "Active" ? 8 : airdrop.status === "Ending Soon" ? 5 : 0;
  const listingBonus = airdrop.listing_state === "verified" ? 8 : airdrop.listing_state === "under_review" ? 3 : 0;
  return trust + opportunity + statusBonus + listingBonus - riskPenalty;
}

function compactAirdrop(row: Record<string, unknown>): CompactAirdrop {
  const tasks = Array.isArray(row.airdrop_tasks)
    ? (row.airdrop_tasks as Record<string, unknown>[])
        .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
        .slice(0, MAX_TASKS_PER_AIRDROP)
        .map(task => compactText(safeString(task.title), 80))
        .filter(Boolean)
    : [];

  return {
    name: safeString(row.name),
    slug: safeString(row.slug),
    category: Array.isArray(row.category) ? (row.category as string[]).slice(0, 4) : [],
    blockchain: Array.isArray(row.blockchain) ? (row.blockchain as string[]).slice(0, 4) : [],
    trust_score: typeof row.trust_score === "number" ? row.trust_score : null,
    opportunity_score: typeof row.opportunity_score === "number" ? row.opportunity_score : null,
    risk_level: safeString(row.risk_level) || null,
    difficulty: safeString(row.difficulty) || null,
    time_required: safeString(row.time_required) || null,
    estimated_reward: safeString(row.estimated_reward) || null,
    funding_info: compactText(safeString(row.funding_info), 120) || null,
    investors: compactText(safeString(row.investors), 120) || null,
    team_info: compactText(safeString(row.team_info), 120) || null,
    docs_url: safeString(row.docs_url) || null,
    github_url: safeString(row.github_url) || null,
    expiry_date: safeString(row.expiry_date) || null,
    status: safeString(row.status) || null,
    ai_summary: compactText(safeString(row.ai_summary), 160) || null,
    listing_state: safeString(row.listing_state) || null,
    tasks,
  };
}

async function callOpenAI(prompt: string): Promise<string> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.2,
      max_tokens: MAX_TOKENS,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI error: ${await res.text()}`);
  }

  const data = await res.json();
  return safeString(data.choices?.[0]?.message?.content);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  let userMessageForFallback = "your latest request";

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return json({ error: "Missing Authorization header" }, 401);

    const body = await req.json() as ChatRequest;
    const message = normalizeQuestionInput(body.message ?? "");
    const pageContext = compactText(safeString(body.context), 700);
    if (!message) return json({ error: "Message is required" }, 400);
    userMessageForFallback = message;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: authData, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !authData.user) return json({ error: "Unauthorized" }, 401);

    const userId = authData.user.id;

    const [airdropsRes, preferencesRes] = await Promise.all([
      fetchAirdropsForCopilot(supabase),
      supabase
        .from("user_preferences")
        .select("user_id, experience_level, daily_time_available, preferred_chains, risk_tolerance")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    if (airdropsRes.error) throw new Error(errorToMessage(airdropsRes.error));
    if (preferencesRes.error) {
      console.warn("[airdrop-copilot] user_preferences query failed, continuing without preferences", preferencesRes.error);
    }

    const allAirdrops = (airdropsRes.data ?? []) as AirdropRow[];
    const relevantSlugs = detectRelevantAirdrops(message, allAirdrops.map(row => ({
      name: safeString(row.name),
      slug: safeString(row.slug),
    })));
    const contextSlugs = detectFocusedAirdropsFromContext(pageContext, allAirdrops.map(row => ({
      name: safeString(row.name),
      slug: safeString(row.slug),
    })));

    const selected = [...allAirdrops]
      .sort((a, b) => sortForCopilot(b) - sortForCopilot(a))
      .filter((row, index) => index < MAX_AIRDROPS || relevantSlugs.has(safeString(row.slug)) || contextSlugs.has(safeString(row.slug)))
      .sort((a, b) => {
        const aSlug = safeString(a.slug);
        const bSlug = safeString(b.slug);
        const aFocused = contextSlugs.has(aSlug);
        const bFocused = contextSlugs.has(bSlug);
        if (aFocused !== bFocused) return aFocused ? -1 : 1;
        return 0;
      });

    const compactRows = selected.map(compactAirdrop);
    const preferences = preferencesRes.error
      ? null
      : (preferencesRes.data ?? null) as UserPreferences | null;

    const prompt = [
      "You are AirdropGuard AI Copilot, a practical airdrop research assistant.",
      "The user clicked or typed a question. Answer that exact question directly first, in plain English.",
      "Use ONLY the supplied AirdropGuard data. If something is missing or unsupported, say so clearly.",
      "Do not promise rewards. Do not give financial advice. Never ask for seed phrases or private keys. Never tell users to connect wallets to suspicious or unknown sites.",
      "Prefer verified and under_review listings over unknown-quality projects. Mention risk clearly. If a project is speculative or data is missing, say that.",
      "Never output internal IDs, hashes, slugs, raw JSON, or database-looking values. Use human-readable project names and explanations.",
      "For recommendation questions, use this structure when it fits: 1. Direct answer 2. Why 3. Risks to watch 4. Practical next steps.",
      "For comparison questions, use a clear side-by-side comparison based only on available fields.",
      "If the context is an airdrop detail page, prioritize that project in your answer.",
      "If the context is a speculative token page, explicitly mention token-risk uncertainty and safe verification steps.",
      "If key fields are missing, say what is unknown and provide safe next actions without inventing facts.",
      "Always end with this exact safety wording:",
      "AirdropGuard provides educational analysis only, not financial advice. Never share your seed phrase or connect your wallet to unknown sites.",
      "",
      `USER QUESTION: ${message}`,
      "",
      `PAGE CONTEXT: ${pageContext || "None provided"}`,
      "",
      `USER PREFERENCES: ${JSON.stringify({
        experience_level: preferences?.experience_level ?? null,
        daily_time_available: preferences?.daily_time_available ?? null,
        preferred_chains: preferences?.preferred_chains ?? [],
        risk_tolerance: preferences?.risk_tolerance ?? null,
      })}`,
      "",
      `AIRDROPGUARD DATA (${compactRows.length} rows):`,
      JSON.stringify(compactRows),
    ].join("\n");

    let answer: string;
    let degraded = false;

    try {
      const liveAnswer = await callOpenAI(prompt);
      answer = sanitizeModelAnswer(liveAnswer || "") || buildFallbackAnswer(message, compactRows);
      degraded = !liveAnswer;
    } catch (openAiError) {
      degraded = true;
      console.warn("[airdrop-copilot] Falling back because live AI call failed", openAiError);
      answer = buildFallbackAnswer(message, compactRows);
    }

    return json({
      answer,
      used_preferences: Boolean(preferences),
      airdrop_count: compactRows.length,
      degraded,
    });
  } catch (error) {
    const message = errorToMessage(error);
    console.error("[airdrop-copilot] Unexpected failure", error);

    return json({
      answer: buildFallbackAnswer(userMessageForFallback, []),
      degraded: true,
      error: message,
      used_preferences: false,
      airdrop_count: 0,
    });
  }
});
