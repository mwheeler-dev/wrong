import Link from "next/link";
import type { JournalDay, ReflectionEntry } from "@/lib/journal";
import { REASONING_OPTIONS } from "@/lib/reasoning";

function formatDayHeading(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

const REASONING_LABEL = new Map(
  REASONING_OPTIONS.map((o) => [o.token, o.label] as const),
);

export function Journal({ days }: { days: JournalDay[] }) {
  if (days.length === 0) {
    return (
      <div className="card">
        <p className="label">No reflections yet</p>
        <p className="mt-2 text-sm text-muted">
          Pick reasoning chips when you lock in a prediction, or write a
          note. Anything you save shows up here.
        </p>
        <Link href="/play" className="btn-accent mt-4 inline-flex">
          Play today
        </Link>
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
              {d.entries.length} reflection{d.entries.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="mt-3 space-y-3">
            {d.entries.map((entry, i) => (
              <EntryView key={entryKey(entry, i)} entry={entry} />
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

function entryKey(entry: ReflectionEntry, i: number): string {
  if (entry.kind === "prediction") return `p:${entry.predictionId}`;
  return `d:${entry.date.toISOString()}:${i}`;
}

function EntryView({ entry }: { entry: ReflectionEntry }) {
  if (entry.kind === "daily") {
    return (
      <blockquote className="border-l-2 border-accent pl-4 text-base italic text-ink/90">
        &ldquo;{entry.text}&rdquo;
      </blockquote>
    );
  }

  const { question } = entry;
  const resolved = question.score != null;
  const positive = (question.score ?? 0) > 0;

  return (
    <div className="rounded-2xl border border-line p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="pill">{question.category}</span>
        <span
          className={`text-sm font-bold tabular-nums ${
            !resolved ? "text-muted" : positive ? "text-good" : "text-bad"
          }`}
        >
          {!resolved
            ? "Pending"
            : `${positive ? "+" : ""}${question.score}`}
        </span>
      </div>
      <p className="mt-2 text-sm text-ink">{question.text}</p>
      <p className="mt-1 text-xs text-muted">
        You said <strong className="text-ink">{question.answer}</strong> @{" "}
        {question.confidence}%
        {resolved && question.correctAnswer && (
          <>
            {" · Reality "}
            <strong className="text-ink">{question.correctAnswer}</strong>
          </>
        )}
      </p>

      {entry.reasoning.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {entry.reasoning.map((token) => (
            <span
              key={token}
              className="inline-flex items-center rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-ink"
            >
              {REASONING_LABEL.get(token) ?? token}
            </span>
          ))}
        </div>
      )}

      {entry.text && (
        <p className="mt-2 text-sm italic text-ink/85">&ldquo;{entry.text}&rdquo;</p>
      )}
    </div>
  );
}
