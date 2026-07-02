import SEO from '../components/SEO';
import {
  Shield,
  LockKeyhole,
  Brain,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Wallet,
  Radar,
  Fingerprint,
  ArrowRight,
  SearchCheck,
  Zap,
  Network,
  Sparkles,
  Trophy,
  RotateCw,
  FileText,
  Bell,
  Target,
  Gauge,
  Layers3,
  Clock3,
  BarChart3,
  GitCompare,
  BadgeCheck,
  ShieldCheck,
  TrendingUp,
  ScanLine,
  Eye,
} from 'lucide-react';
import WalletSafetySnapshot from '../components/WalletSafetySnapshot';

const trustPillars = [
  'Public address only',
  'No wallet connection',
  'No signatures',
  'No seed phrase',
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

const reportMetrics = [
  {
    label: 'Wallet Health',
    value: 'A',
    detail: 'Activity + hygiene score',
    icon: Gauge,
    tone: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
  {
    label: 'Risk Exposure',
    value: 'Low',
    detail: 'GoPlus-backed signals',
    icon: Radar,
    tone: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  },
  {
    label: 'Airdrop Readiness',
    value: '72%',
    detail: 'Activity depth + chain spread',
    icon: Target,
    tone: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  },
  {
    label: 'Wallet DNA',
    value: 'Active Farmer',
    detail: 'Behaviour profile',
    icon: Fingerprint,
    tone: 'text-neon-purple bg-neon-purple/10 border-neon-purple/20',
  },
];

const intelligenceLayers = [
  {
    icon: ShieldCheck,
    title: 'Security Centre',
    text: 'Malicious-address signals, suspicious assets, approval exposure, token hygiene and visible warning signs.',
  },
  {
    icon: Network,
    title: 'Chain Footprint',
    text: 'Shows where a wallet is active, underused, inactive or missing useful multi-chain history.',
  },
  {
    icon: Activity,
    title: 'Behaviour Profile',
    text: 'Classifies the wallet as new, dormant, active, farmer-style, risk-exposed or power-user style.',
  },
  {
    icon: Target,
    title: 'Airdrop Readiness',
    text: 'Highlights useful signals such as transaction depth, gas balance, token activity and ecosystem exposure.',
  },
  {
    icon: Brain,
    title: 'Wallet Coach',
    text: 'Turns raw wallet signals into safety-first next steps without promising rewards or encouraging risky behaviour.',
  },
  {
    icon: RotateCw,
    title: 'Weekly Progress',
    text: 'Designed for repeat scans so users can track whether wallet health and readiness are improving.',
  },
];

const outcomes = [
  {
    icon: BadgeCheck,
    title: 'Understand wallet quality fast',
    text: 'A simple grade plus deeper scoring helps beginners and experienced users understand wallet strength quickly.',
  },
  {
    icon: AlertTriangle,
    title: 'Spot risk before interacting',
    text: 'Risk Centre keeps suspicious tokens, approval exposure and warning signals in one clear place.',
  },
  {
    icon: TrendingUp,
    title: 'Improve your Web3 profile over time',
    text: 'Action plans give users a reason to return after real wallet activity changes.',
  },
];

const comparisonRows = [
  ['Basic wallet viewer', 'Balances and tokens', 'Often requires connection', 'No safety coach'],
  ['Approval checker', 'Contract approvals', 'Sometimes read-only', 'Limited guidance'],
  ['Portfolio tracker', 'Portfolio value', 'Often account-based', 'No airdrop readiness'],
  ['AirdropGuard', 'Safety + activity + readiness + coach', 'Read-only public address', 'Personalised next steps'],
];

const futureHooks = [
  {
    icon: Bell,
    title: 'Risk alerts',
    text: 'Notify users when new suspicious assets, approvals or risk signals appear.',
  },
  {
    icon: FileText,
    title: 'Exportable reports',
    text: 'Create downloadable wallet intelligence reports for researchers, founders and communities.',
  },
  {
    icon: GitCompare,
    title: 'Scan history',
    text: 'Compare last week vs today so users can track progress instead of scanning once.',
  },
  {
    icon: Trophy,
    title: 'Wallet achievements',
    text: 'Reward positive behaviour such as clean wallet hygiene, multi-chain usage and consistent activity.',
  },
];

const sampleActions = [
  'Keep a small gas balance on active chains',
  'Avoid unknown token approval prompts',
  'Build consistent activity on useful ecosystems',
  'Review suspicious assets before interacting',
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

function WalletGradePreview() {
  return (
    <div className="glass-card w-full max-w-full border border-sky-500/15 p-4 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4 min-w-0">
        <div className="min-w-0">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 sm:text-xs">
            Wallet IQ Dashboard
          </div>
          <h2 className="text-xl font-black text-white sm:text-2xl break-words">
            Read-only wallet intelligence
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-gray-400">
            Built to feel like a security dashboard, not a basic balance lookup.
          </p>
        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-sky-500/20 bg-sky-500/10">
          <ScanLine className="h-5 w-5 text-sky-400" />
        </div>
      </div>

      <div className="mb-5 rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
        <div className="flex items-center justify-between gap-4 min-w-0">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
              Example Wallet Grade
            </p>
            <p className="mt-1 text-sm text-gray-300">
              Clear enough for beginners. Detailed enough for serious farmers.
            </p>
          </div>
          <div className="text-right">
            <div className="text-5xl font-black leading-none text-emerald-400">A</div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Healthy
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {reportMetrics.map(({ icon: Icon, label, value, detail, tone }) => (
          <div key={label} className="rounded-2xl border border-white/5 bg-dark-700/35 p-4">
            <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl border ${tone}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</div>
            <div className="mt-1 text-lg font-black text-white">{value}</div>
            <div className="mt-1 text-[10px] text-gray-400">{detail}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-white/5 bg-white/[0.03] p-4">
        <div className="mb-3 flex items-center gap-2">
          <Brain className="h-4 w-4 text-neon-purple" />
          <span className="text-xs font-bold text-white">AI-style summary preview</span>
        </div>
        <p className="text-xs leading-relaxed text-gray-300">
          Your wallet shows healthy activity depth with a low visible risk profile. Readiness can improve by building more consistent activity across active ecosystems and reviewing unknown token exposure before connecting anywhere.
        </p>
      </div>
    </div>
  );
}

function SafetyCoachPanel() {
  return (
    <div className="rounded-3xl border border-emerald-500/15 bg-emerald-500/[0.04] p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
          <LockKeyhole className="h-5 w-5 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-sm font-black text-white">Safety-first by design</h3>
          <p className="text-xs text-gray-400">No signatures. No approvals. No private credentials.</p>
        </div>
      </div>

      <ul className="grid gap-2">
        {sampleActions.map((item) => (
          <li key={item} className="flex items-start gap-2 text-xs leading-relaxed text-gray-300">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ComparisonTable() {
  return (
    <section id="why-different" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <div className="glass-card border border-neon-purple/15 p-5 sm:p-8">
        <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-neon-purple">
              Why AirdropGuard Wins
            </p>
            <h2 className="text-2xl font-black text-white sm:text-3xl">
              More than a balance checker.
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-gray-300">
            Most tools show what a wallet owns. AirdropGuard explains what the wallet behaviour means for safety, quality, risk and future airdrop participation.
          </p>
        </div>

        <div className="grid gap-3 sm:hidden">
          {comparisonRows.map(([tool, focus, security, action]) => (
            <div
              key={tool}
              className={`rounded-2xl border p-4 ${
                tool === 'AirdropGuard'
                  ? 'border-sky-500/25 bg-sky-500/[0.06]'
                  : 'border-white/5 bg-dark-700/35'
              }`}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-white">{tool}</h3>
                {tool === 'AirdropGuard' && (
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-400">
                    Best fit
                  </span>
                )}
              </div>
              <div className="grid gap-2 text-xs">
                <div>
                  <span className="text-gray-400">Focus: </span>
                  <span className="text-gray-300">{focus}</span>
                </div>
                <div>
                  <span className="text-gray-400">Security: </span>
                  <span className="text-gray-300">{security}</span>
                </div>
                <div>
                  <span className="text-gray-400">Action plan: </span>
                  <span className="text-gray-300">{action}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-hidden rounded-2xl border border-white/5 sm:block">
          <div className="grid grid-cols-4 bg-white/[0.03] text-[10px] font-bold uppercase tracking-wider text-gray-300">
            <div className="p-3">Tool Type</div>
            <div className="p-3">Main Focus</div>
            <div className="p-3">Security</div>
            <div className="p-3">Action Plan</div>
          </div>
          {comparisonRows.map(([tool, focus, security, action]) => (
            <div
              key={tool}
              className={`grid grid-cols-4 border-t border-white/5 text-xs ${
                tool === 'AirdropGuard' ? 'bg-sky-500/[0.04]' : ''
              }`}
            >
              <div className="p-3 font-semibold text-white">{tool}</div>
              <div className="p-3 text-gray-300">{focus}</div>
              <div className="p-3 text-gray-300">{security}</div>
              <div className="p-3 text-gray-300">{action}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function IntelligenceLayersSection() {
  return (
    <section id="wallet-dna" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <div className="glass-card border border-white/5 p-5 sm:p-8">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-sky-400">
              Intelligence Layers
            </p>
            <h2 className="text-2xl font-black text-white sm:text-3xl">
              The wallet report users will want to re-check.
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-gray-300">
            A strong wallet tool should be useful today and more useful after each new scan.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {intelligenceLayers.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-white/5 bg-dark-700/35 p-5">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                <Icon className="h-5 w-5 text-neon-purple" />
              </div>
              <h3 className="mb-2 text-sm font-bold text-white">{title}</h3>
              <p className="text-xs leading-relaxed text-gray-300">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RetentionSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="glass-card border border-emerald-500/15 p-5 sm:p-8">
          <div className="mb-4 flex items-center gap-3">
            <Trophy className="h-5 w-5 text-emerald-400" />
            <h2 className="text-xl font-bold text-white">Retention engine</h2>
          </div>
          <p className="mb-6 text-sm leading-relaxed text-gray-300">
            The next competitive advantage is history. When users can compare scans, wallet health becomes something they actively improve.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {futureHooks.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                <Icon className="mb-3 h-4 w-4 text-emerald-400" />
                <h3 className="mb-1 text-sm font-bold text-white">{title}</h3>
                <p className="text-xs leading-relaxed text-gray-300">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card border border-sky-500/15 p-5 sm:p-8">
          <div className="mb-4 flex items-center gap-3">
            <Clock3 className="h-5 w-5 text-sky-400" />
            <h2 className="text-xl font-bold text-white">Weekly wallet habit</h2>
          </div>
          <p className="mb-6 text-sm leading-relaxed text-gray-300">
            Position this feature as a weekly Web3 health check. That gives users a reason to come back even when they are not actively searching for a new airdrop.
          </p>

          <div className="rounded-2xl border border-white/5 bg-dark-700/35 p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <span className="text-xs font-semibold text-gray-300">Example progress</span>
              <BarChart3 className="h-4 w-4 text-sky-400" />
            </div>
            <div className="space-y-3">
              {[
                ['Health', '72', '84'],
                ['Readiness', '41', '63'],
                ['Risk', '38', '21'],
              ].map(([label, before, after]) => (
                <div key={label} className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-gray-300">{label}</span>
                  <span className="text-gray-400">{before}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-gray-500" />
                  <span className="font-bold text-white">{after}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-amber-500/15 bg-amber-500/[0.04] p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <p className="text-xs leading-relaxed text-gray-300">
                Always present readiness as guidance, not a guarantee. AirdropGuard should never claim that a wallet will qualify for rewards.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function WalletCheckerPage() {
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
        <div className="absolute inset-0 hidden sm:block bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_30%),radial-gradient(circle_at_80%_15%,rgba(168,85,247,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.10),transparent_26%)]" />
        <div className="absolute inset-0 hidden md:block bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:44px_44px]" />

        <div className="relative mx-auto w-full max-w-7xl max-w-full px-4 pb-9 pt-9 sm:px-6 sm:pb-14 sm:pt-16 lg:px-8 lg:pb-16 lg:pt-20">
          <div className="grid grid-cols-1 items-center gap-7 lg:grid-cols-[0.92fr_1.08fr] lg:gap-10">
            <div className="w-full max-w-full min-w-0">
              <div className="mb-4 inline-flex max-w-full items-center gap-2 rounded-full border border-sky-500/25 bg-sky-500/10 px-3 py-2">
                <Shield className="h-3.5 w-3.5 shrink-0 text-sky-400" />
                <span className="text-[11px] font-semibold leading-snug text-sky-300 sm:text-xs">
                  Wallet Intelligence • read-only Web3 profile report
                </span>
              </div>

              <h1 className="max-w-full text-3xl font-black leading-tight tracking-tight text-white sm:max-w-3xl sm:text-5xl lg:text-6xl">
                The most advanced read-only wallet intelligence report.
              </h1>

              <p className="mt-4 max-w-full text-sm leading-relaxed text-gray-300 sm:mt-5 sm:max-w-2xl sm:text-lg">
                Turn a public wallet address into a clear report covering wallet health, visible risk, token hygiene, activity quality, wallet DNA and airdrop-readiness signals.
              </p>

              <div className="mt-6 flex w-full flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center">
                <a
                  href="#wallet-report"
                  className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/10 transition-colors hover:bg-sky-500/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-950 sm:w-auto"
                >
                  Analyze Wallet
                  <ArrowRight className="h-4 w-4" />
                </a>

                <a
                  href="#why-different"
                  className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-purple focus-visible:ring-offset-2 focus-visible:ring-offset-dark-950 sm:w-auto"
                >
                  Why It Is Different
                </a>
              </div>

              <TrustPillars />
              <SupportedChainsStrip />
            </div>

            <div className="w-full max-w-full min-w-0 mx-auto">
              <WalletGradePreview />
            </div>
          </div>
        </div>
      </section>

      <section id="wallet-report" className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-14 lg:px-8">
        <div className="grid items-start gap-6 lg:grid-cols-[0.62fr_1.38fr]">
          <aside className="space-y-5 lg:sticky lg:top-24">
            <div className="glass-card border border-white/5 p-5 sm:p-6">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-sky-400">
                Start Here
              </p>
              <h2 className="mb-3 text-2xl font-black text-white sm:text-3xl">
                Paste a wallet. Get the full picture.
              </h2>
              <p className="text-sm leading-relaxed text-gray-300">
                The scan helps users answer: is this wallet active, safe, underdeveloped, risk-exposed or worth improving?
              </p>
            </div>

            <SafetyCoachPanel />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {outcomes.map(({ icon: Icon, title, text }) => (
                <div key={title} className="glass-card border border-white/5 p-5">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/10">
                    <Icon className="h-5 w-5 text-sky-400" />
                  </div>
                  <h3 className="mb-2 text-sm font-bold text-white">{title}</h3>
                  <p className="text-xs leading-relaxed text-gray-300">{text}</p>
                </div>
              ))}
            </div>
          </aside>

          <div className="glass-card border border-sky-500/15 p-4 sm:p-6">
            <div className="mb-5 rounded-2xl border border-sky-500/15 bg-sky-500/[0.04] p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Run Wallet Intelligence</h3>
                  <p className="mt-1 text-xs leading-relaxed text-gray-300">
                    Analyse a public wallet address and review health, risk exposure, airdrop-readiness, token hygiene, recommendations and GoPlus-backed security checks.
                  </p>
                </div>
              </div>
            </div>

            <WalletSafetySnapshot />
          </div>
        </div>
      </section>

      <ComparisonTable />
      <IntelligenceLayersSection />
      <RetentionSection />

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
