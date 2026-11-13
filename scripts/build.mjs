// Builds the extension into dist/. Content scripts must be classic (non-module) scripts,
// so each entry is built separately as a self-contained IIFE.
// Usage: node scripts/build.mjs [--watch]
import { build } from 'vite';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const watch = process.argv.includes('--watch');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

const base = {
  configFile: false,
  root,
  publicDir: false,
  logLevel: 'warn',
};

const scripts = [
  ['src/content/main.ts', 'content/main.js', 'PortholeMain'],
  ['src/content/isolated.ts', 'content/isolated.js', 'PortholeIsolated'],
  ['src/background/background.ts', 'background.js', 'PortholeBackground'],
];

for (const [entry, file, name] of scripts) {
  await build({
    ...base,
    build: {
      outDir: dist,
      emptyOutDir: false,
      target: 'chrome116',
      minify: false, // keep readable for store reviewers; the bundle is tiny
      sourcemap: false,
      watch: watch ? {} : null,
      lib: { entry: resolve(root, entry), formats: ['iife'], name, fileName: () => file },
    },
  });
}

// Options page (HTML entry)
await build({
  ...base,
  root: resolve(root, 'src/options'),
  base: './',
  build: {
    outDir: resolve(dist, 'options'),
    emptyOutDir: false,
    target: 'chrome116',
    minify: false,
    sourcemap: false,
    watch: watch ? {} : null,
    modulePreload: false,
    rollupOptions: { input: resolve(root, 'src/options/options.html') },
  },
});

// Manifest (version comes from package.json) + icons
const manifest = JSON.parse(readFileSync(resolve(root, 'src/manifest.json'), 'utf8'));
manifest.version = pkg.version;
writeFileSync(resolve(dist, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
if (!existsSync(resolve(root, 'assets/icons/icon-128.png'))) {
  throw new Error('Icons missing. Run `npm run assets` first.');
}
cpSync(resolve(root, 'assets/icons'), resolve(dist, 'icons'), { recursive: true });

console.log(`Built Porthole v${pkg.version} -> dist/${watch ? ' (watching)' : ''}`);
