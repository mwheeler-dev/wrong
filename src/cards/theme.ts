// Design tokens for the Wrong. card system. Centralized so every slide
// pulls from the same palette and the same sizing curve.

export const COLORS = {
  ink: "#0A0A0A",
  paper: "#FAFAFA",
  lime: "#B8F000",
  // Muted variants for footers / counters
  paperDim: "rgba(250,250,250,0.55)",
  inkDim: "rgba(10,10,10,0.55)",
} as const;

export type CardColors = { [K in keyof typeof COLORS]: string };
export const CARD_THEMES = [
  { name: "Classic Lime", colors: COLORS },
  { name: "Fresh Mint", colors: { ink: "#101C19", paper: "#F3FAF6", lime: "#9DE8C1", paperDim: "#A4B8B0", inkDim: "#52655C" } },
  { name: "Ice Blue", colors: { ink: "#111B29", paper: "#F3F7FC", lime: "#A8D8F5", paperDim: "#A9B5C8", inkDim: "#52647A" } },
  { name: "Soft Peach", colors: { ink: "#241914", paper: "#FCF6F0", lime: "#F4BC94", paperDim: "#C5B0A3", inkDim: "#765D4C" } },
] as const satisfies readonly { name: string; colors: CardColors }[];

/** Legacy weekly decks get a stable alternating palette without rewriting copy. */
export function deckTheme(deck: { id: string; theme?: number }): number {
  if (deck.theme !== undefined && Number.isInteger(deck.theme) && deck.theme >= 0 && deck.theme < CARD_THEMES.length) return deck.theme;
  const index = Number(deck.id.match(/^deck-(\d+)$/)?.[1] ?? 1) - 1;
  return Math.max(0, index) % CARD_THEMES.length;
}

export const SLIDE_WIDTH = 1080;
export const SLIDE_HEIGHT = 1920;
/** Inner padding on every slide. Generous so type breathes. */
export const SLIDE_PADDING = 80;

/**
 * Auto-fit font sizing — linear interp between `max` (short text) and
 * `min` (long text), clamped at both ends. Used so a 12-word hook and a
 * 3-word hook both fill the slide instead of one looking lost.
 */
export function autoFitSize(
  text: string,
  opts: { min: number; max: number; shortLen?: number; longLen?: number },
): number {
  const shortLen = opts.shortLen ?? 30;
  const longLen = opts.longLen ?? 110;
  const len = text.length;
  if (len <= shortLen) return opts.max;
  if (len >= longLen) return opts.min;
  const t = (len - shortLen) / (longLen - shortLen);
  return Math.round(opts.max - t * (opts.max - opts.min));
}

/** Per-slide auto-fit curves, hand-tuned for the 1080×1920 canvas. */
export const TYPE_SCALE = {
  hook: { min: 110, max: 170, shortLen: 24, longLen: 110 },
  question: { min: 96, max: 150, shortLen: 24, longLen: 110 },
  cta: { min: 120, max: 180, shortLen: 18, longLen: 80 },
} as const;

export type CardTextFormat = { alignment?: "left" | "center" | "right"; fontScale?: number };
export type CustomCardColors = { ink: string; paper: string; lime: string };
export function deckColors(deck: { id: string; theme?: number; customColors?: CustomCardColors }): CardColors {
  const preset = CARD_THEMES[deckTheme(deck)].colors;
  if (!deck.customColors) return preset;
  const colors = deck.customColors;
  const dim = (hex: string) => `rgba(${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)},0.6)`;
  return { ...colors, paperDim: dim(colors.paper), inkDim: dim(colors.ink) };
}
export function cardFontScale(format?: CardTextFormat): number {
  const scale = format?.fontScale ?? 1;
  return Number.isFinite(scale) ? Math.max(0.7, Math.min(1.15, scale)) : 1;
}
