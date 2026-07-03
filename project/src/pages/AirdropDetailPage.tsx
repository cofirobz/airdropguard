import SEO from '../components/SEO';
import { useEffect, useState } from 'react';
import type React from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, ExternalLink, Twitter, MessageCircle, Send, Github,
  Clock, Zap, ShieldAlert, Bookmark, BookmarkCheck, CheckSquare,
  Square, Globe, ChevronRight, Loader2, AlertCircle, UserCheck,
  BarChart3, FileText, ListChecks, ThumbsUp, AlertTriangle, Sparkles,
  TrendingUp, TrendingDown, Target, Flame, Timer, Building2, CheckCircle2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { AirdropWithTasks } from '../lib/types';
import {
  cn, formatDate, daysUntil, getRewardColor, getRiskColor,
  getDifficultyColor, getStatusColor, isBookmarked, toggleBookmark,
  getCompletions, toggleCompletion, getCompletionPercent,
  getOpportunityScore, getAirdropRecommendation, getRecommendationMeta,
  getShouldIBotherSummary, getWhyWeLikeIt, getThingsToConsider,
} from '../lib/utils';
import { TrustScoreBadge } from '../components/TrustScoreSection';
import CommunityResults from '../components/CommunityResults';
import WalletSafetySnapshot from '../components/WalletSafetySnapshot';

type Tab = 'overview' | 'tasks' | 'analysis';

// ── CoinGecko market data ─────────────────────────────────────────────────────

const COINGECKO_PLATFORMS: Record<string, string> = {
  Ethereum: 'ethereum',
  Arbitrum: 'arbitrum-one',
  Optimism: 'optimistic-ethereum',
  Polygon: 'polygon-pos',
  Avalanche: 'avalanche',
  Base: 'base',
  Solana: 'solana',
  zkSync: 'zksync',
  Starknet: 'starknet',
  Sui: 'sui',
  Aptos: 'aptos',
};

interface MarketData {
  price: number;
  marketCap: number;
  change24h: number;
  volume24h: number;
}

function fmt(n: number, decimals = 2): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(decimals)}`;
}

function fmtPrice(n: number): string {
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(8)}`;
}

async function fetchMarketData(
  contractAddress: string | null,
  blockchain: string[],
  ticker: string | null,
  name: string,
): Promise<MarketData | null> {
  // 1. Try contract address lookup (most accurate)
  if (contractAddress) {
    for (const chain of blockchain) {
      const platform = COINGECKO_PLATFORMS[chain];
      if (!platform) continue;
      try {
        const url = `https://api.coingecko.com/api/v3/simple/token_price/${platform}?contract_addresses=${contractAddress}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`;
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) continue;
        const json = await res.json();
        const key = Object.keys(json)[0];
        if (!key) continue;
        const d = json[key];
        if (d?.usd) return {
          price: d.usd,
          marketCap: d.usd_market_cap ?? 0,
          change24h: d.usd_24h_change ?? 0,
          volume24h: d.usd_24h_vol ?? 0,
        };
      } catch { /* try next */ }
    }
  }

  // No fallback by ticker/name.
  // This avoids showing unrelated CoinGecko prices for projects with no official token.
  return null;
}

function MarketDataRow({ contractAddress, blockchain, ticker, name }: {
  contractAddress: string | null;
  blockchain: string[];
  ticker?: string;
  name: string;
}) {
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(Boolean(contractAddress));

  useEffect(() => {
    // Only show CoinGecko data when we have an official contract address.
    // This prevents projects without a verified token from showing unrelated ticker/name matches.
    if (!contractAddress) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchMarketData(contractAddress, blockchain, ticker ?? null, name).then(d => {
      setData(d);
      setLoading(false);
    });
  }, [contractAddress, blockchain.join(','), ticker, name]);

  if (!contractAddress || (!loading && !data)) return null;

  const up = data ? data.change24h >= 0 : true;

  return (
    <div className="mt-4 pt-4 border-t border-white/5">
      <div className="flex items-center gap-1.5 mb-3">
        <BarChart3 className="w-3.5 h-3.5 text-neon-blue" />
        <span className="text-xs text-gray-500 uppercase tracking-wider">Live Market Data</span>
        <span className="text-[9px] text-gray-700 ml-1">via CoinGecko</span>
        {loading && <Loader2 className="w-3 h-3 text-gray-700 animate-spin ml-1" />}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {loading ? (
          [0, 1, 2, 3].map(i => (
            <div key={i} className="bg-dark-700/40 rounded-xl p-3 animate-pulse">
              <div className="h-2 w-14 bg-white/5 rounded mb-2" />
              <div className="h-4 w-20 bg-white/[0.04] rounded" />
            </div>
          ))
        ) : data && (
          [
            { label: 'Price',      value: fmtPrice(data.price) },
            {
              label: '24h Change',
              value: `${up ? '+' : ''}${data.change24h.toFixed(2)}%`,
              extra: up
                ? <TrendingUp className="w-3 h-3 text-emerald-400" />
                : <TrendingDown className="w-3 h-3 text-rose-400" />,
              color: up ? 'text-emerald-400' : 'text-rose-400',
            },
            { label: 'Market Cap', value: data.marketCap ? fmt(data.marketCap) : '—' },
            { label: '24h Volume',  value: data.volume24h  ? fmt(data.volume24h)  : '—' },
          ].map(item => (
            <div key={item.label} className="bg-dark-700/40 rounded-xl p-3">
              <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">{item.label}</div>
              <div className={cn('text-sm font-semibold flex items-center gap-1', item.color ?? 'text-white')}>
                {item.extra}{item.value}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


// ── AirdropGuard intelligence UI helpers ─────────────────────────────────────────

type AnyAirdrop = AirdropWithTasks & Record<string, any>;

type AgieInsight = {
  intelligence: number | null;
  reputation: number | null;
  security: number | null;
  community: number | null;
  opportunityQuality: number | null;
  evidenceDepth: number | null;
  timeline: number | null;
  maturityMomentum: number | null;
  timelineEvents: number | null;
  confirmedEvents: number | null;
  watchItems: number | null;
  missing: string[];
  strengths: string[];
  risks: string[];
  timelineHighlights: string[];
  timelineWatchItems: string[];
  confidenceText: string | null;
};

function scoreFrom(airdrop: AirdropWithTasks, key: string): number | null {
  const value = (airdrop.sub_scores as Record<string, unknown> | null | undefined)?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : null;
}

function splitReasonList(reason: string, prefix: string): string[] {
  if (!reason.toLowerCase().startsWith(prefix.toLowerCase())) return [];
  return reason
    .slice(prefix.length)
    .split(/;|\|/)
    .map(x => x.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function getAgieInsight(airdrop: AirdropWithTasks): AgieInsight {
  const anyAirdrop = airdrop as AnyAirdrop;
  const reasons = airdrop.score_reasons ?? [];
  const missingRaw = anyAirdrop.missing_information;
  const missing = Array.isArray(missingRaw)
    ? missingRaw.map(String).filter(Boolean)
    : typeof missingRaw === 'string'
    ? missingRaw.split(/;|\n/).map(x => x.trim()).filter(Boolean)
    : [];

  const strengths = reasons.flatMap(r => splitReasonList(r, 'Key strengths:')).slice(0, 6);
  const risks = reasons.flatMap(r => splitReasonList(r, 'AGIE v16 risks:')).slice(0, 6);
  const timelineHighlights = reasons.flatMap(r => splitReasonList(r, 'Timeline highlights:')).slice(0, 6);
  const timelineWatchItems = reasons.flatMap(r => splitReasonList(r, 'Timeline watch items:')).slice(0, 6);

  return {
    intelligence: scoreFrom(airdrop, 'v16_overall_intelligence_score'),
    reputation: scoreFrom(airdrop, 'v16_reputation_score'),
    security: scoreFrom(airdrop, 'v16_security_score'),
    community: scoreFrom(airdrop, 'v16_community_score'),
    opportunityQuality: scoreFrom(airdrop, 'v16_opportunity_quality_score'),
    evidenceDepth: scoreFrom(airdrop, 'v16_evidence_depth_score'),
    timeline: scoreFrom(airdrop, 'v17_timeline_score'),
    maturityMomentum: scoreFrom(airdrop, 'v17_maturity_momentum_score'),
    timelineEvents: scoreFrom(airdrop, 'v17_timeline_event_count'),
    confirmedEvents: scoreFrom(airdrop, 'v17_confirmed_timeline_events'),
    watchItems: scoreFrom(airdrop, 'v17_timeline_watch_items'),
    missing,
    strengths,
    risks,
    timelineHighlights,
    timelineWatchItems,
    confidenceText: typeof anyAirdrop.confidence_explanation === 'string' ? anyAirdrop.confidence_explanation : null,
  };
}

function scoreClass(score: number | null): string {
  if (score === null) return 'text-gray-500';
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-amber-400';
  return 'text-rose-400';
}

function scoreBarClass(score: number | null): string {
  if (score === null) return 'bg-dark-500';
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-rose-500';
}

function IntelligenceMiniCard({ label, score, sub }: { label: string; score: number | null; sub?: string }) {
  return (
    <div className="bg-dark-700/40 rounded-xl p-3 border border-white/5">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[10px] text-gray-600 uppercase tracking-wider">{label}</span>
        <span className={cn('text-sm font-bold tabular-nums', scoreClass(score))}>
          {score ?? '—'}{score !== null && <span className="text-[10px] text-gray-700 font-normal">/100</span>}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-dark-600 overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-700', scoreBarClass(score))} style={{ width: `${score ?? 0}%` }} />
      </div>
      {sub && <p className="text-[10px] text-gray-600 mt-2 leading-relaxed">{sub}</p>}
    </div>
  );
}

function AgieIntelligenceDashboard({ airdrop, compact = false }: { airdrop: AirdropWithTasks; compact?: boolean }) {
  const agie = getAgieInsight(airdrop);
  const hasV16 = agie.intelligence !== null || agie.reputation !== null || agie.security !== null || agie.evidenceDepth !== null;
  const metrics = getDisplayAgieMetrics(airdrop);

  return (
    <div className="glass-card p-5 sm:p-6 border-neon-purple/15">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4.5 h-4.5 text-neon-purple" style={{ width: '18px', height: '18px' }} />
            <h2 className="text-base font-semibold text-white">AI Intelligence Report</h2>
          </div>
          <p className="text-xs text-gray-600">
            Project reputation and airdrop confidence are separated so legitimate projects are not penalised for unconfirmed tokens.
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className={cn('text-3xl font-bold tabular-nums leading-none', scoreClass(metrics.overall))}>{metrics.overall}</div>
          <div className="text-[10px] text-gray-600 uppercase tracking-wider mt-1">Overall Assessment</div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <IntelligenceMiniCard label="Project Reputation" score={metrics.reputation} sub="Legitimacy & maturity" />
        <IntelligenceMiniCard label="Airdrop Confidence" score={metrics.airdropConfidence} sub={metrics.tokenVerified ? 'Token/campaign evidence' : 'Token not confirmed'} />
        <IntelligenceMiniCard label="Security" score={metrics.security} sub="Threat profile" />
        <IntelligenceMiniCard label="Evidence" score={metrics.evidence} sub="Source coverage" />
        {!compact && <IntelligenceMiniCard label="Community" score={metrics.community} sub="Social/dev traction" />}
        {!compact && <IntelligenceMiniCard label="Opportunity Quality" score={metrics.opportunityQuality} sub="Airdrop usefulness" />}
        {!compact && <IntelligenceMiniCard label="Timeline" score={metrics.timeline} sub="Milestone coverage" />}
        {!compact && <IntelligenceMiniCard label="Threat" score={airdrop.risk_level === 'Low' ? 85 : airdrop.risk_level === 'Medium' ? 60 : 30} sub={airdrop.risk_level} />}
      </div>

      {!metrics.tokenVerified && (
        <p className="text-[10px] text-amber-400/80 mt-4 border-t border-white/5 pt-3">
          No official token is verified. This lowers airdrop confidence, not project reputation.
        </p>
      )}

      {!hasV16 && (
        <p className="text-[10px] text-amber-400/80 mt-3 border-t border-white/5 pt-3">
          New intelligence fields are not present yet. Re-run AI analysis from admin to populate the full report.
        </p>
      )}
    </div>
  );
}

function EvidencePanel({ airdrop }: { airdrop: AirdropWithTasks }) {
  const agie = getAgieInsight(airdrop);
  const evidenceItems = [
    { label: 'Official website', ok: !!airdrop.website_url },
    { label: 'Documentation', ok: !!airdrop.docs_url || !!scoreFrom(airdrop, 'docs') },
    { label: 'GitHub / development', ok: !!airdrop.github_url || !!scoreFrom(airdrop, 'github') || !!scoreFrom(airdrop, 'github_active') },
    { label: 'Team evidence', ok: !!airdrop.team_info || !!scoreFrom(airdrop, 'team_info') },
    { label: 'Funding / investors', ok: !!airdrop.funding_info || !!airdrop.investors || !!scoreFrom(airdrop, 'funding') },
    { label: 'Tasks / campaign data', ok: airdrop.tasks.length > 0 },
    { label: 'Contract / token data', ok: !!airdrop.contract_address || agie.opportunityQuality !== null },
    { label: 'Human verification', ok: !!airdrop.human_verified },
  ];

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        <h2 className="text-sm font-semibold text-white">Evidence Coverage</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {evidenceItems.map(item => (
          <div key={item.label} className="flex items-center gap-2 rounded-xl bg-dark-700/40 border border-white/5 px-3 py-2">
            <span className={cn('w-2 h-2 rounded-full shrink-0', item.ok ? 'bg-emerald-400' : 'bg-gray-600')} />
            <span className={cn('text-xs', item.ok ? 'text-gray-300' : 'text-gray-600')}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectTimelinePanel({ airdrop }: { airdrop: AirdropWithTasks }) {
  const agie = getAgieInsight(airdrop);
  const hasTimelineData = agie.timeline !== null || agie.timelineHighlights.length > 0 || agie.timelineEvents !== null;
  if (!hasTimelineData) return null;

  const highlightItems = agie.timelineHighlights.length > 0
    ? agie.timelineHighlights
    : [
        agie.confirmedEvents !== null ? `${agie.confirmedEvents} high-confidence milestone${agie.confirmedEvents !== 1 ? 's' : ''} detected` : '',
        agie.timelineEvents !== null ? `${agie.timelineEvents} total timeline event${agie.timelineEvents !== 1 ? 's' : ''} found` : '',
        agie.watchItems !== null ? `${agie.watchItems} watch item${agie.watchItems !== 1 ? 's' : ''}` : '',
      ].filter(Boolean);

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4 text-orange-400" />
          <h2 className="text-sm font-semibold text-white">Project Intelligence Timeline</h2>
        </div>
        {agie.timeline !== null && <span className={cn('text-sm font-bold tabular-nums', scoreClass(agie.timeline))}>{agie.timeline}/100</span>}
      </div>

      <div className="space-y-3">
        {highlightItems.slice(0, 5).map((item, i) => (
          <div key={`${item}-${i}`} className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-neon-purple/10 border border-neon-purple/25 text-neon-purple flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
              {i + 1}
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">{item}</p>
          </div>
        ))}
      </div>

      {agie.timelineWatchItems.length > 0 && (
        <div className="mt-4 border-t border-white/5 pt-4">
          <p className="text-[10px] text-amber-400 uppercase tracking-wider font-semibold mb-2">Watch Items</p>
          <ul className="space-y-1.5">
            {agie.timelineWatchItems.map(item => (
              <li key={item} className="flex items-start gap-2 text-xs text-gray-500">
                <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ThreatIntelligencePanel({ airdrop }: { airdrop: AirdropWithTasks }) {
  const agie = getAgieInsight(airdrop);
  const tokenVerified = hasOfficialTokenEvidence(airdrop);
  const riskReasons = agie.risks
    .filter(r => !r.toLowerCase().includes('no official token'))
    .filter(r => !r.toLowerCase().includes('token contract'));
  const hasWarnings = riskReasons.length > 0 || airdrop.risk_level !== 'Low';

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <ShieldAlert className={cn('w-4 h-4', hasWarnings ? 'text-amber-400' : 'text-emerald-400')} />
        <h2 className="text-sm font-semibold text-white">Threat Intelligence</h2>
      </div>

      {hasWarnings ? (
        <ul className="space-y-2">
          {(riskReasons.length ? riskReasons : [`Risk level is ${airdrop.risk_level}. Verify official links before connecting a wallet.`]).slice(0, 6).map(item => (
            <li key={item} className="flex items-start gap-2 text-xs text-gray-400 leading-relaxed">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-xs text-gray-400 leading-relaxed">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            No active project-level threat signals are displayed for this listing.
          </div>
          <div className="flex items-start gap-2 text-xs text-gray-500 leading-relaxed">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            Always use official links and never share seed phrases.
          </div>
        </div>
      )}

      {!tokenVerified && (
        <div className="mt-4 border-t border-white/5 pt-4">
          <p className="text-[10px] text-amber-400 uppercase tracking-wider font-semibold mb-2">Airdrop Unknown</p>
          <p className="text-xs text-gray-500 leading-relaxed">
            No official token contract is verified. This affects airdrop confidence, not the project reputation score.
          </p>
        </div>
      )}
    </div>
  );
}

function MissingIntelligencePanel({ airdrop }: { airdrop: AirdropWithTasks }) {
  const agie = getAgieInsight(airdrop);
  if (agie.missing.length === 0) return null;

  return (
    <div className="glass-card p-5 border-amber-500/15">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        <h2 className="text-sm font-semibold text-white">Missing Intelligence</h2>
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {agie.missing.slice(0, 8).map(item => (
          <li key={item} className="text-xs text-gray-500 bg-dark-700/40 border border-white/5 rounded-xl px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AgieStrengthsPanel({ airdrop }: { airdrop: AirdropWithTasks }) {
  const agie = getAgieInsight(airdrop);
  if (agie.strengths.length === 0) return null;

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <ThumbsUp className="w-4 h-4 text-emerald-400" />
        <h2 className="text-sm font-semibold text-white">Key Strengths</h2>
      </div>
      <ul className="space-y-2">
        {agie.strengths.map(item => (
          <li key={item} className="flex items-start gap-2 text-xs text-gray-400 leading-relaxed">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}


function scoreTone(score: number | null): { label: string; cls: string; dot: string } {
  if (score === null) return { label: 'Pending', cls: 'text-gray-400 bg-gray-500/10 border-gray-500/20', dot: 'bg-gray-500' };
  if (score >= 85) return { label: 'Excellent', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25', dot: 'bg-emerald-400' };
  if (score >= 70) return { label: 'Strong', cls: 'text-sky-400 bg-sky-500/10 border-sky-500/25', dot: 'bg-sky-400' };
  if (score >= 55) return { label: 'Watch', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/25', dot: 'bg-amber-400' };
  return { label: 'Speculative', cls: 'text-orange-400 bg-orange-500/10 border-orange-500/25', dot: 'bg-orange-400' };
}

function starsFromScore(score: number): number {
  if (score >= 85) return 5;
  if (score >= 70) return 4;
  if (score >= 55) return 3;
  if (score >= 40) return 2;
  return 1;
}

function StarRating({ score, label }: { score: number; label?: string }) {
  const stars = starsFromScore(score);
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5" aria-label={`${stars} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map(i => (
          <span
            key={i}
            className={cn(
              'text-sm leading-none',
              i <= stars ? 'text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.35)]' : 'text-gray-700'
            )}
          >
            ★
          </span>
        ))}
      </div>
      {label && <span className="text-[10px] text-gray-600 uppercase tracking-wider">{label}</span>}
    </div>
  );
}

function getMaturityLabel(airdrop: AirdropWithTasks): string {
  const agie = getAgieInsight(airdrop);
  const reasons = (airdrop.score_reasons ?? []).join(' ').toLowerCase();
  if (reasons.includes('blue chip')) return 'Blue-chip';
  if (reasons.includes('established product')) return 'Established';
  if (reasons.includes('growth')) return 'Growth-stage';
  if (reasons.includes('emerging')) return 'Emerging';
  if ((airdrop.trust_score ?? 0) >= 90 || (agie.reputation ?? 0) >= 85) return 'Established';
  if ((agie.timeline ?? 0) >= 70 || (agie.maturityMomentum ?? 0) >= 70) return 'Growing';
  return 'Under review';
}


function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function hasOfficialTokenEvidence(airdrop: AirdropWithTasks): boolean {
  const text = [
    airdrop.contract_address,
    airdrop.ticker,
    airdrop.ai_summary,
    airdrop.ai_risk_analysis,
    airdrop.ai_reward_estimate,
    ...(airdrop.score_reasons ?? []),
  ].filter(Boolean).join(' ').toLowerCase();

  if (airdrop.contract_address) return true;
  if (text.includes('official token verified') || text.includes('token contract verified')) return true;
  if (text.includes('no official token') || text.includes('token not confirmed') || text.includes('not officially confirmed')) return false;
  return false;
}

type DisplayAgieMetrics = {
  overall: number;
  reputation: number;
  airdropConfidence: number;
  security: number;
  evidence: number;
  community: number;
  opportunityQuality: number;
  timeline: number;
  tokenVerified: boolean;
  maturity: string;
};

function getDisplayAgieMetrics(airdrop: AirdropWithTasks, opportunityScore?: number): DisplayAgieMetrics {
  const agie = getAgieInsight(airdrop);
  const trust = airdrop.trust_score ?? 50;
  const opp = opportunityScore ?? getOpportunityScore(airdrop);
  const maturity = getMaturityLabel(airdrop);
  const tokenVerified = hasOfficialTokenEvidence(airdrop);
  const noFixedDeadline = !airdrop.expiry_date;
  const hasTasks = airdrop.tasks.length > 0;
  const lowRisk = airdrop.risk_level === 'Low';
  const mediumRisk = airdrop.risk_level === 'Medium';

  const coverageSignals = [
    !!airdrop.website_url,
    !!airdrop.docs_url || !!scoreFrom(airdrop, 'docs'),
    !!airdrop.github_url || !!scoreFrom(airdrop, 'github') || !!scoreFrom(airdrop, 'github_active'),
    !!airdrop.team_info || !!scoreFrom(airdrop, 'team_info'),
    !!airdrop.funding_info || !!airdrop.investors || !!scoreFrom(airdrop, 'funding'),
    hasTasks,
    tokenVerified || !!airdrop.contract_address,
    !!airdrop.human_verified,
  ];
  const coverageScore = clampScore((coverageSignals.filter(Boolean).length / coverageSignals.length) * 100);

  // Project reputation is about legitimacy/maturity, not whether an airdrop token exists.
  const reputation = clampScore(Math.max(
    agie.reputation ?? 0,
    trust,
    trust >= 90 ? 90 : 0,
    maturity === 'Established' || maturity === 'Blue-chip' ? 88 : 0,
  ));

  // Airdrop confidence is deliberately separate from project trust.
  // No official token, no snapshot or no deadline should reduce this only.
  const airdropConfidence = clampScore(
    Math.max(agie.opportunityQuality ?? 0, opp)
    - (tokenVerified ? 0 : 18)
    - (noFixedDeadline ? 4 : 0)
    + (hasTasks ? 4 : 0)
  );

  const security = clampScore(Math.max(
    agie.security ?? 0,
    lowRisk ? 76 : mediumRisk ? 62 : 38,
    trust >= 85 && lowRisk ? 78 : 0,
    trust >= 90 && lowRisk ? 82 : 0,
  ));

  const evidence = clampScore(Math.max(
    agie.evidenceDepth ?? 0,
    coverageScore,
    trust >= 90 ? 76 : 0,
    trust >= 90 && !!airdrop.website_url && (!!airdrop.docs_url || !!airdrop.github_url) ? 82 : 0,
  ));

  const community = clampScore(Math.max(
    agie.community ?? 0,
    airdrop.is_trending ? 72 : 0,
    trust >= 90 ? 70 : 0,
  ));

  const timeline = clampScore(Math.max(
    agie.maturityMomentum ?? 0,
    agie.timeline ?? 0,
    reputation >= 90 ? 74 : 0,
    maturity === 'Established' || maturity === 'Blue-chip' ? 78 : 0,
  ));

  const opportunityQuality = clampScore(Math.max(agie.opportunityQuality ?? 0, airdropConfidence));

  // Overall Assessment is an intelligence health score, not an airdrop-only score.
  // Airdrop uncertainty matters, but it should not make a trusted project look dangerous.
  const weightedOverall = 
    reputation * 0.28 +
    security * 0.18 +
    evidence * 0.18 +
    community * 0.10 +
    timeline * 0.10 +
    airdropConfidence * 0.10 +
    opp * 0.06;

  const safetyFloor = reputation >= 90 && lowRisk ? 72 : reputation >= 80 && lowRisk ? 66 : 0;
  const overall = clampScore(Math.max(weightedOverall, safetyFloor));

  return {
    overall,
    reputation,
    airdropConfidence,
    security,
    evidence,
    community,
    opportunityQuality,
    timeline,
    tokenVerified,
    maturity,
  };
}

function CommandMetric({ label, value, sub, icon: Icon, tone, scoreForStars }: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'emerald' | 'sky' | 'purple' | 'amber' | 'rose' | 'gray';
  scoreForStars?: number;
}) {
  const toneMap = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    sky: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    purple: 'text-neon-purple bg-neon-purple/10 border-neon-purple/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    gray: 'text-gray-400 bg-white/5 border-white/10',
  }[tone];
  const isTextValue = typeof value === 'string' && value.length > 6;

  return (
    <div className="rounded-2xl border border-white/5 bg-dark-700/35 p-4 min-h-[118px] min-w-0">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${toneMap}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="text-right min-w-0 flex-1">
          <div className="text-[10px] text-gray-600 uppercase tracking-wider truncate">{label}</div>
          <div className={cn('font-bold text-white tabular-nums leading-tight break-words', isTextValue ? 'text-base sm:text-lg' : 'text-xl')}>
            {value}
          </div>
        </div>
      </div>
      {typeof scoreForStars === 'number' && <StarRating score={scoreForStars} />}
      {sub && <p className="text-[10px] text-gray-600 leading-relaxed mt-2">{sub}</p>}
    </div>
  );
}

function AgieCommandCenter({ airdrop, opportunityScore, recommendationLabel }: {
  airdrop: AirdropWithTasks;
  opportunityScore: number;
  recommendationLabel: string;
}) {
  const agie = getAgieInsight(airdrop);
  const metrics = getDisplayAgieMetrics(airdrop, opportunityScore);
  const threatTone = airdrop.risk_level === 'Low' ? 'emerald' : airdrop.risk_level === 'Medium' ? 'amber' : 'rose';
  const overallTone = scoreTone(metrics.overall);
  const actionLabel = metrics.reputation >= 85 && !metrics.tokenVerified
    ? 'Monitor Token News'
    : recommendationLabel;

  return (
    <section className="glass-card p-5 sm:p-6 mb-8 border-neon-purple/20 overflow-hidden relative">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neon-purple/60 to-transparent" />
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Sparkles className="w-5 h-5 text-neon-purple" />
            <h2 className="text-lg font-bold text-white">AI Intelligence Report</h2>
          </div>
          <p className="text-sm text-gray-500 max-w-2xl">
            Clear 5-star intelligence view separating project reputation, airdrop confidence and user safety.
          </p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-dark-700/35 px-4 py-3 min-w-[170px]">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div>
              <div className="text-[10px] text-gray-600 uppercase tracking-wider">Overall Assessment</div>
              <div className={cn('text-4xl font-bold tabular-nums leading-none', scoreClass(metrics.overall))}>{metrics.overall}</div>
            </div>
            <span className={cn('text-xs font-bold border rounded-xl px-3 py-1.5', overallTone.cls)}>
              {overallTone.label}
            </span>
          </div>
          <StarRating score={metrics.overall} label="AI Rating" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-3">
        <CommandMetric label="Reputation" value={metrics.reputation} sub="Project quality" icon={UserCheck} tone={metrics.reputation >= 80 ? 'emerald' : metrics.reputation >= 60 ? 'amber' : 'rose'} scoreForStars={metrics.reputation} />
        <CommandMetric label="Airdrop Confidence" value={metrics.airdropConfidence} sub={metrics.tokenVerified ? 'Token/campaign evidence' : 'Token not confirmed'} icon={Zap} tone={metrics.airdropConfidence >= 70 ? 'emerald' : metrics.airdropConfidence >= 45 ? 'amber' : 'rose'} scoreForStars={metrics.airdropConfidence} />
        <CommandMetric label="Security" value={metrics.security} sub="Threat profile" icon={ShieldAlert} tone={metrics.security >= 75 ? 'emerald' : metrics.security >= 55 ? 'amber' : 'rose'} scoreForStars={metrics.security} />
        <CommandMetric label="Evidence" value={metrics.evidence} sub="Source coverage" icon={CheckCircle2} tone={metrics.evidence >= 75 ? 'emerald' : metrics.evidence >= 55 ? 'amber' : 'rose'} scoreForStars={metrics.evidence} />
        <CommandMetric label="Maturity" value={metrics.maturity} sub="Lifecycle signal" icon={Building2} tone="purple" />
        <CommandMetric label="Threat" value={airdrop.risk_level} sub="User exposure" icon={AlertTriangle} tone={threatTone} />
      </div>

      <div className="mt-4 rounded-2xl border border-white/5 bg-dark-700/30 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <div className="text-[10px] text-gray-600 uppercase tracking-wider">Executive Summary</div>
          <span className={cn('text-xs font-semibold border rounded-full px-3 py-1 w-fit', overallTone.cls)}>
            {actionLabel}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
          {metrics.reputation >= 85
            ? `${airdrop.name} shows strong project reputation, maturity and legitimacy signals.`
            : `${airdrop.name} is still building its reputation profile.`}
          {' '}
          {metrics.tokenVerified
            ? 'A verified token or contract signal is present, so market intelligence can be displayed.'
            : 'No official token contract is verified, so the system treats the airdrop as speculative while keeping project trust separate.'}
        </p>
      </div>

      {!metrics.tokenVerified && (
        <p className="text-xs text-amber-300/80 leading-relaxed mt-4 border-t border-white/5 pt-4">
          Note: no official token is verified. This lowers airdrop confidence, but it should not be treated as a project security failure.
        </p>
      )}

      {agie.confidenceText && (
        <p className="text-xs text-gray-500 leading-relaxed mt-3 border-t border-white/5 pt-3">{agie.confidenceText}</p>
      )}
    </section>
  );
}

function IntelligenceRadar({ airdrop }: { airdrop: AirdropWithTasks }) {
  const metrics = getDisplayAgieMetrics(airdrop);
  const rows = [
    { label: 'Project Reputation', score: metrics.reputation },
    { label: 'Airdrop Confidence', score: metrics.airdropConfidence },
    { label: 'Security', score: metrics.security },
    { label: 'Evidence Depth', score: metrics.evidence },
    { label: 'Community', score: metrics.community },
    { label: 'Timeline Momentum', score: metrics.timeline },
  ];

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-neon-blue" />
        <h2 className="text-sm font-semibold text-white">Project Signals</h2>
      </div>
      <div className="space-y-4">
        {rows.map(row => {
          const tone = scoreTone(row.score);
          return (
            <div key={row.label}>
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <div>
                  <span className="text-xs text-gray-500">{row.label}</span>
                  <div className="mt-0.5"><StarRating score={row.score} /></div>
                </div>
                <div className="text-right">
                  <span className={cn('text-xs font-bold tabular-nums', scoreClass(row.score))}>{row.score}/100</span>
                  <div className={cn('text-[10px] font-semibold', tone.cls.split(' ')[0])}>{tone.label}</div>
                </div>
              </div>
              <div className="h-2 rounded-full bg-dark-700 overflow-hidden">
                <div className={cn('h-full rounded-full transition-all duration-700', scoreBarClass(row.score))} style={{ width: `${row.score}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProfessionalVerdictPanel({ airdrop, opportunityScore, recLabel }: {
  airdrop: AirdropWithTasks;
  opportunityScore: number;
  recLabel: string;
}) {
  const metrics = getDisplayAgieMetrics(airdrop, opportunityScore);
  const beginnerSafe = metrics.reputation >= 80 && metrics.security >= 70 && airdrop.risk_level !== 'High';
  const airdropReady = metrics.airdropConfidence >= 65;
  const farmerSafe = opportunityScore >= 55 && airdrop.status !== 'Expired';

  const verdict = beginnerSafe && airdropReady
    ? 'Strong project and strong airdrop profile. Users can consider participating after checking official task links.'
    : beginnerSafe && !airdropReady
    ? 'Strong project reputation, but airdrop confidence is still limited. Monitor official announcements before spending significant time or gas.'
    : airdrop.risk_level === 'High'
    ? 'High-scrutiny listing. Only advanced users should investigate further and official links must be verified carefully.'
    : 'Promising but incomplete intelligence profile. Verify the missing signals before treating this as a priority.';

  const bestFor = beginnerSafe && airdropReady
    ? 'Beginners + Farmers'
    : beginnerSafe
    ? 'Watchlist + Experienced Farmers'
    : farmerSafe
    ? 'Experienced Farmers'
    : 'Manual Review';

  const action = beginnerSafe && !airdropReady
    ? 'Monitor Official Token/Airdrop News'
    : recLabel;

  return (
    <div className="glass-card p-6 border-neon-blue/15">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-neon-blue" />
          <h2 className="text-base font-semibold text-white">Final Recommendation</h2>
        </div>
        <StarRating score={metrics.overall} label="Overall Rating" />
      </div>
      <p className="text-sm text-gray-400 leading-relaxed mb-5">{verdict}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl bg-dark-700/40 border border-white/5 p-3">
          <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Best For</div>
          <div className="text-sm font-semibold text-white">{bestFor}</div>
        </div>
        <div className="rounded-xl bg-dark-700/40 border border-white/5 p-3">
          <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Recommended Action</div>
          <div className="text-sm font-semibold text-white">{action}</div>
        </div>
        <div className="rounded-xl bg-dark-700/40 border border-white/5 p-3">
          <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Airdrop Confidence</div>
          <div className={cn('text-sm font-semibold', scoreClass(metrics.airdropConfidence))}>{metrics.airdropConfidence}/100</div>
          <div className="mt-1"><StarRating score={metrics.airdropConfidence} /></div>
        </div>
      </div>
    </div>
  );
}

function IntelligenceSourcePanel({ airdrop }: { airdrop: AirdropWithTasks }) {
  const agie = getAgieInsight(airdrop);
  const items = [
    { label: 'Official Website', value: airdrop.website_url ? 'Verified Link Present' : 'Missing', ok: !!airdrop.website_url },
    { label: 'Documentation', value: airdrop.docs_url ? 'Docs Present' : 'Not Confirmed', ok: !!airdrop.docs_url || !!scoreFrom(airdrop, 'docs') },
    { label: 'Development', value: airdrop.github_url ? 'GitHub Present' : 'Not Confirmed', ok: !!airdrop.github_url || !!scoreFrom(airdrop, 'github_active') },
    { label: 'Human Review', value: airdrop.human_verified ? 'Verified by AirdropGuard' : 'Pending', ok: !!airdrop.human_verified },
    { label: 'Timeline Events', value: agie.timelineEvents !== null ? `${agie.timelineEvents} detected` : 'Pending re-analysis', ok: (agie.timelineEvents ?? 0) > 0 },
    { label: 'Threat Watch', value: agie.risks.length > 0 ? `${agie.risks.length} item(s)` : 'No displayed alerts', ok: agie.risks.length === 0 },
  ];

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-4 h-4 text-violet-400" />
        <h2 className="text-sm font-semibold text-white">Intelligence Sources</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map(item => (
          <div key={item.label} className="rounded-xl bg-dark-700/40 border border-white/5 p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('w-2 h-2 rounded-full', item.ok ? 'bg-emerald-400' : 'bg-amber-400')} />
              <span className="text-[10px] text-gray-600 uppercase tracking-wider">{item.label}</span>
            </div>
            <div className="text-xs text-gray-300">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalystNextSteps({ airdrop }: { airdrop: AirdropWithTasks }) {
  const agie = getAgieInsight(airdrop);
  const actions = [
    ...agie.timelineWatchItems,
    ...agie.missing.slice(0, 3).map(m => `Verify missing intelligence: ${m}`),
    ...(airdrop.tasks.length === 0 ? ['Add verified task steps before users start farming.'] : []),
    ...(airdrop.risk_level !== 'Low' ? ['Re-check official links before users connect wallets.'] : []),
  ].filter(Boolean).slice(0, 5);

  if (actions.length === 0) return null;

  return (
    <div className="glass-card p-5 border-amber-500/10">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        <h2 className="text-sm font-semibold text-white">Analyst Next Steps</h2>
      </div>
      <ul className="space-y-2">
        {actions.map(action => (
          <li key={action} className="flex items-start gap-2 text-xs text-gray-400 leading-relaxed">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
            {action}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── AnalysisTab ───────────────────────────────────────────────────────────────

function AnalysisSection({
  icon: Icon,
  iconCls,
  label,
  badge,
  badgeCls,
  detail,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconCls: string;
  label: string;
  badge: string;
  badgeCls: string;
  detail: string;
  sub?: string;
}) {
  return (
    <div className="flex items-start gap-4 py-4 border-b border-white/5 last:border-0">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconCls}`}>
        <Icon className="w-[18px] h-[18px]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
          <span className={`text-xs font-semibold border rounded-full px-2.5 py-0.5 ${badgeCls}`}>{badge}</span>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed">{detail}</p>
        {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function AnalysisTab({
  airdrop,
  pros,
  cons,
}: {
  airdrop: AirdropWithTasks;
  pros: string[];
  cons: string[];
}) {
  const days = daysUntil(airdrop.expiry_date);
  const rec = getAirdropRecommendation(airdrop);
  const recMeta = getRecommendationMeta(rec);
  const hasAnyData =
    airdrop.ai_risk_analysis ||
    airdrop.ai_reward_estimate ||
    airdrop.trust_score !== null;

  // ── Section data derived from existing fields ────────────────────────────

  // Reward Potential
  const rewardBadge = airdrop.reward_potential;
  const rewardBadgeCls =
    airdrop.reward_potential === 'High'
      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25'
      : airdrop.reward_potential === 'Medium'
      ? 'text-amber-400 bg-amber-500/10 border-amber-500/25'
      : 'text-gray-400 bg-gray-500/10 border-gray-500/25';
  const rewardDetail = airdrop.ai_reward_estimate
    ? airdrop.ai_reward_estimate.split('.')[0] + '.'
    : airdrop.estimated_reward
    ? `Estimated return is ${airdrop.estimated_reward}.`
    : airdrop.reward_potential === 'High'
    ? 'Strong reward potential based on project size and community traction.'
    : airdrop.reward_potential === 'Medium'
    ? 'Moderate reward potential — worth participating but outcomes vary.'
    : 'Lower reward potential relative to effort and risk involved.';
  const rewardSub = airdrop.estimated_reward ? `Est. ${airdrop.estimated_reward}` : undefined;

  // Effort Required
  const effortBadge = airdrop.difficulty;
  const effortBadgeCls =
    airdrop.difficulty === 'Easy'
      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25'
      : airdrop.difficulty === 'Moderate'
      ? 'text-amber-400 bg-amber-500/10 border-amber-500/25'
      : 'text-rose-400 bg-rose-500/10 border-rose-500/25';
  const taskCount = airdrop.tasks.length;
  const effortDetail =
    airdrop.difficulty === 'Easy'
      ? `${taskCount > 0 ? `${taskCount} simple task${taskCount !== 1 ? 's' : ''} — ` : ''}Minimal friction. Most users can complete this in a single session.`
      : airdrop.difficulty === 'Moderate'
      ? `${taskCount > 0 ? `${taskCount} task${taskCount !== 1 ? 's' : ''} required — ` : ''}Some ongoing participation needed.${airdrop.time_required ? ` Expect ${airdrop.time_required}.` : ''}`
      : `${taskCount > 0 ? `${taskCount} task${taskCount !== 1 ? 's' : ''} — ` : ''}High commitment required. Review all requirements before starting.${airdrop.time_required ? ` Estimated time: ${airdrop.time_required}.` : ''}`;
  const effortSub = airdrop.time_required ? `Time required: ${airdrop.time_required}` : undefined;

  // Risk Level
  const riskBadge = airdrop.risk_level;
  const riskBadgeCls =
    airdrop.risk_level === 'Low'
      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25'
      : airdrop.risk_level === 'Medium'
      ? 'text-amber-400 bg-amber-500/10 border-amber-500/25'
      : 'text-rose-400 bg-rose-500/10 border-rose-500/25';
  const riskDetail = airdrop.ai_risk_analysis
    ? airdrop.ai_risk_analysis.split('.')[0] + '.'
    : airdrop.risk_level === 'Low'
    ? 'Low risk profile. Project shows credible fundamentals and no significant red flags.'
    : airdrop.risk_level === 'Medium'
    ? 'Moderate risk. Proceed with normal caution — verify requirements before submitting wallets.'
    : 'Elevated risk profile. High-scrutiny recommended — only engage if you understand the exposure.';
  const riskSub =
    airdrop.trust_score !== null
      ? `Trust score: ${airdrop.trust_score}/100`
      : undefined;

  // Time Sensitivity
  const timeBadge =
    airdrop.status === 'Ending Soon'
      ? 'Ending Soon'
      : airdrop.status === 'Expired'
      ? 'Expired'
      : days !== null && days <= 14
      ? 'Limited Time'
      : 'Open';
  const timeBadgeCls =
    airdrop.status === 'Expired'
      ? 'text-gray-500 bg-gray-500/10 border-gray-500/20'
      : timeBadge === 'Ending Soon' || timeBadge === 'Limited Time'
      ? 'text-orange-400 bg-orange-500/10 border-orange-500/25'
      : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25';
  const timeDetail =
    airdrop.status === 'Expired'
      ? 'This airdrop has ended. No further participation is possible.'
      : days !== null && days > 0
      ? `${days} day${days !== 1 ? 's' : ''} remaining.${days <= 7 ? ' Act quickly — the window is closing.' : days <= 30 ? ' Act within the next few weeks to secure eligibility.' : ' Ample time to complete requirements at your own pace.'}`
      : airdrop.expiry_date
      ? 'Deadline has passed or is imminent.'
      : 'No fixed deadline — but early participation typically yields better eligibility.';
  const timeSub = airdrop.expiry_date ? `Deadline: ${formatDate(airdrop.expiry_date)}` : undefined;

  // Project Strength
  const strengthScore = airdrop.trust_score;
  const strengthBadge =
    strengthScore === null
      ? 'Unscored'
      : strengthScore >= 75
      ? 'Strong'
      : strengthScore >= 50
      ? 'Moderate'
      : 'Weak';
  const strengthBadgeCls =
    strengthScore === null
      ? 'text-gray-500 bg-gray-500/10 border-gray-500/20'
      : strengthScore >= 75
      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25'
      : strengthScore >= 50
      ? 'text-amber-400 bg-amber-500/10 border-amber-500/25'
      : 'text-rose-400 bg-rose-500/10 border-rose-500/25';
  const signals: string[] = [];
  if (airdrop.github_url) signals.push('open-source repo');
  if (airdrop.is_featured) signals.push("editor's pick");
  if (airdrop.is_trending) signals.push('community trending');
  if (airdrop.listing_state === 'verified') signals.push('verified listing');
  const strengthDetail =
    strengthScore !== null
      ? `AI trust score of ${strengthScore}/100 — ${
          strengthScore >= 75
            ? 'on-chain and social signals look healthy'
            : strengthScore >= 50
            ? 'reasonable fundamentals with some unknowns'
            : 'limited on-chain data or weaker fundamentals'
        }.${signals.length > 0 ? ` Additional signals: ${signals.join(', ')}.` : ''}`
      : signals.length > 0
      ? `No trust score yet. Positive signals noted: ${signals.join(', ')}.`
      : 'AI trust analysis not yet run for this project. Proceed with standard due diligence.';

  return (
    <div className="space-y-5 animate-slide-up">
      {!hasAnyData && (
        <div className="glass-card p-8 text-center">
          <BarChart3 className="w-8 h-8 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">AI analysis not yet available for this airdrop.</p>
          <p className="text-xs text-gray-600 mt-1">Run the analysis from the admin panel to generate insights.</p>
        </div>
      )}

      <AgieIntelligenceDashboard airdrop={airdrop} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <IntelligenceRadar airdrop={airdrop} />
        <IntelligenceSourcePanel airdrop={airdrop} />
        <EvidencePanel airdrop={airdrop} />
        <AgieStrengthsPanel airdrop={airdrop} />
        <ThreatIntelligencePanel airdrop={airdrop} />
        <MissingIntelligencePanel airdrop={airdrop} />
      </div>

      <ProjectTimelinePanel airdrop={airdrop} />

      {/* Six reasoning sections */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4.5 h-4.5 text-neon-purple" style={{ width: '18px', height: '18px' }} />
          <h2 className="text-base font-semibold text-white">AI Reasoning</h2>
        </div>
        <p className="text-xs text-gray-600 mb-4">Based on on-chain data, project signals, and historical patterns.</p>

        <AnalysisSection
          icon={Zap} iconCls="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
          label="Reward Potential" badge={rewardBadge} badgeCls={rewardBadgeCls}
          detail={rewardDetail} sub={rewardSub}
        />
        <AnalysisSection
          icon={Target} iconCls="bg-sky-500/10 border border-sky-500/20 text-sky-400"
          label="Effort Required" badge={effortBadge} badgeCls={effortBadgeCls}
          detail={effortDetail} sub={effortSub}
        />
        <AnalysisSection
          icon={ShieldAlert} iconCls="bg-amber-500/10 border border-amber-500/20 text-amber-400"
          label="Risk Level" badge={riskBadge} badgeCls={riskBadgeCls}
          detail={riskDetail} sub={riskSub}
        />
        <AnalysisSection
          icon={Timer} iconCls="bg-orange-500/10 border border-orange-500/20 text-orange-400"
          label="Time Sensitivity" badge={timeBadge} badgeCls={timeBadgeCls}
          detail={timeDetail} sub={timeSub}
        />
        <AnalysisSection
          icon={Building2} iconCls="bg-violet-500/10 border border-violet-500/20 text-violet-400"
          label="Project Strength" badge={strengthBadge} badgeCls={strengthBadgeCls}
          detail={strengthDetail}
        />
      </div>

      {/* Final Verdict */}
      <div className={cn(
        'glass-card p-6 border',
        rec === 'act'          ? 'border-emerald-500/20 bg-emerald-500/[0.03]' :
        rec === 'watch'        ? 'border-amber-500/20 bg-amber-500/[0.03]'    :
        rec === 'needs_review' ? 'border-sky-500/20 bg-sky-500/[0.03]'        :
                                 'border-rose-500/20 bg-rose-500/[0.03]'
      )}>
        <div className="flex items-center gap-2 mb-3">
          <Flame className={cn('w-4.5 h-4.5', recMeta.cls.split(' ')[0])} style={{ width: '18px', height: '18px' }} />
          <h2 className="text-base font-semibold text-white">Final Verdict</h2>
        </div>
        <div className="flex items-center gap-3 mb-4">
          <span className={cn('text-lg font-bold border rounded-xl px-4 py-1.5 flex items-center gap-2', recMeta.cls)}>
            <span className={cn('w-2.5 h-2.5 rounded-full', recMeta.dot)} />
            {recMeta.label}
          </span>
        </div>
        <p className="text-sm text-gray-400 leading-relaxed mb-5">
          {rec === 'act'
            ? `${airdrop.name} presents a compelling opportunity. The combination of ${airdrop.reward_potential.toLowerCase()} reward potential, ${airdrop.risk_level.toLowerCase()} risk, and ${airdrop.difficulty.toLowerCase()} effort makes this worth acting on promptly.`
            : rec === 'watch'
            ? `${airdrop.name} has merit but mixed signals. Keep it on your radar — if key conditions improve (project activity, confirmed rewards, lower risk), it could become worth pursuing.`
            : rec === 'needs_review'
            ? `${airdrop.name} has been imported but not yet human-verified. Reward details, deadline, or tasks may still be missing. Check back after our team has reviewed this listing.`
            : `${airdrop.name} does not meet our threshold for a strong recommendation at this time. The risk-to-reward ratio or effort required makes it a lower priority compared to alternatives.`
          }
        </p>

        {/* Why this verdict */}
        {(airdrop.score_reasons?.length || pros.length > 0 || cons.length > 0) && (
          <div className="border-t border-white/5 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Why this verdict?</p>

            {/* AI-generated score reasons take precedence */}
            {airdrop.score_reasons && airdrop.score_reasons.length > 0 ? (
              <ul className="space-y-1.5">
                {airdrop.score_reasons.map(r => (
                  <li key={r} className="flex items-start gap-2 text-xs text-gray-400">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-sky-500/60 shrink-0" />
                    {r}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pros.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-xs font-semibold text-emerald-400">Working in its favour</span>
                    </div>
                    <ul className="space-y-1.5">
                      {pros.map(p => (
                        <li key={p} className="flex items-start gap-2 text-xs text-gray-400">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-emerald-500/60 shrink-0" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {cons.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-xs font-semibold text-amber-400">Worth noting</span>
                    </div>
                    <ul className="space-y-1.5">
                      {cons.map(c => (
                        <li key={c} className="flex items-start gap-2 text-xs text-gray-400">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-500/60 shrink-0" />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <p className="text-[10px] text-gray-700 mt-4">
              AI analysis is not financial advice. Always DYOR before connecting a wallet.
            </p>
          </div>
        )}
      </div>

      {/* Trust score + breakdown card */}
      {airdrop.trust_score !== null && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Trust Score</span>
              <span className="text-xs text-gray-700">Rule-based scoring</span>
            </div>
            <span className={cn(
              'text-sm font-bold tabular-nums',
              airdrop.trust_score >= 75 ? 'text-emerald-400' :
              airdrop.trust_score >= 50 ? 'text-amber-400' : 'text-rose-400'
            )}>
              {airdrop.trust_score}<span className="text-gray-600 font-normal text-xs">/100</span>
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-dark-700 overflow-hidden mb-4">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700',
                airdrop.trust_score >= 75 ? 'bg-emerald-500' :
                airdrop.trust_score >= 50 ? 'bg-amber-500' : 'bg-rose-500'
              )}
              style={{ width: `${airdrop.trust_score}%` }}
            />
          </div>
          {airdrop.sub_scores && (() => {
            const RULES: { key: string; label: string; max: number }[] = [
              { key: 'website',       label: 'Website',       max: 10 },
              { key: 'docs',          label: 'Docs',          max: 12 },
              { key: 'twitter',       label: 'Twitter/X',     max: 8  },
              { key: 'discord',       label: 'Discord',       max: 6  },
              { key: 'telegram',      label: 'Telegram',      max: 4  },
              { key: 'github',        label: 'GitHub',        max: 8  },
              { key: 'github_active', label: 'GitHub Active', max: 10 },
              { key: 'team_info',     label: 'Team Info',     max: 8  },
              { key: 'funding',       label: 'Funding',       max: 12 },
              { key: 'testnet',       label: 'Testnet',       max: 8  },
              { key: 'tasks',         label: 'Tasks',         max: 8  },
              { key: 'pre_token',     label: 'Pre-Token',     max: 6  },
            ];
            const isRuleBased = RULES.some(r => r.key in airdrop.sub_scores!);
            if (!isRuleBased) return null;
            return (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3 border-t border-white/5">
                {RULES.map(r => {
                  const earned: number = airdrop.sub_scores![r.key] ?? 0;
                  const pct = Math.round((earned / r.max) * 100);
                  const color = earned > 0 ? 'text-emerald-400' : 'text-gray-600';
                  const bar   = earned > 0 ? 'bg-emerald-500' : 'bg-dark-500';
                  return (
                    <div key={r.key} className="bg-dark-700/40 rounded-xl p-2.5">
                      <div className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">{r.label}</div>
                      <div className={cn('text-sm font-bold tabular-nums', color)}>
                        {earned}<span className="text-[10px] text-gray-700 font-normal">/{r.max}</span>
                      </div>
                      <div className="mt-1.5 h-1 rounded-full bg-dark-600 overflow-hidden">
                        <div className={cn('h-full rounded-full', bar)} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}



function getReadableDate(value: unknown): string {
  if (typeof value !== 'string' || !value) return 'Not recorded';
  try {
    return formatDate(value);
  } catch {
    return value.split('T')[0] || 'Not recorded';
  }
}

function getReadingTime(airdrop: AirdropWithTasks): string {
  const text = [
    airdrop.ai_summary,
    airdrop.overview,
    airdrop.why_airdrop,
    airdrop.ai_risk_analysis,
    airdrop.ai_reward_estimate,
    ...(airdrop.score_reasons ?? []),
    ...(airdrop.tasks ?? []).map(task => `${task.title} ${task.description ?? ''}`),
  ].filter(Boolean).join(' ');

  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(3, Math.ceil(words / 220));
  return `${minutes} min read`;
}

function KeyFactsBar({
  airdrop,
  days,
  oppScore,
  completionPct,
}: {
  airdrop: AirdropWithTasks;
  days: number | null;
  oppScore: number;
  completionPct: number;
}) {
  const metrics = getDisplayAgieMetrics(airdrop, oppScore);
  const anyAirdrop = airdrop as AnyAirdrop;
  const updated = getReadableDate(anyAirdrop.updated_at || anyAirdrop.last_reviewed_at || anyAirdrop.created_at);
  const deadline = days !== null && days > 0 ? `${days}d left` : airdrop.expiry_date ? formatDate(airdrop.expiry_date) : 'Open';

  const facts = [
    { label: 'AI Rating', value: `${metrics.overall}/100`, tone: scoreClass(metrics.overall), sub: scoreTone(metrics.overall).label },
    { label: 'Opportunity', value: `${oppScore}/100`, tone: oppScore >= 68 ? 'text-emerald-400' : oppScore >= 45 ? 'text-amber-400' : 'text-rose-400', sub: 'Airdrop priority' },
    { label: 'Risk', value: airdrop.risk_level, tone: airdrop.risk_level === 'Low' ? 'text-emerald-400' : airdrop.risk_level === 'Medium' ? 'text-amber-400' : 'text-rose-400', sub: 'User exposure' },
    { label: 'Difficulty', value: airdrop.difficulty, tone: 'text-sky-300', sub: 'Task effort' },
    { label: 'Reward', value: airdrop.estimated_reward || 'TBA', tone: 'text-neon-green', sub: airdrop.reward_potential },
    { label: 'Deadline', value: deadline, tone: days !== null && days <= 7 && days > 0 ? 'text-orange-400' : 'text-gray-300', sub: 'Timing' },
    { label: 'Task Progress', value: `${completionPct}%`, tone: completionPct === 100 ? 'text-emerald-400' : 'text-neon-purple', sub: `${airdrop.tasks.length} task${airdrop.tasks.length !== 1 ? 's' : ''}` },
    { label: 'Last Updated', value: updated, tone: 'text-gray-300', sub: getReadingTime(airdrop) },
  ];

  return (
    <section className="mb-8 rounded-3xl border border-white/10 bg-white/[0.025] p-3 sm:p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-neon-purple">Research Snapshot</p>
          <p className="mt-1 text-xs text-gray-600">Fast read before opening the full report.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] text-gray-500">
          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-emerald-400">Human review layer</span>
          <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-1 text-sky-300">Wallet safety reminder</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {facts.map((fact) => (
          <div key={fact.label} className="rounded-2xl border border-white/5 bg-dark-700/35 px-3 py-3">
            <div className="mb-1 truncate text-[9px] font-bold uppercase tracking-wider text-gray-600">{fact.label}</div>
            <div className={cn('truncate text-sm font-black leading-tight', fact.tone)}>{fact.value}</div>
            <div className="mt-1 truncate text-[9px] text-gray-700">{fact.sub}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ResearchTabNav({
  tabs,
  activeTab,
  setActiveTab,
  completionPct,
}: {
  tabs: { key: Tab; label: string; icon: React.ReactNode }[];
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  completionPct: number;
}) {
  return (
    <div id="airdrop-tabs" className="sticky top-20 z-30 mb-8 rounded-3xl border border-white/10 bg-dark-950/95 p-2 shadow-lg shadow-black/20 backdrop-blur-md">
      <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex min-h-[44px] shrink-0 items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold transition-colors',
              activeTab === tab.key
                ? 'bg-neon-purple text-white shadow-lg shadow-neon-purple/15'
                : 'text-gray-500 hover:bg-white/[0.05] hover:text-white'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}

        <div className="ml-auto hidden shrink-0 items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-2 lg:flex">
          <div className="text-right">
            <div className="text-[9px] uppercase tracking-wider text-gray-600">Research progress</div>
            <div className="text-xs font-bold text-gray-300">{completionPct}% tasks complete</div>
          </div>
          <div className="h-2 w-24 overflow-hidden rounded-full bg-dark-700">
            <div className="h-full rounded-full bg-gradient-to-r from-neon-purple to-neon-blue" style={{ width: `${completionPct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function TrustProofPanel({ airdrop }: { airdrop: AirdropWithTasks }) {
  const anyAirdrop = airdrop as AnyAirdrop;
  const updated = getReadableDate(anyAirdrop.updated_at || anyAirdrop.last_reviewed_at || anyAirdrop.created_at);
  const proofs = [
    { label: 'AI-assisted analysis', text: 'Signals are structured into reputation, risk, evidence and airdrop confidence.' },
    { label: 'Human review layer', text: airdrop.human_verified ? 'This listing is marked human verified.' : 'Listings can be reviewed by AirdropGuard before being promoted.' },
    { label: 'Official-link caution', text: 'Always use official channels and never share seed phrases or private keys.' },
    { label: 'Freshness signal', text: `Listing last updated: ${updated}.` },
  ];

  return (
    <section className="glass-card border-emerald-500/10 p-6">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-emerald-400" />
          <h2 className="text-base font-semibold text-white">Why trust this AirdropGuard report?</h2>
        </div>
        <span className="w-fit rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
          Check Before You Connect
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {proofs.map((proof) => (
          <div key={proof.label} className="rounded-2xl border border-white/5 bg-dark-700/35 p-4">
            <div className="mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <h3 className="text-xs font-bold text-white">{proof.label}</h3>
            </div>
            <p className="text-xs leading-relaxed text-gray-500">{proof.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function MobileAirdropActionBar({
  airdrop,
  days,
  oppScore,
  bookmarked,
  onBookmark,
  onTasksClick,
}: {
  airdrop: AirdropWithTasks;
  days: number | null;
  oppScore: number;
  bookmarked: boolean;
  onBookmark: () => void;
  onTasksClick: () => void;
}) {
  const scoreTone = oppScore >= 68 ? 'text-emerald-400' : oppScore >= 45 ? 'text-amber-400' : 'text-rose-400';

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-dark-950/95 px-3 py-3 shadow-2xl shadow-black/80 backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-lg items-center gap-2">
        <div className="min-w-[74px] rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-center">
          <div className={cn('text-lg font-black tabular-nums leading-none', scoreTone)}>{oppScore}</div>
          <div className="mt-0.5 text-[9px] uppercase tracking-wider text-gray-600">Score</div>
        </div>

        <button
          type="button"
          onClick={onTasksClick}
          className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl bg-neon-purple px-4 py-3 text-sm font-bold text-white shadow-lg shadow-neon-purple/15"
        >
          <ListChecks className="h-4 w-4" />
          Tasks
          {airdrop.tasks.length > 0 && <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px]">{airdrop.tasks.length}</span>}
        </button>

        {airdrop.website_url ? (
          <a
            href={airdrop.website_url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-sm font-bold text-sky-300"
          >
            <ExternalLink className="h-4 w-4" />
            Site
          </a>
        ) : (
          <Link
            to="/wallet-checker"
            className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-sm font-bold text-sky-300"
          >
            <ShieldAlert className="h-4 w-4" />
            Wallet
          </Link>
        )}

        <button
          type="button"
          onClick={onBookmark}
          className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-gray-300"
          aria-label={bookmarked ? `Remove ${airdrop.name} from bookmarks` : `Bookmark ${airdrop.name}`}
        >
          {bookmarked ? <BookmarkCheck className="h-5 w-5 text-neon-purple" /> : <Bookmark className="h-5 w-5" />}
        </button>
      </div>
      <div className="mx-auto mt-2 max-w-lg text-center text-[10px] text-gray-600">
        {days !== null && days > 0 ? `${days} days left` : 'Check official links before connecting'} • Never share seed phrases
      </div>
    </div>
  );
}

export default function AirdropDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [airdrop, setAirdrop] = useState<AirdropWithTasks | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [completions, setCompletions] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  useEffect(() => {
    if (!slug) return;
    async function load() {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('airdrops')
        .select('*, airdrop_tasks(*)')
        .eq('slug', slug!)
        .eq('published', true)
        .eq('review_status', 'approved')
        .eq('is_demo', false)
        .maybeSingle();

      if (err) {
        setError(err.message);
      } else if (!data) {
        setError('Airdrop not found.');
      } else {
        const sorted = {
          ...data,
          tasks: [...(data.airdrop_tasks ?? [])].sort((a, b) => a.sort_order - b.sort_order),
        };
        setAirdrop(sorted);
        setBookmarked(isBookmarked(data.id));
        setCompletions(getCompletions(data.id));
        document.title = `${data.name} Airdrop — Airdrop Guard`;
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  useEffect(() => {
    if (!airdrop) return;

    window.dispatchEvent(new CustomEvent('ag:copilot-context', {
      detail: {
        context: `Airdrop detail page for ${airdrop.name}. Use its trust score, risk level, reward estimate and checklist tasks when answering.`,
      },
    }));
  }, [airdrop]);

  function handleBookmark() {
    if (!airdrop) return;
    toggleBookmark(airdrop.id);
    setBookmarked(prev => !prev);
  }

  function handleToggleTask(taskId: string) {
    if (!airdrop) return;
    toggleCompletion(airdrop.id, taskId);
    setCompletions(getCompletions(airdrop.id));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] gap-3 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading airdrop...</span>
      </div>
    );
  }

  if (error || !airdrop) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <AlertCircle className="w-10 h-10 text-rose-400" />
        <p className="text-gray-400 text-sm">{error ?? 'Airdrop not found.'}</p>
        <Link to="/" className="text-sm text-neon-purple hover:text-neon-purple/80 transition-colors flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to all airdrops
        </Link>
      </div>
    );
  }

  const days = daysUntil(airdrop.expiry_date);
  const taskIds = airdrop.tasks.map(t => t.id);
  const completionPct = getCompletionPercent(airdrop.id, taskIds);
  const oppScore  = getOpportunityScore(airdrop);
  const rec       = getAirdropRecommendation(airdrop);
  const recMeta   = getRecommendationMeta(rec);
  const shouldSummary = getShouldIBotherSummary(airdrop, rec);
  const pros      = getWhyWeLikeIt(airdrop);
  const cons      = getThingsToConsider(airdrop);

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <FileText className="w-3.5 h-3.5" /> },
    { key: 'tasks', label: `Tasks (${airdrop.tasks.length})`, icon: <ListChecks className="w-3.5 h-3.5" /> },
    { key: 'analysis', label: 'AI Analysis', icon: <BarChart3 className="w-3.5 h-3.5" /> },
  ];
  const pageUrl = `https://airdropguard.com/airdrop/${airdrop.slug}`;

  const pageDescription =
    airdrop.ai_summary ||
    `Research the ${airdrop.name} airdrop with AirdropGuard intelligence, trust signals, risk level, reward potential and task guidance.`;

  const airdropSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        '@id': `${pageUrl}#article`,
        headline: `${airdrop.name} Airdrop Guide`,
        description: pageDescription,
        url: pageUrl,
        image: airdrop.logo_url || 'https://airdropguard.com/airdrop_guards.png',
        author: {
          '@type': 'Organization',
          name: 'AirdropGuard',
          url: 'https://airdropguard.com',
        },
        publisher: {
          '@type': 'Organization',
          name: 'AirdropGuard',
          logo: {
            '@type': 'ImageObject',
            url: 'https://airdropguard.com/airdrop_guards.png',
          },
        },
        mainEntityOfPage: pageUrl,
        articleSection: 'Crypto Airdrops',
        keywords: [
          airdrop.name,
          airdrop.ticker,
          'crypto airdrop',
          'airdrop guide',
          'airdrop safety',
          ...(airdrop.blockchain || []),
        ].filter(Boolean),
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${pageUrl}#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: 'https://airdropguard.com/',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Airdrops',
            item: 'https://airdropguard.com/',
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: airdrop.name,
            item: pageUrl,
          },
        ],
      },
    ],
  };
  return (
  <>
    <SEO
      title={`${airdrop.name} Airdrop Guide | AirdropGuard`}
      description={pageDescription}
      canonical={pageUrl}
      image={airdrop.logo_url || "https://airdropguard.com/airdrop_guards.png"}
      schema={airdropSchema}
    />

    <div className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 sm:py-10 lg:px-8 lg:pb-12">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1.5 overflow-hidden text-xs text-gray-600 sm:mb-6">
        <Link to="/" className="hover:text-gray-400 transition-colors flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> All Airdrops
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-gray-500">{airdrop.name}</span>
      </nav>

      {/* Hero card */}
      <div className="glass-card mb-6 overflow-hidden p-4 sm:mb-8 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:gap-6">
          {/* Logo */}
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-neon-purple/20 to-neon-blue/20 flex items-center justify-center sm:h-24 sm:w-24">
            {airdrop.logo_url ? (
              <img src={airdrop.logo_url} alt={`${airdrop.name} logo`} width={96} height={96} loading="eager" fetchPriority="high" decoding="async" className="h-full w-full rounded-2xl object-cover" />
            ) : (
              <span className="text-4xl font-bold gradient-text">{airdrop.name.charAt(0)}</span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h1 className="text-2xl font-black leading-tight text-white sm:text-4xl">{airdrop.name}</h1>
                  {airdrop.ticker && (
                    <span className="text-sm font-bold font-mono text-neon-purple bg-neon-purple/10 border border-neon-purple/25 rounded-lg px-2 py-0.5 tracking-wider">
                      ${airdrop.ticker}
                    </span>
                  )}
                  {airdrop.trust_score !== null && (
                    <TrustScoreBadge score={airdrop.trust_score} size="lg" />
                  )}
                  {airdrop.human_verified && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-2 py-0.5">
                      <UserCheck className="w-3 h-3" />
                      Human Verified
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={cn('badge border text-xs', getStatusColor(airdrop.status))}>
                    {airdrop.status}
                  </span>
                  {airdrop.blockchain.map(b => (
                    <span key={b} className="badge bg-dark-600/60 text-gray-400 border border-white/8 text-xs">{b}</span>
                  ))}
                  {airdrop.category.map(c => (
                    <span key={c} className="badge bg-dark-600/60 text-gray-500 border border-white/8 text-xs">{c}</span>
                  ))}
                </div>
              </div>

              <button
                onClick={handleBookmark}
                className="hidden min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-gray-400 transition-colors hover:border-neon-purple/30 hover:text-neon-purple sm:flex"
                aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark'}
              >
                {bookmarked
                  ? <BookmarkCheck className="w-5 h-5 text-neon-purple" />
                  : <Bookmark className="w-5 h-5" />
                }
              </button>
            </div>

            <p className="mb-5 text-sm leading-relaxed text-gray-400 sm:text-base">{airdrop.ai_summary || `Research ${airdrop.name} with AirdropGuard intelligence, trust signals, task guidance and wallet safety reminders.`}</p>

            {/* Metric pills */}
            <div className="flex flex-wrap gap-3 mb-5">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-xs text-gray-500">Reward</span>
                <span className={cn('badge border text-xs', getRewardColor(airdrop.reward_potential))}>
                  {airdrop.reward_potential}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-xs text-gray-500">Risk</span>
                <span className={cn('badge border text-xs', getRiskColor(airdrop.risk_level))}>
                  {airdrop.risk_level}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">Difficulty</span>
                <span className={cn('badge border text-xs', getDifficultyColor(airdrop.difficulty))}>
                  {airdrop.difficulty}
                </span>
              </div>
              {airdrop.estimated_reward && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">Est. Reward</span>
                  <span className="text-xs font-semibold text-neon-green">{airdrop.estimated_reward}</span>
                </div>
              )}
              {days !== null && days > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Clock className="w-3.5 h-3.5" />
                  {days} days left — ends {formatDate(airdrop.expiry_date)}
                </div>
              )}
            </div>

            {/* Social links */}
            <div className="flex items-center gap-2 flex-wrap">
              {airdrop.website_url && (
                <a href={airdrop.website_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white glass border border-white/10 rounded-lg px-3 py-1.5 hover:border-white/20 transition-colors">
                  <Globe className="w-3.5 h-3.5" /> Website
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              )}
              {airdrop.twitter_url && (
                <a href={airdrop.twitter_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-neon-blue glass border border-white/10 rounded-lg px-3 py-1.5 hover:border-neon-blue/30 transition-colors">
                  <Twitter className="w-3.5 h-3.5" /> Twitter
                </a>
              )}
              {airdrop.discord_url && (
                <a href={airdrop.discord_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-neon-purple glass border border-white/10 rounded-lg px-3 py-1.5 hover:border-neon-purple/30 transition-colors">
                  <MessageCircle className="w-3.5 h-3.5" /> Discord
                </a>
              )}
              {airdrop.telegram_url && (
                <a href={airdrop.telegram_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-neon-blue glass border border-white/10 rounded-lg px-3 py-1.5 hover:border-neon-blue/30 transition-colors">
                  <Send className="w-3.5 h-3.5" /> Telegram
                </a>
              )}
              {airdrop.github_url && (
                <a href={airdrop.github_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white glass border border-white/10 rounded-lg px-3 py-1.5 hover:border-white/20 transition-colors">
                  <Github className="w-3.5 h-3.5" /> GitHub
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Market data — only shown when an official token contract exists */}
        {airdrop.contract_address && hasOfficialTokenEvidence(airdrop) && (
          <MarketDataRow
            contractAddress={airdrop.contract_address}
            blockchain={airdrop.blockchain as string[]}
            ticker={airdrop.ticker || undefined}
            name={airdrop.name}
          />
        )}
      </div>

      <KeyFactsBar airdrop={airdrop} days={days} oppScore={oppScore} completionPct={completionPct} />

      <AgieCommandCenter airdrop={airdrop} opportunityScore={oppScore} recommendationLabel={recMeta.label} />

      {/* Research navigation */}
      <ResearchTabNav
        tabs={TABS}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        completionPct={completionPct}
      />

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-slide-up">

          {/* ── Should I Bother? ───────────────────────────────────────────── */}
          <div className="glass-card p-6 border-neon-purple/15">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-neon-purple" />
              <h2 className="text-base font-semibold text-white">Should I Bother?</h2>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Score */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-center">
                  <div className={cn('text-4xl font-bold tabular-nums leading-none',
                    oppScore >= 68 ? 'text-emerald-400' : oppScore >= 45 ? 'text-amber-400' : 'text-rose-400'
                  )}>
                    {oppScore}
                  </div>
                  <div className="text-[10px] text-gray-600 mt-0.5 uppercase tracking-wider">Opportunity</div>
                </div>
                <div className="w-px h-10 bg-white/10" />
                <span className={cn('text-sm font-bold border rounded-xl px-3 py-1.5 flex items-center gap-1.5', recMeta.cls)}>
                  <span className={cn('w-2 h-2 rounded-full inline-block', recMeta.dot)} />
                  {recMeta.label}
                </span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed capitalize-first">{shouldSummary}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="xl:col-span-2 space-y-5">
              <ProfessionalVerdictPanel airdrop={airdrop} opportunityScore={oppScore} recLabel={recMeta.label} />
              <ProjectTimelinePanel airdrop={airdrop} />
            </div>
            <div className="space-y-5">
              <IntelligenceRadar airdrop={airdrop} />
              <ThreatIntelligencePanel airdrop={airdrop} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <IntelligenceSourcePanel airdrop={airdrop} />
            <AnalystNextSteps airdrop={airdrop} />
          </div>

          {/* ── Why We Like It + Things To Consider ───────────────────────── */}
          {(pros.length > 0 || cons.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {pros.length > 0 && (
                <div className="glass-card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <ThumbsUp className="w-4 h-4 text-emerald-400" />
                    <h2 className="text-sm font-semibold text-white">Why We Like It</h2>
                  </div>
                  <ul className="space-y-2">
                    {pros.map(p => (
                      <li key={p} className="flex items-start gap-2 text-xs text-gray-400">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {cons.length > 0 && (
                <div className="glass-card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <h2 className="text-sm font-semibold text-white">Things To Consider</h2>
                  </div>
                  <ul className="space-y-2">
                    {cons.map(c => (
                      <li key={c} className="flex items-start gap-2 text-xs text-gray-400">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {airdrop.overview && (
            <div className="glass-card p-6">
              <h2 className="text-base font-semibold text-white mb-4">About {airdrop.name}</h2>
              <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap">{airdrop.overview}</p>
            </div>
          )}
          {airdrop.why_airdrop && (
            <div className="glass-card p-6">
              <h2 className="text-base font-semibold text-white mb-4">Why This Airdrop?</h2>
              <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap">{airdrop.why_airdrop}</p>
            </div>
          )}
          <div className="glass-card p-6">
            <h2 className="text-base font-semibold text-white mb-4">Quick Facts</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: 'Time Required', value: airdrop.time_required || 'N/A' },
                { label: 'Expiry', value: formatDate(airdrop.expiry_date) },
                { label: 'Est. Reward', value: airdrop.estimated_reward || 'TBA' },
              ].map(item => (
                <div key={item.label} className="bg-dark-700/40 rounded-xl p-3">
                  <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">{item.label}</div>
                  <div className="text-sm font-semibold text-white">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <CommunityResults airdropId={airdrop.id} />

          {/* Wallet Safety Snapshot */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <ShieldAlert className="w-5 h-5 text-sky-400" />
              <h2 className="text-base font-semibold text-white">Wallet Safety Snapshot</h2>
            </div>
            <WalletSafetySnapshot />
          </div>

          <TrustProofPanel airdrop={airdrop} />
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="space-y-4 animate-slide-up">
          {/* Progress bar */}
          {airdrop.tasks.length > 0 && (
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-white">Your Progress</h2>
                <span className="text-sm font-bold text-neon-purple">{completionPct}%</span>
              </div>
              <div className="h-2 rounded-full bg-dark-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-neon-purple to-neon-blue transition-all duration-500"
                  style={{ width: `${completionPct}%` }}
                />
              </div>
              <p className="text-xs text-gray-600 mt-2">
                {completions.length} of {airdrop.tasks.length} tasks completed
              </p>
            </div>
          )}

          {airdrop.tasks.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <p className="text-gray-500 text-sm">No tasks added yet.</p>
            </div>
          ) : (
            airdrop.tasks.map((task, index) => {
              const done = completions.includes(task.id);
              return (
                <button
                  key={task.id}
                  onClick={() => handleToggleTask(task.id)}
                  className={cn(
                    'w-full glass-card p-4 sm:p-5 flex items-start gap-4 text-left transition-all min-h-[72px]',
                    done ? 'border-emerald-500/20 bg-emerald-500/5' : 'hover:border-white/10'
                  )}
                >
                  <div className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors',
                    done ? 'bg-emerald-500/20 text-emerald-400' : 'bg-dark-600/80 text-gray-600'
                  )}>
                    {done
                      ? <CheckSquare className="w-4 h-4" />
                      : <Square className="w-4 h-4" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] text-gray-600 font-mono">STEP {index + 1}</span>
                    </div>
                    <h3 className={cn('text-sm font-semibold mb-1', done ? 'text-emerald-400 line-through' : 'text-white')}>
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="text-xs text-gray-500 leading-relaxed">{task.description}</p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'analysis' && (
        <AnalysisTab airdrop={airdrop} pros={pros} cons={cons} />
      )}
    </div>

    <MobileAirdropActionBar
      airdrop={airdrop}
      days={days}
      oppScore={oppScore}
      bookmarked={bookmarked}
      onBookmark={handleBookmark}
      onTasksClick={() => setActiveTab('tasks')}
    />
    </>
  );
}