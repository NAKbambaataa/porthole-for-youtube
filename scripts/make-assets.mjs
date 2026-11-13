// Generates extension icons + Chrome Web Store art from assets/icon.svg.
// Run: npm run assets
import sharp from 'sharp';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const iconSvg = readFileSync(resolve(root, 'assets/icon.svg'), 'utf8');
const iconInner = iconSvg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

const out = (p) => resolve(root, p);
mkdirSync(out('assets/icons'), { recursive: true });
mkdirSync(out('store/assets'), { recursive: true });

// 1. Extension icons
for (const size of [16, 32, 48, 128]) {
  await sharp(Buffer.from(iconSvg), { density: Math.max(72, size * 4) })
    .resize(size, size)
    .png()
    .toFile(out(`assets/icons/icon-${size}.png`));
}

// 2. Large logo for README / social
await sharp(Buffer.from(iconSvg), { density: 600 }).resize(512, 512).png().toFile(out('assets/logo-512.png'));

// 3. Store tiles
const FONT = "-apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif";

function tile(w, h, { titleSize, subSize, tagSize, mock = true }) {
  const iconSize = h * 0.62;
  const iconX = w * 0.08;
  const iconY = (h - iconSize) / 2;
  const textX = iconX + iconSize + w * 0.05;
  const mid = h / 2;
  // floating "pop-out" window mock on the right
  const pw = w * 0.2;
  const ph = pw * 0.5625;
  const px = w - pw - w * 0.07;
  const py = (h - ph) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b2236"/><stop offset="1" stop-color="#0f4a5c"/>
    </linearGradient>
    <linearGradient id="win" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#46dccd"/><stop offset="1" stop-color="#127c8f"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  ${mock ? `<g transform="translate(${px} ${py})">
    <rect x="${pw * 0.04}" y="${pw * 0.05}" width="${pw}" height="${ph}" rx="${pw * 0.05}" fill="#000" fill-opacity="0.35"/>
    <rect width="${pw}" height="${ph}" rx="${pw * 0.05}" fill="url(#win)" stroke="#f4dc96" stroke-width="${Math.max(2, pw * 0.02)}"/>
    <path d="M${pw * 0.43} ${ph * 0.3}v${ph * 0.4}l${pw * 0.17}-${ph * 0.2}z" fill="#fff"/>
  </g>` : ''}
  <g transform="translate(${iconX} ${iconY}) scale(${iconSize / 128})">${iconInner}</g>
  <text x="${textX}" y="${mid - h * 0.02}" font-family="${FONT}" font-weight="700" font-size="${titleSize}" fill="#ffffff">Porthole</text>
  <text x="${textX}" y="${mid + subSize * 1.05}" font-family="${FONT}" font-weight="500" font-size="${subSize}" fill="#46dccd">for YouTube</text>
  <text x="${textX}" y="${mid + subSize * 1.05 + tagSize * 2}" font-family="${FONT}" font-weight="400" font-size="${tagSize}" fill="#ffffff" fill-opacity="0.8">Pop your video out. Keep working.</text>
</svg>`;
}

const small = tile(440, 280, { titleSize: 40, subSize: 22, tagSize: 13, mock: false });
const marquee = tile(1400, 560, { titleSize: 96, subSize: 48, tagSize: 28 });
writeFileSync(out('store/assets/promo-small-440x280.svg'), small);
writeFileSync(out('store/assets/promo-marquee-1400x560.svg'), marquee);
await sharp(Buffer.from(small)).png().toFile(out('store/assets/promo-small-440x280.png'));
await sharp(Buffer.from(marquee)).png().toFile(out('store/assets/promo-marquee-1400x560.png'));
await sharp(Buffer.from(iconSvg), { density: 600 }).resize(128, 128).png().toFile(out('store/assets/store-icon-128.png'));

console.log('assets generated');
