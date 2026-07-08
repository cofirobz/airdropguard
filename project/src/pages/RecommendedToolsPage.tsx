import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { supabase } from '../lib/supabase';
import { canonicalFromPath } from '../lib/seo';
import { buildAffiliateGoUrl } from '../lib/affiliate';

interface RecommendedTool {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  description: string | null;
  why_we_recommend: string | null;
  disclosure_text: string | null;
  logo_url: string | null;
  button_text: string | null;
  is_featured: boolean;
  priority_order: number;
}

const DISCLOSURE = 'Some links on this page are affiliate links. AirdropGuard may earn a commission at no extra cost to you. Our reviews, AI scores and human verification remain independent.';

export default function RecommendedToolsPage() {
  const [tools, setTools] = useState<RecommendedTool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function fetchTools() {
      try {
        const { data, error } = await supabase
          .from('affiliate_links_public')
          .select('id, name, slug, category, description, why_we_recommend, disclosure_text, logo_url, button_text, is_featured, priority_order')
          .order('is_featured', { ascending: false })
          .order('priority_order', { ascending: true });

        if (error) throw error;
        if (!active) return;
        setTools((data ?? []) as RecommendedTool[]);
      } catch (error) {
        console.error('[Public][RecommendedTools] Failed to load affiliate_links_public', error);
        if (!active) return;
        setTools([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    void fetchTools();
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <SEO
        title="Recommended Security Tools | AirdropGuard"
        description="Security tools we recommend for safer crypto workflows."
        canonical={canonicalFromPath('/recommended-tools')}
      />

      <section className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.05] p-6">
        <p className="text-xs uppercase tracking-[0.13em] text-cyan-200">AirdropGuard</p>
        <h1 className="mt-2 text-2xl font-bold text-white">Recommended Security Tools</h1>
        <p className="mt-2 text-sm text-gray-300">Curated tools for safer wallet hygiene and crypto account protection.</p>
      </section>

      <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-xs text-amber-100">
        {DISCLOSURE}
      </div>

      <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <div className="rounded-xl border border-white/10 bg-dark-900/50 p-4 text-sm text-gray-300">Loading tools...</div>
        ) : tools.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-dark-900/50 p-4 text-sm text-gray-300">No recommended tools are active yet.</div>
        ) : (
          tools.map((tool) => (
            <article key={tool.id} className="rounded-xl border border-white/10 bg-dark-900/50 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2">
                  {tool.logo_url ? <img src={tool.logo_url} alt={tool.name} className="h-7 w-7 rounded-md object-cover" /> : null}
                  <p className="text-[11px] uppercase tracking-[0.1em] text-cyan-200">{tool.category || 'Security Tool'}</p>
                </div>
                {tool.is_featured ? <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-100">Featured</span> : null}
              </div>
              <h2 className="mt-1 text-lg font-semibold text-white">
                <Link to={`/recommended-tools/${encodeURIComponent(tool.slug)}`} className="hover:text-cyan-200">
                  {tool.name}
                </Link>
              </h2>
              <p className="mt-2 min-h-[44px] text-sm text-gray-300">{tool.description || 'Security-focused tool recommended by AirdropGuard.'}</p>
              <p className="mt-2 text-xs text-cyan-100/90">{tool.why_we_recommend || 'Reviewed manually by AirdropGuard for security relevance.'}</p>
              <p className="mt-2 text-[11px] leading-relaxed text-gray-400">{tool.disclosure_text || DISCLOSURE}</p>
              <div className="mt-4 flex items-center justify-between gap-2">
                <Link
                  to={`/recommended-tools/${encodeURIComponent(tool.slug)}`}
                  className="rounded-lg border border-white/15 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-white/[0.1]"
                >
                  View Details
                </Link>
                <Link
                  to={buildAffiliateGoUrl(tool.slug, 'recommended-tools')}
                  className="rounded-lg border border-cyan-400/25 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-100 hover:bg-cyan-500/20"
                >
                  {tool.button_text || 'Visit Partner'}
                </Link>
              </div>
            </article>
          ))
        )}
      </section>

      <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-xs text-amber-100">
        {DISCLOSURE}
      </div>
    </main>
  );
}
