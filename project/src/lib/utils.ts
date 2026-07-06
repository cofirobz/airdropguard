import type { RiskLevel, RewardPotential, Difficulty, AirdropStatus, Airdrop } from './types';

export type OpportunityType =
  | 'Verified Airdrop'
  | 'Testnet'
  | 'Points Program'
  | 'Speculative Token'
  | 'Scam Alert';

type ListingClassificationInput = Pick<Airdrop, 'category' | 'listing_state' | 'human_verified'>;

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'TBA';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const now = new Date();
  const target = new Date(dateStr);
  const diff = Math.floor((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export function getRewardColor(reward: RewardPotential): string {
  switch (reward) {
    case 'High': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25';
    case 'Medium': return 'text-amber-400 bg-amber-500/10 border-amber-500/25';
    case 'Low': return 'text-gray-400 bg-gray-500/10 border-gray-500/25';
  }
}

export function getRiskColor(risk: RiskLevel): string {
  switch (risk) {
    case 'Low': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25';
    case 'Medium': return 'text-amber-400 bg-amber-500/10 border-amber-500/25';
    case 'High': return 'text-rose-400 bg-rose-500/10 border-rose-500/25';
  }
}

export function getDifficultyColor(difficulty: Difficulty): string {
  switch (difficulty) {
    case 'Easy': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25';
    case 'Moderate': return 'text-amber-400 bg-amber-500/10 border-amber-500/25';
    case 'Hard': return 'text-rose-400 bg-rose-500/10 border-rose-500/25';
  }
}

export function getStatusColor(status: AirdropStatus): string {
  switch (status) {
    case 'Active': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25';
    case 'Ending Soon': return 'text-orange-400 bg-orange-500/10 border-orange-500/25';
    case 'Expired': return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
  }
}

export function getOpportunityType(
  a: ListingClassificationInput,
): OpportunityType {
  const categories = Array.isArray(a.category) ? a.category : [];

  if (a.listing_state === 'scam_alert' || categories.includes('Scam Alert')) return 'Scam Alert';
  if (categories.includes('Speculative Token')) return 'Speculative Token';
  if (categories.includes('Points Program')) return 'Points Program';
  if (categories.includes('Testnet')) return 'Testnet';
  if (categories.includes('Verified Airdrop')) return 'Verified Airdrop';
  if (a.listing_state === 'verified' || a.human_verified) return 'Verified Airdrop';
  return 'Verified Airdrop';
}

export function isScamAlertListing(a: ListingClassificationInput): boolean {
  return getOpportunityType(a) === 'Scam Alert';
}

export function isSpeculativeTokenListing(a: ListingClassificationInput): boolean {
  return getOpportunityType(a) === 'Speculative Token';
}

export function isMainAirdropListing(a: ListingClassificationInput): boolean {
  const type = getOpportunityType(a);
  return type !== 'Speculative Token' && type !== 'Scam Alert';
}

export function resolveListingStateFromCategory(a: ListingClassificationInput): Airdrop['listing_state'] {
  if (isScamAlertListing(a)) return 'scam_alert';
  if (a.listing_state === 'under_review') return 'under_review';
  return 'verified';
}

export function getOpportunityTypeTone(opportunityType: OpportunityType): string {
  switch (opportunityType) {
    case 'Verified Airdrop':
      return 'text-emerald-200 bg-emerald-500/10 border-emerald-500/30';
    case 'Testnet':
      return 'text-sky-200 bg-sky-500/10 border-sky-500/30';
    case 'Points Program':
      return 'text-amber-200 bg-amber-500/10 border-amber-500/30';
    case 'Speculative Token':
      return 'text-rose-100 bg-rose-500/14 border-rose-500/35';
    case 'Scam Alert':
      return 'text-rose-100 bg-rose-600/18 border-rose-400/45';
  }
}

// ─── Bookmarks (localStorage) ─────────────────────────────────────────────────

const BOOKMARKS_KEY = 'airdrop_bookmarks';

export function getBookmarks(): string[] {
  try {
    return JSON.parse(localStorage.getItem(BOOKMARKS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function isBookmarked(id: string): boolean {
  return getBookmarks().includes(id);
}

export function toggleBookmark(id: string): void {
  const bookmarks = getBookmarks();
  const idx = bookmarks.indexOf(id);
  if (idx >= 0) {
    bookmarks.splice(idx, 1);
  } else {
    bookmarks.push(id);
  }
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
}

// ─── Task completions (localStorage) ─────────────────────────────────────────

function completionKey(airdropId: string): string {
  return `completions_${airdropId}`;
}

export function getCompletions(airdropId: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(completionKey(airdropId)) ?? '[]');
  } catch {
    return [];
  }
}

export function toggleCompletion(airdropId: string, taskId: string): void {
  const completions = getCompletions(airdropId);
  const idx = completions.indexOf(taskId);
  if (idx >= 0) {
    completions.splice(idx, 1);
  } else {
    completions.push(taskId);
  }
  localStorage.setItem(completionKey(airdropId), JSON.stringify(completions));
}

export function getCompletionPercent(airdropId: string, taskIds: string[]): number {
  if (taskIds.length === 0) return 0;
  const completions = getCompletions(airdropId);
  const done = taskIds.filter(id => completions.includes(id)).length;
  return Math.round((done / taskIds.length) * 100);
}

// ── Opportunity Intelligence ───────────────────────────────────────────────────

const BLUECHIP_NAMES = new Set([
  'binance', 'coinbase', 'ethereum', 'solana', 'polygon', 'arbitrum',
  'optimism', 'base', 'starknet', 'zksync', 'layerzero', 'uniswap', 'chainlink',
]);

export function isBlueChip(name: string): boolean {
  const n = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return BLUECHIP_NAMES.has(n) || [...BLUECHIP_NAMES].some(b => n.includes(b));
}

export function getOpportunityScore(
  a: Pick<Airdrop, 'trust_score' | 'reward_potential' | 'difficulty' | 'risk_level'>
): number {
  const reward = a.reward_potential === 'High' ? 100 : a.reward_potential === 'Medium' ? 60 : 25;
  const ease   = a.difficulty  === 'Easy'     ? 100 : a.difficulty  === 'Moderate'   ? 50 : 5;
  const safety = a.risk_level  === 'Low'      ? 100 : a.risk_level  === 'Medium'     ? 50 : 5;

  if (a.trust_score !== null && a.trust_score !== undefined) {
    return Math.round(a.trust_score * 0.40 + reward * 0.35 + ease * 0.15 + safety * 0.10);
  }
  return Math.round(reward * 0.55 + ease * 0.25 + safety * 0.20);
}

export type Recommendation = 'act' | 'watch' | 'needs_review' | 'skip';

export function getRecommendation(score: number): Recommendation {
  if (score >= 68) return 'act';
  if (score >= 45) return 'watch';
  return 'skip';
}

export function getAirdropRecommendation(
  a: Pick<Airdrop, 'trust_score' | 'reward_potential' | 'difficulty' | 'risk_level'
    | 'name' | 'human_verified' | 'source' | 'trust_label' | 'expiry_date' | 'estimated_reward'
    | 'status'>
): Recommendation {
  // Expired listings are always skip
  if (a.status === 'Expired') return 'skip';
  const blue = isBlueChip(a.name);
  const rssImport = a.source === 'airdropalert_rss' || a.source === 'airdropsio';
  const missingData = !a.estimated_reward && !a.expiry_date;
  const notVerified = !a.human_verified;

  // Trust AI verdict when available, but protect blue-chip from being skipped
  if (a.trust_label) {
    if (a.trust_label === 'act_now') return 'act';
    if (a.trust_label === 'watch')   return 'watch';
    if (a.trust_label === 'needs_review') return 'needs_review';
    if (a.trust_label === 'skip') {
      return blue && notVerified ? 'needs_review' : 'skip';
    }
  }

  // RSS imports not yet human-verified → needs_review
  if (rssImport && notVerified) return 'needs_review';

  // Missing key data + not verified → needs_review
  if (missingData && notVerified) return 'needs_review';

  // Blue-chip with incomplete data → watch (never skip)
  if (blue && missingData) return 'watch';

  const score = getOpportunityScore(a);
  return getRecommendation(score);
}

export function getRecommendationMeta(rec: Recommendation): { label: string; dot: string; cls: string } {
  switch (rec) {
    case 'act':          return { label: 'Act Now',      dot: 'bg-emerald-400', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25' };
    case 'watch':        return { label: 'Watch',        dot: 'bg-amber-400',   cls: 'text-amber-400 bg-amber-500/10 border-amber-500/25'       };
    case 'needs_review': return { label: 'Needs Review', dot: 'bg-sky-400',     cls: 'text-sky-400 bg-sky-500/10 border-sky-500/25'             };
    case 'skip':         return { label: 'Skip',         dot: 'bg-rose-400',    cls: 'text-rose-400 bg-rose-500/10 border-rose-500/25'          };
  }
}

export function getShouldIBotherSummary(
  a: Pick<Airdrop, 'difficulty' | 'risk_level' | 'reward_potential' | 'trust_score'>,
  rec?: Recommendation,
): string {
  if (rec === 'needs_review') {
    return 'This listing hasn\'t been human-verified yet. Key details like reward amount or deadline may still be missing — check back after admin review.';
  }
  const effort = a.difficulty    === 'Easy'   ? 'Low effort'      : a.difficulty    === 'Moderate' ? 'Moderate effort'       : 'High effort';
  const risk   = a.risk_level    === 'Low'    ? 'low risk'        : a.risk_level    === 'Medium'   ? 'moderate risk'         : 'elevated risk';
  const reward = a.reward_potential === 'High'   ? 'strong reward potential'
               : a.reward_potential === 'Medium' ? 'moderate reward potential'
               : 'limited reward potential';
  const trust  = a.trust_score !== null && a.trust_score !== undefined
    ? a.trust_score >= 75 ? ', and strong project fundamentals'
    : a.trust_score >= 50 ? ', and reasonable project fundamentals'
    : ', but weaker project fundamentals'
    : '';
  return `${effort}, ${risk}, ${reward}${trust}.`;
}

export function getWhyWeLikeIt(a: Airdrop): string[] {
  const pros: string[] = [];
  if (a.human_verified)                             pros.push('Human verified by AirdropGuard');
  if (isBlueChip(a.name))                           pros.push('Blue-chip project with strong credibility');
  if (a.trust_score !== null && a.trust_score !== undefined && a.trust_score >= 75)
    pros.push(`High trust score (${a.trust_score}/100)`);
  if (a.reward_potential === 'High')  pros.push('Strong reward potential');
  if (a.risk_level       === 'Low')   pros.push('Low risk profile');
  if (a.difficulty       === 'Easy')  pros.push('Simple to participate — minimal time required');
  if (a.github_url)                   pros.push('Open-source development');
  if (a.is_trending)                  pros.push('Trending in the community');
  if (a.is_featured)                  pros.push("Editor's pick");
  if (a.estimated_reward)             pros.push('Clear reward estimate published');
  return pros;
}

export function getThingsToConsider(a: Airdrop): string[] {
  const cons: string[] = [];
  if (!a.human_verified && (a.source === 'airdropalert_rss' || a.source === 'airdropsio'))
    cons.push('Imported listing — awaiting human review');
  if (a.risk_level   === 'High') cons.push('Elevated risk level');
  if (a.difficulty   === 'Hard') cons.push('Complex requirements — high time investment');
  if (a.reward_potential === 'Low') cons.push('Lower reward potential');
  if (a.trust_score !== null && a.trust_score !== undefined && a.trust_score < 50)
    cons.push(`Below-average trust score (${a.trust_score}/100)`);
  if (!a.github_url)            cons.push('No public GitHub repository');
  if (!a.estimated_reward)      cons.push('Reward amount not yet confirmed');
  if (!a.expiry_date)           cons.push('No deadline set');
  if (a.status === 'Ending Soon') cons.push('Ending soon — limited time to act');
  return cons;
}
