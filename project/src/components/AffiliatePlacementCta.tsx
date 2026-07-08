import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { buildAffiliateGoUrl, normalizeAffiliateSource } from '../lib/affiliate';

type AffiliatePlacementCtaProps = {
  source: string;
  title: string;
  subtitle: string;
  className?: string;
};

type PublicAffiliate = {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  logo_url: string | null;
  affiliate_click_url: string;
  website_url: string | null;
  desktop_banner_url: string | null;
  mobile_banner_url: string | null;
  square_banner_url: string | null;
  hero_banner_url: string | null;
  partner_rating: number | null;
  partner_trust_score: number | null;
  featured: boolean | null;
  banner_id: string;
  banner_name: string | null;
};

function pickBannerUrl(partner: PublicAffiliate | null, viewportWidth: number): string | null {
  if (!partner) return null;
  if (viewportWidth <= 640) return partner.mobile_banner_url || partner.square_banner_url || partner.desktop_banner_url || partner.hero_banner_url || null;
  return partner.desktop_banner_url || partner.hero_banner_url || partner.square_banner_url || partner.mobile_banner_url || null;
}

function formatScore(score: number | null): string | null {
  if (score == null || !Number.isFinite(score) || score <= 0) return null;
  return `${Math.round(score)}%`;
}

function formatRating(rating: number | null): string | null {
  if (rating == null || !Number.isFinite(rating) || rating <= 0) return null;
  return `${rating.toFixed(1)}/5`;
}

function getAffiliateDescription(partner: PublicAffiliate): string {
  const normalizedCategory = (partner.category || '').toLowerCase();
  if (normalizedCategory.includes('hardware')) {
    return `Secure your crypto with ${partner.name}'s industry-leading hardware wallets.`;
  }
  if (normalizedCategory.includes('wallet')) {
    return `Protect your assets with ${partner.name}'s trusted wallet products and security tools.`;
  }
  return `Explore ${partner.name} through a vetted affiliate recommendation designed for safer crypto workflows.`;
}

function getBadges(partner: PublicAffiliate): string[] {
  const badges: string[] = [];
  if (partner.category) badges.push(partner.category);
  if (partner.featured) badges.push('Featured');
  if (partner.affiliate_click_url) badges.push('Official Partner');
  return badges.slice(0, 3);
}

function pickCardVisual(partner: PublicAffiliate | null, viewportWidth: number): string | null {
  const bannerUrl = pickBannerUrl(partner, viewportWidth);
  if (bannerUrl) return bannerUrl;
  return partner?.logo_url || null;
}

export default function AffiliatePlacementCta({ source, title, subtitle, className }: AffiliatePlacementCtaProps) {
  const [partner, setPartner] = useState<PublicAffiliate | null>(null);
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window === 'undefined' ? 1280 : window.innerWidth));
  const [imageFailed, setImageFailed] = useState(false);
  const cardRef = useRef<HTMLElement | null>(null);
  const normalizedSource = useMemo(() => normalizeAffiliateSource(source), [source]);
  const cardVisualUrl = useMemo(() => pickCardVisual(partner, viewportWidth), [partner, viewportWidth]);
  const description = partner ? subtitle || getAffiliateDescription(partner) : subtitle;
  const scoreBadge = formatScore(partner?.partner_trust_score ?? null);
  const ratingBadge = formatRating(partner?.partner_rating ?? null);
  const badges = partner ? getBadges(partner) : [];

  useEffect(() => {
    let active = true;

    async function loadPartner() {
      const { data, error } = await supabase
        .from('affiliate_banners_public')
        .select('affiliate_link_id, name, slug, category, logo_url, affiliate_click_url, website_url, desktop_banner_url, mobile_banner_url, square_banner_url, hero_banner_url, partner_rating, partner_trust_score, featured, id, banner_name, display_order, weight')
        .contains('placements', [normalizedSource])
        .order('display_order', { ascending: true })
        .order('weight', { ascending: false })
        .limit(12);

      if (!active) return;
      if (error || !data || data.length === 0) {
        const fallback = await supabase
          .from('affiliate_links_public')
          .select('id, name, slug, category, logo_url, banner_image_url, button_text')
          .order('featured', { ascending: false })
          .order('priority_order', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (!active || fallback.error || !fallback.data) {
          setPartner(null);
          return;
        }

        const row = fallback.data as Record<string, unknown>;
        setPartner({
          id: String(row.id ?? ''),
          name: String(row.name ?? ''),
          slug: String(row.slug ?? ''),
          category: row.category ? String(row.category) : null,
          logo_url: row.logo_url ? String(row.logo_url) : null,
          affiliate_click_url: '',
          website_url: null,
          desktop_banner_url: row.banner_image_url ? String(row.banner_image_url) : null,
          mobile_banner_url: row.banner_image_url ? String(row.banner_image_url) : null,
          square_banner_url: row.banner_image_url ? String(row.banner_image_url) : null,
          hero_banner_url: row.banner_image_url ? String(row.banner_image_url) : null,
          partner_rating: null,
          partner_trust_score: null,
          featured: null,
          banner_id: '',
          banner_name: null,
        });
        return;
      }

      const candidates = data as Array<Record<string, unknown>>;
      const chosen = candidates[Math.floor(Math.random() * candidates.length)] ?? candidates[0];
      setPartner({
        id: String(chosen.affiliate_link_id ?? ''),
        name: String(chosen.name ?? ''),
        slug: String(chosen.slug ?? ''),
        category: chosen.category ? String(chosen.category) : null,
        logo_url: chosen.logo_url ? String(chosen.logo_url) : null,
        affiliate_click_url: String(chosen.affiliate_click_url ?? ''),
        website_url: chosen.website_url ? String(chosen.website_url) : null,
        desktop_banner_url: chosen.desktop_banner_url ? String(chosen.desktop_banner_url) : null,
        mobile_banner_url: chosen.mobile_banner_url ? String(chosen.mobile_banner_url) : null,
        square_banner_url: chosen.square_banner_url ? String(chosen.square_banner_url) : null,
        hero_banner_url: chosen.hero_banner_url ? String(chosen.hero_banner_url) : null,
        partner_rating: typeof chosen.partner_rating === 'number' ? chosen.partner_rating : Number.isFinite(Number(chosen.partner_rating)) ? Number(chosen.partner_rating) : null,
        partner_trust_score: typeof chosen.partner_trust_score === 'number' ? chosen.partner_trust_score : Number.isFinite(Number(chosen.partner_trust_score)) ? Number(chosen.partner_trust_score) : null,
        featured: typeof chosen.featured === 'boolean' ? chosen.featured : null,
        banner_id: String(chosen.id ?? ''),
        banner_name: chosen.banner_name ? String(chosen.banner_name) : null,
      });
    }

    void loadPartner();
    return () => {
      active = false;
    };
  }, [normalizedSource]);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    setImageFailed(false);
  }, [cardVisualUrl]);

  useEffect(() => {
    if (!partner || !cardRef.current) return;

    let sent = false;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry?.isIntersecting || sent) return;
      sent = true;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const params = new URLSearchParams({ slug: partner.slug, source: normalizedSource, banner: partner.banner_id });
      const url = `${supabaseUrl}/functions/v1/affiliate-impression?${params.toString()}`;
      void fetch(url, { method: 'GET', keepalive: true }).catch(() => undefined);
      observer.disconnect();
    }, { threshold: 0.5 });

    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [normalizedSource, partner]);

  if (!partner) return null;

  const cardDescription = description || getAffiliateDescription(partner);
  const visualUrl = cardVisualUrl;

  return (
    <section ref={cardRef} className={className || 'mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8'}>
      <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,14,24,0.98),rgba(6,10,18,0.96))] shadow-[0_24px_90px_rgba(2,6,23,0.35),0_0_48px_rgba(34,211,238,0.08)]">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />
        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-6">
          <div className="order-2 lg:order-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/20 bg-cyan-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100">
                <Sparkles className="h-3 w-3" />
                {title}
              </span>
              {badges.map((badge) => (
                <span key={badge} className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-300">
                  {badge}
                </span>
              ))}
            </div>

            <h3 className="mt-3 text-2xl font-black text-white sm:text-3xl">{partner.name}</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-[15px]">{cardDescription}</p>

            <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-200">
              {scoreBadge ? <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1">Trust {scoreBadge}</span> : null}
              {ratingBadge ? <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1">Rating {ratingBadge}</span> : null}
              {partner.banner_name ? <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{partner.banner_name}</span> : null}
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Link
                to={buildAffiliateGoUrl(partner.slug, normalizedSource, partner.banner_id)}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-500/12 px-5 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20"
              >
                <Shield className="h-4 w-4" />
                Open Recommended Partner
                <ArrowRight className="h-4 w-4" />
              </Link>
              {partner.website_url ? (
                <a
                  href={partner.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-white/12 bg-white/[0.04] px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/[0.08]"
                >
                  View Website
                </a>
              ) : null}
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="rounded-[26px] border border-white/10 bg-slate-950/50 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <div className="flex min-h-[150px] items-center justify-center overflow-hidden rounded-[22px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-4 py-5 sm:min-h-[180px]">
                {visualUrl && !imageFailed ? (
                  <img
                    src={visualUrl}
                    alt={partner.logo_url ? `${partner.name} logo` : `${partner.name} affiliate banner`}
                    loading="lazy"
                    className={partner.logo_url && !pickBannerUrl(partner, viewportWidth) ? 'max-h-[120px] w-auto max-w-[180px] object-contain sm:max-h-[128px]' : 'max-h-[136px] w-full object-contain sm:max-h-[160px]'}
                    onError={() => setImageFailed(true)}
                  />
                ) : (
                  <div className="flex w-full items-center justify-center rounded-[18px] border border-dashed border-cyan-300/20 px-4 py-8 text-center text-xs text-slate-400">
                    Premium partner artwork unavailable.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
