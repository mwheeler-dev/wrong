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

// Narrative ledes — what the user is communicating by choosing that level
const LEDE_BY_LEVEL: Record<Confidence, string> = {
  60: "You wager 60% confidence.",
  70: "You sound sure.",
  80: "You think you know.",
  90: "You’re certain.",
};

export function calibrationCopyFor(
  level: Confidence,
  accuracy: number | null,
  total: number,
): CalibrationCopy {
  const lede = LEDE_BY_LEVEL[level];

  if (accuracy == null || total === 0) {
    return {
      lede,
      response: "Reality hasn’t weighed in yet.",
      verdict: { label: "—", line: "Need more reps.", tone: "neutral" },
    };
  }

  const response = `Reality agrees ${accuracy}% of the time.`;
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

  const worst = [...candidates].sort((a, b) => a.gap - b.gap)[0];
  if (worst.gap >= -5) return "You’re well calibrated. Suspicious.";
  if (worst.gap <= -15) {
    return `You speak with ${worst.level}% confidence. Reality only agrees ${worst.accuracy}% of the time.`;
  }
  return `At ${worst.level}%, you trust yourself more than reality does.`;
}
