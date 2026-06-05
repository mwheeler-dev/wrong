import { CONFIDENCE_LEVELS, type Confidence } from "./scoring";

export type CalibrationRow = {
  level: Confidence;
  total: number;
  correct: number;
  accuracy: number | null; // 0-100, null if no data
  gap: number | null; // accuracy - level; negative = overconfident
};

export type ResolvedCalibrationRow = CalibrationRow & {
  accuracy: number;
  gap: number;
};

function hasResolvedData(row: CalibrationRow): row is ResolvedCalibrationRow {
  return row.accuracy != null && row.gap != null;
}

export function computeCalibration(
  resolvedPredictions: { confidence: number; score: number | null }[],
): CalibrationRow[] {
  return CONFIDENCE_LEVELS.map((level) => {
    const inLevel = resolvedPredictions.filter(
      (p) => p.confidence === level && p.score != null,
    );
    const total = inLevel.length;
    const correct = inLevel.filter((p) => (p.score ?? 0) > 0).length;
    const accuracy = total === 0 ? null : Math.round((correct / total) * 100);
    const gap = accuracy == null ? null : accuracy - level;
    return { level, total, correct, accuracy, gap };
  });
}

// ─── Copy generator ─────────────────────────────────────────────────────
// Per-row copy is intentionally short. Each row produces three pieces:
//   - "lede"     : narrative about the confidence bet itself (e.g. "You wager 60% confidence.")
//   - "response" : reality's response, fact-based ("Reality agrees 50% of the time.")
//   - "verdict"  : label + line + tone, the editorial flourish
//
// Tone is tunable: we mix observational ("Close. Tight but not perfect."),
// reflective ("Sharp call. Reality nods."), and sharp ("Reality pushes back.")
// We avoid mean-spirited copy — the goal is psychological revelation, not insult.

// Tone drives the row's bar color and verdict-pill color. Accuracy is the
// headline (the user's "how often is reality on my side"), so the ladder
// here rewards strong accuracy first and only flips to "bad" on either
// genuinely low accuracy OR high-confidence overreach.
//
//   elite   - special green (lime). Confident AND accurate, or strong
//             read at any confidence.
//   good    - green. Solid accuracy regardless of confidence.
//   ok      - amber. Above coin-flip but not dominant.
//   bad     - red. Either accuracy < 55, or 80%+ confidence below 60%.
//   neutral - no data / pre-threshold.
type Tone = "elite" | "good" | "ok" | "bad" | "neutral";

export type CalibrationVerdict = {
  label: string;
  line: string;
  tone: Tone;
};

export type CalibrationCopy = {
  lede: string;
  response: string;
  verdict: CalibrationVerdict;
};

// Per-row lede now spells out the bet AND the resolved count, so the
// sentence stands alone even if a user skims past the eyebrow header
// above. Past tense ("selected", "agreed") so the row reads as history,
// not as a real-time wager.
function ledeFor(level: Confidence, total: number): string {
  if (total === 0) {
    return `No ${level}% confidence predictions resolved yet.`;
  }
  return `You selected ${level}% confidence on ${total} resolved question${
    total === 1 ? "" : "s"
  }.`;
}

export function calibrationCopyFor(
  level: Confidence,
  accuracy: number | null,
  total: number,
): CalibrationCopy {
  const lede = ledeFor(level, total);

  if (accuracy == null || total === 0) {
    return {
      lede,
      response: "Reality hasn’t weighed in yet.",
      verdict: { label: "—", line: "Need more reps.", tone: "neutral" },
    };
  }

  // Match the lede's past tense — these are resolved outcomes, not a
  // running average that's still moving.
  const response = `Reality agreed ${accuracy}% of the time.`;

  // ── Interpretation ladder ───────────────────────────────────────────
  // Order matters. We evaluate top-down:
  //   1. Per-confidence "elite" thresholds. These celebrate strong
  //      accuracy at the right confidence level — including the
  //      "underconfident" case (60% conf, ≥70% acc: "trust yourself
  //      more"). Calibration gap, by itself, never produces a bad label
  //      here; only weak accuracy or high-conf overreach does.
  //   2. High-confidence danger. 80% or 90% conf below 60% accuracy is
  //      always red — the wager is too big relative to the hit rate.
  //   3. General accuracy buckets. ≥65 green, 55–64 amber, <55 red.
  //      Confidence level no longer matters at this point — accuracy
  //      carries the verdict.

  // 1. Elite tier
  if (level === 90 && accuracy >= 60) {
    return {
      lede,
      response,
      verdict: { label: "Bold, but working.", line: "High confidence is paying off.", tone: "elite" },
    };
  }
  if (level === 80 && accuracy >= 65) {
    return {
      lede,
      response,
      verdict: { label: "Elite.", line: "Reality agrees often.", tone: "elite" },
    };
  }
  if (level === 70 && accuracy >= 70) {
    return {
      lede,
      response,
      verdict: { label: "Sharp.", line: "You’re reading reality well.", tone: "elite" },
    };
  }
  if (level === 60 && accuracy >= 70) {
    return {
      lede,
      response,
      verdict: { label: "Underconfident.", line: "Trust yourself more.", tone: "elite" },
    };
  }

  // 2. High-confidence danger — overrides the general "≥55 is ok" rule
  //    because an 85% wager on a 58% hit rate is not actually "ok".
  if (level >= 90 && accuracy < 60) {
    return {
      lede,
      response,
      verdict: { label: "Overconfident.", line: "Reality pushes back.", tone: "bad" },
    };
  }
  if (level >= 80 && accuracy < 60) {
    return {
      lede,
      response,
      verdict: { label: "Overconfident.", line: "Dial it back.", tone: "bad" },
    };
  }

  // 3. General accuracy buckets
  if (accuracy >= 65) {
    return {
      lede,
      response,
      verdict: { label: "Strong.", line: "Reality agrees often.", tone: "good" },
    };
  }
  if (accuracy >= 55) {
    return {
      lede,
      response,
      verdict: { label: "Competitive.", line: "You’re above coin-flip.", tone: "ok" },
    };
  }
  return {
    lede,
    response,
    verdict: { label: "Still learning.", line: "Reality is pushing back.", tone: "bad" },
  };
}

// ─── Top-level verdict (one-liner above the table) ──────────────────────

export function calibrationVerdict(rows: CalibrationRow[]): string {
  const withData = rows.filter(hasResolvedData);
  if (withData.length === 0) return "Reality hasn’t weighed in yet.";

  const candidates = withData.filter((r) => r.total >= 3);
  if (candidates.length === 0) return "Calibration loading. Keep predicting.";

  // Lead with the best-performing bucket. Calibration gap is coaching;
  // accuracy is the headline. Only call out the worst row when it's
  // genuinely in trouble — high-confidence overreach (80%+ conf, <60%
  // acc) or low accuracy regardless of confidence (<55%). Everything in
  // between gets a neutral "you're above coin-flip" line instead of
  // shame language.
  const best = [...candidates].sort((a, b) => b.accuracy - a.accuracy)[0];
  const worst = [...candidates].sort((a, b) => a.accuracy - b.accuracy)[0];

  const worstIsBad =
    worst.accuracy < 55 || (worst.level >= 80 && worst.accuracy < 60);

  if (worstIsBad) {
    const q = `${worst.total} resolved question${worst.total === 1 ? "" : "s"}`;
    if (worst.level >= 80 && worst.accuracy < 60) {
      return `You picked ${worst.level}% confidence on ${q}. Reality only agreed ${worst.accuracy}% of the time.`;
    }
    return `At ${worst.level}% confidence on ${q}, reality is pushing back — only ${worst.accuracy}% agreement.`;
  }

  if (best.accuracy >= 70) {
    const q = `${best.total} resolved question${best.total === 1 ? "" : "s"}`;
    return `Your ${best.level}% confidence picks land ${best.accuracy}% of the time on ${q}. Reality agrees often.`;
  }

  // Middle of the road — above coin-flip across the board, nothing
  // standing out yet either way.
  return "You’re above coin-flip across the board. Keep stacking reps.";
}
