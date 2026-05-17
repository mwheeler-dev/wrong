# Wrong. Cards — the content engine

A media engine for shipping TikTok / Reels / Shorts carousels at volume.
One JSON-shaped TypeScript object → seven 1080×1920 PNGs, ready to upload.

## The shape of a post

```ts
// src/cards/posts/my-new-deck.ts
import type { Post } from "../types";

const post: Post = {
  slug: "my-new-deck",
  title: "Human-readable title",
  slides: [
    { type: "hook", text: "I guarantee you'll get at least one wrong." },
    { type: "prediction", category: "Sports", question: "...", yesPct: 61, noPct: 39 },
    { type: "prediction", category: "Tech",   question: "...", yesPct: 44, noPct: 56 },
    { type: "prediction", category: "Tech",   question: "...", yesPct: 22, noPct: 78 },
    { type: "prediction", category: "World",  question: "...", yesPct: 51, noPct: 49 },
    { type: "prediction", category: "Culture",question: "...", yesPct: 68, noPct: 32 },
    { type: "cta", text: "See how wrong you really are.", subtext: "Wrong." },
  ],
};

export default post;
```

Register it in `src/cards/posts.ts`:

```ts
import myNewDeck from "./posts/my-new-deck";
export const posts = [...existing, myNewDeck];
```

That's the entire content pipeline. No backend, no migration, no extra config.

## The three slide variants

| Variant      | Background    | When to use                                                    |
| ------------ | ------------- | -------------------------------------------------------------- |
| `hook`       | `#0A0A0A` ink | Slide 1. Big challenge / callout. Sets tension.               |
| `prediction` | `#FAFAFA`     | Slides 2–6. One YES/NO question, two stacked bars, leading %. |
| `cta`        | `#D9FF00` lime| Final slide. Loud close to the carousel.                       |

Every slide auto-fits its big text against the canvas (`autoFitSize` in
`theme.ts`). Short hooks render huge; long ones automatically scale down.

## Two workflows

### 1. Studio (manual iteration)

```
npm run dev
```

- `http://localhost:3000/studio` — index of all decks
- `http://localhost:3000/studio/<slug>` — scaled grid preview of every slide
- `http://localhost:3000/studio/<slug>/<index>` — full 1080×1920 render (good
  for screenshotting from the browser if you want a non-Satori reference)

Each slide tile in the studio has a `PNG ↓` link that goes straight to the
PNG endpoint — useful for grabbing a one-off without running the CLI.

### 2. Batch export (production)

```
npm run dev                  # in one terminal
npm run cards:export         # in another — exports every deck
npm run cards:export -- sports-confidence-test   # one deck only
```

Output: `out/cards/<slug>/01.png … 07.png`

Optional:

```
CARDS_BASE_URL=https://wrong.up.railway.app npm run cards:export
```

…to render from a deployed host instead of localhost. (Works the same — the
PNG endpoint is the same.)

## How rendering works

1. **React JSX** with **inline styles only** (no Tailwind) — so the same
   template renders both in the browser (studio preview) and through
   **Satori** (`next/og` `ImageResponse`) → PNG.
2. The Satori path is `GET /api/cards/[slug]/[index]`. It fetches Inter from
   Google Fonts on cold start, caches per-process, and returns a PNG with
   `Cache-Control: max-age=3600`.
3. The export CLI just hits each PNG endpoint in sequence and writes the bytes
   to disk. No headless browser, no extra deps.

## Design rules baked in

Tokens live in `src/cards/theme.ts`:

- **Colors:** ink `#0A0A0A`, paper `#FAFAFA`, lime `#D9FF00`. That's it.
- **Canvas:** 1080 × 1920, padding 80px.
- **Auto-fit:** linear interp between `min` and `max` keyed on text length.
  Tweak `TYPE_SCALE` to retune.
- **Type:** Inter Black (900) for everything load-bearing, Inter Bold (700)
  for labels and counters.

If you want a new visual variant (e.g. a "result reveal" slide for a follow-up
post), add it as a new template in `src/cards/templates/` and wire it into
`Slide.tsx`. The studio and PNG endpoint pick it up automatically.

## Posting workflow (recommendation)

1. Draft a deck in `src/cards/posts/`. Use real predictions or pulled from
   the live Question table.
2. `npm run dev` → open `/studio/<slug>` → eyeball each slide.
3. `npm run cards:export -- <slug>` → PNGs land in `out/cards/<slug>/`.
4. Upload to TikTok / IG slideshow in order `01 → 07`.
5. Add a generic caption + 3–5 hashtags. Don't over-design the caption.

## Scaling up

- **Volume**: write a tiny generator script that produces a `Post` from any
  array of `{question, yesPct, noPct}` pairs. The schema is intentionally
  simple so you can fan out from a Google Sheet, a database query, or AI
  output without changing anything in this folder.
- **Live data**: import `prisma` in a generator script and pull from the
  `Question` table (or the new Prediction table for resolved crowd stats).
- **A/B-ing**: duplicate a deck file, swap the hook line, ship both. The slug
  is the dedupe key.
