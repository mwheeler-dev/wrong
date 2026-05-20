"use client";

import { useMemo, useState } from "react";
import { CATEGORIES } from "@/lib/scoring";
import { REASONING_OPTIONS, type ReasoningToken } from "@/lib/reasoning";

export type ReflectionsItem =
  | {
      kind: "prediction";
      id: string;
      dateIso: string;
      dayKey: string;
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
      id: string;
      dateIso: string;
      dayKey: string;
      text: string;
    };

type DatePreset = "7d" | "month" | "all";

function isWithinPreset(iso: string, preset: DatePreset): boolean {
  if (preset === "all") return true;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  const now = Date.now();
  if (preset === "7d") return now - t <= 7 * 24 * 60 * 60 * 1000;
  if (preset === "month") {
    const a = new Date(t);
    const b = new Date(now);
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
  }
  return true;
}

export function ReflectionsBrowser({ items }: { items: ReflectionsItem[] }) {
  const [query, setQuery] = useState("");
  const [reasoning, setReasoning] = useState<Set<ReasoningToken>>(new Set());
  const [categories, setCategories] = useState<Set<string>>(new Set());
  const [preset, setPreset] = useState<DatePreset>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (q) {
        const parts: string[] = [item.text ?? ""];
        if (item.kind === "prediction") {
          parts.push(item.question.text, item.question.category, item.question.answer);
        }
        if (!parts.join(" ").toLowerCase().includes(q)) return false;
      }
      if (reasoning.size > 0) {
        if (item.kind !== "prediction") return false;
        const hit = item.reasoning.some((r) => reasoning.has(r));
        if (!hit) return false;
      }
      if (categories.size > 0) {
        if (item.kind !== "prediction") return false;
        if (!categories.has(item.question.category)) return false;
      }
      if (!isWithinPreset(item.dateIso, preset)) return false;
      return true;
    });
  }, [items, query, reasoning, categories, preset]);

  const activeCount =
    reasoning.size + categories.size + (preset !== "all" ? 1 : 0);

  function clearAll() {
    setQuery("");
    setReasoning(new Set());
    setCategories(new Set());
    setPreset("all");
  }

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search reflections..."
        className="input"
        autoComplete="off"
      />

      <div className="mt-4">
        <p className="label">Reasoning</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {REASONING_OPTIONS.map((opt) => (
            <Chip
              key={opt.token}
              on={reasoning.has(opt.token)}
              onClick={() => {
                const next = new Set(reasoning);
                if (next.has(opt.token)) next.delete(opt.token);
                else next.add(opt.token);
                setReasoning(next);
              }}
            >
              {opt.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <p className="label">Category</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <Chip
              key={cat}
              on={categories.has(cat)}
              onClick={() => {
                const next = new Set(categories);
                if (next.has(cat)) next.delete(cat);
                else next.add(cat);
                setCategories(next);
              }}
            >
              {cat}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <p className="label">Date</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(["7d", "month", "all"] as const).map((p) => (
            <Chip key={p} on={preset === p} onClick={() => setPreset(p)}>
              {p === "7d" ? "Last 7 days" : p === "month" ? "This month" : "All time"}
            </Chip>
          ))}
        </div>
      </div>

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
            No reflections match those filters.
          </p>
        ) : (
          filtered.map((item) => <ItemView key={item.id} item={item} />)
        )}
      </div>
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
          ? "border-2 border-accent bg-accent/15 text-ink shadow-[0_0_0_3px_rgba(217,255,0,0.18)]"
          : "border border-ink/15 bg-white text-ink hover:border-ink"
      }`}
    >
      {children}
    </button>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function ItemView({ item }: { item: ReflectionsItem }) {
  if (item.kind === "daily") {
    return (
      <div className="card">
        <p className="label">{formatDate(item.dateIso)} · daily reflection</p>
        <blockquote className="mt-2 border-l-2 border-accent pl-4 text-base italic text-ink/90">
          &ldquo;{item.text}&rdquo;
        </blockquote>
      </div>
    );
  }
  const positive = (item.question.score ?? 0) > 0;
  const resolved = item.question.score != null;
  return (
    <div className="card">
      <div className="flex items-center justify-between gap-2">
        <p className="label">{formatDate(item.dateIso)}</p>
        <span className="pill">{item.question.category}</span>
      </div>
      <p className="mt-2 font-semibold">{item.question.text}</p>
      <p className="mt-1 text-sm text-muted">
        You said <strong className="text-ink">{item.question.answer}</strong> @{" "}
        {item.question.confidence}%
        {resolved && item.question.correctAnswer && (
          <>
            {" · Reality "}
            <strong className="text-ink">{item.question.correctAnswer}</strong>
            {" · "}
            <strong className={positive ? "text-good" : "text-bad"}>
              {positive ? "+" : ""}
              {item.question.score}
            </strong>
          </>
        )}
      </p>
      {item.reasoning.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {item.reasoning.map((r) => (
            <span
              key={r}
              className="inline-flex items-center rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-ink"
            >
              {r[0].toUpperCase() + r.slice(1)}
            </span>
          ))}
        </div>
      )}
      {item.text && (
        <p className="mt-2 text-sm italic text-ink/85">&ldquo;{item.text}&rdquo;</p>
      )}
    </div>
  );
}
