import { Link } from 'react-router-dom';
import { TrendingUp, Clock, Zap, ArrowRight, BadgeDollarSign, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import type { Airdrop } from '../lib/types';
import { cn, getRewardColor, getRiskColor, daysUntil, getStatusColor } from '../lib/utils';

interface Props {
  airdrop: Airdrop;
}

export default function FeaturedSpotlight({ airdrop }: Props) {
  const [imgError, setImgError] = useState(false);
  const days = daysUntil(airdrop.expiry_date);

  return (
    <section className="relative mb-8 overflow-hidden rounded-3xl border border-neon-purple/15 bg-gradient-to-br from-dark-800/80 via-dark-700/50 to-dark-800/80 p-4 sm:p-7">
      <div className="pointer-events-none absolute inset-0 hidden sm:block bg-gradient-to-br from-neon-purple/5 via-transparent to-neon-blue/5" />

      <div className="relative">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-neon-purple/20 bg-neon-purple/10 px-3 py-1.5 text-xs font-semibold text-neon-purple">
            <TrendingUp className="h-3.5 w-3.5" />
            Featured Airdrop
          </span>

          {airdrop.is_sponsored && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400">
              <BadgeDollarSign className="h-3.5 w-3.5" />
              Sponsored
            </span>
          )}

          <span className={cn('ml-0 sm:ml-auto rounded-full border px-3 py-1.5 text-xs font-semibold', getStatusColor(airdrop.status))}>
            {airdrop.status}
          </span>
        </div>

        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-neon-purple/20 to-neon-blue/20 shadow-lg shadow-neon-purple/10">
            {airdrop.logo_url && !imgError ? (
              <img
                src={airdrop.logo_url}
                alt={`${airdrop.name} logo`}
                width={80}
                height={80}
                loading="lazy"
                decoding="async"
                className="h-full w-full rounded-2xl object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <span className="text-3xl font-bold gradient-text">
                {airdrop.name.charAt(0)}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h2 className="min-w-0 text-2xl font-black leading-tight text-white sm:text-3xl">
                {airdrop.name}
              </h2>

              {airdrop.ticker && (
                <span className="rounded-lg border border-neon-purple/25 bg-neon-purple/10 px-2 py-1 font-mono text-xs font-bold tracking-wider text-neon-purple">
                  ${airdrop.ticker}
                </span>
              )}
            </div>

            <div className="mb-4 flex flex-wrap gap-1.5">
              {airdrop.blockchain.slice(0, 3).map((b) => (
                <span key={b} className="rounded-full border border-white/10 bg-dark-600/60 px-2.5 py-1 text-xs text-gray-300">
                  {b}
                </span>
              ))}

              {airdrop.category.slice(0, 2).map((c) => (
                <span key={c} className="rounded-full border border-white/10 bg-dark-600/60 px-2.5 py-1 text-xs text-gray-400">
                  {c}
                </span>
              ))}
            </div>

            <p className="mb-5 line-clamp-3 text-sm leading-relaxed text-gray-400 sm:line-clamp-2">
              {airdrop.ai_summary || 'Featured airdrop intelligence report available. Review the full page for trust, risk, reward and task details.'}
            </p>

            <div className="mb-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
              <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
                <div className="mb-1 flex items-center gap-1.5 text-[10px] text-gray-600">
                  <Zap className="h-3 w-3" />
                  Reward
                </div>
                <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium', getRewardColor(airdrop.reward_potential))}>
                  {airdrop.reward_potential}
                </span>
              </div>

              <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
                <div className="mb-1 flex items-center gap-1.5 text-[10px] text-gray-600">
                  <ShieldAlert className="h-3 w-3" />
                  Risk
                </div>
                <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium', getRiskColor(airdrop.risk_level))}>
                  {airdrop.risk_level}
                </span>
              </div>

              {airdrop.estimated_reward && (
                <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
                  <div className="mb-1 text-[10px] text-gray-600">Est. Reward</div>
                  <span className="text-xs font-semibold text-neon-green">{airdrop.estimated_reward}</span>
                </div>
              )}

              {days !== null && days > 0 && (
                <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
                  <div className="mb-1 flex items-center gap-1.5 text-[10px] text-gray-600">
                    <Clock className="h-3 w-3" />
                    Deadline
                  </div>
                  <span className="text-xs font-semibold text-gray-300">{days}d left</span>
                </div>
              )}
            </div>

            <Link
              to={`/airdrop/${airdrop.slug}`}
              className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl bg-neon-purple px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-neon-purple/90 sm:w-auto"
            >
              View Airdrop Details
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}