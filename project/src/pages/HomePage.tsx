import { useState, useEffect, useMemo } from 'react';
import type React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  TrendingUp, Clock, Flame, Grid3X3, Loader2, AlertCircle,
  ShieldCheck, AlertTriangle, CheckSquare, Search, Gift,
  MessageSquare, Send, Shield, Brain, Users, Code2,
  BarChart3, ArrowRight, Eye, LockKeyhole, Radio, Star,
  Activity, FileSearch, Wallet, Gauge, Target, Fingerprint,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Airdrop } from '../lib/types';
import AirdropCard from '../components/AirdropCard';
import FeaturedSpotlight from '../components/FeaturedSpotlight';
import FilterBar, { type Filters } from '../components/FilterBar';
import TrustStrip from '../components/TrustStrip';
import SEO from '../components/SEO';
import TrustScoreSection from '../components/TrustScoreSection';
import NewsletterSection from '../components/NewsletterSection';

function useDeferredRender(delay = 650) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let timeoutId: number | undefined;
    let cancelled = false;

    const start = () => {
      if (!cancelled) setReady(true);
    };

    const win = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (win.requestIdleCallback) {
      const idleId = win.requestIdleCallback(start, { timeout: delay + 800 });
      return () => {
        cancelled = true;
        win.cancelIdleCallback?.(idleId);
      };
    }

    timeoutId = window.setTimeout(start, delay);

    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [delay]);

  return ready;
}

const DEFAULT_FILTERS: Filters = {
  search: '',
  blockchain: '',
  category: '',
  reward: '',
  risk: '',
  difficulty: '',
};

const INITIAL_VISIBLE_AIRDROPS = 6;
const LOAD_MORE_AIRDROPS = 6;

type Tab = 'all' | 'trending' | 'ending' | 'featured';

type StatItem = {
  label: string;
  value: string | number;
  sub: string;
};

type HeroMessage = {
  badge: string;
  headline: string;
  subtext: string;
  snapshotTitle: string;
};

const DAILY_HERO_MESSAGES: HeroMessage[] = [
  {
    badge: 'Crypto airdrop discovery • AI scored • human reviewed',
    headline: 'Find verified crypto airdrops before you connect.',
    subtext: 'Browse live crypto airdrops with trust scores, opportunity ratings, task guidance, scam warnings and wallet safety checks built into every listing.',
    snapshotTitle: 'Airdrop discovery made safer',
  },
  {
    badge: 'Verified airdrops • trust scores • safer farming',
    headline: 'Discover airdrops worth your time.',
    subtext: 'AirdropGuard helps you compare live opportunities by reward potential, risk level, blockchain, difficulty and human-reviewed trust signals.',
    snapshotTitle: 'From airdrop list to trusted shortlist',
  },
  {
    badge: 'Check Before You Connect • AirdropGuard intelligence',
    headline: 'Crypto airdrops, reviewed before you act.',
    subtext: 'Find promising airdrops, avoid obvious scams, review AI-assisted research and focus on campaigns with clearer evidence and safer task flows.',
    snapshotTitle: 'Research every airdrop first',
  },
  {
    badge: 'Airdrop rewards • project trust • wallet safety',
    headline: 'Your safer starting point for crypto airdrops.',
    subtext: 'Track verified listings, review project reputation, understand airdrop confidence and use read-only wallet tools before spending time or gas.',
    snapshotTitle: 'Find, review, then decide',
  },
  {
    badge: 'AI analysis • human review • verified opportunities',
    headline: 'The discovery layer for trusted crypto airdrops.',
    subtext: 'AirdropGuard brings airdrop listings, trust analysis, wallet safety and scam awareness together so users can research faster and safer.',
    snapshotTitle: 'AirdropGuard intelligence',
  },
];

function getDailyHeroMessage(): HeroMessage {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return DAILY_HERO_MESSAGES[dayOfYear % DAILY_HERO_MESSAGES.length];
}

function isFeaturedPlacement(airdrop: Airdrop): boolean {
  const anyAirdrop = airdrop as Airdrop & { is_sponsored?: boolean };
  return Boolean(airdrop.is_featured || anyAirdrop.is_sponsored);
}

function SponsoredTransparencyNote() {
  return (
    <div className="mt-3 mb-6 rounded-2xl border border-amber-500/15 bg-amber-500/[0.04] px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
      <div className="inline-flex items-center gap-2 text-amber-300 text-xs font-semibold uppercase tracking-wider">
        <Star className="w-3.5 h-3.5 fill-current" />
        Featured placement
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">
        Featured listings may be paid placements, but they must still pass review. Paid placement never overrides risk warnings, trust signals, or human verification.
      </p>
    </div>
  );
}

function HeroProofStrip() {
  const items = [
    'Live airdrop listings with trust signals',
    'AI-scored and human-reviewed research',
    'Task, risk and reward details in one place',
    'No seed phrases, private keys or forced connections',
  ];

  return (
    <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl">
      {items.map(item => (
        <div key={item} className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-xs text-gray-400">{item}</span>
        </div>
      ))}
    </div>
  );
}

function HeroV2() {
  const hero = getDailyHeroMessage();

  const snapshotItems = [
    { label: 'Verified Listings', value: 'Reviewed for project quality, risk and evidence.', icon: ShieldCheck, tone: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    { label: 'Airdrop Confidence', value: 'Token, snapshot and reward evidence separated from project trust.', icon: Gift, tone: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    { label: 'Scam Warnings', value: 'Impersonation, exploit and suspicious-link signals highlighted first.', icon: AlertTriangle, tone: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
    { label: 'Action Guidance', value: 'Clear next step: research, monitor, review or avoid.', icon: CheckSquare, tone: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
  ];

  return (
    <section className="relative overflow-hidden border-b border-white/5">
      <div className="absolute inset-0 hidden md:block bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_30%),radial-gradient(circle_at_70%_20%,rgba(168,85,247,0.10),transparent_28%)]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 pb-8 sm:pt-16 sm:pb-14 lg:pt-20 lg:pb-16">
        <div className="grid gap-7 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:items-center">
          <div className="text-center lg:text-left">
            <div className="mx-auto lg:mx-0 inline-flex max-w-full items-center gap-2 rounded-full border border-neon-purple/25 bg-neon-purple/10 px-3 py-2 mb-5">
              <ShieldCheck className="w-3.5 h-3.5 text-neon-purple shrink-0" />
              <span className="text-[11px] sm:text-xs font-semibold text-neon-purple leading-snug">
                {hero.badge}
              </span>
            </div>

            <h1 className="mx-auto lg:mx-0 max-w-4xl text-[2rem] sm:text-5xl lg:text-6xl font-black text-white leading-[1.08] tracking-tight">
              {hero.headline}
            </h1>

            <p className="mx-auto lg:mx-0 mt-4 sm:mt-5 text-sm sm:text-lg text-gray-400 leading-relaxed max-w-2xl">
              {hero.subtext}
            </p>

            <div className="mt-6 flex flex-col sm:flex-row sm:justify-center lg:justify-start gap-3">
              <a
                href="#airdrops"
                className="min-h-[48px] inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-neon-purple px-6 py-3 text-sm font-bold text-white hover:bg-neon-purple/90 transition-colors"
              >
                Browse Airdrops
                <ArrowRight className="w-4 h-4" />
              </a>

              <Link
                to="/wallet-checker"
                className="min-h-[48px] inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border border-sky-500/25 bg-sky-500/10 px-6 py-3 text-sm font-bold text-sky-300 hover:bg-sky-500/20 hover:text-white transition-colors"
              >
                Check Wallet Safety
              </Link>

              <Link
                to="/submit"
                className="min-h-[48px] inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors"
              >
                Submit Airdrop
              </Link>
            </div>

            <p className="mt-4 text-xs text-gray-600">
              No seed phrases. No private keys. No forced wallet connection to access research.
            </p>

            <HeroProofStrip />
          </div>

          <div className="glass-card p-4 sm:p-6 border border-neon-purple/15">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <div className="text-[10px] sm:text-xs text-gray-600 uppercase tracking-wider mb-1">
                  Airdrop Discovery Snapshot
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white">{hero.snapshotTitle}</h2>
              </div>

              <div className="hidden sm:flex items-center gap-0.5 text-amber-300" aria-label="5 star intelligence rating">
                {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-4 h-4 fill-current" />)}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
              {snapshotItems.map(({ label, value, icon: Icon, tone }) => (
                <div key={label} className="rounded-2xl border border-white/5 bg-dark-700/35 p-3 sm:p-4 flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${tone}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white">{label}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed mt-1">{value}</p>
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

function PlatformStats({ stats }: { stats: StatItem[] }) {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4 pb-8 sm:pt-0 sm:-mt-5 sm:pb-12 relative z-10">
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible sm:px-0">
        {stats.map(stat => (
          <div key={stat.label} className="glass-card min-w-[155px] flex-1 p-4 sm:p-5 border border-white/5">
            <div className="text-2xl sm:text-3xl font-black text-white tabular-nums">{stat.value}</div>
            <div className="text-xs font-semibold text-gray-400 mt-1">{stat.label}</div>
            <div className="text-[10px] text-gray-600 mt-1 leading-relaxed">{stat.sub}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

const PILLARS = [
  {
    icon: Brain,
    title: 'Intelligence Reports',
    desc: 'Each project can show reputation, airdrop confidence, evidence coverage, threat level and final recommendation.',
    color: 'text-neon-purple',
    bg: 'bg-neon-purple/10 border-neon-purple/20',
  },
  {
    icon: ShieldCheck,
    title: 'Human Verification',
    desc: 'Automation supports research, but analyst review remains central before listings are verified or promoted.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
  },
  {
    icon: Eye,
    title: 'Transparent Signals',
    desc: 'Users can see why a project looks strong, what is missing, and what should be checked before spending time or gas.',
    color: 'text-sky-400',
    bg: 'bg-sky-500/10 border-sky-500/20',
  },
  {
    icon: LockKeyhole,
    title: 'Safety First',
    desc: 'AirdropGuard does not ask for seed phrases, private keys, or forced wallet connections to view intelligence.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
  },
];

function IntelligencePillars() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 sm:pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs text-neon-purple font-semibold uppercase tracking-wider mb-2">Why AirdropGuard</p>
          <h2 className="text-2xl sm:text-3xl font-black text-white">More than an airdrop list.</h2>
        </div>
        <p className="text-sm text-gray-500 max-w-xl">
          AirdropGuard is designed so visitors instantly understand what is credible, what is speculative, and what deserves attention before taking action.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {PILLARS.map(({ icon: Icon, title, desc, color, bg }) => (
          <div key={title} className="glass-card p-6">
            <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center mb-4 ${bg}`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <h3 className="text-sm font-bold text-white mb-2">{title}</h3>
            <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const WORKFLOW = [
  { icon: Send, title: 'Project Submitted', desc: 'Projects can be submitted by teams or added by AirdropGuard analysts.' },
  { icon: FileSearch, title: 'Evidence Collected', desc: 'Official links, docs, social signals, token data, funding and risk indicators are reviewed.' },
  { icon: Brain, title: 'Intelligence Structured', desc: 'Signals are organised into reputation, security, evidence, opportunity and airdrop confidence layers.' },
  { icon: Users, title: 'Analyst Review', desc: 'A human reviewer checks the intelligence before final publishing and status decisions.' },
  { icon: Radio, title: 'Ongoing Monitoring', desc: 'Listings can be updated as new reward, token, risk or community information appears.' },
];

function IntelligenceWorkflow() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
      <div className="glass-card p-6 sm:p-8 border border-neon-purple/15">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs text-neon-purple font-semibold uppercase tracking-wider mb-2">Process</p>
            <h2 className="text-2xl sm:text-3xl font-black text-white">How intelligence becomes a listing.</h2>
          </div>
          <Link to="/whitepaper" className="text-sm text-neon-purple hover:text-neon-purple/80 transition-colors">
            Read methodology →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {WORKFLOW.map(({ icon: Icon, title, desc }, index) => (
            <div key={title} className="relative rounded-2xl bg-dark-700/35 border border-white/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-neon-purple" />
                </div>
                <span className="text-[10px] text-gray-700 font-bold">0{index + 1}</span>
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  { icon: Search, num: '1', title: 'Discover', desc: 'Browse verified airdrops filtered by blockchain, risk level, reward potential and category.' },
  { icon: BarChart3, num: '2', title: 'Review Signals', desc: 'Compare reputation, airdrop confidence, evidence coverage and risk before you spend time.' },
  { icon: CheckSquare, num: '3', title: 'Track Tasks', desc: 'Follow saved task checklists and monitor progress across multiple opportunities.' },
];

function HowItWorks() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
      <h2 className="text-2xl sm:text-3xl font-black text-white text-center mb-3">From discovery to decision</h2>
      <p className="text-sm text-gray-500 text-center max-w-2xl mx-auto mb-8">
        AirdropGuard helps users move beyond hype and make safer, better-informed decisions.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {STEPS.map(({ icon: Icon, num, title, desc }) => (
          <div key={title} className="glass-card p-6 text-center flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-neon-purple/10 border border-neon-purple/20 flex items-center justify-center">
              <span className="text-xs font-bold gradient-text">{num}</span>
            </div>
            <Icon className="w-6 h-6 text-neon-purple" />
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ComparisonSection() {
  const rows = [
    ['Lists campaigns', 'Evaluates project quality and airdrop confidence'],
    ['Basic trust indicators', 'Multi-layer intelligence and final recommendations'],
    ['Little explanation', 'Evidence coverage, missing signals and threat notes'],
    ['Static pages', 'Designed for ongoing monitoring and updates'],
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
      <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-6 items-start">
        <div>
          <p className="text-xs text-neon-purple font-semibold uppercase tracking-wider mb-2">Difference</p>
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">Built for safer airdrop research.</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Most airdrop platforms focus on discovery. AirdropGuard focuses on decision support: what is credible, what is speculative, and what deserves your attention.
          </p>
        </div>
        <div className="glass-card overflow-hidden border border-white/5">
          <div className="grid grid-cols-2 bg-white/[0.03] border-b border-white/5">
            <div className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Typical airdrop sites</div>
            <div className="p-4 text-xs font-bold text-neon-purple uppercase tracking-wider border-l border-white/5">AirdropGuard</div>
          </div>
          {rows.map(([other, guard]) => (
            <div key={other} className="grid grid-cols-2 border-b border-white/5 last:border-0">
              <div className="p-4 text-sm text-gray-500">{other}</div>
              <div className="p-4 text-sm text-gray-300 border-l border-white/5">{guard}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WalletCheckerSection() {
  const walletSignals = [
    { label: 'Wallet Health', value: 'Grade + score', icon: Gauge, tone: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    { label: 'Risk Exposure', value: 'GoPlus security', icon: Shield, tone: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
    { label: 'Airdrop Readiness', value: 'Activity signals', icon: Target, tone: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    { label: 'Wallet DNA', value: 'User persona', icon: Fingerprint, tone: 'text-neon-purple bg-neon-purple/10 border-neon-purple/20' },
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="relative overflow-hidden rounded-3xl border border-sky-500/20 bg-gradient-to-br from-sky-500/[0.08] via-dark-800 to-neon-purple/[0.06] p-5 sm:p-8 lg:p-10">
        <div className="absolute inset-0 hidden md:block bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.10),transparent_28%)]" />

        <div className="relative grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-8 lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/25 bg-sky-500/10 px-3 py-1 mb-5">
              <Wallet className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-xs font-semibold text-sky-300">Wallet Intelligence • read-only security</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight mb-4">
              Check your wallet before you chase the next airdrop.
            </h2>

            <p className="text-sm sm:text-base text-gray-400 leading-relaxed mb-6">
              AirdropGuard analyses public wallet activity, visible risk signals, token hygiene and airdrop-readiness indicators without asking for a seed phrase, private key or wallet signature.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
              {['No wallet connection', 'No signatures', 'No seed phrase', 'GoPlus security layer'].map(item => (
                <div key={item} className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-xs text-gray-400">{item}</span>
                </div>
              ))}
            </div>

            <Link
              to="/wallet-checker"
              className="inline-flex min-h-[46px] w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-sky-500 px-6 py-3 text-sm font-bold text-white hover:bg-sky-500/90 transition-colors"
            >
              Run Wallet Intelligence
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="glass-card p-4 sm:p-6 border border-white/10">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">Report Preview</div>
                <h3 className="text-lg sm:text-xl font-bold text-white">Wallet Intelligence Report</h3>
              </div>
              <div className="text-right shrink-0">
                <div className="text-3xl font-black text-emerald-400">A</div>
                <div className="text-[10px] text-gray-600 uppercase tracking-wider">Example grade</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {walletSignals.map(({ label, value, icon: Icon, tone }) => (
                <div key={label} className="rounded-2xl border border-white/5 bg-dark-700/35 p-4">
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center mb-3 ${tone}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-sm font-bold text-white">{label}</div>
                  <div className="text-[10px] text-gray-600 mt-1">{value}</div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.04] p-4">
              <p className="text-xs text-gray-400 leading-relaxed">
                Built as a separate full tool so the homepage stays fast, focused and easy to scan.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DeveloperApiSection() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="glass-card p-8 flex flex-col lg:flex-row items-start lg:items-center gap-6 border border-blue-500/15">
        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
          <Code2 className="w-6 h-6 text-blue-400" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-blue-400 font-semibold uppercase tracking-wider mb-2">Developer platform</p>
          <h3 className="text-xl font-bold text-white mb-2">Use AirdropGuard intelligence in your own product.</h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            API access is designed for wallets, portfolio trackers, research tools, DeFi dashboards, Discord bots and Telegram bots.
          </p>
        </div>
        <Link
          to="/api-docs"
          className="w-full sm:w-auto shrink-0 px-6 py-3 rounded-xl text-sm font-semibold bg-blue-500/15 border border-blue-500/30 text-blue-300 hover:bg-blue-500/25 hover:text-white transition-colors text-center"
        >
          View API Docs
        </Link>
      </div>
    </section>
  );
}

function RoadmapPreview() {
  const items = [
    { title: 'Now', text: 'Verified listings, intelligence reports, community results and wallet safety tools.' },
    { title: 'Next', text: 'Smarter alerts, project signal history, stronger dashboard personalisation and API improvements.' },
    { title: 'Future', text: 'Browser extension, mobile app, enterprise intelligence and broader multi-chain coverage.' },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs text-neon-purple font-semibold uppercase tracking-wider mb-2">Roadmap</p>
          <h2 className="text-2xl sm:text-3xl font-black text-white">Building the trust layer for airdrops.</h2>
        </div>
        <Link to="/whitepaper" className="text-sm text-neon-purple hover:text-neon-purple/80 transition-colors">
          Read whitepaper →
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {items.map(item => (
          <div key={item.title} className="glass-card p-6 border border-white/5">
            <div className="text-xs text-neon-purple font-semibold uppercase tracking-wider mb-2">{item.title}</div>
            <p className="text-sm text-gray-400 leading-relaxed">{item.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CommunitySection() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="glass-card p-8 flex flex-col sm:flex-row items-center gap-6 border border-indigo-500/20">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
          <MessageSquare className="w-6 h-6 text-indigo-400" />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h3 className="text-base font-bold text-white mb-1">Join the AirdropGuard community</h3>
          <p className="text-sm text-gray-500">Get alerts, safety tips and discussion from other airdrop researchers. Free to join.</p>
        </div>
        <a
          href="https://discord.gg/uDP9xm6Dv"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full sm:w-auto shrink-0 px-6 py-3 rounded-xl text-sm font-semibold bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/25 hover:text-white transition-colors text-center"
        >
          Join Discord
        </a>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
      <div className="glass-card p-8 sm:p-10 text-center border border-neon-purple/15">
        <Activity className="w-8 h-8 text-neon-purple mx-auto mb-4" />
        <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">Ready to find your next airdrop?</h2>
        <p className="text-sm text-gray-500 max-w-2xl mx-auto mb-6">
          Browse verified crypto airdrops, compare trust signals and check before you connect.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <a href="#airdrops" className="px-6 py-3 rounded-2xl text-sm font-bold bg-neon-purple text-white hover:bg-neon-purple/90 transition-colors">
            Explore Airdrops
          </a>
          <Link to="/submit" className="px-6 py-3 rounded-2xl text-sm font-bold border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-colors">
            Submit a Project
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [airdrops, setAirdrops] = useState<Airdrop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_AIRDROPS);
  const showDeferredSections = useDeferredRender();

  const tab = (searchParams.get('filter') as Tab) ?? 'all';

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_AIRDROPS);
  }, [tab, filters]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('airdrops')
        .select('*')
        .eq('published', true)
        .eq('review_status', 'approved')
        .eq('is_demo', false)
        .neq('listing_state', 'scam_alert')
        .order('sort_order', { ascending: true });

      if (err) {
        setError(err.message);
      } else {
        setAirdrops(data ?? []);
      }
      setLoading(false);
    }

    load();
  }, []);

  const featured = useMemo(
    () =>
      airdrops.find(
        a =>
          isFeaturedPlacement(a) &&
          (a.listing_state === 'verified' || a.human_verified) &&
          (a.trust_score === null || a.trust_score >= 60) &&
          a.risk_level !== 'High'
      ) ??
      airdrops.find(
        a =>
          isFeaturedPlacement(a) &&
          a.risk_level !== 'High' &&
          (a.trust_score === null || a.trust_score >= 60)
      ) ??
      null,
    [airdrops]
  );

  const filtered = useMemo(() => {
    let list = airdrops;

    if (tab === 'trending') list = list.filter(a => a.is_trending);
    else if (tab === 'ending') list = list.filter(a => a.status === 'Ending Soon');
    else if (tab === 'featured') list = list.filter(a => isFeaturedPlacement(a));

    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.ticker?.toLowerCase().includes(q) ||
        a.ai_summary?.toLowerCase().includes(q)
      );
    }
    if (filters.blockchain) list = list.filter(a => a.blockchain.includes(filters.blockchain as never));
    if (filters.category) list = list.filter(a => a.category.includes(filters.category as never));
    if (filters.reward) list = list.filter(a => a.reward_potential === filters.reward);
    if (filters.risk) list = list.filter(a => a.risk_level === filters.risk);
    if (filters.difficulty) list = list.filter(a => a.difficulty === filters.difficulty);

    return list;
  }, [airdrops, tab, filters]);

  const visibleAirdrops = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  );

  const hasMoreAirdrops = visibleCount < filtered.length;

  const stats = useMemo<StatItem[]>(() => {
    const active = airdrops.filter(a => a.status !== 'Expired').length;
    const verified = airdrops.filter(a => a.human_verified || a.listing_state === 'verified').length;
    const chains = new Set(airdrops.flatMap(a => a.blockchain ?? [])).size;
    const lowRisk = airdrops.filter(a => a.risk_level === 'Low').length;

    return [
      { label: 'Active Airdrops', value: active, sub: 'Approved opportunities currently visible' },
      { label: 'Verified Listings', value: verified, sub: 'Human-verified or analyst-reviewed projects' },
      { label: 'Chains Covered', value: chains, sub: 'Networks represented in listings' },
      { label: 'Low Risk Options', value: lowRisk, sub: 'Listings currently marked lower risk' },
    ];
  }, [airdrops]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'All Airdrops', icon: <Grid3X3 className="w-3.5 h-3.5" /> },
    { key: 'trending', label: 'Trending', icon: <Flame className="w-3.5 h-3.5" /> },
    { key: 'ending', label: 'Ending Soon', icon: <Clock className="w-3.5 h-3.5" /> },
    { key: 'featured', label: 'Featured', icon: <TrendingUp className="w-3.5 h-3.5" /> },
  ];
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
          'AirdropGuard is a crypto intelligence platform providing AI-assisted analysis, human-reviewed airdrops, scam alerts, trust signals, wallet safety tools and educational resources to help users research before participating.',
        sameAs: ['https://x.com/Dropguardai'],
      },
      {
        '@type': 'WebSite',
        '@id': 'https://airdropguard.com/#website',
        name: 'AirdropGuard',
        url: 'https://airdropguard.com',
        publisher: {
          '@id': 'https://airdropguard.com/#organization',
        },
        description:
          'Discover verified crypto airdrops, compare trust signals, analyse project reputation, review AI-assisted intelligence and use read-only wallet security tools. Check Before You Connect.',
      },
    ],
  };
  return (
    <>
         <SEO
        title="AirdropGuard | Verified Crypto Airdrops & Wallet Safety Tools"
        description="Find verified crypto airdrops with AI trust scores, human review, task guides, scam warnings and wallet safety tools before you connect."
        canonical="https://airdropguard.com/"
        schema={homepageSchema}
      />
      <HeroV2 />
      <PlatformStats stats={stats} />
      <TrustStrip />
      <section id="airdrops" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs text-neon-purple font-semibold uppercase tracking-wider mb-2">Live airdrop discovery</p>
            <h2 className="text-2xl sm:text-3xl font-black text-white">Latest verified crypto airdrops</h2>
            <p className="text-sm text-gray-500 mt-2 max-w-2xl">
              Browse active opportunities first, then filter by chain, category, reward, risk and difficulty before opening each full research report.
            </p>
          </div>
          <Link to="/submit" className="text-sm text-neon-purple hover:text-neon-purple/80 transition-colors">
            Submit project →
          </Link>
        </div>

        {featured && tab === 'all' && !filters.search ? (
          <div className="mb-6">
            <FeaturedSpotlight airdrop={featured} />
            <SponsoredTransparencyNote />
          </div>
        ) : null}

        <div className="-mx-4 flex items-center gap-1 mb-6 border-b border-white/5 pb-1 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => {
                if (t.key === 'all') {
                  setSearchParams({});
                } else {
                  setSearchParams({ filter: t.key });
                }
              }}
              className={`flex min-h-[42px] shrink-0 items-center gap-1.5 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'text-white bg-white/5 border-b-2 border-neon-purple'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t.icon}
              {t.label}
              {t.key === 'trending' && (
                <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-neon-purple animate-pulse" />
              )}
            </button>
          ))}
          <div className="ml-auto hidden sm:block text-xs text-gray-600">
            {!loading && <span>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>}
          </div>
        </div>

        <div className="mb-8">
          <FilterBar filters={filters} onChange={setFilters} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 gap-3 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading airdrops...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-24 gap-3 text-rose-400">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-gray-500 text-sm">No airdrops match your filters.</p>
            <button
              onClick={() => {
                setFilters(DEFAULT_FILTERS);
                setSearchParams({});
              }}
              className="mt-3 text-sm text-neon-purple hover:text-neon-purple/80 transition-colors"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {visibleAirdrops.map((airdrop) => (
                <AirdropCard
                  key={airdrop.id}
                  airdrop={airdrop}
                />
              ))}
            </div>

            {hasMoreAirdrops && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((count) => count + LOAD_MORE_AIRDROPS)}
                  className="min-h-[46px] rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-bold text-gray-200 transition-colors hover:bg-white/[0.08] hover:text-white"
                >
                  Load More Airdrops
                  <span className="ml-2 text-xs font-normal text-gray-500">
                    {Math.min(filtered.length - visibleCount, LOAD_MORE_AIRDROPS)} more
                  </span>
                </button>
              </div>
            )}
          </>
        )}
      </section>


      {showDeferredSections && (
        <>
          <WalletCheckerSection />
          <IntelligencePillars />
          <HowItWorks />

          <TrustScoreSection />

          <ComparisonSection />
          <IntelligenceWorkflow />
          <DeveloperApiSection />

          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="glass-card p-5 sm:p-8 flex flex-col sm:flex-row items-center gap-5 sm:gap-6 border border-sky-500/15">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
                <Send className="w-6 h-6 text-sky-400" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-base font-bold text-white mb-1">Running an airdrop?</h3>
                <p className="text-sm text-gray-500">Submit your project for review. Approved listings can appear with trust, risk and opportunity intelligence.</p>
              </div>
              <Link
                to="/submit"
                className="w-full sm:w-auto shrink-0 px-6 py-3 rounded-xl text-sm font-semibold bg-sky-500/15 border border-sky-500/30 text-sky-300 hover:bg-sky-500/25 hover:text-white transition-colors text-center"
              >
                Submit Your Project
              </Link>
            </div>
          </section>

          <CommunitySection />
          <RoadmapPreview />
          <FinalCta />

          <NewsletterSection />
        </>
      )}
    </>
  );
}
