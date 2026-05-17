// Design tokens for the Wrong. card system. Centralized so every slide
// pulls from the same palette and the same sizing curve.

export const COLORS = {
  ink: "#0A0A0A",
  paper: "#FAFAFA",
  lime: "#D9FF00",
  // Muted variants for footers / counters
  paperDim: "rgba(250,250,250,0.55)",
  inkDim: "rgba(10,10,10,0.55)",
} as const;

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
