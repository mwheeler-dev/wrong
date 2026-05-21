"use client";

import { useEffect, useMemo, useState } from "react";
import { CONFIDENCE_LEVELS, CATEGORIES } from "@/lib/scoring";
import { REASONING_OPTIONS, type ReasoningToken } from "@/lib/reasoning";

export type ResolvedRow = {
  id: string;
  questionText: string;
  category: string;
  answer: string;
  confidence: number;
  correctAnswer: string | null;
  score: number | null;
  /** ISO string — resolvedAt or createdAt fallback. */
  resolvedAt: string;
  reasoning: ReasoningToken[];
  reflectionText: string | null;
};

type Outcome = "correct" | "wrong";
type AnswerSide = "YES" | "NO";
type DatePreset = "7d" | "month" | "all";

type Filters = {
  outcomes: Set<Outcome>;
  answers: Set<AnswerSide>;
  confidences: Set<number>;
  categories: Set<string>;
  reasoning: Set<ReasoningToken>;
  datePreset: DatePreset;
};

const PAGE_SIZE = 12;

function emptyFilters(): Filters {
  return {
    outcomes: new Set(),
    answers: new Set(),
    confidences: new Set(),
    categories: new Set(),
    reasoning: new Set(),
    datePreset: "all",
  };
}

function toggleIn<T>(set: Set<T>, v: T): Set<T> {
  const next = new Set(set);
  if (next.has(v)) next.delete(v);
  else next.add(v);
  return next;
}

function isWithinPreset(resolvedAt: string, preset: DatePreset): boolean {
  if (preset === "all") return true;
  const t = Date.parse(resolvedAt);
  if (Number.isNaN(t)) return false;
  const now = Date.now();
  if (preset === "7d") {
    return now - t <= 7 * 24 * 60 * 60 * 1000;
  }
  if (preset === "month") {
    const a = new Date(t);
    const b = new Date(now);
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
  }
  return true;
}

export function ResolvedHistory({ items }: { items: ResolvedRow[] }) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      // Text search across question text, category, answer, correctAnswer,
      // reflection text.
      if (q) {
        const hay = [
          item.questionText,
          item.category,
          item.answer,
          item.correctAnswer ?? "",
          item.reflectionText ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (filters.outcomes.size > 0) {
        const isCorrect = (item.score ?? 0) > 0;
        const got: Outcome = isCorrect ? "correct" : "wrong";
        if (!filters.outcomes.has(got)) return false;
      }

      if (filters.answers.size > 0) {
        if (!filters.answers.has(item.answer as AnswerSide)) return false;
      }

      if (filters.confidences.size > 0) {
        if (!filters.confidences.has(item.confidence)) return false;
      }

      if (filters.categories.size > 0) {
        if (!filters.categories.has(item.category)) return false;
      }

      if (filters.reasoning.size > 0) {
        // AND across selected reasoning chips would be too strict; use OR:
        // an item matches if it carries ANY of the selected reasoning tags.
        const hit = item.reasoning.some((r) => filters.reasoning.has(r));
        if (!hit) return false;
      }

      if (!isWithinPreset(item.resolvedAt, filters.datePreset)) return false;

      return true;
    });
  }, [items, query, filters]);

  // Clamp the page if the filtered set shrinks below the current page.
  // Deferred to an effect so we don't call setState during render.
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => {
    if (page >= totalPages) setPage(0);
  }, [page, totalPages]);
  const safePage = Math.min(page, totalPages - 1);
  const pageSlice = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const activeCount =
    filters.outcomes.size +
    filters.answers.size +
    filters.confidences.size +
    filters.categories.size +
    filters.reasoning.size +
    (filters.datePreset !== "all" ? 1 : 0);

  function clearAll() {
    setQuery("");
    setFilters(emptyFilters());
    setPage(0);
  }

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPage(0);
        }}
        placeholder="Search predictions..."
        className="input"
        autoComplete="off"
      />

      <FilterGroup label="Outcome">
        <Chip
          on={filters.outcomes.size === 0}
          onClick={() => setFilters((f) => ({ ...f, outcomes: new Set() }))}
        >
          All
        </Chip>
        <Chip
          on={filters.outcomes.has("correct")}
          onClick={() =>
            setFilters((f) => ({ ...f, outcomes: toggleIn(f.outcomes, "correct") }))
          }
        >
          Correct
        </Chip>
        <Chip
          on={filters.outcomes.has("wrong")}
          onClick={() =>
            setFilters((f) => ({ ...f, outcomes: toggleIn(f.outcomes, "wrong") }))
          }
        >
          Wrong
        </Chip>
      </FilterGroup>

      <FilterGroup label="Your answer">
        <Chip
          on={filters.answers.has("YES")}
          onClick={() =>
            setFilters((f) => ({ ...f, answers: toggleIn(f.answers, "YES") }))
          }
        >
          YES
        </Chip>
        <Chip
          on={filters.answers.has("NO")}
          onClick={() =>
            setFilters((f) => ({ ...f, answers: toggleIn(f.answers, "NO") }))
          }
        >
          NO
        </Chip>
      </FilterGroup>

      <FilterGroup label="Confidence">
        {CONFIDENCE_LEVELS.map((c) => (
          <Chip
            key={c}
            on={filters.confidences.has(c)}
            onClick={() =>
              setFilters((f) => ({
                ...f,
                confidences: toggleIn(f.confidences, c),
              }))
            }
          >
            {c}%
          </Chip>
        ))}
      </FilterGroup>

      <FilterGroup label="Category">
        {CATEGORIES.map((cat) => (
          <Chip
            key={cat}
            on={filters.categories.has(cat)}
            onClick={() =>
              setFilters((f) => ({
                ...f,
                categories: toggleIn(f.categories, cat),
              }))
            }
          >
            {cat}
          </Chip>
        ))}
      </FilterGroup>

      <FilterGroup label="Reasoning">
        {REASONING_OPTIONS.map((opt) => (
          <Chip
            key={opt.token}
            on={filters.reasoning.has(opt.token)}
            onClick={() =>
              setFilters((f) => ({
                ...f,
                reasoning: toggleIn(f.reasoning, opt.token),
              }))
            }
          >
            {opt.label}
          </Chip>
        ))}
      </FilterGroup>

      <FilterGroup label="Date">
        {(["7d", "month", "all"] as const).map((preset) => (
          <Chip
            key={preset}
            on={filters.datePreset === preset}
            onClick={() => setFilters((f) => ({ ...f, datePreset: preset }))}
          >
            {preset === "7d"
              ? "Last 7 days"
              : preset === "month"
                ? "This month"
                : "All time"}
          </Chip>
        ))}
      </FilterGroup>

      <div className="mt-4 flex items-center justify-between gap-2">
        <p className="text-xs text-muted tabular-nums">
          {filtered.length} match{filtered.length === 1 ? "" : "es"}
          {activeCount > 0 && ` · ${activeCount} filter${activeCount === 1 ? "" : "s"} active`}
        </p>
        {(activeCount > 0 || query) && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="mt-3 space-y-2">
        {filtered.length === 0 ? (
          <p className="card text-sm text-muted">
            Nothing matches those filters.
          </p>
        ) : (
          pageSlice.map((p) => <ResolvedRowCard key={p.id} p={p} />)
        )}
      </div>

      {filtered.length > PAGE_SIZE && (
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="text-xs text-muted tabular-nums">
            Page {safePage + 1} / {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-ghost min-h-[36px] px-3 py-1.5 text-xs"
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              ← Prev
            </button>
            <button
              type="button"
              className="btn-ghost min-h-[36px] px-3 py-1.5 text-xs"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4">
      <p className="label">{label}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`min-h-[34px] rounded-full px-3 py-1 text-xs font-semibold transition active:scale-[0.98] ${
        on
          ? "border-2 border-accent bg-accent/15 text-ink shadow-[0_0_0_3px_rgba(184,240,0,0.22)]"
          : "border border-ink/15 bg-white text-ink hover:border-ink"
      }`}
    >
      {children}
    </button>
  );
}

function ResolvedRowCard({ p }: { p: ResolvedRow }) {
  const positive = (p.score ?? 0) > 0;
  return (
    <div className="card">
      <div className="flex items-center justify-between gap-2">
        <span className="pill">{p.category}</span>
        <span
          className={`display text-2xl ${positive ? "text-good" : "text-bad"}`}
        >
          {positive ? "+" : ""}
          {p.score}
        </span>
      </div>
      <p className="mt-2 font-semibold">{p.questionText}</p>
      <p className="mt-1 text-sm text-muted">
        You said <strong className="text-ink">{p.answer}</strong> @{" "}
        {p.confidence}% · Reality said{" "}
        <strong className="text-ink">{p.correctAnswer}</strong>
      </p>
      {(p.reasoning.length > 0 || p.reflectionText) && (
        <div className="mt-2">
          {p.reasoning.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {p.reasoning.map((r) => (
                <span
                  key={r}
                  className="inline-flex items-center rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-ink"
                >
                  {r[0].toUpperCase() + r.slice(1)}
                </span>
              ))}
            </div>
          )}
          {p.reflectionText && (
            <p className="mt-2 text-sm italic text-ink/85">
              &ldquo;{p.reflectionText}&rdquo;
            </p>
          )}
        </div>
      )}
    </div>
  );
}
