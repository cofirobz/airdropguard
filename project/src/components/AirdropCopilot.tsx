import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Plus, Send, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import AiOrb from './AiOrb';

const FUNCTION_NAME = 'airdrop-copilot';
const FOOTER_NOTE = 'Educational analysis only. Never share your seed phrase.';
const WELCOME_MESSAGE = 'Welcome to AirdropGuard Copilot. Ask about airdrop safety, compare projects, or get help prioritizing your next steps.';
const QUICK_PROMPTS = [
  'Show safest beginner airdrops',
  'Which projects look risky and why?',
  'What should I focus on today?',
  "What's ending soon and what should I prioritize first?",
];

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type SessionMemory = {
  previousQuestions: string[];
  comparedProjects: string[];
  dismissedOpportunities: string[];
  preferredChains: string[];
  preferredDifficulty: string | null;
  preferredRisk: string | null;
};

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
  pageContext?: string;
};

const createWelcomeMessage = (pageContext?: string): ChatMessage => ({
  id: crypto.randomUUID(),
  role: 'assistant',
  content: pageContext
    ? `${WELCOME_MESSAGE}\n\nCurrent context: ${pageContext}`
    : WELCOME_MESSAGE,
});

function getFunctionErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;

  const candidate = payload as Record<string, unknown>;
  const value = typeof candidate.error === 'string'
    ? candidate.error
    : typeof candidate.message === 'string'
      ? candidate.message
      : typeof candidate.details === 'string'
        ? candidate.details
        : null;

  return value?.trim() || fallback;
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed && trimmed !== '[object Object]' ? trimmed : null;
}

function extractTextFromObject(payload: Record<string, unknown>): string | null {
  const directKeys = ['answer', 'message', 'content', 'text', 'response'];

  for (const key of directKeys) {
    const direct = normalizeText(payload[key]);
    if (direct) return direct;
  }

  for (const key of directKeys) {
    const candidate = payload[key];
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      const nested = extractTextFromObject(candidate as Record<string, unknown>);
      if (nested) return nested;
    }
  }

  if (Array.isArray(payload.content)) {
    const joined = payload.content
      .map(item => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object') {
          return normalizeText((item as Record<string, unknown>).text) ?? normalizeText((item as Record<string, unknown>).content) ?? '';
        }
        return '';
      })
      .filter(Boolean)
      .join('\n\n')
      .trim();

    if (joined && joined !== '[object Object]') return joined;
  }

  return null;
}

function extractAssistantText(payload: unknown): string | null {
  const direct = normalizeText(payload);
  if (direct) return direct;

  if (!payload || typeof payload !== 'object') return null;
  return extractTextFromObject(payload as Record<string, unknown>);
}

async function extractInvokeError(error: unknown): Promise<string> {
  const fallback = 'AirdropGuard Copilot is unavailable right now. Please try again in a moment.';

  if (!(error instanceof Error)) return fallback;

  const response = 'context' in error ? (error as Error & { context?: unknown }).context : undefined;
  if (!(response instanceof Response)) return error.message || fallback;

  try {
    const rawText = await response.clone().text();
    if (!rawText) return error.message || fallback;

    try {
      return getFunctionErrorMessage(JSON.parse(rawText), error.message || fallback);
    } catch {
      return rawText.trim() || error.message || fallback;
    }
  } catch {
    return error.message || fallback;
  }
}

export default function AirdropCopilot({ onClose, summary: _summary, className, pageContext }: AirdropCopilotProps) {
  const { user } = useAuth();
  const endRef = useRef<HTMLDivElement | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [createWelcomeMessage(pageContext)]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionMemory, setSessionMemory] = useState<SessionMemory>({
    previousQuestions: [],
    comparedProjects: [],
    dismissedOpportunities: [],
    preferredChains: [],
    preferredDifficulty: null,
    preferredRisk: null,
  });

  const memoryNotes = (() => {
    const notes: string[] = [];
    if (sessionMemory.comparedProjects.length > 0) {
      notes.push(`Compared projects: ${sessionMemory.comparedProjects.slice(-4).join(', ')}`);
    }
    if (sessionMemory.preferredRisk) {
      notes.push(`Preferred risk: ${sessionMemory.preferredRisk}`);
    }
    if (sessionMemory.preferredDifficulty) {
      notes.push(`Preferred difficulty: ${sessionMemory.preferredDifficulty}`);
    }
    if (sessionMemory.preferredChains.length > 0) {
      notes.push(`Preferred chains: ${sessionMemory.preferredChains.slice(-3).join(', ')}`);
    }
    if (sessionMemory.dismissedOpportunities.length > 0) {
      notes.push(`Dismissed opportunities: ${sessionMemory.dismissedOpportunities.slice(-3).join(', ')}`);
    }
    return notes;
  })();

  const updateMemoryFromPrompt = (prompt: string) => {
    const trimmed = prompt.trim();
    const lower = trimmed.toLowerCase();

    const compareMatch = lower.match(/compare\s+([a-z0-9-]{2,})\s+(?:and|vs\.?|versus)\s+([a-z0-9-]{2,})/i);
    const chainMatches = ['ethereum', 'base', 'arbitrum', 'optimism', 'polygon', 'bnb', 'solana', 'sui']
      .filter(chain => lower.includes(chain));

    setSessionMemory((prev) => {
      const compared = [...prev.comparedProjects];
      if (compareMatch) {
        const projects = [compareMatch[1], compareMatch[2]].map((value) => value.toUpperCase());
        projects.forEach((project) => {
          if (!compared.includes(project)) compared.push(project);
        });
      }

      const dismissed = [...prev.dismissedOpportunities];
      if (lower.includes('skip') || lower.includes('dismiss')) {
        dismissed.push(trimmed.slice(0, 80));
      }

      const preferredRisk = lower.includes('low risk')
        ? 'Low'
        : lower.includes('medium risk')
          ? 'Medium'
          : lower.includes('high risk')
            ? 'High'
            : prev.preferredRisk;

      const preferredDifficulty = lower.includes('beginner') || lower.includes('easy')
        ? 'Easy'
        : lower.includes('moderate') || lower.includes('medium difficulty')
          ? 'Moderate'
          : lower.includes('hard') || lower.includes('advanced')
            ? 'Hard'
            : prev.preferredDifficulty;

      const preferredChains = [...prev.preferredChains];
      chainMatches.forEach((chain) => {
        const formatted = chain[0].toUpperCase() + chain.slice(1);
        if (!preferredChains.includes(formatted)) preferredChains.push(formatted);
      });

      const previousQuestions = [...prev.previousQuestions, trimmed].slice(-8);

      return {
        previousQuestions,
        comparedProjects: compared.slice(-8),
        dismissedOpportunities: dismissed.slice(-6),
        preferredChains: preferredChains.slice(-6),
        preferredDifficulty,
        preferredRisk,
      };
    });
  };

  const buildMemoryContext = () => {
    const memoryLines: string[] = [];

    if (sessionMemory.previousQuestions.length > 0) {
      memoryLines.push(`Previous questions this session: ${sessionMemory.previousQuestions.slice(-3).join(' | ')}`);
    }
    if (sessionMemory.comparedProjects.length > 0) {
      memoryLines.push(`Projects already compared: ${sessionMemory.comparedProjects.join(', ')}`);
    }
    if (sessionMemory.dismissedOpportunities.length > 0) {
      memoryLines.push(`User dismissed opportunities: ${sessionMemory.dismissedOpportunities.join(' ; ')}`);
    }
    if (sessionMemory.preferredChains.length > 0) {
      memoryLines.push(`Preferred chains: ${sessionMemory.preferredChains.join(', ')}`);
    }
    if (sessionMemory.preferredDifficulty) {
      memoryLines.push(`Preferred difficulty: ${sessionMemory.preferredDifficulty}`);
    }
    if (sessionMemory.preferredRisk) {
      memoryLines.push(`Preferred risk: ${sessionMemory.preferredRisk}`);
    }

    if (!pageContext && memoryLines.length === 0) return undefined;

    return [
      pageContext ? `Page context: ${pageContext}` : null,
      memoryLines.length > 0 ? `Session memory (facts from this session only): ${memoryLines.join(' | ')}` : null,
    ]
      .filter(Boolean)
      .join('\n\n');
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  const sendPrompt = async (input: string) => {
    const content = input.trim();
    if (!content || loading) return;

    updateMemoryFromPrompt(content);

    if (!user) {
      setError('Please sign in to use AirdropGuard Copilot.');
      return;
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (sessionError || !accessToken) {
      console.error('AirdropGuard Copilot session error', {
        functionName: FUNCTION_NAME,
        sessionError,
        hasUser: Boolean(user),
        hasAccessToken: Boolean(accessToken),
      });
      setError('Your session has expired. Please sign in again and retry.');
      return;
    }

    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'user',
      content,
    }]);
    setDraft('');
    setLoading(true);
    setError(null);

    try {
      const combinedContext = buildMemoryContext();
      const response = await supabase.functions.invoke(FUNCTION_NAME, {
        body: { message: content, context: combinedContext },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      console.info('AirdropGuard Copilot raw response', response.data);

      if (response.error) {
        console.error('AirdropGuard Copilot invoke failed', {
          functionName: FUNCTION_NAME,
          error: response.error,
        });
        throw response.error;
      }

      const answer = extractAssistantText(response.data)
        ?? 'I could not generate a useful answer from the current AirdropGuard data.';

      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: answer,
      }]);
    } catch (invokeError) {
      const userMessage = await extractInvokeError(invokeError);
      console.error('AirdropGuard Copilot response error', {
        functionName: FUNCTION_NAME,
        error: invokeError,
        userMessage,
      });
      setError(userMessage);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: userMessage,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = () => {
    setMessages([createWelcomeMessage(pageContext)]);
    setDraft('');
    setError(null);
    setLoading(false);
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    void sendPrompt(draft);
  };

  return (
    <div className={`flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#08101f] text-white ${className ?? ''}`}>
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-cyan-400/10 bg-[#08101f]/95 px-4 py-3 backdrop-blur sm:px-5 sm:py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <AiOrb className="h-7 w-7" />
            <h2 className="text-lg font-black text-white sm:text-xl">AirdropGuard Copilot</h2>
          </div>
          <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-100">
            <AiOrb className="h-3.5 w-3.5" />
            AI Online
          </div>
          {pageContext && (
            <p className="mt-2 max-w-md text-[11px] leading-relaxed text-gray-400">
              Context-aware guidance is enabled for this page.
            </p>
          )}
          {memoryNotes.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {memoryNotes.map((note) => (
                <span key={note} className="inline-flex max-w-full items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] text-gray-300">
                  <span className="truncate">{note}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={startNewChat}
            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center gap-1 rounded-xl border border-sky-400/30 bg-sky-500/10 px-3 text-xs font-semibold text-sky-100 transition-colors hover:bg-sky-500/20"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Chat</span>
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-gray-200 transition-colors hover:bg-white/[0.08]"
            >
              <X className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Close</span>
            </button>
          )}
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
        <div className="space-y-4">
          {messages.map((message, index) => {
            const isWelcome = index === 0 && message.role === 'assistant' && message.content === WELCOME_MESSAGE;
            return (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex max-w-[88%] items-start gap-2 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {message.role === 'assistant' && <AiOrb className="mt-1 h-7 w-7 shrink-0" />}
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${message.role === 'user'
                  ? 'bg-sky-500 text-white'
                  : 'border border-white/10 bg-[#111b31] text-gray-100'
                }`}>
                    <div className="whitespace-pre-wrap break-words">{message.content}</div>
                    {isWelcome && (
                      <div className="mt-4 grid grid-cols-1 gap-2">
                        {QUICK_PROMPTS.map(prompt => (
                          <button
                            key={prompt}
                            type="button"
                            onClick={() => void sendPrompt(prompt)}
                            disabled={loading}
                            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-left text-sm text-gray-100 transition-colors hover:bg-white/[0.08] disabled:opacity-60"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex justify-start">
              <div className="flex max-w-[88%] items-center gap-2 rounded-2xl border border-white/10 bg-[#111b31] px-4 py-3 text-sm text-gray-200">
                <AiOrb className="h-5 w-5" />
                Thinking...
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>
      </main>

      <footer className="shrink-0 border-t border-cyan-400/10 bg-[#08101f]/98 px-4 py-3 backdrop-blur sm:px-5 sm:py-4">
        <form
          onSubmit={event => {
            event.preventDefault();
            void sendPrompt(draft);
          }}
          className="space-y-3"
        >
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={event => setDraft(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              rows={2}
              placeholder="Ask anything about crypto airdrops..."
              className="min-h-[56px] max-h-40 min-w-0 flex-1 resize-none rounded-2xl border border-cyan-400/10 bg-[#0f1731] px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-sky-500/45 focus:outline-none"
              disabled={loading}
              maxLength={900}
            />
            <button
              type="submit"
              disabled={!draft.trim() || loading}
              className="inline-flex h-11 min-w-[72px] shrink-0 items-center justify-center gap-1 rounded-xl border border-sky-400/35 bg-sky-500 px-3 text-xs font-bold text-white transition-colors hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Send message"
            >
              <Send className="h-3.5 w-3.5" />
              Send
            </button>
          </div>
          {error && <p className="text-[11px] text-rose-300">{error}</p>}
          <p className="text-[11px] text-gray-400">Press Enter to send, Shift+Enter for a new line.</p>
          <p className="text-[11px] text-gray-500">{FOOTER_NOTE}</p>
        </form>
      </footer>
    </div>
  );
}