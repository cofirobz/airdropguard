import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Bot, Eye, UserCheck } from 'lucide-react';
import SEO from '../components/SEO';
import { supabase } from '../lib/supabase';
import {
  DEFAULT_ARTICLE_TRUST_PROFILES,
  formatCompactDate,
  type ArticleTrustProfile,
  type VerificationStatus,
  verificationStatusLabel,
  verificationStatusTone,
} from '../lib/articleTrust';

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

      setProfiles(mapped.length > 0 ? mapped : DEFAULT_ARTICLE_TRUST_PROFILES);
    };

    void loadProfiles();
    return () => {
      cancelled = true;
    };
  }, []);

  const articleSchema = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'AirdropGuard Articles',
    description: 'AirdropGuard educational articles with transparent AI and human verification provenance.',
  }), []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <SEO
        title="Articles"
        description="Security-first crypto education with transparent AI and human verification metadata."
        canonical="https://airdropguard.com/articles"
        type="website"
        schema={articleSchema}
      />

      <header className="mb-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-200">Knowledge Base</p>
        <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">Articles</h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-400">
          Security-first research with transparent provenance. Every article clearly shows whether it is AI-assisted, human reviewed, or fully verified by AirdropGuard.
        </p>
      </header>

      <section className="grid gap-4">
        {profiles.map((article) => (
          <Link
            key={article.articleKey}
            to={article.urlPath}
            className="group block rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-colors hover:border-cyan-400/30 hover:bg-white/[0.04]"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-white group-hover:text-cyan-100">{article.title}</h2>
                <p className="mt-1 text-sm text-gray-400">Professional educational documentation with trust metadata.</p>
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
          </Link>
        ))}
      </section>
    </div>
  );
}