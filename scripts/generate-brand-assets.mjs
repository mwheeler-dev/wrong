// Generates resources/icon.png (1024x1024) and resources/splash.png (2732x2732)
// from inline SVG using sharp (already a transitive dep via @capacitor/assets).
//
// Brand: white/light background, black "Wrong" wordmark, neon yellow-green dot.
// Run via `node scripts/generate-brand-assets.mjs` before `npx cap assets generate`.

import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RESOURCES = join(__dirname, "..", "resources");

const NEON = "#C8FF3E";
const INK = "#0A0A0A";
const PAPER = "#FFFFFF";

function iconSvg(size) {
  const fontSize = Math.round(size * 0.26);
  const dotR = Math.round(size * 0.055);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${PAPER}"/>
  <g font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-weight="900" font-size="${fontSize}" fill="${INK}" text-anchor="middle" letter-spacing="-${fontSize * 0.04}">
    <text x="${size / 2}" y="${size / 2 + fontSize * 0.34}">Wrong</text>
  </g>
  <circle cx="${size * 0.785}" cy="${size * 0.57}" r="${dotR}" fill="${NEON}"/>
</svg>`;
}

function splashSvg(size) {
  // Splash uses a smaller logo centered on a white field.
  const fontSize = Math.round(size * 0.12);
  const dotR = Math.round(size * 0.022);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${PAPER}"/>
  <g font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-weight="900" font-size="${fontSize}" fill="${INK}" text-anchor="middle" letter-spacing="-${fontSize * 0.04}">
    <text x="${size / 2}" y="${size / 2 + fontSize * 0.34}">Wrong</text>
  </g>
  <circle cx="${size * 0.635}" cy="${size * 0.53}" r="${dotR}" fill="${NEON}"/>
</svg>`;
}

async function writePng(svg, outPath, size) {
  const buf = Buffer.from(svg);
  await sharp(buf, { density: 300 }).resize(size, size).png().toFile(outPath);
}

async function main() {
  await mkdir(RESOURCES, { recursive: true });

  await writePng(iconSvg(1024), join(RESOURCES, "icon.png"), 1024);
  await writePng(splashSvg(2732), join(RESOURCES, "splash.png"), 2732);

  // @capacitor/assets also looks for a dark splash variant; reuse the same
  // light artwork so a forced dark mode still shows the brand cleanly.
  await writePng(splashSvg(2732), join(RESOURCES, "splash-dark.png"), 2732);

  console.log("Wrote resources/icon.png, resources/splash.png, resources/splash-dark.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
