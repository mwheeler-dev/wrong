export type Answer = "YES" | "NO";
export const CONFIDENCE_LEVELS = [60, 70, 80, 90] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

export const CATEGORIES = [
  "Politics",
  "Science",
  "Sports",
  "Tech",
  "Culture",
  "Business",
  "World",
  "Entertainment",
] as const;
export type Category = (typeof CATEGORIES)[number];

export function scoreFor(answer: Answer, correct: Answer | null, confidence: number): number | null {
  if (correct == null) return null;
  return answer === correct ? confidence : -confidence;
}
