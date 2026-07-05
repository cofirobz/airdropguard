import { useState } from 'react';
import SEO from '../components/SEO';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Brain,
  CheckCircle2,
  FileText,
  History,
  Layers3,
  LockKeyhole,
  Network,
  Shield,
  Sparkles,
  Trophy,
} from 'lucide-react';
import WalletSafetySnapshot from '../components/WalletSafetySnapshot';

const trustPillars = [
  'Read-only',
  'Multi-chain',
  'AI Powered',
  'Privacy First',
];

const supportedChains = [
  'Ethereum',
  'Base',
  'Arbitrum',
  'Optimism',
  'Polygon',
  'BNB',
  'Solana',
  'Sui',
];

const retentionFeatures = [
  {
    icon: Bell,
    title: 'Risk alerts',
    text: 'Get notified when new threats, risky approvals, or suspicious assets appear in this wallet profile.',
  },
  {
    icon: FileText,
    title: 'Exportable reports',
    text: 'Generate clean reports for compliance checks, team reviews, and partner due diligence.',
  },
  {
    icon: History,
    title: 'Scan history',
    text: 'Track wallet health over time and quickly spot whether risk is rising or improving.',
  },
  {
    icon: Trophy,
    title: 'Wallet achievements',
    text: 'Reward consistent safe behavior such as clean approvals, balanced activity, and better hygiene.',
  },
  {
    icon: Sparkles,
    title: 'Weekly wallet health',
    text: 'Run a weekly check-in to monitor confidence, security posture, and progress from recommendations.',
  },
];

function SupportedChainsStrip() {
  return (
    <div className="mt-5 w-full max-w-full rounded-2xl border border-white/5 bg-white/[0.03] p-3">
      <div className="mb-2 flex items-center gap-2">
        <Layers3 className="h-3.5 w-3.5 text-sky-400" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
          Multi-chain friendly
        </span>
      </div>

      <div className="flex flex-wrap gap-2 pb-1">
        {supportedChains.map((chain) => (
          <span
            key={chain}
            className="shrink-0 rounded-full border border-white/10 bg-dark-700/50 px-3 py-1.5 text-xs font-semibold text-gray-300"
          >
            {chain}
          </span>
        ))}
      </div>
    </div>
  );
}

function MobileScanShortcut() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-dark-950/95 px-4 py-3 shadow-2xl shadow-black/70 sm:hidden">
      <a
        href="#wallet-report"
        className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-sky-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-950"
        aria-label="Jump to wallet analysis tool"
      >
        Analyze Wallet
        <ArrowRight className="h-4 w-4" />
      </a>
    </div>
  );
}

function TrustPillars() {
  return (
    <div className="mt-5 grid grid-cols-1 gap-2 sm:mt-7 sm:grid-cols-2 lg:grid-cols-4">
      {trustPillars.map((item) => (
        <div
          key={item}
          className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2"
        >
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
          <span className="text-xs font-medium text-gray-300">{item}</span>
        </div>
      ))}
    </div>
  );
}

function RetentionSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="glass-card border border-emerald-500/15 p-5 sm:p-8">
        <div className="mb-4 flex items-center gap-3">
          <Trophy className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold text-white">Continue improving wallet security</h2>
        </div>
        <p className="mb-6 text-sm leading-relaxed text-gray-300">
          After your first analysis, these premium tools help you stay safe over time and measure whether your wallet profile is getting stronger.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {retentionFeatures.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
              <Icon className="mb-3 h-4 w-4 text-emerald-400" />
              <h3 className="mb-1 text-sm font-bold text-white">{title}</h3>
              <p className="text-xs leading-relaxed text-gray-300">{text}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-sky-500/15 bg-sky-500/[0.05] p-4">
          <div className="flex items-start gap-3">
            <Brain className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
            <p className="text-xs leading-relaxed text-gray-300">
              Recommendations are designed to be actionable: severity, why it matters, and what to do next. Use them as your weekly checklist.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-amber-500/15 bg-amber-500/[0.04] p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <p className="text-xs leading-relaxed text-gray-300">
              Scoring and recommendations are guidance, not guarantees. Always verify contracts before interacting.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function WalletCheckerPage() {
  const [hasScanResult, setHasScanResult] = useState(false);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'AirdropGuard Wallet Intelligence',
    url: 'https://airdropguard.com/wallet-checker',
    applicationCategory: 'SecurityApplication',
    operatingSystem: 'Web',
    description:
      'Read-only crypto wallet intelligence tool for wallet health, visible risk signals, token hygiene and airdrop readiness research.',
  };

  return (
    <main className="min-h-screen overflow-hidden pb-20 sm:pb-0">
      <SEO
        title="Wallet Intelligence Checker | AirdropGuard"
        description="Analyse a public crypto wallet address with read-only wallet intelligence, visible risk signals, token hygiene, activity quality and airdrop-readiness guidance."
        canonical="https://airdropguard.com/wallet-checker"
        schema={schema}
      />

      <section className="relative border-b border-white/5">
        <div className="absolute inset-0 hidden sm:block bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.20),transparent_32%),radial-gradient(circle_at_80%_15%,rgba(16,185,129,0.10),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.08),transparent_28%)]" />
        <div className="absolute inset-0 hidden md:block bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:44px_44px]" />

        <div className="relative mx-auto w-full max-w-7xl max-w-full px-4 pb-10 pt-10 sm:px-6 sm:pb-14 sm:pt-16 lg:px-8 lg:pb-16 lg:pt-20">
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[0.94fr_1.06fr] lg:gap-10">
            <div className="w-full max-w-full min-w-0">
              <div className="mb-4 inline-flex max-w-full items-center gap-2 rounded-full border border-sky-500/25 bg-sky-500/10 px-3 py-2">
                <Shield className="h-3.5 w-3.5 shrink-0 text-sky-400" />
                <span className="text-[11px] font-semibold leading-snug text-sky-300 sm:text-xs">
                  Wallet Intelligence • Security-first analysis
                </span>
              </div>

              <h1 className="max-w-full text-3xl font-black leading-tight tracking-tight text-white sm:max-w-3xl sm:text-5xl lg:text-6xl">
                Analyze Your Wallet
              </h1>

              <p className="mt-4 max-w-full text-sm leading-relaxed text-gray-300 sm:mt-5 sm:max-w-2xl sm:text-lg">
                AI-powered wallet security analysis. No wallet connection required. Read-only analysis.
              </p>

              <div className="mt-6 flex w-full flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center">
                <a
                  href="#wallet-report"
                  className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/10 transition-colors hover:bg-sky-500/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-950 sm:w-auto"
                >
                  Analyze Wallet
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>

              <TrustPillars />
              <SupportedChainsStrip />
            </div>

            <div className="w-full max-w-full min-w-0 mx-auto">
              <div className="glass-card w-full border border-sky-500/15 bg-gradient-to-br from-sky-500/[0.06] via-dark-900 to-dark-950 p-4 sm:p-6">
                <div className="mb-5 flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
                    <LockKeyhole className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white">Private by design</h2>
                    <p className="mt-1 text-xs leading-relaxed text-gray-300">
                      Paste a public address to generate a security report with health score, risk level, suspicious token checks, approval exposure, and clear next steps.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    ['Wallet Health Score', 'Safety confidence indicator'],
                    ['Risk Score + Rating', 'Threat and exposure summary'],
                    ['Actionable Recommendations', 'Severity, why, and action'],
                  ].map(([title, subtitle]) => (
                    <div key={title} className="rounded-2xl border border-white/10 bg-dark-900/40 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-sky-300">{title}</p>
                      <p className="mt-1 text-[11px] text-gray-400">{subtitle}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="wallet-report" className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="mb-6 glass-card border border-sky-500/15 bg-sky-500/[0.04] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-sky-300">Wallet Analysis</p>
              <h2 className="text-xl font-black text-white sm:text-2xl">Is my wallet safe?</h2>
              <p className="mt-1 text-sm leading-relaxed text-gray-300">
                Analyze first, then review your Wallet Health Score, Risk Score, Security Rating, Risk Level, suspicious activity, and actionable recommendations.
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card border border-sky-500/15 p-4 sm:p-6">
          <WalletSafetySnapshot onResultStateChange={setHasScanResult} />
        </div>
      </section>

      {hasScanResult && <RetentionSection />}

      <section className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
        <div className="glass-card border border-white/5 p-5 sm:p-7">
          <div className="mb-4 flex items-center gap-2">
            <Network className="h-4 w-4 text-sky-400" />
            <p className="text-xs font-bold uppercase tracking-wider text-sky-300">What you get in each report</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              'Dangerous approvals',
              'Suspicious tokens',
              'High-risk contracts',
              'Wallet age and activity',
              'Multi-chain assets',
              'Security recommendations',
            ].map((item) => (
              <div key={item} className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-xs text-gray-300">
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="glass-card border border-amber-500/15 p-5 sm:p-8">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-amber-400" />
            <div>
              <h2 className="mb-3 text-xl font-bold text-white">Important safety reminder</h2>
              <p className="text-sm leading-relaxed text-gray-300">
                Wallet Intelligence is educational information only. It does not prove ownership, guarantee safety, confirm eligibility, predict rewards or replace independent research. Cryptoassets are high risk. Users should always verify links, avoid unknown signatures and never share private wallet credentials.
              </p>
            </div>
          </div>
        </div>
      </section>

      <MobileScanShortcut />
    </main>
  );
}
