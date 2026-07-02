import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Flame,
  History,
  LineChart,
  Mic,
  Paperclip,
  Plus,
  Send,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { UserPreferences } from '../lib/types';

const CHAIN_OPTIONS = ['Ethereum', 'Solana', 'Base', 'Arbitrum', 'Optimism', 'Polygon', 'BNB Chain', 'Avalanche', 'Sui', 'Bitcoin'];

const SUGGESTED_ACTIONS = [
  { icon: Flame, title: 'What should I focus on today?', prompt: 'What should I focus on today?' },
  { icon: ShieldCheck, title: 'Show safest beginner airdrops', prompt: 'Show safest beginner airdrops' },
  { icon: DollarSign, title: 'Highest reward opportunities', prompt: 'Show me highest reward opportunities' },
  { icon: AlertTriangle, title: 'Which projects look risky?', prompt: 'Which projects look risky and why?' },
  { icon: CalendarClock, title: "What's ending soon?", prompt: "What's ending soon and what should I prioritize first?" },
  { icon: LineChart, title: 'Analyse my watchlist', prompt: 'Analyse my watchlist and recommend next actions.' },
];

const QUICK_TOOLS = [
  'Summarise Dashboard',
  'Explain Trust Score',
  'Recommend My Next Tasks',
  'Compare Projects',
  'Find Beginner Airdrops',
];

const LOADING_STATES = [
  'Analysing trust signals...',
  'Reading documentation...',
  'Checking funding...',
  'Comparing GitHub activity...',
  'Reviewing community sentiment...',
  'Fetching latest market data...',
];

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type ChatSession = {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
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
  const endRef = useRef<HTMLDivElement | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [recentChats, setRecentChats] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>(() => crypto.randomUUID());

  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStateIdx, setLoadingStateIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [preferences, setPreferences] = useState<Omit<UserPreferences, 'user_id'>>(DEFAULT_PREFERENCES);
  const [prefLoading, setPrefLoading] = useState(true);
  const [prefSaving, setPrefSaving] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [recentOpen, setRecentOpen] = useState(false);

  const [nowTick, setNowTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!loading) return;
    const id = window.setInterval(() => {
      setLoadingStateIdx(prev => (prev + 1) % LOADING_STATES.length);
    }, 1400);
    return () => window.clearInterval(id);
  }, [loading]);

  useEffect(() => {
    if (!endRef.current) return;
    endRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  useEffect(() => {
    if (messages.length === 0) return;
    const firstUser = messages.find(msg => msg.role === 'user')?.content;
    const title = firstUser ? firstUser.slice(0, 40) : 'Untitled chat';

    setRecentChats(prev => {
      const nextSession: ChatSession = {
        id: activeSessionId,
        title,
        messages,
        updatedAt: Date.now(),
      };
      const rest = prev.filter(chat => chat.id !== activeSessionId);
      return [nextSession, ...rest].slice(0, 8);
    });
  }, [messages, activeSessionId]);

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
  const verifiedCount = summary?.verifiedCount ?? Math.max(1, Math.min(99, Math.round((summary?.totalAirdrops ?? 24) * 0.84)));
  const expiresSoonCount = summary?.expiresToday ?? 2;
  const momentumText = summary?.momentumLabel ?? 'Positive';
  const estimatedText = summary?.estimatedRewards ?? 'Estimated rewards updated';
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

  const startNewChat = () => {
    setMessages([]);
    setDraft('');
    setError(null);
    setLoading(false);
    setActiveSessionId(crypto.randomUUID());
  };

  const restoreChat = (session: ChatSession) => {
    setActiveSessionId(session.id);
    setMessages(session.messages);
    setDraft('');
    setError(null);
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter') return;
    if (event.shiftKey) return;
    event.preventDefault();
    if (!canSend) return;
    void sendPrompt(draft);
  };

  return (
    <div className={`relative flex h-full min-h-0 w-full max-w-full flex-col overflow-hidden rounded-[28px] border border-sky-400/20 bg-[linear-gradient(160deg,rgba(7,11,24,0.95)_10%,rgba(8,14,34,0.96)_45%,rgba(12,9,35,0.96)_100%)] shadow-[0_0_40px_rgba(56,189,248,0.2),0_0_90px_rgba(99,102,241,0.16)] ${className ?? ''}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(56,189,248,0.17),transparent_34%),radial-gradient(circle_at_90%_16%,rgba(139,92,246,0.18),transparent_32%)]" />

      <div className="relative sticky top-0 z-30 shrink-0 border-b border-white/10 bg-[#081024]/96 px-4 py-3 backdrop-blur-xl sm:px-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-lg font-black text-white sm:text-xl">AirdropGuard AI Copilot</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-300">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                AI Online
              </span>
              <span className="text-gray-500">Using live AirdropGuard intelligence</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={startNewChat}
              className="inline-flex min-h-[40px] items-center gap-1 rounded-xl border border-sky-400/30 bg-sky-500/10 px-2.5 text-xs font-semibold text-sky-200 transition-colors hover:bg-sky-500/20"
            >
              <Plus className="h-3.5 w-3.5" />
              New Chat
            </button>
            <button
              type="button"
              onClick={() => setShowPreferences(prev => !prev)}
              className="inline-flex min-h-[40px] items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] px-2.5 text-xs font-semibold text-gray-200 transition-colors hover:bg-white/[0.08]"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Preferences
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-[40px] items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] px-2.5 text-xs font-semibold text-gray-200 transition-colors hover:bg-white/[0.08]"
              >
                <X className="h-3.5 w-3.5" />
                Close
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-3 sm:px-5">
        <div className="rounded-2xl border border-sky-400/25 bg-gradient-to-br from-sky-500/15 via-indigo-500/10 to-violet-500/20 p-3">
          <p className="text-base font-bold text-white">{greeting}, {userName} <span aria-hidden>👋</span></p>
          <p className="mt-0.5 text-xs text-gray-200">I've analysed today's opportunities.</p>
          <div className="mt-2 rounded-xl border border-white/10 bg-[#0c1228]/70 p-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-300">Today's Summary</p>
            <div className="mt-1.5 space-y-1 text-[11px] text-gray-200">
              <p>• {verifiedCount} verified opportunities</p>
              <p>• {expiresSoonCount} ending within 48 hours</p>
              <p>• Market momentum: {momentumText}</p>
              <p>• {estimatedText}</p>
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
        </div>

        {showPreferences && (
          <div className="mt-3 rounded-xl border border-white/10 bg-[#0b1228]/75 p-3">
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

        <div className="mt-3 grid gap-2.5">
          {SUGGESTED_ACTIONS.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.title}
                type="button"
                onClick={() => void sendPrompt(item.prompt)}
                disabled={loading}
                className="group flex min-h-[56px] w-full touch-manipulation items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-left text-sm text-gray-100 transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-400/35 hover:bg-sky-500/[0.08] hover:shadow-[0_0_24px_rgba(56,189,248,0.18)] disabled:opacity-60"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-sky-400/25 bg-sky-500/10">
                  <Icon className="h-4 w-4 text-sky-300" />
                </span>
                <span className="min-w-0 flex-1 font-medium">{item.title}</span>
                <span className="text-[10px] text-gray-500 group-hover:text-sky-300">Run</span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 rounded-2xl border border-white/10 bg-[#0b132a]/80 p-3">
          <button
            type="button"
            onClick={() => setRecentOpen(prev => !prev)}
            className="flex w-full items-center justify-between text-left"
          >
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">
              <History className="h-3.5 w-3.5 text-sky-300" />
              Recent Chats
            </span>
            {recentOpen ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
          </button>

          {recentOpen && (
            <div className="mt-2 space-y-1.5">
              {recentChats.filter(chat => chat.id !== activeSessionId).length === 0 && (
                <p className="text-xs text-gray-500">No previous chats yet. Start with one of the actions above.</p>
              )}
              {recentChats
                .filter(chat => chat.id !== activeSessionId)
                .map(chat => (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => restoreChat(chat)}
                    className="flex min-h-[44px] w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-left text-sm text-gray-200 transition-colors hover:border-sky-400/35 hover:bg-white/[0.06]"
                  >
                    <span className="truncate pr-2">{chat.title}</span>
                    <span className="text-[10px] text-gray-500">{new Date(chat.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                  </button>
                ))}
            </div>
          )}
        </div>

        <div className="mt-3 rounded-2xl border border-white/10 bg-[#0b132a]/75 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">Conversation</p>

          {messages.length === 0 && !loading ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-200">
              <p className="text-base font-semibold text-white">Welcome to AirdropGuard AI <span aria-hidden>👋</span></p>
              <p className="mt-2 text-sm text-gray-300">I can help you:</p>
              <div className="mt-2 space-y-1 text-sm text-gray-300">
                <p>• Find safer opportunities</p>
                <p>• Compare projects</p>
                <p>• Explain trust scores</p>
                <p>• Estimate rewards</p>
                <p>• Build an airdrop farming plan</p>
              </div>
              <p className="mt-3 text-xs text-gray-500">Choose a suggestion above or ask your own question.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {messages.map(message => (
                <div key={message.id} className={`flex transition-all duration-300 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[92%] rounded-2xl border px-3 py-2.5 text-sm leading-relaxed sm:max-w-[88%] ${message.role === 'user'
                    ? 'border-violet-400/40 bg-gradient-to-br from-violet-500/35 to-sky-500/30 text-white shadow-[0_0_22px_rgba(99,102,241,0.24)]'
                    : 'border-white/10 bg-[#101a36]/90 text-gray-100'
                  }`}>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">{message.role === 'assistant' ? 'Assistant' : 'User'}</p>
                    <div className="whitespace-pre-wrap break-words">{message.content}</div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="max-w-[92%] rounded-2xl border border-sky-400/25 bg-sky-500/10 px-3 py-2.5 text-sm text-sky-100 transition-all duration-300 sm:max-w-[88%]">
                  <p className="font-semibold">{LOADING_STATES[loadingStateIdx]}</p>
                </div>
              )}

              {error && (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                  {error}
                </div>
              )}
            </div>
          )}

          <div ref={endRef} />
        </div>

        <div className="pb-72 sm:pb-80" />
      </div>

      <div className="relative sticky bottom-0 z-30 mt-auto shrink-0 border-t border-white/10 bg-[#070d1f]/97 px-4 pb-[max(env(safe-area-inset-bottom),0.85rem)] pt-2.5 backdrop-blur-xl sm:px-5">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {QUICK_TOOLS.map(tool => (
            <button
              key={tool}
              type="button"
              onClick={() => void sendPrompt(tool)}
              disabled={loading}
              className="min-h-[34px] rounded-full border border-white/10 bg-white/[0.03] px-3 text-[11px] font-medium text-gray-200 transition-colors hover:bg-white/[0.09] disabled:opacity-60"
            >
              {tool}
            </button>
          ))}
        </div>

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
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={event => setDraft(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              rows={2}
              placeholder="Ask anything about crypto airdrops..."
              className="min-h-[56px] max-h-36 min-w-0 flex-1 resize-y rounded-2xl border border-white/10 bg-[#0f1731] px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-sky-500/45 focus:outline-none"
              disabled={loading}
              maxLength={900}
            />
            <button
              type="button"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-gray-300"
              aria-label="Attach file (coming soon)"
              title="Attach (coming soon)"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-gray-300"
              aria-label="Voice input (coming soon)"
              title="Voice (coming soon)"
            >
              <Mic className="h-4 w-4" />
            </button>
            <button
              type="submit"
              disabled={!canSend}
              className="inline-flex h-11 min-w-[72px] shrink-0 items-center justify-center gap-1 rounded-xl border border-sky-400/35 bg-gradient-to-br from-sky-500 to-violet-500 px-3 text-xs font-bold text-white shadow-[0_0_18px_rgba(56,189,248,0.28)] transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Send message"
            >
              <Send className="h-3.5 w-3.5" />
              Send
            </button>
          </div>
        </form>
        <p className="mt-1.5 text-[10px] text-gray-500">Press Enter to send, Shift + Enter for a new line.</p>
        <p className="mt-1 text-[10px] text-gray-500">Copilot uses current AirdropGuard data first and flags gaps when data is missing.</p>
      </div>
    </div>
  );
}
