"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminQuestionForm } from "./AdminQuestionForm";
import { AdminQuestionRedeployForm } from "./AdminQuestionRedeployForm";

type Question = {
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

type Mode = "view" | "edit" | "redeploy";

export function AdminQuestionRow({ q }: { q: Question }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("view");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resolve(answer: "YES" | "NO") {
    if (q.status === "RESOLVED" && q.correctAnswer === answer) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/questions/${q.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correctAnswer: answer }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not resolve.");
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function unresolve() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/questions/${q.id}/resolve`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Could not undo.");
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this question? This will also delete all related predictions.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/questions/${q.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Could not delete.");
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  const isResolved = q.status === "RESOLVED";

  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="pill">{q.category}</span>
        <span className="text-xs text-muted">
          {q.predictionsCount} prediction{q.predictionsCount === 1 ? "" : "s"} · {q.status}
          {q.correctAnswer && ` · ${q.correctAnswer}`}
        </span>
      </div>
      <p className="mt-2 font-semibold">{q.text}</p>
      <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-0.5 text-xs text-muted sm:grid-cols-[auto_1fr]">
        <dt className="font-semibold uppercase tracking-wider">Publish</dt>
        <dd>{new Date(q.publishDate).toLocaleString()}</dd>
        <dt className="font-semibold uppercase tracking-wider">Closes to predictions</dt>
        <dd>
          {q.closesToPredictionsAt
            ? new Date(q.closesToPredictionsAt).toLocaleString()
            : `(falls back to resolve date)`}
        </dd>
        <dt className="font-semibold uppercase tracking-wider">Needs resolved</dt>
        <dd>{new Date(q.resolutionDate).toLocaleString()}</dd>
      </dl>

      {error && <p className="mt-2 text-sm text-bad">{error}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {!isResolved && (
          <>
            <button
              disabled={busy}
              className={`btn ${q.correctAnswer === "YES" ? "bg-ink text-paper" : "border border-ink text-ink"}`}
              onClick={() => resolve("YES")}
            >
              Resolve YES
            </button>
            <button
              disabled={busy}
              className={`btn ${q.correctAnswer === "NO" ? "bg-ink text-paper" : "border border-ink text-ink"}`}
              onClick={() => resolve("NO")}
            >
              Resolve NO
            </button>
          </>
        )}

        <button
          type="button"
          disabled={busy}
          className="btn-ghost border border-line"
          onClick={() => setMode(mode === "edit" ? "view" : "edit")}
        >
          {mode === "edit" ? "Cancel edit" : "Edit"}
        </button>

        {isResolved && (
          <>
            <button
              type="button"
              disabled={busy}
              className="btn-ghost border border-accent text-ink"
              onClick={() => setMode(mode === "redeploy" ? "view" : "redeploy")}
            >
              {mode === "redeploy" ? "Cancel redeploy" : "Redeploy"}
            </button>
            <button disabled={busy} className="btn-ghost" onClick={unresolve}>
              Undo
            </button>
          </>
        )}

        <button disabled={busy} className="btn-ghost text-bad" onClick={remove}>
          Delete
        </button>
      </div>

      {mode === "edit" && (
        <div className="mt-3 rounded-2xl border border-line bg-paper/40 p-3 sm:p-4">
          <p className="label">Edit question</p>
          <p className="mt-1 mb-3 text-xs text-muted">
            Changes to dates may move this card between Overdue, Live, and
            Scheduled. Status stays the same.
          </p>
          <AdminQuestionForm
            initial={{
              id: q.id,
              text: q.text,
              category: q.category,
              resolutionCriteria: q.resolutionCriteria,
              sourceUrl: q.sourceUrl,
              publishDate: q.publishDate,
              resolutionDate: q.resolutionDate,
              closesToPredictionsAt: q.closesToPredictionsAt,
            }}
            onSaved={() => setMode("view")}
          />
        </div>
      )}

      {mode === "redeploy" && (
        <div className="mt-3 rounded-2xl border border-accent/40 bg-accent/5 p-3 sm:p-4">
          <p className="label text-ink">Redeploy as new question</p>
          <p className="mt-1 mb-3 text-xs text-muted">
            Creates a brand-new pending question with these fields. The
            original resolved row and all its predictions stay locked and
            untouched.
          </p>
          <AdminQuestionRedeployForm
            sourceId={q.id}
            initial={{
              text: q.text,
              category: q.category,
              resolutionCriteria: q.resolutionCriteria,
              sourceUrl: q.sourceUrl,
            }}
            onSaved={() => setMode("view")}
          />
        </div>
      )}
    </div>
  );
}
