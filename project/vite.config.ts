import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { SITEMAP_BASE_URL, STATIC_SITEMAP_ROUTES } from './scripts/sitemap.config.mjs';

type AirdropRecord = Record<string, unknown> & {
  slug?: string;
  updated_at?: string;
};

type AffiliateRecord = {
  slug?: string;
  created_at?: string;
};

const NEGATIVE_STATE_VALUES = new Set([
  'rejected',
  'blacklisted',
  'hidden',
  'archived',
  'pending',
  'under_review',
  'draft',
  'replaced_demo',
]);

const NEGATIVE_STATE_FIELDS = ['review_status', 'listing_state', 'status', 'visibility'];
const NEGATIVE_BOOL_FIELDS = [
  'is_hidden',
  'hidden',
  'is_archived',
  'archived',
  'is_blacklisted',
  'blacklisted',
  'is_rejected',
  'rejected',
];

function toLowerString(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function isTrue(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function isNotDemo(value: unknown): boolean {
  return value !== true;
}

function isRealLiveAirdrop(row: AirdropRecord): boolean {
  if (!row.slug || typeof row.slug !== 'string') return false;

  if ('is_demo' in row && !isNotDemo(row.is_demo)) return false;

  for (const field of NEGATIVE_STATE_FIELDS) {
    if (!(field in row)) continue;
    const value = toLowerString(row[field]);
    if (value && NEGATIVE_STATE_VALUES.has(value)) return false;
  }

  for (const field of NEGATIVE_BOOL_FIELDS) {
    if (!(field in row)) continue;
    if (isTrue(row[field])) return false;
  }

  return true;
}

function normalizeAirdrops(rows: AirdropRecord[]): Array<{ slug: string; updated_at: string }> {
  const seen = new Set<string>();
  const out: Array<{ slug: string; updated_at: string }> = [];

  for (const row of rows) {
    if (!isRealLiveAirdrop(row)) continue;
    const slug = String(row.slug).trim();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push({ slug, updated_at: typeof row.updated_at === 'string' ? row.updated_at : '' });
  }

  return out;
}

function buildSitemapXml(
  airdropSlugs: Array<{ slug: string; updated_at: string }>,
  affiliateSlugs: Array<{ slug: string; created_at: string }>
): string {
  const today = new Date().toISOString().split('T')[0];

  const entries = [
    ...STATIC_SITEMAP_ROUTES.map(
      (p) =>
        `<url>
<loc>${SITEMAP_BASE_URL}${p.path}</loc>
<changefreq>${p.changefreq}</changefreq>
<priority>${p.priority}</priority>
</url>`
    ),
    ...airdropSlugs.map((a) => {
      const lastmod = a.updated_at ? a.updated_at.split('T')[0] : today;
      return `<url>
<loc>${SITEMAP_BASE_URL}/airdrop/${a.slug}</loc>
<lastmod>${lastmod}</lastmod>
<changefreq>weekly</changefreq>
<priority>0.8</priority>
</url>`;
    }),
    ...affiliateSlugs.map((a) => {
      const lastmod = a.created_at ? a.created_at.split('T')[0] : today;
      return `<url>
<loc>${SITEMAP_BASE_URL}/tools/${a.slug}</loc>
<lastmod>${lastmod}</lastmod>
<changefreq>weekly</changefreq>
<priority>0.7</priority>
</url>`;
    }),
  ].join('\n\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

${entries}

</urlset>`;
}

function getEnvValue(envContent: string, key: string) {
  return (
    envContent.match(new RegExp(`^${key}=(.+)$`, 'm'))?.[1]?.trim() ||
    process.env[key] ||
    ''
  ).replace(/^["']|["']$/g, '');
}

function sitemapGeneratorPlugin() {
  return {
    name: 'sitemap-generator',
    apply: 'build' as const,
    async closeBundle() {
      const distSitemap = path.resolve(__dirname, 'dist/sitemap.xml');
      const envPath = path.resolve(__dirname, '.env');
      const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

      const supabaseUrl = getEnvValue(envContent, 'VITE_SUPABASE_URL');
      const anonKey = getEnvValue(envContent, 'VITE_SUPABASE_ANON_KEY');

      let airdrops: Array<{ slug: string; updated_at: string }> = [];
      let affiliates: Array<{ slug: string; created_at: string }> = [];

      if (supabaseUrl && anonKey) {
        try {
          const res = await fetch(
            `${supabaseUrl}/rest/v1/airdrops?select=*&order=updated_at.desc.nullslast`,
            {
              headers: {
                apikey: anonKey,
                Authorization: `Bearer ${anonKey}`,
              },
            }
          );

          if (res.ok) {
            const rows = (await res.json()) as AirdropRecord[];
            airdrops = normalizeAirdrops(rows);
          } else {
            console.warn(`[sitemap] Supabase returned ${res.status} — static pages only.`);
          }

          const affiliateRes = await fetch(
            `${supabaseUrl}/rest/v1/affiliate_links_public?select=slug,created_at&order=created_at.desc.nullslast`,
            {
              headers: {
                apikey: anonKey,
                Authorization: `Bearer ${anonKey}`,
              },
            }
          );

          if (affiliateRes.ok) {
            const affiliateRows = (await affiliateRes.json()) as AffiliateRecord[];
            const seen = new Set<string>();
            affiliates = affiliateRows
              .filter((row) => typeof row.slug === 'string' && row.slug.trim().length > 0)
              .map((row) => ({
                slug: String(row.slug).trim(),
                created_at: typeof row.created_at === 'string' ? row.created_at : '',
              }))
              .filter((row) => {
                if (seen.has(row.slug)) return false;
                seen.add(row.slug);
                return true;
              });
          } else {
            console.warn(`[sitemap] Affiliate fetch returned ${affiliateRes.status} — skipping tool URLs.`);
          }
        } catch (e) {
          console.warn(`[sitemap] Could not fetch dynamic sitemap content: ${e} — static pages only.`);
        }
      } else {
        console.warn('[sitemap] No Supabase credentials found — static pages only.');
      }

      fs.mkdirSync(path.dirname(distSitemap), { recursive: true });
      fs.writeFileSync(distSitemap, buildSitemapXml(airdrops, affiliates), 'utf8');
      console.log(
        `[sitemap] Generated with ${airdrops.length} airdrop URL(s) and ${affiliates.length} tool URL(s) → dist/sitemap.xml`
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), sitemapGeneratorPlugin()],

  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          helmet: ['react-helmet-async'],
          icons: ['lucide-react'],
        },
      },
    },
  },
});