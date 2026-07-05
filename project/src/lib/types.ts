export const BLOCKCHAIN_OPTIONS = [
  'Ethereum',
  'Solana',
  'Base',
  'Arbitrum',
  'Optimism',
  'Polygon',
  'BNB Chain',
  'Avalanche',
  'Cosmos',
  'Starknet',
  'zkSync',
  'Linea',
  'Scroll',
  'Mantle',
  'Blast',
  'Sui',
  'Aptos',
  'Sei',
  'Berachain',
  'Monad',
  'Movement',
  'Hyperliquid',
  'Babylon',
  'Celestia',
  'Fuel',
  'Taiko',
  'Plume',
  'Sophon',
  'Eclipse',
  'TON',
  'Bitcoin',
  'Near',
  'Injective',
  'MultiversX',
  'Sonic',
  'Ronin',
  'Abstract',
  'MegaETH',
  'Multi-chain',
  'Other',
] as const;

export const CATEGORY_OPTIONS = [
  'DeFi',
  'NFT',
  'Layer 1',
  'Layer 2',
  'Layer 3',
  'Bridge',
  'Social',
  'SocialFi',
  'Gaming',
  'Infrastructure',
  'Wallet',
  'DAO',
  'Metaverse',
  'DEX',
  'Lending',
  'Perpetuals',
  'Restaking',
  'Liquid Staking',
  'RWA',
  'Oracle',
  'ZK',
  'Privacy',
  'Security',
  'Identity',
  'Messaging',
  'AI',
  'Data',
  'Data Availability',
  'DePIN',
  'Modular',
  'Interoperability',
  'Prediction Market',
  'Payments',
  'Stablecoin',
  'Launchpad',
  'Quest Platform',
  'Consumer Crypto',
  'Bitcoin Ecosystem',
  'Verified Airdrop',
  'Testnet',
  'Points Program',
  'Speculative Token',
  'Scam Alert',
  'Mainnet',
  'Other',
] as const;

export type Blockchain = typeof BLOCKCHAIN_OPTIONS[number];
export type Category = typeof CATEGORY_OPTIONS[number];

export type RewardPotential = 'Low' | 'Medium' | 'High';
export type Difficulty = 'Easy' | 'Moderate' | 'Hard';
export type RiskLevel = 'Low' | 'Medium' | 'High';
export type AirdropStatus = 'Active' | 'Ending Soon' | 'Expired';

export interface Airdrop {
  id: string;
  slug: string;
  name: string;
  ticker: string;
  logo_url: string;
  blockchain: Blockchain[];
  category: Category[];
  reward_potential: RewardPotential;
  difficulty: Difficulty;
  time_required: string;
  expiry_date: string | null;
  risk_level: RiskLevel;
  status: AirdropStatus;
  ai_summary: string;
  ai_risk_analysis: string;
  ai_reward_estimate: string;
  overview: string;
  why_airdrop: string;
  estimated_reward: string;
  website_url: string;
  twitter_url: string;
  discord_url: string;
  telegram_url: string;
  github_url: string;
  contract_address: string;
  docs_url: string | null;
  funding_info: string | null;
  investors: string | null;
  team_info: string | null;
  is_trending: boolean;
  is_featured: boolean;
  is_sponsored: boolean;
  published: boolean;
  trust_score: number | null;
  trust_label: string | null;
  score_reasons: string[] | null;
  sub_scores: Record<string, number> | null;
  human_verified: boolean;
  source: string;
  listing_state: 'verified' | 'under_review' | 'scam_alert';
  blacklist_reason: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface AirdropTask {
  id: string;
  airdrop_id: string;
  title: string;
  description: string;
  sort_order: number;
  created_at: string;
}

export interface AirdropWithTasks extends Airdrop {
  tasks: AirdropTask[];
}

export interface UserPreferences {
  user_id: string;
  experience_level: 'beginner' | 'intermediate' | 'advanced' | null;
  daily_time_available: '15' | '30' | '60+' | null;
  preferred_chains: string[] | null;
  risk_tolerance: 'low' | 'medium' | 'high' | null;
}