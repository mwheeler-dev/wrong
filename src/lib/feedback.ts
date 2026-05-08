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
  if (level == null) return "No dangerous confidence yet. Stay tuned.";
  return `You love ${level}%. Reality doesn't.`;
}

export function dailyTagline(): string {
  return "How wrong are you today?";
}
