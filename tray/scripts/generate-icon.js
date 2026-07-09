import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

// Renders the real brand mark (assets/favicon.svg) into icon.ico, and a
// pending variant with a small amber badge, replacing the old flat-color
// placeholders systray2/node-notifier used before real branding existed.
const SIZES = [16, 24, 32, 48, 256];

const assetsDir = dirname(fileURLToPath(import.meta.url)).replace(/scripts$/, 'assets');
const svgPath = join(assetsDir, 'favicon.svg');

async function renderBase(size) {
  return sharp(svgPath).resize(size, size).png().toBuffer();
}

async function renderPending(size) {
  const base = await renderBase(size);
  const badgeRadius = Math.max(3, Math.round(size * 0.22));
  const cx = size - badgeRadius - Math.round(size * 0.04);
  const cy = badgeRadius + Math.round(size * 0.04);
  const badgeSvg = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${cx}" cy="${cy}" r="${badgeRadius}" fill="#d98a0a" stroke="#ffffff" stroke-width="${Math.max(1, badgeRadius * 0.18)}" />
    </svg>`,
  );
  return sharp(base)
    .composite([{ input: badgeSvg }])
    .png()
    .toBuffer();
}

async function main() {
  const normalPngs = await Promise.all(SIZES.map(renderBase));
  const pendingPngs = await Promise.all(SIZES.map(renderPending));

  const normalIco = await pngToIco(normalPngs);
  const pendingIco = await pngToIco(pendingPngs);

  writeFileSync(join(assetsDir, 'icon.ico'), normalIco);
  writeFileSync(join(assetsDir, 'icon-pending.ico'), pendingIco);

  console.log(`Wrote ${join(assetsDir, 'icon.ico')} (${normalIco.length} bytes)`);
  console.log(`Wrote ${join(assetsDir, 'icon-pending.ico')} (${pendingIco.length} bytes)`);
}

main();
