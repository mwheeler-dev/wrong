"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Question = {
  id: string;
  text: string;
  category: string;
  status: string;
  correctAnswer: string | null;
  publishDate: string;
  resolutionDate: string;
  predictionsCount: number;
};

export function AdminQuestionRow({ q }: { q: Question }) {
  const router = useRouter();
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
      <p className="mt-1 text-xs text-muted">
        Pub {new Date(q.publishDate).toLocaleString()} · Resolve {new Date(q.resolutionDate).toLocaleString()}
      </p>

      {error && <p className="mt-2 text-sm text-bad">{error}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
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
        {q.status === "RESOLVED" && (
          <button disabled={busy} className="btn-ghost" onClick={unresolve}>
            Undo
          </button>
        )}
        <button disabled={busy} className="btn-ghost text-bad" onClick={remove}>
          Delete
        </button>
      </div>
    </div>
  );
}
