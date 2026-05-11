type JournalDay = {
  date: string; // ISO date
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

function formatDayHeading(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function Journal({ days }: { days: JournalDay[] }) {
  if (days.length === 0) {
    return (
      <div className="card">
        <p className="label">Journal</p>
        <p className="mt-2 text-sm text-muted">
          When you write a reflection at the end of a round, it shows up here next to that day&apos;s
          calls.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {days.map((d) => (
        <article key={d.date} className="card">
          <div className="flex items-baseline justify-between">
            <p className="label">{formatDayHeading(d.date)}</p>
            <p className="text-[11px] uppercase tracking-wider text-muted">
              {d.predictions.length} call{d.predictions.length === 1 ? "" : "s"}
            </p>
          </div>

          {d.reflection ? (
            <blockquote className="mt-3 border-l-2 border-accent pl-4 text-base italic text-ink/90">
              &ldquo;{d.reflection}&rdquo;
            </blockquote>
          ) : (
            <p className="mt-3 text-sm text-muted">No reflection that day.</p>
          )}

          <div className="mt-4 space-y-1.5">
            {d.predictions.map((p) => {
              const resolved = p.score != null;
              const positive = (p.score ?? 0) > 0;
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-line px-3 py-2 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="pill">{p.category}</span>
                    </div>
                    <p className="mt-1 truncate text-ink">{p.questionText}</p>
                    <p className="text-xs text-muted">
                      You said <strong className="text-ink">{p.answer}</strong> @ {p.confidence}%
                      {resolved && p.correctAnswer && (
                        <>
                          {" · Reality "}
                          <strong className="text-ink">{p.correctAnswer}</strong>
                        </>
                      )}
                    </p>
                  </div>
                  <div
                    className={`shrink-0 text-right font-bold tabular-nums ${
                      !resolved ? "text-muted" : positive ? "text-good" : "text-bad"
                    }`}
                  >
                    {!resolved ? "—" : `${positive ? "+" : ""}${p.score}`}
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      ))}
    </div>
  );
}
