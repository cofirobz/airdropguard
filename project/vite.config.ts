import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

const STATIC_PAGES = [
  { loc: 'https://airdropguard.com/', changefreq: 'daily', priority: '1.0' },
  { loc: 'https://airdropguard.com/learn', changefreq: 'weekly', priority: '0.7' },
  { loc: 'https://airdropguard.com/scam-alerts', changefreq: 'weekly', priority: '0.8' },
  { loc: 'https://airdropguard.com/submit', changefreq: 'monthly', priority: '0.6' },
  { loc: 'https://airdropguard.com/api-docs', changefreq: 'monthly', priority: '0.6' },
  { loc: 'https://airdropguard.com/pricing', changefreq: 'monthly', priority: '0.6' },
  { loc: 'https://airdropguard.com/advertise', changefreq: 'monthly', priority: '0.5' },
  { loc: 'https://airdropguard.com/articles', changefreq: 'weekly', priority: '0.7' },
  { loc: 'https://airdropguard.com/whitepaper', changefreq: 'monthly', priority: '0.6' },
  { loc: 'https://airdropguard.com/wallet-checker', changefreq: 'weekly', priority: '0.8' },
];

function buildSitemapXml(airdropSlugs: Array<{ slug: string; updated_at: string }>): string {
  const today = new Date().toISOString().split('T')[0];

  const entries = [
    ...STATIC_PAGES.map(
      (p) =>
        `<url>
<loc>${p.loc}</loc>
<changefreq>${p.changefreq}</changefreq>
<priority>${p.priority}</priority>
</url>`
    ),
    ...airdropSlugs.map((a) => {
      const lastmod = a.updated_at ? a.updated_at.split('T')[0] : today;
      return `<url>
<loc>https://airdropguard.com/airdrop/${a.slug}</loc>
<lastmod>${lastmod}</lastmod>
<changefreq>weekly</changefreq>
<priority>0.8</priority>
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

      if (supabaseUrl && anonKey) {
        try {
          const res = await fetch(
            `${supabaseUrl}/rest/v1/airdrops?select=slug,updated_at&published=eq.true&review_status=eq.approved&is_demo=eq.false&order=updated_at.desc`,
            {
              headers: {
                apikey: anonKey,
                Authorization: `Bearer ${anonKey}`,
              },
            }
          );

          if (res.ok) {
            airdrops = await res.json();
          } else {
            console.warn(`[sitemap] Supabase returned ${res.status} — static pages only.`);
          }
        } catch (e) {
          console.warn(`[sitemap] Could not fetch airdrops: ${e} — static pages only.`);
        }
      } else {
        console.warn('[sitemap] No Supabase credentials found — static pages only.');
      }

      fs.mkdirSync(path.dirname(distSitemap), { recursive: true });
      fs.writeFileSync(distSitemap, buildSitemapXml(airdrops), 'utf8');
      console.log(`[sitemap] Generated with ${airdrops.length} airdrop URL(s) → dist/sitemap.xml`);
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