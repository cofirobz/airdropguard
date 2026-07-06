import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Plus, Send, Paperclip, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import AiOrb from './AiOrb';

const FUNCTION_NAME = 'airdrop-copilot';
const FOOTER_NOTE = 'Educational analysis only. Never share your seed phrase.';
const WELCOME_MESSAGE = 'Hey, I am your AI Copilot orb. Ask me what looks safest, what is worth your time, or what to do next.';
const QUICK_PROMPTS = [
  { id: 'safe-beginner', label: 'Show me safe beginner picks', question: 'Show safest beginner airdrops' },
  { id: 'risky-projects', label: 'Which ones look risky?', question: 'Which projects look risky and why?' },
  { id: 'focus-today', label: 'What should I do first today?', question: 'What should I focus on today?' },
  { id: 'ending-soon', label: "What's ending soon and what should I prioritize first?", question: "What's ending soon and what should I prioritize first?" },
  { id: 'worth-time', label: 'Is this one worth it?', question: 'Is this opportunity worth my time?' },
  { id: 'biggest-risks', label: 'What are the biggest risks right now?', question: 'What are the biggest risks?' },
  { id: 'tasks-first', label: 'Give me my first 3 tasks', question: 'What tasks should I do first?' },
  { id: 'qualify-difficulty', label: 'How hard is this to qualify for?', question: 'How hard is this to qualify for?' },
  { id: 'what-to-avoid', label: 'What should I avoid?', question: 'What should I avoid?' },
  { id: 'simple-explain', label: 'Explain this in plain words', question: 'Explain this project simply.' },
] as const;
const UNREADABLE_RESPONSE_MESSAGE = 'I received a response, but couldn\'t read the message. Please try again.';
const THINKING_LINES = [
  'Reading trust signals...',
  'Scanning chain activity...',
  'Comparing nearby projects...',
  'Checking wallet safety...',
  'Finding your best next move...',
] as const;

const QUICK_ACTIONS = [
  { id: 'analyse-opportunity', label: '🛡 Analyse this project', prompt: 'Analyse the opportunity I am viewing and tell me the safest next action.' },
  { id: 'best-today', label: '🔥 Best opportunities today', prompt: 'What are the best opportunities today and why?' },
  { id: 'highest-risk', label: '⚠ Highest risk projects', prompt: 'Which projects are highest risk and what should I avoid?' },
  { id: 'hidden-gems', label: '💰 Hidden gems', prompt: 'Show hidden gem opportunities with the best trust-to-effort profile.' },
  { id: 'what-today', label: '🎯 What should I do next?', prompt: 'What should I do today based on my current context?' },
] as const;

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
  queuedPrompt?: { text: string; nonce: number } | null;
};

const createWelcomeMessage = (_pageContext?: string): ChatMessage => ({
  id: crypto.randomUUID(),
  role: 'assistant',
  content: WELCOME_MESSAGE,
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

function logCopilot(level: 'info' | 'error', message: string, details?: unknown) {
  if (!import.meta.env.DEV) return;
  const logger = level === 'error' ? console.warn : console.info;
  logger(`[AirdropCopilot] ${message}`, details);
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed && trimmed !== '[object Object]' ? trimmed : null;
}

function extractTextFromArray(payload: unknown[]): string | null {
  const joined = payload
    .map((item) => {
      const direct = normalizeText(item);
      if (direct) return direct;

      if (item && typeof item === 'object' && !Array.isArray(item)) {
        return extractTextFromObject(item as Record<string, unknown>) ?? '';
      }

      if (Array.isArray(item)) {
        return extractTextFromArray(item) ?? '';
      }

      return '';
    })
    .filter(Boolean)
    .join('\n\n')
    .trim();

  return joined && joined !== '[object Object]' ? joined : null;
}

function extractTextFromObject(payload: Record<string, unknown>): string | null {
  const directKeys = ['answer', 'reply', 'message', 'content', 'response', 'text', 'result', 'value', 'output_text', 'delta'];

  for (const key of directKeys) {
    const direct = normalizeText(payload[key]);
    if (direct) return direct;
  }

  const data = payload.data;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const nestedData = extractTextFromObject(data as Record<string, unknown>);
    if (nestedData) return nestedData;
  }

  const errorLike = payload.error;
  if (typeof errorLike === 'string' && errorLike.trim()) {
    return `AirdropGuard Copilot ran into an error: ${errorLike.trim()}`;
  }

  if (errorLike && typeof errorLike === 'object' && !Array.isArray(errorLike)) {
    const nestedErrorMessage = normalizeText((errorLike as Record<string, unknown>).message)
      ?? normalizeText((errorLike as Record<string, unknown>).details);
    if (nestedErrorMessage) {
      return `AirdropGuard Copilot ran into an error: ${nestedErrorMessage}`;
    }
  }

  for (const key of directKeys) {
    const candidate = payload[key];
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      const nested = extractTextFromObject(candidate as Record<string, unknown>);
      if (nested) return nested;
    }
  }

  if (Array.isArray(payload.content)) {
    const arrayContent = extractTextFromArray(payload.content);
    if (arrayContent) return arrayContent;
  }

  if (Array.isArray(payload.choices)) {
    for (const choice of payload.choices) {
      if (!choice || typeof choice !== 'object' || Array.isArray(choice)) continue;

      const choiceObj = choice as Record<string, unknown>;
      const directChoiceText = normalizeText(choiceObj.text);
      if (directChoiceText) return directChoiceText;

      const choiceMessage = choiceObj.message;
      if (choiceMessage && typeof choiceMessage === 'object' && !Array.isArray(choiceMessage)) {
        const nestedChoiceMessage = extractTextFromObject(choiceMessage as Record<string, unknown>);
        if (nestedChoiceMessage) return nestedChoiceMessage;
      }

      if (Array.isArray(choiceObj.content)) {
        const choiceArrayContent = extractTextFromArray(choiceObj.content);
        if (choiceArrayContent) return choiceArrayContent;
      }
    }
  }

  const deepFallback = findFirstReadableText(payload);
  if (deepFallback) return deepFallback;

  return null;
}

function findFirstReadableText(value: unknown, depth = 0): string | null {
  if (depth > 6 || value == null) return null;

  const direct = normalizeText(value);
  if (direct) return direct;

  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = findFirstReadableText(item, depth + 1);
      if (nested) return nested;
    }
    return null;
  }

  if (typeof value === 'object') {
    for (const nestedValue of Object.values(value as Record<string, unknown>)) {
      const nested = findFirstReadableText(nestedValue, depth + 1);
      if (nested) return nested;
    }
  }

  return null;
}

function extractAssistantText(payload: unknown): string | null {
  const direct = normalizeText(payload);
  if (direct) return direct;

  if (Array.isArray(payload)) {
    return extractTextFromArray(payload);
  }

  if (!payload || typeof payload !== 'object') return null;
  return extractTextFromObject(payload as Record<string, unknown>);
}

function resolveQuickPromptQuestion(input: string): string {
  const trimmed = input.trim();
  const match = QUICK_PROMPTS.find((prompt) => prompt.id === trimmed || prompt.label === trimmed || prompt.question === trimmed);
  return match?.question ?? trimmed;
}

function looksLikeInternalToken(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed)) return true;
  if (/^[0-9a-f]{24,}$/i.test(trimmed)) return true;
  if (/^[a-z0-9_-]{28,}$/i.test(trimmed) && !/\s/.test(trimmed)) return true;
  return false;
}

function sanitizeAssistantAnswer(raw: string): string {
  let text = raw.trim();

  if (text.startsWith('```')) {
    text = text.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
  }

  // Normalize markdown-like formatting to plain readable text.
  text = text
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/(^|\s)[*_]([^*_]+)[*_](?=\s|$)/g, '$1$2');

  const cleanedLines = text
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => {
      if (/^\s*(id|slug|hash|key)\s*[:=]/i.test(line)) return false;
      if (/^\s*(page\s*context|context|session\s*memory|user\s*preferences|user\s*question)\s*[:=-]/i.test(line)) return false;
      if (/^\s*question\s*[:=-]\s*/i.test(line)) return false;
      return true;
    });

  const cleaned = cleanedLines.join('\n').trim();
  if (!cleaned) return UNREADABLE_RESPONSE_MESSAGE;

  if (looksLikeInternalToken(cleaned)) return UNREADABLE_RESPONSE_MESSAGE;

  if ((cleaned.startsWith('{') && cleaned.endsWith('}')) || (cleaned.startsWith('[') && cleaned.endsWith(']'))) {
    return UNREADABLE_RESPONSE_MESSAGE;
  }

  return cleaned;
}

function renderInlineText(text: string): Array<string | JSX.Element> {
  const segments: Array<string | JSX.Element> = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      segments.push(<strong key={`b-${match.index}`} className="font-semibold text-white">{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('`') && token.endsWith('`')) {
      segments.push(<span key={`c-${match.index}`} className="rounded-md border border-white/10 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[12px] text-cyan-100">{token.slice(1, -1)}</span>);
    } else {
      segments.push(token);
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    segments.push(text.slice(lastIndex));
  }

  return segments;
}

function renderRichText(content: string): JSX.Element {
  const blocks = content
    .replace(/\r\n/g, '\n')
    .split('\n\n')
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <div className="space-y-2.5">
      {blocks.map((block, index) => {
        const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
        const isBulletList = lines.length > 0 && lines.every((line) => /^[-*+]\s+/.test(line) || /^\d+\.\s+/.test(line));

        if (isBulletList) {
          return (
            <ul key={`ul-${index}`} className="space-y-1.5 pl-4 text-sm leading-relaxed">
              {lines.map((line, lineIndex) => (
                <li key={`li-${index}-${lineIndex}`} className="list-disc text-gray-100">
                  {renderInlineText(line.replace(/^([-*+]\s+|\d+\.\s+)/, ''))}
                </li>
              ))}
            </ul>
          );
        }

        const headingMatch = block.match(/^#{1,6}\s+(.+)$/m);
        if (headingMatch) {
          return (
            <p key={`h-${index}`} className="text-sm font-semibold text-white">
              {renderInlineText(headingMatch[1])}
            </p>
          );
        }

        return (
          <p key={`p-${index}`} className="text-sm leading-relaxed text-gray-100">
            {renderInlineText(block)}
          </p>
        );
      })}
    </div>
  );
}

function deriveContextBadges(pageContext?: string): string[] {
  if (!pageContext) return ['Viewing: AirdropGuard', 'Context: General'];

  const normalized = pageContext.replace(/\s+/g, ' ').trim();
  const badges: string[] = [];

  if (/airdrop detail/i.test(normalized)) badges.push('Viewing: Airdrop Detail');
  if (/speculative token/i.test(normalized)) badges.push('Type: Speculative Token');
  if (/api page|developer/i.test(normalized)) badges.push('Type: API / Developer');
  if (/dashboard/i.test(normalized)) badges.push('Viewing: Dashboard');
  if (/scam alerts/i.test(normalized)) badges.push('Viewing: Scam Alerts');

  const trustMatch = normalized.match(/trust(?:\s+score)?\s*(\d{1,3})%?/i);
  if (trustMatch) badges.push(`Trust ${trustMatch[1]}`);

  const oppMatch = normalized.match(/opportunity(?:\s+score)?\s*(\d{1,3})%?/i);
  if (oppMatch) badges.push(`Opportunity ${oppMatch[1]}`);

  if (badges.length === 0) badges.push(`Context: ${normalized.slice(0, 56)}${normalized.length > 56 ? '...' : ''}`);

  return badges.slice(0, 4);
}

function deriveContextSummary(pageContext?: string): {
  title: string;
  status: string;
  trust: string;
  opportunity: string;
} {
  const normalized = (pageContext ?? '').replace(/\s+/g, ' ').trim();

  const focusMatch = normalized.match(/today'?s focus is\s+([^,\.]+)/i);
  const detailMatch = normalized.match(/airdrop detail[^.]*?\s+([a-z0-9\s-]{3,})/i);
  const title = (focusMatch?.[1] ?? detailMatch?.[1] ?? 'Airdrop Overview').trim();

  const trustMatch = normalized.match(/trust(?:\s+baseline|\s+score)?\s*(\d{1,3})%?/i);
  const opportunityMatch = normalized.match(/opportunity(?:\s+score)?\s*(\d{1,3})%?/i);

  const status = /speculative/i.test(normalized)
    ? 'Speculative Token'
    : /scam alerts/i.test(normalized)
      ? 'Risk Monitor'
      : 'Verified Airdrop';

  return {
    title,
    status,
    trust: trustMatch ? trustMatch[1] : '92',
    opportunity: opportunityMatch ? opportunityMatch[1] : '88',
  };
}

function buildGreeting(email?: string): string {
  const firstName = email?.split('@')[0]?.replace(/[._-]+/g, ' ').trim();
  const displayName = firstName
    ? firstName
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
    : 'Explorer';

  const hour = new Date().getHours();
  const salutation = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return `${salutation} ${displayName} 👋`;
}

function CopilotOrb({ active }: { active: boolean }) {
  return (
    <div className="relative mx-auto h-28 w-28 sm:h-32 sm:w-32">
      <div className={`absolute inset-0 rounded-full bg-cyan-400/20 blur-2xl transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-70'}`} />
      <div className={`absolute inset-1 rounded-full border border-cyan-300/35 bg-[radial-gradient(circle_at_30%_30%,rgba(103,232,249,0.7),rgba(14,116,144,0.22)_55%,rgba(2,6,23,0.82)_100%)] shadow-[0_0_26px_rgba(34,211,238,0.35)] transition-transform duration-300 ${active ? 'scale-105 animate-pulse animate-[spin_4s_linear_infinite]' : 'scale-100'}`} />
      <div className="absolute inset-[22%] flex items-center justify-center rounded-full border border-white/20 bg-white/[0.06]">
        <AiOrb className="h-10 w-10" />
      </div>
      <div className={`absolute inset-0 rounded-full border border-cyan-300/20 transition-transform duration-500 ${active ? 'scale-110 opacity-80' : 'scale-100 opacity-40'}`} />
      <div className={`absolute -inset-4 rounded-full border border-cyan-300/15 transition-transform duration-700 ${active ? 'scale-110 opacity-70' : 'scale-100 opacity-35'}`} />
    </div>
  );
}

function ensureAssistantMessage(payload: unknown): string {
  const extracted = extractAssistantText(payload);
  if (!extracted) return UNREADABLE_RESPONSE_MESSAGE;
  return sanitizeAssistantAnswer(extracted);
}

async function extractInvokeError(error: unknown): Promise<string> {
  const fallback = 'AirdropGuard Copilot is unavailable right now. Please try again in a moment.';

  if (!(error instanceof Error)) return fallback;

  const response = 'context' in error ? (error as Error & { context?: unknown }).context : undefined;
  if (!(response instanceof Response)) {
    return normalizeText(error.message) ?? fallback;
  }

  try {
    const rawText = await response.clone().text();
    if (!rawText) return normalizeText(error.message) ?? fallback;

    try {
      const parsedMessage = getFunctionErrorMessage(JSON.parse(rawText), normalizeText(error.message) ?? fallback);
      return normalizeText(parsedMessage) ?? fallback;
    } catch {
      return normalizeText(rawText) ?? normalizeText(error.message) ?? fallback;
    }
  } catch {
    return normalizeText(error.message) ?? fallback;
  }
}

async function isUnauthorizedInvokeError(error: unknown): Promise<boolean> {
  if (!(error instanceof Error)) return false;

  const response = 'context' in error ? (error as Error & { context?: unknown }).context : undefined;
  if (response instanceof Response) {
    if (response.status === 401 || response.status === 403) return true;

    try {
      const rawText = await response.clone().text();
      if (/unauthori[sz]ed/i.test(rawText)) return true;
    } catch {
      // Ignore parse failures and continue with message checks.
    }
  }

  return /unauthori[sz]ed|jwt|session/i.test(error.message);
}

export default function AirdropCopilot({ onClose, summary: _summary, className, pageContext, queuedPrompt }: AirdropCopilotProps) {
  const { user } = useAuth();
  const endRef = useRef<HTMLDivElement | null>(null);
  const lastHandledQueuedPromptNonceRef = useRef<number | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [createWelcomeMessage(pageContext)]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thinkingIndex, setThinkingIndex] = useState(0);
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

  const contextBadges = useMemo(() => deriveContextBadges(pageContext), [pageContext]);
  const contextSummary = useMemo(() => deriveContextSummary(pageContext), [pageContext]);

  const draftSuggestions = useMemo(() => {
    const q = draft.trim().toLowerCase();
    if (!q) return [];
    return QUICK_PROMPTS
      .filter((prompt) => prompt.question.toLowerCase().includes(q) || prompt.label.toLowerCase().includes(q))
      .slice(0, 4)
      .map((prompt) => prompt.question);
  }, [draft]);

  const showLanding = useMemo(
    () => !loading && messages.filter((message) => message.role === 'user').length === 0,
    [messages, loading],
  );
  const greeting = useMemo(() => buildGreeting(user?.email), [user?.email]);

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

  useEffect(() => {
    if (!loading) {
      setThinkingIndex(0);
      return;
    }

    const id = window.setInterval(() => {
      setThinkingIndex((current) => (current + 1) % THINKING_LINES.length);
    }, 1100);

    return () => window.clearInterval(id);
  }, [loading]);

  const sendPrompt = async (input: string) => {
    const content = resolveQuickPromptQuestion(input);
    if (!content || loading) return;

    updateMemoryFromPrompt(content);

    if (!user) {
      setError('Please sign in to use AirdropGuard Copilot.');
      return;
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (sessionError || !accessToken) {
      logCopilot('error', 'Session error', {
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
      const invokeCopilot = async (token: string) => supabase.functions.invoke(FUNCTION_NAME, {
        body: { message: content, context: combinedContext },
        headers: { Authorization: `Bearer ${token}` },
      });

      let response = await invokeCopilot(accessToken);

      if (response.error && await isUnauthorizedInvokeError(response.error)) {
        logCopilot('info', 'Unauthorized response, refreshing session and retrying', {
          functionName: FUNCTION_NAME,
        });

        const { data: refreshedSession, error: refreshError } = await supabase.auth.refreshSession();
        const refreshedToken = refreshedSession.session?.access_token;

        if (refreshError || !refreshedToken) {
          logCopilot('error', 'Session refresh failed', {
            functionName: FUNCTION_NAME,
            refreshError,
          });
          setError('Your session has expired. Please sign in again and retry.');
          return;
        }

        response = await invokeCopilot(refreshedToken);
      }

      logCopilot('info', 'Raw response', response.data);

      if (response.error) {
        logCopilot('error', 'Invoke failed', {
          functionName: FUNCTION_NAME,
          error: response.error,
        });
        throw response.error;
      }

      const answer = ensureAssistantMessage(response.data);

      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: String(answer),
      }]);
    } catch (invokeError) {
      const userMessage = await extractInvokeError(invokeError);
      const safeUserMessage = ensureAssistantMessage(userMessage);
      logCopilot('error', 'Response error', {
        functionName: FUNCTION_NAME,
        error: invokeError,
        userMessage: safeUserMessage,
      });
      setError(safeUserMessage);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: safeUserMessage,
      }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const pending = queuedPrompt?.text?.trim();
    if (!pending) return;
    if (loading) return;

    const nonce = queuedPrompt?.nonce ?? null;
    if (nonce !== null && lastHandledQueuedPromptNonceRef.current === nonce) return;

    lastHandledQueuedPromptNonceRef.current = nonce;
    void sendPrompt(pending);
  }, [queuedPrompt, loading]);

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
    <div className={`flex h-full min-h-0 w-full flex-col overflow-hidden bg-[radial-gradient(circle_at_16%_0%,rgba(56,189,248,0.14),transparent_24%),radial-gradient(circle_at_88%_0%,rgba(139,92,246,0.12),transparent_25%),linear-gradient(180deg,#040b1d_0%,#081128_100%)] text-white ${className ?? ''}`}>
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-cyan-400/15 bg-[#071129]/88 px-4 py-3 backdrop-blur-xl sm:px-5 sm:py-4 lg:px-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <AiOrb className="h-7 w-7" />
            <h2 className="text-lg font-black text-white sm:text-xl">AI Copilot</h2>
          </div>
          <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-100">
            <AiOrb className="h-3.5 w-3.5" />
            AirdropGuard AI Copilot Online
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
            aria-label="Start new chat"
            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center gap-1 rounded-xl border border-sky-400/30 bg-sky-500/10 px-3 text-xs font-semibold text-sky-100 transition-colors hover:bg-sky-500/20"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Chat</span>
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close copilot"
              className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-gray-200 transition-colors hover:bg-white/[0.08]"
            >
              <X className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Close</span>
            </button>
          )}
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-5 lg:px-6">
        <div className="grid min-h-full gap-4 lg:grid-cols-[210px_minmax(0,1fr)]">
          <aside className="hidden lg:flex lg:min-h-0 lg:flex-col lg:rounded-[26px] lg:border lg:border-cyan-300/20 lg:bg-[linear-gradient(180deg,rgba(4,12,30,0.86),rgba(6,16,38,0.86))] lg:p-3 lg:shadow-[0_10px_28px_rgba(3,8,20,0.45),0_0_36px_rgba(56,189,248,0.12)]">
            <div className="rounded-2xl border border-cyan-300/20 bg-white/[0.03] px-3 py-3">
              <CopilotOrb active={loading} />
              <div className="mt-2 text-center">
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-cyan-100">AI Copilot</p>
                <p className="mt-1 text-xs text-gray-300">Always on for safer moves</p>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-gray-300">Current Context</p>
              <p className="mt-2 truncate text-sm font-semibold text-white">{contextSummary.title}</p>
              <p className="text-[11px] text-cyan-200">{contextSummary.status}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-2 py-1.5 text-center">
                  <p className="text-[10px] text-gray-400">Trust</p>
                  <p className="text-base font-black text-emerald-300">{contextSummary.trust}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-2 py-1.5 text-center">
                  <p className="text-[10px] text-gray-400">Opportunity</p>
                  <p className="text-base font-black text-cyan-300">{contextSummary.opportunity}</p>
                </div>
              </div>
            </div>

            <div className="mt-3 space-y-1.5">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={`rail-${action.id}`}
                  type="button"
                  onClick={() => void sendPrompt(action.prompt)}
                  disabled={loading}
                  className="w-full rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2 text-left text-[11px] font-semibold text-gray-200 transition-all duration-200 hover:border-cyan-200/40 hover:bg-cyan-500/10 hover:text-white disabled:opacity-50"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </aside>

          <div className="space-y-4">
          {showLanding && (
            <section className="rounded-[34px] border border-cyan-300/20 bg-white/[0.04] p-4 shadow-[0_20px_48px_rgba(8,15,30,0.45),0_0_0_1px_rgba(148,163,184,0.08)] backdrop-blur-xl sm:p-5">
              <CopilotOrb active={loading} />
              <div className="mt-4 text-center">
                <p className="text-sm font-semibold text-cyan-100">{greeting}</p>
                <h3 className="mt-1 text-xl font-black text-white sm:text-2xl">Ready to find your next opportunity?</h3>
                <p className="mt-1 text-xs text-gray-300">Your AI Copilot orb is live and tracking this page.</p>
              </div>

              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {contextBadges.map((badge) => (
                  <span key={badge} className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-gray-200">
                    {badge}
                  </span>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => void sendPrompt(action.prompt)}
                    disabled={loading}
                    className="group rounded-full border border-white/20 bg-[linear-gradient(135deg,rgba(125,211,252,0.14),rgba(34,211,238,0.06)_55%,rgba(15,23,42,0.42)_100%)] px-3.5 py-2 text-xs font-semibold text-gray-100 shadow-[0_4px_16px_rgba(8,20,36,0.3)] backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-200/55 hover:text-white hover:shadow-[0_0_20px_rgba(34,211,238,0.25)] active:scale-[0.98] disabled:opacity-50"
                  >
                    {action.label}
                  </button>
                ))}
              </div>

              <div className="mt-5 rounded-3xl border border-white/12 bg-white/[0.02] p-3.5">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-100">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-500/10 text-[10px]">AI</span>
                  Copilot Signal Feed
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-gray-200">
                  {['Today\'s Best Pick', 'Recently Improved', 'Highest Reward', 'Scam Alert', 'Recently Updated'].map((insight) => (
                    <span key={insight} className="rounded-full border border-white/12 bg-white/[0.03] px-2.5 py-1">
                      {insight}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          )}

          {messages.map((message, index) => {
            const isWelcome = index === 0 && message.role === 'assistant' && message.content.startsWith(WELCOME_MESSAGE);
            if (isWelcome) return null;
            return (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-300`}>
                <div className={`flex max-w-[92%] items-start gap-2 lg:max-w-[88%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {message.role === 'assistant' && <AiOrb className="mt-1 h-7 w-7 shrink-0" />}
                  <div className={`px-4 py-3 text-sm leading-relaxed shadow-[0_8px_22px_rgba(2,6,23,0.35)] ${message.role === 'user'
                  ? 'rounded-[22px] rounded-br-[10px] border border-violet-300/20 bg-[linear-gradient(145deg,#8b5cf6,#6d28d9_58%,#4f46e5)] text-white'
                  : 'rounded-[22px] rounded-bl-[10px] border border-cyan-300/20 bg-[linear-gradient(165deg,rgba(9,24,52,0.84),rgba(7,16,36,0.84))] text-gray-100 backdrop-blur-xl'
                }`}>
                    <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                      {message.role === 'assistant' ? renderRichText(message.content) : message.content}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex justify-start">
              <div className="flex max-w-[88%] items-center gap-2 rounded-[22px] rounded-bl-[10px] border border-white/15 bg-white/[0.06] px-4 py-3 text-sm text-gray-200 backdrop-blur-xl">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-500/10">
                  <AiOrb className="h-4 w-4 animate-pulse animate-[spin_3s_linear_infinite]" />
                </span>
                {THINKING_LINES[thinkingIndex]}
              </div>
            </div>
          )}

          <div ref={endRef} />
          </div>
        </div>
      </main>

      <footer className="shrink-0 border-t border-cyan-400/15 bg-[#08101f]/88 px-4 py-3 backdrop-blur-xl sm:px-5 sm:py-4 lg:px-6">
        <form
          onSubmit={event => {
            event.preventDefault();
            void sendPrompt(draft);
          }}
          className="space-y-3"
        >
          <div className="flex items-end gap-2 rounded-full border border-cyan-200/30 bg-[linear-gradient(135deg,rgba(8,21,45,0.82),rgba(18,24,54,0.82))] p-2 shadow-[0_0_0_1px_rgba(34,211,238,0.1),0_14px_26px_rgba(4,10,22,0.38),0_0_22px_rgba(124,58,237,0.2)] backdrop-blur-xl">
            <button
              type="button"
              aria-label="Attach file (coming soon)"
              disabled
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] text-gray-400"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <textarea
              value={draft}
              onChange={event => setDraft(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              rows={2}
              placeholder="Ask anything about crypto airdrops..."
              className="min-h-[52px] max-h-40 min-w-0 flex-1 resize-none rounded-full border border-transparent bg-transparent px-3 py-3 text-sm text-white placeholder:text-gray-500 focus:border-transparent focus:outline-none [overflow-wrap:anywhere]"
              disabled={loading}
              maxLength={900}
            />
            <button
              type="submit"
              disabled={!draft.trim() || loading}
              className="inline-flex h-10 min-w-[82px] shrink-0 items-center justify-center gap-1 rounded-full border border-violet-200/35 bg-[linear-gradient(145deg,#8b5cf6,#4f46e5)] px-3 text-xs font-bold text-white shadow-[0_8px_18px_rgba(79,70,229,0.35)] transition-transform duration-200 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Send message"
            >
              <Send className="h-3.5 w-3.5" />
              Send
            </button>
          </div>
          {draftSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {draftSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setDraft(suggestion)}
                  className="rounded-full border border-white/15 bg-white/[0.03] px-3 py-1.5 text-left text-[11px] text-gray-200 transition-colors hover:bg-white/[0.08]"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
          {error && <p className="text-[11px] text-rose-300">{error}</p>}
          <p className="text-[11px] text-gray-400">Press Enter to send, Shift+Enter for a new line.</p>
          <p className="text-[11px] text-gray-500">{FOOTER_NOTE}</p>
        </form>
      </footer>
    </div>
  );
}