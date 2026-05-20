"use client";

import { useState } from "react";
import { REASONING_OPTIONS, type ReasoningToken } from "@/lib/reasoning";
import { hapticLight, hapticSuccess } from "@/lib/native";

type Props = {
  /** Prediction this reflection attaches to. */
  predictionId: string;
  /** Called after a successful submit (so the parent can mark it stored). */
  onSubmitted?: () => void;
};

/**
 * Per-prediction reasoning chips + optional reflection text. Rendered
 * below the ResultCard on /play. Submission requires at least one chip;
 * text is optional. Multi-select.
 *
 * Posts to /api/play/predict/[id]/reflection. On success we collapse the
 * panel and show a small confirmation — the user can keep playing.
 */
export function ReasoningInput({ predictionId, onSubmitted }: Props) {
  const [selected, setSelected] = useState<Set<ReasoningToken>>(new Set());
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  function toggle(token: ReasoningToken) {
    hapticLight();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(token)) next.delete(token);
      else next.add(token);
      return next;
    });
  }

  async function submit() {
    if (busy) return;
    if (selected.size === 0) {
      setError("Pick at least one chip.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/play/predict/${predictionId}/reflection`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reasoning: Array.from(selected),
            text: text.trim(),
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not save.");
        setBusy(false);
        return;
      }
      hapticSuccess();
      setDone(true);
      onSubmitted?.();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card mt-3 border-accent/30 bg-accent/5">
        <p className="text-sm text-ink">
          Reasoning saved. Future-you will thank present-you.
        </p>
      </div>
    );
  }

  return (
    <div className="card mt-3">
      <div className="flex items-center gap-1.5">
        <p className="label">Why are you making this prediction?</p>
        <button
          type="button"
          aria-label="What do these mean?"
          aria-expanded={tooltipOpen}
          onClick={() => setTooltipOpen((o) => !o)}
          className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-ink/50 text-[10px] font-bold leading-none text-ink/70 transition hover:border-ink hover:text-ink"
        >
          i
        </button>
      </div>

      {tooltipOpen && (
        <div className="mt-2 rounded-2xl bg-ink p-3 text-xs leading-snug text-paper">
          <ul className="space-y-1.5">
            {REASONING_OPTIONS.map((opt) => (
              <li key={opt.token}>
                <strong className="text-accent">{opt.label}</strong>
                <span className="text-paper/80"> — {opt.blurb}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {REASONING_OPTIONS.map((opt) => {
          const isOn = selected.has(opt.token);
          // Each chip has a distinct accent ring when selected so the
          // user can read their reasoning mix at a glance. We use the
          // same lime accent across chips but vary the "intensity" via
          // bg opacity — keeps the palette honest.
          return (
            <button
              key={opt.token}
              type="button"
              onClick={() => toggle(opt.token)}
              aria-pressed={isOn}
              className={`min-h-[40px] rounded-full px-4 py-2 text-sm font-semibold transition active:scale-[0.98] ${
                isOn
                  ? "border-2 border-accent bg-accent/15 text-ink shadow-[0_0_0_3px_rgba(217,255,0,0.18)]"
                  : "border border-ink/15 bg-white text-ink hover:border-ink"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <textarea
        className="input mt-3 min-h-[80px]"
        placeholder="Optional reflection — what tipped you?"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      {error && <p className="mt-2 text-sm text-bad">{error}</p>}

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-muted">
          {selected.size === 0
            ? "Pick at least one to submit."
            : `${selected.size} selected.`}
        </p>
        <button
          type="button"
          onClick={submit}
          disabled={busy || selected.size === 0}
          className="btn-primary"
        >
          {busy ? "Saving…" : "Submit"}
        </button>
      </div>
    </div>
  );
}
