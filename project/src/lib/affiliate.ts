const SOURCE_ALIASES: Record<string, string> = {
  advertise: 'advertise',
  'affiliate-detail': 'affiliate-page',
  'affiliate-page': 'affiliate-page',
  'airdrop-detail': 'airdrop-detail',
  'airdrop-page': 'airdrop-detail',
  'api-docs': 'api-docs',
  articles: 'articles',
  'article-bottom': 'article-bottom',
  'article-top': 'article-top',
  dashboard: 'homepage',
  'dashboard-banner': 'dashboard',
  homepage: 'homepage',
  'homepage-bottom': 'homepage-bottom',
  'homepage-hero': 'homepage-hero',
  'homepage-middle': 'homepage-middle',
  learn: 'learn',
  'learn-centre': 'learn',
  pricing: 'pricing',
  'recommended-tools': 'recommended-tools',
  'scam-alert': 'scam-alerts',
  'scam-alerts': 'scam-alerts',
  sidebar: 'sidebar',
  tablet: 'tablet',
  'wallet-intelligence': 'wallet-intelligence',
};

export function normalizeAffiliateSource(source: string): string {
  const normalized = source
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-\s_]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return SOURCE_ALIASES[normalized] || normalized;
}

export function buildAffiliateGoUrl(slug: string, source?: string, bannerId?: string): string {
  const cleanSlug = slug.toLowerCase().trim();
  const query = new URLSearchParams();

  if (bannerId && bannerId.trim()) {
    query.set('banner', bannerId.trim());
  }

  if (!source) {
    const suffix = query.toString();
    return suffix ? `/go/${encodeURIComponent(cleanSlug)}?${suffix}` : `/go/${encodeURIComponent(cleanSlug)}`;
  }

  const cleanSource = normalizeAffiliateSource(source);
  if (cleanSource) {
    query.set('source', cleanSource);
  }

  const suffix = query.toString();
  return suffix ? `/go/${encodeURIComponent(cleanSlug)}?${suffix}` : `/go/${encodeURIComponent(cleanSlug)}`;
}
