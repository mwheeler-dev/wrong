// Generate source artwork, measuring the rendered word before placing its dot.
// Run: node scripts/generate-brand-assets.mjs
// Then: npx capacitor-assets generate --android
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const resources = join(root, 'resources');

async function artwork(size, widthFraction) {
  const word = await sharp({text: {
    text: '<span foreground="#0A0A0A">Wrong</span>',
    font: 'Inter Heavy 256',
    fontfile: join(root, 'public/fonts/card-inter-900.ttf'),
    rgba: true
  }}).trim().png().toBuffer({resolveWithObject: true});
  // Actual ink bounds determine placement, independent of installed system fonts.
  const radius = Math.round(word.info.height * 0.14);
  const gap = Math.round(word.info.height * 0.12);
  const width = word.info.width + gap + radius * 2;
  const dot = Buffer.from(`<svg width="${radius*2}" height="${radius*2}"><circle cx="${radius}" cy="${radius}" r="${radius}" fill="#B8F000"/></svg>`);
  const logo = await sharp({create: {width, height: word.info.height, channels: 4, background: '#00000000'}})
    .composite([{input: word.data, left: 0, top: 0}, {input: dot, left: word.info.width + gap, top: Math.round(word.info.height * 0.82) - radius*2}])
    .png().toBuffer();
  const scaled = await sharp(logo).resize({width: Math.round(size * widthFraction)}).png().toBuffer();
  return sharp({create: {width: size, height: size, channels: 4, background: '#FFFFFF'}})
    .composite([{input: scaled, gravity: 'centre'}]).png().toBuffer();
}
await mkdir(resources, {recursive: true});
await sharp(await artwork(1024, 0.78)).toFile(join(resources, 'icon.png'));
const splash = await artwork(2732, 0.38);
await sharp(splash).toFile(join(resources, 'splash.png'));
await sharp(splash).toFile(join(resources, 'splash-dark.png'));
console.log('Generated icon and splash artwork with a separate lime dot.');
