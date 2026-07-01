import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, UserPlus, Key, TrendingUp } from 'lucide-react';

const STATS = [
  { value: '25+', label: 'Active Airdrops' },
  { value: '100%', label: 'Human Verified' },
  { value: 'AI', label: 'Trust Scored' },
];

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
    </svg>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M21.5 4.5L18.3 19.6c-.2.9-.8 1.1-1.5.7l-4.1-3-2 1.9c-.2.2-.4.4-.8.4l.3-4.3 7.8-7.1c.3-.3-.1-.4-.5-.1l-9.6 6-4.1-1.3c-.9-.3-.9-.9.2-1.3L20 4c.8-.3 1.5.2 1.5.5z" />
    </svg>
  );
}

const SOCIALS = [
  { href: 'https://x.com/Dropguardai', label: 'X', Icon: XIcon, hover: 'hover:text-white hover:border-white/30' },
  { href: 'https://discord.gg/uDP9xm6Dv', label: 'Discord', Icon: DiscordIcon, hover: 'hover:text-indigo-400 hover:border-indigo-400/30' },
  { href: 'https://www.tiktok.com/@airdropguard1?_r=1&_t=ZN-979TcOID05e', label: 'TikTok', Icon: TikTokIcon, hover: 'hover:text-pink-400 hover:border-pink-400/30' },
  { href: 'https://t.me/+yKvXlsatqKs0M2M0', label: 'Telegram', Icon: TelegramIcon, hover: 'hover:text-sky-400 hover:border-sky-400/30' },
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
          {SOCIALS.map(({ href, label, Icon, hover }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Follow AirdropGuard on ${label}`}
              className={`glass flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-gray-500 transition-colors ${hover}`}
            >
              <Icon className="w-4 h-4" />
            </a>
          ))}
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