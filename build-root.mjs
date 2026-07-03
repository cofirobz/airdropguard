import { cpSync, existsSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

execSync(`${npmCommand} --prefix ./project install`, { stdio: 'inherit' });
execSync(`${npmCommand} --prefix ./project run build`, { stdio: 'inherit' });

rmSync('dist', { recursive: true, force: true });
cpSync('project/dist', 'dist', { recursive: true });

const htmlPath = path.resolve('dist/index.html');
if (!existsSync(htmlPath)) {
	throw new Error('Build output invalid: dist/index.html was not generated');
}

const html = readFileSync(htmlPath, 'utf8');
const assetRefs = [...html.matchAll(/\/assets\/[^"']+\.(?:js|css)/g)].map((m) => m[0]);
const uniqueRefs = [...new Set(assetRefs)];
const missing = uniqueRefs.filter((ref) => !existsSync(path.resolve(`dist${ref}`)));

if (missing.length > 0) {
	throw new Error(
		`Build output invalid: index references missing assets -> ${missing.join(', ')}`
	);
}

console.log(`[build-root] Verified ${uniqueRefs.length} index asset reference(s) in dist/assets.`);