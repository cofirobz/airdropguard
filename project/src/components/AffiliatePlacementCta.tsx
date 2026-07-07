import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { buildAffiliateGoUrl } from '../lib/affiliate';

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
};

export default function AffiliatePlacementCta({ source, title, subtitle, className }: AffiliatePlacementCtaProps) {
  const [partner, setPartner] = useState<PublicAffiliate | null>(null);

  useEffect(() => {
    let active = true;

    async function loadPartner() {
      const { data, error } = await supabase
        .from('affiliate_links_public')
        .select('id, name, slug, category, is_featured, priority_order')
        .order('is_featured', { ascending: false })
        .order('priority_order', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!active) return;
      if (error || !data) {
        setPartner(null);
        return;
      }

      setPartner(data as PublicAffiliate);
    }

    void loadPartner();
    return () => {
      active = false;
    };
  }, []);

  if (!partner) return null;

  return (
    <section className={className || 'mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8'}>
      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.06] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-200">{title}</p>
            <p className="mt-1 text-sm text-gray-200">{subtitle}</p>
            <p className="mt-1 text-xs text-gray-400">Current partner: {partner.name}{partner.category ? ` • ${partner.category}` : ''}</p>
          </div>
          <Link
            to={buildAffiliateGoUrl(partner.slug, source)}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/12 px-4 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/20"
          >
            <Shield className="h-3.5 w-3.5" />
            Open Recommended Partner
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
