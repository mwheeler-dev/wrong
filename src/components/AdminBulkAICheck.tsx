"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { VerificationResult } from "@/lib/questionVerification";
import {
  requestQuestionCheck,
  approveQuestionCheck,
} from "@/lib/adminAIClient";
import { runIndependentChecks } from "@/lib/independentChecks";
import { AdminAICheckResult } from "./AdminAICheckResult";

type Row = { id: string; text: string };
type Review = Row & {
  result?: VerificationResult;
  error?: string;
  selected: boolean;
  approved: boolean;
};

export function AdminBulkAICheck({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [count, setCount] = useState("all");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [busy, setBusy] = useState(false);
  const [approving, setApproving] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [page, setPage] = useState(0);
  const stop = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stop.current = true;
    };
  }, []);
  const complete = reviews.filter(
    (review) => review.result || review.error,
  ).length;
  const verified = reviews.filter(
    (review) => review.result?.answer && !review.approved && !review.error,
  );
  const selected = verified.filter((review) => review.selected);
  const pages = Math.max(1, Math.ceil(reviews.length / 25));
  const safePage = Math.min(page, pages - 1);

  async function check() {
    stop.current = false;
    setStopping(false);
    setBusy(true);
    setPage(0);
    const batch = rows.slice(0, count === "all" ? rows.length : Number(count));
    setReviews(
      batch.map((row) => ({ ...row, selected: false, approved: false })),
    );
    try {
      await runIndependentChecks(
        batch,
        (row) => requestQuestionCheck(row.id),
        (row, outcome) => {
          if (mounted.current)
            setReviews((previous) =>
              previous.map((review) =>
                review.id === row.id ? { ...review, ...outcome } : review,
              ),
            );
        },
        () => stop.current,
      );
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  async function approve() {
    setApproving(true);
    let saved = false;
    try {
      await runIndependentChecks(
        selected,
        async (review) => {
          await approveQuestionCheck(review.id, review.result!);
          saved = true;
          return true;
        },
        (row, outcome) => {
          if (mounted.current)
            setReviews((previous) =>
              previous.map((review) =>
                review.id === row.id
                  ? {
                      ...review,
                      selected: false,
                      ...("result" in outcome
                        ? { approved: true }
                        : { error: outcome.error }),
                    }
                  : review,
              ),
            );
        },
        () => !mounted.current,
        1,
      );
    } finally {
      if (mounted.current) {
        setApproving(false);
        if (saved) router.refresh();
      }
    }
  }

  return (
    <div
      className="mt-3 rounded-2xl border border-line p-4"
      aria-label="Bulk AI review"
    >
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm">
          Questions to check
          <select
            className="input ml-2 w-auto"
            value={count}
            disabled={busy || approving}
            onChange={(event) => setCount(event.target.value)}
          >
            {[1, 5, 10, 20, 50]
              .filter((n) => n <= rows.length)
              .map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            <option value="all">All ({rows.length})</option>
          </select>
        </label>
        <button
          className="btn-accent"
          type="button"
          disabled={busy || approving || !rows.length}
          onClick={check}
        >
          {busy ? "Checking…" : "Check with AI in bulk"}
        </button>
        {busy && (
          <button
            className="btn-ghost"
            disabled={stopping}
            onClick={() => {
              stop.current = true;
              setStopping(true);
            }}
          >
            Stop after current checks
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-muted">
        Checks the whole section, including other pages. Each question is
        checked independently; nothing resolves until you approve it.
      </p>
      {reviews.length > 0 && (
        <>
          <p role="status" className="mt-3 text-sm">
            {complete} of {reviews.length} checked ·{" "}
            {reviews.filter((review) => review.result?.answer).length} verified
            ·{" "}
            {
              reviews.filter(
                (review) =>
                  review.error || (review.result && !review.result.answer),
              ).length
            }{" "}
            skipped
            {!busy && complete < reviews.length
              ? " · Stopped; unfinished questions were left alone."
              : ""}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              className="btn-ghost border border-line"
              disabled={busy || approving || !verified.length}
              onClick={() =>
                setReviews((previous) =>
                  previous.map((review) => ({
                    ...review,
                    selected:
                      !!review.result?.answer &&
                      !review.approved &&
                      !review.error,
                  })),
                )
              }
            >
              Select verified
            </button>
            <button
              className="btn-ghost"
              disabled={busy || approving}
              onClick={() =>
                setReviews((previous) =>
                  previous.map((review) => ({ ...review, selected: false })),
                )
              }
            >
              Clear selection
            </button>
            <button
              className="btn-primary"
              disabled={busy || approving || !selected.length}
              onClick={approve}
            >
              {approving
                ? "Resolving…"
                : `Approve selected (${selected.length})`}
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {reviews.slice(safePage * 25, (safePage + 1) * 25).map((review) => (
              <div
                key={review.id}
                className="rounded-xl border border-line p-3"
              >
                <label className="flex items-start gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={review.selected}
                    disabled={
                      busy ||
                      approving ||
                      !review.result?.answer ||
                      review.approved ||
                      !!review.error
                    }
                    onChange={(event) =>
                      setReviews((previous) =>
                        previous.map((row) =>
                          row.id === review.id
                            ? { ...row, selected: event.target.checked }
                            : row,
                        ),
                      )
                    }
                  />
                  {review.text}
                </label>
                {review.approved ? (
                  <p role="status" className="mt-2 text-sm">
                    Resolved {review.result?.answer}.
                  </p>
                ) : (
                  <>
                    {review.result && (
                      <AdminAICheckResult result={review.result} />
                    )}
                    {review.error && (
                      <p className="mt-2 text-sm text-bad">
                        Skipped: {review.error}
                      </p>
                    )}
                    {!review.result && !review.error && (
                      <p className="mt-2 text-xs text-muted">
                        {busy ? "Waiting for check…" : "Not checked."}
                      </p>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
          {pages > 1 && (
            <div className="mt-3 flex items-center justify-between text-sm">
              <button
                className="btn-ghost"
                disabled={safePage === 0}
                onClick={() => setPage(safePage - 1)}
              >
                Previous results
              </button>
              <span>
                {safePage + 1} / {pages}
              </span>
              <button
                className="btn-ghost"
                disabled={safePage + 1 >= pages}
                onClick={() => setPage(safePage + 1)}
              >
                Next results
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
