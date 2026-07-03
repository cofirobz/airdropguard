import { Fragment, useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Loader2, Brain, CheckCircle2,
  Eye, EyeOff,
  Database, Shield, Activity, Mail, Users, Key, Zap, RefreshCw, Download,
  Inbox, CheckCheck, XCircle, ChevronDown, ChevronUp, ExternalLink,
  FileText, Plus, X, Pencil, Trash2, AlertTriangle, LogOut, ShieldCheck, Gift,
  ImagePlus, Monitor, CalendarClock, BadgeCheck,
} from 'lucide-react';
import type { Airdrop, Blockchain, Category } from '../lib/types';
import { BLOCKCHAIN_OPTIONS, CATEGORY_OPTIONS } from '../lib/types';

// ─── Toast ────────────────────────────────────────────────────────────────────

interface Toast { msg: string; type: 'success' | 'error' }

function ToastBar({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium whitespace-nowrap ${
      toast.type === 'success'
        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
        : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
    }`}>
      {toast.type === 'success'
        ? <CheckCircle2 className="w-4 h-4 shrink-0" />
        : <AlertTriangle className="w-4 h-4 shrink-0" />}
      {toast.msg}
      <button onClick={onDismiss} aria-label="Dismiss notification" className="ml-1 opacity-60 hover:opacity-100 transition-opacity">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, iconBg, iconClass, sub,
}: {
  label: string; value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string; iconClass: string; sub?: string;
}) {
  return (
    <div className="glass-card p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon className={`w-5 h-5 ${iconClass}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-white tabular-nums leading-tight">{value}</p>
        <p className="text-xs text-gray-500 leading-tight mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function ActionCard({
  title,
  count,
  status,
  blurb,
  actionLabel,
  onAction,
}: {
  title: string;
  count: number;
  status: string;
  blurb: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <article className="glass-card p-4 border border-white/10 rounded-2xl">
      <p className="text-lg font-bold text-white tabular-nums">{count}</p>
      <p className="text-sm font-semibold text-gray-100 mt-1">{title}</p>
      <p className="text-xs text-neon-blue mt-1">{status}</p>
      <p className="text-xs text-gray-500 mt-2 min-h-[34px]">{blurb}</p>
      <button
        onClick={onAction}
        className="mt-3 inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-white/[0.08] transition-colors"
      >
        {actionLabel}
      </button>
    </article>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  totalAirdrops: number; publishedAirdrops: number;
  scoredAirdrops: number; analyzedAirdrops: number;
  totalTasks: number; newsletterSubs: number;
  proSubs: number; businessSubs: number;
  activeKeys: number; apiCallsToday: number; apiCallsTotal: number;
  pendingSubmissions: number; approvedSubmissions: number; rejectedSubmissions: number;
}

interface Submission {
  id: string; project_name: string;
  website_url: string | null; twitter_url: string | null;
  discord_url: string | null; telegram_url: string | null;
  blockchain: string | null; category: string | null;
  airdrop_type: string | null; description: string | null;
  tasks_required: string | null; deadline: string | null;
  reward_confirmed: string | null; token_confirmed: string | null;
  eligibility_requirements: string | null; team_info: string | null;
  funding_investors: string | null; whitepaper_url: string | null;
  github_url: string | null; contract_address: string | null;
  audit_url: string | null; requires_wallet_connection: boolean;
  requires_transaction: boolean; requires_payment: boolean;
  requires_seed_phrase: boolean; additional_notes: string | null;
  status: string; admin_notes: string | null; submitted_at: string;
  ai_recommendation: string | null; token_name: string | null;
  token_symbol: string | null; token_address: string | null;
  token_verification: string | null; scam_warnings: string[] | null;
}

interface ScamReport {
  id: string;
  user_id: string | null;
  reporter_email: string | null;
  project_name: string;
  website_url: string | null;
  project_url: string | null;
  wallet_address: string | null;
  contract_address: string | null;
  reason: string | null;
  description: string | null;
  evidence_url: string | null;
  status: 'pending' | 'approved' | 'rejected' | string;
  admin_notes: string | null;
  rep_awarded: boolean | null;
  created_at: string;
  reviewed_at: string | null;
}

// ─── Airdrop form data ────────────────────────────────────────────────────────

type AirdropFormData = {
  name: string; ticker: string; logo_url: string; ai_summary: string;
  website_url: string; twitter_url: string; discord_url: string;
  telegram_url: string; github_url: string; contract_address: string;
  docs_url: string; funding_info: string; investors: string; team_info: string;
  estimated_reward: string; expiry_date: string; time_required: string;
  blockchain: Blockchain[]; category: Category[];
  status: Airdrop['status']; risk_level: Airdrop['risk_level'];
  reward_potential: Airdrop['reward_potential']; difficulty: Airdrop['difficulty'];
  published: boolean; is_featured: boolean; is_trending: boolean; is_sponsored: boolean;
  tasks_text: string;
};

const BLANK_FORM: AirdropFormData = {
  name: '', ticker: '', logo_url: '', ai_summary: '',
  website_url: '', twitter_url: '', discord_url: '', telegram_url: '',
  github_url: '', contract_address: '',
  docs_url: '', funding_info: '', investors: '', team_info: '',
  estimated_reward: '', expiry_date: '', time_required: 'Varies',
  blockchain: [], category: [],
  status: 'Active', risk_level: 'Medium', reward_potential: 'Medium', difficulty: 'Moderate',
  published: false, is_featured: false, is_trending: false, is_sponsored: false,
  tasks_text: '',
};

const SCAM_REPORT_REP = 50;

type BannerPlacement = 'Homepage Hero Banner' | 'Homepage Mid-Page Banner' | 'Airdrop Detail Banner' | 'Dashboard Banner';
type BannerStatus = 'Enquiry' | 'Awaiting Artwork' | 'Ready to Publish' | 'Live' | 'Expired';
type BannerDisplayStatus = 'Active' | 'Scheduled' | 'Expired';
type BannerPaymentState = 'Unpaid' | 'Pending' | 'Paid';

interface BannerAd {
  id: string;
  advertiserName: string;
  contactEmail: string;
  websiteLink: string;
  bannerImageUrl: string;
  destinationUrl: string;
  altText: string;
  placement: BannerPlacement;
  startDate: string;
  endDate: string;
  status: BannerStatus;
  enabled: boolean;
  exclusivePlacement: boolean;
  notes: string;
  paymentState: BannerPaymentState;
  archived: boolean;
  updatedAt: string;
}

type BannerFormData = Omit<BannerAd, 'id' | 'updatedAt'>;

type ContentView = 'airdrops' | 'articles' | 'hero' | 'featured' | 'trending' | 'learn' | 'sections';

interface ControlArticle {
  id: string;
  title: string;
  status: 'draft' | 'scheduled' | 'published';
  updatedAt: string;
}

interface OpsUser {
  id: string;
  email: string;
  createdAt: string;
  lastSeenAt: string;
  plan: 'free' | 'api' | 'premium';
}

const BANNER_PLACEMENT_OPTIONS: BannerPlacement[] = [
  'Homepage Hero Banner',
  'Homepage Mid-Page Banner',
  'Airdrop Detail Banner',
  'Dashboard Banner',
];

const BANNER_STATUS_OPTIONS: BannerStatus[] = ['Enquiry', 'Awaiting Artwork', 'Ready to Publish', 'Live', 'Expired'];

const BLANK_BANNER_FORM: BannerFormData = {
  advertiserName: '',
  contactEmail: '',
  websiteLink: '',
  bannerImageUrl: '',
  destinationUrl: '',
  altText: '',
  placement: 'Homepage Hero Banner',
  startDate: '',
  endDate: '',
  status: 'Enquiry',
  enabled: false,
  exclusivePlacement: true,
  notes: '',
  paymentState: 'Unpaid',
  archived: false,
};

function deriveBannerStatus(status: BannerStatus, startDate: string, endDate: string): BannerStatus {
  if (status === 'Expired') return 'Expired';
  const now = new Date().getTime();
  const endMs = endDate ? new Date(endDate).getTime() : Number.NaN;

  if (Number.isFinite(endMs) && endMs < now) return 'Expired';
  return status;
}

function getBannerStatusClass(status: BannerStatus): string {
  if (status === 'Live') return 'text-emerald-300 border-emerald-500/25 bg-emerald-500/10';
  if (status === 'Ready to Publish') return 'text-sky-300 border-sky-500/25 bg-sky-500/10';
  if (status === 'Awaiting Artwork') return 'text-amber-300 border-amber-500/25 bg-amber-500/10';
  if (status === 'Enquiry') return 'text-violet-300 border-violet-500/25 bg-violet-500/10';
  if (status === 'Expired') return 'text-rose-300 border-rose-500/25 bg-rose-500/10';
  return 'text-gray-300 border-white/15 bg-white/[0.04]';
}

function getBannerDisplayStatus(status: BannerStatus, startDate: string, endDate: string): BannerDisplayStatus {
  const now = Date.now();
  const start = startDate ? new Date(startDate).getTime() : Number.NaN;
  const end = endDate ? new Date(endDate).getTime() : Number.NaN;

  if (status === 'Expired' || (Number.isFinite(end) && end < now)) return 'Expired';
  if ((status === 'Ready to Publish' || status === 'Awaiting Artwork' || status === 'Enquiry') && Number.isFinite(start) && start > now) return 'Scheduled';
  return 'Active';
}

function getBannerDisplayClass(status: BannerDisplayStatus): string {
  if (status === 'Active') return 'text-emerald-300 border-emerald-500/25 bg-emerald-500/10';
  if (status === 'Scheduled') return 'text-sky-300 border-sky-500/25 bg-sky-500/10';
  return 'text-rose-300 border-rose-500/25 bg-rose-500/10';
}

function getPaymentStateClass(state: BannerPaymentState): string {
  if (state === 'Paid') return 'text-emerald-300 border-emerald-500/25 bg-emerald-500/10';
  if (state === 'Pending') return 'text-amber-300 border-amber-500/25 bg-amber-500/10';
  return 'text-gray-300 border-white/15 bg-white/[0.04]';
}

function getBannerNextAction(status: BannerStatus): string {
  if (status === 'Enquiry') return 'Upload artwork';
  if (status === 'Awaiting Artwork') return 'Check link';
  if (status === 'Ready to Publish') return 'Set dates';
  if (status === 'Live') return 'Expire banner';
  return 'Create new banner';
}

function levelFromRep(rep: number) {
  return Math.max(1, Math.floor(rep / 250) + 1);
}

function titleFromLevel(level: number) {
  if (level >= 50) return 'Web3 Veteran';
  if (level >= 35) return 'Airdrop Guardian';
  if (level >= 25) return 'Wallet Guardian';
  if (level >= 15) return 'DeFi Explorer';
  if (level >= 8) return 'Airdrop Hunter';
  return 'New Explorer';
}

async function awardApprovedScamReportRep(userId: string) {
  const { data: existing } = await supabase
    .from('user_reputation')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  const currentRep = Number(existing?.rep ?? 0);
  const newRep = currentRep + SCAM_REPORT_REP;
  const level = levelFromRep(newRep);

  const { error } = await supabase
    .from('user_reputation')
    .upsert({
      user_id: userId,
      rep: newRep,
      level,
      current_title: titleFromLevel(level),
      current_theme: existing?.current_theme ?? 'default',
      weekly_streak: existing?.weekly_streak ?? 0,
      last_login_at: existing?.last_login_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) throw error;

  await supabase
    .from('user_achievements')
    .upsert({
      user_id: userId,
      achievement_key: 'approved_scam_report',
      achievement_name: 'Scam Hunter',
      achievement_description: 'Had a suspicious project report approved by AirdropGuard review.',
    }, { onConflict: 'user_id,achievement_key' });
}

// ─── AirdropFormModal (shared Add + Edit) ─────────────────────────────────────

function AirdropFormModal({
  mode, form, setForm, onClose, onSave, saving,
}: {
  mode: 'add' | 'edit';
  form: AirdropFormData;
  setForm: React.Dispatch<React.SetStateAction<AirdropFormData>>;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  const inp = 'w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-purple/40';
  const lbl = 'block text-[10px] text-gray-500 uppercase tracking-wider mb-1';

  function toggleChain(chain: Blockchain) {
    setForm(f => ({
      ...f,
      blockchain: f.blockchain.includes(chain)
        ? f.blockchain.filter(b => b !== chain)
        : [...f.blockchain, chain],
    }));
  }

  function toggleCat(cat: Category) {
    setForm(f => ({
      ...f,
      category: f.category.includes(cat)
        ? f.category.filter(c => c !== cat)
        : [...f.category, cat],
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl glass-card p-6 space-y-5 relative mb-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-white">{mode === 'add' ? 'Add New Airdrop' : 'Edit Airdrop'}</h2>
          <button onClick={onClose} aria-label="Close airdrop form" className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Project Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. LayerZero" className={inp} />
          </div>
          <div>
            <label className={lbl}>Ticker</label>
            <input value={form.ticker} onChange={e => setForm(f => ({ ...f, ticker: e.target.value.toUpperCase() }))} placeholder="e.g. ZRO" className={`${inp} font-mono`} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Logo URL</label>
            <input value={form.logo_url} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} placeholder="https://..." className={inp} />
          </div>
          <div>
            <label className={lbl}>Contract Address</label>
            <input value={form.contract_address} onChange={e => setForm(f => ({ ...f, contract_address: e.target.value }))} placeholder="0x..." className={`${inp} font-mono`} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Website</label>
            <input value={form.website_url} onChange={e => setForm(f => ({ ...f, website_url: e.target.value }))} placeholder="https://..." className={inp} />
          </div>
          <div>
            <label className={lbl}>Twitter</label>
            <input value={form.twitter_url} onChange={e => setForm(f => ({ ...f, twitter_url: e.target.value }))} placeholder="https://x.com/..." className={inp} />
          </div>
          <div>
            <label className={lbl}>Discord</label>
            <input value={form.discord_url} onChange={e => setForm(f => ({ ...f, discord_url: e.target.value }))} placeholder="https://discord.gg/..." className={inp} />
          </div>
          <div>
            <label className={lbl}>Telegram</label>
            <input value={form.telegram_url} onChange={e => setForm(f => ({ ...f, telegram_url: e.target.value }))} placeholder="https://t.me/..." className={inp} />
          </div>
        </div>

        {/* Trust score hints — used directly by the scorer */}
        <div className="pt-3 border-t border-white/5">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold mb-2.5">Trust Score Hints</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className={lbl}>Docs URL</label>
              <input value={form.docs_url} onChange={e => setForm(f => ({ ...f, docs_url: e.target.value }))} placeholder="https://docs.project.io" className={inp} />
            </div>
            <div>
              <label className={lbl}>GitHub URL</label>
              <input value={form.github_url} onChange={e => setForm(f => ({ ...f, github_url: e.target.value }))} placeholder="https://github.com/..." className={inp} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className={lbl}>Funding Info</label>
              <input value={form.funding_info} onChange={e => setForm(f => ({ ...f, funding_info: e.target.value }))} placeholder='e.g. "$42M Series A"' className={inp} />
            </div>
            <div>
              <label className={lbl}>Investors</label>
              <input value={form.investors} onChange={e => setForm(f => ({ ...f, investors: e.target.value }))} placeholder="e.g. Polychain, a16z" className={inp} />
            </div>
          </div>
          <div>
            <label className={lbl}>Team Info</label>
            <input value={form.team_info} onChange={e => setForm(f => ({ ...f, team_info: e.target.value }))} placeholder="e.g. Founded by ex-Coinbase engineers" className={inp} />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            ['Status', 'status', ['Active', 'Ending Soon', 'Expired']],
            ['Risk', 'risk_level', ['Low', 'Medium', 'High']],
            ['Reward', 'reward_potential', ['Low', 'Medium', 'High']],
            ['Difficulty', 'difficulty', ['Easy', 'Moderate', 'Hard']],
          ] as [string, keyof AirdropFormData, string[]][]).map(([label, key, opts]) => (
            <div key={key}>
              <label className={lbl}>{label}</label>
              <select value={form[key] as string} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-purple/40 cursor-pointer">
                {opts.map(o => <option key={o} value={o} className="bg-dark-900">{o}</option>)}
              </select>
            </div>
          ))}
        </div>

        <div>
          <label className={`${lbl} mb-2`}>Blockchain</label>
          <div className="flex flex-wrap gap-1.5">
            {BLOCKCHAIN_OPTIONS.map(chain => (
              <button key={chain} type="button" onClick={() => toggleChain(chain)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  form.blockchain.includes(chain)
                    ? 'bg-neon-purple/15 border-neon-purple/40 text-neon-purple'
                    : 'bg-transparent border-white/10 text-gray-500 hover:border-white/20'
                }`}>{chain}</button>
            ))}
          </div>
        </div>

        <div>
          <label className={`${lbl} mb-2`}>Category</label>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_OPTIONS.map(cat => (
              <button key={cat} type="button" onClick={() => toggleCat(cat)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  form.category.includes(cat)
                    ? 'bg-neon-blue/15 border-neon-blue/40 text-neon-blue'
                    : 'bg-transparent border-white/10 text-gray-500 hover:border-white/20'
                }`}>{cat}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={lbl}>Est. Reward</label>
            <input value={form.estimated_reward} onChange={e => setForm(f => ({ ...f, estimated_reward: e.target.value }))} placeholder="e.g. $200–$2,000" className={inp} />
          </div>
          <div>
            <label className={lbl}>Expiry Date</label>
            <input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} className={`${inp} [color-scheme:dark]`} />
          </div>
          <div>
            <label className={lbl}>Time Required</label>
            <input value={form.time_required} onChange={e => setForm(f => ({ ...f, time_required: e.target.value }))} placeholder="e.g. 10 mins/week" className={inp} />
          </div>
        </div>

        <div>
          <label className={lbl}>Description / AI Summary</label>
          <textarea value={form.ai_summary} onChange={e => setForm(f => ({ ...f, ai_summary: e.target.value }))}
            placeholder="Brief description of this airdrop opportunity..." rows={3}
            className="w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-purple/40 resize-none" />
        </div>

        <div className="pt-3 border-t border-white/5">
          <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Airdrop Tasks</label>
            <span className="text-[10px] text-gray-600">One task per line</span>
          </div>
          <textarea
            value={form.tasks_text}
            onChange={e => setForm(f => ({ ...f, tasks_text: e.target.value }))}
            placeholder={`Follow official X account
Join Discord
Complete onboarding
Use testnet / bridge / swap
Check eligibility updates`}
            rows={5}
            className="w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-purple/40 resize-none"
          />
          <p className="text-[10px] text-gray-600 mt-1">
            These tasks are saved into the airdrop_tasks table so the customer dashboard can show real tasks and progress.
          </p>
        </div>

        {/* Flags */}
        <div className="flex flex-wrap gap-4 py-2 border-t border-white/5">
          {([
            ['published', 'Publish'],
            ['is_featured', 'Featured'],
            ['is_trending', 'Trending'],
            ['is_sponsored', 'Sponsored'],
          ] as [keyof AirdropFormData, string][]).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer"
              onClick={() => setForm(f => ({ ...f, [key]: !f[key as keyof AirdropFormData] }))}>
              <div className={`w-9 h-5 rounded-full transition-colors relative ${form[key] ? 'bg-emerald-500' : 'bg-dark-600 border border-white/10'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form[key] ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-xs text-gray-400">{label}</span>
            </label>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white border border-white/10 hover:border-white/20 transition-colors">
            Cancel
          </button>
          <button onClick={onSave} disabled={saving || !form.name.trim()}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-medium bg-neon-purple/15 border border-neon-purple/30 text-neon-purple hover:bg-neon-purple/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'add' ? <Plus className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
            {mode === 'add' ? 'Add Airdrop' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DeleteModal ──────────────────────────────────────────────────────────────

function DeleteModal({
  airdrop, onConfirm, onCancel, deleting,
}: {
  airdrop: Airdrop; onConfirm: () => void; onCancel: () => void; deleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm glass-card p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Delete Airdrop</h3>
            <p className="text-sm text-gray-400 mt-1">
              Delete <span className="font-semibold text-white">{airdrop.name}</span>?
            </p>
          </div>
        </div>
        <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
          This will permanently delete this airdrop.
        </p>
        <div className="flex items-center justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white border border-white/10 hover:border-white/20 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={deleting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500/25 transition-colors disabled:opacity-50">
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function BannerFormModal({
  mode,
  form,
  setForm,
  onClose,
  onSave,
}: {
  mode: 'add' | 'edit';
  form: BannerFormData;
  setForm: React.Dispatch<React.SetStateAction<BannerFormData>>;
  onClose: () => void;
  onSave: () => void;
}) {
  const inputClass = 'w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-purple/40';
  const labelClass = 'block text-[10px] text-gray-500 uppercase tracking-wider mb-1';

  const onImageFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setForm((prev) => ({ ...prev, bannerImageUrl: objectUrl }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-3xl glass-card p-6 space-y-5 relative mb-12">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">{mode === 'add' ? 'Create Banner' : 'Edit Banner'}</h2>
            <p className="text-xs text-gray-500 mt-1">Prepare enquiry workflow, upload artwork placeholders, and preview before going live.</p>
          </div>
          <button onClick={onClose} aria-label="Close banner form" className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2">1. Advertiser details</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Project name *</label>
                <input
                  value={form.advertiserName}
                  onChange={(e) => setForm((f) => ({ ...f, advertiserName: e.target.value }))}
                  placeholder="e.g. ZetaChain"
                  className={inputClass}
                />
                <p className="text-[10px] text-gray-600 mt-1">Name shown on the live banner record.</p>
              </div>
              <div>
                <label className={labelClass}>Contact email</label>
                <input
                  value={form.contactEmail}
                  onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                  placeholder="ads@project.com"
                  className={inputClass}
                />
                <p className="text-[10px] text-gray-600 mt-1">Where to request edits or approval.</p>
              </div>
              <div>
                <label className={labelClass}>Website link</label>
                <input
                  value={form.websiteLink}
                  onChange={(e) => setForm((f) => ({ ...f, websiteLink: e.target.value }))}
                  placeholder="https://project.example"
                  className={inputClass}
                />
                <p className="text-[10px] text-gray-600 mt-1">Reference site for manual checks.</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2">2. Banner setup</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Placement *</label>
                <select
                  value={form.placement}
                  onChange={(e) => setForm((f) => ({ ...f, placement: e.target.value as BannerPlacement }))}
                  className="w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-purple/40"
                >
                  {BANNER_PLACEMENT_OPTIONS.map((placement) => (
                    <option key={placement} value={placement} className="bg-dark-900">{placement}</option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-600 mt-1">Each placement is $149 and exclusive.</p>
              </div>
              <div>
                <label className={labelClass}>Destination URL *</label>
                <input
                  value={form.destinationUrl}
                  onChange={(e) => setForm((f) => ({ ...f, destinationUrl: e.target.value }))}
                  placeholder="https://project.example/campaign"
                  className={inputClass}
                />
                <p className="text-[10px] text-gray-600 mt-1">Where users go when they click the ad.</p>
              </div>
              <div>
                <label className={labelClass}>Banner image placeholder</label>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neon-blue/25 bg-neon-blue/10 text-neon-blue text-sm font-medium cursor-pointer hover:bg-neon-blue/20 transition-colors">
                    <ImagePlus className="w-4 h-4" />
                    Upload artwork
                    <input type="file" accept="image/*" className="hidden" onChange={onImageFileSelected} />
                  </label>
                  <input
                    value={form.bannerImageUrl}
                    onChange={(e) => setForm((f) => ({ ...f, bannerImageUrl: e.target.value }))}
                    placeholder="or paste image URL"
                    className={inputClass}
                  />
                </div>
                <p className="text-[10px] text-gray-600 mt-1">Use this to stage creative before publish.</p>
              </div>
              <div>
                <label className={labelClass}>Alt text</label>
                <input
                  value={form.altText}
                  onChange={(e) => setForm((f) => ({ ...f, altText: e.target.value }))}
                  placeholder="Short accessibility description"
                  className={inputClass}
                />
                <p className="text-[10px] text-gray-600 mt-1">Accessibility label for screen readers.</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2">3. Schedule</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Start date</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  className={`${inputClass} [color-scheme:dark]`}
                />
                <p className="text-[10px] text-gray-600 mt-1">Date the banner should first appear.</p>
              </div>
              <div>
                <label className={labelClass}>End date</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  className={`${inputClass} [color-scheme:dark]`}
                />
                <p className="text-[10px] text-gray-600 mt-1">Date the banner should expire.</p>
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as BannerStatus }))}
                  className="w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-purple/40"
                >
                  {BANNER_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status} className="bg-dark-900">{status}</option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-600 mt-1">Move from enquiry to live in clear steps.</p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className={labelClass}>4. Internal notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={3}
            placeholder="Admin notes only: approvals, artwork requests, launch notes."
            className="w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-purple/40 resize-none"
          />
          <p className="text-[10px] text-gray-600 mt-1">Visible to admin team only.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/5">
          <label className="flex items-center gap-2 cursor-pointer">
            <div className={`w-9 h-5 rounded-full transition-colors relative ${form.enabled ? 'bg-emerald-500' : 'bg-dark-600 border border-white/10'}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-xs text-gray-400">Banner enabled</span>
            <input type="checkbox" checked={form.enabled} onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))} className="hidden" />
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <div className={`w-9 h-5 rounded-full transition-colors relative ${form.exclusivePlacement ? 'bg-amber-500' : 'bg-dark-600 border border-white/10'}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.exclusivePlacement ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-xs text-gray-400">Exclusive placement badge</span>
            <input type="checkbox" checked={form.exclusivePlacement} onChange={(e) => setForm((f) => ({ ...f, exclusivePlacement: e.target.checked }))} className="hidden" />
          </label>

          <div>
            <label className={labelClass}>Future Paid Status Placeholder</label>
            <select
              value={form.paymentState}
              onChange={(e) => setForm((f) => ({ ...f, paymentState: e.target.value as BannerPaymentState }))}
              className="w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-purple/40"
            >
              <option value="Unpaid" className="bg-dark-900">Unpaid</option>
              <option value="Pending" className="bg-dark-900">Pending</option>
              <option value="Paid" className="bg-dark-900">Paid</option>
            </select>
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-3">
          <p className="text-[10px] uppercase tracking-wider text-cyan-300 font-semibold mb-2">Banner Preview</p>
          <div className="rounded-xl border border-white/10 bg-dark-900/40 p-3 flex items-center gap-3">
            <div className="w-24 h-14 rounded-lg border border-white/10 bg-white/[0.03] overflow-hidden flex items-center justify-center">
              {form.bannerImageUrl ? (
                <img src={form.bannerImageUrl} alt={form.altText || 'Banner preview'} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] text-gray-500">No image</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{form.advertiserName || 'Advertiser name'}</p>
              <p className="text-[11px] text-gray-400 truncate">{form.destinationUrl || 'Destination URL'}</p>
              <div className="flex items-center gap-2 mt-1.5 text-[10px]">
                <span className="px-2 py-0.5 rounded-full border border-white/15 bg-white/[0.04] text-gray-300">{form.placement}</span>
                {form.exclusivePlacement && <span className="px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300">Exclusive</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white border border-white/10 hover:border-white/20 transition-colors">
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={!form.advertiserName.trim() || !form.destinationUrl.trim()}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-medium bg-neon-purple/15 border border-neon-purple/30 text-neon-purple hover:bg-neon-purple/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mode === 'add' ? <Plus className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
            {mode === 'add' ? 'Create Banner' : 'Save Banner'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user, loading: authLoading, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const [airdrops, setAirdrops] = useState<Airdrop[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
  }, []);

  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [subLoading, setSubLoading] = useState(true);
  const [expandedSub, setExpandedSub] = useState<string | null>(null);
  const [subNotes, setSubNotes] = useState<Record<string, string>>({});
  const [analyzingSub, setAnalyzingSub] = useState<string | null>(null);

  const [scamReports, setScamReports] = useState<ScamReport[]>([]);
  const [scamReportsLoading, setScamReportsLoading] = useState(true);
  const [expandedScamReport, setExpandedScamReport] = useState<string | null>(null);
  const [scamReportNotes, setScamReportNotes] = useState<Record<string, string>>({});
  const [reviewingScamReport, setReviewingScamReport] = useState<string | null>(null);

  // ── Modal state ───────────────────────────────────────────────────────────
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AirdropFormData>(BLANK_FORM);
  const [saving, setSaving] = useState(false);

  const [deletingAirdrop, setDeletingAirdrop] = useState<Airdrop | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshingAll, setRefreshingAll] = useState(false);

  const [banners, setBanners] = useState<BannerAd[]>(() => {
    const today = new Date();
    const end = new Date(today.getTime() + 7 * 86_400_000);
    return [
      {
        id: `banner_${today.getTime()}`,
        advertiserName: 'Example Campaign',
        contactEmail: 'ads@example.com',
        websiteLink: 'https://example.com',
        bannerImageUrl: '',
        destinationUrl: 'https://example.com',
        altText: 'Example campaign banner',
        placement: 'Homepage Hero Banner',
        startDate: today.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        status: 'Enquiry',
        enabled: true,
        exclusivePlacement: true,
        notes: 'Placeholder banner to seed admin workflow.',
        paymentState: 'Pending',
        archived: false,
        updatedAt: new Date().toISOString(),
      },
    ];
  });
  const [bannerModalMode, setBannerModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [bannerForm, setBannerForm] = useState<BannerFormData>(BLANK_BANNER_FORM);
  const [previewBannerId, setPreviewBannerId] = useState<string | null>(null);
  const [contentView, setContentView] = useState<ContentView>('airdrops');
  const [controlArticles, setControlArticles] = useState<ControlArticle[]>([
    { id: 'article-1', title: 'How to avoid fake airdrop clones', status: 'draft', updatedAt: new Date().toISOString() },
    { id: 'article-2', title: 'Layer 2 airdrop playbook 2026', status: 'scheduled', updatedAt: new Date().toISOString() },
    { id: 'article-3', title: 'Wallet hygiene checklist', status: 'published', updatedAt: new Date().toISOString() },
  ]);
  const [homepageHeroTitle, setHomepageHeroTitle] = useState('Discover safer airdrops before you connect');
  const [homepageHeroSubtext, setHomepageHeroSubtext] = useState('AI-assisted intelligence with human-reviewed trust signals.');
  const [featuredProjectId, setFeaturedProjectId] = useState<string>('');
  const [trendingProjectIds, setTrendingProjectIds] = useState<string>('');
  const [learnHighlights, setLearnHighlights] = useState<string>('Airdrop basics\nWallet safety\nScam pattern recognition');
  const [homepageSections, setHomepageSections] = useState<string>('Hero\nFeatured Project\nTrending Grid\nLearn Spotlight');
  const [opsUsers, setOpsUsers] = useState<OpsUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [lastEnrichmentStats, setLastEnrichmentStats] = useState<{
    websites_analyzed: number; docs_found: number; funding_found: number;
    github_found: number; token_detected: number; investors_found: number;
  } | null>(null);

  const pendingBannerEnquiries = useMemo(
    () => banners.filter((b) => b.status === 'Enquiry' || b.status === 'Awaiting Artwork').length,
    [banners]
  );
  const liveBannerAds = useMemo(
    () => banners.filter((b) => deriveBannerStatus(b.status, b.startDate, b.endDate) === 'Live' && b.enabled).length,
    [banners]
  );
  const expiringBannerAds = useMemo(() => {
    const now = new Date().getTime();
    const inSevenDays = now + 7 * 86_400_000;
    return banners.filter((b) => {
      if (!b.endDate) return false;
      const endMs = new Date(b.endDate).getTime();
      return Number.isFinite(endMs) && endMs >= now && endMs <= inSevenDays;
    }).length;
  }, [banners]);
  const pendingScamReports = useMemo(
    () => scamReports.filter((r) => r.status === 'pending').length,
    [scamReports]
  );
  const siteHealthIssues = useMemo(() => {
    const unpublished = (stats?.totalAirdrops ?? 0) - (stats?.publishedAirdrops ?? 0);
    const unscored = (stats?.totalAirdrops ?? 0) - (stats?.scoredAirdrops ?? 0);
    const unanalyzed = (stats?.totalAirdrops ?? 0) - (stats?.analyzedAirdrops ?? 0);
    return Math.max(0, unpublished) + Math.max(0, unscored) + Math.max(0, unanalyzed);
  }, [stats]);

  const expiringListings = useMemo(() => {
    const now = Date.now();
    const soon = now + 7 * 86_400_000;
    return airdrops.filter((a) => {
      if (!a.expiry_date) return false;
      const ts = new Date(a.expiry_date).getTime();
      return Number.isFinite(ts) && ts >= now && ts <= soon;
    });
  }, [airdrops]);

  const failedAiQueue = useMemo(
    () => airdrops.filter((a) => !(a.last_analyzed_at && String(a.last_analyzed_at).trim())),
    [airdrops]
  );

  const missingProjectInfo = useMemo(() => {
    const asRecord = (item: Airdrop) => item as unknown as Record<string, unknown>;
    const asText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

    return airdrops.filter((a) => {
      const rec = asRecord(a);
      const hasLogo = asText(a.logo_url).length > 0;
      const hasGithub = asText(rec.github_url).length > 0;
      const hasDocs = asText(rec.docs_url).length > 0;
      const hasFunding = asText(rec.funding_info).length > 0 || asText(rec.investors).length > 0;
      return !(hasLogo && hasGithub && hasDocs && hasFunding);
    });
  }, [airdrops]);

  const missingLogoCount = useMemo(() => airdrops.filter((a) => !String(a.logo_url ?? '').trim()).length, [airdrops]);
  const missingGithubCount = useMemo(() => airdrops.filter((a) => !String((a as unknown as Record<string, unknown>).github_url ?? '').trim()).length, [airdrops]);
  const missingDocsCount = useMemo(() => airdrops.filter((a) => !String((a as unknown as Record<string, unknown>).docs_url ?? '').trim()).length, [airdrops]);
  const missingFundingCount = useMemo(() => airdrops.filter((a) => {
    const row = a as unknown as Record<string, unknown>;
    return !String(row.funding_info ?? '').trim() && !String(row.investors ?? '').trim();
  }).length, [airdrops]);
  const missingWebsiteCount = useMemo(() => airdrops.filter((a) => !String(a.website_url ?? '').trim()).length, [airdrops]);
  const seoWarningCount = useMemo(() => airdrops.filter((a) => !String(a.ai_summary ?? '').trim()).length, [airdrops]);

  const articlesAwaitingPublication = useMemo(
    () => controlArticles.filter((a) => a.status !== 'published'),
    [controlArticles]
  );

  const bannerDisplaySummary = useMemo(() => {
    let active = 0;
    let scheduled = 0;
    let expired = 0;

    banners.forEach((banner) => {
      const display = getBannerDisplayStatus(banner.status, banner.startDate, banner.endDate);
      if (display === 'Active') active += 1;
      if (display === 'Scheduled') scheduled += 1;
      if (display === 'Expired') expired += 1;
    });

    return { active, scheduled, expired };
  }, [banners]);

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return opsUsers;
    const needle = userSearch.trim().toLowerCase();
    return opsUsers.filter((u) => u.email.toLowerCase().includes(needle));
  }, [opsUsers, userSearch]);

  const newUsersCount = useMemo(() => {
    const last7 = Date.now() - 7 * 86_400_000;
    return opsUsers.filter((u) => new Date(u.createdAt).getTime() >= last7).length;
  }, [opsUsers]);

  const activeUsersCount = useMemo(() => {
    const last14 = Date.now() - 14 * 86_400_000;
    return opsUsers.filter((u) => new Date(u.lastSeenAt).getTime() >= last14).length;
  }, [opsUsers]);

  const apiUsersCount = useMemo(() => opsUsers.filter((u) => u.plan === 'api' || u.plan === 'premium').length, [opsUsers]);
  const premiumUsersCount = stats ? stats.proSubs + stats.businessSubs : 0;

  const featuredListingEnquiries = useMemo(
    () => submissions.filter((s) => (s.airdrop_type ?? '').toLowerCase().includes('featured')).length,
    [submissions]
  );

  const estimatedRevenuePipeline = useMemo(
    () => pendingBannerEnquiries * 149 + featuredListingEnquiries * 299,
    [pendingBannerEnquiries, featuredListingEnquiries]
  );

  const jumpToSection = (id: string) => {
    const section = document.getElementById(id);
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openFirstAirdropMatch = async (
    matcher: (airdrop: Airdrop) => boolean,
    noMatchMessage: string
  ) => {
    const match = airdrops.find(matcher);
    if (!match) {
      showToast(noMatchMessage, 'error');
      return;
    }
    await openEdit(match);
  };

  const fetchOpsUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,email,created_at,last_login_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const rows = (data ?? []) as Array<Record<string, unknown>>;
      const mapped: OpsUser[] = rows.map((row) => ({
        id: String(row.id ?? crypto.randomUUID()),
        email: String(row.email ?? 'unknown@user.local'),
        createdAt: String(row.created_at ?? new Date().toISOString()),
        lastSeenAt: String(row.last_login_at ?? row.created_at ?? new Date().toISOString()),
        plan: 'free',
      }));

      setOpsUsers(mapped);
    } catch {
      const synthetic = submissions
        .slice(0, 20)
        .map((sub, index): OpsUser => ({
          id: `submission-user-${sub.id}`,
          email: sub.website_url ? `founder+${index + 1}@submission.local` : `unknown+${index + 1}@submission.local`,
          createdAt: sub.submitted_at,
          lastSeenAt: sub.submitted_at,
          plan: index % 4 === 0 ? 'premium' : index % 3 === 0 ? 'api' : 'free',
        }));

      setOpsUsers(synthetic);
    } finally {
      setUsersLoading(false);
    }
  }, [submissions]);

  const openAdd = () => { setForm(BLANK_FORM); setEditingId(null); setModalMode('add'); };

  const openAddBanner = () => {
    setBannerForm(BLANK_BANNER_FORM);
    setEditingBannerId(null);
    setBannerModalMode('add');
  };

  const openEditBanner = (banner: BannerAd) => {
    setBannerForm({
      advertiserName: banner.advertiserName,
      contactEmail: banner.contactEmail,
      websiteLink: banner.websiteLink,
      bannerImageUrl: banner.bannerImageUrl,
      destinationUrl: banner.destinationUrl,
      altText: banner.altText,
      placement: banner.placement,
      startDate: banner.startDate,
      endDate: banner.endDate,
      status: banner.status,
      enabled: banner.enabled,
      exclusivePlacement: banner.exclusivePlacement,
      notes: banner.notes,
      paymentState: banner.paymentState,
      archived: banner.archived,
    });
    setEditingBannerId(banner.id);
    setBannerModalMode('edit');
  };

  const saveBannerForm = () => {
    const resolvedStatus = deriveBannerStatus(bannerForm.status, bannerForm.startDate, bannerForm.endDate);

    if (bannerModalMode === 'add') {
      const nextBanner: BannerAd = {
        id: `banner_${Date.now()}`,
        ...bannerForm,
        status: resolvedStatus,
        updatedAt: new Date().toISOString(),
      };
      setBanners((prev) => [nextBanner, ...prev]);
      showToast('Banner created');
    } else {
      setBanners((prev) => prev.map((banner) => {
        if (banner.id !== editingBannerId) return banner;
        return {
          ...banner,
          ...bannerForm,
          status: resolvedStatus,
          updatedAt: new Date().toISOString(),
        };
      }));
      showToast('Banner updated');
    }

    setBannerModalMode(null);
    setEditingBannerId(null);
  };

  const toggleBannerEnabled = (id: string) => {
    setBanners((prev) => prev.map((banner) => {
      if (banner.id !== id) return banner;
      return { ...banner, enabled: !banner.enabled, updatedAt: new Date().toISOString() };
    }));
  };

  const deleteBanner = (id: string) => {
    setBanners((prev) => prev.filter((banner) => banner.id !== id));
    if (previewBannerId === id) setPreviewBannerId(null);
    showToast('Banner deleted');
  };

  const archiveBanner = (id: string) => {
    setBanners((prev) => prev.map((banner) => banner.id === id
      ? { ...banner, archived: true, enabled: false, status: 'Expired', updatedAt: new Date().toISOString() }
      : banner));
    showToast('Banner archived');
  };

  const openEdit = async (a: Airdrop) => {
    let tasksText = '';

    try {
      const { data: taskRows, error } = await supabase
        .from('airdrop_tasks')
        .select('title')
        .eq('airdrop_id', a.id)
        .order('sort_order', { ascending: true });

      if (!error && taskRows) {
        tasksText = taskRows
          .map((task: { title: string | null }) => task.title || '')
          .filter(Boolean)
          .join('\n');
      }
    } catch {
      tasksText = '';
    }

    setForm({
      name: a.name ?? '',
      ticker: a.ticker ?? '',
      logo_url: a.logo_url ?? '',
      ai_summary: a.ai_summary ?? '',
      website_url: a.website_url ?? '',
      twitter_url: a.twitter_url ?? '',
      discord_url: a.discord_url ?? '',
      telegram_url: a.telegram_url ?? '',
      github_url: a.github_url ?? '',
      contract_address: a.contract_address ?? '',
      docs_url: a.docs_url ?? '',
      funding_info: a.funding_info ?? '',
      investors: a.investors ?? '',
      team_info: a.team_info ?? '',
      estimated_reward: a.estimated_reward ?? '',
      expiry_date: a.expiry_date ? a.expiry_date.split('T')[0] : '',
      time_required: a.time_required ?? 'Varies',
      blockchain: (a.blockchain ?? []) as Blockchain[],
      category: (a.category ?? []) as Category[],
      status: a.status,
      risk_level: a.risk_level,
      reward_potential: a.reward_potential,
      difficulty: a.difficulty,
      published: a.published,
      is_featured: a.is_featured,
      is_trending: a.is_trending,
      is_sponsored: a.is_sponsored,
      tasks_text: tasksText,
    });
    setEditingId(a.id);
    setModalMode('edit');
  };

  const saveTasksForAirdrop = async (airdropId: string, tasksText: string) => {
    const taskRows = tasksText
      .split('\n')
      .map(t => t.trim())
      .filter(Boolean);

    await supabase
      .from('airdrop_tasks')
      .delete()
      .eq('airdrop_id', airdropId);

    if (taskRows.length === 0) return 0;

    const { error } = await supabase
      .from('airdrop_tasks')
      .insert(
        taskRows.map((title, index) => ({
          airdrop_id: airdropId,
          title,
          description: '',
          sort_order: index,
        }))
      );

    if (error) throw error;
    return taskRows.length;
  };

  const saveForm = async () => {
    if (!form.name.trim()) return;
    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        ticker: form.ticker.trim(),
        logo_url: form.logo_url.trim(),
        ai_summary: form.ai_summary.trim(),
        website_url: form.website_url.trim(),
        twitter_url: form.twitter_url.trim(),
        discord_url: form.discord_url.trim(),
        telegram_url: form.telegram_url.trim(),
        github_url: form.github_url.trim(),
        contract_address: form.contract_address.trim(),
        docs_url: form.docs_url.trim() || null,
        funding_info: form.funding_info.trim() || null,
        investors: form.investors.trim() || null,
        team_info: form.team_info.trim() || null,
        estimated_reward: form.estimated_reward.trim(),
        expiry_date: form.expiry_date || null,
        time_required: form.time_required.trim(),
        blockchain: form.blockchain,
        category: form.category,
        status: form.status,
        risk_level: form.risk_level,
        reward_potential: form.reward_potential,
        difficulty: form.difficulty,
        published: form.published,
        is_featured: form.is_featured,
        is_trending: form.is_trending,
        is_sponsored: form.is_sponsored,
      };

      if (modalMode === 'add') {
        const base = form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const slug = `${base}-${Date.now().toString(36)}`;

        const { data: newAirdrop, error } = await supabase
          .from('airdrops')
          .insert({
            ...payload,
            slug,
            sort_order: airdrops.length,
            listing_state: 'verified',
          })
          .select('id, name')
          .single();

        if (error) throw error;

        const taskCount = newAirdrop ? await saveTasksForAirdrop(newAirdrop.id, form.tasks_text) : 0;

        if (newAirdrop) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const analyzeRes = await supabase.functions.invoke('analyze-airdrop', {
              body: { airdrop_id: newAirdrop.id, force: true },
              headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
            });
            if (analyzeRes.error) throw analyzeRes.error;
          } catch (analysisErr) {
            showToast(`${form.name} added, but automatic AI enrichment failed: ${analysisErr instanceof Error ? analysisErr.message : 'Unknown error'}`, 'error');
          }
        }

        showToast(`${form.name} added successfully${taskCount ? ` with ${taskCount} task${taskCount !== 1 ? 's' : ''}` : ''} and AI enrichment started`);
        fetchStats();
      } else {
        const { error } = await supabase
          .from('airdrops')
          .update(payload)
          .eq('id', editingId!);

        if (error) throw error;

        const taskCount = await saveTasksForAirdrop(editingId!, form.tasks_text);
        showToast(`${form.name} updated${taskCount ? ` with ${taskCount} task${taskCount !== 1 ? 's' : ''}` : ''}`);
      }

      setModalMode(null);
      fetchAirdrops();
      fetchStats();
    } catch (e) {
      showToast(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingAirdrop) return;
    setDeleting(true);
    try {
      await supabase.from('airdrop_tasks').delete().eq('airdrop_id', deletingAirdrop.id);
      const { error } = await supabase.from('airdrops').delete().eq('id', deletingAirdrop.id);
      if (error) throw error;
      setAirdrops(prev => prev.filter(a => a.id !== deletingAirdrop.id));
      showToast(`${deletingAirdrop.name} deleted`);
      setDeletingAirdrop(null);
      fetchStats();
    } catch (e) {
      showToast(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
    } finally {
      setDeleting(false);
    }
  };

  // ── Access control ────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/auth?redirect=/admin'); return; }
    if (!isAdmin) { navigate('/'); }
  }, [authLoading, user, isAdmin, navigate]);

  // ── Fetch airdrops ─────────────────────────────────────────────────────────
  const fetchAirdrops = useCallback(async () => {
    const { data } = await supabase.from('airdrops').select('*').eq('is_demo', false).not('review_status', 'eq', 'replaced_demo').order('sort_order', { ascending: true });
    if (data) setAirdrops(data as Airdrop[]);
    setLoading(false);
  }, []);

  // ── Fetch stats ───────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    const [r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14] = await Promise.all([
      supabase.from('airdrops').select('*', { count: 'exact', head: true }).eq('is_demo', false).not('review_status', 'eq', 'replaced_demo'),
      supabase.from('airdrops').select('*', { count: 'exact', head: true }).eq('is_demo', false).not('review_status', 'eq', 'replaced_demo').eq('published', true),
      supabase.from('airdrops').select('*', { count: 'exact', head: true }).eq('is_demo', false).not('review_status', 'eq', 'replaced_demo').not('trust_score', 'is', null),
      supabase.from('airdrops').select('*', { count: 'exact', head: true }).eq('is_demo', false).not('review_status', 'eq', 'replaced_demo').not('last_analyzed_at', 'is', null),
      supabase.from('airdrop_tasks').select('*', { count: 'exact', head: true }),
      supabase.from('newsletter_subscribers').select('*', { count: 'exact', head: true }),
      supabase.from('api_subscriptions').select('*', { count: 'exact', head: true }).eq('plan', 'pro').eq('status', 'active'),
      supabase.from('api_subscriptions').select('*', { count: 'exact', head: true }).eq('plan', 'business').eq('status', 'active'),
      supabase.from('api_keys').select('*', { count: 'exact', head: true }).is('revoked_at', null),
      supabase.from('api_usage_logs').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 86_400_000).toISOString()),
      supabase.from('api_usage_logs').select('*', { count: 'exact', head: true }),
      supabase.from('airdrop_submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('airdrop_submissions').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('airdrop_submissions').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
    ]);
    setStats({
      totalAirdrops: r1.count ?? 0, publishedAirdrops: r2.count ?? 0,
      scoredAirdrops: r3.count ?? 0, analyzedAirdrops: r4.count ?? 0,
      totalTasks: r5.count ?? 0, newsletterSubs: r6.count ?? 0,
      proSubs: r7.count ?? 0, businessSubs: r8.count ?? 0,
      activeKeys: r9.count ?? 0, apiCallsToday: r10.count ?? 0,
      apiCallsTotal: r11.count ?? 0, pendingSubmissions: r12.count ?? 0,
      approvedSubmissions: r13.count ?? 0, rejectedSubmissions: r14.count ?? 0,
    });
    setStatsLoading(false);
  }, []);

  const fetchSubmissions = useCallback(async () => {
    setSubLoading(true);
    const { data } = await supabase.from('airdrop_submissions').select('*').order('submitted_at', { ascending: false });
    if (data) {
      setSubmissions(data as Submission[]);
      const notes: Record<string, string> = {};
      (data as Submission[]).forEach(s => { notes[s.id] = s.admin_notes ?? ''; });
      setSubNotes(notes);
    }
    setSubLoading(false);
  }, []);

  const fetchScamReports = useCallback(async () => {
    setScamReportsLoading(true);

    try {
      const { data, error } = await supabase
        .from('scam_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = (data ?? []) as ScamReport[];
      setScamReports(rows);

      const notes: Record<string, string> = {};
      rows.forEach(report => { notes[report.id] = report.admin_notes ?? ''; });
      setScamReportNotes(notes);
    } catch (error) {
      console.warn('scam_reports unavailable', error);
      setScamReports([]);
    } finally {
      setScamReportsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAdmin) {
      fetchAirdrops();
      fetchStats();
      fetchSubmissions();
      fetchScamReports();
    }
  }, [authLoading, isAdmin, fetchAirdrops, fetchStats, fetchSubmissions, fetchScamReports]);

  useEffect(() => {
    if (isAdmin) {
      fetchOpsUsers();
    }
  }, [isAdmin, fetchOpsUsers]);

  const updateSubmissionStatus = async (id: string, status: string) => {
    await supabase.from('airdrop_submissions').update({ status, reviewed_at: new Date().toISOString() }).eq('id', id);
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    fetchStats();
  };


  const updateScamReportStatus = async (report: ScamReport, status: 'approved' | 'rejected' | 'pending') => {
    setReviewingScamReport(report.id);

    try {
      const patch: Record<string, unknown> = {
        status,
        admin_notes: scamReportNotes[report.id] ?? report.admin_notes ?? '',
        reviewed_at: status === 'pending' ? null : new Date().toISOString(),
      };

      let awarded = false;

      if (status === 'approved' && report.user_id && !report.rep_awarded) {
        await awardApprovedScamReportRep(report.user_id);
        patch.rep_awarded = true;
        awarded = true;
      }

      const { error } = await supabase
        .from('scam_reports')
        .update(patch)
        .eq('id', report.id);

      if (error) throw error;

      setScamReports(prev => prev.map(r => r.id === report.id ? {
        ...r,
        status,
        admin_notes: String(patch.admin_notes ?? ''),
        reviewed_at: patch.reviewed_at as string | null,
        rep_awarded: typeof patch.rep_awarded === 'boolean' ? patch.rep_awarded : r.rep_awarded,
      } : r));

      showToast(
        status === 'approved'
          ? `Scam report approved${awarded ? ` · ${SCAM_REPORT_REP} REP awarded` : ''}`
          : status === 'rejected'
          ? 'Scam report rejected'
          : 'Scam report reset to pending'
      );
    } catch (error) {
      showToast(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setReviewingScamReport(null);
    }
  };

  const saveScamReportNotes = async (report: ScamReport) => {
    const { error } = await supabase
      .from('scam_reports')
      .update({ admin_notes: scamReportNotes[report.id] ?? '' })
      .eq('id', report.id);

    if (error) {
      showToast(`Error: ${error.message}`, 'error');
      return;
    }

    setScamReports(prev => prev.map(r => r.id === report.id ? { ...r, admin_notes: scamReportNotes[report.id] ?? '' } : r));
    showToast('Scam report notes saved');
  };

  const saveAdminNotes = async (id: string) => {
    await supabase.from('airdrop_submissions').update({ admin_notes: subNotes[id] ?? '' }).eq('id', id);
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, admin_notes: subNotes[id] ?? '' } : s));
  };

  const analyzeSubmission = async (sub: Submission) => {
    setAnalyzingSub(sub.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('analyze-airdrop', {
        body: { submission_id: sub.id },
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      if (res.error) throw new Error(res.error.message);
      showToast(`${sub.project_name}: AI analysis complete`);
      const { data } = await supabase.from('airdrop_submissions').select('*').eq('id', sub.id).single();
      if (data) setSubmissions(prev => prev.map(s => s.id === sub.id ? data as Submission : s));
    } catch (e) {
      showToast(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
    } finally {
      setAnalyzingSub(null);
    }
  };

  const runAnalysis = async (airdrop: Airdrop, force = false) => {
    setAnalyzing(airdrop.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('analyze-airdrop', {
        body: { airdrop_id: airdrop.id, force },
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      if (res.error) throw new Error(res.error.message);
      const result = res.data as { success: boolean; cached?: boolean; enrichment_stats?: typeof lastEnrichmentStats };
      if (!result.cached && result.enrichment_stats) setLastEnrichmentStats(result.enrichment_stats);
      showToast(result.cached ? `${airdrop.name}: cached result returned` : `${airdrop.name}: analysis complete`);
      const { data } = await supabase.from('airdrops').select('*').eq('id', airdrop.id).single();
      if (data) { setAirdrops(prev => prev.map(a => a.id === airdrop.id ? data as Airdrop : a)); fetchStats(); }
    } catch (e) {
      showToast(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
    } finally {
      setAnalyzing(null);
    }
  };

  const refreshAllAnalysis = async () => {
    setRefreshingAll(true);
    const { data: { session } } = await supabase.auth.getSession();
    let succeeded = 0;
    let failed = 0;
    for (const airdrop of airdrops) {
      try {
        const res = await supabase.functions.invoke('analyze-airdrop', {
          body: { airdrop_id: airdrop.id, force: true },
          headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
        });
        if (res.error) throw new Error(res.error.message);
        succeeded++;
      } catch {
        failed++;
      }
    }
    await fetchAirdrops();
    await fetchStats();
    if (failed === 0) {
      showToast(`AI analysis refreshed for ${succeeded} airdrop${succeeded !== 1 ? 's' : ''}`);
    } else {
      showToast(`${succeeded} succeeded, ${failed} failed`, 'error');
    }
    setRefreshingAll(false);
  };

  // ─────────────────────────────────────────────────────────────────────────

  if (authLoading || (loading && isAdmin)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-neon-purple animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-gray-400 text-sm mt-1">{airdrops.length} airdrops total</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={openAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neon-purple/10 border border-neon-purple/25 text-neon-purple hover:bg-neon-purple/20 transition-colors text-sm font-medium">
            <Plus className="w-4 h-4" /> Add Airdrop
          </button>
          <Link to="/admin/airdrop-import"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neon-blue/10 border border-neon-blue/25 text-neon-blue hover:bg-neon-blue/20 transition-colors text-sm font-medium">
            <Download className="w-4 h-4" /> Import
          </Link>
          <button
            onClick={refreshAllAnalysis}
            disabled={refreshingAll || airdrops.length === 0}
            title="Refresh AI analysis for all airdrops"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 hover:bg-white/5 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {refreshingAll
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Brain className="w-4 h-4" />}
            {refreshingAll ? 'Analyzing…' : 'Refresh All AI'}
          </button>
          <button onClick={() => { fetchAirdrops(); fetchStats(); fetchSubmissions(); fetchScamReports(); }}
            aria-label="Refresh admin data"
            className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={async () => { await signOut(); navigate('/'); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-500/20 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors text-sm"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
          {lastEnrichmentStats && (
            <div className="flex items-center gap-2 text-[10px] text-gray-500 border-l border-white/10 pl-3 ml-1">
              <span className="text-gray-400 font-medium">Last enrichment:</span>
              <span className={lastEnrichmentStats.websites_analyzed ? 'text-sky-400' : 'text-gray-600'}>Sites {lastEnrichmentStats.websites_analyzed}</span>
              <span className={lastEnrichmentStats.docs_found ? 'text-emerald-400' : 'text-gray-600'}>Docs {lastEnrichmentStats.docs_found}</span>
              <span className={lastEnrichmentStats.github_found ? 'text-violet-400' : 'text-gray-600'}>GitHub {lastEnrichmentStats.github_found}</span>
              <span className={lastEnrichmentStats.funding_found ? 'text-amber-400' : 'text-gray-600'}>Funding {lastEnrichmentStats.funding_found}</span>
              <span className={lastEnrichmentStats.token_detected ? 'text-blue-400' : 'text-gray-600'}>Token {lastEnrichmentStats.token_detected}</span>
              <span className={lastEnrichmentStats.investors_found ? 'text-rose-400' : 'text-gray-600'}>Investors {lastEnrichmentStats.investors_found}</span>
            </div>
          )}
        </div>
      </div>

      <section id="admin-needs-attention">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-amber-300">🚨 Needs Attention Today</h2>
          {statsLoading && <Loader2 className="w-3 h-3 text-gray-600 animate-spin" />}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          <ActionCard
            title="Pending Airdrop Reviews"
            count={stats?.pendingSubmissions ?? 0}
            status="Needs review"
            blurb="Approve, reject, or request more info."
            actionLabel="Review Submission"
            onAction={() => jumpToSection('admin-submissions')}
          />
          <ActionCard
            title="Banner Enquiries"
            count={pendingBannerEnquiries}
            status="Waiting for artwork"
            blurb="Activate and schedule campaigns quickly."
            actionLabel="Manage Banner"
            onAction={() => jumpToSection('admin-advertising')}
          />
          <ActionCard
            title="Scam Reports"
            count={pendingScamReports}
            status="Needs triage"
            blurb="Review reports and protect user trust."
            actionLabel="Open Reports"
            onAction={() => jumpToSection('admin-scam-reports')}
          />
          <ActionCard
            title="Expiring Listings"
            count={expiringListings.length}
            status="Ending in 7 days"
            blurb="Renew, replace, or expire safely."
            actionLabel="Publish Project"
            onAction={() => jumpToSection('admin-airdrops')}
          />
          <ActionCard
            title="Failed AI Analyses"
            count={failedAiQueue.length}
            status="AI queue"
            blurb="Projects with no fresh analysis data."
            actionLabel="Refresh AI"
            onAction={() => jumpToSection('admin-ai-control')}
          />
          <ActionCard
            title="Missing Project Information"
            count={missingProjectInfo.length}
            status="Content quality"
            blurb="Fill docs, GitHub, funding, and logos."
            actionLabel="Fix Project"
            onAction={() => jumpToSection('admin-site-health')}
          />
          <ActionCard
            title="Articles Awaiting Publication"
            count={articlesAwaitingPublication.length}
            status="Content pending"
            blurb="Draft and scheduled articles waiting to go live."
            actionLabel="Open Articles"
            onAction={() => {
              setContentView('articles');
              jumpToSection('admin-content');
            }}
          />
        </div>
      </section>

      <section id="admin-content" className="rounded-2xl border border-sky-500/20 bg-sky-500/[0.05] p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-sky-200">CONTENT</h2>
            <p className="text-xs text-gray-300 mt-1">Run homepage and publishing from one place.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => { setContentView('airdrops'); jumpToSection('admin-airdrops'); }} className="px-3 py-1.5 rounded-lg border border-sky-400/25 bg-sky-500/10 text-xs text-sky-200">Manage Airdrops</button>
            <button onClick={() => setContentView('articles')} className="px-3 py-1.5 rounded-lg border border-sky-400/25 bg-sky-500/10 text-xs text-sky-200">Manage Articles</button>
            <button onClick={() => setContentView('hero')} className="px-3 py-1.5 rounded-lg border border-sky-400/25 bg-sky-500/10 text-xs text-sky-200">Edit Homepage Hero</button>
            <button onClick={() => setContentView('featured')} className="px-3 py-1.5 rounded-lg border border-sky-400/25 bg-sky-500/10 text-xs text-sky-200">Feature Project</button>
            <button onClick={() => setContentView('trending')} className="px-3 py-1.5 rounded-lg border border-sky-400/25 bg-sky-500/10 text-xs text-sky-200">Trending Projects</button>
            <button onClick={() => setContentView('learn')} className="px-3 py-1.5 rounded-lg border border-sky-400/25 bg-sky-500/10 text-xs text-sky-200">Learn Articles</button>
            <button onClick={() => setContentView('sections')} className="px-3 py-1.5 rounded-lg border border-sky-400/25 bg-sky-500/10 text-xs text-sky-200">Homepage Sections</button>
          </div>
        </div>

        {contentView === 'articles' && (
          <div className="glass-card p-4">
            <p className="text-xs uppercase tracking-wider text-sky-200 mb-2">Articles</p>
            <div className="space-y-2">
              {controlArticles.map((article) => (
                <div key={article.id} className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-xs">
                  <div>
                    <p className="text-white font-medium">{article.title}</p>
                    <p className="text-gray-500">{article.status}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setControlArticles((prev) => prev.map((row) => row.id === article.id ? { ...row, status: 'draft', updatedAt: new Date().toISOString() } : row))}
                      className="px-2.5 py-1 rounded-lg border border-white/15 text-gray-300"
                    >Draft</button>
                    <button
                      onClick={() => setControlArticles((prev) => prev.map((row) => row.id === article.id ? { ...row, status: 'published', updatedAt: new Date().toISOString() } : row))}
                      className="px-2.5 py-1 rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                    >Publish</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {contentView === 'hero' && (
          <div className="glass-card p-4 space-y-3">
            <p className="text-xs uppercase tracking-wider text-sky-200">Homepage Hero</p>
            <input value={homepageHeroTitle} onChange={(e) => setHomepageHeroTitle(e.target.value)} className="w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white" />
            <textarea value={homepageHeroSubtext} onChange={(e) => setHomepageHeroSubtext(e.target.value)} rows={2} className="w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white" />
            <button onClick={() => window.open('/', '_blank', 'noopener,noreferrer')} className="px-3 py-1.5 rounded-lg border border-sky-400/25 bg-sky-500/10 text-xs text-sky-200">Preview Homepage</button>
          </div>
        )}

        {contentView === 'featured' && (
          <div className="glass-card p-4 space-y-3">
            <p className="text-xs uppercase tracking-wider text-sky-200">Featured Project</p>
            <select value={featuredProjectId} onChange={(e) => setFeaturedProjectId(e.target.value)} className="w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white">
              <option value="">Select project</option>
              {airdrops.slice(0, 30).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <button
              onClick={async () => {
                if (!featuredProjectId) {
                  showToast('Select a project first', 'error');
                  return;
                }
                const project = airdrops.find((a) => a.id === featuredProjectId);
                if (!project) {
                  showToast('Selected project not found', 'error');
                  return;
                }
                await openEdit(project);
              }}
              className="px-3 py-1.5 rounded-lg border border-sky-400/25 bg-sky-500/10 text-xs text-sky-200"
            >Feature Project</button>
          </div>
        )}

        {contentView === 'trending' && (
          <div className="glass-card p-4 space-y-3">
            <p className="text-xs uppercase tracking-wider text-sky-200">Trending Projects</p>
            <textarea value={trendingProjectIds} onChange={(e) => setTrendingProjectIds(e.target.value)} rows={3} placeholder="Enter project IDs, one per line" className="w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white" />
            <button
              onClick={async () => {
                const ids = trendingProjectIds.split('\n').map((id) => id.trim()).filter(Boolean);
                if (!ids.length) {
                  showToast('Enter at least one project ID', 'error');
                  return;
                }
                const project = airdrops.find((a) => ids.includes(a.id));
                if (!project) {
                  showToast('No matching project found', 'error');
                  return;
                }
                await openEdit(project);
              }}
              className="px-3 py-1.5 rounded-lg border border-sky-400/25 bg-sky-500/10 text-xs text-sky-200"
            >Update Trending</button>
          </div>
        )}

        {contentView === 'learn' && (
          <div className="glass-card p-4 space-y-3">
            <p className="text-xs uppercase tracking-wider text-sky-200">Learn Articles</p>
            <textarea value={learnHighlights} onChange={(e) => setLearnHighlights(e.target.value)} rows={3} className="w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white" />
            <button onClick={() => window.open('/learn', '_blank', 'noopener,noreferrer')} className="px-3 py-1.5 rounded-lg border border-sky-400/25 bg-sky-500/10 text-xs text-sky-200">Open Learn Page</button>
          </div>
        )}

        {contentView === 'sections' && (
          <div className="glass-card p-4 space-y-3">
            <p className="text-xs uppercase tracking-wider text-sky-200">Homepage Sections</p>
            <textarea value={homepageSections} onChange={(e) => setHomepageSections(e.target.value)} rows={3} className="w-full bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white" />
            <button onClick={() => window.open('/', '_blank', 'noopener,noreferrer')} className="px-3 py-1.5 rounded-lg border border-sky-400/25 bg-sky-500/10 text-xs text-sky-200">Open Homepage</button>
          </div>
        )}
      </section>

      <section id="admin-ai-control" className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.05] p-4 space-y-3">
        <h2 className="text-sm font-bold text-violet-200">AI CONTROL</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <button onClick={refreshAllAnalysis} className="px-3 py-2 rounded-xl border border-violet-400/25 bg-violet-500/10 text-xs text-violet-200">Refresh all projects</button>
          <button onClick={() => jumpToSection('admin-ai-queue')} className="px-3 py-2 rounded-xl border border-violet-400/25 bg-violet-500/10 text-xs text-violet-200">Failed AI queue</button>
          <button onClick={() => openFirstAirdropMatch((a) => !(a.last_analyzed_at && String(a.last_analyzed_at).trim()), 'No failed AI analysis found')} className="px-3 py-2 rounded-xl border border-violet-400/25 bg-violet-500/10 text-xs text-violet-200">Reanalyse project</button>
          <button onClick={() => window.open('https://status.openai.com', '_blank', 'noopener,noreferrer')} className="px-3 py-2 rounded-xl border border-violet-400/25 bg-violet-500/10 text-xs text-violet-200">OpenAI status</button>
        </div>
        <div className="text-xs text-gray-300">AI health: {stats?.analyzedAirdrops ?? 0}/{stats?.totalAirdrops ?? 0} projects analysed.</div>
      </section>

      <section id="admin-ai-queue" className="glass-card p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs uppercase tracking-wider text-violet-300 font-semibold">Failed AI queue</h3>
          <span className="text-xs text-gray-400">{failedAiQueue.length} pending</span>
        </div>
        <div className="space-y-2">
          {failedAiQueue.slice(0, 8).map((airdrop) => (
            <div key={airdrop.id} className="flex items-center justify-between border border-white/10 rounded-xl px-3 py-2 text-xs">
              <span className="text-white">{airdrop.name}</span>
              <button onClick={() => runAnalysis(airdrop, true)} className="px-2.5 py-1 rounded-lg border border-violet-500/25 bg-violet-500/10 text-violet-300">Refresh AI</button>
            </div>
          ))}
          {failedAiQueue.length === 0 && <p className="text-xs text-gray-500">No failed AI analyses.</p>}
        </div>
      </section>

      <section id="admin-site-health" className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.04] p-4 space-y-3">
        <h2 className="text-sm font-bold text-rose-200">SITE HEALTH</h2>
        <div className="space-y-2 text-xs">
          {[
            { label: 'Broken links (missing website URL)', count: missingWebsiteCount, action: () => openFirstAirdropMatch((a) => !String(a.website_url ?? '').trim(), 'No website issues detected') },
            { label: 'Missing logos', count: missingLogoCount, action: () => openFirstAirdropMatch((a) => !String(a.logo_url ?? '').trim(), 'No logo issues detected') },
            { label: 'Missing GitHub', count: missingGithubCount, action: () => openFirstAirdropMatch((a) => !String((a as unknown as Record<string, unknown>).github_url ?? '').trim(), 'No GitHub issues detected') },
            { label: 'Missing Docs', count: missingDocsCount, action: () => openFirstAirdropMatch((a) => !String((a as unknown as Record<string, unknown>).docs_url ?? '').trim(), 'No docs issues detected') },
            { label: 'Missing Funding', count: missingFundingCount, action: () => openFirstAirdropMatch((a) => !String((a as unknown as Record<string, unknown>).funding_info ?? '').trim() && !String((a as unknown as Record<string, unknown>).investors ?? '').trim(), 'No funding issues detected') },
            { label: 'Sitemap health', count: 0, action: () => window.open('/sitemap.xml', '_blank', 'noopener,noreferrer') },
            { label: 'SEO warnings (missing summary)', count: seoWarningCount, action: () => openFirstAirdropMatch((a) => !String(a.ai_summary ?? '').trim(), 'No SEO warnings detected') },
            { label: 'Expiring projects', count: expiringListings.length, action: () => jumpToSection('admin-airdrops') },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between border border-white/10 rounded-xl px-3 py-2">
              <div>
                <p className="text-gray-100">{row.label}</p>
                <p className="text-gray-500">{row.count} items</p>
              </div>
              <button onClick={row.action} className="px-2.5 py-1 rounded-lg border border-rose-500/25 bg-rose-500/10 text-rose-200">Fix</button>
            </div>
          ))}
        </div>
      </section>

      <section id="admin-users" className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-white">USERS</h2>
          <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search users" className="w-52 bg-dark-900/60 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
          <div className="rounded-xl border border-white/10 px-3 py-2"><p className="text-gray-500">New users</p><p className="text-white font-semibold">{newUsersCount}</p></div>
          <div className="rounded-xl border border-white/10 px-3 py-2"><p className="text-gray-500">Active users</p><p className="text-white font-semibold">{activeUsersCount}</p></div>
          <div className="rounded-xl border border-white/10 px-3 py-2"><p className="text-gray-500">API users</p><p className="text-white font-semibold">{apiUsersCount}</p></div>
          <div className="rounded-xl border border-white/10 px-3 py-2"><p className="text-gray-500">Premium users</p><p className="text-white font-semibold">{premiumUsersCount}</p></div>
          <div className="rounded-xl border border-white/10 px-3 py-2"><p className="text-gray-500">Latest signups</p><p className="text-white font-semibold">{opsUsers.length}</p></div>
        </div>
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-xs min-w-[680px]">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-3 py-2 text-gray-400">Email</th>
                <th className="text-left px-3 py-2 text-gray-400">Plan</th>
                <th className="text-left px-3 py-2 text-gray-400">Created</th>
                <th className="text-left px-3 py-2 text-gray-400">Last seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(usersLoading ? [] : filteredUsers.slice(0, 20)).map((u) => (
                <tr key={u.id}>
                  <td className="px-3 py-2 text-gray-200">{u.email}</td>
                  <td className="px-3 py-2 text-gray-400 capitalize">{u.plan}</td>
                  <td className="px-3 py-2 text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-3 py-2 text-gray-500">{new Date(u.lastSeenAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {usersLoading && <p className="px-3 py-2 text-xs text-gray-500">Loading users...</p>}
        </div>
      </section>

      <section id="admin-revenue" className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-4 space-y-3">
        <h2 className="text-sm font-bold text-emerald-200">REVENUE</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
          <div className="rounded-xl border border-emerald-500/20 px-3 py-2"><p className="text-emerald-100/80">Banner enquiries</p><p className="text-white font-semibold">{pendingBannerEnquiries}</p></div>
          <div className="rounded-xl border border-emerald-500/20 px-3 py-2"><p className="text-emerald-100/80">Featured enquiries</p><p className="text-white font-semibold">{featuredListingEnquiries}</p></div>
          <div className="rounded-xl border border-emerald-500/20 px-3 py-2"><p className="text-emerald-100/80">API subscriptions</p><p className="text-white font-semibold">{stats ? stats.proSubs + stats.businessSubs : 0}</p></div>
          <div className="rounded-xl border border-emerald-500/20 px-3 py-2"><p className="text-emerald-100/80">Revenue summary</p><p className="text-white font-semibold">${estimatedRevenuePipeline}</p></div>
          <div className="rounded-xl border border-emerald-500/20 px-3 py-2"><p className="text-emerald-100/80">Stripe status</p><p className="text-white font-semibold">Ready when re-enabled</p></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => jumpToSection('admin-advertising')} className="px-3 py-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-xs text-emerald-200">Manage Banner</button>
          <button onClick={() => jumpToSection('admin-submissions')} className="px-3 py-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-xs text-emerald-200">Review Submission</button>
          <button onClick={() => window.open('/pricing', '_blank', 'noopener,noreferrer')} className="px-3 py-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-xs text-emerald-200">Open API Access</button>
        </div>
      </section>

      {/* ── Airdrop table ──────────────────────────────────────────────────── */}
      <section id="admin-advertising">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Monitor className="w-3.5 h-3.5" />
              Banner Advertisement Management
            </h2>
            <p className="text-[11px] text-gray-500 mt-1">Admin preparation flow only using frontend state. No payment handling or backend persistence in this section.</p>
          </div>
          <button
            onClick={openAddBanner}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neon-blue/10 border border-neon-blue/25 text-neon-blue hover:bg-neon-blue/20 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Create Banner
          </button>
        </div>

        <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.04] p-3 mb-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1 text-cyan-200">
            <CalendarClock className="w-3.5 h-3.5" />
            Enquiry to live workflow
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-amber-200">
            <BadgeCheck className="w-3.5 h-3.5" />
            Exclusive placement badge supported
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-1 text-gray-300">
            Future paid status placeholder included
          </span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 mb-3">
          <p className="text-[11px] font-semibold text-gray-200 mb-2">Banner workflow</p>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
            {['1. Enquiry received', '2. Artwork received', '3. Ready to publish', '4. Live', '5. Expired'].map((step) => (
              <div key={step} className="rounded-xl border border-white/10 bg-dark-900/40 px-2.5 py-2 text-gray-300">
                {step}
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-gray-500">
            <span className="rounded-full border border-white/10 px-2 py-0.5">Upload artwork</span>
            <span className="rounded-full border border-white/10 px-2 py-0.5">Check link</span>
            <span className="rounded-full border border-white/10 px-2 py-0.5">Set dates</span>
            <span className="rounded-full border border-white/10 px-2 py-0.5">Publish banner</span>
            <span className="rounded-full border border-white/10 px-2 py-0.5">Expire banner</span>
          </div>
        </div>

        <div className="glass-card overflow-x-auto">
          <table className="w-full text-sm min-w-[1080px]">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Banner Preview</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Advertiser</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Placement</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Start Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">End Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Next Action</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Future Paid</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Toggle</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {banners.map((banner) => {
                const effectiveStatus = deriveBannerStatus(banner.status, banner.startDate, banner.endDate);
                const displayStatus = getBannerDisplayStatus(banner.status, banner.startDate, banner.endDate);
                return (
                  <tr key={banner.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="w-28 h-14 rounded-lg border border-white/10 bg-white/[0.03] overflow-hidden flex items-center justify-center">
                        {banner.bannerImageUrl ? (
                          <img src={banner.bannerImageUrl} alt={banner.altText || 'Banner'} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] text-gray-500">No image</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-white">{banner.advertiserName}</div>
                      <a href={banner.destinationUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-gray-500 hover:text-neon-blue inline-flex items-center gap-1 mt-0.5">
                        {banner.destinationUrl.replace(/^https?:\/\//, '')}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] px-2.5 py-1 rounded-full border border-white/15 bg-white/[0.04] text-gray-300">{banner.placement}</span>
                        {banner.exclusivePlacement && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-500/25 bg-amber-500/10 text-amber-300">Exclusive</span>
                        )}
                        {banner.archived && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/20 bg-white/[0.06] text-gray-300">Archived</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold border rounded-full px-2.5 py-1 ${getBannerDisplayClass(displayStatus)}`}>
                        {displayStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{banner.startDate || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{banner.endDate || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] px-2.5 py-1 rounded-full border border-white/15 bg-white/[0.04] text-gray-300">
                        {getBannerNextAction(effectiveStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold border rounded-full px-2.5 py-1 ${getPaymentStateClass(banner.paymentState)}`}>
                        {banner.paymentState}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleBannerEnabled(banner.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-semibold transition-colors ${banner.enabled ? 'text-emerald-300 border-emerald-500/25 bg-emerald-500/10' : 'text-gray-400 border-white/15 bg-white/[0.04]'}`}
                        title={banner.enabled ? 'Disable banner' : 'Enable banner'}
                      >
                        {banner.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setPreviewBannerId(previewBannerId === banner.id ? null : banner.id)}
                          title="Preview banner"
                          className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditBanner(banner)}
                          title="Edit banner"
                          className="p-1.5 rounded-lg hover:bg-sky-500/10 text-gray-500 hover:text-sky-400 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteBanner(banner.id)}
                          title="Delete banner"
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-gray-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {!banner.archived && (
                          <button
                            onClick={() => archiveBanner(banner.id)}
                            title="Archive banner"
                            className="px-2 py-1 rounded-lg border border-white/15 text-[10px] text-gray-300 hover:bg-white/10"
                          >
                            Archive
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {previewBannerId && (() => {
          const banner = banners.find((row) => row.id === previewBannerId);
          if (!banner) return null;
          return (
            <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-cyan-300 font-semibold">Preview Banner</p>
                  <p className="text-sm text-white font-semibold mt-1">{banner.advertiserName} · {banner.placement}</p>
                  <span className="inline-flex mt-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                    Sponsored
                  </span>
                </div>
                <button onClick={() => setPreviewBannerId(null)} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <a
                href={banner.destinationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl border border-cyan-500/20 bg-[linear-gradient(145deg,rgba(8,145,178,0.14),rgba(8,20,42,0.94))] p-3 hover:bg-[linear-gradient(145deg,rgba(8,145,178,0.2),rgba(8,20,42,0.98))] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-36 h-16 rounded-lg overflow-hidden border border-white/10 bg-white/[0.03] flex items-center justify-center shrink-0">
                    {banner.bannerImageUrl ? (
                      <img src={banner.bannerImageUrl} alt={banner.altText || 'Banner preview'} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-gray-500">Image placeholder</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{banner.altText || banner.advertiserName}</p>
                    <p className="text-xs text-gray-300 mt-1 truncate">{banner.destinationUrl}</p>
                    <div className="mt-2 flex items-center gap-2 text-[10px]">
                      <span className="rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-1 text-gray-300">{banner.placement}</span>
                      <span className={`rounded-full border px-2.5 py-1 ${getBannerStatusClass(deriveBannerStatus(banner.status, banner.startDate, banner.endDate))}`}>{deriveBannerStatus(banner.status, banner.startDate, banner.endDate)}</span>
                    </div>
                  </div>
                </div>
              </a>
            </div>
          );
        })()}
      </section>

      <section id="admin-airdrops">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Airdrops</h2>
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-sm min-w-[680px]">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Risk</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Score</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Expiry</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {airdrops.map(a => {
                const expiry = a.expiry_date
                  ? new Date(a.expiry_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
                  : null;
                const riskCls = a.risk_level === 'Low' ? 'text-emerald-400' : a.risk_level === 'High' ? 'text-rose-400' : 'text-amber-400';
                const scoreCls = a.trust_score == null ? 'text-gray-600' : a.trust_score >= 75 ? 'text-emerald-400' : a.trust_score >= 50 ? 'text-amber-400' : 'text-rose-400';
                return (
                  <tr key={a.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-dark-700 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                          {a.logo_url
                            ? <img src={a.logo_url} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            : <span className="text-xs font-bold gradient-text">{a.name[0]}</span>}
                        </div>
                        <div>
                          <div className="font-medium text-white text-sm leading-tight">{a.name}</div>
                          {a.ticker && <div className="text-[10px] text-gray-500 font-mono">{a.ticker}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs text-gray-400">
                        {(a.category ?? []).slice(0, 2).join(', ') || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`text-xs font-medium ${
                        a.status === 'Active' ? 'text-emerald-400' :
                        a.status === 'Ending Soon' ? 'text-amber-400' : 'text-gray-500'
                      }`}>{a.status}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`text-xs font-medium ${riskCls}`}>{a.risk_level}</span>
                    </td>
                    <td className="px-4 py-3 text-center hidden lg:table-cell">
                      <span className={`text-xs font-bold tabular-nums ${scoreCls}`}>
                        {a.trust_score != null ? a.trust_score : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-gray-400">{expiry ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {/* Publish toggle */}
                        <button
                          onClick={async () => {
                            const { error } = await supabase.from('airdrops').update({ published: !a.published }).eq('id', a.id);
                            if (!error) { setAirdrops(prev => prev.map(x => x.id === a.id ? { ...x, published: !x.published } : x)); fetchStats(); }
                          }}
                          title={a.published ? 'Unpublish' : 'Publish'}
                          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                        >
                          {a.published ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-gray-600" />}
                        </button>
                        {/* AI analysis */}
                        <button onClick={() => runAnalysis(a, true)} disabled={analyzing === a.id} title="Run AI analysis"
                          className="p-1.5 rounded-lg hover:bg-neon-purple/10 transition-colors disabled:opacity-50">
                          {analyzing === a.id
                            ? <Loader2 className="w-4 h-4 text-neon-purple animate-spin" />
                            : <Brain className="w-4 h-4 text-neon-purple" />}
                        </button>
                        {/* Edit */}
                        <button onClick={() => openEdit(a)} title="Edit"
                          className="p-1.5 rounded-lg hover:bg-sky-500/10 text-gray-500 hover:text-sky-400 transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        {/* Delete */}
                        <button onClick={() => setDeletingAirdrop(a)} title="Delete"
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-gray-500 hover:text-rose-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Scam report review ─────────────────────────────────────────────── */}
      <section id="admin-scam-reports">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            Scam Reports
          </h2>
          {scamReportsLoading && <Loader2 className="w-3 h-3 text-gray-600 animate-spin" />}
        </div>

        <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.04] p-4 mb-3">
          <div className="flex items-start gap-3">
            <Gift className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-white">Admin-approved reports can earn REP</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Users do not earn REP when they submit a report. REP is only awarded after you approve a useful scam report. This helps prevent spam and fake reports.
              </p>
            </div>
          </div>
        </div>

        {scamReports.length === 0 && !scamReportsLoading ? (
          <div className="glass-card p-8 text-center text-gray-600 text-sm">
            No scam reports found. If this should show reports, check that your form saves into the scam_reports table.
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Project</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Reporter</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Submitted</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {scamReports.map(report => {
                  const isOpen = expandedScamReport === report.id;
                  const reportUrl = report.website_url || report.project_url;
                  const statusCls = report.status === 'approved'
                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25'
                    : report.status === 'rejected'
                    ? 'text-rose-400 bg-rose-500/10 border-rose-500/25'
                    : 'text-amber-400 bg-amber-500/10 border-amber-500/25';

                  return (
                    <Fragment key={report.id}>
                      <tr className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-white text-sm">{report.project_name || 'Unknown project'}</div>
                          {reportUrl && (
                            <a href={reportUrl} target="_blank" rel="noopener noreferrer"
                              className="text-[10px] text-gray-500 hover:text-neon-purple flex items-center gap-0.5 mt-0.5">
                              {reportUrl.replace(/^https?:\/\//, '')} <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="text-xs text-gray-500">{report.reporter_email || (report.user_id ? 'Logged-in user' : 'Anonymous')}</span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-xs text-gray-500">
                            {new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-[10px] font-semibold border rounded-full px-2.5 py-1 capitalize ${statusCls}`}>
                            {report.status}
                          </span>
                          {report.rep_awarded && (
                            <div className="mt-1">
                              <span className="text-[9px] font-semibold border rounded-full px-2 py-0.5 text-amber-300 bg-amber-500/10 border-amber-500/25">
                                REP awarded
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setExpandedScamReport(isOpen ? null : report.id)}
                              className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors"
                              title="View details"
                            >
                              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>

                            {report.status !== 'approved' && (
                              <button
                                onClick={() => updateScamReportStatus(report, 'approved')}
                                disabled={reviewingScamReport === report.id}
                                className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-gray-600 hover:text-emerald-400 transition-colors disabled:opacity-50"
                                title="Approve and award REP if linked to a user"
                              >
                                {reviewingScamReport === report.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
                              </button>
                            )}

                            {report.status !== 'rejected' && (
                              <button
                                onClick={() => updateScamReportStatus(report, 'rejected')}
                                disabled={reviewingScamReport === report.id}
                                className="p-1.5 rounded-lg hover:bg-rose-500/10 text-gray-600 hover:text-rose-400 transition-colors disabled:opacity-50"
                                title="Reject report"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}

                            {report.status !== 'pending' && (
                              <button
                                onClick={() => updateScamReportStatus(report, 'pending')}
                                disabled={reviewingScamReport === report.id}
                                className="p-1.5 rounded-lg hover:bg-amber-500/10 text-gray-600 hover:text-amber-400 transition-colors disabled:opacity-50"
                                title="Reset to pending"
                              >
                                <Inbox className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {isOpen && (
                        <tr className="bg-white/[0.015]">
                          <td colSpan={5} className="px-4 py-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs mb-4">
                              {([
                                ['Wallet Address', report.wallet_address],
                                ['Contract Address', report.contract_address],
                                ['Evidence URL', report.evidence_url],
                              ] as [string, string | null][]).map(([label, val]) => val ? (
                                <div key={label}>
                                  <div className="text-gray-600 uppercase tracking-wider mb-0.5">{label}</div>
                                  {val.startsWith('http') ? (
                                    <a href={val} target="_blank" rel="noopener noreferrer" className="text-neon-blue hover:underline break-all">{val}</a>
                                  ) : (
                                    <div className="text-gray-300 break-all">{val}</div>
                                  )}
                                </div>
                              ) : null)}
                            </div>

                            {([
                              ['Reason', report.reason],
                              ['Description', report.description],
                            ] as [string, string | null][]).map(([label, val]) => val ? (
                              <div key={label} className="mb-3">
                                <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">{label}</div>
                                <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-wrap">{val}</p>
                              </div>
                            ) : null)}

                            <div>
                              <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5">Internal Review Notes</div>
                              <div className="flex gap-2">
                                <textarea
                                  value={scamReportNotes[report.id] ?? ''}
                                  onChange={e => setScamReportNotes(prev => ({ ...prev, [report.id]: e.target.value }))}
                                  placeholder="Why was this approved or rejected?"
                                  rows={2}
                                  className="flex-1 bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-neon-purple/30 resize-none"
                                />
                                <button
                                  onClick={() => saveScamReportNotes(report)}
                                  className="px-4 py-2 rounded-xl text-xs font-medium bg-neon-purple/10 border border-neon-purple/20 text-neon-purple hover:bg-neon-purple/20 transition-colors shrink-0"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Submissions table ──────────────────────────────────────────────── */}
      <section id="admin-submissions">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-3.5 h-3.5" />
            Project Submissions
          </h2>
          {subLoading && <Loader2 className="w-3 h-3 text-gray-600 animate-spin" />}
        </div>
        {submissions.length === 0 && !subLoading ? (
          <div className="glass-card p-10 text-center text-gray-600 text-sm">No submissions yet.</div>
        ) : (
          <div className="glass-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Project</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Submitted</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Blockchain</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {submissions.map(sub => {
                  const isOpen = expandedSub === sub.id;
                  const statusCls = sub.status === 'approved'
                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25'
                    : sub.status === 'rejected'
                    ? 'text-rose-400 bg-rose-500/10 border-rose-500/25'
                    : 'text-amber-400 bg-amber-500/10 border-amber-500/25';
                  return (
                    <Fragment key={sub.id}>
                      <tr className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-white text-sm">{sub.project_name}</div>
                          {sub.website_url && (
                            <a href={sub.website_url} target="_blank" rel="noopener noreferrer"
                              className="text-[10px] text-gray-500 hover:text-neon-purple flex items-center gap-0.5 mt-0.5">
                              {sub.website_url.replace(/^https?:\/\//, '')} <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="text-xs text-gray-500">
                            {new Date(sub.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-xs text-gray-400">{sub.blockchain ?? '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-[10px] font-semibold border rounded-full px-2.5 py-1 capitalize ${statusCls}`}>
                            {sub.status}
                          </span>
                          {sub.ai_recommendation && (
                            <div className="mt-1">
                              <span className={`text-[9px] font-semibold border rounded-full px-2 py-0.5 capitalize ${
                                sub.ai_recommendation === 'verify'
                                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25'
                                  : sub.ai_recommendation === 'review_further'
                                  ? 'text-amber-400 bg-amber-500/10 border-amber-500/25'
                                  : 'text-rose-400 bg-rose-500/10 border-rose-500/25'
                              }`}>
                                AI: {sub.ai_recommendation.replace('_', ' ')}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => analyzeSubmission(sub)} disabled={analyzingSub === sub.id}
                              className="p-1.5 rounded-lg hover:bg-violet-500/10 text-gray-600 hover:text-violet-400 transition-colors disabled:opacity-50" title="Run AI analysis">
                              {analyzingSub === sub.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                            </button>
                            <button onClick={() => setExpandedSub(isOpen ? null : sub.id)}
                              className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors" title="View details">
                              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                            {sub.status !== 'approved' && (
                              <button onClick={() => updateSubmissionStatus(sub.id, 'approved')}
                                className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-gray-600 hover:text-emerald-400 transition-colors" title="Approve">
                                <CheckCheck className="w-4 h-4" />
                              </button>
                            )}
                            {sub.status !== 'rejected' && (
                              <button onClick={() => updateSubmissionStatus(sub.id, 'rejected')}
                                className="p-1.5 rounded-lg hover:bg-rose-500/10 text-gray-600 hover:text-rose-400 transition-colors" title="Reject">
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                            {sub.status !== 'pending' && (
                              <button onClick={() => updateSubmissionStatus(sub.id, 'pending')}
                                className="p-1.5 rounded-lg hover:bg-amber-500/10 text-gray-600 hover:text-amber-400 transition-colors" title="Reset to pending">
                                <Inbox className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-white/[0.015]">
                          <td colSpan={5} className="px-4 py-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs mb-4">
                              {([
                                ['Airdrop Type', sub.airdrop_type],
                                ['Category', sub.category],
                                ['Deadline', sub.deadline],
                                ['Reward Confirmed', sub.reward_confirmed],
                                ['Token Confirmed', sub.token_confirmed],
                                ['Funding / Investors', sub.funding_investors],
                                ['Contract Address', sub.contract_address],
                              ] as [string, string | null][]).map(([label, val]) => val ? (
                                <div key={label}>
                                  <div className="text-gray-600 uppercase tracking-wider mb-0.5">{label}</div>
                                  <div className="text-gray-300">{val}</div>
                                </div>
                              ) : null)}
                            </div>
                            {([
                              ['Description', sub.description],
                              ['Tasks Required', sub.tasks_required],
                              ['Eligibility Requirements', sub.eligibility_requirements],
                              ['Team Information', sub.team_info],
                            ] as [string, string | null][]).map(([label, val]) => val ? (
                              <div key={label} className="mb-3">
                                <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">{label}</div>
                                <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-wrap">{val}</p>
                              </div>
                            ) : null)}
                            <div className="flex flex-wrap gap-3 text-xs mb-4">
                              {sub.twitter_url && <a href={sub.twitter_url} target="_blank" rel="noopener noreferrer" className="text-neon-blue hover:underline flex items-center gap-1">Twitter <ExternalLink className="w-2.5 h-2.5" /></a>}
                              {sub.discord_url && <a href={sub.discord_url} target="_blank" rel="noopener noreferrer" className="text-neon-purple hover:underline flex items-center gap-1">Discord <ExternalLink className="w-2.5 h-2.5" /></a>}
                              {sub.github_url && <a href={sub.github_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:underline flex items-center gap-1">GitHub <ExternalLink className="w-2.5 h-2.5" /></a>}
                              {sub.whitepaper_url && <a href={sub.whitepaper_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:underline flex items-center gap-1">Whitepaper <ExternalLink className="w-2.5 h-2.5" /></a>}
                              {sub.audit_url && <a href={sub.audit_url} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline flex items-center gap-1">Audit <ExternalLink className="w-2.5 h-2.5" /></a>}
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs mb-4">
                              {([
                                ['Wallet Connection', sub.requires_wallet_connection],
                                ['On-Chain Tx', sub.requires_transaction],
                                ['Payment Required', sub.requires_payment],
                                ['Seed Phrase', sub.requires_seed_phrase],
                              ] as [string, boolean][]).map(([label, val]) => (
                                <span key={label} className={`border rounded-full px-2.5 py-1 ${val ? 'text-rose-400 border-rose-500/25 bg-rose-500/10' : 'text-gray-600 border-white/5'}`}>
                                  {label}: {val ? 'Yes' : 'No'}
                                </span>
                              ))}
                            </div>
                            {(sub.token_name || sub.token_verification || (sub.scam_warnings && sub.scam_warnings.length > 0)) && (
                              <div className="mb-4 p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                                <div className="text-[10px] text-gray-600 uppercase tracking-wider">AI Token Analysis</div>
                                {sub.token_name && (
                                  <div className="text-xs text-gray-300">
                                    Token: <span className="font-semibold text-white">{sub.token_name}</span>
                                    {sub.token_symbol && <span className="ml-1 text-gray-500 font-mono">${sub.token_symbol}</span>}
                                  </div>
                                )}
                                {sub.token_verification && (
                                  <div className={`text-xs font-medium ${sub.token_verification === 'clean' ? 'text-emerald-400' : sub.token_verification === 'warning' ? 'text-amber-400' : 'text-rose-400'}`}>
                                    Contract: {sub.token_verification}
                                  </div>
                                )}
                                {sub.scam_warnings && sub.scam_warnings.length > 0 && (
                                  <ul className="space-y-1">
                                    {sub.scam_warnings.map((w, i) => (
                                      <li key={i} className="text-xs text-rose-400 flex items-start gap-1.5">
                                        <span className="mt-0.5 shrink-0">!</span>{w}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            )}
                            <div>
                              <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5">Internal Notes</div>
                              <div className="flex gap-2">
                                <textarea
                                  value={subNotes[sub.id] ?? ''}
                                  onChange={e => setSubNotes(prev => ({ ...prev, [sub.id]: e.target.value }))}
                                  placeholder="Add internal notes..."
                                  rows={2}
                                  className="flex-1 bg-dark-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-neon-purple/30 resize-none"
                                />
                                <button onClick={() => saveAdminNotes(sub.id)}
                                  className="px-4 py-2 rounded-xl text-xs font-medium bg-neon-purple/10 border border-neon-purple/20 text-neon-purple hover:bg-neon-purple/20 transition-colors shrink-0">
                                  Save
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {bannerModalMode && (
        <BannerFormModal
          mode={bannerModalMode}
          form={bannerForm}
          setForm={setBannerForm}
          onClose={() => setBannerModalMode(null)}
          onSave={saveBannerForm}
        />
      )}

      {modalMode && (
        <AirdropFormModal
          mode={modalMode}
          form={form}
          setForm={setForm}
          onClose={() => setModalMode(null)}
          onSave={saveForm}
          saving={saving}
        />
      )}

      {deletingAirdrop && (
        <DeleteModal
          airdrop={deletingAirdrop}
          onConfirm={confirmDelete}
          onCancel={() => setDeletingAirdrop(null)}
          deleting={deleting}
        />
      )}

      {toast && <ToastBar toast={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
