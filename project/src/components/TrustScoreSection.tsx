import { Github, Users, ShieldCheck, MessageSquare, Globe, BarChart3, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const CRITERIA = [
  {
    icon: Github,
    title: 'GitHub Activity',
    weight: 20,
    desc: 'Commit frequency, contributor count, and code quality signals. Dead repos are a red flag.',
    color: 'text-sky-400',
    bg: 'bg-sky-500/10 border-sky-500/20',
  },
  {
    icon: Users,
    title: 'Team Transparency',
    weight: 20,
    desc: 'Are the founders doxxed? LinkedIn verified? Anonymous teams receive lower scores by default.',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/20',
  },
  {
    icon: ShieldCheck,
    title: 'Smart Contract Security',
    weight: 20,
    desc: 'Audit reports, contract verification status, and historical exploit history all factor in.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
  },
  {
    icon: MessageSquare,
    title: 'Community Quality',
    weight: 15,
    desc: 'Real engagement over vanity metrics. Bot-inflated groups and bought followers get flagged.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
  },
  {
    icon: Globe,
    title: 'Website Credibility',
    weight: 15,
    desc: 'Domain age, SSL, content quality, and absence of copy-paste from other projects.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
  },
  {
    icon: BarChart3,
    title: 'Tokenomics',
    weight: 10,
    desc: 'Vesting schedules, supply distribution, team allocation, and inflation mechanics.',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10 border-rose-500/20',
  },
];

function ScoreRing({ score }: { score: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative flex h-24 w-24 items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 88 88" aria-hidden="true">
        <circle cx="44" cy="44" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>

      <div className="z-10 text-center">
        <div className="text-2xl font-bold leading-none text-white">{score}</div>
        <div className="mt-0.5 text-[10px] text-gray-500">/100</div>
      </div>
    </div>
  );
}

export function TrustScoreBadge({ score, size = 'sm', to }: { score: number | null; size?: 'sm' | 'lg'; to?: string }) {
  if (score === null || score === undefined) return null;

  const color =
    score >= 75
      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25'
      : score >= 50
      ? 'text-amber-400 bg-amber-500/10 border-amber-500/25'
      : 'text-rose-400 bg-rose-500/10 border-rose-500/25';

  if (size === 'lg') {
    const content = (
      <div className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 transition-colors ${color}`}>
        <ShieldCheck className="h-4 w-4" />
        <span className="text-sm font-bold">{score}</span>
        <span className="text-xs opacity-70">/100</span>
      </div>
    );

    if (to) {
      return (
        <Link
          to={to}
          aria-label="Open scoring methodology"
          className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40"
        >
          {content}
        </Link>
      );
    }

    return content;
  }

  const content = (
    <div className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold transition-colors ${color}`}>
      <ShieldCheck className="h-3 w-3" />
      {score}
    </div>
  );

  if (to) {
    return (
      <Link
        to={to}
        aria-label="Open scoring methodology"
        className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40"
      >
        {content}
      </Link>
    );
  }

  return content;
}

export default function TrustScoreSection() {
  const exampleScore = 82;

  return (
    <section className="border-t border-white/5 bg-gradient-to-b from-dark-900/60 to-transparent py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
          <Link
            to="/whitepaper#methodology"
            aria-label="Open scoring methodology"
            className="mb-5 inline-flex min-h-[40px] items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[11px] font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/10 hover:text-emerald-300 sm:text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/35"
          >
            <UserCheck className="h-3.5 w-3.5 shrink-0" />
            Human Verified — Every Single Listing
          </Link>

          <h2 className="mb-4 text-2xl font-black text-white sm:text-4xl">
            How We Score Projects
          </h2>

          <p className="mb-3 text-sm leading-relaxed text-gray-400 sm:text-base">
            Each airdrop gets an independent Trust Score from 0 to 100 across six weighted criteria —
            reviewed by a human analyst before publication.
          </p>

          <p className="text-xs italic text-gray-600 sm:text-sm">
            The trust layer for crypto airdrops — built around evidence, not hype.
          </p>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3 lg:gap-8">
          <div className="glass-card flex flex-col items-center rounded-3xl p-6 text-center sm:p-8 lg:sticky lg:top-24">
            <div className="mb-5 h-10 w-10 overflow-hidden rounded-xl">
              <picture>
                <source srcSet="/airdrop_guards.webp" type="image/webp" />
                <img
                  src="/airdrop_guards.png"
                  alt="AirdropGuard logo"
                  width={40}
                  height={40}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </picture>
            </div>

            <p className="mb-4 text-xs uppercase tracking-wider text-gray-500">Example Score</p>
            <ScoreRing score={exampleScore} />

            <p className="mb-1 mt-3 text-sm font-semibold text-emerald-400">High Confidence</p>
            <p className="mb-6 mt-2 text-xs leading-relaxed text-gray-500">
              A score of 75+ indicates a project that passes major credibility checks.
            </p>

            <div className="w-full space-y-2 text-left">
              {[
                { range: '75–100', label: 'High Confidence', color: 'bg-emerald-500' },
                { range: '50–74', label: 'Moderate', color: 'bg-amber-500' },
                { range: '0–49', label: 'Use Caution', color: 'bg-rose-500' },
              ].map((r) => (
                <div key={r.range} className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] px-3 py-2">
                  <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${r.color}`} />
                  <span className="text-xs text-gray-400">{r.label}</span>
                  <span className="ml-auto font-mono text-xs text-gray-600">{r.range}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex w-full items-center justify-center gap-2 border-t border-white/5 pt-5">
              <UserCheck className="h-4 w-4 text-neon-blue" />
              <span className="text-xs text-gray-400">Reviewed by a human analyst</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-2">
            {CRITERIA.map((c) => (
              <div key={c.title} className="glass-card rounded-2xl p-4 transition-colors hover:border-white/10 sm:p-5">
                <div className="mb-3 flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${c.bg}`}>
                    <c.icon className={`h-[18px] w-[18px] ${c.color}`} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold leading-snug text-white">{c.title}</h3>
                      <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold ${c.bg} ${c.color}`}>
                        {c.weight}%
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-gray-500">{c.desc}</p>

                <div className="mt-3 h-1 overflow-hidden rounded-full bg-dark-700">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-neon-purple to-neon-blue"
                    style={{ width: `${(c.weight / 20) * 100}%` }}
                  />
                </div>

                <div className="mt-1 flex justify-between">
                  <span className="text-[10px] text-gray-600">Weight</span>
                  <span className="font-mono text-[10px] text-gray-600">{c.weight} pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass mt-10 grid gap-4 rounded-2xl border border-white/5 px-4 py-5 text-center sm:mt-14 sm:grid-cols-3 sm:px-6">
          <div className="flex items-center justify-center gap-2.5">
            <UserCheck className="h-5 w-5 shrink-0 text-neon-blue" />
            <span className="text-sm font-medium text-gray-300">Manually reviewed before going live</span>
          </div>

          <div className="flex items-center justify-center gap-2.5">
            <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400" />
            <span className="text-sm font-medium text-gray-300">Updated when conditions change</span>
          </div>

          <div className="flex items-center justify-center gap-2.5">
            <BarChart3 className="h-5 w-5 shrink-0 text-neon-purple" />
            <span className="text-sm font-medium text-gray-300">Independent scoring — never pay-to-win</span>
          </div>
        </div>
      </div>
    </section>
  );
}