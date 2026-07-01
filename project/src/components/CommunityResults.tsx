import { useState, useEffect } from 'react';
import { Users, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// ── Types ────────────────────────────────────────────────────────────────────

interface AirdropStats {
  total_responses:    number;
  received_count:     number;
  not_eligible_count: number;
  waiting_count:      number;
  top_reward_range:   string | null;
}

interface UserResult {
  id:           string;
  status:       'received' | 'not_eligible' | 'waiting';
  reward_range: string | null;
}

interface Props {
  airdropId: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const REWARD_RANGES = ['<100', '100-500', '500-1000', '1000-5000', '5000+'] as const;
type RewardRange = typeof REWARD_RANGES[number];

const REWARD_LABELS: Record<RewardRange, string> = {
  '<100':      'Under $100',
  '100-500':   '$100–$500',
  '500-1000':  '$500–$1,000',
  '1000-5000': '$1,000–$5,000',
  '5000+':     '$5,000+',
};

const STATUS_OPTS = [
  { value: 'received'     as const, label: 'Received',     activeClass: 'border-emerald-500 bg-emerald-500/15 text-emerald-400' },
  { value: 'not_eligible' as const, label: 'Not Eligible',  activeClass: 'border-rose-500    bg-rose-500/15    text-rose-400'    },
  { value: 'waiting'      as const, label: 'Waiting',       activeClass: 'border-amber-500   bg-amber-500/15   text-amber-400'   },
] as const;

const STATUS_COLOR: Record<UserResult['status'], string> = {
  received:     'text-emerald-400',
  not_eligible: 'text-rose-400',
  waiting:      'text-amber-400',
};

const STATUS_LABEL: Record<UserResult['status'], string> = {
  received:     'Received',
  not_eligible: 'Not Eligible',
  waiting:      'Waiting',
};

const INACTIVE_BTN = 'border-white/10 bg-dark-700/40 text-gray-500 hover:text-gray-300';
const MIN_RESPONSES = 10;

// ── Component ────────────────────────────────────────────────────────────────

export default function CommunityResults({ airdropId }: Props) {
  const { user } = useAuth();

  const [stats,      setStats]      = useState<AirdropStats | null>(null);
  const [userResult, setUserResult] = useState<UserResult   | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editMode,   setEditMode]   = useState(false);

  const [selectedStatus, setSelectedStatus] = useState<UserResult['status']>('received');
  const [selectedRange,  setSelectedRange]  = useState<RewardRange | ''>('');

  // ── Data loading ─────────────────────────────────────────────────────────

  async function loadStats() {
    const { data } = await supabase
      .rpc('get_airdrop_results_stats', { p_airdrop_id: airdropId });
    setStats((data as AirdropStats[] | null)?.[0] ?? null);
  }

  async function loadUserResult() {
    if (!user) { setUserResult(null); return; }
    const { data } = await supabase
      .from('airdrop_results')
      .select('id, status, reward_range')
      .eq('airdrop_id', airdropId)
      .eq('user_id', user.id)
      .maybeSingle();
    setUserResult(data as UserResult | null);
  }

  async function load() {
    setLoading(true);
    await Promise.all([loadStats(), loadUserResult()]);
    setLoading(false);
  }

  useEffect(() => { load(); }, [airdropId, user?.id]);

  // ── Submission ────────────────────────────────────────────────────────────

  function startEdit() {
    setSelectedStatus(userResult?.status ?? 'received');
    setSelectedRange((userResult?.reward_range as RewardRange | '') ?? '');
    setEditMode(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    await supabase.from('airdrop_results').upsert(
      {
        user_id:      user.id,
        airdrop_id:   airdropId,
        status:       selectedStatus,
        reward_range: selectedStatus === 'received' ? (selectedRange || null) : null,
        updated_at:   new Date().toISOString(),
      },
      { onConflict: 'user_id,airdrop_id' },
    );
    await Promise.all([loadStats(), loadUserResult()]);
    setEditMode(false);
    setSubmitting(false);
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const total     = stats?.total_responses    ?? 0;
  const hasEnough = total >= MIN_RESPONSES;
  const pct       = (n: number) => Math.round((n / total) * 100);
  const showForm  = !userResult || editMode;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-neon-blue" />
          <h2 className="text-base font-semibold text-white">Community Results</h2>
        </div>
        {!loading && (
          <span className="text-xs text-gray-500">
            {total} {total === 1 ? 'Response' : 'Responses'}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6 gap-2 text-gray-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs">Loading...</span>
        </div>
      ) : (
        <>
          {/* Stats — only shown when we have enough data */}
          {hasEnough ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
                <div className="bg-emerald-500/10 border border-emerald-500/15 rounded-xl p-3">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Received</div>
                  <div className="text-sm font-bold text-emerald-400">{pct(stats!.received_count)}%</div>
                </div>
                <div className="bg-rose-500/10 border border-rose-500/15 rounded-xl p-3">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Not Eligible</div>
                  <div className="text-sm font-bold text-rose-400">{pct(stats!.not_eligible_count)}%</div>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/15 rounded-xl p-3">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Waiting</div>
                  <div className="text-sm font-bold text-amber-400">{pct(stats!.waiting_count)}%</div>
                </div>
                <div className="bg-neon-blue/10 border border-neon-blue/15 rounded-xl p-3">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Top Reward</div>
                  <div className="text-sm font-bold text-neon-blue leading-tight">
                    {stats!.top_reward_range
                      ? REWARD_LABELS[stats!.top_reward_range as RewardRange]
                      : '—'}
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-gray-700 mb-5">
                Community-reported data. Results may vary.
              </p>
            </>
          ) : (
            <p className="text-xs text-gray-600 text-center py-3 mb-5">
              Community data is still being collected.
            </p>
          )}

          {/* CTA / Form */}
          {!user ? (
            <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-dark-700/40 border border-white/5">
              <p className="text-xs text-gray-500">Sign in to report your result for this airdrop.</p>
              <Link to="/auth" className="shrink-0 text-xs font-semibold text-neon-purple hover:text-neon-purple/80 transition-colors">
                Sign In
              </Link>
            </div>
          ) : !showForm ? (
            <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-dark-700/40 border border-white/5">
              <div>
                <span className="text-xs text-gray-500">Your result: </span>
                <span className={`text-xs font-semibold ${STATUS_COLOR[userResult!.status]}`}>
                  {STATUS_LABEL[userResult!.status]}
                  {userResult!.reward_range && ` — ${REWARD_LABELS[userResult!.reward_range as RewardRange]}`}
                </span>
              </div>
              <button
                onClick={startEdit}
                className="text-xs text-gray-500 hover:text-white transition-colors"
              >
                Edit
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <p className="text-xs text-gray-500">
                {userResult ? 'Update your result:' : 'Report your result:'}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {STATUS_OPTS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedStatus(opt.value)}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-colors ${
                      selectedStatus === opt.value ? opt.activeClass : INACTIVE_BTN
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {selectedStatus === 'received' && (
                <select
                  value={selectedRange}
                  onChange={e => setSelectedRange(e.target.value as RewardRange | '')}
                  className="w-full bg-dark-700/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-neon-blue/40 appearance-none cursor-pointer"
                >
                  <option value="">Select reward range (optional)</option>
                  {REWARD_RANGES.map(r => (
                    <option key={r} value={r}>{REWARD_LABELS[r]}</option>
                  ))}
                </select>
              )}
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs px-4 py-2 disabled:opacity-60 flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
                  {userResult ? 'Update' : 'Submit'}
                </button>
                {userResult && (
                  <button
                    type="button"
                    onClick={() => setEditMode(false)}
                    className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
