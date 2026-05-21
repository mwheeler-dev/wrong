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

type Tone = "good" | "close" | "bad" | "neutral";

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
  const gap = accuracy - level;

  // Special-case the "you said 90% AND you were almost always right" callout.
  if (level >= 80 && accuracy >= 90 && total >= 2) {
    return {
      lede,
      response,
      verdict: { label: "Elite call.", line: "Reality nods.", tone: "good" },
    };
  }

  if (gap >= 15) {
    return {
      lede,
      response,
      verdict: {
        label: "Underrated.",
        line: "Reality agrees more than you do.",
        tone: "good",
      },
    };
  }
  if (gap >= 5) {
    return {
      lede,
      response,
      verdict: { label: "Sharp call.", line: "Reality nods.", tone: "good" },
    };
  }
  if (gap > -5) {
    return {
      lede,
      response,
      verdict: {
        label: "Close.",
        line: "Tight but not perfect.",
        tone: "close",
      },
    };
  }
  if (gap > -15) {
    return {
      lede,
      response,
      verdict: {
        label: "Overconfident.",
        line: "Dial it back.",
        tone: "bad",
      },
    };
  }
  // gap <= -15: meaningfully off
  return {
    lede,
    response,
    verdict: {
      label: "Overconfident.",
      line: "Reality pushes back.",
      tone: "bad",
    },
  };
}

// ─── Top-level verdict (one-liner above the table) ──────────────────────

export function calibrationVerdict(rows: CalibrationRow[]): string {
  const withData = rows.filter(hasResolvedData);
  if (withData.length === 0) return "Reality hasn’t weighed in yet.";

  const candidates = withData.filter((r) => r.total >= 3);
  if (candidates.length === 0) return "Calibration loading. Keep predicting.";

  // Every verdict line ALWAYS spells out "confidence" AND the resolved
  // count so the user is never left guessing what the percentage refers
  // to or how thin the sample is.
  const worst = [...candidates].sort((a, b) => a.gap - b.gap)[0];
  const q = `${worst.total} resolved question${worst.total === 1 ? "" : "s"}`;
  if (worst.gap >= -5) {
    return "Your confidence and reality agree. Suspicious.";
  }
  if (worst.gap <= -15) {
    return `You picked ${worst.level}% confidence on ${q}. Reality only agreed ${worst.accuracy}% of the time.`;
  }
  return `At ${worst.level}% confidence (${q}), you trust yourself more than reality does.`;
}
