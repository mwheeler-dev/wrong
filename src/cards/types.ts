// Schema for a Wrong. slide deck. Drop one of these into src/cards/posts/*.ts
// and the studio + PNG endpoint + export CLI pick it up automatically.

export type HookSlide = {
  type: "hook";
  /** The big challenge / callout. ~30–110 chars works best at full size. */
  text: string;
  /** Optional kicker line above the hook (small label). */
  kicker?: string;
};

export type PredictionSlide = {
  type: "prediction";
  /** Binary yes/no prediction question. ~30–110 chars works best. */
  question: string;
  /** 0–100. Should sum to 100 with noPct, but we don't enforce. */
  yesPct: number;
  /** 0–100. */
  noPct: number;
  /** Category pill displayed at the top. */
  category?: string;
  /** Optional source label e.g. "n = 1,432 predictions" */
  source?: string;
};

export type CTASlide = {
  type: "cta";
  /** Big closing line. */
  text: string;
  /** Small line under the CTA — handle / URL / coming soon. */
  subtext?: string;
};

export type Slide = HookSlide | PredictionSlide | CTASlide;

export type Post = {
  /** URL-safe identifier — used for /studio/[slug] and the PNG path. */
  slug: string;
  /** Human-readable title for the studio index. */
  title: string;
  /** Optional notes for the creator. Not rendered into slides. */
  notes?: string;
  /** The deck. Convention: 1 hook + N prediction + 1 cta. Order matters. */
  slides: Slide[];
};
