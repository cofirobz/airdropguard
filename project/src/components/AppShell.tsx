import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AlertTriangle,
  Activity,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Flame,
  Home,
  Key,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Shield,
  Sparkles,
  Star,
  UserCircle2,
  Wallet,
  X,
} from 'lucide-react';
import AiOrb from './AiOrb';
import { openCopilot, openCopilotWithPrompt, type CopilotOpenDetail } from '../lib/copilot';

const AirdropCopilot = lazy(() => import('./AirdropCopilot'));

type RouteContext = {
  title: string;
  subtitle: string;
  copilotContext: string;
};

type AppShellProps = {
  children: React.ReactNode;
  userLabel: string;
  onSignOut: () => Promise<void> | void;
  routeContext: RouteContext;
  contentClassName?: string;
};

type NavItem = {
  to: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
};

type ShellHeroState = {
  title: string;
  message: string;
  primaryLabel: string;
  primaryTo: string;
  secondaryLabel: string;
  badge: string;
  glowClass: string;
  changedLabel: string;
  nextAction: string;
  whyItMatters: string;
};

type HeroHints = {
  watchlistCount?: number;
  remainingTasks?: number;
  completedTasks?: number;
  streakDays?: number;
  avgTrustScore?: number;
  aiPick?: string;
  tabLabel?: string;
  userLabel?: string;
};

type ContextualAiState = {
  label: string;
  recommendation: string;
  cta: string;
  ctaPrompt: string;
  copilotContext: string;
  tip: string;
};

type FloatingAiPosition = {
  x: number;
  y: number;
};

const FLOATING_AI_STORAGE_KEY = 'ag_desktop_ai_position_v1';
const APP_MOBILE_MENU_GROUPS_STORAGE_KEY = 'ag_app_mobile_menu_groups_v1';
const FLOATING_AI_WIDTH = 86;
const FLOATING_AI_HEIGHT = 86;
const FLOATING_AI_MARGIN = 32;

function clampFloatingAiPosition(position: FloatingAiPosition) {
  if (typeof window === 'undefined') return position;

  return {
    x: Math.min(
      Math.max(FLOATING_AI_MARGIN, position.x),
      Math.max(FLOATING_AI_MARGIN, window.innerWidth - FLOATING_AI_WIDTH - FLOATING_AI_MARGIN),
    ),
    y: Math.min(
      Math.max(FLOATING_AI_MARGIN, position.y),
      Math.max(FLOATING_AI_MARGIN, window.innerHeight - FLOATING_AI_HEIGHT - FLOATING_AI_MARGIN),
    ),
  };
}

function getDefaultFloatingAiPosition(): FloatingAiPosition {
  return clampFloatingAiPosition({
    x: window.innerWidth - FLOATING_AI_WIDTH - FLOATING_AI_MARGIN,
    y: window.innerHeight - FLOATING_AI_HEIGHT - FLOATING_AI_MARGIN,
  });
}

export function isAuthenticatedAppPath(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname.startsWith('/airdrop/') ||
    pathname.startsWith('/dashboard') ||
    pathname === '/wallet-checker' ||
    pathname === '/scam-alerts' ||
    pathname === '/pricing' ||
    pathname === '/api-pricing' ||
    pathname === '/api-docs'
  );
}

export function AppShellLoadingSkeleton() {
  return (
    <div className="space-y-5">
      <div className="h-24 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
        <div className="shimmer-line h-3 w-24 rounded" />
        <div className="mt-4 shimmer-line h-7 w-56 rounded" />
        <div className="mt-3 shimmer-line h-3 w-72 max-w-full rounded" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-48 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <div className="shimmer-line h-4 w-28 rounded" />
            <div className="mt-4 shimmer-line h-3 w-full rounded" />
            <div className="mt-2 shimmer-line h-3 w-5/6 rounded" />
            <div className="mt-8 shimmer-line h-10 w-32 rounded-2xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

function buildContextualAiState(pathname: string, search: string, hints: HeroHints): ContextualAiState {
  const filter = new URLSearchParams(search).get('filter');
  const remainingTasks = hints.remainingTasks ?? 0;
  const watchlistCount = hints.watchlistCount ?? 0;
  const trust = hints.avgTrustScore ?? 0;

  if (pathname.startsWith('/dashboard')) {
    return {
      label: 'Continue Today\'s Mission',
      recommendation: remainingTasks > 0
        ? `You have ${remainingTasks} tasks left. Start with the highest-trust unfinished mission.`
        : 'Your checklist is clear. Ask AI to pick your next high-trust mission.',
      cta: 'Continue Today\'s Mission',
      ctaPrompt: 'What should I focus on next in my dashboard today?',
      copilotContext: `Dashboard guidance. ${remainingTasks} tasks remaining, ${watchlistCount} watchlist projects, trust baseline ${trust}%. Recommend the single best next action for today and why it matters.`,
      tip: 'Tip: Task Tracking keeps execution clear while Trust Score helps you prioritize safer missions first.',
    };
  }

  if (pathname === '/wallet-checker') {
    return {
      label: 'Wallet Intelligence',
      recommendation: 'Your wallet looks healthy? Let AI confirm risk posture and suggest the safest next connect step.',
      cta: 'Interpret Wallet Results',
      ctaPrompt: 'Help me interpret these wallet intelligence results and tell me the safest next step.',
      copilotContext: 'Wallet Intelligence page. Summarize wallet health in plain language, highlight any red flags, and provide the safest next action.',
      tip: 'Tip: Wallet Intelligence is read-only and never requests seed phrases or private keys.',
    };
  }

  if (pathname.startsWith('/airdrop/')) {
    return {
      label: 'Airdrop Report Intelligence',
      recommendation: 'Want a fast go or no-go? Ask AI to summarize trust, effort, rewards and hidden risks.',
      cta: 'Summarize This Report',
      ctaPrompt: 'Summarize this project and tell me if it is worth my time.',
      copilotContext: 'Airdrop detail report page. Summarize trust score, reward potential, risk level and required tasks. Then recommend go/no-go with the next concrete step.',
      tip: 'Tip: Trust Score helps safety confidence, while Opportunity Score estimates potential upside.',
    };
  }

  if (pathname === '/scam-alerts') {
    return {
      label: 'Risk Radar',
      recommendation: 'Clear high-risk alerts first, then return to opportunities with verified signals.',
      cta: 'Prioritize Risk Alerts',
      ctaPrompt: 'Which scam alerts should I prioritize first and what should I avoid right now?',
      copilotContext: 'Scam Alerts page. Help me triage current warnings by urgency and identify what I should avoid today.',
      tip: 'Tip: Trust Score reflects confidence quality, while Scam Alerts surface active threat patterns.',
    };
  }

  if (pathname === '/pricing' || pathname === '/api-pricing' || pathname === '/api-docs') {
    return {
      label: 'Developer Mission Control',
      recommendation: 'New endpoint documentation may be available. Ask AI for the fastest integration plan.',
      cta: 'Get API Next Steps',
      ctaPrompt: 'What are the next steps to start using the AirdropGuard API?',
      copilotContext: 'API page. Explain the fastest path from account access to first successful endpoint call, including practical setup steps.',
      tip: 'Tip: AI Analysis can be operationalized via API to turn research into repeatable workflows.',
    };
  }

  if (pathname === '/' && filter === 'trending') {
    return {
      label: 'Trending Intelligence',
      recommendation: 'Three trending projects likely fit your profile. Ask AI to compare trust, effort and reward.' ,
      cta: 'Compare Trending Picks',
      ctaPrompt: 'Compare the top trending picks and tell me which one I should start first.',
      copilotContext: `Trending browse page. Compare top opportunities for my profile with emphasis on trust, effort and reward. Current watchlist size: ${watchlistCount}.`,
      tip: 'Tip: Opportunity Score estimates upside potential while Trust Score indicates verification confidence.',
    };
  }

  return {
    label: 'Browse Intelligence',
    recommendation: 'Want AI to compare these for you? Get one clear recommendation and next action.',
    cta: 'Ask AI For My Best Pick',
    ctaPrompt: 'Based on this page, what is my best next pick and why?',
    copilotContext: `Browse page. Select my best next mission from current opportunities using trust, urgency and expected effort. Watchlist: ${watchlistCount}.`,
    tip: 'Tip: AI Analysis combines trust, urgency, reward and task effort to prioritize your next move.',
  };
}

function buildSidebarItems(pathname: string, search: string): NavItem[] {
  return [
    {
      to: '/dashboard',
      label: 'Mission Control',
      icon: LayoutDashboard,
      active: pathname.startsWith('/dashboard'),
    },
    {
      to: '/',
      label: 'Browse',
      icon: Home,
      active: pathname === '/' && !search,
    },
    {
      to: '/?filter=trending',
      label: 'Trending',
      icon: Flame,
      active: pathname === '/' && search === '?filter=trending',
    },
    {
      to: '/wallet-checker',
      label: 'Wallet Check',
      icon: Wallet,
      active: pathname === '/wallet-checker',
    },
    {
      to: '/scam-alerts',
      label: 'Alerts',
      icon: AlertTriangle,
      active: pathname === '/scam-alerts',
    },
    {
      to: '/pricing',
      label: 'API Access',
      icon: Key,
      active: pathname === '/pricing' || pathname === '/api-pricing' || pathname === '/api-docs',
    },
  ];
}

function buildMobileItems(pathname: string): NavItem[] {
  return [
    {
      to: '/dashboard',
      label: 'Mission',
      icon: LayoutDashboard,
      active: pathname.startsWith('/dashboard'),
    },
    {
      to: '/',
      label: 'Browse',
      icon: Home,
      active: pathname === '/',
    },
    {
      to: '/scam-alerts',
      label: 'Alerts',
      icon: AlertTriangle,
      active: pathname === '/scam-alerts',
    },
    {
      to: '/dashboard',
      label: 'Profile',
      icon: UserCircle2,
      active: pathname.startsWith('/dashboard'),
    },
  ];
}

function buildShellHeroState(pathname: string, search: string, hints: HeroHints): ShellHeroState | null {
  if (pathname.startsWith('/dashboard')) return null;

  const hour = new Date().getHours();
  const dayGreeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const watchlistNote = hints.watchlistCount && hints.watchlistCount > 0
    ? `${hints.watchlistCount} tracked project${hints.watchlistCount === 1 ? '' : 's'}`
    : 'watchlist ready to start';
  const taskNote = typeof hints.remainingTasks === 'number'
    ? `${hints.remainingTasks} task${hints.remainingTasks === 1 ? '' : 's'} remaining`
    : 'no tasks tracked yet';
  const trustNote = typeof hints.avgTrustScore === 'number' && hints.avgTrustScore > 0
    ? `${hints.avgTrustScore}% average trust`
    : 'trust baseline updating';

  if (pathname === '/') {
    const filter = new URLSearchParams(search).get('filter');
    if (filter === 'trending') {
      return {
        title: `${dayGreeting}, Projects Everyone Is Watching`,
        message: 'Track momentum shifts and focus on opportunities that are attracting verified attention.',
        primaryLabel: 'View Trending',
        primaryTo: '/?filter=trending',
        secondaryLabel: 'Ask AI',
        badge: 'Market Pulse Live',
        glowClass: 'from-cyan-500/20 via-blue-500/10 to-violet-500/10',
        changedLabel: `What changed: ${hints.aiPick ? `${hints.aiPick} is accelerating` : 'momentum signals updated'}`,
        nextAction: `Do next: compare top trust movers and review ${taskNote}`,
        whyItMatters: `Why it matters: timing + trust improves qualification odds (${trustNote}).`,
      };
    }

    return {
      title: `${dayGreeting}, Discover Your Next Opportunity`,
      message: 'Use AI-assisted ranking and human verification to decide what deserves your time first.',
      primaryLabel: 'Browse Airdrops',
      primaryTo: '/',
      secondaryLabel: 'Ask AI',
      badge: 'AI + Human Verified',
      glowClass: 'from-cyan-500/20 via-sky-500/10 to-violet-500/10',
      changedLabel: `What changed: ${watchlistNote} and live opportunities refreshed.`,
      nextAction: `Do next: open a verified report then ask AI for your top 3 priorities.`,
      whyItMatters: `Why it matters: better prioritisation reduces wasted effort and scam exposure.`,
    };
  }

  if (pathname === '/wallet-checker') {
    return {
      title: `${dayGreeting}, Your Wallet Health Report`,
      message: 'Check wallet readiness safely with read-only intelligence before interacting with new claim flows.',
      primaryLabel: 'Run Wallet Check',
      primaryTo: '/wallet-checker',
      secondaryLabel: 'Ask AI',
      badge: 'Read-Only Safety',
      glowClass: 'from-blue-500/20 via-cyan-500/10 to-violet-500/10',
      changedLabel: 'What changed: wallet risk signals may have shifted since your last scan.',
      nextAction: 'Do next: run a fresh scan and review suspicious assets first.',
      whyItMatters: 'Why it matters: safer wallets qualify more consistently over time.',
    };
  }

  if (pathname === '/scam-alerts') {
    return {
      title: `${dayGreeting}, Never Miss Another Opportunity`,
      message: 'Review risk radar alerts before connecting so you can avoid avoidable losses.',
      primaryLabel: 'View Alerts',
      primaryTo: '/scam-alerts',
      secondaryLabel: 'Ask AI',
      badge: 'Live Warnings',
      glowClass: 'from-rose-500/20 via-cyan-500/10 to-blue-500/10',
      changedLabel: 'What changed: new warnings are prioritized by urgency.',
      nextAction: 'Do next: clear critical alerts, then continue your top mission.',
      whyItMatters: 'Why it matters: avoiding one scam can save weeks of progress.',
    };
  }

  if (pathname === '/pricing' || pathname === '/api-pricing' || pathname === '/api-docs') {
    return {
      title: `${dayGreeting}, Developer Mission Control`,
      message: 'Scale your intelligence workflow with structured access, clearer signals and faster automation.',
      primaryLabel: 'Open Pricing',
      primaryTo: '/pricing',
      secondaryLabel: 'Ask AI',
      badge: 'Developer Access',
      glowClass: 'from-violet-500/20 via-cyan-500/10 to-blue-500/10',
      changedLabel: `What changed: API usage and opportunity data are continuously refreshed (${trustNote}).`,
      nextAction: 'Do next: confirm your plan and ship your first endpoint call.',
      whyItMatters: 'Why it matters: faster integrations turn research into repeatable workflows.',
    };
  }

  return null;
}

export default function AppShell({
  children,
  userLabel,
  onSignOut,
  routeContext,
  contentClassName,
}: AppShellProps) {
  const location = useLocation();
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [mobileMenuGroups, setMobileMenuGroups] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') {
      return { discover: true, tools: false, account: true };
    }

    try {
      const raw = window.localStorage.getItem(APP_MOBILE_MENU_GROUPS_STORAGE_KEY);
      if (!raw) return { discover: true, tools: false, account: true };
      return { discover: true, tools: false, account: true, ...(JSON.parse(raw) as Record<string, boolean>) };
    } catch {
      return { discover: true, tools: false, account: true };
    }
  });
  const [pageCopilotContext, setPageCopilotContext] = useState<string | null>(null);
  const [heroHints, setHeroHints] = useState<HeroHints>({});
  const [queuedPrompt, setQueuedPrompt] = useState<{ text: string; nonce: number } | null>(null);
  const [statusTick, setStatusTick] = useState(0);
  const [desktopAiPosition, setDesktopAiPosition] = useState<FloatingAiPosition | null>(() => {
    if (typeof window === 'undefined') return null;

    try {
      const raw = window.localStorage.getItem(FLOATING_AI_STORAGE_KEY);
      if (!raw) return getDefaultFloatingAiPosition();
      const parsed = JSON.parse(raw) as FloatingAiPosition;
      if (typeof parsed?.x !== 'number' || typeof parsed?.y !== 'number') {
        return getDefaultFloatingAiPosition();
      }
      return clampFloatingAiPosition(parsed);
    } catch {
      return getDefaultFloatingAiPosition();
    }
  });
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    dragged: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const lastScrollYRef = useRef(0);
  const sidebarItems = buildSidebarItems(location.pathname, location.search);
  const mobileItems = buildMobileItems(location.pathname);
  const effectiveCopilotContext = pageCopilotContext ?? routeContext.copilotContext;
  const contentClasses = contentClassName ?? 'space-y-6';
  const shellHeroState = buildShellHeroState(location.pathname, location.search, heroHints);
  const contextualAiState = buildContextualAiState(location.pathname, location.search, heroHints);
  const analysisLabel = statusTick % 4 === 0 ? 'AI analysing.' : statusTick % 4 === 1 ? 'AI analysing..' : statusTick % 4 === 2 ? 'AI analysing...' : 'AI analysing';
  const isDashboardRoute = location.pathname.startsWith('/dashboard');
  const firstName = userLabel.split('@')[0] || 'Explorer';
  const greetingOptions = [
    `Mission Ready, ${firstName}`,
    heroHints.completedTasks && heroHints.completedTasks > 0 ? `Intelligence Updated, ${firstName}` : `Today's Briefing Ready, ${firstName}`,
    heroHints.watchlistCount && heroHints.watchlistCount > 0 ? `AI has analysed today's opportunities` : `Intelligence Updated`,
  ];
  const dashboardGreeting = `🛡 ${greetingOptions[statusTick % greetingOptions.length]}`;
  const missionReadyCount = Math.max(1, Math.min(6,
    (heroHints.aiPick ? 1 : 0)
    + ((heroHints.watchlistCount ?? 0) > 0 ? 1 : 0)
    + ((heroHints.remainingTasks ?? 0) > 0 ? 1 : 0)
    + ((heroHints.avgTrustScore ?? 0) >= 70 ? 1 : 0)
  ));
  const headerIndicators = isDashboardRoute
    ? [
        'AI ONLINE',
        'MARKET PULSE LIVE',
        'UPDATED JUST NOW',
        `${missionReadyCount} MISSIONS READY`,
        `${Math.max(0, Math.round(heroHints.avgTrustScore ?? 0))}% TRUST`,
        'WALLET READY',
      ]
    : [];
  const mobileNavHidden = headerHidden && !mobileMenuOpen && !aiDrawerOpen;
  const toggleMobileGroup = (group: string) => {
    setMobileMenuGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };
  const appMobileMenuSections = [
    {
      key: 'discover',
      title: 'Discover',
      items: [
        { to: '/', label: 'Browse Airdrops', icon: Home },
        { to: '/#speculative-tokens', label: 'Speculative Tokens', icon: Flame },
        { to: '/?filter=trending', label: 'Trending', icon: Flame },
        { to: '/learn', label: 'Learn', icon: BookOpen },
      ],
    },
    {
      key: 'tools',
      title: 'Tools',
      items: [
        { to: '/wallet-checker', label: 'Wallet Intelligence', icon: Wallet },
        { to: '__copilot__', label: 'AI Copilot', icon: Sparkles },
        { to: '/scam-alerts', label: 'Alerts', icon: AlertTriangle },
        { to: '/pricing', label: 'API', icon: Key },
      ],
    },
    {
      key: 'account',
      title: 'Account',
      items: [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/dashboard?view=overview', label: 'Watchlist', icon: Star },
        { to: '/dashboard?view=profile', label: 'Profile', icon: UserCircle2 },
        { to: '/dashboard?view=profile', label: 'Settings', icon: Shield },
      ],
    },
  ];

  useEffect(() => {
    setPageCopilotContext(null);
    setMobileMenuOpen(false);
    setHeroHints({});
    setHeaderHidden(false);
    lastScrollYRef.current = 0;
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(APP_MOBILE_MENU_GROUPS_STORAGE_KEY, JSON.stringify(mobileMenuGroups));
  }, [mobileMenuGroups]);

  useEffect(() => {
    const shouldLockScroll = (mobileMenuOpen || aiDrawerOpen) && window.matchMedia('(max-width: 1023px)').matches;

    document.body.style.overflow = shouldLockScroll ? 'hidden' : '';
    document.documentElement.style.overflow = shouldLockScroll ? 'hidden' : '';

    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [aiDrawerOpen, mobileMenuOpen]);

  useEffect(() => {
    if (mobileMenuOpen || aiDrawerOpen) {
      setHeaderHidden(false);
      return;
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollYRef.current;

      if (currentScrollY <= 24) {
        setHeaderHidden(false);
      } else if (delta > 8 && currentScrollY > 96) {
        setHeaderHidden(true);
      } else if (delta < -8) {
        setHeaderHidden(false);
      }

      lastScrollYRef.current = currentScrollY;
    };

    lastScrollYRef.current = window.scrollY;
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [aiDrawerOpen, mobileMenuOpen]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setStatusTick((prev) => prev + 1);
    }, 3000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!desktopAiPosition) return;
    window.localStorage.setItem(FLOATING_AI_STORAGE_KEY, JSON.stringify(desktopAiPosition));
  }, [desktopAiPosition]);

  useEffect(() => {
    const handleResize = () => {
      setDesktopAiPosition((prev) => (prev ? clampFloatingAiPosition(prev) : getDefaultFloatingAiPosition()));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const openCopilotFromCta = (prompt: string, context: string) => {
    openCopilotWithPrompt(prompt, context);
  };

  const handleDesktopAiPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'touch' || event.button !== 0 || !desktopAiPosition) return;

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: desktopAiPosition.x,
      originY: desktopAiPosition.y,
      dragged: false,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleDesktopAiPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;

    if (!dragState.dragged && (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4)) {
      dragState.dragged = true;
    }

    if (!dragState.dragged) return;

    setDesktopAiPosition(clampFloatingAiPosition({
      x: dragState.originX + deltaX,
      y: dragState.originY + deltaY,
    }));
  };

  const handleDesktopAiPointerEnd = (event: React.PointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (dragState.dragged) {
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }

    dragStateRef.current = null;
  };

  const handleDesktopAiClick = () => {
    if (suppressClickRef.current) return;
    openCopilot(effectiveCopilotContext);
  };

  useEffect(() => {
    const handleContext = (event: Event) => {
      const detail = (event as CustomEvent<{ context?: string | null }>).detail;
      setPageCopilotContext(detail?.context ?? null);
    };

    const handleOpen = (event: Event) => {
      const detail = (event as CustomEvent<CopilotOpenDetail | undefined>).detail;
      const context = typeof detail?.context === 'string' ? detail.context.trim() : '';
      const prompt = typeof detail?.prompt === 'string' ? detail.prompt.trim() : '';

      if (context) {
        setPageCopilotContext(context);
      }

      if (prompt) {
        setQueuedPrompt({ text: prompt, nonce: Date.now() });
      }

      setAiDrawerOpen(true);
    };
    const handleClose = () => setAiDrawerOpen(false);
    const handleHeroHints = (event: Event) => {
      const detail = (event as CustomEvent<HeroHints | undefined>).detail;
      setHeroHints(detail ?? {});
    };

    window.addEventListener('ag:copilot-context', handleContext as EventListener);
    window.addEventListener('ag:copilot-open', handleOpen);
    window.addEventListener('ag:copilot-close', handleClose);
    window.addEventListener('ag:hero-hints', handleHeroHints as EventListener);

    return () => {
      window.removeEventListener('ag:copilot-context', handleContext as EventListener);
      window.removeEventListener('ag:copilot-open', handleOpen);
      window.removeEventListener('ag:copilot-close', handleClose);
      window.removeEventListener('ag:hero-hints', handleHeroHints as EventListener);
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#030815] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_8%,rgba(56,189,248,0.2),transparent_34%),radial-gradient(circle_at_90%_8%,rgba(37,99,235,0.2),transparent_30%),radial-gradient(circle_at_50%_110%,rgba(15,23,42,0.2),transparent_46%)]" />

      <aside className="fixed left-0 top-0 hidden h-screen w-[260px] flex-col border-r border-white/10 bg-[#070b18]/95 px-3 py-4 shadow-[0_0_60px_rgba(31,41,55,0.35)] backdrop-blur-xl lg:flex">
        <Link to="/dashboard" className="mb-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <div className="text-base font-black gradient-text">AirdropGuard</div>
          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">AI Operating System</div>
        </Link>

        <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                to={item.to}
                className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                  item.active
                    ? 'border-sky-400/35 bg-gradient-to-r from-sky-500/20 to-violet-500/20 text-white'
                    : 'border-white/10 bg-white/[0.02] text-gray-300 hover:border-sky-500/35 hover:text-white'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => openCopilotWithPrompt('What should I focus on next from this page?', effectiveCopilotContext)}
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-xs font-semibold text-gray-300 transition-colors hover:border-sky-500/35 hover:text-white"
          >
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" />
              AI Analyzer
            </span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </nav>

        <div className="mt-3 rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/20 to-sky-500/10 p-3">
          <p className="text-xs font-bold text-white">Mission Bridge</p>
          <p className="mt-1 text-[11px] text-gray-300">One persistent shell for AirdropGuard intelligence, wallet safety and mission workflows.</p>
        </div>

        <button
          type="button"
          onClick={() => void onSignOut()}
          className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-500/20 hover:text-white"
        >
          <LogOut className="h-3.5 w-3.5" />
          Logout
        </button>
      </aside>

      <header className={`fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[#070b18]/95 backdrop-blur-xl transition-transform duration-300 ease-out lg:left-[260px] ${headerHidden ? '-translate-y-full' : 'translate-y-0'}`}>
        <div className="flex h-16 items-center justify-between gap-4 px-4 sm:h-20 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <div className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-300 sm:block">{isDashboardRoute ? 'AirdropGuard AI' : 'AirdropGuard App'}</div>
            <h1 className="truncate text-base font-black text-white sm:mt-1 sm:text-2xl">{isDashboardRoute ? 'MISSION CONTROL' : routeContext.title}</h1>
            {isDashboardRoute ? (
              <div className="hidden sm:flex sm:flex-wrap sm:items-center sm:gap-1.5 sm:pt-1">
                <span className="text-[11px] font-semibold text-cyan-100">{dashboardGreeting}</span>
                {headerIndicators.slice(0, 4).map((label) => (
                  <span key={label} className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.04] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-gray-200">
                    {label}
                  </span>
                ))}
              </div>
            ) : (
              <p className="hidden text-xs text-gray-400 sm:block">{routeContext.subtitle}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isDashboardRoute && (
              <div className="hidden items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/8 px-3 py-2 lg:inline-flex">
                <AiOrb className="h-6 w-6" />
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-100">Live Intelligence</span>
              </div>
            )}
            <div className="hidden items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-gray-300 sm:inline-flex">
              <UserCircle2 className="h-4 w-4 text-sky-300" />
              <span className="max-w-[160px] truncate">{userLabel}</span>
            </div>
            <button
              type="button"
              onClick={() => void onSignOut()}
              aria-label="Sign out"
              className="inline-flex min-h-[42px] min-w-[42px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 text-xs font-semibold text-gray-300 transition-colors hover:border-white/25 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main id="main-content" className="relative pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-20 lg:ml-[260px] lg:pb-10 lg:pt-24" tabIndex={-1}>
        {shellHeroState && (
          <section className="mx-4 mt-4 overflow-hidden rounded-[30px] border border-cyan-400/20 bg-[linear-gradient(145deg,rgba(3,10,24,0.95),rgba(7,17,36,0.95),rgba(11,9,32,0.94))] px-4 py-4 shadow-[0_20px_55px_rgba(3,8,24,0.5),0_0_40px_rgba(34,211,238,0.12)] soft-flow sm:mx-6 sm:px-5 sm:py-5 lg:mx-8">
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100">
                  <Activity className="h-3.5 w-3.5 animate-pulse" />
                  {shellHeroState.badge}
                </div>
                <h2 className="mt-3 max-w-2xl text-3xl font-black leading-[0.95] text-white sm:text-4xl">{shellHeroState.title}</h2>
                <p className="mt-3 max-w-xl text-sm text-sky-100/90 sm:text-base">{shellHeroState.message}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    to={shellHeroState.primaryTo}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-cyan-500 px-4 py-2 text-xs font-black text-white shadow-[0_12px_28px_rgba(14,165,233,0.32)] transition-colors hover:bg-cyan-400"
                  >
                    {shellHeroState.primaryLabel}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => openCopilotWithPrompt('What should I do next on this page?', effectiveCopilotContext)}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-white/[0.1]"
                  >
                    <AiOrb className="h-4 w-4" />
                    {shellHeroState.secondaryLabel}
                  </button>
                </div>
              </div>

              <div className={`premium-hover rounded-[24px] border border-white/10 bg-[linear-gradient(160deg,rgba(8,20,42,0.9),rgba(7,12,24,0.95))] p-4 shadow-[0_0_30px_rgba(34,211,238,0.1)] ${shellHeroState.glowClass}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200">AI + Human Verified</p>
                    <p className="mt-1 text-sm font-bold text-white">Premium mission layer</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-500/10">
                    <AiOrb className="h-7 w-7" />
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[10px] text-gray-300">
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2">
                    <div className="text-sm font-black text-cyan-200">Live</div>
                    <div className="mt-1">Signals</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2">
                    <div className="text-sm font-black text-emerald-200">Safe</div>
                    <div className="mt-1">Checks</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2">
                    <div className="text-sm font-black text-violet-200">Fast</div>
                    <div className="mt-1">Decisions</div>
                  </div>
                </div>
                <div className="mt-4 space-y-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[11px] leading-relaxed text-gray-200">
                  <p>{shellHeroState.changedLabel}</p>
                  <p>{shellHeroState.nextAction}</p>
                  <p>{shellHeroState.whyItMatters}</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {!isDashboardRoute && (
          <section className="premium-hover mx-4 mt-4 rounded-2xl border border-cyan-400/18 bg-[linear-gradient(155deg,rgba(5,14,30,0.93),rgba(7,17,36,0.92))] px-3 py-3 shadow-[0_12px_30px_rgba(2,6,23,0.4)] sm:mx-6 sm:px-4 lg:mx-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]">
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                    AI Online
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-cyan-200">Market Pulse Live</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.05] px-2 py-0.5 text-gray-300">Updated moments ago</span>
                </div>
                <p className="mt-2 text-xs font-bold text-cyan-100">{contextualAiState.label}</p>
                <p className="mt-1 text-sm text-white">{contextualAiState.recommendation}</p>
              </div>

              <button
                type="button"
                onClick={() => openCopilotFromCta(contextualAiState.ctaPrompt, contextualAiState.copilotContext)}
                className="ripple-btn inline-flex min-h-[46px] shrink-0 items-center justify-center gap-2 rounded-xl border border-cyan-300/35 bg-cyan-500/22 px-4 py-2 text-xs font-black text-white transition-colors hover:bg-cyan-500/30"
              >
                <AiOrb className="h-4 w-4" />
                {contextualAiState.cta}
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-3 flex flex-col gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] text-gray-200">{contextualAiState.tip}</p>
              <p className="text-[11px] font-semibold text-cyan-200">{analysisLabel}</p>
            </div>
          </section>
        )}

        <div key={`${location.pathname}${location.search}`} className={`animate-in px-4 pb-6 pt-4 duration-300 sm:px-6 lg:px-8 ${contentClasses}`}>
          {children}
        </div>
      </main>

      <div className={`fixed bottom-0 left-0 right-0 z-30 border-t border-cyan-400/20 bg-[linear-gradient(180deg,rgba(3,10,24,0.95),rgba(2,8,18,0.98))] px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl transition-transform duration-[250ms] ease-out lg:hidden ${mobileNavHidden ? 'translate-y-full' : 'translate-y-0'}`}>
        <div className="mx-auto grid max-w-md grid-cols-[1fr_1fr_auto_1fr_1fr] items-end gap-1.5">
          {mobileItems.slice(0, 2).map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                to={item.to}
                className={`flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-2xl border px-1 py-2 text-[10px] font-semibold transition-all duration-200 active:scale-[0.98] ${item.active ? 'border-cyan-400/35 bg-cyan-500/15 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.2)]' : 'border-transparent text-gray-400 hover:text-white'}`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => openCopilot(effectiveCopilotContext)}
            className="-mt-7 inline-flex h-[72px] w-[72px] flex-col items-center justify-center self-center justify-self-center rounded-full border border-cyan-200/85 bg-[radial-gradient(circle_at_30%_30%,#67e8f9,transparent_42%),linear-gradient(145deg,#06b6d4,#2563eb_55%,#0b1225)] text-white shadow-[0_0_0_8px_rgba(34,211,238,0.2),0_20px_36px_rgba(14,165,233,0.45),0_0_24px_rgba(6,182,212,0.22)] transition-all duration-200 active:scale-[0.97] hover:scale-105"
            aria-label="Open AI Copilot"
          >
            <AiOrb className="h-6 w-6" />
            <span className="mt-0.5 text-[9px] font-black uppercase tracking-[0.08em]">Copilot</span>
          </button>

          <Link
            to="/scam-alerts"
            className={`flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-2xl border px-1 py-2 text-[10px] font-semibold transition-all duration-200 active:scale-[0.98] ${location.pathname === '/scam-alerts' ? 'border-cyan-400/35 bg-cyan-500/15 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.2)]' : 'border-transparent text-gray-400 hover:text-white'}`}
          >
            <AlertTriangle className="h-4 w-4" />
            Alerts
          </Link>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className={`flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-2xl border px-1 py-2 text-[10px] font-semibold transition-all duration-200 active:scale-[0.98] ${mobileMenuOpen ? 'border-cyan-400/35 bg-cyan-500/15 text-cyan-100' : 'border-transparent text-gray-400 hover:text-white'}`}
          >
            <UserCircle2 className="h-4 w-4" />
            More
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[79] lg:hidden">
          <button
            type="button"
            aria-label="Close app menu overlay"
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          <aside className="absolute inset-x-3 top-16 bottom-16 overflow-hidden rounded-[30px] border border-cyan-400/14 bg-[linear-gradient(160deg,rgba(5,12,28,0.99),rgba(7,18,38,0.98))] shadow-[0_24px_70px_rgba(0,0,0,0.52),0_0_30px_rgba(34,211,238,0.12)] animate-slide-up">
            <div className="flex items-center justify-between border-b border-cyan-400/12 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_28%),linear-gradient(135deg,rgba(14,165,233,0.12),rgba(15,23,42,0.95))] px-5 py-5">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">AirdropGuard AI</div>
                <div className="mt-1 text-sm font-black text-white">Mission Menu</div>
                <div className="mt-1 text-xs text-gray-400">Command surfaces, tools and account controls.</div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-gray-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-full overflow-y-auto overscroll-contain px-3 py-3 pb-[calc(7rem+env(safe-area-inset-bottom))]" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div className="space-y-4">
                {appMobileMenuSections.map((section) => {
                  const open = mobileMenuGroups[section.key];
                  return (
                    <div key={section.key} className="rounded-[26px] border border-white/10 bg-white/[0.03] p-2">
                      <button
                        type="button"
                        onClick={() => toggleMobileGroup(section.key)}
                        className="flex min-h-[56px] w-full items-center justify-between rounded-2xl px-3 py-3 text-left"
                      >
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">{section.title}</p>
                          <p className="mt-1 text-xs text-gray-400">{section.items.length} item{section.items.length === 1 ? '' : 's'}</p>
                        </div>
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-gray-200">
                          <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
                        </span>
                      </button>

                      {open && (
                        <div className="grid gap-1 px-1 pb-1">
                          {section.items.map((item) => {
                            const Icon = item.icon;
                            if (item.to === '__copilot__') {
                              return (
                                <button
                                  key={item.label}
                                  type="button"
                                  onClick={() => {
                                    setMobileMenuOpen(false);
                                    openCopilot(effectiveCopilotContext);
                                  }}
                                  className="group flex min-h-[58px] w-full items-center justify-between rounded-2xl border border-transparent bg-white/[0.02] px-4 py-3 text-left text-sm font-semibold text-gray-100 transition-all hover:border-cyan-400/20 hover:bg-white/[0.08] active:scale-[0.99]"
                                >
                                  <span className="flex items-center gap-3">
                                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200 shadow-[0_8px_20px_rgba(0,0,0,0.18)]">
                                      <Icon className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5" />
                                    </span>
                                    {item.label}
                                  </span>
                                  <ChevronRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-cyan-200" />
                                </button>
                              );
                            }

                            return (
                              <Link
                                key={item.label}
                                to={item.to}
                                onClick={() => setMobileMenuOpen(false)}
                                className="group flex min-h-[58px] items-center justify-between rounded-2xl border border-transparent bg-white/[0.02] px-4 py-3 text-sm font-semibold text-gray-100 transition-all hover:border-cyan-400/20 hover:bg-white/[0.08] active:scale-[0.99]"
                              >
                                <span className="flex items-center gap-3">
                                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-gray-300 shadow-[0_8px_20px_rgba(0,0,0,0.18)] transition-transform duration-200 group-hover:scale-[1.03] group-hover:text-cyan-200">
                                    <Icon className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5" />
                                  </span>
                                  {item.label}
                                </span>
                                <ChevronRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-cyan-200" />
                              </Link>
                            );
                          })}

                          {section.key === 'account' && (
                            <button
                              type="button"
                              onClick={() => {
                                setMobileMenuOpen(false);
                                void onSignOut();
                              }}
                              className="group flex min-h-[58px] w-full items-center justify-between rounded-2xl border border-transparent bg-white/[0.02] px-4 py-3 text-left text-sm font-semibold text-rose-300 transition-all hover:border-rose-500/20 hover:bg-rose-500/10 hover:text-white active:scale-[0.99]"
                            >
                              <span className="flex items-center gap-3">
                                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-500/15 bg-rose-500/[0.08] text-rose-300">
                                  <LogOut className="h-4 w-4" />
                                </span>
                                Sign Out
                              </span>
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      )}

      <button
        type="button"
        onClick={handleDesktopAiClick}
        onPointerDown={handleDesktopAiPointerDown}
        onPointerMove={handleDesktopAiPointerMove}
        onPointerUp={handleDesktopAiPointerEnd}
        onPointerCancel={handleDesktopAiPointerEnd}
        style={desktopAiPosition ? { left: desktopAiPosition.x, top: desktopAiPosition.y, right: 'auto', bottom: 'auto' } : undefined}
        className="group fixed bottom-8 right-8 z-[75] hidden h-[74px] w-[74px] items-center justify-center rounded-full border border-cyan-200/55 bg-[radial-gradient(circle_at_32%_26%,#67e8f9,rgba(34,211,238,0.5)_34%,rgba(37,99,235,0.82)_70%,rgba(15,23,42,0.98)_100%)] text-white shadow-[0_0_0_8px_rgba(34,211,238,0.16),0_20px_42px_rgba(8,145,178,0.45),inset_0_1px_8px_rgba(255,255,255,0.2)] transition-transform duration-300 hover:-translate-y-1 hover:scale-[1.04] lg:inline-flex cursor-grab active:cursor-grabbing select-none"
        aria-label="Open AirdropGuard Copilot"
      >
        <span className="pointer-events-none absolute inset-0 rounded-full bg-cyan-300/25 blur-md transition-opacity duration-300 group-hover:opacity-90" />
        <span className="pointer-events-none absolute -inset-1 rounded-full border border-cyan-200/45 opacity-75 animate-[pulse_3s_ease-in-out_infinite]" />
        <span className="pointer-events-none absolute -inset-3 rounded-full border border-cyan-200/25 opacity-45 animate-[pulse_4s_ease-in-out_infinite]" />
        <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-cyan-200/35 bg-[#070d1c]/88 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100 backdrop-blur-md">
          AI Copilot
        </span>
        <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/35 bg-white/[0.08]">
          <AiOrb className="h-6 w-6" />
        </span>
      </button>

      <div
        className={`fixed inset-0 z-[80] ${
          aiDrawerOpen ? 'pointer-events-auto' : 'pointer-events-none hidden lg:block'
        }`}
        aria-hidden={aiDrawerOpen ? undefined : true}
      >
        <div
          className={`absolute inset-0 bg-black/58 backdrop-blur-[3px] transition-opacity duration-300 ${aiDrawerOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setAiDrawerOpen(false)}
        />
        <aside
          style={{ transformOrigin: 'bottom right' }}
          className={`absolute inset-0 h-[100dvh] w-full max-w-full overflow-hidden rounded-none border border-cyan-400/12 bg-[#060a18]/96 p-0 shadow-[0_0_70px_rgba(56,189,248,0.2)] transition-all duration-300 ease-out lg:inset-auto lg:bottom-6 lg:right-6 lg:top-auto lg:h-[min(84vh,780px)] lg:w-[min(620px,calc(100vw-2.5rem))] lg:max-w-[620px] lg:rounded-[38px] lg:border lg:bg-[#070d1c]/88 lg:backdrop-blur-2xl ${aiDrawerOpen ? 'translate-y-0 opacity-100 scale-100 lg:translate-x-0' : 'translate-y-full opacity-0 scale-95 lg:translate-y-4 lg:translate-x-2'}`}
        >
          {aiDrawerOpen && (
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center text-sm text-gray-300">
                  Loading AI Copilot...
                </div>
              }
            >
              <AirdropCopilot
                onClose={() => setAiDrawerOpen(false)}
                className="h-full"
                pageContext={effectiveCopilotContext}
                summary={{ userName: userLabel }}
                queuedPrompt={queuedPrompt}
              />
            </Suspense>
          )}
        </aside>
      </div>
    </div>
  );
}