import { dayKeyInTz } from "./timezone";
import { readReasoning, type ReasoningToken } from "./reasoning";

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
  // New: per-prediction reflection (chips + optional text). Either may be
  // absent for legacy/never-reflected rows.
  reflection?: {
    reasoning: unknown;
    text: string | null;
  } | null;
};

type DailyReflectionRow = {
  date: Date;
  text: string;
};

export type ReflectionEntry =
  | {
      kind: "prediction";
      predictionId: string;
      createdAt: Date;
      text: string | null;
      reasoning: ReasoningToken[];
      question: {
        text: string;
        category: string;
        answer: string;
        confidence: number;
        score: number | null;
        correctAnswer: string | null;
      };
    }
  | {
      kind: "daily";
      date: Date;
      text: string;
    };

export type JournalDay = {
  date: string;
  /** Each entry has at least one piece of written reasoning. */
  entries: ReflectionEntry[];
};

/**
 * Builds the journal as a list of days, each containing one or more
 * REFLECTION ENTRIES. A day is included only if it has at least one
 * entry — i.e. the user wrote something or picked reasoning chips. This
 * is the fix for "questions show up in Journal even with no reflection":
 * we no longer attach unreflected predictions.
 */
export function buildJournal(
  predictions: PredictionRow[],
  dailyReflections: DailyReflectionRow[],
  opts: { limitDays?: number; timeZone: string },
): JournalDay[] {
  const tz = opts.timeZone;
  const byDay = new Map<string, JournalDay>();

  function bucket(key: string): JournalDay {
    let entry = byDay.get(key);
    if (!entry) {
      entry = { date: key, entries: [] };
      byDay.set(key, entry);
    }
    return entry;
  }

  for (const p of predictions) {
    const reasoning = readReasoning(p.reflection?.reasoning);
    const hasText = !!p.reflection?.text && p.reflection.text.trim() !== "";
    const hasChips = reasoning.length > 0;
    // Skip predictions the user never reflected on — no chips, no text.
    if (!hasChips && !hasText) continue;

    const k = dayKeyInTz(p.createdAt, tz);
    bucket(k).entries.push({
      kind: "prediction",
      predictionId: p.id,
      createdAt: p.createdAt,
      text: p.reflection?.text ?? null,
      reasoning,
      question: {
        text: p.question.text,
        category: p.question.category,
        answer: p.answer,
        confidence: p.confidence,
        score: p.score,
        correctAnswer: p.question.correctAnswer,
      },
    });
  }

  for (const r of dailyReflections) {
    if (!r.text || r.text.trim() === "") continue;
    const k = dayKeyInTz(r.date, tz);
    bucket(k).entries.push({
      kind: "daily",
      date: r.date,
      text: r.text,
    });
  }

  // Sort each day's entries newest-first, then sort days newest-first.
  for (const day of byDay.values()) {
    day.entries.sort((a, b) => {
      const at = a.kind === "prediction" ? a.createdAt.getTime() : a.date.getTime();
      const bt = b.kind === "prediction" ? b.createdAt.getTime() : b.date.getTime();
      return bt - at;
    });
  }
  const sorted = Array.from(byDay.values()).sort((a, b) =>
    a.date < b.date ? 1 : -1,
  );
  return opts.limitDays ? sorted.slice(0, opts.limitDays) : sorted;
}
