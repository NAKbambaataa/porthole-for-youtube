// Zips dist/ for upload to the Chrome Web Store. Run via `npm run package`.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const release = resolve(root, 'release');
const { version } = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

if (!existsSync(resolve(dist, 'manifest.json'))) throw new Error('dist/ missing. Run `npm run build` first.');

mkdirSync(release, { recursive: true });
const zip = resolve(release, `porthole-for-youtube-v${version}.zip`);
rmSync(zip, { force: true });
execFileSync('zip', ['-r', '-X', '-q', zip, '.'], { cwd: dist });

console.log(`Created ${zip} (${(statSync(zip).size / 1024).toFixed(1)} KB)`);
console.log(execFileSync('unzip', ['-l', zip], { encoding: 'utf8' }));
