import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, UserPlus, Key, TrendingUp } from 'lucide-react';
import SocialLinksStrip from './SocialLinksStrip';

const STATS = [
  { value: '25+', label: 'Active Airdrops' },
  { value: '100%', label: 'Human Verified' },
  { value: 'AI', label: 'Trust Scored' },
];

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 pt-10 pb-12 sm:px-6 sm:pt-16 sm:pb-16 lg:pt-20 lg:pb-20">
      <div className="absolute inset-0 pointer-events-none hidden sm:block">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[520px] h-[320px] bg-neon-purple/8 rounded-full blur-[90px]" />
        <div className="absolute top-1/3 right-1/4 w-56 h-56 bg-neon-blue/6 rounded-full blur-[70px]" />
      </div>

      <div className="relative max-w-4xl mx-auto text-center">
        <div className="flex items-center justify-center gap-3 mb-6 sm:mb-8">
          <picture>
            <source srcSet="/airdrop_guards.webp" type="image/webp" />
            <img
              src="/airdrop_guards.png"
              alt="AirdropGuard logo"
              width={56}
              height={56}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover shadow-xl shadow-neon-purple/20"
            />
          </picture>

          <div className="text-left min-w-0">
            <div className="text-lg sm:text-xl font-bold gradient-text leading-tight">
              AirdropGuard
            </div>
            <div className="text-xs text-gray-500 leading-tight">
              Discover. Analyze. Airdrop.
            </div>
          </div>
        </div>

        <div className="mx-auto mb-5 sm:mb-6 inline-flex max-w-full items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[11px] sm:text-xs font-semibold text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Every listing reviewed by a human analyst</span>
        </div>

        <h1 className="mx-auto mb-4 max-w-3xl text-3xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
          Find Legit Crypto Airdrops.{' '}
          <span className="gradient-text">Avoid Scams. Earn More.</span>
        </h1>

        <p className="mx-auto mb-7 max-w-2xl text-sm leading-relaxed text-gray-400 sm:text-lg sm:leading-8">
          Not every airdrop deserves your time. We help you discover which ones do — with trust scores,
          effort ratings, and opportunity rankings for every verified listing.
        </p>

        <div className="mx-auto mb-6 flex w-full max-w-sm flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row sm:items-center">
          <Link
            to="/"
            className="btn-primary flex min-h-[46px] items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold"
          >
            <ArrowRight className="w-4 h-4" />
            Browse Airdrops
          </Link>

          <Link
            to="/auth"
            className="glass flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-white/10 px-6 py-3 text-sm font-medium text-gray-300 transition-colors hover:border-white/20 hover:text-white"
          >
            <UserPlus className="w-4 h-4 text-neon-purple" />
            Sign Up Free
          </Link>

          <Link
            to="/api-docs"
            className="glass flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-white/10 px-6 py-3 text-sm font-medium text-gray-300 transition-colors hover:border-white/20 hover:text-white"
          >
            <Key className="w-4 h-4 text-neon-blue" />
            API Access
          </Link>
        </div>

        <div className="mb-10 flex flex-wrap items-center justify-center gap-3 sm:mb-12">
          <span className="w-full text-xs text-gray-600 sm:w-auto">Follow us</span>
          <SocialLinksStrip variant="icons" className="justify-center" />
        </div>

        <div className="mx-auto grid max-w-sm grid-cols-2 gap-3 sm:max-w-2xl sm:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-4 text-center">
              <div className="mb-0.5 text-xl font-bold gradient-text sm:text-2xl">{s.value}</div>
              <div className="text-[11px] text-gray-600">{s.label}</div>
            </div>
          ))}

          <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-4 text-center">
            <div className="mb-0.5 flex items-center justify-center gap-1">
              <TrendingUp className="w-4 h-4 text-neon-purple" />
              <span className="text-xl font-bold gradient-text sm:text-2xl">Live</span>
            </div>
            <div className="text-[11px] text-gray-600">Real-time Updates</div>
          </div>
        </div>
      </div>
    </section>
  );
}