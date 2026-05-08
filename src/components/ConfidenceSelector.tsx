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
      <p className="label">Confidence</p>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {CONFIDENCE_LEVELS.map((c) => (
          <button
            key={c}
            type="button"
            disabled={disabled}
            onClick={() => onChange(c)}
            className={clsx(
              "rounded-2xl border px-3 py-3 text-base font-bold transition",
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
