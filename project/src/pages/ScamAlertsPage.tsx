import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ShieldX, ExternalLink, Loader2, AlertCircle, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import AffiliatePlacementCta from '../components/AffiliatePlacementCta';
import { canonicalFromPath } from '../lib/seo';
import { supabase } from '../lib/supabase';
import type { Airdrop } from '../lib/types';
import { getOpportunityType } from '../lib/utils';

const SIGNS = [
  'Asks for your seed phrase or private key — legitimate projects never need these',
  'Requires upfront payment to "unlock" or "activate" your reward',
  'Promises unusually high guaranteed returns with zero risk',
  'Team is anonymous with no verifiable history or LinkedIn presence',
  'Smart contract is unaudited or the audit comes from an unknown firm',
  'Pressure tactics — "claim in the next 2 hours or lose your allocation"',
  'Typosquatting website (e.g. airdropguard vs airdropguuard)',
];

function isValidExternalUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  if (value === 'N/A') return false;
  return /^https?:\/\//i.test(value);
}

function WarningCard({ airdrop }: { airdrop: Airdrop }) {
  const [expanded, setExpanded] = useState(false);
  const detailTarget = `/airdrop/${airdrop.slug || airdrop.id}`;
  const showWebsiteLink = isValidExternalUrl(airdrop.website_url);
  return (
    <div className="glass-card border border-rose-500/25 overflow-hidden">
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0 overflow-hidden">
            {airdrop.logo_url
              ? <img src={airdrop.logo_url} alt={airdrop.name} className="w-full h-full object-cover rounded-xl" />
              : <span className="text-base font-bold text-rose-400">{airdrop.name.charAt(0)}</span>
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-white">
                <Link to={detailTarget} className="hover:text-rose-200 transition-colors">{airdrop.name}</Link>
              </h3>
              {airdrop.ticker && (
                <span className="text-[10px] font-bold font-mono text-rose-400/80 bg-rose-500/10 border border-rose-500/20 rounded-md px-1.5 py-0.5">
                  ${airdrop.ticker}
                </span>
              )}
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/25 rounded-full px-2 py-0.5 mt-1">
              <ShieldX className="w-2.5 h-2.5" />
              Scam Alert
            </span>
          </div>
          {showWebsiteLink && (
            <a href={airdrop.website_url} target="_blank" rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-gray-600 hover:text-gray-400 transition-colors shrink-0" title="Project website">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {airdrop.blacklist_reason && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-rose-500/8 border border-rose-500/15 mb-3">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
            <p className="text-xs text-rose-300 leading-relaxed">{airdrop.blacklist_reason}</p>
          </div>
        )}

        {airdrop.ai_risk_analysis && (
          <>
            <button
              onClick={() => setExpanded(p => !p)}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              {expanded ? 'Hide details' : 'Show risk analysis'}
            </button>
            {expanded && (
              <p className="text-xs text-gray-400 leading-relaxed mt-2 whitespace-pre-wrap">
                {airdrop.ai_risk_analysis}
              </p>
            )}
          </>
        )}

        <div className="mt-3">
          <Link
            to={detailTarget}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-200 hover:bg-rose-500/15 transition-colors"
          >
            View scam alert
          </Link>
        </div>

        <div className="flex flex-wrap gap-2 mt-3 text-[10px] text-gray-600">
          {airdrop.blockchain.map(b => (
            <span key={b} className="bg-dark-700/60 border border-white/5 rounded-full px-2 py-0.5">{b}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ScamAlertsPage() {
  const [scams, setScams] = useState<Airdrop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scamSchema = useMemo(() => ({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': 'https://airdropguard.com/scam-alerts#collection',
        name: 'Scam Alerts & Risk Reports',
        url: 'https://airdropguard.com/scam-alerts',
        description: 'Known scams and blacklisted projects identified by AirdropGuard risk systems.',
      },
      {
        '@type': 'ItemList',
        '@id': 'https://airdropguard.com/scam-alerts#list',
        name: 'Known scam alerts',
        itemListElement: scams.slice(0, 30).map((airdrop, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: `https://airdropguard.com/airdrop/${airdrop.slug || airdrop.id}`,
          name: airdrop.name,
        })),
      },
      {
        '@type': 'FAQPage',
        '@id': 'https://airdropguard.com/scam-alerts#faq',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'What is a scam alert on AirdropGuard?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'A scam alert means a project has been flagged for high-risk behavior such as phishing, fake claims, malicious contracts, or other fraud indicators.',
            },
          },
          {
            '@type': 'Question',
            name: 'What should I do if a project appears here?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Do not connect your wallet, do not sign transactions, and do not share seed phrases or private keys. Review details and avoid interaction until evidence changes.',
            },
          },
        ],
      },
      {
        '@type': 'BreadcrumbList',
        '@id': 'https://airdropguard.com/scam-alerts#breadcrumb',
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
            name: 'Scam Alerts',
            item: 'https://airdropguard.com/scam-alerts',
          },
        ],
      },
    ],
  }), [scams]);

  useEffect(() => {
    async function load() {
      const { data, error: err } = await supabase
        .from('airdrops')
        .select('*')
        .eq('is_demo', false)
        .not('review_status', 'eq', 'replaced_demo')
        .order('updated_at', { ascending: false });
      if (err) setError(err.message);
      else {
        const rows = (data ?? []) as Airdrop[];
        setScams(rows.filter((row) => getOpportunityType(row) === 'Scam Alert'));
      }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <SEO
        title="Scam Alerts & Blacklisted Airdrop Projects | AirdropGuard"
        description="Track known crypto scam alerts, blacklisted projects, and high-risk airdrops before you connect your wallet."
        canonical={canonicalFromPath('/scam-alerts')}
        schema={scamSchema}
      />
      {/* Header */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-400 mb-5">
          <ShieldX className="w-3.5 h-3.5" />
          Scam Alerts
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">Known Scams & Blacklisted Projects</h1>
        <p className="text-gray-400 text-sm leading-relaxed max-w-2xl">
          These projects have been flagged by our team or AI analysis as scams, honeypots, or high-risk rug pulls.
          Do not interact with their contracts or provide any wallet credentials.
        </p>
      </div>

      {/* Warning banner */}
      <div className="flex items-start gap-3 px-5 py-4 rounded-xl bg-rose-500/8 border border-rose-500/20 mb-8">
        <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-rose-300 mb-1">Never share your seed phrase or private key</p>
          <p className="text-xs text-rose-400/80 leading-relaxed">
            No legitimate airdrop will ever ask for this. Anyone who does is attempting to steal your wallet.
          </p>
        </div>
      </div>

      <AffiliatePlacementCta
        source="scam-alert"
        title="Scam Alerts safety partner"
        subtitle="Placement tracking marks these clicks as scam-alert origin for cleaner analytics."
        className="mb-8 px-0 py-0"
      />

      {/* Scam listings */}
      {loading ? (
        <div className="flex items-center justify-center py-24 gap-3 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-24 gap-3 text-rose-400">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">{error}</span>
        </div>
      ) : scams.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <ShieldX className="w-10 h-10 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">No scam alerts at this time.</p>
          <p className="text-gray-600 text-xs mt-2">We continuously monitor listed projects and will post alerts here as they arise.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-12">
          {scams.map(a => <WarningCard key={a.id} airdrop={a} />)}
        </div>
      )}

      {/* How to spot a scam */}
      <div className="glass-card p-6 border border-amber-500/10 mt-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4 text-amber-400" />
          </div>
          <h2 className="text-base font-bold text-white">How to Spot an Airdrop Scam</h2>
        </div>
        <ul className="space-y-3">
          {SIGNS.map(sign => (
            <li key={sign} className="flex items-start gap-2.5 text-sm text-gray-400 leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500/60 shrink-0 mt-2" />
              {sign}
            </li>
          ))}
        </ul>
        <p className="text-xs text-gray-600 mt-5 leading-relaxed">
          When in doubt, check the project on our{' '}
          <Link to="/" className="text-neon-purple hover:underline">verified listings</Link>
          {' '}or review our{' '}
          <Link to="/learn" className="text-neon-purple hover:underline">guides</Link>.
        </p>
      </div>
    </div>
  );
}
