import type { RiskLevel, RewardPotential, Difficulty, AirdropStatus, Airdrop, OpportunityTypeKey, PastDistributionStatusKey } from './types';

export type OpportunityType =
  | 'Confirmed Airdrop'
  | 'Potential Airdrop'
  | 'Points Program'
  | 'Rewards Program'
  | 'Testnet'
  | 'Speculative Token'
  | 'Scam Alert';

type ListingClassificationInput = Pick<Airdrop, 'category' | 'listing_state' | 'human_verified' | 'opportunity_type'>;

const PAST_DISTRIBUTION_STATUS_LABELS: Record<PastDistributionStatusKey, string> = {
  none: 'None',
  confirmed_past_airdrop: 'Past Airdrop Confirmed',
  claim_live: 'Claim Live',
  claim_ended: 'Claim Ended',
  distribution_complete: 'Distribution Complete',
};

const OPPORTUNITY_TYPE_LABELS: Record<OpportunityTypeKey, OpportunityType> = {
  confirmed_airdrop: 'Confirmed Airdrop',
  potential_airdrop: 'Potential Airdrop',
  points_program: 'Points Program',
  rewards_program: 'Rewards Program',
  testnet: 'Testnet',
  scam_alert: 'Scam Alert',
};

const OPPORTUNITY_TYPE_BANNERS: Record<OpportunityType, string> = {
  'Confirmed Airdrop': 'Token or airdrop has been officially confirmed. Verify contract details before interacting.',
  'Potential Airdrop': 'No token or claim may exist yet. This is based on ecosystem activity and community expectations.',
  'Points Program': 'Users currently earn points or credits that may or may not convert into future rewards.',
  'Rewards Program': 'This is an ongoing rewards or incentives programme, not necessarily a new airdrop.',
  Testnet: 'This opportunity is based on testnet activity. Rewards are not guaranteed.',
  'Scam Alert': 'This listing has been flagged as suspicious or dangerous. Do not connect your main wallet.',
  'Speculative Token': 'This is a speculative token listing. Review token risk, liquidity and contract details carefully.',
};

function normalizeOpportunityTypeValue(value: unknown): OpportunityType | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!normalized) return null;

  if (normalized in OPPORTUNITY_TYPE_LABELS) {
    return OPPORTUNITY_TYPE_LABELS[normalized as OpportunityTypeKey];
  }

  switch (normalized) {
    case 'Confirmed Airdrop':
    case 'Potential Airdrop':
    case 'Points Program':
    case 'Rewards Program':
    case 'Testnet':
    case 'Speculative Token':
    case 'Scam Alert':
      return normalized as OpportunityType;
    case 'Verified Airdrop':
      return 'Confirmed Airdrop';
    default:
      return null;
  }
}

export function getOpportunityTypeKey(a: ListingClassificationInput): OpportunityTypeKey | null {
  const rawType = normalizeOpportunityTypeValue(a.opportunity_type);
  if (rawType) {
    switch (rawType) {
      case 'Confirmed Airdrop': return 'confirmed_airdrop';
      case 'Potential Airdrop': return 'potential_airdrop';
      case 'Points Program': return 'points_program';
      case 'Rewards Program': return 'rewards_program';
      case 'Testnet': return 'testnet';
      case 'Scam Alert': return 'scam_alert';
      case 'Speculative Token': return null;
    }
  }

  const categories = Array.isArray(a.category) ? a.category : [];

  if (a.listing_state === 'scam_alert' || categories.includes('Scam Alert')) return 'scam_alert';
  if (categories.includes('Points Program')) return 'points_program';
  if (categories.includes('Testnet')) return 'testnet';
  if (categories.includes('Verified Airdrop')) return 'confirmed_airdrop';
  return null;
}

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

  if (categories.includes('Speculative Token')) return 'Speculative Token';

  const key = getOpportunityTypeKey(a);
  if (key) return OPPORTUNITY_TYPE_LABELS[key];

  if (a.listing_state === 'verified' || a.human_verified) return 'Confirmed Airdrop';
  return 'Potential Airdrop';
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
  const normalized = normalizeOpportunityTypeValue(opportunityType) ?? opportunityType;

  switch (normalized) {
    case 'Confirmed Airdrop':
      return 'text-emerald-200 bg-emerald-500/10 border-emerald-500/30';
    case 'Potential Airdrop':
      return 'text-amber-100 bg-amber-500/10 border-amber-500/30';
    case 'Testnet':
      return 'text-cyan-100 bg-cyan-500/10 border-cyan-500/30';
    case 'Points Program':
      return 'text-sky-100 bg-sky-500/10 border-sky-500/30';
    case 'Rewards Program':
      return 'text-violet-100 bg-violet-500/10 border-violet-500/30';
    case 'Scam Alert':
      return 'text-rose-100 bg-rose-600/18 border-rose-400/45';
    case 'Speculative Token':
      return 'text-rose-100 bg-rose-500/14 border-rose-500/35';
  }
}

export function getOpportunityTypeBannerCopy(opportunityType: OpportunityType): string {
  return OPPORTUNITY_TYPE_BANNERS[normalizeOpportunityTypeValue(opportunityType) ?? opportunityType] ?? OPPORTUNITY_TYPE_BANNERS['Potential Airdrop'];
}

export function getOpportunityScoreLabel(opportunityType: OpportunityType): string {
  switch (normalizeOpportunityTypeValue(opportunityType) ?? opportunityType) {
    case 'Confirmed Airdrop': return 'Trust Score';
    case 'Potential Airdrop': return 'Confidence Score';
    case 'Points Program': return 'Reward Confidence';
    case 'Rewards Program': return 'Programme Confidence';
    case 'Testnet': return 'Testnet Confidence';
    case 'Scam Alert': return 'Risk Score';
    case 'Speculative Token': return 'Risk Score';
  }
}

export function getPastDistributionStatusKey(value: unknown): PastDistributionStatusKey {
  if (typeof value !== 'string') return 'none';
  const normalized = value.trim();
  switch (normalized) {
    case 'confirmed_past_airdrop':
    case 'claim_live':
    case 'claim_ended':
    case 'distribution_complete':
      return normalized;
    default:
      return 'none';
  }
}

export function getPastDistributionStatusLabel(value: unknown): string {
  const key = getPastDistributionStatusKey(value);
  return PAST_DISTRIBUTION_STATUS_LABELS[key];
}

export function getPastDistributionStatusTone(value: unknown): string {
  const key = getPastDistributionStatusKey(value);
  switch (key) {
    case 'confirmed_past_airdrop':
      return 'text-cyan-100 bg-cyan-500/10 border-cyan-500/30';
    case 'claim_live':
      return 'text-emerald-100 bg-emerald-500/10 border-emerald-500/30';
    case 'claim_ended':
      return 'text-amber-100 bg-amber-500/10 border-amber-500/30';
    case 'distribution_complete':
      return 'text-violet-100 bg-violet-500/10 border-violet-500/30';
    case 'none':
    default:
      return 'text-gray-300 bg-white/[0.04] border-white/10';
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
