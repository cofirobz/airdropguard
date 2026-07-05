import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENAI_MODEL = "gpt-4o-mini";

type ScoreDetail = {
  score: number;
  explanation: string;
};

type SecurityIntelligenceResponse = {
  overallSecurityScore: ScoreDetail;
  liquidityRisk: ScoreDetail;
  whaleRisk: ScoreDetail;
  contractRisk: ScoreDetail;
  tradingRisk: ScoreDetail;
  ownershipRisk: ScoreDetail;
  communityRisk: ScoreDetail;
  scamProbability: ScoreDetail;
  rugProbability: ScoreDetail;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function clampScore(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function toArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => safeString(item)).filter(Boolean).slice(0, 6);
}

function parseJsonFromModel(content: string): Record<string, unknown> | null {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // Some models wrap JSON in markdown code fences.
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function toScoreDetail(raw: unknown, fallbackScore: number, fallbackExplanation: string): ScoreDetail {
  if (!raw || typeof raw !== "object") {
    return { score: fallbackScore, explanation: fallbackExplanation };
  }
  const rec = raw as Record<string, unknown>;
  const score = clampScore(rec.score ?? fallbackScore);
  const explanation = safeString(rec.explanation) || fallbackExplanation;
  return { score, explanation };
}

function buildFallback(body: Record<string, unknown>): SecurityIntelligenceResponse {
  const riskLevel = safeString(body.riskLevel) || "Medium";
  const base = riskLevel === "High" ? 74 : riskLevel === "Low" ? 38 : 56;

  return {
    overallSecurityScore: {
      score: clampScore(base),
      explanation: "This fallback score is generated from currently available token metadata and should be treated as a preliminary risk view.",
    },
    liquidityRisk: {
      score: clampScore(base + 8),
      explanation: "Liquidity depth is uncertain from current data, so slippage and exit risk may be elevated.",
    },
    whaleRisk: {
      score: clampScore(base + 4),
      explanation: "Holder concentration data is incomplete, so large-wallet manipulation risk cannot be fully ruled out.",
    },
    contractRisk: {
      score: clampScore(base + 6),
      explanation: "Contract-level validation data is partial, so code and permissions should be independently verified.",
    },
    tradingRisk: {
      score: clampScore(base + 5),
      explanation: "Market volatility and route depth can change quickly for speculative tokens.",
    },
    ownershipRisk: {
      score: clampScore(base + 7),
      explanation: "Ownership and authority configuration is not fully confirmed in this fallback analysis.",
    },
    communityRisk: {
      score: clampScore(base + 2),
      explanation: "Community quality indicators are mixed, which can increase social-led volatility.",
    },
    scamProbability: {
      score: clampScore(base + 9),
      explanation: "Current signals suggest caution, but no single fallback indicator proves a scam on its own.",
    },
    rugProbability: {
      score: clampScore(base + 10),
      explanation: "Liquidity and permission uncertainty increases the modeled rug-risk estimate.",
    },
    strengths: [
      "A structured risk breakdown is available to support due diligence.",
      "Primary token metadata is present for initial analysis.",
    ],
    weaknesses: [
      "Some on-chain evidence points are unavailable or incomplete.",
      "Fallback-only analysis is less precise than full AI model output.",
    ],
    recommendations: [
      "Use a burner wallet and strict position sizing for initial exposure.",
      "Validate contract permissions and liquidity lock status before trading.",
      "Cross-check project links, socials, and explorer data from independent sources.",
    ],
  };
}

function normalizeSecurityResponse(raw: Record<string, unknown>, fallback: SecurityIntelligenceResponse): SecurityIntelligenceResponse {
  return {
    overallSecurityScore: toScoreDetail(raw.overallSecurityScore, fallback.overallSecurityScore.score, fallback.overallSecurityScore.explanation),
    liquidityRisk: toScoreDetail(raw.liquidityRisk, fallback.liquidityRisk.score, fallback.liquidityRisk.explanation),
    whaleRisk: toScoreDetail(raw.whaleRisk, fallback.whaleRisk.score, fallback.whaleRisk.explanation),
    contractRisk: toScoreDetail(raw.contractRisk, fallback.contractRisk.score, fallback.contractRisk.explanation),
    tradingRisk: toScoreDetail(raw.tradingRisk, fallback.tradingRisk.score, fallback.tradingRisk.explanation),
    ownershipRisk: toScoreDetail(raw.ownershipRisk, fallback.ownershipRisk.score, fallback.ownershipRisk.explanation),
    communityRisk: toScoreDetail(raw.communityRisk, fallback.communityRisk.score, fallback.communityRisk.explanation),
    scamProbability: toScoreDetail(raw.scamProbability, fallback.scamProbability.score, fallback.scamProbability.explanation),
    rugProbability: toScoreDetail(raw.rugProbability, fallback.rugProbability.score, fallback.rugProbability.explanation),
    strengths: toArray(raw.strengths).length > 0 ? toArray(raw.strengths) : fallback.strengths,
    weaknesses: toArray(raw.weaknesses).length > 0 ? toArray(raw.weaknesses) : fallback.weaknesses,
    recommendations: toArray(raw.recommendations).length > 0 ? toArray(raw.recommendations) : fallback.recommendations,
  };
}

async function callOpenAI(payload: Record<string, unknown>): Promise<SecurityIntelligenceResponse> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const fallback = buildFallback(payload);

  const prompt = [
    "You are AirdropGuard Token Security Intelligence Engine.",
    "This is NOT the airdrop opportunity model.",
    "Return strict JSON only with this exact shape:",
    "{",
    '  "overallSecurityScore": { "score": number, "explanation": string },',
    '  "liquidityRisk": { "score": number, "explanation": string },',
    '  "whaleRisk": { "score": number, "explanation": string },',
    '  "contractRisk": { "score": number, "explanation": string },',
    '  "tradingRisk": { "score": number, "explanation": string },',
    '  "ownershipRisk": { "score": number, "explanation": string },',
    '  "communityRisk": { "score": number, "explanation": string },',
    '  "scamProbability": { "score": number, "explanation": string },',
    '  "rugProbability": { "score": number, "explanation": string },',
    '  "strengths": string[],',
    '  "weaknesses": string[],',
    '  "recommendations": string[]',
    "}",
    "Rules:",
    "- Scores must be 0-100.",
    "- Explanations must be plain English and concise.",
    "- No markdown.",
    "- No additional keys.",
    "Input token intelligence JSON:",
    JSON.stringify(payload),
  ].join("\n");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.2,
      max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI error: ${await res.text()}`);
  }

  const data = await res.json();
  const content = safeString(data?.choices?.[0]?.message?.content);
  const parsed = parseJsonFromModel(content);
  if (!parsed) return fallback;

  return normalizeSecurityResponse(parsed, fallback);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const body = await req.json() as Record<string, unknown>;
    const intelligence = await callOpenAI(body);

    return json({ success: true, intelligence });
  } catch (error) {
    const fallback = buildFallback({});
    return json({
      success: true,
      intelligence: fallback,
      warning: error instanceof Error ? error.message : "AI generation failed; fallback used.",
    });
  }
});
