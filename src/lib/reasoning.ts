// Canonical reasoning tokens for per-prediction reflections.
//
// These are the values written into PredictionReflection.reasoning. UI copy
// lives separately (REASONING_OPTIONS) so we can rename a label without
// breaking historical data or downstream search/filter.

export const REASONING_TOKENS = ["research", "experience", "intuition"] as const;
export type ReasoningToken = (typeof REASONING_TOKENS)[number];

export const REASONING_OPTIONS: {
  token: ReasoningToken;
  label: string;
  blurb: string;
}[] = [
  {
    token: "research",
    label: "Research",
    blurb: "You've looked into the facts, evidence, news, stats, or reports.",
  },
  {
    token: "experience",
    label: "Experience",
    blurb: "You've seen or lived experiences like this before.",
  },
  {
    token: "intuition",
    label: "Intuition",
    blurb: "You just have a gut feeling about it.",
  },
];

/**
 * Server-side input normalizer. Accepts an unknown body shape (anything the
 * client posts) and returns a deduplicated array of canonical tokens, or
 * null if the input isn't a usable array. Empty array passes through —
 * caller decides whether "no chips" is an error.
 */
export function normalizeReasoning(input: unknown): ReasoningToken[] | null {
  if (!Array.isArray(input)) return null;
  const set = new Set<ReasoningToken>();
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const t = raw.toLowerCase().trim() as ReasoningToken;
    if ((REASONING_TOKENS as readonly string[]).includes(t)) {
      set.add(t);
    }
  }
  return Array.from(set);
}

/**
 * Best-effort tolerant reader for the JSON column. Old rows may be null
 * or malformed; never throw from a read path.
 */
export function readReasoning(value: unknown): ReasoningToken[] {
  const n = normalizeReasoning(value);
  return n ?? [];
}
