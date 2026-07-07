export const SEO_SITE_NAME = 'AirdropGuard';
export const SEO_SITE_URL = 'https://airdropguard.com';

export function canonicalFromPath(path: string): string {
  if (!path || path === '/') return `${SEO_SITE_URL}/`;
  return `${SEO_SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function homeSeoTitle(): string {
  return 'AirdropGuard | AI Crypto Airdrop Scanner & Scam Protection';
}

export function airdropSeoTitle(projectName: string): string {
  return `${projectName} Airdrop Review, Trust Score & Safety Analysis | AirdropGuard`;
}

export function speculativeSeoTitle(tokenName: string): string {
  return `${tokenName} Token Overview & Speculative Analysis | AirdropGuard`;
}

export function scamAlertSeoTitle(projectName: string): string {
  return `${projectName} Scam Alert | AirdropGuard`;
}
