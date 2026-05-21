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

export function dangerousConfidenceLine(level: number | null): string {
  if (level == null) return "No dangerous confidence level yet. Stay tuned.";
  // The ScoreCard `hint` is the only line of supporting copy beneath the
  // big "%" value, so it has to read as a complete sentence on its own —
  // not a riff that depends on the label above it.
  return `Selecting ${level}% confidence is hurting your accuracy.`;
}

export function dailyTagline(): string {
  return "How wrong are you today?";
}
