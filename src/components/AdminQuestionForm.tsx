"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CATEGORIES } from "@/lib/scoring";

type EditingQuestion = {
  id?: string;
  text?: string;
  category?: string;
  resolutionCriteria?: string;
  sourceUrl?: string | null;
  publishDate?: string;
  resolutionDate?: string;
  closesToPredictionsAt?: string | null;
};

type LivePreset = "12h" | "24h" | "48h" | "72h" | "resolveDate" | "custom";

const LIVE_PRESET_OPTIONS: { value: LivePreset; label: string }[] = [
  { value: "12h", label: "12 hours after publish" },
  { value: "24h", label: "24 hours after publish" },
  { value: "48h", label: "48 hours after publish" },
  { value: "72h", label: "72 hours after publish" },
  { value: "resolveDate", label: "Until resolve date" },
  { value: "custom", label: "Custom datetime" },
];

function toLocalInput(d?: string | null) {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

function hoursFromMillis(ms: number): number {
  return ms / (1000 * 60 * 60);
}

function detectInitialPreset(
  publishDate?: string,
  closesToPredictionsAt?: string | null,
  resolutionDate?: string,
): LivePreset {
  // Edit mode with a stored close time: try to match against a preset so the
  // dropdown shows the same value the row was originally created with.
  if (closesToPredictionsAt && publishDate) {
    const pub = new Date(publishDate);
    const closes = new Date(closesToPredictionsAt);
    const hours = hoursFromMillis(closes.getTime() - pub.getTime());
    if (Math.abs(hours - 12) < 0.5) return "12h";
    if (Math.abs(hours - 24) < 0.5) return "24h";
    if (Math.abs(hours - 48) < 0.5) return "48h";
    if (Math.abs(hours - 72) < 0.5) return "72h";
    if (resolutionDate) {
      const resolves = new Date(resolutionDate);
      if (Math.abs(closes.getTime() - resolves.getTime()) < 60_000) {
        return "resolveDate";
      }
    }
    return "custom";
  }
  // Legacy row (closesToPredictionsAt is null): UI shows "until resolve
  // date" since that's effectively the fallback the read paths use.
  if (!closesToPredictionsAt && publishDate && resolutionDate) {
    return "resolveDate";
  }
  // New-question default
  return "24h";
}

export function AdminQuestionForm({ initial }: { initial?: EditingQuestion }) {
  const router = useRouter();
  const editing = !!initial?.id;

  const [text, setText] = useState(initial?.text ?? "");
  const [category, setCategory] = useState(initial?.category ?? CATEGORIES[0]);
  const [resolutionCriteria, setResolutionCriteria] = useState(
    initial?.resolutionCriteria ?? "",
  );
  const [sourceUrl, setSourceUrl] = useState(initial?.sourceUrl ?? "");
  const [publishDate, setPublishDate] = useState(toLocalInput(initial?.publishDate));
  const [resolutionDate, setResolutionDate] = useState(
    toLocalInput(initial?.resolutionDate),
  );
  const [livePreset, setLivePreset] = useState<LivePreset>(() =>
    detectInitialPreset(
      initial?.publishDate,
      initial?.closesToPredictionsAt,
      initial?.resolutionDate,
    ),
  );
  const [closesCustom, setClosesCustom] = useState(
    toLocalInput(initial?.closesToPredictionsAt),
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Effective close datetime, derived live from the preset + other fields.
  const effectiveClosesAt = useMemo<Date | null>(() => {
    if (livePreset === "custom") {
      if (!closesCustom) return null;
      const d = new Date(closesCustom);
      return isNaN(d.getTime()) ? null : d;
    }
    if (livePreset === "resolveDate") {
      if (!resolutionDate) return null;
      const d = new Date(resolutionDate);
      return isNaN(d.getTime()) ? null : d;
    }
    if (!publishDate) return null;
    const pub = new Date(publishDate);
    if (isNaN(pub.getTime())) return null;
    const hours = { "12h": 12, "24h": 24, "48h": 48, "72h": 72 }[livePreset];
    return new Date(pub.getTime() + hours * 60 * 60 * 1000);
  }, [livePreset, closesCustom, publishDate, resolutionDate]);

  // Keep the custom-mode input pre-populated if user switches into "custom"
  // mid-edit so they don't lose the computed value.
  useEffect(() => {
    if (livePreset !== "custom" && effectiveClosesAt && !closesCustom) {
      setClosesCustom(toLocalInput(effectiveClosesAt.toISOString()));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [livePreset]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const url = editing
        ? `/api/admin/questions/${initial!.id}`
        : "/api/admin/questions";
      const method = editing ? "PATCH" : "POST";
      const closesIso = effectiveClosesAt
        ? effectiveClosesAt.toISOString()
        : null;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          category,
          resolutionCriteria,
          sourceUrl: sourceUrl.trim() || null,
          publishDate: publishDate ? new Date(publishDate).toISOString() : null,
          resolutionDate: resolutionDate
            ? new Date(resolutionDate).toISOString()
            : null,
          closesToPredictionsAt: closesIso,
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
              <option key={c} value={c}>
                {c}
              </option>
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
          <label className="label">Needs resolved by</label>
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
        <label className="label">Closes to predictions</label>
        <select
          className="input mt-1"
          value={livePreset}
          onChange={(e) => setLivePreset(e.target.value as LivePreset)}
        >
          {LIVE_PRESET_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {livePreset === "custom" && (
          <input
            className="input mt-2"
            type="datetime-local"
            value={closesCustom}
            onChange={(e) => setClosesCustom(e.target.value)}
            required
          />
        )}
        <p className="mt-1 text-xs text-muted">
          {effectiveClosesAt ? (
            <>
              Answer window shuts at{" "}
              <strong className="text-ink">
                {effectiveClosesAt.toLocaleString()}
              </strong>
              .
            </>
          ) : (
            "Set publish date to compute close time."
          )}
        </p>
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
