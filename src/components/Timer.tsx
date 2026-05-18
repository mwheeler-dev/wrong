"use client";

import { useEffect, useRef, useState } from "react";
import { ensureQuestionTimer } from "@/lib/questionTimer";

type Props = {
  /** How long the question is live, in seconds. (30 in production.) */
  seconds: number;
  /**
   * The active question's id. Used as the sessionStorage key for the
   * persisted deadline — switching to a different question creates a
   * separate timer; returning to the same question continues the old one.
   */
  questionId: string;
  onExpire?: () => void;
};

/**
 * Per-question countdown bound to an ABSOLUTE deadline stored in
 * sessionStorage, not to the component's mount time.
 *
 * Properties:
 *   - First mount for a question → creates `deadline = now + seconds*1000`,
 *     persists it, displays remaining.
 *   - Remount for the same question (refresh, navigation, hydration) →
 *     reads the existing deadline, continues from real elapsed time. If
 *     the deadline has already passed, onExpire fires immediately.
 *   - Tab returns from background → setInterval may have been throttled,
 *     so a visibilitychange listener forces an immediate recomputation
 *     from `deadline - Date.now()`.
 *   - Different question (id changes) → effect re-runs with a fresh
 *     storage key, which gets its own deadline.
 *
 * Lifecycle of the storage key is owned by PlayClient (clears on success /
 * 409 / bring-back; preserves on expiry so refresh can't reset it).
 */
export function Timer({ seconds, questionId, onExpire }: Props) {
  const [remaining, setRemaining] = useState(seconds);
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);

  // Keep the latest onExpire reachable inside the interval without
  // re-running the effect on every render.
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    expiredRef.current = false;
    const durationMs = seconds * 1000;
    const { deadline } = ensureQuestionTimer(questionId, durationMs);

    const tick = () => {
      const ms = deadline - Date.now();
      const sec = Math.max(0, ms / 1000);
      setRemaining(sec);
      if (sec <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        clearInterval(interval);
        onExpireRef.current?.();
      }
    };

    // Synchronous first reading — if the persisted deadline is already in
    // the past (refresh after expiry), this fires onExpire immediately
    // instead of leaving the user staring at a stale "30s".
    tick();
    const interval = setInterval(tick, 100);

    // Browsers throttle setInterval aggressively in background tabs (often
    // to once per second or less), so the displayed countdown can be stale
    // when the user returns. Recompute from the absolute deadline on
    // every visibility regain — never reset, only recompute.
    function onVisibility() {
      if (!document.hidden) tick();
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [questionId, seconds]);

  const pct = Math.max(0, Math.min(1, remaining / seconds));
  const isLow = remaining <= 5;

  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink/10">
        <div
          className={`h-full transition-[width] duration-100 ease-linear ${isLow ? "bg-bad" : "bg-ink"}`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <div className={`tabular-nums text-sm font-bold ${isLow ? "text-bad" : "text-ink"}`}>
        {Math.ceil(remaining)}s
      </div>
    </div>
  );
}
