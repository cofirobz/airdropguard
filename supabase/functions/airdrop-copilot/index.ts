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

type CopilotIntent = "api_docs" | "top_airdrops" | "airdrop" | "safety" | "dashboard" | "compare" | "unknown";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorToMessage(error: unknown): string {
  if (error instanceof Error) return safeString(error.message) || "Unexpected error";

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    return (
      safeString(record.message)
      || safeString(record.details)
      || safeString(record.hint)
      || safeString(record.code)
      || "Unexpected error"
    );
  }

  return safeString(error) || "Unexpected error";
}

function errorResponse(error: unknown) {
  const message = errorToMessage(error);

  console.error("airdrop-copilot failed", {
    message,
    stack: error instanceof Error ? error.stack : undefined,
  });

  if (message === "OPENAI_API_KEY is not set") {
    return json({
      error: "AirdropGuard Copilot is not configured correctly right now. Please try again later.",
      details: message,
    }, 503);
  }

  if (message.startsWith("OpenAI error:")) {
    return json({
      error: "The AI provider request failed. Please try again shortly.",
      details: message,
    }, 502);
  }

  return json({
    error: message || "AirdropGuard Copilot could not complete this request.",
    details: message,
  }, 500);
}

async function fetchAirdropsForCopilot(supabase: ReturnType<typeof createClient>) {
  const fullFields = "name, slug, category, blockchain, trust_score, opportunity_score, risk_level, difficulty, time_required, estimated_reward, funding_info, investors, team_info, docs_url, github_url, expiry_date, status, ai_summary, listing_state, airdrop_tasks(title, sort_order)";
  const noOpportunityFields = "name, slug, category, blockchain, trust_score, risk_level, difficulty, time_required, estimated_reward, funding_info, investors, team_info, docs_url, github_url, expiry_date, status, ai_summary, listing_state, airdrop_tasks(title, sort_order)";

  const runQuery = async (fields: string, withReviewFilter: boolean) => {
    let query = supabase
      .from("airdrops")
      .select(fields)
      .eq("published", true)
      .eq("is_demo", false)
      .order("sort_order", { ascending: true });

    if (withReviewFilter) {
      query = query.not("review_status", "eq", "replaced_demo");
    }

    return await query;
  };

  const attempts: Array<{ fields: string; withReviewFilter: boolean }> = [
    { fields: fullFields, withReviewFilter: true },
    { fields: fullFields, withReviewFilter: false },
    { fields: noOpportunityFields, withReviewFilter: true },
    { fields: noOpportunityFields, withReviewFilter: false },
  ];

  let lastResult = await runQuery(attempts[0].fields, attempts[0].withReviewFilter);
  if (!lastResult.error) return lastResult;

  for (const attempt of attempts.slice(1)) {
    const message = lastResult.error.message.toLowerCase();
    const schemaMismatch = message.includes("column") || message.includes("review_status") || message.includes("opportunity_score");
    if (!schemaMismatch) return lastResult;

    lastResult = await runQuery(attempt.fields, attempt.withReviewFilter);
    if (!lastResult.error) return lastResult;
  }

  return lastResult;
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function compactText(value: string, limit = 180): string {
  const next = safeString(value).replace(/\s+/g, " ");
  return next.length > limit ? `${next.slice(0, limit - 1)}…` : next;
}

function containsAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
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

function listingPriority(listingState: string | null): number {
  if (listingState === "verified") return 3;
  if (listingState === "under_review") return 2;
  return 1;
}

function detectIntent(message: string, pageContext: string, relevantSlugs: Set<string>): CopilotIntent {
  const lower = message.toLowerCase();

  if (containsAny(lower, [/\b(compare|comparison|versus|vs\.?|better than)\b/]) || relevantSlugs.size >= 2) {
    return "compare";
  }

  if (containsAny(lower, [
    /\b(api|endpoint|endpoints|docs|documentation|auth header|api key|rate limit|postman|curl)\b/,
  ])) {
    return "api_docs";
  }

  if (containsAny(lower, [/\b(safe|safety|risky|risk|scam|phishing|rug|security|legit|trustworthy)\b/])) {
    return "safety";
  }

  const asksForRanking = containsAny(lower, [/\b(top|best|current|right now|highest|rank|ranked)\b/]);
  const mentionsAirdrops = containsAny(lower, [/\b(airdrop|airdrops|opportunit(y|ies))\b/]);
  if (asksForRanking && mentionsAirdrops) {
    return "top_airdrops";
  }

  if (
    containsAny(lower, [/\b(this page|here|dashboard|what do i do|next step|where should i click|how do i use)\b/])
    || (pageContext.length > 0 && containsAny(lower, [/\b(page|screen|section|panel|action)\b/]))
  ) {
    return "dashboard";
  }

  if (containsAny(lower, [/\b(airdrop|airdrops|project|projects|reward|rewards|task|tasks|expiry|ending soon)\b/]) || relevantSlugs.size > 0) {
    return "airdrop";
  }

  return "unknown";
}

function compactValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "Unknown";
  if (typeof value === "number") return String(value);
  const text = safeString(value);
  return text || "Unknown";
}

function buildReasonList(airdrop: CompactAirdrop): string[] {
  const reasons: string[] = [];
  if (airdrop.listing_state === "verified") reasons.push("Verified by AirdropGuard");
  else if (airdrop.listing_state === "under_review") reasons.push("Under AirdropGuard review");

  if (typeof airdrop.trust_score === "number") reasons.push(`Trust Score ${airdrop.trust_score}`);
  if (typeof airdrop.opportunity_score === "number") reasons.push(`AI Confidence ${airdrop.opportunity_score}`);
  if (airdrop.risk_level) reasons.push(`Risk Level ${airdrop.risk_level}`);
  if (airdrop.estimated_reward) reasons.push(`Estimated Reward ${airdrop.estimated_reward}`);
  if (airdrop.time_required) reasons.push(`Time Required ${airdrop.time_required}`);

  return reasons.slice(0, 5);
}

function rankAirdrops(rows: CompactAirdrop[]): CompactAirdrop[] {
  return [...rows].sort((a, b) => {
    const listingDelta = listingPriority(b.listing_state) - listingPriority(a.listing_state);
    if (listingDelta !== 0) return listingDelta;

    const trustDelta = (b.trust_score ?? -1) - (a.trust_score ?? -1);
    if (trustDelta !== 0) return trustDelta;

    const confidenceDelta = (b.opportunity_score ?? -1) - (a.opportunity_score ?? -1);
    if (confidenceDelta !== 0) return confidenceDelta;

    const riskWeight = (risk: string | null) => risk === "Low" ? 2 : risk === "Medium" ? 1 : 0;
    return riskWeight(b.risk_level) - riskWeight(a.risk_level);
  });
}

function buildTopOpportunities(rows: CompactAirdrop[]): string {
  const ranked = rankAirdrops(rows).slice(0, 5);
  if (ranked.length === 0) return "None";

  return ranked.map((row, index) => {
    const reasons = buildReasonList(row).join(", ");
    return `${index + 1}. ${row.name} | Listing: ${compactValue(row.listing_state)} | Trust Score: ${compactValue(row.trust_score)} | AI Confidence: ${compactValue(row.opportunity_score)} | Risk Level: ${compactValue(row.risk_level)} | Estimated Reward: ${compactValue(row.estimated_reward)} | Time Required: ${compactValue(row.time_required)} | Why it ranks: ${reasons || "Limited structured signals available"}`;
  }).join("\n");
}

function buildComparisonSet(rows: CompactAirdrop[], relevantSlugs: Set<string>): CompactAirdrop[] {
  const directMatches = rows.filter(row => relevantSlugs.has(row.slug));
  if (directMatches.length >= 2) return directMatches.slice(0, 4);
  return rankAirdrops(rows).slice(0, 3);
}

function buildComparisonBrief(rows: CompactAirdrop[], relevantSlugs: Set<string>): string {
  const compared = buildComparisonSet(rows, relevantSlugs);
  if (compared.length === 0) return "None";

  return compared.map(row => [
    row.name,
    `Listing=${compactValue(row.listing_state)}`,
    `Trust Score=${compactValue(row.trust_score)}`,
    `AI Confidence=${compactValue(row.opportunity_score)}`,
    `Risk Level=${compactValue(row.risk_level)}`,
    `Estimated Reward=${compactValue(row.estimated_reward)}`,
    `Time Required=${compactValue(row.time_required)}`,
    `Status=${compactValue(row.status)}`,
  ].join(" | ")).join("\n");
}

function buildRiskFactorsBrief(): string {
  return [
    "AirdropGuard risk review uses the following available signals when present:",
    "- Listing State: verified is strongest, under_review is secondary, unknown listings need more caution.",
    "- Trust Score: higher scores support stronger confidence; missing scores must be called out as unknown.",
    "- AI Confidence / Opportunity Score: stronger signal for prioritization, not a guarantee of reward.",
    "- Risk Level: Low, Medium, High must be explained directly.",
    "- Estimated Reward and Time Required: used for effort-versus-upside judgment only when present.",
    "- Status and expiry timing: active or ending soon can affect urgency.",
    "- Missing docs, GitHub, funding, investor, or team data should be treated as unknown, never inferred.",
  ].join("\n");
}

function buildInstructionBlock(intent: CopilotIntent): string {
  const base = [
    "You are AirdropGuard Copilot, a premium crypto intelligence assistant focused on airdrop research.",
    "Answer the user question directly. Do not default to a generic top-airdrop list.",
    "Use AirdropGuard data first for every answer. Do not answer like a generic chatbot.",
    "Prefer verified opportunities first, then under_review, then anything else only if necessary.",
    "Never fabricate rewards, funding, investors, GitHub activity, docs quality, or team strength.",
    "If data is missing, say Unknown explicitly instead of guessing.",
    "Keep responses concise but informative.",
    "Explain why recommendations are made, referencing available signals.",
    "Recommend concrete next actions.",
    "Reference Trust Score, AI Confidence, Risk Level, Estimated Reward, and Time Required whenever those fields are available.",
    "Use clean markdown formatting with short headings and concise bullets.",
    "Highlight the primary recommendation using bold markdown.",
    "Only use markdown tables for compare or explicit top-airdrop requests.",
    "If the question is not about top or best opportunities, do not output a top opportunities section.",
    "Keep answers concise and readable: 120-220 words unless user asks for depth.",
    "Avoid long walls of text and avoid repeated sections.",
    "End with one concrete suggested next action.",
  ];

  if (intent === "top_airdrops") {
    base.push("The user explicitly asked for top/best/current opportunities. Start with ranked top opportunities.");
    base.push("Format for top_airdrops: short heading, 3-item table max, then 2 short bullets for next action.");
  }

  if (intent === "safety") {
    base.push("The user is asking about safety. Explain the risk factors AirdropGuard AI is using before giving recommendations.");
    base.push("Format for safety: 3-5 bullets and one short caution line. No large table.");
  }

  if (intent === "compare") {
    base.push("The user is asking for a comparison. Start with a markdown comparison table using only available AirdropGuard fields.");
    base.push("Format for compare: one compact table plus a 2-bullet verdict.");
  }

  if (intent === "api_docs") {
    base.push("The user is asking about API/docs. Explain docs route, endpoints, and auth in plain language.");
    base.push("Format for api_docs: short sections with simple bullets only.");
  }

  if (intent === "dashboard") {
    base.push("The user is asking page/dashboard guidance. Use page context to explain what to do next on this page.");
    base.push("Format for dashboard: one short action plan with 3 steps max.");
  }

  return base.join("\n");
}

function cleanAssistantAnswer(answer: string): string {
  const normalized = answer
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!normalized) return "I can help with that. Please share one more detail so I can give a precise answer.";

  return normalized;
}

function buildApiDocsAnswer(): string {
  return [
    "AirdropGuard API docs are available at /api-docs.",
    "",
    "Public API endpoints:",
    "- GET /functions/v1/api-v1/airdrops",
    "- GET /functions/v1/api-v1/airdrops/:slug",
    "",
    "Authentication:",
    "- Send Authorization: Bearer YOUR_API_KEY",
    "",
    "Protected/internal endpoints (not public API contract):",
    "- /functions/v1/airdrop-copilot",
    "- /functions/v1/manage-api-key",
    "- /functions/v1/stripe-checkout",
    "- /functions/v1/stripe-portal",
    "",
    "Next step: open /api-docs to see request and response examples.",
  ].join("\n");
}

function buildContextualFallback(message: string, intent: CopilotIntent, pageContext: string, rows: CompactAirdrop[]): string {
  if (intent === "api_docs") {
    return buildApiDocsAnswer();
  }

  if (intent === "dashboard") {
    return [
      "Here is the best next action for this page:",
      "",
      `Question: ${message}`,
      pageContext ? `Page context: ${pageContext}` : "Page context: Dashboard guidance is active.",
      "",
      "Suggested next action: start with your highest-trust unfinished mission, then ask me to break it into a 3-step checklist.",
    ].join("\n");
  }

  if (intent === "safety") {
    return [
      "Safety quick guidance:",
      "- Prioritize verified listings and review risk level before any wallet action.",
      "- Avoid unknown claim links and never share seed phrases/private keys.",
      "- If trust or data is missing, treat it as higher risk until verified.",
      "",
      "Next step: share the exact project name and I will run a focused safety check.",
    ].join("\n");
  }

  if (intent === "top_airdrops") {
    const ranked = rankAirdrops(rows).slice(0, 3);
    const list = ranked.length > 0
      ? ranked.map((item, index) => `${index + 1}. ${item.name} (Trust: ${compactValue(item.trust_score)}, Risk: ${compactValue(item.risk_level)}, Time: ${compactValue(item.time_required)})`).join("\n")
      : "1. No published airdrops are currently available in this dataset.";

    return [
      "Live AI generation is temporarily unavailable, but here are current top opportunities from available data:",
      list,
      "",
      "Next step: tell me which one to break down into tasks and safety checks.",
    ].join("\n");
  }

  if (intent === "airdrop" || intent === "compare") {
    return [
      "I can still help using current AirdropGuard data while live AI generation is unavailable.",
      `Question: ${message}`,
      "",
      "Next step: include one or two project names (or slugs) and I will give a focused comparison with trust, risk, reward, and effort.",
    ].join("\n");
  }

  return [
    "I can help with API docs, project comparisons, safety checks, and dashboard next actions.",
    `Your question: ${message}`,
    "",
    "Try one of these:",
    "- Where are the API endpoints?",
    "- Compare project A vs project B",
    "- Is this project safe?",
    "- What should I do on this page right now?",
  ].join("\n");
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

  let fallbackMessage = "your latest request";
  let fallbackContext = "";
  let fallbackIntent: CopilotIntent = "unknown";
  let fallbackRows: CompactAirdrop[] = [];

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return json({ error: "Missing Authorization header" }, 401);

    const body = await req.json() as ChatRequest;
    const message = safeString(body.message);
    if (!message) return json({ error: "Message is required" }, 400);
    const pageContext = safeString(body.context);

    fallbackMessage = message;
    fallbackContext = pageContext;

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
      console.warn("airdrop-copilot user_preferences query failed; continuing without preferences", preferencesRes.error);
    }

    const allAirdrops = (airdropsRes.data ?? []) as Record<string, unknown>[];
    const relevantSlugs = detectRelevantAirdrops(message, allAirdrops.map(row => ({
      name: safeString(row.name),
      slug: safeString(row.slug),
    })));

    const selected = [...allAirdrops]
      .sort((a, b) => sortForCopilot(b) - sortForCopilot(a))
      .filter((row, index) => index < MAX_AIRDROPS || relevantSlugs.has(safeString(row.slug)));

    const compactRows = selected.map(compactAirdrop);
    fallbackRows = compactRows;
    const preferences = preferencesRes.error
      ? null
      : (preferencesRes.data ?? null) as UserPreferences | null;
    const intent = detectIntent(message, pageContext, relevantSlugs);
    fallbackIntent = intent;

    if (intent === "api_docs") {
      return json({
        answer: buildApiDocsAnswer(),
        used_preferences: Boolean(preferences),
        airdrop_count: compactRows.length,
      });
    }

    if (intent === "dashboard") {
      return json({
        answer: buildContextualFallback(message, intent, pageContext, compactRows),
        used_preferences: Boolean(preferences),
        airdrop_count: compactRows.length,
      });
    }

    if (intent === "unknown") {
      return json({
        answer: buildContextualFallback(message, intent, pageContext, compactRows),
        used_preferences: Boolean(preferences),
        airdrop_count: compactRows.length,
        degraded: true,
      });
    }

    const topOpportunitiesBrief = buildTopOpportunities(compactRows);
    const comparisonBrief = buildComparisonBrief(compactRows, relevantSlugs);
    const riskFactorsBrief = buildRiskFactorsBrief();

    const promptSections: string[] = [
      buildInstructionBlock(intent),
      "",
      `DETECTED INTENT: ${intent}`,
      "",
      `USER QUESTION: ${message}`,
      "",
      `USER PREFERENCES: ${JSON.stringify({
        experience_level: preferences?.experience_level ?? null,
        daily_time_available: preferences?.daily_time_available ?? null,
        preferred_chains: preferences?.preferred_chains ?? [],
        risk_tolerance: preferences?.risk_tolerance ?? null,
      })}`,
    ];

    if (pageContext) {
      promptSections.push("", `PAGE CONTEXT: ${pageContext}`);
    }

    if (intent === "top_airdrops") {
      promptSections.push("", "TOP OPPORTUNITIES FROM CURRENT AIRDROPGUARD DATA:", topOpportunitiesBrief);
    }

    if (intent === "compare") {
      promptSections.push("", "COMPARISON CANDIDATES:", comparisonBrief);
    }

    if (intent === "safety") {
      promptSections.push("", "RISK FACTORS USED BY AIRDROPGUARD AI:", riskFactorsBrief);
    }

    if (intent === "airdrop" || intent === "compare" || intent === "safety" || intent === "top_airdrops") {
      promptSections.push("", `AIRDROPGUARD DATA (${compactRows.length} rows):`, JSON.stringify(compactRows));
    }

    const prompt = promptSections.join("\n");

    let answer = "";
    let degraded = false;

    try {
      answer = await callOpenAI(prompt);
      if (!answer) {
        degraded = true;
        answer = buildContextualFallback(message, intent, pageContext, compactRows);
      }
    } catch (openAiError) {
      console.warn("airdrop-copilot OpenAI call failed; using contextual fallback", openAiError);
      degraded = true;
      answer = buildContextualFallback(message, intent, pageContext, compactRows);
    }

    answer = cleanAssistantAnswer(answer);

    return json({
      answer,
      used_preferences: Boolean(preferences),
      airdrop_count: compactRows.length,
      degraded,
    });
  } catch (error) {
    console.error("airdrop-copilot unexpected failure", error);
    return json({
      answer: buildContextualFallback(fallbackMessage, fallbackIntent, fallbackContext, fallbackRows),
      used_preferences: false,
      airdrop_count: fallbackRows.length,
      degraded: true,
      error: errorToMessage(error),
    });
  }
});
