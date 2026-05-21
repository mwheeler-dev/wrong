import { REASONING_TOKENS, type ReasoningToken } from "./reasoning";

// Minimum resolved-with-reasoning predictions before we make ANY performance
// claim. Below this, the profile shows the early-state copy. The constant
// also gates the "category nudge" — we re-use the same floor per category
// so a 6-prediction user doesn't see "In Tech, Research carries your best
// calls" based on 1 resolved data point.
export const MIN_SAMPLE = 5;

export type PredictionForProfile = {
  score: number | null;
  category: string;
  reasoning: ReasoningToken[];
};

export type StyleStat = {
  token: ReasoningToken;
  /** How many predictions (resolved or not) carried this chip. */
  uses: number;
  /** Percent share of all chip-uses. Rounded to whole percent. */
  sharePct: number;
  /** Resolved predictions with this chip. */
  resolved: number;
  /** Of resolved, how many were correct (score > 0). */
  correct: number;
  /** correct/resolved as whole percent, or null if resolved < MIN_SAMPLE. */
  accuracyPct: number | null;
};

export type CategoryNudge = {
  category: string;
  token: ReasoningToken;
  accuracyPct: number;
  resolved: number;
};

export type ThinkingProfile =
  | { state: "empty" }
  | {
      state: "ready";
      totalWithReasoning: number;
      totalResolvedWithReasoning: number;
      styles: StyleStat[];
      /**
       * All styles tied for the highest `uses` count. One entry in the
       * common case; up to 3 when usage is evenly distributed. Empty
       * array means no chips have been used at all (the renderer hides
       * the headline). We return an array — not a single winner — so
       * the UI can say "Research and Intuition" instead of breaking
       * the tie arbitrarily and showing only one.
       */
      mostUsed: StyleStat[];
      /** Highest-accuracy style with at least MIN_SAMPLE resolved. */
      bestPerforming: StyleStat | null;
      /** Optional single category nudge — strongest (category, token) pair. */
      categoryNudge: CategoryNudge | null;
    };

/**
 * Build a Thinking Profile snapshot from a user's predictions. Pure
 * function — no DB, no time math. Caller is responsible for filtering to a
 * single user and including the reasoning array on each row.
 *
 * Sample-size discipline:
 *   * "empty" when nothing has reasoning attached at all → renderer shows
 *     the early-state copy.
 *   * Distribution + most-used is shown as soon as ANY reasoning data
 *     exists — even a single chip-tagged prediction is a fact.
 *   * Performance claims (best style, category nudge) only fire when the
 *     underlying resolved count meets MIN_SAMPLE. This is the part the
 *     spec calls out: "Avoid misleading claims if sample size is too
 *     small."
 */
export function computeThinkingProfile(
  predictions: PredictionForProfile[],
): ThinkingProfile {
  const withReasoning = predictions.filter((p) => p.reasoning.length > 0);
  if (withReasoning.length === 0) return { state: "empty" };

  // ── Distribution + per-style accuracy ────────────────────────────────
  const counts = new Map<ReasoningToken, { uses: number; resolved: number; correct: number }>();
  for (const t of REASONING_TOKENS) counts.set(t, { uses: 0, resolved: 0, correct: 0 });

  let totalChipUses = 0;
  let totalResolvedWithReasoning = 0;
  for (const p of withReasoning) {
    const resolved = p.score != null;
    if (resolved) totalResolvedWithReasoning += 1;
    for (const tok of p.reasoning) {
      const row = counts.get(tok);
      if (!row) continue;
      row.uses += 1;
      totalChipUses += 1;
      if (resolved) {
        row.resolved += 1;
        if ((p.score ?? 0) > 0) row.correct += 1;
      }
    }
  }

  const styles: StyleStat[] = REASONING_TOKENS.map((token) => {
    const c = counts.get(token)!;
    const sharePct =
      totalChipUses === 0 ? 0 : Math.round((c.uses / totalChipUses) * 100);
    // Performance is only meaningful once we clear the floor — otherwise
    // null and the renderer hides the accuracy chip.
    const accuracyPct =
      c.resolved >= MIN_SAMPLE
        ? Math.round((c.correct / c.resolved) * 100)
        : null;
    return {
      token,
      uses: c.uses,
      sharePct,
      resolved: c.resolved,
      correct: c.correct,
      accuracyPct,
    };
  });

  // Most-used: every style tied for the max `uses` count. We deliberately
  // DO NOT alphabetically tie-break to a single winner — a 4/4/1 split
  // should read "Research and Intuition", not arbitrarily pick one. We
  // still order the returned array by the canonical REASONING_TOKENS
  // sequence so the sentence renders deterministically ("Research and
  // Intuition" vs "Intuition and Research" on the same data).
  const maxUses = styles.reduce((m, s) => Math.max(m, s.uses), 0);
  const mostUsed: StyleStat[] =
    maxUses === 0 ? [] : styles.filter((s) => s.uses === maxUses);

  // Best performer: highest accuracyPct (non-null), tie-break by larger
  // sample, then alphabetical. Must have >= MIN_SAMPLE resolved.
  const candidates = styles.filter((s) => s.accuracyPct != null);
  const bestPerforming =
    candidates.length === 0
      ? null
      : [...candidates].sort((a, b) => {
          const acc = (b.accuracyPct ?? 0) - (a.accuracyPct ?? 0);
          if (acc !== 0) return acc;
          if (b.resolved !== a.resolved) return b.resolved - a.resolved;
          return a.token.localeCompare(b.token);
        })[0];

  // ── Category nudge ───────────────────────────────────────────────────
  // For each (category, token) bucket with >= MIN_SAMPLE resolved, compute
  // accuracy and pick the strongest single pair. Returning only ONE pair
  // keeps the dashboard quiet — we can layer more later if users want.
  const catBuckets = new Map<
    string,
    Map<ReasoningToken, { resolved: number; correct: number }>
  >();
  for (const p of withReasoning) {
    if (p.score == null) continue;
    const correct = (p.score ?? 0) > 0;
    let byTok = catBuckets.get(p.category);
    if (!byTok) {
      byTok = new Map();
      catBuckets.set(p.category, byTok);
    }
    for (const tok of p.reasoning) {
      let row = byTok.get(tok);
      if (!row) {
        row = { resolved: 0, correct: 0 };
        byTok.set(tok, row);
      }
      row.resolved += 1;
      if (correct) row.correct += 1;
    }
  }

  let categoryNudge: CategoryNudge | null = null;
  for (const [category, byTok] of catBuckets) {
    for (const [token, c] of byTok) {
      if (c.resolved < MIN_SAMPLE) continue;
      const accuracyPct = Math.round((c.correct / c.resolved) * 100);
      // Require the nudge to be MEANINGFULLY positive — at 50% or worse the
      // claim "X is carrying your best calls" reads as marketing.
      if (accuracyPct < 60) continue;
      if (
        !categoryNudge ||
        accuracyPct > categoryNudge.accuracyPct ||
        (accuracyPct === categoryNudge.accuracyPct &&
          c.resolved > categoryNudge.resolved)
      ) {
        categoryNudge = { category, token, accuracyPct, resolved: c.resolved };
      }
    }
  }

  return {
    state: "ready",
    totalWithReasoning: withReasoning.length,
    totalResolvedWithReasoning,
    styles,
    mostUsed,
    bestPerforming,
    categoryNudge,
  };
}
