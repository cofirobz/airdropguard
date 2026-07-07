import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  Code2,
  Copy,
  Key,
  Lock,
  Shield,
  Sparkles,
  Unlock,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import AffiliatePlacementCta from '../components/AffiliatePlacementCta';
import { canonicalFromPath } from '../lib/seo';

const FUNCTIONS_BASE_URL = 'https://YOUR_PROJECT_REF.supabase.co/functions/v1';
const API_BASE_URL = `${FUNCTIONS_BASE_URL}/api-v1`;

type EndpointDoc = {
  name: string;
  method: string;
  url: string;
  returns: string;
  auth: string;
  notes?: string;
  requestExample: string;
  responseExample: string;
};

const websiteRoutes = [
  { path: '/', description: 'Homepage and live airdrop overview', access: 'Public' },
  { path: '/airdrop/:slug', description: 'Airdrop detail page', access: 'Public' },
  { path: '/advertise', description: 'Advertising information and enquiries', access: 'Public' },
  { path: '/api-docs', description: 'Developer documentation', access: 'Public' },
  { path: '/auth', description: 'Sign in and sign up', access: 'Public' },
  { path: '/learn', description: 'Education and guides', access: 'Public' },
  { path: '/pricing', description: 'Pricing plans', access: 'Public' },
  { path: '/api-pricing', description: 'Pricing alias route', access: 'Public' },
  { path: '/scam-alerts', description: 'Scam reports and warnings', access: 'Public' },
  { path: '/submit', description: 'Submit a new airdrop', access: 'Public' },
  { path: '/wallet-checker', description: 'Wallet safety checker UI', access: 'Public' },
  { path: '/articles', description: 'Articles index', access: 'Public' },
  { path: '/articles/layer-2-airdrops-2026', description: 'Layer 2 article page', access: 'Public' },
  { path: '/risk-disclosure', description: 'Risk disclosure', access: 'Public' },
  { path: '/terms', description: 'Terms page', access: 'Public' },
  { path: '/whitepaper', description: 'Whitepaper', access: 'Public' },
];

const publicApiEndpoints: EndpointDoc[] = [
  {
    name: 'List Published Airdrops',
    method: 'GET',
    url: `${API_BASE_URL}/airdrops?status=Active&blockchain=Arbitrum&limit=10&offset=0`,
    returns: 'Published airdrops plus pagination metadata and remaining request quota.',
    auth: 'API key required in Authorization header: Bearer YOUR_API_KEY',
    notes: 'Supported filters: status, blockchain, limit (max 200), offset.',
    requestExample: `curl "${API_BASE_URL}/airdrops?status=Active&limit=10" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
    responseExample: `{
  "data": [
    {
      "id": "...",
      "name": "Example Airdrop",
      "slug": "example-airdrop",
      "published": true,
      "status": "Active",
      "trust_score": 82,
      "risk_level": "Medium"
    }
  ],
  "meta": {
    "total": 1,
    "limit": 10,
    "offset": 0,
    "plan": "pro",
    "requests_remaining": 49989
  }
}`,
  },
  {
    name: 'Get One Airdrop by Slug',
    method: 'GET',
    url: `${API_BASE_URL}/airdrops/example-airdrop`,
    returns: 'One published airdrop record including related airdrop_tasks.',
    auth: 'API key required in Authorization header: Bearer YOUR_API_KEY',
    requestExample: `curl "${API_BASE_URL}/airdrops/example-airdrop" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
    responseExample: `{
  "data": {
    "id": "...",
    "name": "Example Airdrop",
    "slug": "example-airdrop",
    "published": true,
    "trust_score": 82,
    "airdrop_tasks": [
      { "id": "...", "title": "Join Discord", "sort_order": 1 },
      { "id": "...", "title": "Follow X", "sort_order": 2 }
    ]
  }
}`,
  },
];

const protectedInternalEndpoints: EndpointDoc[] = [
  {
    name: 'Manage API Key',
    method: 'POST',
    url: `${FUNCTIONS_BASE_URL}/manage-api-key`,
    returns: 'Generate or revoke keys for the signed-in user.',
    auth: 'User JWT required (Supabase session token).',
    notes: 'Internal account operation. Not a public third-party endpoint.',
    requestExample: `curl -X POST "${FUNCTIONS_BASE_URL}/manage-api-key" \\
  -H "Authorization: Bearer USER_JWT" \\
  -H "Content-Type: application/json" \\
  -d '{"action":"generate"}'`,
    responseExample: `{
  "key": "ag_live_...",
  "prefix": "ag_live_12345678"
}`,
  },
  {
    name: 'Create Stripe Checkout Session',
    method: 'POST',
    url: `${FUNCTIONS_BASE_URL}/stripe-checkout`,
    returns: 'Stripe-hosted checkout URL for plans or advertising purchases.',
    auth: 'User JWT required.',
    notes: 'Internal billing flow endpoint. Not for unauthenticated public calls.',
    requestExample: `curl -X POST "${FUNCTIONS_BASE_URL}/stripe-checkout" \\
  -H "Authorization: Bearer USER_JWT" \\
  -H "Content-Type: application/json" \\
  -d '{"plan":"pro"}'`,
    responseExample: `{
  "url": "https://checkout.stripe.com/c/pay/..."
}`,
  },
  {
    name: 'Create Stripe Billing Portal Session',
    method: 'POST',
    url: `${FUNCTIONS_BASE_URL}/stripe-portal`,
    returns: 'Stripe billing portal URL for subscription management.',
    auth: 'User JWT required.',
    notes: 'Internal billing endpoint. Not part of the public data API.',
    requestExample: `curl -X POST "${FUNCTIONS_BASE_URL}/stripe-portal" \\
  -H "Authorization: Bearer USER_JWT" \\
  -H "Content-Type: application/json" \\
  -d '{}'`,
    responseExample: `{
  "url": "https://billing.stripe.com/p/session/..."
}`,
  },
  {
    name: 'Stripe Webhook Receiver',
    method: 'POST',
    url: `${FUNCTIONS_BASE_URL}/stripe-webhook`,
    returns: 'Processes Stripe webhook events for billing status updates.',
    auth: 'Stripe signature validation required.',
    notes: 'Provider-to-server endpoint. Not for manual client usage.',
    requestExample: `POST ${FUNCTIONS_BASE_URL}/stripe-webhook\nStripe-Signature: t=...,v1=...`,
    responseExample: `{
  "received": true
}`,
  },
  {
    name: 'Airdrop Copilot',
    method: 'POST',
    url: `${FUNCTIONS_BASE_URL}/airdrop-copilot`,
    returns: 'AI-generated response grounded in published AirdropGuard data.',
    auth: 'User JWT required.',
    notes: 'In-app assistant endpoint. Not part of the public REST data API.',
    requestExample: `curl -X POST "${FUNCTIONS_BASE_URL}/airdrop-copilot" \\
  -H "Authorization: Bearer USER_JWT" \\
  -H "Content-Type: application/json" \\
  -d '{"message":"What should I focus on today?"}'`,
    responseExample: `{
  "response": "Start with higher-trust, lower-risk campaigns first..."
}`,
  },
  {
    name: 'Internal Utility Endpoints',
    method: 'POST/GET',
    url: `${FUNCTIONS_BASE_URL}/{analyze-airdrop|cryptorank-proxy|wallet-intelligence|notify-submission|debug-enrichment}`,
    returns: 'Operational data used by admin workflows, imports, wallet checks, or diagnostics.',
    auth: 'Varies. These are internal endpoints and not supported as public API products.',
    notes: 'Treat these as private/internal integration surfaces.',
    requestExample: 'Use through the AirdropGuard app, not direct third-party integrations.',
    responseExample: `{
  "message": "Internal endpoint. Public compatibility is not guaranteed."
}`,
  },
];

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-xl border border-white/10 bg-dark-900 p-4 font-mono text-xs leading-relaxed text-gray-300">
        {code}
      </pre>
      <button
        onClick={async () => {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="absolute right-3 top-3 rounded-lg border border-white/10 bg-dark-700/80 p-1.5 transition-colors hover:border-cyan-300/35"
        aria-label="Copy code sample"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-gray-400" />}
      </button>
    </div>
  );
}

function EndpointCard({ endpoint, internal = false }: { endpoint: EndpointDoc; internal?: boolean }) {
  return (
    <article className="glass-card rounded-2xl border border-white/10 p-5 sm:p-6">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 font-mono text-xs font-bold text-emerald-300">
          {endpoint.method}
        </span>
        <span className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-gray-300">
          {internal ? 'Protected / Internal' : 'Public API'}
        </span>
      </div>

      <h3 className="text-base font-bold text-white">{endpoint.name}</h3>
      <p className="mt-1 break-all font-mono text-xs text-cyan-200">{endpoint.url}</p>
      <p className="mt-3 text-sm text-gray-300"><span className="font-semibold text-white">Returns:</span> {endpoint.returns}</p>
      <p className="mt-2 text-sm text-gray-300"><span className="font-semibold text-white">Auth:</span> {endpoint.auth}</p>
      {endpoint.notes && <p className="mt-2 text-xs text-amber-200/90">{endpoint.notes}</p>}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Example Request</p>
          <CodeBlock code={endpoint.requestExample} />
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Example Response</p>
          <CodeBlock code={endpoint.responseExample} />
        </div>
      </div>
    </article>
  );
}

export default function ApiDocsPage() {
  const apiDocsSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'TechArticle',
        '@id': 'https://airdropguard.com/api-docs#techarticle',
        headline: 'AirdropGuard API Docs',
        description: 'Developer documentation for AirdropGuard API authentication, endpoints, examples, limits, and internal route references.',
        url: 'https://airdropguard.com/api-docs',
      },
      {
        '@type': 'BreadcrumbList',
        '@id': 'https://airdropguard.com/api-docs#breadcrumb',
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
            name: 'API Docs',
            item: 'https://airdropguard.com/api-docs',
          },
        ],
      },
    ],
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <SEO
        title="API Docs, Endpoints & Integration Guide | AirdropGuard"
        description="Integrate AirdropGuard data with endpoint examples, authentication setup, response formats, rate limits, and production API workflows."
        canonical={canonicalFromPath('/api-docs')}
        schema={apiDocsSchema}
      />
      <section className="mb-10 rounded-3xl border border-cyan-300/20 bg-[radial-gradient(circle_at_12%_18%,rgba(34,211,238,0.16),transparent_40%),linear-gradient(160deg,rgba(3,10,24,0.96),rgba(4,16,38,0.94)_45%,rgba(3,11,27,0.95))] p-6 shadow-[0_20px_60px_rgba(2,8,23,0.5)] sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100">
          <Code2 className="h-3.5 w-3.5" />
          AirdropGuard API
        </div>
        <h1 className="mt-4 text-3xl font-black text-white sm:text-4xl">API Docs</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-gray-200 sm:text-base">
          The AirdropGuard API lets you pull published airdrop intelligence into your own product.
          You can list live opportunities, fetch details by slug, and use trust and risk signals in your workflows.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/pricing" className="btn-primary inline-flex items-center gap-2 text-sm">
            <Key className="h-4 w-4" />
            Get API Access
          </Link>
          <Link to="/learn" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-medium text-gray-200 transition-colors hover:bg-white/[0.1]">
            <BookOpen className="h-4 w-4 text-cyan-200" />
            Learn the Basics
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      <AffiliatePlacementCta
        source="api-docs"
        title="API Docs partner"
        subtitle="Documentation traffic to partners is tagged with the api-docs placement source."
        className="mb-8 px-0 py-0"
      />

      <section className="mb-8 glass-card rounded-2xl p-6">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cyan-200" />
          <h2 className="text-lg font-bold text-white">Getting Started</h2>
        </div>
        <ol className="space-y-2 text-sm text-gray-300">
          <li>1. Create your account on the <Link to="/auth" className="text-cyan-200 hover:text-cyan-100">account access page</Link>.</li>
          <li>2. Choose a plan on the <Link to="/pricing" className="text-cyan-200 hover:text-cyan-100">API pricing page</Link> and get your API key.</li>
          <li>3. Use your key in the Authorization header: <span className="font-mono text-cyan-100">Bearer YOUR_API_KEY</span>.</li>
          <li>4. Start with <span className="font-mono text-cyan-100">GET /api-v1/airdrops</span>, then fetch details with <span className="font-mono text-cyan-100">/api-v1/airdrops/:slug</span>.</li>
        </ol>
      </section>

      <section className="mb-8 glass-card rounded-2xl p-6">
        <div className="mb-3 flex items-center gap-2">
          <Shield className="h-5 w-5 text-cyan-200" />
          <h2 className="text-lg font-bold text-white">Authentication</h2>
        </div>
        <p className="text-sm text-gray-300">
          Public data API requests use an API key. App-internal protected endpoints use a user JWT from Supabase auth.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/[0.08] p-4">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200">
              <Unlock className="h-3.5 w-3.5" />
              Public API Key Auth
            </div>
            <CodeBlock code={`Authorization: Bearer YOUR_API_KEY`} />
          </div>
          <div className="rounded-xl border border-amber-400/20 bg-amber-500/[0.08] p-4">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-amber-200">
              <Lock className="h-3.5 w-3.5" />
              Protected User JWT Auth
            </div>
            <CodeBlock code={`Authorization: Bearer USER_JWT`} />
          </div>
        </div>
      </section>

      <section className="mb-8 glass-card rounded-2xl p-6">
        <div className="mb-3 flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-300" />
          <h2 className="text-lg font-bold text-white">Rate Limits</h2>
        </div>
        <p className="text-sm text-gray-300">
          Usage is tracked by your API subscription. Current defaults in code are Free: 100, Pro: 50,000, Business: 250,000 requests per billing period.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { plan: 'Free', limit: '100 requests', tone: 'text-gray-200' },
            { plan: 'Pro', limit: '50,000 requests', tone: 'text-cyan-200' },
            { plan: 'Business', limit: '250,000 requests', tone: 'text-emerald-200' },
          ].map((item) => (
            <div key={item.plan} className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-center">
              <p className={`text-sm font-bold ${item.tone}`}>{item.limit}</p>
              <p className="mt-1 text-xs text-gray-500">{item.plan}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8 glass-card rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white">Public Website Routes</h2>
        <p className="mt-2 text-sm text-gray-300">
          These are browser pages available to visitors. They are not API endpoints.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {websiteRoutes.map((route) => (
            <div key={route.path} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="font-mono text-xs text-cyan-200">{route.path}</p>
              <p className="mt-1 text-xs text-gray-300">{route.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
          <Unlock className="h-5 w-5 text-emerald-300" />
          Public API Endpoints
        </h2>
        <div className="space-y-5">
          {publicApiEndpoints.map((endpoint) => (
            <EndpointCard key={endpoint.name} endpoint={endpoint} />
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
          <Lock className="h-5 w-5 text-amber-300" />
          Protected / Admin Routes and Internal Endpoints
        </h2>
        <div className="mb-4 rounded-2xl border border-amber-400/25 bg-amber-500/[0.08] p-4 text-sm text-amber-100">
          These endpoints power internal product features, admin tools, billing, and diagnostics.
          They are not part of the public third-party API contract.
        </div>

        <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-300">
          <p className="font-semibold text-white">Protected website routes:</p>
          <p className="mt-1 font-mono text-xs text-cyan-200">/dashboard, /admin, /admin/airdrop-import</p>
        </div>

        <div className="space-y-5">
          {protectedInternalEndpoints.map((endpoint) => (
            <EndpointCard key={endpoint.name} endpoint={endpoint} internal />
          ))}
        </div>
      </section>

      <section className="mb-8 glass-card rounded-2xl p-6">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-rose-300" />
          <h2 className="text-lg font-bold text-white">Errors</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { code: 401, text: 'Missing, invalid, or inactive API key / token.' },
            { code: 403, text: 'Authenticated but not allowed for the requested operation.' },
            { code: 404, text: 'Route or resource not found.' },
            { code: 429, text: 'Request quota reached for current plan.' },
            { code: 500, text: 'Unexpected server error.' },
          ].map((item) => (
            <div key={item.code} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="font-mono text-xs text-rose-200">{item.code}</p>
              <p className="mt-1 text-xs text-gray-300">{item.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <CodeBlock code={`{
  "error": "Invalid or inactive API key"
}`} />
        </div>
      </section>

      <section className="glass-card rounded-2xl p-6 sm:flex sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-white">Ready to build with AirdropGuard?</h3>
          <p className="mt-1 text-sm text-gray-400">Create your key, test the public endpoints, and ship quickly.</p>
        </div>
        <Link to="/pricing" className="btn-primary mt-4 inline-flex items-center gap-2 text-sm sm:mt-0">
          <Key className="h-4 w-4" />
          View Pricing and Get Key
        </Link>
      </section>
    </div>
  );
}
