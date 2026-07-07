import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Copy,
  Download,
  ExternalLink,
  FileUp,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  ShieldAlert,
  Star,
  Trash2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

type SortKey = 'alphabetical' | 'most_clicked' | 'newest' | 'recently_edited' | 'highest_priority';
type FilterStatus = 'all' | 'active' | 'inactive';
type ViewTab = 'affiliates' | 'analytics' | 'opportunities' | 'settings';

type PlacementKey =
  | 'recommended_tools'
  | 'learn_articles'
  | 'scam_alerts'
  | 'airdrop_pages'
  | 'dashboard'
  | 'homepage'
  | 'footer'
  | 'future_blog_articles';

type Placements = Record<PlacementKey, boolean>;

interface AffiliateLinkRow {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  description: string | null;
  destination_url: string;
  disclosure_text: string | null;
  logo_url: string | null;
  affiliate_network: string | null;
  commission_rate: string | null;
  cookie_duration_days: number | null;
  payment_threshold: string | null;
  payment_method: string | null;
  notes: string | null;
  priority_order: number;
  tags: string[];
  is_featured: boolean;
  placements: Placements;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_click_at: string | null;
}

interface AffiliateClickRow {
  id: string;
  affiliate_link_id: string;
  slug: string;
  referrer: string | null;
  user_agent: string | null;
  ip_hash: string | null;
  created_at: string;
}

interface AffiliateOpportunity {
  id: string;
  partner: string;
  website: string | null;
  applied: boolean;
  application_date: string | null;
  status: string;
  commission: string | null;
  cookie_length: string | null;
  payment_threshold: string | null;
  payment_method: string | null;
  account_manager: string | null;
  notes: string | null;
  follow_up_reminder: string | null;
  created_at: string;
  updated_at: string;
}

interface AffiliateSettings {
  id: string;
  default_disclosure: string;
  default_placement: string;
  recommended_tools_enabled: boolean;
  click_tracking_enabled: boolean;
  analytics_retention_days: number;
}

interface AffiliateFormState {
  name: string;
  slug: string;
  category: string;
  description: string;
  destination_url: string;
  logo_url: string;
  disclosure_text: string;
  affiliate_network: string;
  commission_rate: string;
  cookie_duration_days: string;
  payment_threshold: string;
  payment_method: string;
  notes: string;
  priority_order: string;
  tags: string;
  is_active: boolean;
  is_featured: boolean;
  placements: Placements;
}

const DEFAULT_DISCLOSURE = 'Some links on this page are affiliate links. AirdropGuard may earn a commission at no extra cost to you. Our reviews, AI scores and human verification remain independent.';

const DEFAULT_PLACEMENTS: Placements = {
  recommended_tools: true,
  learn_articles: false,
  scam_alerts: false,
  airdrop_pages: false,
  dashboard: false,
  homepage: false,
  footer: false,
  future_blog_articles: false,
};

const BLANK_FORM: AffiliateFormState = {
  name: '',
  slug: '',
  category: '',
  description: '',
  destination_url: '',
  logo_url: '',
  disclosure_text: DEFAULT_DISCLOSURE,
  affiliate_network: '',
  commission_rate: '',
  cookie_duration_days: '',
  payment_threshold: '',
  payment_method: '',
  notes: '',
  priority_order: '100',
  tags: '',
  is_active: true,
  is_featured: false,
  placements: DEFAULT_PLACEMENTS,
};

const BLANK_OPPORTUNITY: Omit<AffiliateOpportunity, 'id' | 'created_at' | 'updated_at'> = {
  partner: '',
  website: null,
  applied: false,
  application_date: null,
  status: 'new',
  commission: null,
  cookie_length: null,
  payment_threshold: null,
  payment_method: null,
  account_manager: null,
  notes: null,
  follow_up_reminder: null,
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

function safeHost(): string {
  if (typeof window === 'undefined') return 'https://airdropguard.com';
  return window.location.origin;
}

function parseTags(input: string): string[] {
  return input
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.toLowerCase());
}

function boolString(v: boolean): string {
  return v ? 'true' : 'false';
}

function inferBrowser(userAgent: string | null): string {
  const ua = (userAgent || '').toLowerCase();
  if (!ua) return 'Unknown';
  if (ua.includes('edg')) return 'Edge';
  if (ua.includes('chrome')) return 'Chrome';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('opera') || ua.includes('opr/')) return 'Opera';
  return 'Other';
}

function inferDevice(userAgent: string | null): string {
  const ua = (userAgent || '').toLowerCase();
  if (!ua) return 'Unknown';
  if (ua.includes('mobile') || ua.includes('iphone') || ua.includes('android')) return 'Mobile';
  if (ua.includes('ipad') || ua.includes('tablet')) return 'Tablet';
  return 'Desktop';
}

function toCsv(rows: Array<Record<string, string | number | boolean | null>>): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const encoded = [headers.join(',')];
  rows.forEach((row) => {
    const values = headers.map((header) => {
      const raw = row[header];
      const value = raw === null || raw === undefined ? '' : String(raw);
      const escaped = value.replace(/"/g, '""');
      return `"${escaped}"`;
    });
    encoded.push(values.join(','));
  });
  return encoded.join('\n');
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = line[i + 1];
    if (ch === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  out.push(current);
  return out.map((part) => part.trim());
}

function downloadTextFile(content: string, fileName: string, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function ConfirmDialog({
  open,
  title,
  description,
  onCancel,
  onConfirm,
  danger,
}: {
  open: boolean;
  title: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
  danger?: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 px-4 py-8 backdrop-blur-sm">
      <div className="mx-auto max-w-md rounded-2xl border border-white/15 bg-dark-950/95 p-5">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm text-gray-300">{description}</p>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg border border-white/15 bg-white/[0.03] px-3 py-1.5 text-xs text-gray-200">Cancel</button>
          <button onClick={onConfirm} className={`rounded-lg border px-3 py-1.5 text-xs ${danger ? 'border-rose-400/30 bg-rose-500/10 text-rose-100' : 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100'}`}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

export function AffiliateHubSection({
  visible,
  showToast,
}: {
  visible: boolean;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}) {
  const [tab, setTab] = useState<ViewTab>('affiliates');
  const [rows, setRows] = useState<AffiliateLinkRow[]>([]);
  const [recentClicks, setRecentClicks] = useState<AffiliateClickRow[]>([]);
  const [opportunities, setOpportunities] = useState<AffiliateOpportunity[]>([]);
  const [settings, setSettings] = useState<AffiliateSettings | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AffiliateFormState>(BLANK_FORM);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [featuredFilter, setFeaturedFilter] = useState<'all' | 'featured' | 'not_featured'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [networkFilter, setNetworkFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortKey>('recently_edited');

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkCategory, setBulkCategory] = useState('');

  const [confirm, setConfirm] = useState<{ open: boolean; title: string; description: string; onConfirm: (() => void) | null; danger?: boolean }>({
    open: false,
    title: '',
    description: '',
    onConfirm: null,
    danger: false,
  });

  const [opportunityForm, setOpportunityForm] = useState(BLANK_OPPORTUNITY);

  const internalUrlForSlug = useCallback((slug: string) => `${safeHost()}/go/${slug}`, []);

  const fetchAffiliateData = useCallback(async () => {
    setLoading(true);
    try {
      const [linksRes, clicksRes, oppRes, settingsRes] = await Promise.all([
        supabase
          .from('affiliate_links')
          .select('id, name, slug, category, description, destination_url, disclosure_text, logo_url, affiliate_network, commission_rate, cookie_duration_days, payment_threshold, payment_method, notes, priority_order, tags, is_featured, placements, is_active, created_at, updated_at, last_click_at')
          .order('updated_at', { ascending: false }),
        supabase
          .from('affiliate_clicks')
          .select('id, affiliate_link_id, slug, referrer, user_agent, ip_hash, created_at')
          .order('created_at', { ascending: false })
          .limit(1000),
        supabase
          .from('affiliate_opportunities')
          .select('*')
          .order('updated_at', { ascending: false }),
        supabase
          .from('affiliate_settings')
          .select('id, default_disclosure, default_placement, recommended_tools_enabled, click_tracking_enabled, analytics_retention_days')
          .maybeSingle(),
      ]);

      if (linksRes.error) throw linksRes.error;
      if (clicksRes.error) throw clicksRes.error;
      if (oppRes.error) throw oppRes.error;
      if (settingsRes.error) throw settingsRes.error;

      const rawRows = (linksRes.data ?? []) as Array<AffiliateLinkRow & { placements: Placements | null; tags: string[] | null }>;
      const normalizedRows: AffiliateLinkRow[] = rawRows.map((row) => ({
        ...row,
        tags: row.tags ?? [],
        placements: { ...DEFAULT_PLACEMENTS, ...(row.placements ?? {}) },
      }));

      setRows(normalizedRows);
      setRecentClicks((clicksRes.data ?? []) as AffiliateClickRow[]);
      setOpportunities((oppRes.data ?? []) as AffiliateOpportunity[]);
      setSettings((settingsRes.data ?? null) as AffiliateSettings | null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load affiliate hub data.';
      showToast(message, 'error');
      setRows([]);
      setRecentClicks([]);
      setOpportunities([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!visible) return;
    void fetchAffiliateData();
  }, [visible, fetchAffiliateData]);

  const clickStatsById = useMemo(() => {
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);
    const startYesterday = new Date(startToday);
    startYesterday.setDate(startYesterday.getDate() - 1);
    const start7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const start30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const stats = new Map<string, { total: number; today: number; yesterday: number; d7: number; d30: number; lastClick: string | null }>();

    rows.forEach((row) => {
      stats.set(row.id, { total: 0, today: 0, yesterday: 0, d7: 0, d30: 0, lastClick: row.last_click_at });
    });

    recentClicks.forEach((click) => {
      const existing = stats.get(click.affiliate_link_id) ?? { total: 0, today: 0, yesterday: 0, d7: 0, d30: 0, lastClick: null };
      const at = new Date(click.created_at);
      existing.total += 1;
      if (at >= startToday) existing.today += 1;
      if (at >= startYesterday && at < startToday) existing.yesterday += 1;
      if (at >= start7d) existing.d7 += 1;
      if (at >= start30d) existing.d30 += 1;
      if (!existing.lastClick || at > new Date(existing.lastClick)) existing.lastClick = click.created_at;
      stats.set(click.affiliate_link_id, existing);
    });

    return stats;
  }, [rows, recentClicks]);

  const trend30d = useMemo(() => {
    const dayMap = new Map<string, number>();
    for (let i = 29; i >= 0; i -= 1) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      dayMap.set(d, 0);
    }
    recentClicks.forEach((click) => {
      const day = click.created_at.slice(0, 10);
      if (dayMap.has(day)) dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
    });
    return Array.from(dayMap.entries()).map(([day, count]) => ({ day, count }));
  }, [recentClicks]);

  const topReferrers = useMemo(() => {
    const map = new Map<string, number>();
    recentClicks.forEach((click) => {
      const key = click.referrer ? click.referrer.split('/').slice(0, 3).join('/') : 'Direct';
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [recentClicks]);

  const topBrowsers = useMemo(() => {
    const map = new Map<string, number>();
    recentClicks.forEach((click) => {
      const key = inferBrowser(click.user_agent);
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [recentClicks]);

  const topDevices = useMemo(() => {
    const map = new Map<string, number>();
    recentClicks.forEach((click) => {
      const key = inferDevice(click.user_agent);
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [recentClicks]);

  const totalAnalytics = useMemo(() => {
    let total = 0;
    let today = 0;
    let yesterday = 0;
    let d7 = 0;
    let d30 = 0;
    let bestPartner = 'N/A';
    let bestClicks = -1;

    rows.forEach((row) => {
      const stat = clickStatsById.get(row.id) ?? { total: 0, today: 0, yesterday: 0, d7: 0, d30: 0, lastClick: null };
      total += stat.total;
      today += stat.today;
      yesterday += stat.yesterday;
      d7 += stat.d7;
      d30 += stat.d30;
      if (stat.d30 > bestClicks) {
        bestClicks = stat.d30;
        bestPartner = row.name;
      }
    });

    return {
      total,
      today,
      yesterday,
      d7,
      d30,
      bestPartner,
      estimatedCtr: 'TBD',
      estimatedRevenue: 'Manual',
    };
  }, [rows, clickStatsById]);

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const out = rows.filter((row) => {
      const tagsJoined = row.tags.join(',');
      const text = `${row.name} ${row.slug} ${row.category || ''} ${row.affiliate_network || ''} ${tagsJoined}`.toLowerCase();
      if (needle && !text.includes(needle)) return false;
      if (statusFilter === 'active' && !row.is_active) return false;
      if (statusFilter === 'inactive' && row.is_active) return false;
      if (featuredFilter === 'featured' && !row.is_featured) return false;
      if (featuredFilter === 'not_featured' && row.is_featured) return false;
      if (categoryFilter !== 'all' && (row.category || 'Uncategorized') !== categoryFilter) return false;
      if (networkFilter !== 'all' && (row.affiliate_network || 'Unknown') !== networkFilter) return false;
      return true;
    });

    const score = (row: AffiliateLinkRow) => clickStatsById.get(row.id)?.d30 ?? 0;

    out.sort((a, b) => {
      if (sortBy === 'alphabetical') return a.name.localeCompare(b.name);
      if (sortBy === 'most_clicked') return score(b) - score(a);
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'recently_edited') return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      return a.priority_order - b.priority_order;
    });

    return out;
  }, [rows, search, statusFilter, featuredFilter, categoryFilter, networkFilter, sortBy, clickStatsById]);

  const maxTrend = useMemo(() => Math.max(1, ...trend30d.map((p) => p.count)), [trend30d]);

  const categoryOptions = useMemo(() => Array.from(new Set(rows.map((row) => row.category || 'Uncategorized'))).sort(), [rows]);
  const networkOptions = useMemo(() => Array.from(new Set(rows.map((row) => row.affiliate_network || 'Unknown'))).sort(), [rows]);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setForm({ ...BLANK_FORM, disclosure_text: settings?.default_disclosure || DEFAULT_DISCLOSURE });
  }, [settings?.default_disclosure]);

  const startEdit = useCallback((row: AffiliateLinkRow) => {
    setEditingId(row.id);
    setForm({
      name: row.name,
      slug: row.slug,
      category: row.category || '',
      description: row.description || '',
      destination_url: row.destination_url,
      logo_url: row.logo_url || '',
      disclosure_text: row.disclosure_text || settings?.default_disclosure || DEFAULT_DISCLOSURE,
      affiliate_network: row.affiliate_network || '',
      commission_rate: row.commission_rate || '',
      cookie_duration_days: row.cookie_duration_days ? String(row.cookie_duration_days) : '',
      payment_threshold: row.payment_threshold || '',
      payment_method: row.payment_method || '',
      notes: row.notes || '',
      priority_order: String(row.priority_order),
      tags: row.tags.join(', '),
      is_active: row.is_active,
      is_featured: row.is_featured,
      placements: { ...DEFAULT_PLACEMENTS, ...row.placements },
    });
  }, [settings?.default_disclosure]);

  const saveAffiliateLink = useCallback(async () => {
    const slug = normalizeSlug(form.slug);
    const destination = form.destination_url.trim();

    if (!form.name.trim()) return showToast('Partner name is required.', 'error');
    if (!slug) return showToast('Slug is required.', 'error');
    if (!/^https?:\/\//i.test(destination)) return showToast('Destination URL must start with http:// or https://', 'error');
    if (form.is_active && !destination) return showToast('Cannot enable an affiliate without destination URL.', 'error');

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        slug,
        category: form.category.trim() || null,
        description: form.description.trim() || null,
        destination_url: destination,
        logo_url: form.logo_url.trim() || null,
        disclosure_text: form.disclosure_text.trim() || null,
        affiliate_network: form.affiliate_network.trim() || null,
        commission_rate: form.commission_rate.trim() || null,
        cookie_duration_days: form.cookie_duration_days ? Number(form.cookie_duration_days) : null,
        payment_threshold: form.payment_threshold.trim() || null,
        payment_method: form.payment_method.trim() || null,
        notes: form.notes.trim() || null,
        priority_order: Number(form.priority_order || '100'),
        tags: parseTags(form.tags),
        is_active: form.is_active,
        is_featured: form.is_featured,
        placements: form.placements,
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
      const message = error instanceof Error ? error.message : 'Save failed.';
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  }, [editingId, fetchAffiliateData, form, resetForm, showToast]);

  const toggleActive = useCallback(async (row: AffiliateLinkRow) => {
    if (!row.destination_url) return showToast('Cannot enable affiliate without destination URL.', 'error');
    const { error } = await supabase.from('affiliate_links').update({ is_active: !row.is_active }).eq('id', row.id);
    if (error) return showToast(error.message, 'error');
    showToast(`${row.name} ${row.is_active ? 'disabled' : 'enabled'}.`);
    await fetchAffiliateData();
  }, [fetchAffiliateData, showToast]);

  const toggleFeatured = useCallback(async (row: AffiliateLinkRow) => {
    const { error } = await supabase.from('affiliate_links').update({ is_featured: !row.is_featured }).eq('id', row.id);
    if (error) return showToast(error.message, 'error');
    showToast(`${row.name} ${row.is_featured ? 'unfeatured' : 'featured'}.`);
    await fetchAffiliateData();
  }, [fetchAffiliateData, showToast]);

  const deleteAffiliate = useCallback(async (row: AffiliateLinkRow) => {
    const { error } = await supabase.from('affiliate_links').delete().eq('id', row.id);
    if (error) return showToast(error.message, 'error');
    showToast(`${row.name} deleted.`);
    await fetchAffiliateData();
  }, [fetchAffiliateData, showToast]);

  const duplicateAffiliate = useCallback(async (row: AffiliateLinkRow) => {
    const baseSlug = `${row.slug}-copy`;
    const payload = {
      name: `${row.name} Copy`,
      slug: normalizeSlug(`${baseSlug}-${Date.now().toString().slice(-5)}`),
      category: row.category,
      description: row.description,
      destination_url: row.destination_url,
      logo_url: row.logo_url,
      disclosure_text: row.disclosure_text,
      affiliate_network: row.affiliate_network,
      commission_rate: row.commission_rate,
      cookie_duration_days: row.cookie_duration_days,
      payment_threshold: row.payment_threshold,
      payment_method: row.payment_method,
      notes: row.notes,
      priority_order: row.priority_order,
      tags: row.tags,
      is_active: false,
      is_featured: false,
      placements: row.placements,
    };

    const { error } = await supabase.from('affiliate_links').insert(payload);
    if (error) return showToast(error.message, 'error');
    showToast(`${row.name} duplicated as draft.`);
    await fetchAffiliateData();
  }, [fetchAffiliateData, showToast]);

  const copyInternalUrl = useCallback(async (slug: string) => {
    try {
      await navigator.clipboard.writeText(internalUrlForSlug(slug));
      showToast('Internal URL copied.');
    } catch {
      showToast('Copy failed.', 'error');
    }
  }, [internalUrlForSlug, showToast]);

  const selectAllVisible = useCallback(() => {
    if (selectedIds.length === filteredRows.length && filteredRows.length > 0) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(filteredRows.map((row) => row.id));
  }, [filteredRows, selectedIds.length]);

  const runBulk = useCallback(async (action: 'enable' | 'disable' | 'delete' | 'feature' | 'unfeature' | 'change_category') => {
    if (selectedIds.length === 0) return showToast('Select at least one affiliate first.', 'error');

    if (action === 'delete') {
      setConfirm({
        open: true,
        title: 'Delete selected affiliates?',
        description: `This will permanently delete ${selectedIds.length} affiliate item(s).`,
        danger: true,
        onConfirm: async () => {
          setConfirm((prev) => ({ ...prev, open: false }));
          const { error } = await supabase.from('affiliate_links').delete().in('id', selectedIds);
          if (error) return showToast(error.message, 'error');
          showToast('Selected affiliates deleted.');
          setSelectedIds([]);
          await fetchAffiliateData();
        },
      });
      return;
    }

    if (action === 'change_category' && !bulkCategory.trim()) {
      return showToast('Provide a bulk category first.', 'error');
    }

    const patch = action === 'enable'
      ? { is_active: true }
      : action === 'disable'
      ? { is_active: false }
      : action === 'feature'
      ? { is_featured: true }
      : action === 'unfeature'
      ? { is_featured: false }
      : { category: bulkCategory.trim() };

    const { error } = await supabase.from('affiliate_links').update(patch).in('id', selectedIds);
    if (error) return showToast(error.message, 'error');

    showToast('Bulk action applied.');
    await fetchAffiliateData();
  }, [bulkCategory, fetchAffiliateData, selectedIds, showToast]);

  const exportCsv = useCallback((selectedOnly: boolean) => {
    const source = selectedOnly ? rows.filter((row) => selectedIds.includes(row.id)) : rows;
    const content = toCsv(source.map((row) => {
      const metrics = clickStatsById.get(row.id) ?? { total: 0, today: 0, yesterday: 0, d7: 0, d30: 0, lastClick: null };
      return {
        name: row.name,
        slug: row.slug,
        category: row.category,
        destination_url: row.destination_url,
        affiliate_network: row.affiliate_network,
        commission_rate: row.commission_rate,
        priority_order: row.priority_order,
        tags: row.tags.join('|'),
        is_active: boolString(row.is_active),
        is_featured: boolString(row.is_featured),
        clicks_total: metrics.total,
        clicks_today: metrics.today,
        clicks_30d: metrics.d30,
      };
    }));

    downloadTextFile(content, `affiliate-export-${selectedOnly ? 'selected' : 'all'}.csv`, 'text/csv;charset=utf-8');
  }, [rows, selectedIds, clickStatsById]);

  const downloadTemplate = useCallback(() => {
    const template = toCsv([
      {
        name: 'Ledger',
        slug: 'ledger',
        category: 'Hardware Wallet',
        description: 'Security hardware wallet',
        destination_url: 'https://example.com/affiliate-url',
        affiliate_network: 'In-house',
        commission_rate: '5%',
        cookie_duration_days: '30',
        payment_threshold: '$50',
        payment_method: 'Bank Transfer',
        priority_order: '10',
        tags: 'wallet,security',
        is_active: 'false',
        is_featured: 'false',
      },
    ] as Array<Record<string, string>>);
    downloadTextFile(template, 'affiliate-import-template.csv', 'text/csv;charset=utf-8');
  }, []);

  const importCsv = useCallback(async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) return showToast('CSV is empty.', 'error');

    const headers = parseCsvLine(lines[0]);
    const required = ['name', 'slug', 'destination_url'];
    const missing = required.filter((col) => !headers.includes(col));
    if (missing.length > 0) return showToast(`Missing required column(s): ${missing.join(', ')}`, 'error');

    const items: Array<Record<string, string>> = [];
    for (let i = 1; i < lines.length; i += 1) {
      const values = parseCsvLine(lines[i]);
      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      if (!row.name || !row.slug || !row.destination_url) continue;
      items.push(row);
    }

    if (items.length === 0) return showToast('No valid rows found in CSV.', 'error');

    const payload = items.map((item) => ({
      name: item.name.trim(),
      slug: normalizeSlug(item.slug),
      category: item.category?.trim() || null,
      description: item.description?.trim() || null,
      destination_url: item.destination_url.trim(),
      affiliate_network: item.affiliate_network?.trim() || null,
      commission_rate: item.commission_rate?.trim() || null,
      cookie_duration_days: item.cookie_duration_days ? Number(item.cookie_duration_days) : null,
      payment_threshold: item.payment_threshold?.trim() || null,
      payment_method: item.payment_method?.trim() || null,
      priority_order: item.priority_order ? Number(item.priority_order) : 100,
      tags: item.tags ? item.tags.split('|').map((x) => x.trim().toLowerCase()).filter(Boolean) : [],
      is_active: item.is_active?.toLowerCase() === 'true',
      is_featured: item.is_featured?.toLowerCase() === 'true',
      disclosure_text: settings?.default_disclosure || DEFAULT_DISCLOSURE,
      placements: DEFAULT_PLACEMENTS,
    }));

    const { error } = await supabase.from('affiliate_links').upsert(payload, { onConflict: 'slug' });
    if (error) return showToast(error.message, 'error');

    showToast(`Imported ${payload.length} affiliate row(s).`);
    await fetchAffiliateData();
  }, [fetchAffiliateData, settings?.default_disclosure, showToast]);

  const saveSettings = useCallback(async () => {
    if (!settings) return;
    const { error } = await supabase
      .from('affiliate_settings')
      .update({
        default_disclosure: settings.default_disclosure,
        default_placement: settings.default_placement,
        recommended_tools_enabled: settings.recommended_tools_enabled,
        click_tracking_enabled: settings.click_tracking_enabled,
        analytics_retention_days: settings.analytics_retention_days,
      })
      .eq('id', settings.id);

    if (error) return showToast(error.message, 'error');
    showToast('Affiliate settings saved.');
  }, [settings, showToast]);

  const createOpportunity = useCallback(async () => {
    if (!opportunityForm.partner.trim()) return showToast('Partner is required.', 'error');

    const payload = {
      ...opportunityForm,
      partner: opportunityForm.partner.trim(),
      website: opportunityForm.website?.trim() || null,
      commission: opportunityForm.commission?.trim() || null,
      cookie_length: opportunityForm.cookie_length?.trim() || null,
      payment_threshold: opportunityForm.payment_threshold?.trim() || null,
      payment_method: opportunityForm.payment_method?.trim() || null,
      account_manager: opportunityForm.account_manager?.trim() || null,
      notes: opportunityForm.notes?.trim() || null,
    };

    const { error } = await supabase.from('affiliate_opportunities').insert(payload);
    if (error) return showToast(error.message, 'error');

    setOpportunityForm(BLANK_OPPORTUNITY);
    showToast('Affiliate opportunity added.');
    await fetchAffiliateData();
  }, [fetchAffiliateData, opportunityForm, showToast]);

  const deleteOpportunity = useCallback(async (opportunity: AffiliateOpportunity) => {
    const { error } = await supabase.from('affiliate_opportunities').delete().eq('id', opportunity.id);
    if (error) return showToast(error.message, 'error');
    showToast('Opportunity deleted.');
    await fetchAffiliateData();
  }, [fetchAffiliateData, showToast]);

  if (!visible) return null;

  return (
    <section id="admin-affiliate-hub" className="space-y-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-emerald-200">Affiliate Hub</h2>
          <p className="mt-1 text-xs text-gray-300">Premium affiliate operations: links, analytics, bulk actions, opportunities and settings.</p>
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

      <div className="flex flex-wrap gap-2">
        {([
          { id: 'affiliates', label: 'Affiliates' },
          { id: 'analytics', label: 'Analytics' },
          { id: 'opportunities', label: 'Opportunities' },
          { id: 'settings', label: 'Settings' },
        ] as Array<{ id: ViewTab; label: string }>).map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`rounded-lg border px-3 py-1.5 text-xs ${tab === item.id ? 'border-emerald-400/40 bg-emerald-500/14 text-emerald-100' : 'border-white/15 bg-white/[0.03] text-gray-300 hover:text-white'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'affiliates' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            <div className="rounded-xl border border-white/10 bg-dark-900/50 px-3 py-2"><p className="text-[10px] text-gray-500">Total affiliates</p><p className="text-sm font-semibold text-white">{rows.length}</p></div>
            <div className="rounded-xl border border-white/10 bg-dark-900/50 px-3 py-2"><p className="text-[10px] text-gray-500">Active</p><p className="text-sm font-semibold text-white">{rows.filter((r) => r.is_active).length}</p></div>
            <div className="rounded-xl border border-white/10 bg-dark-900/50 px-3 py-2"><p className="text-[10px] text-gray-500">Featured</p><p className="text-sm font-semibold text-white">{rows.filter((r) => r.is_featured).length}</p></div>
            <div className="rounded-xl border border-white/10 bg-dark-900/50 px-3 py-2"><p className="text-[10px] text-gray-500">Clicks Today</p><p className="text-sm font-semibold text-white">{totalAnalytics.today}</p></div>
            <div className="rounded-xl border border-white/10 bg-dark-900/50 px-3 py-2"><p className="text-[10px] text-gray-500">Clicks 30d</p><p className="text-sm font-semibold text-white">{totalAnalytics.d30}</p></div>
          </div>

          <div className="rounded-xl border border-white/10 bg-dark-900/45 p-3 space-y-3">
            <p className="text-[11px] uppercase tracking-[0.1em] text-emerald-200">Add or Edit Affiliate</p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Partner name" className="rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white" />
              <input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: normalizeSlug(e.target.value) }))} placeholder="slug" className="rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white" />
              <input value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} placeholder="Category" className="rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white" />
              <input value={form.destination_url} onChange={(e) => setForm((p) => ({ ...p, destination_url: e.target.value }))} placeholder="Destination URL" className="rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white" />
              <input value={form.logo_url} onChange={(e) => setForm((p) => ({ ...p, logo_url: e.target.value }))} placeholder="Logo URL" className="rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white" />
              <input value={form.affiliate_network} onChange={(e) => setForm((p) => ({ ...p, affiliate_network: e.target.value }))} placeholder="Affiliate network" className="rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white" />
              <input value={form.commission_rate} onChange={(e) => setForm((p) => ({ ...p, commission_rate: e.target.value }))} placeholder="Commission rate" className="rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white" />
              <input value={form.cookie_duration_days} onChange={(e) => setForm((p) => ({ ...p, cookie_duration_days: e.target.value }))} placeholder="Cookie duration days" className="rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white" />
              <input value={form.payment_threshold} onChange={(e) => setForm((p) => ({ ...p, payment_threshold: e.target.value }))} placeholder="Payment threshold" className="rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white" />
              <input value={form.payment_method} onChange={(e) => setForm((p) => ({ ...p, payment_method: e.target.value }))} placeholder="Payment method" className="rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white" />
              <input value={form.priority_order} onChange={(e) => setForm((p) => ({ ...p, priority_order: e.target.value }))} placeholder="Priority order" className="rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white" />
              <input value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} placeholder="Tags (comma separated)" className="rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white" />
            </div>

            <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Description" rows={2} className="w-full rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white" />
            <textarea value={form.disclosure_text} onChange={(e) => setForm((p) => ({ ...p, disclosure_text: e.target.value }))} placeholder="Disclosure text" rows={2} className="w-full rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white" />
            <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Internal notes" rows={2} className="w-full rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white" />

            <div className="rounded-lg border border-white/10 bg-dark-900/60 p-2">
              <p className="text-[11px] text-gray-300">Placement manager</p>
              <div className="mt-1 grid grid-cols-2 gap-1 text-[11px] text-gray-300 md:grid-cols-4">
                {(Object.keys(DEFAULT_PLACEMENTS) as PlacementKey[]).map((key) => (
                  <label key={key} className="inline-flex items-center gap-1.5">
                    <input type="checkbox" checked={form.placements[key]} onChange={(e) => setForm((prev) => ({ ...prev, placements: { ...prev.placements, [key]: e.target.checked } }))} className="h-3.5 w-3.5" />
                    {key.replace(/_/g, ' ')}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3 text-xs text-gray-200">
                <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))} className="h-3.5 w-3.5" />Active</label>
                <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={form.is_featured} onChange={(e) => setForm((p) => ({ ...p, is_featured: e.target.checked }))} className="h-3.5 w-3.5" />Featured</label>
              </div>
              <div className="flex flex-wrap gap-2">
                {editingId ? <button onClick={resetForm} className="rounded-lg border border-white/15 bg-white/[0.03] px-3 py-1.5 text-xs text-gray-200">Cancel edit</button> : null}
                <button onClick={() => void saveAffiliateLink()} disabled={saving} className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-500/12 px-3 py-1.5 text-xs text-emerald-100 disabled:opacity-60">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editingId ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  {editingId ? 'Save changes' : 'Add affiliate'}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-dark-900/45 p-3 space-y-3">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-6">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search partner, slug, category, network, tags" className="rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white xl:col-span-2" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as FilterStatus)} className="rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white">
                <option value="all">All status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <select value={featuredFilter} onChange={(e) => setFeaturedFilter(e.target.value as 'all' | 'featured' | 'not_featured')} className="rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white">
                <option value="all">All featured</option>
                <option value="featured">Featured</option>
                <option value="not_featured">Not featured</option>
              </select>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white">
                <option value="all">All categories</option>
                {categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
              <select value={networkFilter} onChange={(e) => setNetworkFilter(e.target.value)} className="rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white">
                <option value="all">All networks</option>
                {networkOptions.map((network) => <option key={network} value={network}>{network}</option>)}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} className="rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white">
                <option value="alphabetical">Alphabetical</option>
                <option value="most_clicked">Most clicked (30d)</option>
                <option value="newest">Newest</option>
                <option value="recently_edited">Recently edited</option>
                <option value="highest_priority">Highest priority</option>
              </select>

              <button onClick={selectAllVisible} className="rounded-lg border border-white/15 bg-white/[0.03] px-3 py-1.5 text-xs text-gray-200">{selectedIds.length > 0 ? 'Clear selection' : 'Select visible'}</button>
              <button onClick={() => runBulk('enable')} className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-100">Bulk enable</button>
              <button onClick={() => runBulk('disable')} className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-100">Bulk disable</button>
              <button onClick={() => runBulk('feature')} className="rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-100">Feature</button>
              <button onClick={() => runBulk('unfeature')} className="rounded-lg border border-sky-500/25 bg-sky-500/10 px-3 py-1.5 text-xs text-sky-100">Unfeature</button>
              <input value={bulkCategory} onChange={(e) => setBulkCategory(e.target.value)} placeholder="Bulk category" className="rounded-lg border border-white/10 bg-dark-900/60 px-3 py-1.5 text-xs text-white" />
              <button onClick={() => runBulk('change_category')} className="rounded-lg border border-violet-500/25 bg-violet-500/10 px-3 py-1.5 text-xs text-violet-100">Change category</button>
              <button onClick={() => runBulk('delete')} className="inline-flex items-center gap-1 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-100"><Trash2 className="h-3.5 w-3.5" />Delete</button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => exportCsv(false)} className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/[0.03] px-3 py-1.5 text-xs text-gray-200"><Download className="h-3.5 w-3.5" />Export CSV</button>
              <button onClick={() => exportCsv(true)} className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/[0.03] px-3 py-1.5 text-xs text-gray-200"><Download className="h-3.5 w-3.5" />Export Selected</button>
              <button onClick={downloadTemplate} className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/[0.03] px-3 py-1.5 text-xs text-gray-200"><Download className="h-3.5 w-3.5" />Template</button>
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-white/15 bg-white/[0.03] px-3 py-1.5 text-xs text-gray-200">
                <FileUp className="h-3.5 w-3.5" />
                Import CSV
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void importCsv(file);
                    e.currentTarget.value = '';
                  }}
                />
              </label>
            </div>
          </div>

          {filteredRows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/20 bg-dark-900/35 p-5 text-sm text-gray-400">No affiliates match your search/filter criteria.</div>
          ) : (
            <>
              <div className="hidden overflow-x-auto rounded-xl border border-white/10 bg-dark-900/45 lg:block">
                <table className="min-w-[1400px] w-full text-left text-xs">
                  <thead className="bg-dark-900/70 text-gray-300">
                    <tr>
                      <th className="px-3 py-2">Select</th>
                      <th className="px-3 py-2">Logo</th>
                      <th className="px-3 py-2">Partner</th>
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Featured</th>
                      <th className="px-3 py-2">Slug</th>
                      <th className="px-3 py-2">Internal URL</th>
                      <th className="px-3 py-2">Lifetime</th>
                      <th className="px-3 py-2">Today</th>
                      <th className="px-3 py-2">Yesterday</th>
                      <th className="px-3 py-2">7 Days</th>
                      <th className="px-3 py-2">30 Days</th>
                      <th className="px-3 py-2">Last Click</th>
                      <th className="px-3 py-2">Priority</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => {
                      const metric = clickStatsById.get(row.id) ?? { total: 0, today: 0, yesterday: 0, d7: 0, d30: 0, lastClick: null };
                      return (
                        <tr key={row.id} className="border-t border-white/10 text-gray-200">
                          <td className="px-3 py-2"><input type="checkbox" checked={selectedIds.includes(row.id)} onChange={(e) => setSelectedIds((prev) => e.target.checked ? [...prev, row.id] : prev.filter((id) => id !== row.id))} className="h-3.5 w-3.5" /></td>
                          <td className="px-3 py-2">{row.logo_url ? <img src={row.logo_url} alt={row.name} className="h-7 w-7 rounded-md object-cover" /> : <span className="text-[10px] text-gray-500">No logo</span>}</td>
                          <td className="px-3 py-2 font-medium">{row.name}</td>
                          <td className="px-3 py-2"><span className="rounded-full border border-white/15 bg-white/[0.03] px-2 py-0.5 text-[10px]">{row.category || 'Uncategorized'}</span></td>
                          <td className="px-3 py-2"><span className={`rounded-full border px-2 py-0.5 text-[10px] ${row.is_active ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-amber-500/30 bg-amber-500/10 text-amber-200'}`}>{row.is_active ? 'Active' : 'Inactive'}</span></td>
                          <td className="px-3 py-2"><span className={`rounded-full border px-2 py-0.5 text-[10px] ${row.is_featured ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200' : 'border-white/15 bg-white/[0.03] text-gray-400'}`}>{row.is_featured ? 'Featured' : 'No'}</span></td>
                          <td className="px-3 py-2">{row.slug}</td>
                          <td className="px-3 py-2 text-cyan-200">{internalUrlForSlug(row.slug)}</td>
                          <td className="px-3 py-2 tabular-nums">{metric.total}</td>
                          <td className="px-3 py-2 tabular-nums">{metric.today}</td>
                          <td className="px-3 py-2 tabular-nums">{metric.yesterday}</td>
                          <td className="px-3 py-2 tabular-nums">{metric.d7}</td>
                          <td className="px-3 py-2 tabular-nums">{metric.d30}</td>
                          <td className="px-3 py-2 text-gray-400">{metric.lastClick ? new Date(metric.lastClick).toLocaleString() : '-'}</td>
                          <td className="px-3 py-2 tabular-nums">{row.priority_order}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-1.5">
                              <button onClick={() => startEdit(row)} className="rounded-lg border border-sky-500/25 bg-sky-500/10 px-2 py-1 text-[11px] text-sky-200">Edit</button>
                              <button onClick={() => void toggleActive(row)} className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-100">{row.is_active ? 'Disable' : 'Enable'}</button>
                              <button onClick={() => void toggleFeatured(row)} className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-2 py-1 text-[11px] text-cyan-100"><Star className="h-3 w-3" />{row.is_featured ? 'Unfeature' : 'Feature'}</button>
                              <button onClick={() => void copyInternalUrl(row.slug)} className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/[0.03] px-2 py-1 text-[11px] text-gray-200"><Copy className="h-3 w-3" />Copy</button>
                              <button onClick={() => window.open(row.destination_url, '_blank', 'noopener,noreferrer')} className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/[0.03] px-2 py-1 text-[11px] text-gray-200"><ExternalLink className="h-3 w-3" />Open</button>
                              <button onClick={() => void duplicateAffiliate(row)} className="rounded-lg border border-violet-500/25 bg-violet-500/10 px-2 py-1 text-[11px] text-violet-100">Duplicate</button>
                              <button onClick={() => setConfirm({ open: true, title: `Delete ${row.name}?`, description: 'This action cannot be undone.', danger: true, onConfirm: () => { setConfirm((prev) => ({ ...prev, open: false })); void deleteAffiliate(row); } })} className="inline-flex items-center gap-1 rounded-lg border border-rose-500/25 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-100"><Trash2 className="h-3 w-3" />Delete</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:hidden">
                {filteredRows.map((row) => {
                  const metric = clickStatsById.get(row.id) ?? { total: 0, today: 0, yesterday: 0, d7: 0, d30: 0, lastClick: null };
                  return (
                    <article key={`mobile-${row.id}`} className="rounded-xl border border-white/10 bg-dark-900/50 p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{row.name}</p>
                          <p className="text-[11px] text-gray-400">/{row.slug}</p>
                        </div>
                        <div className="flex gap-1">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] ${row.is_active ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-amber-500/30 bg-amber-500/10 text-amber-200'}`}>{row.is_active ? 'Active' : 'Inactive'}</span>
                          {row.is_featured ? <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-100">Featured</span> : null}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[11px]">
                        <div className="rounded-lg border border-white/10 bg-dark-900/60 p-2"><p className="text-gray-500">Total</p><p className="text-white tabular-nums">{metric.total}</p></div>
                        <div className="rounded-lg border border-white/10 bg-dark-900/60 p-2"><p className="text-gray-500">Today</p><p className="text-white tabular-nums">{metric.today}</p></div>
                        <div className="rounded-lg border border-white/10 bg-dark-900/60 p-2"><p className="text-gray-500">30d</p><p className="text-white tabular-nums">{metric.d30}</p></div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <button onClick={() => startEdit(row)} className="rounded-lg border border-sky-500/25 bg-sky-500/10 px-2 py-1 text-[11px] text-sky-200">Edit</button>
                        <button onClick={() => void toggleActive(row)} className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-100">{row.is_active ? 'Disable' : 'Enable'}</button>
                        <button onClick={() => void copyInternalUrl(row.slug)} className="rounded-lg border border-white/15 bg-white/[0.03] px-2 py-1 text-[11px] text-gray-200">Copy URL</button>
                        <button onClick={() => window.open(row.destination_url, '_blank', 'noopener,noreferrer')} className="rounded-lg border border-white/15 bg-white/[0.03] px-2 py-1 text-[11px] text-gray-200">Open</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </div>
      ) : null}

      {tab === 'analytics' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
            <div className="rounded-xl border border-white/10 bg-dark-900/50 px-3 py-2"><p className="text-[10px] text-gray-500">Total Clicks</p><p className="text-sm font-semibold text-white tabular-nums">{totalAnalytics.total}</p></div>
            <div className="rounded-xl border border-white/10 bg-dark-900/50 px-3 py-2"><p className="text-[10px] text-gray-500">Today</p><p className="text-sm font-semibold text-white tabular-nums">{totalAnalytics.today}</p></div>
            <div className="rounded-xl border border-white/10 bg-dark-900/50 px-3 py-2"><p className="text-[10px] text-gray-500">Yesterday</p><p className="text-sm font-semibold text-white tabular-nums">{totalAnalytics.yesterday}</p></div>
            <div className="rounded-xl border border-white/10 bg-dark-900/50 px-3 py-2"><p className="text-[10px] text-gray-500">Last 7 Days</p><p className="text-sm font-semibold text-white tabular-nums">{totalAnalytics.d7}</p></div>
            <div className="rounded-xl border border-white/10 bg-dark-900/50 px-3 py-2"><p className="text-[10px] text-gray-500">Last 30 Days</p><p className="text-sm font-semibold text-white tabular-nums">{totalAnalytics.d30}</p></div>
            <div className="rounded-xl border border-white/10 bg-dark-900/50 px-3 py-2"><p className="text-[10px] text-gray-500">Top Partner</p><p className="text-sm font-semibold text-white">{totalAnalytics.bestPartner}</p></div>
            <div className="rounded-xl border border-white/10 bg-dark-900/50 px-3 py-2"><p className="text-[10px] text-gray-500">Estimated CTR</p><p className="text-sm font-semibold text-white">{totalAnalytics.estimatedCtr}</p></div>
            <div className="rounded-xl border border-white/10 bg-dark-900/50 px-3 py-2"><p className="text-[10px] text-gray-500">Estimated Revenue</p><p className="text-sm font-semibold text-white">{totalAnalytics.estimatedRevenue}</p></div>
          </div>

          <div className="rounded-xl border border-white/10 bg-dark-900/45 p-3">
            <p className="text-[11px] uppercase tracking-[0.1em] text-emerald-200">30 Day Trend</p>
            <div className="mt-2 flex h-24 items-end gap-1">
              {trend30d.map((point) => (
                <div key={point.day} className="group relative flex-1">
                  <div className="rounded-t bg-emerald-400/70" style={{ height: `${Math.max(4, (point.count / maxTrend) * 100)}%` }} />
                  <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 rounded bg-dark-950 px-1.5 py-0.5 text-[10px] text-gray-200 group-hover:block">{point.day.slice(5)}: {point.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-dark-900/45 p-3">
              <p className="text-[11px] uppercase tracking-[0.1em] text-emerald-200">Top Referrers</p>
              <div className="mt-2 space-y-1 text-xs text-gray-200">
                {topReferrers.length === 0 ? <p className="text-gray-500">No data yet.</p> : topReferrers.map(([name, count]) => <p key={name}>{name} <span className="text-gray-500">({count})</span></p>)}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-dark-900/45 p-3">
              <p className="text-[11px] uppercase tracking-[0.1em] text-emerald-200">Top Browsers</p>
              <div className="mt-2 space-y-1 text-xs text-gray-200">
                {topBrowsers.length === 0 ? <p className="text-gray-500">No data yet.</p> : topBrowsers.map(([name, count]) => <p key={name}>{name} <span className="text-gray-500">({count})</span></p>)}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-dark-900/45 p-3">
              <p className="text-[11px] uppercase tracking-[0.1em] text-emerald-200">Top Devices</p>
              <div className="mt-2 space-y-1 text-xs text-gray-200">
                {topDevices.length === 0 ? <p className="text-gray-500">No data yet.</p> : topDevices.map(([name, count]) => <p key={name}>{name} <span className="text-gray-500">({count})</span></p>)}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-dark-900/45 p-3">
            <p className="text-[11px] uppercase tracking-[0.1em] text-emerald-200">Recent Clicks</p>
            <div className="mt-2 overflow-x-auto">
              <table className="min-w-[860px] w-full text-left text-xs">
                <thead className="text-gray-300">
                  <tr>
                    <th className="px-2 py-1.5">Time</th>
                    <th className="px-2 py-1.5">Partner</th>
                    <th className="px-2 py-1.5">Slug</th>
                    <th className="px-2 py-1.5">Referrer</th>
                    <th className="px-2 py-1.5">Browser</th>
                    <th className="px-2 py-1.5">Device</th>
                    <th className="px-2 py-1.5">IP Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {recentClicks.slice(0, 60).map((click) => {
                    const partner = rows.find((row) => row.id === click.affiliate_link_id)?.name ?? '-';
                    return (
                      <tr key={click.id} className="border-t border-white/10 text-gray-200">
                        <td className="px-2 py-1.5">{new Date(click.created_at).toLocaleString()}</td>
                        <td className="px-2 py-1.5">{partner}</td>
                        <td className="px-2 py-1.5">{click.slug}</td>
                        <td className="px-2 py-1.5 text-gray-400">{click.referrer ? click.referrer.slice(0, 64) : 'Direct'}</td>
                        <td className="px-2 py-1.5">{inferBrowser(click.user_agent)}</td>
                        <td className="px-2 py-1.5">{inferDevice(click.user_agent)}</td>
                        <td className="px-2 py-1.5 text-gray-400">{click.ip_hash ? `${click.ip_hash.slice(0, 12)}...` : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'opportunities' ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-dark-900/45 p-3 space-y-2">
            <p className="text-[11px] uppercase tracking-[0.1em] text-emerald-200">Add Opportunity</p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <input value={opportunityForm.partner} onChange={(e) => setOpportunityForm((p) => ({ ...p, partner: e.target.value }))} placeholder="Partner" className="rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white" />
              <input value={opportunityForm.website || ''} onChange={(e) => setOpportunityForm((p) => ({ ...p, website: e.target.value }))} placeholder="Website" className="rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white" />
              <input value={opportunityForm.status} onChange={(e) => setOpportunityForm((p) => ({ ...p, status: e.target.value }))} placeholder="Status" className="rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white" />
              <input value={opportunityForm.commission || ''} onChange={(e) => setOpportunityForm((p) => ({ ...p, commission: e.target.value }))} placeholder="Commission" className="rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white" />
              <input value={opportunityForm.cookie_length || ''} onChange={(e) => setOpportunityForm((p) => ({ ...p, cookie_length: e.target.value }))} placeholder="Cookie Length" className="rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white" />
              <input value={opportunityForm.payment_threshold || ''} onChange={(e) => setOpportunityForm((p) => ({ ...p, payment_threshold: e.target.value }))} placeholder="Payment threshold" className="rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white" />
              <input value={opportunityForm.payment_method || ''} onChange={(e) => setOpportunityForm((p) => ({ ...p, payment_method: e.target.value }))} placeholder="Payment method" className="rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white" />
              <input value={opportunityForm.account_manager || ''} onChange={(e) => setOpportunityForm((p) => ({ ...p, account_manager: e.target.value }))} placeholder="Account manager" className="rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white" />
              <label className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-gray-200">
                <input type="checkbox" checked={opportunityForm.applied} onChange={(e) => setOpportunityForm((p) => ({ ...p, applied: e.target.checked }))} className="h-3.5 w-3.5" />
                Applied?
              </label>
              <input type="date" value={opportunityForm.application_date || ''} onChange={(e) => setOpportunityForm((p) => ({ ...p, application_date: e.target.value || null }))} className="rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white" />
              <input type="date" value={opportunityForm.follow_up_reminder || ''} onChange={(e) => setOpportunityForm((p) => ({ ...p, follow_up_reminder: e.target.value || null }))} className="rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white" />
            </div>
            <textarea value={opportunityForm.notes || ''} onChange={(e) => setOpportunityForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes" rows={2} className="w-full rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white" />
            <button onClick={() => void createOpportunity()} className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-100">Add opportunity</button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/10 bg-dark-900/45">
            <table className="min-w-[1200px] w-full text-left text-xs">
              <thead className="bg-dark-900/70 text-gray-300">
                <tr>
                  <th className="px-3 py-2">Partner</th>
                  <th className="px-3 py-2">Website</th>
                  <th className="px-3 py-2">Applied</th>
                  <th className="px-3 py-2">Application Date</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Commission</th>
                  <th className="px-3 py-2">Cookie Length</th>
                  <th className="px-3 py-2">Payment Threshold</th>
                  <th className="px-3 py-2">Payment Method</th>
                  <th className="px-3 py-2">Account Manager</th>
                  <th className="px-3 py-2">Follow-up</th>
                  <th className="px-3 py-2">Notes</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {opportunities.length === 0 ? (
                  <tr><td className="px-3 py-4 text-gray-400" colSpan={13}>No opportunities yet.</td></tr>
                ) : opportunities.map((item) => (
                  <tr key={item.id} className="border-t border-white/10 text-gray-200">
                    <td className="px-3 py-2 font-medium">{item.partner}</td>
                    <td className="px-3 py-2 text-cyan-200">{item.website || '-'}</td>
                    <td className="px-3 py-2">{item.applied ? 'Yes' : 'No'}</td>
                    <td className="px-3 py-2">{item.application_date || '-'}</td>
                    <td className="px-3 py-2">{item.status}</td>
                    <td className="px-3 py-2">{item.commission || '-'}</td>
                    <td className="px-3 py-2">{item.cookie_length || '-'}</td>
                    <td className="px-3 py-2">{item.payment_threshold || '-'}</td>
                    <td className="px-3 py-2">{item.payment_method || '-'}</td>
                    <td className="px-3 py-2">{item.account_manager || '-'}</td>
                    <td className="px-3 py-2">{item.follow_up_reminder || '-'}</td>
                    <td className="px-3 py-2 text-gray-400">{item.notes ? item.notes.slice(0, 48) : '-'}</td>
                    <td className="px-3 py-2">
                      <button onClick={() => setConfirm({ open: true, title: `Delete ${item.partner}?`, description: 'This removes the opportunity record.', danger: true, onConfirm: () => { setConfirm((prev) => ({ ...prev, open: false })); void deleteOpportunity(item); } })} className="inline-flex items-center gap-1 rounded-lg border border-rose-500/25 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-100">
                        <Trash2 className="h-3 w-3" />Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === 'settings' ? (
        <div className="space-y-3 rounded-xl border border-white/10 bg-dark-900/45 p-3">
          <p className="text-[11px] uppercase tracking-[0.1em] text-emerald-200">Affiliate Settings</p>
          {!settings ? (
            <p className="text-sm text-gray-400">Settings unavailable.</p>
          ) : (
            <>
              <textarea value={settings.default_disclosure} onChange={(e) => setSettings((prev) => prev ? ({ ...prev, default_disclosure: e.target.value }) : prev)} rows={3} className="w-full rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white" />
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <select value={settings.default_placement} onChange={(e) => setSettings((prev) => prev ? ({ ...prev, default_placement: e.target.value }) : prev)} className="rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white">
                  {(Object.keys(DEFAULT_PLACEMENTS) as PlacementKey[]).map((key) => <option key={key} value={key}>{key}</option>)}
                </select>
                <input type="number" min={30} value={settings.analytics_retention_days} onChange={(e) => setSettings((prev) => prev ? ({ ...prev, analytics_retention_days: Number(e.target.value) }) : prev)} className="rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-white" />
                <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-dark-900/60 px-3 py-2 text-xs text-gray-200">
                  <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={settings.recommended_tools_enabled} onChange={(e) => setSettings((prev) => prev ? ({ ...prev, recommended_tools_enabled: e.target.checked }) : prev)} className="h-3.5 w-3.5" />Recommended tools enabled</label>
                  <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={settings.click_tracking_enabled} onChange={(e) => setSettings((prev) => prev ? ({ ...prev, click_tracking_enabled: e.target.checked }) : prev)} className="h-3.5 w-3.5" />Click tracking enabled</label>
                </div>
              </div>
              <button onClick={() => void saveSettings()} className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-100">Save settings</button>
              <p className="inline-flex items-center gap-1 text-[11px] text-amber-200"><ShieldAlert className="h-3.5 w-3.5" />Destination URLs remain admin-only and are never exposed on public pages.</p>
            </>
          )}
        </div>
      ) : null}

      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        description={confirm.description}
        danger={confirm.danger}
        onCancel={() => setConfirm((prev) => ({ ...prev, open: false }))}
        onConfirm={() => { confirm.onConfirm?.(); }}
      />
    </section>
  );
}
