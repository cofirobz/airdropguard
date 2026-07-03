import { useEffect, useState } from 'react';
import type React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AlertTriangle,
  Bot,
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
import AirdropCopilot from './AirdropCopilot';

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
        <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
        <div className="mt-4 h-7 w-56 animate-pulse rounded bg-white/10" />
        <div className="mt-3 h-3 w-72 max-w-full animate-pulse rounded bg-white/10" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-48 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <div className="h-4 w-28 animate-pulse rounded bg-white/10" />
            <div className="mt-4 h-3 w-full animate-pulse rounded bg-white/10" />
            <div className="mt-2 h-3 w-5/6 animate-pulse rounded bg-white/10" />
            <div className="mt-8 h-10 w-32 animate-pulse rounded-2xl bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

function buildSidebarItems(pathname: string, search: string): NavItem[] {
  return [
    {
      to: '/dashboard',
      label: 'Dashboard',
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
      label: 'Home',
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
  const [pageCopilotContext, setPageCopilotContext] = useState<string | null>(null);
  const sidebarItems = buildSidebarItems(location.pathname, location.search);
  const mobileItems = buildMobileItems(location.pathname);
  const effectiveCopilotContext = pageCopilotContext ?? routeContext.copilotContext;
  const contentClasses = contentClassName ?? 'space-y-6';

  useEffect(() => {
    setPageCopilotContext(null);
    setMobileMenuOpen(false);
  }, [location.pathname, location.search]);

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
    const handleContext = (event: Event) => {
      const detail = (event as CustomEvent<{ context?: string | null }>).detail;
      setPageCopilotContext(detail?.context ?? null);
    };

    const handleOpen = () => setAiDrawerOpen(true);
    const handleClose = () => setAiDrawerOpen(false);

    window.addEventListener('ag:copilot-context', handleContext as EventListener);
    window.addEventListener('ag:copilot-open', handleOpen);
    window.addEventListener('ag:copilot-close', handleClose);

    return () => {
      window.removeEventListener('ag:copilot-context', handleContext as EventListener);
      window.removeEventListener('ag:copilot-open', handleOpen);
      window.removeEventListener('ag:copilot-close', handleClose);
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#050711] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(56,189,248,0.16),transparent_32%),radial-gradient(circle_at_88%_12%,rgba(139,92,246,0.18),transparent_30%),radial-gradient(circle_at_55%_110%,rgba(30,64,175,0.16),transparent_40%)]" />

      <aside className="fixed left-0 top-0 hidden h-screen w-[260px] flex-col border-r border-white/10 bg-[#070b18]/95 px-3 py-4 shadow-[0_0_60px_rgba(31,41,55,0.35)] backdrop-blur-xl lg:flex">
        <Link to="/dashboard" className="mb-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <div className="text-base font-black gradient-text">AirdropGuard</div>
          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Premium AI Workspace</div>
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
            onClick={() => setAiDrawerOpen(true)}
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
          <p className="text-xs font-bold text-white">Premium Workspace</p>
          <p className="mt-1 text-[11px] text-gray-300">One persistent shell for AirdropGuard intelligence, wallet safety and API workflows.</p>
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

      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[#070b18]/95 backdrop-blur-xl lg:left-[260px]">
        <div className="flex h-16 items-center justify-between gap-4 px-4 sm:h-20 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <div className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-300 sm:block">AirdropGuard App</div>
            <h1 className="truncate text-base font-black text-white sm:mt-1 sm:text-2xl">{routeContext.title}</h1>
            <p className="hidden text-xs text-gray-400 sm:block">{routeContext.subtitle}</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-gray-300 sm:inline-flex">
              <UserCircle2 className="h-4 w-4 text-sky-300" />
              <span className="max-w-[160px] truncate">{userLabel}</span>
            </div>
            <button
              type="button"
              onClick={() => void onSignOut()}
              className="inline-flex min-h-[42px] min-w-[42px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 text-xs font-semibold text-gray-300 transition-colors hover:border-white/25 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main id="main-content" className="relative pb-28 pt-20 lg:ml-[260px] lg:pb-10 lg:pt-24" tabIndex={-1}>
        <div key={`${location.pathname}${location.search}`} className={`animate-in px-4 pb-6 pt-4 duration-300 sm:px-6 lg:px-8 ${contentClasses}`}>
          {children}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-[#070b18]/95 px-3 py-2 backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {mobileItems.slice(0, 2).map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                to={item.to}
                className={`flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-semibold ${item.active ? 'text-sky-300' : 'text-gray-500'}`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setAiDrawerOpen(true)}
            className="-mt-8 inline-flex h-[76px] w-[76px] flex-col items-center justify-center self-center rounded-full border border-cyan-300/70 bg-[radial-gradient(circle_at_30%_30%,#67e8f9,transparent_42%),linear-gradient(145deg,#0ea5e9,#2563eb_55%,#7c3aed)] text-white shadow-[0_0_0_8px_rgba(34,211,238,0.14),0_18px_36px_rgba(14,165,233,0.34)] transition-all duration-200 hover:scale-105"
            aria-label="Open AI Copilot"
          >
            <Bot className="h-5 w-5" />
            <span className="mt-0.5 text-[10px] font-black uppercase tracking-[0.1em]">AI</span>
          </button>

          <Link
            to="/scam-alerts"
            className={`flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-semibold ${location.pathname === '/scam-alerts' ? 'text-sky-300' : 'text-gray-500'}`}
          >
            <AlertTriangle className="h-4 w-4" />
            Alerts
          </Link>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-semibold text-gray-500"
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

          <aside className="absolute inset-x-3 top-16 bottom-16 overflow-hidden rounded-[28px] border border-white/10 bg-[#070b18]/98 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
            <div className="flex items-center justify-between border-b border-white/10 bg-[linear-gradient(135deg,rgba(14,165,233,0.12),rgba(15,23,42,0.95))] px-4 py-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">AirdropGuard App</div>
                <div className="mt-1 text-sm font-black text-white">More</div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-gray-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-full overflow-y-auto px-3 py-3 pb-28">
              <div className="space-y-4">
                <div>
                  <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Primary</p>
                  <div className="grid gap-1">
                    {[
                      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
                      { to: '/', label: 'Browse Airdrops', icon: Home },
                      { to: '/?filter=trending', label: 'Trending', icon: Flame },
                      { to: '/wallet-checker', label: 'Wallet Check', icon: Wallet },
                      { to: '/scam-alerts', label: 'Alerts', icon: AlertTriangle },
                    ].map(item => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.label}
                          to={item.to}
                          className="group flex min-h-[48px] items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold text-gray-100 transition-colors hover:bg-white/10"
                        >
                          <span className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-gray-300">
                              <Icon className="h-4 w-4" />
                            </span>
                            {item.label}
                          </span>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </Link>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Dashboard Views</p>
                  <div className="grid gap-1">
                    {[
                      { to: '/dashboard?view=overview', label: 'Watchlist', icon: Star },
                      { to: '/dashboard?view=tasks', label: 'Task Tracking', icon: ListChecks },
                      { to: '/dashboard?view=profile', label: 'Profile', icon: UserCircle2 },
                      { to: '/dashboard?view=api', label: 'API Access', icon: Key },
                      { to: '/dashboard?view=profile', label: 'Settings', icon: Shield },
                    ].map(item => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.label}
                          to={item.to}
                          className="group flex min-h-[48px] items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold text-gray-100 transition-colors hover:bg-white/10"
                        >
                          <span className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-gray-300">
                              <Icon className="h-4 w-4" />
                            </span>
                            {item.label}
                          </span>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </Link>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setAiDrawerOpen(true);
                      }}
                      className="group flex min-h-[48px] items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold text-gray-100 transition-colors hover:bg-white/10"
                    >
                      <span className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                          <Sparkles className="h-4 w-4" />
                        </span>
                        AI Analyzer
                      </span>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2">
                  <button
                    type="button"
                    onClick={() => void onSignOut()}
                    className="flex min-h-[48px] w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-500/10 hover:text-white"
                  >
                    <span className="flex items-center gap-3">
                      <LogOut className="h-4 w-4" />
                      Logout
                    </span>
                    <ChevronRight className="h-4 w-4 text-rose-300" />
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      <button
        type="button"
        onClick={() => setAiDrawerOpen(true)}
        className="fixed bottom-8 right-8 z-[75] hidden min-h-[56px] items-center gap-2 rounded-full border border-sky-300/50 bg-gradient-to-r from-sky-500 via-cyan-500 to-violet-500 px-5 py-3 text-sm font-black text-white shadow-[0_0_0_6px_rgba(56,189,248,0.14),0_18px_40px_rgba(56,189,248,0.3)] transition-transform hover:-translate-y-0.5 hover:scale-[1.02] lg:inline-flex"
        aria-label="Open AirdropGuard Copilot"
      >
        <Bot className="h-4 w-4" />
        Ask AI
      </button>

      <div
        className={`fixed inset-0 z-[80] ${
          aiDrawerOpen ? 'pointer-events-auto' : 'pointer-events-none hidden lg:block'
        }`}
        aria-hidden={aiDrawerOpen ? undefined : true}
      >
        <div
          className={`absolute inset-0 bg-black/70 backdrop-blur-[2px] transition-opacity duration-300 ${aiDrawerOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setAiDrawerOpen(false)}
        />
        <aside className={`absolute inset-0 h-[100dvh] w-full max-w-full overflow-hidden rounded-none border border-cyan-400/10 bg-[#060a18]/98 p-0 shadow-[0_0_70px_rgba(56,189,248,0.2)] transition-transform duration-300 lg:inset-auto lg:bottom-3 lg:right-0 lg:top-3 lg:h-auto lg:w-[min(420px,100vw)] lg:max-w-[420px] lg:rounded-l-[32px] lg:rounded-tr-none lg:rounded-br-none lg:border-l lg:border-t lg:border-b lg:border-r-0 ${aiDrawerOpen ? 'translate-y-0 lg:translate-x-0' : 'translate-y-full lg:translate-y-0 lg:translate-x-full'}`}>
          <AirdropCopilot
            onClose={() => setAiDrawerOpen(false)}
            className="h-full"
            pageContext={effectiveCopilotContext}
            summary={{ userName: userLabel }}
          />
        </aside>
      </div>
    </div>
  );
}