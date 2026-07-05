import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type SourceInput = {
  id: string;
  source_name: string;
  source_url: string;
  source_type?: "airdrop_directory" | "ecosystem_blog" | "foundation_announcement" | "testnet_campaign" | "quest_platform" | "research_news";
  trust_level?: "high" | "medium" | "low";
  notes?: string | null;
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
  opportunityType: "Verified Airdrop" | "Testnet" | "Points Program" | "Speculative Token" | "Scam Alert" | null;
  shortDescription: string | null;
  listingDate: string | null;
  confidence: "low" | "medium" | "high";
  sourceLabel: string;
  officialDocsUrl: string | null;
  githubUrl: string | null;
  officialXUrl: string | null;
  officialDiscordUrl: string | null;
  contractAddress: string | null;
  knownAliases: string[];
  fundingInfo: string | null;
  teamInfo: string | null;
  riskLevel: "Low" | "Medium" | "High";
  aiClassification?: "airdrop" | "speculative_token" | "testnet" | "quest_campaign" | "ecosystem_incentive" | "unknown";
  aiSummary?: string;
  riskNotes?: string;
  suggestedStatus?: "new" | "queued" | "needs_review" | "ignored";
  aiConfidence?: "low" | "medium" | "high";
  officialSourcesFound: number;
  estimatedQuality: "High" | "Medium" | "Low";
  estimatedDifficulty: "Easy" | "Moderate" | "Hard";
  estimatedTime: string;
  analystSummary: string;
  detectedKeywords: string[];
  reasonDetected: string;
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
    | "needs_adapter"
    | "no_adapter_matched"
    | "no_cards_found"
    | "no_extractable_content"
    | "all_candidates_rejected"
    | "parser_failed"
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
  {
    id: "github-releases",
    label: "GitHub Releases",
    hostPatterns: [/^github\.com$/i, /(^|\.)github\.com$/i],
    listingPathPatterns: [/\/releases\/tag\//i, /^https?:\/\/github\.com\/[^/]+\/[^/]+\/?$/i],
  },
  {
    id: "github-repository",
    label: "GitHub Repository",
    hostPatterns: [/^github\.com$/i, /(^|\.)github\.com$/i],
    listingPathPatterns: [/^https?:\/\/github\.com\/[^/]+\/[^/]+\/?$/i, /\/blob\//i, /\/tree\//i],
  },
  {
    id: "rss-feed",
    label: "RSS Feed",
    hostPatterns: [/.*/],
    listingPathPatterns: [/./],
  },
  {
    id: "xml-sitemap",
    label: "XML Sitemap",
    hostPatterns: [/.*/],
    listingPathPatterns: [/./],
  },
  {
    id: "official-docs",
    label: "Official Docs",
    hostPatterns: [/.*/],
    listingPathPatterns: [/\/docs/i, /\/guide/i, /\/learn/i, /\/announcement/i, /\/blog/i, /./],
  },
  {
    id: "official-blog",
    label: "Official Blog",
    hostPatterns: [/.*/],
    listingPathPatterns: [/\/blog/i, /\/news/i, /\/announcement/i, /\/updates?/i, /./],
  },
  {
    id: "foundation-announcements",
    label: "Foundation Announcements",
    hostPatterns: [/.*/],
    listingPathPatterns: [/\/foundation/i, /\/announcements?/i, /\/news/i, /./],
  },
  {
    id: "crypto-news",
    label: "Crypto News",
    hostPatterns: [/.*/],
    listingPathPatterns: [/\/news/i, /\/airdrop/i, /\/campaign/i, /\/token/i, /./],
  },
  {
    id: "static-html",
    label: "Static HTML",
    hostPatterns: [/.*/],
    listingPathPatterns: [/./],
  },
];

const GENERIC_COMPETITOR_NAMES = new Set([
  "airdrop",
  "airdrops",
  "spaces",
  "quests",
  "tasks",
  "campaigns",
  "rewards",
  "dashboard",
  "explore",
  "learn",
  "docs",
  "blog",
  "events",
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

const DISCOVERY_KEYWORD_SIGNALS = [
  "airdrop",
  "quest",
  "campaign",
  "reward",
  "rewards",
  "points",
  "testnet",
  "mainnet",
  "retroactive",
  "whitelist",
  "token",
  "defi",
  "nft",
  "layer2",
  "bridge",
  "staking",
  "referral",
  "invite",
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

function normalizeComparableUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    const normalizedPath = url.pathname.replace(/\/$/, "").toLowerCase() || "/";
    return `${url.hostname.replace(/^www\./, "").toLowerCase()}${normalizedPath}`;
  } catch {
    return null;
  }
}

function normalizeContract(value: string | null | undefined): string | null {
  const trimmed = String(value ?? "").trim().toLowerCase();
  if (!trimmed) return null;
  return /^0x[a-f0-9]{40}$/.test(trimmed) ? trimmed : null;
}

function buildCandidateIdentityKeys(candidate: DiscoveryCandidate): Set<string> {
  const keys = new Set<string>();
  const add = (value: string | null | undefined, prefix: string) => {
    const trimmed = String(value ?? "").trim();
    if (!trimmed) return;
    keys.add(`${prefix}:${trimmed.toLowerCase()}`);
  };

  add(normalizeProjectName(candidate.projectName), "name");
  (candidate.knownAliases ?? []).forEach((alias) => add(normalizeProjectName(alias), "alias"));
  add(normalizeComparableUrl(candidate.listingUrl), "listing");
  add(normalizeComparableUrl(candidate.projectUrl), "url");
  add(normalizeComparableUrl(candidate.officialDocsUrl), "url");
  add(normalizeComparableUrl(candidate.githubUrl), "url");
  add(normalizeComparableUrl(candidate.officialXUrl), "url");
  add(normalizeComparableUrl(candidate.officialDiscordUrl), "url");
  add(normalizeContract(candidate.contractAddress), "contract");
  return keys;
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

function hasReasonableProjectName(name: string): boolean {
  const cleaned = normalizeProjectName(name);
  if (!cleaned) return false;
  if (cleaned.length < 3 || cleaned.length > 60) return false;
  if (/^\d+$/.test(cleaned)) return false;

  const tokens = cleaned.split(" ").filter(Boolean);
  if (tokens.length === 0) return false;
  if (tokens.every((token) => GENERIC_COMPETITOR_NAMES.has(token))) return false;
  if (tokens.length === 1 && tokens[0].length < 4 && !/\d/.test(tokens[0])) return false;

  return true;
}

function hasDiscoveryIdentitySupport(candidate: DiscoveryCandidate): boolean {
  if (candidate.projectUrl || candidate.officialDocsUrl || candidate.githubUrl || candidate.officialXUrl || candidate.officialDiscordUrl) {
    return true;
  }

  const meaningfulAlias = (candidate.knownAliases ?? []).some((alias) => {
    const normalized = normalizeProjectName(alias);
    return hasReasonableProjectName(alias) && !GENERIC_COMPETITOR_NAMES.has(normalized);
  });

  return Boolean(candidate.contractAddress || meaningfulAlias);
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
    return DISCOVERY_SOURCE_ADAPTERS.find((adapter) => adapter.hostPatterns.some((pattern) => pattern.test(hostname))) || inferSourceAdapterFromUrl(sourceUrl);
  } catch {
    return inferSourceAdapterFromUrl(sourceUrl);
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

function detectKeywordsFromText(text: string): string[] {
  const lowered = text.toLowerCase();
  const matched = DISCOVERY_KEYWORD_SIGNALS.filter((keyword) => lowered.includes(keyword));
  return matched.slice(0, 8);
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

function extractContractAddress(text: string): string | null {
  const match = text.match(/\b0x[a-fA-F0-9]{40}\b/);
  return match ? match[0] : null;
}

function extractKnownAliases(projectName: string, listingUrl: string, projectUrl: string | null): string[] {
  const aliases = new Set<string>();
  const addSlug = (raw: string | null) => {
    if (!raw) return;
    try {
      const parts = new URL(raw).pathname.split("/").filter(Boolean);
      const slug = parts.length ? parts[parts.length - 1].replace(/[\-_]+/g, " ").trim() : "";
      const cleaned = sanitizeProjectCandidate(slug);
      if (cleaned && normalizeProjectName(cleaned) !== normalizeProjectName(projectName)) aliases.add(cleaned);
    } catch {
      // ignore bad urls
    }
  };

  addSlug(listingUrl);
  addSlug(projectUrl);
  return Array.from(aliases).slice(0, 6);
}

function countOfficialSources(projectUrl: string | null, docsUrl: string | null, githubUrl: string | null, xUrl: string | null, discordUrl: string | null): number {
  return [projectUrl, docsUrl, githubUrl, xUrl, discordUrl].filter(Boolean).length;
}

function inferOpportunityType(text: string): "Verified Airdrop" | "Testnet" | "Points Program" | "Speculative Token" | "Scam Alert" {
  const lowered = text.toLowerCase();
  if (/scam|phishing|drainer|fake claim|fake airdrop|exploit|blacklist/i.test(lowered)) return "Scam Alert";
  if (/testnet|devnet|incentivized testnet|beta network/i.test(lowered)) return "Testnet";
  if (/points|xp|leaderboard|season|missions|quests/i.test(lowered)) return "Points Program";
  if (/token launch|trading live|memecoin|speculative token|dex pair|liquidity pool/i.test(lowered)) return "Speculative Token";
  return "Verified Airdrop";
}

function inferRiskLevel(text: string, opportunityType: string): "Low" | "Medium" | "High" {
  const lowered = text.toLowerCase();
  if (opportunityType === "Scam Alert" || /scam|phishing|drainer|fake|impersonat|rug|honeypot/i.test(lowered)) return "High";
  if (opportunityType === "Speculative Token" || /token launch|no audit|unverified|anonymous|rumou?r/i.test(lowered)) return "Medium";
  return "Low";
}

function inferEstimatedQuality(officialSourcesFound: number, confidence: "low" | "medium" | "high", fundingInfo: string | null, teamInfo: string | null): "High" | "Medium" | "Low" {
  const score = officialSourcesFound + (confidence === "high" ? 2 : confidence === "medium" ? 1 : 0) + (fundingInfo ? 1 : 0) + (teamInfo ? 1 : 0);
  if (score >= 5) return "High";
  if (score >= 3) return "Medium";
  return "Low";
}

function inferEstimatedDifficulty(text: string, opportunityType: string): "Easy" | "Moderate" | "Hard" {
  const lowered = text.toLowerCase();
  if (opportunityType === "Testnet" || /bridge|swap|stake|deploy|multiple tasks|multi-step/i.test(lowered)) return "Hard";
  if (/quest|campaign|points|signup|social/i.test(lowered)) return "Moderate";
  return "Easy";
}

function inferEstimatedTime(text: string, difficulty: "Easy" | "Moderate" | "Hard"): string {
  const lowered = text.toLowerCase();
  if (/daily|weekly|ongoing|season/i.test(lowered)) return "Ongoing";
  if (difficulty === "Hard") return "2-6 hours";
  if (difficulty === "Moderate") return "30-90 minutes";
  return "10-30 minutes";
}

function classifyDiscoveryCandidate(input: {
  combinedText: string;
  opportunityType: "Verified Airdrop" | "Testnet" | "Points Program" | "Speculative Token" | "Scam Alert";
  sourceType?: SourceInput["source_type"];
  trustLevel?: SourceInput["trust_level"];
  shortDescription: string | null;
  projectName: string;
}): {
  aiClassification: NonNullable<DiscoveryCandidate["aiClassification"]>;
  aiSummary: string;
  riskNotes: string;
  suggestedStatus: NonNullable<DiscoveryCandidate["suggestedStatus"]>;
  aiConfidence: NonNullable<DiscoveryCandidate["aiConfidence"]>;
} {
  const lowered = input.combinedText.toLowerCase();
  const sourceTrustBoost = input.trustLevel === "high" ? 1 : input.trustLevel === "low" ? -1 : 0;

  const baseClassification: NonNullable<DiscoveryCandidate["aiClassification"]> = (() => {
    if (input.opportunityType === "Scam Alert" || /scam|phishing|drainer|fake claim|exploit/i.test(lowered)) return "unknown";
    if (input.opportunityType === "Speculative Token" || /token launch|memecoin|dex pair|liquidity pool/i.test(lowered)) return "speculative_token";
    if (input.opportunityType === "Testnet" || /testnet|devnet|alpha|beta network/i.test(lowered)) return "testnet";
    if (/quest|campaign|missions|tasks|points|xp|leaderboard|questboard/i.test(lowered)) return "quest_campaign";
    if (/incentive|airdrop|reward|rewards|retroactive|grant|ecosystem/i.test(lowered)) return "ecosystem_incentive";
    return "airdrop";
  })();

  const aiConfidence = input.shortDescription ? (sourceTrustBoost >= 0 ? "medium" : "low") : "low";
  const suggestedStatus: NonNullable<DiscoveryCandidate["suggestedStatus"]> = baseClassification === "unknown" ? "needs_review" : "queued";
  const aiSummary = `${input.projectName} was classified as ${baseClassification.replace(/_/g, ' ')} from public source signals and listing context.`;
  const riskNotes = input.opportunityType === "Scam Alert"
    ? 'Risk elevated: the source signals suggest scam or impersonation language.'
    : sourceTrustBoost < 0
    ? 'Source trust is low, so confidence should remain conservative.'
    : 'No immediate scam indicators detected from the current source signals.';

  return {
    aiClassification: baseClassification,
    aiSummary,
    riskNotes,
    suggestedStatus,
    aiConfidence,
  };
}

function buildAnalystSummary(projectName: string, opportunityType: string, officialSourcesFound: number, riskLevel: string, detectedKeywords: string[]): string {
  const keywordText = detectedKeywords.length ? detectedKeywords.slice(0, 4).join(", ") : "limited keyword evidence";
  return `${projectName} was detected as a ${opportunityType.toLowerCase()} because scan signals matched ${keywordText}. ${officialSourcesFound} official or semi-official source${officialSourcesFound === 1 ? " was" : "s were"} found, and the current risk profile is ${riskLevel.toLowerCase()}.`;
}

function inferSourceAdapterFromUrl(sourceUrl: string): SourceAdapter {
  const lowered = sourceUrl.toLowerCase();
  if (/github\.com\/.+\/.+\/releases/.test(lowered)) return DISCOVERY_SOURCE_ADAPTERS.find((item) => item.id === "github-releases") || DISCOVERY_SOURCE_ADAPTERS[0];
  if (/github\.com\/.+\/.+/.test(lowered)) return DISCOVERY_SOURCE_ADAPTERS.find((item) => item.id === "github-repository") || DISCOVERY_SOURCE_ADAPTERS[0];
  if (/sitemap|\.xml($|\?)/.test(lowered)) return DISCOVERY_SOURCE_ADAPTERS.find((item) => item.id === "xml-sitemap") || DISCOVERY_SOURCE_ADAPTERS[0];
  if (/rss|feed|atom/.test(lowered)) return DISCOVERY_SOURCE_ADAPTERS.find((item) => item.id === "rss-feed") || DISCOVERY_SOURCE_ADAPTERS[0];
  if (/docs\.|\/docs|\/guide|\/learn/.test(lowered)) return DISCOVERY_SOURCE_ADAPTERS.find((item) => item.id === "official-docs") || DISCOVERY_SOURCE_ADAPTERS[0];
  if (/foundation|announcements?/.test(lowered)) return DISCOVERY_SOURCE_ADAPTERS.find((item) => item.id === "foundation-announcements") || DISCOVERY_SOURCE_ADAPTERS[0];
  if (/coindesk|theblock|decrypt|cointelegraph|blockworks/.test(lowered)) return DISCOVERY_SOURCE_ADAPTERS.find((item) => item.id === "crypto-news") || DISCOVERY_SOURCE_ADAPTERS[0];
  if (/blog|news|updates?/.test(lowered)) return DISCOVERY_SOURCE_ADAPTERS.find((item) => item.id === "official-blog") || DISCOVERY_SOURCE_ADAPTERS[0];
  return DISCOVERY_SOURCE_ADAPTERS.find((item) => item.id === "static-html") || DISCOVERY_SOURCE_ADAPTERS[0];
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

    if (!hasReasonableProjectName(projectName)) {
      reject("invalid_project_name", projectName);
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
    const contractAddress = extractContractAddress(fullCardText);

    const combinedText = [projectName, shortDescription, fullCardText].join(" ");
    const blockchain = inferBlockchainFromText(combinedText);
    const category = inferCategoryFromText(combinedText);
    const opportunityType = inferOpportunityType(combinedText);
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
    const officialSourcesFound = countOfficialSources(projectUrl, officialUrls.docsUrl, officialUrls.githubUrl, officialUrls.xUrl, officialUrls.discordUrl);
    const riskLevel = inferRiskLevel(combinedText, opportunityType);
    const estimatedQuality = inferEstimatedQuality(officialSourcesFound, confidence, fundingInfo, teamInfo);
    const estimatedDifficulty = inferEstimatedDifficulty(combinedText, opportunityType);
    const estimatedTime = inferEstimatedTime(combinedText, estimatedDifficulty);
    const detectedKeywords = detectKeywordsFromText(`${projectName} ${shortDescription || ""} ${fullCardText}`);
    const knownAliases = extractKnownAliases(projectName, listingUrl, projectUrl);
    const analystSummary = buildAnalystSummary(projectName, opportunityType, officialSourcesFound, riskLevel, detectedKeywords);
    const aiSignals = classifyDiscoveryCandidate({
      combinedText,
      opportunityType,
      sourceType: source.source_type,
      trustLevel: source.trust_level,
      shortDescription,
      projectName,
    });

    const candidate: DiscoveryCandidate = {
      projectName,
      projectUrl,
      listingUrl,
      blockchain,
      category,
      opportunityType,
      shortDescription,
      listingDate,
      confidence,
      sourceLabel: adapter.label,
      officialDocsUrl: officialUrls.docsUrl,
      githubUrl: officialUrls.githubUrl,
      officialXUrl: officialUrls.xUrl,
      officialDiscordUrl: officialUrls.discordUrl,
      contractAddress,
      knownAliases,
      fundingInfo,
      teamInfo,
      riskLevel,
      aiClassification: aiSignals.aiClassification,
      aiSummary: aiSignals.aiSummary,
      riskNotes: aiSignals.riskNotes,
      suggestedStatus: aiSignals.suggestedStatus,
      aiConfidence: aiSignals.aiConfidence,
      officialSourcesFound,
      estimatedQuality,
      estimatedDifficulty,
      estimatedTime,
      analystSummary,
      detectedKeywords,
      reasonDetected: `Matched listing link pattern from ${adapter.label} adapter and extracted project card signals.`,
    };

    if (!hasDiscoveryIdentitySupport(candidate)) {
      reject("insufficient_identity_signal", projectName);
      continue;
    }

    const dedupeKey = `${normalizeProjectName(projectName)}::${listingUrl}`;
    if (dedupe.has(dedupeKey)) {
      reject("duplicate_candidate", projectName);
      continue;
    }
    dedupe.add(dedupeKey);

    found.push(candidate);
  }

  return {
    candidates: found,
    cardsFound: listingAnchors,
    candidatesRejected: rejectedCount,
    rejectedByReason,
    rejectionSamples,
  };
}

function dedupeCandidates(candidates: DiscoveryCandidate[]): DiscoveryCandidate[] {
  const seen = new Set<string>();
  const seenIdentityKeys = new Set<string>();
  const result: DiscoveryCandidate[] = [];

  for (const candidate of candidates) {
    const key = `${normalizeProjectName(candidate.projectName)}::${candidate.listingUrl}`;
    const identityKeys = buildCandidateIdentityKeys(candidate);
    if (seen.has(key)) continue;
    let identityDuplicate = false;
    for (const identityKey of identityKeys) {
      if (seenIdentityKeys.has(identityKey)) {
        identityDuplicate = true;
        break;
      }
    }
    if (identityDuplicate) continue;

    seen.add(key);
    identityKeys.forEach((identityKey) => seenIdentityKeys.add(identityKey));
    result.push(candidate);
  }

  return result;
}

function mergeReasonMaps(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
  const merged: Record<string, number> = { ...a };
  Object.entries(b).forEach(([key, value]) => {
    merged[key] = (merged[key] || 0) + value;
  });
  return merged;
}

function extractFallbackCandidatesFromHtml(html: string, source: SourceInput, adapter: SourceAdapter): DiscoveryExtractionResult {
  const found: DiscoveryCandidate[] = [];
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

  const addCandidate = (input: {
    rawName: string | null;
    listingUrl: string;
    projectUrl: string | null;
    reasonDetected: string;
    sourceText: string;
    shortDescription?: string | null;
    listingDate?: string | null;
  }) => {
    const projectName = sanitizeProjectCandidate(input.rawName);
    if (!projectName) {
      reject("fallback_invalid_name", input.rawName);
      return;
    }
    if (!hasReasonableProjectName(projectName)) {
      reject("fallback_invalid_name", projectName);
      return;
    }
    if (isGenericOpportunityName(projectName)) {
      reject("fallback_generic_name", projectName);
      return;
    }
    if (!isProjectListingUrl(input.listingUrl, adapter)) {
      reject("fallback_not_listing_url", input.listingUrl);
      return;
    }

    const fullText = `${projectName} ${input.shortDescription || ""} ${input.sourceText}`;
    const officialUrls = extractOfficialUrlsFromSnippet(input.sourceText, source.source_url);
    const blockchain = inferBlockchainFromText(fullText);
    const category = inferCategoryFromText(fullText);
    const opportunityType = inferOpportunityType(fullText);
    const contractAddress = extractContractAddress(fullText);
    const detectedKeywords = detectKeywordsFromText(fullText);
    const officialSourcesFound = countOfficialSources(input.projectUrl, officialUrls.docsUrl, officialUrls.githubUrl, officialUrls.xUrl, officialUrls.discordUrl);
    const riskLevel = inferRiskLevel(fullText, opportunityType);
    const estimatedQuality = inferEstimatedQuality(officialSourcesFound, input.projectUrl || input.shortDescription ? "medium" : "low", inferFundingFromText(fullText), inferTeamFromText(fullText));
    const estimatedDifficulty = inferEstimatedDifficulty(fullText, opportunityType);
    const estimatedTime = inferEstimatedTime(fullText, estimatedDifficulty);
    const knownAliases = extractKnownAliases(projectName, input.listingUrl, input.projectUrl);
    const analystSummary = buildAnalystSummary(projectName, opportunityType, officialSourcesFound, riskLevel, detectedKeywords);
    const aiSignals = classifyDiscoveryCandidate({
      combinedText: fullText,
      opportunityType,
      sourceType: source.source_type,
      trustLevel: source.trust_level,
      shortDescription: input.shortDescription || null,
      projectName,
    });

    const candidate: DiscoveryCandidate = {
      projectName,
      projectUrl: input.projectUrl,
      listingUrl: input.listingUrl,
      blockchain,
      category,
      opportunityType,
      shortDescription: input.shortDescription || null,
      listingDate: input.listingDate || null,
      confidence: input.projectUrl || input.shortDescription ? "medium" : "low",
      sourceLabel: adapter.label,
      officialDocsUrl: officialUrls.docsUrl,
      githubUrl: officialUrls.githubUrl,
      officialXUrl: officialUrls.xUrl,
      officialDiscordUrl: officialUrls.discordUrl,
      contractAddress,
      knownAliases,
      fundingInfo: inferFundingFromText(fullText),
      teamInfo: inferTeamFromText(fullText),
      riskLevel,
      aiClassification: aiSignals.aiClassification,
      aiSummary: aiSignals.aiSummary,
      riskNotes: aiSignals.riskNotes,
      suggestedStatus: aiSignals.suggestedStatus,
      aiConfidence: aiSignals.aiConfidence,
      officialSourcesFound,
      estimatedQuality,
      estimatedDifficulty,
      estimatedTime,
      analystSummary,
      detectedKeywords,
      reasonDetected: input.reasonDetected,
    };

    if (!hasDiscoveryIdentitySupport(candidate)) {
      reject("fallback_insufficient_identity_signal", projectName);
      return;
    }

    found.push(candidate);
  };

  const pageTitle = html.match(/<title[^>]*>([\s\S]{0,300}?)<\/title>/i)?.[1] ? stripHtml(html.match(/<title[^>]*>([\s\S]{0,300}?)<\/title>/i)?.[1] || "") : "";
  const metaDescription = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]{0,400}?)["'][^>]*>/i)?.[1]
    || html.match(/<meta[^>]+content=["']([\s\S]{0,400}?)["'][^>]+name=["']description["'][^>]*>/i)?.[1]
    || "";
  const headings = Array.from(html.matchAll(/<h[1-3][^>]*>([\s\S]{0,220}?)<\/h[1-3]>/gi))
    .map((m) => stripHtml(m[1] || ""))
    .filter(Boolean)
    .slice(0, 20);

  const pageContext = `${pageTitle} ${metaDescription} ${headings.join(" ")}`;

  let fallbackCardsFound = 0;

  for (const match of html.matchAll(/<a\s([^>]{0,1800})>([\s\S]{0,600}?)<\/a>/gi)) {
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

    if (!isProjectListingUrl(listingUrl, adapter)) continue;
    fallbackCardsFound += 1;

    const titleAttr = attrs.match(/title\s*=\s*["']([^"']+)["']/i)?.[1] || null;
    const ariaLabel = attrs.match(/aria-label\s*=\s*["']([^"']+)["']/i)?.[1] || null;
    const anchorText = stripHtml(innerHtml);
    const slugFallback = (() => {
      try {
        const pathParts = new URL(listingUrl).pathname.split("/").filter(Boolean);
        return pathParts.length > 0 ? pathParts[pathParts.length - 1].replace(/[\-_]+/g, " ") : null;
      } catch {
        return null;
      }
    })();

    addCandidate({
      rawName: pickTextContent(titleAttr, ariaLabel, anchorText, slugFallback),
      listingUrl,
      projectUrl: null,
      reasonDetected: "Detected from link/title/heading fallback extraction.",
      sourceText: `${innerHtml} ${pageContext}`,
      shortDescription: pickTextContent(anchorText, metaDescription),
      listingDate: extractDateFromText(`${anchorText} ${pageContext}`),
    });
  }

  for (const jsonLdMatch of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]{0,20000}?)<\/script>/gi)) {
    const scriptBody = (jsonLdMatch[1] || "").trim();
    if (!scriptBody) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(scriptBody);
    } catch {
      reject("jsonld_parse_error", scriptBody.slice(0, 120));
      continue;
    }

    const records: Record<string, unknown>[] = Array.isArray(parsed)
      ? parsed.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
      : parsed && typeof parsed === "object"
      ? [parsed as Record<string, unknown>]
      : [];

    for (const record of records) {
      const maybeName = typeof record.name === "string" ? record.name : typeof record.headline === "string" ? record.headline : null;
      const maybeUrl = typeof record.url === "string" ? record.url : typeof record.mainEntityOfPage === "string" ? record.mainEntityOfPage : null;
      if (!maybeName || !maybeUrl) continue;

      let listingUrl: string;
      try {
        listingUrl = new URL(maybeUrl, source.source_url).toString();
      } catch {
        continue;
      }

      addCandidate({
        rawName: maybeName,
        listingUrl,
        projectUrl: maybeUrl,
        reasonDetected: "Detected from JSON-LD metadata fallback extraction.",
        sourceText: `${JSON.stringify(record).slice(0, 2000)} ${pageContext}`,
        shortDescription: typeof record.description === "string" ? record.description : metaDescription,
        listingDate: typeof record.datePublished === "string" ? record.datePublished : null,
      });
    }
  }

  const scriptSignals = Array.from(html.matchAll(/<script[^>]*>([\s\S]{0,30000}?)<\/script>/gi))
    .map((m) => m[1] || "")
    .filter((value) => /quest|campaign|airdrop|token|reward/i.test(value))
    .slice(0, 6);

  for (const snippet of scriptSignals) {
    for (const link of snippet.matchAll(/https?:\/\/[^\s"'<>]+/gi)) {
      const raw = link[0] || "";
      if (!raw) continue;
      if (!isProjectListingUrl(raw, adapter)) continue;

      const pathName = (() => {
        try {
          const parts = new URL(raw).pathname.split("/").filter(Boolean);
          return parts.length ? parts[parts.length - 1] : "";
        } catch {
          return "";
        }
      })();

      addCandidate({
        rawName: pathName,
        listingUrl: raw,
        projectUrl: null,
        reasonDetected: "Detected from embedded script URL fallback extraction.",
        sourceText: `${snippet.slice(0, 1200)} ${pageContext}`,
        shortDescription: metaDescription || null,
        listingDate: extractDateFromText(snippet),
      });
    }
  }

  const deduped = dedupeCandidates(found);
  const fallbackCards = fallbackCardsFound > 0 ? fallbackCardsFound : deduped.length;

  return {
    candidates: deduped,
    cardsFound: fallbackCards,
    candidatesRejected: rejectedCount,
    rejectedByReason,
    rejectionSamples,
  };
}

function extractDiscoveryCandidatesFromXml(xml: string, source: SourceInput, adapter: SourceAdapter): DiscoveryExtractionResult {
  const candidates: DiscoveryCandidate[] = [];
  const rejectedByReason: Record<string, number> = {};
  const rejectionSamples: string[] = [];

  const addRejection = (reason: string, sample?: string | null) => {
    rejectedByReason[reason] = (rejectedByReason[reason] || 0) + 1;
    if (sample && rejectionSamples.length < 8) rejectionSamples.push(`${reason}: ${sample.slice(0, 120)}`);
  };

  const entryMatches = [...xml.matchAll(/<(item|entry)\b[\s\S]*?<\/(item|entry)>/gi)];
  const urlMatches = entryMatches.length === 0 ? [...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>[\s\S]*?<\/url>/gi)] : [];

  const pushCandidate = (rawName: string | null, listingUrl: string | null, description: string | null, listingDate: string | null) => {
    if (!listingUrl) {
      addRejection('missing_listing_url', rawName);
      return;
    }
    const safeName = sanitizeProjectCandidate(rawName || listingUrl.split('/').filter(Boolean).pop() || '');
    if (!safeName) {
      addRejection('invalid_project_name', rawName || listingUrl);
      return;
    }
    if (!hasReasonableProjectName(safeName)) {
      addRejection('invalid_project_name', safeName);
      return;
    }
    if (isGenericOpportunityName(safeName)) {
      addRejection('generic_project_name', safeName);
      return;
    }
    const fullText = `${safeName} ${description || ''}`;
    const blockchain = inferBlockchainFromText(fullText);
    const category = inferCategoryFromText(fullText);
    const opportunityType = inferOpportunityType(fullText);
    const contractAddress = extractContractAddress(fullText);
    const knownAliases = extractKnownAliases(safeName, listingUrl, listingUrl);
    const detectedKeywords = detectKeywordsFromText(fullText);
    const officialSourcesFound = countOfficialSources(listingUrl, null, null, null, null);
    const riskLevel = inferRiskLevel(fullText, opportunityType);
    const estimatedQuality = inferEstimatedQuality(officialSourcesFound, description ? 'medium' : 'low', null, null);
    const estimatedDifficulty = inferEstimatedDifficulty(fullText, opportunityType);
    const estimatedTime = inferEstimatedTime(fullText, estimatedDifficulty);
    const analystSummary = buildAnalystSummary(safeName, opportunityType, officialSourcesFound, riskLevel, detectedKeywords);
    const aiSignals = classifyDiscoveryCandidate({
      combinedText: fullText,
      opportunityType,
      sourceType: source.source_type,
      trustLevel: source.trust_level,
      shortDescription: description,
      projectName: safeName,
    });

    const candidate: DiscoveryCandidate = {
      projectName: safeName,
      projectUrl: listingUrl,
      listingUrl,
      blockchain,
      category,
      opportunityType,
      shortDescription: description,
      listingDate,
      confidence: description ? 'medium' : 'low',
      sourceLabel: adapter.label,
      officialDocsUrl: null,
      githubUrl: null,
      officialXUrl: null,
      officialDiscordUrl: null,
      contractAddress,
      knownAliases,
      fundingInfo: inferFundingFromText(fullText),
      teamInfo: inferTeamFromText(fullText),
      riskLevel,
      aiClassification: aiSignals.aiClassification,
      aiSummary: aiSignals.aiSummary,
      riskNotes: aiSignals.riskNotes,
      suggestedStatus: aiSignals.suggestedStatus,
      aiConfidence: aiSignals.aiConfidence,
      officialSourcesFound,
      estimatedQuality,
      estimatedDifficulty,
      estimatedTime,
      analystSummary,
      detectedKeywords,
      reasonDetected: `Detected from ${adapter.label} feed or sitemap extraction.`,
    };

    if (!hasDiscoveryIdentitySupport(candidate)) {
      addRejection('insufficient_identity_signal', safeName);
      return;
    }

    candidates.push(candidate);
  };

  if (entryMatches.length > 0) {
    for (const match of entryMatches) {
      const block = match[0] || '';
      const title = stripHtml(block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
      const description = stripHtml(block.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1] || block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i)?.[1] || '');
      const link = block.match(/<link[^>]*>([^<]+)<\/link>/i)?.[1]
        || block.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1]
        || block.match(/<guid[^>]*>([^<]+)<\/guid>/i)?.[1]
        || null;
      const listingDate = stripHtml(block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1] || block.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i)?.[1] || '');
      pushCandidate(title || null, link, description || null, listingDate || null);
    }
  } else {
    for (const match of urlMatches) {
      const listingUrl = (match[1] || '').trim();
      pushCandidate(null, listingUrl, null, null);
    }
  }

  const deduped = dedupeCandidates(candidates);
  return {
    candidates: deduped,
    cardsFound: entryMatches.length > 0 ? entryMatches.length : urlMatches.length,
    candidatesRejected: Object.values(rejectedByReason).reduce((sum, value) => sum + value, 0),
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
          finalOutcome: "needs_adapter",
          outcomeMessage: "Needs adapter: source URL does not match a supported parser.",
        });
        continue;
      }

      let response: Response;
      try {
        response = await fetch(source.source_url, {
          method: "GET",
          headers: {
            "Accept": "text/html,application/xhtml+xml,application/xml,text/xml,application/rss+xml,application/atom+xml",
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

      const contentType = (response.headers.get("content-type") || "").toLowerCase();
      const looksLikeXml = /xml|rss|atom/.test(contentType) || /^\s*</.test(html) && /<(rss|feed|urlset|sitemapindex)\b/i.test(html);

      let extraction: DiscoveryExtractionResult;
      try {
        extraction = looksLikeXml
          ? extractDiscoveryCandidatesFromXml(html, source, adapter)
          : extractDiscoveryCandidatesFromHtml(html, source, adapter);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
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
          rejectionReasons: { parser_failed: 1 },
          rejectionSamples: [message],
          finalOutcome: "parser_failed",
          outcomeMessage: `Parser failed: ${message}`,
        });
        continue;
      }

      let fallbackExtraction: DiscoveryExtractionResult = {
        candidates: [],
        cardsFound: 0,
        candidatesRejected: 0,
        rejectedByReason: {},
        rejectionSamples: [],
      };

      if (extraction.cardsFound === 0 || extraction.candidates.length === 0) {
        try {
          fallbackExtraction = extractFallbackCandidatesFromHtml(html, source, adapter);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
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
            rejectionReasons: mergeReasonMaps(extraction.rejectedByReason, { parser_failed: 1 }),
            rejectionSamples: [...extraction.rejectionSamples, message].slice(0, 8),
            finalOutcome: "parser_failed",
            outcomeMessage: `Fallback parser failed: ${message}`,
          });
          continue;
        }
      }

      const combinedCandidates = dedupeCandidates([...extraction.candidates, ...fallbackExtraction.candidates]);
      const validCandidates = combinedCandidates.filter((candidate) => !isGenericOpportunityName(candidate.projectName));
      const combinedCardsFound = Math.max(extraction.cardsFound, fallbackExtraction.cardsFound);
      const combinedRejected = extraction.candidatesRejected + fallbackExtraction.candidatesRejected;
      const combinedReasons = mergeReasonMaps(extraction.rejectedByReason, fallbackExtraction.rejectedByReason);
      const combinedSamples = [...extraction.rejectionSamples, ...fallbackExtraction.rejectionSamples].slice(0, 12);
      const pageLooksJavaScriptRendered = combinedCardsFound === 0 && /__NEXT_DATA__|__NUXT__|data-reactroot|id=["'](?:root|__next|app)["']|hydrateRoot|createRoot|webpackJsonp|window\.__/i.test(html);

      if (validCandidates.length === 0) {
        const finalOutcome: ScanResult["finalOutcome"] = pageLooksJavaScriptRendered
          ? "javascript_rendered"
          : combinedCardsFound === 0
          ? "no_extractable_content"
          : "all_candidates_rejected";

        results.push({
          sourceId: source.id,
          sourceName: source.source_name,
          sourceUrl: source.source_url,
          checkedAt,
          adapterUsed: adapter.id,
          fetchStatus: response.status,
          cardsFound: combinedCardsFound,
          candidatesExtracted: [],
          candidatesRejected: combinedRejected,
          rejectionReasons: combinedReasons,
          rejectionSamples: combinedSamples,
          finalOutcome,
          outcomeMessage: finalOutcome === "javascript_rendered"
            ? "JS-rendered page detected. Static scanner could not extract project cards; adapter/runtime extraction needed."
            : finalOutcome === "no_extractable_content"
            ? "No extractable content detected from static HTML (title/meta/headings/links/JSON-LD/scripts)."
            : "Parser ran but all discovered candidates were rejected by validation rules.",
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
        cardsFound: combinedCardsFound,
        candidatesExtracted: validCandidates,
        candidatesRejected: combinedRejected,
        rejectionReasons: combinedReasons,
        rejectionSamples: combinedSamples,
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
