import { Fragment, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Loader2, Brain, CheckCircle2,
  Eye, EyeOff,
  Database, Shield, Activity, Mail, Users, Key, Zap, RefreshCw, Download,
  Inbox, CheckCheck, XCircle, ChevronDown, ChevronUp, ExternalLink,
  FileText, Plus, X, Pencil, Trash2, AlertTriangle, LogOut, ShieldCheck, Gift,
  ImagePlus, Monitor, CalendarClock, BadgeCheck, Bell, Newspaper, Radar, Sparkles,
} from 'lucide-react';
import type { Airdrop, Blockchain, Category } from '../lib/types';
import { BLOCKCHAIN_OPTIONS, CATEGORY_OPTIONS } from '../lib/types';
import {
  DEFAULT_ARTICLE_CHECKLIST,
  DEFAULT_ARTICLE_TRUST_PROFILES,
  type ArticleReviewChecklist,
  type ArticleTrustProfile,
  type VerificationStatus,
  verificationStatusLabel,
  verificationStatusTone,
} from '../lib/articleTrust';

// ─── Toast ────────────────────────────────────────────────────────────────────

interface Toast { msg: string; type: 'success' | 'error' }

function ToastBar({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium whitespace-nowrap ${
      toast.type === 'success'
        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
        : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
    }`}>
      {toast.type === 'success'
        ? <CheckCircle2 className="w-4 h-4 shrink-0" />
        : <AlertTriangle className="w-4 h-4 shrink-0" />}
      {toast.msg}
      <button onClick={onDismiss} aria-label="Dismiss notification" className="ml-1 opacity-60 hover:opacity-100 transition-opacity">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function VerificationNotesModal({
  open,
  actionLabel,
  notes,
  onNotesChange,
  onCancel,
  onConfirm,
  saving,
}: {
  open: boolean;
  actionLabel: string;
  notes: string;
  onNotesChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  saving: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm px-4 py-8 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Verification audit notes">
      <div className="max-w-lg mx-auto rounded-2xl border border-white/10 bg-dark-900/95 shadow-2xl p-5 sm:p-6">
        <p className="text-[11px] uppercase tracking-[0.14em] text-sky-200">Human Verification Required</p>
        <h3 className="mt-2 text-lg font-bold text-white">Save Verification</h3>
        <p className="mt-2 text-xs text-gray-400 leading-relaxed">{actionLabel}</p>

        <label className="mt-4 block space-y-1.5">
          <span className="text-[11px] text-gray-300">Audit Notes <span className="text-rose-300">(required)</span></span>
          <textarea
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
            rows={4}
            placeholder="Explain why this verification decision was approved."
            className="w-full bg-dark-800/70 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-sky-400/40 resize-none"
          />
        </label>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 rounded-xl border border-white/15 text-sm text-gray-300 hover:text-white hover:border-white/30 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={saving || !notes.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-sky-400/30 bg-sky-500/15 text-sm font-medium text-sky-100 hover:bg-sky-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save Verification
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, iconBg, iconClass, sub,
}: {
  label: string; value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string; iconClass: string; sub?: string;
}) {
  return (
    <div className="glass-card p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon className={`w-5 h-5 ${iconClass}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-white tabular-nums leading-tight">{value}</p>
        <p className="text-xs text-gray-500 leading-tight mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function ActionCard({
  title,
  count,
  status,
  blurb,
  actionLabel,
  onAction,
}: {
  title: string;
  count: number;
  status: string;
  blurb: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <article className="glass-card p-4 border border-white/10 rounded-2xl">
      <p className="text-lg font-bold text-white tabular-nums">{count}</p>
      <p className="text-sm font-semibold text-gray-100 mt-1">{title}</p>
      <p className="text-xs text-neon-blue mt-1">{status}</p>
      <p className="text-xs text-gray-500 mt-2 min-h-[34px]">{blurb}</p>
      <button
        onClick={onAction}
        className="mt-3 inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-white/[0.08] transition-colors"
      >
        {actionLabel}
      </button>
    </article>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  totalAirdrops: number; publishedAirdrops: number;
  scoredAirdrops: number; analyzedAirdrops: number;
  totalTasks: number; newsletterSubs: number;
  proSubs: number; businessSubs: number;
  activeKeys: number; apiCallsToday: number; apiCallsTotal: number;
  pendingSubmissions: number; approvedSubmissions: number; rejectedSubmissions: number;
}

interface Submission {
  id: string; project_name: string;
  website_url: string | null; twitter_url: string | null;
  discord_url: string | null; telegram_url: string | null;
  blockchain: string | null; category: string | null;
  airdrop_type: string | null; description: string | null;
  tasks_required: string | null; deadline: string | null;
  reward_confirmed: string | null; token_confirmed: string | null;
  eligibility_requirements: string | null; team_info: string | null;
  funding_investors: string | null; whitepaper_url: string | null;
  github_url: string | null; contract_address: string | null;
  audit_url: string | null; requires_wallet_connection: boolean;
  requires_transaction: boolean; requires_payment: boolean;
  requires_seed_phrase: boolean; additional_notes: string | null;
  status: string; admin_notes: string | null; submitted_at: string;
  ai_recommendation: string | null; token_name: string | null;
  token_symbol: string | null; token_address: string | null;
  token_verification: string | null; scam_warnings: string[] | null;
}

interface ScamReport {
  id: string;
  user_id: string | null;
  reporter_email: string | null;
  project_name: string;
  website_url: string | null;
  project_url: string | null;
  wallet_address: string | null;
  contract_address: string | null;
  reason: string | null;
  description: string | null;
  evidence_url: string | null;
  status: 'pending' | 'approved' | 'rejected' | string;
  admin_notes: string | null;
  rep_awarded: boolean | null;
  created_at: string;
  reviewed_at: string | null;
}

// ─── Airdrop form data ────────────────────────────────────────────────────────

type AirdropFormData = {
  name: string; ticker: string; logo_url: string; ai_summary: string;
  website_url: string; twitter_url: string; discord_url: string;
  telegram_url: string; github_url: string; contract_address: string;
  docs_url: string; funding_info: string; investors: string; team_info: string;
  estimated_reward: string; expiry_date: string; time_required: string;
  blockchain: Blockchain[]; category: Category[];
  status: Airdrop['status']; risk_level: Airdrop['risk_level'];
  reward_potential: Airdrop['reward_potential']; difficulty: Airdrop['difficulty'];
  published: boolean; is_featured: boolean; is_trending: boolean; is_sponsored: boolean;
  tasks_text: string;
};

const BLANK_FORM: AirdropFormData = {
  name: '', ticker: '', logo_url: '', ai_summary: '',
  website_url: '', twitter_url: '', discord_url: '', telegram_url: '',
  github_url: '', contract_address: '',
  docs_url: '', funding_info: '', investors: '', team_info: '',
  estimated_reward: '', expiry_date: '', time_required: 'Varies',
  blockchain: [], category: [],
  status: 'Active', risk_level: 'Medium', reward_potential: 'Medium', difficulty: 'Moderate',
  published: false, is_featured: false, is_trending: false, is_sponsored: false,
  tasks_text: '',
};

const SCAM_REPORT_REP = 50;

type BannerPlacement = 'Homepage Hero Banner' | 'Homepage Mid-Page Banner' | 'Airdrop Detail Banner' | 'Dashboard Banner';
type BannerStatus = 'Enquiry' | 'Awaiting Artwork' | 'Ready to Publish' | 'Live' | 'Expired';
type BannerDisplayStatus = 'Active' | 'Scheduled' | 'Expired';
type BannerPaymentState = 'Unpaid' | 'Pending' | 'Paid';

interface BannerAd {
  id: string;
  advertiserName: string;
  contactEmail: string;
  websiteLink: string;
  bannerImageUrl: string;
  destinationUrl: string;
  altText: string;
  placement: BannerPlacement;
  startDate: string;
  endDate: string;
  status: BannerStatus;
  enabled: boolean;
  exclusivePlacement: boolean;
  notes: string;
  paymentState: BannerPaymentState;
  archived: boolean;
  updatedAt: string;
}

type BannerFormData = Omit<BannerAd, 'id' | 'updatedAt'>;

type ContentView = 'airdrops' | 'articles' | 'hero' | 'featured' | 'trending' | 'learn' | 'sections';
type AdminView = 'overview' | 'airdrops' | 'submissions' | 'content' | 'ai-drafts' | 'competitor-watch' | 'users' | 'api' | 'banners' | 'audit-logs' | 'system-tools';

interface ControlArticle {
  id: string;
  articleKey: string;
  title: string;
  urlPath: string;
  status: 'draft' | 'scheduled' | 'published';
  updatedAt: string;
}

interface OpsUser {
  id: string;
  email: string;
  createdAt: string;
  lastSeenAt: string;
  plan: 'free' | 'api' | 'premium';
}

type AdminAuditPayload = {
  actionTaken: string;
  aiRecommendation: string;
  finalDecision: string;
  notes?: string;
  context?: Record<string, unknown>;
};

type AdminAuditLog = {
  id: string;
  action_at: string;
  created_at: string;
  admin_user_id: string | null;
  admin_identifier: string;
  action_taken: string;
  ai_recommendation: string | null;
  final_decision: string;
  notes: string | null;
  context: Record<string, unknown> | null;
};

type AIDraftStatus = 'ai_assisted_draft' | 'human_reviewed' | 'verified_airdropguard' | 'published' | 'rejected';

type AIArticleDraft = {
  id: string;
  week_start: string;
  title: string;
  slug: string;
  summary: string;
  body: string;
  meta_title: string;
  meta_description: string;
  estimated_read_minutes: number;
  status: AIDraftStatus;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

type CompetitorSource = {
  id: string;
  source_name: string;
  source_url: string;
  is_active: boolean;
  last_checked_at: string | null;
  created_at: string;
};

type CompetitorOpportunityStatus = 'new' | 'queued' | 'ignored' | 'duplicate' | 'drafted';

type CompetitorOpportunity = {
  id: string;
  source_id: string;
  project_name: string;
  source_url: string;
  discovered_at: string;
  category: string | null;
  blockchain: string | null;
  confidence_level: 'low' | 'medium' | 'high';
  why_matched: string;
  similarity_score: number | null;
  status: CompetitorOpportunityStatus;
  notes: string | null;
  created_at: string;
};

type CompetitorSourceScanStatus = 'never_scanned' | 'working' | 'none_found' | 'no_extractable' | 'js_needs_adapter' | 'found' | 'fetch_failed' | 'parser_failed';

type CompetitorSourceScanResult = {
  status: CompetitorSourceScanStatus;
  lastCheckedAt: string | null;
  totalScans: number;
  successfulScans: number;
  opportunitiesFound: number;
  newProjects: number;
  duplicateProjects: number;
  failedExtractions: number;
  durationMs: number | null;
  lastSuccessfulScan: string | null;
  successRate: number;
  health: 'green' | 'amber' | 'red';
  note: string;
};

type DiscoveryComparisonType = 'exact_match' | 'similar_project' | 'new_project';
type DiscoveryPriority = 'high' | 'medium' | 'low';

type DiscoveryCandidate = {
  projectName: string;
  projectUrl: string | null;
  listingUrl: string;
  blockchain: string | null;
  category: string | null;
  shortDescription: string | null;
  listingDate: string | null;
  confidence: 'low' | 'medium' | 'high';
  sourceLabel: string;
  officialDocsUrl: string | null;
  githubUrl: string | null;
  officialXUrl: string | null;
  officialDiscordUrl: string | null;
  fundingInfo: string | null;
  teamInfo: string | null;
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

type PendingDiscoveryCandidate = {
  id: string;
  sourceId: string;
  sourceName: string;
  checkedAt: string;
  adapterId: string;
  candidate: DiscoveryCandidate;
  comparisonType: DiscoveryComparisonType;
  confidenceScore: number;
  whyNew: string;
  matchedProject: string | null;
  compareMessage: string;
  sourceReliability: number;
  sourceMentions: number;
  discoveryScore: number;
  discoveryPriority: DiscoveryPriority;
  firstDiscoveredAt: string;
};

type CompetitorScanDebugResult = {
  adapterUsed: string | null;
  pageFetched: string;
  fetchStatus: number | null;
  cardsFound: number;
  candidatesRejected: number;
  rejectionReasons: Record<string, number>;
  rejectionSamples: string[];
  validCandidatesExtracted: number;
  outcomeReason: string | null;
};

type CompetitorWatchScanResult = {
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
    | 'ok'
    | 'blocked_by_cloudflare'
    | 'http_403'
    | 'http_429'
    | 'timeout'
    | 'no_html'
    | 'javascript_rendered'
    | 'needs_adapter'
    | 'no_adapter_matched'
    | 'no_cards_found'
    | 'no_extractable_content'
    | 'all_candidates_rejected'
    | 'parser_failed'
    | 'fetch_failed';
  outcomeMessage: string;
};

type CompetitorWatchScanResponse = {
  results: CompetitorWatchScanResult[];
};

type SourceAdapter = {
  id: string;
  label: string;
  hostPatterns: RegExp[];
  listingPathPatterns: RegExp[];
};

type AdminNotification = {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  context: Record<string, unknown> | null;
  created_at: string;
};

type AuditTargetType = 'airdrop' | 'article' | 'banner' | 'submission' | 'scam_report' | 'homepage' | 'unknown';

const GENERIC_COMPETITOR_NAMES = new Set([
  'airdrop',
  'airdrops',
  'crypto',
  'search',
  'browse',
  'category',
  'new',
  'latest',
  'claim',
  'reward',
  'rewards',
  'campaign',
  'campaigns',
]);

const URL_NOISE_TOKENS = new Set([
  'www',
  'com',
  'io',
  'org',
  'net',
  'app',
  'site',
  'www2',
  'blog',
  'news',
  'airdrop',
  'airdrops',
  'crypto',
  'claim',
  'rewards',
  'campaign',
  'projects',
  'project',
  'list',
  'listing',
  'drop',
  'drops',
  'search',
  'browse',
  'category',
  'filter',
  'tag',
  'new',
  'latest',
]);

const GENERIC_SOURCE_URL_PATTERNS = [
  '/search',
  '?query=',
  '&query=',
  '/browse',
  '/category',
  '/tag',
  '/filter',
  '/airdrops',
  '/new',
  '/latest',
];

const DISCOVERY_SOURCE_ADAPTERS: SourceAdapter[] = [
  {
    id: 'airdrop-io',
    label: 'airdrop.io',
    hostPatterns: [/^airdrop\.io$/i, /(^|\.)airdrop\.io$/i],
    listingPathPatterns: [/\/airdrop\/[a-z0-9-]{3,}/i, /\/project\/[a-z0-9-]{3,}/i],
  },
  {
    id: 'airdrops-io',
    label: 'airdrops.io',
    hostPatterns: [/^airdrops\.io$/i, /(^|\.)airdrops\.io$/i],
    listingPathPatterns: [/\/airdrop\//i, /\/project\//i, /\/campaign\//i, /\/token\//i],
  },
  {
    id: 'airdropalert',
    label: 'airdropalert.com',
    hostPatterns: [/^airdropalert\.com$/i, /(^|\.)airdropalert\.com$/i],
    listingPathPatterns: [/\/airdrops\/[a-z0-9-]{3,}/i, /\/airdrop\/[a-z0-9-]{3,}/i],
  },
  {
    id: 'layer3',
    label: 'Layer3',
    hostPatterns: [/^layer3\.xyz$/i, /(^|\.)layer3\.xyz$/i],
    listingPathPatterns: [/\/quests\/[a-z0-9-]{3,}/i, /\/campaigns\/[a-z0-9-]{3,}/i, /\/bounties\/[a-z0-9-]{3,}/i],
  },
  {
    id: 'galxe',
    label: 'Galxe',
    hostPatterns: [/^galxe\.com$/i, /(^|\.)galxe\.com$/i],
    listingPathPatterns: [/\/quest\/[a-z0-9-]{3,}/i, /\/campaign\/[a-z0-9-]{3,}/i, /\/events\/[a-z0-9-]{3,}/i],
  },
  {
    id: 'intract',
    label: 'Intract',
    hostPatterns: [/^intract\.io$/i, /(^|\.)intract\.io$/i],
    listingPathPatterns: [/\/quest\//i, /\/campaign\//i, /\/tasks\//i],
  },
  {
    id: 'zealy',
    label: 'Zealy',
    hostPatterns: [/^zealy\.io$/i, /(^|\.)zealy\.io$/i],
    listingPathPatterns: [/\/c\/[^/]+\/questboard\/[a-z0-9-]{3,}/i, /\/questboard\/[a-z0-9-]{3,}/i],
  },
  {
    id: 'coinmarketcap-airdrops',
    label: 'CoinMarketCap Airdrops',
    hostPatterns: [/^coinmarketcap\.com$/i, /(^|\.)coinmarketcap\.com$/i],
    listingPathPatterns: [/\/airdrop\/[a-z0-9-]{3,}/i],
  },
];

const SOURCE_RELIABILITY_SCORES: Record<string, number> = {
  'airdrop-io': 74,
  'airdrops-io': 72,
  airdropalert: 76,
  layer3: 90,
  galxe: 88,
  intract: 82,
  zealy: 80,
  'coinmarketcap-airdrops': 85,
};

function getAdapterReliabilityScore(adapterId: string | null): number {
  if (!adapterId) return 70;
  return SOURCE_RELIABILITY_SCORES[adapterId] ?? 70;
}

function tokenizeName(value: string): string[] {
  return normalizeProjectName(value)
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean);
}

function tokenOverlapScore(a: string, b: string): number {
  const aTokens = new Set(tokenizeName(a));
  const bTokens = new Set(tokenizeName(b));
  if (aTokens.size === 0 || bTokens.size === 0) return 0;

  let overlap = 0;
  aTokens.forEach((token) => {
    if (bTokens.has(token)) overlap += 1;
  });

  return overlap / Math.max(aTokens.size, bTokens.size);
}

function compareCandidateAgainstAirdrops(
  candidate: DiscoveryCandidate,
  airdrops: Airdrop[]
): {
  comparison: DiscoveryComparisonType;
  confidenceScore: number;
  whyNew: string;
  matchedProject: string | null;
} {
  const normalizedCandidate = normalizeProjectName(candidate.projectName);
  const exactMatch = airdrops.find((airdrop) => normalizeProjectName(airdrop.name) === normalizedCandidate);
  if (exactMatch) {
    return {
      comparison: 'exact_match',
      confidenceScore: 96,
      whyNew: `Matches existing listing exactly (${exactMatch.name}).`,
      matchedProject: exactMatch.name,
    };
  }

  let bestSimilar: { name: string; score: number } | null = null;
  for (const airdrop of airdrops) {
    const score = tokenOverlapScore(candidate.projectName, airdrop.name);
    if (!bestSimilar || score > bestSimilar.score) {
      bestSimilar = { name: airdrop.name, score };
    }
  }

  if (bestSimilar && bestSimilar.score >= 0.55) {
    return {
      comparison: 'similar_project',
      confidenceScore: Math.min(90, Math.round(62 + bestSimilar.score * 30)),
      whyNew: `Similar to ${bestSimilar.name}, but not an exact listing match.`,
      matchedProject: bestSimilar.name,
    };
  }

  return {
    comparison: 'new_project',
    confidenceScore: 84,
    whyNew: 'No exact or close existing listing match found in AirdropGuard.',
    matchedProject: null,
  };
}

function computeDiscoveryScore(input: {
  sourceReliability: number;
  sourceMentions: number;
  hasDocs: boolean;
  hasGithub: boolean;
  hasX: boolean;
  hasDiscord: boolean;
  hasBlockchain: boolean;
  hasFunding: boolean;
  hasTeam: boolean;
}): number {
  const mentionsBonus = Math.min(15, (input.sourceMentions - 1) * 4);
  const score =
    input.sourceReliability * 0.45 +
    mentionsBonus +
    (input.hasDocs ? 10 : 0) +
    (input.hasGithub ? 7 : 0) +
    (input.hasX ? 5 : 0) +
    (input.hasDiscord ? 5 : 0) +
    (input.hasBlockchain ? 6 : 0) +
    (input.hasFunding ? 4 : 0) +
    (input.hasTeam ? 3 : 0);

  return Math.max(0, Math.min(100, Math.round(score)));
}

function getDiscoveryPriority(score: number): DiscoveryPriority {
  if (score >= 78) return 'high';
  if (score >= 55) return 'medium';
  return 'low';
}

function getSourceHealthIndicator(successRate: number, lastStatus: CompetitorSourceScanStatus): 'green' | 'amber' | 'red' {
  if (lastStatus === 'fetch_failed' || lastStatus === 'parser_failed' || successRate < 0.4) return 'red';
  if (lastStatus === 'found' && successRate >= 0.7) return 'green';
  return 'amber';
}

const BLOCKCHAIN_KEYWORDS: Array<{ keyword: string; value: string }> = [
  { keyword: 'ethereum', value: 'Ethereum' },
  { keyword: 'base', value: 'Base' },
  { keyword: 'arbitrum', value: 'Arbitrum' },
  { keyword: 'optimism', value: 'Optimism' },
  { keyword: 'solana', value: 'Solana' },
  { keyword: 'polygon', value: 'Polygon' },
  { keyword: 'bsc', value: 'BNB Chain' },
  { keyword: 'bnb', value: 'BNB Chain' },
  { keyword: 'avalanche', value: 'Avalanche' },
  { keyword: 'sui', value: 'Sui' },
  { keyword: 'aptos', value: 'Aptos' },
];

const CATEGORY_KEYWORDS: Array<{ keyword: string; value: string }> = [
  { keyword: 'defi', value: 'DeFi' },
  { keyword: 'nft', value: 'NFT' },
  { keyword: 'gaming', value: 'Gaming' },
  { keyword: 'social', value: 'Social' },
  { keyword: 'infra', value: 'Infrastructure' },
  { keyword: 'layer 2', value: 'Layer2' },
  { keyword: 'wallet', value: 'Wallet' },
  { keyword: 'dao', value: 'DAO' },
];

function toTitleCase(value: string): string {
  return value
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function sanitizeProjectCandidate(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const normalized = decodeURIComponent(String(raw))
    .replace(/[\-_]+/g, ' ')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized || normalized.length < 3) return null;
  if (/^\d+$/.test(normalized)) return null;

  const lowered = normalized.toLowerCase();
  if (GENERIC_COMPETITOR_NAMES.has(lowered)) return null;

  const words = lowered.split(' ').filter(Boolean);
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
  const lowered = cleaned.toLowerCase();
  return GENERIC_COMPETITOR_NAMES.has(lowered);
}

function normalizeProjectName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveSourceAdapter(sourceUrl: string): SourceAdapter | null {
  try {
    const hostname = new URL(sourceUrl).hostname.replace(/^www\./, '').toLowerCase();
    return DISCOVERY_SOURCE_ADAPTERS.find((adapter) => adapter.hostPatterns.some((pattern) => pattern.test(hostname))) || null;
  } catch {
    return null;
  }
}

function pickTextContent(...candidates: Array<string | null | undefined>): string | null {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const cleaned = candidate.replace(/\s+/g, ' ').trim();
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

function extractOfficialUrlsFromCard(card: Element, sourceUrl: string): {
  docsUrl: string | null;
  githubUrl: string | null;
  xUrl: string | null;
  discordUrl: string | null;
} {
  let docsUrl: string | null = null;
  let githubUrl: string | null = null;
  let xUrl: string | null = null;
  let discordUrl: string | null = null;

  const anchors = Array.from(card.querySelectorAll('a[href]'));
  for (const anchor of anchors) {
    const href = anchor.getAttribute('href');
    if (!href) continue;
    let resolved: URL;
    try {
      resolved = new URL(href, sourceUrl);
    } catch {
      continue;
    }

    const host = resolved.hostname.replace(/^www\./, '').toLowerCase();
    const value = resolved.toString();
    if (!githubUrl && host.includes('github.com')) githubUrl = value;
    if (!xUrl && (host === 'x.com' || host.endsWith('.x.com') || host.includes('twitter.com'))) xUrl = value;
    if (!discordUrl && (host.includes('discord.gg') || host.includes('discord.com'))) discordUrl = value;
    if (!docsUrl && (host.includes('docs.') || resolved.pathname.toLowerCase().includes('/docs'))) docsUrl = value;
  }

  return { docsUrl, githubUrl, xUrl, discordUrl };
}

function inferFundingFromText(text: string): string | null {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const fundingMatch = normalized.match(/\b(raised|funded|seed|series\s+[a-z]|backed\s+by)\b[^.\n]{0,120}/i);
  return fundingMatch ? fundingMatch[0] : null;
}

function inferTeamFromText(text: string): string | null {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const teamMatch = normalized.match(/\b(founder|founded\s+by|team|co-?founder)\b[^.\n]{0,120}/i);
  return teamMatch ? teamMatch[0] : null;
}

type AdapterParserRule = {
  cardSelectors: string[];
  titleSelectors: string[];
  descriptionSelectors: string[];
  dateSelectors: string[];
  linkSelectors: string[];
};

const ADAPTER_PARSER_RULES: Record<string, AdapterParserRule> = {
  galxe: {
    cardSelectors: ['[data-testid*="campaign" i]', '[data-testid*="quest" i]', 'article', 'li'],
    titleSelectors: ['h1', 'h2', 'h3', '[data-testid*="title" i]', '[class*="title" i]'],
    descriptionSelectors: ['p', '[data-testid*="description" i]', '[class*="desc" i]'],
    dateSelectors: ['time', '[data-testid*="date" i]', '[class*="date" i]'],
    linkSelectors: ['a[href*="/quest/"]', 'a[href*="/campaign/"]', 'a[href*="/events/"]'],
  },
  layer3: {
    cardSelectors: ['[data-testid*="quest" i]', '[class*="quest" i]', 'article', 'li'],
    titleSelectors: ['h1', 'h2', 'h3', '[class*="title" i]', '[class*="name" i]'],
    descriptionSelectors: ['p', '[class*="description" i]', '[class*="summary" i]'],
    dateSelectors: ['time', '[class*="date" i]'],
    linkSelectors: ['a[href*="/quests/"]', 'a[href*="/campaigns/"]', 'a[href*="/bounties/"]'],
  },
  zealy: {
    cardSelectors: ['[data-testid*="quest" i]', '[class*="quest" i]', 'article', 'li'],
    titleSelectors: ['h1', 'h2', 'h3', '[class*="title" i]', '[class*="name" i]'],
    descriptionSelectors: ['p', '[class*="description" i]', '[class*="summary" i]'],
    dateSelectors: ['time', '[class*="date" i]'],
    linkSelectors: ['a[href*="/questboard/"]', 'a[href*="/c/"]'],
  },
  airdropalert: {
    cardSelectors: ['[class*="airdrop" i]', '[class*="post" i]', 'article', 'li'],
    titleSelectors: ['h1', 'h2', 'h3', '[class*="title" i]', '[rel="bookmark"]'],
    descriptionSelectors: ['p', '[class*="excerpt" i]', '[class*="summary" i]'],
    dateSelectors: ['time', '[class*="date" i]'],
    linkSelectors: ['a[href*="/airdrops/"]', 'a[href*="/airdrop/"]'],
  },
  'airdrop-io': {
    cardSelectors: ['[class*="airdrop" i]', 'article', 'li'],
    titleSelectors: ['h1', 'h2', 'h3', '[class*="title" i]', '[class*="name" i]'],
    descriptionSelectors: ['p', '[class*="description" i]', '[class*="summary" i]'],
    dateSelectors: ['time', '[class*="date" i]'],
    linkSelectors: ['a[href*="/airdrop/"]', 'a[href*="/project/"]'],
  },
  'coinmarketcap-airdrops': {
    cardSelectors: ['[data-testid*="airdrop" i]', '[class*="airdrop" i]', 'article', 'li', 'tr'],
    titleSelectors: ['h1', 'h2', 'h3', '[class*="title" i]', '[data-testid*="name" i]'],
    descriptionSelectors: ['p', '[class*="description" i]', '[class*="summary" i]'],
    dateSelectors: ['time', '[class*="date" i]'],
    linkSelectors: ['a[href*="/airdrop/"]'],
  },
};

const DEFAULT_ADAPTER_PARSER_RULE: AdapterParserRule = {
  cardSelectors: ['article', 'li', 'div', 'section'],
  titleSelectors: ['h1', 'h2', 'h3', 'h4', '[class*="title" i]', '[data-testid*="title" i]'],
  descriptionSelectors: ['p', '[class*="desc" i]', '[class*="summary" i]'],
  dateSelectors: ['time', '[class*="date" i]', '[data-testid*="date" i]'],
  linkSelectors: ['a[href]'],
};

const NAVIGATION_PATH_SEGMENTS = new Set([
  'airdrop',
  'airdrops',
  'campaign',
  'campaigns',
  'quest',
  'quests',
  'explore',
  'discover',
  'leaderboard',
  'community',
  'communities',
  'categories',
  'category',
  'tags',
  'tag',
  'search',
  'news',
  'blog',
]);

const GENERIC_CARD_TEXT_TOKENS = new Set([
  'view details',
  'learn more',
  'join now',
  'explore',
  'see more',
  'airdrops',
  'campaigns',
  'quests',
]);

function getAdapterParserRule(adapter: SourceAdapter): AdapterParserRule {
  return ADAPTER_PARSER_RULES[adapter.id] || DEFAULT_ADAPTER_PARSER_RULE;
}

function isNavigationListingUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    const parts = parsed.pathname
      .split('/')
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean);

    if (parts.length === 0) return true;

    const last = parts[parts.length - 1];
    if (NAVIGATION_PATH_SEGMENTS.has(last)) return true;
    if (parts.length <= 2 && parts.every((part) => NAVIGATION_PATH_SEGMENTS.has(part))) return true;
    return false;
  } catch {
    return true;
  }
}

function hasMeaningfulProjectSignal(text: string): boolean {
  const cleaned = text.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!cleaned || cleaned.length < 20) return false;
  return !Array.from(GENERIC_CARD_TEXT_TOKENS).every((token) => cleaned.includes(token));
}

function collectAdapterCards(doc: Document, adapter: SourceAdapter): Element[] {
  const rule = getAdapterParserRule(adapter);
  const cards = new Set<Element>();

  for (const selector of rule.cardSelectors) {
    const nodes = doc.querySelectorAll(selector);
    nodes.forEach((node) => {
      const card = node.closest('article, li, div, section, tr') || node;
      cards.add(card);
    });
  }

  return Array.from(cards);
}

function pickCardNodeText(card: Element, selectors: string[]): string | null {
  for (const selector of selectors) {
    const node = card.querySelector(selector);
    const text = pickTextContent(node?.textContent);
    if (text) return text;
  }
  return null;
}

function isProjectListingUrl(rawUrl: string, adapter: SourceAdapter): boolean {
  if (isGenericSourceUrl(rawUrl)) return false;
  if (isNavigationListingUrl(rawUrl)) return false;
  return adapter.listingPathPatterns.some((pattern) => pattern.test(rawUrl));
}

function extractDiscoveryCandidatesFromHtml(
  html: string,
  source: CompetitorSource,
  adapter: SourceAdapter
): DiscoveryExtractionResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const cards = collectAdapterCards(doc, adapter);
  const fallbackAnchors = cards.length === 0 ? Array.from(doc.querySelectorAll('a[href]')) : [];
  const parserRule = getAdapterParserRule(adapter);
  const dedupe = new Set<string>();
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

  const sourceHostname = (() => {
    try {
      return new URL(source.source_url).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  })();

  const processingUnits = cards.length > 0
    ? cards
    : fallbackAnchors.map((anchor) => anchor.closest('article, li, div, section, tr') || anchor);

  for (const card of processingUnits) {
    const candidateLinks = new Set<string>();
    const scopedLinkNodes = new Set<Element>();

    for (const selector of parserRule.linkSelectors) {
      card.querySelectorAll(selector).forEach((node) => scopedLinkNodes.add(node));
    }
    card.querySelectorAll('a[href]').forEach((node) => scopedLinkNodes.add(node));

    for (const node of Array.from(scopedLinkNodes)) {
      const href = node.getAttribute('href');
      if (!href) continue;
      try {
        const resolved = new URL(href, source.source_url).toString();
        if (!isProjectListingUrl(resolved, adapter)) continue;
        candidateLinks.add(resolved);
      } catch {
        continue;
      }
    }

    const listingUrl = Array.from(candidateLinks)[0] || source.source_url;
    const hasListingLink = candidateLinks.size > 0;

    const rawName = pickTextContent(
      pickCardNodeText(card, parserRule.titleSelectors),
      card.getAttribute('data-project-name'),
      card.getAttribute('aria-label'),
      card.getAttribute('title')
    );
    const projectName = sanitizeProjectCandidate(rawName);

    if (!projectName) {
      reject('no_project_like_title', rawName);
      continue;
    }

    if (isGenericOpportunityName(projectName)) {
      reject('generic_project_name', projectName);
      continue;
    }

    const shortDescription = pickCardNodeText(card, parserRule.descriptionSelectors);
    const explicitDate = pickCardNodeText(card, parserRule.dateSelectors);
    const listingDate = explicitDate ? extractDateFromText(explicitDate) : extractDateFromText(card.textContent || '');
    const fullCardText = card.textContent || '';
    const officialUrls = extractOfficialUrlsFromCard(card, source.source_url);
    const fundingInfo = inferFundingFromText(fullCardText);
    const teamInfo = inferTeamFromText(fullCardText);

    if (!shortDescription && !listingDate && !hasMeaningfulProjectSignal(fullCardText)) {
      continue;
    }

    const projectUrl = (() => {
      const externalAnchors = Array.from(card.querySelectorAll('a[href^="http"]'));
      for (const externalAnchor of externalAnchors) {
        const value = externalAnchor.getAttribute('href');
        if (!value) continue;
        if (isGenericSourceUrl(value)) continue;
        try {
          const externalUrl = new URL(value, source.source_url);
          if (externalUrl.hostname.replace(/^www\./, '') === sourceHostname) {
            continue;
          }
          return externalUrl.toString();
        } catch {
          continue;
        }
      }
      return null;
    })();

    const combinedText = [projectName, shortDescription, fullCardText].join(' ');
    const blockchain = inferBlockchainFromText(combinedText);
    const category = inferCategoryFromText(combinedText);
    const hasDescription = Boolean(shortDescription && shortDescription.trim());
    const hasEcosystemSignal = Boolean(blockchain || category);

    if (!(hasListingLink || hasDescription || hasEcosystemSignal)) {
      reject('missing_supporting_signal', projectName);
      continue;
    }

    const confidence: 'low' | 'medium' | 'high' = projectUrl && shortDescription
      ? 'high'
      : shortDescription || listingDate
      ? 'medium'
      : 'low';

    const dedupeKey = `${normalizeProjectName(projectName)}::${listingUrl}`;
    if (dedupe.has(dedupeKey)) {
      reject('duplicate_candidate', projectName);
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
      detectedKeywords: [],
      reasonDetected: 'Detected by adapter card extraction.',
    });
  }

  return {
    candidates: found,
    cardsFound: processingUnits.length,
    candidatesRejected: rejectedCount,
    rejectedByReason,
    rejectionSamples,
  };
}

const COMPETITOR_STATUS_META: Record<CompetitorOpportunityStatus, { label: string; tone: string }> = {
  new: {
    label: 'Queued',
    tone: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200',
  },
  queued: {
    label: 'In Review',
    tone: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
  },
  ignored: {
    label: 'Ignored',
    tone: 'border-white/20 bg-white/[0.04] text-gray-300',
  },
  duplicate: {
    label: 'Duplicate',
    tone: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  },
  drafted: {
    label: 'Draft Created',
    tone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  },
};

const COMPETITOR_SOURCE_SCAN_META: Record<CompetitorSourceScanStatus, { label: string; tone: string }> = {
  never_scanned: {
    label: 'Never scanned',
    tone: 'border-white/20 bg-white/[0.03] text-gray-300',
  },
  working: {
    label: 'Working',
    tone: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200',
  },
  none_found: {
    label: 'No opportunities found',
    tone: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
  },
  no_extractable: {
    label: 'No extractable content',
    tone: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  },
  js_needs_adapter: {
    label: 'JS-rendered / needs adapter',
    tone: 'border-violet-500/30 bg-violet-500/10 text-violet-200',
  },
  found: {
    label: 'Opportunities found',
    tone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  },
  fetch_failed: {
    label: 'Fetch failed',
    tone: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
  },
  parser_failed: {
    label: 'Parser failed',
    tone: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
  },
};

const DISCOVERY_COMPARISON_META: Record<DiscoveryComparisonType, { label: string; tone: string }> = {
  exact_match: {
    label: 'Exact match',
    tone: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  },
  similar_project: {
    label: 'Similar project',
    tone: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
  },
  new_project: {
    label: 'New project',
    tone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  },
};

const DISCOVERY_PRIORITY_META: Record<DiscoveryPriority, { label: string; tone: string }> = {
  high: {
    label: '🔥 High Priority',
    tone: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
  },
  medium: {
    label: '⭐ Medium Priority',
    tone: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  },
  low: {
    label: '📦 Low Priority',
    tone: 'border-white/20 bg-white/[0.04] text-gray-300',
  },
};

const SOURCE_HEALTH_META: Record<'green' | 'amber' | 'red', { label: string; tone: string }> = {
  green: {
    label: 'Green',
    tone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  },
  amber: {
    label: 'Amber',
    tone: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  },
  red: {
    label: 'Red',
    tone: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
  },
};

function getCompetitorConfidenceLabel(opportunity: CompetitorOpportunity): string {
  if (opportunity.confidence_level === 'low') {
    return 'Low confidence - needs manual review';
  }
  if (opportunity.confidence_level === 'medium') {
    return 'Medium confidence - verify before drafting';
  }
  return 'High confidence - still requires human review';
}

function getOpportunityDiscoveryDetails(opportunity: CompetitorOpportunity): {
  sourceLabel: string;
  projectUrl: string | null;
  listingUrl: string;
  shortDescription: string | null;
  listingDate: string | null;
  compare: string;
  comparisonType: DiscoveryComparisonType;
  confidenceScore: number;
  whyNew: string;
  matchedProject: string | null;
  adapterId: string | null;
  sourceReliability: number;
  officialDocsUrl: string | null;
  githubUrl: string | null;
  officialXUrl: string | null;
  officialDiscordUrl: string | null;
  fundingInfo: string | null;
  teamInfo: string | null;
  firstDiscoveredAt: string | null;
  sourceMentions: number;
  discoveryScore: number;
  discoveryPriority: DiscoveryPriority;
  detectedKeywords: string[];
  reasonDetected: string;
  duplicateStatus: 'new' | 'duplicate';
} {
  const fallback = {
    sourceLabel: 'Unknown source',
    projectUrl: null,
    listingUrl: opportunity.source_url,
    shortDescription: null,
    listingDate: null,
    compare: 'No existing AirdropGuard listing match found',
    comparisonType: 'new_project' as DiscoveryComparisonType,
    confidenceScore: 60,
    whyNew: 'No prior AirdropGuard listing match found.',
    matchedProject: null,
    adapterId: null,
    sourceReliability: 70,
    officialDocsUrl: null,
    githubUrl: null,
    officialXUrl: null,
    officialDiscordUrl: null,
    fundingInfo: null,
    teamInfo: null,
    firstDiscoveredAt: opportunity.discovered_at,
    sourceMentions: 1,
    discoveryScore: 55,
    discoveryPriority: 'medium' as DiscoveryPriority,
    detectedKeywords: [],
    reasonDetected: 'Detected by adapter extraction signals.',
    duplicateStatus: 'new' as const,
  };

  if (!opportunity.notes) return fallback;

  try {
    const parsed = JSON.parse(opportunity.notes) as Record<string, unknown>;
    return {
      sourceLabel: typeof parsed.source === 'string' && parsed.source.trim() ? parsed.source : fallback.sourceLabel,
      projectUrl: typeof parsed.project_url === 'string' && parsed.project_url.trim() ? parsed.project_url : null,
      listingUrl: typeof parsed.listing_url === 'string' && parsed.listing_url.trim() ? parsed.listing_url : fallback.listingUrl,
      shortDescription: typeof parsed.short_description === 'string' && parsed.short_description.trim() ? parsed.short_description : null,
      listingDate: typeof parsed.listing_date === 'string' && parsed.listing_date.trim() ? parsed.listing_date : null,
      compare: typeof parsed.compare === 'string' && parsed.compare.trim() ? parsed.compare : fallback.compare,
      comparisonType: parsed.comparison_type === 'exact_match' || parsed.comparison_type === 'similar_project' || parsed.comparison_type === 'new_project'
        ? parsed.comparison_type
        : fallback.comparisonType,
      confidenceScore: typeof parsed.confidence_score === 'number' ? parsed.confidence_score : fallback.confidenceScore,
      whyNew: typeof parsed.why_new === 'string' && parsed.why_new.trim() ? parsed.why_new : fallback.whyNew,
      matchedProject: typeof parsed.matched_project === 'string' && parsed.matched_project.trim() ? parsed.matched_project : null,
      adapterId: typeof parsed.adapter_id === 'string' && parsed.adapter_id.trim() ? parsed.adapter_id : null,
      sourceReliability: typeof parsed.source_reliability === 'number' ? parsed.source_reliability : fallback.sourceReliability,
      officialDocsUrl: typeof parsed.official_docs_url === 'string' && parsed.official_docs_url.trim() ? parsed.official_docs_url : null,
      githubUrl: typeof parsed.github_url === 'string' && parsed.github_url.trim() ? parsed.github_url : null,
      officialXUrl: typeof parsed.official_x_url === 'string' && parsed.official_x_url.trim() ? parsed.official_x_url : null,
      officialDiscordUrl: typeof parsed.official_discord_url === 'string' && parsed.official_discord_url.trim() ? parsed.official_discord_url : null,
      fundingInfo: typeof parsed.funding_info === 'string' && parsed.funding_info.trim() ? parsed.funding_info : null,
      teamInfo: typeof parsed.team_info === 'string' && parsed.team_info.trim() ? parsed.team_info : null,
      firstDiscoveredAt: typeof parsed.first_discovered_at === 'string' && parsed.first_discovered_at.trim() ? parsed.first_discovered_at : fallback.firstDiscoveredAt,
      sourceMentions: typeof parsed.source_mentions === 'number' ? parsed.source_mentions : fallback.sourceMentions,
      discoveryScore: typeof parsed.discovery_score === 'number' ? parsed.discovery_score : fallback.discoveryScore,
      discoveryPriority: parsed.discovery_priority === 'high' || parsed.discovery_priority === 'medium' || parsed.discovery_priority === 'low'
        ? parsed.discovery_priority
        : fallback.discoveryPriority,
      detectedKeywords: Array.isArray(parsed.detected_keywords)
        ? parsed.detected_keywords.filter((value): value is string => typeof value === 'string' && value.trim().length > 0).slice(0, 8)
        : fallback.detectedKeywords,
      reasonDetected: typeof parsed.reason_detected === 'string' && parsed.reason_detected.trim() ? parsed.reason_detected : fallback.reasonDetected,
      duplicateStatus: parsed.duplicate_status === 'duplicate' ? 'duplicate' : 'new',
    };
  } catch {
    return fallback;
  }
}

function inferAuditTarget(log: AdminAuditLog): { targetType: AuditTargetType; targetNameOrId: string } {
  const ctx = (log.context && typeof log.context === 'object' ? log.context : {}) as Record<string, unknown>;
  const action = String(log.action_taken || '').toLowerCase();

  if (ctx.airdropId) {
    return {
      targetType: 'airdrop',
      targetNameOrId: String(ctx.airdropName || ctx.projectName || ctx.airdropId),
    };
  }

  if (ctx.articleId) {
    return {
      targetType: 'article',
      targetNameOrId: String(ctx.title || ctx.articleId),
    };
  }

  if (ctx.bannerId) {
    return {
      targetType: 'banner',
      targetNameOrId: String(ctx.advertiser || ctx.bannerId),
    };
  }

  if (ctx.submissionId) {
    return {
      targetType: 'submission',
      targetNameOrId: String(ctx.projectName || ctx.submissionId),
    };
  }

  if (ctx.reportId) {
    return {
      targetType: 'scam_report',
      targetNameOrId: String(ctx.projectName || ctx.reportId),
    };
  }

  if (ctx.projectIds) {
    const ids = Array.isArray(ctx.projectIds) ? ctx.projectIds.map(String).join(', ') : String(ctx.projectIds);
    return {
      targetType: 'homepage',
      targetNameOrId: ids || 'homepage recommendations',
    };
  }

  if (action.includes('airdrop')) return { targetType: 'airdrop', targetNameOrId: 'unknown airdrop' };
  if (action.includes('article')) return { targetType: 'article', targetNameOrId: 'unknown article' };
  if (action.includes('banner')) return { targetType: 'banner', targetNameOrId: 'unknown banner' };
  if (action.includes('submission')) return { targetType: 'submission', targetNameOrId: 'unknown submission' };
  if (action.includes('scam report') || action.includes('report')) return { targetType: 'scam_report', targetNameOrId: 'unknown report' };
  if (action.includes('homepage') || action.includes('featured') || action.includes('trending')) {
    return { targetType: 'homepage', targetNameOrId: 'homepage recommendation' };
  }

  return { targetType: 'unknown', targetNameOrId: 'unknown target' };
}

const BANNER_PLACEMENT_OPTIONS: BannerPlacement[] = [
  'Homepage Hero Banner',
  'Homepage Mid-Page Banner',
  'Airdrop Detail Banner',
  'Dashboard Banner',
];

const BANNER_STATUS_OPTIONS: BannerStatus[] = ['Enquiry', 'Awaiting Artwork', 'Ready to Publish', 'Live', 'Expired'];

const BLANK_BANNER_FORM: BannerFormData = {
  advertiserName: '',
  contactEmail: '',
  websiteLink: '',
  bannerImageUrl: '',
  destinationUrl: '',
  altText: '',
  placement: 'Homepage Hero Banner',
  startDate: '',
  endDate: '',
  status: 'Enquiry',
  enabled: false,
  exclusivePlacement: true,
  notes: '',
  paymentState: 'Unpaid',
  archived: false,
};

function deriveBannerStatus(status: BannerStatus, startDate: string, endDate: string): BannerStatus {
  if (status === 'Expired') return 'Expired';
  const now = new Date().getTime();
  const endMs = endDate ? new Date(endDate).getTime() : Number.NaN;

  if (Number.isFinite(endMs) && endMs < now) return 'Expired';
  return status;
}

function getBannerStatusClass(status: BannerStatus): string {
  if (status === 'Live') return 'text-emerald-300 border-emerald-500/25 bg-emerald-500/10';
  if (status === 'Ready to Publish') return 'text-sky-300 border-sky-500/25 bg-sky-500/10';
  if (status === 'Awaiting Artwork') return 'text-amber-300 border-amber-500/25 bg-amber-500/10';
  if (status === 'Enquiry') return 'text-violet-300 border-violet-500/25 bg-violet-500/10';
  if (status === 'Expired') return 'text-rose-300 border-rose-500/25 bg-rose-500/10';
  return 'text-gray-300 border-white/15 bg-white/[0.04]';
}

function getBannerDisplayStatus(status: BannerStatus, startDate: string, endDate: string): BannerDisplayStatus {
  const now = Date.now();
  const start = startDate ? new Date(startDate).getTime() : Number.NaN;
  const end = endDate ? new Date(endDate).getTime() : Number.NaN;

  if (status === 'Expired' || (Number.isFinite(end) && end < now)) return 'Expired';
  if ((status === 'Ready to Publish' || status === 'Awaiting Artwork' || status === 'Enquiry') && Number.isFinite(start) && start > now) return 'Scheduled';
  return 'Active';
}

function getBannerDisplayClass(status: BannerDisplayStatus): string {
  if (status === 'Active') return 'text-emerald-300 border-emerald-500/25 bg-emerald-500/10';
  if (status === 'Scheduled') return 'text-sky-300 border-sky-500/25 bg-sky-500/10';
  return 'text-rose-300 border-rose-500/25 bg-rose-500/10';
}

function getPaymentStateClass(state: BannerPaymentState): string {
  if (state === 'Paid') return 'text-emerald-300 border-emerald-500/25 bg-emerald-500/10';
  if (state === 'Pending') return 'text-amber-300 border-amber-500/25 bg-amber-500/10';
  return 'text-gray-300 border-white/15 bg-white/[0.04]';
}

function getBannerNextAction(status: BannerStatus): string {
  if (status === 'Enquiry') return 'Upload artwork';
  if (status === 'Awaiting Artwork') return 'Check link';
  if (status === 'Ready to Publish') return 'Set dates';
  if (status === 'Live') return 'Expire banner';
  return 'Create new banner';
}

function levelFromRep(rep: number) {
  return Math.max(1, Math.floor(rep / 250) + 1);
}

function titleFromLevel(level: number) {
  if (level >= 50) return 'Web3 Veteran';
  if (level >= 35) return 'Airdrop Guardian';
  if (level >= 25) return 'Wallet Guardian';
  if (level >= 15) return 'DeFi Explorer';
  if (level >= 8) return 'Airdrop Hunter';
  return 'New Explorer';
}

function truncateText(value: string, max = 120) {
  const text = value.trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid date';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function awardApprovedScamReportRep(userId: string) {
  const { data: existing } = await supabase
    .from('user_reputation')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  const currentRep = Number(existing?.rep ?? 0);
  const newRep = currentRep + SCAM_REPORT_REP;
  const level = levelFromRep(newRep);

  const { error } = await supabase
    .from('user_reputation')
    .upsert({
      user_id: userId,
      rep: newRep,
      level,
      current_title: titleFromLevel(level),
      current_theme: existing?.current_theme ?? 'default',
      weekly_streak: existing?.weekly_streak ?? 0,
      last_login_at: existing?.last_login_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) throw error;

  await supabase
    .from('user_achievements')
    .upsert({
      user_id: userId,
      achievement_key: 'approved_scam_report',
      achievement_name: 'Scam Hunter',
      achievement_description: 'Had a suspicious project report approved by AirdropGuard review.',
    }, { onConflict: 'user_id,achievement_key' });
}

// ─── AirdropFormModal (shared Add + Edit) ─────────────────────────────────────

function AirdropFormModal({
  mode, form, setForm, onClose, onSave, saving,
}: {
  mode: 'add' | 'edit';
  form: AirdropFormData;
  setForm: React.Dispatch<React.SetStateAction<AirdropFormData>>;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  const inp = 'w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-purple/40';
  const lbl = 'block text-[10px] text-gray-500 uppercase tracking-wider mb-1';

  function toggleChain(chain: Blockchain) {
    setForm(f => ({
      ...f,
      blockchain: f.blockchain.includes(chain)
        ? f.blockchain.filter(b => b !== chain)
        : [...f.blockchain, chain],
    }));
  }

  function toggleCat(cat: Category) {
    setForm(f => ({
      ...f,
      category: f.category.includes(cat)
        ? f.category.filter(c => c !== cat)
        : [...f.category, cat],
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 pt-6 sm:p-4 sm:pt-10 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl glass-card p-4 sm:p-6 space-y-5 relative mb-12 overflow-x-hidden">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-white">{mode === 'add' ? 'Add New Airdrop' : 'Edit Airdrop'}</h2>
          <button onClick={onClose} aria-label="Close airdrop form" className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Project Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. LayerZero" className={inp} />
          </div>
          <div>
            <label className={lbl}>Ticker</label>
            <input value={form.ticker} onChange={e => setForm(f => ({ ...f, ticker: e.target.value.toUpperCase() }))} placeholder="e.g. ZRO" className={`${inp} font-mono`} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Logo URL</label>
            <input value={form.logo_url} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} placeholder="https://..." className={inp} />
          </div>
          <div>
            <label className={lbl}>Contract Address</label>
            <input value={form.contract_address} onChange={e => setForm(f => ({ ...f, contract_address: e.target.value }))} placeholder="0x..." className={`${inp} font-mono`} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Website</label>
            <input value={form.website_url} onChange={e => setForm(f => ({ ...f, website_url: e.target.value }))} placeholder="https://..." className={inp} />
          </div>
          <div>
            <label className={lbl}>Twitter</label>
            <input value={form.twitter_url} onChange={e => setForm(f => ({ ...f, twitter_url: e.target.value }))} placeholder="https://x.com/..." className={inp} />
          </div>
          <div>
            <label className={lbl}>Discord</label>
            <input value={form.discord_url} onChange={e => setForm(f => ({ ...f, discord_url: e.target.value }))} placeholder="https://discord.gg/..." className={inp} />
          </div>
          <div>
            <label className={lbl}>Telegram</label>
            <input value={form.telegram_url} onChange={e => setForm(f => ({ ...f, telegram_url: e.target.value }))} placeholder="https://t.me/..." className={inp} />
          </div>
        </div>

        {/* Trust score hints — used directly by the scorer */}
        <div className="pt-3 border-t border-white/5">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold mb-2.5">Trust Score Hints</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className={lbl}>Docs URL</label>
              <input value={form.docs_url} onChange={e => setForm(f => ({ ...f, docs_url: e.target.value }))} placeholder="https://docs.project.io" className={inp} />
            </div>
            <div>
              <label className={lbl}>GitHub URL</label>
              <input value={form.github_url} onChange={e => setForm(f => ({ ...f, github_url: e.target.value }))} placeholder="https://github.com/..." className={inp} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className={lbl}>Funding Info</label>
              <input value={form.funding_info} onChange={e => setForm(f => ({ ...f, funding_info: e.target.value }))} placeholder='e.g. "$42M Series A"' className={inp} />
            </div>
            <div>
              <label className={lbl}>Investors</label>
              <input value={form.investors} onChange={e => setForm(f => ({ ...f, investors: e.target.value }))} placeholder="e.g. Polychain, a16z" className={inp} />
            </div>
          </div>
          <div>
            <label className={lbl}>Team Info</label>
            <input value={form.team_info} onChange={e => setForm(f => ({ ...f, team_info: e.target.value }))} placeholder="e.g. Founded by ex-Coinbase engineers" className={inp} />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            ['Status', 'status', ['Active', 'Ending Soon', 'Expired']],
            ['Risk', 'risk_level', ['Low', 'Medium', 'High']],
            ['Reward', 'reward_potential', ['Low', 'Medium', 'High']],
            ['Difficulty', 'difficulty', ['Easy', 'Moderate', 'Hard']],
          ] as [string, keyof AirdropFormData, string[]][]).map(([label, key, opts]) => (
            <div key={key}>
              <label className={lbl}>{label}</label>
              <select value={form[key] as string} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-purple/40 cursor-pointer">
                {opts.map(o => <option key={o} value={o} className="bg-dark-900">{o}</option>)}
              </select>
            </div>
          ))}
        </div>

        <div>
          <label className={`${lbl} mb-2`}>Blockchain</label>
          <div className="flex flex-wrap gap-1.5">
            {BLOCKCHAIN_OPTIONS.map(chain => (
              <button key={chain} type="button" onClick={() => toggleChain(chain)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  form.blockchain.includes(chain)
                    ? 'bg-neon-purple/15 border-neon-purple/40 text-neon-purple'
                    : 'bg-transparent border-white/10 text-gray-500 hover:border-white/20'
                }`}>{chain}</button>
            ))}
          </div>
        </div>

        <div>
          <label className={`${lbl} mb-2`}>Category</label>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_OPTIONS.map(cat => (
              <button key={cat} type="button" onClick={() => toggleCat(cat)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  form.category.includes(cat)
                    ? 'bg-neon-blue/15 border-neon-blue/40 text-neon-blue'
                    : 'bg-transparent border-white/10 text-gray-500 hover:border-white/20'
                }`}>{cat}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={lbl}>Est. Reward</label>
            <input value={form.estimated_reward} onChange={e => setForm(f => ({ ...f, estimated_reward: e.target.value }))} placeholder="e.g. $200–$2,000" className={inp} />
          </div>
          <div>
            <label className={lbl}>Expiry Date</label>
            <input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} className={`${inp} [color-scheme:dark]`} />
          </div>
          <div>
            <label className={lbl}>Time Required</label>
            <input value={form.time_required} onChange={e => setForm(f => ({ ...f, time_required: e.target.value }))} placeholder="e.g. 10 mins/week" className={inp} />
          </div>
        </div>

        <div>
          <label className={lbl}>Description / AI Summary</label>
          <textarea value={form.ai_summary} onChange={e => setForm(f => ({ ...f, ai_summary: e.target.value }))}
            placeholder="Brief description of this airdrop opportunity..." rows={3}
            className="w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-purple/40 resize-none" />
        </div>

        <div className="pt-3 border-t border-white/5">
          <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Airdrop Tasks</label>
            <span className="text-[10px] text-gray-600">One task per line</span>
          </div>
          <textarea
            value={form.tasks_text}
            onChange={e => setForm(f => ({ ...f, tasks_text: e.target.value }))}
            placeholder={`Follow official X account
Join Discord
Complete onboarding
Use testnet / bridge / swap
Check eligibility updates`}
            rows={5}
            className="w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-purple/40 resize-none"
          />
          <p className="text-[10px] text-gray-600 mt-1">
            These tasks are saved into the airdrop_tasks table so the customer dashboard can show real tasks and progress.
          </p>
        </div>

        {/* Flags */}
        <div className="flex flex-wrap gap-4 py-2 border-t border-white/5">
          {([
            ['published', 'Publish'],
            ['is_featured', 'Featured'],
            ['is_trending', 'Trending'],
            ['is_sponsored', 'Sponsored'],
          ] as [keyof AirdropFormData, string][]).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer"
              onClick={() => setForm(f => ({ ...f, [key]: !f[key as keyof AirdropFormData] }))}>
              <div className={`w-9 h-5 rounded-full transition-colors relative ${form[key] ? 'bg-emerald-500' : 'bg-dark-600 border border-white/10'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form[key] ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-xs text-gray-400">{label}</span>
            </label>
          ))}
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-1">
          <button onClick={onClose} className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white border border-white/10 hover:border-white/20 transition-colors">
            Cancel
          </button>
          <button onClick={onSave} disabled={saving || !form.name.trim()}
            className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl text-sm font-medium bg-neon-purple/15 border border-neon-purple/30 text-neon-purple hover:bg-neon-purple/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'add' ? <Plus className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
            {mode === 'add' ? 'Add Airdrop' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DeleteModal ──────────────────────────────────────────────────────────────

function DeleteModal({
  airdrop, onConfirm, onCancel, deleting,
}: {
  airdrop: Airdrop; onConfirm: () => void; onCancel: () => void; deleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm glass-card p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Delete Airdrop</h3>
            <p className="text-sm text-gray-400 mt-1">
              Delete <span className="font-semibold text-white">{airdrop.name}</span>?
            </p>
          </div>
        </div>
        <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
          This will permanently delete this airdrop.
        </p>
        <div className="flex items-center justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white border border-white/10 hover:border-white/20 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={deleting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500/25 transition-colors disabled:opacity-50">
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function BannerFormModal({
  mode,
  form,
  setForm,
  onClose,
  onSave,
}: {
  mode: 'add' | 'edit';
  form: BannerFormData;
  setForm: React.Dispatch<React.SetStateAction<BannerFormData>>;
  onClose: () => void;
  onSave: () => void;
}) {
  const inputClass = 'w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-purple/40';
  const labelClass = 'block text-[10px] text-gray-500 uppercase tracking-wider mb-1';

  const onImageFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setForm((prev) => ({ ...prev, bannerImageUrl: objectUrl }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 pt-6 sm:p-4 sm:pt-10 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-3xl glass-card p-4 sm:p-6 space-y-5 relative mb-12 overflow-x-hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">{mode === 'add' ? 'Create Banner' : 'Edit Banner'}</h2>
            <p className="text-xs text-gray-500 mt-1">Prepare enquiry workflow, upload artwork placeholders, and preview before going live.</p>
          </div>
          <button onClick={onClose} aria-label="Close banner form" className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2">1. Advertiser details</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Project name *</label>
                <input
                  value={form.advertiserName}
                  onChange={(e) => setForm((f) => ({ ...f, advertiserName: e.target.value }))}
                  placeholder="e.g. ZetaChain"
                  className={inputClass}
                />
                <p className="text-[10px] text-gray-600 mt-1">Name shown on the live banner record.</p>
              </div>
              <div>
                <label className={labelClass}>Contact email</label>
                <input
                  value={form.contactEmail}
                  onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                  placeholder="ads@project.com"
                  className={inputClass}
                />
                <p className="text-[10px] text-gray-600 mt-1">Where to request edits or approval.</p>
              </div>
              <div>
                <label className={labelClass}>Website link</label>
                <input
                  value={form.websiteLink}
                  onChange={(e) => setForm((f) => ({ ...f, websiteLink: e.target.value }))}
                  placeholder="https://project.example"
                  className={inputClass}
                />
                <p className="text-[10px] text-gray-600 mt-1">Reference site for manual checks.</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2">2. Banner setup</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Placement *</label>
                <select
                  value={form.placement}
                  onChange={(e) => setForm((f) => ({ ...f, placement: e.target.value as BannerPlacement }))}
                  className="w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-purple/40"
                >
                  {BANNER_PLACEMENT_OPTIONS.map((placement) => (
                    <option key={placement} value={placement} className="bg-dark-900">{placement}</option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-600 mt-1">Each placement is $149 and exclusive.</p>
              </div>
              <div>
                <label className={labelClass}>Destination URL *</label>
                <input
                  value={form.destinationUrl}
                  onChange={(e) => setForm((f) => ({ ...f, destinationUrl: e.target.value }))}
                  placeholder="https://project.example/campaign"
                  className={inputClass}
                />
                <p className="text-[10px] text-gray-600 mt-1">Where users go when they click the ad.</p>
              </div>
              <div>
                <label className={labelClass}>Banner image placeholder</label>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neon-blue/25 bg-neon-blue/10 text-neon-blue text-sm font-medium cursor-pointer hover:bg-neon-blue/20 transition-colors">
                    <ImagePlus className="w-4 h-4" />
                    Upload artwork
                    <input type="file" accept="image/*" className="hidden" onChange={onImageFileSelected} />
                  </label>
                  <input
                    value={form.bannerImageUrl}
                    onChange={(e) => setForm((f) => ({ ...f, bannerImageUrl: e.target.value }))}
                    placeholder="or paste image URL"
                    className={inputClass}
                  />
                </div>
                <p className="text-[10px] text-gray-600 mt-1">Use this to stage creative before publish.</p>
              </div>
              <div>
                <label className={labelClass}>Alt text</label>
                <input
                  value={form.altText}
                  onChange={(e) => setForm((f) => ({ ...f, altText: e.target.value }))}
                  placeholder="Short accessibility description"
                  className={inputClass}
                />
                <p className="text-[10px] text-gray-600 mt-1">Accessibility label for screen readers.</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2">3. Schedule</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Start date</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  className={`${inputClass} [color-scheme:dark]`}
                />
                <p className="text-[10px] text-gray-600 mt-1">Date the banner should first appear.</p>
              </div>
              <div>
                <label className={labelClass}>End date</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  className={`${inputClass} [color-scheme:dark]`}
                />
                <p className="text-[10px] text-gray-600 mt-1">Date the banner should expire.</p>
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as BannerStatus }))}
                  className="w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-purple/40"
                >
                  {BANNER_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status} className="bg-dark-900">{status}</option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-600 mt-1">Move from enquiry to live in clear steps.</p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className={labelClass}>4. Internal notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={3}
            placeholder="Admin notes only: approvals, artwork requests, launch notes."
            className="w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-purple/40 resize-none"
          />
          <p className="text-[10px] text-gray-600 mt-1">Visible to admin team only.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/5">
          <label className="flex items-center gap-2 cursor-pointer">
            <div className={`w-9 h-5 rounded-full transition-colors relative ${form.enabled ? 'bg-emerald-500' : 'bg-dark-600 border border-white/10'}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-xs text-gray-400">Banner enabled</span>
            <input type="checkbox" checked={form.enabled} onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))} className="hidden" />
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <div className={`w-9 h-5 rounded-full transition-colors relative ${form.exclusivePlacement ? 'bg-amber-500' : 'bg-dark-600 border border-white/10'}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.exclusivePlacement ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-xs text-gray-400">Exclusive placement badge</span>
            <input type="checkbox" checked={form.exclusivePlacement} onChange={(e) => setForm((f) => ({ ...f, exclusivePlacement: e.target.checked }))} className="hidden" />
          </label>

          <div>
            <label className={labelClass}>Future Paid Status Placeholder</label>
            <select
              value={form.paymentState}
              onChange={(e) => setForm((f) => ({ ...f, paymentState: e.target.value as BannerPaymentState }))}
              className="w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-purple/40"
            >
              <option value="Unpaid" className="bg-dark-900">Unpaid</option>
              <option value="Pending" className="bg-dark-900">Pending</option>
              <option value="Paid" className="bg-dark-900">Paid</option>
            </select>
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-3">
          <p className="text-[10px] uppercase tracking-wider text-cyan-300 font-semibold mb-2">Banner Preview</p>
          <div className="rounded-xl border border-white/10 bg-dark-900/40 p-3 flex items-center gap-3">
            <div className="w-24 h-14 rounded-lg border border-white/10 bg-white/[0.03] overflow-hidden flex items-center justify-center">
              {form.bannerImageUrl ? (
                <img src={form.bannerImageUrl} alt={form.altText || 'Banner preview'} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] text-gray-500">No image</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{form.advertiserName || 'Advertiser name'}</p>
              <p className="text-[11px] text-gray-400 truncate">{form.destinationUrl || 'Destination URL'}</p>
              <div className="flex items-center gap-2 mt-1.5 text-[10px]">
                <span className="px-2 py-0.5 rounded-full border border-white/15 bg-white/[0.04] text-gray-300">{form.placement}</span>
                {form.exclusivePlacement && <span className="px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300">Exclusive</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white border border-white/10 hover:border-white/20 transition-colors">
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={!form.advertiserName.trim() || !form.destinationUrl.trim()}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-medium bg-neon-purple/15 border border-neon-purple/30 text-neon-purple hover:bg-neon-purple/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mode === 'add' ? <Plus className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
            {mode === 'add' ? 'Create Banner' : 'Save Banner'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user, loading: authLoading, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const [airdrops, setAirdrops] = useState<Airdrop[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const verificationNotesResolverRef = useRef<((notes: string | null) => void) | null>(null);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [verificationModalActionLabel, setVerificationModalActionLabel] = useState('');
  const [verificationModalNotes, setVerificationModalNotes] = useState('');
  const [verificationModalSaving, setVerificationModalSaving] = useState(false);

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
  }, []);

  const formatSupabaseError = useCallback((error: unknown) => {
    const err = error as {
      code?: string;
      message?: string;
      details?: string | null;
      hint?: string | null;
    };

    return [err?.code, err?.message, err?.details, err?.hint]
      .filter((part) => Boolean(part && String(part).trim()))
      .join(' | ');
  }, []);

  const describeError = useCallback((error: unknown) => {
    const supabaseText = formatSupabaseError(error);
    if (supabaseText) return supabaseText;
    if (error instanceof Error && error.message) return error.message;
    if (typeof error === 'string' && error.trim()) return error;
    try {
      const serialized = JSON.stringify(error);
      return serialized && serialized !== '{}' ? serialized : 'Unexpected non-standard error object';
    } catch {
      return 'Unexpected non-standard error object';
    }
  }, [formatSupabaseError]);

  const getSupabaseErrorCode = useCallback((error: unknown) => {
    const err = error as { code?: string };
    return err?.code ?? null;
  }, []);

  const describeFunctionInvokeError = useCallback((error: unknown) => {
    const err = error as {
      name?: string;
      message?: string;
      status?: number;
      context?: unknown;
      details?: unknown;
      error?: unknown;
    };

    const parts: string[] = [];
    if (err?.name) parts.push(`name=${err.name}`);
    if (typeof err?.status === 'number') parts.push(`status=${err.status}`);
    if (err?.message) parts.push(`message=${err.message}`);

    const contextValue = err?.context ?? err?.details ?? err?.error;
    if (contextValue !== undefined) {
      try {
        const serialized = typeof contextValue === 'string' ? contextValue : JSON.stringify(contextValue);
        if (serialized && serialized !== '{}') parts.push(`body=${serialized}`);
      } catch {
        // ignore serialization errors
      }
    }

    if (parts.length > 0) return parts.join(' | ');
    return describeError(error);
  }, [describeError]);

  const describeFunctionInvokeErrorDetailed = useCallback(async (error: unknown) => {
    const base = describeFunctionInvokeError(error);
    const err = error as { context?: unknown };
    const maybeResponse = err?.context as { status?: number; text?: () => Promise<string> } | undefined;

    if (!maybeResponse || typeof maybeResponse.text !== 'function') {
      return base;
    }

    try {
      const bodyText = await maybeResponse.text();
      const statusText = typeof maybeResponse.status === 'number' ? `status=${maybeResponse.status}` : null;
      const cleanedBody = bodyText?.trim();
      if (!cleanedBody) {
        return statusText ? `${base} | ${statusText}` : base;
      }

      return [base, statusText, `body=${cleanedBody}`].filter(Boolean).join(' | ');
    } catch {
      return base;
    }
  }, [describeFunctionInvokeError]);

  const setCompetitorUiError = useCallback((message: string, error?: unknown) => {
    const details = error ? describeError(error) : null;
    setCompetitorError(message);
    setCompetitorErrorDetails(details);
    if (details) {
      console.warn('[Admin][CompetitorWatch]', { message, details });
    }
  }, [describeError]);

  const dismissVerificationModal = useCallback((result: string | null) => {
    verificationNotesResolverRef.current?.(result);
    verificationNotesResolverRef.current = null;
    setVerificationModalSaving(false);
    setVerificationModalNotes('');
    setVerificationModalActionLabel('');
    setVerificationModalOpen(false);
  }, []);

  const cancelVerificationModal = useCallback(() => {
    console.info('[Admin][ArticleTrust] Verification notes modal cancelled');
    showToast('Save cancelled. Audit Notes are required.', 'error');
    dismissVerificationModal(null);
  }, [dismissVerificationModal, showToast]);

  const confirmVerificationModal = useCallback(() => {
    const trimmedNotes = verificationModalNotes.trim();
    if (!trimmedNotes) {
      showToast('Audit Notes are required.', 'error');
      return;
    }
    console.info('[Admin][VerificationModal] Saving audit notes', {
      actionLabel: verificationModalActionLabel,
      notesLength: trimmedNotes.length,
    });
    setVerificationModalSaving(true);
    dismissVerificationModal(trimmedNotes);
  }, [verificationModalNotes, verificationModalActionLabel, dismissVerificationModal, showToast]);

  const promptHumanVerificationNotes = useCallback((actionLabel: string): Promise<string | null> => {
    if (verificationModalOpen) {
      showToast('Finish the current verification modal first.', 'error');
      return Promise.resolve(null);
    }

    console.info('[Admin][ArticleTrust] Opening verification notes modal', { actionLabel });
    setVerificationModalActionLabel(actionLabel);
    setVerificationModalNotes('');
    setVerificationModalSaving(false);
    setVerificationModalOpen(true);

    return new Promise((resolve) => {
      verificationNotesResolverRef.current = resolve;
    });
  }, [verificationModalOpen, showToast]);

  useEffect(() => () => {
    if (verificationNotesResolverRef.current) {
      verificationNotesResolverRef.current(null);
      verificationNotesResolverRef.current = null;
    }
  }, []);

  const logAdminAudit = useCallback(async ({
    actionTaken,
    aiRecommendation,
    finalDecision,
    notes,
    context,
  }: AdminAuditPayload, options?: { throwOnError?: boolean; source?: string }) => {
    const adminIdentifier = (user as { email?: string } | null)?.email || user?.id || 'admin';

    const { data, error } = await supabase
      .from('admin_audit_logs')
      .insert({
        admin_user_id: user?.id ?? null,
        admin_identifier: adminIdentifier,
        action_taken: actionTaken,
        ai_recommendation: aiRecommendation,
        final_decision: finalDecision,
        notes: notes ?? null,
        context: context ?? {},
      })
      .select('*')
      .single();

    if (error) {
      const exactError = formatSupabaseError(error) || error.message;
      console.error('admin_audit_logs insert failed', {
        source: options?.source ?? 'unknown',
        actionTaken,
        context,
        code: (error as { code?: string }).code,
        message: error.message,
        details: (error as { details?: string | null }).details ?? null,
        hint: (error as { hint?: string | null }).hint ?? null,
      });

      if (options?.throwOnError) {
        throw new Error(exactError);
      }

      return { ok: false as const, error: exactError };
    }

    if (data) {
      setAuditLogs((prev) => {
        if (prev.some((row) => row.id === data.id)) return prev;
        return [data as AdminAuditLog, ...prev];
      });
    }

    return { ok: true as const, data: data as AdminAuditLog | null };
  }, [user, formatSupabaseError]);

  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [subLoading, setSubLoading] = useState(true);
  const [expandedSub, setExpandedSub] = useState<string | null>(null);
  const [expandedAirdrop, setExpandedAirdrop] = useState<string | null>(null);
  const [subNotes, setSubNotes] = useState<Record<string, string>>({});
  const [analyzingSub, setAnalyzingSub] = useState<string | null>(null);

  const [scamReports, setScamReports] = useState<ScamReport[]>([]);
  const [scamReportsLoading, setScamReportsLoading] = useState(true);
  const [expandedScamReport, setExpandedScamReport] = useState<string | null>(null);
  const [scamReportNotes, setScamReportNotes] = useState<Record<string, string>>({});
  const [reviewingScamReport, setReviewingScamReport] = useState<string | null>(null);

  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('all');
  const [auditTargetFilter, setAuditTargetFilter] = useState<'all' | AuditTargetType>('all');
  const [auditAdminFilter, setAuditAdminFilter] = useState('all');

  // ── Modal state ───────────────────────────────────────────────────────────
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AirdropFormData>(BLANK_FORM);
  const [saving, setSaving] = useState(false);

  const [deletingAirdrop, setDeletingAirdrop] = useState<Airdrop | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshingAll, setRefreshingAll] = useState(false);

  const [banners, setBanners] = useState<BannerAd[]>(() => {
    const today = new Date();
    const end = new Date(today.getTime() + 7 * 86_400_000);
    return [
      {
        id: `banner_${today.getTime()}`,
        advertiserName: 'Example Campaign',
        contactEmail: 'ads@example.com',
        websiteLink: 'https://example.com',
        bannerImageUrl: '',
        destinationUrl: 'https://example.com',
        altText: 'Example campaign banner',
        placement: 'Homepage Hero Banner',
        startDate: today.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        status: 'Enquiry',
        enabled: true,
        exclusivePlacement: true,
        notes: 'Placeholder banner to seed admin workflow.',
        paymentState: 'Pending',
        archived: false,
        updatedAt: new Date().toISOString(),
      },
    ];
  });
  const [bannerModalMode, setBannerModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [bannerForm, setBannerForm] = useState<BannerFormData>(BLANK_BANNER_FORM);
  const [previewBannerId, setPreviewBannerId] = useState<string | null>(null);
  const [adminView, setAdminView] = useState<AdminView>('overview');
  const [contentView, setContentView] = useState<ContentView>('airdrops');
  const [controlArticles, setControlArticles] = useState<ControlArticle[]>([
    {
      id: 'article-layer2',
      articleKey: 'layer-2-airdrops-2026',
      title: 'Ethereum Layer 2 Airdrops in 2026: Security, ROI and Risk Framework',
      urlPath: '/articles/layer-2-airdrops-2026',
      status: 'published',
      updatedAt: new Date().toISOString(),
    },
  ]);
  const [articleTrustProfiles, setArticleTrustProfiles] = useState<Record<string, ArticleTrustProfile>>(() => {
    const entries = DEFAULT_ARTICLE_TRUST_PROFILES.map((profile) => [profile.articleKey, profile] as const);
    return Object.fromEntries(entries);
  });
  const [articleReviewInternal, setArticleReviewInternal] = useState<Record<string, ArticleReviewChecklist>>({
    'layer-2-airdrops-2026': DEFAULT_ARTICLE_CHECKLIST,
  });
  const [selectedArticleKey, setSelectedArticleKey] = useState('layer-2-airdrops-2026');
  const [articleTrustLoading, setArticleTrustLoading] = useState(false);
  const [articleTrustSaving, setArticleTrustSaving] = useState(false);
  const [homepageHeroTitle, setHomepageHeroTitle] = useState('Discover safer airdrops before you connect');
  const [homepageHeroSubtext, setHomepageHeroSubtext] = useState('AI-assisted intelligence with human-reviewed trust signals.');
  const [featuredProjectId, setFeaturedProjectId] = useState<string>('');
  const [trendingProjectIds, setTrendingProjectIds] = useState<string>('');
  const [learnHighlights, setLearnHighlights] = useState<string>('Airdrop basics\nWallet safety\nScam pattern recognition');
  const [homepageSections, setHomepageSections] = useState<string>('Hero\nFeatured Project\nTrending Grid\nLearn Spotlight');
  const [opsUsers, setOpsUsers] = useState<OpsUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  const [aiDrafts, setAIDrafts] = useState<AIArticleDraft[]>([]);
  const [aiDraftsLoading, setAIDraftsLoading] = useState(false);
  const [aiDraftsError, setAIDraftsError] = useState<string | null>(null);
  const [generatingDraft, setGeneratingDraft] = useState(false);

  const [competitorSources, setCompetitorSources] = useState<CompetitorSource[]>([]);
  const [competitorOpportunities, setCompetitorOpportunities] = useState<CompetitorOpportunity[]>([]);
  const [competitorLoading, setCompetitorLoading] = useState(false);
  const [competitorError, setCompetitorError] = useState<string | null>(null);
  const [competitorErrorDetails, setCompetitorErrorDetails] = useState<string | null>(null);
  const [competitorNotConfigured, setCompetitorNotConfigured] = useState(false);
  const [competitorSourceScanResults, setCompetitorSourceScanResults] = useState<Record<string, CompetitorSourceScanResult>>({});
  const [competitorScanDebugResults, setCompetitorScanDebugResults] = useState<Record<string, CompetitorScanDebugResult>>({});
  const [previewScanModeEnabled, setPreviewScanModeEnabled] = useState(false);
  const [pendingDiscoveryCandidates, setPendingDiscoveryCandidates] = useState<PendingDiscoveryCandidate[]>([]);
  const [checkingCompetitors, setCheckingCompetitors] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');

  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [lastEnrichmentStats, setLastEnrichmentStats] = useState<{
    websites_analyzed: number; docs_found: number; funding_found: number;
    github_found: number; token_detected: number; investors_found: number;
  } | null>(null);

  const pendingBannerEnquiries = useMemo(
    () => banners.filter((b) => b.status === 'Enquiry' || b.status === 'Awaiting Artwork').length,
    [banners]
  );
  const liveBannerAds = useMemo(
    () => banners.filter((b) => deriveBannerStatus(b.status, b.startDate, b.endDate) === 'Live' && b.enabled).length,
    [banners]
  );
  const expiringBannerAds = useMemo(() => {
    const now = new Date().getTime();
    const inSevenDays = now + 7 * 86_400_000;
    return banners.filter((b) => {
      if (!b.endDate) return false;
      const endMs = new Date(b.endDate).getTime();
      return Number.isFinite(endMs) && endMs >= now && endMs <= inSevenDays;
    }).length;
  }, [banners]);
  const pendingScamReports = useMemo(
    () => scamReports.filter((r) => r.status === 'pending').length,
    [scamReports]
  );
  const siteHealthIssues = useMemo(() => {
    const unpublished = (stats?.totalAirdrops ?? 0) - (stats?.publishedAirdrops ?? 0);
    const unscored = (stats?.totalAirdrops ?? 0) - (stats?.scoredAirdrops ?? 0);
    const unanalyzed = (stats?.totalAirdrops ?? 0) - (stats?.analyzedAirdrops ?? 0);
    return Math.max(0, unpublished) + Math.max(0, unscored) + Math.max(0, unanalyzed);
  }, [stats]);

  const expiringListings = useMemo(() => {
    const now = Date.now();
    const soon = now + 7 * 86_400_000;
    return airdrops.filter((a) => {
      if (!a.expiry_date) return false;
      const ts = new Date(a.expiry_date).getTime();
      return Number.isFinite(ts) && ts >= now && ts <= soon;
    });
  }, [airdrops]);

  const failedAiQueue = useMemo(
    () => airdrops.filter((a) => !(a.last_analyzed_at && String(a.last_analyzed_at).trim())),
    [airdrops]
  );

  const missingProjectInfo = useMemo(() => {
    const asRecord = (item: Airdrop) => item as unknown as Record<string, unknown>;
    const asText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

    return airdrops.filter((a) => {
      const rec = asRecord(a);
      const hasLogo = asText(a.logo_url).length > 0;
      const hasGithub = asText(rec.github_url).length > 0;
      const hasDocs = asText(rec.docs_url).length > 0;
      const hasFunding = asText(rec.funding_info).length > 0 || asText(rec.investors).length > 0;
      return !(hasLogo && hasGithub && hasDocs && hasFunding);
    });
  }, [airdrops]);

  const missingLogoCount = useMemo(() => airdrops.filter((a) => !String(a.logo_url ?? '').trim()).length, [airdrops]);
  const missingGithubCount = useMemo(() => airdrops.filter((a) => !String((a as unknown as Record<string, unknown>).github_url ?? '').trim()).length, [airdrops]);
  const missingDocsCount = useMemo(() => airdrops.filter((a) => !String((a as unknown as Record<string, unknown>).docs_url ?? '').trim()).length, [airdrops]);
  const missingFundingCount = useMemo(() => airdrops.filter((a) => {
    const row = a as unknown as Record<string, unknown>;
    return !String(row.funding_info ?? '').trim() && !String(row.investors ?? '').trim();
  }).length, [airdrops]);
  const missingWebsiteCount = useMemo(() => airdrops.filter((a) => !String(a.website_url ?? '').trim()).length, [airdrops]);
  const seoWarningCount = useMemo(() => airdrops.filter((a) => !String(a.ai_summary ?? '').trim()).length, [airdrops]);

  const articlesAwaitingPublication = useMemo(
    () => controlArticles.filter((a) => a.status !== 'published'),
    [controlArticles]
  );

  const bannerDisplaySummary = useMemo(() => {
    let active = 0;
    let scheduled = 0;
    let expired = 0;

    banners.forEach((banner) => {
      const display = getBannerDisplayStatus(banner.status, banner.startDate, banner.endDate);
      if (display === 'Active') active += 1;
      if (display === 'Scheduled') scheduled += 1;
      if (display === 'Expired') expired += 1;
    });

    return { active, scheduled, expired };
  }, [banners]);

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return opsUsers;
    const needle = userSearch.trim().toLowerCase();
    return opsUsers.filter((u) => u.email.toLowerCase().includes(needle));
  }, [opsUsers, userSearch]);

  const auditActionOptions = useMemo(() => {
    const options = Array.from(new Set(auditLogs.map((log) => log.action_taken).filter(Boolean)));
    return options.sort((a, b) => a.localeCompare(b));
  }, [auditLogs]);

  const auditAdminOptions = useMemo(() => {
    const options = Array.from(new Set(auditLogs.map((log) => log.admin_identifier).filter(Boolean)));
    return options.sort((a, b) => a.localeCompare(b));
  }, [auditLogs]);

  const filteredAuditLogs = useMemo(() => {
    const needle = auditSearch.trim().toLowerCase();

    return [...auditLogs]
      .filter((log) => {
        const target = inferAuditTarget(log);

        if (auditActionFilter !== 'all' && log.action_taken !== auditActionFilter) return false;
        if (auditTargetFilter !== 'all' && target.targetType !== auditTargetFilter) return false;
        if (auditAdminFilter !== 'all' && log.admin_identifier !== auditAdminFilter) return false;

        if (!needle) return true;

        const haystack = [
          log.admin_identifier,
          log.action_taken,
          target.targetType,
          target.targetNameOrId,
          log.ai_recommendation || '',
          log.final_decision,
          log.notes || '',
        ].join(' ').toLowerCase();

        return haystack.includes(needle);
      })
      .sort((a, b) => new Date(b.action_at).getTime() - new Date(a.action_at).getTime());
  }, [auditLogs, auditSearch, auditActionFilter, auditTargetFilter, auditAdminFilter]);

  const auditEntriesTodayCount = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return auditLogs.filter((log) => {
      const ts = new Date(log.action_at).getTime();
      return Number.isFinite(ts) && ts >= startOfDay;
    }).length;
  }, [auditLogs]);

  const auditNeedsAttentionStatus = auditLoading
    ? 'Loading activity'
    : auditError
    ? 'Audit logs unavailable'
    : 'Human verification today';

  const auditNeedsAttentionBlurb = auditLoading
    ? 'Fetching latest admin verification history.'
    : auditError
    ? 'Audit log fetch failed. Open section to retry safely.'
    : 'Trace publish, reject, approve, feature, banner and article decisions.';

  const selectedControlArticle = useMemo(
    () => controlArticles.find((article) => article.articleKey === selectedArticleKey) ?? controlArticles[0] ?? null,
    [controlArticles, selectedArticleKey]
  );

  const selectedArticleProfile = useMemo(() => {
    if (!selectedControlArticle) return null;
    return (
      articleTrustProfiles[selectedControlArticle.articleKey] ||
      DEFAULT_ARTICLE_TRUST_PROFILES.find((profile) => profile.articleKey === selectedControlArticle.articleKey) ||
      null
    );
  }, [selectedControlArticle, articleTrustProfiles]);

  const selectedArticleChecklist = useMemo(() => {
    if (!selectedControlArticle) return DEFAULT_ARTICLE_CHECKLIST;
    return articleReviewInternal[selectedControlArticle.articleKey] || DEFAULT_ARTICLE_CHECKLIST;
  }, [selectedControlArticle, articleReviewInternal]);

  const newUsersCount = useMemo(() => {
    const last7 = Date.now() - 7 * 86_400_000;
    return opsUsers.filter((u) => new Date(u.createdAt).getTime() >= last7).length;
  }, [opsUsers]);

  const activeUsersCount = useMemo(() => {
    const last14 = Date.now() - 14 * 86_400_000;
    return opsUsers.filter((u) => new Date(u.lastSeenAt).getTime() >= last14).length;
  }, [opsUsers]);

  const apiUsersCount = useMemo(() => opsUsers.filter((u) => u.plan === 'api' || u.plan === 'premium').length, [opsUsers]);
  const premiumUsersCount = stats ? stats.proSubs + stats.businessSubs : 0;

  const featuredListingEnquiries = useMemo(
    () => submissions.filter((s) => (s.airdrop_type ?? '').toLowerCase().includes('featured')).length,
    [submissions]
  );

  const estimatedRevenuePipeline = useMemo(
    () => pendingBannerEnquiries * 149 + featuredListingEnquiries * 299,
    [pendingBannerEnquiries, featuredListingEnquiries]
  );

  const unreadNotificationsCount = useMemo(
    () => adminNotifications.filter((item) => !item.is_read).length,
    [adminNotifications]
  );

  const adminNavItems: Array<{ id: AdminView; label: string; blurb: string }> = useMemo(() => [
    { id: 'overview', label: 'Overview', blurb: 'Command centre summary and alerts' },
    { id: 'airdrops', label: 'Airdrops', blurb: 'Listings, publish, health, queue' },
    { id: 'submissions', label: 'Submissions', blurb: 'Project and scam report triage' },
    { id: 'content', label: 'Articles / Content', blurb: 'Editorial and homepage control' },
    { id: 'ai-drafts', label: 'AI Article Drafts', blurb: 'Weekly AI drafts for review' },
    { id: 'competitor-watch', label: 'Competitor Watch', blurb: 'Missing-opportunity monitoring' },
    { id: 'users', label: 'Users', blurb: 'Users and adoption overview' },
    { id: 'api', label: 'API', blurb: 'Subscriptions, keys and revenue' },
    { id: 'banners', label: 'Banners', blurb: 'Ad campaigns and placements' },
    { id: 'audit-logs', label: 'Audit Logs', blurb: 'Human decision trail' },
    { id: 'system-tools', label: 'System Tools', blurb: 'AI queue and system maintenance' },
  ], []);

  const activeAdminNavItem = useMemo(
    () => adminNavItems.find((item) => item.id === adminView) ?? adminNavItems[0],
    [adminNavItems, adminView]
  );

  const canShowSection = useCallback((section: AdminView) => adminView === section, [adminView]);

  const jumpToSection = (id: string) => {
    const section = document.getElementById(id);
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openFirstAirdropMatch = async (
    matcher: (airdrop: Airdrop) => boolean,
    noMatchMessage: string
  ) => {
    const match = airdrops.find(matcher);
    if (!match) {
      showToast(noMatchMessage, 'error');
      return;
    }
    await openEdit(match);
  };

  const fetchOpsUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,email,created_at,last_login_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const rows = (data ?? []) as Array<Record<string, unknown>>;
      const mapped: OpsUser[] = rows.map((row) => ({
        id: String(row.id ?? crypto.randomUUID()),
        email: String(row.email ?? 'unknown@user.local'),
        createdAt: String(row.created_at ?? new Date().toISOString()),
        lastSeenAt: String(row.last_login_at ?? row.created_at ?? new Date().toISOString()),
        plan: 'free',
      }));

      setOpsUsers(mapped);
    } catch {
      const synthetic = submissions
        .slice(0, 20)
        .map((sub, index): OpsUser => ({
          id: `submission-user-${sub.id}`,
          email: sub.website_url ? `founder+${index + 1}@submission.local` : `unknown+${index + 1}@submission.local`,
          createdAt: sub.submitted_at,
          lastSeenAt: sub.submitted_at,
          plan: index % 4 === 0 ? 'premium' : index % 3 === 0 ? 'api' : 'free',
        }));

      setOpsUsers(synthetic);
    } finally {
      setUsersLoading(false);
    }
  }, [submissions]);

  const createAdminNotification = useCallback(async (
    notification: Omit<AdminNotification, 'id' | 'is_read' | 'created_at'>
  ) => {
    const { data, error } = await supabase
      .from('admin_notifications')
      .insert({
        notification_type: notification.notification_type,
        title: notification.title,
        message: notification.message,
        severity: notification.severity,
        context: notification.context ?? {},
      })
      .select('id, notification_type, title, message, severity, is_read, context, created_at')
      .single();

    if (error) {
      console.warn('[Admin][Notifications] Failed to create notification', {
        error: describeError(error),
        notification,
      });
      return;
    }

    if (data) {
      setAdminNotifications((prev) => [data as AdminNotification, ...prev]);
    }
  }, [describeError]);

  const fetchAdminNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('id, notification_type, title, message, severity, is_read, context, created_at')
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      setAdminNotifications((data ?? []) as AdminNotification[]);
    } catch (error) {
      console.warn('[Admin][Notifications] Unable to load notifications', describeError(error));
      setAdminNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  }, [describeError]);

  const fetchAIDrafts = useCallback(async () => {
    setAIDraftsLoading(true);
    setAIDraftsError(null);
    try {
      const { data, error } = await supabase
        .from('ai_article_drafts')
        .select('id, week_start, title, slug, summary, body, meta_title, meta_description, estimated_read_minutes, status, created_at, updated_at, published_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAIDrafts((data ?? []) as AIArticleDraft[]);
    } catch (error) {
      const exact = describeError(error);
      setAIDrafts([]);
      setAIDraftsError(exact);
      console.error('[Admin][AIDrafts] Fetch failed', exact);
    } finally {
      setAIDraftsLoading(false);
    }
  }, [describeError]);

  const fetchCompetitorWatchData = useCallback(async () => {
    setCompetitorLoading(true);
    setCompetitorError(null);
    setCompetitorErrorDetails(null);
    setCompetitorNotConfigured(false);
    try {
      const [sourceRes, oppRes] = await Promise.all([
        supabase
          .from('competitor_sources')
          .select('id, source_name, source_url, is_active, last_checked_at, created_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('competitor_opportunities')
          .select('id, source_id, project_name, source_url, discovered_at, category, blockchain, confidence_level, why_matched, similarity_score, status, notes, created_at')
          .order('discovered_at', { ascending: false })
          .limit(200),
      ]);

      if (sourceRes.error) throw sourceRes.error;
      if (oppRes.error) throw oppRes.error;

      const sources = (sourceRes.data ?? []) as CompetitorSource[];
      const opportunities = (oppRes.data ?? []) as CompetitorOpportunity[];

      setCompetitorSources(sources);
      setCompetitorOpportunities(opportunities);

      const derivedScanResults: Record<string, CompetitorSourceScanResult> = {};
      sources.forEach((source) => {
        const sourceItems = opportunities.filter((item) => item.source_id === source.id);
        const sourceOppCount = sourceItems.length;
        const duplicateCount = sourceItems.filter((item) => item.status === 'duplicate').length;
        const newCount = sourceItems.filter((item) => item.status !== 'duplicate' && item.status !== 'ignored').length;
        if (!source.last_checked_at) {
          derivedScanResults[source.id] = {
            status: 'never_scanned',
            lastCheckedAt: null,
            totalScans: 0,
            successfulScans: 0,
            opportunitiesFound: 0,
            newProjects: 0,
            duplicateProjects: 0,
            failedExtractions: 0,
            durationMs: null,
            lastSuccessfulScan: null,
            successRate: 0,
            health: 'red',
            note: 'No scan recorded yet.',
          };
          return;
        }

        if (sourceOppCount > 0) {
          derivedScanResults[source.id] = {
            status: 'found',
            lastCheckedAt: source.last_checked_at,
            totalScans: 1,
            successfulScans: 1,
            opportunitiesFound: sourceOppCount,
            newProjects: newCount,
            duplicateProjects: duplicateCount,
            failedExtractions: 0,
            durationMs: null,
            lastSuccessfulScan: source.last_checked_at,
            successRate: 1,
            health: 'green',
            note: 'Project opportunities found in recent scans.',
          };
          return;
        }

        derivedScanResults[source.id] = {
          status: 'none_found',
          lastCheckedAt: source.last_checked_at,
          totalScans: 1,
          successfulScans: 0,
          opportunitiesFound: 0,
          newProjects: 0,
          duplicateProjects: 0,
          failedExtractions: 0,
          durationMs: null,
          lastSuccessfulScan: null,
          successRate: 0,
          health: 'amber',
          note: 'Only source-level signals detected in recent scans.',
        };
      });

      setCompetitorSourceScanResults(derivedScanResults);
    } catch (error) {
      const code = getSupabaseErrorCode(error);

      if (code === 'PGRST205') {
        setCompetitorNotConfigured(true);
        setCompetitorUiError('Competitor Watch is not configured yet. Please apply the Competitor Watch migration and refresh schema cache.', error);
      } else if (code === '42501') {
        setCompetitorUiError('Your admin account does not currently have permission to access Competitor Watch.', error);
      } else {
        setCompetitorUiError('Unable to load Competitor Watch right now. Please try again.', error);
      }

      setCompetitorSources([]);
      setCompetitorOpportunities([]);
      setCompetitorSourceScanResults({});
    } finally {
      setCompetitorLoading(false);
    }
  }, [getSupabaseErrorCode, setCompetitorUiError]);

  const fetchArticleTrustData = useCallback(async () => {
    setArticleTrustLoading(true);

    try {
      const [profileRes, internalRes] = await Promise.all([
        supabase
          .from('article_verification_profiles')
          .select('article_key, title, url_path, publication_status, verification_status, reviewed_by, reviewed_at, last_updated_at, estimated_read_minutes, official_docs_url, official_github_url, official_website_url, official_x_url, official_blog_url, updated_at')
          .order('updated_at', { ascending: false }),
        supabase
          .from('article_review_internal')
          .select('article_key, facts_checked, sources_verified, links_tested, scam_guidance_reviewed, security_advice_reviewed, grammar_checked, internal_review_notes'),
      ]);

      if (profileRes.error) {
        const code = (profileRes.error as { code?: string }).code;
        if (code === 'PGRST205') {
          showToast('Article trust table missing in Supabase. Apply migration 20260704113000_add_article_trust_verification_tables.sql.', 'error');
        } else if (code === '42501') {
          showToast('No permission to load article trust data. Confirm admin user mapping in admin_users.', 'error');
        }
      }

      if (!profileRes.error && profileRes.data) {
        const byKey: Record<string, ArticleTrustProfile> = {};
        const controlRows: ControlArticle[] = [];

        profileRes.data.forEach((row) => {
          const profile: ArticleTrustProfile = {
            articleKey: String(row.article_key),
            title: String(row.title),
            urlPath: String(row.url_path),
            publicationStatus: row.publication_status,
            verificationStatus: row.verification_status,
            reviewedBy: String(row.reviewed_by || 'AirdropGuard Team'),
            reviewedAt: row.reviewed_at,
            lastUpdatedAt: row.last_updated_at,
            estimatedReadMinutes: Number(row.estimated_read_minutes || 8),
            sources: {
              officialDocsUrl: row.official_docs_url,
              githubUrl: row.official_github_url,
              officialWebsiteUrl: row.official_website_url,
              officialXUrl: row.official_x_url,
              officialBlogUrl: row.official_blog_url,
            },
          };

          byKey[profile.articleKey] = profile;
          controlRows.push({
            id: `article-${profile.articleKey}`,
            articleKey: profile.articleKey,
            title: profile.title,
            urlPath: profile.urlPath,
            status: profile.publicationStatus,
            updatedAt: profile.lastUpdatedAt || new Date().toISOString(),
          });
        });

        if (Object.keys(byKey).length > 0) {
          setArticleTrustProfiles(byKey);
          setControlArticles(controlRows);
          setSelectedArticleKey(controlRows[0]?.articleKey || 'layer-2-airdrops-2026');
        }
      }

      if (!internalRes.error && internalRes.data) {
        const checklistByKey: Record<string, ArticleReviewChecklist> = {};
        internalRes.data.forEach((row) => {
          checklistByKey[String(row.article_key)] = {
            factsChecked: Boolean(row.facts_checked),
            sourcesVerified: Boolean(row.sources_verified),
            linksTested: Boolean(row.links_tested),
            scamGuidanceReviewed: Boolean(row.scam_guidance_reviewed),
            securityAdviceReviewed: Boolean(row.security_advice_reviewed),
            grammarChecked: Boolean(row.grammar_checked),
            internalReviewNotes: String(row.internal_review_notes || ''),
          };
        });
        setArticleReviewInternal((prev) => ({ ...prev, ...checklistByKey }));
      }
    } finally {
      setArticleTrustLoading(false);
    }
  }, [showToast]);

  const updateSelectedArticleProfile = useCallback((patch: Partial<ArticleTrustProfile>) => {
    if (!selectedControlArticle) return;
    setArticleTrustProfiles((prev) => {
      const existing = prev[selectedControlArticle.articleKey] || DEFAULT_ARTICLE_TRUST_PROFILES[0];
      return {
        ...prev,
        [selectedControlArticle.articleKey]: {
          ...existing,
          ...patch,
          sources: {
            ...existing.sources,
            ...(patch.sources || {}),
          },
        },
      };
    });
  }, [selectedControlArticle]);

  const updateSelectedArticleChecklist = useCallback((patch: Partial<ArticleReviewChecklist>) => {
    if (!selectedControlArticle) return;
    setArticleReviewInternal((prev) => {
      const existing = prev[selectedControlArticle.articleKey] || DEFAULT_ARTICLE_CHECKLIST;
      return {
        ...prev,
        [selectedControlArticle.articleKey]: {
          ...existing,
          ...patch,
        },
      };
    });
  }, [selectedControlArticle]);

  const getWeekStartISO = useCallback((value = new Date()) => {
    const d = new Date(value);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split('T')[0];
  }, []);

  const generateWeeklyDraft = useCallback(async () => {
    setGeneratingDraft(true);

    try {
      const weekStart = getWeekStartISO();
      const { data: existing, error: existingError } = await supabase
        .from('ai_article_drafts')
        .select('id,title')
        .eq('week_start', weekStart)
        .maybeSingle();

      if (existingError) throw existingError;
      if (existing) {
        showToast(`Weekly draft already exists: ${existing.title}`, 'error');
        setAdminView('ai-drafts');
        return;
      }

      const topics = [
        'Airdrop Safety Playbook',
        'Scam Prevention Checklist',
        'Wallet Safety Operations',
        'Malicious Token Red Flags',
        'Qualifying Safely for Airdrops',
        'Weekly Airdrop Trend Intelligence',
      ];
      const dayNumber = Math.floor(new Date().getTime() / 86_400_000);
      const topic = topics[dayNumber % topics.length];
      const title = `${topic} - Week of ${weekStart}`;
      const slug = `weekly-${weekStart}-${topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
      const summary = 'AI-assisted weekly editorial draft focused on safe airdrop participation and trust-first risk control.';
      const body = [
        `# ${title}`,
        '',
        '## Key Risks This Week',
        '- Identify suspicious claim URLs before wallet interactions.',
        '- Validate contract addresses from official sources only.',
        '- Use burner wallets for unverified experiments.',
        '',
        '## Human Review Checklist',
        '1. Validate sources and links.',
        '2. Confirm security guidance is accurate.',
        '3. Mark as Human Reviewed before publication.',
      ].join('\n');

      const payload = {
        week_start: weekStart,
        title,
        slug,
        summary,
        body,
        meta_title: `${title} | AirdropGuard`,
        meta_description: summary,
        estimated_read_minutes: 8,
        status: 'ai_assisted_draft' as AIDraftStatus,
      };

      const { data, error } = await supabase
        .from('ai_article_drafts')
        .insert(payload)
        .select('id, week_start, title, slug, summary, body, meta_title, meta_description, estimated_read_minutes, status, created_at, updated_at, published_at')
        .single();

      if (error) throw error;

      if (data) setAIDrafts((prev) => [data as AIArticleDraft, ...prev]);
      await createAdminNotification({
        notification_type: 'ai_draft_ready',
        title: 'New AI article draft ready',
        message: `${title} was generated and is awaiting human review.`,
        severity: 'success',
        context: { draftSlug: slug },
      });

      await logAdminAudit({
        actionTaken: 'Generate AI article draft',
        aiRecommendation: 'Weekly safety-focused draft generation',
        finalDecision: 'Draft generated for review',
        context: { weekStart, slug, title },
      }, { source: 'ai_article_drafts_generate' });

      showToast('Weekly AI draft generated');
      setAdminView('ai-drafts');
    } catch (error) {
      const exact = describeError(error);
      console.error('[Admin][AIDrafts] Generate weekly draft failed', exact);
      showToast(`Unable to generate weekly draft: ${exact}`, 'error');
      await createAdminNotification({
        notification_type: 'admin_error',
        title: 'Weekly draft generation failed',
        message: exact,
        severity: 'error',
        context: { area: 'ai_article_drafts' },
      });
    } finally {
      setGeneratingDraft(false);
    }
  }, [getWeekStartISO, showToast, describeError, createAdminNotification, logAdminAudit]);

  const updateDraft = useCallback(async (draftId: string, patch: Partial<AIArticleDraft>, actionLabel: string) => {
    try {
      const updatePayload = {
        ...patch,
        updated_at: new Date().toISOString(),
      } as Record<string, unknown>;

      const { data, error } = await supabase
        .from('ai_article_drafts')
        .update(updatePayload)
        .eq('id', draftId)
        .select('id, week_start, title, slug, summary, body, meta_title, meta_description, estimated_read_minutes, status, created_at, updated_at, published_at')
        .single();

      if (error) throw error;

      setAIDrafts((prev) => prev.map((row) => (row.id === draftId ? (data as AIArticleDraft) : row)));
      await logAdminAudit({
        actionTaken: actionLabel,
        aiRecommendation: 'AI-assisted draft workflow',
        finalDecision: 'Human decision recorded',
        context: { draftId, patch },
      }, { source: 'ai_article_drafts_update' });

      if (patch.status === 'ai_assisted_draft') {
        showToast('Draft reset to AI-Assisted Draft');
      } else if (patch.status === 'human_reviewed') {
        showToast('Draft marked as Human Reviewed');
      } else if (patch.status === 'verified_airdropguard') {
        showToast('Draft marked as Verified by AirdropGuard');
      } else if (patch.status === 'published') {
        showToast('Draft marked as Published (manual action)');
      } else {
        showToast('Draft updated');
      }
    } catch (error) {
      const exact = describeError(error);
      showToast(`Unable to update draft: ${exact}`, 'error');
    }
  }, [describeError, logAdminAudit, showToast]);

  const deleteDraft = useCallback(async (draft: AIArticleDraft) => {
    try {
      const { error } = await supabase
        .from('ai_article_drafts')
        .delete()
        .eq('id', draft.id);

      if (error) throw error;
      setAIDrafts((prev) => prev.filter((row) => row.id !== draft.id));
      await logAdminAudit({
        actionTaken: 'Delete AI article draft',
        aiRecommendation: 'Remove draft from pipeline',
        finalDecision: 'Draft deleted',
        context: { draftId: draft.id, title: draft.title },
      }, { source: 'ai_article_drafts_delete' });
      showToast('Draft deleted');
    } catch (error) {
      showToast(`Unable to delete draft: ${describeError(error)}`, 'error');
    }
  }, [describeError, logAdminAudit, showToast]);

  const addCompetitorSource = useCallback(async () => {
    const name = newSourceName.trim();
    const url = newSourceUrl.trim();
    if (!name || !url) {
      showToast('Source name and URL are required', 'error');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('competitor_sources')
        .insert({
          source_name: name,
          source_url: url,
          is_active: true,
        })
        .select('id, source_name, source_url, is_active, last_checked_at, created_at')
        .single();

      if (error) throw error;

      setCompetitorSources((prev) => [data as CompetitorSource, ...prev]);
      if (data) {
        setCompetitorSourceScanResults((prev) => ({
          ...prev,
          [String(data.id)]: {
            status: 'never_scanned',
            lastCheckedAt: null,
            totalScans: 0,
            successfulScans: 0,
            opportunitiesFound: 0,
            newProjects: 0,
            duplicateProjects: 0,
            failedExtractions: 0,
            durationMs: null,
            lastSuccessfulScan: null,
            successRate: 0,
            health: 'red',
            note: 'No scan recorded yet.',
          },
        }));
      }
      setNewSourceName('');
      setNewSourceUrl('');

      await logAdminAudit({
        actionTaken: 'Add competitor source',
        aiRecommendation: 'Track competitor/source listings',
        finalDecision: 'Source added',
        context: { sourceName: name, sourceUrl: url },
      }, { source: 'competitor_watch_add_source' });

      showToast('Competitor source added');
    } catch (error) {
      setCompetitorUiError('Unable to add source right now. Please try again.', error);
      showToast('Unable to add source right now. Please try again.', 'error');
    }
  }, [newSourceName, newSourceUrl, showToast, logAdminAudit, setCompetitorUiError]);

  const removeCompetitorSource = useCallback(async (source: CompetitorSource) => {
    try {
      const { error } = await supabase.from('competitor_sources').delete().eq('id', source.id);
      if (error) throw error;
      setCompetitorSources((prev) => prev.filter((row) => row.id !== source.id));
      setCompetitorSourceScanResults((prev) => {
        const next = { ...prev };
        delete next[source.id];
        return next;
      });
      await logAdminAudit({
        actionTaken: 'Remove competitor source',
        aiRecommendation: 'Stop monitoring source',
        finalDecision: 'Source removed',
        context: { sourceId: source.id, sourceName: source.source_name },
      }, { source: 'competitor_watch_remove_source' });
      showToast('Competitor source removed');
    } catch (error) {
      setCompetitorUiError('Unable to remove source right now. Please try again.', error);
      showToast('Unable to remove source right now. Please try again.', 'error');
    }
  }, [logAdminAudit, showToast, setCompetitorUiError]);

  const genericCompetitorOpportunities = useMemo(
    () => competitorOpportunities.filter((item) => isGenericOpportunityName(item.project_name) || isGenericSourceUrl(item.source_url)),
    [competitorOpportunities]
  );

  const opportunityIntelligence = useMemo(() => {
    return competitorOpportunities.map((opportunity) => {
      const details = getOpportunityDiscoveryDetails(opportunity);
      const normalized = normalizeProjectName(opportunity.project_name);
      return { opportunity, details, normalized };
    });
  }, [competitorOpportunities]);

  const sourceMentionsByProject = useMemo(() => {
    const map = new Map<string, Set<string>>();
    opportunityIntelligence.forEach((item) => {
      const sourceSet = map.get(item.normalized) ?? new Set<string>();
      sourceSet.add(item.opportunity.source_id);
      map.set(item.normalized, sourceSet);
    });
    return map;
  }, [opportunityIntelligence]);

  const prioritizedCompetitorOpportunities = useMemo(() => {
    const enriched = opportunityIntelligence.map((item) => {
      const mentions = sourceMentionsByProject.get(item.normalized)?.size ?? item.details.sourceMentions;
      const score = computeDiscoveryScore({
        sourceReliability: item.details.sourceReliability,
        sourceMentions: mentions,
        hasDocs: Boolean(item.details.officialDocsUrl),
        hasGithub: Boolean(item.details.githubUrl),
        hasX: Boolean(item.details.officialXUrl),
        hasDiscord: Boolean(item.details.officialDiscordUrl),
        hasBlockchain: Boolean(item.opportunity.blockchain),
        hasFunding: Boolean(item.details.fundingInfo),
        hasTeam: Boolean(item.details.teamInfo),
      });
      return {
        ...item,
        dynamicMentions: mentions,
        dynamicScore: score,
        dynamicPriority: getDiscoveryPriority(score),
      };
    });

    return enriched.sort((a, b) => {
      if (b.dynamicScore !== a.dynamicScore) return b.dynamicScore - a.dynamicScore;
      return new Date(b.opportunity.discovered_at).getTime() - new Date(a.opportunity.discovered_at).getTime();
    });
  }, [opportunityIntelligence, sourceMentionsByProject]);

  const prioritizedPendingDiscoveryCandidates = useMemo(() => {
    return [...pendingDiscoveryCandidates].sort((a, b) => {
      if (b.discoveryScore !== a.discoveryScore) return b.discoveryScore - a.discoveryScore;
      return new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime();
    });
  }, [pendingDiscoveryCandidates]);

  const sourceDashboardRows = useMemo(() => {
    return competitorSources.map((source) => {
      const scan = competitorSourceScanResults[source.id] ?? {
        status: source.last_checked_at ? 'none_found' : 'never_scanned',
        lastCheckedAt: source.last_checked_at,
        totalScans: source.last_checked_at ? 1 : 0,
        successfulScans: 0,
        opportunitiesFound: 0,
        newProjects: 0,
        duplicateProjects: 0,
        failedExtractions: 0,
        durationMs: null,
        lastSuccessfulScan: null,
        successRate: 0,
        health: source.last_checked_at ? 'amber' : 'red',
        note: source.last_checked_at ? 'No recent project opportunities recorded.' : 'No scan recorded yet.',
      } satisfies CompetitorSourceScanResult;

      const sourceItems = prioritizedCompetitorOpportunities.filter((item) => item.opportunity.source_id === source.id);
      const discoveredCount = sourceItems.length;
      const newCount = sourceItems.filter((item) => item.details.comparisonType === 'new_project').length;
      const duplicateCount = sourceItems.filter((item) => item.details.comparisonType !== 'new_project').length;
      const successRate = scan.totalScans > 0 ? scan.successfulScans / scan.totalScans : scan.successRate;
      const health = getSourceHealthIndicator(successRate, scan.status);

      return {
        source,
        scan: {
          ...scan,
          opportunitiesFound: Math.max(scan.opportunitiesFound, discoveredCount),
          newProjects: Math.max(scan.newProjects, newCount),
          duplicateProjects: Math.max(scan.duplicateProjects, duplicateCount),
          successRate,
          health,
        },
      };
    });
  }, [competitorSources, competitorSourceScanResults, prioritizedCompetitorOpportunities]);

  const discoveryHistoryRows = useMemo(() => {
    const map = new Map<string, {
      projectName: string;
      firstDiscovered: string;
      discoveredBy: string;
      sourceIds: Set<string>;
      lastChecked: string;
      status: CompetitorOpportunityStatus;
    }>();

    prioritizedCompetitorOpportunities.forEach(({ opportunity, details, normalized }) => {
      const existing = map.get(normalized);
      const firstDiscovered = details.firstDiscoveredAt || opportunity.discovered_at;
      if (!existing) {
        map.set(normalized, {
          projectName: opportunity.project_name,
          firstDiscovered,
          discoveredBy: details.sourceLabel,
          sourceIds: new Set([opportunity.source_id]),
          lastChecked: opportunity.discovered_at,
          status: opportunity.status,
        });
        return;
      }

      existing.sourceIds.add(opportunity.source_id);
      if (new Date(opportunity.discovered_at).getTime() > new Date(existing.lastChecked).getTime()) {
        existing.lastChecked = opportunity.discovered_at;
        existing.status = opportunity.status;
      }
      if (new Date(firstDiscovered).getTime() < new Date(existing.firstDiscovered).getTime()) {
        existing.firstDiscovered = firstDiscovered;
        existing.discoveredBy = details.sourceLabel;
      }
    });

    return Array.from(map.values()).sort((a, b) => new Date(b.lastChecked).getTime() - new Date(a.lastChecked).getTime());
  }, [prioritizedCompetitorOpportunities]);

  const competitorAnalytics = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const successfulScansToday = sourceDashboardRows.filter((row) => {
      if (!row.scan.lastCheckedAt) return false;
      return new Date(row.scan.lastCheckedAt).getTime() >= startOfToday && row.scan.status === 'found';
    }).length;

    const newProjectsFoundToday = prioritizedCompetitorOpportunities.filter((item) => {
      return item.details.comparisonType === 'new_project' && new Date(item.opportunity.discovered_at).getTime() >= startOfToday;
    }).length;

    const projectsImported = competitorOpportunities.filter((item) => item.status === 'drafted').length;
    const projectsIgnored = competitorOpportunities.filter((item) => item.status === 'ignored').length;
    const duplicateDetectionsCount = prioritizedCompetitorOpportunities.filter((item) => item.details.comparisonType !== 'new_project').length;
    const averageScanSuccess = sourceDashboardRows.length
      ? sourceDashboardRows.reduce((sum, row) => sum + row.scan.successRate, 0) / sourceDashboardRows.length
      : 0;

    return {
      sourcesMonitored: competitorSources.filter((source) => source.is_active).length,
      successfulScansToday,
      newProjectsFoundToday,
      projectsImported,
      projectsIgnored,
      duplicateDetections: duplicateDetectionsCount,
      averageScanSuccess,
    };
  }, [sourceDashboardRows, prioritizedCompetitorOpportunities, competitorOpportunities, competitorSources]);

  const bulkIgnoreGenericCompetitorOpportunities = useCallback(async () => {
    const ids = genericCompetitorOpportunities
      .filter((item) => item.status !== 'ignored' && item.status !== 'drafted')
      .map((item) => item.id);

    if (ids.length === 0) {
      showToast('No generic opportunities to ignore');
      return;
    }

    try {
      const { error } = await supabase
        .from('competitor_opportunities')
        .update({ status: 'ignored', updated_at: new Date().toISOString() })
        .in('id', ids);

      if (error) throw error;

      setCompetitorOpportunities((prev) => prev.map((row) => (
        ids.includes(row.id) ? { ...row, status: 'ignored' as CompetitorOpportunityStatus } : row
      )));

      await logAdminAudit({
        actionTaken: 'Bulk ignore generic competitor opportunities',
        aiRecommendation: 'Auto-identified generic search/feed noise',
        finalDecision: 'Ignored',
        context: { opportunityIds: ids, count: ids.length },
      }, { source: 'competitor_watch_bulk_ignore_generic' });

      showToast(`Ignored ${ids.length} generic opportunit${ids.length === 1 ? 'y' : 'ies'}`);
    } catch (error) {
      setCompetitorUiError('Unable to bulk-ignore generic opportunities right now.', error);
      showToast('Unable to bulk-ignore generic opportunities right now.', 'error');
    }
  }, [genericCompetitorOpportunities, logAdminAudit, setCompetitorUiError, showToast]);

  const bulkDeleteGenericCompetitorOpportunities = useCallback(async () => {
    const ids = genericCompetitorOpportunities.map((item) => item.id);
    if (ids.length === 0) {
      showToast('No generic opportunities to delete');
      return;
    }

    try {
      const { error } = await supabase
        .from('competitor_opportunities')
        .delete()
        .in('id', ids);

      if (error) throw error;

      setCompetitorOpportunities((prev) => prev.filter((row) => !ids.includes(row.id)));

      await logAdminAudit({
        actionTaken: 'Bulk delete generic competitor opportunities',
        aiRecommendation: 'Remove generic search/feed noise from queue',
        finalDecision: 'Deleted',
        context: { opportunityIds: ids, count: ids.length },
      }, { source: 'competitor_watch_bulk_delete_generic' });

      showToast(`Deleted ${ids.length} generic opportunit${ids.length === 1 ? 'y' : 'ies'}`);
    } catch (error) {
      setCompetitorUiError('Unable to bulk-delete generic opportunities right now.', error);
      showToast('Unable to bulk-delete generic opportunities right now.', 'error');
    }
  }, [genericCompetitorOpportunities, logAdminAudit, setCompetitorUiError, showToast]);

  const checkCompetitorSourcesNow = useCallback(async () => {
    setCheckingCompetitors(true);
    setCompetitorError(null);
    setCompetitorErrorDetails(null);
    try {
      const activeSources = competitorSources.filter((item) => item.is_active);
      if (activeSources.length === 0) {
        showToast('Add at least one active source first', 'error');
        return;
      }

      let discoveredProjects = 0;
      let duplicateDetections = 0;
      let previewCandidatesAdded = 0;
      let noOpportunityScans = 0;
      let jsNeedsAdapterScans = 0;
      let fetchFailedScans = 0;
      let parserFailedScans = 0;
      const scanUpdates: Record<string, CompetitorSourceScanResult> = {};
      const debugUpdates: Record<string, CompetitorScanDebugResult> = {};
      const pendingAdds: PendingDiscoveryCandidate[] = [];
      const existingKeys = new Set(
        competitorOpportunities.map((item) => `${item.source_id}::${normalizeProjectName(item.project_name)}`)
      );
      const pendingKeys = new Set(
        pendingDiscoveryCandidates.map((item) => `${item.sourceId}::${normalizeProjectName(item.candidate.projectName)}::${item.candidate.listingUrl}`)
      );
      const sourceMentionsMap = new Map<string, Set<string>>();
      const firstDiscoveredMap = new Map<string, string>();

      competitorOpportunities.forEach((item) => {
        const normalized = normalizeProjectName(item.project_name);
        const sourceSet = sourceMentionsMap.get(normalized) ?? new Set<string>();
        sourceSet.add(item.source_id);
        sourceMentionsMap.set(normalized, sourceSet);

        const existing = firstDiscoveredMap.get(normalized);
        if (!existing || new Date(item.discovered_at).getTime() < new Date(existing).getTime()) {
          firstDiscoveredMap.set(normalized, item.discovered_at);
        }
      });

      const invokePayload = {
        sources: activeSources.map((source) => ({
          id: source.id,
          source_name: source.source_name,
          source_url: source.source_url,
        })),
      };

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (sessionError || !accessToken) {
        throw new Error('Admin session expired. Please sign in again.');
      }

      const { data: scanData, error: scanError } = await supabase.functions.invoke('competitor-watch-scan', {
        body: invokePayload,
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (scanError) {
        const detailed = await describeFunctionInvokeErrorDetailed(scanError);
        throw new Error(`Edge Function invoke failed: ${detailed}`);
      }

      const results = ((scanData as CompetitorWatchScanResponse | null)?.results ?? []) as CompetitorWatchScanResult[];
      if (!scanData || !Array.isArray((scanData as CompetitorWatchScanResponse).results)) {
        const serialized = (() => {
          try {
            return JSON.stringify(scanData);
          } catch {
            return String(scanData);
          }
        })();
        throw new Error(`Invalid Edge Function response shape. body=${serialized}`);
      }

      for (const result of results) {
        const source = activeSources.find((item) => item.id === result.sourceId);
        if (!source) continue;

        const scanStartedAt = Date.now();
        const previousScan = competitorSourceScanResults[source.id];
        const totalScans = (previousScan?.totalScans ?? 0) + 1;
        const previousSuccessfulScans = previousScan?.successfulScans ?? 0;
        const hasValidCandidates = result.candidatesExtracted.length > 0;
        const isFetchFailure = result.finalOutcome === 'blocked_by_cloudflare'
          || result.finalOutcome === 'http_403'
          || result.finalOutcome === 'http_429'
          || result.finalOutcome === 'timeout'
          || result.finalOutcome === 'fetch_failed'
          || result.finalOutcome === 'no_html';
        const isParserFailure = result.finalOutcome === 'parser_failed' || result.finalOutcome === 'all_candidates_rejected';
        const isJsNeedsAdapter = result.finalOutcome === 'javascript_rendered'
          || result.finalOutcome === 'needs_adapter'
          || result.finalOutcome === 'no_adapter_matched';
        const isNoExtractableContent = result.finalOutcome === 'no_cards_found' || result.finalOutcome === 'no_extractable_content';
        const successfulScans = hasValidCandidates ? previousSuccessfulScans + 1 : previousSuccessfulScans;
        const successRate = totalScans > 0 ? successfulScans / totalScans : 0;

        await supabase
          .from('competitor_sources')
          .update({ last_checked_at: result.checkedAt })
          .eq('id', source.id);

        debugUpdates[source.id] = {
          adapterUsed: result.adapterUsed,
          pageFetched: result.sourceUrl,
          fetchStatus: result.fetchStatus,
          cardsFound: result.cardsFound,
          candidatesRejected: result.candidatesRejected,
          rejectionReasons: result.rejectionReasons,
          rejectionSamples: result.rejectionSamples,
          validCandidatesExtracted: result.candidatesExtracted.length,
          outcomeReason: result.outcomeMessage,
        };

        if (result.candidatesExtracted.length === 0) {
          let status: CompetitorSourceScanStatus = 'none_found';
          if (isFetchFailure) {
            status = 'fetch_failed';
            fetchFailedScans += 1;
          } else if (isParserFailure) {
            status = 'parser_failed';
            parserFailedScans += 1;
          } else if (isJsNeedsAdapter) {
            status = 'js_needs_adapter';
            jsNeedsAdapterScans += 1;
          } else if (isNoExtractableContent) {
            status = 'no_extractable';
            noOpportunityScans += 1;
          } else {
            noOpportunityScans += 1;
          }

          scanUpdates[source.id] = {
            status,
            lastCheckedAt: result.checkedAt,
            totalScans,
            successfulScans,
            opportunitiesFound: 0,
            newProjects: 0,
            duplicateProjects: 0,
            failedExtractions: result.candidatesRejected,
            durationMs: Date.now() - scanStartedAt,
            lastSuccessfulScan: previousScan?.lastSuccessfulScan || null,
            successRate,
            health: getSourceHealthIndicator(successRate, status),
            note: result.outcomeMessage,
          };
          continue;
        }

        let foundForSource = 0;
        let sourceNewProjects = 0;
        let sourceDuplicateProjects = 0;
        const registerRejection = (localReasons: Record<string, number>, reason: string) => {
          localReasons[reason] = (localReasons[reason] || 0) + 1;
        };
        const localRejections = { ...result.rejectionReasons };

        for (const candidate of result.candidatesExtracted) {
          const normalizedName = normalizeProjectName(candidate.projectName);
          const key = `${source.id}::${normalizedName}`;
          if (existingKeys.has(key)) {
            registerRejection(localRejections, 'already_tracked');
            continue;
          }

          const pendingKey = `${source.id}::${normalizedName}::${candidate.listingUrl}`;
          if (pendingKeys.has(pendingKey)) {
            registerRejection(localRejections, 'already_in_preview');
            continue;
          }

          const sourceMentions = (() => {
            const existingMentions = sourceMentionsMap.get(normalizedName) ?? new Set<string>();
            return existingMentions.has(source.id) ? existingMentions.size : existingMentions.size + 1;
          })();
          const sourceReliability = getAdapterReliabilityScore(result.adapterUsed);
          const comparison = compareCandidateAgainstAirdrops(candidate, airdrops);
          const confidenceAdjustment = candidate.confidence === 'high' ? 6 : candidate.confidence === 'medium' ? 3 : 0;
          const confidenceScore = Math.max(0, Math.min(100, comparison.confidenceScore + confidenceAdjustment));
          const discoveryScore = computeDiscoveryScore({
            sourceReliability,
            sourceMentions,
            hasDocs: Boolean(candidate.officialDocsUrl),
            hasGithub: Boolean(candidate.githubUrl),
            hasX: Boolean(candidate.officialXUrl),
            hasDiscord: Boolean(candidate.officialDiscordUrl),
            hasBlockchain: Boolean(candidate.blockchain),
            hasFunding: Boolean(candidate.fundingInfo),
            hasTeam: Boolean(candidate.teamInfo),
          });
          const discoveryPriority = getDiscoveryPriority(discoveryScore);
          const compareMessage = comparison.comparison === 'exact_match'
            ? `Exact match with existing listing ${comparison.matchedProject}`
            : comparison.comparison === 'similar_project'
            ? `Similar to existing listing ${comparison.matchedProject}`
            : 'No existing AirdropGuard listing match found';
          const nextStatus: CompetitorOpportunityStatus = comparison.comparison === 'new_project' ? 'new' : 'duplicate';
          const firstDiscoveredAt = firstDiscoveredMap.get(normalizedName) || result.checkedAt;

          const metadata = {
            source: candidate.sourceLabel,
            adapter_id: result.adapterUsed,
            source_reliability: sourceReliability,
            project_url: candidate.projectUrl,
            listing_url: candidate.listingUrl,
            short_description: candidate.shortDescription,
            listing_date: candidate.listingDate,
            official_docs_url: candidate.officialDocsUrl,
            github_url: candidate.githubUrl,
            official_x_url: candidate.officialXUrl,
            official_discord_url: candidate.officialDiscordUrl,
            funding_info: candidate.fundingInfo,
            team_info: candidate.teamInfo,
            compare: compareMessage,
            comparison_type: comparison.comparison,
            confidence_score: confidenceScore,
            why_new: comparison.whyNew,
            matched_project: comparison.matchedProject,
            first_discovered_at: firstDiscoveredAt,
            source_mentions: sourceMentions,
            discovery_score: discoveryScore,
            discovery_priority: discoveryPriority,
            detected_keywords: candidate.detectedKeywords,
            reason_detected: candidate.reasonDetected,
            duplicate_status: nextStatus === 'duplicate' ? 'duplicate' : 'new',
          };

          if (previewScanModeEnabled) {
            const previewId = `${source.id}-${normalizedName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            pendingAdds.push({
              id: previewId,
              sourceId: source.id,
              sourceName: source.source_name,
              checkedAt: result.checkedAt,
              adapterId: result.adapterUsed || 'unknown',
              candidate,
              comparisonType: comparison.comparison,
              confidenceScore,
              whyNew: comparison.whyNew,
              matchedProject: comparison.matchedProject,
              compareMessage,
              sourceReliability,
              sourceMentions,
              discoveryScore,
              discoveryPriority,
              firstDiscoveredAt,
            });

            pendingKeys.add(pendingKey);
            foundForSource += 1;
            previewCandidatesAdded += 1;
            if (nextStatus === 'new') sourceNewProjects += 1;
            else sourceDuplicateProjects += 1;
            continue;
          }

          const { data: inserted, error } = await supabase
            .from('competitor_opportunities')
            .insert({
              source_id: source.id,
              project_name: candidate.projectName,
              source_url: candidate.listingUrl,
              discovered_at: result.checkedAt,
              category: candidate.category,
              blockchain: candidate.blockchain,
              confidence_level: candidate.confidence,
              why_matched: `Adapter ${candidate.sourceLabel} extracted project card. ${comparison.whyNew}`,
              similarity_score: null,
              status: nextStatus,
              notes: JSON.stringify(metadata),
            })
            .select('id, source_id, project_name, source_url, discovered_at, category, blockchain, confidence_level, why_matched, similarity_score, status, notes, created_at')
            .single();

          if (error) throw error;
          if (!inserted) continue;

          existingKeys.add(key);
          setCompetitorOpportunities((prev) => [inserted as CompetitorOpportunity, ...prev]);
          foundForSource += 1;

          const mentionSet = sourceMentionsMap.get(normalizedName) ?? new Set<string>();
          mentionSet.add(source.id);
          sourceMentionsMap.set(normalizedName, mentionSet);
          firstDiscoveredMap.set(normalizedName, firstDiscoveredAt);

          if (nextStatus === 'new') {
            discoveredProjects += 1;
            sourceNewProjects += 1;
          } else {
            duplicateDetections += 1;
            sourceDuplicateProjects += 1;
          }
        }

        if (foundForSource === 0) {
          noOpportunityScans += 1;
          const mergedRejected = result.candidatesRejected + (localRejections.already_tracked || 0) + (localRejections.already_in_preview || 0);
          scanUpdates[source.id] = {
            status: 'none_found',
            lastCheckedAt: result.checkedAt,
            totalScans,
            successfulScans,
            opportunitiesFound: 0,
            newProjects: 0,
            duplicateProjects: 0,
            failedExtractions: mergedRejected,
            durationMs: Date.now() - scanStartedAt,
            lastSuccessfulScan: result.checkedAt,
            successRate,
            health: getSourceHealthIndicator(successRate, 'none_found'),
            note: 'Valid candidates extracted, but all were already tracked or already in preview.',
          };

          debugUpdates[source.id] = {
            ...debugUpdates[source.id],
            candidatesRejected: mergedRejected,
            rejectionReasons: localRejections,
          };
          continue;
        }

        const mergedRejected = result.candidatesRejected + (localRejections.already_tracked || 0) + (localRejections.already_in_preview || 0);
        scanUpdates[source.id] = {
          status: 'found',
          lastCheckedAt: result.checkedAt,
          totalScans,
          successfulScans,
          opportunitiesFound: foundForSource,
          newProjects: sourceNewProjects,
          duplicateProjects: sourceDuplicateProjects,
          failedExtractions: mergedRejected,
          durationMs: Date.now() - scanStartedAt,
          lastSuccessfulScan: result.checkedAt,
          successRate,
          health: getSourceHealthIndicator(successRate, 'found'),
          note: previewScanModeEnabled
            ? 'Preview candidates extracted. Awaiting manual approval.'
            : 'Project opportunities found by source adapter.',
        };

        debugUpdates[source.id] = {
          ...debugUpdates[source.id],
          candidatesRejected: mergedRejected,
          rejectionReasons: localRejections,
          validCandidatesExtracted: foundForSource,
        };
      }

      setCompetitorSourceScanResults((prev) => ({ ...prev, ...scanUpdates }));
      setCompetitorScanDebugResults((prev) => ({ ...prev, ...debugUpdates }));
      if (pendingAdds.length > 0) {
        setPendingDiscoveryCandidates((prev) => [...pendingAdds, ...prev]);
      }

      if (!previewScanModeEnabled && discoveredProjects > 0) {
        await createAdminNotification({
          notification_type: 'competitor_detected',
          title: 'New projects found',
          message: `${discoveredProjects} project${discoveredProjects > 1 ? 's' : ''} added to discovery queue.`,
          severity: 'info',
          context: { discoveredProjects, duplicateDetections, noOpportunityScans, jsNeedsAdapterScans, fetchFailedScans, parserFailedScans },
        });
      }

      if (noOpportunityScans > 0 || jsNeedsAdapterScans > 0) {
        await createAdminNotification({
          notification_type: 'competitor_source_only',
          title: 'No opportunities extracted',
          message: `${noOpportunityScans} source${noOpportunityScans === 1 ? '' : 's'} had no opportunities. ${jsNeedsAdapterScans} source${jsNeedsAdapterScans === 1 ? '' : 's'} need adapter/runtime support.`,
          severity: 'warning',
          context: { noOpportunityScans, jsNeedsAdapterScans },
        });
      }

      if (fetchFailedScans > 0 || parserFailedScans > 0) {
        await createAdminNotification({
          notification_type: 'competitor_scan_failed',
          title: 'Some source scans failed',
          message: `${fetchFailedScans} fetch failure${fetchFailedScans === 1 ? '' : 's'} and ${parserFailedScans} parser failure${parserFailedScans === 1 ? '' : 's'} detected. Review source Last Scan Result notes.`,
          severity: 'error',
          context: { fetchFailedScans, parserFailedScans },
        });
      }

      if (previewScanModeEnabled && previewCandidatesAdded > 0) {
        showToast(`${previewCandidatesAdded} scan candidates extracted for manual approval.`);
      } else if (discoveredProjects > 0 && (noOpportunityScans > 0 || jsNeedsAdapterScans > 0 || fetchFailedScans > 0 || parserFailedScans > 0)) {
        showToast(`${discoveredProjects} new projects found. ${duplicateDetections} duplicate detections. ${noOpportunityScans} no-opportunity, ${jsNeedsAdapterScans} needs-adapter, ${fetchFailedScans} fetch-failed, ${parserFailedScans} parser-failed sources.`);
      } else if (discoveredProjects > 0) {
        showToast(`${discoveredProjects} new projects found. ${duplicateDetections} duplicate detections.`);
      } else if (jsNeedsAdapterScans > 0) {
        showToast(`${jsNeedsAdapterScans} source${jsNeedsAdapterScans === 1 ? '' : 's'} are JS-rendered or need adapter support.`);
      } else if (noOpportunityScans > 0) {
        showToast(`No opportunities extracted from ${noOpportunityScans} source${noOpportunityScans === 1 ? '' : 's'}.`);
      } else if (fetchFailedScans > 0 || parserFailedScans > 0) {
        showToast(`${fetchFailedScans} fetch failures and ${parserFailedScans} parser failures detected. Review Last Scan Result.`,'error');
      } else {
        showToast('No new projects extracted this run.');
      }
    } catch (error) {
      const exact = describeError(error);
      setCompetitorUiError('Competitor check failed. Please retry in a moment.', error);
      showToast('Competitor check failed. Please retry in a moment.', 'error');
      await createAdminNotification({
        notification_type: 'admin_error',
        title: 'Competitor watch check failed',
        message: 'Competitor watch check failed. Review admin debug details.',
        severity: 'error',
        context: { area: 'competitor_watch', details: exact },
      });
    } finally {
      setCheckingCompetitors(false);
    }
  }, [competitorSources, competitorOpportunities, competitorSourceScanResults, pendingDiscoveryCandidates, previewScanModeEnabled, airdrops, showToast, describeError, describeFunctionInvokeErrorDetailed, logAdminAudit, createAdminNotification, setCompetitorUiError]);

  const testCompetitorWatchEdgeFunction = useCallback(async () => {
    setCompetitorError(null);
    setCompetitorErrorDetails(null);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (sessionError || !accessToken) {
        throw new Error('Admin session expired. Please sign in again.');
      }

      const { data, error } = await supabase.functions.invoke('competitor-watch-scan', {
        body: { dryRun: true },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error) {
        const detailed = await describeFunctionInvokeErrorDetailed(error);
        throw new Error(`Edge Function dry-run failed: ${detailed}`);
      }

      const payload = data as Record<string, unknown> | null;
      if (!payload || payload.ok !== true) {
        throw new Error(`Unexpected dry-run response: ${JSON.stringify(data)}`);
      }

      showToast('Edge Function dry-run passed (auth/admin/env/function OK)');
    } catch (error) {
      setCompetitorUiError('Edge Function dry-run failed. Check details.', error);
      showToast('Edge Function dry-run failed. Check details.', 'error');
    }
  }, [describeFunctionInvokeErrorDetailed, setCompetitorUiError, showToast]);

  const approvePendingDiscoveryCandidate = useCallback(async (pending: PendingDiscoveryCandidate) => {
    const normalized = normalizeProjectName(pending.candidate.projectName);
    const duplicateExisting = competitorOpportunities.some((item) => (
      item.source_id === pending.sourceId && normalizeProjectName(item.project_name) === normalized
    ));

    if (duplicateExisting) {
      setPendingDiscoveryCandidates((prev) => prev.filter((item) => item.id !== pending.id));
      showToast('Candidate already exists in queue. Removed from preview.', 'error');
      return;
    }

    const status: CompetitorOpportunityStatus = pending.comparisonType === 'new_project' ? 'new' : 'duplicate';
    const metadata = {
      source: pending.candidate.sourceLabel,
      adapter_id: pending.adapterId,
      source_reliability: pending.sourceReliability,
      project_url: pending.candidate.projectUrl,
      listing_url: pending.candidate.listingUrl,
      short_description: pending.candidate.shortDescription,
      listing_date: pending.candidate.listingDate,
      official_docs_url: pending.candidate.officialDocsUrl,
      github_url: pending.candidate.githubUrl,
      official_x_url: pending.candidate.officialXUrl,
      official_discord_url: pending.candidate.officialDiscordUrl,
      funding_info: pending.candidate.fundingInfo,
      team_info: pending.candidate.teamInfo,
      compare: pending.compareMessage,
      comparison_type: pending.comparisonType,
      confidence_score: pending.confidenceScore,
      why_new: pending.whyNew,
      matched_project: pending.matchedProject,
      first_discovered_at: pending.firstDiscoveredAt,
      source_mentions: pending.sourceMentions,
      discovery_score: pending.discoveryScore,
      discovery_priority: pending.discoveryPriority,
      detected_keywords: pending.candidate.detectedKeywords,
      reason_detected: pending.candidate.reasonDetected,
      duplicate_status: status === 'duplicate' ? 'duplicate' : 'new',
    };

    try {
      const { data, error } = await supabase
        .from('competitor_opportunities')
        .insert({
          source_id: pending.sourceId,
          project_name: pending.candidate.projectName,
          source_url: pending.candidate.listingUrl,
          discovered_at: pending.checkedAt,
          category: pending.candidate.category,
          blockchain: pending.candidate.blockchain,
          confidence_level: pending.candidate.confidence,
          why_matched: `Manual approval from preview scan. ${pending.whyNew}`,
          similarity_score: null,
          status,
          notes: JSON.stringify(metadata),
        })
        .select('id, source_id, project_name, source_url, discovered_at, category, blockchain, confidence_level, why_matched, similarity_score, status, notes, created_at')
        .single();

      if (error) throw error;

      if (data) {
        setCompetitorOpportunities((prev) => [data as CompetitorOpportunity, ...prev]);
      }
      setPendingDiscoveryCandidates((prev) => prev.filter((item) => item.id !== pending.id));

      await logAdminAudit({
        actionTaken: 'Approve preview discovery candidate',
        aiRecommendation: 'Candidate extracted from discovery preview mode',
        finalDecision: 'Inserted to competitor opportunities',
        context: {
          sourceId: pending.sourceId,
          sourceName: pending.sourceName,
          projectName: pending.candidate.projectName,
          listingUrl: pending.candidate.listingUrl,
        },
      }, { source: 'competitor_watch_preview_approve' });

      showToast('Preview candidate approved and added to queue');
    } catch (error) {
      setCompetitorUiError('Unable to approve preview candidate right now.', error);
      showToast('Unable to approve preview candidate right now.', 'error');
    }
  }, [competitorOpportunities, logAdminAudit, setCompetitorUiError, showToast]);

  const rejectPendingDiscoveryCandidate = useCallback((pending: PendingDiscoveryCandidate) => {
    setPendingDiscoveryCandidates((prev) => prev.filter((item) => item.id !== pending.id));
    showToast('Preview candidate removed');
  }, [showToast]);

  const updateOpportunityStatus = useCallback(async (
    opportunity: CompetitorOpportunity,
    status: CompetitorOpportunityStatus,
    actionTaken: string,
    successMessage: string
  ) => {
    try {
      const { data, error } = await supabase
        .from('competitor_opportunities')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', opportunity.id)
        .select('id, source_id, project_name, source_url, discovered_at, category, blockchain, confidence_level, why_matched, similarity_score, status, notes, created_at')
        .single();

      if (error) throw error;
      setCompetitorOpportunities((prev) => prev.map((row) => row.id === opportunity.id ? (data as CompetitorOpportunity) : row));

      await logAdminAudit({
        actionTaken,
        aiRecommendation: 'Competitor watch action requested by admin',
        finalDecision: status,
        context: {
          opportunityId: opportunity.id,
          projectName: opportunity.project_name,
          sourceUrl: opportunity.source_url,
        },
      }, { source: 'competitor_watch_status_update' });

      showToast(successMessage);
    } catch (error) {
      setCompetitorUiError('Unable to update opportunity right now. Please try again.', error);
      showToast('Unable to update opportunity right now. Please try again.', 'error');
    }
  }, [logAdminAudit, showToast, setCompetitorUiError]);

  const createDraftFromOpportunity = useCallback(async (opportunity: CompetitorOpportunity) => {
    const details = getOpportunityDiscoveryDetails(opportunity);
    const normalizedCategory = CATEGORY_OPTIONS.find((item) => item.toLowerCase() === String(opportunity.category || '').toLowerCase()) || 'Other';
    setForm({
      ...BLANK_FORM,
      name: opportunity.project_name,
      website_url: details.projectUrl || details.listingUrl,
      docs_url: details.officialDocsUrl || '',
      github_url: details.githubUrl || '',
      twitter_url: details.officialXUrl || '',
      discord_url: details.officialDiscordUrl || '',
      funding_info: details.fundingInfo || '',
      team_info: details.teamInfo || '',
      category: [normalizedCategory],
      blockchain: opportunity.blockchain ? [opportunity.blockchain as Blockchain] : [],
      ai_summary: `Candidate discovered from ${details.sourceLabel}. Listing: ${details.listingUrl}`,
      status: 'Active',
      published: false,
      is_featured: false,
      is_trending: false,
      is_sponsored: false,
    });
    setModalMode('add');

    await updateOpportunityStatus(
      opportunity,
      'drafted',
      'Create airdrop draft from competitor opportunity',
      'Draft airdrop created'
    );
  }, [updateOpportunityStatus]);

  const openAdd = () => { setForm(BLANK_FORM); setEditingId(null); setModalMode('add'); };

  const openAddBanner = () => {
    setBannerForm(BLANK_BANNER_FORM);
    setEditingBannerId(null);
    setBannerModalMode('add');
  };

  const openEditBanner = (banner: BannerAd) => {
    setBannerForm({
      advertiserName: banner.advertiserName,
      contactEmail: banner.contactEmail,
      websiteLink: banner.websiteLink,
      bannerImageUrl: banner.bannerImageUrl,
      destinationUrl: banner.destinationUrl,
      altText: banner.altText,
      placement: banner.placement,
      startDate: banner.startDate,
      endDate: banner.endDate,
      status: banner.status,
      enabled: banner.enabled,
      exclusivePlacement: banner.exclusivePlacement,
      notes: banner.notes,
      paymentState: banner.paymentState,
      archived: banner.archived,
    });
    setEditingBannerId(banner.id);
    setBannerModalMode('edit');
  };

  const saveBannerForm = async () => {
    const resolvedStatus = deriveBannerStatus(bannerForm.status, bannerForm.startDate, bannerForm.endDate);
    const requiresPublishReview = resolvedStatus === 'Live';
    const reviewNotes = requiresPublishReview ? await promptHumanVerificationNotes(`Publish banner for ${bannerForm.advertiserName || 'unknown advertiser'}`) : '';
    if (requiresPublishReview && !reviewNotes) return;

    if (bannerModalMode === 'add') {
      const nextBanner: BannerAd = {
        id: `banner_${Date.now()}`,
        ...bannerForm,
        status: resolvedStatus,
        updatedAt: new Date().toISOString(),
      };
      setBanners((prev) => [nextBanner, ...prev]);
      showToast('Banner created');

      if (resolvedStatus === 'Live') {
        await logAdminAudit({
          actionTaken: 'Publish banner advertisement',
          aiRecommendation: `Banner status ${bannerForm.status}`,
          finalDecision: 'Approved and published',
          notes: reviewNotes ?? undefined,
          context: {
            advertiser: nextBanner.advertiserName,
            destinationUrl: nextBanner.destinationUrl,
            placement: nextBanner.placement,
            bannerId: nextBanner.id,
          },
        });
      }
    } else {
      setBanners((prev) => prev.map((banner) => {
        if (banner.id !== editingBannerId) return banner;
        return {
          ...banner,
          ...bannerForm,
          status: resolvedStatus,
          updatedAt: new Date().toISOString(),
        };
      }));
      showToast('Banner updated');

      if (resolvedStatus === 'Live') {
        await logAdminAudit({
          actionTaken: 'Publish banner advertisement',
          aiRecommendation: `Banner status ${bannerForm.status}`,
          finalDecision: 'Approved and published',
          notes: reviewNotes ?? undefined,
          context: {
            advertiser: bannerForm.advertiserName,
            destinationUrl: bannerForm.destinationUrl,
            placement: bannerForm.placement,
            bannerId: editingBannerId,
          },
        });
      }
    }

    setBannerModalMode(null);
    setEditingBannerId(null);
  };

  const toggleBannerEnabled = (id: string) => {
    setBanners((prev) => prev.map((banner) => {
      if (banner.id !== id) return banner;
      return { ...banner, enabled: !banner.enabled, updatedAt: new Date().toISOString() };
    }));
  };

  const deleteBanner = (id: string) => {
    setBanners((prev) => prev.filter((banner) => banner.id !== id));
    if (previewBannerId === id) setPreviewBannerId(null);
    showToast('Banner deleted');
  };

  const archiveBanner = (id: string) => {
    setBanners((prev) => prev.map((banner) => banner.id === id
      ? { ...banner, archived: true, enabled: false, status: 'Expired', updatedAt: new Date().toISOString() }
      : banner));
    showToast('Banner archived');
  };

  const openEdit = async (a: Airdrop) => {
    let tasksText = '';

    try {
      const { data: taskRows, error } = await supabase
        .from('airdrop_tasks')
        .select('title')
        .eq('airdrop_id', a.id)
        .order('sort_order', { ascending: true });

      if (!error && taskRows) {
        tasksText = taskRows
          .map((task: { title: string | null }) => task.title || '')
          .filter(Boolean)
          .join('\n');
      }
    } catch {
      tasksText = '';
    }

    setForm({
      name: a.name ?? '',
      ticker: a.ticker ?? '',
      logo_url: a.logo_url ?? '',
      ai_summary: a.ai_summary ?? '',
      website_url: a.website_url ?? '',
      twitter_url: a.twitter_url ?? '',
      discord_url: a.discord_url ?? '',
      telegram_url: a.telegram_url ?? '',
      github_url: a.github_url ?? '',
      contract_address: a.contract_address ?? '',
      docs_url: a.docs_url ?? '',
      funding_info: a.funding_info ?? '',
      investors: a.investors ?? '',
      team_info: a.team_info ?? '',
      estimated_reward: a.estimated_reward ?? '',
      expiry_date: a.expiry_date ? a.expiry_date.split('T')[0] : '',
      time_required: a.time_required ?? 'Varies',
      blockchain: (a.blockchain ?? []) as Blockchain[],
      category: (a.category ?? []) as Category[],
      status: a.status,
      risk_level: a.risk_level,
      reward_potential: a.reward_potential,
      difficulty: a.difficulty,
      published: a.published,
      is_featured: a.is_featured,
      is_trending: a.is_trending,
      is_sponsored: a.is_sponsored,
      tasks_text: tasksText,
    });
    setEditingId(a.id);
    setModalMode('edit');
  };

  const moderateAirdrop = useCallback(async (
    airdrop: Airdrop,
    decision: 'approve' | 'reject' | 'blacklist',
  ) => {
    const actionLabel = decision === 'approve'
      ? `Approve airdrop ${airdrop.name}`
      : decision === 'reject'
      ? `Reject airdrop ${airdrop.name}`
      : `Blacklist airdrop ${airdrop.name}`;

    const reviewNotes = await promptHumanVerificationNotes(actionLabel);
    if (!reviewNotes) return;

    const patch: { listing_state: Airdrop['listing_state']; blacklist_reason: string | null; published: boolean; human_verified: boolean } = {
      listing_state: decision === 'approve' ? 'verified' : 'scam_alert',
      blacklist_reason: decision === 'approve' ? null : reviewNotes,
      published: decision === 'approve' ? airdrop.published : false,
      human_verified: decision === 'approve',
    };

    const { error } = await supabase
      .from('airdrops')
      .update(patch)
      .eq('id', airdrop.id);

    if (error) {
      showToast(`Unable to ${decision} airdrop: ${describeError(error)}`, 'error');
      return;
    }

    setAirdrops((prev) => prev.map((row) => (
      row.id === airdrop.id
        ? {
            ...row,
            listing_state: patch.listing_state,
            blacklist_reason: patch.blacklist_reason,
            published: patch.published,
            human_verified: patch.human_verified,
          }
        : row
    )));

    await logAdminAudit({
      actionTaken: actionLabel,
      aiRecommendation: `Trust ${airdrop.trust_score ?? 'unknown'} | Risk ${airdrop.risk_level}`,
      finalDecision: decision,
      notes: reviewNotes,
      context: {
        airdropId: airdrop.id,
        projectName: airdrop.name,
      },
    }, { source: 'airdrop_moderation_action' });

    fetchStats();
    showToast(`Airdrop ${decision}d successfully`);
  }, [describeError, fetchStats, logAdminAudit, promptHumanVerificationNotes, showToast]);

  const saveTasksForAirdrop = async (airdropId: string, tasksText: string) => {
    console.info('[Admin][AirdropSave] Updating tasks', {
      airdropId,
      rawTaskLines: tasksText.split('\n').length,
    });

    const taskRows = tasksText
      .split('\n')
      .map(t => t.trim())
      .filter(Boolean);

    const { error: deleteError } = await supabase
      .from('airdrop_tasks')
      .delete()
      .eq('airdrop_id', airdropId);

    if (deleteError) {
      console.error('[Admin][AirdropSave] Failed deleting existing tasks', {
        airdropId,
        error: deleteError,
        exactError: describeError(deleteError),
      });
      throw deleteError;
    }

    if (taskRows.length === 0) return 0;

    const { error } = await supabase
      .from('airdrop_tasks')
      .insert(
        taskRows.map((title, index) => ({
          airdrop_id: airdropId,
          title,
          description: '',
          sort_order: index,
        }))
      );

    if (error) {
      console.error('[Admin][AirdropSave] Failed inserting tasks', {
        airdropId,
        taskCount: taskRows.length,
        error,
        exactError: describeError(error),
      });
      throw error;
    }

    console.info('[Admin][AirdropSave] Tasks updated successfully', {
      airdropId,
      taskCount: taskRows.length,
    });
    return taskRows.length;
  };

  const saveForm = async () => {
    if (!form.name.trim()) return;
    setSaving(true);

    let currentStep = 'init';

    try {
      console.info('[Admin][AirdropSave] Save requested', {
        modalMode,
        editingId,
        name: form.name.trim(),
      });

      const existing = editingId ? airdrops.find((row) => row.id === editingId) : null;
      const publishingNow = form.published && !existing?.published;

      currentStep = 'collect_verification_notes';
      const reviewNotes = publishingNow
        ? await promptHumanVerificationNotes(`Publish airdrop ${form.name.trim()}`)
        : '';

      console.info('[Admin][AirdropSave] Verification notes resolved', {
        publishingNow,
        hasReviewNotes: Boolean(reviewNotes),
      });

      if (publishingNow && !reviewNotes) {
        setSaving(false);
        return;
      }

      if (modalMode !== 'add' && !editingId) {
        throw new Error('Missing airdrop ID for edit save.');
      }

      currentStep = 'prepare_payload';
      const payload = {
        name: form.name.trim(),
        ticker: form.ticker.trim(),
        logo_url: form.logo_url.trim(),
        ai_summary: form.ai_summary.trim(),
        website_url: form.website_url.trim(),
        twitter_url: form.twitter_url.trim(),
        discord_url: form.discord_url.trim(),
        telegram_url: form.telegram_url.trim(),
        github_url: form.github_url.trim(),
        contract_address: form.contract_address.trim(),
        docs_url: form.docs_url.trim() || null,
        funding_info: form.funding_info.trim() || null,
        investors: form.investors.trim() || null,
        team_info: form.team_info.trim() || null,
        estimated_reward: form.estimated_reward.trim(),
        expiry_date: form.expiry_date || null,
        time_required: form.time_required.trim(),
        blockchain: form.blockchain,
        category: form.category,
        status: form.status,
        risk_level: form.risk_level,
        reward_potential: form.reward_potential,
        difficulty: form.difficulty,
        published: form.published,
        human_verified: form.published,
        is_featured: form.is_featured,
        is_trending: form.is_trending,
        is_sponsored: form.is_sponsored,
      };

      console.info('[Admin][AirdropSave] Payload prepared', {
        mode: modalMode,
        editingId,
        published: payload.published,
        isFeatured: payload.is_featured,
        isTrending: payload.is_trending,
        isSponsored: payload.is_sponsored,
      });

      if (modalMode === 'add') {
        currentStep = 'insert_airdrop';
        const base = form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const slug = `${base}-${Date.now().toString(36)}`;

        console.info('[Admin][AirdropSave] Inserting new airdrop', { slug });

        const { data: newAirdrop, error } = await supabase
          .from('airdrops')
          .insert({
            ...payload,
            slug,
            sort_order: airdrops.length,
            listing_state: 'verified',
          })
          .select('id, name')
          .single();

        if (error) throw error;

        currentStep = 'update_airdrop_tasks';
        const taskCount = newAirdrop ? await saveTasksForAirdrop(newAirdrop.id, form.tasks_text) : 0;

        if (newAirdrop) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const analyzeRes = await supabase.functions.invoke('analyze-airdrop', {
              body: { airdrop_id: newAirdrop.id, force: true },
              headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
            });
            if (analyzeRes.error) throw analyzeRes.error;
          } catch (analysisErr) {
            showToast(`${form.name} added, but automatic AI enrichment failed: ${analysisErr instanceof Error ? analysisErr.message : 'Unknown error'}`, 'error');
          }

          if (form.published) {
            currentStep = 'write_publish_audit_log';
            try {
              await logAdminAudit({
                actionTaken: 'Publish airdrop',
                aiRecommendation: `Trust ${form.risk_level} risk | Reward ${form.reward_potential}`,
                finalDecision: 'Approved and published',
                notes: reviewNotes ?? undefined,
                context: {
                  airdropId: newAirdrop.id,
                  airdropName: form.name.trim(),
                  source: 'airdrop_form_add',
                },
              }, { throwOnError: true, source: 'airdrop_form_add_publish' });
            } catch (auditErr) {
              const auditError = describeError(auditErr);
              showToast(`Airdrop published, but audit log failed: ${auditError}`, 'error');
            }
          }
        }

        showToast(`${form.name} added successfully${taskCount ? ` with ${taskCount} task${taskCount !== 1 ? 's' : ''}` : ''} and AI enrichment started`);
        fetchStats();
      } else {
        currentStep = 'update_airdrop';
        console.info('[Admin][AirdropSave] Updating airdrop', { editingId });
        const { error } = await supabase
          .from('airdrops')
          .update(payload)
          .eq('id', editingId!);

        if (error) throw error;

        console.info('[Admin][AirdropSave] Airdrop updated', {
          editingId,
          published: payload.published,
          isFeatured: payload.is_featured,
          isTrending: payload.is_trending,
        });

        const becamePublished = Boolean(payload.published && existing && !existing.published);
        const becameUnpublished = Boolean(existing?.published && !payload.published);

        if (becamePublished) {
          currentStep = 'write_publish_audit_log';
          try {
            await logAdminAudit({
              actionTaken: 'Publish airdrop',
              aiRecommendation: `Trust ${existing?.trust_score ?? 'unknown'} | Risk ${existing?.risk_level ?? 'unknown'}`,
              finalDecision: 'Approved and published',
              notes: reviewNotes ?? undefined,
              context: {
                airdropId: editingId,
                airdropName: form.name.trim(),
                source: 'airdrop_form_edit',
              },
            }, { throwOnError: true, source: 'airdrop_form_edit_publish' });
          } catch (auditErr) {
            const auditError = describeError(auditErr);
            showToast(`Airdrop published, but audit log failed: ${auditError}`, 'error');
          }
        }

        if (becameUnpublished) {
          currentStep = 'write_unpublish_audit_log';
          try {
            await logAdminAudit({
              actionTaken: 'Unpublish airdrop',
              aiRecommendation: `Trust ${existing?.trust_score ?? 'unknown'} | Risk ${existing?.risk_level ?? 'unknown'}`,
              finalDecision: 'Unpublished',
              context: {
                airdropId: editingId,
                airdropName: form.name.trim(),
                source: 'airdrop_form_edit',
              },
            }, { throwOnError: true, source: 'airdrop_form_edit_unpublish' });
          } catch (auditErr) {
            const auditError = describeError(auditErr);
            showToast(`Airdrop unpublished, but audit log failed: ${auditError}`, 'error');
          }
        }

        currentStep = 'update_airdrop_tasks';
        const taskCount = await saveTasksForAirdrop(editingId!, form.tasks_text);
        showToast(`${form.name} updated${taskCount ? ` with ${taskCount} task${taskCount !== 1 ? 's' : ''}` : ''}`);
      }

      currentStep = 'finalize_success';
      console.info('[Admin][AirdropSave] Final success', {
        modalMode,
        editingId,
        name: form.name.trim(),
      });

      setModalMode(null);
      fetchAirdrops();
      fetchStats();
    } catch (e) {
      const exactError = describeError(e);
      console.error('[Admin][AirdropSave] Step failed', {
        step: currentStep,
        modalMode,
        editingId,
        name: form.name.trim(),
        error: e,
        exactError,
      });
      showToast(`Airdrop save failed at ${currentStep}: ${exactError}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingAirdrop) return;
    setDeleting(true);
    try {
      await supabase.from('airdrop_tasks').delete().eq('airdrop_id', deletingAirdrop.id);
      const { error } = await supabase.from('airdrops').delete().eq('id', deletingAirdrop.id);
      if (error) throw error;
      setAirdrops(prev => prev.filter(a => a.id !== deletingAirdrop.id));
      showToast(`${deletingAirdrop.name} deleted`);
      setDeletingAirdrop(null);
      fetchStats();
    } catch (e) {
      showToast(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
    } finally {
      setDeleting(false);
    }
  };

  // ── Access control ────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/auth?redirect=/admin'); return; }
    if (!isAdmin) { navigate('/'); }
  }, [authLoading, user, isAdmin, navigate]);

  // ── Fetch airdrops ─────────────────────────────────────────────────────────
  const fetchAirdrops = useCallback(async () => {
    const { data } = await supabase.from('airdrops').select('*').eq('is_demo', false).not('review_status', 'eq', 'replaced_demo').order('sort_order', { ascending: true });
    if (data) setAirdrops(data as Airdrop[]);
    setLoading(false);
  }, []);

  // ── Fetch stats ───────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    const [r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14] = await Promise.all([
      supabase.from('airdrops').select('*', { count: 'exact', head: true }).eq('is_demo', false).not('review_status', 'eq', 'replaced_demo'),
      supabase.from('airdrops').select('*', { count: 'exact', head: true }).eq('is_demo', false).not('review_status', 'eq', 'replaced_demo').eq('published', true),
      supabase.from('airdrops').select('*', { count: 'exact', head: true }).eq('is_demo', false).not('review_status', 'eq', 'replaced_demo').not('trust_score', 'is', null),
      supabase.from('airdrops').select('*', { count: 'exact', head: true }).eq('is_demo', false).not('review_status', 'eq', 'replaced_demo').not('last_analyzed_at', 'is', null),
      supabase.from('airdrop_tasks').select('*', { count: 'exact', head: true }),
      supabase.from('newsletter_subscribers').select('*', { count: 'exact', head: true }),
      supabase.from('api_subscriptions').select('*', { count: 'exact', head: true }).eq('plan', 'pro').eq('status', 'active'),
      supabase.from('api_subscriptions').select('*', { count: 'exact', head: true }).eq('plan', 'business').eq('status', 'active'),
      supabase.from('api_keys').select('*', { count: 'exact', head: true }).is('revoked_at', null),
      supabase.from('api_usage_logs').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 86_400_000).toISOString()),
      supabase.from('api_usage_logs').select('*', { count: 'exact', head: true }),
      supabase.from('airdrop_submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('airdrop_submissions').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('airdrop_submissions').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
    ]);
    setStats({
      totalAirdrops: r1.count ?? 0, publishedAirdrops: r2.count ?? 0,
      scoredAirdrops: r3.count ?? 0, analyzedAirdrops: r4.count ?? 0,
      totalTasks: r5.count ?? 0, newsletterSubs: r6.count ?? 0,
      proSubs: r7.count ?? 0, businessSubs: r8.count ?? 0,
      activeKeys: r9.count ?? 0, apiCallsToday: r10.count ?? 0,
      apiCallsTotal: r11.count ?? 0, pendingSubmissions: r12.count ?? 0,
      approvedSubmissions: r13.count ?? 0, rejectedSubmissions: r14.count ?? 0,
    });
    setStatsLoading(false);
  }, []);

  const fetchSubmissions = useCallback(async () => {
    setSubLoading(true);
    const { data } = await supabase.from('airdrop_submissions').select('*').order('submitted_at', { ascending: false });
    if (data) {
      setSubmissions(data as Submission[]);
      const notes: Record<string, string> = {};
      (data as Submission[]).forEach(s => { notes[s.id] = s.admin_notes ?? ''; });
      setSubNotes(notes);
    }
    setSubLoading(false);
  }, []);

  const fetchScamReports = useCallback(async () => {
    setScamReportsLoading(true);

    try {
      const { data, error } = await supabase
        .from('scam_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = (data ?? []) as ScamReport[];
      setScamReports(rows);

      const notes: Record<string, string> = {};
      rows.forEach(report => { notes[report.id] = report.admin_notes ?? ''; });
      setScamReportNotes(notes);
    } catch (error) {
      console.warn('scam_reports unavailable', error);
      setScamReports([]);
    } finally {
      setScamReportsLoading(false);
    }
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    setAuditError(null);

    try {
      const { data, error } = await supabase
        .from('admin_audit_logs')
        .select('id, action_at, created_at, admin_user_id, admin_identifier, action_taken, ai_recommendation, final_decision, notes, context')
        .order('action_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      setAuditLogs((data ?? []) as AdminAuditLog[]);
    } catch (error) {
      setAuditLogs([]);
      const supabaseError = error as {
        code?: string;
        message?: string;
        details?: string | null;
        hint?: string | null;
      };

      console.error('admin_audit_logs fetch failed', {
        code: supabaseError?.code,
        message: supabaseError?.message,
        details: supabaseError?.details,
        hint: supabaseError?.hint,
      });

      if (supabaseError?.code === 'PGRST205') {
        setAuditError('Audit log table is not initialized in the current Supabase project. Apply migration 20260704093000_add_admin_audit_logs.sql.');
      } else if (supabaseError?.code === '42501') {
        setAuditError('Permission denied reading admin audit logs. Confirm admin account exists in admin_users and RLS policies are applied.');
      } else {
        const details = [supabaseError?.message, supabaseError?.details, supabaseError?.hint]
          .filter(Boolean)
          .join(' | ');
        setAuditError(details || 'Unable to load admin audit logs.');
      }
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAdmin) {
      fetchAirdrops();
      fetchStats();
      fetchSubmissions();
      fetchScamReports();
      fetchAuditLogs();
      fetchArticleTrustData();
      fetchAIDrafts();
      fetchCompetitorWatchData();
      fetchAdminNotifications();
    }
  }, [authLoading, isAdmin, fetchAirdrops, fetchStats, fetchSubmissions, fetchScamReports, fetchAuditLogs, fetchArticleTrustData, fetchAIDrafts, fetchCompetitorWatchData, fetchAdminNotifications]);

  useEffect(() => {
    if (isAdmin) {
      fetchOpsUsers();
    }
  }, [isAdmin, fetchOpsUsers]);

  const updateSubmissionStatus = async (id: string, status: string) => {
    await supabase.from('airdrop_submissions').update({ status, reviewed_at: new Date().toISOString() }).eq('id', id);
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    const submission = submissions.find((row) => row.id === id);
    if (submission) {
      await logAdminAudit({
        actionTaken: 'Review airdrop submission',
        aiRecommendation: submission.ai_recommendation || 'No AI recommendation available',
        finalDecision: status,
        notes: subNotes[id] || undefined,
        context: {
          submissionId: id,
          projectName: submission.project_name,
        },
      });
    }
    fetchStats();
  };


  const updateScamReportStatus = async (report: ScamReport, status: 'approved' | 'rejected' | 'pending') => {
    setReviewingScamReport(report.id);

    try {
      const patch: Record<string, unknown> = {
        status,
        admin_notes: scamReportNotes[report.id] ?? report.admin_notes ?? '',
        reviewed_at: status === 'pending' ? null : new Date().toISOString(),
      };

      let awarded = false;

      if (status === 'approved' && report.user_id && !report.rep_awarded) {
        await awardApprovedScamReportRep(report.user_id);
        patch.rep_awarded = true;
        awarded = true;
      }

      const { error } = await supabase
        .from('scam_reports')
        .update(patch)
        .eq('id', report.id);

      if (error) throw error;

      setScamReports(prev => prev.map(r => r.id === report.id ? {
        ...r,
        status,
        admin_notes: String(patch.admin_notes ?? ''),
        reviewed_at: patch.reviewed_at as string | null,
        rep_awarded: typeof patch.rep_awarded === 'boolean' ? patch.rep_awarded : r.rep_awarded,
      } : r));

      await logAdminAudit({
        actionTaken: 'Review scam report',
        aiRecommendation: report.reason || 'No AI recommendation available',
        finalDecision: status,
        notes: String(patch.admin_notes ?? '') || undefined,
        context: {
          reportId: report.id,
          projectName: report.project_name,
          repAwarded: awarded,
        },
      });

      showToast(
        status === 'approved'
          ? `Scam report approved${awarded ? ` · ${SCAM_REPORT_REP} REP awarded` : ''}`
          : status === 'rejected'
          ? 'Scam report rejected'
          : 'Scam report reset to pending'
      );
    } catch (error) {
      showToast(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setReviewingScamReport(null);
    }
  };

  const saveScamReportNotes = async (report: ScamReport) => {
    const { error } = await supabase
      .from('scam_reports')
      .update({ admin_notes: scamReportNotes[report.id] ?? '' })
      .eq('id', report.id);

    if (error) {
      showToast(`Error: ${error.message}`, 'error');
      return;
    }

    setScamReports(prev => prev.map(r => r.id === report.id ? { ...r, admin_notes: scamReportNotes[report.id] ?? '' } : r));
    showToast('Scam report notes saved');
  };

  const saveAdminNotes = async (id: string) => {
    await supabase.from('airdrop_submissions').update({ admin_notes: subNotes[id] ?? '' }).eq('id', id);
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, admin_notes: subNotes[id] ?? '' } : s));
  };

  const setArticlePublicationStatus = useCallback((articleId: string, status: ControlArticle['status']) => {
    setControlArticles((prev) => prev.map((row) => {
      if (row.id !== articleId) return row;
      return { ...row, status, updatedAt: new Date().toISOString() };
    }));
  }, []);

  const saveArticleTrustChanges = useCallback(async () => {
    console.info('[Admin][ArticleTrust] Save requested', {
      hasSelectedArticle: Boolean(selectedControlArticle),
      articleKey: selectedControlArticle?.articleKey ?? null,
      hasProfile: Boolean(selectedArticleProfile),
      isSaving: articleTrustSaving,
    });

    if (articleTrustSaving) {
      console.warn('[Admin][ArticleTrust] Save ignored because save is already in progress');
      showToast('Save already in progress. Please wait...');
      return;
    }

    if (!selectedControlArticle || !selectedArticleProfile) {
      console.warn('[Admin][ArticleTrust] Save aborted due to missing selected article/profile', {
        selectedControlArticle,
        selectedArticleProfile,
      });
      showToast('Unable to save: no article is selected.', 'error');
      return;
    }

    const reviewNotes = await promptHumanVerificationNotes(`Update trust verification for article \"${selectedControlArticle.title}\"`);
    if (!reviewNotes) {
      console.warn('[Admin][ArticleTrust] Save aborted because verification notes were not provided');
      return;
    }

    setArticleTrustSaving(true);

    try {
      console.info('[Admin][ArticleTrust] Save started', {
        articleKey: selectedControlArticle.articleKey,
        publicationStatus: selectedControlArticle.status,
        verificationStatus: selectedArticleProfile.verificationStatus,
      });

      const checklist = selectedArticleChecklist;
      const reviewedAtValue = selectedArticleProfile.reviewedAt
        ? selectedArticleProfile.reviewedAt
        : new Date().toISOString().split('T')[0];

      const profilePayload = {
        article_key: selectedControlArticle.articleKey,
        title: selectedControlArticle.title,
        url_path: selectedControlArticle.urlPath,
        publication_status: selectedControlArticle.status,
        verification_status: selectedArticleProfile.verificationStatus,
        reviewed_by: selectedArticleProfile.reviewedBy || 'AirdropGuard Team',
        reviewed_at: reviewedAtValue,
        last_updated_at: selectedArticleProfile.lastUpdatedAt || new Date().toISOString(),
        estimated_read_minutes: Math.max(1, Number(selectedArticleProfile.estimatedReadMinutes || 8)),
        official_docs_url: selectedArticleProfile.sources.officialDocsUrl || null,
        official_github_url: selectedArticleProfile.sources.githubUrl || null,
        official_website_url: selectedArticleProfile.sources.officialWebsiteUrl || null,
        official_x_url: selectedArticleProfile.sources.officialXUrl || null,
        official_blog_url: selectedArticleProfile.sources.officialBlogUrl || null,
        updated_at: new Date().toISOString(),
      };

      const internalPayload = {
        article_key: selectedControlArticle.articleKey,
        facts_checked: checklist.factsChecked,
        sources_verified: checklist.sourcesVerified,
        links_tested: checklist.linksTested,
        scam_guidance_reviewed: checklist.scamGuidanceReviewed,
        security_advice_reviewed: checklist.securityAdviceReviewed,
        grammar_checked: checklist.grammarChecked,
        internal_review_notes: checklist.internalReviewNotes || null,
        updated_at: new Date().toISOString(),
      };

      console.debug('[Admin][ArticleTrust] Upsert payloads prepared', {
        articleKey: selectedControlArticle.articleKey,
        profilePayload,
        internalPayload,
      });

      const [profileRes, internalRes] = await Promise.all([
        supabase.from('article_verification_profiles').upsert(profilePayload, { onConflict: 'article_key' }),
        supabase.from('article_review_internal').upsert(internalPayload, { onConflict: 'article_key' }),
      ]);

      console.info('[Admin][ArticleTrust] Upsert responses received', {
        profileError: profileRes.error,
        internalError: internalRes.error,
      });

      if (profileRes.error) throw profileRes.error;
      if (internalRes.error) throw internalRes.error;

      await logAdminAudit({
        actionTaken: 'Update article trust verification',
        aiRecommendation: `Status ${verificationStatusLabel(selectedArticleProfile.verificationStatus)} | Publication ${selectedControlArticle.status}`,
        finalDecision: 'Human verified metadata updated',
        notes: reviewNotes,
        context: {
          articleId: selectedControlArticle.articleKey,
          title: selectedControlArticle.title,
          verificationStatus: selectedArticleProfile.verificationStatus,
          publicationStatus: selectedControlArticle.status,
          checklist,
        },
      });

      console.info('[Admin][ArticleTrust] Save succeeded', {
        articleKey: selectedControlArticle.articleKey,
      });

      showToast('Verification metadata saved');
      await fetchArticleTrustData();
    } catch (error) {
      const exactError = formatSupabaseError(error) || (error instanceof Error ? error.message : 'Unknown error');
      console.error('[Admin][ArticleTrust] Save failed', {
        articleKey: selectedControlArticle.articleKey,
        error,
        exactError,
      });
      showToast(`Unable to save article trust changes: ${exactError}`, 'error');
    } finally {
      setArticleTrustSaving(false);
      console.info('[Admin][ArticleTrust] Save finished', {
        articleKey: selectedControlArticle.articleKey,
      });
    }
  }, [
    articleTrustSaving,
    selectedControlArticle,
    selectedArticleProfile,
    selectedArticleChecklist,
    formatSupabaseError,
    promptHumanVerificationNotes,
    logAdminAudit,
    showToast,
    fetchArticleTrustData,
  ]);

  const analyzeSubmission = async (sub: Submission) => {
    setAnalyzingSub(sub.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('analyze-airdrop', {
        body: { submission_id: sub.id },
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      if (res.error) throw new Error(res.error.message);
      showToast(`${sub.project_name}: AI analysis complete`);
      const { data } = await supabase.from('airdrop_submissions').select('*').eq('id', sub.id).single();
      if (data) setSubmissions(prev => prev.map(s => s.id === sub.id ? data as Submission : s));
    } catch (e) {
      showToast(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
    } finally {
      setAnalyzingSub(null);
    }
  };

  const runAnalysis = async (airdrop: Airdrop, force = false) => {
    setAnalyzing(airdrop.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('analyze-airdrop', {
        body: { airdrop_id: airdrop.id, force },
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      if (res.error) throw new Error(res.error.message);
      const result = res.data as { success: boolean; cached?: boolean; enrichment_stats?: typeof lastEnrichmentStats };
      if (!result.cached && result.enrichment_stats) setLastEnrichmentStats(result.enrichment_stats);
      showToast(result.cached ? `${airdrop.name}: cached result returned` : `${airdrop.name}: analysis complete`);
      const { data } = await supabase.from('airdrops').select('*').eq('id', airdrop.id).single();
      if (data) { setAirdrops(prev => prev.map(a => a.id === airdrop.id ? data as Airdrop : a)); fetchStats(); }
    } catch (e) {
      showToast(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
    } finally {
      setAnalyzing(null);
    }
  };

  const refreshAllAnalysis = async () => {
    setRefreshingAll(true);
    const { data: { session } } = await supabase.auth.getSession();
    let succeeded = 0;
    let failed = 0;
    for (const airdrop of airdrops) {
      try {
        const res = await supabase.functions.invoke('analyze-airdrop', {
          body: { airdrop_id: airdrop.id, force: true },
          headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
        });
        if (res.error) throw new Error(res.error.message);
        succeeded++;
      } catch {
        failed++;
      }
    }
    await fetchAirdrops();
    await fetchStats();
    if (failed === 0) {
      showToast(`AI analysis refreshed for ${succeeded} airdrop${succeeded !== 1 ? 's' : ''}`);
    } else {
      showToast(`${succeeded} succeeded, ${failed} failed`, 'error');
    }
    setRefreshingAll(false);
  };

  // ─────────────────────────────────────────────────────────────────────────

  if (authLoading || (loading && isAdmin)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-neon-purple animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 overflow-x-hidden pb-24 lg:pb-8">

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-gray-400 text-sm mt-1">{airdrops.length} airdrops total</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={openAdd}
            className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-neon-purple/10 border border-neon-purple/25 text-neon-purple hover:bg-neon-purple/20 transition-colors text-sm font-medium">
            <Plus className="w-4 h-4" /> Add Airdrop
          </button>
          <Link to="/admin/airdrop-import"
            className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-neon-blue/10 border border-neon-blue/25 text-neon-blue hover:bg-neon-blue/20 transition-colors text-sm font-medium">
            <Download className="w-4 h-4" /> Import
          </Link>
          <button
            onClick={refreshAllAnalysis}
            disabled={refreshingAll || airdrops.length === 0}
            title="Refresh AI analysis for all airdrops"
            className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 hover:bg-white/5 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {refreshingAll
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Brain className="w-4 h-4" />}
            {refreshingAll ? 'Analyzing…' : 'Refresh All AI'}
          </button>
          <button onClick={() => { fetchAirdrops(); fetchStats(); fetchSubmissions(); fetchScamReports(); fetchAuditLogs(); fetchAIDrafts(); fetchCompetitorWatchData(); fetchAdminNotifications(); }}
            aria-label="Refresh admin data"
            className="min-h-[44px] px-3 py-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={async () => { await signOut(); navigate('/'); }}
            className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-rose-500/20 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors text-sm"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
          {lastEnrichmentStats && (
            <div className="w-full lg:w-auto flex flex-wrap items-center gap-2 text-[10px] text-gray-500 border-l border-white/10 pl-3 ml-1">
              <span className="text-gray-400 font-medium">Last enrichment:</span>
              <span className={lastEnrichmentStats.websites_analyzed ? 'text-sky-400' : 'text-gray-600'}>Sites {lastEnrichmentStats.websites_analyzed}</span>
              <span className={lastEnrichmentStats.docs_found ? 'text-emerald-400' : 'text-gray-600'}>Docs {lastEnrichmentStats.docs_found}</span>
              <span className={lastEnrichmentStats.github_found ? 'text-violet-400' : 'text-gray-600'}>GitHub {lastEnrichmentStats.github_found}</span>
              <span className={lastEnrichmentStats.funding_found ? 'text-amber-400' : 'text-gray-600'}>Funding {lastEnrichmentStats.funding_found}</span>
              <span className={lastEnrichmentStats.token_detected ? 'text-blue-400' : 'text-gray-600'}>Token {lastEnrichmentStats.token_detected}</span>
              <span className={lastEnrichmentStats.investors_found ? 'text-rose-400' : 'text-gray-600'}>Investors {lastEnrichmentStats.investors_found}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-20 rounded-2xl border border-white/10 bg-dark-900/70 p-3 backdrop-blur-sm">
            <p className="text-[11px] uppercase tracking-[0.13em] text-cyan-200">Admin Navigation</p>
            <p className="mt-1 text-xs text-gray-400">Focused workspace sections with minimal scrolling.</p>

            <div className="mt-3 space-y-1.5">
              {adminNavItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setAdminView(item.id)}
                  className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${adminView === item.id ? 'border-cyan-400/40 bg-cyan-500/12 text-cyan-100' : 'border-white/10 bg-dark-900/50 text-gray-300 hover:border-white/20 hover:text-white'}`}
                >
                  <p className="text-xs font-semibold">{item.label}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{item.blurb}</p>
                </button>
              ))}
            </div>

            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.11em] text-cyan-200">Unread Alerts</p>
              <p className="mt-1 text-sm font-semibold text-white tabular-nums">
                {notificationsLoading ? '…' : unreadNotificationsCount}
              </p>
            </div>
          </div>
        </aside>

        <div className="space-y-8 pb-24 lg:pb-0">
          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 sm:p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-[11px] uppercase tracking-[0.13em] text-cyan-200">Current Workspace</p>
                <h2 className="mt-1 text-lg font-bold text-white">{activeAdminNavItem.label}</h2>
                <p className="text-xs text-gray-400 mt-1">{activeAdminNavItem.blurb}</p>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-dark-900/50 px-3 py-1.5 text-xs text-gray-300">
                <Bell className="w-3.5 h-3.5 text-cyan-300" />
                {notificationsLoading ? 'Loading alerts…' : `${unreadNotificationsCount} unread alert${unreadNotificationsCount === 1 ? '' : 's'}`}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-dark-900/40 p-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-cyan-200">In-App Admin Notifications</p>
              {adminNotifications.length === 0 ? (
                <p className="mt-2 text-xs text-gray-500">No admin notifications yet.</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {adminNotifications.slice(0, 4).map((item) => (
                    <div key={item.id} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-white">{item.title}</p>
                        <p className="text-[10px] text-gray-500">{new Date(item.created_at).toLocaleString()}</p>
                      </div>
                      <p className="mt-1 text-xs text-gray-400">{item.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section id="admin-needs-attention" className={canShowSection('overview') ? '' : 'hidden'}>
        <div className="rounded-2xl border border-white/10 bg-[linear-gradient(145deg,rgba(10,16,34,0.96),rgba(8,14,28,0.92))] p-4 mb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-cyan-200">Platform Overview</p>
              <h2 className="mt-1 text-xl font-bold text-white">AirdropGuard Admin Control Centre</h2>
              <p className="mt-1 text-xs text-gray-400">Human-verified operations across listings, submissions, content, banners, API access and audit history.</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-gray-500">Recent Activity</p>
              <p className="text-lg font-semibold text-cyan-200">{auditLoading ? '…' : auditEntriesTodayCount} audit entries today</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
            {[
              { label: 'Total Users', value: usersLoading ? '…' : String(opsUsers.length) },
              { label: 'Total Airdrops', value: String(stats?.totalAirdrops ?? 0) },
              { label: 'Pending Reviews', value: String(stats?.pendingSubmissions ?? 0) },
              { label: 'Approved Airdrops', value: String(stats?.publishedAirdrops ?? 0) },
              { label: 'Featured Airdrops', value: String(airdrops.filter((a) => a.is_featured).length) },
              { label: 'Active API Keys', value: String(stats?.activeKeys ?? 0) },
              { label: 'Revenue', value: `$${estimatedRevenuePipeline}` },
              { label: 'Recent Activity', value: auditLoading ? '…' : String(auditEntriesTodayCount) },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.1em] text-gray-500">{item.label}</p>
                <p className="mt-1 text-sm font-semibold text-white tabular-nums">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-amber-300">🚨 Needs Attention Today</h2>
          {statsLoading && <Loader2 className="w-3 h-3 text-gray-600 animate-spin" />}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          <ActionCard
            title="Pending Airdrop Reviews"
            count={stats?.pendingSubmissions ?? 0}
            status="Needs review"
            blurb="Approve, reject, or request more info."
            actionLabel="Review Submission"
            onAction={() => { setAdminView('submissions'); jumpToSection('admin-submissions'); }}
          />
          <ActionCard
            title="Banner Enquiries"
            count={pendingBannerEnquiries}
            status="Waiting for artwork"
            blurb="Activate and schedule campaigns quickly."
            actionLabel="Manage Banner"
            onAction={() => { setAdminView('banners'); jumpToSection('admin-advertising'); }}
          />
          <ActionCard
            title="Scam Reports"
            count={pendingScamReports}
            status="Needs triage"
            blurb="Review reports and protect user trust."
            actionLabel="Open Reports"
            onAction={() => { setAdminView('submissions'); jumpToSection('admin-scam-reports'); }}
          />
          <ActionCard
            title="Expiring Listings"
            count={expiringListings.length}
            status="Ending in 7 days"
            blurb="Renew, replace, or expire safely."
            actionLabel="Publish Project"
            onAction={() => { setAdminView('airdrops'); jumpToSection('admin-airdrops'); }}
          />
          <ActionCard
            title="Failed AI Analyses"
            count={failedAiQueue.length}
            status="AI queue"
            blurb="Projects with no fresh analysis data."
            actionLabel="Refresh AI"
            onAction={() => { setAdminView('system-tools'); jumpToSection('admin-ai-control'); }}
          />
          <ActionCard
            title="Missing Project Information"
            count={missingProjectInfo.length}
            status="Content quality"
            blurb="Fill docs, GitHub, funding, and logos."
            actionLabel="Fix Project"
            onAction={() => { setAdminView('system-tools'); jumpToSection('admin-site-health'); }}
          />
          <ActionCard
            title="Articles Awaiting Publication"
            count={articlesAwaitingPublication.length}
            status="Content pending"
            blurb="Draft and scheduled articles waiting to go live."
            actionLabel="Open Articles"
            onAction={() => {
              setAdminView('content');
              setContentView('articles');
              jumpToSection('admin-content');
            }}
          />
          <ActionCard
            title="Weekly AI Draft"
            count={aiDrafts.filter((d) => d.status === 'ai_assisted_draft').length}
            status="Awaiting review"
            blurb="AI-assisted drafts waiting for human verification."
            actionLabel="Open Drafts"
            onAction={() => { setAdminView('ai-drafts'); jumpToSection('admin-ai-article-drafts'); }}
          />
          <ActionCard
            title="Competitor Queue"
            count={competitorOpportunities.filter((o) => o.status === 'new').length}
            status="New projects found"
            blurb="Candidates discovered externally but not listed yet."
            actionLabel="Open Watch"
            onAction={() => { setAdminView('competitor-watch'); jumpToSection('admin-competitor-watch'); }}
          />
          <ActionCard
            title="Today's Audit Entries"
            count={auditLoading || auditError ? 0 : auditEntriesTodayCount}
            status={auditNeedsAttentionStatus}
            blurb={auditNeedsAttentionBlurb}
            actionLabel="Open Audit Log"
            onAction={() => { setAdminView('audit-logs'); jumpToSection('admin-audit-logs'); }}
          />
        </div>
      </section>

      <section id="admin-content" className={`rounded-2xl border border-sky-500/20 bg-sky-500/[0.05] p-4 space-y-4 ${canShowSection('content') ? '' : 'hidden'}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-sky-200">CONTENT</h2>
            <p className="text-xs text-gray-300 mt-1">Run homepage and publishing from one place.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => { setAdminView('airdrops'); setContentView('airdrops'); jumpToSection('admin-airdrops'); }} className="px-3 py-1.5 rounded-lg border border-sky-400/25 bg-sky-500/10 text-xs text-sky-200">Manage Airdrops</button>
            <button onClick={() => setContentView('articles')} className="px-3 py-1.5 rounded-lg border border-sky-400/25 bg-sky-500/10 text-xs text-sky-200">Manage Articles</button>
            <button onClick={() => setContentView('hero')} className="px-3 py-1.5 rounded-lg border border-sky-400/25 bg-sky-500/10 text-xs text-sky-200">Edit Homepage Hero</button>
            <button onClick={() => setContentView('featured')} className="px-3 py-1.5 rounded-lg border border-sky-400/25 bg-sky-500/10 text-xs text-sky-200">Feature Project</button>
            <button onClick={() => setContentView('trending')} className="px-3 py-1.5 rounded-lg border border-sky-400/25 bg-sky-500/10 text-xs text-sky-200">Trending Projects</button>
            <button onClick={() => setContentView('learn')} className="px-3 py-1.5 rounded-lg border border-sky-400/25 bg-sky-500/10 text-xs text-sky-200">Learn Articles</button>
            <button onClick={() => setContentView('sections')} className="px-3 py-1.5 rounded-lg border border-sky-400/25 bg-sky-500/10 text-xs text-sky-200">Homepage Sections</button>
          </div>
        </div>

        {contentView === 'articles' && (
          <div className="glass-card p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wider text-sky-200">Article Trust & Verification</p>
                <p className="text-[11px] text-gray-400 mt-1">AI discovers content opportunities. Human reviewers verify and publish.</p>
              </div>
              <button
                onClick={() => void fetchArticleTrustData()}
                className="px-2.5 py-1 rounded-lg border border-white/15 text-[11px] text-gray-300 hover:border-sky-300/30 hover:text-white"
              >
                Refresh
              </button>
            </div>

            {articleTrustLoading ? (
              <div className="rounded-xl border border-white/10 bg-dark-900/40 p-4 text-xs text-gray-400">Loading article verification data...</div>
            ) : (
              <>
                <div className="grid gap-2 md:grid-cols-2">
                  {controlArticles.map((article) => {
                    const profile = articleTrustProfiles[article.articleKey];
                    const verificationStatus = profile?.verificationStatus || 'ai_assisted_draft';

                    return (
                      <button
                        key={article.id}
                        onClick={() => setSelectedArticleKey(article.articleKey)}
                        className={`rounded-xl border px-3 py-2 text-left transition-colors ${selectedArticleKey === article.articleKey ? 'border-sky-400/40 bg-sky-500/10' : 'border-white/10 bg-dark-900/30 hover:border-white/20'}`}
                      >
                        <p className="text-sm font-semibold text-white">{article.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                          <span className="rounded-full border border-white/15 bg-white/[0.04] px-2 py-0.5 text-gray-300">{article.status}</span>
                          <span className={`rounded-full border px-2 py-0.5 ${verificationStatusTone(verificationStatus)}`}>
                            {verificationStatusLabel(verificationStatus as VerificationStatus)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selectedControlArticle && selectedArticleProfile && (
                  <div className="rounded-xl border border-white/10 bg-dark-900/35 p-4 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white">{selectedControlArticle.title}</p>
                        <p className="text-[11px] text-gray-400">{selectedControlArticle.urlPath}</p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] ${verificationStatusTone(selectedArticleProfile.verificationStatus)}`}>
                        {verificationStatusLabel(selectedArticleProfile.verificationStatus)}
                      </span>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <label className="space-y-1">
                        <span className="text-[11px] text-gray-400">Publication Status</span>
                        <select
                          value={selectedControlArticle.status}
                          onChange={(event) => setArticlePublicationStatus(selectedControlArticle.id, event.target.value as ControlArticle['status'])}
                          className="w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                        >
                          <option value="draft">Draft</option>
                          <option value="scheduled">Scheduled</option>
                          <option value="published">Published</option>
                        </select>
                      </label>
                      <label className="space-y-1">
                        <span className="text-[11px] text-gray-400">Verification Status</span>
                        <select
                          value={selectedArticleProfile.verificationStatus}
                          onChange={(event) => updateSelectedArticleProfile({ verificationStatus: event.target.value as VerificationStatus })}
                          className="w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                        >
                          <option value="ai_assisted_draft">AI-Assisted Draft</option>
                          <option value="human_reviewed">Human Reviewed</option>
                          <option value="verified_airdropguard">Verified by AirdropGuard</option>
                        </select>
                      </label>
                      <label className="space-y-1">
                        <span className="text-[11px] text-gray-400">Estimated Reading Time (minutes)</span>
                        <input
                          type="number"
                          min={1}
                          value={selectedArticleProfile.estimatedReadMinutes}
                          onChange={(event) => updateSelectedArticleProfile({ estimatedReadMinutes: Number(event.target.value) || 1 })}
                          className="w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                        />
                      </label>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="space-y-1">
                        <span className="text-[11px] text-gray-400">Reviewed By</span>
                        <input
                          value={selectedArticleProfile.reviewedBy}
                          onChange={(event) => updateSelectedArticleProfile({ reviewedBy: event.target.value })}
                          className="w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[11px] text-gray-400">Reviewed Date</span>
                        <input
                          type="date"
                          value={selectedArticleProfile.reviewedAt || ''}
                          onChange={(event) => updateSelectedArticleProfile({ reviewedAt: event.target.value || null })}
                          className="w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                        />
                      </label>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="space-y-1">
                        <span className="text-[11px] text-gray-400">Official Documentation URL</span>
                        <input
                          value={selectedArticleProfile.sources.officialDocsUrl || ''}
                          onChange={(event) => updateSelectedArticleProfile({ sources: { officialDocsUrl: event.target.value } })}
                          className="w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                          placeholder="https://project.org/docs"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[11px] text-gray-400">Official GitHub URL</span>
                        <input
                          value={selectedArticleProfile.sources.githubUrl || ''}
                          onChange={(event) => updateSelectedArticleProfile({ sources: { githubUrl: event.target.value } })}
                          className="w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                          placeholder="https://github.com/org/repo"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[11px] text-gray-400">Official Website URL</span>
                        <input
                          value={selectedArticleProfile.sources.officialWebsiteUrl || ''}
                          onChange={(event) => updateSelectedArticleProfile({ sources: { officialWebsiteUrl: event.target.value } })}
                          className="w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                          placeholder="https://project.org"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[11px] text-gray-400">Official X URL</span>
                        <input
                          value={selectedArticleProfile.sources.officialXUrl || ''}
                          onChange={(event) => updateSelectedArticleProfile({ sources: { officialXUrl: event.target.value } })}
                          className="w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                          placeholder="https://x.com/project"
                        />
                      </label>
                      <label className="space-y-1 md:col-span-2">
                        <span className="text-[11px] text-gray-400">Official Blog URL</span>
                        <input
                          value={selectedArticleProfile.sources.officialBlogUrl || ''}
                          onChange={(event) => updateSelectedArticleProfile({ sources: { officialBlogUrl: event.target.value } })}
                          className="w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                          placeholder="https://project.org/blog"
                        />
                      </label>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                      <p className="text-[11px] uppercase tracking-wider text-sky-200">Human Verification Checklist</p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2 text-xs text-gray-300">
                        <label className="flex items-center gap-2"><input type="checkbox" checked={selectedArticleChecklist.factsChecked} onChange={(event) => updateSelectedArticleChecklist({ factsChecked: event.target.checked })} /> Facts checked</label>
                        <label className="flex items-center gap-2"><input type="checkbox" checked={selectedArticleChecklist.sourcesVerified} onChange={(event) => updateSelectedArticleChecklist({ sourcesVerified: event.target.checked })} /> Sources verified</label>
                        <label className="flex items-center gap-2"><input type="checkbox" checked={selectedArticleChecklist.linksTested} onChange={(event) => updateSelectedArticleChecklist({ linksTested: event.target.checked })} /> Links tested</label>
                        <label className="flex items-center gap-2"><input type="checkbox" checked={selectedArticleChecklist.scamGuidanceReviewed} onChange={(event) => updateSelectedArticleChecklist({ scamGuidanceReviewed: event.target.checked })} /> Scam guidance reviewed</label>
                        <label className="flex items-center gap-2"><input type="checkbox" checked={selectedArticleChecklist.securityAdviceReviewed} onChange={(event) => updateSelectedArticleChecklist({ securityAdviceReviewed: event.target.checked })} /> Security advice reviewed</label>
                        <label className="flex items-center gap-2"><input type="checkbox" checked={selectedArticleChecklist.grammarChecked} onChange={(event) => updateSelectedArticleChecklist({ grammarChecked: event.target.checked })} /> Grammar checked</label>
                      </div>
                      <label className="mt-3 block space-y-1">
                        <span className="text-[11px] text-gray-400">Internal Review Notes (Admin only)</span>
                        <textarea
                          rows={3}
                          value={selectedArticleChecklist.internalReviewNotes}
                          onChange={(event) => updateSelectedArticleChecklist({ internalReviewNotes: event.target.value })}
                          className="w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                        />
                      </label>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={async () => {
                          setArticlePublicationStatus(selectedControlArticle.id, 'draft');
                          updateSelectedArticleProfile({ lastUpdatedAt: new Date().toISOString() });
                        }}
                        className="px-3 py-1.5 rounded-lg border border-white/15 text-xs text-gray-300"
                      >
                        Mark Draft
                      </button>
                      <button
                        onClick={async () => {
                          const reviewNotes = await promptHumanVerificationNotes(`Publish article \"${selectedControlArticle.title}\"`);
                          if (!reviewNotes) return;

                          setArticlePublicationStatus(selectedControlArticle.id, 'published');
                          updateSelectedArticleProfile({
                            verificationStatus: 'human_reviewed',
                            lastUpdatedAt: new Date().toISOString(),
                            reviewedAt: new Date().toISOString().split('T')[0],
                          });

                          await logAdminAudit({
                            actionTaken: 'Publish article',
                            aiRecommendation: 'Draft article prepared by AI-assisted workflow',
                            finalDecision: 'Published',
                            notes: reviewNotes,
                            context: {
                              articleId: selectedControlArticle.articleKey,
                              title: selectedControlArticle.title,
                            },
                          });
                        }}
                        className="px-3 py-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-xs text-emerald-300"
                      >
                        Publish
                      </button>
                      <button
                        onClick={() => {
                          console.info('[Admin][ArticleTrust] Save button clicked');
                          void saveArticleTrustChanges();
                        }}
                        disabled={articleTrustSaving || !selectedControlArticle || !selectedArticleProfile}
                        title={!selectedControlArticle || !selectedArticleProfile ? 'Select an article first' : undefined}
                        className="px-3 py-1.5 rounded-lg border border-sky-400/25 bg-sky-500/10 text-xs text-sky-200 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {articleTrustSaving ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Saving...
                          </span>
                        ) : 'Save Verification Metadata'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {contentView === 'hero' && (
          <div className="glass-card p-4 space-y-3">
            <p className="text-xs uppercase tracking-wider text-sky-200">Homepage Hero</p>
            <input value={homepageHeroTitle} onChange={(e) => setHomepageHeroTitle(e.target.value)} className="w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white" />
            <textarea value={homepageHeroSubtext} onChange={(e) => setHomepageHeroSubtext(e.target.value)} rows={2} className="w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white" />
            <button onClick={() => window.open('/', '_blank', 'noopener,noreferrer')} className="px-3 py-1.5 rounded-lg border border-sky-400/25 bg-sky-500/10 text-xs text-sky-200">Preview Homepage</button>
          </div>
        )}

        {contentView === 'featured' && (
          <div className="glass-card p-4 space-y-3">
            <p className="text-xs uppercase tracking-wider text-sky-200">Featured Project</p>
            <select value={featuredProjectId} onChange={(e) => setFeaturedProjectId(e.target.value)} className="w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white">
              <option value="">Select project</option>
              {airdrops.slice(0, 30).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <button
              onClick={async () => {
                if (!featuredProjectId) {
                  showToast('Select a project first', 'error');
                  return;
                }
                const project = airdrops.find((a) => a.id === featuredProjectId);
                if (!project) {
                  showToast('Selected project not found', 'error');
                  return;
                }
                const reviewNotes = await promptHumanVerificationNotes(`Approve featured project: ${project.name}`);
                if (!reviewNotes) return;

                await logAdminAudit({
                  actionTaken: 'Approve featured project',
                  aiRecommendation: `Trust ${project.trust_score ?? 'unknown'} | Risk ${project.risk_level ?? 'unknown'}`,
                  finalDecision: 'Approved for feature',
                  notes: reviewNotes,
                  context: {
                    airdropId: project.id,
                    projectName: project.name,
                  },
                });
                await openEdit(project);
              }}
              className="px-3 py-1.5 rounded-lg border border-sky-400/25 bg-sky-500/10 text-xs text-sky-200"
            >Feature Project</button>
          </div>
        )}

        {contentView === 'trending' && (
          <div className="glass-card p-4 space-y-3">
            <p className="text-xs uppercase tracking-wider text-sky-200">Trending Projects</p>
            <textarea value={trendingProjectIds} onChange={(e) => setTrendingProjectIds(e.target.value)} rows={3} placeholder="Enter project IDs, one per line" className="w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white" />
            <button
              onClick={async () => {
                const ids = trendingProjectIds.split('\n').map((id) => id.trim()).filter(Boolean);
                if (!ids.length) {
                  showToast('Enter at least one project ID', 'error');
                  return;
                }
                const project = airdrops.find((a) => ids.includes(a.id));
                if (!project) {
                  showToast('No matching project found', 'error');
                  return;
                }
                const reviewNotes = await promptHumanVerificationNotes('Approve homepage trending recommendations');
                if (!reviewNotes) return;

                await logAdminAudit({
                  actionTaken: 'Approve homepage recommendations',
                  aiRecommendation: 'Trending candidates selected by AI + admin shortlist',
                  finalDecision: 'Approved for homepage trending queue',
                  notes: reviewNotes,
                  context: {
                    projectIds: ids,
                  },
                });
                await openEdit(project);
              }}
              className="px-3 py-1.5 rounded-lg border border-sky-400/25 bg-sky-500/10 text-xs text-sky-200"
            >Update Trending</button>
          </div>
        )}

        {contentView === 'learn' && (
          <div className="glass-card p-4 space-y-3">
            <p className="text-xs uppercase tracking-wider text-sky-200">Learn Articles</p>
            <textarea value={learnHighlights} onChange={(e) => setLearnHighlights(e.target.value)} rows={3} className="w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white" />
            <button onClick={() => window.open('/learn', '_blank', 'noopener,noreferrer')} className="px-3 py-1.5 rounded-lg border border-sky-400/25 bg-sky-500/10 text-xs text-sky-200">Open Learn Page</button>
          </div>
        )}

        {contentView === 'sections' && (
          <div className="glass-card p-4 space-y-3">
            <p className="text-xs uppercase tracking-wider text-sky-200">Homepage Sections</p>
            <textarea value={homepageSections} onChange={(e) => setHomepageSections(e.target.value)} rows={3} className="w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white" />
            <button onClick={() => window.open('/', '_blank', 'noopener,noreferrer')} className="px-3 py-1.5 rounded-lg border border-sky-400/25 bg-sky-500/10 text-xs text-sky-200">Open Homepage</button>
          </div>
        )}
      </section>

      <section id="admin-ai-article-drafts" className={`rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.05] p-4 space-y-3 ${canShowSection('ai-drafts') ? '' : 'hidden'}`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-indigo-200 flex items-center gap-2"><Newspaper className="w-4 h-4" /> AI Article Drafts</h2>
            <p className="text-xs text-gray-400 mt-1">Generate one AI-assisted draft weekly. Admin review is always required before publication.</p>
          </div>
          <button
            onClick={() => void generateWeeklyDraft()}
            disabled={generatingDraft}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-indigo-400/30 bg-indigo-500/10 text-xs text-indigo-100 hover:bg-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generatingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generatingDraft ? 'Generating...' : 'Generate Weekly Draft'}
          </button>
        </div>

        {aiDraftsError && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{aiDraftsError}</div>
        )}

        {aiDraftsLoading ? (
          <div className="glass-card p-4 text-xs text-gray-400">Loading AI article drafts...</div>
        ) : aiDrafts.length === 0 ? (
          <div className="glass-card p-4 text-xs text-gray-500">No drafts yet. Generate the first weekly AI draft.</div>
        ) : (
          <div className="space-y-3">
            {aiDrafts.map((draft) => (
              <div key={draft.id} className="glass-card p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">{draft.title}</p>
                    <p className="text-[11px] text-gray-500">Week {draft.week_start} · {draft.slug}</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] ${draft.status === 'verified_airdropguard' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : draft.status === 'human_reviewed' ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200' : draft.status === 'published' ? 'border-violet-500/30 bg-violet-500/10 text-violet-200' : draft.status === 'rejected' ? 'border-rose-500/30 bg-rose-500/10 text-rose-200' : 'border-amber-500/30 bg-amber-500/10 text-amber-200'}`}>
                    {draft.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    value={draft.title}
                    onChange={(event) => setAIDrafts((prev) => prev.map((row) => row.id === draft.id ? { ...row, title: event.target.value } : row))}
                    className="w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                    placeholder="Draft title"
                  />
                  <input
                    value={draft.slug}
                    onChange={(event) => setAIDrafts((prev) => prev.map((row) => row.id === draft.id ? { ...row, slug: event.target.value } : row))}
                    className="w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                    placeholder="draft-slug"
                  />
                  <input
                    value={draft.meta_title}
                    onChange={(event) => setAIDrafts((prev) => prev.map((row) => row.id === draft.id ? { ...row, meta_title: event.target.value } : row))}
                    className="w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                    placeholder="Meta title"
                  />
                  <input
                    value={draft.meta_description}
                    onChange={(event) => setAIDrafts((prev) => prev.map((row) => row.id === draft.id ? { ...row, meta_description: event.target.value } : row))}
                    className="w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                    placeholder="Meta description"
                  />
                </div>
                <textarea
                  value={draft.summary}
                  onChange={(event) => setAIDrafts((prev) => prev.map((row) => row.id === draft.id ? { ...row, summary: event.target.value } : row))}
                  rows={2}
                  className="w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  placeholder="Summary"
                />
                <textarea
                  value={draft.body}
                  onChange={(event) => setAIDrafts((prev) => prev.map((row) => row.id === draft.id ? { ...row, body: event.target.value } : row))}
                  rows={6}
                  className="w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  placeholder="Draft body"
                />

                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => void updateDraft(draft.id, draft, 'Edit AI article draft')} className="px-3 py-1.5 rounded-lg border border-white/15 text-xs text-gray-200">Save Edits</button>
                  <button onClick={() => void updateDraft(draft.id, { status: 'human_reviewed' }, 'Mark AI draft as Human Reviewed')} className="px-3 py-1.5 rounded-lg border border-cyan-500/25 bg-cyan-500/10 text-xs text-cyan-200">Mark Human Reviewed</button>
                  <button onClick={() => void updateDraft(draft.id, { status: 'verified_airdropguard' }, 'Mark AI draft as Verified by AirdropGuard')} className="px-3 py-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-xs text-emerald-200">Mark Verified</button>
                  <button onClick={() => void updateDraft(draft.id, { status: 'published', published_at: new Date().toISOString() }, 'Publish AI article draft manually')} className="px-3 py-1.5 rounded-lg border border-violet-500/25 bg-violet-500/10 text-xs text-violet-200">Publish Manually</button>
                  <button onClick={() => void updateDraft(draft.id, { status: 'rejected' }, 'Reject AI article draft')} className="px-3 py-1.5 rounded-lg border border-amber-500/25 bg-amber-500/10 text-xs text-amber-200">Reject</button>
                  <button onClick={() => void deleteDraft(draft)} className="px-3 py-1.5 rounded-lg border border-rose-500/25 bg-rose-500/10 text-xs text-rose-200">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section id="admin-competitor-watch" className={`rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/[0.05] p-4 space-y-3 ${canShowSection('competitor-watch') ? '' : 'hidden'}`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-fuchsia-200 flex items-center gap-2"><Radar className="w-4 h-4" /> Competitor Watch</h2>
            <p className="text-xs text-gray-400 mt-1">Track external sources and queue new projects found for human review only.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-2.5 py-1 text-xs text-gray-300">
              <input
                type="checkbox"
                checked={previewScanModeEnabled}
                onChange={(event) => setPreviewScanModeEnabled(event.target.checked)}
              />
              Preview scan results mode
            </label>
            <button
              onClick={() => void testCompetitorWatchEdgeFunction()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/20 bg-white/[0.04] text-xs text-gray-200 hover:bg-white/[0.08]"
            >
              Test Edge Function
            </button>
            <button
              onClick={() => void checkCompetitorSourcesNow()}
              disabled={checkingCompetitors}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/10 text-xs text-fuchsia-100 hover:bg-fuchsia-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {checkingCompetitors ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radar className="w-4 h-4" />}
              {checkingCompetitors ? 'Checking...' : 'Check Sources Now'}
            </button>
          </div>
        </div>

        {competitorNotConfigured && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            <p className="font-semibold text-amber-200">Competitor Watch is not configured yet.</p>
            <p className="mt-1 text-amber-100/90">Apply migration 20260704174500_add_admin_growth_features.sql, refresh schema cache, then reload this section.</p>
          </div>
        )}

        {competitorError && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
            <p className="font-semibold text-rose-200">{competitorError}</p>
            {competitorErrorDetails && (
              <details className="mt-2 text-[11px]">
                <summary className="cursor-pointer text-rose-200/90">Debug details</summary>
                <pre className="mt-2 whitespace-pre-wrap break-words rounded-lg border border-rose-500/20 bg-black/20 p-2 text-rose-100/90">{competitorErrorDetails}</pre>
              </details>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
            <p className="text-[11px] text-gray-400">Sources monitored</p>
            <p className="text-sm font-semibold text-white">{competitorAnalytics.sourcesMonitored}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
            <p className="text-[11px] text-gray-400">Successful scans today</p>
            <p className="text-sm font-semibold text-white">{competitorAnalytics.successfulScansToday}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
            <p className="text-[11px] text-gray-400">New projects found today</p>
            <p className="text-sm font-semibold text-white">{competitorAnalytics.newProjectsFoundToday}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
            <p className="text-[11px] text-gray-400">Average scan success</p>
            <p className="text-sm font-semibold text-white">{Math.round(competitorAnalytics.averageScanSuccess * 100)}%</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
            <p className="text-[11px] text-gray-400">Projects imported</p>
            <p className="text-sm font-semibold text-white">{competitorAnalytics.projectsImported}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
            <p className="text-[11px] text-gray-400">Projects ignored</p>
            <p className="text-sm font-semibold text-white">{competitorAnalytics.projectsIgnored}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
            <p className="text-[11px] text-gray-400">Duplicate detections</p>
            <p className="text-sm font-semibold text-white">{competitorAnalytics.duplicateDetections}</p>
          </div>
        </div>

        <div className="glass-card p-3 space-y-2">
          <p className="text-[11px] uppercase tracking-[0.12em] text-fuchsia-200">Competitor Sources</p>
          <div className="grid gap-2 md:grid-cols-3">
            <input value={newSourceName} onChange={(event) => setNewSourceName(event.target.value)} className="bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white" placeholder="Source name" />
            <input value={newSourceUrl} onChange={(event) => setNewSourceUrl(event.target.value)} className="bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white md:col-span-2" placeholder="https://source-site.example" />
          </div>
          <button onClick={() => void addCompetitorSource()} className="px-3 py-1.5 rounded-lg border border-fuchsia-500/25 bg-fuchsia-500/10 text-xs text-fuchsia-200">Add Source</button>
          <div className="space-y-2">
            {sourceDashboardRows.map(({ source, scan }) => {
              const scanStatusMetaMap = COMPETITOR_SOURCE_SCAN_META as Record<string, { label: string; tone: string }>;
              const healthMetaMap = SOURCE_HEALTH_META as Record<string, { label: string; tone: string }>;
              const scanMeta = checkingCompetitors && source.is_active
                ? COMPETITOR_SOURCE_SCAN_META.working
                : (scanStatusMetaMap[String(scan.status ?? '')] || COMPETITOR_SOURCE_SCAN_META.none_found);
              const healthMeta = healthMetaMap[String(scan.health ?? '')] || SOURCE_HEALTH_META.amber;

              return (
                <div key={source.id} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-white font-medium">{source.source_name}</p>
                      <p className="text-gray-500">{source.source_url}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] ${scanMeta.tone}`}>{scanMeta.label}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] ${healthMeta.tone}`}>Health: {healthMeta.label}</span>
                      <button onClick={() => void removeCompetitorSource(source)} className="px-2 py-1 rounded border border-rose-500/25 text-rose-200">Remove</button>
                    </div>
                  </div>
                  <div className="mt-2 grid gap-1 text-[11px] text-gray-400 md:grid-cols-5">
                    <p>Last checked: {scan.lastCheckedAt ? new Date(scan.lastCheckedAt).toLocaleString() : 'Never scanned'}</p>
                    <p>Scan duration: {scan.durationMs ? `${(scan.durationMs / 1000).toFixed(1)}s` : 'n/a'}</p>
                    <p>Projects discovered: {scan.opportunitiesFound}</p>
                    <p>New projects: {scan.newProjects}</p>
                    <p>Duplicate projects: {scan.duplicateProjects}</p>
                  </div>
                  <div className="mt-1 grid gap-1 text-[11px] text-gray-500 md:grid-cols-4">
                    <p>Failed extractions: {scan.failedExtractions}</p>
                    <p>Last successful scan: {scan.lastSuccessfulScan ? new Date(scan.lastSuccessfulScan).toLocaleString() : 'None'}</p>
                    <p>Success rate: {Math.round(scan.successRate * 100)}%</p>
                    <p>Active: {source.is_active ? 'Yes' : 'No'}</p>
                  </div>
                  {competitorScanDebugResults[source.id] && (
                    <details className="mt-2 rounded-lg border border-white/10 bg-black/20 p-2 text-[11px] text-gray-300">
                      <summary className="cursor-pointer text-fuchsia-200">Debug scan output</summary>
                      <div className="mt-2 grid gap-1 md:grid-cols-2">
                        <p>Adapter used: {competitorScanDebugResults[source.id].adapterUsed || 'None'}</p>
                        <p>Page fetched: {competitorScanDebugResults[source.id].pageFetched}</p>
                        <p>Cards found: {competitorScanDebugResults[source.id].cardsFound}</p>
                        <p>Valid candidates extracted: {competitorScanDebugResults[source.id].validCandidatesExtracted}</p>
                        <p>Candidates rejected: {competitorScanDebugResults[source.id].candidatesRejected}</p>
                        <p>Outcome reason: {competitorScanDebugResults[source.id].outcomeReason || 'n/a'}</p>
                      </div>
                      <p className="mt-1 text-gray-400">Rejection reasons: {Object.entries(competitorScanDebugResults[source.id].rejectionReasons).map(([reason, count]) => `${reason} (${count})`).join(', ') || 'None'}</p>
                      {competitorScanDebugResults[source.id].rejectionSamples.length > 0 && (
                        <p className="mt-1 text-gray-500">Samples: {competitorScanDebugResults[source.id].rejectionSamples.join(' | ')}</p>
                      )}
                    </details>
                  )}
                  <p className="mt-1 text-[11px] text-gray-500">Scan note: {scan.note}</p>
                </div>
              );
            })}
            {!competitorLoading && competitorSources.length === 0 && (
              <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-3 text-xs text-gray-400">
                <p className="font-semibold text-gray-200">Competitor Watch is not configured yet</p>
                <p className="mt-1">Add your first source URL to begin discovering new projects.</p>
              </div>
            )}
          </div>
        </div>

        <div className="glass-card p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] uppercase tracking-[0.12em] text-fuchsia-200">Preview Scan Results</p>
            <span className="text-[11px] text-gray-400">Pending approvals: {prioritizedPendingDiscoveryCandidates.length}</span>
          </div>
          {prioritizedPendingDiscoveryCandidates.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-3 text-xs text-gray-400">
              Run Check Sources Now to preview extracted candidates before inserting.
            </div>
          ) : (
            <div className="space-y-2">
              {prioritizedPendingDiscoveryCandidates.slice(0, 80).map((pending) => {
                const priorityMetaMap = DISCOVERY_PRIORITY_META as Record<string, { label: string; tone: string }>;
                const comparisonMetaMap = DISCOVERY_COMPARISON_META as Record<string, { label: string; tone: string }>;
                const priorityMeta = priorityMetaMap[String(pending.discoveryPriority ?? '')] || DISCOVERY_PRIORITY_META.medium;
                const comparisonMeta = comparisonMetaMap[String(pending.comparisonType ?? '')] || DISCOVERY_COMPARISON_META.new_project;

                return (
                  <div key={pending.id} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-white">{pending.candidate.projectName}</p>
                        <p className="text-[11px] text-gray-500">Source: {pending.sourceName} ({pending.adapterId})</p>
                        <p className="text-[11px] text-gray-500">Listing: {pending.candidate.listingUrl}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] ${priorityMeta.tone}`}>{priorityMeta.label}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] ${comparisonMeta.tone}`}>{comparisonMeta.label}</span>
                      </div>
                    </div>
                    <div className="mt-1 grid gap-1 text-[11px] text-gray-400 md:grid-cols-4">
                      <p>Confidence score: {pending.confidenceScore}</p>
                      <p>Discovery score: {pending.discoveryScore}</p>
                      <p>Source mentions: {pending.sourceMentions}</p>
                      <p>Checked: {new Date(pending.checkedAt).toLocaleString()}</p>
                    </div>
                    <p className="mt-1 text-[11px] text-gray-500">Why new: {pending.whyNew}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => void approvePendingDiscoveryCandidate(pending)}
                        className="px-2.5 py-1 rounded border border-emerald-500/25 text-emerald-200 text-xs"
                      >
                        Approve Candidate
                      </button>
                      <button
                        onClick={() => rejectPendingDiscoveryCandidate(pending)}
                        className="px-2.5 py-1 rounded border border-white/20 text-gray-300 text-xs"
                      >
                        Reject Candidate
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="glass-card p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] uppercase tracking-[0.12em] text-fuchsia-200">New Projects Found</p>
            {genericCompetitorOpportunities.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] text-gray-500">Generic items: {genericCompetitorOpportunities.length}</span>
                <button
                  onClick={() => void bulkIgnoreGenericCompetitorOpportunities()}
                  className="px-2.5 py-1 rounded border border-amber-500/25 text-amber-200 text-[11px]"
                >
                  Bulk Ignore Generic
                </button>
                <button
                  onClick={() => void bulkDeleteGenericCompetitorOpportunities()}
                  className="px-2.5 py-1 rounded border border-rose-500/25 text-rose-200 text-[11px]"
                >
                  Bulk Delete Generic
                </button>
              </div>
            )}
          </div>
          {competitorLoading ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-3 text-xs text-gray-400">
              Loading opportunities and source status...
            </div>
          ) : prioritizedCompetitorOpportunities.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-3 text-xs text-gray-400">
              <p className="font-semibold text-gray-200">No valid project opportunities found. Try adding a direct airdrop listing page or a more specific source.</p>
              <p className="mt-1">Run Check Sources Now after updating sources to re-scan for project-specific pages.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {prioritizedCompetitorOpportunities.slice(0, 50).map(({ opportunity, details, dynamicScore, dynamicPriority, dynamicMentions }) => {
                const opportunityStatusMetaMap = COMPETITOR_STATUS_META as Record<string, { label: string; tone: string }>;
                const comparisonMetaMap = DISCOVERY_COMPARISON_META as Record<string, { label: string; tone: string }>;
                const priorityMetaMap = DISCOVERY_PRIORITY_META as Record<string, { label: string; tone: string }>;
                const statusMeta = opportunityStatusMetaMap[String(opportunity.status ?? '')] || COMPETITOR_STATUS_META.new;
                const comparisonMeta = comparisonMetaMap[String(details.comparisonType ?? '')] || DISCOVERY_COMPARISON_META.new_project;
                const priorityMeta = priorityMetaMap[String(dynamicPriority ?? '')] || DISCOVERY_PRIORITY_META.medium;
                const canQueue = opportunity.status !== 'queued' && opportunity.status !== 'drafted';
                const canIgnore = opportunity.status !== 'ignored' && opportunity.status !== 'drafted';
                const canMarkDuplicate = opportunity.status !== 'duplicate' && opportunity.status !== 'drafted';
                const canCreateDraft = opportunity.status !== 'drafted' && dynamicPriority === 'high';

                return (
                  <div key={opportunity.id} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-white">{opportunity.project_name}</p>
                        <p className="text-[11px] text-gray-500">Source: {details.sourceLabel}</p>
                        <p className="text-[11px] text-gray-500">Listing URL: {details.listingUrl}</p>
                        {details.projectUrl && <p className="text-[11px] text-gray-500">Project URL: {details.projectUrl}</p>}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] ${priorityMeta.tone}`}>{priorityMeta.label}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] ${comparisonMeta.tone}`}>{comparisonMeta.label}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] ${statusMeta.tone}`}>{statusMeta.label}</span>
                      </div>
                    </div>
                    <div className="mt-1 grid gap-1 text-[11px] text-gray-400 md:grid-cols-4">
                      <p>Confidence: {getCompetitorConfidenceLabel(opportunity)}</p>
                      <p>Confidence score: {details.confidenceScore}</p>
                      <p>Discovery score: {dynamicScore}</p>
                      <p>Sources mentioning: {dynamicMentions}</p>
                    </div>
                    <div className="mt-1 grid gap-1 text-[11px] text-gray-500 md:grid-cols-3">
                      <p>Comparison: {details.compare}</p>
                      <p>Why new: {details.whyNew}</p>
                      <p>Discovered: {new Date(opportunity.discovered_at).toLocaleString()}</p>
                    </div>
                    <div className="mt-1 grid gap-1 text-[11px] text-gray-500 md:grid-cols-3">
                      <p>Reason detected: {details.reasonDetected || 'Not provided'}</p>
                      <p>Duplicate status: {details.duplicateStatus || 'new'}</p>
                      <p>Detected keywords: {Array.isArray(details.detectedKeywords) && details.detectedKeywords.length ? details.detectedKeywords.join(', ') : 'None'}</p>
                    </div>
                    {details.listingDate && <p className="mt-1 text-[11px] text-gray-400">Listing date: {details.listingDate}</p>}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                      <span>Docs: {details.officialDocsUrl ? 'Yes' : 'No'}</span>
                      <span>GitHub: {details.githubUrl ? 'Yes' : 'No'}</span>
                      <span>X: {details.officialXUrl ? 'Yes' : 'No'}</span>
                      <span>Discord: {details.officialDiscordUrl ? 'Yes' : 'No'}</span>
                      <span>Blockchain: {opportunity.blockchain || 'Unknown'}</span>
                    </div>
                    {details.shortDescription && <p className="mt-1 text-xs text-gray-400">{details.shortDescription}</p>}
                    <p className="mt-1 text-xs text-gray-400">Why matched: {opportunity.why_matched}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {canQueue && (
                        <button
                          onClick={() => void updateOpportunityStatus(opportunity, 'queued', 'Add competitor opportunity to review queue', 'Added to review queue')}
                          className="px-2.5 py-1 rounded border border-cyan-500/25 text-cyan-200 text-xs"
                        >
                          Add to Review Queue
                        </button>
                      )}
                      {canIgnore && (
                        <button
                          onClick={() => void updateOpportunityStatus(opportunity, 'ignored', 'Ignore competitor opportunity', 'Opportunity ignored')}
                          className="px-2.5 py-1 rounded border border-white/20 text-gray-300 text-xs"
                        >
                          Ignore
                        </button>
                      )}
                      {canMarkDuplicate && (
                        <button
                          onClick={() => void updateOpportunityStatus(opportunity, 'duplicate', 'Mark competitor opportunity as duplicate', 'Marked as duplicate')}
                          className="px-2.5 py-1 rounded border border-amber-500/25 text-amber-200 text-xs"
                        >
                          Mark Duplicate
                        </button>
                      )}
                      {canCreateDraft && (
                        <button onClick={() => void createDraftFromOpportunity(opportunity)} className="px-2.5 py-1 rounded border border-emerald-500/25 text-emerald-200 text-xs">Create Draft Airdrop</button>
                      )}
                      {!canCreateDraft && dynamicPriority !== 'high' && (
                        <span className="text-[11px] text-gray-500">Draft import enabled automatically for high-priority discoveries.</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="glass-card p-3 space-y-2">
          <p className="text-[11px] uppercase tracking-[0.12em] text-fuchsia-200">Discovery History</p>
          {discoveryHistoryRows.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-3 text-xs text-gray-400">
              No discovery history yet.
            </div>
          ) : (
            <div className="space-y-2">
              {discoveryHistoryRows.slice(0, 50).map((row) => {
                const historyStatusMetaMap = COMPETITOR_STATUS_META as Record<string, { label: string; tone: string }>;
                const statusMeta = historyStatusMetaMap[String(row.status ?? '')] || COMPETITOR_STATUS_META.new;
                return (
                  <div key={`${row.projectName}-${row.firstDiscovered}`} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-white">{row.projectName}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] ${statusMeta.tone}`}>{statusMeta.label}</span>
                    </div>
                    <div className="mt-1 grid gap-1 text-[11px] text-gray-400 md:grid-cols-5">
                      <p>First discovered: {new Date(row.firstDiscovered).toLocaleString()}</p>
                      <p>Discovered by: {row.discoveredBy}</p>
                      <p>Sources mentioning: {row.sourceIds.size}</p>
                      <p>Last checked: {new Date(row.lastChecked).toLocaleString()}</p>
                      <p>Current status: {statusMeta.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section id="admin-ai-control" className={`rounded-2xl border border-violet-500/20 bg-violet-500/[0.05] p-4 space-y-3 ${canShowSection('system-tools') ? '' : 'hidden'}`}>
        <h2 className="text-sm font-bold text-violet-200">AI CONTROL</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <button onClick={refreshAllAnalysis} className="px-3 py-2 rounded-xl border border-violet-400/25 bg-violet-500/10 text-xs text-violet-200">Refresh all projects</button>
          <button onClick={() => jumpToSection('admin-ai-queue')} className="px-3 py-2 rounded-xl border border-violet-400/25 bg-violet-500/10 text-xs text-violet-200">Failed AI queue</button>
          <button onClick={() => openFirstAirdropMatch((a) => !(a.last_analyzed_at && String(a.last_analyzed_at).trim()), 'No failed AI analysis found')} className="px-3 py-2 rounded-xl border border-violet-400/25 bg-violet-500/10 text-xs text-violet-200">Reanalyse project</button>
          <button onClick={() => window.open('https://status.openai.com', '_blank', 'noopener,noreferrer')} className="px-3 py-2 rounded-xl border border-violet-400/25 bg-violet-500/10 text-xs text-violet-200">OpenAI status</button>
        </div>
        <div className="text-xs text-gray-300">AI health: {stats?.analyzedAirdrops ?? 0}/{stats?.totalAirdrops ?? 0} projects analysed.</div>
      </section>

      <section id="admin-ai-queue" className={`glass-card p-4 ${canShowSection('system-tools') ? '' : 'hidden'}`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs uppercase tracking-wider text-violet-300 font-semibold">Failed AI queue</h3>
          <span className="text-xs text-gray-400">{failedAiQueue.length} pending</span>
        </div>
        <div className="space-y-2">
          {failedAiQueue.slice(0, 8).map((airdrop) => (
            <div key={airdrop.id} className="flex items-center justify-between border border-white/10 rounded-xl px-3 py-2 text-xs">
              <span className="text-white">{airdrop.name}</span>
              <button onClick={() => runAnalysis(airdrop, true)} className="px-2.5 py-1 rounded-lg border border-violet-500/25 bg-violet-500/10 text-violet-300">Refresh AI</button>
            </div>
          ))}
          {failedAiQueue.length === 0 && <p className="text-xs text-gray-500">No failed AI analyses.</p>}
        </div>
      </section>

      <section id="admin-site-health" className={`rounded-2xl border border-rose-500/20 bg-rose-500/[0.04] p-4 space-y-3 ${canShowSection('system-tools') ? '' : 'hidden'}`}>
        <h2 className="text-sm font-bold text-rose-200">SITE HEALTH</h2>
        <div className="space-y-2 text-xs">
          {[
            { label: 'Broken links (missing website URL)', count: missingWebsiteCount, action: () => openFirstAirdropMatch((a) => !String(a.website_url ?? '').trim(), 'No website issues detected') },
            { label: 'Missing logos', count: missingLogoCount, action: () => openFirstAirdropMatch((a) => !String(a.logo_url ?? '').trim(), 'No logo issues detected') },
            { label: 'Missing GitHub', count: missingGithubCount, action: () => openFirstAirdropMatch((a) => !String((a as unknown as Record<string, unknown>).github_url ?? '').trim(), 'No GitHub issues detected') },
            { label: 'Missing Docs', count: missingDocsCount, action: () => openFirstAirdropMatch((a) => !String((a as unknown as Record<string, unknown>).docs_url ?? '').trim(), 'No docs issues detected') },
            { label: 'Missing Funding', count: missingFundingCount, action: () => openFirstAirdropMatch((a) => !String((a as unknown as Record<string, unknown>).funding_info ?? '').trim() && !String((a as unknown as Record<string, unknown>).investors ?? '').trim(), 'No funding issues detected') },
            { label: 'Sitemap health', count: 0, action: () => window.open('/sitemap.xml', '_blank', 'noopener,noreferrer') },
            { label: 'SEO warnings (missing summary)', count: seoWarningCount, action: () => openFirstAirdropMatch((a) => !String(a.ai_summary ?? '').trim(), 'No SEO warnings detected') },
            { label: 'Expiring projects', count: expiringListings.length, action: () => jumpToSection('admin-airdrops') },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between border border-white/10 rounded-xl px-3 py-2">
              <div>
                <p className="text-gray-100">{row.label}</p>
                <p className="text-gray-500">{row.count} items</p>
              </div>
              <button onClick={row.action} className="px-2.5 py-1 rounded-lg border border-rose-500/25 bg-rose-500/10 text-rose-200">Fix</button>
            </div>
          ))}
        </div>
      </section>

      <section id="admin-users" className={`rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3 ${canShowSection('users') ? '' : 'hidden'}`}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-white">USERS</h2>
          <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search users" className="w-52 bg-dark-900/60 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
          <div className="rounded-xl border border-white/10 px-3 py-2"><p className="text-gray-500">New users</p><p className="text-white font-semibold">{newUsersCount}</p></div>
          <div className="rounded-xl border border-white/10 px-3 py-2"><p className="text-gray-500">Active users</p><p className="text-white font-semibold">{activeUsersCount}</p></div>
          <div className="rounded-xl border border-white/10 px-3 py-2"><p className="text-gray-500">API users</p><p className="text-white font-semibold">{apiUsersCount}</p></div>
          <div className="rounded-xl border border-white/10 px-3 py-2"><p className="text-gray-500">Premium users</p><p className="text-white font-semibold">{premiumUsersCount}</p></div>
          <div className="rounded-xl border border-white/10 px-3 py-2"><p className="text-gray-500">Latest signups</p><p className="text-white font-semibold">{opsUsers.length}</p></div>
        </div>
        <div className="space-y-2 md:hidden">
          {(usersLoading ? [] : filteredUsers.slice(0, 20)).map((u) => (
            <article key={`user-mobile-${u.id}`} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs">
              <p className="font-medium text-white break-all">{u.email}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-gray-400">
                <span>Plan: <span className="capitalize text-gray-300">{u.plan}</span></span>
                <span>Created: {new Date(u.createdAt).toLocaleDateString()}</span>
                <span className="col-span-2">Last seen: {new Date(u.lastSeenAt).toLocaleDateString()}</span>
              </div>
            </article>
          ))}
          {usersLoading && <p className="px-3 py-2 text-xs text-gray-500">Loading users...</p>}
        </div>

        <div className="glass-card overflow-x-auto hidden md:block">
          <table className="w-full text-xs min-w-[680px]">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-3 py-2 text-gray-400">Email</th>
                <th className="text-left px-3 py-2 text-gray-400">Plan</th>
                <th className="text-left px-3 py-2 text-gray-400">Created</th>
                <th className="text-left px-3 py-2 text-gray-400">Last seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(usersLoading ? [] : filteredUsers.slice(0, 20)).map((u) => (
                <tr key={u.id}>
                  <td className="px-3 py-2 text-gray-200">{u.email}</td>
                  <td className="px-3 py-2 text-gray-400 capitalize">{u.plan}</td>
                  <td className="px-3 py-2 text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-3 py-2 text-gray-500">{new Date(u.lastSeenAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {usersLoading && <p className="px-3 py-2 text-xs text-gray-500">Loading users...</p>}
        </div>
      </section>

      <section id="admin-revenue" className={`rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-4 space-y-3 ${canShowSection('api') ? '' : 'hidden'}`}>
        <h2 className="text-sm font-bold text-emerald-200">REVENUE</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
          <div className="rounded-xl border border-emerald-500/20 px-3 py-2"><p className="text-emerald-100/80">Banner enquiries</p><p className="text-white font-semibold">{pendingBannerEnquiries}</p></div>
          <div className="rounded-xl border border-emerald-500/20 px-3 py-2"><p className="text-emerald-100/80">Featured enquiries</p><p className="text-white font-semibold">{featuredListingEnquiries}</p></div>
          <div className="rounded-xl border border-emerald-500/20 px-3 py-2"><p className="text-emerald-100/80">API subscriptions</p><p className="text-white font-semibold">{stats ? stats.proSubs + stats.businessSubs : 0}</p></div>
          <div className="rounded-xl border border-emerald-500/20 px-3 py-2"><p className="text-emerald-100/80">Revenue summary</p><p className="text-white font-semibold">${estimatedRevenuePipeline}</p></div>
          <div className="rounded-xl border border-emerald-500/20 px-3 py-2"><p className="text-emerald-100/80">Stripe status</p><p className="text-white font-semibold">Ready when re-enabled</p></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => jumpToSection('admin-advertising')} className="px-3 py-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-xs text-emerald-200">Manage Banner</button>
          <button onClick={() => jumpToSection('admin-submissions')} className="px-3 py-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-xs text-emerald-200">Review Submission</button>
          <button onClick={() => window.open('/pricing', '_blank', 'noopener,noreferrer')} className="px-3 py-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-xs text-emerald-200">Open API Access</button>
        </div>
      </section>

      <section id="admin-audit-logs" className={`rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.04] p-4 space-y-3 ${canShowSection('audit-logs') ? '' : 'hidden'}`}>
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-cyan-200">ADMIN AUDIT LOG</h2>
            <p className="text-xs text-gray-400 mt-1">Read-only human verification history for publish, approve, reject, feature and banner decisions.</p>
          </div>
          <button
            onClick={() => fetchAuditLogs()}
            className="px-3 py-1.5 rounded-lg border border-cyan-500/25 bg-cyan-500/10 text-xs text-cyan-200"
          >
            Refresh Logs
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <input
            value={auditSearch}
            onChange={(e) => setAuditSearch(e.target.value)}
            placeholder="Search logs"
            className="w-full rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white"
          />

          <select
            value={auditActionFilter}
            onChange={(e) => setAuditActionFilter(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white"
          >
            <option value="all">All actions</option>
            {auditActionOptions.map((action) => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>

          <select
            value={auditTargetFilter}
            onChange={(e) => setAuditTargetFilter(e.target.value as 'all' | AuditTargetType)}
            className="w-full rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white"
          >
            <option value="all">All target types</option>
            <option value="airdrop">Airdrop</option>
            <option value="article">Article</option>
            <option value="banner">Banner</option>
            <option value="submission">Submission</option>
            <option value="scam_report">Scam report</option>
            <option value="homepage">Homepage</option>
            <option value="unknown">Unknown</option>
          </select>

          <select
            value={auditAdminFilter}
            onChange={(e) => setAuditAdminFilter(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white"
          >
            <option value="all">All administrators</option>
            {auditAdminOptions.map((admin) => (
              <option key={admin} value={admin}>{admin}</option>
            ))}
          </select>
        </div>

        {auditLoading && (
          <div className="glass-card p-6 text-center text-sm text-gray-400">
            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-cyan-300" />
            Loading audit logs...
          </div>
        )}

        {!auditLoading && auditError && (
          <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            <p>{auditError}</p>
            <p className="mt-1 text-xs text-rose-100/80">Use Refresh Logs after applying schema or permission fixes.</p>
          </div>
        )}

        {!auditLoading && !auditError && filteredAuditLogs.length === 0 && (
          <div className="glass-card p-6 text-center text-sm text-gray-500">
            No audit logs found yet.
          </div>
        )}

        {!auditLoading && !auditError && filteredAuditLogs.length > 0 && (
          <>
            <div className="space-y-2 md:hidden">
              {filteredAuditLogs.map((log) => {
                const target = inferAuditTarget(log);
                return (
                  <article key={log.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-white">{log.action_taken}</p>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-gray-300">{target.targetType}</span>
                    </div>
                    <p className="mt-1 text-gray-400">{target.targetNameOrId}</p>
                    <p className="mt-1 text-gray-500">Admin: {log.admin_identifier}</p>
                    <p className="mt-1 text-gray-500">Date/time: {formatDateTime(log.action_at)}</p>
                    <p className="mt-1 text-gray-400">Decision: {log.final_decision}</p>
                    {log.ai_recommendation && <p className="mt-1 text-gray-500">AI: {truncateText(log.ai_recommendation, 120)}</p>}
                    {log.notes && <p className="mt-1 text-gray-500">Notes: {truncateText(log.notes, 120)}</p>}
                    <p className="mt-1 text-gray-600">Created at: {formatDateTime(log.created_at || log.action_at)}</p>
                  </article>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1100px] text-xs">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-3 py-2 text-left text-gray-400">Date/time</th>
                    <th className="px-3 py-2 text-left text-gray-400">Administrator</th>
                    <th className="px-3 py-2 text-left text-gray-400">Action taken</th>
                    <th className="px-3 py-2 text-left text-gray-400">Target type</th>
                    <th className="px-3 py-2 text-left text-gray-400">Target</th>
                    <th className="px-3 py-2 text-left text-gray-400">AI recommendation</th>
                    <th className="px-3 py-2 text-left text-gray-400">Final human decision</th>
                    <th className="px-3 py-2 text-left text-gray-400">Notes</th>
                    <th className="px-3 py-2 text-left text-gray-400">Created at</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredAuditLogs.map((log) => {
                    const target = inferAuditTarget(log);
                    return (
                      <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-3 py-2 text-gray-300">{formatDateTime(log.action_at)}</td>
                        <td className="px-3 py-2 text-gray-300">{log.admin_identifier}</td>
                        <td className="px-3 py-2 text-white">{log.action_taken}</td>
                        <td className="px-3 py-2 text-gray-300 capitalize">{target.targetType.replace('_', ' ')}</td>
                        <td className="px-3 py-2 text-gray-300">{target.targetNameOrId}</td>
                        <td className="px-3 py-2 text-gray-400">{log.ai_recommendation ? truncateText(log.ai_recommendation, 130) : '—'}</td>
                        <td className="px-3 py-2 text-emerald-300">{log.final_decision}</td>
                        <td className="px-3 py-2 text-gray-400">{log.notes ? truncateText(log.notes, 130) : '—'}</td>
                        <td className="px-3 py-2 text-gray-500">{formatDateTime(log.created_at || log.action_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* ── Airdrop table ──────────────────────────────────────────────────── */}
      <section id="admin-advertising" className={canShowSection('banners') ? '' : 'hidden'}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Monitor className="w-3.5 h-3.5" />
              Banner Advertisement Management
            </h2>
            <p className="text-[11px] text-gray-500 mt-1">Admin preparation flow only using frontend state. No payment handling or backend persistence in this section.</p>
          </div>
          <button
            onClick={openAddBanner}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neon-blue/10 border border-neon-blue/25 text-neon-blue hover:bg-neon-blue/20 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Create Banner
          </button>
        </div>

        <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.04] p-3 mb-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1 text-cyan-200">
            <CalendarClock className="w-3.5 h-3.5" />
            Enquiry to live workflow
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-amber-200">
            <BadgeCheck className="w-3.5 h-3.5" />
            Exclusive placement badge supported
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-1 text-gray-300">
            Future paid status placeholder included
          </span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 mb-3">
          <p className="text-[11px] font-semibold text-gray-200 mb-2">Banner workflow</p>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
            {['1. Enquiry received', '2. Artwork received', '3. Ready to publish', '4. Live', '5. Expired'].map((step) => (
              <div key={step} className="rounded-xl border border-white/10 bg-dark-900/40 px-2.5 py-2 text-gray-300">
                {step}
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-gray-500">
            <span className="rounded-full border border-white/10 px-2 py-0.5">Upload artwork</span>
            <span className="rounded-full border border-white/10 px-2 py-0.5">Check link</span>
            <span className="rounded-full border border-white/10 px-2 py-0.5">Set dates</span>
            <span className="rounded-full border border-white/10 px-2 py-0.5">Publish banner</span>
            <span className="rounded-full border border-white/10 px-2 py-0.5">Expire banner</span>
          </div>
        </div>

        <div className="space-y-3 md:hidden">
          {banners.map((banner) => {
            const effectiveStatus = deriveBannerStatus(banner.status, banner.startDate, banner.endDate);
            const displayStatus = getBannerDisplayStatus(banner.status, banner.startDate, banner.endDate);
            return (
              <article key={`banner-mobile-${banner.id}`} className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{banner.advertiserName}</p>
                    <p className="text-[11px] text-gray-500 mt-1 break-all">{banner.destinationUrl}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                      <span className="rounded-full border border-white/15 bg-white/[0.04] px-2 py-0.5 text-gray-300">{banner.placement}</span>
                      <span className={`rounded-full border px-2 py-0.5 ${getBannerDisplayClass(displayStatus)}`}>{displayStatus}</span>
                      <span className={`rounded-full border px-2 py-0.5 ${getPaymentStateClass(banner.paymentState)}`}>{banner.paymentState}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-gray-400">
                  <div>Start: {banner.startDate || '—'}</div>
                  <div>End: {banner.endDate || '—'}</div>
                  <div>Status: {effectiveStatus}</div>
                  <div>Next: {getBannerNextAction(effectiveStatus)}</div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button onClick={() => setPreviewBannerId(previewBannerId === banner.id ? null : banner.id)} className="min-h-[42px] rounded-xl border border-white/20 bg-white/[0.04] text-xs text-gray-200">Preview</button>
                  <button onClick={() => openEditBanner(banner)} className="min-h-[42px] rounded-xl border border-sky-500/25 bg-sky-500/10 text-xs text-sky-200">Edit</button>
                  <button onClick={() => deleteBanner(banner.id)} className="min-h-[42px] rounded-xl border border-rose-500/25 bg-rose-500/10 text-xs text-rose-200">Delete</button>
                </div>
              </article>
            );
          })}
        </div>

        <div className="glass-card overflow-x-auto hidden md:block">
          <table className="w-full text-sm min-w-[1080px]">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Banner Preview</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Advertiser</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Placement</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Start Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">End Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Next Action</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Future Paid</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Toggle</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {banners.map((banner) => {
                const effectiveStatus = deriveBannerStatus(banner.status, banner.startDate, banner.endDate);
                const displayStatus = getBannerDisplayStatus(banner.status, banner.startDate, banner.endDate);
                return (
                  <tr key={banner.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="w-28 h-14 rounded-lg border border-white/10 bg-white/[0.03] overflow-hidden flex items-center justify-center">
                        {banner.bannerImageUrl ? (
                          <img src={banner.bannerImageUrl} alt={banner.altText || 'Banner'} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] text-gray-500">No image</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-white">{banner.advertiserName}</div>
                      <a href={banner.destinationUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-gray-500 hover:text-neon-blue inline-flex items-center gap-1 mt-0.5">
                        {banner.destinationUrl.replace(/^https?:\/\//, '')}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] px-2.5 py-1 rounded-full border border-white/15 bg-white/[0.04] text-gray-300">{banner.placement}</span>
                        {banner.exclusivePlacement && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-500/25 bg-amber-500/10 text-amber-300">Exclusive</span>
                        )}
                        {banner.archived && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/20 bg-white/[0.06] text-gray-300">Archived</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold border rounded-full px-2.5 py-1 ${getBannerDisplayClass(displayStatus)}`}>
                        {displayStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{banner.startDate || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{banner.endDate || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] px-2.5 py-1 rounded-full border border-white/15 bg-white/[0.04] text-gray-300">
                        {getBannerNextAction(effectiveStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold border rounded-full px-2.5 py-1 ${getPaymentStateClass(banner.paymentState)}`}>
                        {banner.paymentState}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleBannerEnabled(banner.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-semibold transition-colors ${banner.enabled ? 'text-emerald-300 border-emerald-500/25 bg-emerald-500/10' : 'text-gray-400 border-white/15 bg-white/[0.04]'}`}
                        title={banner.enabled ? 'Disable banner' : 'Enable banner'}
                      >
                        {banner.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setPreviewBannerId(previewBannerId === banner.id ? null : banner.id)}
                          title="Preview banner"
                          className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditBanner(banner)}
                          title="Edit banner"
                          className="p-1.5 rounded-lg hover:bg-sky-500/10 text-gray-500 hover:text-sky-400 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteBanner(banner.id)}
                          title="Delete banner"
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-gray-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {!banner.archived && (
                          <button
                            onClick={() => archiveBanner(banner.id)}
                            title="Archive banner"
                            className="px-2 py-1 rounded-lg border border-white/15 text-[10px] text-gray-300 hover:bg-white/10"
                          >
                            Archive
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {previewBannerId && (() => {
          const banner = banners.find((row) => row.id === previewBannerId);
          if (!banner) return null;
          return (
            <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-cyan-300 font-semibold">Preview Banner</p>
                  <p className="text-sm text-white font-semibold mt-1">{banner.advertiserName} · {banner.placement}</p>
                  <span className="inline-flex mt-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                    Sponsored
                  </span>
                </div>
                <button onClick={() => setPreviewBannerId(null)} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <a
                href={banner.destinationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl border border-cyan-500/20 bg-[linear-gradient(145deg,rgba(8,145,178,0.14),rgba(8,20,42,0.94))] p-3 hover:bg-[linear-gradient(145deg,rgba(8,145,178,0.2),rgba(8,20,42,0.98))] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-36 h-16 rounded-lg overflow-hidden border border-white/10 bg-white/[0.03] flex items-center justify-center shrink-0">
                    {banner.bannerImageUrl ? (
                      <img src={banner.bannerImageUrl} alt={banner.altText || 'Banner preview'} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-gray-500">Image placeholder</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{banner.altText || banner.advertiserName}</p>
                    <p className="text-xs text-gray-300 mt-1 truncate">{banner.destinationUrl}</p>
                    <div className="mt-2 flex items-center gap-2 text-[10px]">
                      <span className="rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-1 text-gray-300">{banner.placement}</span>
                      <span className={`rounded-full border px-2.5 py-1 ${getBannerStatusClass(deriveBannerStatus(banner.status, banner.startDate, banner.endDate))}`}>{deriveBannerStatus(banner.status, banner.startDate, banner.endDate)}</span>
                    </div>
                  </div>
                </div>
              </a>
            </div>
          );
        })()}
      </section>

      <section id="admin-airdrops" className={canShowSection('airdrops') ? '' : 'hidden'}>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Airdrops</h2>
        <div className="space-y-3 md:hidden mb-3">
          {airdrops.map((a) => {
            const isOpen = expandedAirdrop === a.id;
            const riskCls = a.risk_level === 'Low' ? 'text-emerald-400' : a.risk_level === 'High' ? 'text-rose-400' : 'text-amber-400';
            const scoreCls = a.trust_score == null ? 'text-gray-500' : a.trust_score >= 75 ? 'text-emerald-400' : a.trust_score >= 50 ? 'text-amber-400' : 'text-rose-400';
            return (
              <article key={a.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{a.name}</p>
                    <p className="text-[11px] text-gray-500 mt-1">State: {a.listing_state} · {a.published ? 'Published' : 'Draft'}</p>
                    <div className="mt-1 flex items-center gap-2 text-[11px]">
                      <span className={scoreCls}>Trust {a.trust_score ?? '—'}</span>
                      <span className={riskCls}>Risk {a.risk_level}</span>
                    </div>
                  </div>
                  <button onClick={() => setExpandedAirdrop(isOpen ? null : a.id)} className="min-h-[40px] px-3 rounded-lg border border-white/10 text-xs text-gray-300">
                    {isOpen ? 'Hide' : 'Open'}
                  </button>
                </div>

                {isOpen && (
                  <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
                    <p className="text-xs text-gray-400 leading-relaxed">{a.ai_summary || 'No AI summary yet. Run AI analysis to populate.'}</p>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="rounded-lg border border-white/10 bg-white/[0.02] px-2 py-1.5 text-gray-300">AI analysis: {a.last_analyzed_at ? 'Available' : 'Not run'}</div>
                      <div className="rounded-lg border border-white/10 bg-white/[0.02] px-2 py-1.5 text-gray-300">Reviewer notes: {a.blacklist_reason ? 'Available' : 'None'}</div>
                    </div>
                    {a.blacklist_reason && <p className="text-[11px] text-amber-300">Notes: {a.blacklist_reason}</p>}

                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => void openEdit(a)} className="min-h-[42px] rounded-xl border border-sky-500/25 bg-sky-500/10 text-xs text-sky-200">Edit</button>
                      <button onClick={() => runAnalysis(a, true)} className="min-h-[42px] rounded-xl border border-neon-purple/25 bg-neon-purple/10 text-xs text-neon-purple">Run AI</button>
                      <button onClick={() => void moderateAirdrop(a, 'approve')} className="min-h-[42px] rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-xs text-emerald-200">Approve</button>
                      <button onClick={() => void moderateAirdrop(a, 'reject')} className="min-h-[42px] rounded-xl border border-amber-500/25 bg-amber-500/10 text-xs text-amber-200">Reject</button>
                      <button onClick={() => void moderateAirdrop(a, 'blacklist')} className="min-h-[42px] rounded-xl border border-rose-500/25 bg-rose-500/10 text-xs text-rose-200">Blacklist</button>
                      <button onClick={() => setDeletingAirdrop(a)} className="min-h-[42px] rounded-xl border border-rose-500/25 bg-rose-500/10 text-xs text-rose-200">Delete</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={async () => {
                          const patch = { published: !a.published, human_verified: !a.published ? true : a.human_verified };
                          const { error } = await supabase.from('airdrops').update(patch).eq('id', a.id);
                          if (error) {
                            showToast(`Unable to ${a.published ? 'unpublish' : 'publish'}: ${describeError(error)}`, 'error');
                            return;
                          }
                          setAirdrops(prev => prev.map(x => x.id === a.id ? { ...x, ...patch } : x));
                          fetchStats();
                          showToast(a.published ? 'Airdrop unpublished' : 'Airdrop published');
                        }}
                        className="min-h-[42px] rounded-xl border border-white/20 bg-white/[0.04] text-xs text-gray-200"
                      >
                        {a.published ? 'Unpublish' : 'Publish'}
                      </button>
                      <button onClick={() => window.open(`/airdrop/${a.slug}`, '_blank', 'noopener,noreferrer')} className="min-h-[42px] rounded-xl border border-white/20 bg-white/[0.04] text-xs text-gray-200">Open Listing</button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        <div className="glass-card overflow-x-auto hidden md:block">
          <table className="w-full text-sm min-w-[680px]">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Risk</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Score</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Expiry</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {airdrops.map(a => {
                const expiry = a.expiry_date
                  ? new Date(a.expiry_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
                  : null;
                const riskCls = a.risk_level === 'Low' ? 'text-emerald-400' : a.risk_level === 'High' ? 'text-rose-400' : 'text-amber-400';
                const scoreCls = a.trust_score == null ? 'text-gray-600' : a.trust_score >= 75 ? 'text-emerald-400' : a.trust_score >= 50 ? 'text-amber-400' : 'text-rose-400';
                return (
                  <tr key={a.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-dark-700 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                          {a.logo_url
                            ? <img src={a.logo_url} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            : <span className="text-xs font-bold gradient-text">{a.name[0]}</span>}
                        </div>
                        <div>
                          <div className="font-medium text-white text-sm leading-tight">{a.name}</div>
                          {a.ticker && <div className="text-[10px] text-gray-500 font-mono">{a.ticker}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs text-gray-400">
                        {(a.category ?? []).slice(0, 2).join(', ') || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`text-xs font-medium ${
                        a.status === 'Active' ? 'text-emerald-400' :
                        a.status === 'Ending Soon' ? 'text-amber-400' : 'text-gray-500'
                      }`}>{a.status}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`text-xs font-medium ${riskCls}`}>{a.risk_level}</span>
                    </td>
                    <td className="px-4 py-3 text-center hidden lg:table-cell">
                      <span className={`text-xs font-bold tabular-nums ${scoreCls}`}>
                        {a.trust_score != null ? a.trust_score : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-gray-400">{expiry ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {/* Publish toggle */}
                        <button
                          onClick={async () => {
                            const nextPublished = !a.published;
                            console.info('[Admin][AirdropPublish] Toggle requested', {
                              airdropId: a.id,
                              airdropName: a.name,
                              currentPublished: a.published,
                              nextPublished,
                            });

                            const reviewNotes = nextPublished
                              ? await promptHumanVerificationNotes(`Publish airdrop ${a.name}`)
                              : '';
                            if (nextPublished && !reviewNotes) return;

                            const patch = {
                              published: nextPublished,
                              human_verified: nextPublished ? true : a.human_verified,
                            };

                            const { error: updateError } = await supabase.from('airdrops').update(patch).eq('id', a.id);
                            if (updateError) {
                              const exactUpdateError = formatSupabaseError(updateError) || updateError.message;
                              console.error('[Admin][AirdropPublish] Airdrop update failed', {
                                airdropId: a.id,
                                patch,
                                exactUpdateError,
                              });
                              showToast(`Unable to ${nextPublished ? 'publish' : 'unpublish'} airdrop (update failed): ${exactUpdateError}`, 'error');
                              return;
                            }

                            setAirdrops(prev => prev.map(x => x.id === a.id ? { ...x, ...patch } : x));
                            fetchStats();

                            try {
                              await logAdminAudit({
                                actionTaken: nextPublished ? 'Publish airdrop' : 'Unpublish airdrop',
                                aiRecommendation: `Trust ${a.trust_score ?? 'unknown'} | Risk ${a.risk_level ?? 'unknown'}`,
                                finalDecision: nextPublished ? 'Approved and published' : 'Unpublished',
                                notes: reviewNotes ?? undefined,
                                context: {
                                  airdropId: a.id,
                                  airdropName: a.name,
                                  listingState: a.listing_state,
                                },
                              }, { throwOnError: true, source: 'airdrop_table_publish_toggle' });

                              showToast(`Airdrop ${nextPublished ? 'published' : 'unpublished'} and audit logged`);
                            } catch (auditErr) {
                              const exactAuditError = describeError(auditErr);
                              console.error('[Admin][AirdropPublish] Audit insert failed after successful airdrop update', {
                                airdropId: a.id,
                                nextPublished,
                                exactAuditError,
                              });
                              showToast(`Airdrop ${nextPublished ? 'published' : 'unpublished'}, but audit log failed: ${exactAuditError}`, 'error');
                            }
                          }}
                          title={a.published ? 'Unpublish' : 'Publish'}
                          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                        >
                          {a.published ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-gray-600" />}
                        </button>
                        {/* AI analysis */}
                        <button onClick={() => runAnalysis(a, true)} disabled={analyzing === a.id} title="Run AI analysis"
                          className="p-1.5 rounded-lg hover:bg-neon-purple/10 transition-colors disabled:opacity-50">
                          {analyzing === a.id
                            ? <Loader2 className="w-4 h-4 text-neon-purple animate-spin" />
                            : <Brain className="w-4 h-4 text-neon-purple" />}
                        </button>
                        {/* Edit */}
                        <button onClick={() => openEdit(a)} title="Edit"
                          className="p-1.5 rounded-lg hover:bg-sky-500/10 text-gray-500 hover:text-sky-400 transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => moderateAirdrop(a, 'approve')} title="Approve"
                          className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-gray-500 hover:text-emerald-400 transition-colors">
                          <CheckCheck className="w-4 h-4" />
                        </button>
                        <button onClick={() => moderateAirdrop(a, 'reject')} title="Reject"
                          className="p-1.5 rounded-lg hover:bg-amber-500/10 text-gray-500 hover:text-amber-400 transition-colors">
                          <Inbox className="w-4 h-4" />
                        </button>
                        <button onClick={() => moderateAirdrop(a, 'blacklist')} title="Blacklist"
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-gray-500 hover:text-rose-400 transition-colors">
                          <AlertTriangle className="w-4 h-4" />
                        </button>
                        <button onClick={() => window.open(`/airdrop/${a.slug}`, '_blank', 'noopener,noreferrer')} title="Open listing"
                          className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors">
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        {/* Delete */}
                        <button onClick={() => setDeletingAirdrop(a)} title="Delete"
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-gray-500 hover:text-rose-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Scam report review ─────────────────────────────────────────────── */}
      <section id="admin-scam-reports" className={canShowSection('submissions') ? '' : 'hidden'}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            Scam Reports
          </h2>
          {scamReportsLoading && <Loader2 className="w-3 h-3 text-gray-600 animate-spin" />}
        </div>

        <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.04] p-4 mb-3">
          <div className="flex items-start gap-3">
            <Gift className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-white">Admin-approved reports can earn REP</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Users do not earn REP when they submit a report. REP is only awarded after you approve a useful scam report. This helps prevent spam and fake reports.
              </p>
            </div>
          </div>
        </div>

        {scamReports.length === 0 && !scamReportsLoading ? (
          <div className="glass-card p-8 text-center text-gray-600 text-sm">
            No scam reports found. If this should show reports, check that your form saves into the scam_reports table.
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Project</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Reporter</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Submitted</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {scamReports.map(report => {
                  const isOpen = expandedScamReport === report.id;
                  const reportUrl = report.website_url || report.project_url;
                  const statusCls = report.status === 'approved'
                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25'
                    : report.status === 'rejected'
                    ? 'text-rose-400 bg-rose-500/10 border-rose-500/25'
                    : 'text-amber-400 bg-amber-500/10 border-amber-500/25';

                  return (
                    <Fragment key={report.id}>
                      <tr className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-white text-sm">{report.project_name || 'Unknown project'}</div>
                          {reportUrl && (
                            <a href={reportUrl} target="_blank" rel="noopener noreferrer"
                              className="text-[10px] text-gray-500 hover:text-neon-purple flex items-center gap-0.5 mt-0.5">
                              {reportUrl.replace(/^https?:\/\//, '')} <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="text-xs text-gray-500">{report.reporter_email || (report.user_id ? 'Logged-in user' : 'Anonymous')}</span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-xs text-gray-500">
                            {new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-[10px] font-semibold border rounded-full px-2.5 py-1 capitalize ${statusCls}`}>
                            {report.status}
                          </span>
                          {report.rep_awarded && (
                            <div className="mt-1">
                              <span className="text-[9px] font-semibold border rounded-full px-2 py-0.5 text-amber-300 bg-amber-500/10 border-amber-500/25">
                                REP awarded
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setExpandedScamReport(isOpen ? null : report.id)}
                              className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors"
                              title="View details"
                            >
                              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>

                            {report.status !== 'approved' && (
                              <button
                                onClick={() => updateScamReportStatus(report, 'approved')}
                                disabled={reviewingScamReport === report.id}
                                className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-gray-600 hover:text-emerald-400 transition-colors disabled:opacity-50"
                                title="Approve and award REP if linked to a user"
                              >
                                {reviewingScamReport === report.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
                              </button>
                            )}

                            {report.status !== 'rejected' && (
                              <button
                                onClick={() => updateScamReportStatus(report, 'rejected')}
                                disabled={reviewingScamReport === report.id}
                                className="p-1.5 rounded-lg hover:bg-rose-500/10 text-gray-600 hover:text-rose-400 transition-colors disabled:opacity-50"
                                title="Reject report"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}

                            {report.status !== 'pending' && (
                              <button
                                onClick={() => updateScamReportStatus(report, 'pending')}
                                disabled={reviewingScamReport === report.id}
                                className="p-1.5 rounded-lg hover:bg-amber-500/10 text-gray-600 hover:text-amber-400 transition-colors disabled:opacity-50"
                                title="Reset to pending"
                              >
                                <Inbox className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {isOpen && (
                        <tr className="bg-white/[0.015]">
                          <td colSpan={5} className="px-4 py-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs mb-4">
                              {([
                                ['Wallet Address', report.wallet_address],
                                ['Contract Address', report.contract_address],
                                ['Evidence URL', report.evidence_url],
                              ] as [string, string | null][]).map(([label, val]) => val ? (
                                <div key={label}>
                                  <div className="text-gray-600 uppercase tracking-wider mb-0.5">{label}</div>
                                  {val.startsWith('http') ? (
                                    <a href={val} target="_blank" rel="noopener noreferrer" className="text-neon-blue hover:underline break-all">{val}</a>
                                  ) : (
                                    <div className="text-gray-300 break-all">{val}</div>
                                  )}
                                </div>
                              ) : null)}
                            </div>

                            {([
                              ['Reason', report.reason],
                              ['Description', report.description],
                            ] as [string, string | null][]).map(([label, val]) => val ? (
                              <div key={label} className="mb-3">
                                <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">{label}</div>
                                <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-wrap">{val}</p>
                              </div>
                            ) : null)}

                            <div>
                              <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5">Internal Review Notes</div>
                              <div className="flex gap-2">
                                <textarea
                                  value={scamReportNotes[report.id] ?? ''}
                                  onChange={e => setScamReportNotes(prev => ({ ...prev, [report.id]: e.target.value }))}
                                  placeholder="Why was this approved or rejected?"
                                  rows={2}
                                  className="flex-1 bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-neon-purple/30 resize-none"
                                />
                                <button
                                  onClick={() => saveScamReportNotes(report)}
                                  className="px-4 py-2 rounded-xl text-xs font-medium bg-neon-purple/10 border border-neon-purple/20 text-neon-purple hover:bg-neon-purple/20 transition-colors shrink-0"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Submissions table ──────────────────────────────────────────────── */}
      <section id="admin-submissions" className={canShowSection('submissions') ? '' : 'hidden'}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-3.5 h-3.5" />
            Project Submissions
          </h2>
          {subLoading && <Loader2 className="w-3 h-3 text-gray-600 animate-spin" />}
        </div>
        {submissions.length === 0 && !subLoading ? (
          <div className="glass-card p-10 text-center text-gray-600 text-sm">No submissions yet.</div>
        ) : (
          <div className="glass-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Project</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Submitted</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Blockchain</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {submissions.map(sub => {
                  const isOpen = expandedSub === sub.id;
                  const statusCls = sub.status === 'approved'
                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25'
                    : sub.status === 'rejected'
                    ? 'text-rose-400 bg-rose-500/10 border-rose-500/25'
                    : 'text-amber-400 bg-amber-500/10 border-amber-500/25';
                  return (
                    <Fragment key={sub.id}>
                      <tr className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-white text-sm">{sub.project_name}</div>
                          {sub.website_url && (
                            <a href={sub.website_url} target="_blank" rel="noopener noreferrer"
                              className="text-[10px] text-gray-500 hover:text-neon-purple flex items-center gap-0.5 mt-0.5">
                              {sub.website_url.replace(/^https?:\/\//, '')} <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="text-xs text-gray-500">
                            {new Date(sub.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-xs text-gray-400">{sub.blockchain ?? '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-[10px] font-semibold border rounded-full px-2.5 py-1 capitalize ${statusCls}`}>
                            {sub.status}
                          </span>
                          {sub.ai_recommendation && (
                            <div className="mt-1">
                              <span className={`text-[9px] font-semibold border rounded-full px-2 py-0.5 capitalize ${
                                sub.ai_recommendation === 'verify'
                                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25'
                                  : sub.ai_recommendation === 'review_further'
                                  ? 'text-amber-400 bg-amber-500/10 border-amber-500/25'
                                  : 'text-rose-400 bg-rose-500/10 border-rose-500/25'
                              }`}>
                                AI: {sub.ai_recommendation.replace('_', ' ')}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => analyzeSubmission(sub)} disabled={analyzingSub === sub.id}
                              className="p-1.5 rounded-lg hover:bg-violet-500/10 text-gray-600 hover:text-violet-400 transition-colors disabled:opacity-50" title="Run AI analysis">
                              {analyzingSub === sub.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                            </button>
                            <button onClick={() => setExpandedSub(isOpen ? null : sub.id)}
                              className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors" title="View details">
                              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                            {sub.status !== 'approved' && (
                              <button onClick={() => updateSubmissionStatus(sub.id, 'approved')}
                                className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-gray-600 hover:text-emerald-400 transition-colors" title="Approve">
                                <CheckCheck className="w-4 h-4" />
                              </button>
                            )}
                            {sub.status !== 'rejected' && (
                              <button onClick={() => updateSubmissionStatus(sub.id, 'rejected')}
                                className="p-1.5 rounded-lg hover:bg-rose-500/10 text-gray-600 hover:text-rose-400 transition-colors" title="Reject">
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                            {sub.status !== 'pending' && (
                              <button onClick={() => updateSubmissionStatus(sub.id, 'pending')}
                                className="p-1.5 rounded-lg hover:bg-amber-500/10 text-gray-600 hover:text-amber-400 transition-colors" title="Reset to pending">
                                <Inbox className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-white/[0.015]">
                          <td colSpan={5} className="px-4 py-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs mb-4">
                              {([
                                ['Airdrop Type', sub.airdrop_type],
                                ['Category', sub.category],
                                ['Deadline', sub.deadline],
                                ['Reward Confirmed', sub.reward_confirmed],
                                ['Token Confirmed', sub.token_confirmed],
                                ['Funding / Investors', sub.funding_investors],
                                ['Contract Address', sub.contract_address],
                              ] as [string, string | null][]).map(([label, val]) => val ? (
                                <div key={label}>
                                  <div className="text-gray-600 uppercase tracking-wider mb-0.5">{label}</div>
                                  <div className="text-gray-300">{val}</div>
                                </div>
                              ) : null)}
                            </div>
                            {([
                              ['Description', sub.description],
                              ['Tasks Required', sub.tasks_required],
                              ['Eligibility Requirements', sub.eligibility_requirements],
                              ['Team Information', sub.team_info],
                            ] as [string, string | null][]).map(([label, val]) => val ? (
                              <div key={label} className="mb-3">
                                <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">{label}</div>
                                <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-wrap">{val}</p>
                              </div>
                            ) : null)}
                            <div className="flex flex-wrap gap-3 text-xs mb-4">
                              {sub.twitter_url && <a href={sub.twitter_url} target="_blank" rel="noopener noreferrer" className="text-neon-blue hover:underline flex items-center gap-1">Twitter <ExternalLink className="w-2.5 h-2.5" /></a>}
                              {sub.discord_url && <a href={sub.discord_url} target="_blank" rel="noopener noreferrer" className="text-neon-purple hover:underline flex items-center gap-1">Discord <ExternalLink className="w-2.5 h-2.5" /></a>}
                              {sub.github_url && <a href={sub.github_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:underline flex items-center gap-1">GitHub <ExternalLink className="w-2.5 h-2.5" /></a>}
                              {sub.whitepaper_url && <a href={sub.whitepaper_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:underline flex items-center gap-1">Whitepaper <ExternalLink className="w-2.5 h-2.5" /></a>}
                              {sub.audit_url && <a href={sub.audit_url} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline flex items-center gap-1">Audit <ExternalLink className="w-2.5 h-2.5" /></a>}
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs mb-4">
                              {([
                                ['Wallet Connection', sub.requires_wallet_connection],
                                ['On-Chain Tx', sub.requires_transaction],
                                ['Payment Required', sub.requires_payment],
                                ['Seed Phrase', sub.requires_seed_phrase],
                              ] as [string, boolean][]).map(([label, val]) => (
                                <span key={label} className={`border rounded-full px-2.5 py-1 ${val ? 'text-rose-400 border-rose-500/25 bg-rose-500/10' : 'text-gray-600 border-white/5'}`}>
                                  {label}: {val ? 'Yes' : 'No'}
                                </span>
                              ))}
                            </div>
                            {(sub.token_name || sub.token_verification || (sub.scam_warnings && sub.scam_warnings.length > 0)) && (
                              <div className="mb-4 p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                                <div className="text-[10px] text-gray-600 uppercase tracking-wider">AI Token Analysis</div>
                                {sub.token_name && (
                                  <div className="text-xs text-gray-300">
                                    Token: <span className="font-semibold text-white">{sub.token_name}</span>
                                    {sub.token_symbol && <span className="ml-1 text-gray-500 font-mono">${sub.token_symbol}</span>}
                                  </div>
                                )}
                                {sub.token_verification && (
                                  <div className={`text-xs font-medium ${sub.token_verification === 'clean' ? 'text-emerald-400' : sub.token_verification === 'warning' ? 'text-amber-400' : 'text-rose-400'}`}>
                                    Contract: {sub.token_verification}
                                  </div>
                                )}
                                {sub.scam_warnings && sub.scam_warnings.length > 0 && (
                                  <ul className="space-y-1">
                                    {sub.scam_warnings.map((w, i) => (
                                      <li key={i} className="text-xs text-rose-400 flex items-start gap-1.5">
                                        <span className="mt-0.5 shrink-0">!</span>{w}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            )}
                            <div>
                              <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5">Internal Notes</div>
                              <div className="flex gap-2">
                                <textarea
                                  value={subNotes[sub.id] ?? ''}
                                  onChange={e => setSubNotes(prev => ({ ...prev, [sub.id]: e.target.value }))}
                                  placeholder="Add internal notes..."
                                  rows={2}
                                  className="flex-1 bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-neon-purple/30 resize-none"
                                />
                                <button onClick={() => saveAdminNotes(sub.id)}
                                  className="px-4 py-2 rounded-xl text-xs font-medium bg-neon-purple/10 border border-neon-purple/20 text-neon-purple hover:bg-neon-purple/20 transition-colors shrink-0">
                                  Save
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

        </div>
      </div>

      <div className="lg:hidden fixed bottom-3 inset-x-3 z-40">
        <div className="rounded-2xl border border-white/10 bg-dark-900/90 backdrop-blur-md p-2 shadow-xl">
          <div className="grid grid-cols-2 gap-2">
            {adminNavItems.map((item) => (
              <button
                key={`mobile-nav-${item.id}`}
                onClick={() => setAdminView(item.id)}
                className={`rounded-xl border px-3 py-2 text-[11px] font-semibold transition-colors min-h-[44px] ${adminView === item.id ? 'border-cyan-400/40 bg-cyan-500/12 text-cyan-100' : 'border-white/10 bg-dark-900/60 text-gray-300 hover:border-white/20 hover:text-white'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {bannerModalMode && (
        <BannerFormModal
          mode={bannerModalMode}
          form={bannerForm}
          setForm={setBannerForm}
          onClose={() => setBannerModalMode(null)}
          onSave={saveBannerForm}
        />
      )}

      {modalMode && (
        <AirdropFormModal
          mode={modalMode}
          form={form}
          setForm={setForm}
          onClose={() => setModalMode(null)}
          onSave={saveForm}
          saving={saving}
        />
      )}

      {deletingAirdrop && (
        <DeleteModal
          airdrop={deletingAirdrop}
          onConfirm={confirmDelete}
          onCancel={() => setDeletingAirdrop(null)}
          deleting={deleting}
        />
      )}

      <VerificationNotesModal
        open={verificationModalOpen}
        actionLabel={verificationModalActionLabel}
        notes={verificationModalNotes}
        onNotesChange={setVerificationModalNotes}
        onCancel={cancelVerificationModal}
        onConfirm={confirmVerificationModal}
        saving={verificationModalSaving}
      />

      {toast && <ToastBar toast={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
