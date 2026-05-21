"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/lib/scoring";

type Props = {
  sourceId: string;
  initial: {
    text: string;
    category: string;
    resolutionCriteria: string;
    sourceUrl: string | null;
  };
  onSaved?: () => void;
};

type LivePreset = "12h" | "24h" | "48h" | "72h" | "resolveDate" | "custom";

const PRESETS: { value: LivePreset; label: string }[] = [
  { value: "12h", label: "12 hours after publish" },
  { value: "24h", label: "24 hours after publish" },
  { value: "48h", label: "48 hours after publish" },
  { value: "72h", label: "72 hours after publish" },
  { value: "resolveDate", label: "Until resolve date" },
  { value: "custom", label: "Custom datetime" },
];

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Tight form for "duplicate this resolved question into a new pending row."
 * Dates are required; everything else inherits from the source by default
 * but can be overridden. Calls POST /api/admin/questions/[id]/redeploy.
 */
export function AdminQuestionRedeployForm({ sourceId, initial, onSaved }: Props) {
  const router = useRouter();
  const now = new Date();
  const inThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const [text, setText] = useState(initial.text);
  const [category, setCategory] = useState(initial.category);
  const [resolutionCriteria, setResolutionCriteria] = useState(
    initial.resolutionCriteria,
  );
  const [sourceUrl, setSourceUrl] = useState(initial.sourceUrl ?? "");
  const [publishDate, setPublishDate] = useState(toLocalInput(now));
  const [resolutionDate, setResolutionDate] = useState(toLocalInput(inThreeDays));
  const [livePreset, setLivePreset] = useState<LivePreset>("24h");
  const [closesCustom, setClosesCustom] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/questions/${sourceId}/redeploy`, {
        method: "POST",
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
          closesToPredictionsAt: effectiveClosesAt
            ? effectiveClosesAt.toISOString()
            : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not duplicate.");
        setBusy(false);
        return;
      }
      router.refresh();
      onSaved?.();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="label">Question</label>
        <textarea
          className="input mt-1"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          required
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
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">New publish at</label>
          <input
            className="input mt-1"
            type="datetime-local"
            value={publishDate}
            onChange={(e) => setPublishDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">New needs-resolved by</label>
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
          {PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
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
          rows={2}
          required
        />
      </div>

      {error && <p className="text-sm text-bad">{error}</p>}

      <div className="flex justify-end">
        <button disabled={busy} className="btn-accent">
          {busy ? "Duplicating…" : "Create duplicate"}
        </button>
      </div>
    </form>
  );
}
