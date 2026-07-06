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

const articleKey = 'best-ai-airdrop-scanner-tools';
const canonical = 'https://airdropguard.com/articles/best-ai-airdrop-scanner-tools';

const articleBlocks = [
  { type: 'p', text: 'People searching for the best AI airdrop scanner tools usually want one thing: less noise and fewer mistakes. In 2026, there are more projects, more campaigns, and more fake opportunities than most users can manually evaluate every day.' },
  { type: 'p', text: 'A good scanner is not just a list of links. It should help you decide where to spend your time, reduce scam exposure, and keep your wallet safe while you research. This guide explains what to look for and how to compare tools without getting trapped by marketing claims.' },
  { type: 'h2', text: 'What Makes an AI Airdrop Scanner Actually Useful?' },
  { type: 'h3', text: '1) Risk visibility, not just opportunity hype' },
  { type: 'p', text: 'Some tools rank potential rewards but hide risk details. A reliable scanner should surface trust signals and red flags side by side so beginners can make balanced decisions.' },
  { type: 'h3', text: '2) Explainable scoring' },
  { type: 'p', text: 'If a tool says a project is good, it should explain why. Look for transparent factors such as source quality, social proof consistency, contract history, and campaign clarity.' },
  { type: 'h3', text: '3) Scam intelligence updates' },
  { type: 'p', text: 'Scam conditions change quickly. Useful tools track warnings and suspicious patterns in near real time, not once per month.' },
  { type: 'h3', text: '4) Safe workflow support' },
  { type: 'p', text: 'The best platforms help users research with minimal wallet exposure first. Read-only checks, clear warnings, and permission hygiene guidance are all strong positives.' },
  { type: 'h2', text: 'How to Compare AI Scanner Tools (Simple Framework)' },
  { type: 'li', text: 'Coverage: Does the tool monitor enough ecosystems to be useful for your strategy?' },
  { type: 'li', text: 'Signal quality: Are scores backed by evidence and explainable factors?' },
  { type: 'li', text: 'Safety workflow: Does it guide users away from risky signing behavior?' },
  { type: 'li', text: 'Actionability: Can you quickly decide what to do next without digging through clutter?' },
  { type: 'li', text: 'Transparency: Are review standards and methodology visible?' },
  { type: 'h2', text: 'Where AirdropGuard Fits' },
  { type: 'p', text: 'AirdropGuard combines AI support with trust-first review workflows so users can prioritize opportunities without skipping safety checks. It is designed for real users who want practical decisions, not vanity dashboards.' },
  { type: 'p', text: 'Use it in this order: browse verified opportunities, check scam context, review methodology, then move into workflow automation only when you are comfortable.' },
  { type: 'h2', text: 'Wallet Safety Warnings You Should Never Ignore' },
  { type: 'li', text: 'Never enter your seed phrase on any scanner, claim page, or support chat.' },
  { type: 'li', text: 'AirdropGuard never asks for seed phrases or private keys.' },
  { type: 'li', text: 'Avoid signing approvals you do not understand, even on polished interfaces.' },
  { type: 'li', text: 'Use a separate wallet for experimental campaigns and unknown contracts.' },
  { type: 'h2', text: 'When API and Pricing Matter' },
  { type: 'p', text: 'If you are a power user, analyst, or builder, API access can save hours by feeding scoring and risk context into your own workflow. For casual users, built-in pages are often enough. For teams, API and pricing details become important as soon as you want repeatable automation.' },
  { type: 'h2', text: 'FAQ' },
  { type: 'h3', text: 'Are AI airdrop scanner tools accurate?' },
  { type: 'p', text: 'They can be helpful, but no scanner is perfect. Use AI ranking as a starting point and verify key details before interacting with a project.' },
  { type: 'h3', text: 'What is the safest way to use scanner tools?' },
  { type: 'p', text: 'Do research first, avoid signing until checks are complete, and use separate wallets for riskier interactions.' },
  { type: 'h3', text: 'Should beginners use API features?' },
  { type: 'p', text: 'Not required. Beginners can use standard dashboards and guided pages. API features are best for advanced workflows.' },
  { type: 'h3', text: 'How do I avoid fake scanner platforms?' },
  { type: 'p', text: 'Use known domains, verify official social links, and cross-check warning feeds before trusting any platform with wallet actions.' },
];

function VerificationIcon({ status }: { status: VerificationStatus }) {
  if (status === 'verified_airdropguard') return <BadgeCheck className="h-3.5 w-3.5" />;
  if (status === 'human_reviewed') return <UserCheck className="h-3.5 w-3.5" />;
  return <Bot className="h-3.5 w-3.5" />;
}

export default function BestAiAirdropScannerToolsPage() {
  const profile = findArticleProfile(articleKey, DEFAULT_ARTICLE_TRUST_PROFILES);
  const readingTime = profile.estimatedReadMinutes || estimateReadMinutesFromBlocks(articleBlocks, 9);

  const articleSchema = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: profile.title,
    description: 'Beginner-friendly comparison framework for best AI airdrop scanner tools, including safety checks and practical evaluation criteria.',
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
        title="Best AI Airdrop Scanner Tools | AirdropGuard"
        description="Discover how to evaluate the best AI airdrop scanner tools with practical criteria for signal quality, scam detection, and wallet safety."
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
            Best AI Airdrop Scanner Tools
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
              We prioritize practical safety guidance over hype. Tool rankings should support careful decisions, not replace due diligence.
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
