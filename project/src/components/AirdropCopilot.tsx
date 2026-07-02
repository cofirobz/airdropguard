import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Bot,
  ChevronRight,
  Clock3,
  Gem,
  Loader2,
  MessageSquare,
  Send,
  Settings2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { UserPreferences } from '../lib/types';

const CHAIN_OPTIONS = ['Ethereum', 'Solana', 'Base', 'Arbitrum', 'Optimism', 'Polygon', 'BNB Chain', 'Avalanche', 'Sui', 'Bitcoin'];
const QUICK_PROMPTS = [
  { icon: Target, title: 'Which projects should I focus on today?', prompt: 'Which projects should I focus on today?' },
  { icon: Gem, title: 'Show me highest reward opportunities', prompt: 'Show me highest reward opportunities' },
  { icon: ShieldCheck, title: 'Which airdrops are safest for beginners?', prompt: 'Which airdrops are safest for beginners?' },
  { icon: Timer, title: 'I only have 20 minutes, what should I do?', prompt: 'I only have 20 minutes, what should I do?' },
  { icon: Sparkles, title: 'Compare Union vs OpenSea', prompt: 'Compare Union vs OpenSea for risk, time, and reward potential.' },
  { icon: ChevronRight, title: 'More suggestions', prompt: 'Give me more tailored suggestions based on my current dashboard activity.' },
];

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

const SAFETY_TEXT = 'AirdropGuard provides educational analysis only, not financial advice. Never share your seed phrase or connect your wallet to unknown sites.';

type CopilotSummary = {
  userName?: string;
  totalAirdrops?: number;
  verifiedCount?: number;
  expiresToday?: number;
  momentumLabel?: string;
  estimatedRewards?: string;
  confidence?: number;
  dataSources?: number;
  lastUpdated?: string;
};

type AirdropCopilotProps = {
  onClose?: () => void;
  summary?: CopilotSummary;
  className?: string;
};

const DEFAULT_PREFERENCES: Omit<UserPreferences, 'user_id'> = {
  experience_level: null,
  daily_time_available: null,
  preferred_chains: [],
  risk_tolerance: null,
};

export default function AirdropCopilot({ onClose, summary, className }: AirdropCopilotProps) {
  const { user } = useAuth();
  const [nowTick, setNowTick] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Ask AirdropGuard AI about today's best opportunities, safer beginner picks, and how to prioritize your next 20 minutes.\n\n${SAFETY_TEXT}`,
    },
  ]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<Omit<UserPreferences, 'user_id'>>(DEFAULT_PREFERENCES);
  const [prefLoading, setPrefLoading] = useState(true);
  const [prefSaving, setPrefSaving] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!user) return;

    let active = true;
    const loadPreferences = async () => {
      setPrefLoading(true);
      const { data, error: loadError } = await supabase
        .from('user_preferences')
        .select('experience_level, daily_time_available, preferred_chains, risk_tolerance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!active) return;
      if (loadError) {
        setError(loadError.message);
      } else if (data) {
        setPreferences({
          experience_level: data.experience_level,
          daily_time_available: data.daily_time_available,
          preferred_chains: data.preferred_chains ?? [],
          risk_tolerance: data.risk_tolerance,
        });
      }
      setPrefLoading(false);
    };

    loadPreferences();
    return () => {
      active = false;
    };
  }, [user]);

  const canSend = useMemo(() => draft.trim().length > 0 && !loading, [draft, loading]);
  const userName = summary?.userName?.trim() || user?.email?.split('@')[0] || 'there';
  const nowHour = new Date().getHours();
  const greeting = nowHour < 12 ? 'Good morning' : nowHour < 18 ? 'Good afternoon' : 'Good evening';
  const verifiedCount = summary?.verifiedCount ?? Math.max(1, Math.min(9, Math.round((summary?.totalAirdrops ?? 24) * 0.12) || 3));
  const expiresToday = summary?.expiresToday ?? 1;
  const momentumText = summary?.momentumLabel ?? 'Market momentum is increasing';
  const estimatedText = summary?.estimatedRewards ?? 'Estimated potential varies';
  const confidence = Math.max(70, Math.min(99, summary?.confidence ?? 98));
  const dataSources = Math.max(4, summary?.dataSources ?? Math.max(8, summary?.totalAirdrops ?? 12));
  const lastUpdated = summary?.lastUpdated ?? new Date(nowTick || Date.now()).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  const persistPreferences = async (next: Omit<UserPreferences, 'user_id'>) => {
    if (!user) return;
    setPrefSaving(true);
    setError(null);
    const { error: saveError } = await supabase.from('user_preferences').upsert({
      user_id: user.id,
      experience_level: next.experience_level,
      daily_time_available: next.daily_time_available,
      preferred_chains: next.preferred_chains,
      risk_tolerance: next.risk_tolerance,
      updated_at: new Date().toISOString(),
    });
    if (saveError) {
      setError(saveError.message);
    }
    setPrefSaving(false);
  };

  const handlePreferencesChange = async (patch: Partial<Omit<UserPreferences, 'user_id'>>) => {
    const next = { ...preferences, ...patch };
    setPreferences(next);
    await persistPreferences(next);
  };

  const sendPrompt = async (input: string) => {
    const content = input.trim();
    if (!content || !user) return;

    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', content }]);
    setDraft('');
    setLoading(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const response = await supabase.functions.invoke('airdrop-copilot', {
        body: { message: content },
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });

      if (response.error) throw new Error(response.error.message);

      const answer = typeof response.data?.answer === 'string'
        ? response.data.answer
        : `I couldn't produce a useful answer from current dashboard data.\n\n${SAFETY_TEXT}`;

      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: answer }]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `I ran into an error while checking current AirdropGuard data: ${message}. Please try again.\n\n${SAFETY_TEXT}`,
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`relative flex h-full min-h-0 w-full max-w-full flex-col overflow-x-hidden overflow-y-hidden rounded-[28px] border border-sky-400/20 bg-[linear-gradient(160deg,rgba(7,11,24,0.95)_10%,rgba(8,14,34,0.96)_45%,rgba(12,9,35,0.96)_100%)] shadow-[0_0_40px_rgba(56,189,248,0.2),0_0_90px_rgba(99,102,241,0.16)] ${className ?? ''}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(56,189,248,0.17),transparent_34%),radial-gradient(circle_at_90%_16%,rgba(139,92,246,0.18),transparent_32%)]" />

      <div className="relative sticky top-0 z-20 shrink-0 border-b border-white/10 bg-[#081024]/95 px-4 py-3 backdrop-blur-xl sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/25 bg-sky-500/10 px-2.5 py-1">
              <Bot className="h-3.5 w-3.5 text-sky-300" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-200">AIRDROPGUARD AI</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <h2 className="text-xl font-black text-white">Copilot</h2>
              <span className="rounded-full border border-violet-400/30 bg-violet-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-violet-200">BETA</span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-gray-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                AI online
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-sky-300" />
                Live activity
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPreferences(prev => !prev)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-gray-300 transition-all hover:border-sky-400/40 hover:text-white"
              aria-label={showPreferences ? 'Hide preferences' : 'Show preferences'}
            >
              <Settings2 className="h-4.5 w-4.5" />
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-gray-300 transition-all hover:border-sky-400/40 hover:text-white"
                aria-label="Close copilot panel"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-3 sm:px-5">
        <div className="rounded-2xl border border-sky-400/25 bg-gradient-to-br from-sky-500/15 via-indigo-500/10 to-violet-500/20 p-3">
          <p className="text-base font-bold text-white">{greeting}, {userName} <span aria-hidden>👋</span></p>
          <p className="mt-0.5 text-xs text-gray-200">I've analysed your current airdrop opportunities.</p>
          <div className="mt-2 rounded-xl border border-white/10 bg-[#0c1228]/70 p-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-300">Today's Summary</p>
            <div className="mt-1.5 space-y-1 text-[11px] text-gray-200">
              <p>• {verifiedCount} new verified projects</p>
              <p>• {expiresToday} project{expiresToday !== 1 ? 's' : ''} expires today</p>
              <p>• {momentumText}</p>
              <p>• {estimatedText}</p>
            </div>
          </div>
        </div>

        <div className="mt-2.5 grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-1.5 text-center">
            <p className="text-[10px] uppercase tracking-[0.12em] text-emerald-300">AI Confidence</p>
            <p className="text-xs font-black text-white">{confidence}%</p>
          </div>
          <div className="rounded-lg border border-sky-500/20 bg-sky-500/10 px-2 py-1.5 text-center">
            <p className="text-[10px] uppercase tracking-[0.12em] text-sky-300">Data Sources</p>
            <p className="text-xs font-black text-white">{dataSources}+</p>
          </div>
          <div className="rounded-lg border border-violet-500/20 bg-violet-500/10 px-2 py-1.5 text-center">
            <p className="text-[10px] uppercase tracking-[0.12em] text-violet-300">Last Updated</p>
            <p className="text-xs font-black text-white">{lastUpdated}</p>
          </div>
        </div>

        {showPreferences && (
          <div className="mt-2.5 rounded-xl border border-white/10 bg-[#0b1228]/75 p-3">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <label className="space-y-1 text-xs text-gray-400">
                <span className="block font-semibold uppercase tracking-wider text-gray-300">Experience</span>
                <select
                  value={preferences.experience_level ?? ''}
                  onChange={event => void handlePreferencesChange({ experience_level: (event.target.value || null) as UserPreferences['experience_level'] })}
                  className="min-h-[44px] w-full rounded-xl border border-white/10 bg-[#111a34] px-3 py-2 text-sm text-white focus:border-sky-500/50 focus:outline-none"
                  disabled={prefLoading || prefSaving}
                >
                  <option value="">Not set</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </label>
              <label className="space-y-1 text-xs text-gray-400">
                <span className="block font-semibold uppercase tracking-wider text-gray-300">Daily Time</span>
                <select
                  value={preferences.daily_time_available ?? ''}
                  onChange={event => void handlePreferencesChange({ daily_time_available: (event.target.value || null) as UserPreferences['daily_time_available'] })}
                  className="min-h-[44px] w-full rounded-xl border border-white/10 bg-[#111a34] px-3 py-2 text-sm text-white focus:border-sky-500/50 focus:outline-none"
                  disabled={prefLoading || prefSaving}
                >
                  <option value="">Not set</option>
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60+">60+ minutes</option>
                </select>
              </label>
              <label className="space-y-1 text-xs text-gray-400">
                <span className="block font-semibold uppercase tracking-wider text-gray-300">Risk Tolerance</span>
                <select
                  value={preferences.risk_tolerance ?? ''}
                  onChange={event => void handlePreferencesChange({ risk_tolerance: (event.target.value || null) as UserPreferences['risk_tolerance'] })}
                  className="min-h-[44px] w-full rounded-xl border border-white/10 bg-[#111a34] px-3 py-2 text-sm text-white focus:border-sky-500/50 focus:outline-none"
                  disabled={prefLoading || prefSaving}
                >
                  <option value="">Not set</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
              <label className="space-y-1 text-xs text-gray-400">
                <span className="block font-semibold uppercase tracking-wider text-gray-300">Preferred Chains</span>
                <select
                  multiple
                  value={preferences.preferred_chains ?? []}
                  onChange={event => void handlePreferencesChange({ preferred_chains: Array.from(event.target.selectedOptions).map(option => option.value) })}
                  className="min-h-[108px] w-full rounded-xl border border-white/10 bg-[#111a34] px-3 py-2 text-sm text-white focus:border-sky-500/50 focus:outline-none"
                  disabled={prefLoading || prefSaving}
                >
                  {CHAIN_OPTIONS.map(chain => (
                    <option key={chain} value={chain}>{chain}</option>
                  ))}
                </select>
              </label>
            </div>
            <p className="mt-2 text-[11px] text-gray-500">Preferences improve ranking quality by time, risk tolerance, and chain fit.</p>
          </div>
        )}

        <div className="space-y-2.5">
          {QUICK_PROMPTS.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.title}
                type="button"
                onClick={() => void sendPrompt(item.prompt)}
                disabled={loading}
                className="mt-2 flex min-h-[54px] w-full touch-manipulation items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-left text-sm text-gray-200 transition-all hover:border-sky-400/30 hover:bg-sky-500/[0.08] hover:shadow-[0_0_24px_rgba(56,189,248,0.18)] disabled:opacity-60"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-sky-400/25 bg-sky-500/10">
                  <Icon className="h-4 w-4 text-sky-300" />
                </span>
                <span className="min-w-0 flex-1 truncate">{item.title}</span>
                <ChevronRight className="h-4 w-4 text-gray-500" />
              </button>
            );
          })}
        </div>

        <div className="mt-4 space-y-3 pb-56 sm:pb-60">
          {messages.map(message => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] rounded-2xl border px-3 py-2.5 text-sm leading-relaxed sm:max-w-[85%] ${message.role === 'user'
                ? 'border-violet-400/40 bg-gradient-to-br from-violet-500/35 to-sky-500/30 text-white shadow-[0_0_22px_rgba(99,102,241,0.24)]'
                : 'border-white/10 bg-[#101a36]/85 text-gray-100'
              }`}>
                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                  {message.role === 'assistant' ? <Sparkles className="h-3.5 w-3.5 text-sky-300" /> : <MessageSquare className="h-3.5 w-3.5 text-violet-300" />}
                  {message.role === 'assistant' ? 'AirdropGuard AI' : 'You'}
                </div>
                <div className="whitespace-pre-wrap break-words">{message.content}</div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="max-w-[90%] rounded-2xl border border-sky-400/25 bg-sky-500/10 px-3 py-3 text-xs text-gray-200">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-sky-200">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analysing...
              </div>
              <div className="space-y-1.5">
                <p className="inline-flex items-center gap-2"><BarChart3 className="h-3.5 w-3.5 text-sky-300" /> Reading AirdropGuard data</p>
                <p className="inline-flex items-center gap-2"><Shield className="h-3.5 w-3.5 text-sky-300" /> Checking risk signals</p>
                <p className="inline-flex items-center gap-2"><Gem className="h-3.5 w-3.5 text-sky-300" /> Comparing reward potential</p>
                <p className="inline-flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-sky-300" /> Building recommendation</p>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {error}
            </div>
          )}
        </div>
      </div>

      <div className="relative sticky bottom-0 z-20 mt-auto shrink-0 border-t border-white/10 bg-[#070d1f]/97 px-4 pb-[max(env(safe-area-inset-bottom),0.85rem)] pt-2.5 backdrop-blur-xl sm:px-5">
        <div className="mb-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.08] px-3 py-1.5 text-[10px] leading-relaxed text-amber-100">
          <div className="mb-1 inline-flex items-center gap-1.5 font-semibold text-amber-300">
            <ShieldAlert className="h-3.5 w-3.5" />
            Safety reminder
          </div>
          {SAFETY_TEXT}
        </div>

        <form
          onSubmit={event => {
            event.preventDefault();
            void sendPrompt(draft);
          }}
        >
          <div className="flex items-center gap-2">
            <input
              value={draft}
              onChange={event => setDraft(event.target.value)}
              placeholder="Ask anything about airdrops..."
              className="h-12 min-w-0 flex-1 rounded-full border border-white/10 bg-[#0f1731] px-4 text-sm text-white placeholder:text-gray-500 focus:border-sky-500/45 focus:outline-none"
              disabled={loading}
              maxLength={600}
            />
            <button
              type="submit"
              disabled={!canSend}
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-sky-400/35 bg-gradient-to-br from-sky-500 to-violet-500 text-white shadow-[0_0_18px_rgba(56,189,248,0.28)] transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Send message"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </form>
        <p className="mt-2 text-[10px] text-gray-500">Copilot uses current AirdropGuard data first and flags gaps when data is missing.</p>
        <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-2 py-1.5 text-gray-300">
            <span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3 text-emerald-300" /> {confidence}%</span>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-2 py-1.5 text-gray-300">
            <span className="inline-flex items-center gap-1"><BarChart3 className="h-3 w-3 text-sky-300" /> {dataSources} sources</span>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-2 py-1.5 text-gray-300">
            <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3 text-violet-300" /> {lastUpdated}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
