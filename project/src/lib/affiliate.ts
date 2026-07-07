export function normalizeAffiliateSource(source: string): string {
  return source
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-\s_]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function buildAffiliateGoUrl(slug: string, source?: string): string {
  const cleanSlug = slug.toLowerCase().trim();
  if (!source) return `/go/${encodeURIComponent(cleanSlug)}`;

  const cleanSource = normalizeAffiliateSource(source);
  if (!cleanSource) return `/go/${encodeURIComponent(cleanSlug)}`;

  return `/go/${encodeURIComponent(cleanSlug)}?source=${encodeURIComponent(cleanSource)}`;
}
