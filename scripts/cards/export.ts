/**
 * Batch-export all card decks to PNG.
 *
 * Usage:
 *   1. Start the dev server:  npm run dev
 *   2. In another terminal:   npm run cards:export
 *      ↳ optional: `npm run cards:export -- <slug>` exports a single deck
 *      ↳ optional: CARDS_BASE_URL=https://wrong.app npm run cards:export
 *
 * Discovers decks (built-in + admin-created) via GET /api/cards.
 * Output: ./out/cards/<slug>/01.png, 02.png, ...
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";

type DeckSummary = {
  slug: string;
  title: string;
  slideCount: number;
  source: "db" | "static";
};

const BASE_URL = process.env.CARDS_BASE_URL || "http://localhost:3000";
const OUT_DIR = path.join(process.cwd(), "out", "cards");

async function fetchDecks(): Promise<DeckSummary[]> {
  const res = await fetch(`${BASE_URL}/api/cards`);
  if (!res.ok) {
    throw new Error(`GET /api/cards → ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as { decks: DeckSummary[] };
  return data.decks;
}

async function exportSlide(slug: string, index: number, outFile: string) {
  const url = `${BASE_URL}/api/cards/${encodeURIComponent(slug)}/${index}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`${url} → ${res.status} ${res.statusText}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(outFile, buf);
}

async function exportPost(slug: string, slideCount: number) {
  const dir = path.join(OUT_DIR, slug);
  await mkdir(dir, { recursive: true });
  const t0 = performance.now();
  for (let i = 0; i < slideCount; i++) {
    const filename = path.join(dir, `${String(i + 1).padStart(2, "0")}.png`);
    process.stdout.write(`  ${slug}/${String(i + 1).padStart(2, "0")} ... `);
    await exportSlide(slug, i, filename);
    process.stdout.write("✓\n");
  }
  const ms = Math.round(performance.now() - t0);
  console.log(`  → ${dir} (${ms}ms)\n`);
}

async function main() {
  // Quick reachability check
  let allDecks: DeckSummary[];
  try {
    allDecks = await fetchDecks();
  } catch (err) {
    console.error(
      `Could not reach ${BASE_URL}. Is the dev server running? (npm run dev)\n  ${(err as Error).message}`,
    );
    process.exit(1);
  }

  const onlySlug = process.argv[2];
  const decks = onlySlug ? allDecks.filter((d) => d.slug === onlySlug) : allDecks;

  if (decks.length === 0) {
    console.error(
      onlySlug
        ? `No deck matches slug "${onlySlug}". Available: ${allDecks.map((p) => p.slug).join(", ")}`
        : "No decks found.",
    );
    process.exit(1);
  }

  console.log(`Exporting ${decks.length} deck${decks.length === 1 ? "" : "s"} → ${OUT_DIR}\n`);

  for (const deck of decks) {
    console.log(`▸ ${deck.title} (${deck.slug}) [${deck.source}]`);
    await exportPost(deck.slug, deck.slideCount);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
