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

function localDayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function buildJournal(
  predictions: PredictionRow[],
  reflections: ReflectionRow[],
  opts: { limitDays?: number } = {},
): JournalDay[] {
  const byDay = new Map<string, JournalDay>();

  for (const p of predictions) {
    const k = localDayKey(p.createdAt);
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
    const k = localDayKey(r.date);
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
