import { useEffect, useMemo, useState } from 'react';
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
import { supabase } from '../lib/supabase';
import type { Airdrop } from '../lib/types';
import AirdropCard from '../components/AirdropCard';
import CommunityResults from '../components/CommunityResults';
import FeaturedSpotlight from '../components/FeaturedSpotlight';
import FilterBar, { type Filters } from '../components/FilterBar';
import NewsletterSection from '../components/NewsletterSection';
import SEO from '../components/SEO';
import TrustStrip from '../components/TrustStrip';

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
type ShowcaseTab = 'dashboard' | 'wallet' | 'copilot';

type CounterItem = {
  label: string;
  value: number;
  suffix?: string;
  sub: string;
};

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
        <Link to="/auth" className="rounded-[28px] border border-cyan-400/20 bg-[linear-gradient(160deg,rgba(34,211,238,0.12),rgba(15,23,42,0.96))] p-4 shadow-[0_0_24px_rgba(34,211,238,0.08)]">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Bot className="h-4 w-4 text-cyan-300" />
            Ask AI
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-gray-300">Get a fast recommendation before you spend time or connect anywhere.</p>
        </Link>

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
          <Link
            to="/auth"
            className="inline-flex min-h-[46px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-bold text-white"
          >
            Ask AI
          </Link>
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
    <section className="relative overflow-hidden border-b border-white/5 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(139,92,246,0.16),transparent_24%),linear-gradient(180deg,#050b18_0%,#081225_55%,#060d1b_100%)]">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        {[0, 1, 2, 3, 4, 5].map(index => (
          <span
            key={index}
            className="absolute h-1.5 w-1.5 rounded-full bg-sky-300/40 animate-pulse"
            style={{
              top: `${14 + index * 12}%`,
              left: `${10 + ((index * 13) % 70)}%`,
              animationDuration: `${2.8 + index * 0.35}s`,
            }}
          />
        ))}
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 pb-8 pt-8 sm:px-6 sm:pb-20 sm:pt-16 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:px-8 lg:pb-24 lg:pt-20">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200 sm:text-xs">
            <Sparkles className="h-3.5 w-3.5 text-sky-300" />
            <span className="sm:hidden">Live AI crypto app</span>
            <span className="hidden sm:inline">Premium AI-powered Web3 intelligence</span>
          </div>

          <h1 className="mt-5 max-w-4xl text-[2rem] font-black leading-[0.95] tracking-tight text-white sm:mt-6 sm:text-5xl lg:text-6xl">
            <span className="sm:hidden">AI-Powered Crypto Intelligence</span>
            <span className="hidden sm:inline">The AI-Powered Platform for Smarter Crypto Airdrops</span>
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-relaxed text-gray-300 sm:mt-5 sm:text-lg">
            <span className="sm:hidden">Find safer airdrops. Avoid scams. Farm smarter.</span>
            <span className="hidden sm:inline">Discover verified opportunities, analyse risks with AI, check your wallet safely and focus on the projects that deserve your time.</span>
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <a
              href="#airdrops"
              className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-500/20 transition-colors hover:bg-cyan-400"
            >
              Explore Airdrops
              <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              to="/auth"
              className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/[0.08]"
            >
              Ask AI
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 text-[11px] font-semibold text-gray-300 sm:hidden">
            {['Live trust scores', 'Scam alerts', 'Read-only wallet checks', 'AI research'].map(item => (
              <span key={item} className="rounded-full border border-cyan-400/15 bg-white/[0.04] px-3 py-2 text-center backdrop-blur">
                {item}
              </span>
            ))}
          </div>

          <div className="mt-7 hidden flex-wrap gap-2.5 text-xs font-semibold text-gray-300 sm:flex">
            {['Dashboard', 'Airdrops', 'Wallet Intelligence', 'Copilot', 'Pricing'].map(item => (
              <span key={item} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">
                {item}
              </span>
            ))}
          </div>

          <div className="mt-8 hidden max-w-2xl gap-3 sm:grid sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur">
              <div className="text-2xl font-black text-white">{stats.analysed}</div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-gray-500">Projects analysed</div>
            </div>
            <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.06] px-4 py-3 backdrop-blur">
              <div className="text-2xl font-black text-white">{stats.verified}</div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-emerald-300">Verified listings</div>
            </div>
            <div className="rounded-2xl border border-violet-500/15 bg-violet-500/[0.06] px-4 py-3 backdrop-blur">
              <div className="text-2xl font-black text-white">{stats.aiAnalyses}</div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-violet-300">AI analyses</div>
            </div>
          </div>
        </div>

        <div className="relative z-10 hidden lg:block">
          <div className="absolute -inset-6 rounded-[36px] bg-sky-500/10 blur-3xl" />
          <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(160deg,rgba(7,11,24,0.96)_8%,rgba(8,14,34,0.96)_50%,rgba(12,9,35,0.96)_100%)] p-5 shadow-[0_0_40px_rgba(56,189,248,0.15),0_0_90px_rgba(99,102,241,0.1)] backdrop-blur-xl sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-300">Live platform preview</div>
                <h2 className="mt-1 text-xl font-black text-white">AirdropGuard Command Centre</h2>
              </div>
              <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">
                Live intelligence
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Verified</div>
                <div className="mt-2 text-2xl font-black text-white">{stats.verified}</div>
                <div className="mt-1 text-xs text-gray-400">Projects reviewed by AirdropGuard</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Wallet safety</div>
                <div className="mt-2 text-2xl font-black text-white">Read-only</div>
                <div className="mt-1 text-xs text-gray-400">No signatures, no seed phrase</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Copilot</div>
                <div className="mt-2 text-2xl font-black text-white">AI+</div>
                <div className="mt-1 text-xs text-gray-400">Research guidance in seconds</div>
              </div>
            </div>

            <div className="mt-4 rounded-3xl border border-white/10 bg-[#0d152b]/80 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Priority opportunities</div>
                  <div className="mt-1 text-sm font-bold text-white">What deserves attention right now</div>
                </div>
                {featured && <div className="text-xs text-sky-300">Featured: {featured.name}</div>}
              </div>

              <div className="space-y-3">
                {loading && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-6 text-sm text-gray-400">
                    Loading dashboard preview...
                  </div>
                )}

                {!loading && previewRows.map((airdrop, index) => (
                  <div key={airdrop.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-400/25 bg-sky-500/10 text-sm font-black text-sky-200">
                      0{index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-white">{airdrop.name}</div>
                      <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-gray-400">
                        <span>Trust {airdrop.trust_score ?? 'Unknown'}</span>
                        <span>Risk {airdrop.risk_level}</span>
                        <span>{airdrop.estimated_reward || 'Reward TBA'}</span>
                      </div>
                    </div>
                    <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-300">
                      {airdrop.listing_state === 'verified' || airdrop.human_verified ? 'Verified' : 'Review'}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-violet-500/20 bg-violet-500/[0.07] p-4">
                <div className="text-[10px] uppercase tracking-[0.14em] text-violet-300">Copilot recommendation</div>
                <p className="mt-2 text-sm leading-relaxed text-gray-200">
                  Focus on <span className="font-semibold text-white">verified listings with strong trust signals</span>, then use Wallet Intelligence before connecting to anything new.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      icon: Search,
      title: 'Discover',
      desc: 'Browse verified and under-review crypto airdrops.',
    },
    {
      icon: Brain,
      title: 'Analyse',
      desc: 'AI + human intelligence evaluates risk, trust and opportunity.',
    },
    {
      icon: CheckSquare,
      title: 'Farm Smarter',
      desc: 'Complete the best opportunities with confidence.',
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">How it works</div>
        <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">A clearer path from discovery to action</h2>
        <p className="mt-4 text-sm leading-relaxed text-gray-400 sm:text-base">
          First-time visitors should know exactly what to do: discover credible opportunities, understand the risk, then focus effort where it matters.
        </p>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.title} className="relative rounded-[28px] border border-white/10 bg-white/[0.03] p-7 backdrop-blur">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-400/25 bg-sky-500/10 text-sky-300">
                <Icon className="h-5 w-5" />
              </div>
              <div className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Step 0{index + 1}</div>
              <h3 className="mt-2 text-xl font-black text-white">{step.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-400">{step.desc}</p>
              {index < steps.length - 1 && (
                <div className="mt-6 hidden text-sky-300 lg:block">↓</div>
              )}
            </div>
          );
        })}
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
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">Trust</div>
        <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">Built around evidence, safety and repeatable research</h2>
      </div>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
        {counters.map(item => <CounterCard key={item.label} item={item} />)}
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
              Explore Airdrops
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

  const tab = (searchParams.get('filter') as Tab) ?? 'all';

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_AIRDROPS);
  }, [tab, filters]);

  useEffect(() => {
    const activeFilters = [filters.blockchain, filters.category, filters.reward, filters.risk, filters.difficulty]
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
          .neq('listing_state', 'scam_alert')
          .order('sort_order', { ascending: true }),
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
    [airdrops],
  );

  const verifiedProjects = useMemo(
    () => airdrops.filter(item => item.listing_state === 'verified' || item.human_verified),
    [airdrops],
  );

  const topVerified = useMemo(
    () => [...verifiedProjects].sort((a, b) => (b.trust_score ?? 0) - (a.trust_score ?? 0)),
    [verifiedProjects],
  );

  const filtered = useMemo(() => {
    let list = airdrops;

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

    return list;
  }, [airdrops, tab, filters]);

  const visibleAirdrops = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  );

  const hasMoreAirdrops = visibleCount < filtered.length;

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
          'AirdropGuard is a crypto intelligence platform providing AI-assisted analysis, human-reviewed airdrops, wallet safety tools, trust signals and Copilot guidance.',
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
          'Discover verified crypto airdrops, analyse risk with AI, check your wallet safely and use Copilot to focus on opportunities that deserve your time.',
      },
    ],
  };

  const trustCounters: CounterItem[] = useMemo(() => {
    const aiAnalyses = airdrops.filter(item => item.ai_summary || item.ai_risk_analysis || item.ai_reward_estimate).length;
    return [
      {
        label: 'Projects Analysed',
        value: airdrops.length,
        sub: 'Approved projects currently visible on the platform.',
      },
      {
        label: 'Verified Listings',
        value: verifiedProjects.length,
        sub: 'Listings reviewed and surfaced with stronger confidence.',
      },
      {
        label: 'Community Members',
        value: communityCount,
        sub: 'Community result submissions currently recorded.',
      },
      {
        label: 'Wallets Analysed',
        value: walletCount,
        sub: 'Saved wallet intelligence reports in platform history.',
      },
      {
        label: 'AI Analyses',
        value: aiAnalyses,
        sub: 'Listings with AI-generated intelligence coverage.',
      },
    ];
  }, [airdrops, verifiedProjects.length, communityCount, walletCount]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'All Airdrops', icon: <Grid3X3 className="w-3.5 h-3.5" /> },
    { key: 'trending', label: 'Trending', icon: <Flame className="w-3.5 h-3.5" /> },
    { key: 'ending', label: 'Ending Soon', icon: <Clock className="w-3.5 h-3.5" /> },
    { key: 'featured', label: 'Featured', icon: <Layers3 className="w-3.5 h-3.5" /> },
  ];

  return (
    <>
      <SEO
        title="AirdropGuard | The AI-Powered Platform for Smarter Crypto Airdrops"
        description="Discover verified opportunities, analyse risk with AI, check your wallet safely and use Copilot to focus on the crypto airdrops that deserve your time."
        canonical="https://airdropguard.com/"
        schema={homepageSchema}
      />

      <HeroSection
        loading={loading}
        stats={{
          analysed: airdrops.length,
          verified: verifiedProjects.length,
          aiAnalyses: airdrops.filter(item => item.ai_summary || item.ai_risk_analysis || item.ai_reward_estimate).length,
        }}
        featured={featured}
        topVerified={topVerified}
      />

      <TodaysBestOpportunityCard airdrop={topVerified[0] ?? featured} />
      <MobileActionCards />
      <MobileInfoAccordions />

      <div className="hidden sm:block">
        <TrustStrip />
      </div>
      <div className="hidden md:block">
        <HowItWorksSection />
        <WhyAirdropGuardSection />
        <LivePlatformSection airdrops={topVerified.slice(0, 6)} verifiedCount={verifiedProjects.length} />
        <TrustSection counters={trustCounters} />
        <AudienceSection />
      </div>

      <section id="airdrops" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-20">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">Explore Airdrops</div>
            <h2 className="mt-3 text-2xl font-black text-white sm:text-4xl">
              <span className="sm:hidden">Top airdrops right now</span>
              <span className="hidden sm:inline">Find the opportunities that deserve your time</span>
            </h2>
            <p className="mt-3 max-w-2xl text-xs leading-relaxed text-gray-400 sm:text-base">
              Browse live opportunities, filter by chain and risk, then open the full research page for trust signals, rewards, tasks and supporting evidence.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/dashboard" className="inline-flex min-h-[46px] items-center justify-center rounded-2xl border border-sky-400/25 bg-sky-500/10 px-5 py-3 text-sm font-semibold text-sky-200 transition-colors hover:bg-sky-500/20">
              Open Dashboard
            </Link>
            <Link to="/pricing" className="inline-flex min-h-[46px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08]">
              View Pricing
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
        ) : filtered.length === 0 ? (
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
              {visibleAirdrops.map((airdrop, index) => {
                const desktopOnlyInitially = visibleCount === INITIAL_VISIBLE_AIRDROPS && index >= 3 && index < INITIAL_VISIBLE_AIRDROPS;

                return (
                  <div key={airdrop.id} className={desktopOnlyInitially ? 'hidden sm:block' : ''}>
                    <AirdropCard airdrop={airdrop} />
                  </div>
                );
              })}
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

      <div className="hidden md:block">
        <SocialProofSection featured={featured ?? topVerified[0] ?? null} latestVerified={topVerified} />
      </div>
      <div className="hidden md:block">
        <FinalCtaSection />
      </div>
      <div className="hidden md:block">
        <NewsletterSection />
      </div>
    </>
  );
}