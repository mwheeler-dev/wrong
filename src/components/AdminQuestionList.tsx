"use client";

import { useMemo, useState } from "react";
import { AdminQuestionRow } from "./AdminQuestionRow";
import { AdminBulkAICheck } from "./AdminBulkAICheck";

type Row = {
  id: string;
  text: string;
  category: string;
  status: string;
  correctAnswer: string | null;
  publishDate: string;
  resolutionDate: string;
  closesToPredictionsAt: string | null;
  resolutionCriteria: string;
  sourceUrl: string | null;
  predictionsCount: number;
};

type Props = {
  title: string;
  subtitle?: string;
  emptyText: string;
  rows: Row[];
  /** Adds a subtle accent border to the section header. */
  emphasize?: boolean;
  /** Items per page. Default 8 — fits on a phone without dump-scrolling. */
  pageSize?: number;
  bulkCheck?: boolean;
};

/**
 * Paginated section list for the admin page. Existing per-row actions
 * (Resolve YES/NO, Undo, Delete) live on AdminQuestionRow and are
 * unchanged — we only slice the list for display and add prev/next.
 */
export function AdminQuestionList({
  title,
  subtitle,
  emptyText,
  rows,
  emphasize = false,
  pageSize = 8,
  bulkCheck = false,
}: Props) {
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  // Clamp page if `rows` shrinks below the current page boundary (e.g.
  // after resolving the only remaining item on page 3).
  const safePage = Math.min(page, totalPages - 1);

  const slice = useMemo(
    () => rows.slice(safePage * pageSize, (safePage + 1) * pageSize),
    [rows, safePage, pageSize],
  );

  const showPager = rows.length > pageSize;
  const start = rows.length === 0 ? 0 : safePage * pageSize + 1;
  const end = Math.min(rows.length, (safePage + 1) * pageSize);

  return (
    <section className="mt-10">
      <div className={emphasize ? "border-l-2 border-accent pl-3" : ""}>
        <h2 className="display text-xl sm:text-2xl">{title}</h2>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>

      {bulkCheck && rows.length > 0 && <AdminBulkAICheck rows={rows} />}

      <div className="mt-3 space-y-2">
        {rows.length === 0 ? (
          <p className="card text-sm text-muted">{emptyText}</p>
        ) : (
          slice.map((q) => <AdminQuestionRow key={q.id} q={q} />)
        )}
      </div>

      {showPager && (
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="text-xs text-muted tabular-nums">
            {start}–{end} of {rows.length}
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
            <span className="text-xs text-muted tabular-nums">
              {safePage + 1} / {totalPages}
            </span>
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
    </section>
  );
}
