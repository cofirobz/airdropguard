import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import SEO from '../components/SEO';
import { canonicalFromPath } from '../lib/seo';
import { supabase } from '../lib/supabase';
import { buildAffiliateGoUrl } from '../lib/affiliate';

interface AffiliatePartner {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  description: string | null;
  full_description: string | null;
  why_we_recommend: string | null;
  best_for: string | null;
  pros: string[] | null;
  cons: string[] | null;
  security_benefits: string | null;
  things_to_consider: string | null;
  logo_url: string | null;
  banner_image_url: string | null;
  disclosure_text: string | null;
  official_website: string | null;
  button_text: string | null;
  seo_title: string | null;
  meta_description: string | null;
}

const FALLBACK_DISCLOSURE = 'Some links on this page are affiliate links. AirdropGuard may earn a commission at no extra cost to you. Our reviews, AI scores and human verification remain independent.';

function detailLabel(value: string | null, fallback: string): string {
  return value?.trim() || fallback;
}

function renderList(items: string[] | null) {
  if (!items || items.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1 text-sm text-gray-200">
      {items.map((item) => (
        <li key={item} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function AffiliatePartnerPage() {
  const { slug } = useParams();
  const [partner, setPartner] = useState<AffiliatePartner | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function fetchPartner() {
      if (!slug) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('affiliate_links_public')
          .select('id, name, slug, category, description, full_description, why_we_recommend, best_for, pros, cons, security_benefits, things_to_consider, logo_url, banner_image_url, disclosure_text, official_website, button_text, seo_title, meta_description')
          .eq('slug', slug)
          .maybeSingle();

        if (error) throw error;
        if (!active) return;
        setPartner((data as AffiliatePartner | null) ?? null);
      } catch (error) {
        console.error('[Public][AffiliatePartnerPage] Failed to load partner', error);
        if (!active) return;
        setPartner(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    void fetchPartner();
    return () => {
      active = false;
    };
  }, [slug]);

  const title = partner?.seo_title || (partner ? `${partner.name} Review | AirdropGuard Recommended Tool` : 'Recommended Tool | AirdropGuard');
  const description = partner?.meta_description || partner?.description || 'AirdropGuard manual review of a recommended security partner.';
  const canonical = canonicalFromPath(`/tools/${encodeURIComponent(slug || '')}`);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <SEO title={title} description={description} canonical={canonical} />

      <div className="mb-4">
        <Link to="/recommended-tools" className="text-xs text-cyan-200 hover:text-cyan-100">Back to recommended tools</Link>
      </div>

      {loading ? (
        <section className="rounded-xl border border-white/10 bg-dark-900/55 p-6 text-sm text-gray-300">Loading partner profile...</section>
      ) : !partner ? (
        <section className="rounded-[28px] border border-white/10 bg-dark-900/55 p-6">
          <h1 className="text-xl font-semibold text-white">Partner Not Found</h1>
          <p className="mt-2 text-sm text-gray-300">This affiliate profile is unavailable or inactive.</p>
        </section>
      ) : (
        <>
          <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(96,165,250,0.12),transparent_26%),linear-gradient(180deg,rgba(7,16,34,0.98),rgba(6,13,28,0.95))] shadow-[0_24px_80px_rgba(2,6,23,0.45)]">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent" />
            {partner.banner_image_url ? (
              <img src={partner.banner_image_url} alt={partner.name} className="h-56 w-full object-cover sm:h-72" />
            ) : (
              <div className="h-40 w-full bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.2),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.06),transparent)]" />
            )}
            <div className="relative p-6 sm:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex items-start gap-5">
                  <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-[28px] border border-cyan-200/12 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.45),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.18),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.2),rgba(255,255,255,0.05))] shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_44px_rgba(2,6,23,0.38),0_0_42px_rgba(34,211,238,0.18)]">
                    <div className="absolute inset-[10px] rounded-[20px] bg-slate-950/45 backdrop-blur-sm" />
                    {partner.logo_url ? (
                      <img src={partner.logo_url} alt={partner.name} className="relative h-16 w-16 rounded-2xl object-contain drop-shadow-[0_8px_18px_rgba(15,23,42,0.35)]" />
                    ) : (
                      <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900/80 text-2xl font-semibold text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                        {partner.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/85">{partner.category || 'Security Tool'}</p>
                    <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{partner.name}</h1>
                    <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">{detailLabel(partner.description, 'Security-focused tool reviewed by AirdropGuard.')}</p>
                  </div>
                </div>
                <Link
                  to={buildAffiliateGoUrl(partner.slug, 'affiliate-page')}
                  className="inline-flex items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-500/12 px-5 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/20"
                >
                  {partner.button_text || 'Visit Partner'}
                </Link>
              </div>
            </div>
          </section>

          <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <article className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur lg:col-span-2">
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">Overview</h2>
              <p className="mt-3 text-sm leading-7 text-slate-200">{detailLabel(partner.full_description, partner.description || 'Detailed write-up coming soon.')}</p>
            </article>

            <article className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">Best For</h2>
              <p className="mt-3 text-sm leading-7 text-slate-200">{detailLabel(partner.best_for, 'Users who want stronger crypto security workflows.')}</p>
            </article>
          </section>

          <section className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <article className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">Why We Recommend</h2>
              <p className="mt-3 text-sm leading-7 text-slate-200">{detailLabel(partner.why_we_recommend, 'This recommendation is manually curated by AirdropGuard.')}</p>
            </article>

            <article className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">Security Benefits</h2>
              <p className="mt-3 text-sm leading-7 text-slate-200">{detailLabel(partner.security_benefits, 'Not provided yet.')}</p>
            </article>
          </section>

          <section className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <article className="rounded-[26px] border border-emerald-500/20 bg-emerald-500/[0.06] p-5">
              <h3 className="text-sm font-semibold text-emerald-100">Pros</h3>
              {renderList(partner.pros) || <p className="mt-2 text-sm text-emerald-50/90">No pros listed yet.</p>}
            </article>
            <article className="rounded-[26px] border border-rose-500/20 bg-rose-500/[0.06] p-5">
              <h3 className="text-sm font-semibold text-rose-100">Cons</h3>
              {renderList(partner.cons) || <p className="mt-2 text-sm text-rose-50/90">No considerations listed yet.</p>}
            </article>
          </section>

          <section className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <article className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
              <h3 className="text-sm font-semibold text-white">Things To Consider</h3>
              <p className="mt-2 text-sm leading-7 text-gray-200">{detailLabel(partner.things_to_consider, 'Not provided yet.')}</p>
            </article>
            <article className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
              <h3 className="text-sm font-semibold text-white">Official Website</h3>
              {partner.official_website ? (
                <a href={partner.official_website} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-cyan-200 hover:text-cyan-100">
                  {partner.official_website}
                </a>
              ) : (
                <p className="mt-2 text-sm text-gray-300">Not provided yet.</p>
              )}
            </article>
          </section>

          <section className="mt-5 rounded-[26px] border border-amber-500/20 bg-amber-500/[0.06] px-5 py-4 text-xs leading-6 text-amber-100">
            {partner.disclosure_text || FALLBACK_DISCLOSURE}
          </section>

          <div className="mt-6 flex justify-end">
            <Link
              to={buildAffiliateGoUrl(partner.slug, 'affiliate-page')}
              className="inline-flex items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-500/12 px-5 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/20"
            >
              {partner.button_text || 'Visit Partner'}
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
