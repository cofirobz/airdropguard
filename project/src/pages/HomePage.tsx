import { useCallback, useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  Bot,
  Brain,
  CheckCircle2,
  ChevronDown,
  CheckSquare,
  Clock,
  Flame,
  Grid3X3,
  Layers3,
  Loader2,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Users,
  Wallet,
} from 'lucide-react';
import AiOrb from '../components/AiOrb';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Airdrop, OpportunityTypeKey } from '../lib/types';
import AirdropCard from '../components/AirdropCard';
import CommunityResults from '../components/CommunityResults';
import FeaturedSpotlight from '../components/FeaturedSpotlight';
import FilterBar, { type Filters } from '../components/FilterBar';
import NewsletterSection from '../components/NewsletterSection';
import SEO from '../components/SEO';
import SocialLinksStrip from '../components/SocialLinksStrip';
import AffiliatePlacementCta from '../components/AffiliatePlacementCta';
import { openCopilotWithPrompt } from '../lib/copilot';
import { canonicalFromPath, homeSeoTitle } from '../lib/seo';
import { daysUntil, isMainAirdropListing, isSpeculativeTokenListing, getOpportunityTypeKey } from '../lib/utils';

const DEFAULT_FILTERS: Filters = {
  search: '',
  blockchain: '',
  category: '',
  reward: '',
  risk: '',
  difficulty: '',
  opportunityType: '',
  sortBy: 'highest_score',
};

const INITIAL_VISIBLE_AIRDROPS = 6;
const LOAD_MORE_AIRDROPS = 6;

type OpportunitySectionConfig = {
  key: OpportunityTypeKey;
  label: string;
  description: string;
  sectionClassName: string;
  badgeClassName: string;
};

const OPPORTUNITY_SECTION_CONFIGS: OpportunitySectionConfig[] = [
  {
    key: 'confirmed_airdrop',
    label: 'Confirmed Airdrops',
    description: 'Officially confirmed token or claim opportunities that users can actively work on now.',
    sectionClassName: 'border-emerald-500/20 bg-emerald-500/[0.04]',
    badgeClassName: 'border-emerald-400/35 bg-emerald-500/12 text-emerald-100',
  },
  {
    key: 'potential_airdrop',
    label: 'Potential Airdrops',
    description: 'Not officially confirmed yet. These are watchlist opportunities with early positioning potential.',
    sectionClassName: 'border-amber-500/20 bg-amber-500/[0.04]',
    badgeClassName: 'border-amber-400/35 bg-amber-500/12 text-amber-100',
  },
  {
    key: 'points_program',
    label: 'Points Programs',
    description: 'Campaigns focused on points or credits that may convert into rewards later.',
    sectionClassName: 'border-sky-500/20 bg-sky-500/[0.04]',
    badgeClassName: 'border-sky-400/35 bg-sky-500/12 text-sky-100',
  },
  {
    key: 'rewards_program',
    label: 'Rewards Programs',
    description: 'Live incentive programs where users can earn ongoing rewards.',
    sectionClassName: 'border-violet-500/20 bg-violet-500/[0.04]',
    badgeClassName: 'border-violet-400/35 bg-violet-500/12 text-violet-100',
  },
  {
    key: 'testnet',
    label: 'Testnet Opportunities',
    description: 'Testnet-focused tasks and campaigns where rewards are possible but never guaranteed.',
    sectionClassName: 'border-cyan-500/20 bg-cyan-500/[0.04]',
    badgeClassName: 'border-cyan-400/35 bg-cyan-500/12 text-cyan-100',
  },
  {
    key: 'scam_alert',
    label: 'Scam Alerts',
    description: 'Flagged high-risk listings. Review for awareness only and do not connect wallets.',
    sectionClassName: 'border-rose-500/35 bg-rose-500/[0.08]',
    badgeClassName: 'border-rose-400/45 bg-rose-600/20 text-rose-100',
  },
];

type Tab = 'all' | 'trending' | 'ending' | 'featured';
type ShowcaseTab = 'dashboard' | 'wallet' | 'copilot';

type CounterItem = {
  label: string;
  value: number;
  suffix?: string;
  sub: string;
};

const ENGINE_BOOT_STEPS = [
  'Initialising AI Engine...',
  'Contract analysed',
  'Community analysed',
  'Risk model completed',
  'Human review verified',
  'AI Confidence calculated',
] as const;

const ENGINE_STATUS_CHIPS: Array<{
  label: 'Verified' | 'Under Review' | 'Scam Alert' | 'Need Review';
  tone: string;
}> = [
  { label: 'Verified', tone: 'border-emerald-300/25 bg-emerald-500/10 text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.12)]' },
  { label: 'Under Review', tone: 'border-cyan-300/25 bg-cyan-500/10 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.12)]' },
  { label: 'Scam Alert', tone: 'border-rose-300/25 bg-rose-500/10 text-rose-100 shadow-[0_0_18px_rgba(244,63,94,0.12)]' },
  { label: 'Need Review', tone: 'border-amber-300/25 bg-amber-500/10 text-amber-100 shadow-[0_0_18px_rgba(245,158,11,0.12)]' },
];

type LeadOpportunity = {
  title: string;
  item: Airdrop | null;
  label: string;
  tone: string;
  detail: string;
};

type BannerPlacement = 'homepage_hero' | 'homepage_mid' | 'sidebar' | 'footer' | 'recommended_tools';
type BannerStatus = 'draft' | 'live' | 'scheduled' | 'expired' | 'disabled';

type HomepageBanner = {
  id: string;
  projectName: string;
  placement: BannerPlacement;
  destinationUrl: string;
  bannerImageUrl: string;
  altText: string;
  startDate: string | null;
  endDate: string | null;
  status: BannerStatus;
  createdAt: string;
  updatedAt: string;
};

function parseBannerPlacement(value: string): BannerPlacement {
  if (value === 'homepage_mid') return 'homepage_mid';
  if (value === 'sidebar') return 'sidebar';
  if (value === 'footer') return 'footer';
  if (value === 'recommended_tools') return 'recommended_tools';
  return 'homepage_hero';
}

function parseBannerStatus(value: string): BannerStatus {
  if (value === 'live') return 'live';
  if (value === 'scheduled') return 'scheduled';
  if (value === 'expired') return 'expired';
  if (value === 'disabled') return 'disabled';
  return 'draft';
}

function toDateOnlyKey(value: string | null | undefined): string | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const direct = raw.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(direct)) return direct;

  const parsed = new Date(raw);
  if (!Number.isFinite(parsed.getTime())) return null;

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function todayDateOnlyKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isBannerActiveToday(banner: HomepageBanner, placement: BannerPlacement): boolean {
  if (banner.placement !== placement) return false;
  if (banner.status !== 'live') return false;
  if (!banner.bannerImageUrl.trim() || !banner.destinationUrl.trim()) return false;
  if (!isValidHttpUrl(banner.bannerImageUrl) || !isValidHttpUrl(banner.destinationUrl)) return false;

  const today = todayDateOnlyKey();
  const startKey = toDateOnlyKey(banner.startDate);
  const endKey = toDateOnlyKey(banner.endDate);

  if (startKey && startKey > today) return false;
  if (endKey && endKey < today) return false;
  return true;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function safeDisplayCount(value: number, suffix = ''): string {
  return value > 0 ? `${value.toLocaleString()}${suffix}` : 'Growing daily';
}

function parseRewardScore(value: string | null | undefined): number {
  if (!value) return 0;

  const normalized = value.toLowerCase().replace(/[$,]/g, '');
  const matches = normalized.match(/\d+(?:\.\d+)?(?:k)?/g);
  if (!matches) return 0;

  const scores = matches.map((part) => {
    const numeric = Number.parseFloat(part.replace('k', ''));
    return Number.isFinite(numeric) ? numeric * (part.includes('k') ? 1000 : 1) : 0;
  });

  return Math.max(...scores, 0);
}

function TrustRing({ score, label = 'confidence' }: { score: number | null; label?: string }) {
  const pct = Math.max(0, Math.min(100, score ?? 0));
  const size = 86;
  const stroke = 8;
  const radius = (size - stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);

  return (
    <div className="flex w-[94px] shrink-0 flex-col items-center text-center">
      <div className="relative flex h-[86px] w-[86px] items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-cyan-400/18 blur-md animate-pulse" />
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="relative z-10">
          <defs>
            <linearGradient id="trust-ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22D3EE" />
              <stop offset="55%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>
          </defs>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={stroke} />
          {pct > 0 && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="url(#trust-ring-gradient)"
              strokeWidth={stroke}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 0.95s cubic-bezier(0.22, 1, 0.36, 1)' }}
            />
          )}
          <circle cx={size / 2} cy={size / 2} r={20} fill="rgba(5,8,22,0.92)" stroke="rgba(255,255,255,0.14)" />
          <text x="50%" y="53%" textAnchor="middle" className="fill-white text-[17px] font-black" dominantBaseline="middle">
            {pct > 0 ? pct : '—'}
          </text>
        </svg>
      </div>
      <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-100">{label}</span>
    </div>
  );
}

function ConversionBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/20 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-semibold text-cyan-100">
      <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 animate-pulse" />
      {children}
    </span>
  );
}

function CopilotCta({
  prompt,
  context,
  className,
  children,
}: {
  prompt: string;
  context: string;
  className: string;
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  if (!user) {
    return (
      <Link to="/auth" className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => openCopilotWithPrompt(prompt, context)}
      className={className}
    >
      {children}
    </button>
  );
}

function OutcomeCard({ icon: Icon, title, body, tone }: { icon: React.ComponentType<{ className?: string }>; title: string; body: string; tone: string }) {
  return (
    <div className="glass-card rounded-[28px] border border-white/10 p-5">
      <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border ${tone}`}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-5 text-lg font-black text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-400">{body}</p>
    </div>
  );
}

function OpportunityCard({ item, title, label, tone, detail }: LeadOpportunity) {
  const daysLeft = item?.expiry_date ? daysUntil(item.expiry_date) : null;

  return (
    <Link
      to={item ? `/airdrop/${item.slug}` : '/auth'}
      className="group rounded-[28px] border border-white/10 bg-white/[0.03] p-4 transition-transform transition-colors hover:-translate-y-0.5 hover:bg-white/[0.06]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200">{title}</div>
          <div className="mt-2 text-base font-black text-white">{item?.name ?? 'Growing daily'}</div>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${tone}`}>{label}</span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <TrustRing score={item?.trust_score ?? null} />
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-[0.16em] text-gray-500">Trust score</div>
            <div className="text-sm font-bold text-white">{item?.trust_score ?? 'TBA'}</div>
            <div className="text-xs text-gray-400">{detail}</div>
          </div>
        </div>

        <div className="text-right text-xs text-gray-400">
          <div className="text-[10px] uppercase tracking-[0.16em] text-gray-500">Reward</div>
          <div className="mt-1 font-semibold text-emerald-300">{item?.estimated_reward ?? 'Forecasting'}</div>
          <div className="mt-1 text-gray-500">{daysLeft !== null ? (daysLeft === 0 ? '< 1 day' : `${daysLeft}d left`) : 'Updated daily'}</div>
        </div>
      </div>
    </Link>
  );
}

function HeroMockup({ item, projects }: { item: Airdrop | null; projects: Airdrop[] }) {
  const safeProjects = useMemo(() => {
    const seen = new Set<string>();
    const combined = [item, ...projects].filter(Boolean) as Airdrop[];
    return combined.filter((project) => {
      const key = project.slug || project.name;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 5);
  }, [item, projects]);

  const [bootPhase, setBootPhase] = useState(0);
  const [bootComplete, setBootComplete] = useState(false);

  useEffect(() => {
    const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      setBootPhase(ENGINE_BOOT_STEPS.length - 1);
      setBootComplete(true);
      return;
    }

    const timers = [0, 650, 1300, 1950, 2600, 3250].map((delay, index) => window.setTimeout(() => {
      setBootPhase(index);
      if (index === ENGINE_BOOT_STEPS.length - 1) setBootComplete(true);
    }, delay));

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const currentProject = safeProjects[Math.min(bootPhase, safeProjects.length - 1)] ?? item;
  const projectName = currentProject?.name ?? 'Watching live opportunities';
  const projectChain = currentProject?.blockchain?.[0] ?? item?.blockchain?.[0] ?? 'Chain';
  const confidenceScore = currentProject?.trust_score ?? item?.trust_score ?? 92;
  const reviewStatus = currentProject?.risk_level === 'High'
    ? 'Scam Alert'
    : currentProject?.listing_state === 'verified' || currentProject?.human_verified
      ? 'Verified'
      : 'Under Review';
  const progressRows = [
    { label: 'Project Signal', percent: bootPhase >= 0 ? 100 : 0, tone: 'from-cyan-400 to-blue-500' },
    { label: 'Contract Analysis', percent: bootPhase >= 1 ? 92 : 0, tone: 'from-sky-400 to-cyan-400' },
    { label: 'Community Signals', percent: bootPhase >= 2 ? 98 : 0, tone: 'from-violet-400 to-fuchsia-400' },
    { label: 'Human Review', percent: bootPhase >= 3 ? 100 : 0, tone: 'from-emerald-400 to-teal-400' },
    { label: 'AI Confidence', percent: bootPhase >= 5 ? confidenceScore : 0, tone: 'from-amber-400 to-orange-400' },
  ];

  return (
    <div className="relative overflow-hidden rounded-[34px] border border-cyan-400/20 bg-[linear-gradient(160deg,rgba(6,16,34,0.98),rgba(4,10,24,0.99))] p-4 shadow-[0_24px_60px_rgba(3,8,24,0.55),0_0_40px_rgba(34,211,238,0.12)] sm:p-5">
      <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-cyan-400/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-12 bottom-0 h-40 w-40 rounded-full bg-violet-500/15 blur-3xl" />

      <div className="relative flex items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200">AI Security Engine</div>
          <div className="mt-1 text-lg font-black text-white">Trust intelligence core</div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
          AI Ready
        </span>
      </div>

      <div className="relative mt-4 grid gap-4">
        <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,17,34,0.9),rgba(5,10,24,0.98))] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.16em] text-gray-500">Engine boot</div>
              <div className={`mt-1 text-xl font-black text-white transition-opacity duration-300 ${bootComplete ? 'opacity-100' : 'opacity-95'}`}>
                {ENGINE_BOOT_STEPS[bootPhase]}
              </div>
              <div className="mt-1 text-sm text-gray-300">AI scoring plus human review, with no wallet connection required.</div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-500/10">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-200/30 bg-[radial-gradient(circle,rgba(34,211,238,0.28),rgba(8,18,42,0.92))] shadow-[0_0_18px_rgba(34,211,238,0.18)]">
                <ShieldCheck className="h-4.5 w-4.5 text-cyan-100" />
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            {progressRows.map((row) => (
              <div key={row.label} className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
                <div className="flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                  <span>{row.label}</span>
                  <span className="text-gray-300">{row.label === 'AI Confidence' ? `${row.percent}%` : `${row.percent}%`}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800/80">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${row.tone} transition-[width,opacity] duration-700 ease-out`}
                    style={{ width: `${row.percent}%`, opacity: row.percent > 0 ? 1 : 0.18 }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
              <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Project focus</div>
              <div className="mt-1 text-sm font-black text-white">{projectName}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
              <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Review status</div>
              <div className="mt-1 text-sm font-black text-white">{reviewStatus}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
              <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Network</div>
              <div className="mt-1 text-sm font-black text-white">{projectChain}</div>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            {ENGINE_STATUS_CHIPS.map((chip) => (
              <span
                key={chip.label}
                className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold tracking-[0.12em] ${chip.tone} ${chip.label === reviewStatus ? 'ring-1 ring-white/10' : 'opacity-75'}`}
              >
                {chip.label}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-2 text-[10px] text-gray-300 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
            <div className="uppercase tracking-[0.14em] text-gray-500">Reward context</div>
            <div className="mt-1 truncate text-sm font-black text-emerald-300">{currentProject?.estimated_reward ?? item?.estimated_reward ?? 'Forecasting daily'}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
            <div className="uppercase tracking-[0.14em] text-gray-500">Time required</div>
            <div className="mt-1 text-sm font-black text-white">{currentProject?.time_required ?? item?.time_required ?? 'TBA'}</div>
          </div>
        </div>

        {safeProjects.length > 1 && (
          <div className="flex flex-wrap gap-2 text-[10px] font-semibold">
            {safeProjects.map((project) => {
              const active = project.name === projectName;
              return (
                <span
                  key={project.slug || project.name}
                  className={`rounded-full border px-2.5 py-1 transition-colors ${active ? 'border-cyan-300/35 bg-cyan-500/12 text-cyan-100 shadow-[0_0_14px_rgba(34,211,238,0.12)]' : 'border-white/10 bg-white/[0.04] text-gray-400'}`}
                >
                  {project.name}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function QuickMetrics({ counters }: { counters: CounterItem[] }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {counters.map((item) => (
          <div key={item.label} className="rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-4 backdrop-blur">
            <div className="text-xs uppercase tracking-[0.16em] text-gray-500">{item.label}</div>
            <div className="mt-2 text-2xl font-black text-white">{item.value.toLocaleString()}{item.suffix ?? ''}</div>
            <div className="mt-2 text-xs leading-relaxed text-gray-400">{item.sub}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function LiveOpportunitiesSection({ airdrops }: { airdrops: Airdrop[] }) {
  const trend = [...airdrops].find((item) => item.is_trending) ?? null;
  const highestTrust = [...airdrops].sort((a, b) => (b.trust_score ?? 0) - (a.trust_score ?? 0))[0] ?? null;
  const endingSoon = [...airdrops]
    .filter((item) => item.expiry_date)
    .sort((a, b) => new Date(a.expiry_date ?? '').getTime() - new Date(b.expiry_date ?? '').getTime())[0] ?? null;
  const biggestReward = [...airdrops]
    .filter((item) => item.estimated_reward)
    .sort((a, b) => parseRewardScore(b.estimated_reward) - parseRewardScore(a.estimated_reward))[0] ?? null;

  const opportunities: LeadOpportunity[] = [
    { title: 'Trending Today', item: trend ?? highestTrust, label: trend ? 'Momentum' : 'Growing daily', tone: 'border-cyan-300/25 bg-cyan-500/10 text-cyan-100', detail: 'What the community is watching.' },
    { title: 'Highest Trust Score', item: highestTrust, label: 'Trust first', tone: 'border-emerald-300/25 bg-emerald-500/10 text-emerald-100', detail: 'Best confidence signal on the board.' },
    { title: 'Ending Soon', item: endingSoon, label: 'Act now', tone: 'border-amber-300/25 bg-amber-500/10 text-amber-100', detail: 'Fastest decisions need clarity.' },
    { title: 'Biggest Estimated Reward', item: biggestReward, label: 'Reward focus', tone: 'border-violet-300/25 bg-violet-500/10 text-violet-100', detail: 'Forecasts where the upside is highest.' },
  ];

  return (
    <section id="live-opportunities" className="defer-render mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">Live opportunities</div>
          <h2 className="mt-2 text-2xl font-black text-white sm:text-4xl">Active proof the platform is working</h2>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-gray-400">
          See what is moving right now before you spend time in the wrong place.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {opportunities.map((opportunity) => (
          <OpportunityCard key={opportunity.title} {...opportunity} />
        ))}
      </div>
    </section>
  );
}

function WhySection() {
  const cards = [
    {
      icon: Activity,
      title: 'Risk Radar preview',
      body: 'Project signal, contract risk, community activity, human review and AI confidence in one glance.',
      tone: 'border-cyan-300/20 bg-cyan-500/10 text-cyan-100',
    },
    {
      icon: CheckCircle2,
      title: 'Before you connect',
      body: 'No wallet connection. No seed phrases. Check the link, the chain and the review state first.',
      tone: 'border-emerald-300/20 bg-emerald-500/10 text-emerald-100',
    },
    {
      icon: AlertCircle,
      title: 'Why most lists fail',
      body: 'They chase volume, bury risk and make you click before you understand what is actually live.',
      tone: 'border-rose-300/20 bg-rose-500/10 text-rose-100',
    },
    {
      icon: Users,
      title: 'For hunters, projects and builders',
      body: 'Hunters get faster prioritisation. Projects get safer review. Builders get a cleaner trust layer.',
      tone: 'border-violet-300/20 bg-violet-500/10 text-violet-100',
    },
    {
      icon: ShieldCheck,
      title: 'Verified by AirdropGuard',
      body: 'AI scoring plus human review keeps the platform protective, useful and easy to trust.',
      tone: 'border-sky-300/20 bg-sky-500/10 text-sky-100',
    },
  ];

  return (
    <section className="defer-render mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">Trust layer</div>
          <h2 className="mt-2 text-2xl font-black text-white sm:text-4xl">A premium airdrop safety screen</h2>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-gray-400">
          Every block on this page exists to create trust, curiosity and healthy urgency without fake stats or hype.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="glass-card rounded-[28px] border border-white/10 p-5">
              <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border ${card.tone}`}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-black text-white">{card.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">{card.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function HomepageHowItWorksSection() {
  const steps = [
    'Browse verified projects',
    'Let AI prioritise them',
    'Complete missions',
    'Track rewards',
  ];

  return (
    <section className="defer-render mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">How it works</div>
          <h2 className="mt-2 text-2xl font-black text-white sm:text-4xl">A simple 4-step flow</h2>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-gray-400">
          The product should feel guided, not overwhelming.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {steps.map((step, index) => (
          <div key={step} className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-300/20 bg-sky-500/10 text-sm font-black text-sky-100">
              0{index + 1}
            </div>
            <h3 className="mt-4 text-lg font-black text-white">{step}</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-400">
              {index === 0 && 'Start with a short scan of live listings.'}
              {index === 1 && 'AI ranks trust, reward and effort.'}
              {index === 2 && 'Complete the best-fit tasks first.'}
              {index === 3 && 'Keep a simple record of progress and value.'}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CopilotPreviewSection() {
  return (
    <section className="defer-render mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="grid gap-4 lg:grid-cols-[0.94fr_1.06fr] lg:items-stretch">
        <div className="rounded-[30px] border border-violet-300/20 bg-[linear-gradient(160deg,rgba(139,92,246,0.12),rgba(6,10,22,0.96))] p-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-100">
            <AiOrb className="h-4 w-4" />
            AirdropGuard AI
          </div>
          <h2 className="mt-4 text-2xl font-black text-white sm:text-4xl">Ask the copilot what to do next.</h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-300">
            It gives a clear next move, not generic chatbot noise.
          </p>
          <CopilotCta
            prompt="What should I focus on next on AirdropGuard?"
            context="Homepage Copilot preview section. Give a direct short plan for what to do next."
            className="mt-5 inline-flex min-h-[46px] items-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 transition-colors hover:bg-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100 focus-visible:ring-offset-2 focus-visible:ring-offset-[#061025]"
          >
            Ask AirdropGuard AI
            <ArrowRight className="h-4 w-4" />
          </CopilotCta>
        </div>

        <div className="rounded-[30px] border border-white/10 bg-[#0b1224]/92 p-5">
          <div className="space-y-3">
            <div className="flex justify-end">
              <div className="max-w-[82%] rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-medium text-white">
                I only have 20 minutes today.
              </div>
            </div>
            <div className="flex justify-start">
              <div className="max-w-[90%] rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-relaxed text-gray-200">
                Focus on your safest high-potential opportunities first. I’ll prioritise projects by trust, reward potential and time required.
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {['Trust first', 'Reward forecast', 'Time aware'].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-center text-xs font-semibold text-white">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HomepageTrustSection({ counters }: { counters: CounterItem[] }) {
  return (
    <section className="defer-render mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">Social proof</div>
          <h2 className="mt-2 text-2xl font-black text-white sm:text-4xl">Trust signals users can scan fast</h2>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-gray-400">
          Metrics are visible, simple and honest so visitors know why AirdropGuard is worth returning to.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {counters.map((item) => (
          <div key={item.label} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
            <div className="text-xs uppercase tracking-[0.16em] text-gray-500">{item.label}</div>
            <div className="mt-2 text-2xl font-black text-white">{item.value > 0 ? `${item.value.toLocaleString()}${item.suffix ?? ''}` : 'Growing daily'}</div>
            <div className="mt-2 text-xs leading-relaxed text-gray-400">{item.sub}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FreeVsProSection() {
  return (
    <section className="defer-render mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">Free vs Pro</div>
          <h2 className="mt-2 text-2xl font-black text-white sm:text-4xl">Start free, upgrade when you need more depth</h2>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-gray-400">
          Give users a low-friction entry point, then show them what becomes available when they want better prioritisation.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[30px] border border-white/10 bg-white/[0.03] p-5">
          <div className="text-sm font-bold text-white">Free</div>
          <ul className="mt-4 space-y-3 text-sm text-gray-300">
            <li>Browse verified airdrops</li>
            <li>Basic trust insights</li>
            <li>Community results</li>
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/auth" className="inline-flex min-h-[46px] items-center justify-center rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-bold text-slate-950 transition-colors hover:bg-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100 focus-visible:ring-offset-2 focus-visible:ring-offset-[#061025]">
              Start Free
            </Link>
            <Link to="/auth" className="inline-flex min-h-[46px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-white/[0.08]">
              Upgrade Later
            </Link>
          </div>
        </div>

        <div className="rounded-[30px] border border-cyan-400/20 bg-[linear-gradient(160deg,rgba(34,211,238,0.08),rgba(6,10,22,0.96))] p-5">
          <div className="text-sm font-bold text-white">Pro</div>
          <ul className="mt-4 space-y-3 text-sm text-gray-200">
            <li>AI Mission Control</li>
            <li>Priority alerts</li>
            <li>Advanced wallet intelligence</li>
            <li>Deeper opportunity insights</li>
          </ul>
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-gray-300">
            Built for users who want clearer decisions and less noise.
          </div>
        </div>
      </div>
    </section>
  );
}

function HomepageFinalCtaSection() {
  return (
    <section className="defer-render mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_24%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.14),transparent_24%),linear-gradient(180deg,#09111e_0%,#040814_100%)] px-5 py-10 text-center sm:px-10 sm:py-14">
        <div className="mx-auto max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">Final step</div>
          <h2 className="mt-4 text-3xl font-black text-white sm:text-5xl">Your next airdrop could be worth hundreds - don&apos;t waste time on the wrong ones.</h2>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/auth" className="inline-flex min-h-[50px] items-center justify-center rounded-2xl bg-cyan-500 px-6 py-3 text-sm font-black text-white transition-colors hover:bg-cyan-400">
              Create Free Account
            </Link>
            <a href="#airdrops" className="inline-flex min-h-[50px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] px-6 py-3 text-sm font-black text-white transition-colors hover:bg-white/[0.08]">
              Browse Verified Airdrops
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function isFeaturedPlacement(airdrop: Airdrop): boolean {
  const anyAirdrop = airdrop as Airdrop & { is_sponsored?: boolean };
  return Boolean(airdrop.is_featured || anyAirdrop.is_sponsored);
}

function useCountUp(target: number, duration = 1100) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frameId = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [target, duration]);

  return value;
}

function CounterCard({ item }: { item: CounterItem }) {
  const value = useCountUp(item.value);

  return (
    <div className="glass-card rounded-3xl border border-white/10 p-6">
      <div className="text-4xl font-black tracking-tight text-white sm:text-5xl">
        {value.toLocaleString()}
        {item.suffix ?? ''}
      </div>
      <div className="mt-2 text-sm font-semibold text-white">{item.label}</div>
      <div className="mt-2 text-xs leading-relaxed text-gray-500">{item.sub}</div>
    </div>
  );
}

function MobileActionCards() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-4 md:hidden">
      <div className="grid gap-3 sm:grid-cols-2">
        <CopilotCta
          prompt="What is the best next move for me from the homepage?"
          context="Homepage mobile quick action card. Give practical next steps and include safety checks."
          className="rounded-[28px] border border-cyan-400/20 bg-[linear-gradient(160deg,rgba(34,211,238,0.12),rgba(15,23,42,0.96))] p-4 shadow-[0_0_24px_rgba(34,211,238,0.08)]"
        >
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Bot className="h-4 w-4 text-cyan-300" />
            Ask AI
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-gray-300">Get a fast recommendation before you spend time or connect anywhere.</p>
        </CopilotCta>

        <Link to="/wallet-checker" className="rounded-[28px] border border-sky-500/20 bg-[linear-gradient(160deg,rgba(14,165,233,0.1),rgba(15,23,42,0.96))] p-4 shadow-[0_0_24px_rgba(56,189,248,0.08)]">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Wallet className="h-4 w-4 text-sky-300" />
            Wallet Check
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-gray-300">Read-only wallet safety and readiness in one quick scan.</p>
        </Link>
      </div>
    </section>
  );
}

function TodaysBestOpportunityCard({ airdrop }: { airdrop: Airdrop | null }) {
  if (!airdrop) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pb-4 md:hidden">
      <div className="overflow-hidden rounded-[30px] border border-cyan-400/15 bg-[linear-gradient(155deg,rgba(8,145,178,0.14),rgba(6,10,24,0.98)_42%,rgba(17,24,39,0.96)_100%)] p-4 shadow-[0_0_28px_rgba(34,211,238,0.08)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">Today&apos;s Best Opportunity</div>
            <h2 className="mt-1 text-lg font-black text-white">{airdrop.name}</h2>
          </div>
          <div className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
            Trust {airdrop.trust_score ?? 'TBA'}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] text-gray-300">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
            <div className="text-gray-500">Risk</div>
            <div className="mt-1 font-semibold text-white">{airdrop.risk_level}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
            <div className="text-gray-500">Reward</div>
            <div className="mt-1 truncate font-semibold text-white">{airdrop.estimated_reward || 'TBA'}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
            <div className="text-gray-500">Time</div>
            <div className="mt-1 font-semibold text-white">{airdrop.time_required || 'TBA'}</div>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <Link
            to={`/airdrop/${airdrop.slug}`}
            className="inline-flex min-h-[46px] flex-1 items-center justify-center rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-500/15"
          >
            Open report
          </Link>
          <CopilotCta
            prompt={`Is ${airdrop.name} worth my time right now?`}
            context={`Homepage mobile best opportunity card for ${airdrop.name}. Explain trust, risk, reward, and safest next action.`}
            className="inline-flex min-h-[46px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-bold text-white"
          >
            Ask AI
          </CopilotCta>
        </div>
      </div>
    </section>
  );
}

function MobileInfoAccordions() {
  const items = [
    {
      title: 'What is AirdropGuard?',
      body: 'AirdropGuard helps you spot verified airdrops, review risk and decide faster without digging through scattered threads and docs.',
    },
    {
      title: 'How it works',
      body: 'Browse live listings, filter what fits your risk level, open a project, then use trust signals, tasks and AI guidance before acting.',
    },
    {
      title: 'Why trust it?',
      body: 'Listings combine AI research, human review, trust scoring and safer wallet workflows so important signals appear before hype.',
    },
    {
      title: 'Is it safe?',
      body: 'AirdropGuard never asks for your seed phrase. Wallet Intelligence is read-only and the platform surfaces risk warnings before you connect elsewhere.',
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 pb-4 md:hidden">
      <div className="space-y-3">
        {items.map(item => (
          <details key={item.title} className="group rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-white">
              {item.title}
              <ChevronDown className="h-4 w-4 shrink-0 text-gray-500 transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-3 text-xs leading-relaxed text-gray-400">{item.body}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function HeroSection({
  loading,
  stats,
  featured,
  topVerified,
}: {
  loading: boolean;
  stats: { analysed: number; verified: number; aiAnalyses: number };
  featured: Airdrop | null;
  topVerified: Airdrop[];
}) {
  const previewRows = topVerified.slice(0, 3);

  return (
    <section className="relative overflow-hidden border-b border-cyan-500/10 bg-[radial-gradient(circle_at_8%_8%,rgba(34,211,238,0.22),transparent_26%),radial-gradient(circle_at_88%_14%,rgba(59,130,246,0.22),transparent_24%),linear-gradient(180deg,#030712_0%,#061025_52%,#040a17_100%)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-8 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute -right-20 top-20 h-72 w-72 rounded-full bg-blue-500/25 blur-3xl" />
      </div>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 pb-6 pt-6 sm:px-6 sm:pb-14 sm:pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 lg:pb-20">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/35 bg-cyan-400/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-100 sm:text-xs">
            <Sparkles className="h-3.5 w-3.5" />
            Premium AI Airdrop Safety
          </div>

          <h1 className="mt-4 max-w-3xl text-[1.9rem] font-black leading-[0.95] tracking-tight text-white sm:mt-6 sm:text-5xl lg:text-6xl">
            Check every airdrop before you connect.
          </h1>

          <p className="mt-3 max-w-xl text-sm font-medium text-gray-200 sm:mt-5 sm:text-lg">
            AI scoring plus human review. No wallet connection required. Spot risk before you waste time or click the wrong link.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:mt-6 sm:flex sm:flex-wrap sm:gap-2.5">
            {[
              { label: 'No wallet connection', tone: 'border-cyan-300/35 bg-cyan-400/10 text-cyan-100' },
              { label: 'Never asks for seed phrases', tone: 'border-emerald-300/35 bg-emerald-400/10 text-emerald-100' },
              { label: 'AI scoring + human review', tone: 'border-blue-300/35 bg-blue-400/10 text-blue-100' },
              { label: 'Built for hunters, projects, builders', tone: 'border-violet-300/35 bg-violet-400/10 text-violet-100' },
            ].map(item => (
              <span key={item.label} className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${item.tone}`}>
                {item.label}
              </span>
            ))}
          </div>

          <div className="mt-5 grid gap-2 sm:mt-7 sm:grid-cols-3">
            <Link
              to="/wallet-checker"
              className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-6 py-3 text-sm font-black text-white shadow-[0_12px_26px_rgba(34,211,238,0.26)] transition-colors hover:bg-cyan-400"
            >
              Scan an Airdrop
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#airdrops"
              className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.06] px-6 py-3 text-sm font-bold text-white backdrop-blur transition-colors hover:bg-white/[0.1]"
            >
              Browse Verified Airdrops
            </a>
            <Link
              to="/submit"
              className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-2xl border border-emerald-300/25 bg-emerald-500/10 px-6 py-3 text-sm font-bold text-emerald-100 transition-colors hover:bg-emerald-500/18"
            >
              Submit for Review
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 sm:hidden">
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2">
              <div className="text-base font-black text-white">{stats.analysed}</div>
              <div className="text-[10px] uppercase tracking-[0.15em] text-gray-500">Tracked</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2">
              <div className="text-base font-black text-white">{stats.verified}</div>
              <div className="text-[10px] uppercase tracking-[0.15em] text-gray-500">Verified</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2">
              <div className="text-base font-black text-white">{stats.aiAnalyses}</div>
              <div className="text-[10px] uppercase tracking-[0.15em] text-gray-500">AI Scored</div>
            </div>
          </div>
        </div>

        <div className="relative z-10 lg:block">
          <div className="rounded-[30px] border border-cyan-300/20 bg-[linear-gradient(150deg,rgba(6,12,28,0.95),rgba(5,16,36,0.94)_48%,rgba(9,10,28,0.94))] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_24px_56px_rgba(15,23,42,0.6),0_0_40px_rgba(34,211,238,0.12)] backdrop-blur-xl sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-200">Intelligence core</div>
                <div className="mt-1 text-sm font-black text-white sm:text-base">Today&apos;s security engine</div>
              </div>
              {featured && <div className="rounded-full border border-white/15 bg-white/[0.05] px-2.5 py-1 text-[10px] font-semibold text-gray-200">Featured: {featured.name}</div>}
            </div>

            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-5 text-sm text-gray-400">
                Loading live opportunities...
              </div>
            ) : (
              <div className="space-y-2.5">
                {previewRows.map((airdrop, index) => (
                  <Link key={airdrop.id} to={`/airdrop/${airdrop.slug}`} className="block rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 transition-colors hover:bg-white/[0.08]">
                    <div className="flex items-center gap-3">
                      <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-300/25 bg-cyan-400/10 text-xs font-black text-cyan-100">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-white">{airdrop.name}</div>
                        <div className="mt-1 text-[11px] text-gray-400">Trust {airdrop.trust_score ?? 'Unknown'} • {airdrop.risk_level}</div>
                      </div>
                      <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-200">
                        {airdrop.listing_state === 'verified' || airdrop.human_verified ? 'Verified' : 'Review'}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function MeetAirdropGuardAI() {
  const cards = [
    {
      icon: Bot,
      title: 'Copilot Guidance',
      body: 'Ask what to focus on now. Get ranked next steps, not hype.',
      tone: 'border-cyan-300/25 bg-cyan-500/[0.08] text-cyan-100',
    },
    {
      icon: ShieldCheck,
      title: 'Human Verification',
      body: 'Listings are reviewed before trust labels are surfaced.',
      tone: 'border-emerald-300/25 bg-emerald-500/[0.08] text-emerald-100',
    },
    {
      icon: Wallet,
      title: 'Wallet Safety',
      body: 'Read-only wallet intelligence. Never your seed phrase.',
      tone: 'border-blue-300/25 bg-blue-500/[0.08] text-blue-100',
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 pb-8 pt-2 sm:px-6 lg:px-8 lg:pb-12">
      <div className="mb-4 sm:mb-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">Meet AirdropGuard AI</div>
        <h2 className="mt-2 text-2xl font-black text-white sm:text-4xl">Mission control for safer airdrop decisions</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        {cards.map(item => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4 backdrop-blur sm:p-5">
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border ${item.tone}`}>
                <Icon className="h-4 w-4" />
              </div>
              <h3 className="mt-4 text-lg font-black text-white">{item.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-gray-300 sm:text-sm">{item.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      icon: Search,
      title: 'Scan',
      desc: 'Browse live opportunities in one feed.',
    },
    {
      icon: Brain,
      title: 'Rank',
      desc: 'AI ranks risk, trust and effort in seconds.',
    },
    {
      icon: CheckSquare,
      title: 'Verify',
      desc: 'Human review confirms what deserves attention.',
    },
    {
      icon: Target,
      title: 'Execute',
      desc: 'Focus only on airdrops worth your time.',
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="mx-auto max-w-3xl text-center">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">How it works in 4 steps</div>
        <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">From signal to action in under a minute</h2>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.title} className="relative rounded-[24px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-400/25 bg-sky-500/10 text-sky-300">
                <Icon className="h-5 w-5" />
              </div>
              <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Step 0{index + 1}</div>
              <h3 className="mt-1 text-lg font-black text-white">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-300">{step.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TrendingTodaySection({ items }: { items: Airdrop[] }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">Trending today</div>
          <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">Live opportunities gaining momentum</h2>
        </div>
        <Link to="/?filter=trending" className="hidden rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08] sm:inline-flex">
          View all trending
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.slice(0, 6).map(item => (
          <Link key={item.id} to={`/airdrop/${item.slug}`} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4 backdrop-blur transition-colors hover:bg-white/[0.06]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-black text-white">{item.name}</h3>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-gray-300">
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-1">Trust {item.trust_score ?? 'Unknown'}</span>
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-1">{item.risk_level}</span>
                </div>
              </div>
              <Flame className="h-4 w-4 shrink-0 text-orange-300" />
            </div>
            <div className="mt-3 text-xs text-gray-400">{item.estimated_reward || 'Reward data updating'}</div>
          </Link>
        ))}
      </div>
      <div className="mt-3 sm:hidden">
        <Link to="/?filter=trending" className="inline-flex min-h-[46px] w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white">
          View all trending
        </Link>
      </div>
    </section>
  );
}

function WhyAirdropGuardSection() {
  const items = [
    {
      icon: Shield,
      title: 'AI Security Analysis',
      desc: 'Detect potential risks before connecting.',
      tone: 'border-rose-500/20 bg-rose-500/[0.06] text-rose-300',
    },
    {
      icon: Wallet,
      title: 'Wallet Intelligence',
      desc: 'Read-only wallet analysis.',
      tone: 'border-sky-500/20 bg-sky-500/[0.06] text-sky-300',
    },
    {
      icon: Bot,
      title: 'AirdropGuard Copilot',
      desc: 'Ask AI what deserves your time.',
      tone: 'border-violet-500/20 bg-violet-500/[0.06] text-violet-300',
    },
    {
      icon: ShieldCheck,
      title: 'Human Verification',
      desc: 'Every verified project is reviewed.',
      tone: 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-300',
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">Why AirdropGuard</div>
          <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">A premium research layer for crypto airdrops</h2>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-gray-400 sm:text-base">
          AirdropGuard is built to help users decide, not just scroll. It combines structured AI analysis, human review and safer wallet workflows into one platform.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {items.map(item => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="glass-card rounded-[28px] border border-white/10 p-6">
              <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border ${item.tone}`}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-6 text-lg font-black text-white">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-400">{item.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DashboardPreview({ airdrops, verifiedCount }: { airdrops: Airdrop[]; verifiedCount: number }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
      <div className="rounded-[28px] border border-white/10 bg-[#0c1428]/90 p-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300">Dashboard snapshot</div>
        <h3 className="mt-2 text-2xl font-black text-white">Priority intelligence</h3>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Verified listings</div>
            <div className="mt-2 text-3xl font-black text-white">{verifiedCount}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Live watchlist</div>
            <div className="mt-2 text-3xl font-black text-white">{Math.min(airdrops.length, 12)}</div>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4 text-sm text-gray-200">
          <span className="font-semibold text-white">Best use:</span> Start your day by checking verified opportunities, deadlines and trust changes before opening a new project.
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-[#0b1224]/92 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Top opportunities</div>
            <div className="mt-1 text-lg font-bold text-white">Today&apos;s shortlist</div>
          </div>
          <div className="rounded-full border border-sky-400/25 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold text-sky-200">
            AI ranked
          </div>
        </div>

        <div className="space-y-3">
          {airdrops.slice(0, 4).map((airdrop, index) => (
            <div key={airdrop.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-xs font-black text-white">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-white">{airdrop.name}</div>
                <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-gray-400">
                  <span>Trust {airdrop.trust_score ?? 'Unknown'}</span>
                  <span>Risk {airdrop.risk_level}</span>
                  <span>{airdrop.time_required || 'Time unknown'}</span>
                </div>
              </div>
              <div className="text-[11px] text-emerald-300">{airdrop.estimated_reward || 'Reward TBA'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WalletPreview() {
  const checks = [
    'Wallet Health grade and score',
    'Risk exposure and token hygiene',
    'Airdrop readiness signals',
    'No connection or signatures required',
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[0.88fr_1.12fr]">
      <div className="rounded-[28px] border border-sky-500/20 bg-[linear-gradient(160deg,rgba(14,165,233,0.08),rgba(7,11,24,0.96))] p-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-200">
          <Wallet className="h-3.5 w-3.5" />
          Read-only wallet intelligence
        </div>
        <h3 className="mt-4 text-2xl font-black text-white">Check your wallet safely</h3>
        <p className="mt-3 text-sm leading-relaxed text-gray-300">
          Review public activity, risk signals and readiness before you use a wallet for new campaigns.
        </p>
        <div className="mt-5 space-y-2">
          {checks.map(item => (
            <div key={item} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-gray-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-[#0b1224]/92 p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Wallet Intelligence preview</div>
            <div className="mt-1 text-lg font-bold text-white">Sample wallet report</div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-emerald-400">A</div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Example grade</div>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ['Wallet Health', '82/100'],
            ['Risk Exposure', 'Low'],
            ['Airdrop Readiness', 'Strong'],
            ['Wallet Profile', 'Research-ready'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">{label}</div>
              <div className="mt-2 text-base font-bold text-white">{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CopilotPreview() {
  return (
    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-[28px] border border-violet-500/20 bg-[linear-gradient(160deg,rgba(139,92,246,0.1),rgba(7,11,24,0.96))] p-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-200">
          <Bot className="h-3.5 w-3.5" />
          AirdropGuard Copilot
        </div>
        <h3 className="mt-4 text-2xl font-black text-white">A crypto research assistant, not a generic chatbot</h3>
        <p className="mt-3 text-sm leading-relaxed text-gray-300">
          Copilot uses AirdropGuard data first, highlights verified opportunities and explains why a project deserves your attention.
        </p>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-[#0b1224]/92 p-5">
        <div className="space-y-3">
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl bg-sky-500 px-4 py-3 text-sm text-white">
              What should I focus on today?
            </div>
          </div>
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-gray-200">
              <div className="font-semibold text-white">Top verified opportunity</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-300">
                <li>Prioritises strong Trust Score and lower visible risk.</li>
                <li>Uses estimated reward and time required where available.</li>
                <li>Recommends concrete next steps instead of generic advice.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LivePlatformSection({ airdrops, verifiedCount }: { airdrops: Airdrop[]; verifiedCount: number }) {
  const [activeTab, setActiveTab] = useState<ShowcaseTab>('dashboard');

  const tabs: { key: ShowcaseTab; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="h-4 w-4" /> },
    { key: 'wallet', label: 'Wallet Intelligence', icon: <Wallet className="h-4 w-4" /> },
    { key: 'copilot', label: 'Copilot', icon: <Bot className="h-4 w-4" /> },
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">Live platform</div>
          <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">See the platform before you sign in</h2>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-gray-400 sm:text-base">
          AirdropGuard brings your dashboard, wallet safety workflow and Copilot guidance together in one focused research experience.
        </p>
      </div>

      <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(160deg,rgba(7,11,24,0.95)_10%,rgba(8,14,34,0.96)_45%,rgba(12,9,35,0.96)_100%)] p-5 shadow-[0_0_36px_rgba(56,189,248,0.12)] sm:p-6">
        <div className="mb-6 flex flex-wrap gap-2">
          {tabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex min-h-[42px] items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition-colors ${activeTab === tab.key
                ? 'border border-sky-400/30 bg-sky-500/12 text-white'
                : 'border border-white/10 bg-white/[0.03] text-gray-400 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'dashboard' && <DashboardPreview airdrops={airdrops} verifiedCount={verifiedCount} />}
        {activeTab === 'wallet' && <WalletPreview />}
        {activeTab === 'copilot' && <CopilotPreview />}
      </div>
    </section>
  );
}

function TrustSection({ counters }: { counters: CounterItem[] }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="mx-auto max-w-3xl text-center">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">Trust metrics</div>
        <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">Evidence before hype</h2>
      </div>
      <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {counters.map(item => <CounterCard key={item.label} item={item} />)}
      </div>
    </section>
  );
}

function DeepDiveAccordions() {
  const items = [
    {
      title: 'Why this is safer than random X threads',
      body: 'AirdropGuard combines AI analysis with human verification, trust signals, and clear warnings before you leave for external links.',
    },
    {
      title: 'How trust score and risk are used together',
      body: 'Trust score measures project confidence signals; risk labels show potential downside. Use both together before taking action.',
    },
    {
      title: 'What Copilot actually does',
      body: 'Copilot summarizes platform context and recommends what to prioritize next based on trust, risk, reward and time required.',
    },
    {
      title: 'Wallet safety approach',
      body: 'Wallet intelligence stays read-only and educational. You should never share a seed phrase or private key with any service.',
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="mb-5">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">Need deeper explanation?</div>
        <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">Open the details</h2>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {items.map(item => (
          <details key={item.title} className="group rounded-[24px] border border-white/10 bg-white/[0.03] p-4 backdrop-blur">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-white">
              {item.title}
              <ChevronDown className="h-4 w-4 shrink-0 text-gray-500 transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-gray-300">{item.body}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function AudienceSection() {
  const personas = [
    ['Beginners', 'Start with verified listings, guided risk signals and read-only wallet checks.'],
    ['Advanced Farmers', 'Prioritise opportunities faster and spend time only where the edge is clearer.'],
    ['Content Creators', 'Turn structured platform intelligence into better explainers and updates.'],
    ['Researchers', 'Review trust, risk and opportunity context from one interface.'],
    ['Developers', 'Understand the platform quickly before exploring pricing or API surfaces.'],
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">Who it&apos;s for</div>
          <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">Designed for every level of crypto operator</h2>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-gray-400 sm:text-base">
          Whether you are just starting or running a deeper workflow, the platform is designed to surface what matters first.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        {personas.map(([title, desc]) => (
          <div key={title} className="glass-card rounded-[28px] border border-white/10 p-6">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sky-300">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="mt-5 text-lg font-black text-white">{title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-gray-400">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SocialProofSection({ featured, latestVerified }: { featured: Airdrop | null; latestVerified: Airdrop[] }) {
  const recentRewards = latestVerified.filter(item => item.estimated_reward).slice(0, 3);
  const activityFeed = latestVerified.slice(0, 4).map(item => ({
    title: item.name,
    detail: item.listing_state === 'verified' || item.human_verified
      ? 'Verified project available for review'
      : 'Under-review project added to the platform',
    timestamp: new Date(item.updated_at).toLocaleDateString(),
  }));

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">Social proof</div>
          <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">Live signals from the platform</h2>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-gray-400 sm:text-base">
          Show visitors that AirdropGuard is active, curated and focused on real platform intelligence, not just static listings.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-card rounded-[32px] border border-white/10 p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
            <Star className="h-4 w-4 text-sky-300" />
            Community Results
          </div>
          {featured ? (
            <CommunityResults airdropId={featured.id} />
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-10 text-center text-sm text-gray-400">
              Community reporting will appear here as soon as a featured listing is available.
            </div>
          )}
        </div>

        <div className="grid gap-5">
          <div className="glass-card rounded-[32px] border border-white/10 p-6">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
              <Target className="h-4 w-4 text-emerald-300" />
              Latest successful rewards
            </div>
            <div className="space-y-3">
              {recentRewards.length > 0 ? recentRewards.map(item => (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-white">{item.name}</div>
                    <div className="text-xs text-emerald-300">{item.estimated_reward}</div>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">Verified reward guidance from the listing page</div>
                </div>
              )) : (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-6 text-sm text-gray-400">
                  Estimated reward data is still being collected.
                </div>
              )}
            </div>
          </div>

          <div className="glass-card rounded-[32px] border border-white/10 p-6">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
              <ShieldCheck className="h-4 w-4 text-sky-300" />
              Latest verified projects
            </div>
            <div className="space-y-3">
              {latestVerified.slice(0, 3).map(item => (
                <Link key={item.id} to={`/airdrop/${item.slug}`} className="block rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 transition-colors hover:bg-white/[0.07]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-white">{item.name}</div>
                    <div className="text-xs text-sky-300">Trust {item.trust_score ?? 'Unknown'}</div>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">{item.blockchain.slice(0, 2).join(' • ') || 'Chain unknown'}</div>
                </Link>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-[32px] border border-white/10 p-6">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
              <Activity className="h-4 w-4 text-violet-300" />
              Recent platform activity
            </div>
            <div className="space-y-3">
              {activityFeed.map(item => (
                <div key={`${item.title}-${item.timestamp}`} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-sky-400" />
                  <div>
                    <div className="text-sm font-semibold text-white">{item.title}</div>
                    <div className="mt-1 text-xs text-gray-500">{item.detail}</div>
                    <div className="mt-2 text-[11px] text-gray-600">{item.timestamp}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCtaSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(139,92,246,0.18),transparent_24%),linear-gradient(180deg,#091224_0%,#0a1327_100%)] px-6 py-10 text-center sm:px-10 sm:py-14">
        <div className="mx-auto max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">Ready to Farm Smarter?</div>
          <h2 className="mt-4 text-3xl font-black text-white sm:text-5xl">Join AirdropGuard today.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-gray-300 sm:text-base">
            Create an account, explore verified projects and let Copilot help you decide where to spend your next hour.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/auth"
              className="inline-flex min-h-[50px] items-center justify-center rounded-2xl bg-sky-500 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-sky-400"
            >
              Create Free Account
            </Link>
            <a
              href="#airdrops"
              className="inline-flex min-h-[50px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/[0.08]"
            >
              Browse Verified Airdrops
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function SponsoredTransparencyNote() {
  return (
    <div className="mb-6 mt-3 flex flex-col gap-2 rounded-2xl border border-amber-500/15 bg-amber-500/[0.04] px-4 py-3 sm:flex-row sm:items-center sm:gap-3">
      <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
        <Star className="h-3.5 w-3.5 fill-current" />
        Featured placement
      </div>
      <p className="text-xs leading-relaxed text-gray-500">
        Featured listings may be paid placements, but they must still pass review. Paid placement never overrides risk warnings, trust signals, or human verification.
      </p>
    </div>
  );
}

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [airdrops, setAirdrops] = useState<Airdrop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_AIRDROPS);
  const [communityCount, setCommunityCount] = useState(0);
  const [walletCount, setWalletCount] = useState(0);
  const [homepageBanners, setHomepageBanners] = useState<HomepageBanner[]>([]);
  const [showOpportunityTypeGuide, setShowOpportunityTypeGuide] = useState(false);

  const tab = (searchParams.get('filter') as Tab) ?? 'all';

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_AIRDROPS);
  }, [tab, filters]);

  useEffect(() => {
    const activeFilters = [filters.blockchain, filters.category, filters.reward, filters.risk, filters.difficulty, filters.opportunityType]
      .filter(Boolean)
      .join(', ') || 'none';

    window.dispatchEvent(new CustomEvent('ag:copilot-context', {
      detail: {
        context: `Airdrop listings page. Tab ${tab}. Search: ${filters.search || 'none'}. Filters: ${activeFilters}.`,
      },
    }));
  }, [filters, tab]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      const [airdropsRes, communityRes, walletRes] = await Promise.all([
        supabase
          .from('airdrops')
          .select('*')
          .eq('published', true)
          .eq('review_status', 'approved')
          .eq('is_demo', false)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true }),
        supabase.from('airdrop_results').select('*', { count: 'exact', head: true }),
        supabase.from('wallet_scan_history').select('*', { count: 'exact', head: true }),
      ]);

      if (airdropsRes.error) {
        setError(airdropsRes.error.message);
      } else {
        setAirdrops(airdropsRes.data ?? []);
      }

      if (!communityRes.error) setCommunityCount(communityRes.count ?? 0);
      if (!walletRes.error) setWalletCount(walletRes.count ?? 0);
      setLoading(false);
    }

    load();
  }, []);

  useEffect(() => {
    async function loadBanners() {
      try {
        const { data, error } = await supabase
          .from('banner_ads')
          .select('id, project_name, placement, destination_url, banner_image_url, alt_text, start_date, end_date, status, created_at, updated_at')
          .in('placement', ['homepage_hero', 'homepage_mid', 'footer', 'recommended_tools'])
          .order('updated_at', { ascending: false });

        if (error) {
          console.error('[Banner][Home] failed homepage banner load', error);
          return;
        }

        const mapped = ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
          id: String(row.id ?? ''),
          projectName: String(row.project_name ?? ''),
          placement: parseBannerPlacement(String(row.placement ?? 'homepage_hero')),
          destinationUrl: String(row.destination_url ?? ''),
          bannerImageUrl: String(row.banner_image_url ?? ''),
          altText: String(row.alt_text ?? ''),
          startDate: row.start_date ? String(row.start_date) : null,
          endDate: row.end_date ? String(row.end_date) : null,
          status: parseBannerStatus(String(row.status ?? 'draft')),
          createdAt: String(row.created_at ?? ''),
          updatedAt: String(row.updated_at ?? ''),
        })) as HomepageBanner[];

        setHomepageBanners(mapped);
      } catch (error) {
        console.error('[Banner][Home] failed homepage banner load', error);
      }
    }

    loadBanners();
  }, []);

  const opportunityAirdrops = useMemo(
    () => airdrops.filter(item => isMainAirdropListing(item)),
    [airdrops],
  );

  const opportunityAndScamListings = useMemo(
    () => airdrops.filter(item => !isSpeculativeTokenListing(item)),
    [airdrops],
  );

  const speculativeTokens = useMemo(
    () => [...airdrops.filter(item => isSpeculativeTokenListing(item))].sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()),
    [airdrops],
  );

  const featured = useMemo(
    () =>
      opportunityAirdrops.find(
        a =>
          isFeaturedPlacement(a) &&
          (a.listing_state === 'verified' || a.human_verified) &&
          (a.trust_score === null || a.trust_score >= 60) &&
          a.risk_level !== 'High'
      ) ??
      opportunityAirdrops.find(
        a =>
          isFeaturedPlacement(a) &&
          a.risk_level !== 'High' &&
          (a.trust_score === null || a.trust_score >= 60)
      ) ??
      null,
    [opportunityAirdrops],
  );

  const verifiedProjects = useMemo(
    () => opportunityAirdrops.filter(item => item.listing_state === 'verified' || item.human_verified),
    [opportunityAirdrops],
  );

  const topVerified = useMemo(
    () => [...verifiedProjects].sort((a, b) => (b.trust_score ?? 0) - (a.trust_score ?? 0)),
    [verifiedProjects],
  );

  const filtered = useMemo(() => {
    let list = opportunityAndScamListings;

    if (tab === 'trending') list = list.filter(a => a.is_trending);
    else if (tab === 'ending') list = list.filter(a => a.status === 'Ending Soon');
    else if (tab === 'featured') list = list.filter(a => isFeaturedPlacement(a));

    if (filters.search) {
      const query = filters.search.toLowerCase();
      list = list.filter(a =>
        a.name.toLowerCase().includes(query) ||
        a.ticker?.toLowerCase().includes(query) ||
        a.ai_summary?.toLowerCase().includes(query),
      );
    }

    if (filters.blockchain) list = list.filter(a => a.blockchain.includes(filters.blockchain as never));
    if (filters.category) list = list.filter(a => a.category.includes(filters.category as never));
    if (filters.reward) list = list.filter(a => a.reward_potential === filters.reward);
    if (filters.risk) list = list.filter(a => a.risk_level === filters.risk);
    if (filters.difficulty) list = list.filter(a => a.difficulty === filters.difficulty);
    if (filters.opportunityType) {
      list = list.filter((item) => getOpportunityTypeKey(item) === filters.opportunityType);
    }

    const riskRank: Record<string, number> = { Low: 0, Medium: 1, High: 2 };
    const scoreRank = (item: Airdrop) => item.trust_score ?? 0;
    const activeRank = (item: Airdrop) => {
      const trendWeight = item.is_trending ? 1000 : 0;
      const updatedAt = new Date(item.updated_at ?? item.created_at ?? 0).getTime() || 0;
      return trendWeight + updatedAt;
    };

    list = [...list].sort((a, b) => {
      switch (filters.sortBy) {
        case 'newest':
          return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
        case 'lowest_risk':
          return riskRank[a.risk_level] - riskRank[b.risk_level] || scoreRank(b) - scoreRank(a);
        case 'most_active':
          return activeRank(b) - activeRank(a) || scoreRank(b) - scoreRank(a);
        case 'ending_soon':
          return new Date(a.expiry_date ?? '9999-12-31').getTime() - new Date(b.expiry_date ?? '9999-12-31').getTime();
        case 'highest_score':
        default:
          return scoreRank(b) - scoreRank(a) || new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
      }
    });

    return list;
  }, [opportunityAndScamListings, tab, filters]);

  const visibleAirdrops = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  );

  const visibleAirdropIndexes = useMemo(() => {
    const indexes = new Map<string, number>();
    visibleAirdrops.forEach((item, index) => indexes.set(item.id, index));
    return indexes;
  }, [visibleAirdrops]);

  const groupedVisibleAirdrops = useMemo(() => {
    const groups: Record<OpportunityTypeKey, Airdrop[]> = {
      confirmed_airdrop: [],
      potential_airdrop: [],
      points_program: [],
      rewards_program: [],
      testnet: [],
      scam_alert: [],
    };

    visibleAirdrops.forEach((item) => {
      const key = getOpportunityTypeKey(item);
      if (key) groups[key].push(item);
    });

    return groups;
  }, [visibleAirdrops]);

  const listingSections = useMemo(() => {
    const selectedType = filters.opportunityType;

    if (selectedType) {
      const selectedConfig = OPPORTUNITY_SECTION_CONFIGS.find(section => section.key === selectedType);
      if (!selectedConfig) return [];

      return [
        {
          ...selectedConfig,
          items: groupedVisibleAirdrops[selectedConfig.key],
        },
      ];
    }

    return OPPORTUNITY_SECTION_CONFIGS
      .map(section => ({
        ...section,
        items: groupedVisibleAirdrops[section.key],
      }))
      .filter(section => section.items.length > 0);
  }, [filters.opportunityType, groupedVisibleAirdrops]);

  const getNextAirdropSlug = useCallback((list: Airdrop[], index: number) => {
    const nextItem = list[index + 1] ?? null;
    return nextItem?.slug ?? null;
  }, []);

  const hasMoreAirdrops = visibleCount < filtered.length;

  const activeHomepageHeroBanner = useMemo(() => {
    const eligible = homepageBanners.filter((banner) => isBannerActiveToday(banner, 'homepage_hero'));

    return eligible[0] ?? null;
  }, [homepageBanners]);

  const activeHomepageMidBanner = useMemo(() => {
    const eligible = homepageBanners.filter((banner) => isBannerActiveToday(banner, 'homepage_mid'));

    return eligible[0] ?? null;
  }, [homepageBanners]);

  const activeFooterBanner = useMemo(() => {
    const eligible = homepageBanners.filter((banner) => isBannerActiveToday(banner, 'footer'));

    return eligible[0] ?? null;
  }, [homepageBanners]);

  const activeRecommendedToolsBanner = useMemo(() => {
    const eligible = homepageBanners.filter((banner) => isBannerActiveToday(banner, 'recommended_tools'));

    return eligible[0] ?? null;
  }, [homepageBanners]);

  const homepageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://airdropguard.com/#organization',
        name: 'AirdropGuard',
        url: 'https://airdropguard.com',
        logo: 'https://airdropguard.com/airdrop_guards.png',
        description:
          'AirdropGuard is the AI mission control for crypto airdrops, combining AI analysis, human verification, wallet safety intelligence and prioritised opportunity discovery.',
        sameAs: ['https://x.com/Dropguardai'],
      },
      {
        '@type': 'WebSite',
        '@id': 'https://airdropguard.com/#website',
        name: 'AirdropGuard',
        url: 'https://airdropguard.com',
        potentialAction: {
          '@type': 'SearchAction',
          target: 'https://airdropguard.com/?search={search_term_string}',
          'query-input': 'required name=search_term_string',
        },
        publisher: {
          '@id': 'https://airdropguard.com/#organization',
        },
        description:
          'Discover verified crypto airdrops, avoid scams, check your wallet safely and use Copilot to focus on the opportunities that deserve your time.',
      },
      {
        '@type': 'FAQPage',
        '@id': 'https://airdropguard.com/#faq',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'How does AirdropGuard reduce scam risk?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'AirdropGuard combines AI analysis, human verification, wallet safety intelligence, and scam alerts so users can evaluate trust and risk before connecting wallets.',
            },
          },
          {
            '@type': 'Question',
            name: 'Can I start using AirdropGuard for free?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. You can start with free verified listings and core trust insights, then upgrade when you need deeper AI mission control and advanced workflow support.',
            },
          },
          {
            '@type': 'Question',
            name: 'Does AirdropGuard require my seed phrase?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'No. AirdropGuard does not require your seed phrase or private keys, and wallet intelligence tooling is read-only.',
            },
          },
        ],
      },
      {
        '@type': 'ItemList',
        '@id': 'https://airdropguard.com/#visible-airdrops',
        name: 'Visible Airdrop Listings',
        itemListElement: visibleAirdrops.map((airdrop, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: `https://airdropguard.com/airdrop/${airdrop.slug}`,
          name: airdrop.name,
          description: (() => {
            const summary = String(airdrop.ai_summary ?? '').trim();
            if (!summary || /\b(tba|to be announced|coming soon)\b/i.test(summary)) return undefined;
            return summary;
          })(),
        })),
      },
      {
        '@type': 'BreadcrumbList',
        '@id': 'https://airdropguard.com/#breadcrumb',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: 'https://airdropguard.com/',
          },
        ],
      },
    ],
  };

  const trustCounters: CounterItem[] = useMemo(() => {
    const aiAnalyses = opportunityAirdrops.filter(item => item.ai_summary || item.ai_risk_analysis || item.ai_reward_estimate).length;
    const trustScores = opportunityAirdrops
      .map(item => item.trust_score)
      .filter((score): score is number => typeof score === 'number' && Number.isFinite(score));
    const averageTrust = trustScores.length ? Math.round(trustScores.reduce((sum, score) => sum + score, 0) / trustScores.length) : 0;

    return [
      {
        label: 'Verified Projects',
        value: verifiedProjects.length,
        sub: 'Trusted listings currently visible.',
      },
      {
        label: 'AI Analyses',
        value: aiAnalyses,
        sub: 'Listings with AI coverage.',
      },
      {
        label: 'Community Results',
        value: communityCount,
        sub: 'User reports shared on the platform.',
      },
      {
        label: 'Wallet Checks',
        value: walletCount,
        sub: 'Read-only safety scans recorded.',
      },
      {
        label: 'Average Trust Score',
        value: averageTrust,
        suffix: '%',
        sub: trustScores.length ? 'Across scored listings.' : 'Growing daily.',
      },
    ];
  }, [opportunityAirdrops, verifiedProjects.length, communityCount, walletCount]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'All Airdrops', icon: <Grid3X3 className="w-3.5 h-3.5" /> },
    { key: 'trending', label: 'Trending', icon: <Flame className="w-3.5 h-3.5" /> },
    { key: 'ending', label: 'Ending Soon', icon: <Clock className="w-3.5 h-3.5" /> },
    { key: 'featured', label: 'Featured', icon: <Layers3 className="w-3.5 h-3.5" /> },
  ];

  const trustScoreValue = typeof trustCounters[4]?.value === 'number'
    ? Math.max(0, Math.min(100, trustCounters[4].value))
    : 98;
  const trustScoreBand = trustScoreValue >= 85 ? 'Excellent' : trustScoreValue >= 70 ? 'Strong' : trustScoreValue >= 50 ? 'Moderate' : 'Watchlist';
  const trustScoreTextTone = trustScoreValue >= 85
    ? 'text-emerald-300'
    : trustScoreValue >= 70
      ? 'text-cyan-300'
      : trustScoreValue >= 50
        ? 'text-amber-300'
        : 'text-rose-300';
  const trustScoreBarTone = trustScoreValue >= 85
    ? 'bg-[linear-gradient(90deg,#22c55e_0%,#34d399_48%,#2dd4bf_100%)]'
    : trustScoreValue >= 70
      ? 'bg-[linear-gradient(90deg,#06b6d4_0%,#22d3ee_45%,#60a5fa_100%)]'
      : trustScoreValue >= 50
        ? 'bg-[linear-gradient(90deg,#f59e0b_0%,#fbbf24_45%,#f97316_100%)]'
        : 'bg-[linear-gradient(90deg,#ef4444_0%,#fb7185_45%,#f97316_100%)]';
  const lowRiskPool = opportunityAirdrops.filter(item => {
    const risk = String(item.risk_level ?? '').toLowerCase();
    return risk === 'low' || risk === 'very low';
  }).length;
  const trendingNow = opportunityAirdrops.filter(item => item.is_trending).length;
  const topProjectName = (topVerified[0]?.name || featured?.name || 'Curated watchlist').trim();

  return (
    <>
      <SEO
        title={homeSeoTitle()}
        description="Stop wasting time on scam airdrops. Find high-quality crypto opportunities in seconds with AI analysis, human verification and wallet safety intelligence."
        canonical={canonicalFromPath('/')}
        schema={homepageSchema}
      />

      <section className="relative overflow-hidden border-b border-cyan-500/20 bg-[radial-gradient(circle_at_8%_8%,rgba(34,211,238,0.22),transparent_24%),radial-gradient(circle_at_92%_12%,rgba(59,130,246,0.25),transparent_24%),radial-gradient(circle_at_44%_78%,rgba(16,185,129,0.13),transparent_30%),linear-gradient(180deg,#010612_0%,#04102a_52%,#020913_100%)]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-8 h-64 w-64 rounded-full bg-cyan-400/25 blur-3xl" />
          <div className="absolute -right-20 top-20 h-72 w-72 rounded-full bg-blue-500/30 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl px-3 pb-7 pt-5 sm:px-6 sm:pb-14 sm:pt-12 lg:px-8 lg:pb-20">
          <div className="relative z-10 overflow-hidden rounded-[24px] border border-cyan-300/45 bg-[linear-gradient(150deg,rgba(4,14,38,0.97),rgba(2,9,20,0.97))] p-3.5 shadow-[0_0_0_1px_rgba(34,211,238,0.15),0_22px_60px_rgba(3,10,28,0.75)] sm:p-6">
            <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.2),transparent_55%)]" />
            <div className="absolute left-4 top-3 h-px w-24 bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent" />
            <div className="absolute right-4 top-3 h-px w-24 bg-gradient-to-r from-transparent via-blue-300/80 to-transparent" />

            <div className="relative grid gap-4 sm:gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
              <div className="text-center sm:text-left">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/35 bg-cyan-400/10 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-100 sm:text-xs">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  AI + Human Verified
                </div>

                <h1 className="mt-3.5 max-w-3xl text-[2.15rem] font-black leading-[0.92] tracking-tight text-white sm:mt-4 sm:text-5xl lg:text-[3.65rem]">
                  Check Before
                  <span className="block bg-[linear-gradient(95deg,#34d399_2%,#22d3ee_35%,#3b82f6_68%,#8b5cf6_100%)] bg-clip-text text-transparent">
                    You Connect.
                  </span>
                </h1>

                <p className="mt-2.5 max-w-2xl text-[15px] font-medium leading-relaxed text-cyan-50 sm:mt-3 sm:text-lg">
                  AI analysed. Human reviewed. Trust the airdrops that are actually worth your time.
                </p>

                <div className="mt-3 grid grid-cols-1 gap-2 rounded-2xl border border-cyan-300/25 bg-[linear-gradient(180deg,rgba(6,17,40,0.88),rgba(4,11,26,0.8))] p-2.5 text-left sm:hidden">
                  <div className="flex items-center justify-between rounded-xl border border-cyan-300/20 bg-cyan-400/8 px-3 py-2">
                    <p className="text-[11px] font-semibold text-cyan-100">Trust momentum</p>
                    <p className={`text-xs font-black ${trustScoreTextTone}`}>{trustScoreValue}%</p>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-800/85">
                    <div className={`trust-bar-glow h-full rounded-full ${trustScoreBarTone}`} style={{ width: `${trustScoreValue}%` }} />
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold text-cyan-100/90">
                    <span className="inline-flex items-center rounded-full border border-emerald-300/35 bg-emerald-500/10 px-2 py-1">Low-risk picks</span>
                    <span className="inline-flex items-center rounded-full border border-amber-300/35 bg-amber-500/10 px-2 py-1">Hot now</span>
                    <span className="inline-flex items-center rounded-full border border-fuchsia-300/35 bg-fuchsia-500/10 px-2 py-1">AI watched</span>
                  </div>
                </div>

                <div className="mt-3.5 grid gap-2 border-y border-white/10 py-3 sm:grid-cols-3">
                  <div className="flex items-center gap-2 rounded-xl border border-cyan-300/35 bg-cyan-400/10 px-2.5 py-2">
                    <Brain className="h-4 w-4 text-cyan-300" />
                    <div>
                      <p className="text-xs font-semibold text-white">No wallet connection</p>
                      <p className="text-[11px] text-cyan-100/70">You browse first, connect later</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-violet-300/35 bg-violet-400/10 px-2.5 py-2">
                    <Users className="h-4 w-4 text-violet-300" />
                    <div>
                      <p className="text-xs font-semibold text-white">Never asks for seed phrases</p>
                      <p className="text-[11px] text-violet-100/70">Read-only research only</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-300/35 bg-emerald-400/10 px-2.5 py-2">
                    <Shield className="h-4 w-4 text-emerald-300" />
                    <div>
                      <p className="text-xs font-semibold text-white">AI scoring + human review</p>
                      <p className="text-[11px] text-emerald-100/70">Risk flags before wasted time</p>
                    </div>
                  </div>
                </div>

                <div className="mt-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-xl border border-cyan-300/20 bg-[linear-gradient(170deg,rgba(14,32,58,0.55),rgba(9,20,40,0.35))] px-2 py-2 text-center">
                    <p className="text-[1.45rem] font-black leading-none text-white sm:text-[1.55rem]">{safeDisplayCount(opportunityAirdrops.length, '+')}</p>
                    <p className="mt-1 text-[11px] text-cyan-100/70">Airdrops analysed</p>
                  </div>
                  <div className="rounded-xl border border-blue-300/20 bg-[linear-gradient(170deg,rgba(20,34,66,0.55),rgba(11,18,37,0.38))] px-2 py-2 text-center">
                    <p className="text-[1.45rem] font-black leading-none text-white sm:text-[1.55rem]">{safeDisplayCount(communityCount, '+')}</p>
                    <p className="mt-1 text-[11px] text-blue-100/70">Users protected</p>
                  </div>
                  <div className="rounded-xl border border-cyan-300/30 bg-[linear-gradient(160deg,rgba(8,28,52,0.72),rgba(3,16,36,0.82))] px-2 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                    <p className={`text-[1.45rem] font-black leading-none sm:text-[1.55rem] ${trustScoreTextTone}`}>{trustScoreValue}%</p>
                    <p className="mt-1 text-[11px] text-cyan-100/80">Trust score trend</p>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800/85">
                      <div
                        className={`trust-bar-glow h-full rounded-full ${trustScoreBarTone} transition-all duration-700 ease-out`}
                        style={{ width: `${trustScoreValue}%` }}
                      />
                    </div>
                    <p className={`mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${trustScoreTextTone}`}>{trustScoreBand}</p>
                  </div>
                  <div className="rounded-xl border border-fuchsia-300/20 bg-[linear-gradient(170deg,rgba(60,26,68,0.45),rgba(18,13,31,0.35))] px-2 py-2 text-center">
                    <p className="text-[1.45rem] font-black leading-none text-white sm:text-[1.55rem]">24/7</p>
                    <p className="mt-1 text-[11px] text-fuchsia-100/70">Ready to analyse</p>
                  </div>
                </div>

                <div className="mt-3.5 grid gap-2 sm:grid-cols-3">
                  <Link
                    to="/wallet-checker"
                    className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(98deg,#1fb6ff_0%,#4f8dfb_42%,#7c4dff_100%)] px-5 py-3 text-sm font-black text-white shadow-[0_14px_26px_rgba(59,130,246,0.35)] transition-transform hover:translate-y-[-1px]"
                  >
                    Scan an Airdrop
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <a
                    href="#airdrops"
                    className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-bold text-white backdrop-blur transition-colors hover:bg-white/[0.1]"
                  >
                    Browse Verified Airdrops
                  </a>
                  <Link
                    to="/submit"
                    className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl border border-emerald-300/25 bg-emerald-500/10 px-5 py-3 text-sm font-bold text-emerald-100 transition-colors hover:bg-emerald-500/18"
                  >
                    Submit for Review
                  </Link>
                </div>

                <div className="mt-3.5 space-y-2.5">
                  <div className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-100/85 sm:justify-start">
                    <Activity className="h-3.5 w-3.5 text-cyan-300" />
                    Live confidence pulse
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2 sm:overflow-x-auto sm:pb-1 sm:[scrollbar-width:none] sm:[&::-webkit-scrollbar]:hidden">
                    <div className="attention-card hero-stagger min-w-0 rounded-xl border border-cyan-300/35 bg-cyan-400/10 px-3 py-2.5 shadow-[0_8px_24px_rgba(6,182,212,0.16)] sm:min-w-[148px]" style={{ ['--stagger-delay' as string]: '80ms' }}>
                      <p className="text-[1rem] font-black leading-none text-cyan-100">{safeDisplayCount(verifiedProjects.length, '+')}</p>
                      <p className="mt-1 text-[11px] text-cyan-200/85">Trusted right now</p>
                    </div>
                    <div className="attention-card hero-stagger min-w-0 rounded-xl border border-emerald-300/35 bg-emerald-500/10 px-3 py-2.5 shadow-[0_8px_24px_rgba(16,185,129,0.15)] sm:min-w-[148px]" style={{ ['--stagger-delay' as string]: '150ms' }}>
                      <p className="text-[1rem] font-black leading-none text-emerald-100">{safeDisplayCount(lowRiskPool, '+')}</p>
                      <p className="mt-1 text-[11px] text-emerald-200/85">Low-risk pool</p>
                    </div>
                    <div className="attention-card hero-stagger min-w-0 rounded-xl border border-amber-300/35 bg-amber-500/10 px-3 py-2.5 shadow-[0_8px_24px_rgba(245,158,11,0.16)] sm:min-w-[148px]" style={{ ['--stagger-delay' as string]: '220ms' }}>
                      <p className="text-[1rem] font-black leading-none text-amber-100">{safeDisplayCount(trendingNow, '+')}</p>
                      <p className="mt-1 text-[11px] text-amber-200/85">Trending this cycle</p>
                    </div>
                    <div className="attention-card hero-stagger col-span-2 min-w-0 rounded-xl border border-fuchsia-300/35 bg-fuchsia-500/10 px-3 py-2.5 shadow-[0_8px_24px_rgba(217,70,239,0.16)] sm:col-span-1 sm:min-w-[178px]" style={{ ['--stagger-delay' as string]: '290ms' }}>
                      <p className="truncate text-[1rem] font-black leading-none text-fuchsia-100">{topProjectName}</p>
                      <p className="mt-1 text-[11px] text-fuchsia-200/85">Top confidence pick</p>
                    </div>
                  </div>
                  <p className="text-center text-xs leading-relaxed text-cyan-100/85 sm:text-left">
                    Airdrops move fast. Bad links move faster. Most users check too late.
                  </p>
                </div>
              </div>

              <div className="relative pt-2 sm:pt-2">
                <HeroMockup item={topVerified[0] ?? featured ?? null} projects={topVerified} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {activeHomepageHeroBanner && (
        <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <a href={activeHomepageHeroBanner.destinationUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-2xl border border-cyan-400/25 bg-white/[0.02]">
            <img src={activeHomepageHeroBanner.bannerImageUrl} alt={activeHomepageHeroBanner.altText || activeHomepageHeroBanner.projectName} className="h-28 w-full object-cover sm:h-36" />
          </a>
        </section>
      )}

      <WhySection />
      <LiveOpportunitiesSection airdrops={opportunityAirdrops} />

      {activeHomepageMidBanner && (
        <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <a href={activeHomepageMidBanner.destinationUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
            <img src={activeHomepageMidBanner.bannerImageUrl} alt={activeHomepageMidBanner.altText || activeHomepageMidBanner.projectName} className="h-24 w-full object-cover sm:h-32" />
          </a>
        </section>
      )}
      <HomepageHowItWorksSection />
      <CopilotPreviewSection />
      <HomepageTrustSection counters={trustCounters} />
      <FreeVsProSection />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-cyan-200">Research path</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-300">
            <Link to="/learn" className="hover:text-white">Learn</Link>
            <span className="text-gray-600">/</span>
            <Link to="/#airdrops" className="hover:text-white">Airdrops</Link>
            <span className="text-gray-600">/</span>
            <Link to="/scam-alerts" className="hover:text-white">Scam Alerts</Link>
            <span className="text-gray-600">/</span>
            <Link to="/api-docs" className="hover:text-white">API Docs</Link>
            <span className="text-gray-600">/</span>
            <Link to="/pricing" className="hover:text-white">Pricing</Link>
          </div>
        </div>
      </section>

      <AffiliatePlacementCta
        source="homepage"
        title="Homepage security partner"
        subtitle="Secure your crypto with a vetted partner chosen for quality, trust and relevance."
      />

      {activeRecommendedToolsBanner && (
        <section className="mx-auto max-w-7xl px-4 pb-2 sm:px-6 lg:px-8">
          <a href={activeRecommendedToolsBanner.destinationUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-2xl border border-emerald-400/25 bg-white/[0.02]">
            <img src={activeRecommendedToolsBanner.bannerImageUrl} alt={activeRecommendedToolsBanner.altText || activeRecommendedToolsBanner.projectName} className="h-20 w-full object-cover sm:h-24" />
          </a>
        </section>
      )}

      <section id="airdrops" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">Browse live listings</div>
            <h2 className="mt-3 text-2xl font-black text-white sm:text-4xl">
              Explore the projects users can actually act on
            </h2>
            <p className="mt-3 max-w-2xl text-xs leading-relaxed text-gray-400 sm:text-base">
              Opportunity Type is the source of truth for classification. Browse by type, then open any listing for full trust, risk and action context.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/dashboard" className="inline-flex min-h-[46px] items-center justify-center rounded-2xl border border-sky-400/25 bg-sky-500/10 px-5 py-3 text-sm font-semibold text-sky-200 transition-colors hover:bg-sky-500/20">
              Open Dashboard
            </Link>
            <Link to="/pricing" className="inline-flex min-h-[46px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08]">
              View API Pricing Plans
            </Link>
          </div>
        </div>

        {featured && tab === 'all' && !filters.search ? (
          <div className="mb-6 hidden sm:block">
            <FeaturedSpotlight airdrop={featured} />
            <SponsoredTransparencyNote />
          </div>
        ) : null}

        <div className="mb-4 grid grid-cols-2 gap-2 sm:mb-6 sm:flex sm:flex-wrap sm:items-center sm:gap-1 sm:border-b sm:border-white/5 sm:pb-1">
          {tabs.map(item => (
            <button
              key={item.key}
              onClick={() => {
                if (item.key === 'all') setSearchParams({});
                else setSearchParams({ filter: item.key });
              }}
              className={`flex min-h-[42px] items-center justify-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-medium transition-colors sm:rounded-t-lg ${tab === item.key
                ? 'border border-sky-400/25 bg-white/5 text-white sm:border-b-2 sm:border-x-0 sm:border-t-0 sm:border-sky-400'
                : 'border border-white/10 text-gray-500 hover:text-gray-300 sm:border-0'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
          <div className="hidden text-xs text-gray-600 sm:ml-auto sm:block">
            {!loading && <span>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>}
          </div>
        </div>

        <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:mb-6 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-300">Opportunity Type Navigation</div>
            <button
              type="button"
              onClick={() => setShowOpportunityTypeGuide(true)}
              className="inline-flex min-h-[38px] items-center justify-center rounded-full border border-sky-400/25 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-200 transition-colors hover:bg-sky-500/20"
            >
              What does this mean?
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilters({ ...filters, opportunityType: '' })}
              className={`inline-flex min-h-[40px] items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${!filters.opportunityType
                ? 'border-white/30 bg-white/[0.12] text-white'
                : 'border-white/10 bg-white/[0.03] text-gray-300 hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              All
            </button>
            {OPPORTUNITY_SECTION_CONFIGS.map((section) => {
              const selected = filters.opportunityType === section.key;

              return (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => setFilters({ ...filters, opportunityType: section.key })}
                  className={`inline-flex min-h-[40px] items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${selected
                    ? section.badgeClassName
                    : 'border-white/10 bg-white/[0.03] text-gray-300 hover:bg-white/[0.08] hover:text-white'
                  }`}
                >
                  {section.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="sticky top-20 z-20 -mx-4 mb-5 bg-[#050b18]/95 px-4 py-3 backdrop-blur sm:static sm:m-0 sm:mb-8 sm:bg-transparent sm:px-0 sm:py-0">
          <FilterBar filters={filters} onChange={setFilters} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-24 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading airdrops...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center gap-3 py-24 text-rose-400">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">{error}</span>
          </div>
        ) : filtered.length === 0 && !filters.opportunityType ? (
          <div className="py-24 text-center">
            <p className="text-sm text-gray-500">No airdrops match your filters.</p>
            <button
              onClick={() => {
                setFilters(DEFAULT_FILTERS);
                setSearchParams({});
              }}
              className="mt-3 text-sm text-sky-300 transition-colors hover:text-sky-200"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-6">
              {listingSections.map((section) => (
                <div key={section.key} className={`rounded-3xl border p-4 sm:p-5 ${section.sectionClassName}`}>
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${section.badgeClassName}`}>
                        {section.label}
                      </div>
                      <p className="mt-2 max-w-3xl text-xs leading-relaxed text-gray-300 sm:text-sm">
                        {section.description}
                      </p>
                    </div>
                    <div className="text-xs text-gray-400">{section.items.length} listing{section.items.length === 1 ? '' : 's'}</div>
                  </div>

                  {section.items.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-gray-400">
                      No listings available for this opportunity type right now.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
                      {section.items.map((airdrop, index, list) => {
                        const absoluteIndex = visibleAirdropIndexes.get(airdrop.id) ?? index;
                        const desktopOnlyInitially = visibleCount === INITIAL_VISIBLE_AIRDROPS && absoluteIndex >= 3 && absoluteIndex < INITIAL_VISIBLE_AIRDROPS;
                        const nextAirdropSlug = getNextAirdropSlug(list, index);

                        return (
                          <div key={airdrop.id} className={desktopOnlyInitially ? 'hidden sm:block' : ''}>
                            <AirdropCard airdrop={airdrop} nextAirdropSlug={nextAirdropSlug} />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {hasMoreAirdrops && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount(count => count + LOAD_MORE_AIRDROPS)}
                  className="min-h-[46px] rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-bold text-gray-200 transition-colors hover:bg-white/[0.08] hover:text-white"
                >
                  {visibleCount === INITIAL_VISIBLE_AIRDROPS ? 'View All Airdrops' : 'Load More Airdrops'}
                  <span className="ml-2 text-xs font-normal text-gray-500">
                    {Math.min(filtered.length - visibleCount, LOAD_MORE_AIRDROPS)} more
                  </span>
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {showOpportunityTypeGuide && (
        <div className="fixed inset-0 z-[90] flex items-end bg-black/70 p-3 backdrop-blur sm:items-center sm:justify-center sm:p-6">
          <button
            type="button"
            aria-label="Close opportunity type guide"
            className="absolute inset-0"
            onClick={() => setShowOpportunityTypeGuide(false)}
          />
          <div className="relative w-full max-w-2xl rounded-3xl border border-white/15 bg-[#091225] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:p-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-lg font-black text-white sm:text-xl">Opportunity Type Guide</h3>
              <button
                type="button"
                onClick={() => setShowOpportunityTypeGuide(false)}
                className="inline-flex min-h-[36px] items-center rounded-full border border-white/15 px-3 text-xs font-semibold text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                Close
              </button>
            </div>
            <p className="mb-4 text-sm leading-relaxed text-gray-300">
              Opportunity Type is the classification source of truth. Use these labels to understand intent before spending time or connecting any wallet.
            </p>
            <div className="space-y-2.5">
              {OPPORTUNITY_SECTION_CONFIGS.map((section) => (
                <div key={section.key} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <div className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${section.badgeClassName}`}>
                    {section.label}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-gray-300">{section.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {speculativeTokens.length > 0 && (
        <section id="speculative-tokens" className="mx-auto max-w-7xl px-4 pb-4 sm:px-6 lg:px-8 lg:pb-8">
          <div className="rounded-3xl border border-rose-500/20 bg-rose-500/5 p-5 sm:p-7">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-200">Separate category</div>
                <h3 className="mt-2 text-xl font-black text-white sm:text-2xl">High-Risk Speculative Tokens</h3>
                <div className="mt-2">
                  <span className="inline-flex rounded-full border border-rose-500/35 bg-rose-500/14 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-rose-100">
                    Opportunity Type: Speculative Token
                  </span>
                </div>
                <p className="mt-2 max-w-3xl text-xs leading-relaxed text-rose-100/85 sm:text-sm">
                  This category is intentionally isolated from verified airdrops. Use it for token-level due diligence only, not reward expectations or qualification progress.
                </p>
              </div>
              <span className="inline-flex w-fit items-center rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-200">
                Permanent risk warning
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
              {speculativeTokens.slice(0, 6).map((token, index, list) => (
                <AirdropCard key={token.id} airdrop={token} nextAirdropSlug={getNextAirdropSlug(list, index)} />
              ))}
            </div>
          </div>
        </section>
      )}

      <HomepageFinalCtaSection />

      {activeFooterBanner && (
        <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
          <a href={activeFooterBanner.destinationUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
            <img src={activeFooterBanner.bannerImageUrl} alt={activeFooterBanner.altText || activeFooterBanner.projectName} className="h-20 w-full object-cover sm:h-24" />
          </a>
        </section>
      )}

      <div className="hidden md:block">
        <NewsletterSection />
      </div>
    </>
  );
}