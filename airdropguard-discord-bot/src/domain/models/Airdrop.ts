export interface TrustScoreBreakdown {
  team: number;
  security: number;
  tokenomics: number;
  community: number;
  transparency: number;
}

export interface AirdropProject {
  id: string;
  name: string;
  category?: string;
  website?: string;
  summary?: string;
  verified: boolean;
  flaggedScam: boolean;
  scamReasons: string[];
  trustScore: number;
  trustScoreBreakdown: TrustScoreBreakdown;
  estimatedReward?: string;
  tasks: string[];
  publishedAt?: string;
}

export interface ScamAlert {
  id: string;
  projectName: string;
  reason: string;
  detectedAt: string;
  severity: "low" | "medium" | "high" | "critical";
  sourceUrl?: string;
}

export interface WebsiteUpdate {
  id: string;
  title: string;
  details: string;
  url: string;
  publishedAt: string;
}
