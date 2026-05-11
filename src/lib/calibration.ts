import { CONFIDENCE_LEVELS, type Confidence } from "./scoring";

export type CalibrationRow = {
  level: Confidence;
  total: number;
  correct: number;
  accuracy: number | null; // 0-100, null if no data
  gap: number | null; // accuracy - level; negative = overconfident
};

// A row where the user has at least one resolved prediction at this confidence
// level, so accuracy and gap are real numbers (not null).
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

export function calibrationVerdict(rows: CalibrationRow[]): string {
  const withData = rows.filter(hasResolvedData);
  if (withData.length === 0) return "Not enough resolved predictions yet.";

  // Find the most-overconfident level (most negative gap) with at least a few samples
  const candidates = withData.filter((r) => r.total >= 3);
  if (candidates.length === 0) return "Keep playing. Calibration needs reps.";

  const worst = [...candidates].sort((a, b) => a.gap - b.gap)[0];
  if (worst.gap >= -5) return "You're well calibrated. Suspicious.";
  return `At ${worst.level}%, you're right ${worst.accuracy}% of the time. Reality disagrees with your confidence.`;
}
