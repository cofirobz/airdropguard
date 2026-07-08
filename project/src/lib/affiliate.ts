const SOURCE_ALIASES: Record<string, string> = {
  'affiliate-detail': 'affiliate-page',
  'affiliate-page': 'affiliate-page',
  'api-docs': 'articles',
  articles: 'articles',
  dashboard: 'homepage',
  homepage: 'homepage',
  learn: 'learn',
  'recommended-tools': 'recommended-tools',
  'scam-alert': 'scam-alerts',
  'scam-alerts': 'scam-alerts',
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

export function buildAffiliateGoUrl(slug: string, source?: string): string {
  const cleanSlug = slug.toLowerCase().trim();
  if (!source) return `/go/${encodeURIComponent(cleanSlug)}`;

  const cleanSource = normalizeAffiliateSource(source);
  if (!cleanSource) return `/go/${encodeURIComponent(cleanSlug)}`;

  return `/go/${encodeURIComponent(cleanSlug)}?source=${encodeURIComponent(cleanSource)}`;
}
