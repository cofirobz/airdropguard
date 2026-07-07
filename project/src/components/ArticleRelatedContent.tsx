import { Link } from 'react-router-dom';

type RelatedItem = {
  to: string;
  label: string;
};

type ArticleRelatedContentProps = {
  relatedAirdrops?: RelatedItem[];
  relatedGuides?: RelatedItem[];
  popularGuides?: RelatedItem[];
};

const DEFAULT_AIRDROPS: RelatedItem[] = [
  { to: '/#airdrops', label: 'Browse verified airdrops' },
  { to: '/#speculative-tokens', label: 'Review speculative tokens' },
  { to: '/scam-alerts', label: 'Check scam alerts' },
];

const DEFAULT_GUIDES: RelatedItem[] = [
  { to: '/learn', label: 'AirdropGuard Learn hub' },
  { to: '/articles/how-to-verify-crypto-airdrops-safely-2026', label: 'How to verify crypto airdrops safely' },
  { to: '/articles/crypto-airdrop-scam-detection-guide', label: 'Crypto airdrop scam detection guide' },
];

const DEFAULT_POPULAR: RelatedItem[] = [
  { to: '/articles/best-ai-airdrop-scanner-tools', label: 'Best AI airdrop scanner tools' },
  { to: '/articles/layer-2-airdrops-2026', label: 'Ethereum Layer 2 airdrop framework' },
  { to: '/api-docs', label: 'API docs for automation workflows' },
];

function LinkGroup({ title, items }: { title: string; items: RelatedItem[] }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.12em] text-cyan-200 mb-2">{title}</p>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <Link key={`${title}-${item.to}`} to={item.to} className="text-sm text-gray-300 hover:text-white transition-colors">
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function ArticleRelatedContent({
  relatedAirdrops = DEFAULT_AIRDROPS,
  relatedGuides = DEFAULT_GUIDES,
  popularGuides = DEFAULT_POPULAR,
}: ArticleRelatedContentProps) {
  return (
    <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="text-xl font-bold text-white">Related content</h2>
      <div className="mt-4 grid gap-5 md:grid-cols-3">
        <LinkGroup title="Related Airdrops" items={relatedAirdrops} />
        <LinkGroup title="Related Guides" items={relatedGuides} />
        <LinkGroup title="Popular Guides" items={popularGuides} />
      </div>
    </section>
  );
}
