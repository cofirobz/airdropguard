import DashboardEngagementPanel from "../components/DashboardEngagementPanel";
import AirdropGuardIntelligenceCentre from "../components/AirdropGuardIntelligenceCentre";
import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  Loader2, Key, Copy, Check, RefreshCw,
  ExternalLink, ChevronDown, ChevronUp, CheckSquare, Square,
  Rocket, ListChecks, Target, TrendingUp, Clock, AlertTriangle,
  Zap, Calendar, Star, Shield, Award, Flame, Wallet, Bell, ShieldAlert,
  BarChart3, Trophy, Sparkles, Crown, Palette, Lock, Unlock, ShieldCheck,
  Search, UserCircle2, ChevronRight, LayoutDashboard,
  Home, Activity, CreditCard, LogOut, Settings,
} from 'lucide-react';
import AiOrb from '../components/AiOrb';
import SEO from '../components/SEO';
import { supabase } from '../lib/supabase';
import { event as trackAnalyticsEvent } from '../lib/analytics';
import { useAuth } from '../contexts/AuthContext';
import type { AirdropWithTasks } from '../lib/types';
import { getBookmarks, isMainAirdropListing } from '../lib/utils';
import { openCopilotWithPrompt } from '../lib/copilot';
import { canonicalFromPath } from '../lib/seo';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApiSubscription {
  id: string;
  plan: string;
  status: string;
  current_period_end: string | null;
  key_value?: string | null;
}

interface UserReputation {
  id: string;
  user_id: string;
  rep: number;
  level: number;
  current_title: string;
  current_theme: string;
  weekly_streak: number;
  last_scan_at: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

interface UserUnlock {
  id: string;
  user_id: string;
  unlock_key: string;
  unlock_type: string;
  unlock_name: string;
  unlock_description: string | null;
  unlocked_at: string;
}

type Urgency = 'critical' | 'warning' | 'moderate' | 'normal' | 'expired' | 'none';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function storageKey(userId: string) { return `ag_tasks_${userId}`; }

function loadCompleted(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch { return new Set(); }
}

function saveCompleted(userId: string, ids: Set<string>) {
  localStorage.setItem(storageKey(userId), JSON.stringify([...ids]));
}

function urgencyOf(date: string | null): Urgency {
  if (!date) return 'none';
  const ms = new Date(date).getTime() - Date.now();
  if (ms <= 0) return 'expired';
  if (ms < 2 * 86_400_000) return 'critical';
  if (ms < 7 * 86_400_000) return 'warning';
  if (ms < 30 * 86_400_000) return 'moderate';
  return 'normal';
}

function msUntil(date: string): number { return Math.max(0, new Date(date).getTime() - Date.now()); }

function formatCountdown(ms: number) {
  return {
    days:    Math.floor(ms / 86_400_000),
    hours:   Math.floor((ms % 86_400_000) / 3_600_000),
    minutes: Math.floor((ms % 3_600_000)  / 60_000),
    seconds: Math.floor((ms % 60_000)     / 1_000),
  };
}

function pad(n: number) { return String(n).padStart(2, '0'); }

const URGENCY_BADGE: Record<Urgency, string> = {
  critical: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
  warning:  'bg-amber-500/15 border-amber-500/30 text-amber-400',
  moderate: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400',
  normal:   'bg-sky-500/10 border-sky-500/20 text-sky-400',
  expired:  'bg-gray-500/10 border-white/10 text-gray-600',
  none:     '',
};

// Priority score for Today's Focus and Priority Airdrops sorting.
// Higher = deserves more immediate attention.
function priorityScore(airdrop: AirdropWithTasks, pct: number): number {
  const u = urgencyOf(airdrop.expiry_date);
  if (u === 'expired') return 0;
  const daysLeft = airdrop.expiry_date ? msUntil(airdrop.expiry_date) / 86_400_000 : Infinity;
  const urgencyPts = daysLeft < 1 ? 50 : daysLeft < 3 ? 42 : daysLeft < 7 ? 32 : daysLeft < 14 ? 18 : daysLeft < 30 ? 8 : 2;
  const incompletePts = (1 - pct / 100) * 30;
  const trustPts = ((airdrop.trust_score ?? 50) / 100) * 20;
  return urgencyPts + incompletePts + trustPts;
}

const REP_UNLOCKS = [
  { level: 5, key: 'theme_sapphire', name: 'Sapphire Theme', type: 'Dashboard Theme' },
  { level: 10, key: 'theme_neon', name: 'Neon Theme', type: 'Dashboard Theme' },
  { level: 15, key: 'advanced_wallet_charts', name: 'Advanced Wallet Charts', type: 'Feature' },
  { level: 20, key: 'pdf_wallet_report', name: 'PDF Wallet Report', type: 'Feature' },
  { level: 25, key: 'guardian_badge', name: 'Guardian Profile Badge', type: 'Badge' },
  { level: 30, key: 'wallet_compare', name: 'Wallet Comparison', type: 'Feature' },
  { level: 40, key: 'animated_dashboard', name: 'Animated Dashboard', type: 'Dashboard Upgrade' },
  { level: 50, key: 'founder_gold', name: 'Founder Gold Theme', type: 'Dashboard Theme' },
];

function repRequiredForLevel(level: number) {
  return Math.max(0, (level - 1) * 250);
}

function calculatedLevel(rep: number) {
  return Math.max(1, Math.floor(rep / 250) + 1);
}

function titleForLevel(level: number) {
  if (level >= 50) return 'Web3 Veteran';
  if (level >= 35) return 'Airdrop Guardian';
  if (level >= 25) return 'Wallet Guardian';
  if (level >= 15) return 'DeFi Explorer';
  if (level >= 8) return 'Airdrop Hunter';
  return 'New Explorer';
}

function getNextUnlock(level: number) {
  return REP_UNLOCKS.find(unlock => unlock.level > level) ?? null;
}

// ─── useCountdown ─────────────────────────────────────────────────────────────

function useCountdown(date: string | null) {
  const [ms, setMs] = useState(() => date ? msUntil(date) : 0);
  useEffect(() => {
    if (!date) return;
    const id = setInterval(() => setMs(msUntil(date)), 1000);
    return () => clearInterval(id);
  }, [date]);
  return ms;
}

// ─── RingProgress ─────────────────────────────────────────────────────────────

function RingProgress({
  pct, size = 48, stroke = 3.5, allDone = false, urgency = 'none',
}: {
  pct: number; size?: number; stroke?: number; allDone?: boolean; urgency?: Urgency;
}) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);

  const trackColor = 'rgba(255,255,255,0.05)';
  const fillColor =
    allDone                  ? '#34d399'          :
    urgency === 'critical'   ? '#f87171'           :
    urgency === 'warning'    ? '#fbbf24'           :
    urgency === 'moderate'   ? '#facc15'           :
    pct > 0                  ? 'url(#ring-grad)'  : 'transparent';

  return (
    <svg width={size} height={size} className="shrink-0" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
      {pct > 0 && (
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={fillColor} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 0.7s ease' }}
        />
      )}
    </svg>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, iconBg, iconClass,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string; iconClass: string;
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

// ─── ProgressCard ─────────────────────────────────────────────────────────────

function ProgressCard({
  airdrop, done, total,
}: {
  airdrop: AirdropWithTasks; done: number; total: number;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const allDone = total > 0 && done === total;
  const u = urgencyOf(airdrop.expiry_date);

  const daysLabel = (() => {
    if (!airdrop.expiry_date || u === 'none' || u === 'expired') return null;
    const d = Math.ceil(msUntil(airdrop.expiry_date) / 86_400_000);
    return d === 0 ? '< 1d' : `${d}d`;
  })();

  const barColor =
    allDone          ? 'bg-emerald-400' :
    u === 'critical' ? 'bg-rose-500'    :
    u === 'warning'  ? 'bg-amber-500'   :
    u === 'moderate' ? 'bg-yellow-400'  :
                       'bg-gradient-to-r from-neon-purple to-neon-blue';

  return (
    <Link
      to={`/airdrop/${airdrop.slug}`}
      className="glass-card p-3 flex flex-col gap-2 hover:bg-white/[0.04] transition-all group"
    >
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-dark-700 border border-white/10 shrink-0 overflow-hidden flex items-center justify-center">
          {airdrop.logo_url
            ? <img src={airdrop.logo_url} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            : <span className="text-[10px] font-bold gradient-text">{airdrop.name[0]}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate group-hover:text-neon-purple transition-colors leading-snug">
            {airdrop.name}
          </p>
          {airdrop.ticker && (
            <p className="text-[10px] font-mono text-gray-600">${airdrop.ticker}</p>
          )}
        </div>
        {daysLabel && !allDone && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium shrink-0 ${URGENCY_BADGE[u]}`}>
            {daysLabel}
          </span>
        )}
      </div>

      {/* Only show bar when there's meaningful progress */}
      {pct > 0 && (
        <div className="space-y-1">
          <div className="h-1 rounded-full bg-dark-700 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-600 tabular-nums">
            {done} / {total} task{total !== 1 ? 's' : ''}
            {allDone && <span className="text-emerald-400 ml-1">complete</span>}
          </p>
        </div>
      )}
      {pct === 0 && total > 0 && (
        <p className="text-[10px] text-gray-600 tabular-nums">{total} task{total !== 1 ? 's' : ''} to start</p>
      )}
    </Link>
  );
}

// ─── DeadlineCard ─────────────────────────────────────────────────────────────

function DeadlineCard({ airdrop }: { airdrop: AirdropWithTasks }) {
  const ms = useCountdown(airdrop.expiry_date);
  const u = urgencyOf(airdrop.expiry_date);
  const t = formatCountdown(ms);
  const expired = ms === 0;

  const borderColor =
    u === 'critical' ? 'border-rose-500/30' :
    u === 'warning'  ? 'border-amber-500/30' :
    u === 'moderate' ? 'border-yellow-500/20' : 'border-white/10';

  const numColor =
    u === 'critical' ? 'text-rose-400' :
    u === 'warning'  ? 'text-amber-400' :
    u === 'moderate' ? 'text-yellow-400' : 'text-sky-400';

  return (
    <Link
      to={`/airdrop/${airdrop.slug}`}
      className={`glass-card p-4 flex flex-col gap-3 hover:bg-white/[0.04] transition-all overflow-hidden ${borderColor} group`}
    >
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-dark-700 border border-white/10 shrink-0 overflow-hidden flex items-center justify-center">
          {airdrop.logo_url
            ? <img src={airdrop.logo_url} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            : <span className="text-[10px] font-bold gradient-text">{airdrop.name[0]}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate group-hover:text-neon-purple transition-colors">
            {airdrop.name}
          </p>
          {airdrop.ticker && <p className="text-[10px] font-mono text-gray-600">${airdrop.ticker}</p>}
        </div>
        {(u === 'critical' || u === 'warning') && (
          <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${u === 'critical' ? 'text-rose-400' : 'text-amber-400'}`} />
        )}
      </div>

      {expired ? (
        <p className="text-xs text-gray-600 font-medium text-center py-1">Expired</p>
      ) : (
        <div className="flex items-end justify-center gap-1 sm:gap-2 overflow-hidden min-w-0">
          {t.days > 0 && (
            <>
              <div className="text-center min-w-0 shrink-0">
                <p className={`text-sm sm:text-2xl font-bold font-mono tabular-nums leading-none ${numColor}`}>{t.days}</p>
                <p className="text-[10px] text-gray-600 mt-0.5">days</p>
              </div>
              <span className={`text-xs sm:text-lg font-bold mb-2 sm:mb-3 ${numColor} opacity-40`}>:</span>
            </>
          )}
          <div className="text-center min-w-0 shrink-0">
            <p className={`text-sm sm:text-2xl font-bold font-mono tabular-nums leading-none ${numColor}`}>{pad(t.hours)}</p>
            <p className="text-[10px] text-gray-600 mt-0.5">hrs</p>
          </div>
          <span className={`text-xs sm:text-lg font-bold mb-2 sm:mb-3 ${numColor} opacity-40`}>:</span>
          <div className="text-center min-w-0 shrink-0">
            <p className={`text-sm sm:text-2xl font-bold font-mono tabular-nums leading-none ${numColor}`}>{pad(t.minutes)}</p>
            <p className="text-[10px] text-gray-600 mt-0.5">min</p>
          </div>
          <span className={`text-xs sm:text-lg font-bold mb-2 sm:mb-3 ${numColor} opacity-40`}>:</span>
          <div className="text-center min-w-0 shrink-0">
            <p className={`text-sm sm:text-2xl font-bold font-mono tabular-nums leading-none ${numColor}`}>{pad(t.seconds)}</p>
            <p className="text-[10px] text-gray-600 mt-0.5">sec</p>
          </div>
        </div>
      )}

      <p className="text-[10px] text-gray-600 text-center">
        Expires {new Date(airdrop.expiry_date!).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
      </p>
    </Link>
  );
}

// ─── AirdropRow ───────────────────────────────────────────────────────────────

function AirdropRow({
  airdrop, completedIds, onToggle,
}: {
  airdrop: AirdropWithTasks;
  completedIds: Set<string>;
  onToggle: (taskId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const tasks = airdrop.tasks ?? [];
  const done = tasks.filter(t => completedIds.has(t.id)).length;
  const total = tasks.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const allDone = total > 0 && done === total;
  const u = urgencyOf(airdrop.expiry_date);

  const daysLabel = (() => {
    if (!airdrop.expiry_date || u === 'none' || u === 'expired') return null;
    const d = Math.ceil(msUntil(airdrop.expiry_date) / 86_400_000);
    return d === 0 ? '< 1d left' : `${d}d left`;
  })();

  const barColor =
    allDone          ? 'bg-emerald-400' :
    u === 'critical' ? 'bg-rose-500'    :
    u === 'warning'  ? 'bg-amber-500'   :
    u === 'moderate' ? 'bg-yellow-400'  :
                       'bg-gradient-to-r from-neon-purple to-neon-blue';

  return (
    <div className={`border-b border-white/5 last:border-0 transition-colors ${allDone ? 'bg-emerald-500/[0.03]' : ''}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className="relative shrink-0">
          <RingProgress pct={pct} size={40} stroke={3} allDone={allDone} urgency={u} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-[9px] font-bold tabular-nums leading-none ${allDone ? 'text-emerald-400' : pct > 0 ? 'text-white' : 'text-gray-600'}`}>
              {pct}%
            </span>
          </div>
        </div>

        <div className="w-7 h-7 rounded-lg bg-dark-700 border border-white/10 shrink-0 overflow-hidden flex items-center justify-center">
          {airdrop.logo_url
            ? <img src={airdrop.logo_url} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            : <span className="text-[10px] font-bold gradient-text">{airdrop.name[0]}</span>}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <span className="text-sm font-medium text-white truncate">{airdrop.name}</span>
            {airdrop.ticker && (
              <span className="text-[10px] font-mono text-neon-purple bg-neon-purple/10 border border-neon-purple/20 px-1.5 py-0.5 rounded shrink-0">
                ${airdrop.ticker}
              </span>
            )}
            {daysLabel && !allDone && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium shrink-0 ${URGENCY_BADGE[u]}`}>
                {daysLabel}
              </span>
            )}
            {allDone && (
              <span className="text-[10px] text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 rounded shrink-0">
                Complete
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-dark-700 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-500 tabular-nums shrink-0">{done}/{total}</span>
          </div>
        </div>

        {open ? <ChevronUp className="w-4 h-4 text-gray-600 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-600 shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-1 bg-dark-800/30">
          {airdrop.expiry_date && u !== 'expired' && u !== 'none' && (
            <DeadlineInline date={airdrop.expiry_date} urgency={u} />
          )}
          {tasks.length === 0 ? (
            <p className="text-xs text-gray-600 py-2">No tasks defined.</p>
          ) : (
            <>
              <div className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 mb-1">
                <p className="text-[10px] text-gray-600 leading-relaxed">
                  These checkboxes are for your own organisation only. They do not award REP or unlock rewards.
                </p>
              </div>
              {tasks.map(task => {
              const checked = completedIds.has(task.id);
              return (
                <button
                  key={task.id}
                  onClick={() => onToggle(task.id)}
                  className="w-full flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-white/5 transition-colors text-left group"
                >
                  {checked
                    ? <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    : <Square className="w-4 h-4 text-gray-600 group-hover:text-gray-400 shrink-0 mt-0.5 transition-colors" />}
                  <div className="min-w-0">
                    <p className={`text-sm leading-snug ${checked ? 'line-through text-gray-600' : 'text-gray-300'}`}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-gray-600 mt-0.5 leading-snug">{task.description}</p>
                    )}
                  </div>
                </button>
              );
            })}
            </>
          )}
          <div className="pt-1.5">
            <Link to={`/airdrop/${airdrop.slug}`} className="text-xs text-neon-purple hover:text-neon-purple/80 transition-colors">
              View full airdrop details →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DeadlineInline ───────────────────────────────────────────────────────────

function DeadlineInline({ date, urgency }: { date: string; urgency: Urgency }) {
  const ms = useCountdown(date);
  const t = formatCountdown(ms);
  const color =
    urgency === 'critical' ? 'text-rose-400 border-rose-500/20 bg-rose-500/5'       :
    urgency === 'warning'  ? 'text-amber-400 border-amber-500/20 bg-amber-500/5'     :
    urgency === 'moderate' ? 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5'  :
                             'text-sky-400 border-sky-500/20 bg-sky-500/5';
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium mb-1 ${color}`}>
      <Clock className="w-3.5 h-3.5 shrink-0" />
      <span>Deadline in </span>
      <span className="font-mono tabular-nums">
        {t.days > 0 ? `${t.days}d ` : ''}{pad(t.hours)}:{pad(t.minutes)}:{pad(t.seconds)}
      </span>
      <span className="text-inherit opacity-60 ml-auto">
        {new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
      </span>
    </div>
  );
}

function ReputationRulesNotice() {
  return (
    <div className="rounded-2xl border border-sky-500/15 bg-sky-500/[0.04] p-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4 h-4 text-sky-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Reputation is earned from verified signals</h3>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            Airdrop task checkboxes are personal progress only. They do not award REP because they can be self-clicked.
            REP is earned from wallet scans, safer wallet signals, approved reports and verified platform activity.
          </p>
        </div>
      </div>
    </div>
  );
}

function ReputationCard({
  reputation,
  unlocks,
  onRefresh,
}: {
  reputation: UserReputation | null;
  unlocks: UserUnlock[];
  onRefresh: () => void;
}) {
  const rep = reputation?.rep ?? 0;
  const level = reputation?.level ?? calculatedLevel(rep);
  const title = reputation?.current_title || titleForLevel(level);
  const currentTheme = reputation?.current_theme || 'default';
  const currentLevelRep = repRequiredForLevel(level);
  const nextLevelRep = repRequiredForLevel(level + 1);
  const levelProgress = Math.min(100, Math.max(0, Math.round(((rep - currentLevelRep) / Math.max(1, nextLevelRep - currentLevelRep)) * 100)));
  const nextUnlock = getNextUnlock(level);
  const unlockedKeys = new Set(unlocks.map(u => u.unlock_key));

  return (
    <div className="relative overflow-hidden rounded-3xl border border-neon-purple/20 bg-gradient-to-br from-neon-purple/[0.12] via-dark-800 to-sky-500/[0.08] p-5 sm:p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.16),transparent_30%)] pointer-events-none" />

      <div className="relative grid lg:grid-cols-[0.9fr_1.1fr] gap-5">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Crown className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider">AirdropGuard Reputation</span>
          </div>

          <div className="flex items-end gap-3 mb-2">
            <div className="text-5xl font-black text-white leading-none">{level}</div>
            <div className="pb-1">
              <div className="text-sm font-bold text-white">{title}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">{rep.toLocaleString()} REP</div>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Progress to Level {level + 1}</span>
              <span className="text-[10px] text-gray-500">{levelProgress}%</span>
            </div>
            <div className="h-2 rounded-full bg-dark-700 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-neon-purple to-neon-blue transition-all duration-700" style={{ width: `${levelProgress}%` }} />
            </div>
            <p className="text-[10px] text-gray-600 mt-1">
              {Math.max(0, nextLevelRep - rep).toLocaleString()} REP until next level
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-white/5 bg-white/[0.04] p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Palette className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">Theme</span>
              </div>
              <div className="text-sm font-bold text-white capitalize">{currentTheme.replaceAll('_', ' ')}</div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.04] p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">Unlocks</span>
              </div>
              <div className="text-sm font-bold text-white">{unlocks.length}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-dark-700/30 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Next Unlock</div>
                {nextUnlock ? (
                  <>
                    <div className="text-sm font-bold text-white">{nextUnlock.name}</div>
                    <div className="text-[10px] text-gray-600">{nextUnlock.type} · Level {nextUnlock.level}</div>
                  </>
                ) : (
                  <>
                    <div className="text-sm font-bold text-white">All current unlocks reached</div>
                    <div className="text-[10px] text-gray-600">More seasonal unlocks can be added later.</div>
                  </>
                )}
              </div>
              {nextUnlock && unlockedKeys.has(nextUnlock.key) ? (
                <Unlock className="w-4 h-4 text-emerald-400 shrink-0 mt-1" />
              ) : (
                <Lock className="w-4 h-4 text-gray-600 shrink-0 mt-1" />
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            className="w-full rounded-xl border border-neon-purple/25 bg-neon-purple/10 px-4 py-2.5 text-xs font-bold text-neon-purple hover:text-white hover:bg-neon-purple/20 transition-colors"
          >
            Refresh Reputation
          </button>
        </div>
      </div>
    </div>
  );
}

function formatSnapshotMetric(label: 'reward' | 'risk' | 'time', value: string) {
  const trimmed = value.trim();

  if (label === 'reward') {
    const parenthetical = trimmed.match(/^(.*?)(\s*\([^)]*\))$/);
    if (parenthetical) {
      return {
        primary: parenthetical[1].trim(),
        secondary: parenthetical[2].trim(),
      };
    }
  }

  if (label === 'time') {
    const timeMatch = trimmed.match(/^(.+?)\s+(minutes?|hours?)$/i);
    if (timeMatch) {
      return {
        primary: timeMatch[1].trim(),
        secondary: timeMatch[2].trim(),
      };
    }
  }

  return {
    primary: trimmed,
    secondary: null,
  };
}

function AnimatedCounter({
  value,
  duration = 900,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
}: {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const start = performance.now();
    const from = displayValue;
    const delta = value - from;
    let frame = 0;

    const animate = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(from + delta * eased);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [duration, displayValue, value]);

  return (
    <span className={className}>
      {prefix}
      {displayValue.toFixed(decimals)}
      {suffix}
    </span>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CustomerDashboard() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [airdrops, setAirdrops] = useState<AirdropWithTasks[]>([]);
  const [subscription, setSubscription] = useState<ApiSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiKeyBusy, setApiKeyBusy] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'airdrops' | 'tasks' | 'api' | 'profile'>('overview');
  const [reputation, setReputation] = useState<UserReputation | null>(null);
  const [unlocks, setUnlocks] = useState<UserUnlock[]>([]);
  const [dashboardSearch, setDashboardSearch] = useState('');
  const [trustDelta, setTrustDelta] = useState<number | null>(null);
  const requestedView = searchParams.get('view');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/auth'); return; }
    if (isAdmin) { navigate('/admin'); }
  }, [user, authLoading, isAdmin, navigate]);

  useEffect(() => {
    if (user) setCompletedIds(loadCompleted(user.id));
  }, [user]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    const [airdropRes, subRes] = await Promise.all([
      supabase
        .from('airdrops')
        .select('*, airdrop_tasks(*)')
        .eq('published', true)
        .eq('is_demo', false)
        .not('review_status', 'eq', 'replaced_demo')
        .order('sort_order', { ascending: true }),
      supabase
        .from('api_subscriptions')
        .select('id, plan, status, current_period_end, key_value')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);
    if (airdropRes.data) {
      setAirdrops(
        (airdropRes.data as (typeof airdropRes.data[0] & { airdrop_tasks: AirdropWithTasks['tasks'] })[])
          .filter(a => isMainAirdropListing(a))
          .map(a => ({ ...a, tasks: a.airdrop_tasks ?? [] }))
      );
    }
    setSubscription(subRes.data as ApiSubscription | null);
    setLoading(false);
  }, [user]);

  const fetchReputation = useCallback(async () => {
    if (!user) return;

    const { data: reputationData, error: reputationError } = await supabase
      .from('user_reputation')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!reputationData && !reputationError) {
      const starterRep = 0;
      const starterLevel = calculatedLevel(starterRep);
      const { data: created } = await supabase
        .from('user_reputation')
        .insert({
          user_id: user.id,
          rep: starterRep,
          level: starterLevel,
          current_title: titleForLevel(starterLevel),
          current_theme: 'default',
          last_login_at: new Date().toISOString(),
        })
        .select('*')
        .single();

      if (created) setReputation(created as UserReputation);
    } else if (reputationData) {
      setReputation(reputationData as UserReputation);
    }

    const { data: unlockData } = await supabase
      .from('user_unlocks')
      .select('*')
      .eq('user_id', user.id)
      .order('unlocked_at', { ascending: false });

    setUnlocks((unlockData ?? []) as UserUnlock[]);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchReputation(); }, [fetchReputation]);

  const handleToggle = (taskId: string) => {
    if (!user) return;
    setCompletedIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      saveCompleted(user.id, next);
      return next;
    });
  };

  const handleCopy = async () => {
    if (!subscription?.key_value) {
      setApiKeyError('No API key found. Generate one from this panel.');
      return;
    }

    await navigator.clipboard.writeText(subscription.key_value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateApiKey = async () => {
    if (!user) return;

    setApiKeyError(null);
    setApiKeyBusy(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Session expired. Please sign in again to generate an API key.');
      }

      const { data, error } = await supabase.functions.invoke('manage-api-key', {
        body: { action: 'generate' },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) {
        const backendError = (data as { error?: string } | null)?.error;
        throw new Error(backendError ?? error.message ?? 'Failed to generate API key.');
      }

      const key = (data as { key?: string } | null)?.key;
      if (!key) {
        throw new Error('Key generation returned an empty result. Please try again.');
      }

      setSubscription((prev) => (prev ? { ...prev, key_value: key } : prev));
      setCopied(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate API key.';
      setApiKeyError(message);
    } finally {
      setApiKeyBusy(false);
    }
  };

  // ── Derived stats ─────────────────────────────────────────────────────────
  const safeAirdrops = airdrops ?? [];
  const safeBookmarks = getBookmarks() ?? [];

  const allTaskIds = safeAirdrops.flatMap(a => (a.tasks ?? []).map(t => t.id));
  const totalTasks = allTaskIds.length;
  const completedCount = allTaskIds.filter(id => completedIds.has(id)).length;
  const remainingCount = totalTasks - completedCount;
  const overallPct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  const doneByAirdrop = Object.fromEntries(
    safeAirdrops.map(a => [a.id, (a.tasks ?? []).filter(t => completedIds.has(t.id)).length])
  );
  const pctByAirdrop = Object.fromEntries(
    safeAirdrops.map(a => {
      const done = doneByAirdrop[a.id] ?? 0;
      const total = (a.tasks ?? []).length;
      return [a.id, total > 0 ? Math.round((done / total) * 100) : 0];
    })
  );

  // Today's Focus: top 3 non-expired with incomplete tasks, sorted by priority
  const focusAirdrops = [...safeAirdrops]
    .filter(a => urgencyOf(a.expiry_date) !== 'expired')
    .filter(a => (doneByAirdrop[a.id] ?? 0) < (a.tasks ?? []).length)
    .sort((a, b) => priorityScore(b, pctByAirdrop[b.id]) - priorityScore(a, pctByAirdrop[a.id]))
    .slice(0, 3);

  // Claim Calendar: next 5 upcoming expiry events
  const calendarEvents = [...safeAirdrops]
    .filter(a => a.expiry_date && urgencyOf(a.expiry_date) !== 'expired')
    .sort((a, b) => new Date(a.expiry_date!).getTime() - new Date(b.expiry_date!).getTime())
    .slice(0, 5);

  // Trending: is_trending first, then trust_score desc
  const trendingAirdrops = [...safeAirdrops]
    .filter(a => urgencyOf(a.expiry_date) !== 'expired')
    .sort((a, b) => {
      if (b.is_trending !== a.is_trending) return b.is_trending ? 1 : -1;
      return (b.trust_score ?? 0) - (a.trust_score ?? 0);
    })
    .slice(0, 5);

  // Priority Airdrops: top 6 by priority score
  const priorityAirdrops = [...safeAirdrops]
    .sort((a, b) => priorityScore(b, pctByAirdrop[b.id]) - priorityScore(a, pctByAirdrop[a.id]))
    .slice(0, 6);

  const deadlineAirdrops = safeAirdrops
    .filter(a => a.expiry_date && urgencyOf(a.expiry_date) !== 'expired' && urgencyOf(a.expiry_date) !== 'none')
    .sort((a, b) => new Date(a.expiry_date!).getTime() - new Date(b.expiry_date!).getTime())
    .slice(0, 6);

  const taskAirdrops = [...safeAirdrops]
    .filter(a => (a.tasks ?? []).length > 0)
    .sort((a, b) => priorityScore(b, pctByAirdrop[b.id]) - priorityScore(a, pctByAirdrop[a.id]));

  const rep = reputation?.rep ?? 0;
  const level = reputation?.level ?? calculatedLevel(rep);
  const title = reputation?.current_title || titleForLevel(level);
  const nextUnlock = getNextUnlock(level);
  const watchlistCount = safeBookmarks.length;
  const avgTrustScore = safeAirdrops.length > 0
    ? Math.round(
      safeAirdrops.reduce((acc, row) => acc + (row.trust_score ?? 0), 0) / safeAirdrops.length,
    )
    : 0;
  const copilotInsights = Math.max(
    1,
    Math.min(99, focusAirdrops.length + deadlineAirdrops.length + trendingAirdrops.length),
  );

  const watchlistIds = safeBookmarks;
  const watchlistAirdrops = safeAirdrops
    .filter(item => watchlistIds.includes(item.id))
    .slice(0, 5);

  const underReviewCount = safeAirdrops.filter(item => item.listing_state === 'under_review').length;
  const highPotentialCount = safeAirdrops.filter(item => (item.opportunity_score ?? 0) >= 75).length;
  const mediumPotentialCount = safeAirdrops.filter(item => {
    const score = item.opportunity_score ?? 0;
    return score >= 45 && score < 75;
  }).length;
  const lowPotentialCount = safeAirdrops.filter(item => (item.opportunity_score ?? 0) < 45).length;
  const opportunityTotal = Math.max(
    1,
    highPotentialCount + mediumPotentialCount + lowPotentialCount + underReviewCount,
  );
  const highPotentialPct = Math.round((highPotentialCount / opportunityTotal) * 100);
  const mediumPotentialPct = Math.round((mediumPotentialCount / opportunityTotal) * 100);
  const lowPotentialPct = Math.round((lowPotentialCount / opportunityTotal) * 100);
  const underReviewPct = Math.max(0, 100 - highPotentialPct - mediumPotentialPct - lowPotentialPct);
  const opportunityDonutStyle = {
    background: `conic-gradient(
      #22d3ee 0% ${highPotentialPct}%,
      #6366f1 ${highPotentialPct}% ${highPotentialPct + mediumPotentialPct}%,
      #f59e0b ${highPotentialPct + mediumPotentialPct}% ${highPotentialPct + mediumPotentialPct + lowPotentialPct}%,
      #a855f7 ${highPotentialPct + mediumPotentialPct + lowPotentialPct}% 100%
    )`,
  };

  const marketPulse = {
    momentum: Math.round((trendingAirdrops.length / Math.max(1, safeAirdrops.length)) * 100),
    riskSignals: deadlineAirdrops.filter(item => urgencyOf(item.expiry_date) === 'critical').length,
    reviewed: underReviewCount,
  };

  const streakDays = Math.max(0, reputation?.weekly_streak ?? 0);
  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  })();
  const firstName = user?.email?.split('@')[0] || 'Explorer';
  const expiresTodayCount = safeAirdrops.filter(item => {
    if (!item.expiry_date) return false;
    const left = msUntil(item.expiry_date);
    return left > 0 && left <= 86_400_000;
  }).length;
  const verifiedProjectsCount = safeAirdrops.filter(item => {
    return (item.trust_score ?? 0) >= 75 && item.listing_state !== 'under_review';
  }).length;
  const estimatedRewardsText = highPotentialCount > 0
    ? `Estimated potential from ${highPotentialCount} high-opportunity project${highPotentialCount !== 1 ? 's' : ''}`
    : 'Estimated potential varies';
  const copilotConfidencePct = Math.max(84, Math.min(99, 80 + Math.round(avgTrustScore / 4)));
  const featuredMission = focusAirdrops[0] ?? priorityAirdrops[0] ?? null;
  const missionTrust = Math.max(0, Math.min(100, featuredMission?.trust_score ?? avgTrustScore));
  const missionReward = featuredMission?.estimated_reward || 'Reward window updating';
  const missionCountdownMs = useCountdown(featuredMission?.expiry_date ?? null);
  const missionCountdown = formatCountdown(missionCountdownMs);
  const rewardMetric = formatSnapshotMetric('reward', missionReward);
  const riskMetric = formatSnapshotMetric('risk', featuredMission?.risk_level || 'Risk unknown');
  const timeMetric = formatSnapshotMetric('time', featuredMission?.time_required || 'Time window updating');
  const favoriteChain = (() => {
    const counts: Record<string, number> = {};
    safeAirdrops.forEach((item) => {
      item.blockchain?.forEach((chain) => {
        counts[chain] = (counts[chain] ?? 0) + 1;
      });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  })();
  const preferredRisk = (() => {
    const tally = { Low: 0, Medium: 0, High: 0 };
    safeAirdrops.forEach((item) => {
      if (item.risk_level === 'Low' || item.risk_level === 'Medium' || item.risk_level === 'High') {
        tally[item.risk_level] += 1;
      }
    });
    return Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Medium';
  })();
  const preferredDifficulty = (() => {
    const tally = { Easy: 0, Moderate: 0, Hard: 0 };
    safeAirdrops.forEach((item) => {
      if (item.difficulty === 'Easy' || item.difficulty === 'Moderate' || item.difficulty === 'Hard') {
        tally[item.difficulty] += 1;
      }
    });
    return Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Moderate';
  })();
  const recentlyVerifiedCount = safeAirdrops.filter(item => {
    if (item.listing_state !== 'verified' && !item.human_verified) return false;
    const updatedTime = new Date(item.updated_at).getTime();
    return Number.isFinite(updatedTime) && Date.now() - updatedTime <= 72 * 3_600_000;
  }).length;

  const briefingRecommendations = [
    {
      id: 'top-pick',
      label: 'Top pick',
      title: featuredMission?.name ?? 'Top opportunity updating',
      action: featuredMission ? `Start ${featuredMission.name}` : 'Review top opportunities',
      context: `Prioritize today's top mission: ${featuredMission?.name ?? 'none selected yet'}. Explain why this is best using trust score ${missionTrust}, risk ${featuredMission?.risk_level ?? 'unknown'}, reward ${missionReward}, and give a step-by-step start plan with the first action in under 2 minutes.`,
    },
    {
      id: 'deadlines',
      label: 'Deadlines',
      title: expiresTodayCount > 0 ? `${expiresTodayCount} project${expiresTodayCount === 1 ? '' : 's'} ending soon` : 'No urgent expiries today',
      action: expiresTodayCount > 0 ? 'Review urgent deadlines' : 'Plan tomorrow deadlines',
      context: `Review expiring opportunities. Today there are ${expiresTodayCount} urgent expiries and ${remainingCount} tasks remaining. Tell me which tasks to complete first, what can be safely deferred, and what deadline risks matter most.`,
    },
    {
      id: 'watchlist',
      label: 'Watchlist',
      title: watchlistCount > 0 ? `${watchlistCount} watchlist project${watchlistCount === 1 ? '' : 's'} active` : 'Watchlist not started',
      action: watchlistCount > 0 ? 'Optimize my watchlist' : 'Build my first watchlist',
      context: watchlistCount > 0
        ? `Optimize my watchlist of ${watchlistCount} projects. Compare watchlist vs trending, highlight weak picks, and suggest the 2 strongest replacements based on trust, urgency and effort.`
        : 'I have no watchlist yet. Recommend the first 3 projects I should track now based on trust, urgency, and low-effort start path.',
    },
  ];

  const dashboardHero = (() => {
    if (activeTab === 'tasks') {
      return {
        title: 'Daily Mission Tracker',
        subtitle: `You have ${remainingCount} task${remainingCount === 1 ? '' : 's'} left.`,
        detail: 'Complete your highest-trust unfinished missions first.',
      };
    }
    if (activeTab === 'airdrops') {
      return {
        title: 'Discover Your Next Opportunity',
        subtitle: `${safeAirdrops.length} live project${safeAirdrops.length === 1 ? '' : 's'} are available.`,
        detail: 'Use trust, reward and urgency to decide faster.',
      };
    }
    if (activeTab === 'api') {
      return {
        title: 'Developer Mission Control',
        subtitle: 'Manage access and turn intelligence into workflows.',
        detail: 'Your API state is synced with the latest account context.',
      };
    }
    if (activeTab === 'profile') {
      return {
        title: 'Personal Mission Profile',
        subtitle: `${watchlistCount} tracked project${watchlistCount === 1 ? '' : 's'} and ${streakDays} day streak.`,
        detail: 'Keep your reputation and habit loop moving forward.',
      };
    }
    return {
      title: 'Today\'s Mission',
      subtitle: `${remainingCount} tasks left • ${watchlistCount} watchlist`,
      detail: 'Focus on your best opportunity, then let AI prioritise your next step.',
    };
  })();
  const heroConfidenceLine = trustDelta === null
    ? `AI confidence ${copilotConfidencePct}% • baseline set today`
    : trustDelta >= 0
      ? `AI confidence ${copilotConfidencePct}% • trust is up ${trustDelta.toFixed(1)}% vs last visit`
      : `AI confidence ${copilotConfidencePct}% • trust is down ${Math.abs(trustDelta).toFixed(1)}% vs last visit`;
  const missionReadyCount = Math.max(1, Math.min(6,
    (featuredMission ? 1 : 0)
    + (watchlistCount > 0 ? 1 : 0)
    + (recentlyVerifiedCount > 0 ? 1 : 0)
    + (remainingCount > 0 ? 1 : 0)
  ));
  const heroGreeting = (() => {
    if (completedCount > 0 && new Date().getHours() >= 18) return `🛡 Intelligence Updated, ${firstName}`;
    if (watchlistCount > 0) return `🛡 Today's Briefing Ready, ${firstName}`;
    if (remainingCount > 0) return `🛡 Mission Ready, ${firstName}`;
    return `🛡 AI has analysed today's opportunities`;
  })();

  const openProfileOverview = () => {
    setActiveTab('profile');
    requestAnimationFrame(() => {
      document.getElementById('profile-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const openCopilot = useCallback((prompt?: string, context?: string) => {
    openCopilotWithPrompt(
      prompt ?? 'What should I focus on next in my dashboard today?',
      context ?? 'Dashboard mission context. Prioritize trust, urgency, and task completion order with concrete next steps.',
    );
  }, []);

  const handleBriefingActionClick = useCallback((item: { id: string; title: string; action: string; context: string }, index: number) => {
    trackAnalyticsEvent('dashboard_briefing_action_click', {
      recommendation_id: item.id,
      action_label: item.action,
      recommendation_title: item.title,
      recommendation_index: index,
      active_tab: activeTab,
      has_trust_delta: trustDelta !== null,
      trust_delta_value: trustDelta,
      watchlist_count: watchlistCount,
      remaining_tasks: remainingCount,
    });

    openCopilot(item.context, item.context);
  }, [activeTab, openCopilot, remainingCount, trustDelta, watchlistCount]);

  useEffect(() => {
    if (!user) return;
    const key = `ag_prev_trust_${user.id}`;
    const prevRaw = localStorage.getItem(key);
    const prev = prevRaw ? Number(prevRaw) : null;

    if (prev !== null && Number.isFinite(prev) && avgTrustScore > 0) {
      setTrustDelta(avgTrustScore - prev);
    } else {
      setTrustDelta(null);
    }

    if (avgTrustScore > 0) {
      localStorage.setItem(key, String(avgTrustScore));
    }
  }, [avgTrustScore, user]);

  useEffect(() => {
    if (requestedView === 'airdrops') setActiveTab('airdrops');
    else if (requestedView === 'tasks') setActiveTab('tasks');
    else if (requestedView === 'api') setActiveTab('api');
    else if (requestedView === 'profile') setActiveTab('profile');
    else if (requestedView === 'overview') setActiveTab('overview');
  }, [requestedView]);

  const activityTimeline = [
    {
      id: 'tasks',
      title: `${completedCount} checklist tasks completed`,
      detail: `${remainingCount} tasks still open in your workflow`,
    },
    {
      id: 'watchlist',
      title: `${watchlistCount} projects in your watchlist`,
      detail: `${watchlistAirdrops.length} are surfaced in dashboard widgets`,
    },
    {
      id: 'safety',
      title: `${marketPulse.riskSignals} urgent risk signals`,
      detail: `Critical deadline and quality indicators to review now`,
    },
    {
      id: 'reputation',
      title: `Level ${level} reputation profile`,
      detail: `${rep.toLocaleString()} REP tracked from verified platform activity`,
    },
  ];

  useEffect(() => {
    const context = (() => {
      if (activeTab === 'airdrops') {
        return `Dashboard airdrops tab. Search term: ${dashboardSearch || 'none'}. Prioritize trust score, urgency and progress.`;
      }

      if (activeTab === 'tasks') {
        return `Task tracking tab. ${remainingCount} tasks remain across ${taskAirdrops.length} airdrops. ${completedCount} missions completed this session.`;
      }

      if (activeTab === 'api') {
        return 'API access tab. Help with subscription status, API access and next setup steps.';
      }

      if (activeTab === 'profile') {
        return `Profile tab. Reputation level ${level}, ${watchlistCount} watchlist items and account activity are in focus. Streak: ${streakDays} days.`;
      }

      return `Dashboard overview. Today's focus is ${focusAirdrops[0]?.name ?? 'not set yet'}, with ${watchlistCount} watchlist items and ${remainingCount} tasks remaining. Completed missions: ${completedCount}. Favorite chain: ${favoriteChain ?? 'unknown'}. Preferred difficulty: ${preferredDifficulty}. Typical risk profile: ${preferredRisk}.`;
    })();

    window.dispatchEvent(new CustomEvent('ag:copilot-context', { detail: { context } }));
  }, [activeTab, completedCount, dashboardSearch, favoriteChain, focusAirdrops, level, preferredDifficulty, preferredRisk, remainingCount, streakDays, taskAirdrops.length, watchlistCount]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('ag:hero-hints', {
      detail: {
        watchlistCount,
        remainingTasks: remainingCount,
        completedTasks: completedCount,
        streakDays,
        avgTrustScore,
        aiPick: briefingRecommendations[0]?.title,
        tabLabel: activeTab,
        userLabel: firstName,
      },
    }));
  }, [activeTab, avgTrustScore, briefingRecommendations, completedCount, firstName, remainingCount, streakDays, watchlistCount]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neon-purple" />
      </div>
    );
  }

  if (!user) return null;

  const hasApiSubscription = Boolean(subscription);
  const subscriptionStatus = subscription?.status ?? 'none';
  const keyExists = Boolean(subscription?.key_value);
  const canManageApiKey = hasApiSubscription && subscriptionStatus === 'active';

  const apiAccessSection = (
    <div className="space-y-4">
      <div className="glass-card p-4 border border-white/10">
        <h2 className="text-lg font-bold text-white">API Access</h2>
        <p className="mt-1 text-xs text-gray-500">Manage your subscription and credentials for programmatic access.</p>
      </div>

      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
        <div>hasApiSubscription: {String(hasApiSubscription)}</div>
        <div>subscriptionStatus: {subscriptionStatus}</div>
        <div>keyExists: {String(keyExists)}</div>
      </div>

      {hasApiSubscription ? (
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">API Subscription</h2>
          <div className="relative overflow-hidden rounded-3xl border border-neon-purple/20 bg-gradient-to-br from-neon-purple/[0.10] via-dark-800 to-sky-500/[0.06] p-6 space-y-4">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.16),transparent_30%)] pointer-events-none" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-base font-semibold text-white capitalize">{subscription?.plan} Plan</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {subscriptionStatus === 'active' ? 'Active subscription' : `Subscription status: ${subscriptionStatus}`}
                </p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${
                subscriptionStatus === 'active'
                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/25 text-amber-400'
              }`}>{subscriptionStatus}</span>
            </div>
            <div className="relative flex flex-wrap gap-3">
              <a href="/api-docs" className="flex-1 btn-secondary text-sm flex items-center justify-center gap-2 min-w-0 sm:min-w-[140px]">
                <ExternalLink className="w-4 h-4" /> API Docs
              </a>
              <button
                type="button"
                onClick={() => void handleGenerateApiKey()}
                disabled={!canManageApiKey || apiKeyBusy}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-sky-300 border border-sky-500/25 hover:text-sky-200 hover:bg-sky-500/10 transition-colors disabled:opacity-60"
              >
                {apiKeyBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {keyExists ? 'Regenerate Key' : 'Generate Key'}
              </button>
              {keyExists && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-gray-400 border border-white/10 hover:text-white hover:bg-white/5 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied' : 'Copy Key'}
                </button>
              )}
            </div>
            {!canManageApiKey && (
              <p className="relative text-xs text-amber-200 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                API key actions are unavailable because subscriptionStatus is {subscriptionStatus}.
              </p>
            )}
            <div className="relative rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-gray-500">API Key</p>
              <p className="mt-1 font-mono text-xs text-cyan-100 break-all">
                {subscription?.key_value ?? 'No key generated yet. Click Generate Key.'}
              </p>
            </div>
            {apiKeyError && (
              <p className="relative text-xs text-rose-300 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2">
                API key error: {apiKeyError}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-3xl border border-neon-purple/20 bg-gradient-to-br from-neon-purple/[0.10] via-dark-800 to-sky-500/[0.06] p-6 flex items-center gap-4">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.16),transparent_30%)] pointer-events-none" />
          <div className="relative w-10 h-10 rounded-xl bg-neon-purple/10 border border-neon-purple/20 flex items-center justify-center shrink-0">
            <Key className="w-5 h-5 text-neon-purple" />
          </div>
          <div className="relative flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Unlock API Access</p>
            <p className="text-xs text-gray-500 mt-0.5">No API subscription row was found for this user. Choose a plan to create API access.</p>
          </div>
          <Link to="/pricing" className="relative btn-primary text-sm px-4 py-2 shrink-0 text-center">
            View Plans
          </Link>
        </div>
      )}
    </div>
  );

 return (
  <>
    <SEO
      title="Dashboard | AirdropGuard"
      description="Private mission control dashboard."
      canonical={canonicalFromPath('/dashboard')}
      noindex
    />
    {activeTab === 'overview' && (
      <div className="space-y-4 animate-in">
        <section className="mission-control-hero mission-grid relative isolate overflow-hidden rounded-[30px] border border-cyan-300/30 p-4 shadow-[0_30px_80px_rgba(2,6,23,0.65)] sm:p-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(34,211,238,0.23),transparent_35%),radial-gradient(circle_at_15%_90%,rgba(56,189,248,0.16),transparent_32%),linear-gradient(150deg,rgba(2,10,28,0.98),rgba(3,16,40,0.94)_52%,rgba(6,26,56,0.96))]" />
          <div className="mission-network pointer-events-none absolute inset-0 opacity-55" />
          <div className="pointer-events-none absolute -right-28 -top-24 h-72 w-72 rounded-full bg-cyan-400/18 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-blue-500/18 blur-3xl" />

          {[0, 1, 2, 3, 4, 5, 6, 7].map((particle) => (
            <span
              key={particle}
              className="mission-particle pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-cyan-200/75"
              style={{
                left: `${8 + particle * 12}%`,
                top: `${15 + (particle % 4) * 18}%`,
                animationDelay: `${particle * 0.6}s`,
              }}
            />
          ))}

          <div className="relative z-10 grid min-h-[calc(100svh-5rem)] gap-5 md:min-h-[620px] lg:grid-cols-[1.2fr_0.8fr] lg:gap-6">
            <div className="flex flex-col justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em]">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/12 px-2.5 py-1 text-emerald-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  AI Online
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-500/12 px-2.5 py-1 text-cyan-100">
                  <Activity className="h-3.5 w-3.5 animate-pulse" />
                  Mission Control Live
                </span>
                <span className="inline-flex items-center rounded-full border border-white/20 bg-white/[0.08] px-2.5 py-1 text-white/85">Updated just now</span>
                <span className="inline-flex items-center rounded-full border border-white/20 bg-white/[0.08] px-2.5 py-1 text-white/85">{missionReadyCount} missions ready</span>
                <span className="inline-flex items-center rounded-full border border-white/20 bg-white/[0.08] px-2.5 py-1 text-white/85">{Math.round(avgTrustScore)}% trust</span>
                <span className="inline-flex items-center rounded-full border border-white/20 bg-white/[0.08] px-2.5 py-1 text-white/85">Wallet ready</span>
              </div>

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100/90">{heroGreeting}</p>
                  <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/90">AirdropGuard AI</p>
                  <h1 className="mt-2 text-3xl font-black leading-[1.02] text-white sm:text-4xl lg:text-5xl">
                    MISSION READY
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm text-sky-100/95 sm:text-base">
                    Enter the command bridge for Web3. Your highest-value opportunity is already ranked, verified, and ready to execute.
                  </p>
                  <p className={`mt-2 text-xs font-semibold ${trustDelta === null ? 'text-cyan-100' : trustDelta >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
                    {heroConfidenceLine}
                  </p>
                </div>
                <div className="mission-orb-pulse hidden h-20 w-20 items-center justify-center rounded-[28px] border border-cyan-300/35 bg-cyan-500/10 shadow-[0_0_46px_rgba(34,211,238,0.34)] sm:flex">
                  <AiOrb className="h-11 w-11" />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
                <div className="min-w-0 rounded-2xl border border-cyan-300/25 bg-[#07182f]/85 p-4 backdrop-blur">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100/85">Featured Opportunity</p>
                  {featuredMission ? (
                    <>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="h-12 w-12 overflow-hidden rounded-2xl border border-cyan-300/35 bg-[#0b2142]">
                          {featuredMission.logo_url ? (
                            <img
                              src={featuredMission.logo_url}
                              alt=""
                              className="h-full w-full object-cover"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm font-black text-cyan-100">{featuredMission.name[0]}</div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-lg font-black text-white">{featuredMission.name}</p>
                          <p className="mt-0.5 text-xs text-cyan-100/90">AI + human verified workflow</p>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-xl border border-white/15 bg-white/[0.06] px-2 py-2">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-cyan-100/75">Trust</p>
                          <AnimatedCounter value={missionTrust} suffix="%" className="mt-1 block text-lg font-black text-cyan-100 tabular-nums" />
                        </div>
                        <div className="rounded-xl border border-white/15 bg-white/[0.06] px-2 py-2">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-cyan-100/75">AI confidence</p>
                          <AnimatedCounter value={copilotConfidencePct} suffix="%" className="mt-1 block text-lg font-black text-emerald-200 tabular-nums" />
                        </div>
                        <div className="rounded-xl border border-white/15 bg-white/[0.06] px-2 py-2">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-cyan-100/75">Time left</p>
                          <p className="mt-1 truncate text-sm font-black text-amber-100">
                            {featuredMission.expiry_date ? `${missionCountdown.days}d ${pad(missionCountdown.hours)}h` : 'Updating'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 grid min-w-0 grid-cols-3 gap-2 lg:[grid-template-columns:repeat(3,minmax(0,1fr))]">
                        {[
                          { label: 'Reward', tone: 'border-cyan-300/35 bg-cyan-500/18 text-cyan-100', value: rewardMetric },
                          { label: 'Risk', tone: 'border-emerald-400/35 bg-emerald-500/16 text-emerald-100', value: riskMetric },
                          { label: 'Time', tone: 'border-white/20 bg-white/[0.1] text-white', value: timeMetric },
                        ].map((metric) => (
                          <div key={metric.label} className={`flex min-h-[84px] min-w-0 flex-col items-center justify-center rounded-2xl border px-2.5 py-3 text-center sm:px-3 ${metric.tone}`}>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-75">{metric.label}</p>
                            <p className="mt-1 text-[11px] font-bold leading-tight text-center whitespace-normal break-words [overflow-wrap:anywhere] sm:text-xs lg:text-[11px]">{metric.value.primary}</p>
                            {metric.value.secondary && (
                              <p className="mt-0.5 text-[10px] leading-tight text-center opacity-85 whitespace-normal break-words [overflow-wrap:anywhere] lg:text-[10px]">{metric.value.secondary}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.05] p-3 text-xs text-gray-200">Mission is loading from your active queue.</p>
                  )}
                </div>

                <div className="rounded-2xl border border-cyan-300/22 bg-[#071a34]/85 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100/80">Live Trust Ring</p>
                      <p className="text-xs text-cyan-100/80">Realtime trust and confidence telemetry</p>
                    </div>
                    <div className="relative h-[84px] w-[84px]">
                      <div className="absolute inset-0 rounded-full bg-cyan-400/20 blur-xl" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <RingProgress pct={missionTrust} size={84} stroke={5.5} />
                        <div className="absolute text-center">
                          <AnimatedCounter value={missionTrust} suffix="%" className="block text-lg font-black text-white tabular-nums" />
                          <span className="text-[10px] text-cyan-100/80">trust</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {briefingRecommendations.slice(0, 3).map((item, index) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleBriefingActionClick(item, index)}
                        className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/15 bg-white/[0.05] px-3 py-2 text-left transition-colors hover:border-cyan-300/35 hover:bg-white/[0.09]"
                      >
                        <span className="min-w-0">
                          <span className="block text-[10px] uppercase tracking-[0.14em] text-cyan-100/75">AI insight {index + 1}</span>
                          <span className="block truncate text-xs font-semibold text-white">{item.title}</span>
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-cyan-100/80" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                <div className="relative sm:max-w-xs">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={dashboardSearch}
                    onChange={(event) => setDashboardSearch(event.target.value)}
                    placeholder="Search missions"
                    className="h-11 w-full rounded-2xl border border-cyan-500/25 bg-white/[0.07] pl-10 pr-3 text-sm text-white placeholder:text-gray-400 focus:border-cyan-300/55 focus:outline-none"
                  />
                </div>
                <button
                  onClick={fetchData}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-cyan-300/35 bg-cyan-500/18 px-4 text-xs font-bold text-cyan-100 transition-colors hover:bg-cyan-500/28"
                  title="Refresh"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
                {featuredMission ? (
                  <Link
                    to={`/airdrop/${featuredMission.slug}`}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-cyan-300/45 bg-gradient-to-r from-cyan-500/36 to-blue-500/34 px-4 text-xs font-black text-white shadow-[0_14px_34px_rgba(6,182,212,0.28)] transition-colors hover:from-cyan-500/48 hover:to-blue-500/45"
                  >
                    <Target className="h-3.5 w-3.5" />
                    Open Mission
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={openCopilot}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-cyan-300/45 bg-gradient-to-r from-cyan-500/36 to-blue-500/34 px-4 text-xs font-black text-white shadow-[0_14px_34px_rgba(6,182,212,0.28)] transition-colors hover:from-cyan-500/48 hover:to-blue-500/45"
                  >
                    <AiOrb className="h-3.5 w-3.5" />
                    Open Mission
                  </button>
                )}
              </div>
            </div>

            <aside className="flex flex-col justify-between gap-3 lg:pt-1">
              <div className="rounded-2xl border border-white/15 bg-white/[0.05] p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase tracking-[0.14em] text-cyan-100/75">Live indicators</span>
                  <Bell className="h-4 w-4 text-cyan-100/80" />
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl border border-white/15 bg-white/[0.06] p-2">
                    <AnimatedCounter value={marketPulse.momentum} suffix="%" className="block text-base font-black text-emerald-300" />
                    <p className="text-[10px] text-gray-300">Momentum</p>
                  </div>
                  <div className="rounded-xl border border-white/15 bg-white/[0.06] p-2">
                    <AnimatedCounter value={recentlyVerifiedCount} className="block text-base font-black text-amber-200" />
                    <p className="text-[10px] text-gray-300">Verified</p>
                  </div>
                  <div className="rounded-xl border border-white/15 bg-white/[0.06] p-2">
                    <AnimatedCounter value={marketPulse.riskSignals} className="block text-base font-black text-rose-300" />
                    <p className="text-[10px] text-gray-300">Risk</p>
                  </div>
                </div>
              </div>

              <div className="hidden rounded-2xl border border-white/15 bg-white/[0.05] p-3 lg:block">
                <div className="flex items-center gap-2 text-xs text-gray-100">
                  <UserCircle2 className="h-4 w-4 text-cyan-200" />
                  <span className="truncate">{user.email}</span>
                </div>
                <button
                  onClick={async () => { await supabase.auth.signOut(); navigate('/auth'); }}
                  className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-xl border border-rose-500/25 bg-rose-500/12 px-3 text-xs font-semibold text-rose-200 transition-colors hover:bg-rose-500/22 hover:text-white"
                >
                  Log Out
                </button>
              </div>
            </aside>
          </div>
        </section>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="glass-card rounded-[26px] border border-cyan-400/28 bg-[linear-gradient(145deg,rgba(8,145,178,0.2),rgba(8,20,42,0.94))] p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AiOrb className="h-6 w-6" />
                <h3 className="text-sm font-bold text-white">Ask AI</h3>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200"><AiOrb className="h-3.5 w-3.5" />Online</span>
            </div>
            <p className="text-xs text-cyan-100">Safer airdrops, smarter decisions.</p>
            <button
              type="button"
              onClick={openCopilot}
              className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-xs font-black text-white shadow-[0_12px_28px_rgba(14,165,233,0.34)]"
            >
              <AiOrb className="h-4 w-4" />
              Ask what to do next
            </button>
          </div>

          <div className="glass-card rounded-[26px] border border-blue-400/28 bg-[linear-gradient(145deg,rgba(37,99,235,0.22),rgba(8,20,42,0.94))] p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-white">Continue Tasks</h3>
              <div className="rounded-full border border-white/20 bg-white/[0.08] px-2 py-0.5 text-[10px] font-bold text-white">{overallPct}%</div>
            </div>
            <div className="flex items-center gap-3">
              <RingProgress pct={overallPct} size={58} stroke={5} />
              <p className="text-xs text-blue-100">{completedCount} complete • {remainingCount} remaining</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-blue-300/40 bg-blue-500/20 px-4 py-2 text-xs font-bold text-blue-100"
            >
              Resume checklist
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="glass-card rounded-[26px] border border-violet-400/22 bg-[linear-gradient(145deg,rgba(79,70,229,0.12),rgba(8,20,42,0.94))] p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-white">Watchlist Preview</h3>
              <span className="text-[10px] text-violet-100">{watchlistAirdrops.length}</span>
            </div>
            {watchlistAirdrops.length === 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-200">No watchlist yet. Start tracking projects so AI can personalise your recommendations.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('airdrops')}
                  className="inline-flex min-h-[38px] items-center gap-2 rounded-xl border border-violet-300/30 bg-violet-500/15 px-3 py-2 text-[11px] font-bold text-violet-100"
                >
                  Start tracking projects
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {watchlistAirdrops.slice(0, 3).map(item => (
                  <Link key={item.id} to={`/airdrop/${item.slug}`} className="flex items-center justify-between gap-2 rounded-xl border border-white/15 bg-white/[0.07] px-2.5 py-2 text-xs text-white hover:border-cyan-400/30">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="h-7 w-7 shrink-0 overflow-hidden rounded-lg border border-white/15 bg-[#0b1e3a]">
                        {item.logo_url ? (
                          <img
                            src={item.logo_url}
                            alt=""
                            className="h-full w-full object-cover"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-cyan-100">{item.name[0]}</span>
                        )}
                      </span>
                      <span className="truncate">{item.name}</span>
                    </span>
                    <span className="rounded-full border border-cyan-400/30 bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold text-cyan-100">{item.trust_score ?? 0}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <section>
          {apiAccessSection}
        </section>

        <section className="rounded-[28px] border border-cyan-400/20 bg-[linear-gradient(160deg,rgba(6,14,32,0.96),rgba(8,20,42,0.92))] p-4 shadow-[0_18px_45px_rgba(3,8,24,0.45)] sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">Daily AI Briefing</p>
              <h3 className="mt-1 text-xl font-black text-white">What changed and what to do now</h3>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300/25 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-semibold text-cyan-100">
              Updated moments ago
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px]">
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-1 font-semibold text-cyan-100">
              {briefingRecommendations[0]?.title}
            </span>
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-1 font-semibold text-emerald-100">
              {recentlyVerifiedCount} verified in 72h
            </span>
            <span className={`inline-flex items-center rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-1 font-semibold ${trustDelta === null ? 'text-white' : trustDelta >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
              {trustDelta === null ? 'Trust baseline set' : `${trustDelta >= 0 ? '+' : ''}${trustDelta.toFixed(1)} trust vs last visit`}
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleBriefingActionClick(briefingRecommendations[0], 0)}
            className="mt-4 inline-flex min-h-[50px] w-full items-center justify-between gap-3 rounded-2xl border border-cyan-300/40 bg-gradient-to-r from-cyan-500/30 to-blue-500/30 px-4 py-3 text-left text-sm font-black text-white shadow-[0_12px_30px_rgba(14,165,233,0.22)] transition-colors hover:from-cyan-500/40 hover:to-blue-500/40"
          >
            <span>Start Today&apos;s Mission</span>
            <ChevronRight className="h-4 w-4 shrink-0" />
          </button>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {briefingRecommendations.map((item, index) => (
              <button
                key={item.title}
                type="button"
                onClick={() => handleBriefingActionClick(item, index)}
                className="inline-flex min-h-[48px] items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left text-xs font-semibold text-white transition-colors hover:bg-white/[0.06]"
              >
                <span className="min-w-0">
                  <span className="block text-[10px] uppercase tracking-[0.14em] text-cyan-200/90">{item.label}</span>
                  <span className="block truncate">{item.action}</span>
                </span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0" />
              </button>
            ))}
          </div>
        </section>

        <div className="hidden gap-4 lg:grid lg:grid-cols-2" id="profile-section">
          <div className="glass-card p-4 border border-sky-500/20 transition-all duration-200 hover:-translate-y-0.5">
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-sky-300" />
              <h2 className="text-sm font-semibold text-white">Airdrop Opportunities</h2>
            </div>
            <div className="grid grid-cols-[110px_1fr] items-center gap-4">
              <div className="relative h-28 w-28 rounded-full p-2" style={opportunityDonutStyle}>
                <div className="flex h-full w-full items-center justify-center rounded-full border border-white/10 bg-[#0a1022]">
                  <span className="text-xs font-bold text-white">{safeAirdrops.length}</span>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                {[
                  { label: 'High', value: highPotentialCount, tone: 'bg-cyan-400' },
                  { label: 'Medium', value: mediumPotentialCount, tone: 'bg-indigo-400' },
                  { label: 'Low', value: lowPotentialCount, tone: 'bg-amber-400' },
                  { label: 'Review', value: underReviewCount, tone: 'bg-violet-400' },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                    <span className="inline-flex items-center gap-2 text-gray-300">
                      <span className={`h-2.5 w-2.5 rounded-full ${row.tone}`} />
                      {row.label}
                    </span>
                    <span className="font-bold text-white">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="glass-card p-4 border border-violet-500/20 transition-all duration-200 hover:-translate-y-0.5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Top Recommended Airdrops</h2>
              <span className="text-[11px] text-gray-500">Trust-ranked</span>
            </div>
            <div className="space-y-2">
              {priorityAirdrops.slice(0, 5).map(item => (
                <Link key={item.id} to={`/airdrop/${item.slug}`} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs hover:border-sky-500/30">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{item.name}</p>
                    <p className="text-[10px] text-gray-500">{(item.tasks ?? []).length} tasks</p>
                  </div>
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">{item.trust_score ?? 0}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="hidden gap-4 lg:grid lg:grid-cols-2">
          <div className="glass-card p-4 border border-white/10 transition-all duration-200 hover:-translate-y-0.5">
            <div className="mb-3 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-300" />
              <h2 className="text-sm font-semibold text-white">Your Activity</h2>
            </div>
            <div className="space-y-3">
              {activityTimeline.map((entry, idx) => (
                <div key={entry.id} className="relative pl-5">
                  <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-sky-400" />
                  {idx < activityTimeline.length - 1 && <span className="absolute left-[4px] top-4 h-[calc(100%-8px)] w-px bg-white/10" />}
                  <p className="text-xs font-semibold text-white">{entry.title}</p>
                  <p className="text-[11px] text-gray-500">{entry.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-amber-500/20 bg-amber-500/[0.06] p-4 transition-all duration-200 hover:-translate-y-0.5">
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <div>
                <h2 className="text-sm font-bold text-white">Safety First Always</h2>
                <p className="mt-1 text-xs leading-relaxed text-gray-300">
                  Verify project links, avoid suspicious wallet connections, and never share seed phrases or private keys. Treat every reward claim with caution until verified.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    )}

    {activeTab === 'airdrops' && (
      <div className="space-y-6">
        <div className="glass-card p-4 border border-white/10">
          <h2 className="text-lg font-bold text-white">Top Recommended Airdrops</h2>
          <p className="mt-1 text-xs text-gray-500">High-value opportunities ranked by trust, urgency, and current checklist progress.</p>
        </div>
        {/* Trending */}
        {trendingAirdrops.length > 0 && (
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-neon-purple/10 border border-neon-purple/20 flex items-center justify-center shrink-0">
                <TrendingUp className="w-3.5 h-3.5 text-neon-purple" />
              </div>
              <h2 className="text-sm font-semibold text-white">Trending</h2>
              <span className="text-[10px] text-gray-600 ml-auto">By trust score</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-0 sm:gap-2">
              {trendingAirdrops.map((a, i) => (
                <Link
                  key={a.id}
                  to={`/airdrop/${a.slug}`}
                  className={`flex sm:flex-col items-center sm:items-center gap-3 sm:gap-1.5 py-2.5 sm:py-3 sm:px-2 ${i < trendingAirdrops.length - 1 ? 'border-b sm:border-b-0 border-white/5' : ''} hover:bg-white/[0.03] -mx-4 px-4 sm:mx-0 sm:px-2 rounded-xl sm:rounded-xl transition-colors group`}
                >
                  <div className="relative shrink-0">
                    <div className="w-8 h-8 rounded-xl bg-dark-700 border border-white/10 overflow-hidden flex items-center justify-center">
                      {a.logo_url
                        ? <img src={a.logo_url} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        : <span className="text-[10px] font-bold gradient-text">{a.name[0]}</span>}
                    </div>
                    {a.is_trending && (
                      <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full flex items-center justify-center">
                        <Star className="w-2 h-2 text-white fill-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 sm:text-center">
                    <p className="text-xs font-medium text-white truncate group-hover:text-neon-purple transition-colors">{a.name}</p>
                    {a.trust_score != null && (
                      <p className="text-[10px] text-gray-500 tabular-nums">{a.trust_score}/100</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Priority Airdrops */}
        {airdrops.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Priority Airdrops</h2>
              {airdrops.length > 6 && <span className="text-[10px] text-gray-600">Top 6 of {airdrops.length}</span>}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {priorityAirdrops.map(a => (
                <ProgressCard key={a.id} airdrop={a} done={doneByAirdrop[a.id] ?? 0} total={(a.tasks ?? []).length} />
              ))}
            </div>
          </div>
        )}

        {/* Task-enabled airdrops */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Airdrops With Tasks</h2>
            <span className="text-[10px] text-gray-600">{taskAirdrops.length} active checklist{taskAirdrops.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="glass-card overflow-hidden border border-white/5">
            {taskAirdrops.length === 0 ? (
              <div className="p-8 text-center">
                <ListChecks className="w-8 h-8 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No task checklists found for current airdrops.</p>
                <p className="text-xs text-gray-700 mt-1">This means the airdrops are listed, but no task rows were returned from Supabase.</p>
              </div>
            ) : (
              taskAirdrops.map(a => (
                <AirdropRow key={a.id} airdrop={a} completedIds={completedIds} onToggle={handleToggle} />
              ))
            )}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        {deadlineAirdrops.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Upcoming Deadlines</h2>
              <Clock className="w-3.5 h-3.5 text-gray-600" />
              {deadlineAirdrops.some(a => urgencyOf(a.expiry_date) === 'critical') && (
                <span className="text-[10px] bg-rose-500/15 border border-rose-500/30 text-rose-400 px-2 py-0.5 rounded font-medium">Urgent</span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {deadlineAirdrops.map(a => <DeadlineCard key={a.id} airdrop={a} />)}
            </div>
          </div>
        )}
      </div>
    )}

    {activeTab === 'tasks' && (
      <div className="space-y-4">
        <div className="glass-card p-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Task Checklist</h2>
            <p className="text-xs text-gray-500 mt-1">{completedCount} complete · {remainingCount} remaining · {overallPct}% progress · Personal tracking only, no REP</p>
          </div>
          <Flame className="w-5 h-5 text-amber-400" />
        </div>

        <div className="glass-card overflow-hidden">
          {airdrops.length === 0 ? (
            <div className="p-10 text-center">
              <Rocket className="w-8 h-8 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No airdrops available yet.</p>
            </div>
          ) : (
            airdrops.map(a => <AirdropRow key={a.id} airdrop={a} completedIds={completedIds} onToggle={handleToggle} />)
          )}
        </div>
      </div>
    )}

    {activeTab === 'api' && (
      apiAccessSection
    )}

    {activeTab === 'profile' && (
      <div className="space-y-4" id="profile-section">
        <div className="glass-card border border-white/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Profile & Access</h2>
              <p className="mt-1 text-xs text-gray-500">Reputation, activity, intelligence and API access in one place.</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('api')}
              className="rounded-xl border border-sky-500/25 bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-200"
            >
              API Access
            </button>
          </div>
        </div>

        <div className="glass-card border border-emerald-500/20 p-4 transition-all duration-200 hover:-translate-y-0.5">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-300" />
            <h3 className="text-sm font-semibold text-white">Market Pulse</h3>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2">
              <div className="text-sm font-black text-emerald-300">{marketPulse.momentum}%</div>
              <div className="text-[10px] text-gray-500">Momentum</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2">
              <div className="text-sm font-black text-amber-300">{marketPulse.reviewed}</div>
              <div className="text-[10px] text-gray-500">Review</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2">
              <div className="text-sm font-black text-rose-300">{marketPulse.riskSignals}</div>
              <div className="text-[10px] text-gray-500">Risk</div>
            </div>
          </div>
        </div>

        {apiAccessSection}

        <ReputationCard reputation={reputation} unlocks={unlocks} onRefresh={fetchReputation} />
        <ReputationRulesNotice />

        <div className="glass-card p-4 border border-white/10 transition-all duration-200 hover:-translate-y-0.5">
          <div className="mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-300" />
            <h2 className="text-sm font-semibold text-white">Your Activity</h2>
          </div>
          <div className="space-y-3">
            {activityTimeline.map((entry, idx) => (
              <div key={entry.id} className="relative pl-5">
                <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-sky-400" />
                {idx < activityTimeline.length - 1 && <span className="absolute left-[4px] top-4 h-[calc(100%-8px)] w-px bg-white/10" />}
                <p className="text-xs font-semibold text-white">{entry.title}</p>
                <p className="text-[11px] text-gray-500">{entry.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <DashboardEngagementPanel />
        <AirdropGuardIntelligenceCentre />
      </div>
    )}
  </>
  );
}