import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Bot, CalendarClock, ShieldCheck, UserCheck } from 'lucide-react';
import SEO from '../components/SEO';
import {
  DEFAULT_ARTICLE_TRUST_PROFILES,
  estimateReadMinutesFromBlocks,
  findArticleProfile,
  formatCompactDate,
  type VerificationStatus,
  verificationStatusLabel,
  verificationStatusTone,
} from '../lib/articleTrust';

const articleKey = 'crypto-airdrop-scam-detection-guide';
const canonical = 'https://airdropguard.com/articles/crypto-airdrop-scam-detection-guide';

const articleBlocks = [
  { type: 'p', text: 'This crypto airdrop scam detection guide is for users who want a practical way to avoid expensive mistakes. Scam tactics in 2026 are more polished than ever, from fake claim portals to impersonation accounts and poisoned links in community channels.' },
  { type: 'p', text: 'The good news: most scam patterns are detectable if you know what to look for. You do not need to be a smart contract engineer. You need a process and a few non-negotiable safety rules.' },
  { type: 'h2', text: 'Common Airdrop Scam Patterns in 2026' },
  { type: 'h3', text: 'Phishing claim pages' },
  { type: 'p', text: 'These pages mimic real projects and pressure users to connect fast. The design can look legitimate, but wallet prompts reveal suspicious approvals.' },
  { type: 'h3', text: 'Social impersonation and fake support' },
  { type: 'p', text: 'Scammers clone usernames, logos, and community language. They often DM users with urgent instructions and fake recovery steps.' },
  { type: 'h3', text: 'Malicious approval requests' },
  { type: 'p', text: 'Some scams skip direct theft and request token approvals first. Later, a drainer contract uses those permissions to move funds.' },
  { type: 'h3', text: 'Urgency traps' },
  { type: 'p', text: 'Phrases like claim in 15 minutes, limited whitelist, or final round are designed to bypass your safety checks.' },
  { type: 'h2', text: 'The Airdrop Scam Detection Workflow' },
  { type: 'li', text: 'Step 1: Validate official links across website, docs, and social channels.' },
  { type: 'li', text: 'Step 2: Cross-check contract addresses with official documentation.' },
  { type: 'li', text: 'Step 3: Inspect wallet prompts and reject broad approvals you do not expect.' },
  { type: 'li', text: 'Step 4: Review risk context in current scam intelligence feeds.' },
  { type: 'li', text: 'Step 5: Use a separate wallet for unknown protocols and test interactions.' },
  { type: 'h2', text: 'Critical Wallet Safety Rules' },
  { type: 'li', text: 'Never share seed phrases. Not with support staff, bots, forms, or claim pages.' },
  { type: 'li', text: 'AirdropGuard never asks for seed phrases or private keys.' },
  { type: 'li', text: 'If a page asks for wallet secrets, treat it as a scam immediately.' },
  { type: 'li', text: 'Prefer read-only checks for eligibility and risk research.' },
  { type: 'li', text: 'Revoke stale approvals on a regular schedule.' },
  { type: 'h2', text: 'How AirdropGuard Helps Detect Risk Faster' },
  { type: 'p', text: 'AirdropGuard is designed to help real users filter opportunities and avoid risky behavior before they sign. Scam alerts, trust context, and clear workflow links make it easier to pause and verify instead of reacting to hype.' },
  { type: 'p', text: 'Use the platform as a checkpoint system: verify opportunity context, review warning data, and only proceed if the risk profile still makes sense for your strategy.' },
  { type: 'h2', text: 'FAQ' },
  { type: 'h3', text: 'What is the fastest way to detect a fake airdrop?' },
  { type: 'p', text: 'Check link consistency and wallet prompt behavior first. If domains or contract addresses do not match official docs, stop immediately.' },
  { type: 'h3', text: 'Can scam pages look exactly like legitimate projects?' },
  { type: 'p', text: 'Yes. Visual quality is no longer a reliable safety signal. Verification steps matter more than appearance.' },
  { type: 'h3', text: 'Should I trust DMs about urgent airdrop claims?' },
  { type: 'p', text: 'No. Treat direct messages as high risk unless confirmed through official project channels you independently verified.' },
  { type: 'h3', text: 'Does AirdropGuard ask for private wallet secrets?' },
  { type: 'p', text: 'No. AirdropGuard never asks for seed phrases or private keys.' },
];

function VerificationIcon({ status }: { status: VerificationStatus }) {
  if (status === 'verified_airdropguard') return <BadgeCheck className="h-3.5 w-3.5" />;
  if (status === 'human_reviewed') return <UserCheck className="h-3.5 w-3.5" />;
  return <Bot className="h-3.5 w-3.5" />;
}

export default function CryptoAirdropScamDetectionGuidePage() {
  const profile = findArticleProfile(articleKey, DEFAULT_ARTICLE_TRUST_PROFILES);
  const readingTime = profile.estimatedReadMinutes || estimateReadMinutesFromBlocks(articleBlocks, 11);

  const articleSchema = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: profile.title,
    description: 'Practical crypto airdrop scam detection guide with beginner-friendly warning checks, wallet safety rules, and risk filtering workflow.',
    author: {
      '@type': 'Organization',
      name: 'AirdropGuard Team',
    },
    publisher: {
      '@type': 'Organization',
      name: 'AirdropGuard',
    },
    dateModified: profile.lastUpdatedAt || undefined,
    datePublished: profile.reviewedAt || undefined,
    url: canonical,
  }), [profile]);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6 lg:px-8">
      <SEO
        title="Crypto Airdrop Scam Detection Guide | AirdropGuard"
        description="Learn how to detect crypto airdrop scams with practical checks, wallet safety warnings, and a beginner-friendly risk workflow."
        canonical={canonical}
        type="article"
        schema={articleSchema}
      />

      <article className="mx-auto max-w-4xl">
        <Link to="/articles" className="text-sm text-cyan-300 hover:text-cyan-200">
          Back to Articles
        </Link>

        <header className="mb-8 mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-200">AirdropGuard Learn Series</p>
          <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl md:text-5xl">
            Crypto Airdrop Scam Detection Guide
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-gray-300">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 ${verificationStatusTone(profile.verificationStatus)}`}>
              <VerificationIcon status={profile.verificationStatus} />
              {verificationStatusLabel(profile.verificationStatus)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1">
              <UserCheck className="h-3 w-3" />
              Reviewed by {profile.reviewedBy || 'AirdropGuard Team'}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1">
              <CalendarClock className="h-3 w-3" />
              Last reviewed {formatCompactDate(profile.reviewedAt)}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1">{readingTime} min read</span>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1">Updated {formatCompactDate(profile.lastUpdatedAt)}</span>
          </div>

          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
            <p className="inline-flex items-center gap-1 font-semibold"><ShieldCheck className="h-4 w-4" /> Team trust note</p>
            <p className="mt-1 text-emerald-50/90">
              This guide is written for practical defense. If a step feels unclear, do not sign. Slow, verified actions beat rushed decisions.
            </p>
          </div>
        </header>

        <div className="space-y-5 text-[17px] leading-8 text-slate-300">
          {articleBlocks.map((block, index) => {
            if (block.type === 'h2') {
              return (
                <h2 key={index} className="pt-8 text-2xl font-bold text-white sm:text-3xl">
                  {block.text}
                </h2>
              );
            }

            if (block.type === 'h3') {
              return (
                <h3 key={index} className="pt-5 text-xl font-semibold text-white sm:text-2xl">
                  {block.text}
                </h3>
              );
            }

            if (block.type === 'li') {
              return (
                <div key={index} className="flex gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <span className="text-cyan-300">•</span>
                  <p>{block.text}</p>
                </div>
              );
            }

            return <p key={index} className="text-slate-300">{block.text}</p>;
          })}
        </div>

        <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-xl font-bold text-white">Useful internal links</h2>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <Link to="/" className="rounded-full border border-white/15 bg-white/[0.03] px-3 py-1.5 text-gray-200 hover:bg-white/[0.08]">Browse verified Airdrops</Link>
            <Link to="/scam-alerts" className="rounded-full border border-white/15 bg-white/[0.03] px-3 py-1.5 text-gray-200 hover:bg-white/[0.08]">Review Scam Alerts</Link>
            <Link to="/whitepaper" className="rounded-full border border-white/15 bg-white/[0.03] px-3 py-1.5 text-gray-200 hover:bg-white/[0.08]">Read methodology</Link>
            <Link to="/api-docs" className="rounded-full border border-white/15 bg-white/[0.03] px-3 py-1.5 text-gray-200 hover:bg-white/[0.08]">Explore API Docs</Link>
            <Link to="/pricing" className="rounded-full border border-white/15 bg-white/[0.03] px-3 py-1.5 text-gray-200 hover:bg-white/[0.08]">View API pricing</Link>
          </div>
        </section>
      </article>
    </main>
  );
}
