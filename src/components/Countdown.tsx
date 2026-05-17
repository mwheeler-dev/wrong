"use client";

import { useEffect, useState } from "react";

type Props = {
  /**
   * Absolute UTC instant to count down to (ISO 8601 string).
   * Passed in as a string so server→client serialization is stable.
   */
  targetIso: string;
  className?: string;
  /** Compact mode hides the seconds for a calmer feel. */
  compact?: boolean;
};

/**
 * Ticks down to `targetIso`. Used on the /play empty state to display
 * "reality resets in HH:MM:SS" — where the target is the user's next local
 * midnight, computed server-side from their stored IANA timezone.
 *
 * Renders a placeholder until mounted to avoid a hydration mismatch.
 */
export function Countdown({ targetIso, className = "", compact = false }: Props) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!now) {
    return (
      <span className={`${className} tabular-nums`} aria-hidden>
        {compact ? "--:--" : "--:--:--"}
      </span>
    );
  }

  const target = new Date(targetIso);
  const diff = Math.max(0, target.getTime() - now.getTime());

  const h = Math.floor(diff / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((diff % (1000 * 60)) / 1000);

  const sep = <span className="opacity-40">:</span>;

  return (
    <span
      className={`${className} tabular-nums`}
      aria-label={`${h} hours ${m} minutes${compact ? "" : ` ${s} seconds`} until reset`}
    >
      <span>{String(h).padStart(2, "0")}</span>
      {sep}
      <span>{String(m).padStart(2, "0")}</span>
      {!compact && (
        <>
          {sep}
          <span>{String(s).padStart(2, "0")}</span>
        </>
      )}
    </span>
  );
}
