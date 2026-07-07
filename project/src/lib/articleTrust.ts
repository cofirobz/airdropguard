export type VerificationStatus = 'ai_assisted_draft' | 'human_reviewed' | 'verified_airdropguard';
export type PublicationStatus = 'draft' | 'scheduled' | 'published';

export type ArticleSources = {
  officialDocsUrl?: string | null;
  githubUrl?: string | null;
  officialWebsiteUrl?: string | null;
  officialXUrl?: string | null;
  officialBlogUrl?: string | null;
};

export type ArticleTrustProfile = {
  articleKey: string;
  title: string;
  urlPath: string;
  publicationStatus: PublicationStatus;
  verificationStatus: VerificationStatus;
  reviewedBy: string;
  reviewedAt: string | null;
  lastUpdatedAt: string | null;
  estimatedReadMinutes: number;
  sources: ArticleSources;
};

export type ArticleReviewChecklist = {
  factsChecked: boolean;
  sourcesVerified: boolean;
  linksTested: boolean;
  scamGuidanceReviewed: boolean;
  securityAdviceReviewed: boolean;
  grammarChecked: boolean;
  internalReviewNotes: string;
};

export const DEFAULT_REVIEWER = 'AirdropGuard Team';
const DEFAULT_REVIEW_DATE = '2026-06-20T00:00:00.000Z';

export const DEFAULT_ARTICLE_TRUST_PROFILES: ArticleTrustProfile[] = [
  {
    articleKey: 'verify-crypto-airdrops-safely-2026',
    title: 'How to Verify Crypto Airdrops Safely in 2026',
    urlPath: '/articles/how-to-verify-crypto-airdrops-safely-2026',
    publicationStatus: 'published',
    verificationStatus: 'verified_airdropguard',
    reviewedBy: DEFAULT_REVIEWER,
    reviewedAt: DEFAULT_REVIEW_DATE,
    lastUpdatedAt: DEFAULT_REVIEW_DATE,
    estimatedReadMinutes: 11,
    sources: {
      officialDocsUrl: 'https://ethereum.org/en/security/',
      githubUrl: null,
      officialWebsiteUrl: 'https://airdropguard.com',
      officialXUrl: 'https://x.com/Dropguardai',
      officialBlogUrl: null,
    },
  },
  {
    articleKey: 'best-ai-airdrop-scanner-tools',
    title: 'Best AI Airdrop Scanner Tools',
    urlPath: '/articles/best-ai-airdrop-scanner-tools',
    publicationStatus: 'published',
    verificationStatus: 'verified_airdropguard',
    reviewedBy: DEFAULT_REVIEWER,
    reviewedAt: DEFAULT_REVIEW_DATE,
    lastUpdatedAt: DEFAULT_REVIEW_DATE,
    estimatedReadMinutes: 10,
    sources: {
      officialDocsUrl: null,
      githubUrl: null,
      officialWebsiteUrl: 'https://airdropguard.com',
      officialXUrl: 'https://x.com/Dropguardai',
      officialBlogUrl: null,
    },
  },
  {
    articleKey: 'crypto-airdrop-scam-detection-guide',
    title: 'Crypto Airdrop Scam Detection Guide',
    urlPath: '/articles/crypto-airdrop-scam-detection-guide',
    publicationStatus: 'published',
    verificationStatus: 'verified_airdropguard',
    reviewedBy: DEFAULT_REVIEWER,
    reviewedAt: DEFAULT_REVIEW_DATE,
    lastUpdatedAt: DEFAULT_REVIEW_DATE,
    estimatedReadMinutes: 12,
    sources: {
      officialDocsUrl: 'https://ethereum.org/en/security/scams/',
      githubUrl: null,
      officialWebsiteUrl: 'https://airdropguard.com',
      officialXUrl: 'https://x.com/Dropguardai',
      officialBlogUrl: null,
    },
  },
  {
    articleKey: 'layer-2-airdrops-2026',
    title: 'Ethereum Layer 2 Airdrops in 2026: Security, ROI and Risk Framework',
    urlPath: '/articles/layer-2-airdrops-2026',
    publicationStatus: 'published',
    verificationStatus: 'verified_airdropguard',
    reviewedBy: DEFAULT_REVIEWER,
    reviewedAt: DEFAULT_REVIEW_DATE,
    lastUpdatedAt: DEFAULT_REVIEW_DATE,
    estimatedReadMinutes: 16,
    sources: {
      officialDocsUrl: 'https://ethereum.org/en/layer-2/',
      githubUrl: null,
      officialWebsiteUrl: 'https://airdropguard.com',
      officialXUrl: 'https://x.com/Dropguardai',
      officialBlogUrl: null,
    },
  },
];

export const DEFAULT_ARTICLE_CHECKLIST: ArticleReviewChecklist = {
  factsChecked: false,
  sourcesVerified: false,
  linksTested: false,
  scamGuidanceReviewed: false,
  securityAdviceReviewed: false,
  grammarChecked: false,
  internalReviewNotes: '',
};

export function verificationStatusLabel(status: VerificationStatus): string {
  if (status === 'verified_airdropguard') return 'Verified by AirdropGuard';
  if (status === 'human_reviewed') return 'Human Reviewed';
  return 'AI-Assisted Draft';
}

export function verificationStatusTone(status: VerificationStatus): string {
  if (status === 'verified_airdropguard') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  if (status === 'human_reviewed') return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200';
  return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
}

export function sourceLinks(profile: ArticleTrustProfile) {
  const links = [
    { label: 'Official Documentation', href: profile.sources.officialDocsUrl },
    { label: 'GitHub', href: profile.sources.githubUrl },
    { label: 'Official Website', href: profile.sources.officialWebsiteUrl },
    { label: 'Official X Account', href: profile.sources.officialXUrl },
    { label: 'Official Blog', href: profile.sources.officialBlogUrl },
  ].filter((link) => Boolean(link.href));

  return links as Array<{ label: string; href: string }>;
}

export function estimateReadMinutesFromBlocks(blocks: Array<{ text: string }>, fallback = 10): number {
  const words = blocks
    .map((block) => (block.text || '').trim())
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length;

  if (!words) return fallback;
  return Math.max(1, Math.round(words / 220));
}

export function formatCompactDate(value: string | null): string {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function mergeArticleProfiles(
  base: ArticleTrustProfile[],
  remote: Partial<ArticleTrustProfile>[]
): ArticleTrustProfile[] {
  const map = new Map(base.map((item) => [item.articleKey, item]));

  remote.forEach((item) => {
    if (!item.articleKey) return;
    const existing = map.get(item.articleKey);
    if (!existing) return;

    map.set(item.articleKey, {
      ...existing,
      ...item,
      sources: {
        ...existing.sources,
        ...(item.sources || {}),
      },
    });
  });

  return Array.from(map.values());
}

export function findArticleProfile(articleKey: string, profiles: ArticleTrustProfile[]): ArticleTrustProfile {
  return profiles.find((item) => item.articleKey === articleKey) || DEFAULT_ARTICLE_TRUST_PROFILES[0];
}
