import { Link } from 'react-router-dom';
import { useState } from 'react';
import type { MouseEvent } from 'react';
import { Clock, Zap, ShieldAlert, Bookmark, BookmarkCheck, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { Airdrop } from '../lib/types';
import {
  cn,
  getRewardColor,
  getRiskColor,
  getDifficultyColor,
  getStatusColor,
  daysUntil,
  isBookmarked,
  toggleBookmark,
  getOpportunityScore,
  getRecommendation,
  getRecommendationMeta,
} from '../lib/utils';

interface Props {
  airdrop: Airdrop;
  priority?: boolean;
}

function LightweightTrustScoreBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) return null;

  const color =
    score >= 75
      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25'
      : score >= 50
        ? 'text-amber-400 bg-amber-500/10 border-amber-500/25'
        : 'text-rose-400 bg-rose-500/10 border-rose-500/25';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${color}`}>
      <ShieldCheck className="h-3 w-3" />
      {score}
    </span>
  );
}

export default function AirdropCard({ airdrop, priority = false }: Props) {
  const [imgError, setImgError] = useState(false);
  const [bookmarked, setBookmarked] = useState(() => isBookmarked(airdrop.id));

  const days = daysUntil(airdrop.expiry_date);
  const oppScore = getOpportunityScore(airdrop);
  const rec = getRecommendation(oppScore);
  const recMeta = getRecommendationMeta(rec);

  function handleBookmark(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    toggleBookmark(airdrop.id);
    setBookmarked((prev) => !prev);
  }

  return (
    <Link
      to={`/airdrop/${airdrop.slug}`}
      className="glass-card group flex h-full min-w-0 flex-col rounded-2xl p-4 transition-colors duration-200 hover:border-white/10 sm:p-5"
      aria-label={`Open ${airdrop.name} airdrop report`}
    >
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-neon-purple/20 to-neon-blue/20 sm:h-12 sm:w-12">
          {airdrop.logo_url && !imgError ? (
            <img
              src={airdrop.logo_url}
              alt={`${airdrop.name} logo`}
              width={48}
              height={48}
              loading={priority ? 'eager' : 'lazy'}
              decoding="async"
              className="h-full w-full rounded-xl object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <span className="text-lg font-bold gradient-text">
              {airdrop.name.charAt(0)}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex min-w-0 items-center gap-2">
            <h3 className="truncate text-sm font-bold text-white sm:text-base">
              {airdrop.name}
            </h3>

            {airdrop.ticker && (
              <span className="shrink-0 rounded-md border border-neon-purple/20 bg-neon-purple/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-neon-purple/80">
                ${airdrop.ticker}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium', getStatusColor(airdrop.status))}>
              {airdrop.status}
            </span>

            {airdrop.blockchain.slice(0, 2).map((b) => (
              <span
                key={b}
                className="rounded-full border border-white/10 bg-dark-600/60 px-2 py-0.5 text-[10px] text-gray-500"
              >
                {b}
              </span>
            ))}

            {airdrop.blockchain.length > 2 && (
              <span className="rounded-full border border-white/10 bg-dark-600/60 px-2 py-0.5 text-[10px] text-gray-600">
                +{airdrop.blockchain.length - 2}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleBookmark}
          className="flex min-h-[40px] min-w-[40px] shrink-0 items-center justify-center rounded-xl text-gray-600 transition-colors hover:bg-neon-purple/10 hover:text-neon-purple"
          aria-label={bookmarked ? `Remove ${airdrop.name} from bookmarks` : `Bookmark ${airdrop.name}`}
        >
          {bookmarked ? (
            <BookmarkCheck className="h-4 w-4 text-neon-purple" />
          ) : (
            <Bookmark className="h-4 w-4" />
          )}
        </button>
      </div>

      {airdrop.listing_state === 'under_review' && (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
          <span className="text-[11px] font-medium leading-relaxed text-amber-300">
            Under Review — proceed with caution
          </span>
        </div>
      )}

      <p className="mb-4 line-clamp-3 flex-1 text-xs leading-relaxed text-gray-500 sm:line-clamp-2">
        {airdrop.ai_summary || 'Airdrop intelligence report available. Open this listing to review trust, reward, risk and task details.'}
      </p>

      <div className="mb-4 grid grid-cols-2 gap-2">
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
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium', getDifficultyColor(airdrop.difficulty))}>
          {airdrop.difficulty}
        </span>

        <LightweightTrustScoreBadge score={airdrop.trust_score ?? null} />
      </div>

      <div className="mb-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-[10px] uppercase tracking-wider text-gray-600">
            Opportunity
          </span>

          <span className={cn('text-sm font-black tabular-nums', oppScore >= 68 ? 'text-emerald-400' : oppScore >= 45 ? 'text-amber-400' : 'text-rose-400')}>
            {oppScore}
            <span className="text-[10px] font-normal text-gray-600">/100</span>
          </span>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-dark-700">
          <div
            className={cn('h-full rounded-full', oppScore >= 68 ? 'bg-emerald-500' : oppScore >= 45 ? 'bg-amber-500' : 'bg-rose-500')}
            style={{ width: `${Math.max(0, Math.min(100, oppScore))}%` }}
          />
        </div>

        <div className="mt-2 flex justify-end">
          <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold', recMeta.cls)}>
            <span className={cn('inline-block h-1.5 w-1.5 rounded-full', recMeta.dot)} />
            {recMeta.label}
          </span>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/5 pt-3">
        <div className="min-w-0">
          {airdrop.estimated_reward ? (
            <span className="block truncate text-xs font-semibold text-neon-green">
              {airdrop.estimated_reward}
            </span>
          ) : (
            <span className="block text-[10px] text-gray-700">
              Reward TBA
            </span>
          )}
        </div>

        {days !== null && days > 0 ? (
          <div className="flex shrink-0 items-center gap-1 rounded-full border border-white/5 bg-white/[0.03] px-2 py-1 text-[10px] text-gray-500">
            <Clock className="h-3 w-3" />
            {days}d left
          </div>
        ) : (
          <span className="shrink-0 rounded-full border border-white/5 bg-white/[0.03] px-2 py-1 text-[10px] text-gray-600">
            No deadline
          </span>
        )}
      </div>
    </Link>
  );
}
