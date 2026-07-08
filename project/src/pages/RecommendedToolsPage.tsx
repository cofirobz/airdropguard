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
  security_benefits: string | null;
  disclosure_text: string | null;
  logo_url: string | null;
  button_text: string | null;
  is_featured: boolean;
  priority_order: number;
}

const DISCLOSURE = 'Some links on this page are affiliate links. AirdropGuard may earn a commission at no extra cost to you. Our reviews, AI scores and human verification remain independent.';

function getTrustNote(tool: RecommendedTool): string {
  if (tool.is_featured) return 'Featured partners still route through AirdropGuard review and tracked click logging.';
  return 'Every partner on this page is manually reviewed before it is shown publicly.';
}

export default function RecommendedToolsPage() {
  const [tools, setTools] = useState<RecommendedTool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function fetchTools() {
      try {
        const { data, error } = await supabase
          .from('affiliate_links_public')
          .select('id, name, slug, category, description, why_we_recommend, security_benefits, disclosure_text, logo_url, button_text, is_featured, priority_order')
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
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <SEO
        title="Recommended Security Tools | AirdropGuard"
        description="Security tools we recommend for safer crypto workflows."
        canonical={canonicalFromPath('/recommended-tools')}
      />

      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_30%),radial-gradient(circle_at_top_right,rgba(96,165,250,0.12),transparent_28%),linear-gradient(180deg,rgba(8,16,32,0.98),rgba(7,13,28,0.94))] px-6 py-8 shadow-[0_24px_80px_rgba(2,6,23,0.42)] sm:px-8 lg:px-10">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-200/85">AirdropGuard Curated Stack</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Recommended Security Tools</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Premium tools for wallet hygiene, key protection and safer crypto workflows. Every partner is reviewed manually before it is surfaced to the public page.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Reviewed</p>
              <p className="mt-2 text-2xl font-semibold text-white">{tools.length || '0'}</p>
              <p className="mt-1 text-xs text-slate-400">Visible partners</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Routing</p>
              <p className="mt-2 text-2xl font-semibold text-white">/go</p>
              <p className="mt-1 text-xs text-slate-400">Tracked redirects</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/[0.07] px-5 py-4 text-xs leading-6 text-amber-100 shadow-[0_10px_30px_rgba(120,53,15,0.12)]">
        {DISCLOSURE}
      </div>

      <section className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 text-sm text-gray-300 backdrop-blur">Loading tools...</div>
        ) : tools.length === 0 ? (
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 text-sm text-gray-300 backdrop-blur">No recommended tools are active yet.</div>
        ) : (
          tools.map((tool) => (
            <article key={tool.id} className="group relative overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.34)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-cyan-300/20 hover:shadow-[0_28px_70px_rgba(8,145,178,0.14)]">
              {(() => {
                const partnerUrl = buildAffiliateGoUrl(tool.slug, 'recommended-tools');
                const detailsUrl = `/tools/${encodeURIComponent(tool.slug)}`;

                return (
                  <>
                    <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent opacity-60" />
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-300">
                          {tool.category || 'Security Tool'}
                        </span>
                        {tool.is_featured ? (
                          <span className="inline-flex rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-cyan-100">
                            Featured
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-6 flex justify-center">
                      <Link
                        to={partnerUrl}
                        className="relative flex h-24 w-24 items-center justify-center rounded-[28px] border border-cyan-200/12 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.45),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.16),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.05))] shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_18px_40px_rgba(2,6,23,0.35),0_0_36px_rgba(34,211,238,0.14)] transition duration-300 group-hover:scale-[1.04] group-hover:border-cyan-200/20 group-hover:shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_22px_48px_rgba(2,6,23,0.42),0_0_44px_rgba(34,211,238,0.24)]"
                      >
                        <div className="absolute inset-[10px] rounded-[20px] bg-slate-950/45 backdrop-blur-sm" />
                        {tool.logo_url ? (
                          <img src={tool.logo_url} alt={tool.name} className="relative h-16 w-16 rounded-2xl object-contain drop-shadow-[0_8px_18px_rgba(15,23,42,0.35)]" />
                        ) : (
                          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900/80 text-2xl font-semibold text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                            {tool.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </Link>
                    </div>

                    <div className="mt-6 text-center">
                      <h2 className="text-2xl font-semibold tracking-tight text-white">
                        <Link to={partnerUrl} className="transition hover:text-cyan-200">
                          {tool.name}
                        </Link>
                      </h2>
                      <p className="mt-3 min-h-[48px] text-sm leading-7 text-slate-300">
                        {tool.description || 'Security-focused tool recommended by AirdropGuard.'}
                      </p>
                    </div>

                    <div className="mt-6 space-y-4">
                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">Why We Recommend</p>
                        <p className="mt-2 text-sm leading-6 text-cyan-50/90">
                          {tool.why_we_recommend || 'Reviewed manually by AirdropGuard for security relevance.'}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">Security Benefits</p>
                        <p className="mt-2 text-sm leading-6 text-slate-300">
                          {tool.security_benefits || 'Provides an extra layer of security discipline for wallet and account operations.'}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">Trust Note</p>
                        <p className="mt-2 text-sm leading-6 text-slate-300">{getTrustNote(tool)}</p>
                      </div>
                    </div>

                    <p className="mt-4 text-[11px] leading-6 text-slate-400">{tool.disclosure_text || DISCLOSURE}</p>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      <Link
                        to={partnerUrl}
                        className="inline-flex flex-1 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-500/12 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/20"
                      >
                        {tool.button_text || 'Visit Partner'}
                      </Link>
                      <Link
                        to={detailsUrl}
                        className="inline-flex flex-1 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/[0.08]"
                      >
                        View Details
                      </Link>
                    </div>
                  </>
                );
              })()}
            </article>
          ))
        )}
      </section>

      <div className="mt-8 rounded-2xl border border-amber-500/20 bg-amber-500/[0.07] px-5 py-4 text-xs leading-6 text-amber-100 shadow-[0_10px_30px_rgba(120,53,15,0.12)]">
        {DISCLOSURE}
      </div>
    </main>
  );
}
