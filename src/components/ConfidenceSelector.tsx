"use client";

import clsx from "clsx";
import { CONFIDENCE_LEVELS, type Confidence } from "@/lib/scoring";

type Props = {
  value: Confidence | null;
  onChange: (v: Confidence) => void;
  disabled?: boolean;
};

export function ConfidenceSelector({ value, onChange, disabled }: Props) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="label">Confidence</p>
        {value != null && (
          <p className="text-xs text-muted">
            {value === 60 && "Hedge."}
            {value === 70 && "Lean."}
            {value === 80 && "Bold."}
            {value === 90 && "All in."}
          </p>
        )}
      </div>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {CONFIDENCE_LEVELS.map((c) => (
          <button
            key={c}
            type="button"
            disabled={disabled}
            onClick={() => onChange(c)}
            className={clsx(
              "min-h-[56px] rounded-2xl border px-2 py-3 text-base font-bold transition sm:text-lg",
              value === c
                ? "border-ink bg-ink text-paper"
                : "border-line bg-white text-ink hover:border-ink"
            )}
          >
            {c}%
          </button>
        ))}
      </div>
    </div>
  );
}
