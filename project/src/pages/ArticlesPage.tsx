import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Bot, Eye, ShieldCheck, Sparkles, UserCheck } from 'lucide-react';
import SEO from '../components/SEO';
import { supabase } from '../lib/supabase';
import {
  DEFAULT_ARTICLE_TRUST_PROFILES,
  formatCompactDate,
  mergeArticleProfiles,
  type ArticleTrustProfile,
  type VerificationStatus,
  verificationStatusLabel,
  verificationStatusTone,
} from '../lib/articleTrust';
import { canonicalFromPath } from '../lib/seo';

function VerificationIcon({ status }: { status: VerificationStatus }) {
  if (status === 'verified_airdropguard') return <BadgeCheck className="h-3.5 w-3.5" />;
  if (status === 'human_reviewed') return <UserCheck className="h-3.5 w-3.5" />;
  return <Bot className="h-3.5 w-3.5" />;
}

export default function ArticlesPage() {
  const [profiles, setProfiles] = useState<ArticleTrustProfile[]>(DEFAULT_ARTICLE_TRUST_PROFILES);

  useEffect(() => {
    let cancelled = false;

    const loadProfiles = async () => {
      const { data, error } = await supabase
        .from('article_verification_profiles')
        .select('article_key, title, url_path, publication_status, verification_status, reviewed_by, reviewed_at, last_updated_at, estimated_read_minutes, official_docs_url, official_github_url, official_website_url, official_x_url, official_blog_url')
        .order('updated_at', { ascending: false });

      if (error || !data || cancelled) return;

      const mapped = data.map((row) => ({
        articleKey: row.article_key,
        title: row.title,
        urlPath: row.url_path,
        publicationStatus: row.publication_status,
        verificationStatus: row.verification_status,
        reviewedBy: row.reviewed_by || 'AirdropGuard Team',
        reviewedAt: row.reviewed_at,
        lastUpdatedAt: row.last_updated_at,
        estimatedReadMinutes: row.estimated_read_minutes,
        sources: {
          officialDocsUrl: row.official_docs_url,
          githubUrl: row.official_github_url,
          officialWebsiteUrl: row.official_website_url,
          officialXUrl: row.official_x_url,
          officialBlogUrl: row.official_blog_url,
        },
      })) as ArticleTrustProfile[];

      setProfiles(mergeArticleProfiles(DEFAULT_ARTICLE_TRUST_PROFILES, mapped));
    };

    void loadProfiles();
    return () => {
      cancelled = true;
    };
  }, []);

  const publishedProfiles = useMemo(
    () => profiles.filter((article) => article.publicationStatus === 'published'),
    [profiles]
  );

  const articleSchema = useMemo(() => ({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': 'https://airdropguard.com/articles#collection',
        name: 'AirdropGuard Articles',
        url: 'https://airdropguard.com/articles',
        description: 'AirdropGuard educational articles with transparent AI and human verification provenance.',
      },
      {
        '@type': 'ItemList',
        '@id': 'https://airdropguard.com/articles#list',
        itemListElement: publishedProfiles.map((article, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: `https://airdropguard.com${article.urlPath}`,
          name: article.title,
        })),
      },
      {
        '@type': 'BreadcrumbList',
        '@id': 'https://airdropguard.com/articles#breadcrumb',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: 'https://airdropguard.com/',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Articles',
            item: 'https://airdropguard.com/articles',
          },
        ],
      },
    ],
  }), [publishedProfiles]);

  const fullyVerifiedCount = useMemo(
    () => publishedProfiles.filter((article) => article.verificationStatus === 'verified_airdropguard').length,
    [publishedProfiles]
  );

  return (
    <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-0 top-10 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute right-0 top-28 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <SEO
        title="Crypto Airdrop Security Articles | AirdropGuard"
        description="Read security-first crypto airdrop guides, scam-detection playbooks, and AI-reviewed research with transparent verification metadata."
        canonical={canonicalFromPath('/articles')}
        type="website"
        schema={articleSchema}
      />

      <header className="mb-8 overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(9,18,35,0.95),rgba(18,28,52,0.9))] p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-100">
              <Sparkles className="h-3.5 w-3.5" />
              Welcome To Articles
            </p>
            <h1 className="mt-3 text-3xl font-black text-white sm:text-4xl">Learn Safely, Move Confidently</h1>
            <p className="mt-3 text-sm leading-relaxed text-gray-300">
              Explore practical crypto guides reviewed with a trust-first workflow. Each article shows clear verification metadata so you know what is AI-assisted, human-reviewed, or fully verified.
            </p>
          </div>
          <div className="grid min-w-[240px] grid-cols-1 gap-2 text-xs sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
              <p className="text-gray-400">Published Articles</p>
              <p className="mt-1 text-lg font-semibold text-white">{publishedProfiles.length}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
              <p className="text-gray-400">Fully Verified</p>
              <p className="mt-1 text-lg font-semibold text-emerald-200">{fullyVerifiedCount}</p>
            </div>
          </div>
        </div>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-[11px] text-emerald-100">
          <ShieldCheck className="h-3.5 w-3.5" />
          Always verify links before connecting your wallet
        </div>
      </header>

      <section className="grid gap-4">
        {publishedProfiles.map((article) => (
          <Link
            key={article.articleKey}
            to={article.urlPath}
            className="group block rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-cyan-400/30 hover:bg-white/[0.06]"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-white group-hover:text-cyan-100">{article.title}</h2>
                <p className="mt-1 text-sm text-gray-400">Clear, practical guidance with transparent trust metadata.</p>
              </div>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${verificationStatusTone(article.verificationStatus)}`}>
                <VerificationIcon status={article.verificationStatus} />
                {verificationStatusLabel(article.verificationStatus)}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5">
                <UserCheck className="h-3 w-3" />
                {article.reviewedBy || 'AirdropGuard Team'}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5">
                <Eye className="h-3 w-3" />
                {article.estimatedReadMinutes} min read
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5">Reviewed {formatCompactDate(article.reviewedAt)}</span>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5">Updated {formatCompactDate(article.lastUpdatedAt)}</span>
            </div>

            <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-cyan-200 transition-colors group-hover:text-cyan-100">
              Read article
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>
        ))}

        {publishedProfiles.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-gray-400">
            No published articles yet. Once an admin marks an article as published, it will appear here.
          </div>
        )}
      </section>
    </div>
  );
}