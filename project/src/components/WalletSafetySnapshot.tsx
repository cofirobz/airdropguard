import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Shield, Search, Loader2, CheckCircle2, XCircle, Info,
  AlertTriangle, Coins, Activity, Wallet, Target,
  Fingerprint, Sparkles, Network, ListChecks,
  Gauge, ShieldAlert, Database, Trophy, Crown, TrendingUp,
  BarChart3, Wand2, Eye,
  Skull, HelpCircle, ShieldQuestion,
  ClipboardCheck, BadgeCheck, ChevronDown, Globe2, History, ArrowUpRight, ArrowDownRight, CalendarCheck2, Repeat2, ShieldCheck, Flame,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

type RiskLevel = 'Low' | 'Medium' | 'High';
interface TokenRisk { level: RiskLevel; reason: string; action: string; source: string }
interface Token { address: string; name: string; symbol: string; balance: number; usdValue: number | null; risk: TokenRisk | null }
interface ChainBalance { chainId: string; goplusChainId?: string; name: string; symbol: string; balance: number; usdValue: number | null; error: boolean }
interface WalletFinding { severity: RiskLevel; title: string; detail: string; action: string; source: string }
interface WalletResult {
  address: string; chain: 'ethereum' | 'solana'; nativeBalance: number; nativeUsdValue: number | null; txCount: number | null;
  tokens: Token[]; totalUsdValue: number | null; chainBalances: ChainBalance[]; activityLevel: 'Inactive' | 'Low' | 'Moderate' | 'Active' | 'Highly Active';
  walletHealthScore: number; airdropReadinessScore: number; riskExposureScore: number; activityQualityScore: number; multiChainScore: number; tokenHygieneScore: number;
  walletGrade: 'A' | 'B' | 'C' | 'D'; walletIq?: number; walletPersona: string; confidence: number; summary: string; findings: WalletFinding[];
  indicators: { label: string; pass: boolean; detail: string }[]; recommendations: string[];
  goplus: { enabled: boolean; checkedApis: string[]; unavailableApis: string[]; maliciousAddress: Record<string, unknown> | null; approvalSecurity: Record<string, unknown> | null; tokenSecurityChecked: number };
  reasoning?: {
    behaviouralQuality: string;
    decisionConfidence: number;
    evidence: string[];
    uncertainty: string;
    recommendedAction: string;
    falsePositiveRisk: string;
  };
}

interface WalletScanHistory {
  id: string;
  wallet_address: string;
  chain_id: string;
  wallet_grade: 'A' | 'B' | 'C' | 'D' | null;
  wallet_iq: number | null;
  wallet_health_score: number | null;
  risk_exposure_score: number | null;
  activity_quality_score: number | null;
  token_hygiene_score: number | null;
  airdrop_readiness_score: number | null;
  portfolio_value: number | null;
  scam_tokens: number | null;
  dead_tokens: number | null;
  wallet_persona: string | null;
  created_at: string;
}

interface ReputationReward {
  awarded: boolean;
  repAwarded: number;
  reasons: string[];
  level: number;
  previousLevel: number;
  nextUnlock: string | null;
}

const NEVER_ITEMS = ['Wallet Connections', 'WalletConnect', 'Signatures', 'Approvals', 'Transactions'];
const ACTIVITY_COLOR: Record<WalletResult['activityLevel'], string> = { Inactive: 'text-gray-500', Low: 'text-amber-400', Moderate: 'text-sky-400', Active: 'text-emerald-400', 'Highly Active': 'text-emerald-400' };
const RISK_STYLES: Record<RiskLevel, { badge: string; border: string }> = {
  Low: { badge: 'text-sky-400 bg-sky-500/10 border-sky-500/25', border: 'border-sky-500/15' },
  Medium: { badge: 'text-amber-400 bg-amber-500/10 border-amber-500/25', border: 'border-amber-500/15' },
  High: { badge: 'text-rose-400 bg-rose-500/10 border-rose-500/25', border: 'border-rose-500/20' },
};

type SupportedChainId = '1' | '56' | '8453' | '42161' | '10' | '137' | 'solana';

const SUPPORTED_CHAINS: {
  id: SupportedChainId;
  name: string;
  short: string;
  native: string;
  family: 'evm' | 'solana';
  focus: string;
}[] = [
  { id: '1', name: 'Ethereum', short: 'ETH', native: 'ETH', family: 'evm', focus: 'Mainnet history, ERC-20 tokens and approvals' },
  { id: '56', name: 'BNB Chain', short: 'BNB', native: 'BNB', family: 'evm', focus: 'BNB holdings, BEP-20 tokens and approval exposure' },
  { id: '8453', name: 'Base', short: 'Base', native: 'ETH', family: 'evm', focus: 'Base activity and L2 readiness' },
  { id: '42161', name: 'Arbitrum', short: 'ARB', native: 'ETH', family: 'evm', focus: 'Arbitrum activity and L2 farming signals' },
  { id: '10', name: 'Optimism', short: 'OP', native: 'ETH', family: 'evm', focus: 'Optimism activity and ecosystem signals' },
  { id: '137', name: 'Polygon', short: 'POL', native: 'POL', family: 'evm', focus: 'Polygon activity and low-cost interaction history' },
  { id: 'solana', name: 'Solana', short: 'SOL', native: 'SOL', family: 'solana', focus: 'SOL balance and Solana wallet profile' },
];

function getChainMeta(chainId: SupportedChainId) {
  return SUPPORTED_CHAINS.find(chain => chain.id === chainId) ?? SUPPORTED_CHAINS[0];
}

function detectChainFromAddress(address: string): SupportedChainId {
  return address.trim().startsWith('0x') ? '1' : 'solana';
}

function fmtUsd(n: number): string { if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`; if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`; return `$${n.toFixed(2)}`; }
function truncateAddr(s: string): string { return s.length <= 16 ? s : `${s.slice(0, 10)}...${s.slice(-8)}`; }
function fmtDateTime(s: string): string {
  return new Date(s).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function scoreDelta(current?: number | null, previous?: number | null): number | null {
  if (typeof current !== 'number' || typeof previous !== 'number') return null;
  return current - previous;
}
function DeltaPill({ value, invert = false }: { value: number | null; invert?: boolean }) {
  if (value === null || value === 0) return <span className="text-[10px] text-gray-600">No change</span>;
  const positive = invert ? value < 0 : value > 0;
  const Icon = value > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold rounded-full border px-2 py-0.5', positive ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20')}>
      <Icon className="w-3 h-3" />
      {value > 0 ? '+' : ''}{value}
    </span>
  );
}

function changeSummary(delta: number | null, label: string, invert = false): string {
  if (delta === null) return `${label} will compare after your next saved scan.`;
  if (delta === 0) return `${label} stayed the same since the previous scan.`;
  const improved = invert ? delta < 0 : delta > 0;
  return improved
    ? `${label} improved by ${Math.abs(delta)} point${Math.abs(delta) !== 1 ? 's' : ''}.`
    : `${label} moved the wrong way by ${Math.abs(delta)} point${Math.abs(delta) !== 1 ? 's' : ''}.`;
}

function getEvolutionVerdict(delta: { iq: number | null; health: number | null; readiness: number | null; risk: number | null }): { title: string; detail: string; tone: string } {
  const positives = [
    (delta.iq ?? 0) > 0,
    (delta.health ?? 0) > 0,
    (delta.readiness ?? 0) > 0,
    (delta.risk ?? 0) < 0,
  ].filter(Boolean).length;

  if (delta.iq === null && delta.health === null && delta.readiness === null && delta.risk === null) {
    return {
      title: 'Start your wallet timeline',
      detail: 'This is the first saved report found for this wallet. Scan again later to unlock comparison, progress and trend insights.',
      tone: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    };
  }

  if (positives >= 3) {
    return {
      title: 'Wallet profile is improving',
      detail: 'Your latest scan shows better overall signals compared with the previous saved report.',
      tone: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    };
  }

  if (positives <= 1) {
    return {
      title: 'Wallet needs attention',
      detail: 'Your latest scan did not show strong improvement. Review risks, token hygiene and recommended actions.',
      tone: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    };
  }

  return {
    title: 'Mixed wallet changes',
    detail: 'Some areas improved while others need work. Use the action plan below to strengthen your profile.',
    tone: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  };
}

function trendWidth(value: number | null | undefined): number {
  if (typeof value !== 'number') return 0;
  return Math.max(4, Math.min(100, value));
}

interface WalletPlanItem {
  day: string;
  title: string;
  detail: string;
  impact: string;
  difficulty: 'Easy' | 'Medium' | 'Careful';
  category: 'Security' | 'Readiness' | 'Activity' | 'Hygiene' | 'Review';
}

function getWalletPlan(
  result: WalletResult,
  suspiciousCount: number,
  unknownCount: number,
  chainReadiness: { name: string; score: number; note: string }[],
): WalletPlanItem[] {
  const plan: WalletPlanItem[] = [];

  if (result.riskExposureScore >= 40 || result.findings.length > 0 || suspiciousCount > 0) {
    plan.push({
      day: 'Day 1',
      title: 'Review wallet risk before new farming',
      detail: suspiciousCount > 0
        ? `Review ${suspiciousCount} suspicious asset${suspiciousCount !== 1 ? 's' : ''} and avoid interacting with them.`
        : 'Open the Security tab and review every visible risk finding before using this wallet for new campaigns.',
      impact: '+ safety',
      difficulty: 'Careful',
      category: 'Security',
    });
  } else {
    plan.push({
      day: 'Day 1',
      title: 'Keep your clean wallet habits',
      detail: 'No major visible risk was found. Keep avoiding unknown signatures, random token links and unlimited approvals.',
      impact: '+ protection',
      difficulty: 'Easy',
      category: 'Security',
    });
  }

  if (result.multiChainScore < 55 && result.chain !== 'solana') {
    const missing = chainReadiness
      .filter(c => c.score < 50)
      .slice(0, 2)
      .map(c => c.name)
      .join(' or ');

    plan.push({
      day: 'Day 2',
      title: 'Build multi-chain history',
      detail: missing
        ? `Consider small, genuine activity on ${missing}. Do not force activity; only use protocols you understand.`
        : 'Add small, genuine activity on one relevant L2 or ecosystem you actually use.',
      impact: '+ readiness',
      difficulty: 'Medium',
      category: 'Readiness',
    });
  }

  if ((result.txCount ?? 0) < 20 || result.activityQualityScore < 60) {
    plan.push({
      day: 'Day 3',
      title: 'Improve activity quality',
      detail: 'Build natural transaction history over time. A few useful actions are better than rushed repetitive farming.',
      impact: '+ activity',
      difficulty: 'Medium',
      category: 'Activity',
    });
  }

  if (unknownCount > 0 || result.tokenHygieneScore < 80) {
    plan.push({
      day: 'Day 4',
      title: 'Clean up token hygiene',
      detail: unknownCount > 0
        ? `You have ${unknownCount} dead, unknown or unpriced token${unknownCount !== 1 ? 's' : ''}. Treat them as noise unless verified elsewhere.`
        : 'Keep token hygiene high by avoiding random claim links and unknown token websites.',
      impact: '+ hygiene',
      difficulty: 'Easy',
      category: 'Hygiene',
    });
  }

  if (result.airdropReadinessScore < 70) {
    plan.push({
      day: 'Day 5',
      title: 'Strengthen airdrop-readiness signals',
      detail: 'Focus on useful ecosystem participation: bridge, swap, vote, test, mint or use apps only where you understand the risk.',
      impact: '+ readiness',
      difficulty: 'Medium',
      category: 'Readiness',
    });
  }

  plan.push({
    day: 'Day 6',
    title: 'Check your tracked airdrops',
    detail: 'Open your dashboard and prioritise airdrops with deadlines, incomplete tasks and strong project quality.',
    impact: '+ focus',
    difficulty: 'Easy',
    category: 'Review',
  });

  plan.push({
    day: 'Day 7',
    title: 'Re-scan and compare progress',
    detail: 'Come back to AirdropGuard after real wallet activity. Your Evolution tab will show what changed.',
    impact: '+ habit',
    difficulty: 'Easy',
    category: 'Review',
  });

  return plan.slice(0, 7);
}

function getEstimatedImprovement(result: WalletResult, plan: WalletPlanItem[]) {
  const readinessBoost = Math.min(12, plan.filter(p => p.category === 'Readiness').length * 4 + (result.airdropReadinessScore < 50 ? 4 : 0));
  const healthBoost = Math.min(8, plan.filter(p => p.category === 'Security' || p.category === 'Hygiene').length * 3);
  const riskDrop = Math.min(15, result.riskExposureScore >= 40 ? 10 : 4);
  const iqBoost = Math.min(10, Math.round((readinessBoost + healthBoost + riskDrop) / 3));

  return {
    iq: iqBoost,
    readiness: readinessBoost,
    health: healthBoost,
    risk: riskDrop,
  };
}

function planTone(category: WalletPlanItem['category']): string {
  if (category === 'Security') return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  if (category === 'Readiness') return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
  if (category === 'Activity') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  if (category === 'Hygiene') return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  return 'text-neon-purple bg-neon-purple/10 border-neon-purple/20';
}

function getRewardMessage(reward: ReputationReward | null): string {
  if (!reward) return 'Log in and scan weekly to build your AirdropGuard Reputation.';
  if (reward.repAwarded > 0) return `+${reward.repAwarded} REP earned`;
  return 'Scan saved. Weekly REP is limited to reduce farming.';
}

function scoreTone(score: number): string { if (score >= 80) return 'text-emerald-400'; if (score >= 60) return 'text-sky-400'; if (score >= 35) return 'text-amber-400'; return 'text-rose-400'; }
function scoreBar(score: number): string { if (score >= 80) return 'bg-emerald-500'; if (score >= 60) return 'bg-sky-500'; if (score >= 35) return 'bg-amber-500'; return 'bg-rose-500'; }
function riskTone(score: number): string { if (score >= 70) return 'text-rose-400'; if (score >= 40) return 'text-amber-400'; return 'text-emerald-400'; }
function riskBar(score: number): string { if (score >= 70) return 'bg-rose-500'; if (score >= 40) return 'bg-amber-500'; return 'bg-emerald-500'; }

function ScoreBar({ label, score, invert = false }: { label: string; score: number; invert?: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold">{label}</span>
        <span className={cn('text-[10px] font-bold', invert ? riskTone(score) : scoreTone(score))}>{score}/100</span>
      </div>
      <div className="h-1.5 rounded-full bg-dark-700 overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-700', invert ? riskBar(score) : scoreBar(score))} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function getWalletIQ(result: WalletResult): number {
  return Math.max(
    1,
    Math.min(
      99,
      Math.round(
        result.walletHealthScore * 0.32 +
        result.airdropReadinessScore * 0.28 +
        result.activityQualityScore * 0.16 +
        result.tokenHygieneScore * 0.14 +
        (100 - result.riskExposureScore) * 0.10,
      ),
    ),
  );
}

function getPercentile(iq: number): string {
  if (iq >= 90) return 'Top 5%';
  if (iq >= 80) return 'Top 12%';
  if (iq >= 70) return 'Top 25%';
  if (iq >= 55) return 'Above average';
  if (iq >= 40) return 'Developing';
  return 'Early stage';
}

function getCoachVerdict(result: WalletResult): { title: string; detail: string; boost: string } {
  if (result.riskExposureScore >= 70 || result.findings.some(f => f.severity === 'High')) {
    return {
      title: 'Reduce risk before farming',
      detail: 'This wallet has elevated risk exposure. Review suspicious assets, approvals and warning signals before using it for new campaigns.',
      boost: '+ security',
    };
  }

  if (result.airdropReadinessScore < 35) {
    return {
      title: 'Build genuine history',
      detail: 'This wallet has limited visible activity. Focus on real, useful on-chain activity over time rather than rushed farming behaviour.',
      boost: '+ readiness',
    };
  }

  if (result.multiChainScore < 35 && result.chain === 'ethereum') {
    return {
      title: 'Improve chain diversity',
      detail: 'Your wallet appears concentrated on one chain. Some campaigns value consistent activity across relevant ecosystems.',
      boost: '+ chain score',
    };
  }

  if (result.walletHealthScore >= 75 && result.riskExposureScore < 40) {
    return {
      title: 'Strong wallet profile',
      detail: 'This wallet has positive visible signals. Keep activity natural, avoid suspicious tokens and re-check weekly for changes.',
      boost: '+ tracking',
    };
  }

  return {
    title: 'Good foundation',
    detail: 'This wallet has useful public signals, but there are still areas to improve across activity, readiness or security hygiene.',
    boost: '+ improvement',
  };
}

function getAchievements(result: WalletResult): { label: string; unlocked: boolean; detail: string }[] {
  return [
    { label: 'First Scan', unlocked: true, detail: 'Wallet analysed by AirdropGuard' },
    { label: 'Healthy Wallet', unlocked: result.walletHealthScore >= 70, detail: 'Health score above 70' },
    { label: 'Clean Hygiene', unlocked: result.tokenHygieneScore >= 80, detail: 'Low suspicious token exposure' },
    { label: 'Active User', unlocked: (result.txCount ?? 0) >= 20, detail: 'Meaningful transaction history' },
    { label: 'Airdrop Ready', unlocked: result.airdropReadinessScore >= 60, detail: 'Strong readiness profile' },
    { label: 'Low Risk', unlocked: result.riskExposureScore < 40, detail: 'Low visible risk exposure' },
  ];
}

function getChainReadiness(result: WalletResult): { name: string; score: number; note: string }[] {
  if (result.chain === 'solana') {
    return [{ name: 'Solana', score: result.airdropReadinessScore, note: result.nativeBalance > 0 ? 'Funded wallet' : 'No visible balance' }];
  }

  const base = result.airdropReadinessScore;
  const chains = result.chainBalances.length > 0 ? result.chainBalances : [
    { chainId: 'ethereum', name: 'Ethereum', balance: result.nativeBalance, error: false } as ChainBalance,
  ];

  return chains.slice(0, 6).map(chain => {
    const hasBalance = !chain.error && chain.balance > 0;
    const score = Math.max(8, Math.min(96, Math.round((hasBalance ? base : base * 0.35) + (hasBalance ? 8 : -8))));
    return {
      name: chain.name,
      score,
      note: hasBalance ? 'Activity signal found' : 'Needs activity',
    };
  });
}

function isUnknownOrDeadToken(token: Token): boolean {
  const name = `${token.name || ''} ${token.symbol || ''}`.toLowerCase();
  const hasNoPrice = token.usdValue === null || token.usdValue <= 0;
  const looksUnknown =
    name.includes('unknown') ||
    token.symbol === '???' ||
    token.name.trim() === '' ||
    token.symbol.trim() === '';

  return Boolean(!token.risk && hasNoPrice && (looksUnknown || token.balance > 0));
}

function getUnknownTokenReason(token: Token): string {
  const name = `${token.name || ''} ${token.symbol || ''}`.toLowerCase();

  if (name.includes('unknown') || token.symbol === '???') {
    return 'The scan could not verify a reliable token identity.';
  }

  if (token.usdValue === null) {
    return 'No reliable price data was returned for this token.';
  }

  if (token.usdValue <= 0) {
    return 'The token currently has no visible USD value from available data.';
  }

  return 'Token could not be confidently classified by this scan.';
}

function getProfessionalSignals(result: WalletResult, suspiciousCount: number, unknownCount: number) {
  return [
    {
      label: 'Security Review',
      value: result.findings.length > 0 ? `${result.findings.length} finding${result.findings.length !== 1 ? 's' : ''}` : 'No major findings',
      icon: ShieldQuestion,
      tone: result.findings.length > 0 ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      label: 'Dead / Unknown Tokens',
      value: `${unknownCount}`,
      icon: Skull,
      tone: unknownCount > 0 ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      label: 'Suspicious Assets',
      value: `${suspiciousCount}`,
      icon: AlertTriangle,
      tone: suspiciousCount > 0 ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      label: 'Decision Quality',
      value: result.confidence >= 70 ? 'Higher' : result.confidence >= 45 ? 'Medium' : 'Limited',
      icon: ClipboardCheck,
      tone: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    },
  ];
}

function getPortfolioProfile(result: WalletResult, cleanCount: number, unknownCount: number, suspiciousCount: number) {
  const totalTokens = result.tokens.length;
  const pricedTokens = result.tokens.filter(t => (t.usdValue ?? 0) > 0).length;

  return [
    { label: 'Total tokens', value: `${totalTokens}`, detail: 'Assets returned by available providers' },
    { label: 'Priced assets', value: `${pricedTokens}`, detail: 'Tokens with visible USD value' },
    { label: 'Clean holdings', value: `${cleanCount}`, detail: 'No obvious warning from current scan' },
    { label: 'Needs review', value: `${unknownCount + suspiciousCount}`, detail: 'Unknown, dead, suspicious or unpriced assets' },
  ];
}

type ExposureRiskBucket = 'low' | 'medium' | 'high' | 'unknown';

type SpeculativeExposureProfile = {
  overallExposureScore: number;
  speculativePercent: number | null;
  speculativeCount: number;
  highestRiskHolding: Token | null;
  estimatedRugExposure: number | null;
  concentrationRisk: 'Low' | 'Medium' | 'High' | 'Unknown';
  unknownTokens: number;
  recentlyCreatedTokens: number;
  dormantTokens: number;
  riskDistribution: Record<ExposureRiskBucket, number>;
  portfolioBreakdown: { speculative: number; core: number; unknown: number };
  topRiskAssets: Token[];
  summary: string;
  recommendations: string[];
};

function riskWeight(level: RiskLevel): number {
  if (level === 'High') return 3;
  if (level === 'Medium') return 2;
  return 1;
}

function holdingRiskScore(token: Token): number {
  const base = token.risk ? riskWeight(token.risk.level) * 25 : 20;
  const valueBoost = token.usdValue && token.usdValue > 0 ? Math.min(25, Math.log10(token.usdValue + 1) * 6) : 6;
  const reasonBoost = token.risk?.reason && /rug|honeypot|scam|drainer|malicious/i.test(token.risk.reason) ? 18 : 0;
  return Math.round(base + valueBoost + reasonBoost);
}

function getSpeculativeExposureProfile(
  result: WalletResult,
  suspiciousTokens: Token[],
  deadOrUnknownTokens: Token[],
): SpeculativeExposureProfile {
  const finite = (value: number | null | undefined): number | null => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    return value;
  };

  const tokenList = result.tokens ?? [];
  const speculativeSet = new Set<string>();
  suspiciousTokens.forEach(t => speculativeSet.add(t.address));
  deadOrUnknownTokens.forEach(t => speculativeSet.add(t.address));

  const speculativeTokens = tokenList.filter(t => speculativeSet.has(t.address));
  const speculativeCount = speculativeTokens.length;
  const totalPortfolioValue = finite(result.totalUsdValue);
  const speculativeValue = speculativeTokens.reduce((sum, token) => {
    const usd = finite(token.usdValue);
    return sum + Math.max(0, usd ?? 0);
  }, 0);
  const speculativePercent = totalPortfolioValue !== null && totalPortfolioValue > 0
    ? Math.max(0, Math.min(100, (speculativeValue / totalPortfolioValue) * 100))
    : null;

  const unknownTokens = deadOrUnknownTokens.length;
  const dormantTokens = deadOrUnknownTokens.filter(t => (t.usdValue ?? 0) <= 0).length;
  const recentlyCreatedTokens = speculativeTokens.filter(t => {
    const reason = `${t.risk?.reason ?? ''} ${t.risk?.action ?? ''}`.toLowerCase();
    return /new|recent|created|deploy|launch|fresh|pair age/i.test(reason);
  }).length;

  const riskDistribution: Record<ExposureRiskBucket, number> = { low: 0, medium: 0, high: 0, unknown: 0 };
  speculativeTokens.forEach((token) => {
    if (!token.risk) {
      riskDistribution.unknown += 1;
      return;
    }
    if (token.risk.level === 'High') riskDistribution.high += 1;
    else if (token.risk.level === 'Medium') riskDistribution.medium += 1;
    else riskDistribution.low += 1;
  });

  const topRiskAssets = [...speculativeTokens]
    .sort((a, b) => holdingRiskScore(b) - holdingRiskScore(a))
    .slice(0, 5);

  const highestRiskHolding = topRiskAssets[0] ?? null;
  const highestRiskUsd = finite(highestRiskHolding?.usdValue);
  const highestValueShare = speculativeValue > 0 && highestRiskUsd !== null
    ? ((highestRiskHolding?.usdValue ?? 0) / speculativeValue) * 100
    : null;

  const concentrationRisk = highestValueShare === null
    ? 'Unknown'
    : highestValueShare >= 60
    ? 'High'
    : highestValueShare >= 35
    ? 'Medium'
    : 'Low';

  const rugSignals = speculativeTokens.filter(t => /rug|honeypot|drainer|scam/i.test(`${t.risk?.reason ?? ''} ${t.risk?.action ?? ''}`)).length;
  const estimatedRugExposure = speculativePercent === null
    ? null
    : Math.max(0, Math.min(100,
      Math.round(
        speculativePercent * 0.45 +
        riskDistribution.high * 9 +
        riskDistribution.medium * 4 +
        rugSignals * 8 +
        (concentrationRisk === 'High' ? 12 : concentrationRisk === 'Medium' ? 6 : 0),
      ),
    ));

  const overallExposureScore = Math.max(0, Math.min(100,
    Math.round(
      (speculativePercent ?? 0) * 0.5 +
      (estimatedRugExposure ?? 0) * 0.3 +
      unknownTokens * 2 +
      dormantTokens * 1.5,
    ),
  ));

  const portfolioBreakdown = {
    speculative: speculativeCount,
    unknown: unknownTokens,
    core: Math.max(0, tokenList.length - speculativeCount),
  };

  const exposureLabel = overallExposureScore >= 70 ? 'high' : overallExposureScore >= 45 ? 'moderate' : 'low';
  const highRiskPct = speculativeCount > 0 ? Math.round((riskDistribution.high / speculativeCount) * 100) : 0;
  const valueVisibilityLine = speculativePercent === null
    ? 'Visible portfolio USD data is limited, so value-weighted speculative percentage is currently unavailable.'
    : `Approximately ${Math.round(speculativePercent)}% of visible value is tied to speculative assets.`;
  const summary = `Your wallet has ${exposureLabel} speculative exposure. ${valueVisibilityLine} ${highRiskPct}% of speculative holdings are flagged as high risk.${recentlyCreatedTokens > 0 ? ` ${recentlyCreatedTokens} potentially recently created token${recentlyCreatedTokens !== 1 ? 's show' : ' shows'} elevated uncertainty.` : ''}`;

  const recommendations: string[] = [];
  if (concentrationRisk !== 'Low') recommendations.push('Reduce concentration in your largest speculative position.');
  if ((estimatedRugExposure ?? 0) >= 50) recommendations.push('Check RugCheck before interacting with high-risk tokens.');
  if ((speculativePercent ?? 0) >= 25) recommendations.push('Review liquidity depth before new entries or exits.');
  if (unknownTokens > 0) recommendations.push('Verify contract addresses and token identity from official sources.');
  if (result.findings.some(f => /approval|permission|signature/i.test(`${f.title} ${f.detail}`))) recommendations.push('Revoke unnecessary approvals to reduce exploit surface.');
  if (overallExposureScore >= 65) recommendations.push('Move speculative activity to a burner wallet separated from primary funds.');
  if (recommendations.length === 0) recommendations.push('Maintain current discipline and re-scan weekly to monitor speculative drift.');

  return {
    overallExposureScore,
    speculativePercent,
    speculativeCount,
    highestRiskHolding,
    estimatedRugExposure,
    concentrationRisk,
    unknownTokens,
    recentlyCreatedTokens,
    dormantTokens,
    riskDistribution,
    portfolioBreakdown,
    topRiskAssets,
    summary,
    recommendations,
  };
}

function MiniMetric({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-dark-700/35 p-4">
      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center mb-3 ${tone}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-sm font-black text-white">{value}</div>
      <div className="text-[10px] text-gray-600 uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}


type SignalTone = 'emerald' | 'sky' | 'purple' | 'amber' | 'rose' | 'gray';

type ExecutiveInsight = {
  tone: SignalTone;
  confidence: string;
  title: string;
  summary: string;
};

type CoreSignalCard = {
  label: string;
  value: string;
  detail: string;
  icon: React.ElementType;
  tone: SignalTone;
};

type NextBestAction = {
  tone: SignalTone;
  title: string;
  detail: string;
};

function toneClasses(tone: SignalTone): string {
  const tones: Record<SignalTone, string> = {
    emerald: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
    sky: 'text-sky-300 bg-sky-500/10 border-sky-500/20',
    purple: 'text-neon-purple bg-neon-purple/10 border-neon-purple/20',
    amber: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
    rose: 'text-rose-300 bg-rose-500/10 border-rose-500/20',
    gray: 'text-gray-300 bg-white/[0.04] border-white/10',
  };

  return tones[tone];
}

function getExecutiveInsight(
  result: WalletResult,
  selectedChainName: string,
  walletIQ: number,
  suspiciousCount: number,
  unknownCount: number,
  chainReadiness: { name: string; score: number; note: string }[],
): ExecutiveInsight {
  const activeChains = chainReadiness.filter(chain => chain.score >= 50).map(chain => chain.name);
  const txText = result.txCount !== null ? `${result.txCount.toLocaleString()} transaction${result.txCount !== 1 ? 's' : ''}` : 'limited transaction data';
  const riskText = suspiciousCount > 0
    ? `${suspiciousCount} suspicious asset${suspiciousCount !== 1 ? 's' : ''}`
    : result.findings.length > 0
    ? `${result.findings.length} risk finding${result.findings.length !== 1 ? 's' : ''}`
    : 'no major visible risk findings';

  if (result.riskExposureScore >= 70 || suspiciousCount > 0 || result.findings.some(finding => finding.severity === 'High')) {
    return {
      tone: 'rose',
      confidence: `Confidence ${result.confidence}/100`,
      title: 'High attention wallet: reduce risk before farming.',
      summary: `This wallet shows ${txText}, but the scan detected ${riskText}. Review the Security tab before interacting with new airdrop campaigns, claim links or unknown contracts.`,
    };
  }

  if (walletIQ >= 82 && result.airdropReadinessScore >= 70 && result.riskExposureScore < 40) {
    return {
      tone: 'emerald',
      confidence: `Confidence ${result.confidence}/100`,
      title: 'Strong wallet profile for safer airdrop research.',
      summary: `This wallet shows strong public activity, ${riskText}, and healthy readiness signals. It is most active on ${activeChains.slice(0, 2).join(' and ') || selectedChainName}. Keep activity natural and re-scan weekly for changes.`,
    };
  }

  if (result.airdropReadinessScore < 40 || (result.txCount ?? 0) < 10) {
    return {
      tone: 'amber',
      confidence: `Confidence ${result.confidence}/100`,
      title: 'Early wallet profile: build genuine history first.',
      summary: `This wallet currently has ${txText} and limited visible readiness. Focus on useful, low-risk ecosystem activity before treating it as a serious airdrop wallet.`,
    };
  }

  if (unknownCount > 0 || result.tokenHygieneScore < 70) {
    return {
      tone: 'amber',
      confidence: `Confidence ${result.confidence}/100`,
      title: 'Good foundation, but token hygiene needs review.',
      summary: `This wallet has usable activity signals, but ${unknownCount} token${unknownCount !== 1 ? 's' : ''} need review. Treat unknown, unpriced or dead tokens as noise unless verified through official sources.`,
    };
  }

  return {
    tone: 'sky',
    confidence: `Confidence ${result.confidence}/100`,
    title: 'Useful wallet profile with clear improvement areas.',
    summary: `This wallet shows ${txText}, ${riskText}, and a ${result.activityLevel.toLowerCase()} activity profile. The next improvement is strengthening weak chains or activity quality without forcing repetitive farming behaviour.`,
  };
}

function getCoreSignalCards(
  result: WalletResult,
  walletIQ: number,
  suspiciousCount: number,
  unknownCount: number,
): CoreSignalCard[] {
  const riskLabel = result.riskExposureScore >= 70 ? 'High' : result.riskExposureScore >= 40 ? 'Medium' : 'Low';
  const readinessLabel = result.airdropReadinessScore >= 70 ? 'Strong' : result.airdropReadinessScore >= 45 ? 'Building' : 'Early';
  const hygieneLabel = suspiciousCount > 0 ? `${suspiciousCount} flagged` : unknownCount > 0 ? `${unknownCount} review` : 'Clean';

  return [
    {
      label: 'Wallet IQ',
      value: `${walletIQ}/100`,
      detail: `${getPercentile(walletIQ)} profile from health, readiness, activity, hygiene and risk.`,
      icon: Crown,
      tone: walletIQ >= 80 ? 'emerald' : walletIQ >= 60 ? 'sky' : walletIQ >= 40 ? 'amber' : 'rose',
    },
    {
      label: 'Security',
      value: riskLabel,
      detail: result.findings.length > 0 ? `${result.findings.length} finding${result.findings.length !== 1 ? 's' : ''} need review.` : 'No major visible risk findings from available data.',
      icon: ShieldCheck,
      tone: result.riskExposureScore >= 70 ? 'rose' : result.riskExposureScore >= 40 ? 'amber' : 'emerald',
    },
    {
      label: 'Airdrop Readiness',
      value: readinessLabel,
      detail: `Readiness score ${result.airdropReadinessScore}/100 based on activity, balance and ecosystem signals.`,
      icon: Target,
      tone: result.airdropReadinessScore >= 70 ? 'emerald' : result.airdropReadinessScore >= 45 ? 'sky' : 'amber',
    },
    {
      label: 'Activity Quality',
      value: result.activityLevel,
      detail: result.txCount !== null ? `${result.txCount.toLocaleString()} visible transaction${result.txCount !== 1 ? 's' : ''}.` : 'Transaction depth unavailable for this scan.',
      icon: Activity,
      tone: result.activityQualityScore >= 75 ? 'emerald' : result.activityQualityScore >= 50 ? 'sky' : 'amber',
    },
    {
      label: 'Token Hygiene',
      value: hygieneLabel,
      detail: suspiciousCount > 0 ? 'Suspicious assets require attention.' : unknownCount > 0 ? 'Unknown/unpriced tokens should be ignored unless verified.' : 'No suspicious token pattern highlighted.',
      icon: BadgeCheck,
      tone: suspiciousCount > 0 ? 'rose' : unknownCount > 0 ? 'amber' : 'emerald',
    },
    {
      label: 'Wallet DNA',
      value: result.walletPersona || 'Profiled',
      detail: 'Behaviour classification based on public wallet signals.',
      icon: Fingerprint,
      tone: 'purple',
    },
  ];
}

function getNextBestAction(
  result: WalletResult,
  walletPlan: WalletPlanItem[],
  suspiciousCount: number,
  unknownCount: number,
  chainReadiness: { name: string; score: number; note: string }[],
): NextBestAction {
  if (result.riskExposureScore >= 70 || suspiciousCount > 0 || result.findings.some(finding => finding.severity === 'High')) {
    return {
      tone: 'rose',
      title: 'Review security before doing anything else.',
      detail: suspiciousCount > 0
        ? `Start by reviewing ${suspiciousCount} suspicious asset${suspiciousCount !== 1 ? 's' : ''}. Do not click claim links or token websites from unknown assets.`
        : 'Open the Security tab and review each finding before using this wallet for new campaigns.',
    };
  }

  if (unknownCount > 0 && result.tokenHygieneScore < 75) {
    return {
      tone: 'amber',
      title: 'Separate real holdings from wallet noise.',
      detail: `This scan found ${unknownCount} unknown, dead or unpriced token${unknownCount !== 1 ? 's' : ''}. Ignore them unless verified through official project sources.`,
    };
  }

  const weakestUsefulChain = chainReadiness
    .filter(chain => chain.score < 55)
    .sort((a, b) => a.score - b.score)[0];

  if (weakestUsefulChain && result.chain !== 'solana') {
    return {
      tone: 'sky',
      title: `Improve genuine activity on ${weakestUsefulChain.name}.`,
      detail: `This is the clearest readiness gap. Use real protocols you understand; do not rush repetitive transactions just to inflate activity.`,
    };
  }

  if ((result.txCount ?? 0) < 20 || result.activityQualityScore < 60) {
    return {
      tone: 'sky',
      title: 'Build more natural transaction history.',
      detail: 'A few useful actions over time are better than repetitive farming. Focus on real swaps, bridges, tests or app usage you understand.',
    };
  }

  return {
    tone: 'emerald',
    title: walletPlan[0]?.title || 'Keep the wallet clean and re-scan weekly.',
    detail: walletPlan[0]?.detail || 'Your wallet has a solid profile. Continue avoiding unknown signatures and return after meaningful activity changes.',
  };
}

interface WalletSafetySnapshotProps {
  onResultStateChange?: (hasResult: boolean) => void;
}

export default function WalletSafetySnapshot({ onResultStateChange }: WalletSafetySnapshotProps = {}) {
  const [address, setAddress] = useState('');
  const [selectedChain, setSelectedChain] = useState<SupportedChainId>('1');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WalletResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'security' | 'portfolio' | 'speculative' | 'insights' | 'actions'>('overview');
  const [showAllTokens, setShowAllTokens] = useState(false);
  const [expandedRisk, setExpandedRisk] = useState<number | null>(0);
  const [scanHistory, setScanHistory] = useState<WalletScanHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [reputationReward, setReputationReward] = useState<ReputationReward | null>(null);
  const selectedChainMeta = getChainMeta(selectedChain);

  const cleanTokens = useMemo(() => result ? result.tokens.filter(t => !t.risk).sort((a, b) => (b.usdValue ?? 0) - (a.usdValue ?? 0)) : [], [result]);
  const suspiciousTokens = useMemo(() => result ? result.tokens.filter(t => t.risk).sort((a, b) => ({ High: 0, Medium: 1, Low: 2 }[a.risk!.level] - { High: 0, Medium: 1, Low: 2 }[b.risk!.level])) : [], [result]);
  const walletIQ = useMemo(() => result ? (result.walletIq ?? getWalletIQ(result)) : 0, [result]);
  const walletPercentile = useMemo(() => walletIQ ? getPercentile(walletIQ) : '', [walletIQ]);
  const previousScan = useMemo(() => scanHistory[1] ?? null, [scanHistory]);
  const latestSavedScan = useMemo(() => scanHistory[0] ?? null, [scanHistory]);
  const walletDelta = useMemo(() => ({
    iq: scoreDelta(latestSavedScan?.wallet_iq ?? walletIQ, previousScan?.wallet_iq),
    health: scoreDelta(result?.walletHealthScore, previousScan?.wallet_health_score),
    readiness: scoreDelta(result?.airdropReadinessScore, previousScan?.airdrop_readiness_score),
    risk: scoreDelta(result?.riskExposureScore, previousScan?.risk_exposure_score),
  }), [latestSavedScan, previousScan, result, walletIQ]);
  const evolutionVerdict = useMemo(() => getEvolutionVerdict(walletDelta), [walletDelta]);
  const coach = useMemo(() => result ? getCoachVerdict(result) : null, [result]);
  const achievements = useMemo(() => result ? getAchievements(result) : [], [result]);
  const chainReadiness = useMemo(() => result ? getChainReadiness(result) : [], [result]);

  const deadOrUnknownTokens = useMemo(
    () => result ? result.tokens.filter(isUnknownOrDeadToken).sort((a, b) => b.balance - a.balance) : [],
    [result],
  );

  const verifiedCleanTokens = useMemo(
    () => cleanTokens.filter(t => !isUnknownOrDeadToken(t)),
    [cleanTokens],
  );

  const walletPlan = useMemo(
    () => result ? getWalletPlan(result, suspiciousTokens.length, deadOrUnknownTokens.length, chainReadiness) : [],
    [result, suspiciousTokens.length, deadOrUnknownTokens.length, chainReadiness],
  );
  const estimatedImprovement = useMemo(
    () => result ? getEstimatedImprovement(result, walletPlan) : null,
    [result, walletPlan],
  );

  const professionalSignals = useMemo(
    () => result ? getProfessionalSignals(result, suspiciousTokens.length, deadOrUnknownTokens.length) : [],
    [result, suspiciousTokens.length, deadOrUnknownTokens.length],
  );

  const portfolioProfile = useMemo(
    () => result ? getPortfolioProfile(result, verifiedCleanTokens.length, deadOrUnknownTokens.length, suspiciousTokens.length) : [],
    [result, verifiedCleanTokens.length, deadOrUnknownTokens.length, suspiciousTokens.length],
  );

  const speculativeExposure = useMemo(
    () => result ? getSpeculativeExposureProfile(result, suspiciousTokens, deadOrUnknownTokens) : null,
    [result, suspiciousTokens, deadOrUnknownTokens],
  );

  const executiveInsight = useMemo(
    () => result ? getExecutiveInsight(result, selectedChainMeta.name, walletIQ, suspiciousTokens.length, deadOrUnknownTokens.length, chainReadiness) : null,
    [result, selectedChainMeta.name, walletIQ, suspiciousTokens.length, deadOrUnknownTokens.length, chainReadiness],
  );

  const coreSignalCards = useMemo(
    () => result ? getCoreSignalCards(result, walletIQ, suspiciousTokens.length, deadOrUnknownTokens.length) : [],
    [result, walletIQ, suspiciousTokens.length, deadOrUnknownTokens.length],
  );

  const nextBestAction = useMemo(
    () => result ? getNextBestAction(result, walletPlan, suspiciousTokens.length, deadOrUnknownTokens.length, chainReadiness) : null,
    [result, walletPlan, suspiciousTokens.length, deadOrUnknownTokens.length, chainReadiness],
  );

  const visibleTokens = showAllTokens ? verifiedCleanTokens : verifiedCleanTokens.slice(0, 6);
  const visibleUnknownTokens = showAllTokens ? deadOrUnknownTokens : deadOrUnknownTokens.slice(0, 5);
  const visibleSuspiciousTokens = showAllTokens ? suspiciousTokens : suspiciousTokens.slice(0, 5);

  useEffect(() => {
    onResultStateChange?.(Boolean(result));
  }, [onResultStateChange, result]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!address.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    setActiveTab('overview');
    setShowAllTokens(false);
    setScanHistory([]);
    setReputationReward(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('wallet-intelligence', {
        body: {
          address: address.trim(),
          chainId: address.trim().startsWith('0x') ? selectedChain : 'solana',
        },
      });

      if (fnError) throw new Error(fnError.message || 'Failed to send request to wallet-intelligence.');
      if (data?.success === false || data?.error) throw new Error(data?.error || 'Wallet intelligence returned an error.');
      if (!data?.result) throw new Error('No wallet report returned from wallet-intelligence.');

      const walletResult = data.result as WalletResult;
      setResult(walletResult);
      setReputationReward((data?.reputationReward ?? null) as ReputationReward | null);
      await fetchWalletHistory(address.trim(), address.trim().startsWith('0x') ? selectedChain : 'solana');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wallet intelligence failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchWalletHistory(walletAddress: string, chainId: SupportedChainId) {
    setHistoryLoading(true);

    try {
      const normalizedAddress = walletAddress.startsWith('0x') ? walletAddress.toLowerCase() : walletAddress;
      const addressVariants = walletAddress.startsWith('0x')
        ? [walletAddress, walletAddress.toLowerCase()]
        : [walletAddress];

      const chainVariants = chainId === 'solana'
        ? ['solana']
        : [chainId, getChainMeta(chainId).id, getChainMeta(chainId).name, getChainMeta(chainId).short].filter(Boolean);

      const { data, error } = await supabase
        .from('wallet_scan_history')
        .select('id,wallet_address,chain_id,wallet_grade,wallet_iq,wallet_health_score,risk_exposure_score,activity_quality_score,token_hygiene_score,airdrop_readiness_score,portfolio_value,scam_tokens,dead_tokens,wallet_persona,created_at')
        .in('wallet_address', Array.from(new Set([normalizedAddress, ...addressVariants])))
        .in('chain_id', Array.from(new Set(chainVariants)))
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) throw error;
      setScanHistory((data ?? []) as WalletScanHistory[]);
    } catch (err) {
      console.warn('Wallet scan history unavailable', err);
      setScanHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: Gauge },
    { id: 'security' as const, label: 'Security', icon: ShieldAlert },
    { id: 'portfolio' as const, label: 'Portfolio', icon: Coins },
    { id: 'speculative' as const, label: 'Speculative Exposure', icon: Flame },
    { id: 'insights' as const, label: 'Insights', icon: Fingerprint },
    { id: 'actions' as const, label: scanHistory.length > 1 ? `Evolution (${scanHistory.length})` : 'Actions', icon: ListChecks },
  ];

  function TokenRow({ token }: { token: Token }) {
    return (
      <div className="flex items-center justify-between gap-2 bg-dark-700/40 rounded-xl px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-dark-600 border border-white/10 flex items-center justify-center shrink-0">
            <span className="text-[8px] font-bold text-gray-500">{token.symbol.slice(0, 2).toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white truncate">{token.symbol}</div>
            <div className="text-[10px] text-gray-600 truncate">{token.name}</div>
          </div>
        </div>
        <div className="text-right shrink-0">
          {token.usdValue !== null && token.usdValue > 0 ? (
            <div className="text-xs font-semibold text-white">{fmtUsd(token.usdValue)}</div>
          ) : (
            <div className="text-[10px] text-gray-700">no price data</div>
          )}
        </div>
      </div>
    );
  }

  function OverviewTab() {
    if (!result) return null;
    const topFindings = result.findings.slice(0, 3);
    const reasoning = result.reasoning;

    return (
      <div className="space-y-4">
        {executiveInsight && (
          <div className={cn('rounded-2xl border p-4', toneClasses(executiveInsight.tone))}>
            <div className="flex items-start gap-3">
              <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <div className="text-[10px] uppercase tracking-wider font-semibold">Executive Wallet Assessment</div>
                  <span className="rounded-full border border-current/20 bg-black/10 px-2 py-0.5 text-[9px] font-bold">
                    {executiveInsight.confidence}
                  </span>
                </div>
                <h3 className="text-sm font-black text-white">{executiveInsight.title}</h3>
                <p className="text-xs text-gray-300 mt-2 leading-relaxed">{executiveInsight.summary}</p>
              </div>
            </div>
          </div>
        )}

        {reasoning && (
          <div className="rounded-2xl border border-neon-purple/15 bg-neon-purple/[0.04] p-4">
            <div className="flex items-start gap-3">
              <Wand2 className="w-4 h-4 text-neon-purple shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-[10px] text-neon-purple uppercase tracking-wider font-semibold mb-2">Why we reached this conclusion</div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-[10px] text-gray-600 uppercase tracking-wider">Behaviour</span>
                  <span className="text-xs font-semibold text-white">{reasoning.behaviouralQuality}</span>
                  <span className="text-[10px] text-gray-600 uppercase tracking-wider">Confidence</span>
                  <span className="text-xs font-semibold text-white">{reasoning.decisionConfidence}/100</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed mb-3">{reasoning.uncertainty}</p>
                <div className="rounded-xl border border-white/5 bg-dark-700/30 p-3">
                  <div className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold mb-2">Evidence</div>
                  <ul className="space-y-1">
                    {reasoning.evidence.slice(0, 4).map(point => (
                      <li key={point} className="text-[10px] text-gray-500 leading-relaxed">• {point}</li>
                    ))}
                  </ul>
                </div>
                {reasoning.recommendedAction && (
                  <div className="mt-3 rounded-xl border border-sky-500/15 bg-sky-500/[0.04] p-3">
                    <div className="text-[10px] text-sky-400 uppercase tracking-wider font-semibold mb-1">Recommended action</div>
                    <p className="text-[10px] text-gray-500 leading-relaxed">{reasoning.recommendedAction}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {coreSignalCards.map(({ label, value, detail, icon: Icon, tone }) => (
            <div key={label} className="bg-dark-700/40 rounded-2xl p-3.5 border border-white/5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold">{label}</div>
                <div className={cn('w-7 h-7 rounded-xl border flex items-center justify-center', toneClasses(tone))}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-sm font-black text-white leading-tight">{value}</div>
              <div className="text-[10px] text-gray-500 mt-1 leading-relaxed">{detail}</div>
            </div>
          ))}
        </div>

        {coach && (
          <div className="rounded-2xl border border-neon-purple/15 bg-neon-purple/[0.04] p-4">
            <div className="flex items-start gap-3">
              <Wand2 className="w-4 h-4 text-neon-purple shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] text-neon-purple uppercase tracking-wider font-semibold mb-1">Wallet Coach</div>
                    <h3 className="text-sm font-bold text-white">{coach.title}</h3>
                  </div>
                  <span className="text-[10px] text-neon-purple border border-neon-purple/20 bg-neon-purple/10 rounded-full px-2 py-0.5 shrink-0">{coach.boost}</span>
                </div>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">{coach.detail}</p>
              </div>
            </div>
          </div>
        )}

        {walletPlan.length > 0 && estimatedImprovement && (
          <button
            type="button"
            onClick={() => setActiveTab('actions')}
            className="w-full text-left rounded-2xl border border-sky-500/15 bg-sky-500/[0.04] p-4 hover:bg-sky-500/[0.07] transition-colors"
          >
            <div className="flex items-start gap-3">
              <CalendarCheck2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-[10px] text-sky-400 uppercase tracking-wider font-semibold mb-1">Your 7-Day Wallet Plan</div>
                <h3 className="text-sm font-bold text-white">Leave with a clear next step</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Start with: <span className="text-gray-300 font-semibold">{walletPlan[0].title}</span>
                </p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <span className="text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/15 rounded-full px-2 py-0.5">Potential IQ +{estimatedImprovement.iq}</span>
                  <span className="text-[10px] text-sky-300 bg-sky-500/10 border border-sky-500/15 rounded-full px-2 py-0.5">Readiness +{estimatedImprovement.readiness}</span>
                  <span className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/15 rounded-full px-2 py-0.5">Re-scan in 7 days</span>
                </div>
              </div>
            </div>
          </button>
        )}

        <div className="grid grid-cols-2 gap-2">
          <MiniMetric icon={TrendingUp} label="Farming Potential" value={result.airdropReadinessScore >= 70 ? 'Strong' : result.airdropReadinessScore >= 45 ? 'Building' : 'Early'} tone="text-sky-400 bg-sky-500/10 border-sky-500/20" />
          <MiniMetric icon={Eye} label="Visible Risk" value={result.riskExposureScore >= 70 ? 'High' : result.riskExposureScore >= 40 ? 'Medium' : 'Low'} tone="text-amber-400 bg-amber-500/10 border-amber-500/20" />
        </div>

        {nextBestAction && (
          <button
            type="button"
            onClick={() => setActiveTab(nextBestAction.tone === 'rose' ? 'security' : 'actions')}
            className={cn('w-full text-left rounded-2xl border p-4 transition-colors hover:bg-white/[0.04]', toneClasses(nextBestAction.tone))}
          >
            <div className="flex items-start gap-3">
              <Target className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <div className="text-[10px] uppercase tracking-wider font-semibold mb-1">Next Best Action</div>
                <h3 className="text-sm font-bold text-white">{nextBestAction.title}</h3>
                <p className="text-xs text-gray-300 mt-1 leading-relaxed">{nextBestAction.detail}</p>
              </div>
            </div>
          </button>
        )}

        <div className="rounded-2xl border border-white/5 bg-dark-700/30 p-4">
          <div className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold mb-3">Quick Profile</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-dark-800/50 rounded-xl p-3">
              <div className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">{selectedChainMeta.native} Balance</div>
              <div className="text-xs font-bold text-white">{result.nativeBalance.toFixed(selectedChainMeta.family === 'evm' ? 4 : 3)} {selectedChainMeta.native}</div>
              {result.nativeUsdValue !== null && result.nativeUsdValue > 0 && <div className="text-[10px] text-gray-600 mt-0.5">{fmtUsd(result.nativeUsdValue)}</div>}
            </div>
            <div className="bg-dark-800/50 rounded-xl p-3">
              <div className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">Activity</div>
              <div className={cn('text-xs font-bold', ACTIVITY_COLOR[result.activityLevel])}>{result.activityLevel}</div>
              {result.txCount !== null && <div className="text-[10px] text-gray-600 mt-0.5">{result.txCount.toLocaleString()} txs</div>}
            </div>
          </div>
        </div>

        {topFindings.length > 0 && (
          <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.04] p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] text-amber-400 uppercase tracking-wider font-semibold">Top Findings</span>
            </div>
            <div className="space-y-2">
              {topFindings.map((finding, index) => (
                <button key={`${finding.title}-${index}`} type="button" onClick={() => setActiveTab('security')} className="w-full text-left rounded-xl bg-dark-700/35 border border-white/5 px-3 py-2 hover:bg-dark-700/60 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-white">{finding.title}</span>
                    <span className={cn('text-[9px] font-semibold border rounded-full px-2 py-0.5', RISK_STYLES[finding.severity].badge)}>{finding.severity}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  function SecurityTab() {
    if (!result) return null;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {professionalSignals.map(({ label, value, icon: Icon, tone }) => (
            <div key={label} className="rounded-2xl border border-white/5 bg-dark-700/35 p-4">
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center mb-3 ${tone}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="text-sm font-black text-white">{value}</div>
              <div className="text-[10px] text-gray-600 uppercase tracking-wider mt-1">{label}</div>
            </div>
          ))}
        </div>

        {result.goplus.enabled ? (
          <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.04] p-4">
            <div className="flex items-start gap-3">
              <Database className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-bold text-white">GoPlus Security Layer</h3>
                <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                  {result.goplus.checkedApis.length} GoPlus check{result.goplus.checkedApis.length !== 1 ? 's' : ''} completed for {selectedChainMeta.name}. Token security checked for {result.goplus.tokenSecurityChecked} asset{result.goplus.tokenSecurityChecked !== 1 ? 's' : ''}.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.04] p-4">
            <div className="flex items-start gap-3">
              <ShieldQuestion className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-bold text-white">Provider coverage is limited for this chain</h3>
                <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                  The scan is using the best available public data and conservative heuristics because GoPlus security checks are not currently available for this path.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="pt-1 border-t border-white/5">
          <div className="flex items-center gap-1.5 mb-2.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] text-amber-400/80 uppercase tracking-wider font-semibold">Risk Centre ({result.findings.length})</span>
          </div>

          {result.findings.length > 0 ? (
            <div className="space-y-2">
              {result.findings.map((finding, index) => {
                const s = RISK_STYLES[finding.severity];
                const open = expandedRisk === index;

                return (
                  <div key={`${finding.title}-${index}`} className={cn('rounded-xl border bg-dark-700/30', s.border)}>
                    <button type="button" onClick={() => setExpandedRisk(open ? null : index)} className="w-full flex items-start justify-between gap-2 p-3.5 text-left">
                      <div>
                        <h4 className="text-xs font-semibold text-white">{finding.title}</h4>
                        {!open && <p className="text-[10px] text-gray-600 mt-1 line-clamp-1">{finding.detail}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn('text-[10px] font-semibold border rounded-full px-2 py-0.5', s.badge)}>{finding.severity}</span>
                        <ChevronDown className={cn('w-3.5 h-3.5 text-gray-600 transition-transform', open && 'rotate-180')} />
                      </div>
                    </button>

                    {open && (
                      <div className="px-3.5 pb-3.5 space-y-2">
                        <p className="text-[10px] text-gray-500 leading-relaxed">{finding.detail}</p>
                        <p className="text-[10px] text-gray-500 leading-relaxed"><span className="font-semibold text-gray-400">Action:</span> {finding.action}</p>
                        <p className="text-[9px] text-gray-700">Source: {finding.source}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.04] p-4 flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-xs font-bold text-white">No major risk findings detected</h3>
                <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">This does not guarantee safety. It means this scan did not find major visible risk indicators from available public data.</p>
              </div>
            </div>
          )}
        </div>

        {suspiciousTokens.length > 0 && (
          <div className="pt-1 border-t border-white/5">
            <div className="flex items-center gap-1.5 mb-2.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] text-amber-400/80 uppercase tracking-wider font-semibold">Suspicious Assets ({suspiciousTokens.length})</span>
            </div>
            <div className="space-y-2">
              {visibleSuspiciousTokens.map(t => {
                const s = RISK_STYLES[t.risk!.level];
                return (
                  <div key={t.address} className={cn('rounded-xl border p-3.5 space-y-2.5 bg-dark-700/30', s.border)}>
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-white">{t.name}</span>
                        <span className="text-[10px] text-gray-500 ml-2">{t.symbol}</span>
                        <div className="text-[10px] font-mono text-gray-700 mt-0.5 break-all">{truncateAddr(t.address)}</div>
                      </div>
                      <span className={cn('text-[10px] font-semibold border rounded-full px-2 py-0.5 shrink-0 self-start', s.badge)}>{t.risk!.level} Risk</span>
                    </div>
                    <div className="text-[10px] text-gray-400 leading-relaxed"><span className="font-semibold text-gray-500 mr-1">Reason:</span>{t.risk!.reason}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {deadOrUnknownTokens.length > 0 && (
          <div className="pt-1 border-t border-white/5">
            <div className="flex items-center gap-1.5 mb-2.5">
              <Skull className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] text-amber-400 uppercase tracking-wider font-semibold">Dead / Unknown / Unpriced Tokens ({deadOrUnknownTokens.length})</span>
            </div>
            <div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-3 mb-2">
              <div className="flex items-start gap-2">
                <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-gray-500 leading-relaxed">Dead or unknown does not automatically mean scam. It means the scan could not verify reliable price, liquidity, identity, or active value from available data.</p>
              </div>
            </div>
            <div className="space-y-2">
              {visibleUnknownTokens.map(t => (
                <div key={t.address} className="rounded-xl border border-amber-500/15 bg-dark-700/30 p-3.5">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-white">{t.name}</span>
                      <span className="text-[10px] text-gray-500 ml-2">{t.symbol}</span>
                      <div className="text-[10px] font-mono text-gray-700 mt-0.5 break-all">{truncateAddr(t.address)}</div>
                    </div>
                    <span className="text-[10px] font-semibold border rounded-full px-2 py-0.5 shrink-0 self-start text-amber-400 bg-amber-500/10 border-amber-500/25">Needs Review</span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2 leading-relaxed"><span className="font-semibold text-gray-400 mr-1">Reason:</span>{getUnknownTokenReason(t)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {(suspiciousTokens.length + deadOrUnknownTokens.length) > 5 && (
          <button type="button" onClick={() => setShowAllTokens(v => !v)} className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/[0.06] transition-colors">
            {showAllTokens ? 'Show less' : 'Show all flagged tokens'}
          </button>
        )}
      </div>
    );
  }

  function PortfolioTab() {
    if (!result) return null;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {portfolioProfile.map(item => (
            <div key={item.label} className="rounded-xl bg-dark-700/35 border border-white/5 p-3">
              <div className="text-sm font-black text-white">{item.value}</div>
              <div className="text-[10px] text-gray-500 font-semibold mt-1">{item.label}</div>
              <div className="text-[9px] text-gray-700 mt-0.5 leading-relaxed">{item.detail}</div>
            </div>
          ))}
        </div>

        {result.chainBalances.length > 0 && (
          <div className="pt-1 border-t border-white/5">
            <div className="flex items-center gap-1.5 mb-2.5">
              <Network className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold">Multi-Chain Footprint</span>
            </div>
            <div className="space-y-1">
              {result.chainBalances.map(cb => (
                <div key={cb.chainId} className={cn('flex items-center justify-between gap-2 px-3 py-2 rounded-xl', cb.balance > 0 ? 'bg-dark-700/40' : 'bg-dark-700/20')}>
                  <span className={cn('text-xs font-medium', cb.balance > 0 ? 'text-gray-300' : 'text-gray-600')}>{cb.name}</span>
                  <div className="text-right">
                    {cb.error ? <span className="text-[10px] text-gray-700">unavailable</span> : cb.balance === 0 ? <span className="text-[10px] text-gray-700">0 {cb.symbol}</span> : (
                      <>
                        <div className="text-xs font-semibold text-white">{cb.balance.toFixed(4)} {cb.symbol}</div>
                        {cb.usdValue !== null && cb.usdValue > 0 && <div className="text-[10px] text-gray-600">{fmtUsd(cb.usdValue)}</div>}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {verifiedCleanTokens.length > 0 && (
          <div className="pt-1 border-t border-white/5">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold">Verified / Priced Token Holdings ({verifiedCleanTokens.length})</span>
              </div>
              {verifiedCleanTokens.length > 6 && <button type="button" onClick={() => setShowAllTokens(v => !v)} className="text-[10px] text-sky-400 hover:text-sky-300">{showAllTokens ? 'Less' : 'More'}</button>}
            </div>
            <div className="space-y-1.5">
              {visibleTokens.map(t => <TokenRow key={t.address} token={t} />)}
            </div>
          </div>
        )}
      </div>
    );
  }

  function InsightsTab() {
    if (!result) return null;

    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-neon-purple/15 bg-neon-purple/[0.04] p-4">
          <div className="flex items-start gap-3">
            <Wallet className="w-4 h-4 text-neon-purple shrink-0 mt-0.5" />
            <div>
              <div className="text-[10px] text-neon-purple uppercase tracking-wider font-semibold mb-1">Wallet DNA</div>
              <h3 className="text-base font-bold text-white">{result.walletPersona}</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">Classification based on visible balances, transaction history, token hygiene, risk exposure and multi-chain footprint.</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <ScoreBar label="Wallet Health" score={result.walletHealthScore} />
          <ScoreBar label="Airdrop Readiness" score={result.airdropReadinessScore} />
          <ScoreBar label="Risk Exposure" score={result.riskExposureScore} invert />
          <ScoreBar label="Activity Quality" score={result.activityQualityScore} />
          <ScoreBar label="Multi-chain Footprint" score={result.multiChainScore} />
          <ScoreBar label="Token Hygiene" score={result.tokenHygieneScore} />
          <ScoreBar label="Analysis Confidence" score={result.confidence} />
        </div>

        {chainReadiness.length > 0 && (
          <div className="pt-1 border-t border-white/5">
            <div className="flex items-center gap-1.5 mb-2.5">
              <BarChart3 className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-[10px] text-sky-400 uppercase tracking-wider font-semibold">Airdrop Readiness by Chain</span>
            </div>
            <div className="space-y-2">
              {chainReadiness.map(chain => (
                <div key={chain.name} className="rounded-xl bg-dark-700/35 border border-white/5 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <div>
                      <div className="text-xs font-semibold text-white">{chain.name}</div>
                      <div className="text-[10px] text-gray-600">{chain.note}</div>
                    </div>
                    <div className={cn('text-xs font-black', scoreTone(chain.score))}>{chain.score}</div>
                  </div>
                  <div className="h-1.5 rounded-full bg-dark-700 overflow-hidden">
                    <div className={cn('h-full rounded-full', scoreBar(chain.score))} style={{ width: `${chain.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-1 border-t border-white/5">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] text-amber-400 uppercase tracking-wider font-semibold">Wallet Achievements</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {achievements.map(item => (
              <div key={item.label} className={cn('rounded-xl border px-3 py-2.5 flex items-start gap-2', item.unlocked ? 'bg-emerald-500/[0.04] border-emerald-500/15' : 'bg-dark-700/25 border-white/5')}>
                {item.unlocked ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" /> : <XCircle className="w-3.5 h-3.5 text-gray-700 shrink-0 mt-0.5" />}
                <div>
                  <div className={cn('text-xs font-semibold', item.unlocked ? 'text-white' : 'text-gray-600')}>{item.label}</div>
                  <div className="text-[10px] text-gray-600 mt-0.5">{item.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function SpeculativeExposureTab() {
    if (!result || !speculativeExposure) return null;

    const totalRiskBars = speculativeExposure.riskDistribution.low + speculativeExposure.riskDistribution.medium + speculativeExposure.riskDistribution.high + speculativeExposure.riskDistribution.unknown;
    const safePercent = (value: number | null | undefined): number => {
      if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
      return Math.max(0, Math.min(100, value));
    };
    const pct = (v: number) => totalRiskBars > 0 ? safePercent(Math.round((v / totalRiskBars) * 100)) : 0;
    const concentrationTone = speculativeExposure.concentrationRisk === 'High'
      ? 'text-rose-300 bg-rose-500/10 border-rose-500/25'
      : speculativeExposure.concentrationRisk === 'Medium'
      ? 'text-amber-300 bg-amber-500/10 border-amber-500/25'
      : speculativeExposure.concentrationRisk === 'Low'
      ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25'
      : 'text-gray-300 bg-white/[0.05] border-white/10';

    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-neon-purple/15 bg-neon-purple/[0.04] p-4">
          <div className="text-[10px] text-neon-purple uppercase tracking-wider font-semibold mb-1">AI Exposure Analysis</div>
          <h3 className="text-sm font-bold text-white">Speculative Exposure Summary</h3>
          <p className="text-xs text-gray-400 mt-2 leading-relaxed">{speculativeExposure.summary}</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <MiniMetric icon={Flame} label="Overall Speculative Exposure" value={`${speculativeExposure.overallExposureScore}/100`} tone="text-rose-300 bg-rose-500/10 border-rose-500/25" />
          <MiniMetric icon={Activity} label="Speculative Portfolio %" value={speculativeExposure.speculativePercent === null ? 'Currently unavailable.' : `${Math.round(speculativeExposure.speculativePercent)}%`} tone="text-amber-300 bg-amber-500/10 border-amber-500/25" />
          <MiniMetric icon={AlertTriangle} label="Estimated Rug Pull Exposure" value={speculativeExposure.estimatedRugExposure === null ? 'Currently unavailable.' : `${speculativeExposure.estimatedRugExposure}/100`} tone="text-rose-300 bg-rose-500/10 border-rose-500/25" />
          <MiniMetric icon={Target} label="Concentration Risk" value={speculativeExposure.concentrationRisk === 'Unknown' ? 'Currently unavailable.' : speculativeExposure.concentrationRisk} tone={concentrationTone} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/5 bg-dark-700/30 p-4">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-2">Speculative Exposure Gauge</div>
            <div className="h-3 rounded-full bg-dark-800 overflow-hidden">
              <div className={cn('h-full rounded-full', speculativeExposure.overallExposureScore >= 70 ? 'bg-rose-500' : speculativeExposure.overallExposureScore >= 45 ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${safePercent(speculativeExposure.overallExposureScore)}%` }} />
            </div>
            <p className="text-[10px] text-gray-600 mt-2">Higher score means more wallet value is tied to high-risk or uncertain assets.</p>
          </div>

          <div className="rounded-2xl border border-white/5 bg-dark-700/30 p-4">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-2">Portfolio Breakdown</div>
            <div className="space-y-2 text-xs text-gray-400">
              <div className="flex items-center justify-between"><span>Speculative tokens</span><span className="font-semibold text-white">{speculativeExposure.portfolioBreakdown.speculative}</span></div>
              <div className="flex items-center justify-between"><span>Unknown tokens</span><span className="font-semibold text-white">{speculativeExposure.portfolioBreakdown.unknown}</span></div>
              <div className="flex items-center justify-between"><span>Core tokens</span><span className="font-semibold text-white">{speculativeExposure.portfolioBreakdown.core}</span></div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-dark-700/30 p-4">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-2">Risk Distribution Chart</div>
          <div className="space-y-2">
            {[
              ['High risk', speculativeExposure.riskDistribution.high, 'bg-rose-500'],
              ['Medium risk', speculativeExposure.riskDistribution.medium, 'bg-amber-500'],
              ['Low risk', speculativeExposure.riskDistribution.low, 'bg-sky-500'],
              ['Unknown', speculativeExposure.riskDistribution.unknown, 'bg-gray-500'],
            ].map(([label, value, bar]) => (
              <div key={String(label)}>
                <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1"><span>{label}</span><span>{value as number} ({pct(value as number)}%)</span></div>
                <div className="h-2 rounded-full bg-dark-800 overflow-hidden"><div className={cn('h-full rounded-full', String(bar))} style={{ width: `${pct(value as number)}%` }} /></div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="rounded-xl bg-dark-700/35 border border-white/5 p-3"><div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Speculative Tokens</div><div className="text-sm font-black text-white">{speculativeExposure.speculativeCount}</div></div>
          <div className="rounded-xl bg-dark-700/35 border border-white/5 p-3"><div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Unknown Tokens</div><div className="text-sm font-black text-white">{speculativeExposure.unknownTokens}</div></div>
          <div className="rounded-xl bg-dark-700/35 border border-white/5 p-3"><div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Recently Created Tokens</div><div className="text-sm font-black text-white">{speculativeExposure.recentlyCreatedTokens}</div></div>
          <div className="rounded-xl bg-dark-700/35 border border-white/5 p-3"><div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Dormant Tokens</div><div className="text-sm font-black text-white">{speculativeExposure.dormantTokens}</div></div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-dark-700/30 p-4">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-2">Highest-Risk Holding</div>
          {speculativeExposure.highestRiskHolding ? (
            <div className="text-xs text-gray-300 leading-relaxed break-words">
              <span className="font-semibold text-white">{speculativeExposure.highestRiskHolding.symbol || 'Unknown'}</span>
              {' · '}
              {speculativeExposure.highestRiskHolding.name || 'Unknown token'}
              {' · '}
              {speculativeExposure.highestRiskHolding.usdValue !== null && Number.isFinite(speculativeExposure.highestRiskHolding.usdValue)
                ? fmtUsd(speculativeExposure.highestRiskHolding.usdValue)
                : 'Currently unavailable.'}
            </div>
          ) : (
            <div className="text-xs text-gray-500">Currently unavailable.</div>
          )}
        </div>

        <div className="rounded-2xl border border-rose-500/15 bg-rose-500/[0.04] p-4">
          <div className="text-[10px] text-rose-300 uppercase tracking-wider font-semibold mb-2">Top Five Highest-Risk Assets</div>
          {speculativeExposure.topRiskAssets.length > 0 ? (
            <div className="space-y-2">
              {speculativeExposure.topRiskAssets.map((token, index) => (
                <div key={`${token.address || token.symbol || 'token'}-${index}`} className="rounded-xl border border-white/5 bg-dark-700/35 px-3 py-2 flex items-center justify-between gap-2 min-w-0">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">{token.symbol || 'Unknown'} <span className="text-gray-500 font-normal">{token.name || 'Token'}</span></div>
                    <div className="text-[10px] text-gray-600 truncate">{token.risk?.reason || 'Currently unavailable.'}</div>
                  </div>
                  <div className="text-[10px] font-semibold text-rose-300 shrink-0">{token.risk?.level || 'Unknown'}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-500">Currently unavailable.</div>
          )}
        </div>

        <div className="rounded-2xl border border-sky-500/15 bg-sky-500/[0.04] p-4">
          <div className="text-[10px] text-sky-400 uppercase tracking-wider font-semibold mb-2">Recommendations</div>
          <ul className="space-y-1.5">
            {speculativeExposure.recommendations.map((rec) => (
              <li key={rec} className="text-xs text-gray-300 leading-relaxed">• {rec}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  function ActionsTab() {
    if (!result) return null;

    return (
      <div className="space-y-4">
        <div className={cn('rounded-2xl border p-4', evolutionVerdict.tone)}>
          <div className="flex items-start gap-3">
            <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <div className="text-[10px] uppercase tracking-wider font-semibold mb-1">AirdropGuard Evolution Verdict</div>
              <h3 className="text-sm font-bold text-white">{evolutionVerdict.title}</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{evolutionVerdict.detail}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-sky-500/15 bg-sky-500/[0.04] p-4">
          <div className="flex items-start gap-3">
            <History className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-[10px] text-sky-400 uppercase tracking-wider font-semibold mb-1">Wallet Evolution</div>
              <h3 className="text-sm font-bold text-white">
                {scanHistory.length > 1 ? 'Progress compared with your previous scan' : 'First saved scan for this wallet'}
              </h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                {scanHistory.length > 1
                  ? 'These changes are based on your saved AirdropGuard scan history.'
                  : 'Scan this wallet again later to unlock trend comparisons and progress tracking.'}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                <div className="rounded-xl bg-dark-700/35 border border-white/5 p-3">
                  <div className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">Wallet IQ</div>
                  <div className={cn('text-lg font-black', scoreTone(walletIQ))}>{walletIQ}</div>
                  <DeltaPill value={walletDelta.iq} />
                </div>
                <div className="rounded-xl bg-dark-700/35 border border-white/5 p-3">
                  <div className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">Health</div>
                  <div className={cn('text-lg font-black', scoreTone(result.walletHealthScore))}>{result.walletHealthScore}</div>
                  <DeltaPill value={walletDelta.health} />
                </div>
                <div className="rounded-xl bg-dark-700/35 border border-white/5 p-3">
                  <div className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">Readiness</div>
                  <div className={cn('text-lg font-black', scoreTone(result.airdropReadinessScore))}>{result.airdropReadinessScore}</div>
                  <DeltaPill value={walletDelta.readiness} />
                </div>
                <div className="rounded-xl bg-dark-700/35 border border-white/5 p-3">
                  <div className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">Risk</div>
                  <div className={cn('text-lg font-black', riskTone(result.riskExposureScore))}>{result.riskExposureScore}</div>
                  <DeltaPill value={walletDelta.risk} invert />
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-white/5 bg-dark-700/25 p-3">
                <div className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold mb-2">What changed</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  <p className="text-[10px] text-gray-500">{changeSummary(walletDelta.iq, 'Wallet IQ')}</p>
                  <p className="text-[10px] text-gray-500">{changeSummary(walletDelta.health, 'Health')}</p>
                  <p className="text-[10px] text-gray-500">{changeSummary(walletDelta.readiness, 'Readiness')}</p>
                  <p className="text-[10px] text-gray-500">{changeSummary(walletDelta.risk, 'Risk', true)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {scanHistory.length > 1 && (
          <div className="rounded-2xl border border-white/5 bg-dark-700/25 p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <BarChart3 className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-[10px] text-sky-400 uppercase tracking-wider font-semibold">Wallet Timeline</span>
            </div>
            <div className="space-y-3">
              {scanHistory.slice().reverse().map((scan, index) => (
                <div key={scan.id} className="grid grid-cols-[70px_1fr_46px] gap-3 items-center">
                  <div className="text-[10px] text-gray-600">{new Date(scan.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                  <div className="h-2 rounded-full bg-dark-700 overflow-hidden">
                    <div className={cn('h-full rounded-full', scoreBar(scan.wallet_iq ?? 0))} style={{ width: `${trendWidth(scan.wallet_iq)}%` }} />
                  </div>
                  <div className={cn('text-xs font-black text-right', scoreTone(scan.wallet_iq ?? 0))}>{scan.wallet_iq ?? '—'}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {coach && (
          <div className="rounded-2xl border border-neon-purple/15 bg-neon-purple/[0.04] p-4">
            <div className="flex items-start gap-3">
              <Wand2 className="w-4 h-4 text-neon-purple shrink-0 mt-0.5" />
              <div>
                <div className="text-[10px] text-neon-purple uppercase tracking-wider font-semibold mb-1">Wallet Coach</div>
                <h3 className="text-sm font-bold text-white">{coach.title}</h3>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">{coach.detail}</p>
              </div>
            </div>
          </div>
        )}

        {estimatedImprovement && (
          <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.04] p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold mb-1">Potential after following the plan</div>
                <h3 className="text-sm font-bold text-white">A practical route to a stronger wallet profile</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  This is not a reward promise. It is a safety-first estimate of how your visible wallet signals could improve.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                  <div className="rounded-xl bg-dark-700/35 border border-white/5 p-3">
                    <div className="text-[9px] text-gray-600 uppercase tracking-wider">Wallet IQ</div>
                    <div className="text-sm font-black text-emerald-400">+{estimatedImprovement.iq}</div>
                  </div>
                  <div className="rounded-xl bg-dark-700/35 border border-white/5 p-3">
                    <div className="text-[9px] text-gray-600 uppercase tracking-wider">Readiness</div>
                    <div className="text-sm font-black text-sky-400">+{estimatedImprovement.readiness}</div>
                  </div>
                  <div className="rounded-xl bg-dark-700/35 border border-white/5 p-3">
                    <div className="text-[9px] text-gray-600 uppercase tracking-wider">Health</div>
                    <div className="text-sm font-black text-emerald-400">+{estimatedImprovement.health}</div>
                  </div>
                  <div className="rounded-xl bg-dark-700/35 border border-white/5 p-3">
                    <div className="text-[9px] text-gray-600 uppercase tracking-wider">Risk</div>
                    <div className="text-sm font-black text-amber-400">-{estimatedImprovement.risk}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="pt-1 border-t border-white/5">
          <div className="flex items-center gap-1.5 mb-2.5">
            <ListChecks className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-[10px] text-sky-400 uppercase tracking-wider font-semibold">Your 7-Day Wallet Improvement Plan</span>
          </div>
          <div className="space-y-2">
            {walletPlan.map((item, index) => (
              <div key={`${item.day}-${item.title}`} className="rounded-xl bg-dark-700/30 border border-white/5 p-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
                    <span className="text-xs font-black text-sky-300">{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold">{item.day}</div>
                        <h4 className="text-xs font-bold text-white mt-0.5">{item.title}</h4>
                      </div>
                      <span className={cn('text-[9px] font-semibold border rounded-full px-2 py-0.5 shrink-0', planTone(item.category))}>{item.impact}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">{item.detail}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="text-[9px] text-gray-600 bg-white/[0.03] border border-white/5 rounded-full px-2 py-0.5">{item.category}</span>
                      <span className="text-[9px] text-gray-600 bg-white/[0.03] border border-white/5 rounded-full px-2 py-0.5">{item.difficulty}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {result.recommendations.length > 0 && (
              <div className="rounded-xl bg-sky-500/[0.04] border border-sky-500/10 px-3 py-2">
                <div className="flex items-start gap-2">
                  <Target className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[10px] text-sky-400 uppercase tracking-wider font-semibold mb-1">Extra scan advice</div>
                    <div className="space-y-1">
                      {result.recommendations.slice(0, 3).map(action => (
                        <p key={action} className="text-[10px] text-gray-500 leading-relaxed">• {action}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="pt-1 border-t border-white/5">
          <div className="flex items-center gap-1.5 mb-2.5">
            <History className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold">Recent Scan History</span>
          </div>

          {historyLoading ? (
            <div className="rounded-xl border border-white/5 bg-dark-700/25 p-3 text-xs text-gray-500">Loading saved scans...</div>
          ) : scanHistory.length === 0 ? (
            <div className="rounded-xl border border-white/5 bg-dark-700/25 p-3 text-xs text-gray-500">
              No saved scan history found yet. Make sure you are logged in and the Edge Function is deployed with history saving enabled.
            </div>
          ) : (
            <div className="space-y-2">
              {scanHistory.map((scan, index) => (
                <div key={scan.id} className="rounded-xl border border-white/5 bg-dark-700/30 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-white">{index === 0 ? 'Latest scan' : `Previous scan ${index}`}</div>
                      <div className="text-[10px] text-gray-600">{fmtDateTime(scan.created_at)}</div>
                    </div>
                    <div className="text-right">
                      <div className={cn('text-xs font-black', scoreTone(scan.wallet_iq ?? 0))}>IQ {scan.wallet_iq ?? '—'}</div>
                      <div className="text-[10px] text-gray-600">
                        Grade {scan.wallet_grade ?? '—'} · Risk {scan.risk_exposure_score ?? '—'}
                      </div>
                      {scan.portfolio_value !== null && scan.portfolio_value !== undefined && (
                        <div className="text-[10px] text-gray-700">{fmtUsd(Number(scan.portfolio_value))}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-neon-purple/15 bg-neon-purple/[0.04] p-4">
          <div className="flex items-start gap-3">
            <Repeat2 className="w-4 h-4 text-neon-purple shrink-0 mt-0.5" />
            <div>
              <div className="text-[10px] text-neon-purple uppercase tracking-wider font-semibold mb-1">Come back checkpoint</div>
              <h3 className="text-sm font-bold text-white">Re-scan after completing your plan</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                AirdropGuard becomes more useful when users build history. Re-check this wallet in 7 days to see whether Wallet IQ, risk, readiness and health improved.
              </p>
            </div>
          </div>
        </div>

        <button type="button" onClick={() => { setResult(null); setAddress(''); setActiveTab('overview'); setScanHistory([]); setReputationReward(null); }} className="w-full rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-sm font-bold text-sky-300 hover:text-white hover:bg-sky-500/20 transition-colors">
          Scan another wallet
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 overflow-x-hidden">
      <div className="glass-card rounded-3xl p-4 sm:p-5 border border-sky-500/20 bg-sky-500/[0.04]">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <div className="text-base font-black text-white mb-1">Wallet Intelligence Report</div>
            <p className="text-xs text-gray-500 leading-relaxed">Professional wallet intelligence for users, projects and partners. Public-address analysis powered by AirdropGuard signals and GoPlus security checks. AirdropGuard never requests:</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5 pt-3 border-t border-white/5">
          {NEVER_ITEMS.map(item => <span key={item} className="flex items-center justify-center gap-1 text-[10px] font-semibold text-rose-400/80 bg-rose-500/8 border border-rose-500/15 rounded-full px-2.5 py-1">❌ {item}</span>)}
        </div>
        <p className="text-[10px] text-gray-600 mt-2.5">We only analyse publicly available blockchain data.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 overflow-x-hidden">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[0.72fr_0.28fr]">
          <div className="w-full min-w-0 mx-auto max-w-[42rem] sm:max-w-none sm:mx-0">
            <input type="text" value={address} onChange={e => { const next = e.target.value; setAddress(next); if (next && !next.trim().startsWith('0x')) setSelectedChain('solana'); else if (selectedChain === 'solana') setSelectedChain('1'); }} placeholder="Enter wallet address" className="min-h-[48px] w-full max-w-full bg-dark-700/70 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-sky-500/50 transition-colors font-mono min-w-0" disabled={loading} autoComplete="off" spellCheck={false} />
          </div>
          <div className="relative w-full min-w-0 mx-auto max-w-[42rem] sm:max-w-none sm:mx-0">
            <select value={selectedChain} onChange={e => setSelectedChain(e.target.value as SupportedChainId)} disabled={loading || (address.trim() !== '' && !address.trim().startsWith('0x'))} className="min-h-[48px] w-full appearance-none bg-dark-700/70 border border-white/10 rounded-2xl px-4 py-3 pr-9 text-sm text-white focus:outline-none focus:border-sky-500/50 transition-colors disabled:opacity-50">
              {SUPPORTED_CHAINS.map(chain => <option key={chain.id} value={chain.id} className="bg-dark-800 text-white">{chain.name}</option>)}
            </select>
            <ChevronDown className="w-4 h-4 text-gray-600 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 flex items-start gap-2">
            <Globe2 className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-gray-500 leading-relaxed">Selected chain: <span className="text-gray-300 font-semibold">{selectedChainMeta.name}</span> · {selectedChainMeta.focus}</p>
          </div>
          <button type="submit" disabled={loading || !address.trim()} className="w-full max-w-[42rem] mx-auto sm:max-w-none sm:mx-0 sm:w-auto min-h-[48px] px-5 py-3 rounded-2xl bg-sky-500 border border-sky-400/30 text-white hover:bg-sky-500/90 transition-colors text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-lg shadow-sky-500/10">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>{loading ? 'Scanning' : `Analyze ${selectedChainMeta.short}`}</span>
          </button>
        </div>
      </form>

      {loading && (
        <div className="glass-card rounded-3xl p-4 border border-sky-500/15 bg-sky-500/[0.04]">
          <div className="flex items-center gap-2 mb-3"><Sparkles className="w-4 h-4 text-sky-400" /><span className="text-sm font-semibold text-white">Building Wallet Intelligence Report...</span></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{[`Reading ${selectedChainMeta.name} public wallet data`, 'Checking GoPlus address risk', 'Scanning token security', 'Reviewing approval exposure'].map(item => <div key={item} className="flex items-center gap-2 text-xs text-gray-500"><Loader2 className="w-3 h-3 animate-spin text-sky-400" />{item}</div>)}</div>
        </div>
      )}

      {error && <div className="flex items-start gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3"><XCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}</div>}

      {result && (
        <div className="glass-card rounded-3xl p-4 sm:p-5 space-y-4 animate-slide-up">
          <div className="rounded-3xl border border-sky-500/15 bg-gradient-to-br from-sky-500/[0.08] via-dark-800 to-neon-purple/[0.06] p-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2"><Fingerprint className="w-4 h-4 text-sky-400" /><h3 className="text-sm font-bold text-white">Wallet Intelligence Report</h3></div>
                <p className="text-xs text-gray-400 leading-relaxed max-w-2xl">{executiveInsight?.summary ?? result.summary}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="text-[10px] text-sky-300 bg-sky-500/10 border border-sky-500/15 rounded-full px-2 py-0.5">{selectedChainMeta.name}</span>
                  <span className="text-[10px] text-gray-500 bg-white/[0.03] border border-white/5 rounded-full px-2 py-0.5">{truncateAddr(result.address)}</span>
                  {result.totalUsdValue !== null && result.totalUsdValue > 0 && <span className="text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/15 rounded-full px-2 py-0.5">{fmtUsd(result.totalUsdValue)}</span>}
                  {scanHistory.length > 0 && <span className="text-[10px] text-neon-purple bg-neon-purple/10 border border-neon-purple/15 rounded-full px-2 py-0.5">{scanHistory.length} saved scan{scanHistory.length !== 1 ? 's' : ''}</span>}
                </div>
              </div>
              <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:shrink-0">
                <div className="rounded-2xl border border-white/5 bg-dark-900/40 p-3 text-center"><div className={cn('text-4xl font-black leading-none', scoreTone(result.walletHealthScore))}>{result.walletGrade}</div><div className="text-[10px] text-gray-600 uppercase tracking-wider mt-1">Grade</div></div>
                <div className="rounded-2xl border border-white/5 bg-dark-900/40 p-3 text-center"><div className={cn('text-4xl font-black leading-none', scoreTone(walletIQ))}>{walletIQ}</div><div className="text-[10px] text-gray-600 uppercase tracking-wider mt-1">IQ</div></div>
              </div>
            </div>
          </div>

          <div className={cn('rounded-2xl border p-4', reputationReward?.repAwarded ? 'border-amber-500/20 bg-amber-500/[0.05]' : 'border-white/5 bg-dark-700/25')}>
            <div className="flex items-start gap-3">
              <div className={cn('w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0', reputationReward?.repAwarded ? 'bg-amber-500/10 border-amber-500/25' : 'bg-white/[0.03] border-white/10')}>
                <Crown className={cn('w-5 h-5', reputationReward?.repAwarded ? 'text-amber-400' : 'text-gray-600')} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold text-white">AirdropGuard Reputation</h3>
                  {reputationReward && reputationReward.level > reputationReward.previousLevel && (
                    <span className="text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
                      Level up
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-500 leading-relaxed">
                  {getRewardMessage(reputationReward)}
                  {reputationReward && (
                    <>
                      {' '}Current level: <span className="text-gray-300 font-semibold">{reputationReward.level}</span>
                      {reputationReward.nextUnlock ? <> · Next unlock: <span className="text-gray-300 font-semibold">{reputationReward.nextUnlock}</span></> : null}
                    </>
                  )}
                </p>

                {reputationReward?.reasons && reputationReward.reasons.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {reputationReward.reasons.slice(0, 4).map(reason => (
                      <span key={reason} className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/15 rounded-full px-2 py-0.5">
                        {reason}
                      </span>
                    ))}
                  </div>
                )}

                {!reputationReward && (
                  <p className="text-[10px] text-gray-600 mt-2">
                    REP appears here after the upgraded wallet-intelligence Edge Function returns a reward response.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="sticky top-16 z-20 -mx-4 sm:-mx-5 px-4 sm:px-5 py-2 bg-dark-950/95 backdrop-blur-xl border-y border-white/5">
            <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {tabs.map(({ id, label, icon: Icon }) => {
                const active = activeTab === id;
                return (
                  <button key={id} type="button" onClick={() => setActiveTab(id)} className={cn('flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold whitespace-nowrap border transition-colors', active ? 'bg-sky-500/15 border-sky-500/25 text-sky-300' : 'bg-white/[0.03] border-white/5 text-gray-500 hover:text-gray-300')}>
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'security' && <SecurityTab />}
          {activeTab === 'portfolio' && <PortfolioTab />}
          {activeTab === 'speculative' && <SpeculativeExposureTab />}
          {activeTab === 'insights' && <InsightsTab />}
          {activeTab === 'actions' && <ActionsTab />}

          <div className="rounded-2xl border border-sky-500/15 bg-sky-500/[0.04] p-4">
            <div className="flex items-start gap-3">
              <BadgeCheck className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-bold text-white">
                  {scanHistory.length > 0 ? 'Saved to your Wallet Evolution history' : 'Live report generated'}
                </h3>
                <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                  {scanHistory.length > 0
                    ? `This wallet now has ${scanHistory.length} saved scan${scanHistory.length !== 1 ? 's' : ''}. Use the Actions tab to compare Wallet IQ, health, readiness and risk over time.`
                    : 'If you are logged in, this scan can be saved to build a progress timeline for this wallet.'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 pt-2 border-t border-white/5">
            <Info className="w-3.5 h-3.5 text-gray-600 mt-0.5 shrink-0" />
            <p className="text-[10px] text-gray-600 leading-relaxed">Wallet analysis is informational only and does not indicate ownership, legitimacy, safety, or future airdrop eligibility. Results should be used alongside independent research.</p>
          </div>
        </div>
      )}
    </div>
  );
}
