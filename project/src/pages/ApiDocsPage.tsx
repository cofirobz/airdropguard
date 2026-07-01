import { Key, Code2, Shield, Zap, BookOpen, Copy, Check, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const BASE_URL = 'https://your-project.supabase.co/functions/v1/api-v1';

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative">
      <pre className="bg-dark-900 border border-white/10 rounded-xl p-4 text-xs text-gray-300 font-mono overflow-x-auto leading-relaxed">
        {code}
      </pre>
      <button
        onClick={async () => { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        className="absolute top-3 right-3 p-1.5 rounded-lg bg-dark-700/80 border border-white/10 hover:border-neon-purple/30 transition-colors"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
      </button>
    </div>
  );
}

const ENDPOINTS = [
  {
    method: 'GET',
    path: '/airdrops',
    desc: 'Returns all published airdrops.',
    params: [
      { name: 'status',     desc: 'Filter by status: Active | Ending Soon | Expired' },
      { name: 'blockchain', desc: 'Filter by blockchain name'                         },
      { name: 'limit',      desc: 'Number of results (default 50, max 200)'           },
      { name: 'offset',     desc: 'Pagination offset'                                 },
    ],
    example: `curl "${BASE_URL}/airdrops?status=Active&limit=10" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
    response: `{
  "data": [
    {
      "id": "...",
      "name": "Hyperliquid",
      "slug": "hyperliquid",
      "status": "Active",
      "blockchain": ["Arbitrum"],
      "trust_score": 87,
      "risk_level": "Low",
      "reward_potential": "High",
      "end_date": "2026-09-01T00:00:00Z"
    }
  ],
  "count": 1
}`,
  },
  {
    method: 'GET',
    path: '/airdrops/:slug',
    desc: 'Returns a single airdrop by slug, including all tasks.',
    params: [
      { name: 'slug', desc: 'The airdrop slug (e.g. hyperliquid)' },
    ],
    example: `curl "${BASE_URL}/airdrops/hyperliquid" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
    response: `{
  "data": {
    "id": "...",
    "name": "Hyperliquid",
    "slug": "hyperliquid",
    "ai_summary": "Decentralised perpetuals exchange...",
    "trust_score": 87,
    "tasks": [
      { "id": "...", "title": "Create an account", "order": 1 },
      { "id": "...", "title": "Make 5 trades",      "order": 2 }
    ]
  }
}`,
  },
];

export default function ApiDocsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

      {/* Header */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-neon-purple/20 text-xs font-semibold text-neon-purple mb-5">
          <Code2 className="w-3.5 h-3.5" />
          REST API
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">API Documentation</h1>
        <p className="text-gray-400 leading-relaxed max-w-2xl mb-5">
          Programmatic access to all Airdrop Guard data. Embed live airdrop listings,
          trust scores, and task data directly into your app.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link to="/pricing" className="inline-flex items-center gap-2 btn-primary text-sm">
            <Key className="w-4 h-4" />
            Get API Key
          </Link>
          <Link to="/learn" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium glass border border-white/10 text-gray-300 hover:text-white hover:border-white/20 transition-colors">
            <BookOpen className="w-4 h-4 text-neon-purple" />
            New to APIs? Read the Guide
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Base URL */}
      <div className="glass-card p-5 mb-8">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Base URL</p>
        <CodeBlock code={BASE_URL} />
      </div>

      {/* Authentication */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5 text-neon-purple" />
          <h2 className="text-base font-semibold text-white">Authentication</h2>
        </div>
        <p className="text-gray-400 text-sm mb-4">
          Pass your API key in the{' '}
          <code className="text-neon-purple bg-neon-purple/10 px-1.5 py-0.5 rounded text-xs">Authorization</code>{' '}
          header on every request. Keys are generated on your{' '}
          <Link to="/dashboard" className="text-neon-purple hover:underline">dashboard</Link>.
        </p>
        <CodeBlock code={`Authorization: Bearer YOUR_API_KEY`} />
      </div>

      {/* Rate limits */}
      <div className="glass-card p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-semibold text-white">Rate Limits</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { plan: 'Free',       limit: '100 / day',   color: 'text-gray-400'    },
            { plan: 'Pro',        limit: '50k / month', color: 'text-neon-purple' },
            { plan: 'Business',   limit: '250k / month',color: 'text-neon-blue'   },
            { plan: 'Enterprise', limit: 'Unlimited',   color: 'text-emerald-400' },
          ].map(p => (
            <div key={p.plan} className="bg-dark-700/40 border border-white/5 rounded-xl p-4 text-center">
              <div className={`text-sm font-bold ${p.color}`}>{p.limit}</div>
              <div className="text-xs text-gray-500 mt-0.5">{p.plan}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-3">
          Exceeded your limit?{' '}
          <Link to="/pricing" className="text-neon-purple hover:underline">Upgrade your plan →</Link>
        </p>
      </div>

      {/* Endpoints */}
      <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
        <Code2 className="w-5 h-5 text-neon-blue" />
        Endpoints
      </h2>
      <div className="space-y-6">
        {ENDPOINTS.map(ep => (
          <div key={ep.path} className="glass-card p-6">
            {/* Method + path */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 rounded-lg px-2.5 py-1 font-mono">
                {ep.method}
              </span>
              <code className="text-sm font-mono text-white">{ep.path}</code>
            </div>
            <p className="text-gray-400 text-sm mb-4">{ep.desc}</p>

            {/* Parameters */}
            {ep.params.length > 0 && (
              <div className="mb-5">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Parameters</p>
                <div className="space-y-2">
                  {ep.params.map(p => (
                    <div key={p.name} className="flex items-start gap-3">
                      <code className="text-neon-purple bg-neon-purple/10 rounded px-1.5 py-0.5 text-xs shrink-0">{p.name}</code>
                      <span className="text-gray-400 text-xs leading-relaxed">{p.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Request */}
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Request</p>
            <div className="mb-4">
              <CodeBlock code={ep.example} />
            </div>

            {/* Response */}
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Response</p>
            <CodeBlock code={ep.response} />
          </div>
        ))}
      </div>

      {/* Footer CTA */}
      <div className="mt-10 glass-card p-6 flex flex-col sm:flex-row items-center gap-5">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-white mb-1">Ready to start building?</h3>
          <p className="text-xs text-gray-500">Get an API key and start making requests in minutes.</p>
        </div>
        <Link to="/pricing" className="shrink-0 btn-primary text-sm flex items-center gap-2">
          <Key className="w-4 h-4" />
          View Pricing & Get Key
        </Link>
      </div>
    </div>
  );
}
