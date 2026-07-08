import { useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Copy,
  ImagePlus,
  LayoutGrid,
  Layers3,
  Loader2,
  Monitor,
  Pencil,
  RefreshCw,
  Save,
  Search,
  Shield,
  Smartphone,
  Star,
  Tablet,
  Trash2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { buildAffiliateGoUrl, normalizeAffiliateSource } from '../../lib/affiliate';

type PartnerStatus = 'active' | 'draft' | 'archived';
type DeviceTargeting = 'desktop' | 'mobile' | 'tablet' | 'all';
type RotationMode = 'random' | 'weighted' | 'sequential' | 'highest_ctr';
type FilterStatus = 'all' | PartnerStatus;
type SectionKey = 'overview' | 'partners' | 'banners' | 'analytics';
type PreviewDevice = 'desktop' | 'tablet' | 'mobile';
type PreviewSurface = 'hero' | 'card' | 'sidebar';

type PlacementOption = {
  value: string;
  label: string;
};

interface AffiliateLinkRow {
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
  disclosure_text: string | null;
  button_text: string | null;
  logo_url: string | null;
  banner_image_url: string | null;
  destination_url: string;
  affiliate_click_url?: string | null;
  website_url?: string | null;
  official_website?: string | null;
  documentation_url?: string | null;
  support_url?: string | null;
  notes: string | null;
  affiliate_notes?: string | null;
  commission_rate: string | null;
  payment_threshold: string | null;
  priority_order: number;
  display_order?: number | null;
  weight?: number | null;
  partner_rating?: number | null;
  partner_trust_score?: number | null;
  is_featured: boolean;
  is_active: boolean;
  status?: string | null;
  show_on_recommended_tools: boolean;
  show_on_homepage: boolean;
  show_on_learn_articles: boolean;
  show_on_scam_alerts: boolean;
  manual_conversions: number | null;
  manual_estimated_revenue: number | null;
  tags: string[] | null;
  timezone?: string | null;
  created_at: string;
  updated_at: string;
  last_click_at: string | null;
}

interface AffiliateBannerRow {
  id: string;
  affiliate_link_id: string;
  banner_name: string;
  status: PartnerStatus;
  desktop_banner_url: string | null;
  mobile_banner_url: string | null;
  square_banner_url: string | null;
  hero_banner_url: string | null;
  alt_text: string | null;
  placements: string[] | null;
  enabled: boolean;
  start_at: string | null;
  end_at: string | null;
  timezone: string | null;
  device_targeting: DeviceTargeting | null;
  rotation_mode: RotationMode | null;
  weight: number | null;
  display_order: number | null;
  desktop_width: number | null;
  desktop_height: number | null;
  mobile_width: number | null;
  mobile_height: number | null;
  square_width: number | null;
  square_height: number | null;
  hero_width: number | null;
  hero_height: number | null;
  created_at: string;
  updated_at: string;
}

interface AffiliateClickRow {
  id: string;
  affiliate_link_id: string;
  affiliate_banner_id?: string | null;
  slug: string;
  placement_name: string | null;
  tracker_value: string | null;
  referrer: string | null;
  user_agent?: string | null;
  ip_hash?: string | null;
  device_type?: string | null;
  country_code?: string | null;
  created_at: string;
}

interface AffiliateImpressionRow {
  id: string;
  affiliate_link_id: string;
  affiliate_banner_id?: string | null;
  slug: string;
  placement_name: string | null;
  referrer: string | null;
  user_agent?: string | null;
  ip_hash?: string | null;
  device_type?: string | null;
  country_code?: string | null;
  created_at: string;
}

interface PartnerFormState {
  name: string;
  slug: string;
  category: string;
  description: string;
  full_description: string;
  why_we_recommend: string;
  best_for: string;
  pros_text: string;
  cons_text: string;
  security_benefits: string;
  things_to_consider: string;
  status: PartnerStatus;
  is_featured: boolean;
  priority_order: string;
  display_order: string;
  weight: string;
  partner_rating: string;
  partner_trust_score: string;
  affiliate_click_url: string;
  website_url: string;
  documentation_url: string;
  support_url: string;
  logo_url: string;
  button_text: string;
  disclosure_text: string;
  affiliate_notes: string;
  notes: string;
  timezone: string;
  commission_rate: string;
  payment_threshold: string;
  manual_conversions: string;
  manual_estimated_revenue: string;
  tags: string;
  show_on_recommended_tools: boolean;
  show_on_homepage: boolean;
  show_on_learn_articles: boolean;
  show_on_scam_alerts: boolean;
}

interface BannerFormState {
  affiliate_link_id: string;
  banner_name: string;
  status: PartnerStatus;
  enabled: boolean;
  desktop_banner_url: string;
  mobile_banner_url: string;
  square_banner_url: string;
  hero_banner_url: string;
  alt_text: string;
  placements: string[];
  start_at: string;
  end_at: string;
  timezone: string;
  device_targeting: DeviceTargeting;
  rotation_mode: RotationMode;
  weight: string;
  display_order: string;
}

type ImageMeta = {
  status: 'empty' | 'loading' | 'valid' | 'invalid';
  width: number | null;
  height: number | null;
  message: string;
};

const DEFAULT_DISCLOSURE = 'Some links on this page are affiliate links. AirdropGuard may earn a commission at no extra cost to you. Our reviews, AI scores and human verification remain independent.';

const PLACEMENTS: PlacementOption[] = [
  { value: 'homepage-hero', label: 'Homepage Hero' },
  { value: 'homepage-middle', label: 'Homepage Middle' },
  { value: 'homepage-bottom', label: 'Homepage Bottom' },
  { value: 'sidebar', label: 'Sidebar' },
  { value: 'article-top', label: 'Article Top' },
  { value: 'article-bottom', label: 'Article Bottom' },
  { value: 'airdrop-detail', label: 'Airdrop Detail' },
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'wallet-intelligence', label: 'Wallet Intelligence' },
  { value: 'learn', label: 'Learn Centre' },
  { value: 'api-docs', label: 'API Docs' },
  { value: 'pricing', label: 'Pricing' },
  { value: 'advertise', label: 'Advertise' },
];

const SECTION_TABS: Array<{ key: SectionKey; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: 'overview', label: 'Overview', icon: LayoutGrid },
  { key: 'partners', label: 'Partners', icon: Shield },
  { key: 'banners', label: 'Banner Studio', icon: ImagePlus },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
];

const BLANK_PARTNER_FORM: PartnerFormState = {
  name: '',
  slug: '',
  category: '',
  description: '',
  full_description: '',
  why_we_recommend: '',
  best_for: '',
  pros_text: '',
  cons_text: '',
  security_benefits: '',
  things_to_consider: '',
  status: 'active',
  is_featured: false,
  priority_order: '100',
  display_order: '100',
  weight: '1',
  partner_rating: '0',
  partner_trust_score: '0',
  affiliate_click_url: '',
  website_url: '',
  documentation_url: '',
  support_url: '',
  logo_url: '',
  button_text: 'Visit Partner',
  disclosure_text: DEFAULT_DISCLOSURE,
  affiliate_notes: '',
  notes: '',
  timezone: 'UTC',
  commission_rate: '',
  payment_threshold: '',
  manual_conversions: '0',
  manual_estimated_revenue: '0',
  tags: '',
  show_on_recommended_tools: true,
  show_on_homepage: false,
  show_on_learn_articles: false,
  show_on_scam_alerts: false,
};

const BLANK_BANNER_FORM: BannerFormState = {
  affiliate_link_id: '',
  banner_name: '',
  status: 'active',
  enabled: true,
  desktop_banner_url: '',
  mobile_banner_url: '',
  square_banner_url: '',
  hero_banner_url: '',
  alt_text: '',
  placements: ['recommended-tools'],
  start_at: '',
  end_at: '',
  timezone: 'UTC',
  device_targeting: 'all',
  rotation_mode: 'weighted',
  weight: '1',
  display_order: '100',
};

function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeOptionalHttpUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(withProtocol);
    return /^https?:$/i.test(parsed.protocol) ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function parseBullets(input: string): string[] {
  return input.split(/\r?\n|,/).map((part) => part.trim()).filter(Boolean);
}

function parseTags(input: string): string[] {
  return input.split(',').map((part) => part.trim()).filter(Boolean).map((part) => part.toLowerCase());
}

function formatSupabaseError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  const record = error as Record<string, unknown>;
  return [record?.code, record?.message, record?.details, record?.hint].filter(Boolean).join(' | ') || 'Unknown error';
}

function formatWhen(value: string | null): string {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid date';
  return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
}

function getInitial(value: string): string {
  return (value.trim().charAt(0) || '?').toUpperCase();
}

function isScheduledActive(status: PartnerStatus, enabled: boolean, startAt: string | null, endAt: string | null): boolean {
  if (!enabled || status !== 'active') return false;
  const now = Date.now();
  const startMs = startAt ? new Date(startAt).getTime() : null;
  const endMs = endAt ? new Date(endAt).getTime() : null;
  if (startMs && Number.isFinite(startMs) && startMs > now) return false;
  if (endMs && Number.isFinite(endMs) && endMs < now) return false;
  return true;
}

function useImageMeta(url: string): ImageMeta {
  const [meta, setMeta] = useState<ImageMeta>({ status: 'empty', width: null, height: null, message: 'No image set' });

  useEffect(() => {
    const normalized = normalizeOptionalHttpUrl(url);
    if (!normalized) {
      setMeta(url.trim() ? { status: 'invalid', width: null, height: null, message: 'Image URL is invalid' } : { status: 'empty', width: null, height: null, message: 'No image set' });
      return;
    }

    let active = true;
    const image = new Image();
    setMeta({ status: 'loading', width: null, height: null, message: 'Checking image...' });

    image.onload = () => {
      if (!active) return;
      setMeta({ status: 'valid', width: image.naturalWidth || null, height: image.naturalHeight || null, message: 'Image available' });
    };

    image.onerror = () => {
      if (!active) return;
      setMeta({ status: 'invalid', width: null, height: null, message: 'Broken image or blocked host' });
    };

    image.src = normalized;
    return () => {
      active = false;
    };
  }, [url]);

  return meta;
}

function MetricCard({ title, value, note, tone }: { title: string; value: string; note: string; tone: string }) {
  return (
    <article className={`rounded-[24px] border p-4 shadow-[0_18px_48px_rgba(2,6,23,0.24)] ${tone}`}>
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-300/90">{title}</p>
      <p className="mt-3 text-2xl font-black text-white">{value}</p>
      <p className="mt-2 text-xs text-slate-300/85">{note}</p>
    </article>
  );
}

function SectionButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-[46px] items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition ${active ? 'border-cyan-300/30 bg-cyan-500/12 text-cyan-100 shadow-[0_12px_28px_rgba(34,211,238,0.12)]' : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]'}`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function AssetField({
  label,
  recommended,
  value,
  onChange,
  onClear,
}: {
  label: string;
  recommended: string;
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
}) {
  const meta = useImageMeta(value);

  return (
    <div className="rounded-[22px] border border-white/10 bg-slate-950/45 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{label}</p>
          <p className="mt-1 text-[11px] text-slate-400">Recommended: {recommended}</p>
        </div>
        <button type="button" onClick={onClear} className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-slate-300">Remove</button>
      </div>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="https://..."
        className="mt-3 w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-xs text-white"
      />
      <div className="mt-3 flex min-h-[120px] items-center justify-center overflow-hidden rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-3 py-3">
        {meta.status === 'valid' && value ? (
          <img src={value} alt={label} loading="lazy" className="max-h-[112px] w-full object-contain" />
        ) : (
          <div className="text-center text-xs text-slate-400">{meta.message}</div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
        <span className={`rounded-full px-2.5 py-1 ${meta.status === 'valid' ? 'bg-emerald-500/12 text-emerald-100' : meta.status === 'invalid' ? 'bg-rose-500/12 text-rose-100' : 'bg-white/[0.05] text-slate-300'}`}>
          {meta.status === 'valid' ? 'Validated' : meta.status === 'invalid' ? 'Broken image warning' : meta.message}
        </span>
        {meta.width && meta.height ? <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-slate-300">{meta.width} x {meta.height}</span> : null}
      </div>
    </div>
  );
}

function BannerPreview({ banner, partnerName, previewDevice, previewSurface }: { banner: BannerFormState; partnerName: string; previewDevice: PreviewDevice; previewSurface: PreviewSurface }) {
  const url = previewDevice === 'mobile'
    ? banner.mobile_banner_url || banner.square_banner_url || banner.desktop_banner_url || banner.hero_banner_url
    : previewSurface === 'hero'
      ? banner.hero_banner_url || banner.desktop_banner_url || banner.square_banner_url || banner.mobile_banner_url
      : banner.desktop_banner_url || banner.square_banner_url || banner.mobile_banner_url || banner.hero_banner_url;

  const shellClass = previewSurface === 'sidebar'
    ? 'max-w-[320px]'
    : previewSurface === 'card'
      ? 'max-w-[420px]'
      : 'max-w-full';

  const heightClass = previewSurface === 'hero'
    ? 'min-h-[156px] sm:min-h-[180px]'
    : previewSurface === 'sidebar'
      ? 'min-h-[220px]'
      : 'min-h-[180px]';

  return (
    <div className={`rounded-[26px] border border-cyan-400/20 bg-[linear-gradient(180deg,rgba(8,16,32,0.98),rgba(7,13,28,0.94))] p-4 shadow-[0_0_36px_rgba(34,211,238,0.08)] ${shellClass}`}>
      <div className="mb-3 flex items-center justify-between text-[11px] uppercase tracking-[0.16em] text-cyan-200/85">
        <span>{previewDevice}</span>
        <span>{previewSurface}</span>
      </div>
      <div className={`overflow-hidden rounded-[20px] border border-white/10 bg-slate-950/45 p-3 ${heightClass}`}>
        {url ? (
          <img src={url} alt={banner.alt_text || partnerName || 'Affiliate banner preview'} className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full items-center justify-center rounded-[16px] border border-dashed border-cyan-300/20 text-center text-xs text-slate-400">
            Banner preview appears here once an asset is added.
          </div>
        )}
      </div>
    </div>
  );
}

function MiniBars({ values }: { values: Array<{ day: string; clicks: number }> }) {
  const max = Math.max(1, ...values.map((item) => item.clicks));
  return (
    <div className="grid grid-cols-10 gap-2 sm:grid-cols-15">
      {values.map((item) => (
        <div key={item.day} className="flex flex-col items-center gap-2">
          <div className="flex h-24 w-full items-end rounded-full bg-white/[0.04] p-1">
            <div className="w-full rounded-full bg-[linear-gradient(180deg,#22d3ee,#3b82f6)]" style={{ height: `${Math.max(8, (item.clicks / max) * 100)}%` }} />
          </div>
          <span className="text-[10px] text-slate-400">{item.day}</span>
        </div>
      ))}
    </div>
  );
}

export function AffiliateHubSectionPremium({
  visible,
  showToast,
}: {
  visible: boolean;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}) {
  const [partners, setPartners] = useState<AffiliateLinkRow[]>([]);
  const [banners, setBanners] = useState<AffiliateBannerRow[]>([]);
  const [clicks, setClicks] = useState<AffiliateClickRow[]>([]);
  const [impressions, setImpressions] = useState<AffiliateImpressionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPartner, setSavingPartner] = useState(false);
  const [savingBanner, setSavingBanner] = useState(false);
  const [section, setSection] = useState<SectionKey>('overview');
  const [partnerSearch, setPartnerSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [placementFilter, setPlacementFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [partnerForm, setPartnerForm] = useState<PartnerFormState>(BLANK_PARTNER_FORM);
  const [bannerForm, setBannerForm] = useState<BannerFormState>(BLANK_BANNER_FORM);
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
  const [previewSurface, setPreviewSurface] = useState<PreviewSurface>('hero');
  const partnerFormBaseline = useRef(JSON.stringify(BLANK_PARTNER_FORM));
  const bannerFormBaseline = useRef(JSON.stringify(BLANK_BANNER_FORM));

  const partnerDirty = JSON.stringify(partnerForm) !== partnerFormBaseline.current;
  const bannerDirty = JSON.stringify(bannerForm) !== bannerFormBaseline.current;
  const hasUnsavedChanges = partnerDirty || bannerDirty;

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!visible) return;
    let active = true;

    async function load() {
      setLoading(true);
      const [partnerRes, bannerRes, clickRes, impressionRes] = await Promise.allSettled([
        supabase.from('affiliate_links').select('*').order('is_featured', { ascending: false }).order('display_order', { ascending: true }).order('priority_order', { ascending: true }),
        supabase.from('affiliate_banners').select('*').order('display_order', { ascending: true }).order('weight', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('affiliate_clicks').select('*').order('created_at', { ascending: false }).limit(5000),
        supabase.from('affiliate_impressions').select('*').order('created_at', { ascending: false }).limit(5000),
      ]);

      if (!active) return;

      if (partnerRes.status === 'fulfilled' && !partnerRes.value.error) {
        setPartners((partnerRes.value.data ?? []) as AffiliateLinkRow[]);
      } else {
        const message = partnerRes.status === 'fulfilled' ? formatSupabaseError(partnerRes.value.error) : String(partnerRes.reason);
        showToast(import.meta.env.DEV ? `Unable to load affiliate partners: ${message}` : 'Unable to load affiliate partners.', 'error');
        setPartners([]);
      }

      if (bannerRes.status === 'fulfilled' && !bannerRes.value.error) {
        setBanners((bannerRes.value.data ?? []) as AffiliateBannerRow[]);
      } else {
        console.warn('[Admin][AffiliateHubPremium] affiliate_banners unavailable', bannerRes);
        setBanners([]);
      }

      if (clickRes.status === 'fulfilled' && !clickRes.value.error) {
        setClicks((clickRes.value.data ?? []) as AffiliateClickRow[]);
      } else {
        console.warn('[Admin][AffiliateHubPremium] affiliate_clicks unavailable', clickRes);
        setClicks([]);
      }

      if (impressionRes.status === 'fulfilled' && !impressionRes.value.error) {
        setImpressions((impressionRes.value.data ?? []) as AffiliateImpressionRow[]);
      } else {
        console.warn('[Admin][AffiliateHubPremium] affiliate_impressions unavailable', impressionRes);
        setImpressions([]);
      }

      setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [showToast, visible]);

  const partnerMap = useMemo(() => new Map(partners.map((partner) => [partner.id, partner])), [partners]);

  const analyticsByPartner = useMemo(() => {
    const map = new Map<string, {
      impressions: number;
      uniqueImpressions: number;
      clicks: number;
      uniqueClicks: number;
      clicksToday: number;
      clicksWeek: number;
      clicksMonth: number;
      lastClick: string | null;
      placements: Map<string, number>;
      devices: Map<string, number>;
      banners: Map<string, number>;
    }>();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const week = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const month = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const ensure = (id: string) => {
      if (!map.has(id)) {
        map.set(id, {
          impressions: 0,
          uniqueImpressions: 0,
          clicks: 0,
          uniqueClicks: 0,
          clicksToday: 0,
          clicksWeek: 0,
          clicksMonth: 0,
          lastClick: null,
          placements: new Map<string, number>(),
          devices: new Map<string, number>(),
          banners: new Map<string, number>(),
        });
      }
      return map.get(id)!;
    };

    const seenImpressions = new Map<string, Set<string>>();
    impressions.forEach((row) => {
      const stats = ensure(row.affiliate_link_id);
      stats.impressions += 1;
      const uniqueKey = row.ip_hash || row.referrer || row.user_agent || row.id;
      const seen = seenImpressions.get(row.affiliate_link_id) || new Set<string>();
      if (!seen.has(uniqueKey)) {
        seen.add(uniqueKey);
        stats.uniqueImpressions += 1;
        seenImpressions.set(row.affiliate_link_id, seen);
      }
    });

    const seenClicks = new Map<string, Set<string>>();
    clicks.forEach((row) => {
      const stats = ensure(row.affiliate_link_id);
      stats.clicks += 1;
      const createdAt = new Date(row.created_at);
      const uniqueKey = row.ip_hash || row.referrer || row.user_agent || row.id;
      const clickSeen = seenClicks.get(row.affiliate_link_id) || new Set<string>();
      if (!clickSeen.has(uniqueKey)) {
        clickSeen.add(uniqueKey);
        stats.uniqueClicks += 1;
        seenClicks.set(row.affiliate_link_id, clickSeen);
      }
      if (createdAt >= today) stats.clicksToday += 1;
      if (createdAt >= week) stats.clicksWeek += 1;
      if (createdAt >= month) stats.clicksMonth += 1;
      if (!stats.lastClick || createdAt > new Date(stats.lastClick)) stats.lastClick = row.created_at;
      const placement = normalizeAffiliateSource(row.placement_name || row.tracker_value || 'direct');
      stats.placements.set(placement, (stats.placements.get(placement) || 0) + 1);
      const device = row.device_type || 'unknown';
      stats.devices.set(device, (stats.devices.get(device) || 0) + 1);
      if (row.affiliate_banner_id) {
        stats.banners.set(row.affiliate_banner_id, (stats.banners.get(row.affiliate_banner_id) || 0) + 1);
      }
    });

    return map;
  }, [clicks, impressions]);

  const analyticsByBanner = useMemo(() => {
    const map = new Map<string, { clicks: number; impressions: number }>();
    banners.forEach((banner) => map.set(banner.id, { clicks: 0, impressions: 0 }));
    clicks.forEach((click) => {
      if (!click.affiliate_banner_id) return;
      const current = map.get(click.affiliate_banner_id) || { clicks: 0, impressions: 0 };
      current.clicks += 1;
      map.set(click.affiliate_banner_id, current);
    });
    impressions.forEach((impression) => {
      if (!impression.affiliate_banner_id) return;
      const current = map.get(impression.affiliate_banner_id) || { clicks: 0, impressions: 0 };
      current.impressions += 1;
      map.set(impression.affiliate_banner_id, current);
    });
    return map;
  }, [banners, clicks, impressions]);

  const chartDays = useMemo(() => {
    const days: Array<{ day: string; clicks: number }> = [];
    for (let offset = 29; offset >= 0; offset -= 1) {
      const date = new Date(Date.now() - offset * 24 * 60 * 60 * 1000);
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      const count = clicks.filter((click) => {
        const created = new Date(click.created_at);
        return created >= start && created < end;
      }).length;
      days.push({ day: start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }), clicks: count });
    }
    return days;
  }, [clicks]);

  const filteredPartners = useMemo(() => {
    const needle = partnerSearch.trim().toLowerCase();
    return partners.filter((partner) => {
      const status = ((partner.status || (partner.is_active ? 'active' : 'draft')) as PartnerStatus);
      if (statusFilter !== 'all' && status !== statusFilter) return false;
      if (needle && !`${partner.name} ${partner.slug} ${partner.category || ''}`.toLowerCase().includes(needle)) return false;
      if (placementFilter !== 'all') {
        const linkedBanners = banners.filter((banner) => banner.affiliate_link_id === partner.id);
        if (!linkedBanners.some((banner) => (banner.placements || []).includes(placementFilter))) return false;
      }
      return true;
    });
  }, [banners, partnerSearch, partners, placementFilter, statusFilter]);

  const topPartner = useMemo(() => {
    return partners
      .map((partner) => ({ partner, clicks: analyticsByPartner.get(partner.id)?.clicks || 0 }))
      .sort((a, b) => b.clicks - a.clicks)[0] || null;
  }, [analyticsByPartner, partners]);

  const topBanner = useMemo(() => {
    return banners
      .map((banner) => ({ banner, clicks: analyticsByBanner.get(banner.id)?.clicks || 0 }))
      .sort((a, b) => b.clicks - a.clicks)[0] || null;
  }, [analyticsByBanner, banners]);

  const worstCtrBanner = useMemo(() => {
    return banners
      .map((banner) => {
        const stats = analyticsByBanner.get(banner.id) || { clicks: 0, impressions: 0 };
        const ctr = stats.impressions > 0 ? (stats.clicks / stats.impressions) * 100 : 0;
        return { banner, ctr, impressions: stats.impressions };
      })
      .filter((item) => item.impressions > 0)
      .sort((a, b) => a.ctr - b.ctr)[0] || null;
  }, [analyticsByBanner, banners]);

  const estimatedRevenue = useMemo(
    () => partners.reduce((sum, partner) => sum + Math.max(0, Number(partner.manual_estimated_revenue ?? 0)), 0),
    [partners],
  );

  const selectedPartner = useMemo(() => partners.find((partner) => partner.id === editingPartnerId) || null, [editingPartnerId, partners]);
  const selectedPartnerName = selectedPartner?.name || partners.find((partner) => partner.id === bannerForm.affiliate_link_id)?.name || 'Partner preview';

  const resetPartnerForm = (next = BLANK_PARTNER_FORM) => {
    setEditingPartnerId(null);
    setPartnerForm(next);
    partnerFormBaseline.current = JSON.stringify(next);
  };

  const resetBannerForm = (next = BLANK_BANNER_FORM) => {
    setEditingBannerId(null);
    setBannerForm(next);
    bannerFormBaseline.current = JSON.stringify(next);
  };

  const startPartnerEdit = (partner: AffiliateLinkRow) => {
    const next: PartnerFormState = {
      name: partner.name,
      slug: partner.slug,
      category: partner.category || '',
      description: partner.description || '',
      full_description: partner.full_description || '',
      why_we_recommend: partner.why_we_recommend || '',
      best_for: partner.best_for || '',
      pros_text: (partner.pros || []).join('\n'),
      cons_text: (partner.cons || []).join('\n'),
      security_benefits: partner.security_benefits || '',
      things_to_consider: partner.things_to_consider || '',
      status: ((partner.status || (partner.is_active ? 'active' : 'draft')) as PartnerStatus),
      is_featured: partner.is_featured,
      priority_order: String(partner.priority_order ?? 100),
      display_order: String(partner.display_order ?? partner.priority_order ?? 100),
      weight: String(partner.weight ?? 1),
      partner_rating: String(partner.partner_rating ?? 0),
      partner_trust_score: String(partner.partner_trust_score ?? 0),
      affiliate_click_url: partner.affiliate_click_url || partner.destination_url || '',
      website_url: partner.website_url || partner.official_website || '',
      documentation_url: partner.documentation_url || '',
      support_url: partner.support_url || '',
      logo_url: partner.logo_url || '',
      button_text: partner.button_text || 'Visit Partner',
      disclosure_text: partner.disclosure_text || DEFAULT_DISCLOSURE,
      affiliate_notes: partner.affiliate_notes || '',
      notes: partner.notes || '',
      timezone: partner.timezone || 'UTC',
      commission_rate: partner.commission_rate || '',
      payment_threshold: partner.payment_threshold || '',
      manual_conversions: String(Math.max(0, Number(partner.manual_conversions ?? 0))),
      manual_estimated_revenue: String(Math.max(0, Number(partner.manual_estimated_revenue ?? 0))),
      tags: (partner.tags || []).join(', '),
      show_on_recommended_tools: partner.show_on_recommended_tools,
      show_on_homepage: partner.show_on_homepage,
      show_on_learn_articles: partner.show_on_learn_articles,
      show_on_scam_alerts: partner.show_on_scam_alerts,
    };
    setEditingPartnerId(partner.id);
    setPartnerForm(next);
    partnerFormBaseline.current = JSON.stringify(next);
    setSection('partners');
  };

  const startBannerEdit = (banner: AffiliateBannerRow) => {
    const next: BannerFormState = {
      affiliate_link_id: banner.affiliate_link_id,
      banner_name: banner.banner_name,
      status: banner.status,
      enabled: banner.enabled,
      desktop_banner_url: banner.desktop_banner_url || '',
      mobile_banner_url: banner.mobile_banner_url || '',
      square_banner_url: banner.square_banner_url || '',
      hero_banner_url: banner.hero_banner_url || '',
      alt_text: banner.alt_text || '',
      placements: banner.placements || [],
      start_at: banner.start_at ? banner.start_at.slice(0, 16) : '',
      end_at: banner.end_at ? banner.end_at.slice(0, 16) : '',
      timezone: banner.timezone || 'UTC',
      device_targeting: banner.device_targeting || 'all',
      rotation_mode: banner.rotation_mode || 'weighted',
      weight: String(banner.weight ?? 1),
      display_order: String(banner.display_order ?? 100),
    };
    setEditingBannerId(banner.id);
    setBannerForm(next);
    bannerFormBaseline.current = JSON.stringify(next);
    setSection('banners');
  };

  const savePartner = async () => {
    const slug = normalizeSlug(partnerForm.slug || partnerForm.name);
    const affiliateClickUrl = normalizeOptionalHttpUrl(partnerForm.affiliate_click_url);
    const websiteUrl = normalizeOptionalHttpUrl(partnerForm.website_url);
    const documentationUrl = normalizeOptionalHttpUrl(partnerForm.documentation_url);
    const supportUrl = normalizeOptionalHttpUrl(partnerForm.support_url);
    const logoUrl = normalizeOptionalHttpUrl(partnerForm.logo_url);
    const manualConversions = Number(partnerForm.manual_conversions || '0');
    const manualRevenue = Number(partnerForm.manual_estimated_revenue || '0');
    const partnerRating = Number(partnerForm.partner_rating || '0');
    const partnerTrustScore = Number(partnerForm.partner_trust_score || '0');

    if (!partnerForm.name.trim()) return showToast('Partner name is required.', 'error');
    if (!slug) return showToast('Slug is required.', 'error');
    if (!affiliateClickUrl) return showToast('Affiliate click URL must be valid.', 'error');
    if (partnerForm.website_url.trim() && !websiteUrl) return showToast('Website URL must be valid.', 'error');
    if (partnerForm.documentation_url.trim() && !documentationUrl) return showToast('Documentation URL must be valid.', 'error');
    if (partnerForm.support_url.trim() && !supportUrl) return showToast('Support URL must be valid.', 'error');
    if (partnerForm.logo_url.trim() && !logoUrl) return showToast('Logo URL must be valid.', 'error');
    if (!Number.isFinite(manualConversions) || manualConversions < 0) return showToast('Manual conversions must be a non-negative number.', 'error');
    if (!Number.isFinite(manualRevenue) || manualRevenue < 0) return showToast('Estimated revenue must be a non-negative number.', 'error');
    if (!Number.isFinite(partnerRating) || partnerRating < 0 || partnerRating > 5) return showToast('Partner rating must be between 0 and 5.', 'error');
    if (!Number.isFinite(partnerTrustScore) || partnerTrustScore < 0 || partnerTrustScore > 100) return showToast('Partner trust score must be between 0 and 100.', 'error');

    setSavingPartner(true);
    const payload = {
      name: partnerForm.name.trim(),
      slug,
      category: partnerForm.category.trim() || null,
      description: partnerForm.description.trim() || null,
      full_description: partnerForm.full_description.trim() || null,
      why_we_recommend: partnerForm.why_we_recommend.trim() || null,
      best_for: partnerForm.best_for.trim() || null,
      pros: parseBullets(partnerForm.pros_text),
      cons: parseBullets(partnerForm.cons_text),
      security_benefits: partnerForm.security_benefits.trim() || null,
      things_to_consider: partnerForm.things_to_consider.trim() || null,
      status: partnerForm.status,
      is_featured: partnerForm.is_featured,
      is_active: partnerForm.status === 'active',
      priority_order: Number(partnerForm.priority_order || '100'),
      display_order: Number(partnerForm.display_order || partnerForm.priority_order || '100'),
      weight: Number(partnerForm.weight || '1'),
      partner_rating: Number(partnerForm.partner_rating || '0'),
      partner_trust_score: Number(partnerForm.partner_trust_score || '0'),
      destination_url: affiliateClickUrl,
      affiliate_click_url: affiliateClickUrl,
      website_url: websiteUrl,
      official_website: websiteUrl,
      documentation_url: documentationUrl,
      support_url: supportUrl,
      logo_url: logoUrl,
      button_text: partnerForm.button_text.trim() || 'Visit Partner',
      disclosure_text: partnerForm.disclosure_text.trim() || DEFAULT_DISCLOSURE,
      affiliate_notes: partnerForm.affiliate_notes.trim() || null,
      notes: partnerForm.notes.trim() || null,
      timezone: partnerForm.timezone.trim() || 'UTC',
      commission_rate: partnerForm.commission_rate.trim() || null,
      payment_threshold: partnerForm.payment_threshold.trim() || null,
      manual_conversions: Math.round(manualConversions),
      manual_estimated_revenue: Number(manualRevenue.toFixed(2)),
      tags: parseTags(partnerForm.tags),
      show_on_recommended_tools: partnerForm.show_on_recommended_tools,
      show_on_homepage: partnerForm.show_on_homepage,
      show_on_learn_articles: partnerForm.show_on_learn_articles,
      show_on_scam_alerts: partnerForm.show_on_scam_alerts,
    };

    try {
      if (editingPartnerId) {
        const { error } = await supabase.from('affiliate_links').update(payload).eq('id', editingPartnerId);
        if (error) throw error;
        showToast('Partner updated.', 'success');
      } else {
        const { error } = await supabase.from('affiliate_links').insert(payload);
        if (error) throw error;
        showToast('Partner created.', 'success');
      }
    } catch (error) {
      showToast(import.meta.env.DEV ? `Partner save failed: ${formatSupabaseError(error)}` : 'Partner save failed.', 'error');
      setSavingPartner(false);
      return;
    }

    setSavingPartner(false);
    resetPartnerForm();
    setLoading(true);
    const { data } = await supabase.from('affiliate_links').select('*').order('is_featured', { ascending: false }).order('display_order', { ascending: true }).order('priority_order', { ascending: true });
    setPartners((data ?? []) as AffiliateLinkRow[]);
    setLoading(false);
  };

  const saveBanner = async () => {
    if (!bannerForm.affiliate_link_id) return showToast('Select a partner for this banner.', 'error');
    if (!bannerForm.banner_name.trim()) return showToast('Banner name is required.', 'error');
    if (bannerForm.placements.length === 0) return showToast('Select at least one placement.', 'error');

    const desktop = normalizeOptionalHttpUrl(bannerForm.desktop_banner_url);
    const mobile = normalizeOptionalHttpUrl(bannerForm.mobile_banner_url);
    const square = normalizeOptionalHttpUrl(bannerForm.square_banner_url);
    const hero = normalizeOptionalHttpUrl(bannerForm.hero_banner_url);

    if (!desktop && !mobile && !square && !hero) return showToast('At least one banner asset is required.', 'error');
    if (bannerForm.desktop_banner_url.trim() && !desktop) return showToast('Desktop banner URL is invalid.', 'error');
    if (bannerForm.mobile_banner_url.trim() && !mobile) return showToast('Mobile banner URL is invalid.', 'error');
    if (bannerForm.square_banner_url.trim() && !square) return showToast('Square banner URL is invalid.', 'error');
    if (bannerForm.hero_banner_url.trim() && !hero) return showToast('Hero banner URL is invalid.', 'error');

    setSavingBanner(true);
    const payload = {
      affiliate_link_id: bannerForm.affiliate_link_id,
      banner_name: bannerForm.banner_name.trim(),
      status: bannerForm.status,
      enabled: bannerForm.enabled,
      desktop_banner_url: desktop,
      mobile_banner_url: mobile,
      square_banner_url: square,
      hero_banner_url: hero,
      alt_text: bannerForm.alt_text.trim() || null,
      placements: bannerForm.placements,
      start_at: bannerForm.start_at ? new Date(bannerForm.start_at).toISOString() : null,
      end_at: bannerForm.end_at ? new Date(bannerForm.end_at).toISOString() : null,
      timezone: bannerForm.timezone.trim() || 'UTC',
      device_targeting: bannerForm.device_targeting,
      rotation_mode: bannerForm.rotation_mode,
      weight: Number(bannerForm.weight || '1'),
      display_order: Number(bannerForm.display_order || '100'),
    };

    try {
      if (editingBannerId) {
        const { error } = await supabase.from('affiliate_banners').update(payload).eq('id', editingBannerId);
        if (error) throw error;
        showToast('Banner updated.', 'success');
      } else {
        const { error } = await supabase.from('affiliate_banners').insert(payload);
        if (error) throw error;
        showToast('Banner created.', 'success');
      }
    } catch (error) {
      showToast(import.meta.env.DEV ? `Banner save failed: ${formatSupabaseError(error)}` : 'Banner save failed.', 'error');
      setSavingBanner(false);
      return;
    }

    setSavingBanner(false);
    resetBannerForm({ ...BLANK_BANNER_FORM, affiliate_link_id: bannerForm.affiliate_link_id });
    const { data } = await supabase.from('affiliate_banners').select('*').order('display_order', { ascending: true }).order('weight', { ascending: false }).order('created_at', { ascending: false });
    setBanners((data ?? []) as AffiliateBannerRow[]);
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  };

  const runBulkStatus = async (status: PartnerStatus) => {
    if (selectedIds.length === 0) return showToast('Select at least one partner.', 'error');
    const { error } = await supabase.from('affiliate_links').update({ status, is_active: status === 'active' }).in('id', selectedIds);
    if (error) return showToast(import.meta.env.DEV ? `Bulk update failed: ${formatSupabaseError(error)}` : 'Bulk update failed.', 'error');
    showToast(`Updated ${selectedIds.length} partner${selectedIds.length === 1 ? '' : 's'}.`, 'success');
    setPartners((current) => current.map((partner) => selectedIds.includes(partner.id) ? { ...partner, status, is_active: status === 'active' } : partner));
    setSelectedIds([]);
  };

  const runBulkFeature = async (featured: boolean) => {
    if (selectedIds.length === 0) return showToast('Select at least one partner.', 'error');
    const { error } = await supabase.from('affiliate_links').update({ is_featured: featured }).in('id', selectedIds);
    if (error) return showToast(import.meta.env.DEV ? `Bulk feature update failed: ${formatSupabaseError(error)}` : 'Bulk feature update failed.', 'error');
    showToast(`Updated featured state for ${selectedIds.length} partner${selectedIds.length === 1 ? '' : 's'}.`, 'success');
    setPartners((current) => current.map((partner) => selectedIds.includes(partner.id) ? { ...partner, is_featured: featured } : partner));
    setSelectedIds([]);
  };

  const activeBannerCount = useMemo(() => banners.filter((banner) => isScheduledActive(banner.status, banner.enabled, banner.start_at, banner.end_at)).length, [banners]);
  const totalClicks = clicks.length;
  const totalImpressions = impressions.length;
  const overallCtr = totalImpressions > 0 ? `${((totalClicks / totalImpressions) * 100).toFixed(2)}%` : '0.00%';

  if (!visible) return null;

  return (
    <section id="admin-affiliate-hub" className="space-y-5 rounded-[30px] border border-cyan-400/20 bg-[linear-gradient(180deg,rgba(4,12,28,0.98),rgba(5,10,22,0.98))] p-4 shadow-[0_28px_80px_rgba(2,6,23,0.48)] sm:p-5 lg:p-6">
      <div className="sticky top-3 z-20 rounded-[24px] border border-white/10 bg-slate-950/75 p-4 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-200/85">Premium Affiliate SaaS</p>
            <h2 className="mt-2 text-2xl font-black text-white">Affiliate Command Centre</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">Enterprise-grade partner management, responsive media control, placement scheduling, device targeting and analytics without breaking the current tracked redirect flow.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {SECTION_TABS.map(({ key, label, icon }) => (
              <SectionButton key={key} active={section === key} label={label} icon={icon} onClick={() => setSection(key)} />
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Partners" value={String(partners.length)} note="Live partner records across affiliate workflows." tone="border-cyan-400/20 bg-cyan-500/[0.08]" />
        <MetricCard title="Active Banners" value={String(activeBannerCount)} note="Scheduled and enabled banner inventory ready to serve." tone="border-emerald-400/20 bg-emerald-500/[0.08]" />
        <MetricCard title="CTR" value={overallCtr} note="Current aggregate click-through rate from tracked impressions." tone="border-amber-400/20 bg-amber-500/[0.08]" />
        <MetricCard title="Revenue" value={formatCurrency(estimatedRevenue)} note="Placeholder estimate from manually tracked revenue fields." tone="border-fuchsia-400/20 bg-fuchsia-500/[0.08]" />
      </div>

      {section === 'overview' ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-[26px] border border-white/10 bg-white/[0.03] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white">30 Day Activity</h3>
                <p className="mt-1 text-xs text-slate-400">Click trend snapshot across all affiliate surfaces.</p>
              </div>
              <span className="rounded-full border border-cyan-300/20 bg-cyan-500/10 px-3 py-1 text-[11px] text-cyan-100">Clicks last 30 days</span>
            </div>
            <div className="mt-5 overflow-x-auto pb-2">
              <MiniBars values={chartDays} />
            </div>
          </article>

          <div className="space-y-4">
            <article className="rounded-[26px] border border-white/10 bg-white/[0.03] p-4">
              <h3 className="text-sm font-semibold text-white">Performance Leaders</h3>
              <div className="mt-3 space-y-2 text-sm text-slate-300">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Top performing affiliate</p>
                  <p className="mt-2 font-semibold text-white">{topPartner ? `${topPartner.partner.name} · ${topPartner.clicks} clicks` : 'No click data yet'}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Top performing banner</p>
                  <p className="mt-2 font-semibold text-white">{topBanner ? `${topBanner.banner.banner_name} · ${topBanner.clicks} clicks` : 'No banner data yet'}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Worst CTR</p>
                  <p className="mt-2 font-semibold text-white">{worstCtrBanner ? `${worstCtrBanner.banner.banner_name} · ${worstCtrBanner.ctr.toFixed(2)}%` : 'Not enough impression data yet'}</p>
                </div>
              </div>
            </article>
            <article className="rounded-[26px] border border-white/10 bg-white/[0.03] p-4">
              <h3 className="text-sm font-semibold text-white">Recent Runtime Health</h3>
              <div className="mt-3 space-y-2 text-xs text-slate-300">
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.08] px-3 py-3">Banner images always render separately from affiliate click URLs, protecting Ledger and other partners from broken image/click confusion.</div>
                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/[0.08] px-3 py-3">Placement banner surfaces now support desktop/mobile-specific asset selection with object-fit: contain.</div>
              </div>
            </article>
          </div>
        </div>
      ) : null}

      {section === 'partners' ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-4">
            <article className="rounded-[26px] border border-white/10 bg-white/[0.03] p-4">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                <label className="relative md:col-span-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input value={partnerSearch} onChange={(event) => setPartnerSearch(event.target.value)} placeholder="Search partner, slug, category" className="w-full rounded-2xl border border-white/10 bg-slate-950/65 px-10 py-3 text-sm text-white" />
                </label>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as FilterStatus)} className="rounded-2xl border border-white/10 bg-slate-950/65 px-3 py-3 text-sm text-white">
                  <option value="all">All status</option>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
                <select value={placementFilter} onChange={(event) => setPlacementFilter(event.target.value)} className="rounded-2xl border border-white/10 bg-slate-950/65 px-3 py-3 text-sm text-white">
                  <option value="all">All placements</option>
                  {PLACEMENTS.map((placement) => <option key={placement.value} value={placement.value}>{placement.label}</option>)}
                </select>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => void runBulkStatus('active')} className="rounded-xl border border-emerald-400/20 bg-emerald-500/[0.08] px-3 py-2 text-xs font-semibold text-emerald-100">Bulk Activate</button>
                <button type="button" onClick={() => void runBulkStatus('archived')} className="rounded-xl border border-amber-400/20 bg-amber-500/[0.08] px-3 py-2 text-xs font-semibold text-amber-100">Bulk Archive</button>
                <button type="button" onClick={() => void runBulkFeature(true)} className="rounded-xl border border-cyan-400/20 bg-cyan-500/[0.08] px-3 py-2 text-xs font-semibold text-cyan-100">Bulk Feature</button>
                <button type="button" onClick={() => void runBulkFeature(false)} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-200">Bulk Unfeature</button>
              </div>
            </article>

            <article className="space-y-3 rounded-[26px] border border-white/10 bg-white/[0.03] p-4">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-slate-300"><Loader2 className="h-4 w-4 animate-spin" /> Loading partner list...</div>
              ) : filteredPartners.length === 0 ? (
                <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center text-sm text-slate-400">No partner records match the current filters.</p>
              ) : filteredPartners.map((partner) => {
                const stats = analyticsByPartner.get(partner.id);
                const ctr = stats && stats.impressions > 0 ? `${((stats.clicks / stats.impressions) * 100).toFixed(2)}%` : '0.00%';
                const resolvedStatus = ((partner.status || (partner.is_active ? 'active' : 'draft')) as PartnerStatus);
                return (
                  <article key={partner.id} className={`rounded-[24px] border p-4 ${editingPartnerId === partner.id ? 'border-cyan-300/30 bg-cyan-500/[0.08]' : 'border-white/10 bg-white/[0.02]'}`}>
                    <div className="flex items-start gap-3">
                      <input type="checkbox" checked={selectedIds.includes(partner.id)} onChange={() => toggleSelection(partner.id)} className="mt-1 h-4 w-4 rounded border-white/15 bg-slate-900/80" />
                      {partner.logo_url ? (
                        <img src={partner.logo_url} alt={partner.name} className="h-12 w-12 rounded-2xl border border-white/10 object-contain bg-slate-950/50 p-1.5" />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/50 text-sm font-black text-cyan-100">{getInitial(partner.name)}</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-white">{partner.name}</p>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] ${resolvedStatus === 'active' ? 'bg-emerald-500/12 text-emerald-100' : resolvedStatus === 'draft' ? 'bg-amber-500/12 text-amber-100' : 'bg-white/[0.05] text-slate-300'}`}>{resolvedStatus}</span>
                          {partner.is_featured ? <span className="rounded-full bg-cyan-500/12 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-cyan-100">Featured</span> : null}
                        </div>
                        <p className="mt-1 text-xs text-slate-400">/{partner.slug} • {partner.category || 'Uncategorized'}</p>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-300 sm:grid-cols-4">
                          <span>Clicks {stats?.clicks || 0}</span>
                          <span>Impr. {stats?.impressions || 0}</span>
                          <span>CTR {ctr}</span>
                          <span>Last {formatWhen(stats?.lastClick || partner.last_click_at)}</span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button type="button" onClick={() => startPartnerEdit(partner)} className="rounded-xl border border-sky-400/20 bg-sky-500/[0.08] px-3 py-2 text-xs font-semibold text-sky-100">Edit Partner</button>
                          <button type="button" onClick={() => { setSection('banners'); setBannerForm((current) => ({ ...current, affiliate_link_id: partner.id })); }} className="rounded-xl border border-fuchsia-400/20 bg-fuchsia-500/[0.08] px-3 py-2 text-xs font-semibold text-fuchsia-100">Open Banner Studio</button>
                          <button type="button" onClick={() => navigator.clipboard.writeText(buildAffiliateGoUrl(partner.slug, 'recommended-tools'))} className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-200"><Copy className="h-3.5 w-3.5" /> Copy URL</button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </article>
          </div>

          <article className="rounded-[26px] border border-white/10 bg-white/[0.03] p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-200/85">Partner Management</p>
                <h3 className="mt-2 text-lg font-bold text-white">Professional Partner Profile</h3>
              </div>
              <button type="button" onClick={() => resetPartnerForm()} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-slate-200">New partner</button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input value={partnerForm.name} onChange={(event) => setPartnerForm((current) => ({ ...current, name: event.target.value, slug: editingPartnerId ? current.slug : normalizeSlug(event.target.value) }))} placeholder="Partner Name" className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" />
              <input value={partnerForm.slug} onChange={(event) => setPartnerForm((current) => ({ ...current, slug: normalizeSlug(event.target.value) }))} placeholder="Slug" className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" />
              <input value={partnerForm.category} onChange={(event) => setPartnerForm((current) => ({ ...current, category: event.target.value }))} placeholder="Category" className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" />
              <select value={partnerForm.status} onChange={(event) => setPartnerForm((current) => ({ ...current, status: event.target.value as PartnerStatus }))} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white">
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
              <input value={partnerForm.affiliate_click_url} onChange={(event) => setPartnerForm((current) => ({ ...current, affiliate_click_url: event.target.value }))} placeholder="Affiliate Click URL" className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white sm:col-span-2" />
              <input value={partnerForm.website_url} onChange={(event) => setPartnerForm((current) => ({ ...current, website_url: event.target.value }))} placeholder="Website URL" className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" />
              <input value={partnerForm.documentation_url} onChange={(event) => setPartnerForm((current) => ({ ...current, documentation_url: event.target.value }))} placeholder="Documentation URL" className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" />
              <input value={partnerForm.support_url} onChange={(event) => setPartnerForm((current) => ({ ...current, support_url: event.target.value }))} placeholder="Support URL" className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" />
              <input value={partnerForm.logo_url} onChange={(event) => setPartnerForm((current) => ({ ...current, logo_url: event.target.value }))} placeholder="Logo Image URL" className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" />
              <input value={partnerForm.button_text} onChange={(event) => setPartnerForm((current) => ({ ...current, button_text: event.target.value }))} placeholder="Button text" className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" />
              <input value={partnerForm.priority_order} onChange={(event) => setPartnerForm((current) => ({ ...current, priority_order: event.target.value }))} placeholder="Priority" className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" />
              <input value={partnerForm.display_order} onChange={(event) => setPartnerForm((current) => ({ ...current, display_order: event.target.value }))} placeholder="Display order" className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" />
              <input value={partnerForm.weight} onChange={(event) => setPartnerForm((current) => ({ ...current, weight: event.target.value }))} placeholder="Weight" className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" />
              <input value={partnerForm.partner_rating} onChange={(event) => setPartnerForm((current) => ({ ...current, partner_rating: event.target.value }))} placeholder="Partner rating (0-5)" className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" />
              <input value={partnerForm.partner_trust_score} onChange={(event) => setPartnerForm((current) => ({ ...current, partner_trust_score: event.target.value }))} placeholder="Trust score (0-100)" className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" />
              <input value={partnerForm.timezone} onChange={(event) => setPartnerForm((current) => ({ ...current, timezone: event.target.value }))} placeholder="Time zone" className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" />
              <input value={partnerForm.manual_conversions} onChange={(event) => setPartnerForm((current) => ({ ...current, manual_conversions: event.target.value }))} placeholder="Manual conversions" className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" />
              <input value={partnerForm.manual_estimated_revenue} onChange={(event) => setPartnerForm((current) => ({ ...current, manual_estimated_revenue: event.target.value }))} placeholder="Revenue estimate" className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" />
            </div>

            <div className="mt-4 space-y-3">
              <textarea value={partnerForm.description} onChange={(event) => setPartnerForm((current) => ({ ...current, description: event.target.value }))} rows={2} placeholder="Description" className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" />
              <textarea value={partnerForm.full_description} onChange={(event) => setPartnerForm((current) => ({ ...current, full_description: event.target.value }))} rows={3} placeholder="Full description" className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" />
              <textarea value={partnerForm.why_we_recommend} onChange={(event) => setPartnerForm((current) => ({ ...current, why_we_recommend: event.target.value }))} rows={3} placeholder="Why We Recommend" className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" />
              <textarea value={partnerForm.affiliate_notes} onChange={(event) => setPartnerForm((current) => ({ ...current, affiliate_notes: event.target.value }))} rows={3} placeholder="Affiliate Notes" className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" />
              <textarea value={partnerForm.notes} onChange={(event) => setPartnerForm((current) => ({ ...current, notes: event.target.value }))} rows={2} placeholder="Internal notes" className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <textarea value={partnerForm.pros_text} onChange={(event) => setPartnerForm((current) => ({ ...current, pros_text: event.target.value }))} rows={3} placeholder="Pros (one per line)" className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" />
              <textarea value={partnerForm.cons_text} onChange={(event) => setPartnerForm((current) => ({ ...current, cons_text: event.target.value }))} rows={3} placeholder="Cons (one per line)" className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" />
              <textarea value={partnerForm.security_benefits} onChange={(event) => setPartnerForm((current) => ({ ...current, security_benefits: event.target.value }))} rows={3} placeholder="Security benefits" className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" />
              <textarea value={partnerForm.things_to_consider} onChange={(event) => setPartnerForm((current) => ({ ...current, things_to_consider: event.target.value }))} rows={3} placeholder="Things to consider" className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" />
              <textarea value={partnerForm.disclosure_text} onChange={(event) => setPartnerForm((current) => ({ ...current, disclosure_text: event.target.value }))} rows={3} placeholder="Disclosure text" className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white sm:col-span-2" />
            </div>

            <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-200">
              <label className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2"><input type="checkbox" checked={partnerForm.is_featured} onChange={(event) => setPartnerForm((current) => ({ ...current, is_featured: event.target.checked }))} /> Featured</label>
              <label className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2"><input type="checkbox" checked={partnerForm.show_on_recommended_tools} onChange={(event) => setPartnerForm((current) => ({ ...current, show_on_recommended_tools: event.target.checked }))} /> Recommended Tools</label>
              <label className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2"><input type="checkbox" checked={partnerForm.show_on_homepage} onChange={(event) => setPartnerForm((current) => ({ ...current, show_on_homepage: event.target.checked }))} /> Homepage</label>
              <label className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2"><input type="checkbox" checked={partnerForm.show_on_learn_articles} onChange={(event) => setPartnerForm((current) => ({ ...current, show_on_learn_articles: event.target.checked }))} /> Learn</label>
              <label className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2"><input type="checkbox" checked={partnerForm.show_on_scam_alerts} onChange={(event) => setPartnerForm((current) => ({ ...current, show_on_scam_alerts: event.target.checked }))} /> Scam Alerts</label>
            </div>
          </article>
        </div>
      ) : null}

      {section === 'banners' ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-4">
            <article className="rounded-[26px] border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-fuchsia-200/85">Banner Studio</p>
                  <h3 className="mt-2 text-lg font-bold text-white">Multi-asset banner management</h3>
                </div>
                <button type="button" onClick={() => resetBannerForm()} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-slate-200">New banner</button>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <select value={bannerForm.affiliate_link_id} onChange={(event) => setBannerForm((current) => ({ ...current, affiliate_link_id: event.target.value }))} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white sm:col-span-2">
                  <option value="">Select partner</option>
                  {partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.name}</option>)}
                </select>
                <input value={bannerForm.banner_name} onChange={(event) => setBannerForm((current) => ({ ...current, banner_name: event.target.value }))} placeholder="Banner name" className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" />
                <select value={bannerForm.status} onChange={(event) => setBannerForm((current) => ({ ...current, status: event.target.value as PartnerStatus }))} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white">
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
                <input value={bannerForm.weight} onChange={(event) => setBannerForm((current) => ({ ...current, weight: event.target.value }))} placeholder="Weight" className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" />
                <input value={bannerForm.display_order} onChange={(event) => setBannerForm((current) => ({ ...current, display_order: event.target.value }))} placeholder="Display order" className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" />
                <select value={bannerForm.device_targeting} onChange={(event) => setBannerForm((current) => ({ ...current, device_targeting: event.target.value as DeviceTargeting }))} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white">
                  <option value="all">All Devices</option>
                  <option value="desktop">Desktop Only</option>
                  <option value="mobile">Mobile Only</option>
                  <option value="tablet">Tablet Only</option>
                </select>
                <select value={bannerForm.rotation_mode} onChange={(event) => setBannerForm((current) => ({ ...current, rotation_mode: event.target.value as RotationMode }))} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white">
                  <option value="random">Random</option>
                  <option value="weighted">Weighted</option>
                  <option value="sequential">Sequential</option>
                  <option value="highest_ctr">Highest CTR</option>
                </select>
                <input type="datetime-local" value={bannerForm.start_at} onChange={(event) => setBannerForm((current) => ({ ...current, start_at: event.target.value }))} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" />
                <input type="datetime-local" value={bannerForm.end_at} onChange={(event) => setBannerForm((current) => ({ ...current, end_at: event.target.value }))} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" />
                <input value={bannerForm.timezone} onChange={(event) => setBannerForm((current) => ({ ...current, timezone: event.target.value }))} placeholder="Time zone" className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" />
                <input value={bannerForm.alt_text} onChange={(event) => setBannerForm((current) => ({ ...current, alt_text: event.target.value }))} placeholder="Alt text" className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" />
              </div>

              <div className="mt-4 rounded-[22px] border border-white/10 bg-slate-950/40 p-4">
                <p className="text-sm font-semibold text-white">Placements</p>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {PLACEMENTS.map((placement) => (
                    <label key={placement.value} className="inline-flex min-h-[46px] items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-200">
                      <input
                        type="checkbox"
                        checked={bannerForm.placements.includes(placement.value)}
                        onChange={() => setBannerForm((current) => ({
                          ...current,
                          placements: current.placements.includes(placement.value)
                            ? current.placements.filter((value) => value !== placement.value)
                            : [...current.placements, placement.value],
                        }))}
                      />
                      {placement.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
                <AssetField label="Logo Image" recommended="Prefer square logo" value={selectedPartner?.logo_url || ''} onChange={() => undefined} onClear={() => undefined} />
                <AssetField label="Desktop Banner" recommended="728 x 90" value={bannerForm.desktop_banner_url} onChange={(value) => setBannerForm((current) => ({ ...current, desktop_banner_url: value }))} onClear={() => setBannerForm((current) => ({ ...current, desktop_banner_url: '' }))} />
                <AssetField label="Mobile Banner" recommended="320 x 100" value={bannerForm.mobile_banner_url} onChange={(value) => setBannerForm((current) => ({ ...current, mobile_banner_url: value }))} onClear={() => setBannerForm((current) => ({ ...current, mobile_banner_url: '' }))} />
                <AssetField label="Square Banner" recommended="300 x 250" value={bannerForm.square_banner_url} onChange={(value) => setBannerForm((current) => ({ ...current, square_banner_url: value }))} onClear={() => setBannerForm((current) => ({ ...current, square_banner_url: '' }))} />
                <AssetField label="Large Hero Banner" recommended="1200 x 300" value={bannerForm.hero_banner_url} onChange={(value) => setBannerForm((current) => ({ ...current, hero_banner_url: value }))} onClear={() => setBannerForm((current) => ({ ...current, hero_banner_url: '' }))} />
              </div>
            </article>

            <article className="rounded-[26px] border border-white/10 bg-white/[0.03] p-4">
              <h3 className="text-sm font-semibold text-white">Banner Inventory</h3>
              <div className="mt-3 space-y-3">
                {banners.length === 0 ? (
                  <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-slate-400">No banners created yet.</p>
                ) : banners.map((banner) => {
                  const partner = partnerMap.get(banner.affiliate_link_id);
                  const stats = analyticsByBanner.get(banner.id) || { clicks: 0, impressions: 0 };
                  const ctr = stats.impressions > 0 ? `${((stats.clicks / stats.impressions) * 100).toFixed(2)}%` : '0.00%';
                  return (
                    <article key={banner.id} className={`rounded-[22px] border p-4 ${editingBannerId === banner.id ? 'border-fuchsia-300/30 bg-fuchsia-500/[0.08]' : 'border-white/10 bg-white/[0.02]'}`}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-white">{banner.banner_name}</p>
                          <p className="mt-1 text-xs text-slate-400">{partner?.name || 'Unknown partner'} • {(banner.placements || []).join(', ') || 'No placements'}</p>
                        </div>
                        <div className="flex flex-wrap gap-2 text-[11px]">
                          <span className={`rounded-full px-2.5 py-1 ${banner.enabled ? 'bg-emerald-500/12 text-emerald-100' : 'bg-white/[0.05] text-slate-300'}`}>{banner.enabled ? 'Enabled' : 'Disabled'}</span>
                          <span className="rounded-full bg-cyan-500/12 px-2.5 py-1 text-cyan-100">CTR {ctr}</span>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-300 sm:grid-cols-4">
                        <span>Impr. {stats.impressions}</span>
                        <span>Clicks {stats.clicks}</span>
                        <span>Device {banner.device_targeting || 'all'}</span>
                        <span>Rotation {banner.rotation_mode || 'weighted'}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={() => startBannerEdit(banner)} className="rounded-xl border border-sky-400/20 bg-sky-500/[0.08] px-3 py-2 text-xs font-semibold text-sky-100">Edit Banner</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </article>
          </div>

          <div className="space-y-4">
            <article className="rounded-[26px] border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-white">Live Preview</h3>
                <div className="flex flex-wrap gap-2">
                  {[{ key: 'desktop', icon: Monitor }, { key: 'tablet', icon: Tablet }, { key: 'mobile', icon: Smartphone }].map(({ key, icon: Icon }) => (
                    <button key={key} type="button" onClick={() => setPreviewDevice(key as PreviewDevice)} className={`rounded-xl border px-3 py-2 text-xs ${previewDevice === key ? 'border-cyan-300/30 bg-cyan-500/12 text-cyan-100' : 'border-white/10 bg-white/[0.04] text-slate-300'}`}><Icon className="h-3.5 w-3.5" /></button>
                  ))}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(['hero', 'card', 'sidebar'] as PreviewSurface[]).map((surface) => (
                  <button key={surface} type="button" onClick={() => setPreviewSurface(surface)} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${previewSurface === surface ? 'border-fuchsia-300/30 bg-fuchsia-500/[0.12] text-fuchsia-100' : 'border-white/10 bg-white/[0.04] text-slate-300'}`}>{surface}</button>
                ))}
              </div>
              <div className="mt-4 flex justify-center">
                <BannerPreview banner={bannerForm} partnerName={selectedPartnerName} previewDevice={previewDevice} previewSurface={previewSurface} />
              </div>
            </article>
            <article className="rounded-[26px] border border-white/10 bg-white/[0.03] p-4 text-xs text-slate-300">
              <h3 className="text-sm font-semibold text-white">Validation Checklist</h3>
              <div className="mt-3 space-y-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">Image exists and validates per asset card.</div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">Affiliate click URL stays separate from media URLs.</div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">Object-fit is always contain in preview and live banner component.</div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">Expired banners automatically stop qualifying for public views.</div>
              </div>
            </article>
          </div>
        </div>
      ) : null}

      {section === 'analytics' ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-[26px] border border-white/10 bg-white/[0.03] p-4">
            <h3 className="text-base font-bold text-white">Partner Analytics</h3>
            <div className="mt-4 space-y-3">
              {partners.map((partner) => {
                const stats = analyticsByPartner.get(partner.id);
                const ctr = stats && stats.impressions > 0 ? `${((stats.clicks / stats.impressions) * 100).toFixed(2)}%` : '0.00%';
                const topPlacement = stats ? Array.from(stats.placements.entries()).sort((a, b) => b[1] - a[1])[0] : null;
                const topDevice = stats ? Array.from(stats.devices.entries()).sort((a, b) => b[1] - a[1])[0] : null;
                return (
                  <article key={partner.id} className="rounded-[22px] border border-white/10 bg-white/[0.02] p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">{partner.name}</p>
                        <p className="mt-1 text-xs text-slate-400">Clicks today {stats?.clicksToday || 0} • week {stats?.clicksWeek || 0} • month {stats?.clicksMonth || 0}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[11px]">
                        <span className="rounded-full bg-cyan-500/12 px-2.5 py-1 text-cyan-100">CTR {ctr}</span>
                        <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-slate-300">Last {formatWhen(stats?.lastClick || partner.last_click_at)}</span>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-300 sm:grid-cols-5">
                      <span>Impr. {stats?.impressions || 0}</span>
                      <span>Unique impr. {stats?.uniqueImpressions || 0}</span>
                      <span>Clicks {stats?.clicks || 0}</span>
                      <span>Unique clicks {stats?.uniqueClicks || 0}</span>
                      <span>{topPlacement ? `Top placement ${topPlacement[0]}` : 'Top placement n/a'}</span>
                    </div>
                    <div className="mt-2 text-[11px] text-slate-400">{topDevice ? `Top device ${topDevice[0]}` : 'Top device unavailable'} • Revenue placeholder {formatCurrency(Math.max(0, Number(partner.manual_estimated_revenue ?? 0)))}</div>
                  </article>
                );
              })}
            </div>
          </article>
          <div className="space-y-4">
            <article className="rounded-[26px] border border-white/10 bg-white/[0.03] p-4">
              <h3 className="text-sm font-semibold text-white">Recent Click Tracking</h3>
              <div className="mt-3 space-y-2">
                {clicks.slice(0, 16).map((click) => (
                  <div key={click.id} className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-xs text-slate-300">
                    <p className="font-semibold text-white">{partnerMap.get(click.affiliate_link_id)?.name || click.slug}</p>
                    <p className="mt-1">{formatWhen(click.created_at)} • {click.placement_name || 'unknown'} • {click.device_type || 'unknown'} • {click.country_code || 'n/a'}</p>
                    <p className="mt-1 text-slate-400">{click.referrer || 'Direct'}{click.affiliate_banner_id ? ` • banner ${click.affiliate_banner_id.slice(0, 8)}` : ''}</p>
                  </div>
                ))}
              </div>
            </article>
            <article className="rounded-[26px] border border-white/10 bg-white/[0.03] p-4">
              <h3 className="text-sm font-semibold text-white">Impression Snapshot</h3>
              <p className="mt-2 text-xs text-slate-400">Impressions, unique impressions and device mix are recorded separately from click redirects.</p>
              <div className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.08] px-3 py-3 text-xs text-emerald-100">Total impressions tracked: {impressions.length}</div>
            </article>
          </div>
        </div>
      ) : null}

      {hasUnsavedChanges ? (
        <div className="sticky bottom-3 z-20 flex flex-col gap-3 rounded-[24px] border border-cyan-300/20 bg-slate-950/88 p-4 shadow-[0_22px_60px_rgba(2,6,23,0.55)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 text-sm text-slate-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-300" />
            <div>
              <p className="font-semibold text-white">Unsaved changes</p>
              <p className="mt-1 text-xs text-slate-400">You have draft changes in the affiliate admin workspace.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {partnerDirty ? <button type="button" onClick={() => void savePartner()} disabled={savingPartner} className="inline-flex min-h-[46px] items-center gap-2 rounded-2xl border border-cyan-400/25 bg-cyan-500/12 px-4 py-2 text-sm font-semibold text-cyan-100 disabled:opacity-60">{savingPartner ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save partner</button> : null}
            {bannerDirty ? <button type="button" onClick={() => void saveBanner()} disabled={savingBanner} className="inline-flex min-h-[46px] items-center gap-2 rounded-2xl border border-fuchsia-400/25 bg-fuchsia-500/[0.12] px-4 py-2 text-sm font-semibold text-fuchsia-100 disabled:opacity-60">{savingBanner ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save banner</button> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export { AffiliateHubSectionPremium as AffiliateHubSection };