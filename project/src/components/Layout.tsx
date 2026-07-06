import { lazy, Suspense, useState, useEffect, useRef } from "react";
import type React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  Bot,
  Shield,
  BadgeDollarSign,
  Key,
  BookOpen,
  Code2,
  Send,
  Flame,
  Home,
  Newspaper,
  FileText,
  LayoutDashboard,
  LogIn,
  Wallet,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  Sparkles,
  Star,
  UserCircle2,
} from "lucide-react";
import SocialLinksStrip from "./SocialLinksStrip";
import { useAuth } from "../contexts/AuthContext";

const AppShell = lazy(() => import("./AppShell"));

function isAuthenticatedAppPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/airdrop/") ||
    pathname.startsWith("/dashboard") ||
    pathname === "/wallet-checker" ||
    pathname === "/scam-alerts" ||
    pathname === "/pricing" ||
    pathname === "/api-pricing" ||
    pathname === "/api-docs"
  );
}

const PUBLIC_MENU_GROUPS_STORAGE_KEY = "ag_public_mobile_menu_groups_v1";

declare function gtag(...args: unknown[]): void;

function usePageTracking() {
  const location = useLocation();

  useEffect(() => {
    if (typeof gtag === "undefined") return;

    gtag("event", "page_view", {
      page_path: location.pathname + location.search,
      page_title: document.title,
    });
  }, [location.pathname, location.search]);
}

function isActivePath(currentPath: string, currentSearch: string, to: string) {
  if (to === "/") return currentPath === "/" && !currentSearch;
  if (to.startsWith("/?"))
    return currentPath === "/" && currentSearch === to.replace("/", "");
  return currentPath.startsWith(to.split("?")[0]);
}

function buildCopilotRouteContext(pathname: string, search: string) {
  const searchParams = new URLSearchParams(search);

  if (pathname === "/") {
    const tab = searchParams.get("filter") ?? "all";
    return `Airdrop listings page. Active collection: ${tab}. Search filters may be active.`;
  }

  if (pathname.startsWith("/airdrop/")) {
    return "Airdrop detail page. Use the current project details, trust signals and task checklist when answering.";
  }

  if (pathname === "/wallet-checker") {
    return "Wallet Intelligence page. Help interpret wallet safety, readiness and next-step guidance.";
  }

  if (pathname.startsWith("/dashboard")) {
    return "Dashboard page. Prioritize today’s focus, tasks, watchlist changes and account activity.";
  }

  if (pathname === "/api-docs" || pathname === "/pricing" || pathname === "/api-pricing") {
    return "API access page. Help with plans, API access and integration questions.";
  }

  return null;
}

function buildRouteHeaderContent(pathname: string, search: string) {
  if (pathname.startsWith('/dashboard')) {
    return {
      eyebrow: 'AirdropGuard AI',
      title: 'Mission Control',
      subtitle: 'Live mission execution, trust signals and AI guidance.',
    };
  }

  if (pathname === '/' && search === '?filter=trending') {
    return {
      eyebrow: 'Discover',
      title: 'Trending Opportunities',
      subtitle: 'Momentum, trust and timing in one view.',
    };
  }

  if (pathname === '/') {
    return {
      eyebrow: 'Discover',
      title: 'Discover the Safest Opportunities',
      subtitle: 'AI-ranked airdrops with trust-first signals.',
    };
  }

  if (pathname.startsWith('/airdrop/')) {
    return {
      eyebrow: 'Intelligence',
      title: 'Airdrop Intelligence Report',
      subtitle: 'Review trust, effort and action steps quickly.',
    };
  }

  if (pathname === '/wallet-checker') {
    return {
      eyebrow: 'Tools',
      title: 'Wallet Health Report',
      subtitle: 'Read-only safety checks before you connect.',
    };
  }

  if (pathname === '/learn' || pathname === '/articles' || pathname.startsWith('/articles/')) {
    return {
      eyebrow: 'Learn',
      title: 'Grow Your Web3 Knowledge',
      subtitle: 'Research, tactics and safer decision frameworks.',
    };
  }

  if (pathname === '/scam-alerts') {
    return {
      eyebrow: 'Alerts',
      title: 'Opportunity Alerts',
      subtitle: 'Spot threats and protect your next move.',
    };
  }

  if (pathname === '/api-docs' || pathname === '/pricing' || pathname === '/api-pricing') {
    return {
      eyebrow: 'Developer',
      title: 'Developer Mission Control',
      subtitle: 'API access, docs and integration guidance.',
    };
  }

  return {
    eyebrow: 'AirdropGuard',
    title: 'AI Operating System',
    subtitle: 'Safer Web3 decisions with AI and human review.',
  };
}

const primaryNavItems = [
  { to: "/", label: "Airdrops", icon: Home },
  { to: "/wallet-checker", label: "Wallet Intelligence", icon: Wallet },
  { to: "/dashboard", label: "Copilot", icon: Bot },
  { to: "/pricing", label: "Pricing", icon: Key },
];

const researchNavItems = [
  { to: "/articles", label: "Articles", icon: Newspaper },
  { to: "/whitepaper", label: "Whitepaper", icon: FileText },
  { to: "/scam-alerts", label: "Scam Alerts", icon: Shield },
];

const projectNavItems = [
  {
    to: "/submit",
    label: "Submit Airdrop",
    icon: Send,
    tone: "text-sky-300 bg-sky-500/10 border-sky-500/20",
  },
  {
    to: "/advertise",
    label: "Advertise",
    icon: BadgeDollarSign,
    tone: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    to: "/api-docs",
    label: "API Docs",
    icon: Code2,
    tone: "text-blue-300 bg-blue-500/10 border-blue-500/20",
  },
  {
    to: "/pricing",
    label: "API Access",
    icon: Key,
    tone: "text-neon-purple bg-neon-purple/10 border-neon-purple/20",
  },
];

const footerColumns = [
  {
    title: "Airdrops",
    links: [
      { to: "/", label: "Browse Airdrops" },
      { to: "/?filter=trending", label: "Trending Airdrops" },
      { to: "/?filter=ending", label: "Ending Soon" },
      { to: "/scam-alerts", label: "Scam Alerts" },
    ],
  },
  {
    title: "Research",
    links: [
      { to: "/learn", label: "Learn" },
      { to: "/articles", label: "Articles" },
      { to: "/whitepaper", label: "Whitepaper" },
      { to: "/wallet-checker", label: "Wallet Checker" },
    ],
  },
  {
    title: "For Projects",
    links: [
      { to: "/submit", label: "Submit Airdrop" },
      { to: "/advertise", label: "Advertise" },
      { to: "/api-docs", label: "API Docs" },
      { to: "/pricing", label: "API Access" },
    ],
  },
  {
    title: "Legal",
    links: [
      { to: "/terms", label: "Terms" },
      { to: "/risk-disclosure", label: "Risk Disclosure" },
      { to: "/sitemap.xml", label: "Sitemap", external: true },
    ],
  },
];

function Footer() {
  return (
    <footer className="relative border-t border-white/10 bg-dark-950/95">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neon-purple/40 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_1.85fr]">
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-3"
              aria-label="AirdropGuard home"
            >
              <img
                src="/favicon.svg"
                alt="AirdropGuard"
                width={44}
                height={44}
                loading="lazy"
                decoding="async"
                className="h-11 w-11 rounded-2xl object-cover shadow-sm shadow-neon-purple/15"
              />

              <div>
                <div className="text-lg font-black gradient-text">
                  AirdropGuard
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Check Before You Connect
                </div>
              </div>
            </Link>

            <p className="mt-4 max-w-md text-sm leading-relaxed text-gray-300">
              Discover verified crypto airdrops with AI-assisted intelligence,
              human review, trust signals, scam alerts and read-only wallet
              safety tools.
            </p>

            <div className="mt-5 grid max-w-md grid-cols-1 gap-2 sm:grid-cols-2">
              {[
                "AI scored",
                "Human reviewed",
                "No seed phrases",
                "Risk-first research",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2"
                >
                  <Shield className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  <span className="text-xs text-gray-400">{item}</span>
                </div>
              ))}
            </div>

            <SocialLinksStrip variant="tags" className="mt-5" />
          </div>

          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {footerColumns.map((column) => (
              <div key={column.title}>
                <h2 className="mb-3 text-xs font-black uppercase tracking-wider text-gray-300">
                  {column.title}
                </h2>

                <div className="space-y-2">
                  {column.links.map((link) =>
                    link.external ? (
                      <a
                        key={link.label}
                        href={link.to}
                        className="block min-h-[32px] text-sm text-gray-300 transition-colors hover:text-white"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        key={link.label}
                        to={link.to}
                        className="block min-h-[32px] text-sm text-gray-300 transition-colors hover:text-white"
                      >
                        {link.label}
                      </Link>
                    ),
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-amber-500/15 bg-amber-500/[0.04] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
            <p className="text-xs leading-relaxed text-gray-300">
              Cryptoassets are high risk. AirdropGuard provides educational
              research, AI-assisted signals and human-reviewed information only.
              This is not financial, legal or investment advice. Always verify
              official links and never share your seed phrase or private keys.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-white/5 pt-6 text-xs text-gray-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} AirdropGuard. All rights reserved.</p>
          <p className="font-semibold text-gray-300">
            Verified airdrop research. Safer Web3 decisions.
          </p>
        </div>
      </div>
    </footer>
  );
}

function NavLink({
  to,
  label,
  icon: Icon,
  active,
}: {
  to: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={`relative flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-purple focus-visible:ring-offset-2 focus-visible:ring-offset-dark-950 ${
        active
          ? "bg-white/10 text-white shadow-sm shadow-black/20"
          : "text-gray-400 hover:bg-white/[0.06] hover:text-white"
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      {active && (
        <span className="absolute inset-x-4 -bottom-px h-0.5 rounded-full bg-neon-purple" />
      )}
    </Link>
  );
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [navHidden, setNavHidden] = useState(false);
  const [mobileMenuGroups, setMobileMenuGroups] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') {
      return { discover: true, tools: false, account: true };
    }

    try {
      const raw = window.localStorage.getItem(PUBLIC_MENU_GROUPS_STORAGE_KEY);
      if (!raw) return { discover: true, tools: false, account: true };
      return { discover: true, tools: false, account: true, ...(JSON.parse(raw) as Record<string, boolean>) };
    } catch {
      return { discover: true, tools: false, account: true };
    }
  });
  const lastScrollYRef = useRef(0);
  const scrollTickingRef = useRef(false);
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  const { user, signOut } = useAuth();
  const isAppRoute = Boolean(user) && !isAdmin && isAuthenticatedAppPath(location.pathname);
  const routeCopilotContext = buildCopilotRouteContext(location.pathname, location.search);
  const routeHeader = buildRouteHeaderContent(location.pathname, location.search);
  const routeTitle = routeHeader.title;
  const routeSubtitle = routeHeader.subtitle;

  usePageTracking();

  useEffect(() => {
    setMobileOpen(false);
    setMoreOpen(false);
    setNavHidden(false);
    lastScrollYRef.current = 0;
  }, [location.pathname, location.search]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (mobileOpen) {
      setNavHidden(false);
      return;
    }

    const handleScroll = () => {
      if (scrollTickingRef.current) return;
      scrollTickingRef.current = true;

      window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const delta = currentScrollY - lastScrollYRef.current;
        let nextHidden = false;

        if (currentScrollY <= 24) {
          nextHidden = false;
        } else if (delta > 8 && currentScrollY > 96) {
          nextHidden = true;
        } else if (delta < -8) {
          nextHidden = false;
        }

        setNavHidden((prev) => (prev === nextHidden ? prev : nextHidden));
        lastScrollYRef.current = currentScrollY;
        scrollTickingRef.current = false;
      });
    };

    lastScrollYRef.current = window.scrollY;
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [mobileOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(PUBLIC_MENU_GROUPS_STORAGE_KEY, JSON.stringify(mobileMenuGroups));
  }, [mobileMenuGroups]);

  const toggleMobileGroup = (group: string) => {
    setMobileMenuGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const publicMenuSections = [
    {
      key: 'discover',
      title: 'Discover',
      items: [
        { to: '/', label: 'Browse Airdrops', icon: Home },
        { to: '/?filter=trending', label: 'Trending', icon: Flame },
        { to: '/learn', label: 'Learn', icon: BookOpen },
      ],
    },
    {
      key: 'tools',
      title: 'Tools',
      items: [
        { to: '/wallet-checker', label: 'Wallet Intelligence', icon: Wallet },
        { to: user ? '/dashboard' : '/auth', label: 'AI Copilot', icon: Bot },
        { to: '/scam-alerts', label: 'Alerts', icon: AlertTriangle },
        { to: '/pricing', label: 'API', icon: Key },
      ],
    },
    {
      key: 'account',
      title: 'Account',
      items: user
        ? [
            { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { to: '/dashboard?view=overview', label: 'Watchlist', icon: Star },
            { to: '/dashboard?view=profile', label: 'Profile', icon: UserCircle2 },
            { to: '/dashboard?view=profile', label: 'Settings', icon: Shield },
          ]
        : [
            { to: '/auth', label: 'Sign In', icon: LogIn },
          ],
    },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-dark-950 text-white">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] rounded-xl bg-neon-purple px-4 py-2 text-sm font-bold text-white shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-purple focus-visible:ring-offset-2 focus-visible:ring-offset-dark-950"
      >
        Skip to main content
      </a>

      {isAppRoute ? (
        <Suspense
          fallback={
            <div className="flex min-h-[55vh] items-center justify-center text-sm text-gray-400">
              Loading app shell...
            </div>
          }
        >
          <AppShell
            userLabel={user?.email ?? 'Explorer'}
            onSignOut={signOut}
            routeContext={{
              title: routeTitle,
              subtitle: routeSubtitle,
              copilotContext: routeCopilotContext ?? 'Authenticated app page. Use the current route context when answering.',
            }}
            contentClassName={location.pathname.startsWith('/dashboard') ? 'mx-auto max-w-[1180px] space-y-6' : 'space-y-6'}
          >
            <Outlet />
          </AppShell>
        </Suspense>
      ) : (
        <>
      <nav className={`fixed inset-x-0 top-0 z-50 bg-dark-950/98 shadow-[0_14px_40px_rgba(2,6,23,0.18)] supports-[backdrop-filter]:bg-dark-950/95 transition-transform duration-300 ease-out ${navHidden ? '-translate-y-full' : 'translate-y-0'}`}>
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="grid h-20 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 lg:grid-cols-[auto_minmax(0,1fr)_auto] xl:h-24">
            <Link
              to="/"
              className="group flex min-w-0 items-center gap-2.5"
              aria-label="AirdropGuard home"
            >
              <img
                src="/favicon.svg"
                alt="AirdropGuard"
                width={44}
                height={44}
                loading="eager"
                decoding="async"
                className="h-11 w-11 shrink-0 rounded-2xl object-cover shadow-sm shadow-neon-purple/20 transition-transform transition-shadow duration-300 group-hover:scale-[1.03] group-hover:shadow-neon-purple/45"
              />

              <div className="min-w-0 leading-tight">
                <span className="block truncate text-lg font-black gradient-text xl:text-xl">
                  AirdropGuard
                </span>
                <span className="hidden text-[10px] font-medium uppercase tracking-wider text-gray-400 sm:block">
                  Check Before You Connect
                </span>
              </div>
            </Link>

            <div className="hidden min-w-0 lg:flex lg:items-center lg:justify-center xl:px-4">
              <div className="ag-primary-nav-cluster flex items-center gap-1 rounded-3xl border border-white/10 bg-white/[0.035] p-1 shadow-sm shadow-black/10">
                {primaryNavItems.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={label}
                    to={to}
                    label={label}
                    icon={Icon}
                    active={isActivePath(
                      location.pathname,
                      location.search,
                      to,
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="hidden items-center gap-2 lg:flex">
              <Link
                to="/submit"
                className="hidden min-h-[46px] items-center gap-2 rounded-2xl border border-sky-500/25 bg-sky-500/10 px-4 py-2 text-sm font-black text-sky-300 transition-colors hover:bg-sky-500/20 hover:text-white xl:flex"
              >
                <Send className="h-3.5 w-3.5" />
                Submit
              </Link>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMoreOpen((open) => !open)}
                  className="flex min-h-[46px] items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-gray-300 transition-colors hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-purple focus-visible:ring-offset-2 focus-visible:ring-offset-dark-950"
                  aria-expanded={moreOpen}
                  aria-haspopup="menu"
                  aria-label="Open additional navigation"
                >
                  More
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${moreOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {moreOpen && (
                  <div className="absolute right-0 top-full mt-3 w-[340px] overflow-hidden rounded-3xl border border-white/10 bg-dark-950 shadow-xl shadow-black/60">
                    <div className="border-b border-white/10 bg-white/[0.03] px-4 py-3">
                      <p className="text-xs font-black uppercase tracking-wider text-neon-purple">
                        AirdropGuard Menu
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        Research, API tools and project options.
                      </p>
                    </div>

                    <div className="grid gap-4 p-3">
                      <div>
                        <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          Research
                        </p>
                        <div className="grid gap-1">
                          {researchNavItems.map(({ to, label, icon: Icon }) => (
                            <Link
                              key={label}
                              to={to}
                              className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-gray-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-purple focus-visible:ring-offset-2 focus-visible:ring-offset-dark-950"
                            >
                              <Icon className="h-4 w-4 text-gray-300" />
                              {label}
                            </Link>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          Projects & Developers
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {projectNavItems.map(
                            ({ to, label, icon: Icon, tone }) => (
                              <Link
                                key={label}
                                to={to}
                                className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition-colors hover:bg-white/10 ${tone}`}
                              >
                                <Icon className="mb-2 h-4 w-4" />
                                {label}
                              </Link>
                            ),
                          )}
                        </div>
                      </div>

                      <div className="ag-route-context hidden xl:block pb-4">
                        <div className="mx-auto max-w-[420px] rounded-2xl border border-cyan-400/12 bg-cyan-500/[0.05] px-5 py-3 text-center shadow-[0_0_24px_rgba(34,211,238,0.06)]">
                          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-300">{routeHeader.eyebrow}</p>
                          <p className="mt-1 truncate text-sm font-semibold text-white">{routeHeader.title}</p>
                          <p className="mt-1 truncate text-[11px] text-gray-400">{routeHeader.subtitle}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {user ? (
                <Link
                  to="/dashboard"
                  className="flex min-h-[46px] items-center gap-1.5 rounded-2xl border border-neon-purple/30 bg-gradient-to-r from-neon-purple to-neon-blue px-4 py-2 text-sm font-black text-white shadow-sm shadow-neon-purple/20 transition-colors hover:opacity-95"
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Mission Control
                </Link>
              ) : (
                <Link
                  to="/auth"
                  className="flex min-h-[46px] items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Sign In
                </Link>
              )}

              <Link
                to="/admin"
                className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-purple focus-visible:ring-offset-2 focus-visible:ring-offset-dark-950 ${
                  isAdmin
                    ? "bg-neon-purple/10 text-neon-purple"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
                title="Admin"
                aria-label="Admin"
              >
                <Shield className="h-4 w-4" />
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 text-gray-100 shadow-sm shadow-black/20 transition-colors hover:bg-white/10 active:bg-white/15 lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-purple focus-visible:ring-offset-2 focus-visible:ring-offset-dark-950"
              aria-label={mobileOpen ? "Close menu" : "Open full site menu"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
            >
              <span className="sr-only">
                {mobileOpen ? "Close menu" : "Open menu"}
              </span>
              {mobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
              <span className="text-xs font-black uppercase tracking-wide">
                {mobileOpen ? "Close" : "Menu"}
              </span>
            </button>
          </div>
        </div>

        {mobileOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 top-20 z-40 bg-black/80 lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-purple focus-visible:ring-offset-2 focus-visible:ring-offset-dark-950"
              aria-label="Close menu overlay"
              onClick={() => setMobileOpen(false)}
            />

            <div
              id="mobile-menu"
              className="fixed left-3 right-3 top-24 z-50 overflow-hidden rounded-[32px] border border-cyan-400/18 bg-[linear-gradient(160deg,rgba(6,14,30,0.98),rgba(8,20,42,0.96))] shadow-[0_24px_70px_rgba(0,0,0,0.72),0_0_34px_rgba(34,211,238,0.12)] lg:hidden animate-slide-up"
            >
              <div className="border-b border-cyan-400/12 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.14),transparent_28%),linear-gradient(135deg,rgba(14,165,233,0.12),rgba(15,23,42,0.96))] px-5 py-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
                      {routeHeader.eyebrow}
                    </p>
                    <p className="mt-1 text-base font-black text-white">
                      {routeHeader.title}
                    </p>
                    <p className="mt-1 max-w-[240px] text-xs leading-relaxed text-gray-300">
                      {routeHeader.subtitle}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-right shadow-[0_0_18px_rgba(34,211,238,0.12)]">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-200">
                      AI online
                    </p>
                    <p className="text-[10px] text-gray-300">Updated just now</p>
                  </div>
                </div>
              </div>

              <div className="max-h-[calc(100dvh-8rem)] overflow-y-auto overscroll-contain px-3 py-3 pb-[calc(7rem+env(safe-area-inset-bottom))]" style={{ WebkitOverflowScrolling: 'touch' }}>
                <div className="space-y-4">
                  {publicMenuSections.map((section) => {
                    const open = mobileMenuGroups[section.key];
                    return (
                      <div key={section.key} className="rounded-[26px] border border-white/10 bg-white/[0.03] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
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
                            {section.items.map(({ to, label, icon: Icon }) => (
                              <Link
                                key={label}
                                to={to}
                                onClick={() => setMobileOpen(false)}
                                className="group flex min-h-[58px] items-center justify-between rounded-2xl border border-transparent bg-white/[0.02] px-4 py-3 text-sm font-semibold text-gray-100 transition-all hover:border-cyan-400/20 hover:bg-white/[0.08] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-purple focus-visible:ring-offset-2 focus-visible:ring-offset-dark-950"
                              >
                                <span className="flex items-center gap-3">
                                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-gray-300 shadow-[0_8px_20px_rgba(0,0,0,0.18)] transition-transform duration-200 group-hover:scale-[1.03] group-hover:text-cyan-200">
                                    <Icon className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5" />
                                  </span>
                                  {label}
                                </span>
                                <ChevronRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-cyan-200" />
                              </Link>
                            ))}

                            {section.key === 'account' && user && (
                              <button
                                type="button"
                                onClick={() => {
                                  setMobileOpen(false);
                                  signOut();
                                }}
                                className="group flex min-h-[58px] w-full items-center justify-between rounded-2xl border border-transparent bg-white/[0.02] px-4 py-3 text-left text-sm font-semibold text-rose-300 transition-all hover:border-rose-500/20 hover:bg-rose-500/10 hover:text-white active:scale-[0.99]"
                              >
                                <span className="flex items-center gap-3">
                                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-500/15 bg-rose-500/[0.08] text-rose-300">
                                    <LogIn className="h-4 w-4" />
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

                  <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-2">
                    <Link
                      to="/admin"
                      onClick={() => setMobileOpen(false)}
                      className="group flex min-h-[58px] items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <span className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                          <Shield className="h-4 w-4" />
                        </span>
                        Admin
                      </span>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </nav>
      

      <main id="main-content" className="relative pt-20 xl:pt-32" tabIndex={-1}>
        <Outlet />
      </main>

      <Footer />
        </>
      )}
    </div>
  );
}
