import { useState, useEffect } from "react";
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
} from "lucide-react";
import AirdropCopilot from "./AirdropCopilot";
import { useAuth } from "../contexts/AuthContext";

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

const socialLinks = [
  { href: "https://x.com/Dropguardai", label: "X" },
  { href: "https://discord.gg/uDP9xm6Dv", label: "Discord" },
  { href: "https://t.me/+yKvXlsatqKs0M2M0", label: "Telegram" },
  {
    href: "https://www.tiktok.com/@airdropguard1?_r=1&_t=ZN-979TcOID05e",
    label: "TikTok",
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
              <picture>
                <source srcSet="/airdrop_guards.webp" type="image/webp" />
                <img
                  src="/airdrop_guards.png"
                  alt="AirdropGuard"
                  width={44}
                  height={44}
                  loading="lazy"
                  decoding="async"
                  className="h-11 w-11 rounded-2xl object-cover shadow-sm shadow-neon-purple/15"
                />
              </picture>

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

            <div className="mt-5 flex flex-wrap gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Visit AirdropGuard on ${social.label}`}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-gray-400 transition-colors hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
                >
                  {social.label}
                </a>
              ))}
            </div>
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
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [pageCopilotContext, setPageCopilotContext] = useState<string | null>(null);
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  const { user, signOut } = useAuth();
  const isDashboardRoute = Boolean(user) && location.pathname.startsWith("/dashboard");
  const canShowCopilot = Boolean(user) && location.pathname !== "/auth" && !isAdmin;
  const routeCopilotContext = buildCopilotRouteContext(location.pathname, location.search);
  const effectiveCopilotContext = pageCopilotContext ?? routeCopilotContext ?? undefined;
  const mobileLauncherBottom = location.pathname === "/wallet-checker" ? "bottom-24" : "bottom-4";

  usePageTracking();

  useEffect(() => {
    setMobileOpen(false);
    setMoreOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    setPageCopilotContext(null);
  }, [location.pathname, location.search]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    const handleContext = (event: Event) => {
      const detail = (event as CustomEvent<{ context?: string | null }>).detail;
      setPageCopilotContext(detail?.context ?? null);
    };

    const handleOpen = () => setAiDrawerOpen(true);
    const handleClose = () => setAiDrawerOpen(false);

    window.addEventListener("ag:copilot-context", handleContext as EventListener);
    window.addEventListener("ag:copilot-open", handleOpen);
    window.addEventListener("ag:copilot-close", handleClose);

    return () => {
      window.removeEventListener("ag:copilot-context", handleContext as EventListener);
      window.removeEventListener("ag:copilot-open", handleOpen);
      window.removeEventListener("ag:copilot-close", handleClose);
    };
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-dark-950 text-white">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] rounded-xl bg-neon-purple px-4 py-2 text-sm font-bold text-white shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-purple focus-visible:ring-offset-2 focus-visible:ring-offset-dark-950"
      >
        Skip to main content
      </a>

      {!isDashboardRoute && (
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-dark-950/98 supports-[backdrop-filter]:bg-dark-950/95">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between gap-4">
            <Link
              to="/"
              className="group flex min-w-0 items-center gap-2.5"
              aria-label="AirdropGuard home"
            >
              <picture>
                <source srcSet="/airdrop_guards.webp" type="image/webp" />
                <img
                  src="/airdrop_guards.png"
                  alt="AirdropGuard"
                  width={44}
                  height={44}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="h-11 w-11 shrink-0 rounded-2xl object-cover shadow-sm shadow-neon-purple/20 transition-shadow group-hover:shadow-neon-purple/45"
                />
              </picture>

              <div className="min-w-0 leading-tight">
                <span className="block truncate text-lg font-black gradient-text xl:text-xl">
                  AirdropGuard
                </span>
                <span className="hidden text-[10px] font-medium uppercase tracking-wider text-gray-400 sm:block">
                  Check Before You Connect
                </span>
              </div>
            </Link>

            <div className="hidden flex-1 items-center justify-center lg:flex">
              <div className="flex items-center gap-1 rounded-3xl border border-white/10 bg-white/[0.035] p-1 shadow-sm shadow-black/10">
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
                  Dashboard
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
              className="fixed left-3 right-3 top-24 z-50 overflow-hidden rounded-3xl border border-white/10 bg-dark-950 shadow-xl shadow-black/70 lg:hidden animate-slide-up"
            >
              <div className="border-b border-white/10 bg-gradient-to-r from-neon-purple/10 via-white/[0.03] to-sky-500/10 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-neon-purple">
                      Full Site Menu
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-gray-300">
                      Navigate AirdropGuard quickly from one place.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                      Safety first
                    </p>
                    <p className="text-[10px] text-gray-300">No seed phrases</p>
                  </div>
                </div>
              </div>

              <div className="max-h-[calc(100dvh-8rem)] overflow-y-auto px-3 py-3">
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Explore
                    </p>
                    <div className="grid gap-1">
                      {primaryNavItems.map(({ to, label, icon: Icon }) => (
                        <Link
                          key={label}
                          to={to}
                          className="group flex min-h-[48px] items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold text-gray-100 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-purple focus-visible:ring-offset-2 focus-visible:ring-offset-dark-950"
                        >
                          <span className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-gray-300">
                              <Icon className="h-4 w-4" />
                            </span>
                            {label}
                          </span>
                          <ChevronRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-300" />
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Research & Education
                    </p>
                    <div className="grid gap-1">
                      {researchNavItems.map(({ to, label, icon: Icon }) => (
                        <Link
                          key={label}
                          to={to}
                          className="group flex min-h-[48px] items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold text-gray-100 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-purple focus-visible:ring-offset-2 focus-visible:ring-offset-dark-950"
                        >
                          <span className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-gray-300">
                              <Icon className="h-4 w-4" />
                            </span>
                            {label}
                          </span>
                          <ChevronRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-300" />
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Projects & Developers
                    </p>
                    <div className="grid gap-1">
                      {projectNavItems.map(
                        ({ to, label, icon: Icon, tone }) => (
                          <Link
                            key={label}
                            to={to}
                            className={`group flex min-h-[48px] items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-purple focus-visible:ring-offset-2 focus-visible:ring-offset-dark-950 ${tone}`}
                          >
                            <span className="flex items-center gap-3">
                              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                                <Icon className="h-4 w-4" />
                              </span>
                              {label}
                            </span>
                            <ChevronRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-300" />
                          </Link>
                        ),
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2">
                    {user ? (
                      <>
                        <Link
                          to="/dashboard"
                          className="group flex min-h-[48px] items-center justify-between rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue px-4 py-3 text-sm font-black text-white shadow-sm shadow-neon-purple/15 transition-colors hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-purple focus-visible:ring-offset-2 focus-visible:ring-offset-dark-950"
                        >
                          <span className="flex items-center gap-3">
                            <LayoutDashboard className="h-4 w-4" />
                            Dashboard
                          </span>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setMobileOpen(false);
                            signOut();
                          }}
                          className="flex min-h-[48px] w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-gray-300 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-purple focus-visible:ring-offset-2 focus-visible:ring-offset-dark-950"
                        >
                          <LogIn className="h-4 w-4" />
                          Sign Out
                        </button>
                      </>
                    ) : (
                      <Link
                        to="/auth"
                        className="group flex min-h-[48px] items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-purple focus-visible:ring-offset-2 focus-visible:ring-offset-dark-950"
                      >
                        <span className="flex items-center gap-3">
                          <LogIn className="h-4 w-4" />
                          Sign In / Create Account
                        </span>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </Link>
                    )}

                    <Link
                      to="/admin"
                      className="group flex min-h-[48px] items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-gray-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-purple focus-visible:ring-offset-2 focus-visible:ring-offset-dark-950"
                    >
                      <span className="flex items-center gap-3">
                        <Shield className="h-4 w-4" />
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
      )}

      <main id="main-content" className={`relative ${isDashboardRoute ? "" : "pt-20"}`} tabIndex={-1}>
        <Outlet />
      </main>

      {canShowCopilot && (
        <>
          {!isDashboardRoute && (
            <button
              type="button"
              onClick={() => setAiDrawerOpen(true)}
              className={`fixed ${mobileLauncherBottom} right-4 z-[75] inline-flex min-h-[52px] items-center gap-2 rounded-full border border-sky-300/40 bg-gradient-to-r from-sky-500 to-violet-500 px-4 py-3 text-sm font-bold text-white shadow-[0_12px_32px_rgba(56,189,248,0.32)] transition-transform hover:scale-[1.02] lg:hidden`}
              aria-label="Open AirdropGuard Copilot"
            >
              <Bot className="h-4 w-4" />
              Ask AI
            </button>
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

          <div className={`fixed inset-0 z-[80] ${aiDrawerOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
            <div
              className={`absolute inset-0 bg-black/70 backdrop-blur-[2px] transition-opacity duration-300 ${aiDrawerOpen ? 'opacity-100' : 'opacity-0'}`}
              onClick={() => setAiDrawerOpen(false)}
            />
            <aside className={`absolute inset-0 h-[100dvh] w-full max-w-full overflow-hidden rounded-none border border-white/10 bg-[#060a18]/95 p-0 shadow-[0_0_70px_rgba(56,189,248,0.2)] transition-transform duration-300 lg:inset-auto lg:bottom-3 lg:right-0 lg:top-3 lg:h-auto lg:w-[min(420px,100vw)] lg:max-w-[420px] lg:rounded-l-[32px] lg:rounded-tr-none lg:rounded-br-none lg:border-l lg:border-t lg:border-b lg:border-r-0 ${aiDrawerOpen ? 'translate-y-0 lg:translate-x-0' : 'translate-y-full lg:translate-y-0 lg:translate-x-full'}`}>
              <AirdropCopilot
                onClose={() => setAiDrawerOpen(false)}
                className="h-full"
                pageContext={effectiveCopilotContext}
                summary={{ userName: user?.email?.split('@')[0] || 'Explorer' }}
              />
            </aside>
          </div>
        </>
      )}

      {!isDashboardRoute && <Footer />}
    </div>
  );
}
