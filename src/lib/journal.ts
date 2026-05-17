import { dayKeyInTz } from "./timezone";

type PredictionRow = {
  id: string;
  createdAt: Date;
  answer: string;
  confidence: number;
  score: number | null;
  question: {
    text: string;
    category: string;
    correctAnswer: string | null;
  };
};

type ReflectionRow = {
  date: Date;
  text: string;
};

export type JournalDay = {
  date: string;
  reflection: string | null;
  predictions: {
    id: string;
    questionText: string;
    category: string;
    answer: string;
    confidence: number;
    score: number | null;
    correctAnswer: string | null;
  }[];
};

/**
 * Groups a user's predictions and reflections into per-day buckets, where
 * "day" is the user's LOCAL calendar day in `timeZone`. Used by the
 * dashboard journal section.
 */
export function buildJournal(
  predictions: PredictionRow[],
  reflections: ReflectionRow[],
  opts: { limitDays?: number; timeZone: string },
): JournalDay[] {
  const tz = opts.timeZone;
  const byDay = new Map<string, JournalDay>();

  for (const p of predictions) {
    const k = dayKeyInTz(p.createdAt, tz);
    let entry = byDay.get(k);
    if (!entry) {
      entry = { date: k, reflection: null, predictions: [] };
      byDay.set(k, entry);
    }
    entry.predictions.push({
      id: p.id,
      questionText: p.question.text,
      category: p.question.category,
      answer: p.answer,
      confidence: p.confidence,
      score: p.score,
      correctAnswer: p.question.correctAnswer,
    });
  }

  for (const r of reflections) {
    const k = dayKeyInTz(r.date, tz);
    let entry = byDay.get(k);
    if (!entry) {
      entry = { date: k, reflection: null, predictions: [] };
      byDay.set(k, entry);
    }
    entry.reflection = r.text;
  }

  const sorted = Array.from(byDay.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
  return opts.limitDays ? sorted.slice(0, opts.limitDays) : sorted;
}
