// Renders scripts/icon.svg into the PNG icons the manifest and iOS need.
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';

const svg = await readFile(new URL('./icon.svg', import.meta.url));
const out = (name) => new URL(`../public/${name}`, import.meta.url);

await sharp(svg).resize(192, 192).png().toFile(out('icon-192.png').pathname.slice(1));
await sharp(svg).resize(512, 512).png().toFile(out('icon-512.png').pathname.slice(1));
await sharp(svg).resize(180, 180).png().toFile(out('apple-touch-icon.png').pathname.slice(1));

// Maskable: shrink the glyph into the 80% safe zone on a full-bleed background.
const inner = await sharp(svg).resize(400, 400).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#1a2233' } })
  .composite([{ input: inner, top: 56, left: 56 }])
  .png()
  .toFile(out('icon-maskable-512.png').pathname.slice(1));

await writeFile(out('favicon.svg').pathname.slice(1), svg);
console.log('icons written');
