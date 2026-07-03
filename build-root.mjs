import { cpSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

execSync(`${npmCommand} --prefix ./project install`, { stdio: 'inherit' });
execSync(`${npmCommand} --prefix ./project run build`, { stdio: 'inherit' });

rmSync('dist', { recursive: true, force: true });
cpSync('project/dist', 'dist', { recursive: true });