import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import SEO from '../components/SEO';
import { canonicalFromPath } from '../lib/seo';

export default function GoRedirectPage() {
  const { slug = '', source: sourceFromPath = '' } = useParams();
  const location = useLocation();
  const cleanSlug = slug.toLowerCase().trim();
  const validSlug = /^[a-z0-9-]+$/.test(cleanSlug);
  const sourceFromQuery = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return (params.get('source') || '').toLowerCase().trim();
  }, [location.search]);

  const cleanSource = useMemo(() => {
    const candidate = (sourceFromQuery || sourceFromPath || '').toLowerCase().trim();
    if (!candidate) return '';
    const normalized = candidate
      .replace(/[^a-z0-9-\s_]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return /^[a-z0-9-]+$/.test(normalized) ? normalized : '';
  }, [sourceFromPath, sourceFromQuery]);

  const [started, setStarted] = useState(false);

  const edgeUrl = useMemo(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const sourceQuery = cleanSource ? `?source=${encodeURIComponent(cleanSource)}` : '';
    return `${supabaseUrl}/functions/v1/affiliate-redirect/${encodeURIComponent(cleanSlug)}${sourceQuery}`;
  }, [cleanSlug, cleanSource]);

  useEffect(() => {
    if (!validSlug) return;
    setStarted(true);
    window.location.replace(edgeUrl);
  }, [edgeUrl, validSlug]);

  if (!validSlug) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <SEO
          title="Link unavailable | AirdropGuard"
          description="This affiliate link is unavailable."
          canonical={canonicalFromPath(`/go/${cleanSlug}${cleanSource ? `/${cleanSource}` : ''}`)}
          noindex
        />
        <section className="rounded-2xl border border-white/10 bg-dark-900/60 p-6 text-center space-y-3">
          <h1 className="text-xl font-bold text-white">Link unavailable</h1>
          <p className="text-sm text-gray-300">This partner link is unavailable right now.</p>
          <a href="/recommended-tools" className="inline-block rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-500/20">
            Browse Recommended Tools
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <SEO
        title="Redirecting | AirdropGuard"
        description="Redirecting to verified partner link."
        canonical={canonicalFromPath(`/go/${cleanSlug}${cleanSource ? `/${cleanSource}` : ''}`)}
        noindex
      />
      <section className="rounded-2xl border border-white/10 bg-dark-900/60 p-6 text-center space-y-3">
        <h1 className="text-xl font-bold text-white">Redirecting...</h1>
        <p className="text-sm text-gray-300">You are being forwarded to our partner page.</p>
        {!started ? null : (
          <a href={edgeUrl} className="inline-block rounded-lg border border-white/20 bg-white/[0.03] px-4 py-2 text-sm text-gray-200 hover:bg-white/[0.08]">
            Continue
          </a>
        )}
      </section>
    </main>
  );
}
