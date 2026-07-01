/**
 * Sitemap guardian — PROTECTED FILE
 *
 * public/sitemap.xml contains manually curated SEO URLs.
 * This script prevents the file from being lost during builds.
 *
 * Usage:
 *   node scripts/guard-sitemap.cjs backup   — accept current sitemap as the new reference
 *   node scripts/guard-sitemap.cjs restore  — recover public/ and dist/ from reference
 *   node scripts/guard-sitemap.cjs verify   — exit 1 if sitemap was changed without backup
 *
 * To add new airdrop URLs:
 *   1. Edit public/sitemap.xml
 *   2. Run: npm run sitemap:save   (accepts your edit as the new reference)
 *      OR just run: npm run build  (prebuild does this automatically)
 */

const fs = require('fs');
const path = require('path');

const SOURCE    = path.resolve(__dirname, '../public/sitemap.xml');
const REFERENCE = path.resolve(__dirname, '.sitemap-reference.xml');

function backup() {
  if (!fs.existsSync(SOURCE)) {
    console.error('[sitemap-guard] ERROR: public/sitemap.xml not found.');
    process.exit(1);
  }
  fs.copyFileSync(SOURCE, REFERENCE);
  console.log('[sitemap-guard] Reference updated from public/sitemap.xml.');
}

function restore() {
  if (!fs.existsSync(REFERENCE)) {
    console.warn('[sitemap-guard] No reference found — nothing to restore.');
    return;
  }
  fs.copyFileSync(REFERENCE, SOURCE);
  const distDir = path.resolve(__dirname, '../dist');
  if (fs.existsSync(distDir)) {
    fs.copyFileSync(REFERENCE, path.join(distDir, 'sitemap.xml'));
    console.log('[sitemap-guard] Restored public/sitemap.xml and dist/sitemap.xml.');
  } else {
    console.log('[sitemap-guard] Restored public/sitemap.xml.');
  }
}

function verify() {
  if (!fs.existsSync(REFERENCE)) {
    backup();
    return;
  }
  const current   = fs.readFileSync(SOURCE,    'utf8');
  const reference = fs.readFileSync(REFERENCE, 'utf8');
  if (current !== reference) {
    console.error('[sitemap-guard] sitemap.xml has unsaved changes vs reference.');
    console.error('  Run "npm run sitemap:save" to accept them, or "npm run sitemap:restore" to revert.');
    process.exit(1);
  }
  console.log('[sitemap-guard] sitemap.xml verified — matches reference.');
}

const cmd = process.argv[2];
if      (cmd === 'backup')  backup();
else if (cmd === 'restore') restore();
else if (cmd === 'verify')  verify();
else {
  console.error('[sitemap-guard] Unknown command. Use: backup | restore | verify');
  process.exit(1);
}
