import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, ChevronDown, ArrowRight,
  Gift, Wallet, ShieldCheck, AlertTriangle, CheckSquare, Zap, Layers,
  Code2, Globe, BarChart3, Bot, LayoutDashboard, Key, TrendingUp,
} from 'lucide-react';

// ── Visual flow for AirdropGuard API article ──────────────────────────────────
function ApiFlow() {
  const nodes = [
    { label: 'Your App',             sub: 'Wallet, bot, dashboard…', cls: 'border-neon-blue/30 bg-neon-blue/5 text-neon-blue'           },
    { label: 'AirdropGuard API',     sub: 'REST endpoint',           cls: 'border-neon-purple/40 bg-neon-purple/10 text-neon-purple'    },
    { label: 'Trusted Airdrop Data', sub: 'Verified, scored, live',  cls: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400'     },
  ];
  return (
    <div className="my-3 bg-white/3 border border-white/5 rounded-xl p-4">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
        {nodes.map((n, i) => (
          <>
            <div key={n.label} className={`flex-1 border rounded-xl px-4 py-3 text-center ${n.cls}`}>
              <div className="text-xs font-bold">{n.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{n.sub}</div>
            </div>
            {i < nodes.length - 1 && (
              <ArrowRight key={`arrow-${i}`} className="w-4 h-4 text-gray-600 shrink-0 rotate-90 sm:rotate-0" />
            )}
          </>
        ))}
      </div>
      <p className="text-xs text-gray-600 text-center mt-3">
        One request. Clean, verified JSON back in milliseconds.
      </p>
    </div>
  );
}

// ── Guide data ────────────────────────────────────────────────────────────────
interface Guide {
  id: string;
  category: 'Crypto Basics' | 'Developer & API';
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  title: string;
  summary: string;
  paras: string[];
  bullets?: string[];
  flow?: boolean;
  link?: { label: string; to: string };
}

const GUIDES: Guide[] = [
  // ── Crypto Basics ─────────────────────────────────────────────────────────
  {
    id: 'what-is-airdrop',
    category: 'Crypto Basics',
    icon: Gift,
    iconBg: 'bg-emerald-500/10 border-emerald-500/20',
    iconColor: 'text-emerald-400',
    title: 'What is a Crypto Airdrop?',
    summary: 'Free tokens, explained simply.',
    paras: [
      'A crypto airdrop is when a blockchain project distributes free tokens directly to wallet addresses. Think of it like a company giving away product samples — except the "samples" are cryptocurrency that can have real value.',
      'Projects run airdrops to reward early supporters, grow their community, decentralise token ownership, or create buzz before a launch. Some of the most valuable airdrops (Uniswap, Arbitrum, Blur) have paid out thousands of dollars per eligible wallet.',
      'To participate, you typically need to interact with a protocol before a "snapshot" date — then claim your tokens after the project launches its token. Airdrop Guard tracks every step so you never miss a deadline.',
    ],
  },
  {
    id: 'how-wallets-work',
    category: 'Crypto Basics',
    icon: Wallet,
    iconBg: 'bg-sky-500/10 border-sky-500/20',
    iconColor: 'text-sky-400',
    title: 'How Crypto Wallets Work',
    summary: 'What a wallet really is — and isn\'t.',
    paras: [
      'A crypto wallet doesn\'t actually "hold" your coins — it holds the private keys that prove you own them. The blockchain is a giant public ledger of balances, and your wallet is the password that lets you move yours.',
      'Your wallet generates a seed phrase (12–24 words). This phrase IS your wallet. Anyone who has it can access all your funds. Never share it, never type it anywhere online.',
    ],
    bullets: [
      'Hot wallets (MetaMask, Phantom) are browser-based and convenient but always connected to the internet.',
      'Cold wallets (Ledger, Trezor) are hardware devices kept offline — much safer for large amounts.',
      'Use a dedicated secondary wallet for airdrop farming. Keep your main funds separate.',
    ],
  },
  {
    id: 'airdrop-safety',
    category: 'Crypto Basics',
    icon: ShieldCheck,
    iconBg: 'bg-emerald-500/10 border-emerald-500/20',
    iconColor: 'text-emerald-400',
    title: 'Airdrop Safety Guide',
    summary: 'Stay safe while farming rewards.',
    paras: [
      'Legitimate airdrops never ask for your seed phrase or private key. If any site asks you to "enter your seed phrase to claim," it is a scam — no exceptions.',
      'Use a dedicated secondary wallet for airdrop farming so your main holdings stay safe even if something goes wrong.',
    ],
    bullets: [
      'Always verify claim links against the official project Twitter and Discord before clicking.',
      'Never approve unlimited token allowances on contracts you don\'t recognise.',
      'Revoke old approvals regularly at revoke.cash.',
      'Airdrop Guard only lists verified projects — use it as your source of truth.',
    ],
  },
  {
    id: 'common-scams',
    category: 'Crypto Basics',
    icon: AlertTriangle,
    iconBg: 'bg-amber-500/10 border-amber-500/20',
    iconColor: 'text-amber-400',
    title: 'Common Airdrop Scams',
    summary: 'Recognise and avoid the traps.',
    paras: [
      'Fake airdrop scams are everywhere. The most common format: a tweet or DM saying "Claim your 1,000 USDC airdrop now" with a link to a site that mirrors a real protocol. The moment you sign the transaction, a wallet drainer empties your tokens.',
      'Wallet drainers are malicious scripts hidden inside "claim" transactions. They can move all your assets in a single block. Many look like completely normal approval prompts.',
    ],
    bullets: [
      'Never click airdrop links sent in DMs — always go directly to the official URL.',
      'If you don\'t understand what a transaction is approving, reject it.',
      'Check the contract address on Etherscan before signing anything.',
      'Rug pulls launch tokens, generate hype, then the team abandons the project and sells everything.',
    ],
  },
  {
    id: 'how-to-qualify',
    category: 'Crypto Basics',
    icon: CheckSquare,
    iconBg: 'bg-neon-purple/10 border-neon-purple/20',
    iconColor: 'text-neon-purple',
    title: 'How to Qualify for Airdrops',
    summary: 'The actions that actually earn rewards.',
    paras: [
      'Most airdrops reward users who genuinely used a protocol before it launched a token. The key signal is on-chain activity: swapping, lending, bridging, providing liquidity, or holding specific NFTs.',
      'Retroactive airdrops look back at historical activity and snapshot a date — everyone who had used the protocol before that date qualifies. Prospective airdrops announce criteria upfront and let you complete tasks.',
    ],
    bullets: [
      'Use protocols genuinely — projects increasingly filter out low-value "dust" transactions.',
      'Diversify across multiple chains and ecosystems for maximum coverage.',
      'Bridge assets to new networks early — bridging activity is a common qualifying criterion.',
      'Check Airdrop Guard regularly — it tracks tasks and deadlines for every listed project.',
    ],
  },
  {
    id: 'evaluate-airdrop',
    category: 'Crypto Basics',
    icon: TrendingUp,
    iconBg: 'bg-neon-purple/10 border-neon-purple/20',
    iconColor: 'text-neon-purple',
    title: 'How To Evaluate An Airdrop',
    summary: 'Six factors that separate winners from time-wasters.',
    paras: [
      'Not every airdrop is worth your time. The difference between a $50 reward and a $5,000 reward often comes down to evaluating six key factors before you commit any effort.',
    ],
    bullets: [
      'Funding — Well-funded projects have the resources to actually launch. Check if the team has raised from reputable VCs (a16z, Multicoin, Paradigm, etc.). A funded team is a serious team.',
      'Team Quality — Are the founders public and verifiable? Do they have a track record? Anonymous teams can be legitimate, but doxxed teams with LinkedIn profiles carry less rug-pull risk.',
      'Task Difficulty — Hard tasks mean fewer people complete them, which often means larger individual rewards. But complexity also means wasted effort if the project fails. Match difficulty to your conviction in the project.',
      'Competition — High-profile airdrops attract millions of participants. Your share gets diluted. Smaller, less-publicised opportunities from genuinely useful protocols often pay better per user.',
      'Reward Potential — Look at the project\'s valuation, token supply, and comparable airdrops. A project raising at $500M FDV with 5% of supply allocated to airdrop is a very different opportunity than one at $50M FDV.',
      'Risk Factors — Check: how long has the protocol been live? Has it been audited? Is the GitHub active? Is the team responsive in Discord? More yes answers = lower risk.',
    ],
    link: { label: 'Browse verified airdrops rated by these factors', to: '/' },
  },
  {
    id: 'defi-basics',
    category: 'Crypto Basics',
    icon: Zap,
    iconBg: 'bg-amber-500/10 border-amber-500/20',
    iconColor: 'text-amber-400',
    title: 'DeFi Basics',
    summary: 'Finance without banks, explained.',
    paras: [
      'DeFi (Decentralised Finance) means financial services — lending, borrowing, trading, earning yield — that run on blockchain smart contracts instead of banks. No accounts, no ID verification, no middlemen.',
      'The core building blocks are liquidity pools (users deposit token pairs and earn a share of trading fees), AMMs (smart contracts that set prices algorithmically instead of using an order book), and lending protocols (deposit assets as collateral, borrow others).',
      'Using DeFi protocols is one of the best ways to qualify for airdrops. Even simple actions like swapping on a new DEX or depositing into a lending protocol can make you eligible for a future token launch.',
    ],
  },
  {
    id: 'layer2',
    category: 'Crypto Basics',
    icon: Layers,
    iconBg: 'bg-sky-500/10 border-sky-500/20',
    iconColor: 'text-sky-400',
    title: 'Layer 2 Networks Explained',
    summary: 'Faster and cheaper blockchains built on Ethereum.',
    paras: [
      'Layer 2 (L2) networks process transactions faster and cheaper than Ethereum mainnet, then post the results back to Ethereum for security. They solve the high gas fee problem without sacrificing decentralisation.',
      'The main types are Optimistic Rollups (Arbitrum, Optimism, Base) — which assume transactions are valid and only check if challenged — and ZK Rollups (zkSync, Starknet, Polygon zkEVM) — which use cryptographic proofs to verify instantly.',
    ],
    bullets: [
      'Some of the largest airdrops ever came from L2s: Arbitrum distributed over $2B in tokens, Optimism over $900M.',
      'Being an early active user on new L2 networks is one of the highest-potential airdrop strategies.',
      'Each L2 has its own ecosystem of DeFi apps — using them all diversifies your chances.',
      'Airdrop Guard tracks which L2 projects have confirmed or probable upcoming token launches.',
    ],
  },

  // ── Developer & API ────────────────────────────────────────────────────────
  {
    id: 'what-is-api',
    category: 'Developer & API',
    icon: BookOpen,
    iconBg: 'bg-neon-purple/10 border-neon-purple/20',
    iconColor: 'text-neon-purple',
    title: 'What is an API?',
    summary: 'The simplest possible explanation.',
    paras: [
      'API stands for Application Programming Interface — but ignore the jargon. Think of it like a waiter in a restaurant. You (the app) want data. The server (the database) has the data. The API is the waiter: you tell it what you want, and it brings back exactly that.',
      'APIs let two completely separate applications talk to each other, even if they were built by different teams in different countries using different programming languages. They communicate using simple web requests — the same technology your browser uses to load websites.',
      'You\'ve already used APIs today without knowing it. Your weather app asks a weather API for today\'s forecast. When you pay online, a payments API talks to your bank. Google Maps is embedded in thousands of apps via its Maps API.',
    ],
  },
  {
    id: 'how-apis-work',
    category: 'Developer & API',
    icon: Globe,
    iconBg: 'bg-sky-500/10 border-sky-500/20',
    iconColor: 'text-sky-400',
    title: 'How APIs Work',
    summary: 'Requests, responses, and JSON.',
    paras: [
      'An API call is just a web request. Your app sends a GET request (like asking "give me the list of active airdrops"), and the API returns a JSON response — a structured block of data your code can read and display.',
      'JSON looks like this: {"name": "Hyperliquid", "status": "Active", "trust_score": 87}. It\'s readable by both humans and machines, which is why it\'s the universal format for API responses.',
    ],
    bullets: [
      'GET = fetch data. POST = create data. PUT = update data. DELETE = remove data.',
      'Most airdrop data operations only need GET — you\'re just reading, not writing.',
      'Authentication is done via an API key — a unique string you include in the request header to prove who you are.',
      'No-code tools like n8n, Make, and Zapier can call APIs without writing a single line of code.',
    ],
  },
  {
    id: 'what-can-you-build',
    category: 'Developer & API',
    icon: Code2,
    iconBg: 'bg-neon-blue/10 border-neon-blue/20',
    iconColor: 'text-neon-blue',
    title: 'What Can You Build With APIs?',
    summary: 'Real projects you can ship.',
    paras: [
      'If you can make a web request, you can build with an API. The AirdropGuard API returns structured data about every verified airdrop: name, blockchain, trust score, task list, deadlines, reward potential, and more.',
    ],
    bullets: [
      'Wallet apps — show users which airdrops they might qualify for, in-app.',
      'Portfolio trackers — surface airdrop opportunities alongside a user\'s holdings.',
      'Telegram bots — send daily airdrop alerts or respond to on-demand queries.',
      'DeFi dashboards — embed a live verified airdrop feed directly in your product.',
      'Research tools — query and export airdrop data to spreadsheets or newsletters.',
      'Custom integrations — the structured JSON maps to any frontend or backend stack.',
    ],
  },
  {
    id: 'how-ag-api-works',
    category: 'Developer & API',
    icon: Key,
    iconBg: 'bg-neon-purple/10 border-neon-purple/20',
    iconColor: 'text-neon-purple',
    title: 'How The AirdropGuard API Works',
    summary: 'From request to data in milliseconds.',
    paras: [
      'The AirdropGuard API is a REST API — the simplest and most widely supported type. You send a request to an endpoint URL with your API key in the header, and receive clean JSON data within milliseconds.',
      'Every data point on this site — listings, trust scores, task checklists, blockchain tags, deadlines, risk levels — is available via the API. Data is verified by our analyst team before publishing, so you get clean reliable data without scraping or validation.',
    ],
    flow: true,
    link: { label: 'View API Documentation', to: '/api-docs' },
  },
  {
    id: 'api-wallets',
    category: 'Developer & API',
    icon: Wallet,
    iconBg: 'bg-emerald-500/10 border-emerald-500/20',
    iconColor: 'text-emerald-400',
    title: 'Using AirdropGuard Data In Wallets',
    summary: 'Surface airdrop opportunities inside your wallet app.',
    paras: [
      'Imagine opening your wallet and seeing "3 airdrops may apply to your address based on your on-chain history." That\'s achievable with the AirdropGuard API.',
      'Fetch the /airdrops endpoint, filter by the blockchains your wallet supports, and display relevant listings with task summaries and deadlines. Users discover opportunities without ever leaving your app.',
    ],
    bullets: [
      'Filter by blockchain to show only relevant results for the user\'s active networks.',
      'Use the trust_score field to rank results and surface the safest opportunities first.',
      'Link directly to the task checklist so users can take action in one tap.',
    ],
    link: { label: 'View API Docs', to: '/api-docs' },
  },
  {
    id: 'api-portfolio',
    category: 'Developer & API',
    icon: BarChart3,
    iconBg: 'bg-sky-500/10 border-sky-500/20',
    iconColor: 'text-sky-400',
    title: 'Using AirdropGuard Data In Portfolio Trackers',
    summary: 'Turn your tracker into a complete crypto companion.',
    paras: [
      'Portfolio trackers show users what they own. Adding an "Airdrop Opportunities" tab alongside their holdings makes your product a daily-use tool instead of a passive dashboard.',
      'Pull the full airdrop list, filter by blockchain, sort by trust score or deadline, and surface the top opportunities per user. Include task checklists so users can act immediately — no context-switching required.',
    ],
    bullets: [
      'Sort by end_date to highlight time-sensitive opportunities first.',
      'Badge high-trust-score listings as "Verified Safe" to build user confidence.',
      'This is a high-retention feature: airdrop deadlines bring users back daily.',
    ],
    link: { label: 'View API Docs', to: '/api-docs' },
  },
  {
    id: 'api-telegram',
    category: 'Developer & API',
    icon: Bot,
    iconBg: 'bg-neon-purple/10 border-neon-purple/20',
    iconColor: 'text-neon-purple',
    title: 'Using AirdropGuard Data In Telegram Bots',
    summary: 'Build an airdrop alert bot in under 50 lines.',
    paras: [
      'Telegram bots are one of the easiest starting points. A bot that polls the AirdropGuard API every hour and posts new listings to a channel can be built in under 50 lines of Python.',
      'More advanced bots can respond to user queries: "show me Solana airdrops," "what\'s ending this week?", or "list low-risk opportunities." The structured JSON response maps cleanly to Telegram message formatting.',
    ],
    bullets: [
      'Use the status field to filter only Active airdrops and avoid dead listings.',
      'Use risk_level to let users filter by their personal risk tolerance.',
      'Schedule a daily digest with the 3 highest-trust-score opportunities.',
    ],
    link: { label: 'View API Docs', to: '/api-docs' },
  },
  {
    id: 'api-defi',
    category: 'Developer & API',
    icon: LayoutDashboard,
    iconBg: 'bg-neon-blue/10 border-neon-blue/20',
    iconColor: 'text-neon-blue',
    title: 'Using AirdropGuard Data In DeFi Dashboards',
    summary: 'Give users a reason to check your dashboard every day.',
    paras: [
      'DeFi dashboards already show prices, TVL, yields, and positions. Adding an "Upcoming Airdrops" widget gives users a reason to check daily.',
      'Use the trust_score and risk_level fields to auto-rank results. Show deadline countdowns using end_date. Let users filter by chain or risk level inline.',
    ],
    bullets: [
      'Filter out low-confidence listings automatically with a trust_score threshold.',
      'Show countdown timers to deadlines — urgency drives engagement.',
      'Link to the full airdrop detail page for users who want deeper information.',
    ],
    link: { label: 'View API Docs', to: '/api-docs' },
  },
];

// ── ArticleCard ───────────────────────────────────────────────────────────────
function ArticleCard({ guide }: { guide: Guide }) {
  const [open, setOpen] = useState(false);
  const { icon: Icon } = guide;

  return (
    <div
      className={`glass-card cursor-pointer select-none p-4 transition-all duration-200 sm:p-5 ${open ? 'border-neon-purple/20' : ''}`}
      onClick={() => setOpen(o => !o)}
    >
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${guide.iconBg}`}>
          <Icon className={`w-4 h-4 ${guide.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-white leading-snug">{guide.title}</h3>
            <ChevronDown className={`w-4 h-4 text-gray-500 shrink-0 mt-0.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </div>
          <p className="mt-0.5 text-xs text-gray-500">{guide.summary}</p>
        </div>
      </div>

      {open && (
        <div className="mt-4 pt-4 border-t border-white/5 space-y-3" onClick={e => e.stopPropagation()}>
          {guide.paras.map((p, i) => (
            <p key={i} className="text-sm leading-relaxed text-gray-400">{p}</p>
          ))}
          {guide.bullets && (
            <ul className="space-y-2 pl-1 pt-1">
              {guide.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-400">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-neon-purple shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
          )}
          {guide.flow && <ApiFlow />}
          {guide.link && (
            <Link
              to={guide.link.to}
              className="inline-flex items-center gap-1.5 text-xs text-neon-purple hover:text-neon-purple/80 transition-colors mt-1"
            >
              {guide.link.label}
              <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
type Tab = 'all' | 'Crypto Basics' | 'Developer & API';

export default function LearnPage() {
  const [tab, setTab] = useState<Tab>('all');

  const visible = tab === 'all' ? GUIDES : GUIDES.filter(g => g.category === tab);
  const cryptoGuides  = visible.filter(g => g.category === 'Crypto Basics');
  const devGuides     = visible.filter(g => g.category === 'Developer & API');

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

      {/* Header */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-neon-purple/20 text-xs font-semibold text-neon-purple mb-5">
          <BookOpen className="w-3.5 h-3.5" />
          Learn
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">Learn & Guides</h1>
        <p className="text-gray-400 leading-relaxed max-w-2xl mb-5">
          <span className="sm:hidden">Short guides for airdrops, wallet safety and the API. Tap a card to expand.</span>
          <span className="hidden sm:inline">Beginner-friendly guides to crypto airdrops, wallet safety, DeFi basics, and building with the AirdropGuard API.
          Click any card to read the full guide.</span>
        </p>
        <Link to="/api-docs" className="inline-flex items-center gap-2 text-sm text-neon-purple hover:text-neon-purple/80 transition-colors">
          <Key className="w-4 h-4" />
          View API Documentation
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Category tabs */}
      <div className="sticky top-20 z-20 -mx-4 mb-8 border-b border-white/5 bg-dark-950/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:py-0">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 sm:hidden">
          Table of contents
        </div>
        <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-1 sm:pb-1">
        {(['all', 'Crypto Basics', 'Developer & API'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 rounded-2xl text-sm font-medium transition-colors capitalize sm:rounded-t-lg ${
              tab === t
                ? 'text-white bg-white/5 border border-neon-purple/30 sm:border-b-2 sm:border-x-0 sm:border-t-0'
                : 'border border-white/10 text-gray-500 hover:text-gray-300 sm:border-0'
            }`}
          >
            {t === 'all' ? 'All Guides' : t}
            <span className="ml-2 text-xs text-gray-600">
              {t === 'all' ? GUIDES.length : GUIDES.filter(g => g.category === t).length}
            </span>
          </button>
        ))}
        </div>
      </div>

      {/* Crypto Basics section */}
      {cryptoGuides.length > 0 && (
        <section className="mb-10">
          {tab === 'all' && (
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Gift className="w-4 h-4 text-emerald-400" />
              Crypto Basics
            </h2>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cryptoGuides.map(g => <ArticleCard key={g.id} guide={g} />)}
          </div>
        </section>
      )}

      {/* Developer & API section */}
      {devGuides.length > 0 && (
        <section>
          {tab === 'all' && (
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-neon-purple" />
              Developer & API
            </h2>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {devGuides.map(g => <ArticleCard key={g.id} guide={g} />)}
          </div>
        </section>
      )}
    </div>
  );
}
