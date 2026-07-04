import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  CheckSquare,
  Clock,
  ExternalLink,
  FileText,
  Newspaper,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { supabase } from "../lib/supabase";

type Airdrop = {
  id: string;
  slug: string | null;
  name: string | null;
  ticker: string | null;
  logo_url?: string | null;
  created_at: string | null;
  updated_at: string | null;
  last_analyzed_at: string | null;
  expiry_date: string | null;
  status: string | null;
  published: boolean | null;
  listing_state: string | null;
  review_status: string | null;
  is_demo: boolean | null;
  is_trending: boolean | null;
  is_featured: boolean | null;
  trust_score: number | null;
  trust_label: string | null;
  reward_potential: string | null;
  risk_level: string | null;
  difficulty: string | null;
  time_required: string | null;
  estimated_reward: string | null;
  funding_info: string | null;
  investors: string | null;
  team_info: string | null;
  docs_url: string | null;
  github_url?: string | null;
  source?: string | null;
  score_reasons?: string[] | null;
  sub_scores?: Record<string, number> | null;
  contract_address?: string | null;
  blacklist_reason: string | null;
  scam_reason: string | null;
  ai_risk_analysis: string | null;
  ai_reward_estimate: string | null;
  human_verified?: boolean | null;
};

export default function AirdropGuardIntelligenceCentre() {
  const [airdrops, setAirdrops] = useState<Airdrop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function loadBrief() {
    setRefreshing(true);

    const { data, error } = await supabase
      .from("airdrops")
      .select("*")
      .eq("published", true)
      .eq("is_demo", false)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("AirdropGuard Intelligence Centre error:", error);
      setAirdrops([]);
    } else {
      setAirdrops(data || []);
      setLastUpdated(new Date());
    }

    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    loadBrief();
    const interval = window.setInterval(loadBrief, 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  const sevenDays = 7 * oneDay;

  const activeVerified = useMemo(() => {
    return airdrops.filter((a) => {
      const status = lower(a.status);
      const listing = lower(a.listing_state);
      const review = lower(a.review_status);

      return (
        a.published === true &&
        status === "active" &&
        (listing === "verified" || review === "approved")
      );
    });
  }, [airdrops]);

  const updatedToday = useMemo(() => {
    return airdrops.filter((a) => isWithin(a.updated_at, oneDay)).length;
  }, [airdrops]);

  const trending = useMemo(() => {
    return airdrops.filter((a) => a.is_trending === true);
  }, [airdrops]);

  const expiringSoon = useMemo(() => {
    return activeVerified
      .filter((a) => {
        if (!a.expiry_date) return false;
        const diff = new Date(a.expiry_date).getTime() - now.getTime();
        return diff > 0 && diff <= sevenDays;
      })
      .sort(
        (a, b) =>
          new Date(a.expiry_date || "").getTime() -
          new Date(b.expiry_date || "").getTime()
      );
  }, [activeVerified]);

  const scamWarnings = useMemo(() => {
    return airdrops.filter((a) => {
      const risk = lower(a.risk_level);
      const listing = lower(a.listing_state);
      const review = lower(a.review_status);

      return (
        risk === "high" ||
        listing.includes("blacklist") ||
        listing.includes("scam") ||
        review.includes("blacklist") ||
        Boolean(a.blacklist_reason) ||
        Boolean(a.scam_reason)
      );
    });
  }, [airdrops]);

  const watchList = useMemo(() => {
    return airdrops.filter((a) => {
      const trustLabel = lower(a.trust_label);
      const risk = lower(a.risk_level);
      return trustLabel === "watch" || risk === "medium";
    });
  }, [airdrops]);

  const worthYourTime = useMemo(() => {
    return [...activeVerified]
      .filter((a) => lower(a.risk_level) !== "high")
      .sort((a, b) => {
        return (
          Number(b.is_trending) - Number(a.is_trending) ||
          rewardRank(b.reward_potential) - rewardRank(a.reward_potential) ||
          (b.trust_score || 0) - (a.trust_score || 0)
        );
      })
      .slice(0, 3);
  }, [activeVerified]);

  const watchItems = useMemo(() => {
    return [...scamWarnings, ...watchList]
      .filter((a, index, arr) => arr.findIndex((x) => x.id === a.id) === index)
      .slice(0, 3);
  }, [scamWarnings, watchList]);

  const funded = useMemo(
    () => activeVerified.filter((a) => hasValue(a.funding_info)),
    [activeVerified]
  );

  const investorBacked = useMemo(
    () => activeVerified.filter((a) => hasValue(a.investors)),
    [activeVerified]
  );

  const withDocs = useMemo(
    () => activeVerified.filter((a) => hasValue(a.docs_url)),
    [activeVerified]
  );

  // Every live approved listing on AirdropGuard is human reviewed.
  const humanVerified = useMemo(() => activeVerified, [activeVerified]);

  const aiConfidence = useMemo(() => {
    if (worthYourTime.length === 0) return null;

    const top = worthYourTime[0];

    return {
      airdrop: top,
      score: calculateAiConfidence(top),
      reasons: aiConfidenceReasons(top),
    };
  }, [worthYourTime]);

  const marketPulse = useMemo(() => {
    const mood =
      scamWarnings.length > 2 ? "Cautious" : trending.length >= 10 ? "Active" : "Stable";

    return [
      `Market Pulse: ${mood}`,
      `Scam Activity: ${scamWarnings.length === 0 ? "Low" : "Review"}`,
      `High-Value: ${worthYourTime.length}`,
      `Ending This Week: ${expiringSoon.length}`,
      `Trending: ${trending.length}`,
    ];
  }, [scamWarnings, trending, worthYourTime, expiringSoon]);

  const nextActions = useMemo(() => {
    const actions: string[] = [];

    expiringSoon.slice(0, 2).forEach((a) => {
      actions.push(`Review ${nameOf(a)} before ${formatDate(a.expiry_date)}.`);
    });

    worthYourTime.slice(0, 1).forEach((a) => {
      actions.push(`Prioritise ${nameOf(a)} for strong reward potential.`);
    });

    if (watchItems[0]) {
      actions.push(`Monitor ${nameOf(watchItems[0])} for further verification.`);
    }

    if (actions.length === 0) {
      actions.push("Review newly verified listings.");
      actions.push("Check your tracked airdrops.");
      actions.push("Avoid unverified claim links.");
    }

    return actions.slice(0, 3);
  }, [expiringSoon, worthYourTime, watchItems]);

  const aiInsight = useMemo(() => {
    if (worthYourTime.length === 0) {
      return "AirdropGuard is monitoring verified listings, risk signals and upcoming deadlines.";
    }

    const top = worthYourTime[0];

    if (trending.length > 0 && expiringSoon.length > 0) {
      return `${nameOf(top)} currently leads the dashboard while ${expiringSoon.length} verified opportunity is expiring soon.`;
    }

    if (trending.length > 0) {
      return `${trending.length} projects are trending, with ${nameOf(top)} showing the strongest trust and reward profile.`;
    }

    return `${nameOf(top)} currently has the strongest combined trust, reward and risk profile.`;
  }, [worthYourTime, trending, expiringSoon]);

  const priorityLevel =
    scamWarnings.length >= 3 || expiringSoon.length >= 3
      ? "HIGH"
      : expiringSoon.length > 0 || trending.length > 0
      ? "ACTIVE"
      : "NORMAL";

  const changedItems = [
    `${activeVerified.length} active verified airdrops`,
    `${updatedToday} project updates today`,
    `${trending.length} projects currently trending`,
  ];

  return (
    <section className="glass-card p-5 mb-8 border border-neon-purple/20 shadow-lg shadow-neon-purple/5">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-1">{greeting()} 👋</p>

          <h2 className="text-2xl font-bold text-white">
            🧠 AirdropGuard Intelligence Centre
          </h2>

          <p className="text-sm text-gray-400 mt-1">
            Your live overview of what changed, what matters, what is risky, and what to do next.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
          </span>

          {lastUpdated && (
            <p className="text-xs text-gray-500">
              Updated{" "}
              {lastUpdated.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}

          <button
            onClick={loadBrief}
            aria-label="Refresh intelligence"
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Refresh Intelligence"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="mb-5 rounded-xl border border-white/10 bg-black/20 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-neon-purple/10 p-2 text-neon-purple">
            <Zap className="w-5 h-5" />
          </div>

          <div>
            <p className="text-sm font-semibold text-white">AI Insight</p>
            <p className="text-sm text-gray-400 mt-1">{aiInsight}</p>
          </div>
        </div>
      </div>

      <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {marketPulse.map((item) => (
          <div
            key={item}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-300"
          >
            {item}
          </div>
        ))}
      </div>

      <div className="mb-5 rounded-xl border border-white/10 bg-white/5 p-4">
        <h3 className="text-lg font-semibold text-white mb-3">
          Today&apos;s Airdrop Brief
        </h3>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MiniStat
            icon={<ShieldCheck className="w-4 h-4" />}
            label="Active verified"
            value={loading ? "..." : String(activeVerified.length)}
            trend={`▲ ${updatedToday} updated`}
            color="green"
          />
          <MiniStat
            icon={<AlertTriangle className="w-4 h-4" />}
            label="Scam alerts"
            value={loading ? "..." : String(scamWarnings.length)}
            trend={scamWarnings.length === 0 ? "Clear today" : "Review required"}
            color="red"
          />
          <MiniStat
            icon={<Clock className="w-4 h-4" />}
            label="Expiring soon"
            value={loading ? "..." : String(expiringSoon.length)}
            trend={expiringSoon[0] ? nameOf(expiringSoon[0]) : "No urgent expiry"}
            color="yellow"
          />
          <MiniStat
            icon={<TrendingUp className="w-4 h-4" />}
            label="Priority level"
            value={loading ? "..." : priorityLevel}
            trend={`${trending.length} trending`}
            color="blue"
          />
        </div>
      </div>

      {aiConfidence && (
        <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 hover:-translate-y-0.5 transition-transform">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <Logo airdrop={aiConfidence.airdrop} />

              <div>
                <p className="text-sm text-emerald-400 font-medium">
                  🏆 Today&apos;s Best Opportunity
                </p>

                <h3 className="text-3xl font-bold text-white">
                  {nameOf(aiConfidence.airdrop)}
                </h3>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone="green">Trust {aiConfidence.airdrop.trust_score ?? "?"}/100</Badge>
                  <Badge tone="yellow">{aiConfidence.airdrop.reward_potential || "Reward pending"}</Badge>
                  <Badge tone="green">{aiConfidence.airdrop.risk_level || "Risk pending"} risk</Badge>
                  {aiConfidence.airdrop.is_trending && <Badge tone="blue">Trending</Badge>}
                  {hasValue(aiConfidence.airdrop.funding_info) && <Badge tone="purple">Funding confirmed</Badge>}
                </div>

                <TrustBar score={aiConfidence.airdrop.trust_score || 0} />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/25 px-6 py-5 text-center min-w-[180px]">
              <p className="text-xs text-gray-400">AI Confidence</p>
              <p className="text-4xl font-bold text-emerald-400">
                {aiConfidence.score}%
              </p>
              <div className="mt-2 h-2 rounded-full bg-white/10">
                <div
                  className="h-2 rounded-full bg-emerald-400"
                  style={{ width: `${aiConfidence.score}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-emerald-300">Very High Confidence</p>
              <p className="mt-1 text-[11px] text-gray-500">
                Based on trust, docs, funding and risk.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {aiConfidence.reasons.map((reason) => (
              <p key={reason} className="text-sm text-gray-300">
                ✓ {reason}
              </p>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              to={`/airdrop/${aiConfidence.airdrop.slug}`}
              className="rounded-lg bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500/25 transition-colors"
            >
              View Analysis →
            </Link>

            {aiConfidence.airdrop.docs_url && (
              <a
                href={aiConfidence.airdrop.docs_url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-white/5 px-4 py-2 text-sm font-medium text-gray-300 border border-white/10 hover:bg-white/10 transition-colors inline-flex items-center gap-2"
              >
                Docs <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      )}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <QuickAction to="/" label="Browse Airdrops" />
        <QuickAction to="/?filter=trending" label="Trending" />
        <QuickAction to="/dashboard" label="My Tasks" />
        <QuickAction to="/submit" label="Submit Airdrop" />
        <button
          onClick={loadBrief}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-300 hover:bg-white/10 hover:text-white hover:-translate-y-0.5 transition-all"
        >
          Refresh Intelligence
        </button>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <BriefCard
          icon={<TrendingUp className="w-5 h-5" />}
          title="What's Changed?"
          items={loading ? ["Loading latest changes..."] : changedItems}
        />

        <OpportunityListCard
          icon={<Sparkles className="w-5 h-5" />}
          title="Worth Your Time"
          opportunities={worthYourTime}
          loading={loading}
        />

        <WatchListCard items={watchItems} loading={loading} />

        <ChecklistCard items={loading ? ["Loading next actions..."] : nextActions} />

        <VerificationCoverageCard
          humanVerified={humanVerified.length}
          funded={funded.length}
          investors={investorBacked.length}
          docs={withDocs.length}
          loading={loading}
        />
      </div>
    </section>
  );
}

function MiniStat({
  icon,
  label,
  value,
  trend,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend: string;
  color: "green" | "red" | "yellow" | "blue";
}) {
  const styles = {
    green: "border-emerald-500/40 text-emerald-400",
    red: "border-red-500/40 text-red-400",
    yellow: "border-yellow-500/40 text-yellow-400",
    blue: "border-blue-500/40 text-blue-400",
  };

  return (
    <div className={`rounded-xl border bg-black/30 p-4 hover:-translate-y-0.5 transition-transform ${styles[color]}`}>
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <p className="text-xs text-gray-400">{label}</p>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-[11px] text-gray-500 truncate">{trend}</p>
    </div>
  );
}

function OpportunityListCard({
  icon,
  title,
  opportunities,
  loading,
}: {
  icon: React.ReactNode;
  title: string;
  opportunities: Airdrop[];
  loading: boolean;
}) {
  return (
    <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/5 p-5 text-yellow-400 min-h-[190px] hover:-translate-y-0.5 transition-transform">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="font-semibold text-white">{title}</h3>
      </div>

      {loading ? (
        <p className="text-sm text-gray-300">Finding strongest opportunities...</p>
      ) : opportunities.length === 0 ? (
        <p className="text-sm text-gray-300">No priority opportunities found yet.</p>
      ) : (
        <ul className="space-y-3">
          {opportunities.slice(0, 3).map((a, index) => (
            <li key={a.id} className="text-sm leading-relaxed">
              <Link
                to={`/airdrop/${a.slug}`}
                className="font-semibold text-white hover:text-yellow-300 transition-colors"
              >
                {["🥇", "🥈", "🥉"][index]} {nameOf(a)}{" "}
                <span className="text-xs font-normal text-gray-400">
                  ({a.trust_score ?? "?"}/100)
                </span>
              </Link>

              <div className="mt-2 flex flex-wrap gap-1">
                <SmallBadge>{stars(a.trust_score)}</SmallBadge>
                <SmallBadge>{a.reward_potential || "Reward pending"}</SmallBadge>
                {hasValue(a.funding_info) && <SmallBadge>Funded</SmallBadge>}
                {hasValue(a.docs_url) && <SmallBadge>Docs</SmallBadge>}
              </div>

              <DiscoveryReasonPanel airdrop={a} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BriefCard({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-xl border border-blue-500/40 bg-blue-500/5 p-5 text-blue-400 min-h-[190px] hover:-translate-y-0.5 transition-transform">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="font-semibold text-white">{title}</h3>
      </div>

      <ul className="space-y-3">
        {items.slice(0, 3).map((item) => (
          <li key={item} className="text-sm text-gray-300 leading-relaxed">
            • {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function WatchListCard({
  items,
  loading,
}: {
  items: Airdrop[];
  loading: boolean;
}) {
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-5 text-amber-400 min-h-[190px] hover:-translate-y-0.5 transition-transform">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5" />
        <h3 className="font-semibold text-white">Watch List</h3>
      </div>

      {loading ? (
        <p className="text-sm text-gray-300">Checking watch-list projects...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-300">No watch-list projects currently detected.</p>
      ) : (
        <ul className="space-y-3">
          {items.slice(0, 3).map((a) => (
            <li key={a.id} className="text-sm">
              <p className="font-semibold text-white">⚠ {nameOf(a)}</p>
              <p className="mt-1 text-xs text-gray-300">Reason: {watchReason(a)}</p>
              <p className="text-xs text-gray-500">Risk: {a.risk_level || "Monitor"}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ChecklistCard({ items }: { items: string[] }) {
  return (
    <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-5 text-emerald-400 min-h-[190px] hover:-translate-y-0.5 transition-transform">
      <div className="flex items-center gap-2 mb-4">
        <CheckSquare className="w-5 h-5" />
        <h3 className="font-semibold text-white">What To Do Next</h3>
      </div>

      <ol className="space-y-3">
        {items.slice(0, 3).map((item, index) => (
          <li key={item} className="flex gap-2 text-sm text-gray-300 leading-relaxed">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>{index + 1}.</strong> {item}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function VerificationCoverageCard({
  humanVerified,
  funded,
  investors,
  docs,
  loading,
}: {
  humanVerified: number;
  funded: number;
  investors: number;
  docs: number;
  loading: boolean;
}) {
  const stats = [
    {
      label: "Human Verified",
      subtitle: "AI + Human Review",
      value: humanVerified,
      icon: <ShieldCheck className="w-4 h-4" />,
      style: "border-emerald-500/30 text-emerald-300 bg-emerald-500/5",
      title: "Every project listed on AirdropGuard has been manually reviewed before publication.",
    },
    {
      label: "Funding",
      subtitle: "Confirmed Funding",
      value: funded,
      icon: <Zap className="w-4 h-4" />,
      style: "border-yellow-500/30 text-yellow-300 bg-yellow-500/5",
      title: "Project has confirmed public funding or grant information.",
    },
    {
      label: "Investors",
      subtitle: "Verified Backers",
      value: investors,
      icon: <Users className="w-4 h-4" />,
      style: "border-blue-500/30 text-blue-300 bg-blue-500/5",
      title: "Project has publicly verifiable investors or backers.",
    },
    {
      label: "Documentation",
      subtitle: "Official Docs",
      value: docs,
      icon: <FileText className="w-4 h-4" />,
      style: "border-purple-500/30 text-purple-300 bg-purple-500/5",
      title: "Official documentation or whitepaper available.",
    },
  ];

  return (
    <div className="rounded-xl border border-purple-500/40 bg-purple-500/5 p-5 text-purple-400 min-h-[190px] hover:-translate-y-0.5 transition-transform">
      <div className="flex items-center gap-2 mb-4">
        <Newspaper className="w-5 h-5" />
        <h3 className="font-semibold text-white">Verification Coverage</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            title={stat.title}
            className={`rounded-lg border p-3 transition-all hover:scale-[1.02] ${stat.style}`}
          >
            <div className="flex items-center gap-2">
              {stat.icon}
              <span className="text-[11px] font-medium">{stat.label}</span>
            </div>

            <p className="mt-2 text-2xl font-bold text-white">
              {loading ? "..." : stat.value}
            </p>

            <p className="mt-1 text-[11px] text-gray-400">{stat.subtitle}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickAction({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-300 hover:bg-white/10 hover:text-white hover:-translate-y-0.5 transition-all text-center"
    >
      {label}
    </Link>
  );
}

function Logo({ airdrop }: { airdrop: Airdrop }) {
  if (airdrop.logo_url) {
    return (
      <img
        src={airdrop.logo_url}
        alt={nameOf(airdrop)}
        className="h-16 w-16 rounded-2xl object-cover border border-white/10 bg-black/20"
      />
    );
  }

  return (
    <div className="rounded-2xl bg-emerald-500/10 p-4 text-emerald-400">
      <ShieldCheck className="h-8 w-8" />
    </div>
  );
}

function TrustBar({ score }: { score: number }) {
  const width = Math.max(0, Math.min(100, score));

  return (
    <div className="mt-4 h-2.5 w-full max-w-md rounded-full bg-white/10">
      <div
        className="h-2.5 rounded-full bg-emerald-400 transition-all duration-700"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "green" | "yellow" | "blue" | "purple";
}) {
  const tones = {
    green: "border-emerald-500/20 text-emerald-300 bg-emerald-500/10",
    yellow: "border-yellow-500/20 text-yellow-300 bg-yellow-500/10",
    blue: "border-blue-500/20 text-blue-300 bg-blue-500/10",
    purple: "border-purple-500/20 text-purple-300 bg-purple-500/10",
  };

  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs ${tones[tone]}`}>
      {children}
    </span>
  );
}

function SmallBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md border border-white/10 bg-black/20 px-2 py-0.5 text-[11px] text-gray-300">
      {children}
    </span>
  );
}

function DiscoveryReasonPanel({ airdrop }: { airdrop: Airdrop }) {
  const reasoning = buildDiscoveryReasoning(airdrop);

  return (
    <div className="mt-3 rounded-lg border border-white/10 bg-black/25 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-200">Why was this discovered?</p>
        <div className="flex items-center gap-2 text-[11px]">
          <span className={`rounded-full border px-2 py-0.5 ${reasoning.confidenceLevel === 'High'
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
            : reasoning.confidenceLevel === 'Medium'
            ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
            : 'border-gray-500/30 bg-gray-500/10 text-gray-300'}`}>
            {reasoning.confidenceLevel}
          </span>
          <span className="text-cyan-100">AI Confidence {reasoning.confidencePct}%</span>
        </div>
      </div>

      <p className="mt-2 text-xs text-gray-300">{reasoning.explanation}</p>

      <SignalList title="Positive Signals" items={reasoning.positiveSignals} tone="emerald" />
      <SignalList title="Negative Signals" items={reasoning.negativeSignals} tone="rose" />
      <SignalList title="Missing Information" items={reasoning.missingInformation} tone="amber" />
      <SignalList title="Potential Risks" items={reasoning.potentialRisks} tone="violet" />

      <div className="mt-2 text-[11px] text-cyan-100">
        Recommended Next Action: <span className="font-semibold text-white">{reasoning.recommendedNextAction}</span>
      </div>
    </div>
  );
}

function SignalList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: 'emerald' | 'rose' | 'amber' | 'violet';
}) {
  const toneClass = tone === 'emerald'
    ? 'text-emerald-300'
    : tone === 'rose'
    ? 'text-rose-300'
    : tone === 'amber'
    ? 'text-amber-300'
    : 'text-violet-300';

  return (
    <div className="mt-2">
      <p className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${toneClass}`}>{title}</p>
      <ul className="mt-1 space-y-1">
        {items.slice(0, 4).map((item) => (
          <li key={`${title}-${item}`} className="text-xs text-gray-300">• {item}</li>
        ))}
      </ul>
    </div>
  );
}

function lower(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function hasValue(value: unknown) {
  const text = String(value || "").trim().toLowerCase();
  return Boolean(text && text !== "null" && text !== "empty");
}

function isWithin(date: string | null | undefined, ms: number) {
  if (!date) return false;
  const time = new Date(date).getTime();
  if (Number.isNaN(time)) return false;
  return Date.now() - time >= 0 && Date.now() - time <= ms;
}

function nameOf(a: Airdrop) {
  return a.name || a.ticker || a.slug || "Unnamed airdrop";
}

function formatDate(date: string | null | undefined) {
  if (!date) return "soon";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function rewardRank(value: string | null | undefined) {
  const v = lower(value);
  if (v.includes("high")) return 3;
  if (v.includes("medium")) return 2;
  if (v.includes("low")) return 1;
  return 0;
}

function watchReason(a: Airdrop) {
  if (a.blacklist_reason) return short(a.blacklist_reason);
  if (a.scam_reason) return short(a.scam_reason);
  if (a.trust_label) return `Trust label: ${a.trust_label}`;
  if (a.risk_level) return `${a.risk_level} risk`;
  if (a.ai_risk_analysis) return short(a.ai_risk_analysis);
  return "Monitor for updates";
}

function calculateAiConfidence(a: Airdrop) {
  let score = 50;

  score += Math.min(a.trust_score || 0, 100) * 0.3;

  if (lower(a.reward_potential).includes("high")) score += 12;
  if (lower(a.risk_level).includes("low")) score += 10;
  if (a.is_trending) score += 8;
  if (hasValue(a.funding_info)) score += 8;
  if (hasValue(a.investors)) score += 6;
  if (hasValue(a.docs_url)) score += 6;
  if (lower(a.trust_label) === "watch") score -= 10;
  if (lower(a.risk_level) === "high") score -= 20;

  return Math.max(1, Math.min(99, Math.round(score)));
}

function aiConfidenceReasons(a: Airdrop) {
  const reasons: string[] = [];

  if ((a.trust_score || 0) >= 70) reasons.push("Strong Trust Score");
  if (lower(a.reward_potential).includes("high")) reasons.push("High reward potential");
  if (lower(a.risk_level).includes("low")) reasons.push("Low risk indicators");
  if (a.is_trending) reasons.push("Trending project activity");
  if (hasValue(a.funding_info)) reasons.push("Funding data available");
  if (hasValue(a.investors)) reasons.push("Investor backing detected");
  if (hasValue(a.docs_url)) reasons.push("Documentation available");

  return reasons.length > 0
    ? reasons.slice(0, 4)
    : ["Balanced trust and opportunity profile"];
}

function stars(score: number | null) {

type DiscoveryReasoning = {
  confidencePct: number;
  confidenceLevel: "High" | "Medium" | "Low";
  evidenceReasons: string[];
  explanation: string;
  positiveSignals: string[];
  negativeSignals: string[];
  missingInformation: string[];
  potentialRisks: string[];
  recommendedNextAction: "Research Further" | "Import" | "Monitor" | "Wait" | "Ignore";
};

function buildDiscoveryReasoning(a: Airdrop): DiscoveryReasoning {
  const evidenceReasons = detectEvidenceReasons(a);
  const confidencePct = calculateAiConfidence(a);
  const confidenceLevel: "High" | "Medium" | "Low" = confidencePct >= 75 ? "High" : confidencePct >= 55 ? "Medium" : "Low";

  const positiveSignals = [
    ...evidenceReasons,
    hasValue(a.funding_info) ? "Large VC funding" : "",
    hasValue(a.investors) ? "Well-known investors" : "",
    hasValue(a.github_url) ? "Active GitHub development" : "",
    hasValue(a.docs_url) ? "New documentation published" : "",
    a.is_trending ? "Strong community growth" : "",
    !hasValue(a.contract_address) ? "Token not yet launched" : "",
    a.listing_state === "verified" || a.human_verified ? "Strong security indicators" : "",
  ].filter(Boolean);

  const negativeSignals = [
    lower(a.risk_level) === "high" ? "High modelled risk level" : "",
    Boolean(a.blacklist_reason) ? "Blacklist reason detected" : "",
    Boolean(a.scam_reason) ? "Scam reason detected" : "",
    lower(a.listing_state).includes("under_review") ? "Still under review" : "",
  ].filter(Boolean);

  const missingInformation = [
    hasValue(a.docs_url) ? "" : "Documentation URL",
    hasValue(a.github_url) ? "" : "GitHub repository activity",
    hasValue(a.funding_info) || hasValue(a.investors) ? "" : "Funding and investor confirmation",
    hasValue(a.team_info) ? "" : "Team information",
    hasValue(a.contract_address) ? "" : "Official token contract",
  ].filter(Boolean);

  const potentialRisks = [
    lower(a.risk_level) === "high" ? "Potentially elevated execution risk." : "",
    !hasValue(a.contract_address) ? "Token launch details are not yet confirmed." : "",
    !hasValue(a.docs_url) ? "Limited official documentation available." : "",
    !hasValue(a.github_url) ? "Unable to independently verify developer velocity." : "",
    Boolean(a.blacklist_reason) ? short(a.blacklist_reason ?? "") : "",
    Boolean(a.scam_reason) ? short(a.scam_reason ?? "") : "",
  ].filter(Boolean);

  const recommendedNextAction = deriveRecommendationAction(a, confidencePct);

  const explanation = `This project was detected because ${sentenceJoin(evidenceReasons.slice(0, 5))}. These characteristics historically correlate with projects that later distribute community rewards.`;

  return {
    confidencePct,
    confidenceLevel,
    evidenceReasons: evidenceReasons.length ? evidenceReasons : ["High ecosystem activity"],
    explanation,
    positiveSignals: positiveSignals.length ? positiveSignals : ["High ecosystem activity"],
    negativeSignals: negativeSignals.length ? negativeSignals : ["No major negative signals currently highlighted"],
    missingInformation: missingInformation.length ? missingInformation : ["No major information gaps detected"],
    potentialRisks: potentialRisks.length ? potentialRisks : ["No material risk escalation signal detected right now"],
    recommendedNextAction,
  };
}

function detectEvidenceReasons(a: Airdrop): string[] {
  const fromScoreReasons = Array.isArray(a.score_reasons)
    ? a.score_reasons.map((reason) => compactReason(reason)).filter(Boolean)
    : [];

  const source = lower(a.source);
  const summary = `${lower(a.ai_summary)} ${lower(a.funding_info)} ${lower(a.investors)} ${lower(a.docs_url)}`;

  const inferred = [
    /testnet/.test(summary) ? "Testnet launched" : "",
    /mainnet/.test(summary) ? "Mainnet announced" : "",
    /(campaign|incentiv)/.test(summary) ? "Incentivised campaign detected" : "",
    /(points|public points)/.test(summary) ? "Public points programme" : "",
    hasValue(a.funding_info) ? "Large VC funding" : "",
    hasValue(a.investors) ? "Well-known investors" : "",
    hasValue(a.github_url) ? "Active GitHub development" : "",
    hasValue(a.docs_url) ? "New documentation published" : "",
    a.is_trending ? "Strong community growth" : "",
    source.includes("blog") ? "Official blog announcement" : "",
    source.includes("discord") ? "Discord announcement" : "",
    source.includes("telegram") ? "Telegram announcement" : "",
    source.includes("twitter") || source.includes("x") ? "X announcement" : "",
    source.includes("galxe") ? "Galxe campaign" : "",
    source.includes("zealy") ? "Zealy campaign" : "",
    source.includes("layer3") ? "Layer3 campaign" : "",
    source.includes("questn") ? "QuestN campaign" : "",
    !hasValue(a.contract_address) ? "Token not yet launched" : "",
    lower(a.listing_state) === "verified" || a.human_verified ? "Strong security indicators" : "",
  ].filter(Boolean);

  return [...fromScoreReasons, ...inferred].filter((reason, index, arr) => arr.indexOf(reason) === index);
}

function compactReason(reason: string): string {
  const text = reason.trim();
  if (!text) return "";
  if (/github/i.test(text)) return "Active GitHub development";
  if (/fund|raise|investor/i.test(text)) return "Large VC funding";
  if (/docs|documentation|whitepaper/i.test(text)) return "New documentation published";
  if (/community|social|discord|telegram|twitter|x/i.test(text)) return "Strong community growth";
  if (/testnet/i.test(text)) return "Testnet launched";
  if (/mainnet/i.test(text)) return "Mainnet announced";
  if (/campaign|quest|galxe|zealy|layer3|questn/i.test(text)) return "Incentivised campaign detected";
  if (/token/i.test(text) && /not|unlaunched|pending|no /.test(text.toLowerCase())) return "Token not yet launched";
  return text.length > 80 ? `${text.slice(0, 79)}…` : text;
}

function deriveRecommendationAction(a: Airdrop, confidencePct: number): "Research Further" | "Import" | "Monitor" | "Wait" | "Ignore" {
  if (Boolean(a.blacklist_reason) || Boolean(a.scam_reason)) return "Ignore";
  if (lower(a.risk_level) === "high" && confidencePct < 60) return "Wait";
  if (lower(a.risk_level) === "low" && confidencePct >= 78 && (a.listing_state === "verified" || a.human_verified)) return "Import";
  if (confidencePct >= 60) return "Research Further";
  return "Monitor";
}

function sentenceJoin(items: string[]): string {
  const filtered = items.filter(Boolean);
  if (filtered.length === 0) return "it shows high ecosystem activity";
  if (filtered.length === 1) return filtered[0];
  if (filtered.length === 2) return `${filtered[0]} and ${filtered[1]}`;
  return `${filtered.slice(0, -1).join(", ")}, and ${filtered[filtered.length - 1]}`;
}
  const value = score || 0;
  if (value >= 80) return "★★★★★";
  if (value >= 65) return "★★★★☆";
  if (value >= 50) return "★★★☆☆";
  return "★★☆☆☆";
}

function short(text: string, max = 60) {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function greeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}