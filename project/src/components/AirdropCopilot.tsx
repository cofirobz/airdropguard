import { useEffect, useMemo, useState } from 'react';
import { Bot, Loader2, MessageSquare, Send, Settings2, ShieldAlert, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { UserPreferences } from '../lib/types';

const CHAIN_OPTIONS = ['Ethereum', 'Solana', 'Base', 'Arbitrum', 'Optimism', 'Polygon', 'BNB Chain', 'Avalanche', 'Sui', 'Bitcoin'];
const QUICK_PROMPTS = [
  'Which airdrops should I focus on today?',
  'I only have 30 minutes, what should I do?',
  'Which beginner-friendly airdrops are safest?',
  'Which airdrops have the highest reward potential?',
];

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

const SAFETY_TEXT = 'AirdropGuard provides educational analysis only, not financial advice. Never share your seed phrase or connect your wallet to unknown sites.';

const DEFAULT_PREFERENCES: Omit<UserPreferences, 'user_id'> = {
  experience_level: null,
  daily_time_available: null,
  preferred_chains: [],
  risk_tolerance: null,
};

function classForRole(role: ChatMessage['role']) {
  return role === 'assistant'
    ? 'bg-sky-500/10 border-sky-500/20 text-gray-200'
    : 'bg-white/[0.04] border-white/10 text-white';
}

export default function AirdropCopilot() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Ask AirdropGuard AI about today’s best airdrops, safer beginner options, or compare opportunities using current dashboard data.\n\n${SAFETY_TEXT}`,
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
    <div className="glass-card overflow-hidden border border-sky-500/15">
      <div className="flex flex-col gap-3 border-b border-white/5 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1">
            <Bot className="h-3.5 w-3.5 text-sky-400" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-300">Ask AirdropGuard AI</span>
          </div>
          <h2 className="text-base font-bold text-white sm:text-lg">Your airdrop research copilot</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-gray-500 sm:text-sm">
            Get practical recommendations from current AirdropGuard data, with risk and time tradeoffs explained clearly.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowPreferences(prev => !prev)}
          className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-gray-300 transition-colors hover:bg-white/[0.07] hover:text-white"
        >
          <Settings2 className="h-4 w-4" />
          {showPreferences ? 'Hide Preferences' : 'Set Preferences'}
        </button>
      </div>

      {showPreferences && (
        <div className="border-b border-white/5 bg-dark-800/40 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-1.5 text-xs text-gray-500">
              <span className="block font-semibold uppercase tracking-wider text-gray-400">Experience</span>
              <select
                value={preferences.experience_level ?? ''}
                onChange={event => void handlePreferencesChange({ experience_level: (event.target.value || null) as UserPreferences['experience_level'] })}
                className="min-h-[44px] w-full rounded-2xl border border-white/10 bg-dark-700/70 px-3 py-2 text-sm text-white focus:border-sky-500/50 focus:outline-none"
                disabled={prefLoading || prefSaving}
              >
                <option value="">Not set</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>

            <label className="space-y-1.5 text-xs text-gray-500">
              <span className="block font-semibold uppercase tracking-wider text-gray-400">Daily Time</span>
              <select
                value={preferences.daily_time_available ?? ''}
                onChange={event => void handlePreferencesChange({ daily_time_available: (event.target.value || null) as UserPreferences['daily_time_available'] })}
                className="min-h-[44px] w-full rounded-2xl border border-white/10 bg-dark-700/70 px-3 py-2 text-sm text-white focus:border-sky-500/50 focus:outline-none"
                disabled={prefLoading || prefSaving}
              >
                <option value="">Not set</option>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60+">60+ minutes</option>
              </select>
            </label>

            <label className="space-y-1.5 text-xs text-gray-500">
              <span className="block font-semibold uppercase tracking-wider text-gray-400">Risk Tolerance</span>
              <select
                value={preferences.risk_tolerance ?? ''}
                onChange={event => void handlePreferencesChange({ risk_tolerance: (event.target.value || null) as UserPreferences['risk_tolerance'] })}
                className="min-h-[44px] w-full rounded-2xl border border-white/10 bg-dark-700/70 px-3 py-2 text-sm text-white focus:border-sky-500/50 focus:outline-none"
                disabled={prefLoading || prefSaving}
              >
                <option value="">Not set</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>

            <label className="space-y-1.5 text-xs text-gray-500 sm:col-span-2 xl:col-span-1">
              <span className="block font-semibold uppercase tracking-wider text-gray-400">Preferred Chains</span>
              <select
                multiple
                value={preferences.preferred_chains ?? []}
                onChange={event => void handlePreferencesChange({ preferred_chains: Array.from(event.target.selectedOptions).map(option => option.value) })}
                className="min-h-[108px] w-full rounded-2xl border border-white/10 bg-dark-700/70 px-3 py-2 text-sm text-white focus:border-sky-500/50 focus:outline-none"
                disabled={prefLoading || prefSaving}
              >
                {CHAIN_OPTIONS.map(chain => (
                  <option key={chain} value={chain}>{chain}</option>
                ))}
              </select>
            </label>
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-gray-600">
            Preferences are optional. They help the Copilot rank airdrops by suitability for your time, risk tolerance and chain focus.
          </p>
        </div>
      )}

      <div className="space-y-4 p-4">
        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map(prompt => (
            <button
              key={prompt}
              type="button"
              onClick={() => void sendPrompt(prompt)}
              disabled={loading}
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="max-h-[26rem] space-y-3 overflow-y-auto pr-1">
          {messages.map(message => (
            <div
              key={message.id}
              className={`rounded-2xl border p-3 text-sm leading-relaxed ${classForRole(message.role)}`}
            >
              <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                {message.role === 'assistant' ? <Sparkles className="h-3.5 w-3.5 text-sky-400" /> : <MessageSquare className="h-3.5 w-3.5 text-neon-purple" />}
                {message.role === 'assistant' ? 'AirdropGuard AI' : 'You'}
              </div>
              <div className="whitespace-pre-wrap">{message.content}</div>
            </div>
          ))}

          {loading && (
            <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-3 text-sm text-gray-300">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-sky-400" />
                Checking current AirdropGuard listings and composing a practical answer...
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.05] p-3 text-xs leading-relaxed text-gray-400">
          <div className="mb-1 flex items-center gap-2 font-semibold text-amber-300">
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
          className="space-y-3"
        >
          <textarea
            value={draft}
            onChange={event => setDraft(event.target.value)}
            rows={4}
            placeholder="Ask about today’s best picks, safer beginner options, reward potential, or compare two projects..."
            className="w-full rounded-3xl border border-white/10 bg-dark-700/70 px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-sky-500/50 focus:outline-none"
            disabled={loading}
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] text-gray-600">
              The Copilot uses existing AirdropGuard data first and will say when data is missing.
            </p>
            <button
              type="submit"
              disabled={!canSend}
              className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-sky-500/90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Ask AirdropGuard AI
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
