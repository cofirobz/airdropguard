import { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, Loader2, Pencil, Plus, RefreshCw, Star, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type FilterStatus = 'all' | 'active' | 'inactive';

interface AffiliateLinkRow {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  destination_url: string;
  logo_url: string | null;
  banner_image_url: string | null;
  description: string | null;
  full_description: string | null;
  why_we_recommend: string | null;
  best_for: string | null;
  pros: string[] | null;
  cons: string[] | null;
  security_benefits: string | null;
  things_to_consider: string | null;
  disclosure_text: string | null;
  official_website: string | null;
  button_text: string | null;
  seo_title: string | null;
  meta_description: string | null;
  is_active: boolean;
  is_featured: boolean;
  show_on_recommended_tools: boolean;
  show_on_homepage: boolean;
  show_on_learn_articles: boolean;
  show_on_scam_alerts: boolean;
  notes: string | null;
  commission_rate: string | null;
  payment_threshold: string | null;
  tags: string[] | null;
  priority_order: number;
  created_at: string;
  updated_at: string;
  last_click_at: string | null;
}

interface AffiliateClickRow {
  id: string;
  affiliate_link_id: string;
  slug: string;
  placement_name: string | null;
  tracker_value: string | null;
  referrer: string | null;
  created_at: string;
}

interface AffiliateFormState {
  name: string;
  slug: string;
  category: string;
  destination_url: string;
  logo_url: string;
  banner_image_url: string;
  description: string;
  full_description: string;
  why_we_recommend: string;
  best_for: string;
  pros_text: string;
  cons_text: string;
  security_benefits: string;
  things_to_consider: string;
  official_website: string;
  button_text: string;
  disclosure_text: string;
  commission_rate: string;
  payment_threshold: string;
  tags: string;
  seo_title: string;
  meta_description: string;
  notes: string;
  priority_order: string;
  is_featured: boolean;
  is_active: boolean;
  show_on_recommended_tools: boolean;
  show_on_homepage: boolean;
  show_on_learn_articles: boolean;
  show_on_scam_alerts: boolean;
}

const DEFAULT_DISCLOSURE = 'Some links on this page are affiliate links. AirdropGuard may earn a commission at no extra cost to you. Our reviews, AI scores and human verification remain independent.';

const BLANK_FORM: AffiliateFormState = {
  name: '',
  slug: '',
  category: '',
  destination_url: '',
  logo_url: '',
  banner_image_url: '',
  description: '',
  full_description: '',
  why_we_recommend: '',
  best_for: '',
  pros_text: '',
  cons_text: '',
  security_benefits: '',
  things_to_consider: '',
  official_website: '',
  button_text: 'Visit Partner',
  disclosure_text: DEFAULT_DISCLOSURE,
  commission_rate: '',
  payment_threshold: '',
  tags: '',
  seo_title: '',
  meta_description: '',
  notes: '',
  priority_order: '100',
  is_featured: false,
  is_active: true,
  show_on_recommended_tools: true,
  show_on_homepage: false,
  show_on_learn_articles: false,
  show_on_scam_alerts: false,
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
    if (!/^https?:$/i.test(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function parseTags(input: string): string[] {
  return input
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.toLowerCase());
}

function parseBullets(input: string): string[] {
  return input
    .split(/\r?\n|,/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function formatSupabaseError(error: unknown): string {
  const err = error as {
    code?: string;
    message?: string;
    details?: string | null;
    hint?: string | null;
  };

  const message = [err?.code, err?.message, err?.details, err?.hint]
    .filter((part) => Boolean(part && String(part).trim()))
    .join(' | ');

  if (message) return message;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return 'Unknown Supabase error';
}

function safeHost(): string {
  if (typeof window === 'undefined') return 'https://airdropguard.com';
  return window.location.origin;
}

function formatWhen(value: string | null): string {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid date';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getInitial(name: string): string {
  return (name.trim().charAt(0) || '?').toUpperCase();
}

const PLACEMENT_LABELS: Array<{ key: string; label: string }> = [
  { key: 'homepage', label: 'Homepage' },
  { key: 'recommended-tools', label: 'Recommended Tools' },
  { key: 'learn', label: 'Learn' },
  { key: 'articles', label: 'Articles' },
  { key: 'scam-alerts', label: 'Scam Alerts' },
  { key: 'affiliate-page', label: 'Affiliate Pages' },
];

export function AffiliateHubSection({
  visible,
  showToast,
}: {
  visible: boolean;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}) {
  const [rows, setRows] = useState<AffiliateLinkRow[]>([]);
  const [recentClicks, setRecentClicks] = useState<AffiliateClickRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AffiliateFormState>(BLANK_FORM);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchAffiliateData = useCallback(async () => {
    setLoading(true);
    try {
      const [linksRes, clicksRes] = await Promise.all([
        supabase
          .from('affiliate_links')
          .select('id, name, slug, category, destination_url, logo_url, banner_image_url, description, full_description, why_we_recommend, best_for, pros, cons, security_benefits, things_to_consider, disclosure_text, official_website, button_text, seo_title, meta_description, is_active, is_featured, show_on_recommended_tools, show_on_homepage, show_on_learn_articles, show_on_scam_alerts, notes, commission_rate, payment_threshold, tags, priority_order, created_at, updated_at, last_click_at')
          .order('updated_at', { ascending: false }),
        supabase
          .from('affiliate_clicks')
          .select('id, affiliate_link_id, slug, placement_name, tracker_value, referrer, created_at')
          .order('created_at', { ascending: false })
          .limit(1000),
      ]);

      if (linksRes.error) throw linksRes.error;
      if (clicksRes.error) throw clicksRes.error;

      setRows((linksRes.data ?? []) as AffiliateLinkRow[]);
      setRecentClicks((clicksRes.data ?? []) as AffiliateClickRow[]);
    } catch (error) {
      const detailedMessage = formatSupabaseError(error);
      console.error('[Admin][AffiliateHub] Unable to load affiliate hub data', {
        error,
        message: detailedMessage,
      });
      showToast(
        import.meta.env.DEV
          ? `Unable to load affiliate hub data: ${detailedMessage}`
          : 'Unable to load affiliate hub data.',
        'error'
      );
      setRows([]);
      setRecentClicks([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!visible) return;
    void fetchAffiliateData();
  }, [visible, fetchAffiliateData]);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setForm(BLANK_FORM);
  }, []);

  const startEdit = useCallback((row: AffiliateLinkRow) => {
    setEditingId(row.id);
    setForm({
      name: row.name,
      slug: row.slug,
      category: row.category || '',
      destination_url: row.destination_url,
      logo_url: row.logo_url || '',
      banner_image_url: row.banner_image_url || '',
      description: row.description || '',
      full_description: row.full_description || '',
      why_we_recommend: row.why_we_recommend || '',
      best_for: row.best_for || '',
      pros_text: (row.pros || []).join('\n'),
      cons_text: (row.cons || []).join('\n'),
      security_benefits: row.security_benefits || '',
      things_to_consider: row.things_to_consider || '',
      official_website: row.official_website || '',
      button_text: row.button_text || 'Visit Partner',
      disclosure_text: row.disclosure_text || DEFAULT_DISCLOSURE,
      commission_rate: row.commission_rate || '',
      payment_threshold: row.payment_threshold || '',
      tags: (row.tags || []).join(', '),
      seo_title: row.seo_title || '',
      meta_description: row.meta_description || '',
      notes: row.notes || '',
      priority_order: String(row.priority_order),
      is_featured: row.is_featured,
      is_active: row.is_active,
      show_on_recommended_tools: row.show_on_recommended_tools,
      show_on_homepage: row.show_on_homepage,
      show_on_learn_articles: row.show_on_learn_articles,
      show_on_scam_alerts: row.show_on_scam_alerts,
    });
  }, []);

  const clickStatsById = useMemo(() => {
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);
    const start7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const start30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const stats = new Map<string, { total: number; today: number; d7: number; d30: number; lastClick: string | null }>();

    rows.forEach((row) => {
      stats.set(row.id, {
        total: 0,
        today: 0,
        d7: 0,
        d30: 0,
        lastClick: row.last_click_at,
      });
    });

    recentClicks.forEach((click) => {
      const at = new Date(click.created_at);
      const current = stats.get(click.affiliate_link_id) || { total: 0, today: 0, d7: 0, d30: 0, lastClick: null };
      current.total += 1;
      if (at >= startToday) current.today += 1;
      if (at >= start7d) current.d7 += 1;
      if (at >= start30d) current.d30 += 1;
      if (!current.lastClick || at > new Date(current.lastClick)) current.lastClick = click.created_at;
      stats.set(click.affiliate_link_id, current);
    });

    return stats;
  }, [recentClicks, rows]);

  const groupedPlacementClicks = useMemo(() => {
    const map = new Map<string, number>(PLACEMENT_LABELS.map((placement) => [placement.key, 0]));
    recentClicks.forEach((click) => {
      const key = click.placement_name || click.tracker_value || 'unknown';
      map.set(key, (map.get(key) || 0) + 1);
    });
    return PLACEMENT_LABELS.map((placement) => ({
      key: placement.key,
      label: placement.label,
      count: map.get(placement.key) || 0,
    }));
  }, [recentClicks]);

  const groupedSourceClicks = useMemo(() => {
    const map = new Map<string, number>();
    recentClicks.forEach((click) => {
      const source = click.tracker_value || click.referrer || 'direct';
      map.set(source, (map.get(source) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [recentClicks]);

  const categoryOptions = useMemo(() => Array.from(new Set(rows.map((row) => row.category || 'Uncategorized'))).sort(), [rows]);

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((row) => {
      const haystack = `${row.name} ${row.slug} ${row.category || ''}`.toLowerCase();
      if (needle && !haystack.includes(needle)) return false;
      if (statusFilter === 'active' && !row.is_active) return false;
      if (statusFilter === 'inactive' && row.is_active) return false;
      if (categoryFilter !== 'all' && (row.category || 'Uncategorized') !== categoryFilter) return false;
      return true;
    });
  }, [categoryFilter, rows, search, statusFilter]);

  const saveAffiliateLink = useCallback(async () => {
    const slug = normalizeSlug(form.slug);
    const destination = form.destination_url.trim();
    const normalizedLogoUrl = normalizeOptionalHttpUrl(form.logo_url);
    const normalizedBannerUrl = normalizeOptionalHttpUrl(form.banner_image_url);
    const normalizedOfficialWebsite = normalizeOptionalHttpUrl(form.official_website);

    if (!form.name.trim()) return showToast('Partner name is required.', 'error');
    if (!slug) return showToast('Slug is required.', 'error');
    if (!/^https?:\/\//i.test(destination)) return showToast('Destination URL must start with http:// or https://', 'error');
    if (form.logo_url.trim() && !normalizedLogoUrl) return showToast('Logo URL must be a valid http(s) URL.', 'error');
    if (form.banner_image_url.trim() && !normalizedBannerUrl) return showToast('Banner URL must be a valid http(s) URL.', 'error');
    if (form.official_website.trim() && !normalizedOfficialWebsite) return showToast('Official Website must be a valid http(s) URL.', 'error');

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        slug,
        category: form.category.trim() || null,
        destination_url: destination,
        logo_url: normalizedLogoUrl,
        banner_image_url: normalizedBannerUrl,
        description: form.description.trim() || null,
        full_description: form.full_description.trim() || null,
        why_we_recommend: form.why_we_recommend.trim() || null,
        best_for: form.best_for.trim() || null,
        pros: parseBullets(form.pros_text),
        cons: parseBullets(form.cons_text),
        security_benefits: form.security_benefits.trim() || null,
        things_to_consider: form.things_to_consider.trim() || null,
        official_website: normalizedOfficialWebsite,
        button_text: form.button_text.trim() || 'Visit Partner',
        disclosure_text: form.disclosure_text.trim() || null,
        commission_rate: form.commission_rate.trim() || null,
        payment_threshold: form.payment_threshold.trim() || null,
        tags: parseTags(form.tags),
        seo_title: form.seo_title.trim() || null,
        meta_description: form.meta_description.trim() || null,
        notes: form.notes.trim() || null,
        priority_order: Number(form.priority_order || '100'),
        is_featured: form.is_featured,
        is_active: form.is_active,
        show_on_recommended_tools: form.show_on_recommended_tools,
        show_on_homepage: form.show_on_homepage,
        show_on_learn_articles: form.show_on_learn_articles,
        show_on_scam_alerts: form.show_on_scam_alerts,
      };

      if (editingId) {
        const { error } = await supabase.from('affiliate_links').update(payload).eq('id', editingId);
        if (error) throw error;
        showToast('Affiliate updated.');
      } else {
        const { error } = await supabase.from('affiliate_links').insert(payload);
        if (error) throw error;
        showToast('Affiliate created.');
      }

      resetForm();
      await fetchAffiliateData();
    } catch (error) {
      const message = formatSupabaseError(error);
      console.error(editingId ? '[Admin][AffiliateHub] Failed to update affiliate' : '[Admin][AffiliateHub] Failed to create affiliate', {
        error,
        message,
        editingId,
        payloadLogoUrl: form.logo_url,
      });
      showToast(import.meta.env.DEV ? `Save failed: ${message}` : 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  }, [editingId, fetchAffiliateData, form, resetForm, showToast]);

  const toggleActive = useCallback(async (row: AffiliateLinkRow) => {
    const { error } = await supabase.from('affiliate_links').update({ is_active: !row.is_active }).eq('id', row.id);
    if (error) {
      const message = formatSupabaseError(error);
      console.error('[Admin][AffiliateHub] Failed to toggle active', { error, message, rowId: row.id });
      return showToast(import.meta.env.DEV ? `Update failed: ${message}` : 'Update failed.', 'error');
    }
    showToast(`${row.name} ${row.is_active ? 'disabled' : 'enabled'}.`);
    await fetchAffiliateData();
  }, [fetchAffiliateData, showToast]);

  const toggleFeatured = useCallback(async (row: AffiliateLinkRow) => {
    const { error } = await supabase.from('affiliate_links').update({ is_featured: !row.is_featured }).eq('id', row.id);
    if (error) {
      const message = formatSupabaseError(error);
      console.error('[Admin][AffiliateHub] Failed to toggle featured', { error, message, rowId: row.id });
      return showToast(import.meta.env.DEV ? `Update failed: ${message}` : 'Update failed.', 'error');
    }
    showToast(`${row.name} ${row.is_featured ? 'unfeatured' : 'featured'}.`);
    await fetchAffiliateData();
  }, [fetchAffiliateData, showToast]);

  const deleteAffiliate = useCallback(async (row: AffiliateLinkRow) => {
    const { error } = await supabase.from('affiliate_links').delete().eq('id', row.id);
    if (error) {
      const message = formatSupabaseError(error);
      console.error('[Admin][AffiliateHub] Failed to delete affiliate', { error, message, rowId: row.id });
      return showToast(import.meta.env.DEV ? `Delete failed: ${message}` : 'Delete failed.', 'error');
    }
    showToast(`${row.name} deleted.`);
    await fetchAffiliateData();
  }, [fetchAffiliateData, showToast]);

  const copyInternalUrl = useCallback(async (slug: string) => {
    try {
      await navigator.clipboard.writeText(`${safeHost()}/go/${slug}`);
      showToast('Internal URL copied.');
    } catch {
      showToast('Copy failed.', 'error');
    }
  }, [showToast]);

  if (!visible) return null;

  return (
    <section id="admin-affiliate-hub" className="space-y-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-emerald-200">Affiliate Hub</h2>
          <p className="mt-1 text-xs text-gray-300">Manual content-managed affiliate sections.</p>
        </div>
        <button
          onClick={() => void fetchAffiliateData()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs text-gray-200 hover:bg-white/[0.08] disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </button>
      </div>

      <div className="rounded-xl border border-white/10 bg-dark-900/45 p-3 space-y-3">
        <p className="text-[11px] uppercase tracking-[0.1em] text-emerald-200">Add or Edit Affiliate</p>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Partner name *" className="rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white" />
          <input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: normalizeSlug(e.target.value) }))} placeholder="Slug *" className="rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white" />
          <input value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} placeholder="Category" className="rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white" />
          <input value={form.destination_url} onChange={(e) => setForm((p) => ({ ...p, destination_url: e.target.value }))} placeholder="Base Affiliate URL *" className="rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white" />
          <input value={form.logo_url} onChange={(e) => setForm((p) => ({ ...p, logo_url: e.target.value }))} placeholder="Logo URL" className="rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white" />
          <input value={form.button_text} onChange={(e) => setForm((p) => ({ ...p, button_text: e.target.value }))} placeholder="Button Text" className="rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white" />
          <input value={form.priority_order} onChange={(e) => setForm((p) => ({ ...p, priority_order: e.target.value }))} placeholder="Display order" className="rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white" />
        </div>

        <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Short Description (cards)" rows={2} className="w-full rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white" />
        <textarea value={form.why_we_recommend} onChange={(e) => setForm((p) => ({ ...p, why_we_recommend: e.target.value }))} placeholder="Why We Recommend This" rows={2} className="w-full rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white" />

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 text-xs text-gray-200">
          <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={form.is_featured} onChange={(e) => setForm((p) => ({ ...p, is_featured: e.target.checked }))} className="h-3.5 w-3.5" />Featured</label>
          <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))} className="h-3.5 w-3.5" />Active</label>
          <p className="text-[11px] text-gray-400">Display order controls list priority.</p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {editingId ? <button onClick={resetForm} className="rounded-lg border border-white/15 bg-white/[0.03] px-3 py-1.5 text-xs text-gray-200">Cancel edit</button> : null}
          <button onClick={() => void saveAffiliateLink()} disabled={saving} className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-500/12 px-3 py-1.5 text-xs text-emerald-100 disabled:opacity-60">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editingId ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {editingId ? 'Save changes' : 'Add affiliate'}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-dark-900/45 p-3 space-y-3">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search partner, slug, category" className="rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as FilterStatus)} className="rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white">
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white">
            <option value="all">All categories</option>
            {categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </div>

        <div className="space-y-2 md:hidden">
          {filteredRows.map((row) => {
            const stats = clickStatsById.get(row.id) || { total: 0, today: 0, d7: 0, d30: 0, lastClick: null };
            return (
              <article key={`affiliate-mobile-${row.id}`} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{row.name}</p>
                    <p className="mt-1 text-[11px] text-gray-400">{row.category || 'Uncategorized'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-[10px]">
                    <span className={`rounded-full px-2 py-0.5 ${row.is_active ? 'bg-emerald-500/15 text-emerald-200' : 'bg-rose-500/15 text-rose-200'}`}>{row.is_active ? 'Active' : 'Inactive'}</span>
                    <span className={`rounded-full px-2 py-0.5 ${row.is_featured ? 'bg-amber-500/15 text-amber-200' : 'bg-white/10 text-gray-300'}`}>{row.is_featured ? 'Featured' : 'Standard'}</span>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-gray-300">
                  <div>Total: {stats.total}</div>
                  <div>7d: {stats.d7}</div>
                  <div>30d: {stats.d30}</div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button onClick={() => void copyInternalUrl(row.slug)} className="rounded-md border border-white/15 bg-white/[0.03] px-2 py-1 text-[11px] text-gray-200">Copy URL</button>
                  <button onClick={() => startEdit(row)} className="rounded-md border border-sky-400/30 bg-sky-500/10 px-2 py-1 text-[11px] text-sky-100">Edit</button>
                  <button onClick={() => void toggleActive(row)} className={`rounded-md border px-2 py-1 text-[11px] ${row.is_active ? 'border-amber-400/30 bg-amber-500/10 text-amber-100' : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'}`}>
                    {row.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button onClick={() => void toggleFeatured(row)} className={`rounded-md border px-2 py-1 text-[11px] ${row.is_featured ? 'border-amber-400/30 bg-amber-500/10 text-amber-100' : 'border-white/15 bg-white/[0.03] text-gray-200'}`}>
                    {row.is_featured ? 'Unfeature' : 'Feature'}
                  </button>
                  <button onClick={() => setConfirmDeleteId(row.id)} className="inline-flex items-center gap-1 rounded-md border border-rose-500/25 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-100">
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
          {filteredRows.length === 0 ? <p className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-4 text-center text-xs text-gray-400">No affiliate records match the current filters.</p> : null}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-xs text-left text-gray-200">
            <thead className="text-[11px] uppercase tracking-wide text-gray-400">
              <tr>
                <th className="px-2 py-2">Partner</th>
                <th className="px-2 py-2">Category</th>
                <th className="px-2 py-2">Active</th>
                <th className="px-2 py-2">Featured</th>
                <th className="px-2 py-2">Internal URL</th>
                <th className="px-2 py-2">Total</th>
                <th className="px-2 py-2">7d</th>
                <th className="px-2 py-2">30d</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                const stats = clickStatsById.get(row.id) || { total: 0, today: 0, d7: 0, d30: 0, lastClick: null };
                const internalUrl = `${safeHost()}/go/${row.slug}`;
                return (
                  <tr key={row.id} className="border-t border-white/10">
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-2">
                        {row.logo_url ? (
                          <img src={row.logo_url} alt={row.name} className="h-7 w-7 rounded-full border border-white/15 object-cover" />
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-[11px] font-semibold text-emerald-200">{getInitial(row.name)}</div>
                        )}
                        <span className="font-medium text-white">{row.name}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2">{row.category || 'Uncategorized'}</td>
                    <td className="px-2 py-2">
                      <span className={`rounded-full px-2 py-0.5 ${row.is_active ? 'bg-emerald-500/15 text-emerald-200' : 'bg-rose-500/15 text-rose-200'}`}>{row.is_active ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="px-2 py-2">
                      <span className={`rounded-full px-2 py-0.5 ${row.is_featured ? 'bg-amber-500/15 text-amber-200' : 'bg-white/10 text-gray-300'}`}>{row.is_featured ? 'Featured' : 'No'}</span>
                    </td>
                    <td className="px-2 py-2">
                      <button onClick={() => void copyInternalUrl(row.slug)} className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/[0.03] px-2 py-1 text-[11px] text-gray-200 hover:bg-white/[0.08]" title={internalUrl}>
                        <Copy className="h-3.5 w-3.5" />
                        /go/{row.slug}
                      </button>
                    </td>
                    <td className="px-2 py-2">{stats.total}</td>
                    <td className="px-2 py-2">{stats.d7}</td>
                    <td className="px-2 py-2">{stats.d30}</td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap gap-1">
                        <button onClick={() => startEdit(row)} className="rounded-md border border-sky-400/30 bg-sky-500/10 px-2 py-1 text-[11px] text-sky-100">Edit</button>
                        <button onClick={() => void toggleActive(row)} className={`rounded-md border px-2 py-1 text-[11px] ${row.is_active ? 'border-amber-400/30 bg-amber-500/10 text-amber-100' : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'}`}>
                          {row.is_active ? 'Disable' : 'Enable'}
                        </button>
                        <button onClick={() => void toggleFeatured(row)} className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] ${row.is_featured ? 'border-amber-400/30 bg-amber-500/10 text-amber-100' : 'border-white/15 bg-white/[0.03] text-gray-200'}`}>
                          <Star className="h-3.5 w-3.5" />
                          {row.is_featured ? 'Unfeature' : 'Feature'}
                        </button>
                        <button onClick={() => setConfirmDeleteId(row.id)} className="inline-flex items-center gap-1 rounded-md border border-rose-500/25 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-100">
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-2 py-4 text-center text-xs text-gray-400">No affiliate records match the current filters.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <article className="rounded-xl border border-white/10 bg-dark-900/45 p-3 lg:col-span-2">
          <h3 className="text-xs font-semibold text-white">Recent Clicks</h3>
          <p className="mt-1 text-[11px] text-gray-400">Track latest click events with placement/source details.</p>
          <div className="mt-3 max-h-80 overflow-auto">
            <table className="min-w-full text-xs text-left text-gray-200">
              <thead className="text-[11px] uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-2 py-2">Time</th>
                  <th className="px-2 py-2">Partner</th>
                  <th className="px-2 py-2">Slug</th>
                  <th className="px-2 py-2">Placement</th>
                  <th className="px-2 py-2">Source</th>
                </tr>
              </thead>
              <tbody>
                {recentClicks.slice(0, 120).map((click) => {
                  const row = rows.find((item) => item.id === click.affiliate_link_id);
                  return (
                    <tr key={click.id} className="border-t border-white/10">
                      <td className="px-2 py-2">{formatWhen(click.created_at)}</td>
                      <td className="px-2 py-2">{row?.name || 'Unknown'}</td>
                      <td className="px-2 py-2 font-mono">{click.slug}</td>
                      <td className="px-2 py-2">{click.placement_name || 'unknown'}</td>
                      <td className="px-2 py-2">{click.tracker_value || click.referrer || 'direct'}</td>
                    </tr>
                  );
                })}
                {recentClicks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-2 py-4 text-center text-xs text-gray-400">No click data available yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>

        <div className="space-y-3">
          <article className="rounded-xl border border-white/10 bg-dark-900/45 p-3">
            <h3 className="text-xs font-semibold text-white">Clicks By Placement</h3>
            <div className="mt-2 space-y-1.5 text-xs text-gray-200">
              {groupedPlacementClicks.map((placement) => (
                <div key={placement.key} className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.02] px-2 py-1">
                  <span className="truncate pr-2">{placement.label}</span>
                  <span className="font-semibold text-emerald-200">{placement.count}</span>
                </div>
              ))}
              {groupedPlacementClicks.length === 0 ? <p className="text-gray-400">No placement data yet.</p> : null}
            </div>
          </article>

          <article className="rounded-xl border border-white/10 bg-dark-900/45 p-3">
            <h3 className="text-xs font-semibold text-white">Clicks By Source</h3>
            <div className="mt-2 space-y-1.5 text-xs text-gray-200">
              {groupedSourceClicks.map(([key, count]) => (
                <div key={key} className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.02] px-2 py-1">
                  <span className="truncate pr-2">{key}</span>
                  <span className="font-semibold text-emerald-200">{count}</span>
                </div>
              ))}
              {groupedSourceClicks.length === 0 ? <p className="text-gray-400">No source data yet.</p> : null}
            </div>
          </article>
        </div>
      </div>

      {confirmDeleteId ? (
        <div className="fixed inset-0 z-[70] bg-black/70 px-4 py-8 backdrop-blur-sm">
          <div className="mx-auto max-w-md rounded-2xl border border-white/15 bg-dark-950/95 p-5">
            <h3 className="text-base font-semibold text-white">Delete affiliate?</h3>
            <p className="mt-2 text-sm text-gray-300">This action cannot be undone.</p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button onClick={() => setConfirmDeleteId(null)} className="rounded-lg border border-white/15 bg-white/[0.03] px-3 py-1.5 text-xs text-gray-200">Cancel</button>
              <button
                onClick={() => {
                  const target = rows.find((row) => row.id === confirmDeleteId);
                  setConfirmDeleteId(null);
                  if (target) void deleteAffiliate(target);
                }}
                className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-100"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
