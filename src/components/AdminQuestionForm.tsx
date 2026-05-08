"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CATEGORIES } from "@/lib/scoring";

type EditingQuestion = {
  id?: string;
  text?: string;
  category?: string;
  resolutionCriteria?: string;
  sourceUrl?: string | null;
  publishDate?: string;
  resolutionDate?: string;
};

function toLocalInput(d?: string) {
  if (!d) return "";
  const dt = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

export function AdminQuestionForm({ initial }: { initial?: EditingQuestion }) {
  const router = useRouter();
  const editing = !!initial?.id;

  const [text, setText] = useState(initial?.text ?? "");
  const [category, setCategory] = useState(initial?.category ?? CATEGORIES[0]);
  const [resolutionCriteria, setResolutionCriteria] = useState(initial?.resolutionCriteria ?? "");
  const [sourceUrl, setSourceUrl] = useState(initial?.sourceUrl ?? "");
  const [publishDate, setPublishDate] = useState(toLocalInput(initial?.publishDate));
  const [resolutionDate, setResolutionDate] = useState(toLocalInput(initial?.resolutionDate));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const url = editing ? `/api/admin/questions/${initial!.id}` : "/api/admin/questions";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          category,
          resolutionCriteria,
          sourceUrl: sourceUrl.trim() || null,
          publishDate: publishDate ? new Date(publishDate).toISOString() : null,
          resolutionDate: resolutionDate ? new Date(resolutionDate).toISOString() : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not save.");
        setSubmitting(false);
        return;
      }
      if (!editing) {
        setText("");
        setResolutionCriteria("");
        setSourceUrl("");
      }
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-3">
      <div>
        <label className="label">Question</label>
        <textarea
          className="input mt-1"
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
          rows={2}
          placeholder="Will the S&P 500 close higher than it opened today?"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Category</label>
          <select
            className="input mt-1"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Source URL (optional)</label>
          <input
            className="input mt-1"
            value={sourceUrl ?? ""}
            onChange={(e) => setSourceUrl(e.target.value)}
            type="url"
            placeholder="https://..."
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Publish at</label>
          <input
            className="input mt-1"
            type="datetime-local"
            value={publishDate}
            onChange={(e) => setPublishDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Resolves at</label>
          <input
            className="input mt-1"
            type="datetime-local"
            value={resolutionDate}
            onChange={(e) => setResolutionDate(e.target.value)}
            required
          />
        </div>
      </div>
      <div>
        <label className="label">Resolution criteria</label>
        <textarea
          className="input mt-1"
          value={resolutionCriteria}
          onChange={(e) => setResolutionCriteria(e.target.value)}
          required
          rows={2}
          placeholder="How will this be objectively decided?"
        />
      </div>

      {error && <p className="text-sm text-bad">{error}</p>}

      <div className="flex justify-end">
        <button disabled={submitting} className="btn-primary">
          {submitting ? "Saving..." : editing ? "Save changes" : "Create question"}
        </button>
      </div>
    </form>
  );
}
