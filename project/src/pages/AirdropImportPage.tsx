import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, RefreshCw, Download, CheckCircle2, XCircle, Clock,
  AlertTriangle, Loader2, ShieldCheck, ExternalLink,
  Database, PlusCircle, X, Search, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { AirdropStatus, RewardPotential, RiskLevel, Difficulty } from '../lib/types';
import { cn, daysUntil, formatDate } from '../lib/utils';

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScrapedAirdrop {
  id: string;
  name: string;
  source_url: string;
  slug: string;
  description: string;
  logo_url: string;
  chain: string;
  end_date: string | null;
  reward: string;
  pub_date: string | null;
  website_url: string;
  twitter_url: string;
  discord_url: string;
  telegram_url: string;
  ticker: string;
  tasks: string[];
  source?: string;
}

interface FetchStats {
  fetched: number;
  new_count: number;
  skipped_count: number;
  dup_count?: number;
  latest_date: string | null;
  enrich_stats?: {
    articles_fetched: number;
    websites_found: number;
    socials_found: number;
    deadlines_found: number;
    tasks_found: number;
    source_counts?: Record<string, number>;
    source_errors?: Record<string, string>;
    galxe_avg_score?: number;
    galxe_top_rejections?: Record<string, number>;
  };
}

const SOURCE_LABELS: Record<string, string> = {
  airdropalert:   'AirdropAlert',
  galxe:          'Galxe',
  galxe_fetched:  'Galxe fetched',
  galxe_accepted: 'Galxe accepted',
  galxe_rejected: 'Galxe rejected',
};

const SOURCE_COLORS: Record<string, string> = {
  airdropalert:   'text-sky-400 bg-sky-500/10 border-sky-500/20',
  galxe:          'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  galxe_fetched:  'text-gray-400 bg-white/5 border-white/10',
  galxe_accepted: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  galxe_rejected: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
};

const GENERIC_DISCOVERY_NAMES = new Set([
  'spaces',
  'quests',
  'tasks',
  'campaigns',
  'rewards',
  'dashboard',
  'explore',
  'learn',
  'docs',
  'blog',
  'events',
  'airdrop',
  'airdrops',
  'search',
  'browse',
  'category',
  'new',
  'latest',
]);

function normalizeDiscoveryName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasReasonableDiscoveryName(value: string): boolean {
  const cleaned = normalizeDiscoveryName(value);
  if (!cleaned || cleaned.length < 3 || cleaned.length > 60) return false;
  if (/^\d+$/.test(cleaned)) return false;

  const tokens = cleaned.split(' ').filter(Boolean);
  if (tokens.length === 0) return false;
  if (tokens.every((token) => GENERIC_DISCOVERY_NAMES.has(token))) return false;
  if (tokens.length === 1 && tokens[0].length < 4 && !/\d/.test(tokens[0])) return false;

  return true;
}

function hasDiscoveryIdentitySupport(item: Pick<ScrapedAirdrop, 'website_url' | 'twitter_url' | 'discord_url' | 'telegram_url' | 'source_url'>): boolean {
  return Boolean(item.website_url || item.twitter_url || item.discord_url || item.telegram_url || item.source_url);
}

function shouldRejectScrapedAirdrop(item: ScrapedAirdrop): boolean {
  const cleanedName = normalizeDiscoveryName(item.name);
  if (!hasReasonableDiscoveryName(item.name)) return true;
  if (GENERIC_DISCOVERY_NAMES.has(cleanedName)) return true;
  return !hasDiscoveryIdentitySupport(item);
}

interface PendingAirdrop {
  id: string;
  name: string;
  ticker: string;
  logo_url: string;
  status: AirdropStatus;
  reward_potential: RewardPotential;
  expiry_date: string | null;
  review_status: string;
  source: string;
  source_url: string | null;
  website_url: string;
  trust_label: string | null;
}

interface ManualForm {
  name: string;
  ticker: string;
  description: string;
  website_url: string;
  twitter_url: string;
  discord_url: string;
  source_url: string;
  chain: string;
  expiry_date: string;
  risk_level: RiskLevel;
  difficulty: Difficulty;
  reward_potential: RewardPotential;
  estimated_reward: string;
}

const EMPTY_MANUAL: ManualForm = {
  name: '', ticker: '', description: '', website_url: '',
  twitter_url: '', discord_url: '', source_url: '', chain: '',
  expiry_date: '', risk_level: 'Medium', difficulty: 'Moderate',
  reward_potential: 'Low', estimated_reward: '',
};

// ── Map scraped → DB insert ───────────────────────────────────────────────────

function mapScrapedToInsert(item: ScrapedAirdrop) {
  const base = item.slug.replace(/-airdrop$/, '');
  const slug = `${base}-aio`
    .toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-').replace(/^-|-$/g, '');
  return {
    name: item.name,
    slug,
    ticker: item.ticker || '',
    logo_url: item.logo_url ?? '',
    blockchain: item.chain ? [item.chain] : [] as string[],
    category: [] as string[],
    reward_potential: 'Low' as RewardPotential,
    difficulty: 'Moderate' as Difficulty,
    time_required: 'Unknown',
    expiry_date: item.end_date ?? null,
    risk_level: 'Medium' as RiskLevel,
    status: 'Active' as AirdropStatus,
    ai_summary: item.description,
    ai_risk_analysis: '',
    ai_reward_estimate: '',
    overview: item.description,
    why_airdrop: '',
    estimated_reward: item.reward && item.reward !== 'TBA' ? item.reward : 'TBA',
    website_url: item.website_url || '',
    twitter_url: item.twitter_url || '',
    discord_url: item.discord_url || '',
    telegram_url: item.telegram_url || '',
    github_url: '',
    contract_address: '',
    is_trending: false, is_featured: false, is_sponsored: false,
    published: false,
    trust_score: null,
    listing_state: 'verified' as const,
    blacklist_reason: null,
    sort_order: 100,
    source: item.source === 'galxe' ? 'galxe' : 'airdropalert_rss',
    human_verified: false,
    review_status: 'pending',
    is_demo: false,
    trust_label: null,
    cryptorank_id: null,
    source_url: item.source_url,
  };
}

function mapManualToInsert(f: ManualForm) {
  const slug =
    `${f.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now().toString(36)}`;
  return {
    name: f.name.trim(),
    slug,
    ticker: f.ticker.trim().toUpperCase(),
    logo_url: '',
    blockchain: f.chain ? [f.chain] : [] as string[],
    category: [] as string[],
    reward_potential: f.reward_potential,
    difficulty: f.difficulty,
    time_required: 'Unknown',
    expiry_date: f.expiry_date || null,
    risk_level: f.risk_level,
    status: 'Active' as AirdropStatus,
    ai_summary: f.description.trim(),
    ai_risk_analysis: '',
    ai_reward_estimate: '',
    overview: f.description.trim(),
    why_airdrop: '',
    estimated_reward: f.estimated_reward.trim() || 'TBA',
    website_url: f.website_url.trim(),
    twitter_url: f.twitter_url.trim(),
    discord_url: f.discord_url.trim(),
    telegram_url: '', github_url: '', contract_address: '',
    is_trending: false, is_featured: false, is_sponsored: false,
    published: false,
    trust_score: null,
    listing_state: 'verified' as const,
    blacklist_reason: null,
    sort_order: 100,
    source: 'manual',
    human_verified: false,
    review_status: 'pending',
    is_demo: false,
    trust_label: null,
    cryptorank_id: null,
    source_url: f.source_url.trim() || null,
  };
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ msg, type, onDone }: { msg: string; type: 'success' | 'error'; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className={cn(
      'fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium animate-slide-up',
      type === 'success'
        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
        : 'bg-rose-500/15 border-rose-500/30 text-rose-300',
    )}>
      {type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
      {msg}
    </div>
  );
}

// ── Field helpers ─────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full bg-dark-700/60 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-blue/40';
const selectCls = 'w-full bg-dark-700/60 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-neon-blue/40';

// ── Verdict badge helper ──────────────────────────────────────────────────────

function VerdictBadge({ label }: { label: string | null }) {
  if (!label) return null;
  const map: Record<string, string> = {
    act_now:      'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    watch:        'text-amber-400 bg-amber-500/10 border-amber-500/20',
    needs_review: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    skip:         'text-rose-400 bg-rose-500/10 border-rose-500/20',
  };
  const text: Record<string, string> = {
    act_now: 'Act Now', watch: 'Watch', needs_review: 'Needs Review', skip: 'Skip',
  };
  const cls = map[label] ?? 'text-gray-400 bg-gray-500/10 border-gray-500/20';
  return (
    <span className={cn('text-[10px] rounded-full px-1.5 py-0.5 border', cls)}>
      {text[label] ?? label}
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AirdropImportPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Fetch / scrape state
  const [scraped, setScraped] = useState<ScrapedAirdrop[]>([]);
  const [fetchSource, setFetchSource] = useState<string | null>(null);
  const [fetchStats, setFetchStats] = useState<FetchStats | null>(null);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [importedUrls, setImportedUrls] = useState<Set<string>>(new Set());

  // Source selector
  const [selectedSources, setSelectedSources] = useState<string[]>(['airdropalert', 'galxe']);

  // Scraped list filters + pagination (client-side)
  const [scrapedSearch, setScrapedSearch] = useState('');
  const [scrapedQuality, setScrapedQuality] = useState('');
  const [scrapedSourceFilter, setScrapedSourceFilter] = useState('');
  const [scrapedHasUrl, setScrapedHasUrl] = useState(false);
  const [scrapedPage, setScrapedPage] = useState(1);

  // Pending queue
  const [pending, setPending] = useState<PendingAirdrop[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingSearch, setPendingSearch] = useState('');
  const [pendingSource, setPendingSource] = useState('');
  const [pendingStatus, setPendingStatus] = useState('');
  const [pendingVerdict, setPendingVerdict] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  // Manual entry
  const [showManual, setShowManual] = useState(false);
  const [manual, setManual] = useState<ManualForm>(EMPTY_MANUAL);
  const [manualSaving, setManualSaving] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
  }, []);

  // ── Admin auth ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/auth'); return; }
    supabase
      .from('airdrops')
      .select('id', { count: 'exact', head: true })
      .then(({ error }) => {
        if (error) { navigate('/'); return; }
        setIsAdmin(true);
        setAuthChecked(true);
      });
  }, [authLoading, user, navigate]);

  // ── Load imported URLs ────────────────────────────────────────────────────

  const loadImportedUrls = useCallback(async () => {
    const { data } = await supabase
      .from('airdrops')
      .select('source_url')
      .in('source', ['airdropalert_rss', 'galxe'])
      .not('source_url', 'is', null);
    setImportedUrls(new Set((data ?? []).map((r: { source_url: string | null }) => r.source_url ?? '')));
  }, []);

  // ── Load approved imports (server-side paginated + filtered) ──────────────

  const loadPending = useCallback(async (
    page: number,
    search: string,
    source: string,
    status: string,
    verdict: string,
  ) => {
    setPendingLoading(true);
    const from = (page - 1) * PAGE_SIZE;
    const to   = from + PAGE_SIZE - 1;

    let q = supabase
      .from('airdrops')
      .select(
        'id, name, ticker, logo_url, status, reward_potential, expiry_date, review_status, source, source_url, website_url, trust_label',
        { count: 'exact' },
      )
      .eq('is_demo', false)
      .not('review_status', 'eq', 'replaced_demo')
      .order('created_at', { ascending: false })
      .range(from, to);

    // Review status filter — default to approved unless specific choice
    if (status) {
      q = q.eq('review_status', status);
    } else {
      q = q.eq('review_status', 'approved');
    }

    if (search.trim()) q = q.ilike('name', `%${search.trim()}%`);
    if (source)        q = q.eq('source', source);
    if (verdict)       q = q.eq('trust_label', verdict);

    const { data, count } = await q;
    setPending((data ?? []) as PendingAirdrop[]);
    setPendingTotal(count ?? 0);
    setPendingLoading(false);
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    loadImportedUrls();
    loadPending(1, '', '', 'approved', '');
  }, [authChecked, loadImportedUrls, loadPending]);

  // Re-fetch when filters or page change
  useEffect(() => {
    if (!authChecked) return;
    loadPending(pendingPage, pendingSearch, pendingSource, pendingStatus, pendingVerdict);
  }, [authChecked, pendingPage, pendingSearch, pendingSource, pendingStatus, pendingVerdict, loadPending]);

  const totalPages = Math.max(1, Math.ceil(pendingTotal / PAGE_SIZE));

  const resetFilters = () => {
    setPendingSearch('');
    setPendingSource('');
    setPendingStatus('approved');
    setPendingVerdict('');
    setPendingPage(1);
  };

  const handleFilterChange = (fn: () => void) => {
    fn();
    setPendingPage(1);
  };

  // ── Fetch from AirdropAlert RSS ───────────────────────────────────────────

  const fetchFromAirdropsIo = async () => {
    setFetchLoading(true);
    setFetchError(null);
    setScraped([]);
    setFetchSource(null);
    setFetchStats(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('cryptorank-proxy', {
        body: { limit: 30, existing_urls: [...importedUrls], sources: selectedSources },
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      if (res.error) throw new Error(res.error.message);
      const json = res.data as {
        data?: ScrapedAirdrop[];
        source?: string;
        error?: string;
        fetched?: number;
        new_count?: number;
        skipped_count?: number;
        dup_count?: number;
        latest_date?: string | null;
        enrich_stats?: FetchStats['enrich_stats'];
      };
      if (json.error) {
        setFetchError(json.error);
      } else {
        setScraped(json.data ?? []);
        setFetchSource(json.source ?? null);
        setFetchStats({
          fetched: json.fetched ?? 0,
          new_count: json.new_count ?? 0,
          skipped_count: json.skipped_count ?? 0,
          dup_count: json.dup_count ?? 0,
          latest_date: json.latest_date ?? null,
          enrich_stats: json.enrich_stats,
        });
      }
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setFetchLoading(false);
    }
  };

  // ── Import single scraped airdrop ─────────────────────────────────────────

  const importScraped = async (item: ScrapedAirdrop) => {
    setImportingId(item.id);
    try {
      if (shouldRejectScrapedAirdrop(item)) {
        showToast(`${item.name} skipped because it does not look like a real project`, 'error');
        return;
      }

      const record = mapScrapedToInsert(item);
      const { error } = await supabase.from('airdrops').insert(record);
      if (error) throw new Error(error.message);
      setImportedUrls(prev => new Set([...prev, item.source_url]));
      showToast(`${item.name} added to review queue`);
      loadPending(pendingPage, pendingSearch, pendingSource, pendingStatus, pendingVerdict);
    } catch (e) {
      showToast(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
    } finally {
      setImportingId(null);
    }
  };

  // ── Manual submit ─────────────────────────────────────────────────────────

  const submitManual = async () => {
    if (!manual.name.trim() || !manual.description.trim()) {
      showToast('Name and description are required', 'error');
      return;
    }
    setManualSaving(true);
    try {
      const record = mapManualToInsert(manual);
      const { error } = await supabase.from('airdrops').insert(record);
      if (error) throw new Error(error.message);
      showToast(`${manual.name} added to review queue`);
      setManual(EMPTY_MANUAL);
      setShowManual(false);
      loadPending(1, pendingSearch, pendingSource, pendingStatus, pendingVerdict);
    } catch (e) {
      showToast(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
    } finally {
      setManualSaving(false);
    }
  };

  // ── Approve / Reject ──────────────────────────────────────────────────────

  const approve = async (a: PendingAirdrop) => {
    setActionId(a.id);
    const { error } = await supabase
      .from('airdrops')
      .update({ review_status: 'approved', published: true, human_verified: true })
      .eq('id', a.id);
    if (error) showToast(`Error: ${error.message}`, 'error');
    else {
      showToast(`${a.name} approved and published`);
      loadPending(pendingPage, pendingSearch, pendingSource, pendingStatus, pendingVerdict);
    }
    setActionId(null);
  };

  const reject = async (a: PendingAirdrop) => {
    setActionId(a.id);
    const { error } = await supabase
      .from('airdrops')
      .update({ review_status: 'rejected', published: false })
      .eq('id', a.id);
    if (error) showToast(`Error: ${error.message}`, 'error');
    else {
      showToast(`${a.name} rejected`);
      loadPending(pendingPage, pendingSearch, pendingSource, pendingStatus, pendingVerdict);
    }
    setActionId(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  // ── Scraped list: filter + paginate (client-side) ────────────────────────

  const filteredScraped = scraped.filter(item => {
    if (scrapedSearch && !item.name.toLowerCase().includes(scrapedSearch.toLowerCase())) return false;
    if (scrapedHasUrl && !item.website_url && !item.source_url) return false;
    if (scrapedQuality === 'has_website'  && !item.website_url)  return false;
    if (scrapedQuality === 'has_socials'  && !item.twitter_url && !item.discord_url && !item.telegram_url) return false;
    if (scrapedQuality === 'has_reward'   && (!item.reward || item.reward === 'TBA')) return false;
    if (scrapedQuality === 'has_chain'    && !item.chain)         return false;
    if (scrapedQuality === 'new_only'     && importedUrls.has(item.source_url)) return false;
    if (scrapedSourceFilter && item.source !== scrapedSourceFilter) return false;
    return true;
  });

  const scrapedTotalPages = Math.max(1, Math.ceil(filteredScraped.length / PAGE_SIZE));
  const scrapedPageItems  = filteredScraped.slice((scrapedPage - 1) * PAGE_SIZE, scrapedPage * PAGE_SIZE);

  const handleScrapedFilterChange = (fn: () => void) => { fn(); setScrapedPage(1); };

  if (authLoading || !authChecked) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const hasActiveFilters = pendingSearch || pendingSource || pendingStatus || pendingVerdict;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/admin" className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Airdrop Import</h1>
            <p className="text-gray-500 text-sm mt-0.5">Import from AirdropAlert, CoinMarketCap, DeFiLlama or add manually</p>
          </div>
        </div>
        <Link to="/admin" className="text-xs text-gray-500 hover:text-white transition-colors">
          Back to Admin
        </Link>
      </div>

      {/* Disclaimer */}
      <div className="glass-card p-4 border-sky-500/20 bg-sky-500/5">
        <p className="text-xs text-sky-300/80 leading-relaxed">
          <span className="font-semibold text-sky-300">Data Notice:</span>{' '}
          Data sourced from public project listings. Reviewed by AirdropGuard where indicated.
          Always DYOR before connecting a wallet. Rewards are estimated — not guaranteed.
        </p>
      </div>

      {/* Fetch from Sources */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Download className="w-5 h-5 text-neon-blue" />
          <h2 className="text-base font-semibold text-white">Fetch Listings</h2>
          {fetchSource && (
            <span className="ml-auto text-[10px] text-gray-600 bg-white/5 rounded px-1.5 py-0.5">
              via {fetchSource}
            </span>
          )}
        </div>

        {/* Source selector */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {(['airdropalert', 'galxe'] as const).map(src => {
            const active = selectedSources.includes(src);
            return (
              <button
                key={src}
                onClick={() => setSelectedSources(prev =>
                  active ? prev.filter(s => s !== src) : [...prev, src]
                )}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-lg border transition-colors',
                  active
                    ? SOURCE_COLORS[src] ?? 'text-white bg-white/10 border-white/20'
                    : 'text-gray-600 bg-dark-700/40 border-white/8 hover:border-white/20',
                )}
              >
                {SOURCE_LABELS[src]}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <button
            onClick={fetchFromAirdropsIo}
            disabled={fetchLoading || selectedSources.length === 0}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-neon-blue/10 border border-neon-blue/25 text-neon-blue hover:bg-neon-blue/20 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {fetchLoading
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Fetching…</>
              : <><RefreshCw className="w-3.5 h-3.5" /> Fetch Listings</>}
          </button>
          {fetchStats && (
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                <span>Total <span className="text-gray-400">{scraped.length}</span></span>
                <span>·</span>
                <span>New <span className="text-emerald-400 font-medium">{fetchStats.new_count}</span></span>
                <span>·</span>
                <span>Dupes <span className="text-gray-600">{fetchStats.dup_count ?? fetchStats.skipped_count}</span></span>
                {fetchStats.latest_date && (
                  <>
                    <span>·</span>
                    <span>Latest <span className="text-gray-500">{fetchStats.latest_date}</span></span>
                  </>
                )}
              </div>
              {fetchStats.enrich_stats && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-700">
                  {fetchStats.enrich_stats.source_counts && Object.entries(fetchStats.enrich_stats.source_counts).map(([src, cnt]) => cnt > 0 && (
                    <span key={src} className={cn('text-[10px] rounded px-1 py-0.5 border', SOURCE_COLORS[src] ?? 'text-gray-500 bg-white/5 border-white/10')}>
                      {SOURCE_LABELS[src] ?? src} {cnt}
                    </span>
                  ))}
                  <span>Sites <span className="text-sky-500">{fetchStats.enrich_stats.websites_found}</span></span>
                  <span>·</span>
                  <span>Socials <span className="text-blue-500">{fetchStats.enrich_stats.socials_found}</span></span>
                  <span>·</span>
                  <span>Deadlines <span className="text-amber-500">{fetchStats.enrich_stats.deadlines_found}</span></span>
                  <span>·</span>
                  <span>Tasks <span className="text-emerald-500">{fetchStats.enrich_stats.tasks_found}</span></span>
                  {fetchStats.enrich_stats.galxe_avg_score !== undefined && (
                    <>
                      <span>·</span>
                      <span>Avg score <span className="text-violet-400">{fetchStats.enrich_stats.galxe_avg_score}</span></span>
                    </>
                  )}
                </div>
              )}
              {fetchStats.enrich_stats?.galxe_top_rejections && Object.keys(fetchStats.enrich_stats.galxe_top_rejections).length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-gray-600">Rejected by:</span>
                  {Object.entries(fetchStats.enrich_stats.galxe_top_rejections)
                    .sort((a, b) => b[1] - a[1])
                    .map(([term, count]) => (
                      <span key={term} className="text-[10px] rounded px-1 py-0.5 border text-rose-400 bg-rose-500/10 border-rose-500/20">
                        {term} ×{count}
                      </span>
                    ))}
                </div>
              )}
              {fetchStats.enrich_stats?.source_errors && Object.entries(fetchStats.enrich_stats.source_errors).map(([src, msg]) => (
                <div key={src} className="flex items-center gap-1.5 text-[10px] text-amber-400/70">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>{SOURCE_LABELS[src] ?? src}: {msg}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {fetchStats && fetchStats.new_count === 0 && !fetchError && scraped.length > 0 && (
          <div className="py-4 text-center text-sm text-gray-500">
            No new RSS items available — all {fetchStats.fetched} items already imported.
          </div>
        )}

        {fetchError && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-300 mb-4">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p>{fetchError}</p>
              <p className="text-xs text-amber-400/70 mt-1">Use the manual entry form below to add airdrops directly.</p>
            </div>
          </div>
        )}

        {scraped.length > 0 && (
          <>
            {/* Scraped list filters */}
            <div className="flex flex-wrap gap-2 mb-3">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600 pointer-events-none" />
                <input
                  value={scrapedSearch}
                  onChange={e => handleScrapedFilterChange(() => setScrapedSearch(e.target.value))}
                  placeholder="Search by name…"
                  className="w-full bg-dark-700/60 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-blue/40"
                />
              </div>
              <select
                value={scrapedSourceFilter}
                onChange={e => handleScrapedFilterChange(() => setScrapedSourceFilter(e.target.value))}
                className="bg-dark-700/60 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-neon-blue/40"
              >
                <option value="">All sources</option>
                <option value="airdropalert">AirdropAlert</option>
                <option value="galxe">Galxe</option>
              </select>
              <select
                value={scrapedQuality}
                onChange={e => handleScrapedFilterChange(() => setScrapedQuality(e.target.value))}
                className="bg-dark-700/60 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-neon-blue/40"
              >
                <option value="">All quality</option>
                <option value="new_only">New only</option>
                <option value="has_website">Has website</option>
                <option value="has_socials">Has socials</option>
                <option value="has_reward">Has reward</option>
                <option value="has_chain">Has chain</option>
              </select>
              <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={scrapedHasUrl}
                  onChange={e => handleScrapedFilterChange(() => setScrapedHasUrl(e.target.checked))}
                  className="accent-sky-500"
                />
                Has URL
              </label>
              {(scrapedSearch || scrapedQuality || scrapedHasUrl || scrapedSourceFilter) && (
                <button
                  onClick={() => { setScrapedSearch(''); setScrapedQuality(''); setScrapedHasUrl(false); setScrapedSourceFilter(''); setScrapedPage(1); }}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors text-xs"
                >
                  <X className="w-3 h-3" /> Clear
                </button>
              )}
            </div>

            {filteredScraped.length === 0 ? (
              <p className="text-sm text-gray-600 text-center py-4">No results match your filters.</p>
            ) : (
              <>
                <div className="divide-y divide-white/5">
                  {scrapedPageItems.map(item => {
                    const alreadyImported = importedUrls.has(item.source_url);
                    return (
                      <div key={item.id} className="flex items-start gap-3 py-3">
                        <div className="w-8 h-8 rounded-lg bg-dark-700/60 border border-white/8 flex items-center justify-center shrink-0 mt-0.5 overflow-hidden">
                          {item.logo_url
                            ? <img src={item.logo_url} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                            : <span className="text-xs font-bold text-gray-500">{item.name.charAt(0)}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                            <span className="text-sm font-semibold text-white">{item.name}</span>
                            {item.ticker && <span className="text-[10px] font-mono text-gray-500">${item.ticker}</span>}
                            {item.chain && <span className="text-[10px] text-gray-600 bg-white/5 rounded px-1">{item.chain}</span>}
                            {item.source && (
                              <span className={cn('text-[10px] rounded px-1 py-0.5 border', SOURCE_COLORS[item.source] ?? 'text-gray-600 bg-white/5 border-white/10')}>
                                {SOURCE_LABELS[item.source] ?? item.source}
                              </span>
                            )}
                            {item.end_date && (
                              <span className="text-[10px] text-gray-600 flex items-center gap-0.5">
                                <Clock className="w-2.5 h-2.5" />
                                {daysUntil(item.end_date) ?? 0}d left
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{item.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[10px] text-gray-700 italic">Reward: {item.reward}</span>
                            <a href={item.source_url} target="_blank" rel="noopener noreferrer"
                              className="text-[10px] text-gray-700 hover:text-gray-400 flex items-center gap-0.5 transition-colors">
                              <ExternalLink className="w-2.5 h-2.5" /> source
                            </a>
                            {item.website_url && (
                              <a href={item.website_url} target="_blank" rel="noopener noreferrer"
                                className="text-[10px] text-sky-600 hover:text-sky-400 flex items-center gap-0.5 transition-colors">
                                <ExternalLink className="w-2.5 h-2.5" /> website
                              </a>
                            )}
                            {item.twitter_url && (
                              <a href={item.twitter_url} target="_blank" rel="noopener noreferrer"
                                className="text-[10px] text-blue-600 hover:text-blue-400 transition-colors">X</a>
                            )}
                            {item.discord_url && (
                              <a href={item.discord_url} target="_blank" rel="noopener noreferrer"
                                className="text-[10px] text-indigo-500 hover:text-indigo-300 transition-colors">Discord</a>
                            )}
                            {item.telegram_url && (
                              <a href={item.telegram_url} target="_blank" rel="noopener noreferrer"
                                className="text-[10px] text-sky-500 hover:text-sky-300 transition-colors">TG</a>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0">
                          {alreadyImported ? (
                            <span className="text-[10px] text-gray-600 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Imported
                            </span>
                          ) : (
                            <button
                              onClick={() => importScraped(item)}
                              disabled={importingId === item.id}
                              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-neon-purple/10 border border-neon-purple/25 text-neon-purple hover:bg-neon-purple/20 transition-colors text-xs font-medium disabled:opacity-50"
                            >
                              {importingId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                              Queue
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Scraped pagination */}
                <div className="flex flex-col items-center gap-3 pt-4 border-t border-white/5 mt-2">
                  <span className="text-xs text-gray-500">
                    Fetched Page <span className="text-white font-medium">{scrapedPage}</span> of <span className="text-white font-medium">{scrapedTotalPages}</span>
                    <span className="text-gray-700"> · {filteredScraped.length} results</span>
                  </span>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                      onClick={() => setScrapedPage(p => Math.max(1, p - 1))}
                      disabled={scrapedPage === 1}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl border border-white/15 text-gray-300 bg-white/5 hover:bg-white/10 hover:text-white active:scale-95 transition-all text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100"
                    >
                      <ChevronLeft className="w-4 h-4" /> Previous
                    </button>
                    <button
                      onClick={() => setScrapedPage(p => Math.min(scrapedTotalPages, p + 1))}
                      disabled={scrapedPage === scrapedTotalPages}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl border border-white/15 text-gray-300 bg-white/5 hover:bg-white/10 hover:text-white active:scale-95 transition-all text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Manual Entry */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <PlusCircle className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base font-semibold text-white">Add Manually</h2>
          <span className="text-xs text-gray-600 ml-1">Paste a real airdrop into the review queue</span>
          <button
            onClick={() => setShowManual(v => !v)}
            className="ml-auto flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
          >
            {showManual ? <><X className="w-3.5 h-3.5" /> Close</> : <><PlusCircle className="w-3.5 h-3.5" /> Open form</>}
          </button>
        </div>

        {showManual && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Project Name *">
                <input value={manual.name} onChange={e => setManual(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. LayerZero" className={inputCls} />
              </Field>
              <Field label="Ticker">
                <input value={manual.ticker} onChange={e => setManual(p => ({ ...p, ticker: e.target.value }))}
                  placeholder="e.g. ZRO" className={inputCls} />
              </Field>
            </div>

            <Field label="Description *">
              <textarea value={manual.description} onChange={e => setManual(p => ({ ...p, description: e.target.value }))}
                rows={3} placeholder="What is this airdrop? What are the requirements? (potential reward, not guaranteed)"
                className={inputCls} />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Website URL">
                <input value={manual.website_url} onChange={e => setManual(p => ({ ...p, website_url: e.target.value }))}
                  placeholder="https://..." className={inputCls} />
              </Field>
              <Field label="Source / Listing URL">
                <input value={manual.source_url} onChange={e => setManual(p => ({ ...p, source_url: e.target.value }))}
                  placeholder="https://airdrops.io/..." className={inputCls} />
              </Field>
              <Field label="Twitter URL">
                <input value={manual.twitter_url} onChange={e => setManual(p => ({ ...p, twitter_url: e.target.value }))}
                  placeholder="https://twitter.com/..." className={inputCls} />
              </Field>
              <Field label="Discord URL">
                <input value={manual.discord_url} onChange={e => setManual(p => ({ ...p, discord_url: e.target.value }))}
                  placeholder="https://discord.gg/..." className={inputCls} />
              </Field>
              <Field label="Chain / Blockchain">
                <input value={manual.chain} onChange={e => setManual(p => ({ ...p, chain: e.target.value }))}
                  placeholder="e.g. Ethereum, Solana" className={inputCls} />
              </Field>
              <Field label="Expiry Date">
                <input type="date" value={manual.expiry_date} onChange={e => setManual(p => ({ ...p, expiry_date: e.target.value }))}
                  className={inputCls} />
              </Field>
              <Field label="Risk Level">
                <select value={manual.risk_level} onChange={e => setManual(p => ({ ...p, risk_level: e.target.value as RiskLevel }))}
                  className={selectCls}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </Field>
              <Field label="Effort Required">
                <select value={manual.difficulty} onChange={e => setManual(p => ({ ...p, difficulty: e.target.value as Difficulty }))}
                  className={selectCls}>
                  <option value="Easy">Easy</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Hard">Hard</option>
                </select>
              </Field>
              <Field label="Reward Level">
                <select value={manual.reward_potential} onChange={e => setManual(p => ({ ...p, reward_potential: e.target.value as RewardPotential }))}
                  className={selectCls}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </Field>
              <Field label="Estimated Reward">
                <input value={manual.estimated_reward} onChange={e => setManual(p => ({ ...p, estimated_reward: e.target.value }))}
                  placeholder="e.g. $500–$2000 (estimated, not guaranteed)" className={inputCls} />
              </Field>
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={submitManual} disabled={manualSaving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 transition-colors text-sm font-medium disabled:opacity-50">
                {manualSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
                Add to Review Queue
              </button>
              <button onClick={() => { setManual(EMPTY_MANUAL); setShowManual(false); }}
                className="px-4 py-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-colors text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pending Review Queue */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-semibold text-white">Review Queue</h2>
          <span className="ml-1 text-xs text-gray-600 bg-white/5 rounded-full px-2 py-0.5">{pendingTotal}</span>
          <button
            onClick={() => loadPending(pendingPage, pendingSearch, pendingSource, pendingStatus, pendingVerdict)}
            className="ml-auto p-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-white/5 transition-colors"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', pendingLoading && 'animate-spin')} />
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600 pointer-events-none" />
            <input
              value={pendingSearch}
              onChange={e => handleFilterChange(() => setPendingSearch(e.target.value))}
              placeholder="Search by name…"
              className="w-full bg-dark-700/60 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-blue/40"
            />
          </div>

          {/* Source filter */}
          <select
            value={pendingSource}
            onChange={e => handleFilterChange(() => setPendingSource(e.target.value))}
            className="bg-dark-700/60 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-neon-blue/40"
          >
            <option value="">All sources</option>
            <option value="airdropalert_rss">AirdropAlert</option>
            <option value="galxe">Galxe</option>
            <option value="manual">Manual</option>
            <option value="cryptorank">CryptoRank</option>
            <option value="community_submission">Community</option>
          </select>

          {/* Status filter */}
          <select
            value={pendingStatus}
            onChange={e => handleFilterChange(() => setPendingStatus(e.target.value))}
            className="bg-dark-700/60 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-neon-blue/40"
          >
            <option value="approved">Approved only</option>
            <option value="pending">Pending only</option>
            <option value="rejected">Rejected only</option>
          </select>

          {/* Verdict filter */}
          <select
            value={pendingVerdict}
            onChange={e => handleFilterChange(() => setPendingVerdict(e.target.value))}
            className="bg-dark-700/60 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-neon-blue/40"
          >
            <option value="">Any verdict</option>
            <option value="act_now">Act Now</option>
            <option value="watch">Watch</option>
            <option value="needs_review">Needs Review</option>
            <option value="skip">Skip</option>
          </select>

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors text-xs"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>

        {pendingLoading && (
          <div className="flex items-center justify-center py-8 text-gray-600">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}

        {!pendingLoading && pending.length === 0 && (
          <p className="text-sm text-gray-600 text-center py-6">
            {hasActiveFilters
              ? 'No results match your filters.'
              : 'No approved imports yet. Approved airdrops will appear here after review.'}
          </p>
        )}

        {!pendingLoading && pending.length > 0 && (
          <>
            <div className="divide-y divide-white/5">
              {pending.map(a => (
                <div key={a.id} className="flex items-center gap-3 py-3">
                  <div className="w-8 h-8 rounded-lg bg-dark-700/60 border border-white/8 flex items-center justify-center shrink-0 overflow-hidden">
                    {a.logo_url
                      ? <img src={a.logo_url} alt={a.name} className="w-full h-full object-cover rounded-lg" />
                      : <span className="text-xs font-bold text-gray-500">{a.name.charAt(0)}</span>}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-semibold text-white truncate max-w-[160px] sm:max-w-none">{a.name}</span>
                      {a.ticker && <span className="text-[10px] font-mono text-gray-500">${a.ticker}</span>}
                      <span className={cn(
                        'text-[10px] rounded-full px-1.5 py-0.5 border',
                        a.review_status === 'rejected'
                          ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                          : 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                      )}>
                        {a.review_status}
                      </span>
                      <VerdictBadge label={a.trust_label} />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-600 flex-wrap">
                      <span>{a.source}</span>
                      <span>· {a.reward_potential} potential</span>
                      {a.expiry_date && <span>· expires {formatDate(a.expiry_date)}</span>}
                      {a.source_url && (
                        <a href={a.source_url} target="_blank" rel="noopener noreferrer"
                          className="hover:text-gray-400 flex items-center gap-0.5 transition-colors">
                          <ExternalLink className="w-2.5 h-2.5" /> listing
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => reject(a)} disabled={actionId === a.id}
                      title="Reject"
                      className="p-1.5 rounded-lg text-gray-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-40">
                      {actionId === a.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <XCircle className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => approve(a)} disabled={actionId === a.id}
                      title="Approve & Publish"
                      className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 transition-colors text-xs font-medium disabled:opacity-40">
                      {actionId === a.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <ShieldCheck className="w-3 h-3" />}
                      Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex flex-col items-center gap-3 pt-4 border-t border-white/5 mt-2">
              <span className="text-xs text-gray-500">
                Page <span className="text-white font-medium">{pendingPage}</span> of <span className="text-white font-medium">{totalPages}</span>
                <span className="text-gray-700"> · {pendingTotal} total</span>
              </span>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setPendingPage(p => Math.max(1, p - 1))}
                  disabled={pendingPage === 1 || pendingLoading}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl border border-white/15 text-gray-300 bg-white/5 hover:bg-white/10 hover:text-white active:scale-95 transition-all text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <button
                  onClick={() => setPendingPage(p => Math.min(totalPages, p + 1))}
                  disabled={pendingPage === totalPages || pendingLoading}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl border border-white/15 text-gray-300 bg-white/5 hover:bg-white/10 hover:text-white active:scale-95 transition-all text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
