"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * One-shot repair for the "stuck on Pending" bug: any RESOLVED question
 * whose predictions still have score IS NULL gets backfilled here. Safe
 * to click any number of times — the server-side gate is `score IS NULL`,
 * so already-scored rows are never touched.
 */
export function BackfillScoresButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (busy) return;
    if (
      !confirm(
        "Backfill scores for any RESOLVED question that still has unscored predictions? Safe to re-run.",
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/backfill-scores", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Backfill failed.");
      } else {
        const { correct = 0, wrong = 0, total = 0 } = data.updated ?? {};
        setResult(
          total === 0
            ? "Nothing to backfill — all resolved predictions already have scores."
            : `Backfilled ${total} predictions (${correct} correct, ${wrong} wrong).`,
        );
        router.refresh();
      }
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label">Maintenance</p>
          <p className="display mt-1 text-xl">Backfill missing scores</p>
          <p className="mt-1 text-sm text-muted">
            Repairs any resolved question whose predictions are still
            unscored. Idempotent — safe to run any time.
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="btn-outline"
        >
          {busy ? "Working…" : "Run backfill"}
        </button>
      </div>
      {result && <p className="mt-3 text-sm text-good">{result}</p>}
      {error && <p className="mt-3 text-sm text-bad">{error}</p>}
    </div>
  );
}
