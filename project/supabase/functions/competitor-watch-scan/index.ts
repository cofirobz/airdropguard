import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type SourceInput = {
  id: string;
  source_name: string;
  source_url: string;
};

type SourceAdapter = {
  id: string;
  label: string;
  hostPatterns: RegExp[];
  listingPathPatterns: RegExp[];
};

type DiscoveryCandidate = {
  projectName: string;
  projectUrl: string | null;
  listingUrl: string;
  blockchain: string | null;
  category: string | null;
  shortDescription: string | null;
  listingDate: string | null;
  confidence: "low" | "medium" | "high";
  sourceLabel: string;
  officialDocsUrl: string | null;
  githubUrl: string | null;
  officialXUrl: string | null;
  officialDiscordUrl: string | null;
  fundingInfo: string | null;
  teamInfo: string | null;
};

type DiscoveryExtractionResult = {
  candidates: DiscoveryCandidate[];
  cardsFound: number;
  candidatesRejected: number;
  rejectedByReason: Record<string, number>;
  rejectionSamples: string[];
};

type ScanResult = {
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  checkedAt: string;
  adapterUsed: string | null;
  fetchStatus: number | null;
  cardsFound: number;
  candidatesExtracted: DiscoveryCandidate[];
  candidatesRejected: number;
  rejectionReasons: Record<string, number>;
  rejectionSamples: string[];
  finalOutcome:
    | "ok"
    | "blocked_by_cloudflare"
    | "http_403"
    | "http_429"
    | "timeout"
    | "no_html"
    | "javascript_rendered"
    | "no_adapter_matched"
    | "no_cards_found"
    | "all_candidates_rejected"
    | "fetch_failed";
  outcomeMessage: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const USER_AGENT = "Mozilla/5.0 (compatible; AirdropGuardCompetitorWatch/1.0)";
const DEFAULT_TIMEOUT_MS = 15_000;

const DISCOVERY_SOURCE_ADAPTERS: SourceAdapter[] = [
  {
    id: "airdrop-io",
    label: "airdrop.io",
    hostPatterns: [/^airdrop\.io$/i, /(^|\.)airdrop\.io$/i],
    listingPathPatterns: [/\/airdrop\/[a-z0-9-]{3,}/i, /\/project\/[a-z0-9-]{3,}/i],
  },
  {
    id: "airdrops-io",
    label: "airdrops.io",
    hostPatterns: [/^airdrops\.io$/i, /(^|\.)airdrops\.io$/i],
    listingPathPatterns: [/\/airdrop\//i, /\/project\//i, /\/campaign\//i, /\/token\//i],
  },
  {
    id: "airdropalert",
    label: "airdropalert.com",
    hostPatterns: [/^airdropalert\.com$/i, /(^|\.)airdropalert\.com$/i],
    listingPathPatterns: [/\/airdrops\/[a-z0-9-]{3,}/i, /\/airdrop\/[a-z0-9-]{3,}/i],
  },
  {
    id: "layer3",
    label: "Layer3",
    hostPatterns: [/^layer3\.xyz$/i, /(^|\.)layer3\.xyz$/i],
    listingPathPatterns: [/\/quests\/[a-z0-9-]{3,}/i, /\/campaigns\/[a-z0-9-]{3,}/i, /\/bounties\/[a-z0-9-]{3,}/i],
  },
  {
    id: "galxe",
    label: "Galxe",
    hostPatterns: [/^galxe\.com$/i, /(^|\.)galxe\.com$/i],
    listingPathPatterns: [/\/quest\/[a-z0-9-]{3,}/i, /\/campaign\/[a-z0-9-]{3,}/i, /\/events\/[a-z0-9-]{3,}/i],
  },
  {
    id: "intract",
    label: "Intract",
    hostPatterns: [/^intract\.io$/i, /(^|\.)intract\.io$/i],
    listingPathPatterns: [/\/quest\//i, /\/campaign\//i, /\/tasks\//i],
  },
  {
    id: "zealy",
    label: "Zealy",
    hostPatterns: [/^zealy\.io$/i, /(^|\.)zealy\.io$/i],
    listingPathPatterns: [/\/c\/[^/]+\/questboard\/[a-z0-9-]{3,}/i, /\/questboard\/[a-z0-9-]{3,}/i],
  },
  {
    id: "coinmarketcap-airdrops",
    label: "CoinMarketCap Airdrops",
    hostPatterns: [/^coinmarketcap\.com$/i, /(^|\.)coinmarketcap\.com$/i],
    listingPathPatterns: [/\/airdrop\/[a-z0-9-]{3,}/i],
  },
];

const GENERIC_COMPETITOR_NAMES = new Set([
  "airdrop",
  "airdrops",
  "search",
  "browse",
  "category",
  "new",
  "latest",
  "claim",
  "rewards",
  "campaign",
]);

const URL_NOISE_TOKENS = new Set([
  "www",
  "com",
  "io",
  "org",
  "net",
  "app",
  "site",
  "blog",
  "news",
  "airdrop",
  "airdrops",
  "claim",
  "rewards",
  "campaign",
]);

const GENERIC_SOURCE_URL_PATTERNS = ["/search", "?query=", "&query=", "/browse", "/category", "/tag", "/filter", "/airdrops", "/new", "/latest"];

const BLOCKCHAIN_KEYWORDS: Array<{ keyword: string; value: string }> = [
  { keyword: "ethereum", value: "Ethereum" },
  { keyword: "base", value: "Base" },
  { keyword: "arbitrum", value: "Arbitrum" },
  { keyword: "optimism", value: "Optimism" },
  { keyword: "solana", value: "Solana" },
  { keyword: "polygon", value: "Polygon" },
  { keyword: "bsc", value: "BNB Chain" },
  { keyword: "bnb", value: "BNB Chain" },
  { keyword: "avalanche", value: "Avalanche" },
  { keyword: "sui", value: "Sui" },
  { keyword: "aptos", value: "Aptos" },
];

const CATEGORY_KEYWORDS: Array<{ keyword: string; value: string }> = [
  { keyword: "defi", value: "DeFi" },
  { keyword: "nft", value: "NFT" },
  { keyword: "gaming", value: "Gaming" },
  { keyword: "social", value: "Social" },
  { keyword: "infra", value: "Infrastructure" },
  { keyword: "layer 2", value: "Layer2" },
  { keyword: "wallet", value: "Wallet" },
  { keyword: "dao", value: "DAO" },
];

type AdapterParserRule = {
  cardSelectors: string[];
  titleSelectors: string[];
  descriptionSelectors: string[];
  dateSelectors: string[];
  linkSelectors: string[];
};

const ADAPTER_PARSER_RULES: Record<string, AdapterParserRule> = {
  galxe: {
    cardSelectors: ["[data-testid*=\"campaign\" i]", "[data-testid*=\"quest\" i]", "article", "li"],
    titleSelectors: ["h1", "h2", "h3", "[data-testid*=\"title\" i]", "[class*=\"title\" i]"],
    descriptionSelectors: ["p", "[data-testid*=\"description\" i]", "[class*=\"desc\" i]"],
    dateSelectors: ["time", "[data-testid*=\"date\" i]", "[class*=\"date\" i]"],
    linkSelectors: ["a[href*=\"/quest/\"]", "a[href*=\"/campaign/\"]", "a[href*=\"/events/\"]"],
  },
  layer3: {
    cardSelectors: ["[data-testid*=\"quest\" i]", "[class*=\"quest\" i]", "article", "li"],
    titleSelectors: ["h1", "h2", "h3", "[class*=\"title\" i]", "[class*=\"name\" i]"],
    descriptionSelectors: ["p", "[class*=\"description\" i]", "[class*=\"summary\" i]"],
    dateSelectors: ["time", "[class*=\"date\" i]"],
    linkSelectors: ["a[href*=\"/quests/\"]", "a[href*=\"/campaigns/\"]", "a[href*=\"/bounties/\"]"],
  },
  zealy: {
    cardSelectors: ["[data-testid*=\"quest\" i]", "[class*=\"quest\" i]", "article", "li"],
    titleSelectors: ["h1", "h2", "h3", "[class*=\"title\" i]", "[class*=\"name\" i]"],
    descriptionSelectors: ["p", "[class*=\"description\" i]", "[class*=\"summary\" i]"],
    dateSelectors: ["time", "[class*=\"date\" i]"],
    linkSelectors: ["a[href*=\"/questboard/\"]", "a[href*=\"/c/\"]"],
  },
  airdropalert: {
    cardSelectors: ["[class*=\"airdrop\" i]", "[class*=\"post\" i]", "article", "li"],
    titleSelectors: ["h1", "h2", "h3", "[class*=\"title\" i]", "[rel=\"bookmark\"]"],
    descriptionSelectors: ["p", "[class*=\"excerpt\" i]", "[class*=\"summary\" i]"],
    dateSelectors: ["time", "[class*=\"date\" i]"],
    linkSelectors: ["a[href*=\"/airdrops/\"]", "a[href*=\"/airdrop/\"]"],
  },
  "airdrop-io": {
    cardSelectors: ["[class*=\"airdrop\" i]", "article", "li"],
    titleSelectors: ["h1", "h2", "h3", "[class*=\"title\" i]", "[class*=\"name\" i]"],
    descriptionSelectors: ["p", "[class*=\"description\" i]", "[class*=\"summary\" i]"],
    dateSelectors: ["time", "[class*=\"date\" i]"],
    linkSelectors: ["a[href*=\"/airdrop/\"]", "a[href*=\"/project/\"]"],
  },
  "coinmarketcap-airdrops": {
    cardSelectors: ["[data-testid*=\"airdrop\" i]", "[class*=\"airdrop\" i]", "article", "li", "tr"],
    titleSelectors: ["h1", "h2", "h3", "[class*=\"title\" i]", "[data-testid*=\"name\" i]"],
    descriptionSelectors: ["p", "[class*=\"description\" i]", "[class*=\"summary\" i]"],
    dateSelectors: ["time", "[class*=\"date\" i]"],
    linkSelectors: ["a[href*=\"/airdrop/\"]"],
  },
};

const DEFAULT_ADAPTER_PARSER_RULE: AdapterParserRule = {
  cardSelectors: ["article", "li", "div", "section"],
  titleSelectors: ["h1", "h2", "h3", "h4", "[class*=\"title\" i]", "[data-testid*=\"title\" i]"],
  descriptionSelectors: ["p", "[class*=\"desc\" i]", "[class*=\"summary\" i]"],
  dateSelectors: ["time", "[class*=\"date\" i]", "[data-testid*=\"date\" i]"],
  linkSelectors: ["a[href]"],
};

const NAVIGATION_PATH_SEGMENTS = new Set([
  "airdrop",
  "airdrops",
  "campaign",
  "campaigns",
  "quest",
  "quests",
  "explore",
  "discover",
  "leaderboard",
  "community",
  "communities",
  "categories",
  "category",
  "tags",
  "tag",
  "search",
  "news",
  "blog",
]);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeProjectName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function toTitleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function sanitizeProjectCandidate(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const normalized = decodeURIComponent(String(raw))
    .replace(/[\-_]+/g, " ")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized || normalized.length < 3) return null;
  if (/^\d+$/.test(normalized)) return null;

  const lowered = normalized.toLowerCase();
  if (GENERIC_COMPETITOR_NAMES.has(lowered)) return null;

  const words = lowered.split(" ").filter(Boolean);
  if (words.every((word) => URL_NOISE_TOKENS.has(word))) return null;

  return toTitleCase(normalized);
}

function isGenericSourceUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    const combined = `${parsed.pathname}${parsed.search}`.toLowerCase();
    return GENERIC_SOURCE_URL_PATTERNS.some((pattern) => combined.includes(pattern));
  } catch {
    const lowered = rawUrl.toLowerCase();
    return GENERIC_SOURCE_URL_PATTERNS.some((pattern) => lowered.includes(pattern));
  }
}

function isGenericOpportunityName(name: string): boolean {
  const cleaned = sanitizeProjectCandidate(name);
  if (!cleaned) return true;
  return GENERIC_COMPETITOR_NAMES.has(cleaned.toLowerCase());
}

function resolveSourceAdapter(sourceUrl: string): SourceAdapter | null {
  try {
    const hostname = new URL(sourceUrl).hostname.replace(/^www\./, "").toLowerCase();
    return DISCOVERY_SOURCE_ADAPTERS.find((adapter) => adapter.hostPatterns.some((pattern) => pattern.test(hostname))) || null;
  } catch {
    return null;
  }
}

function pickTextContent(...candidates: Array<string | null | undefined>): string | null {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const cleaned = candidate.replace(/\s+/g, " ").trim();
    if (cleaned) return cleaned;
  }
  return null;
}

function inferBlockchainFromText(text: string): string | null {
  const lowered = text.toLowerCase();
  const matched = BLOCKCHAIN_KEYWORDS.find((item) => lowered.includes(item.keyword));
  return matched ? matched.value : null;
}

function inferCategoryFromText(text: string): string | null {
  const lowered = text.toLowerCase();
  const matched = CATEGORY_KEYWORDS.find((item) => lowered.includes(item.keyword));
  return matched ? matched.value : null;
}

function extractDateFromText(text: string): string | null {
  const isoLike = text.match(/\b\d{4}-\d{2}-\d{2}\b/);
  if (isoLike) return isoLike[0];

  const natural = text.match(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:,\s*\d{4})?\b/i);
  if (natural) return natural[0];

  return null;
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractOfficialUrlsFromSnippet(snippetHtml: string, sourceUrl: string): {
  docsUrl: string | null;
  githubUrl: string | null;
  xUrl: string | null;
  discordUrl: string | null;
} {
  let docsUrl: string | null = null;
  let githubUrl: string | null = null;
  let xUrl: string | null = null;
  let discordUrl: string | null = null;

  for (const match of snippetHtml.matchAll(/<a\s[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi)) {
    const href = (match[1] || "").trim();
    if (!href) continue;
    let resolved: URL;
    try {
      resolved = new URL(href, sourceUrl);
    } catch {
      continue;
    }

    const host = resolved.hostname.replace(/^www\./, "").toLowerCase();
    const value = resolved.toString();
    if (!githubUrl && host.includes("github.com")) githubUrl = value;
    if (!xUrl && (host === "x.com" || host.endsWith(".x.com") || host.includes("twitter.com"))) xUrl = value;
    if (!discordUrl && (host.includes("discord.gg") || host.includes("discord.com"))) discordUrl = value;
    if (!docsUrl && (host.includes("docs.") || resolved.pathname.toLowerCase().includes("/docs"))) docsUrl = value;
  }

  return { docsUrl, githubUrl, xUrl, discordUrl };
}

function inferFundingFromText(text: string): string | null {
  const normalized = text.replace(/\s+/g, " ").trim();
  const fundingMatch = normalized.match(/\b(raised|funded|seed|series\s+[a-z]|backed\s+by)\b[^.\n]{0,120}/i);
  return fundingMatch ? fundingMatch[0] : null;
}

function inferTeamFromText(text: string): string | null {
  const normalized = text.replace(/\s+/g, " ").trim();
  const teamMatch = normalized.match(/\b(founder|founded\s+by|team|co-?founder)\b[^.\n]{0,120}/i);
  return teamMatch ? teamMatch[0] : null;
}

function getAdapterParserRule(adapter: SourceAdapter): AdapterParserRule {
  return ADAPTER_PARSER_RULES[adapter.id] || DEFAULT_ADAPTER_PARSER_RULE;
}

function getLinkSelectorHints(rule: AdapterParserRule): string[] {
  return rule.linkSelectors
    .map((selector) => {
      const quoted = selector.match(/href\*=\"([^\"]+)\"/i)?.[1];
      if (quoted) return quoted;
      const singleQuoted = selector.match(/href\*='([^']+)'/i)?.[1];
      if (singleQuoted) return singleQuoted;
      return null;
    })
    .filter((value): value is string => Boolean(value));
}

function isNavigationListingUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    const parts = parsed.pathname.split("/").map((part) => part.trim().toLowerCase()).filter(Boolean);

    if (parts.length === 0) return true;

    const last = parts[parts.length - 1];
    if (NAVIGATION_PATH_SEGMENTS.has(last)) return true;
    if (parts.length <= 2 && parts.every((part) => NAVIGATION_PATH_SEGMENTS.has(part))) return true;
    return false;
  } catch {
    return true;
  }
}

function isProjectListingUrl(rawUrl: string, adapter: SourceAdapter): boolean {
  if (isGenericSourceUrl(rawUrl)) return false;
  if (isNavigationListingUrl(rawUrl)) return false;
  return adapter.listingPathPatterns.some((pattern) => pattern.test(rawUrl));
}

function extractDiscoveryCandidatesFromHtml(html: string, source: SourceInput, adapter: SourceAdapter): DiscoveryExtractionResult {
  const parserRule = getAdapterParserRule(adapter);
  const linkHints = getLinkSelectorHints(parserRule);
  const dedupe = new Set<string>();
  const found: DiscoveryCandidate[] = [];
  let listingAnchors = 0;
  let rejectedCount = 0;
  const rejectedByReason: Record<string, number> = {};
  const rejectionSamples: string[] = [];

  const reject = (reason: string, sample?: string | null) => {
    rejectedCount += 1;
    rejectedByReason[reason] = (rejectedByReason[reason] || 0) + 1;
    if (sample && rejectionSamples.length < 8) {
      rejectionSamples.push(`${reason}: ${sample.slice(0, 120)}`);
    }
  };

  const sourceHostname = (() => {
    try {
      return new URL(source.source_url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  })();

  for (const match of html.matchAll(/<a\s([^>]{0,1500})>([\s\S]{0,800}?)<\/a>/gi)) {
    const attrs = match[1] || "";
    const innerHtml = match[2] || "";
    const hrefRaw = attrs.match(/href\s*=\s*["']([^"']+)["']/i)?.[1] || "";
    if (!hrefRaw) continue;

    let listingUrl: string;
    try {
      listingUrl = new URL(hrefRaw, source.source_url).toString();
    } catch {
      continue;
    }

    if (linkHints.length > 0 && !linkHints.some((hint) => listingUrl.includes(hint))) {
      continue;
    }

    if (!isProjectListingUrl(listingUrl, adapter)) {
      continue;
    }

    listingAnchors += 1;

    const hasListingLink = true;
    const titleAttr = attrs.match(/title\s*=\s*["']([^"']+)["']/i)?.[1] || null;
    const ariaLabel = attrs.match(/aria-label\s*=\s*["']([^"']+)["']/i)?.[1] || null;
    const dataProjectName = attrs.match(/data-project-name\s*=\s*["']([^"']+)["']/i)?.[1] || null;
    const anchorText = stripHtml(innerHtml);
    const slugFallback = (() => {
      try {
        const pathParts = new URL(listingUrl).pathname.split('/').filter(Boolean);
        return pathParts.length > 0 ? pathParts[pathParts.length - 1].replace(/[\-_]+/g, ' ') : null;
      } catch {
        return null;
      }
    })();

    const rawName = pickTextContent(titleAttr, ariaLabel, dataProjectName, anchorText, slugFallback);
    const projectName = sanitizeProjectCandidate(rawName);

    if (!projectName) {
      reject("no_project_like_title", rawName);
      continue;
    }

    if (isGenericOpportunityName(projectName)) {
      reject("generic_project_name", projectName);
      continue;
    }

    const anchorIndex = match.index ?? 0;
    const snippetStart = Math.max(0, anchorIndex - 900);
    const snippetEnd = Math.min(html.length, anchorIndex + match[0].length + 900);
    const snippetHtml = html.slice(snippetStart, snippetEnd);
    const snippetText = stripHtml(snippetHtml);

    const paragraphMatch = snippetHtml.match(/<p[^>]*>([\s\S]{0,400}?)<\/p>/i)?.[1] || null;
    const shortDescription = pickTextContent(paragraphMatch ? stripHtml(paragraphMatch) : null);
    const listingDate = extractDateFromText(snippetText);
    const fullCardText = snippetText;
    const officialUrls = extractOfficialUrlsFromSnippet(snippetHtml, source.source_url);
    const fundingInfo = inferFundingFromText(fullCardText);
    const teamInfo = inferTeamFromText(fullCardText);

    const combinedText = [projectName, shortDescription, fullCardText].join(" ");
    const blockchain = inferBlockchainFromText(combinedText);
    const category = inferCategoryFromText(combinedText);
    const hasDescription = Boolean(shortDescription && shortDescription.trim());
    const hasEcosystemSignal = Boolean(blockchain || category);

    if (!(hasListingLink || hasDescription || hasEcosystemSignal)) {
      reject("missing_supporting_signal", projectName);
      continue;
    }

    const projectUrl = (() => {
      for (const urlMatch of snippetHtml.matchAll(/<a\s[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi)) {
        const value = (urlMatch[1] || '').trim();
        if (!value) continue;
        if (isGenericSourceUrl(value)) continue;
        try {
          const externalUrl = new URL(value, source.source_url);
          if (externalUrl.hostname.replace(/^www\./, "") === sourceHostname) {
            continue;
          }
          return externalUrl.toString();
        } catch {
          continue;
        }
      }
      return null;
    })();

    const confidence: "low" | "medium" | "high" = projectUrl && shortDescription
      ? "high"
      : shortDescription || listingDate
      ? "medium"
      : "low";

    const dedupeKey = `${normalizeProjectName(projectName)}::${listingUrl}`;
    if (dedupe.has(dedupeKey)) {
      reject("duplicate_candidate", projectName);
      continue;
    }
    dedupe.add(dedupeKey);

    found.push({
      projectName,
      projectUrl,
      listingUrl,
      blockchain,
      category,
      shortDescription,
      listingDate,
      confidence,
      sourceLabel: adapter.label,
      officialDocsUrl: officialUrls.docsUrl,
      githubUrl: officialUrls.githubUrl,
      officialXUrl: officialUrls.xUrl,
      officialDiscordUrl: officialUrls.discordUrl,
      fundingInfo,
      teamInfo,
    });
  }

  return {
    candidates: found,
    cardsFound: listingAnchors,
    candidatesRejected: rejectedCount,
    rejectedByReason,
    rejectionSamples,
  };
}

async function ensureAdminUser(
  authHeader: string,
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<{ userId: string } | null> {
  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return null;

  const supabase = createClient(
    supabaseUrl,
    serviceRoleKey,
  );

  const { data: authData, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !authData.user) return null;

  const { data: adminRow, error: adminError } = await supabase
    .from("admin_users")
    .select("id")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (adminError || !adminRow) return null;
  return { userId: authData.user.id };
}

function inferCloudflareBlocked(status: number, headers: Headers, html: string): boolean {
  if (status === 403 || status === 429 || status === 503) {
    const server = (headers.get("server") || "").toLowerCase();
    const cfRay = headers.get("cf-ray");
    const lowerHtml = html.toLowerCase();
    if (server.includes("cloudflare") || Boolean(cfRay)) return true;
    if (lowerHtml.includes("attention required") && lowerHtml.includes("cloudflare")) return true;
  }
  return false;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return json({
        error: "Missing required environment variables.",
        missing: [
          ...(!supabaseUrl ? ["SUPABASE_URL"] : []),
          ...(!serviceRoleKey ? ["SUPABASE_SERVICE_ROLE_KEY"] : []),
        ],
      }, 500);
    }

    const authHeader = req.headers.get("Authorization") || "";
    const admin = await ensureAdminUser(authHeader, supabaseUrl, serviceRoleKey);
    if (!admin) {
      return json({ error: "Unauthorized: admin access required" }, 403);
    }

    const body = await req.json() as { sources?: SourceInput[]; timeoutMs?: number; dryRun?: boolean };
    if (body.dryRun) {
      return json({
        ok: true,
        function: "competitor-watch-scan",
        adminUserId: admin.userId,
        hasSupabaseUrl: Boolean(supabaseUrl),
        hasServiceRoleKey: Boolean(serviceRoleKey),
        timestamp: new Date().toISOString(),
      });
    }

    const sources = Array.isArray(body.sources) ? body.sources : [];
    const timeoutMs = Math.max(3_000, Math.min(30_000, Number(body.timeoutMs ?? DEFAULT_TIMEOUT_MS)));

    if (sources.length === 0) {
      return json({ results: [] });
    }

    const results: ScanResult[] = [];

    for (const source of sources) {
      const checkedAt = new Date().toISOString();
      const adapter = resolveSourceAdapter(source.source_url);

      if (!adapter) {
        results.push({
          sourceId: source.id,
          sourceName: source.source_name,
          sourceUrl: source.source_url,
          checkedAt,
          adapterUsed: null,
          fetchStatus: null,
          cardsFound: 0,
          candidatesExtracted: [],
          candidatesRejected: 0,
          rejectionReasons: { no_adapter_matched: 1 },
          rejectionSamples: [],
          finalOutcome: "no_adapter_matched",
          outcomeMessage: "No adapter matched this source URL.",
        });
        continue;
      }

      let response: Response;
      try {
        response = await fetch(source.source_url, {
          method: "GET",
          headers: {
            "Accept": "text/html,application/xhtml+xml",
            "User-Agent": USER_AGENT,
          },
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const isTimeout = /timed?\s*out|timeout|aborted/i.test(message);
        results.push({
          sourceId: source.id,
          sourceName: source.source_name,
          sourceUrl: source.source_url,
          checkedAt,
          adapterUsed: adapter.id,
          fetchStatus: null,
          cardsFound: 0,
          candidatesExtracted: [],
          candidatesRejected: 0,
          rejectionReasons: { fetch_failed: 1 },
          rejectionSamples: [message],
          finalOutcome: isTimeout ? "timeout" : "fetch_failed",
          outcomeMessage: isTimeout ? "Source fetch timed out." : `Fetch failed: ${message}`,
        });
        continue;
      }

      const html = await response.text();
      const noHtml = !html || !html.trim();
      const cloudflareBlocked = inferCloudflareBlocked(response.status, response.headers, html);

      if (!response.ok) {
        let finalOutcome: ScanResult["finalOutcome"] = "fetch_failed";
        if (cloudflareBlocked) finalOutcome = "blocked_by_cloudflare";
        else if (response.status === 403) finalOutcome = "http_403";
        else if (response.status === 429) finalOutcome = "http_429";

        results.push({
          sourceId: source.id,
          sourceName: source.source_name,
          sourceUrl: source.source_url,
          checkedAt,
          adapterUsed: adapter.id,
          fetchStatus: response.status,
          cardsFound: 0,
          candidatesExtracted: [],
          candidatesRejected: 0,
          rejectionReasons: { [`http_${response.status}`]: 1 },
          rejectionSamples: [],
          finalOutcome,
          outcomeMessage: cloudflareBlocked
            ? "Request blocked by Cloudflare challenge or bot protection."
            : `HTTP ${response.status} while fetching source.`,
        });
        continue;
      }

      if (noHtml) {
        results.push({
          sourceId: source.id,
          sourceName: source.source_name,
          sourceUrl: source.source_url,
          checkedAt,
          adapterUsed: adapter.id,
          fetchStatus: response.status,
          cardsFound: 0,
          candidatesExtracted: [],
          candidatesRejected: 0,
          rejectionReasons: { no_html: 1 },
          rejectionSamples: [],
          finalOutcome: "no_html",
          outcomeMessage: "No HTML returned from source.",
        });
        continue;
      }

      const extraction = extractDiscoveryCandidatesFromHtml(html, source, adapter);
      const validCandidates = extraction.candidates.filter((candidate) => !isGenericOpportunityName(candidate.projectName));
      const pageLooksJavaScriptRendered = extraction.cardsFound === 0 && /<script|id=["']root["']|__NEXT_DATA__/i.test(html);

      if (validCandidates.length === 0) {
        const finalOutcome: ScanResult["finalOutcome"] = pageLooksJavaScriptRendered
          ? "javascript_rendered"
          : extraction.cardsFound === 0
          ? "no_cards_found"
          : "all_candidates_rejected";

        results.push({
          sourceId: source.id,
          sourceName: source.source_name,
          sourceUrl: source.source_url,
          checkedAt,
          adapterUsed: adapter.id,
          fetchStatus: response.status,
          cardsFound: extraction.cardsFound,
          candidatesExtracted: [],
          candidatesRejected: extraction.candidatesRejected,
          rejectionReasons: extraction.rejectedByReason,
          rejectionSamples: extraction.rejectionSamples,
          finalOutcome,
          outcomeMessage: finalOutcome === "javascript_rendered"
            ? "Page appears JavaScript-rendered; static HTML has no extractable cards."
            : finalOutcome === "no_cards_found"
            ? "No cards found in fetched HTML."
            : "All candidates were rejected by validation rules.",
        });
        continue;
      }

      results.push({
        sourceId: source.id,
        sourceName: source.source_name,
        sourceUrl: source.source_url,
        checkedAt,
        adapterUsed: adapter.id,
        fetchStatus: response.status,
        cardsFound: extraction.cardsFound,
        candidatesExtracted: validCandidates,
        candidatesRejected: extraction.candidatesRejected,
        rejectionReasons: extraction.rejectedByReason,
        rejectionSamples: extraction.rejectionSamples,
        finalOutcome: "ok",
        outcomeMessage: `Extracted ${validCandidates.length} valid candidate(s).`,
      });
    }

    return json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: message }, 500);
  }
});
