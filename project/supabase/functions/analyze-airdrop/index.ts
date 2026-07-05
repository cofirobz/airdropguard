import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

/**
 * AirdropGuard Intelligence Engine v17
 *
 * Purpose:
 * - Enrich project data from many public sources.
 * - Detect scam, phishing, impersonation and contract risk signals.
 * - Produce transparent Trust, Opportunity, Risk, Confidence and Admin Action outputs.
 * - Classify established projects, big protocols and brand-impersonation risk before scoring.
 * - Separate project legitimacy from airdrop opportunity for all major projects, not just OpenSea.
 * - Keep human approval in control. This function does NOT auto-publish.
 * - Adds Opportunity Intelligence 2.0: active campaign / snapshot / token / tasks signals.
 * - Adds Threat Intelligence 1.0: security researcher, exploit, phishing and brand-impersonation signal weighting.
 * - Adds Entity Reputation Engine v9.2: strict established-brand trust floor and project-misconduct separation.
 * - Caps speculative opportunity scores for established projects with no official campaign evidence.
 * - Adds Entity Reputation Engine 1.0 to protect legitimate established brands from phishing-result false positives.
 * - Adds Score Calibration v10: evidence-based ceilings so strong projects do not auto-score 99/100.
 * - Adds Score Calibration v11: project-type bands, blue-chip vs emerging profile separation, and verified-market-only trust weighting.
 * - Adds Maturity Calibration v12: separates blue-chip, growth-stage, and emerging/testnet projects to avoid 88-92 clustering.
 * - Adds Evidence-Driven Calibration v13: scores project maturity from live adoption, verified market/on-chain data,
 *   security evidence, independent sources and operating history instead of checklist-style positives.
 * - Adds Professional Risk Engine v14: source consensus, official-link integrity, user-action safety,
 *   opportunity confidence caps, and clearer admin/user intelligence outputs.
 * - Adds Intelligence Digest v15: watchlist triggers, admin next-action guidance, user-safe verdict labels,
 *   and clearer separation between legitimacy, threat exposure and airdrop usefulness.
 * - Adds Intelligence Collector v16: multi-dimensional project strength, security, community, opportunity
 *   and evidence-depth profiling so AGIE explains exactly why a score was produced.
 * - Adds Project Intelligence Timeline v17: builds a compact timeline of funding, mainnet/testnet,
 *   token, airdrop, audit, exploit, partnership and adoption events from available evidence.
 *
 * Recommended Supabase secrets:
 * - OPENAI_API_KEY                 required
 * - SUPABASE_URL                   required
 * - SUPABASE_SERVICE_ROLE_KEY      required
 * - BRAVE_SEARCH_API_KEY           recommended
 * - GITHUB_TOKEN                   optional but recommended
 * - Go_Plus_Key                    optional
 */

const CACHE_TTL_DAYS = 1;
const ENRICHMENT_CACHE_TTL_HOURS = 24;
const MAX_SEARCH_RESULTS_PER_QUERY = 5;
const MAX_WEB_PAGES_TO_FETCH = 8;
const MAX_PAGE_BYTES = 120_000;
const FETCH_TIMEOUT_MS = 10_000;

const CHAIN_ID_MAP: Record<string, string> = {
  Ethereum: "1",
  "BNB Chain": "56",
  Polygon: "137",
  Arbitrum: "42161",
  Optimism: "10",
  Avalanche: "43114",
  Base: "8453",
  zkSync: "324",
  Linea: "59144",
  Scroll: "534352",
  Mantle: "5000",
  Blast: "81457",
  Solana: "solana",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type RiskLevel = "Low" | "Medium" | "High";
type Recommendation = "verify" | "review_further" | "blacklist";
type TrustLabel = "verified" | "watch" | "scam_alert";
type ConfidenceLevel = "Low" | "Medium" | "High";

type SourceTier = "official" | "primary" | "trusted" | "community" | "unknown" | "risky";

interface SourceEvidence {
  title: string;
  url: string;
  snippet?: string;
  source: string;
  tier: SourceTier;
  query?: string;
  riskTerms?: string[];
  trustTerms?: string[];
}

interface SearchResult {
  title: string;
  url: string;
  snippet?: string;
  query: string;
}

interface WebPageData {
  found: boolean;
  url: string;
  finalUrl?: string;
  statusCode?: number;
  canonicalUrl?: string;
  title?: string;
  text?: string;
  links?: string[];
  note?: string;
}

interface DexData {
  found: boolean;
  price?: string;
  volume24h?: string;
  liquidity?: string;
  priceChange24h?: string;
  dexName?: string;
  fdv?: string;
  pairUrl?: string;
  note?: string;
}

interface GoPlusData {
  found: boolean;
  is_honeypot?: string;
  buy_tax?: string;
  sell_tax?: string;
  is_mintable?: string;
  can_take_back_ownership?: string;
  owner_change_balance?: string;
  is_proxy?: string;
  holder_count?: string;
  is_open_source?: string;
  creator_percent?: string;
  owner_percent?: string;
  note?: string;
}

interface GitHubData {
  found: boolean;
  stars?: number;
  forks?: number;
  openIssues?: number;
  watchers?: number;
  lastPushDaysAgo?: number;
  lastCommitDate?: string;
  contributors?: number;
  visibility?: "public" | "private";
  recentCommits30d?: number;
  language?: string;
  archived?: boolean;
  disabled?: boolean;
  createdAt?: string;
  repoUrl?: string;
  note?: string;
}

interface CoinGeckoData {
  found: boolean;
  coinId?: string;
  price?: number;
  marketCap?: number;
  fullyDilutedValuation?: number;
  volume24h?: number;
  priceChange24h?: number;
  priceChange7d?: number;
  ath?: number;
  athChangePercent?: number;
  circulatingSupply?: number;
  totalSupply?: number;
  twitterFollowers?: number;
  homepage?: string;
  blockchainSite?: string;
  officialForumUrl?: string;
  chatUrl?: string;
  announcementUrl?: string;
  verifiedMatch?: boolean;
  matchConfidence?: "high" | "medium" | "low";
  matchedBy?: string;
  shouldDisplayMarket?: boolean;
  note?: string;
}

interface DefiLlamaData {
  found: boolean;
  tvl?: number;
  tvlChange24h?: number;
  tvlChange7d?: number;
  mcapTvlRatio?: number;
  category?: string;
  chains?: string[];
  url?: string;
  note?: string;
}

interface WebEnrichmentData {
  found: boolean;
  website_accessible?: boolean;
  website_status_code?: number;
  website_canonical_url?: string;
  website_redirect_url?: string;
  github_link?: string;
  docs_url?: string;
  whitepaper_url?: string;
  blog_url?: string;
  medium_url?: string;
  linkedin_url?: string;
  audit_url?: string;
  x_url?: string;
  discord_url?: string;
  telegram_url?: string;
  has_team_info?: boolean;
  team_visibility?: "Public Team" | "Anonymous" | "Partially Public";
  token_mentioned?: boolean;
  mainnet_mentioned?: boolean;
  testnet_mentioned?: boolean;
  funding_mentions?: string[];
  known_investors?: string[];
  ecosystems?: string[];
  partner_mentions?: number;
  risk_terms?: string[];
  note?: string;
}

interface EnrichmentField<T = unknown> {
  value: T;
  confidence: ConfidenceLevel;
  source_url: string | null;
}

interface EnrichmentProfile {
  version: number;
  generated_at: string;
  cache_key: string;
  fields: {
    official_website: {
      accessibility: EnrichmentField<string>;
      canonical_url: EnrichmentField<string>;
      redirect_url: EnrichmentField<string>;
    };
    documentation: {
      docs: EnrichmentField<string>;
      whitepaper: EnrichmentField<string>;
    };
    github: {
      repository_url: EnrichmentField<string>;
      last_commit_date: EnrichmentField<string>;
      commit_activity: EnrichmentField<string>;
      contributors: EnrichmentField<string>;
      visibility: EnrichmentField<string>;
    };
    team: {
      visibility: EnrichmentField<string>;
    };
    funding_investors: {
      investors: EnrichmentField<string>;
    };
    socials: {
      x: EnrichmentField<string>;
      discord: EnrichmentField<string>;
      telegram: EnrichmentField<string>;
      medium: EnrichmentField<string>;
      linkedin: EnrichmentField<string>;
    };
    token: {
      token_name: EnrichmentField<string>;
      symbol: EnrichmentField<string>;
      contract_address: EnrichmentField<string>;
      blockchain: EnrichmentField<string>;
      contract_verified: EnrichmentField<string>;
    };
    project_metadata: {
      category: EnrichmentField<string>;
      main_blockchain: EnrichmentField<string>;
      launch_status: EnrichmentField<string>;
      network_stage: EnrichmentField<string>;
      approximate_project_age: EnrichmentField<string>;
    };
  };
  failures: string[];
  snapshots: {
    web: WebEnrichmentData;
    github: GitHubData;
  };
}

interface IntelligenceScore {
  trust_score: number;
  opportunity_score: number;
  confidence_score: number;
  confidence_level: ConfidenceLevel;
  risk_level: RiskLevel;
  reward_potential: RiskLevel;
  difficulty: "Easy" | "Moderate" | "Hard";
  ai_recommendation: Recommendation;
  trust_label: TrustLabel;
  reasons: string[];
  scam_warnings: string[];
  missing_information: string[];
  sources_checked: string[];
  recommended_admin_action: string;
  confidence_explanation: string;
  breakdown: Record<string, number>;
}

interface AiNarrative {
  ai_summary: string;
  ai_risk_analysis: string;
  ai_reward_estimate: string;
  overview: string;
  why_airdrop: string;
  opportunity_intelligence?: OpportunityIntelligenceReport;
}

type OpportunityRating = "Strong" | "Promising" | "Speculative" | "Avoid";
type RiskRating = "Low" | "Medium" | "High";
type SkillLevel = "Beginner" | "Intermediate" | "Advanced";
type LongTermValueLikelihood = "High" | "Medium" | "Low";

interface OpportunityIntelligenceReport {
  overall_intelligence_score: number;
  confidence: number;
  opportunity_rating: OpportunityRating;
  risk_rating: RiskRating;
  difficulty: "Easy" | "Moderate" | "Hard";
  time_required: string;
  estimated_potential: string;
  why_this_opportunity_matters: string;
  positive_signals: string[];
  warning_signals: string[];
  who_this_is_suitable_for: string;
  who_should_avoid_it: string;
  estimated_time_commitment: string;
  expected_skill_level: SkillLevel;
  likelihood_of_long_term_value: LongTermValueLikelihood;
  explanation: string;
  discovery_signals: {
    project_age: string;
    funding: string;
    investors: string;
    github_activity: string;
    documentation: string;
    website_quality: string;
    community_size: string;
    contract_analysis: string;
    onchain_metrics: string;
    wallet_intelligence: string;
    previous_campaigns: string;
    competitor_watch: string;
  };
}

function normalizeOpportunityRating(value: string): OpportunityRating {
  const lowered = safeString(value).toLowerCase();
  if (lowered.includes("strong")) return "Strong";
  if (lowered.includes("promis")) return "Promising";
  if (lowered.includes("avoid")) return "Avoid";
  return "Speculative";
}

function normalizeRiskRating(value: string): RiskRating {
  const lowered = safeString(value).toLowerCase();
  if (lowered.startsWith("h")) return "High";
  if (lowered.startsWith("l")) return "Low";
  return "Medium";
}

function normalizeSkillLevel(value: string): SkillLevel {
  const lowered = safeString(value).toLowerCase();
  if (lowered.startsWith("a")) return "Advanced";
  if (lowered.startsWith("b")) return "Beginner";
  return "Intermediate";
}

function normalizeLongTermValue(value: string): LongTermValueLikelihood {
  const lowered = safeString(value).toLowerCase();
  if (lowered.startsWith("h")) return "High";
  if (lowered.startsWith("l")) return "Low";
  return "Medium";
}

function normalizeSignalMap(value: unknown, fallback: OpportunityIntelligenceReport["discovery_signals"]): OpportunityIntelligenceReport["discovery_signals"] {
  if (!value || typeof value !== "object") return fallback;
  const rec = value as Record<string, unknown>;
  return {
    project_age: safeString(rec.project_age) || fallback.project_age,
    funding: safeString(rec.funding) || fallback.funding,
    investors: safeString(rec.investors) || fallback.investors,
    github_activity: safeString(rec.github_activity) || fallback.github_activity,
    documentation: safeString(rec.documentation) || fallback.documentation,
    website_quality: safeString(rec.website_quality) || fallback.website_quality,
    community_size: safeString(rec.community_size) || fallback.community_size,
    contract_analysis: safeString(rec.contract_analysis) || fallback.contract_analysis,
    onchain_metrics: safeString(rec.onchain_metrics) || fallback.onchain_metrics,
    wallet_intelligence: safeString(rec.wallet_intelligence) || fallback.wallet_intelligence,
    previous_campaigns: safeString(rec.previous_campaigns) || fallback.previous_campaigns,
    competitor_watch: safeString(rec.competitor_watch) || fallback.competitor_watch,
  };
}

function normalizeOpportunityIntelligenceReport(raw: unknown, fallback: OpportunityIntelligenceReport): OpportunityIntelligenceReport {
  if (!raw || typeof raw !== "object") return fallback;
  const rec = raw as Record<string, unknown>;

  return {
    overall_intelligence_score: clampOrFallback(rec.overall_intelligence_score, fallback.overall_intelligence_score),
    confidence: clampOrFallback(rec.confidence, fallback.confidence),
    opportunity_rating: normalizeOpportunityRating(safeString(rec.opportunity_rating) || fallback.opportunity_rating),
    risk_rating: normalizeRiskRating(safeString(rec.risk_rating) || fallback.risk_rating),
    difficulty: safeString(rec.difficulty) === "Hard" ? "Hard" : safeString(rec.difficulty) === "Easy" ? "Easy" : fallback.difficulty,
    time_required: safeString(rec.time_required) || fallback.time_required,
    estimated_potential: safeString(rec.estimated_potential) || fallback.estimated_potential,
    why_this_opportunity_matters: safeString(rec.why_this_opportunity_matters) || fallback.why_this_opportunity_matters,
    positive_signals: toStrArray(rec.positive_signals).length ? toStrArray(rec.positive_signals).slice(0, 8) : fallback.positive_signals,
    warning_signals: toStrArray(rec.warning_signals).length ? toStrArray(rec.warning_signals).slice(0, 8) : fallback.warning_signals,
    who_this_is_suitable_for: safeString(rec.who_this_is_suitable_for) || fallback.who_this_is_suitable_for,
    who_should_avoid_it: safeString(rec.who_should_avoid_it) || fallback.who_should_avoid_it,
    estimated_time_commitment: safeString(rec.estimated_time_commitment) || fallback.estimated_time_commitment,
    expected_skill_level: normalizeSkillLevel(safeString(rec.expected_skill_level) || fallback.expected_skill_level),
    likelihood_of_long_term_value: normalizeLongTermValue(safeString(rec.likelihood_of_long_term_value) || fallback.likelihood_of_long_term_value),
    explanation: safeString(rec.explanation) || fallback.explanation,
    discovery_signals: normalizeSignalMap(rec.discovery_signals, fallback.discovery_signals),
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const KNOWN_VCS = [
  "a16z", "andreessen horowitz", "paradigm", "multicoin", "sequoia", "binance labs",
  "coinbase ventures", "polychain", "pantera", "dragonfly", "spartan", "framework ventures",
  "electric capital", "galaxy", "galaxy digital", "animoca", "jump crypto", "delphi digital",
  "lightspeed", "tiger global", "accel", "variant", "union square", "bain capital crypto",
  "borderless", "founders fund", "hashed", "cms holdings", "1kx", "mechanism capital",
  "robot ventures", "standard crypto", "hack vc", "blocktower", "okx ventures", "wintermute",
];

const TRUSTED_MEDIA_DOMAINS = [
  "coindesk.com", "theblock.co", "decrypt.co", "cointelegraph.com", "blockworks.co",
  "dlnews.com", "axios.com", "fortune.com", "techcrunch.com", "forbes.com",
  "messari.io", "rootdata.com", "cryptorank.io", "defillama.com", "l2beat.com",
  "coinmarketcap.com", "coingecko.com", "etherscan.io", "basescan.org", "arbiscan.io",
  "optimistic.etherscan.io", "polygonscan.com", "bscscan.com", "snowtrace.io",
  "docs.github.com", "github.com", "securityalliance.org", "rekt.news", "chainabuse.com",
  "certik.com", "hacken.io", "trailofbits.com", "openzeppelin.com", "slowmist.com",
];

const THREAT_INTELLIGENCE_DOMAINS = [
  "scamsniffer.io", "slowmist.com", "certik.com", "hacken.io", "peckshield.com",
  "chainabuse.com", "rekt.news", "immunefi.com", "securityalliance.org", "openzeppelin.com",
  "trailofbits.com", "halborn.com", "blockaid.io", "walletguard.app", "metamask.io",
  "etherscan.io", "basescan.org", "arbiscan.io", "polygonscan.com", "bscscan.com",
];

const SECURITY_RESEARCHER_TERMS = [
  "Scam Sniffer", "SlowMist", "PeckShield", "CertiK", "Hacken", "Chainabuse",
  "Rekt", "Immunefi", "SEAL 911", "Security Alliance", "Blockaid", "Wallet Guard",
  "OpenZeppelin", "Trail of Bits", "Halborn", "ZachXBT", "phishing campaign",
  "wallet drainer", "drainer-as-a-service", "fake claim", "fake website", "fake x account",
];

const ACTIVE_EXPLOIT_TERMS = [
  "active exploit", "exploited", "hacked", "compromised", "drained", "wallet drainer",
  "malware", "private key leaked", "seed phrase", "domain seized", "official discord compromised",
  "official twitter compromised", "official x compromised", "exploit in progress",
];

const BRAND_IMPERSONATION_TERMS = [
  "fake airdrop", "fake claim", "phishing", "impersonator", "impersonation",
  "fake website", "fake x account", "fake twitter", "fake discord", "fake telegram",
  "lookalike domain", "wallet drainer",
];

const HIGH_RISK_TERMS = [
  "seed phrase", "private key", "recovery phrase", "connect wallet to claim", "wallet drainer",
  "drainer", "honeypot", "rug pull", "rugpull", "phishing", "fake airdrop", "impersonator",
  "impersonation", "scam", "hack", "hacked", "exploit", "exploited", "malware", "blacklist",
  "suspicious", "drained", "fake claim", "claim now", "guaranteed profit", "send eth", "pay fee",
  "airdrop scam", "compromised discord", "compromised twitter", "domain seized",
];

const TRUST_TERMS = [
  "audit", "audited", "open source", "documentation", "docs", "github", "funding",
  "backed by", "investors", "mainnet", "testnet", "grant", "bug bounty", "security",
  "whitepaper", "team", "founder", "protocol", "verified", "official",
];

const KNOWN_ESTABLISHED_PROJECT_NAMES = [
  "opensea", "metamask", "uniswap", "coinbase", "base", "arbitrum", "optimism",
  "ethereum", "polygon", "avalanche", "solana", "binance", "bnb chain", "starknet",
  "zksync", "linea", "scroll", "eigenlayer", "layerzero", "wormhole", "phantom",
  "jupiter", "aave", "compound", "makerdao", "sky", "curve", "lido", "ens",
  "the graph", "chainlink", "aptos", "sui", "celestia", "near", "cosmos", "injective",
  "berachain", "monad", "hyperliquid", "babylon", "taiko", "mantle", "blast",
  "farcaster", "nillion", "megaeth",
];

const KNOWN_ESTABLISHED_PROJECT_DOMAINS = [
  "opensea.io", "metamask.io", "uniswap.org", "coinbase.com", "base.org",
  "arbitrum.io", "optimism.io", "ethereum.org", "polygon.technology", "avax.network",
  "solana.com", "bnbchain.org", "starknet.io", "zksync.io", "linea.build", "scroll.io",
  "eigenlayer.xyz", "layerzero.network", "wormhole.com", "phantom.com", "jup.ag",
  "aave.com", "compound.finance", "sky.money", "curve.fi", "lido.fi", "ens.domains",
  "thegraph.com", "chain.link", "aptoslabs.com", "sui.io", "celestia.org", "near.org",
  "cosmos.network", "injective.com", "berachain.com", "monad.xyz", "hyperliquid.xyz",
  "babylonlabs.io", "taiko.xyz", "mantle.xyz", "blast.io",
  "farcaster.xyz", "nillion.com", "megaeth.com",
];

const BLUE_CHIP_PROJECT_NAMES = [
  "opensea", "metamask", "uniswap", "coinbase", "base", "arbitrum", "optimism",
  "ethereum", "polygon", "avalanche", "solana", "binance", "bnb chain", "starknet",
  "zksync", "linea", "scroll", "eigenlayer", "layerzero", "wormhole", "phantom",
  "jupiter", "aave", "compound", "makerdao", "sky", "curve", "lido", "ens",
  "the graph", "chainlink", "aptos", "sui", "celestia", "near", "cosmos", "injective",
  "hyperliquid", "babylon", "taiko", "mantle", "blast",
];

const BLUE_CHIP_PROJECT_DOMAINS = [
  "opensea.io", "metamask.io", "uniswap.org", "coinbase.com", "base.org",
  "arbitrum.io", "optimism.io", "ethereum.org", "polygon.technology", "avax.network",
  "solana.com", "bnbchain.org", "starknet.io", "zksync.io", "linea.build", "scroll.io",
  "eigenlayer.xyz", "layerzero.network", "wormhole.com", "phantom.com", "jup.ag",
  "aave.com", "compound.finance", "sky.money", "curve.fi", "lido.fi", "ens.domains",
  "thegraph.com", "chain.link", "aptoslabs.com", "sui.io", "celestia.org", "near.org",
  "cosmos.network", "injective.com", "hyperliquid.xyz", "babylonlabs.io", "taiko.xyz",
  "mantle.xyz", "blast.io",
];

const EMERGING_PROJECT_NAMES = [
  // Strong but earlier-stage ecosystems. These can score highly, but should not
  // cluster with long-established blue-chip protocols until more live history,
  // audits, TVL, market/on-chain evidence or sustained adoption exists.
  "megaeth", "nillion", "monad", "berachain", "abstract", "initia",
  "humanity protocol", "humanity", "camp network", "boundless", "sophon",
  "zircuit", "plume", "fuel network", "fuel", "movement", "story protocol",
];

const EMERGING_PROJECT_DOMAINS = [
  "megaeth.com", "nillion.com", "monad.xyz", "berachain.com", "abs.xyz",
  "abstract.xyz", "initia.xyz", "humanity.org", "humanityprotocol.xyz",
  "campnetwork.xyz", "boundless.xyz", "sophon.xyz", "zircuit.com",
  "plumenetwork.xyz", "fuel.network", "movementlabs.xyz", "story.foundation",
];

type ProjectMaturityTier = "blue_chip" | "established_product" | "growth_network" | "emerging_network" | "early_stage" | "unknown";

interface EvidenceProfile {
  tier: ProjectMaturityTier;
  liveEvidenceScore: number;
  independentEvidenceScore: number;
  adoptionScore: number;
  securityEvidenceScore: number;
  maxTrust: number;
  minTrust: number;
  explanation: string;
}

interface AdvancedSignalProfile {
  reputationScore: number;
  securityScore: number;
  communityScore: number;
  opportunityQualityScore: number;
  evidenceDepthScore: number;
  overallIntelligenceScore: number;
  strengths: string[];
  risks: string[];
  adminFocus: string[];
  userSummary: string;
}

interface ProjectTimelineEvent {
  type: "founding" | "funding" | "mainnet" | "testnet" | "token" | "airdrop" | "audit" | "exploit" | "partnership" | "adoption" | "development";
  label: string;
  confidence: "high" | "medium" | "low";
  source: string;
  evidence: string;
}

interface ProjectTimelineProfile {
  timelineScore: number;
  maturityMomentumScore: number;
  eventCount: number;
  confirmedEventCount: number;
  watchEventCount: number;
  events: ProjectTimelineEvent[];
  adminInsight: string;
  userInsight: string;
  summary: string;
}

function buildAdvancedSignalProfile(args: {
  airdrop: Record<string, unknown>;
  taskCount: number;
  evidenceProfile: EvidenceProfile;
  evidence: SourceEvidence[];
  github: GitHubData;
  cg: CoinGeckoData;
  llama: DefiLlamaData;
  goplus: GoPlusData;
  hasWebsite: boolean;
  hasDocs: boolean;
  hasTeam: boolean;
  hasFunding: boolean;
  hasGitHub: boolean;
  activeGitHub: boolean;
  hasAudit: boolean;
  hasTvl: boolean;
  hasTokenMarket: boolean;
  hasTasks: boolean;
  trustedSourceCount: number;
  officialSourceCount: number;
  primarySourceCount: number;
  consensusScore: number;
  activeCampaignSignals: number;
  negativeOpportunitySignals: number;
  explicitAirdropConfirmed: boolean;
  activeFarming: boolean;
  noOfficialToken: boolean;
  actionSafetyCritical: boolean;
  actionSafetyMedium: boolean;
  officialLinkMismatch: boolean;
  projectMisconductEvidence: boolean;
  threatIntelCount: number;
  brandImpersonationCount: number;
  scamWarningCount: number;
  missingCount: number;
}): AdvancedSignalProfile {
  const {
    airdrop, taskCount, evidenceProfile, evidence, github, cg, llama, goplus,
    hasWebsite, hasDocs, hasTeam, hasFunding, hasGitHub, activeGitHub, hasAudit,
    hasTvl, hasTokenMarket, hasTasks, trustedSourceCount, officialSourceCount,
    primarySourceCount, consensusScore, activeCampaignSignals, negativeOpportunitySignals,
    explicitAirdropConfirmed, activeFarming, noOfficialToken, actionSafetyCritical,
    actionSafetyMedium, officialLinkMismatch, projectMisconductEvidence, threatIntelCount,
    brandImpersonationCount, scamWarningCount, missingCount,
  } = args;

  const tierBase =
    evidenceProfile.tier === "blue_chip" ? 34 :
    evidenceProfile.tier === "established_product" ? 28 :
    evidenceProfile.tier === "growth_network" ? 23 :
    evidenceProfile.tier === "emerging_network" ? 17 :
    evidenceProfile.tier === "early_stage" ? 10 : 4;

  const reputationScore = clamp(
    tierBase +
    (hasFunding ? 10 : 0) +
    (hasTeam ? 8 : 0) +
    (hasTvl ? 8 : 0) +
    (hasTokenMarket ? 7 : 0) +
    Math.min(10, trustedSourceCount) +
    Math.min(8, consensusScore) +
    (cg.verifiedMatch ? 4 : 0),
    0,
    100,
  );

  const securityScore = clamp(
    52 +
    (hasAudit ? 12 : 0) +
    (activeGitHub ? 8 : hasGitHub ? 3 : 0) +
    (goplus.found && goplus.is_honeypot !== "1" ? 8 : 0) +
    (goplus.is_open_source === "1" ? 6 : 0) +
    (trustedSourceCount >= 6 ? 5 : 0) -
    (actionSafetyCritical ? 55 : actionSafetyMedium ? 10 : 0) -
    (officialLinkMismatch ? 35 : 0) -
    (projectMisconductEvidence ? 35 : 0) -
    Math.min(20, scamWarningCount * 3),
    0,
    100,
  );

  const communityScore = clamp(
    25 +
    ((cg.twitterFollowers ?? 0) > 25_000 ? 8 : 0) +
    ((cg.twitterFollowers ?? 0) > 100_000 ? 8 : 0) +
    ((cg.twitterFollowers ?? 0) > 500_000 ? 6 : 0) +
    ((github.stars ?? 0) > 250 ? 5 : 0) +
    ((github.stars ?? 0) > 1500 ? 6 : 0) +
    (officialSourceCount > 0 ? 5 : 0) +
    (primarySourceCount > 0 ? 5 : 0) +
    Math.min(10, evidence.length / 3),
    0,
    100,
  );

  const opportunityQualityScore = clamp(
    20 +
    (explicitAirdropConfirmed ? 24 : 0) +
    (activeFarming ? 22 : 0) +
    (activeCampaignSignals * 6) +
    (hasTasks ? 12 : 0) +
    (taskCount >= 3 ? 6 : 0) +
    (safeString(airdrop.estimated_reward) ? 5 : 0) +
    (safeString(airdrop.expiry_date) ? 5 : 0) -
    (noOfficialToken && !explicitAirdropConfirmed ? 12 : 0) -
    (negativeOpportunitySignals * 10) -
    (actionSafetyCritical ? 30 : 0),
    0,
    100,
  );

  const evidenceDepthScore = clamp(
    10 +
    (hasWebsite ? 7 : 0) +
    (hasDocs ? 9 : 0) +
    (hasTeam ? 7 : 0) +
    (hasFunding ? 7 : 0) +
    (hasGitHub ? 6 : 0) +
    (activeGitHub ? 7 : 0) +
    (hasTvl ? 7 : 0) +
    (hasTokenMarket ? 7 : 0) +
    (hasAudit ? 7 : 0) +
    Math.min(18, trustedSourceCount * 3) +
    Math.min(8, officialSourceCount * 2) -
    Math.min(18, missingCount * 2),
    0,
    100,
  );

  const overallIntelligenceScore = clamp(
    reputationScore * 0.25 +
    securityScore * 0.25 +
    communityScore * 0.15 +
    opportunityQualityScore * 0.15 +
    evidenceDepthScore * 0.20,
    0,
    100,
  );

  const strengths = uniq([
    evidenceProfile.tier === "blue_chip" ? "Blue-chip maturity profile" : "",
    evidenceProfile.tier === "established_product" ? "Established product profile" : "",
    evidenceProfile.tier === "growth_network" ? "Growth-stage network profile" : "",
    evidenceProfile.tier === "emerging_network" ? "Emerging network profile" : "",
    hasFunding ? "Funding/investor evidence" : "",
    hasTeam ? "Team evidence" : "",
    hasAudit ? "Audit or security reference" : "",
    activeGitHub ? "Active development" : "",
    hasTvl ? `Live TVL detected (${fmt(llama.tvl)})` : "",
    hasTokenMarket ? "Verified market/on-chain signal" : "",
    explicitAirdropConfirmed ? "Official airdrop signal" : "",
    activeFarming ? "Active quest/points/farming signal" : "",
  ].filter(Boolean)).slice(0, 8);

  const risks = uniq([
    officialLinkMismatch ? "Official-link/domain mismatch" : "",
    actionSafetyCritical ? "Critical user-action risk" : "",
    actionSafetyMedium ? "Wallet/transaction action requires caution" : "",
    projectMisconductEvidence ? "Possible project-level misconduct evidence" : "",
    threatIntelCount > 0 ? `${threatIntelCount} threat-intelligence signal(s)` : "",
    brandImpersonationCount > 0 ? `${brandImpersonationCount} impersonation/fake-claim signal(s)` : "",
    noOfficialToken ? "No official token contract verified" : "",
    negativeOpportunitySignals > 0 ? `${negativeOpportunitySignals} negative opportunity signal(s)` : "",
    missingCount >= 4 ? "Several important data gaps remain" : "",
  ].filter(Boolean)).slice(0, 8);

  const adminFocus = uniq([
    officialLinkMismatch ? "Verify the official website/domain manually." : "",
    actionSafetyCritical ? "Block publication until seed phrase/payment/private-key risk is cleared." : "",
    !hasDocs ? "Add official documentation URL." : "",
    !hasTeam && evidenceProfile.tier !== "blue_chip" ? "Add team/founder source." : "",
    !hasFunding && !hasTvl && !hasTokenMarket && evidenceProfile.tier !== "blue_chip" ? "Add funding, TVL, market or adoption proof." : "",
    !hasTasks && (explicitAirdropConfirmed || activeFarming) ? "Add verified tasks so the opportunity is actionable." : "",
    brandImpersonationCount > 0 ? "Add user warning about fake claims and impersonation." : "",
    negativeOpportunitySignals > 0 ? "Confirm campaign/claim status from official channels." : "",
  ].filter(Boolean)).slice(0, 6);

  const userSummary =
    overallIntelligenceScore >= 85
      ? "Strong intelligence profile with broad evidence coverage."
      : overallIntelligenceScore >= 70
      ? "Good intelligence profile, but users should still verify key details."
      : overallIntelligenceScore >= 55
      ? "Partial intelligence profile with meaningful gaps or risks."
      : "Limited intelligence profile; requires manual review before users act.";

  return {
    reputationScore,
    securityScore,
    communityScore,
    opportunityQualityScore,
    evidenceDepthScore,
    overallIntelligenceScore,
    strengths,
    risks,
    adminFocus,
    userSummary,
  };
}

function buildProjectTimelineProfile(args: {
  airdrop: Record<string, unknown>;
  web: WebEnrichmentData;
  cg: CoinGeckoData;
  llama: DefiLlamaData;
  github: GitHubData;
  goplus: GoPlusData;
  evidence: SourceEvidence[];
  pages: WebPageData[];
  evidenceProfile: EvidenceProfile;
  hasFunding: boolean;
  hasTeam: boolean;
  hasAudit: boolean;
  hasTvl: boolean;
  hasTokenMarket: boolean;
  activeGitHub: boolean;
  explicitAirdropConfirmed: boolean;
  activeFarming: boolean;
  noOfficialToken: boolean;
  projectMisconductEvidence: boolean;
  activeExploitEvidence: SourceEvidence[];
  brandImpersonationEvidence: SourceEvidence[];
}): ProjectTimelineProfile {
  const {
    airdrop, web, cg, llama, github, goplus, evidence, pages, evidenceProfile,
    hasFunding, hasTeam, hasAudit, hasTvl, hasTokenMarket, activeGitHub,
    explicitAirdropConfirmed, activeFarming, noOfficialToken, projectMisconductEvidence,
    activeExploitEvidence, brandImpersonationEvidence,
  } = args;

  const events: ProjectTimelineEvent[] = [];
  const addEvent = (event: ProjectTimelineEvent) => {
    const key = `${event.type}:${event.label.toLowerCase()}:${event.source}`;
    if (!events.some(e => `${e.type}:${e.label.toLowerCase()}:${e.source}` === key)) events.push(event);
  };
  const firstEvidence = (terms: string[]): SourceEvidence | undefined =>
    evidence.find(e => includesAny(evidenceCombinedText(e), terms).length > 0);
  const pageEvidence = (terms: string[]): WebPageData | undefined =>
    pages.find(p => includesAny(`${p.title ?? ""} ${p.text ?? ""}`, terms).length > 0);

  if (hasTeam) {
    const src = firstEvidence(["founder", "founded", "team", "co-founder"]);
    addEvent({
      type: "founding",
      label: "Team/founder footprint detected",
      confidence: src?.tier === "official" || src?.tier === "primary" ? "high" : "medium",
      source: src?.source || hostname(safeString(airdrop.website_url)) || "project data",
      evidence: src?.title || "Team information detected in project fields or official website.",
    });
  }

  if (hasFunding) {
    const src = firstEvidence(["raised", "funding", "backed by", "investors", "series a", "seed round"]);
    addEvent({
      type: "funding",
      label: web.known_investors?.length ? `Investor signal: ${web.known_investors.slice(0, 3).join(", ")}` : "Funding/investor signal detected",
      confidence: src?.tier === "trusted" || src?.tier === "official" ? "high" : "medium",
      source: src?.source || "project/search data",
      evidence: src?.title || "Funding or investor language detected across project fields, website or trusted sources.",
    });
  }

  if (web.testnet_mentioned || activeFarming) {
    const src = firstEvidence(["testnet", "quest", "points", "farming"]);
    addEvent({ type: "testnet", label: activeFarming ? "Active farming/quest signal" : "Testnet signal detected", confidence: src ? "medium" : "low", source: src?.source || "website/project data", evidence: src?.title || "Testnet, quest, points or farming language detected." });
  }

  if (web.mainnet_mentioned || hasTvl) {
    const src = firstEvidence(["mainnet", "tvl", "launched"]);
    addEvent({ type: "mainnet", label: hasTvl ? `Live network/TVL detected (${fmt(llama.tvl)})` : "Mainnet signal detected", confidence: hasTvl ? "high" : "medium", source: src?.source || (llama.found ? "DefiLlama" : "website/project data"), evidence: src?.title || "Mainnet or TVL signal detected." });
  }

  if (hasTokenMarket || cg.verifiedMatch || goplus.found) {
    addEvent({ type: "token", label: hasTokenMarket ? "Verified token/market signal" : "Contract/token scan signal", confidence: cg.verifiedMatch || goplus.found ? "high" : "medium", source: cg.verifiedMatch ? "CoinGecko" : goplus.found ? "GoPlus" : "market data", evidence: cg.verifiedMatch ? `CoinGecko match: ${cg.coinId ?? "verified"}` : "Token or contract signal detected." });
  } else if (noOfficialToken) {
    addEvent({ type: "token", label: "No official token verified", confidence: "medium", source: "AGIE", evidence: "No verified token contract or high-confidence market match was found." });
  }

  if (explicitAirdropConfirmed || activeFarming) {
    const src = firstEvidence(["airdrop", "claim", "snapshot", "eligibility", "points", "quest"]);
    addEvent({ type: "airdrop", label: explicitAirdropConfirmed ? "Official airdrop/claim signal" : "Possible airdrop farming signal", confidence: explicitAirdropConfirmed ? "high" : "medium", source: src?.source || "project/search data", evidence: src?.title || "Airdrop, eligibility, claim, points or quest language detected." });
  }

  if (hasAudit) {
    const src = firstEvidence(["audit", "audited", "security review", "certik", "hacken", "trail of bits", "openzeppelin"]);
    addEvent({ type: "audit", label: "Audit/security reference detected", confidence: src?.tier === "trusted" || src?.tier === "primary" ? "high" : "medium", source: src?.source || "project/search data", evidence: src?.title || "Audit or security review language detected." });
  }

  if (activeExploitEvidence.length || projectMisconductEvidence || brandImpersonationEvidence.length) {
    const src = activeExploitEvidence[0] || brandImpersonationEvidence[0];
    addEvent({
      type: "exploit",
      label: projectMisconductEvidence ? "Project-level misconduct/exploit signal" : activeExploitEvidence.length ? "Active exploit/threat signal" : "Brand impersonation/phishing signal",
      confidence: projectMisconductEvidence || activeExploitEvidence.length ? "high" : "medium",
      source: src?.source || "threat intelligence",
      evidence: src?.title || "Threat, exploit, phishing or impersonation evidence detected.",
    });
  }

  const partnershipEvidence = firstEvidence(["partnership", "partnered", "integration", "integrated with", "ecosystem"]);
  const partnershipPage = pageEvidence(["partnership", "partnered", "integration", "integrated with"]);
  if (partnershipEvidence || partnershipPage || (web.partner_mentions ?? 0) > 0) {
    addEvent({ type: "partnership", label: "Partnership/integration signal detected", confidence: partnershipEvidence?.tier === "trusted" || partnershipEvidence?.tier === "official" ? "high" : "medium", source: partnershipEvidence?.source || hostname(partnershipPage?.url ?? "") || "website/search data", evidence: partnershipEvidence?.title || partnershipPage?.title || "Partnership or integration language detected." });
  }

  if (activeGitHub) {
    addEvent({ type: "development", label: `${github.recentCommits30d ?? 0} GitHub commits in 30d`, confidence: "high", source: "GitHub", evidence: github.repoUrl || "Repository activity detected." });
  }

  if (hasTvl || (cg.twitterFollowers ?? 0) > 50_000 || (github.stars ?? 0) > 250) {
    addEvent({ type: "adoption", label: hasTvl ? `Adoption/TVL signal (${fmt(llama.tvl)})` : "Community/developer adoption signal", confidence: hasTvl || cg.verifiedMatch ? "high" : "medium", source: hasTvl ? "DefiLlama" : cg.found ? "CoinGecko/GitHub" : "project data", evidence: hasTvl ? `TVL ${fmt(llama.tvl)}` : `Followers ${(cg.twitterFollowers ?? 0).toLocaleString()}, GitHub stars ${(github.stars ?? 0).toLocaleString()}` });
  }

  const confirmedEventCount = events.filter(e => e.confidence === "high").length;
  const watchEventCount = events.filter(e => e.type === "exploit" || (e.type === "token" && e.label.includes("No official"))).length;
  const positiveEvents = events.filter(e => !["exploit"].includes(e.type) && !e.label.includes("No official")).length;

  const timelineScore = clamp(
    35 +
    positiveEvents * 6 +
    confirmedEventCount * 5 +
    (evidenceProfile.tier === "blue_chip" ? 10 : evidenceProfile.tier === "established_product" ? 7 : evidenceProfile.tier === "growth_network" ? 5 : 0) -
    watchEventCount * 8,
    0,
    100,
  );

  const maturityMomentumScore = clamp(
    30 +
    (web.mainnet_mentioned || hasTvl ? 16 : 0) +
    (web.testnet_mentioned || activeFarming ? 10 : 0) +
    (hasFunding ? 10 : 0) +
    (activeGitHub ? 12 : 0) +
    (hasAudit ? 8 : 0) +
    (hasTokenMarket ? 10 : 0) -
    (noOfficialToken ? 6 : 0) -
    (projectMisconductEvidence ? 25 : 0),
    0,
    100,
  );

  const adminInsight = watchEventCount > 0
    ? "Review timeline watch events before promotion; highlight fake-claim or token uncertainty clearly."
    : events.length >= 6
    ? "Timeline has enough evidence for a strong project-page narrative."
    : "Timeline is thin; add official milestones, funding, audit, launch or airdrop sources.";

  const userInsight = events.length >= 6
    ? "AGIE found multiple project milestones across funding, launch, development, adoption or security evidence."
    : events.length >= 3
    ? "AGIE found some useful milestones, but several details still need verification."
    : "AGIE found limited milestone evidence; users should treat the opportunity as early or under-reviewed.";

  const summary = `${events.length} timeline event(s), ${confirmedEventCount} high-confidence, ${watchEventCount} watch item(s), maturity momentum ${maturityMomentumScore}/100`;

  return {
    timelineScore,
    maturityMomentumScore,
    eventCount: events.length,
    confirmedEventCount,
    watchEventCount,
    events: events.slice(0, 10),
    adminInsight,
    userInsight,
    summary,
  };
}


const PROJECT_TIER_OVERRIDES: Record<string, ProjectMaturityTier> = {
  // Long-standing brands/products with years of operating history.
  opensea: "blue_chip",
  metamask: "blue_chip",
  uniswap: "blue_chip",
  coinbase: "blue_chip",
  base: "blue_chip",
  arbitrum: "blue_chip",
  optimism: "blue_chip",
  ethereum: "blue_chip",
  polygon: "blue_chip",
  solana: "blue_chip",
  chainlink: "blue_chip",
  aave: "blue_chip",
  lido: "blue_chip",
  phantom: "blue_chip",

  // Strong live products/protocols, but not always in the same maturity band as blue chips.
  farcaster: "established_product",
  backpack: "established_product",
  berachain: "growth_network",

  // High-quality but still earlier-stage/testnet/emerging ecosystems.
  megaeth: "emerging_network",
  nillion: "emerging_network",
  monad: "emerging_network",
  abstract: "emerging_network",
  initia: "emerging_network",
  "humanity protocol": "emerging_network",
  humanity: "emerging_network",
};

const PROJECT_MISCONDUCT_TERMS = [
  "rug pull", "rugpull", "exit scam", "confirmed scam", "confirmed honeypot",
  "malicious contract", "sanctioned", "founder arrested", "founder charged",
  "team stole", "insider exploit", "governance attack", "treasury drained",
  "official bridge exploited", "official protocol exploited", "official contract exploited",
];

const HIGH_RISK_ACTION_PATTERNS = [
  /seed\s+phrase/i,
  /private\s+key/i,
  /recovery\s+phrase/i,
  /pay\s+(a\s+)?fee/i,
  /send\s+(eth|sol|bnb|crypto|funds)/i,
  /approve\s+(unlimited|all)/i,
  /blind\s+sign/i,
  /sign\s+message/i,
  /connect\s+wallet\s+to\s+claim/i,
  /claim\s+now/i,
];

const MEDIUM_RISK_ACTION_PATTERNS = [
  /connect\s+wallet/i,
  /bridge/i,
  /swap/i,
  /stake/i,
  /mint/i,
  /provide\s+liquidity/i,
  /deposit/i,
  /testnet\s+transaction/i,
];

// ─── Utility helpers ──────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function clampOrFallback(value: unknown, fallback: number, min = 0, max = 100): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return clamp(fallback, min, max);
  return clamp(n, min, max);
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function uniq<T>(items: T[]): T[] {
  return [...new Set(items.filter(Boolean))];
}

function hostname(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; }
}

function toIsoDate(value: string | undefined): string {
  if (!value) return "Unknown";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown";
  return parsed.toISOString().slice(0, 10);
}

function field<T>(value: T, confidence: ConfidenceLevel, source_url: string | null): EnrichmentField<T> {
  return { value, confidence, source_url };
}

function parseCanonicalUrl(rawHtml: string, baseUrl: string): string | undefined {
  const match = rawHtml.match(/<link[^>]+rel=["'][^"']*canonical[^"']*["'][^>]*href=["']([^"']+)["']/i)
    ?? rawHtml.match(/<link[^>]+href=["']([^"']+)["'][^>]*rel=["'][^"']*canonical[^"']*["']/i);
  if (!match?.[1]) return undefined;
  try {
    return new URL(match[1], baseUrl).toString();
  } catch {
    return undefined;
  }
}

function buildEnrichmentCacheKey(airdrop: Record<string, unknown>): string {
  const name = safeString(airdrop.name || airdrop.project_name).toLowerCase();
  const website = normaliseUrl(safeString(airdrop.website_url)).toLowerCase();
  const github = safeString(airdrop.github_url).toLowerCase();
  const contract = safeString(airdrop.contract_address).toLowerCase();
  const chains = Array.isArray(airdrop.blockchain) ? (airdrop.blockchain as string[]).join("|").toLowerCase() : "";
  return [name, website, github, contract, chains].join("::");
}

function parseEnrichmentProfile(raw: unknown): EnrichmentProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const maybe = raw as Partial<EnrichmentProfile>;
  if (!maybe.generated_at || !maybe.cache_key || !maybe.fields || !maybe.snapshots) return null;
  return maybe as EnrichmentProfile;
}

function isEnrichmentFresh(profile: EnrichmentProfile): boolean {
  const generatedAt = new Date(profile.generated_at).getTime();
  if (Number.isNaN(generatedAt)) return false;
  return (Date.now() - generatedAt) / 3_600_000 < ENRICHMENT_CACHE_TTL_HOURS;
}

function fmt(n: number | undefined, prefix = "$", digits = 2): string {
  if (n == null || Number.isNaN(n)) return "";
  if (n >= 1_000_000_000) return `${prefix}${(n / 1_000_000_000).toFixed(digits)}B`;
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(digits)}M`;
  if (n >= 1_000) return `${prefix}${(n / 1_000).toFixed(1)}K`;
  return `${prefix}${n}`;
}

function includesAny(text: string, terms: string[]): string[] {
  const lower = text.toLowerCase();
  return terms.filter(t => lower.includes(t.toLowerCase()));
}

function includesRegex(text: string, patterns: RegExp[]): boolean {
  return patterns.some(p => p.test(text));
}

function urlHostMatchesKnownProject(url: string, knownDomains: string[]): boolean {
  const h = hostname(url);
  if (!h) return false;
  return knownDomains.some(d => h === d || h.endsWith(`.${d}`));
}

function suspiciousLinkReason(url: string): string | null {
  const h = hostname(url);
  if (!h) return null;
  if (h.includes("airdrop") || h.includes("claim") || h.includes("free-token") || h.includes("giveaway")) {
    return "link uses claim/airdrop-style domain language";
  }
  if (h.includes("xn--")) return "possible punycode/lookalike domain";
  if (h.split(".").length > 4) return "unusually deep subdomain structure";
  return null;
}

function compactScore(n: number, max: number): number {
  return clamp(n, 0, max);
}

function asHumanLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function confidenceBand(score: number): "Very High" | "High" | "Medium" | "Low" {
  if (score >= 88) return "Very High";
  if (score >= 74) return "High";
  if (score >= 50) return "Medium";
  return "Low";
}

function isKnownEstablishedEntity(project: Record<string, unknown>, websiteUrl: string, evidence: SourceEvidence[]): boolean {
  const name = safeString(project.name || project.project_name).toLowerCase();
  const host = hostname(websiteUrl);
  const nameMatch = KNOWN_ESTABLISHED_PROJECT_NAMES.some(n => name === n || name.includes(n) || n.includes(name));
  const domainMatch = KNOWN_ESTABLISHED_PROJECT_DOMAINS.some(d => host === d || host.endsWith(`.${d}`));
  const officialSourceMatch = evidence.some(e => {
    const h = hostname(e.url);
    return KNOWN_ESTABLISHED_PROJECT_DOMAINS.some(d => h === d || h.endsWith(`.${d}`));
  });
  return nameMatch || domainMatch || officialSourceMatch;
}

function isBlueChipEntity(project: Record<string, unknown>, websiteUrl: string, evidence: SourceEvidence[]): boolean {
  const name = safeString(project.name || project.project_name).toLowerCase();
  const host = hostname(websiteUrl);
  const nameMatch = BLUE_CHIP_PROJECT_NAMES.some(n => name === n || name.includes(n) || n.includes(name));
  const domainMatch = BLUE_CHIP_PROJECT_DOMAINS.some(d => host === d || host.endsWith(`.${d}`));
  const officialSourceMatch = evidence.some(e => {
    const h = hostname(e.url);
    return BLUE_CHIP_PROJECT_DOMAINS.some(d => h === d || h.endsWith(`.${d}`));
  });
  return nameMatch || domainMatch || officialSourceMatch;
}

function isEmergingEntity(project: Record<string, unknown>, websiteUrl: string, evidence: SourceEvidence[]): boolean {
  const name = safeString(project.name || project.project_name).toLowerCase();
  const host = hostname(websiteUrl);
  const nameMatch = EMERGING_PROJECT_NAMES.some(n => name === n || name.includes(n) || n.includes(name));
  const domainMatch = EMERGING_PROJECT_DOMAINS.some(d => host === d || host.endsWith(`.${d}`));
  const officialSourceMatch = evidence.some(e => {
    const h = hostname(e.url);
    return EMERGING_PROJECT_DOMAINS.some(d => h === d || h.endsWith(`.${d}`));
  });
  return nameMatch || domainMatch || officialSourceMatch;
}


function projectNameKey(project: Record<string, unknown>): string {
  return safeString(project.name || project.project_name).toLowerCase().replace(/\s+/g, " ").trim();
}

function overriddenProjectTier(project: Record<string, unknown>, websiteUrl: string): ProjectMaturityTier | null {
  const name = projectNameKey(project);
  const host = hostname(websiteUrl);
  for (const [key, tier] of Object.entries(PROJECT_TIER_OVERRIDES)) {
    if (name === key || name.includes(key) || key.includes(name)) return tier;
  }
  if (host === "opensea.io" || host.endsWith(".opensea.io")) return "blue_chip";
  if (host === "farcaster.xyz" || host.endsWith(".farcaster.xyz")) return "established_product";
  if (host === "backpack.app" || host.endsWith(".backpack.app")) return "established_product";
  if (host === "berachain.com" || host.endsWith(".berachain.com")) return "growth_network";
  if (["megaeth.com", "nillion.com", "monad.xyz", "abstract.xyz", "initia.xyz"].some(d => host === d || host.endsWith(`.${d}`))) return "emerging_network";
  return null;
}

function buildEvidenceProfile(args: {
  airdrop: Record<string, unknown>;
  websiteUrl: string;
  blueChipEntity: boolean;
  knownEstablishedEntity: boolean;
  emergingEntity: boolean;
  hasWebsite: boolean;
  hasDocs: boolean;
  hasTeam: boolean;
  hasFunding: boolean;
  hasGitHub: boolean;
  activeGitHub: boolean;
  hasAudit: boolean;
  hasTvl: boolean;
  hasTokenMarket: boolean;
  trustedSourceCount: number;
  github: GitHubData;
  cg: CoinGeckoData;
  llama: DefiLlamaData;
}): EvidenceProfile {
  const {
    airdrop, websiteUrl, blueChipEntity, knownEstablishedEntity, emergingEntity,
    hasWebsite, hasDocs, hasTeam, hasFunding, hasGitHub, activeGitHub, hasAudit,
    hasTvl, hasTokenMarket, trustedSourceCount, github, cg, llama,
  } = args;

  const override = overriddenProjectTier(airdrop, websiteUrl);

  const liveEvidenceScore =
    (hasTvl ? 3 : 0) +
    (hasTokenMarket ? 3 : 0) +
    (cg.found && cg.verifiedMatch === true ? 2 : 0) +
    ((llama.tvl ?? 0) > 10_000_000 ? 2 : 0) +
    ((llama.tvl ?? 0) > 100_000_000 ? 2 : 0);

  const independentEvidenceScore =
    Math.min(5, Math.floor(trustedSourceCount / 2)) +
    (hasDocs ? 1 : 0) +
    (hasFunding ? 1 : 0) +
    (hasTeam ? 1 : 0);

  const adoptionScore =
    ((cg.twitterFollowers ?? 0) > 50_000 ? 2 : 0) +
    ((cg.twitterFollowers ?? 0) > 250_000 ? 2 : 0) +
    ((github.stars ?? 0) > 250 ? 1 : 0) +
    ((github.stars ?? 0) > 1_500 ? 2 : 0) +
    ((llama.tvl ?? 0) > 25_000_000 ? 2 : 0) +
    ((llama.tvl ?? 0) > 250_000_000 ? 2 : 0);

  const securityEvidenceScore =
    (hasAudit ? 3 : 0) +
    (activeGitHub ? 2 : 0) +
    (hasGitHub ? 1 : 0) +
    (trustedSourceCount >= 6 ? 1 : 0);

  let tier: ProjectMaturityTier = override
    ?? (blueChipEntity ? "blue_chip"
      : (hasTvl || hasTokenMarket) && (knownEstablishedEntity || trustedSourceCount >= 5) ? "growth_network"
      : knownEstablishedEntity ? "established_product"
      : emergingEntity ? "emerging_network"
      : trustedSourceCount >= 3 || hasFunding || hasTeam ? "early_stage"
      : "unknown");

  // Evidence can promote/demote the automatic tier.
  if (tier === "emerging_network" && liveEvidenceScore >= 6 && securityEvidenceScore >= 3 && independentEvidenceScore >= 5) {
    tier = "growth_network";
  }
  if (tier === "growth_network" && liveEvidenceScore <= 1 && !hasAudit && !activeGitHub) {
    tier = "emerging_network";
  }
  if (tier === "established_product" && liveEvidenceScore <= 1 && adoptionScore <= 1 && !activeGitHub) {
    tier = "growth_network";
  }

  let minTrust = 45;
  let maxTrust = 78;

  if (tier === "blue_chip") {
    minTrust = 86;
    maxTrust = 94;
  } else if (tier === "established_product") {
    minTrust = 82;
    maxTrust = 92;
  } else if (tier === "growth_network") {
    minTrust = 78;
    maxTrust = liveEvidenceScore >= 5 || securityEvidenceScore >= 5 ? 90 : 88;
  } else if (tier === "emerging_network") {
    minTrust = 72;
    maxTrust = liveEvidenceScore >= 5 && securityEvidenceScore >= 3 ? 88 : liveEvidenceScore >= 3 ? 86 : 84;
  } else if (tier === "early_stage") {
    minTrust = 58;
    maxTrust = 80;
  }

  // Missing verification evidence tightens the ceiling. This is what prevents
  // every well-presented VC-backed project from landing at the same Trust score.
  if (!hasDocs) maxTrust = Math.min(maxTrust, 82);
  if (!hasTeam && tier !== "blue_chip") maxTrust = Math.min(maxTrust, 81);
  if (!hasFunding && !hasTvl && !(cg.found && cg.verifiedMatch === true) && tier !== "blue_chip") maxTrust = Math.min(maxTrust, 83);
  if (!hasAudit && !hasTvl && !hasTokenMarket && tier !== "blue_chip" && tier !== "established_product") maxTrust = Math.min(maxTrust, tier === "emerging_network" ? 84 : 82);
  if (trustedSourceCount < 3 && tier !== "blue_chip") maxTrust = Math.min(maxTrust, 80);

  const explanation = `${tier.replace(/_/g, " ")} · live evidence ${liveEvidenceScore}/12 · independent evidence ${independentEvidenceScore}/8 · adoption ${adoptionScore}/11 · security ${securityEvidenceScore}/7`;

  return {
    tier,
    liveEvidenceScore,
    independentEvidenceScore,
    adoptionScore,
    securityEvidenceScore,
    maxTrust,
    minTrust,
    explanation,
  };
}

function hasProjectMisconductEvidence(
  evidence: SourceEvidence[],
  pages: WebPageData[],
  knownEstablishedEntity = false,
): boolean {
  // Important: for established brands, generic search snippets like
  // "fake OpenSea claim" or "MetaMask phishing" should be treated as
  // impersonation risk, not proof of project misconduct. Only count strong
  // misconduct evidence from higher-quality sources and ignore fake/claim/phishing context.
  const nonImpersonation = (text: string) => {
    const lower = text.toLowerCase();
    const impersonationContext = includesAny(lower, [
      "fake", "phishing", "impersonat", "lookalike", "wallet drainer",
      "fake claim", "fake website", "fake x", "fake twitter", "fake discord",
      "fake telegram", "scammers", "scam campaign",
    ]).length > 0;
    return !impersonationContext && includesAny(lower, PROJECT_MISCONDUCT_TERMS).length > 0;
  };

  if (knownEstablishedEntity) {
    const highQualityEvidence = evidence.filter(e =>
      e.tier === "official" || e.tier === "primary" || e.tier === "trusted" || isThreatIntelligenceSource(e.url)
    );
    return highQualityEvidence.some(e => nonImpersonation(evidenceCombinedText(e)));
  }

  const evidenceText = evidence.map(e => evidenceCombinedText(e)).join(" ");
  const pageText = pages.map(p => `${p.title ?? ""} ${p.text ?? ""}`.toLowerCase()).join(" ");
  return nonImpersonation(`${evidenceText} ${pageText}`);
}

function isThreatIntelligenceSource(url: string): boolean {
  const host = hostname(url);
  if (!host) return false;
  return THREAT_INTELLIGENCE_DOMAINS.some(d => host === d || host.endsWith(`.${d}`));
}

function evidenceCombinedText(e: SourceEvidence): string {
  return `${e.title} ${e.snippet ?? ""} ${e.query ?? ""}`.toLowerCase();
}

function normaliseUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
}

function getTier(url: string, projectHost?: string): SourceTier {
  const host = hostname(url);
  if (!host) return "unknown";
  if (projectHost && host === projectHost) return "official";
  if (host.includes("github.com") || host.startsWith("docs.") || host.includes("gitbook.io")) return "primary";
  if (THREAT_INTELLIGENCE_DOMAINS.some(d => host === d || host.endsWith(`.${d}`))) return "trusted";
  if (TRUSTED_MEDIA_DOMAINS.some(d => host === d || host.endsWith(`.${d}`))) return "trusted";
  if (host.includes("reddit.com") || host.includes("twitter.com") || host.includes("x.com") || host.includes("medium.com") || host.includes("mirror.xyz")) return "community";
  if (host.includes("airdrop") || host.includes("claim") || host.includes("free-token")) return "risky";
  return "unknown";
}

function parseJsonObject(text: string): Record<string, unknown> {
  try { return JSON.parse(text); } catch { /* continue */ }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch { /* continue */ }
  }
  return {};
}

// ─── Search intelligence ──────────────────────────────────────────────────────

function buildSearchQueries(project: Record<string, unknown>): string[] {
  const name = safeString(project.name || project.project_name);
  const ticker = safeString(project.ticker || project.token_symbol);
  const contract = safeString(project.contract_address || project.token_address);
  const website = safeString(project.website_url);
  const base = name ? [`${name} official`, `${name} docs`, `${name} github`, `${name} funding investors`, `${name} audit security`, `${name} airdrop`] : [];
  const risk = name ? [
    `${name} scam`, `${name} phishing`, `${name} exploit`, `${name} hacked`, `${name} rug pull`, `${name} fake airdrop`, `${name} wallet drainer`,
  ] : [];
  const threatIntel = name ? [
    `${name} Scam Sniffer`, `${name} SlowMist`, `${name} PeckShield`, `${name} CertiK`,
    `${name} Chainabuse`, `${name} fake claim site`, `${name} fake X account`, `${name} Discord compromised`,
  ] : [];
  const token = ticker ? [`${ticker} token contract`, `${ticker} token scam`, `${ticker} wallet drainer`] : [];
  const addr = contract ? [`${contract}`, `${contract} scam`, `${contract} honeypot`, `${contract} exploit`] : [];
  const domain = website ? [`${hostname(website)} scam`, `${hostname(website)} phishing`, `${hostname(website)} wallet drainer`] : [];
  return uniq([...base, ...risk, ...threatIntel, ...token, ...addr, ...domain]).slice(0, 26);
}

async function braveSearch(query: string): Promise<SearchResult[]> {
  const key = Deno.env.get("BRAVE_SEARCH_API_KEY");
  if (!key) return [];
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${MAX_SEARCH_RESULTS_PER_QUERY}&safesearch=moderate&text_decorations=false`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "X-Subscription-Token": key },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) return [];
  const json = await res.json();
  const results = json.web?.results ?? [];
  return results.map((r: Record<string, unknown>) => ({
    title: safeString(r.title),
    url: safeString(r.url),
    snippet: safeString(r.description),
    query,
  })).filter((r: SearchResult) => r.url);
}

async function runSearchQueries(queries: string[]): Promise<SearchResult[]> {
  const selected = queries.slice(0, 20);
  const results: SearchResult[] = [];
  for (const q of selected) {
    try {
      results.push(...await braveSearch(q));
    } catch { /* search failure should not break analysis */ }
  }

  const seen = new Set<string>();
  return results.filter(r => {
    const key = r.url.split("#")[0].replace(/\/$/, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 45);
}

function searchResultsToEvidence(results: SearchResult[], projectHost?: string): SourceEvidence[] {
  return results.map(r => {
    const combined = `${r.title} ${r.snippet ?? ""}`;
    return {
      title: r.title,
      url: r.url,
      snippet: r.snippet,
      source: hostname(r.url),
      tier: getTier(r.url, projectHost),
      query: r.query,
      riskTerms: includesAny(combined, [...HIGH_RISK_TERMS, ...ACTIVE_EXPLOIT_TERMS, ...BRAND_IMPERSONATION_TERMS]),
      trustTerms: includesAny(combined, [...TRUST_TERMS, ...SECURITY_RESEARCHER_TERMS]),
    };
  });
}

// ─── Web page enrichment ──────────────────────────────────────────────────────

async function fetchTextPage(url: string): Promise<WebPageData> {
  const finalUrl = normaliseUrl(url);
  try {
    const res = await fetch(finalUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AirdropGuard Intelligence Engine/3.0)", Accept: "text/html,text/plain,*/*" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });
    if (!res.ok) {
      return {
        found: false,
        url: finalUrl,
        finalUrl: res.url || finalUrl,
        statusCode: res.status,
        note: `HTTP ${res.status}`,
      };
    }

    const reader = res.body?.getReader();
    if (!reader) return { found: false, url: finalUrl, note: "no body" };
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    while (totalBytes < MAX_PAGE_BYTES) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      totalBytes += value.byteLength;
    }
    reader.cancel().catch(() => {});
    const raw = new TextDecoder().decode(chunks.reduce((acc, c) => {
      const out = new Uint8Array(acc.length + c.length);
      out.set(acc);
      out.set(c, acc.length);
      return out;
    }, new Uint8Array()));

    const title = raw.match(/<title[^>]*>(.*?)<\/title>/is)?.[1]?.replace(/\s+/g, " ").trim();
    const links = [...raw.matchAll(/href=["']([^"']+)["']/gi)]
      .map(m => m[1])
      .filter(Boolean)
      .map(link => {
        try { return new URL(link, finalUrl).toString(); } catch { return ""; }
      })
      .filter(Boolean)
      .slice(0, 120);

    const text = raw
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&\w+;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 30_000);

    const resolvedUrl = res.url || finalUrl;
    return {
      found: true,
      url: finalUrl,
      finalUrl: resolvedUrl,
      statusCode: res.status,
      canonicalUrl: parseCanonicalUrl(raw, resolvedUrl),
      title,
      text,
      links,
    };
  } catch (e) {
    return { found: false, url: finalUrl, note: String(e) };
  }
}

async function fetchWebEnrichment(websiteUrl: string): Promise<WebEnrichmentData> {
  if (!websiteUrl) return { found: false };
  const page = await fetchTextPage(websiteUrl);
  if (!page.found || !page.text) {
    return {
      found: false,
      website_accessible: false,
      website_status_code: page.statusCode,
      website_redirect_url: page.finalUrl,
      note: page.note,
    };
  }

  const htmlText = page.text.toLowerCase();
  const links = page.links ?? [];
  const findLink = (checks: ((url: string) => boolean)[]) => links.find(url => checks.some(c => c(url.toLowerCase())));

  const github_link = findLink([u => u.includes("github.com/")]);
  const docs_url = findLink([
    u => hostname(u).startsWith("docs."),
    u => hostname(u).startsWith("developer."),
    u => u.includes("gitbook.io"),
    u => u.includes("readthedocs.io"),
    u => /\/docs?(\/|$)/.test(new URL(u).pathname),
  ]);
  const whitepaper_url = findLink([
    u => /whitepaper|litepaper|paper/i.test(u),
    u => /\/(whitepaper|litepaper)(\/|$)/i.test(new URL(u).pathname),
  ]);
  const blog_url = findLink([u => u.includes("medium.com"), u => u.includes("mirror.xyz"), u => /\/blog(\/|$)/.test(new URL(u).pathname)]);
  const medium_url = findLink([u => u.includes("medium.com"), u => u.includes("mirror.xyz")]);
  const linkedin_url = findLink([u => u.includes("linkedin.com/company") || u.includes("linkedin.com/in/")]);
  const audit_url = findLink([u => u.includes("audit"), u => u.includes("certik"), u => u.includes("hacken"), u => u.includes("trailofbits"), u => u.includes("openzeppelin")]);
  const x_url = findLink([u => u.includes("x.com/") || u.includes("twitter.com/")]);
  const discord_url = findLink([u => u.includes("discord.gg") || u.includes("discord.com/invite")]);
  const telegram_url = findLink([u => u.includes("t.me/")]);

  const fundingKeywords = [
    "seed round", "series a", "series b", "series c", "pre-seed", "raised $", "raised over",
    "funding round", "investment round", "backed by", "led by", "vc-backed", "vc backed",
    "strategic round", "grant from", "strategic investment", "million in funding", "million round",
  ];
  const funding_mentions = fundingKeywords.filter(k => htmlText.includes(k));
  const known_investors = KNOWN_VCS.filter(vc => htmlText.includes(vc));
  const ecosystems = ["ethereum", "base", "arbitrum", "optimism", "solana", "sui", "avalanche", "polygon", "bnb chain", "cosmos", "starknet", "linea", "scroll", "bitcoin"]
    .filter(e => htmlText.includes(e));
  const risk_terms = includesAny(htmlText, HIGH_RISK_TERMS);
  const anonymousTeam = /\banonymous team|pseudonymous|anon team|undoxxed\b/.test(htmlText);
  const publicTeam = /\b(founder|co-founder|ceo|cto|team|our team|leadership|linkedin)\b/.test(htmlText);

  let team_visibility: "Public Team" | "Anonymous" | "Partially Public" | undefined;
  if (anonymousTeam) team_visibility = "Anonymous";
  else if (publicTeam && /\b(linkedin|team page|about us|leadership)\b/.test(htmlText)) team_visibility = "Public Team";
  else if (publicTeam) team_visibility = "Partially Public";

  return {
    found: true,
    website_accessible: true,
    website_status_code: page.statusCode,
    website_canonical_url: page.canonicalUrl ?? page.finalUrl ?? page.url,
    website_redirect_url: page.finalUrl && page.finalUrl !== page.url ? page.finalUrl : undefined,
    github_link,
    docs_url,
    whitepaper_url,
    blog_url,
    medium_url,
    linkedin_url,
    audit_url,
    x_url,
    discord_url,
    telegram_url,
    has_team_info: /\b(team|co-founder|founder|ceo|cto|chief executive|chief technology|founded by)\b/.test(htmlText),
    team_visibility,
    token_mentioned: /\b(token|tge|token generation event|pre-tge|airdrop)\b/.test(htmlText),
    mainnet_mentioned: /\bmainnet\b/.test(htmlText),
    testnet_mentioned: /\btestnet\b/.test(htmlText),
    funding_mentions: funding_mentions.length ? funding_mentions : undefined,
    known_investors: known_investors.length ? known_investors.slice(0, 8) : undefined,
    ecosystems: ecosystems.length ? ecosystems.slice(0, 8) : undefined,
    partner_mentions: htmlText.match(/\bpartner(?:s|ship|ed)?\b/g)?.length || undefined,
    risk_terms: risk_terms.length ? risk_terms : undefined,
  };
}

async function fetchEvidencePages(results: SearchResult[], projectHost?: string): Promise<WebPageData[]> {
  const priority = results
    .filter(r => {
      const tier = getTier(r.url, projectHost);
      return tier === "official" || tier === "primary" || tier === "trusted" || includesAny(`${r.title} ${r.snippet}`, HIGH_RISK_TERMS).length > 0;
    })
    .slice(0, MAX_WEB_PAGES_TO_FETCH);

  const pages: WebPageData[] = [];
  for (const r of priority) {
    try {
      const page = await fetchTextPage(r.url);
      if (page.found) pages.push(page);
    } catch { /* ignore */ }
  }
  return pages;
}

// ─── API fetchers ─────────────────────────────────────────────────────────────

async function fetchDexScreener(name: string, ticker: string): Promise<DexData> {
  try {
    const query = ticker && ticker !== "TBD" && ticker !== "N/A" ? ticker : name;
    const res = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return { found: false, note: `HTTP ${res.status}` };
    const data = await res.json();
    const pairs = data.pairs;
    if (!pairs || pairs.length === 0) return { found: false };
    const best = pairs.reduce((a: Record<string, unknown>, b: Record<string, unknown>) => {
      const aLiq = (a.liquidity as { usd?: number } | undefined)?.usd ?? 0;
      const bLiq = (b.liquidity as { usd?: number } | undefined)?.usd ?? 0;
      return bLiq > aLiq ? b : a;
    });
    return {
      found: true,
      price: best.priceUsd as string,
      volume24h: (best.volume as { h24?: number } | undefined)?.h24?.toLocaleString(),
      liquidity: (best.liquidity as { usd?: number } | undefined)?.usd?.toLocaleString(),
      priceChange24h: (best.priceChange as { h24?: number } | undefined)?.h24?.toString(),
      dexName: best.dexId as string,
      fdv: (best.fdv as number | undefined)?.toLocaleString(),
      pairUrl: best.url as string,
    };
  } catch (e) {
    return { found: false, note: String(e) };
  }
}

async function fetchGoPlus(contractAddress: string, blockchains: string[]): Promise<GoPlusData> {
  if (!contractAddress) return { found: false };
  try {
    const isSolana = blockchains.some(b => b.toLowerCase() === "solana");
    const url = isSolana
      ? `https://api.gopluslabs.io/api/v1/solana/token_security?contract_addresses=${contractAddress}`
      : `https://api.gopluslabs.io/api/v1/token_security/${blockchains.map(b => CHAIN_ID_MAP[b]).find(id => id && id !== "solana") ?? "1"}?contract_addresses=${contractAddress}`;

    const goPlusKey = Deno.env.get("Go_Plus_Key");
    const headers: Record<string, string> = { Accept: "application/json" };
    if (goPlusKey) headers.Authorization = `Bearer ${goPlusKey}`;

    const res = await fetch(url, { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return { found: false, note: `GoPlus HTTP ${res.status}` };
    const json = await res.json();
    if (json.code !== 1 || !json.result) return { found: false, note: json.message };

    const key = Object.keys(json.result)[0];
    if (!key) return { found: false };
    const d = json.result[key];
    return {
      found: true,
      is_honeypot: d.is_honeypot,
      buy_tax: d.buy_tax ? (parseFloat(d.buy_tax) * 100).toFixed(1) + "%" : undefined,
      sell_tax: d.sell_tax ? (parseFloat(d.sell_tax) * 100).toFixed(1) + "%" : undefined,
      is_mintable: d.is_mintable,
      can_take_back_ownership: d.can_take_back_ownership,
      owner_change_balance: d.owner_change_balance,
      is_proxy: d.is_proxy,
      holder_count: d.holder_count,
      is_open_source: d.is_open_source,
      creator_percent: d.creator_percent ? (parseFloat(d.creator_percent) * 100).toFixed(1) + "%" : undefined,
      owner_percent: d.owner_percent ? (parseFloat(d.owner_percent) * 100).toFixed(1) + "%" : undefined,
    };
  } catch (e) {
    return { found: false, note: String(e) };
  }
}

async function fetchGitHub(githubUrl: string): Promise<GitHubData> {
  if (!githubUrl) return { found: false };
  try {
    const match = githubUrl.match(/github\.com\/([^/]+)\/([^/?#]+)/);
    if (!match) return { found: false };
    const [, owner, repo] = match;
    const cleanRepo = repo.replace(/\.git$/, "");

    const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
    const ghToken = Deno.env.get("GITHUB_TOKEN");
    if (ghToken) headers.Authorization = `Bearer ${ghToken}`;

    const [repoRes, commitRes, contributorsRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${owner}/${cleanRepo}`, { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }),
      fetch(`https://api.github.com/repos/${owner}/${cleanRepo}/commits?since=${new Date(Date.now() - 30 * 86400000).toISOString()}&per_page=100`, { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }),
      fetch(`https://api.github.com/repos/${owner}/${cleanRepo}/contributors?per_page=100&anon=true`, { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }),
    ]);
    if (!repoRes.ok) return { found: false, note: `GitHub ${repoRes.status}` };
    const repoData = await repoRes.json();
    const commits = commitRes.ok ? await commitRes.json() : [];
    const contributors = contributorsRes.ok ? await contributorsRes.json() : [];
    const daysSincePush = Math.floor((Date.now() - new Date(repoData.pushed_at).getTime()) / 86400000);
    const lastCommitDate = Array.isArray(commits) && commits[0]?.commit?.author?.date
      ? commits[0].commit.author.date
      : repoData.pushed_at;
    return {
      found: true,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      openIssues: repoData.open_issues_count,
      watchers: repoData.watchers_count,
      lastPushDaysAgo: daysSincePush,
      lastCommitDate,
      contributors: Array.isArray(contributors) ? contributors.length : undefined,
      visibility: repoData.private ? "private" : "public",
      recentCommits30d: Array.isArray(commits) ? commits.length : 0,
      language: repoData.language,
      archived: repoData.archived,
      disabled: repoData.disabled,
      createdAt: repoData.created_at,
      repoUrl: repoData.html_url,
    };
  } catch (e) {
    return { found: false, note: String(e) };
  }
}

function approximateProjectAge(github: GitHubData): string {
  if (!github.createdAt) return "Unknown";
  const created = new Date(github.createdAt).getTime();
  if (Number.isNaN(created)) return "Unknown";
  const ageDays = Math.max(1, Math.floor((Date.now() - created) / 86_400_000));
  if (ageDays >= 365) return `~${Math.floor(ageDays / 365)} year(s)`;
  if (ageDays >= 30) return `~${Math.floor(ageDays / 30)} month(s)`;
  return `~${ageDays} day(s)`;
}

function buildEnrichmentProfile(args: {
  airdrop: Record<string, unknown>;
  web: WebEnrichmentData;
  github: GitHubData;
  goplus: GoPlusData;
  cacheKey: string;
}): EnrichmentProfile {
  const { airdrop, web, github, goplus, cacheKey } = args;

  const websiteSource = safeString(airdrop.website_url) || web.website_canonical_url || null;
  const githubSource = github.repoUrl ?? web.github_link ?? null;

  const docsValue = (web.docs_url ?? safeString(airdrop.docs_url)) || "Unknown";
  const whitepaperValue = web.whitepaper_url ?? "Unknown";
  const githubUrlValue = (github.repoUrl ?? web.github_link ?? safeString(airdrop.github_url)) || "Not Detected";
  const investorsValue = web.known_investors?.length
    ? web.known_investors.join(", ")
    : safeString(airdrop.investors) || "Unknown";
  const teamVisibility = web.team_visibility
    ?? (safeString(airdrop.team_info) ? "Partially Public" : "Anonymous");

  const blockchain = Array.isArray(airdrop.blockchain)
    ? (airdrop.blockchain as string[]).join(", ")
    : safeString(airdrop.blockchain);

  const launchStatus = safeString(airdrop.status) || "Unknown";
  const networkStage = web.mainnet_mentioned ? "Mainnet" : web.testnet_mentioned ? "Testnet" : "Unknown";

  const tokenName = safeString(airdrop.name) || "Unknown";
  const tokenSymbol = safeString(airdrop.ticker) || "Unknown";
  const tokenContract = safeString(airdrop.contract_address) || "Unknown";
  const contractVerified = tokenContract && tokenContract !== "Unknown"
    ? (goplus.found && goplus.is_open_source === "1" ? "Yes" : goplus.found ? "No" : "Unknown")
    : "Unknown";

  const category = Array.isArray(airdrop.category)
    ? (airdrop.category as string[]).join(", ") || "Unknown"
    : safeString(airdrop.category) || "Unknown";

  return {
    version: 1,
    generated_at: new Date().toISOString(),
    cache_key: cacheKey,
    fields: {
      official_website: {
        accessibility: field(web.website_accessible === false ? "Inaccessible" : "Accessible", web.website_accessible === false ? "Medium" : "High", websiteSource),
        canonical_url: field((web.website_canonical_url ?? safeString(airdrop.website_url)) || "Unknown", web.website_canonical_url ? "High" : safeString(airdrop.website_url) ? "Medium" : "Low", web.website_canonical_url ?? websiteSource),
        redirect_url: field(web.website_redirect_url ?? "None", web.website_redirect_url ? "High" : "Low", web.website_redirect_url ?? websiteSource),
      },
      documentation: {
        docs: field(docsValue, docsValue !== "Unknown" ? (web.docs_url ? "High" : "Medium") : "Low", web.docs_url ?? websiteSource),
        whitepaper: field(whitepaperValue, whitepaperValue !== "Unknown" ? "Medium" : "Low", web.whitepaper_url ?? websiteSource),
      },
      github: {
        repository_url: field(githubUrlValue, githubUrlValue !== "Not Detected" ? "High" : "Low", githubSource),
        last_commit_date: field(github.lastCommitDate ? toIsoDate(github.lastCommitDate) : "Not Detected", github.lastCommitDate ? "High" : "Low", githubSource),
        commit_activity: field(typeof github.recentCommits30d === "number" ? `${github.recentCommits30d} commits (30d)` : "Not Detected", typeof github.recentCommits30d === "number" ? "High" : "Low", githubSource),
        contributors: field(typeof github.contributors === "number" ? String(github.contributors) : "Not Detected", typeof github.contributors === "number" ? "High" : "Low", githubSource),
        visibility: field(github.visibility ?? (githubUrlValue === "Not Detected" ? "Not Detected" : "Unknown"), github.visibility ? "High" : githubUrlValue === "Not Detected" ? "Low" : "Medium", githubSource),
      },
      team: {
        visibility: field(teamVisibility, teamVisibility === "Public Team" ? "High" : teamVisibility === "Partially Public" ? "Medium" : "Low", websiteSource),
      },
      funding_investors: {
        investors: field(investorsValue, investorsValue !== "Unknown" ? (web.known_investors?.length ? "High" : "Medium") : "Low", websiteSource),
      },
      socials: {
        x: field((web.x_url ?? safeString(airdrop.twitter_url)) || "Unknown", (web.x_url || safeString(airdrop.twitter_url)) ? "High" : "Low", web.x_url ?? websiteSource),
        discord: field((web.discord_url ?? safeString(airdrop.discord_url)) || "Unknown", (web.discord_url || safeString(airdrop.discord_url)) ? "High" : "Low", web.discord_url ?? websiteSource),
        telegram: field((web.telegram_url ?? safeString(airdrop.telegram_url)) || "Unknown", (web.telegram_url || safeString(airdrop.telegram_url)) ? "High" : "Low", web.telegram_url ?? websiteSource),
        medium: field(web.medium_url ?? "Unknown", web.medium_url ? "High" : "Low", web.medium_url ?? websiteSource),
        linkedin: field(web.linkedin_url ?? "Unknown", web.linkedin_url ? "High" : "Low", web.linkedin_url ?? websiteSource),
      },
      token: {
        token_name: field(tokenName, tokenName !== "Unknown" ? "Medium" : "Low", safeString(airdrop.website_url) || null),
        symbol: field(tokenSymbol, tokenSymbol !== "Unknown" ? "Medium" : "Low", safeString(airdrop.website_url) || null),
        contract_address: field(tokenContract, tokenContract !== "Unknown" ? "High" : "Low", safeString(airdrop.website_url) || null),
        blockchain: field(blockchain || "Unknown", blockchain ? "High" : "Low", safeString(airdrop.website_url) || null),
        contract_verified: field(contractVerified, contractVerified === "Unknown" ? "Low" : goplus.found ? "High" : "Medium", safeString(airdrop.website_url) || null),
      },
      project_metadata: {
        category: field(category, category !== "Unknown" ? "High" : "Low", safeString(airdrop.website_url) || null),
        main_blockchain: field(blockchain || "Unknown", blockchain ? "High" : "Low", safeString(airdrop.website_url) || null),
        launch_status: field(launchStatus, launchStatus !== "Unknown" ? "Medium" : "Low", safeString(airdrop.website_url) || null),
        network_stage: field(networkStage, networkStage !== "Unknown" ? "High" : "Low", websiteSource),
        approximate_project_age: field(approximateProjectAge(github), github.createdAt ? "Medium" : "Low", githubSource),
      },
    },
    failures: [],
    snapshots: {
      web,
      github,
    },
  };
}

function looksLikeUnsetToken(value: string): boolean {
  const v = safeString(value).toLowerCase();
  return !v || v === "tbd" || v === "tba" || v === "n/a" || v === "none" || v === "pre-token" || v === "unknown" || v === "empty";
}

function sameHostOrSubdomain(a: string, b: string): boolean {
  const ha = hostname(a);
  const hb = hostname(b);
  if (!ha || !hb) return false;
  return ha === hb || ha.endsWith(`.${hb}`) || hb.endsWith(`.${ha}`);
}

function tokenAddressAppearsInLinks(coin: Record<string, unknown>, contractAddress: string): boolean {
  if (!contractAddress) return false;
  const needle = contractAddress.toLowerCase();
  const links = (coin.links ?? {}) as Record<string, unknown>;
  const all = JSON.stringify(links).toLowerCase();
  const platforms = (coin.platforms ?? {}) as Record<string, unknown>;
  return all.includes(needle) || Object.values(platforms).some(v => safeString(v).toLowerCase() === needle);
}

async function fetchCoinGecko(
  name: string,
  ticker: string,
  websiteUrl = "",
  contractAddress = "",
): Promise<CoinGeckoData> {
  try {
    // Safety rule: never show market data from name-only matches unless the match is strongly verified.
    // This prevents false market data on projects like OpenSea where random tokens use similar names/tickers.
    const hasContract = !!safeString(contractAddress);
    const cleanTicker = safeString(ticker).replace(/^\$/, "");
    const usableTicker = !looksLikeUnsetToken(cleanTicker);
    const query = usableTicker ? cleanTicker : name;
    if (!safeString(query)) return { found: false };

    const searchRes = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!searchRes.ok) return { found: false, note: `CoinGecko search ${searchRes.status}` };

    const searchData = await searchRes.json();
    const coins: Array<{ id: string; symbol: string; name: string }> = searchData.coins || [];
    if (coins.length === 0) return { found: false };

    const tickerLower = cleanTicker.toLowerCase();
    const nameLower = safeString(name).toLowerCase();
    const candidates = coins.filter(c => {
      const symbol = safeString(c.symbol).toLowerCase();
      const cname = safeString(c.name).toLowerCase();
      if (usableTicker && symbol === tickerLower) return true;
      if (cname === nameLower) return true;
      return false;
    });

    const match = candidates[0];
    if (!match) {
      return { found: false, note: "CoinGecko search returned no strong exact match" };
    }

    const coinRes = await fetch(`https://api.coingecko.com/api/v3/coins/${match.id}?localization=false&tickers=false&market_data=true&community_data=true&developer_data=false`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!coinRes.ok) return { found: false, note: `CoinGecko coin ${coinRes.status}` };

    const coin = await coinRes.json();
    const md = coin.market_data || {};
    const links = coin.links || {};
    const homepage = links.homepage?.find((x: string) => x);
    const blockchainSite = links.blockchain_site?.find((x: string) => x);
    const homepageMatches = websiteUrl && homepage ? sameHostOrSubdomain(homepage, websiteUrl) : false;
    const contractMatches = hasContract ? tokenAddressAppearsInLinks(coin, contractAddress) : false;
    const exactName = safeString(match.name).toLowerCase() === nameLower;
    const exactTicker = usableTicker && safeString(match.symbol).toLowerCase() === tickerLower;

    let verifiedMatch = false;
    let matchConfidence: "high" | "medium" | "low" = "low";
    let matchedBy = "weak_search_match";

    if (contractMatches) {
      verifiedMatch = true;
      matchConfidence = "high";
      matchedBy = "contract_address";
    } else if (homepageMatches && (exactName || exactTicker)) {
      verifiedMatch = true;
      matchConfidence = "high";
      matchedBy = "official_homepage_and_exact_name_or_ticker";
    } else if (homepageMatches) {
      verifiedMatch = true;
      matchConfidence = "medium";
      matchedBy = "official_homepage";
    } else if (hasContract && (exactName || exactTicker)) {
      // Contract exists but CoinGecko links did not expose it. Useful but not enough to call it verified.
      verifiedMatch = false;
      matchConfidence = "medium";
      matchedBy = "contract_present_but_not_matched";
    } else {
      // No contract + no homepage match = do not display market data. Avoid false positives.
      return {
        found: false,
        coinId: match.id,
        verifiedMatch: false,
        matchConfidence: "low",
        matchedBy,
        shouldDisplayMarket: false,
        note: "CoinGecko result rejected because no contract or official homepage match confirmed it belongs to this project",
      };
    }

    return {
      found: true,
      coinId: match.id,
      price: md.current_price?.usd,
      marketCap: md.market_cap?.usd,
      fullyDilutedValuation: md.fully_diluted_valuation?.usd,
      volume24h: md.total_volume?.usd,
      priceChange24h: md.price_change_percentage_24h,
      priceChange7d: md.price_change_percentage_7d,
      ath: md.ath?.usd,
      athChangePercent: md.ath_change_percentage?.usd,
      circulatingSupply: md.circulating_supply,
      totalSupply: md.total_supply,
      twitterFollowers: coin.community_data?.twitter_followers,
      homepage,
      blockchainSite,
      officialForumUrl: links.official_forum_url?.find((x: string) => x),
      chatUrl: links.chat_url?.find((x: string) => x),
      announcementUrl: links.announcement_url?.find((x: string) => x),
      verifiedMatch,
      matchConfidence,
      matchedBy,
      shouldDisplayMarket: verifiedMatch,
    };
  } catch (e) {
    return { found: false, note: String(e) };
  }
}

async function fetchDefiLlama(name: string): Promise<DefiLlamaData> {
  try {
    const res = await fetch("https://api.llama.fi/protocols", { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return { found: false, note: `DefiLlama ${res.status}` };
    const protocols: Array<{ name: string; symbol: string; slug: string; tvl: number; change_1d?: number; change_7d?: number; mcap?: number; category?: string; chains?: string[]; url?: string }> = await res.json();
    const nameLower = name.toLowerCase();
    const protocol = protocols.find(p => p.name.toLowerCase() === nameLower || p.slug.toLowerCase() === nameLower || p.name.toLowerCase().includes(nameLower) || nameLower.includes(p.name.toLowerCase()));
    if (!protocol) return { found: false };
    const mcapTvlRatio = protocol.mcap && protocol.tvl ? parseFloat((protocol.mcap / protocol.tvl).toFixed(2)) : undefined;
    return {
      found: true,
      tvl: protocol.tvl,
      tvlChange24h: protocol.change_1d,
      tvlChange7d: protocol.change_7d,
      mcapTvlRatio,
      category: protocol.category,
      chains: (protocol.chains || []).slice(0, 8),
      url: protocol.url,
    };
  } catch (e) {
    return { found: false, note: String(e) };
  }
}

// ─── Field-level signal extraction ───────────────────────────────────────────

const GITHUB_URL_RE = /github\.com\/([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)/i;
const DOCS_TEXT_RE = /\b(?:docs?\.|documentation|gitbook|readthedocs|developer\s+guide|api\s+reference)\b/i;
const FUNDING_FIELDS_RE = /\b(?:seed|series\s+[abcde]|raised|funding|backed\s+by|led\s+by|investors?|venture\s+capital|vc[\s-]backed|grant\s+from|secured\s+funding)\b/i;

function extractFromAirdropFields(airdrop: Record<string, unknown>) {
  const text = [
    airdrop.ai_summary,
    airdrop.overview,
    airdrop.why_airdrop,
    airdrop.source_url,
    airdrop.funding_info,
    airdrop.investors,
    airdrop.team_info,
  ].filter(v => v && typeof v === "string").join(" ");
  const ghMatch = text.match(GITHUB_URL_RE);
  const discoveredGitHubUrl = ghMatch ? `https://github.com/${ghMatch[1]}` : null;
  const websiteUrl = safeString(airdrop.website_url);
  return {
    hasGitHub: !!safeString(airdrop.github_url) || !!ghMatch,
    discoveredGitHubUrl,
    hasDocs: !!safeString(airdrop.docs_url) || /^https?:\/\/docs\./.test(websiteUrl) || /^https?:\/\/developer\./.test(websiteUrl) || DOCS_TEXT_RE.test(text),
    hasFunding: FUNDING_FIELDS_RE.test(text),
    riskTerms: includesAny(text, HIGH_RISK_TERMS),
  };
}

function validateTokenAddress(address: string, blockchain: string): { valid: boolean; reason?: string } {
  if (!address) return { valid: true };
  const evmChains = ["Ethereum", "Polygon", "Arbitrum", "Optimism", "Avalanche", "Base", "BNB Chain", "zkSync", "Linea", "Scroll", "Mantle", "Blast"];
  const isSolana = blockchain?.toLowerCase().includes("solana");
  const isEVM = evmChains.some(c => blockchain?.toLowerCase().includes(c.toLowerCase()));
  if (isEVM && !/^0x[0-9a-fA-F]{40}$/.test(address)) return { valid: false, reason: `Invalid EVM address format` };
  if (isSolana && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) return { valid: false, reason: `Invalid Solana address format` };
  return { valid: true };
}

// ─── Intelligence scoring ────────────────────────────────────────────────────

function buildSourceList(evidence: SourceEvidence[], pages: WebPageData[], apiSources: string[]): string[] {
  const urls = evidence.slice(0, 18).map(e => `${e.tier}: ${e.url}`);
  const pageUrls = pages.slice(0, 8).map(p => `page: ${p.url}`);
  return uniq([...apiSources, ...urls, ...pageUrls]).slice(0, 40);
}

function computeIntelligenceScore(args: {
  airdrop: Record<string, unknown>;
  taskCount: number;
  github: GitHubData;
  web: WebEnrichmentData;
  cg: CoinGeckoData;
  dex: DexData;
  goplus: GoPlusData;
  llama: DefiLlamaData;
  evidence: SourceEvidence[];
  pages: WebPageData[];
}): IntelligenceScore {
  const { airdrop, taskCount, github, web, cg, dex, goplus, llama, evidence, pages } = args;
  const fields = extractFromAirdropFields(airdrop);

  const twitterUrl = safeString(
    airdrop.twitter_url ||
    airdrop.x_url ||
    airdrop.social_url ||
    web.x_url ||
    firstTrustedEvidenceUrl(evidence, [(url) => url.includes("x.com/") || url.includes("twitter.com/")])
  );
  const discordUrl = safeString(airdrop.discord_url || web.discord_url);
  const telegramUrl = safeString(airdrop.telegram_url || web.telegram_url);

  const hasWebsite = !!safeString(airdrop.website_url);
  const hasDocs = !!safeString(airdrop.docs_url) || !!web.docs_url || fields.hasDocs;
  const hasGitHub = !!safeString(airdrop.github_url) || !!web.github_link || fields.hasGitHub;
  const activeGitHub = github.found && !github.archived && (github.recentCommits30d ?? 0) > 0;
  const hasTeam = !!safeString(airdrop.team_info) || web.has_team_info === true;
  const hasFunding = !!safeString(airdrop.funding_info) || !!safeString(airdrop.investors) || (web.funding_mentions?.length ?? 0) > 0 || (web.known_investors?.length ?? 0) > 0 || evidence.some(e => e.trustTerms?.some(t => ["funding", "backed by", "investors"].includes(t)));
  const hasTwitter = twitterUrl.includes("x.com") || twitterUrl.includes("twitter.com") || (cg.twitterFollowers ?? 0) > 0;
  const hasDiscord = discordUrl.includes("discord.gg") || discordUrl.includes("discord.com");
  const hasTelegram = telegramUrl.includes("t.me") || telegramUrl.includes("telegram.me");
  const hasVerifiedDexMarket = dex.found && !!safeString(airdrop.contract_address);
  const hasTokenMarket = (cg.found && cg.verifiedMatch === true && cg.shouldDisplayMarket !== false) || hasVerifiedDexMarket;
  const hasTvl = llama.found && (llama.tvl ?? 0) > 0;
  const trustedSourceCount = evidence.filter(e => e.tier === "trusted" || e.tier === "primary" || e.tier === "official").length;
  const knownEstablishedEntity = isKnownEstablishedEntity(airdrop, safeString(airdrop.website_url), evidence);
  const blueChipEntity = isBlueChipEntity(airdrop, safeString(airdrop.website_url), evidence);
  const emergingEntity = !blueChipEntity && isEmergingEntity(airdrop, safeString(airdrop.website_url), evidence);
  const projectMisconductEvidence = hasProjectMisconductEvidence(evidence, pages, knownEstablishedEntity);
  const isEstablishedProject = knownEstablishedEntity || hasTvl || (cg.found && cg.verifiedMatch === true) || (github.found && (github.stars ?? 0) > 100) || hasFunding || hasTeam || trustedSourceCount >= 3;
  const hasAudit = !!web.audit_url || evidence.some(e => e.trustTerms?.includes("audit"));
  const hasTasks = taskCount > 0;
  const preToken = !hasTokenMarket;
  const noOfficialToken = !safeString(airdrop.contract_address) && preToken;
  const providedWebsiteHost = hostname(safeString(airdrop.website_url));
  const knownDomainMatch = knownEstablishedEntity || blueChipEntity || emergingEntity;
  const officialLinkMismatch =
    knownDomainMatch &&
    hasWebsite &&
    !urlHostMatchesKnownProject(safeString(airdrop.website_url), [...KNOWN_ESTABLISHED_PROJECT_DOMAINS, ...EMERGING_PROJECT_DOMAINS]);

  const projectTextForSafety = [
    airdrop.ai_summary,
    airdrop.overview,
    airdrop.why_airdrop,
    airdrop.source,
    airdrop.description,
    airdrop.tasks_required,
    airdrop.eligibility_requirements,
  ].filter(v => typeof v === "string").join(" ");

  const safetyDisclaimerContext = /never\s+(share|enter)|do\s+not\s+(share|enter|provide)|will\s+not\s+ask|no\s+(seed\s+phrase|private\s+key|payment|fee)/i.test(projectTextForSafety);
  const criticalActionTextDetected = includesRegex(projectTextForSafety, HIGH_RISK_ACTION_PATTERNS) && !safetyDisclaimerContext;

  const actionSafetyCritical =
    Boolean(airdrop.requires_seed_phrase) ||
    Boolean(airdrop.requires_payment) ||
    criticalActionTextDetected;

  const actionSafetyMedium =
    Boolean(airdrop.requires_wallet_connection) ||
    Boolean(airdrop.requires_transaction) ||
    includesRegex(projectTextForSafety, MEDIUM_RISK_ACTION_PATTERNS);

  const suspiciousProvidedLinks = [
    safeString(airdrop.website_url),
    safeString(airdrop.twitter_url),
    safeString(airdrop.discord_url),
    safeString(airdrop.telegram_url),
  ].map(u => ({ url: u, reason: suspiciousLinkReason(u) })).filter(x => x.url && x.reason);

  const officialSourceCount = evidence.filter(e => e.tier === "official").length;
  const primarySourceCount = evidence.filter(e => e.tier === "primary").length;
  const communitySourceCount = evidence.filter(e => e.tier === "community" || e.tier === "unknown" || e.tier === "risky").length;
  const consensusScore = compactScore(
    officialSourceCount * 3 +
    primarySourceCount * 2 +
    trustedSourceCount -
    Math.floor(communitySourceCount / 4),
    16,
  );

  const scamWarnings: string[] = [];
  const brandRiskWarnings: string[] = [];
  const criticalFlags: string[] = [];
  const missing: string[] = [];
  const breakdown: Record<string, number> = {};

  if (!hasWebsite) missing.push("Official website missing");
  if (!hasDocs) missing.push("Documentation missing");
  if (!hasGitHub) missing.push("Public GitHub not found");
  if (!hasTeam) missing.push("Public team information missing");
  if (!hasFunding) missing.push("Funding or investor information missing");
  if (!hasTasks) missing.push("No tasks/quests defined");
  if (noOfficialToken) missing.push(isEstablishedProject ? "No official token contract detected — token/airdrop uncertainty only" : "No verified token contract or verified market-data match");
  if (officialLinkMismatch) scamWarnings.push(`Official website/domain does not match the expected known project domain (${providedWebsiteHost || "unknown host"})`);
  if (actionSafetyCritical) criticalFlags.push("High-risk user action detected: seed phrase, payment, private key, or unsafe claim wording");
  if (!actionSafetyCritical && actionSafetyMedium) brandRiskWarnings.push("User action requires caution: wallet connection, signing, transaction, bridge, swap or deposit may be required");
  if (suspiciousProvidedLinks.length > 0) brandRiskWarnings.push(`${suspiciousProvidedLinks.length} provided link(s) have claim/airdrop/lookalike-domain characteristics`);

  if (goplus.is_honeypot === "1") criticalFlags.push("Confirmed honeypot detected by contract scan");
  if (goplus.owner_change_balance === "1") scamWarnings.push("Contract owner may be able to modify holder balances");
  if (goplus.is_mintable === "1") scamWarnings.push("Token appears mintable, which can dilute holders");
  if (goplus.can_take_back_ownership === "1") scamWarnings.push("Ownership may be reclaimable");
  if (goplus.is_open_source && goplus.is_open_source !== "1") scamWarnings.push("Contract is not open-source or not verified");

  const riskyEvidence = evidence.filter(e => (e.riskTerms?.length ?? 0) > 0);
  const officialRiskEvidence = riskyEvidence.filter(e => e.tier === "official" || e.tier === "primary");
  const trustedRiskEvidence = riskyEvidence.filter(e => e.tier === "trusted");
  const communityRiskEvidence = riskyEvidence.filter(e => e.tier === "community" || e.tier === "unknown" || e.tier === "risky");

  // Threat Intelligence 1.0: distinguish active exploits from brand impersonation.
  // Big brands often have phishing/scam mentions because criminals impersonate them; that should not
  // automatically crush project legitimacy, but it should surface a clear threat warning.
  const threatIntelEvidence = riskyEvidence.filter(e => isThreatIntelligenceSource(e.url) || includesAny(evidenceCombinedText(e), SECURITY_RESEARCHER_TERMS).length > 0);
  const activeExploitEvidence = threatIntelEvidence.filter(e => includesAny(evidenceCombinedText(e), ACTIVE_EXPLOIT_TERMS).length > 0);
  const brandImpersonationEvidence = riskyEvidence.filter(e => includesAny(evidenceCombinedText(e), BRAND_IMPERSONATION_TERMS).length > 0);

  if (activeExploitEvidence.length > 0) {
    const msg = `${activeExploitEvidence.length} security/threat-intelligence source(s) mention active exploit, compromise, drainer or phishing signals`;
    if (isEstablishedProject && !criticalFlags.length) brandRiskWarnings.push(msg);
    else scamWarnings.push(msg);
  }

  if (brandImpersonationEvidence.length > 1 && isEstablishedProject && !criticalFlags.length) {
    brandRiskWarnings.push(`${brandImpersonationEvidence.length} source(s) suggest impersonation/fake-claim risk around this brand`);
  }

  if (officialRiskEvidence.length > 0) {
    if (isEstablishedProject && !criticalFlags.length && !projectMisconductEvidence) {
      brandRiskWarnings.push(`${officialRiskEvidence.length} official/primary source(s) mention security or phishing-risk terms`);
    } else {
      scamWarnings.push(`${officialRiskEvidence.length} official/primary source(s) mention risk terms`);
    }
  }

  if (isEstablishedProject && !criticalFlags.length) {
    if (trustedRiskEvidence.length > 0) brandRiskWarnings.push(`${trustedRiskEvidence.length} trusted source(s) mention brand-related security/phishing risk`);
    if (communityRiskEvidence.length > 2) brandRiskWarnings.push(`${communityRiskEvidence.length} community/search result(s) mention scams, phishing or impersonation around this brand`);
  } else {
    if (trustedRiskEvidence.length > 0) scamWarnings.push(`${trustedRiskEvidence.length} higher-quality source(s) mention risk terms`);
    if (communityRiskEvidence.length > 2) scamWarnings.push(`${communityRiskEvidence.length} community/search results mention scam, phishing or exploit terms`);
  }

  if (!isEstablishedProject && fields.riskTerms.length > 0) scamWarnings.push(`Stored project text contains risk terms: ${fields.riskTerms.slice(0, 4).join(", ")}`);
  if (isEstablishedProject && fields.riskTerms.length > 0) brandRiskWarnings.push(`Stored project text mentions risk terms, likely due to caution/impersonation context: ${fields.riskTerms.slice(0, 4).join(", ")}`);
  if (!isEstablishedProject && web.risk_terms && web.risk_terms.length > 0) scamWarnings.push(`Official/site text contains risk-related terms: ${web.risk_terms.slice(0, 4).join(", ")}`);
  if (isEstablishedProject && web.risk_terms && web.risk_terms.length > 0) brandRiskWarnings.push(`Official/site text contains security/risk language: ${web.risk_terms.slice(0, 4).join(", ")}`);
  if (github.archived) scamWarnings.push("GitHub repository is archived");
  if (github.found && (github.lastPushDaysAgo ?? 0) > 180) scamWarnings.push("GitHub repository appears stale");

  breakdown.website = hasWebsite ? 8 : 0;
  breakdown.docs = hasDocs ? 12 : 0;
  breakdown.twitter = hasTwitter ? 8 : 0;
  breakdown.discord = hasDiscord ? 6 : 0;
  breakdown.telegram = hasTelegram ? 4 : 0;
  breakdown.github = hasGitHub ? 6 : 0;
  breakdown.github_active = activeGitHub ? 10 : github.found ? 3 : 0;
  breakdown.github_activity = breakdown.github_active;
  breakdown.team_info = hasTeam ? 8 : 0;
  breakdown.team = breakdown.team_info;
  breakdown.funding = hasFunding ? 12 : 0;
  breakdown.contract_security = goplus.found ? (goplus.is_honeypot === "1" ? -40 : (goplus.is_open_source === "1" ? 10 : 4)) : 0;
  breakdown.audit = hasAudit ? 6 : 0;
  breakdown.market_verified = hasTokenMarket ? 6 : isEstablishedProject ? 2 : 0;
  breakdown.market = breakdown.market_verified;
  breakdown.tvl = hasTvl ? 6 : 0;
  breakdown.tasks = hasTasks ? 6 : 0;
  breakdown.independent_sources = Math.min(10, trustedSourceCount * 2);
  breakdown.source_consensus = consensusScore;
  breakdown.official_sources = officialSourceCount;
  breakdown.primary_sources = primarySourceCount;
  breakdown.community_sources = communitySourceCount;
  breakdown.official_link_integrity = officialLinkMismatch ? -18 : hasWebsite ? 4 : 0;
  breakdown.user_action_safety = actionSafetyCritical ? -50 : actionSafetyMedium ? -8 : 4;
  const activeExploitPenalty = isEstablishedProject && !projectMisconductEvidence
    ? Math.min(knownEstablishedEntity ? 3 : 6, activeExploitEvidence.length * (knownEstablishedEntity ? 1 : 2))
    : activeExploitEvidence.length * 10;
  const threatIntelPenalty = activeExploitPenalty + (isEstablishedProject ? Math.min(knownEstablishedEntity ? 2 : 4, threatIntelEvidence.length) : threatIntelEvidence.length * 5);
  breakdown.threat_intelligence = -Math.min(isEstablishedProject && !projectMisconductEvidence ? 8 : 30, threatIntelPenalty);
  breakdown.brand_impersonation_risk = isEstablishedProject ? -Math.min(knownEstablishedEntity ? 1 : 3, brandImpersonationEvidence.length) : -Math.min(18, brandImpersonationEvidence.length * 4);

  const officialRiskPenalty = isEstablishedProject && !projectMisconductEvidence ? officialRiskEvidence.length * (knownEstablishedEntity ? 0.5 : 2) : officialRiskEvidence.length * 14;
  const trustedRiskPenalty = isEstablishedProject ? trustedRiskEvidence.length * 1 : trustedRiskEvidence.length * 10;
  const communityRiskPenalty = isEstablishedProject ? Math.min(knownEstablishedEntity ? 2 : 4, communityRiskEvidence.length) : communityRiskEvidence.length * 4;
  const warningPenalty = isEstablishedProject ? scamWarnings.length * 1 : scamWarnings.length * 4;
  breakdown.risk_penalty = -Math.min(isEstablishedProject && !projectMisconductEvidence ? 12 : 45, criticalFlags.length * 45 + officialRiskPenalty + trustedRiskPenalty + communityRiskPenalty + warningPenalty + threatIntelPenalty);

  let trust = Object.values(breakdown).reduce((s, n) => s + n, 0);
  if (isEstablishedProject && !criticalFlags.length) trust += blueChipEntity ? 24 : emergingEntity ? 12 : knownEstablishedEntity ? 18 : 12;
  if (isEstablishedProject && !criticalFlags.length && !projectMisconductEvidence) {
    // Entity Reputation Engine: established brands should not be scored as low trust
    // just because scammers impersonate them. Keep phishing/fake-claim warnings visible,
    // but protect project legitimacy unless there is project-level misconduct evidence.
    const trustFloor = blueChipEntity ? 88 : emergingEntity ? 78 : knownEstablishedEntity ? 82 : 76;
    trust = Math.max(trust, trustFloor);
  }
  if (projectMisconductEvidence && isEstablishedProject) trust = Math.min(trust, knownEstablishedEntity ? 78 : 72);

  // ── Evidence-Driven Calibration v13 ─────────────────────────────────────────
  // The engine now scores maturity from evidence quality rather than a simple
  // checklist. Website/docs/social/funding are useful, but they should not make
  // every polished project cluster at 88-92. Live adoption, verified market data,
  // audits/security evidence, source diversity and operating maturity now control
  // the final score band.
  const maturitySignals = [
    hasWebsite,
    hasDocs,
    hasTeam,
    hasFunding,
    hasGitHub,
    activeGitHub,
    hasAudit,
    hasTvl,
    hasTokenMarket,
    trustedSourceCount >= 5,
  ].filter(Boolean).length;

  const coreEvidenceSignals = [
    hasWebsite,
    hasDocs,
    hasTeam || hasFunding,
    hasGitHub || activeGitHub,
    hasTvl || hasTokenMarket || hasAudit,
    trustedSourceCount >= 3,
  ].filter(Boolean).length;

  const evidenceProfile = buildEvidenceProfile({
    airdrop,
    websiteUrl: safeString(airdrop.website_url),
    blueChipEntity,
    knownEstablishedEntity,
    emergingEntity,
    hasWebsite,
    hasDocs,
    hasTeam,
    hasFunding,
    hasGitHub,
    activeGitHub,
    hasAudit,
    hasTvl,
    hasTokenMarket,
    trustedSourceCount,
    github,
    cg,
    llama,
  });

  let trustCeiling = evidenceProfile.maxTrust;
  const trustFloor = evidenceProfile.minTrust;

  // ── Professional Risk Engine v14 ────────────────────────────────────────────
  // Mature intelligence products care about source quality and action safety,
  // not just whether a project has polished docs/socials. These controls tighten
  // scores when evidence is mostly community/search noise, links look suspicious,
  // or the user would need to perform risky wallet actions.
  if (consensusScore < 5 && evidenceProfile.tier !== "blue_chip") trustCeiling = Math.min(trustCeiling, 82);
  if (consensusScore < 3 && evidenceProfile.tier !== "blue_chip") trustCeiling = Math.min(trustCeiling, 76);
  if (officialLinkMismatch) trustCeiling = Math.min(trustCeiling, knownEstablishedEntity ? 70 : 62);
  if (actionSafetyCritical) trustCeiling = Math.min(trustCeiling, 25);
  if (suspiciousProvidedLinks.length > 0 && evidenceProfile.tier !== "blue_chip") trustCeiling = Math.min(trustCeiling, 78);
  if (hasWebsite && !hasDocs && !hasTeam && !hasFunding && trustedSourceCount < 3) trustCeiling = Math.min(trustCeiling, 70);

  // Blue-chip brands can remain high trust, but phishing/impersonation still
  // prevents a near-perfect score. For non-blue-chip projects, warnings and
  // missing security evidence have a stronger effect.
  if (brandRiskWarnings.length > 0 && evidenceProfile.tier === "blue_chip") {
    trustCeiling = Math.min(trustCeiling, 92);
  }
  if (brandRiskWarnings.length > 0 && evidenceProfile.tier !== "blue_chip") {
    trustCeiling = Math.min(trustCeiling, evidenceProfile.tier === "established_product" ? 90 : 86);
  }

  // Evidence-driven deductions: these spread similar-looking projects naturally.
  const evidenceMaturityPenalty =
    Math.max(0, 6 - coreEvidenceSignals) +
    Math.max(0, 7 - maturitySignals) +
    (evidenceProfile.liveEvidenceScore <= 1 && evidenceProfile.tier !== "blue_chip" ? 2 : 0) +
    (evidenceProfile.securityEvidenceScore <= 2 && evidenceProfile.tier !== "blue_chip" ? 2 : 0) +
    (evidenceProfile.independentEvidenceScore <= 3 ? 1 : 0);

  if (evidenceProfile.tier === "emerging_network") {
    trust -= Math.min(7, evidenceMaturityPenalty + (!hasAudit ? 1 : 0));
  } else if (evidenceProfile.tier === "growth_network") {
    trust -= Math.min(5, evidenceMaturityPenalty);
  } else if (evidenceProfile.tier === "established_product") {
    trust -= Math.min(3, Math.max(0, evidenceMaturityPenalty - 1));
  } else if (evidenceProfile.tier === "early_stage" || evidenceProfile.tier === "unknown") {
    trust -= Math.min(10, evidenceMaturityPenalty + 2);
  }

  // Strong live/adoption/security proof can lift a project inside its band, but
  // still cannot exceed the evidence-based ceiling.
  const evidenceQualityLift =
    Math.min(3, Math.floor(evidenceProfile.liveEvidenceScore / 4)) +
    Math.min(2, Math.floor(evidenceProfile.securityEvidenceScore / 3)) +
    Math.min(2, Math.floor(evidenceProfile.adoptionScore / 4));

  if (evidenceProfile.tier !== "blue_chip") {
    trust += evidenceQualityLift;
  }

  // Major project-level misconduct or critical contract evidence overrides bands.
  if (projectMisconductEvidence && isEstablishedProject) {
    trustCeiling = Math.min(trustCeiling, blueChipEntity ? 78 : knownEstablishedEntity ? 74 : 70);
  }
  if (criticalFlags.length) {
    trust = 0;
  } else {
    trust = Math.max(Math.min(trust, trustCeiling), trustFloor);
  }

  breakdown.trust_ceiling = trustCeiling;
  breakdown.trust_floor = trustFloor;
  breakdown.maturity_signals = maturitySignals;
  breakdown.core_evidence_signals = coreEvidenceSignals;
  breakdown.evidence_live = evidenceProfile.liveEvidenceScore;
  breakdown.evidence_independent = evidenceProfile.independentEvidenceScore;
  breakdown.evidence_adoption = evidenceProfile.adoptionScore;
  breakdown.evidence_security = evidenceProfile.securityEvidenceScore;
  breakdown.evidence_quality_lift = evidenceQualityLift;
  breakdown.evidence_maturity_penalty = -evidenceMaturityPenalty;
  breakdown.v14_source_consensus = consensusScore;
  breakdown.v14_official_link_mismatch = officialLinkMismatch ? 1 : 0;
  breakdown.v14_action_safety_critical = actionSafetyCritical ? 1 : 0;
  breakdown.v14_safety_disclaimer_context = safetyDisclaimerContext ? 1 : 0;
  breakdown.v14_action_safety_medium = actionSafetyMedium ? 1 : 0;
  breakdown.v14_suspicious_links = suspiciousProvidedLinks.length;
  breakdown.project_tier_score =
    evidenceProfile.tier === "blue_chip" ? 5 :
    evidenceProfile.tier === "established_product" ? 4 :
    evidenceProfile.tier === "growth_network" ? 3 :
    evidenceProfile.tier === "emerging_network" ? 2 :
    evidenceProfile.tier === "early_stage" ? 1 : 0;
  breakdown.blue_chip_entity = blueChipEntity ? 1 : 0;
  breakdown.emerging_entity = emergingEntity ? 1 : 0;

  const trust_score = clamp(trust);


  // ── Opportunity Intelligence 2.0 ───────────────────────────────────────────
  // Trust answers: "Is the project legitimate?"
  // Opportunity answers: "Is there a currently useful, evidence-backed airdrop/farming action?"
  // Big, legitimate projects should keep high Trust but can still have low Opportunity if the airdrop is only rumoured.
  const categoryText = `${(airdrop.category as string[] | undefined)?.join(" ") ?? ""} ${safeString(airdrop.ai_summary)} ${safeString(airdrop.overview)} ${safeString(airdrop.why_airdrop)} ${safeString(airdrop.source)}`.toLowerCase();
  const allEvidenceText = `${categoryText} ${evidence.map(e => `${e.title} ${e.snippet ?? ""}`).join(" ")}`.toLowerCase();

  const infraBonus = /(zk|infrastructure|layer 2|layer 1|modular|restaking|depin|ai|data|interoperability|bridge)/.test(categoryText) ? 8 : 0;
  const effortPenalty = safeString(airdrop.difficulty) === "Hard" ? 10 : safeString(airdrop.difficulty) === "Moderate" ? 4 : 0;
  const rewardInput = safeString(airdrop.reward_potential);
  const estimatedRewardText = safeString(airdrop.estimated_reward).toLowerCase();
  const expiryText = safeString(airdrop.expiry_date);

  const activeCampaignSignals = [
    /official\s+(airdrop|points|quest|campaign|incentive)/i.test(allEvidenceText),
    /points?\s+(program|campaign|season|dashboard|leaderboard)/i.test(allEvidenceText),
    /quest(s)?\s+(live|active|campaign|portal)/i.test(allEvidenceText),
    /testnet\s+(live|active|campaign|quest|points)/i.test(allEvidenceText),
    /incentivized|incentivised|eligible|eligibility|snapshot|claim\s+portal/i.test(allEvidenceText),
    hasTasks,
  ].filter(Boolean).length;

  const negativeOpportunitySignals = [
    /no\s+(airdrop|token)\s+(confirmed|announced)/i.test(allEvidenceText),
    /not\s+(confirmed|announced)/i.test(allEvidenceText) && /airdrop|token|claim/i.test(allEvidenceText),
    /rumou?r|speculat|unconfirmed/i.test(allEvidenceText),
    /snapshot\s+(ended|taken|complete|closed)/i.test(allEvidenceText),
    /claim\s+(ended|closed|expired)/i.test(allEvidenceText),
    safeString(airdrop.status) === "Expired",
  ].filter(Boolean).length;

  const tokenConfirmed = hasTokenMarket || !!safeString(airdrop.contract_address) || /token\s+(live|launched|confirmed|contract)/i.test(allEvidenceText);
  const explicitAirdropConfirmed = /airdrop\s+(confirmed|announced|live|official)/i.test(allEvidenceText) || /claim\s+portal/i.test(allEvidenceText);
  const speculativeOnly = !explicitAirdropConfirmed && activeCampaignSignals === 0 && (noOfficialToken || negativeOpportunitySignals > 0 || isEstablishedProject);
  const activeFarming = activeCampaignSignals >= 2 || (hasTasks && (web.testnet_mentioned || /quest|points|testnet|campaign/i.test(allEvidenceText)));

  let rewardBase = rewardInput === "High" ? 18 : rewardInput === "Medium" ? 10 : 4;
  if (explicitAirdropConfirmed) rewardBase += 20;
  if (activeFarming) rewardBase += 18;
  if (activeCampaignSignals === 1) rewardBase += 8;
  if (hasFunding) rewardBase += 7;
  if (hasTvl) rewardBase += 5;
  if (tokenConfirmed) rewardBase += 6;
  if (preToken && !isEstablishedProject && activeFarming) rewardBase += 10;
  if (preToken && isEstablishedProject && !activeFarming) rewardBase -= 6;
  if (hasTasks) rewardBase += 10;
  if (activeGitHub) rewardBase += 4;
  if (estimatedRewardText && !looksLikeUnsetToken(estimatedRewardText)) rewardBase += 5;
  if (expiryText) rewardBase += 3;

  const opportunityInfoPenalty =
    (!hasTasks ? 12 : 0) +
    (noOfficialToken && !explicitAirdropConfirmed ? 14 : 0) +
    (!expiryText && !activeFarming ? 6 : 0) +
    (!estimatedRewardText ? 7 : 0) +
    (negativeOpportunitySignals * 8);

  let rawOpportunity = rewardBase + infraBonus + Math.min(10, trust_score / 12) - effortPenalty - opportunityInfoPenalty - (scamWarnings.length * 4) - (brandRiskWarnings.length * 2);

  // v14 opportunity confidence: users should only see very high opportunity when
  // there is current, official, actionable evidence — not just speculation.
  if (actionSafetyCritical) rawOpportunity = Math.min(rawOpportunity, 15);
  if (officialLinkMismatch) rawOpportunity = Math.min(rawOpportunity, 20);
  if (activeCampaignSignals < 2 && !explicitAirdropConfirmed) rawOpportunity = Math.min(rawOpportunity, evidenceProfile.tier === "blue_chip" ? 45 : 65);
  if (!hasTasks && !explicitAirdropConfirmed && !activeFarming) rawOpportunity = Math.min(rawOpportunity, 55);
  if (negativeOpportunitySignals >= 2) rawOpportunity = Math.min(rawOpportunity, 38);
  if (explicitAirdropConfirmed && activeFarming && hasTasks && trust_score >= 75 && !actionSafetyCritical) rawOpportunity += 6;

  // Important: cap speculative established projects. Example: OpenSea/MetaMask/Uniswap can be highly trusted
  // while having low-to-moderate airdrop opportunity if no official campaign, token, snapshot or task evidence exists.
  if (isEstablishedProject && speculativeOnly) rawOpportunity = Math.min(rawOpportunity, 42);
  if (isEstablishedProject && speculativeOnly && negativeOpportunitySignals > 0) rawOpportunity = Math.min(rawOpportunity, 35);
  if (!explicitAirdropConfirmed && !activeFarming && noOfficialToken) rawOpportunity = Math.min(rawOpportunity, isEstablishedProject ? 40 : 50);
  if (activeFarming && trust_score >= 70 && criticalFlags.length === 0 && officialRiskEvidence.length < 2) rawOpportunity += 8;

  breakdown.opportunity_active_campaign_signals = activeCampaignSignals;
  breakdown.opportunity_negative_signals = negativeOpportunitySignals;
  breakdown.opportunity_confirmed_airdrop = explicitAirdropConfirmed ? 10 : 0;
  breakdown.opportunity_active_farming = activeFarming ? 10 : 0;
  breakdown.opportunity_speculative_cap_applied = speculativeOnly ? 1 : 0;

  const opportunity_score_raw = clamp(rawOpportunity);

  const sourceQuality = trustedSourceCount;
  const apiHits = [github.found, cg.found, dex.found, goplus.found, llama.found, web.found].filter(Boolean).length;
  let confidenceRaw = 25 + sourceQuality * 4 + apiHits * 8 + (hasWebsite ? 5 : 0) + (hasDocs ? 5 : 0) + (hasFunding ? 5 : 0) - missing.length * 3;
  // Confidence is also capped if major fields are still missing. This stops
  // early-stage projects looking fully verified just because search found many
  // positive mentions.
  if (!knownEstablishedEntity && missing.length >= 4) confidenceRaw = Math.min(confidenceRaw, 70);
  if (!hasDocs || !hasWebsite) confidenceRaw = Math.min(confidenceRaw, 82);
  if (!hasTeam && !hasFunding) confidenceRaw = Math.min(confidenceRaw, 72);
  if (!blueChipEntity && !hasTvl && !hasTokenMarket && !hasAudit) confidenceRaw = Math.min(confidenceRaw, 84);
  if (!blueChipEntity && trustedSourceCount < 5) confidenceRaw = Math.min(confidenceRaw, 82);
  if (evidenceProfile.tier === "emerging_network" && evidenceProfile.liveEvidenceScore <= 2) confidenceRaw = Math.min(confidenceRaw, 78);
  if (evidenceProfile.tier === "early_stage" || evidenceProfile.tier === "unknown") confidenceRaw = Math.min(confidenceRaw, 70);
  if (consensusScore < 5 && !blueChipEntity) confidenceRaw = Math.min(confidenceRaw, 76);
  if (officialLinkMismatch || actionSafetyCritical) confidenceRaw = Math.min(confidenceRaw, 55);
  if (suspiciousProvidedLinks.length > 0 && !blueChipEntity) confidenceRaw = Math.min(confidenceRaw, 72);
  const confidence_score = clamp(confidenceRaw);
  const confidence_level: ConfidenceLevel = confidence_score >= 75 ? "High" : confidence_score >= 45 ? "Medium" : "Low";

  // ── Personalized Airdrop Scoring Layer ─────────────────────────────────────
  // Final score must reflect this specific opportunity, not just project quality.
  const project_strength_score = trust_score;

  const timeRequiredText = safeString(airdrop.time_required).toLowerCase();
  const estimatedRewardKnown = !!estimatedRewardText && !looksLikeUnsetToken(estimatedRewardText);
  const rewardLikelihoodBoost = explicitAirdropConfirmed ? 10 : activeFarming ? 6 : 0;

  const hasHighEffortSignal =
    safeString(airdrop.difficulty) === "Hard" ||
    taskCount >= 7 ||
    /\b(6\+|8\+|10\+|12\+|multiple\s+days|week|weeks|hours?)\b/.test(timeRequiredText);

  const hasMediumEffortSignal =
    safeString(airdrop.difficulty) === "Moderate" ||
    taskCount >= 4 ||
    /\b(2\s*[-to]{0,3}\s*5|3\s*[-to]{0,3}\s*6|few\s+hours?)\b/.test(timeRequiredText);

  const costHintText = [
    safeString(airdrop.cost_required),
    safeString(airdrop.estimated_cost),
    safeString(airdrop.tasks_required),
    safeString(airdrop.ai_risk_analysis),
    safeString(airdrop.description),
  ].join(" ").toLowerCase();

  const highCostRequired =
    Boolean(airdrop.requires_payment) ||
    /\b(pay|fee|bridge\s+fee|gas\s+cost|deposit|stake|lp|liquidity|swap\s+required)\b/.test(costHintText);

  const effort_required_score = clamp(
    85
      - (hasHighEffortSignal ? 28 : hasMediumEffortSignal ? 12 : 0)
      - (highCostRequired ? 18 : 0)
      - (actionSafetyMedium ? 8 : 0)
      - (!timeRequiredText ? 6 : 0),
  );

  const risk_level_score = clamp(
    90
      - (criticalFlags.length * 35)
      - (officialRiskEvidence.length * 10)
      - (trustedRiskEvidence.length * 6)
      - (communityRiskEvidence.length * 2)
      - (brandImpersonationEvidence.length * 4)
      - (suspiciousProvidedLinks.length * 6)
      - (actionSafetyCritical ? 30 : 0)
      - (actionSafetyMedium ? 12 : 0),
  );

  let opportunity_score = clamp(
    opportunity_score_raw
      + rewardLikelihoodBoost
      + (estimatedRewardKnown ? 6 : -8)
      - (highCostRequired && !explicitAirdropConfirmed ? 12 : 0)
      - (hasHighEffortSignal && !explicitAirdropConfirmed ? 8 : 0)
      - (negativeOpportunitySignals * 4),
  );

  const expiryDate = safeString(airdrop.expiry_date);
  if (expiryDate) {
    const expiry = new Date(expiryDate).getTime();
    if (!Number.isNaN(expiry)) {
      const daysLeft = Math.floor((expiry - Date.now()) / 86_400_000);
      const urgencyPenalty = daysLeft <= 3 && hasHighEffortSignal ? 10 : daysLeft <= 7 && hasMediumEffortSignal ? 5 : 0;
      const urgencyBoost = daysLeft >= 0 && daysLeft <= 14 && explicitAirdropConfirmed && !hasHighEffortSignal ? 4 : 0;
      opportunity_score = clamp(opportunity_score - urgencyPenalty + urgencyBoost);
      breakdown.expiry_days_remaining = daysLeft;
    }
  }

  let final_score = clamp(
    project_strength_score * 0.32 +
    opportunity_score * 0.30 +
    risk_level_score * 0.18 +
    effort_required_score * 0.10 +
    confidence_score * 0.10,
  );

  if (isEstablishedProject && speculativeOnly) final_score = Math.min(final_score, 68);
  if (highCostRequired && speculativeOnly) final_score = Math.min(final_score, 55);
  if (negativeOpportunitySignals >= 2) final_score = Math.min(final_score, 62);
  if (actionSafetyCritical) final_score = Math.min(final_score, 25);

  breakdown.project_strength = project_strength_score;
  breakdown.airdrop_potential = opportunity_score;
  breakdown.risk_level_score = risk_level_score;
  breakdown.effort_required = effort_required_score;
  breakdown.confidence = confidence_score;
  breakdown.final_score = final_score;
  breakdown.reward_data_known = estimatedRewardKnown ? 1 : 0;
  breakdown.high_cost_required = highCostRequired ? 1 : 0;
  breakdown.opportunity_raw = opportunity_score_raw;

  const finalVerdict =
    final_score >= 80
      ? "High-quality opportunity with evidence-backed upside"
      : final_score >= 65
      ? "Promising but requires selective execution and verification"
      : final_score >= 45
      ? "Speculative or effort-heavy opportunity with limited clarity"
      : "Low-quality opportunity for now; risk/uncertainty outweighs upside";

  // ── Intelligence Digest v15 ────────────────────────────────────────────────
  // This creates useful admin/user-facing intelligence without changing your DB schema.
  // It helps AirdropGuard explain what changed, what to watch, and what action is safest.
  const watchlistTriggers = uniq([
    explicitAirdropConfirmed ? "Official airdrop or claim signal detected" : "",
    activeFarming ? "Active farming, quest, points or testnet activity detected" : "",
    activeExploitEvidence.length > 0 ? "Threat-intelligence warning detected" : "",
    brandImpersonationEvidence.length > 0 && isEstablishedProject ? "Brand impersonation / fake-claim risk detected" : "",
    negativeOpportunitySignals > 0 ? "Unconfirmed, ended, snapshot or claim-risk signal detected" : "",
    officialLinkMismatch ? "Official-link integrity issue detected" : "",
    actionSafetyCritical ? "Critical user-action safety risk detected" : "",
    noOfficialToken ? "No official token contract verified" : "",
  ].filter(Boolean));

  const userVerdict =
    criticalFlags.length || final_score < 30 ? "Avoid"
    : (criticalFlags.length || projectMisconductEvidence || (!isEstablishedProject && (officialRiskEvidence.length >= 2 || activeExploitEvidence.length >= 2 || final_score < 30))) ? "High caution"
    : project_strength_score >= 85 && opportunity_score >= 75 ? "Strong project + strong opportunity"
    : project_strength_score >= 85 && opportunity_score < 50 ? "Trusted project, speculative opportunity"
    : final_score >= 70 && opportunity_score >= 70 ? "Promising opportunity, verify details"
    : final_score >= 70 ? "Legitimate-looking project, review opportunity"
    : "Needs manual review";

  const adminPriority =
    criticalFlags.length || officialLinkMismatch || actionSafetyCritical ? "urgent_review"
    : activeExploitEvidence.length > 0 || brandImpersonationEvidence.length > 3 ? "security_watch"
    : opportunity_score >= 75 && final_score >= 75 && confidence_score >= 70 ? "ready_for_human_verification"
    : missing.length >= 4 || confidence_score < 60 ? "data_enrichment_needed"
    : "normal_review";

  const nextBestActions = uniq([
    officialLinkMismatch ? "Verify official website/domain before publication" : "",
    actionSafetyCritical ? "Do not publish until seed phrase/payment/private-key risk is manually cleared" : "",
    noOfficialToken && opportunity_score >= 60 ? "Confirm token/airdrop status from official docs or announcements" : "",
    !hasTasks && opportunity_score >= 45 ? "Add verified user tasks before promoting as actionable" : "",
    !hasDocs ? "Add official docs URL" : "",
    !hasTeam && !blueChipEntity ? "Add team/founder evidence" : "",
    !hasFunding && !hasTvl && !hasTokenMarket && !blueChipEntity ? "Add funding, TVL, market or adoption evidence" : "",
    activeExploitEvidence.length > 0 ? "Check Scam Sniffer/SlowMist/PeckShield/Chainabuse style results before approval" : "",
    brandImpersonationEvidence.length > 0 && isEstablishedProject ? "Add visible warning: use only official links; scammers may impersonate this brand" : "",
  ].filter(Boolean)).slice(0, 6);

  const advancedProfile = buildAdvancedSignalProfile({
    airdrop,
    taskCount,
    evidenceProfile,
    evidence,
    github,
    cg,
    llama,
    goplus,
    hasWebsite,
    hasDocs,
    hasTeam,
    hasFunding,
    hasGitHub,
    activeGitHub,
    hasAudit,
    hasTvl,
    hasTokenMarket,
    hasTasks,
    trustedSourceCount,
    officialSourceCount,
    primarySourceCount,
    consensusScore,
    activeCampaignSignals,
    negativeOpportunitySignals,
    explicitAirdropConfirmed,
    activeFarming,
    noOfficialToken,
    actionSafetyCritical,
    actionSafetyMedium,
    officialLinkMismatch,
    projectMisconductEvidence,
    threatIntelCount: threatIntelEvidence.length,
    brandImpersonationCount: brandImpersonationEvidence.length,
    scamWarningCount: scamWarnings.length,
    missingCount: missing.length,
  });

  const timelineProfile = buildProjectTimelineProfile({
    airdrop,
    web,
    cg,
    llama,
    github,
    goplus,
    evidence,
    pages,
    evidenceProfile,
    hasFunding,
    hasTeam,
    hasAudit,
    hasTvl,
    hasTokenMarket,
    activeGitHub,
    explicitAirdropConfirmed,
    activeFarming,
    noOfficialToken,
    projectMisconductEvidence,
    activeExploitEvidence,
    brandImpersonationEvidence,
  });

  breakdown.v15_watchlist_triggers = watchlistTriggers.length;
  breakdown.v15_admin_priority =
    adminPriority === "urgent_review" ? 5 :
    adminPriority === "security_watch" ? 4 :
    adminPriority === "ready_for_human_verification" ? 3 :
    adminPriority === "data_enrichment_needed" ? 2 : 1;
  breakdown.v15_user_verdict_score =
    userVerdict.includes("Strong") ? 5 :
    userVerdict.includes("Trusted") ? 4 :
    userVerdict.includes("Promising") ? 3 :
    userVerdict.includes("review") ? 2 : 1;

  breakdown.v16_reputation_score = advancedProfile.reputationScore;
  breakdown.v16_security_score = advancedProfile.securityScore;
  breakdown.v16_community_score = advancedProfile.communityScore;
  breakdown.v16_opportunity_quality_score = advancedProfile.opportunityQualityScore;
  breakdown.v16_evidence_depth_score = advancedProfile.evidenceDepthScore;
  breakdown.v16_overall_intelligence_score = advancedProfile.overallIntelligenceScore;
  breakdown.v16_strength_count = advancedProfile.strengths.length;
  breakdown.v16_risk_count = advancedProfile.risks.length;
  breakdown.v17_timeline_score = timelineProfile.timelineScore;
  breakdown.v17_maturity_momentum_score = timelineProfile.maturityMomentumScore;
  breakdown.v17_timeline_event_count = timelineProfile.eventCount;
  breakdown.v17_confirmed_timeline_events = timelineProfile.confirmedEventCount;
  breakdown.v17_timeline_watch_items = timelineProfile.watchEventCount;

  const onlyBrandRisk = isEstablishedProject && !criticalFlags.length && scamWarnings.length === 0 && brandRiskWarnings.length > 0;
  const risk_level: RiskLevel = criticalFlags.length || projectMisconductEvidence || (!isEstablishedProject && (officialRiskEvidence.length >= 2 || activeExploitEvidence.length >= 2 || final_score < 30))
    ? "High"
    : onlyBrandRisk || scamWarnings.length > 2 || final_score < 60
    ? "Medium"
    : "Low";
  const reward_potential: RiskLevel = opportunity_score >= 75 ? "High" : opportunity_score >= 45 ? "Medium" : "Low";
  const difficulty = taskCount >= 6 || safeString(airdrop.difficulty) === "Hard" ? "Hard" : taskCount >= 3 || safeString(airdrop.difficulty) === "Moderate" ? "Moderate" : "Easy";
  const ai_recommendation: Recommendation = criticalFlags.length || (!isEstablishedProject && final_score < 25)
    ? "blacklist"
    : final_score >= 70 && risk_level !== "High"
    ? "verify"
    : "review_further";
  const trust_label: TrustLabel = ai_recommendation === "blacklist" ? "scam_alert" : ai_recommendation === "verify" ? "verified" : "watch";

  const positiveReasons = [
    hasDocs ? "Official documentation found" : "",
    hasFunding ? "Funding or investor information detected" : "",
    activeGitHub ? "Active GitHub development detected" : "",
    hasTeam ? "Team information available" : "",
    hasTwitter ? "Official X/Twitter presence detected" : "",
    hasDiscord ? "Discord/community presence detected" : "",
    hasAudit ? "Audit/security reference detected" : "",
    hasTvl ? `DefiLlama TVL detected (${fmt(llama.tvl)})` : "",
    blueChipEntity ? "Blue-chip project profile detected" : "",
    `Evidence profile: ${evidenceProfile.explanation}`,
    `Source consensus score: ${consensusScore}/16`,
    `User verdict: ${userVerdict}`,
    `Admin priority: ${asHumanLabel(adminPriority)}`,
    `AGIE v16 intelligence profile: ${advancedProfile.userSummary}`,
    `AGIE v17 timeline: ${timelineProfile.summary}`,
    timelineProfile.events.length ? `Timeline highlights: ${timelineProfile.events.slice(0, 3).map(e => e.label).join("; ")}` : "",
    `Reputation ${advancedProfile.reputationScore}/100 · Security ${advancedProfile.securityScore}/100 · Evidence depth ${advancedProfile.evidenceDepthScore}/100`,
    advancedProfile.strengths.length ? `Key strengths: ${advancedProfile.strengths.slice(0, 3).join("; ")}` : "",
    evidenceProfile.tier === "emerging_network" ? "Emerging/testnet profile — Trust is capped until live adoption, audits or on-chain evidence mature" : "",
    knownEstablishedEntity ? "Known established crypto entity detected — brand phishing treated separately from project trust" : "",
    isEstablishedProject ? "Established project profile detected" : "",
    activeFarming ? "Active farming/quest/testnet signals detected" : "",
    explicitAirdropConfirmed ? "Official airdrop/claim signal detected" : "",
    `Final score ${final_score}/100: ${finalVerdict}`,
    threatIntelEvidence.length ? "Threat-intelligence sources checked" : "",
  ].filter(Boolean);
  const negativeReasons = [
    ...criticalFlags,
    ...scamWarnings,
    ...brandRiskWarnings,
    activeExploitEvidence.length ? "Security/threat-intelligence warnings detected" : "",
    officialLinkMismatch ? "Official-link integrity warning detected" : "",
    actionSafetyCritical ? "High-risk user action detected" : "",
    !actionSafetyCritical && actionSafetyMedium ? "Wallet/transaction action requires caution" : "",
    suspiciousProvidedLinks.length ? "Suspicious claim/airdrop-style link pattern detected" : "",
    brandImpersonationEvidence.length && isEstablishedProject ? "Brand impersonation/fake claim risk detected" : "",
    speculativeOnly ? "Airdrop opportunity appears speculative rather than confirmed" : "",
    negativeOpportunitySignals > 0 ? "Unconfirmed/ended/snapshot/claim-risk opportunity signals detected" : "",
    watchlistTriggers.length ? `Watchlist triggers: ${watchlistTriggers.slice(0, 3).join("; ")}` : "",
    timelineProfile.watchEventCount ? `Timeline watch items: ${timelineProfile.events.filter(e => e.type === "exploit" || e.label.includes("No official")).slice(0, 3).map(e => e.label).join("; ")}` : "",
    advancedProfile.risks.length ? `AGIE v16 risks: ${advancedProfile.risks.slice(0, 3).join("; ")}` : "",
    ...missing.slice(0, 3),
  ].filter(Boolean) as string[];
  const reasons = uniq([...positiveReasons.slice(0, 6), ...negativeReasons.slice(0, 5)]).slice(0, 12);
  const combinedWarnings = uniq([...criticalFlags, ...scamWarnings, ...brandRiskWarnings]).slice(0, 12);

  return {
    trust_score: final_score,
    opportunity_score,
    confidence_score,
    confidence_level,
    risk_level,
    reward_potential,
    difficulty,
    ai_recommendation,
    trust_label,
    reasons,
    scam_warnings: combinedWarnings,
    missing_information: uniq(missing).slice(0, 10),
    sources_checked: [],
    recommended_admin_action: [
      ai_recommendation === "blacklist"
        ? "Do not publish until manually reviewed. Check official channels, contract safety and scam evidence."
        : ai_recommendation === "verify"
        ? "Eligible for human verification and publication if admin review confirms sources."
        : isEstablishedProject
        ? "Project appears legitimate, but airdrop opportunity needs manual review. Verify official token/claim information before promoting."
        : "Needs manual review. Fill missing information and verify sources before publishing.",
      `Final score ${final_score}/100 (${finalVerdict}).`,
      `AGIE v15 priority: ${asHumanLabel(adminPriority)}.`,
      nextBestActions.length ? `Next actions: ${nextBestActions.join(" | ")}` : "",
      advancedProfile.adminFocus.length ? `AGIE v16 focus: ${advancedProfile.adminFocus.join(" | ")}` : "",
      `AGIE v17 timeline: ${timelineProfile.adminInsight}`,
    ].filter(Boolean).join(" "),
    confidence_explanation: `${confidence_level} confidence (${confidenceBand(confidence_score)}) based on ${sourceQuality} trusted/official search sources, ${apiHits} API source hits, source consensus ${consensusScore}/16, ${threatIntelEvidence.length} threat-intelligence signal(s), ${missing.length} missing data point(s), ${watchlistTriggers.length} watchlist trigger(s), action safety ${actionSafetyCritical ? "critical" : actionSafetyMedium ? "caution" : "normal"}, user verdict "${userVerdict}", and ${evidenceProfile.explanation}. AGIE v16 intelligence collector: ${advancedProfile.userSummary} Reputation ${advancedProfile.reputationScore}/100, security ${advancedProfile.securityScore}/100, community ${advancedProfile.communityScore}/100, opportunity quality ${advancedProfile.opportunityQualityScore}/100, evidence depth ${advancedProfile.evidenceDepthScore}/100. AGIE v17 timeline: ${timelineProfile.summary}; ${timelineProfile.userInsight}`,
    breakdown,
  };
}

function buildOpportunityIntelligenceFallback(args: {
  airdrop: Record<string, unknown>;
  score: IntelligenceScore;
  web: WebEnrichmentData;
  github: GitHubData;
  cg: CoinGeckoData;
  llama: DefiLlamaData;
  evidence: SourceEvidence[];
}): OpportunityIntelligenceReport {
  const { airdrop, score, web, github, cg, llama, evidence } = args;
  const categoryList = Array.isArray(airdrop.category) ? airdrop.category.map((c) => safeString(c)).filter(Boolean) : [];
  const categoryText = categoryList.join(", ") || "General";

  const opportunityRating: OpportunityRating =
    score.opportunity_score >= 75 ? "Strong" :
    score.opportunity_score >= 55 ? "Promising" :
    score.opportunity_score >= 35 ? "Speculative" : "Avoid";

  const skillLevel: SkillLevel =
    score.difficulty === "Hard" ? "Advanced" : score.difficulty === "Moderate" ? "Intermediate" : "Beginner";

  const longTermValue: LongTermValueLikelihood =
    (score.breakdown.v16_reputation_score ?? 0) >= 75 && (score.breakdown.v16_evidence_depth_score ?? 0) >= 65
      ? "High"
      : (score.breakdown.v16_reputation_score ?? 0) >= 55
      ? "Medium"
      : "Low";

  const positiveSignals = uniq([
    score.breakdown.v16_reputation_score ? `Reputation score ${score.breakdown.v16_reputation_score}/100` : "",
    web.docs_url ? "Official documentation available" : "",
    github.found && (github.recentCommits30d ?? 0) > 0 ? `GitHub active with ${(github.recentCommits30d ?? 0)} commits in 30d` : "",
    cg.found ? "Token market profile detected" : "",
    llama.found ? `On-chain adoption evidence detected (${fmt(llama.tvl)} TVL)` : "",
    (score.breakdown.opportunity_active_campaign_signals ?? 0) > 0 ? "Live campaign or quest signals detected" : "",
    (score.breakdown.v17_timeline_event_count ?? 0) > 0 ? `Timeline evidence includes ${score.breakdown.v17_timeline_event_count} milestones` : "",
  ].filter(Boolean)).slice(0, 6);

  const warningSignals = uniq([
    ...score.scam_warnings,
    ...(score.missing_information ?? []).slice(0, 3),
    score.breakdown.opportunity_negative_signals ? "Some opportunity signals are speculative or unconfirmed" : "",
    score.breakdown.v14_official_link_mismatch ? "Official-link mismatch requires manual verification" : "",
    score.breakdown.v14_action_safety_critical ? "Critical wallet-action safety risk identified" : "",
  ].filter(Boolean)).slice(0, 6);

  const potentialText = safeString(airdrop.estimated_reward)
    ? `${score.reward_potential} (${safeString(airdrop.estimated_reward)})`
    : score.reward_potential;

  const explanation = `This opportunity scores ${score.trust_score}/100 overall because project quality, opportunity evidence, risk profile, execution effort and confidence were weighted together. Key positives include ${positiveSignals.slice(0, 3).join(", ") || "available public signals"}. Main constraints are ${warningSignals.slice(0, 3).join(", ") || "limited verification depth"}.`;

  const trustedEvidenceCount = evidence.filter((e) => e.tier === "official" || e.tier === "primary" || e.tier === "trusted").length;

  return {
    overall_intelligence_score: clamp(score.breakdown.v16_overall_intelligence_score, score.trust_score),
    confidence: score.confidence_score,
    opportunity_rating: opportunityRating,
    risk_rating: score.risk_level,
    difficulty: score.difficulty,
    time_required: safeString(airdrop.time_required) || "Currently unavailable.",
    estimated_potential: potentialText,
    why_this_opportunity_matters: `${safeString(airdrop.name) || "This project"} is categorized as ${categoryText} with ${score.opportunity_score}/100 opportunity strength and ${score.confidence_score}/100 confidence from available evidence.`,
    positive_signals: positiveSignals.length ? positiveSignals : ["Currently unavailable."],
    warning_signals: warningSignals.length ? warningSignals : ["Currently unavailable."],
    who_this_is_suitable_for: score.difficulty === "Easy"
      ? "Users seeking lower-friction opportunities with manageable execution risk."
      : score.difficulty === "Moderate"
      ? "Users comfortable with recurring tasks and medium due diligence."
      : "Advanced users who can verify links/contracts and manage higher complexity.",
    who_should_avoid_it: score.risk_level === "High"
      ? "Users with low risk tolerance or limited verification experience should avoid this until signals improve."
      : "Users unable to verify official sources, contracts and timelines independently.",
    estimated_time_commitment: safeString(airdrop.time_required) || "Currently unavailable.",
    expected_skill_level: skillLevel,
    likelihood_of_long_term_value: longTermValue,
    explanation,
    discovery_signals: {
      project_age: score.breakdown.v17_timeline_event_count ? `${score.breakdown.v17_timeline_event_count} timeline event(s) detected` : "Currently unavailable.",
      funding: safeString(airdrop.funding_info) || "Currently unavailable.",
      investors: safeString(airdrop.investors) || "Currently unavailable.",
      github_activity: github.found ? `${github.recentCommits30d ?? 0} commits in last 30d` : "Currently unavailable.",
      documentation: web.docs_url ? "Official docs found" : "Currently unavailable.",
      website_quality: web.website_accessible ? "Official website accessible" : "Currently unavailable.",
      community_size: cg.twitterFollowers ? `${cg.twitterFollowers.toLocaleString()} social followers` : "Currently unavailable.",
      contract_analysis: score.breakdown.contract ? `Contract signal score ${score.breakdown.contract}/100` : "Currently unavailable.",
      onchain_metrics: llama.found ? `TVL ${fmt(llama.tvl)}` : "Currently unavailable.",
      wallet_intelligence: score.breakdown.risk_level_score ? `Risk model ${score.breakdown.risk_level_score}/100` : "Currently unavailable.",
      previous_campaigns: (score.breakdown.opportunity_active_campaign_signals ?? 0) > 0 ? "Prior/active campaign signals detected" : "Currently unavailable.",
      competitor_watch: trustedEvidenceCount > 0 ? `${trustedEvidenceCount} trusted/official discovery source(s) checked` : "Currently unavailable.",
    },
  };
}

function buildNarrativePrompt(args: {
  project: Record<string, unknown>;
  taskCount: number;
  dex: DexData;
  goplus: GoPlusData;
  github: GitHubData;
  cg: CoinGeckoData;
  llama: DefiLlamaData;
  web: WebEnrichmentData;
  enrichment: EnrichmentProfile;
  score: IntelligenceScore;
  evidence: SourceEvidence[];
}): string {
  const { project, taskCount, dex, goplus, github, cg, llama, web, enrichment, score, evidence } = args;
  const evidenceLines = evidence.slice(0, 18).map(e => `- [${e.tier}] ${e.title} — ${e.url}${e.snippet ? ` — ${e.snippet.slice(0, 180)}` : ""}`);
  const dataLines: string[] = [
    `PROJECT: ${project.name ?? project.project_name} (${project.ticker || project.token_symbol || "pre-token"})`,
    `Chains: ${Array.isArray(project.blockchain) ? (project.blockchain as string[]).join("/") : project.blockchain ?? "Unknown"}`,
    `Categories: ${Array.isArray(project.category) ? (project.category as string[]).join(", ") : project.category ?? "Unknown"}`,
    `Status: ${project.status ?? "Unknown"} | Tasks: ${taskCount}`,
    `Trust Score: ${score.trust_score}/100 | Opportunity Score: ${score.opportunity_score}/100 | Risk: ${score.risk_level} | Confidence: ${score.confidence_score}/100`,
    `Score reasons: ${score.reasons.join("; ")}`,
    score.scam_warnings.length ? `Scam warnings: ${score.scam_warnings.join("; ")}` : "Scam warnings: none detected from available sources",
    score.missing_information.length ? `Missing information: ${score.missing_information.join("; ")}` : "Missing information: none major",
    `Threat intelligence: ${score.breakdown.threat_intelligence ?? 0} penalty, brand impersonation risk ${score.breakdown.brand_impersonation_risk ?? 0}, active campaign signals ${score.breakdown.opportunity_active_campaign_signals ?? 0}`,
    `AGIE v15: watchlist triggers ${score.breakdown.v15_watchlist_triggers ?? 0}, admin priority score ${score.breakdown.v15_admin_priority ?? 0}, user verdict score ${score.breakdown.v15_user_verdict_score ?? 0}`,
    `AGIE v16 Intelligence Collector: reputation ${score.breakdown.v16_reputation_score ?? 0}/100, security ${score.breakdown.v16_security_score ?? 0}/100, community ${score.breakdown.v16_community_score ?? 0}/100, opportunity quality ${score.breakdown.v16_opportunity_quality_score ?? 0}/100, evidence depth ${score.breakdown.v16_evidence_depth_score ?? 0}/100`,
    `AGIE v17 Project Timeline: timeline score ${score.breakdown.v17_timeline_score ?? 0}/100, maturity momentum ${score.breakdown.v17_maturity_momentum_score ?? 0}/100, events ${score.breakdown.v17_timeline_event_count ?? 0}, high-confidence events ${score.breakdown.v17_confirmed_timeline_events ?? 0}, watch items ${score.breakdown.v17_timeline_watch_items ?? 0}`,
  ];
  if (cg.found) dataLines.push(`CoinGecko: ${cg.coinId}, verified=${cg.verifiedMatch ? "yes" : "no"}, matchedBy=${cg.matchedBy ?? "unknown"}, MCap ${fmt(cg.marketCap)}, 24h ${cg.priceChange24h?.toFixed?.(1)}%, Twitter ${(cg.twitterFollowers ?? 0).toLocaleString()}`);
  if (dex.found) dataLines.push(`DexScreener: price $${dex.price}, liquidity $${dex.liquidity}, volume $${dex.volume24h}/24h, ${dex.dexName}`);
  if (llama.found) dataLines.push(`DefiLlama: TVL ${fmt(llama.tvl)}, category ${llama.category}, chains ${llama.chains?.join(", ")}`);
  if (github.found) dataLines.push(`GitHub: ${github.stars} stars, ${github.recentCommits30d} commits/30d, pushed ${github.lastPushDaysAgo}d ago, archived=${github.archived}`);
  if (goplus.found) dataLines.push(`GoPlus: honeypot=${goplus.is_honeypot}, open_source=${goplus.is_open_source}, buy_tax=${goplus.buy_tax}, sell_tax=${goplus.sell_tax}, holders=${goplus.holder_count}`);
  if (web.found) dataLines.push(`Website: docs=${web.docs_url ?? "not found"}, github=${web.github_link ?? "not found"}, investors=${web.known_investors?.join(", ") ?? "not found"}`);
  dataLines.push(
    `Enrichment v${enrichment.version}: website=${enrichment.fields.official_website.canonical_url.value}, docs=${enrichment.fields.documentation.docs.value}, github=${enrichment.fields.github.repository_url.value}, team=${enrichment.fields.team.visibility.value}, investors=${enrichment.fields.funding_investors.investors.value}`,
  );

  return [
    "You are AirdropGuard's senior crypto threat intelligence analyst.",
    "Use ONLY the evidence provided. Do not invent funding, token contracts, partnerships, audits or airdrop guarantees.",
    "Always separate project legitimacy from airdrop opportunity. A trusted established project can still have a low Opportunity Score if no official airdrop, campaign, token, snapshot or tasks are confirmed.",
    "Separate brand impersonation/phishing campaigns from project legitimacy. A major legitimate brand can have high Trust but still carry phishing or fake-claim threat warnings.",
    "Be concise, factual, and protective of users. Avoid financial advice.",
    "If evidence is weak or conflicting, say so clearly.",
    "Use the AGIE v17 timeline signals to explain project maturity, momentum and key watch items without inventing dates.",
    "",
    "STRUCTURED DATA",
    dataLines.join("\n"),
    "",
    "SEARCH EVIDENCE",
    evidenceLines.join("\n") || "No search evidence available.",
    "",
    "Return ONLY valid JSON with this exact shape:",
    "{",
    '  "ai_summary": "Max 45 words. What the project is and why it matters.",',
    '  "ai_risk_analysis": "Max 80 words. Specific risks, scam signals, missing evidence, or contract/community concerns.",',
    '  "ai_reward_estimate": "Max 35 words. Reward potential and effort, with no guarantee language.",',
    '  "overview": "Max 70 words. Project use case, ecosystem and maturity.",',
    '  "why_airdrop": "Max 55 words. Why this may or may not be worth farming, based on evidence.",',
    '  "opportunity_intelligence": {',
    '    "overall_intelligence_score": 0,',
    '    "confidence": 0,',
    '    "opportunity_rating": "Strong|Promising|Speculative|Avoid",',
    '    "risk_rating": "Low|Medium|High",',
    '    "difficulty": "Easy|Moderate|Hard",',
    '    "time_required": "Short phrase",',
    '    "estimated_potential": "Short phrase with evidence context",',
    '    "why_this_opportunity_matters": "Analyst-grade explanation.",',
    '    "positive_signals": ["signal 1", "signal 2"],',
    '    "warning_signals": ["risk 1", "risk 2"],',
    '    "who_this_is_suitable_for": "Specific user profile.",',
    '    "who_should_avoid_it": "Specific user profile.",',
    '    "estimated_time_commitment": "Realistic estimate.",',
    '    "expected_skill_level": "Beginner|Intermediate|Advanced",',
    '    "likelihood_of_long_term_value": "High|Medium|Low",',
    '    "explanation": "Never only a score. Explain why with concrete evidence and caveats.",',
    '    "discovery_signals": {',
    '      "project_age": "text",',
    '      "funding": "text",',
    '      "investors": "text",',
    '      "github_activity": "text",',
    '      "documentation": "text",',
    '      "website_quality": "text",',
    '      "community_size": "text",',
    '      "contract_analysis": "text",',
    '      "onchain_metrics": "text",',
    '      "wallet_intelligence": "text",',
    '      "previous_campaigns": "text",',
    '      "competitor_watch": "text"',
    '    }',
    '  }',
    "}",
  ].join("\n");
}

async function callOpenAIJson(prompt: string, maxTokens = 1200, temperature = 0.2): Promise<Record<string, unknown>> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature,
      max_tokens: maxTokens,
    }),
  });
  if (!openaiRes.ok) throw new Error(`OpenAI error: ${await openaiRes.text()}`);
  const openaiData = await openaiRes.json();
  return parseJsonObject(openaiData.choices?.[0]?.message?.content ?? "{}");
}


// ─── Auto-population helpers ─────────────────────────────────────────────────

function firstTrustedEvidenceUrl(evidence: SourceEvidence[], checks: ((url: string, text: string) => boolean)[]): string | undefined {
  for (const e of evidence) {
    const combined = `${e.title} ${e.snippet ?? ""}`.toLowerCase();
    const url = e.url.toLowerCase();
    if ((e.tier === "official" || e.tier === "primary" || e.tier === "trusted") && checks.some(c => c(url, combined))) {
      return e.url;
    }
  }
  return undefined;
}

function extractFundingSummary(evidence: SourceEvidence[], web: WebEnrichmentData): string | null {
  if (web.funding_mentions?.length || web.known_investors?.length) {
    const parts = [];
    if (web.funding_mentions?.length) parts.push(`Funding references detected: ${web.funding_mentions.slice(0, 3).join(", ")}`);
    if (web.known_investors?.length) parts.push(`Known investors mentioned: ${web.known_investors.slice(0, 5).join(", ")}`);
    return parts.join(". ");
  }
  const hit = evidence.find(e =>
    (e.tier === "trusted" || e.tier === "official" || e.tier === "primary") &&
    /funding|raised|investor|backed by|series|seed round|venture/i.test(`${e.title} ${e.snippet ?? ""}`)
  );
  return hit ? `${hit.title}${hit.snippet ? ` — ${hit.snippet}` : ""}`.slice(0, 350) : null;
}

function deriveAutofillUpdates(
  airdrop: Record<string, unknown>,
  web: WebEnrichmentData,
  evidence: SourceEvidence[],
  cg: CoinGeckoData,
  llama: DefiLlamaData,
): Record<string, unknown> {
  const updates: Record<string, unknown> = {};

  const canonicalWebsite = web.website_canonical_url ?? web.website_redirect_url;

  const docs = web.docs_url ?? firstTrustedEvidenceUrl(evidence, [
    (url, text) => url.includes("/docs") || url.includes("docs.") || url.includes("gitbook") || text.includes("documentation"),
  ]);
  const github = web.github_link ?? firstTrustedEvidenceUrl(evidence, [(url) => url.includes("github.com/")]);
  const xUrl = web.x_url ?? firstTrustedEvidenceUrl(evidence, [(url) => url.includes("x.com/") || url.includes("twitter.com/")]);
  const discord = web.discord_url ?? firstTrustedEvidenceUrl(evidence, [(url) => url.includes("discord.gg") || url.includes("discord.com/invite")]);
  const telegram = web.telegram_url ?? firstTrustedEvidenceUrl(evidence, [(url) => url.includes("t.me/")]);
  const audit = web.audit_url ?? firstTrustedEvidenceUrl(evidence, [(url, text) => /audit|certik|hacken|trailofbits|openzeppelin|slowmist/i.test(`${url} ${text}`)]);
  const funding = extractFundingSummary(evidence, web);

  if (canonicalWebsite && !safeString(airdrop.website_url)) updates.website_url = canonicalWebsite;
  if (docs && !safeString(airdrop.docs_url)) updates.docs_url = docs;
  if (github && !safeString(airdrop.github_url)) updates.github_url = github;
  if (xUrl && !safeString(airdrop.twitter_url)) updates.twitter_url = xUrl;
  if (discord && !safeString(airdrop.discord_url)) updates.discord_url = discord;
  if (telegram && !safeString(airdrop.telegram_url)) updates.telegram_url = telegram;
  if (funding && !safeString(airdrop.funding_info)) updates.funding_info = funding;
  if (web.known_investors?.length && !safeString(airdrop.investors)) updates.investors = web.known_investors.join(", ");
  if (web.has_team_info && !safeString(airdrop.team_info)) updates.team_info = "Team information detected on official/public sources. Manual verification recommended.";

  const sourceNotes = [];
  if (docs) sourceNotes.push("docs detected");
  if (github) sourceNotes.push("GitHub detected");
  if (funding) sourceNotes.push("funding detected");
  if (cg.found && cg.verifiedMatch) sourceNotes.push(`verified CoinGecko match: ${cg.coinId}`);
  if (llama.found) sourceNotes.push(`DefiLlama TVL found: ${fmt(llama.tvl)}`);
  if (audit) sourceNotes.push("audit/security reference detected");
  if (sourceNotes.length && !safeString(airdrop.source)) updates.source = "ai_enriched";

  return updates;
}

function buildSuggestedTasks(airdrop: Record<string, unknown>, web: WebEnrichmentData): Array<{ title: string; description: string; sort_order: number }> {
  const name = safeString(airdrop.name) || "project";
  const tasks: Array<{ title: string; description: string; sort_order: number }> = [];
  const add = (title: string, description: string) => tasks.push({ title, description, sort_order: tasks.length });

  if (safeString(airdrop.website_url)) add(`Visit the official ${name} website`, "Confirm you are using the official website before taking any action.");
  if (web.docs_url || safeString(airdrop.docs_url)) add("Read the official documentation", "Review docs, eligibility guidance and any official airdrop or points information.");
  if (web.x_url || safeString(airdrop.twitter_url)) add("Follow the official X account", "Only use the official social link shown on AirdropGuard.");
  if (web.discord_url || safeString(airdrop.discord_url)) add("Join the official Discord", "Watch announcements and beware of fake DM claim links.");
  if (web.telegram_url || safeString(airdrop.telegram_url)) add("Join the official Telegram", "Confirm the channel is official and avoid unofficial claim bots.");

  const categoryText = `${(airdrop.category as string[] | undefined)?.join(" ") ?? ""} ${safeString(airdrop.ai_summary)} ${safeString(airdrop.overview)}`.toLowerCase();
  if (/testnet|layer 1|layer 2|zk|infrastructure|bridge|defi/.test(categoryText)) {
    add("Check for testnet, points or campaign tasks", "Look for official quests, testnet actions, points systems or campaign pages.");
  }
  if (/nft|marketplace|gaming|social/.test(categoryText)) {
    add("Complete one meaningful product action", "Use the product naturally if official tasks exist. Do not connect to unknown claim links.");
  }

  if (tasks.length === 0) {
    add(`Review ${name} official links`, "Check website, socials and documentation before participating.");
    add("Monitor for official campaign announcements", "Do not trust unofficial airdrop claims or mirror websites.");
  }
  return tasks.slice(0, 6);
}

async function insertSuggestedTasksIfMissing(
  supabase: ReturnType<typeof createClient>,
  airdropId: string,
  airdrop: Record<string, unknown>,
  web: WebEnrichmentData,
  taskCount: number,
): Promise<number> {
  if (taskCount > 0) return 0;
  const rows = buildSuggestedTasks(airdrop, web).map(t => ({
    airdrop_id: airdropId,
    title: t.title,
    description: t.description,
    sort_order: t.sort_order,
  }));
  if (!rows.length) return 0;
  const { error } = await supabase.from("airdrop_tasks").insert(rows);
  if (error) return 0;
  return rows.length;
}

// ─── Database update helpers ─────────────────────────────────────────────────

async function safeUpdateAirdrop(supabase: ReturnType<typeof createClient>, id: string, fullPayload: Record<string, unknown>) {
  const { error } = await supabase.from("airdrops").update(fullPayload).eq("id", id);
  if (!error) return;

  // Fallback for projects that have not yet added all Intelligence Engine columns.
  const basicKeys = [
    "ai_summary", "ai_risk_analysis", "ai_reward_estimate", "overview", "why_airdrop",
    "trust_score", "trust_label", "score_reasons", "sub_scores", "risk_level", "reward_potential",
    "difficulty", "last_analyzed_at", "updated_at", "github_url", "docs_url", "twitter_url", "discord_url", "telegram_url", "funding_info", "investors", "team_info", "source", "listing_state", "blacklist_reason",
    "opportunity_intelligence", "ai_reasoning", "final_published_score",
  ];
  const fallback: Record<string, unknown> = {};
  for (const key of basicKeys) if (key in fullPayload) fallback[key] = fullPayload[key];
  const retry = await supabase.from("airdrops").update(fallback).eq("id", id);
  if (retry.error) throw retry.error;
}

// ─── Main airdrop analysis handler ────────────────────────────────────────────

async function handleAirdropAnalysis(airdrop_id: string, force: boolean, supabase: ReturnType<typeof createClient>): Promise<Response> {
  const { data: airdrop, error: fetchError } = await supabase
    .from("airdrops")
    .select("*")
    .eq("id", airdrop_id)
    .single();

  if (fetchError || !airdrop) return jsonResponse({ error: "Airdrop not found" }, 404);

  if (!force && airdrop.ai_summary && airdrop.last_analyzed_at) {
    const ageDays = (Date.now() - new Date(airdrop.last_analyzed_at).getTime()) / 86400000;
    if (ageDays < CACHE_TTL_DAYS) return jsonResponse({ success: true, cached: true, age_days: Math.floor(ageDays) });
  }

  const enrichmentCacheKey = buildEnrichmentCacheKey(airdrop as Record<string, unknown>);
  const cachedEnrichment = parseEnrichmentProfile(airdrop.enrichment_profile);
  const canUseCachedEnrichment =
    cachedEnrichment &&
    cachedEnrichment.cache_key === enrichmentCacheKey &&
    isEnrichmentFresh(cachedEnrichment);

  const projectHost = hostname(safeString(airdrop.website_url));
  const queries = buildSearchQueries(airdrop as Record<string, unknown>);

  const cachedWeb = canUseCachedEnrichment ? cachedEnrichment.snapshots.web : null;
  const cachedGithub = canUseCachedEnrichment ? cachedEnrichment.snapshots.github : null;

  const [dexData, goplusData, githubDataInit, cgData, llamaData, webData, searchResults] = await Promise.all([
    fetchDexScreener(safeString(airdrop.name), safeString(airdrop.ticker)),
    fetchGoPlus(safeString(airdrop.contract_address), Array.isArray(airdrop.blockchain) ? airdrop.blockchain : []),
    cachedGithub ? Promise.resolve(cachedGithub) : fetchGitHub(safeString(airdrop.github_url)),
    fetchCoinGecko(safeString(airdrop.name), safeString(airdrop.ticker), safeString(airdrop.website_url), safeString(airdrop.contract_address)),
    fetchDefiLlama(safeString(airdrop.name)),
    cachedWeb ? Promise.resolve(cachedWeb) : fetchWebEnrichment(safeString(airdrop.website_url)),
    runSearchQueries(queries),
  ]);

  let githubData = githubDataInit;
  if (!githubData.found) {
    const fallbackUrl = webData.github_link ?? extractFromAirdropFields(airdrop as Record<string, unknown>).discoveredGitHubUrl;
    if (fallbackUrl) {
      githubData = await fetchGitHub(fallbackUrl);
      if (githubData.found && !airdrop.github_url) (airdrop as Record<string, unknown>).github_url = fallbackUrl;
    }
  }

  const evidence = searchResultsToEvidence(searchResults, projectHost);
  const pages = await fetchEvidencePages(searchResults, projectHost);

  const { count: taskCount } = await supabase
    .from("airdrop_tasks")
    .select("id", { count: "exact", head: true })
    .eq("airdrop_id", airdrop_id);

  const apiSources = [
    cgData.found ? `CoinGecko: ${cgData.coinId} (${cgData.matchedBy ?? "verified"})` : `CoinGecko: not_verified${cgData.note ? ` - ${cgData.note}` : ""}`,
    llamaData.found ? `DefiLlama: TVL ${fmt(llamaData.tvl)}` : "DefiLlama: not_found",
    dexData.found ? `DexScreener: ${dexData.pairUrl ?? "live"}` : "DexScreener: not_found",
    goplusData.found ? "GoPlus: contract_scanned" : "GoPlus: not_available",
    githubData.found ? `GitHub: ${githubData.repoUrl ?? "live"}` : "GitHub: not_available",
    webData.found ? `Website: ${airdrop.website_url}` : "Website: not_available",
    searchResults.length ? `Search: ${searchResults.length} result(s)` : "Search: no_results_or_no_key",
  ];

  const score = computeIntelligenceScore({
    airdrop: airdrop as Record<string, unknown>,
    taskCount: taskCount ?? 0,
    github: githubData,
    web: webData,
    cg: cgData,
    dex: dexData,
    goplus: goplusData,
    llama: llamaData,
    evidence,
    pages,
  });
  score.sources_checked = buildSourceList(evidence, pages, apiSources);

  const suggestedTasksInserted = await insertSuggestedTasksIfMissing(
    supabase,
    airdrop_id,
    airdrop as Record<string, unknown>,
    webData,
    taskCount ?? 0,
  );

  if (suggestedTasksInserted > 0) {
    score.reasons = uniq([`Auto-created ${suggestedTasksInserted} starter task(s) from official/public signals`, ...score.reasons]).slice(0, 10);
    score.sources_checked = uniq([...score.sources_checked, `AirdropGuard: ${suggestedTasksInserted} starter task(s) suggested`]);
  }

  const fallbackOpportunityIntelligence = buildOpportunityIntelligenceFallback({
    airdrop: airdrop as Record<string, unknown>,
    score,
    web: webData,
    github: githubData,
    cg: cgData,
    llama: llamaData,
    evidence,
  });

  const narrativeRaw = await callOpenAIJson(buildNarrativePrompt({
    project: airdrop as Record<string, unknown>,
    taskCount: taskCount ?? 0,
    dex: dexData,
    goplus: goplusData,
    github: githubData,
    cg: cgData,
    llama: llamaData,
    web: webData,
    enrichment: buildEnrichmentProfile({
      airdrop: airdrop as Record<string, unknown>,
      web: webData,
      github: githubData,
      goplus: goplusData,
      cacheKey: enrichmentCacheKey,
    }),
    score,
    evidence,
  }));

  const narrative: AiNarrative = {
    ai_summary: safeString(narrativeRaw.ai_summary),
    ai_risk_analysis: safeString(narrativeRaw.ai_risk_analysis),
    ai_reward_estimate: safeString(narrativeRaw.ai_reward_estimate),
    overview: safeString(narrativeRaw.overview),
    why_airdrop: safeString(narrativeRaw.why_airdrop),
    opportunity_intelligence: normalizeOpportunityIntelligenceReport(
      narrativeRaw.opportunity_intelligence,
      fallbackOpportunityIntelligence,
    ),
  };

  const now = new Date().toISOString();
  const enrichmentProfile = buildEnrichmentProfile({
    airdrop: airdrop as Record<string, unknown>,
    web: webData,
    github: githubData,
    goplus: goplusData,
    cacheKey: enrichmentCacheKey,
  });

  if (!webData.found) enrichmentProfile.failures.push("Official website fetch failed or unavailable");
  if (!githubData.found) enrichmentProfile.failures.push("GitHub repository not detected");
  if (!searchResults.length) enrichmentProfile.failures.push("Search results unavailable");

  const recommendationOverride = safeString(airdrop.ai_recommendation_override);
  const effectiveRecommendation: Recommendation =
    recommendationOverride === "verify" || recommendationOverride === "review_further" || recommendationOverride === "blacklist"
      ? recommendationOverride
      : score.ai_recommendation;

  const humanOverrideScore = typeof airdrop.human_override_score === "number"
    ? clampOrFallback(airdrop.human_override_score, score.trust_score)
    : null;

  const finalPublishedScore = humanOverrideScore ?? score.trust_score;

  const updatePayload: Record<string, unknown> = {
    ai_summary: narrative.ai_summary,
    ai_risk_analysis: narrative.ai_risk_analysis,
    ai_reward_estimate: narrative.ai_reward_estimate,
    overview: narrative.overview,
    why_airdrop: narrative.why_airdrop,
    trust_score: score.trust_score,
    opportunity_score: score.opportunity_score,
    confidence_score: score.confidence_score,
    confidence_level: score.confidence_level,
    confidence_explanation: score.confidence_explanation,
    recommended_admin_action: score.recommended_admin_action,
    risk_level: score.risk_level,
    reward_potential: score.reward_potential,
    difficulty: score.difficulty,
    trust_label: score.trust_label,
    score_reasons: score.reasons,
    scam_warnings: score.scam_warnings,
    missing_information: score.missing_information,
    sources_checked: score.sources_checked,
    opportunity_intelligence: narrative.opportunity_intelligence,
    ai_reasoning: {
      reasons: score.reasons,
      confidence_explanation: score.confidence_explanation,
      recommended_admin_action: score.recommended_admin_action,
      explanation: narrative.opportunity_intelligence?.explanation ?? fallbackOpportunityIntelligence.explanation,
    },
    final_published_score: finalPublishedScore,
    sub_scores: score.breakdown,
    enrichment_profile: enrichmentProfile,
    last_analyzed_at: now,
    updated_at: now,
  };

  // Safety: AI can recommend but should not publish automatically.
  if (effectiveRecommendation === "blacklist") {
    updatePayload.listing_state = "under_review";
    updatePayload.blacklist_reason = score.scam_warnings.join(" | ") || "High-risk intelligence signals detected. Manual review required.";
  } else if (effectiveRecommendation === "review_further") {
    updatePayload.listing_state = "under_review";
  }

  const autoFillUpdates = deriveAutofillUpdates(airdrop as Record<string, unknown>, webData, evidence, cgData, llamaData);
  Object.assign(updatePayload, autoFillUpdates);

  await safeUpdateAirdrop(supabase, airdrop_id, updatePayload);

  return jsonResponse({
    success: true,
    cached: false,
    enrichment_cached: canUseCachedEnrichment,
    ai_recommendation: effectiveRecommendation,
    trust_score: score.trust_score,
    opportunity_score: score.opportunity_score,
    risk_level: score.risk_level,
    confidence_score: score.confidence_score,
    confidence_level: score.confidence_level,
    opportunity_intelligence: narrative.opportunity_intelligence,
    final_published_score: finalPublishedScore,
    scam_warnings: score.scam_warnings,
    missing_information: score.missing_information,
    sources_checked: score.sources_checked,
    data_sources: {
      coingecko: cgData.found ? cgData.coinId : "not_found",
      defillama: llamaData.found ? `TVL ${fmt(llamaData.tvl)}` : "not_found",
      dex: dexData.found ? "live" : "not_found",
      contract: goplusData.found ? "scanned" : "not_available",
      github: githubData.found ? "live" : "not_available",
      web: webData.found ? "scraped" : "not_available",
      search: searchResults.length ? `${searchResults.length} result(s)` : "not_available",
    },
    enrichment_stats: {
      websites_analyzed: webData.found ? 1 : 0,
      docs_found: webData.docs_url || airdrop.docs_url ? 1 : 0,
      funding_found: (webData.funding_mentions?.length ?? 0) > 0 || !!airdrop.funding_info ? 1 : 0,
      github_found: (githubData.found || !!webData.github_link) ? 1 : 0,
      token_detected: (cgData.found || dexData.found || webData.token_mentioned) ? 1 : 0,
      investors_found: (webData.known_investors?.length ?? 0) > 0 || !!airdrop.investors ? 1 : 0,
      search_results: searchResults.length,
      risk_results: evidence.filter(e => (e.riskTerms?.length ?? 0) > 0).length,
    },
  });
}

// ─── Submission analysis ──────────────────────────────────────────────────────

function buildSubmissionPrompt(sub: Record<string, unknown>, goplus: GoPlusData, github: GitHubData, tokenAddrValid: { valid: boolean; reason?: string }, evidence: SourceEvidence[]): string {
  const riskFlags: string[] = [];
  if (sub.requires_seed_phrase) riskFlags.push("REQUIRES SEED PHRASE [CRITICAL — automatic blacklist]");
  if (sub.requires_payment) riskFlags.push("REQUIRES PAYMENT TO PARTICIPATE [HIGH RISK]");
  if (sub.requires_transaction) riskFlags.push("Requires on-chain transaction");
  if (sub.requires_wallet_connection) riskFlags.push("Requires wallet connection");
  const evidenceLines = evidence.slice(0, 12).map(e => `- [${e.tier}] ${e.title} — ${e.url}${e.snippet ? ` — ${e.snippet.slice(0, 160)}` : ""}`);

  return [
    "You are AirdropGuard's crypto scam submission analyst.",
    "Be skeptical. Protect users. Use only provided evidence. Return JSON only.",
    "",
    `Project: ${sub.project_name}`,
    `Website: ${sub.website_url ?? "NOT PROVIDED"}`,
    `Blockchain: ${sub.blockchain ?? "Unknown"}`,
    `Category: ${sub.category ?? "Unknown"}`,
    `Description: ${sub.description ?? "None"}`,
    `Team: ${sub.team_info ?? "None"}`,
    `Funding/Investors: ${sub.funding_investors ?? "None"}`,
    `Docs/Whitepaper: ${sub.whitepaper_url ?? "None"}`,
    `Audit: ${sub.audit_url ?? "None"}`,
    `GitHub: ${github.found ? `${github.stars} stars, ${github.recentCommits30d} commits/30d, pushed ${github.lastPushDaysAgo}d ago` : "not found"}`,
    `Token Address: ${sub.token_address ?? "not provided"}`,
    `Token Address Valid: ${tokenAddrValid.valid ? "YES" : "NO - " + tokenAddrValid.reason}`,
    `GoPlus: ${goplus.found ? JSON.stringify(goplus) : "not available"}`,
    `Self-reported risk flags: ${riskFlags.length ? riskFlags.join("; ") : "none"}`,
    "",
    "Search evidence:",
    evidenceLines.join("\n") || "No search evidence available.",
    "",
    "Rules:",
    "- blacklist if seed phrase required, confirmed honeypot, wallet drainer evidence, or trust_score < 20.",
    "- review_further if payment required, suspicious contract, missing team/docs, or conflicting evidence.",
    "- verify only if evidence is clean and credible.",
    "",
    "Return ONLY JSON:",
    "{",
    '  "ai_recommendation": "verify" | "review_further" | "blacklist",',
    '  "scam_warnings": ["specific warnings"],',
    '  "ai_summary": "Max 45 words",',
    '  "ai_risk_analysis": "Max 80 words",',
    '  "token_verification": "verified" | "suspicious" | "not_found" | "invalid_address" | "scam_detected" | "not_provided",',
    '  "trust_score": 0,',
    '  "confidence_level": "Low" | "Medium" | "High"',
    "}",
  ].join("\n");
}

async function handleSubmissionAnalysis(submission_id: string, supabase: ReturnType<typeof createClient>): Promise<Response> {
  const { data: sub, error: fetchError } = await supabase.from("airdrop_submissions").select("*").eq("id", submission_id).single();
  if (fetchError || !sub) return jsonResponse({ error: "Submission not found" }, 404);

  const blockchain = sub.blockchain ?? "";
  const tokenAddrValid = validateTokenAddress(sub.token_address ?? "", blockchain);
  const [goplusData, githubData, searchResults] = await Promise.all([
    sub.token_address && tokenAddrValid.valid ? fetchGoPlus(sub.token_address, [blockchain]) : Promise.resolve({ found: false } as GoPlusData),
    sub.github_url ? fetchGitHub(sub.github_url) : Promise.resolve({ found: false } as GitHubData),
    runSearchQueries(buildSearchQueries({ project_name: sub.project_name, website_url: sub.website_url, token_address: sub.token_address, blockchain: sub.blockchain })),
  ]);
  const evidence = searchResultsToEvidence(searchResults, hostname(sub.website_url ?? ""));

  if (sub.requires_seed_phrase) {
    const now = new Date().toISOString();
    await supabase.from("airdrop_submissions").update({
      ai_recommendation: "blacklist",
      scam_warnings: ["CRITICAL: Project requires seed phrase — hallmark of a wallet-draining scam."],
      token_verification: sub.token_address ? "scam_detected" : "not_provided",
      token_scan_result: goplusData.found ? goplusData : null,
      updated_at: now,
    }).eq("id", submission_id);
    return jsonResponse({ success: true, ai_recommendation: "blacklist", scam_warnings: ["Seed phrase required — auto-blacklisted."], token_verification: "scam_detected" });
  }

  const analysis = await callOpenAIJson(buildSubmissionPrompt(sub as Record<string, unknown>, goplusData, githubData, tokenAddrValid, evidence), 800, 0.15);
  const now = new Date().toISOString();
  await supabase.from("airdrop_submissions").update({
    ai_recommendation: analysis.ai_recommendation ?? "review_further",
    scam_warnings: analysis.scam_warnings ?? [],
    ai_summary: analysis.ai_summary ?? null,
    ai_risk_analysis: analysis.ai_risk_analysis ?? null,
    token_verification: analysis.token_verification ?? "not_provided",
    token_scan_result: goplusData.found ? goplusData : null,
    updated_at: now,
  }).eq("id", submission_id);

  return jsonResponse({
    success: true,
    ai_recommendation: analysis.ai_recommendation,
    scam_warnings: analysis.scam_warnings ?? [],
    token_verification: analysis.token_verification,
    trust_score: analysis.trust_score,
    confidence_level: analysis.confidence_level,
    sources_checked: buildSourceList(evidence, [], []),
  });
}

// ─── Scam Watch mode ──────────────────────────────────────────────────────────

async function handleScamWatch(body: Record<string, unknown>): Promise<Response> {
  const input = {
    project_name: safeString(body.project_name || body.name),
    token_name: safeString(body.token_name),
    ticker: safeString(body.ticker || body.token_symbol),
    contract_address: safeString(body.contract_address || body.token_address),
    website_url: safeString(body.website_url),
    x_handle: safeString(body.x_handle || body.twitter_url),
  };
  const queries = buildSearchQueries(input).concat([
    input.project_name ? `${input.project_name} compromised discord` : "",
    input.project_name ? `${input.project_name} hacked twitter` : "",
    input.project_name ? `${input.project_name} fake claim site` : "",
    input.contract_address ? `${input.contract_address} honeypot` : "",
  ]).filter(Boolean);
  const results = await runSearchQueries(queries);
  const evidence = searchResultsToEvidence(results, hostname(input.website_url));
  const riskEvidence = evidence.filter(e => (e.riskTerms?.length ?? 0) > 0);
  const trustedRisk = riskEvidence.filter(e => e.tier === "official" || e.tier === "primary" || e.tier === "trusted");
  const severity = trustedRisk.length >= 2 ? "critical" : trustedRisk.length >= 1 || riskEvidence.length >= 4 ? "high" : riskEvidence.length >= 1 ? "medium" : "low";
  return jsonResponse({
    success: true,
    severity,
    possible_scam_matches: riskEvidence.slice(0, 12),
    impersonator_warnings: evidence.filter(e => /impersonat|fake|clone/i.test(`${e.title} ${e.snippet}`)).slice(0, 8),
    fake_claim_warnings: evidence.filter(e => /claim|airdrop|drainer|phishing/i.test(`${e.title} ${e.snippet}`)).slice(0, 8),
    recommended_action: severity === "critical" || severity === "high" ? "Escalate for manual review before listing or promotion." : severity === "medium" ? "Monitor and verify official channels before publication." : "No major public scam signal found from available search evidence.",
    sources_checked: buildSourceList(evidence, [], []),
  });
}

// ─── Entry point ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const body = await req.json();
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (body.mode === "scam_watch" || body.scam_watch) return await handleScamWatch(body);
    if (body.submission_id) return await handleSubmissionAnalysis(body.submission_id, supabase);
    if (!body.airdrop_id) return jsonResponse({ error: "airdrop_id, submission_id or scam_watch payload required" }, 400);
    return await handleAirdropAnalysis(body.airdrop_id, body.force ?? false, supabase);
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
