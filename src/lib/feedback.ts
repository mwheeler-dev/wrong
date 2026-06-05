export function resultFeedback(opts: {
  correct: boolean;
  confidence: number;
}): string {
  const { correct, confidence } = opts;
  if (correct && confidence >= 90) return "You were right to be confident.";
  if (correct && confidence >= 80) return "Bold call. Big payoff.";
  if (correct && confidence >= 70) return "Nice read on reality.";
  if (correct) return "You called it. Quietly.";
  if (!correct && confidence >= 90) return "Bold call. Bad ending.";
  if (!correct && confidence >= 80) return "Reality disagreed. Loudly.";
  if (!correct && confidence >= 70) return "Confident. Wrong.";
  return "Reality scored you. Sorry.";
}

/**
 * "high"  - The level is genuinely bad: high-conf overreach (≥80% conf
 *           with <60% accuracy) or low accuracy (<55%). Tile uses the
 *           strong "Most dangerous confidence" framing.
 * "watch" - Weakest of the user's confidence levels, but not actually
 *           bad. Tile uses softer "Watch this confidence" framing so we
 *           don't manufacture a warning out of borderline-ok data.
 * "none"  - Nothing to flag. Every level is performing OK or better.
 */
export type DangerSeverity = "high" | "watch" | "none";

export function dangerousConfidenceLabel(severity: DangerSeverity): string {
  if (severity === "none") return "No weak confidence yet";
  if (severity === "watch") return "Watch this confidence";
  return "Most dangerous confidence";
}

export function dangerousConfidenceLine(
  level: number | null,
  severity: DangerSeverity = "high",
): string {
  if (level == null) {
    return "Every confidence level is landing. No weak spot yet.";
  }
  if (severity === "watch") {
    return `You’re above coin-flip at ${level}% confidence, but it’s your weakest level.`;
  }
  return `Selecting ${level}% confidence is hurting your accuracy.`;
}

export function dailyTagline(): string {
  return "How wrong are you today?";
}
