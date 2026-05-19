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

    // CRITICAL: declared as `let` and initialized to undefined so the
    // closure has a valid binding from the moment `tick` is defined. The
    // previous version used `const interval = setInterval(...)` AFTER the
    // synchronous tick() call below — when the persisted deadline was
    // already in the past, that initial tick reached `clearInterval(interval)`
    // before `interval` was initialized, throwing a TDZ ReferenceError and
    // crashing /play on every refresh once any deadline had elapsed.
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const tick = () => {
      const ms = deadline - Date.now();
      const sec = Math.max(0, ms / 1000);
      setRemaining(sec);
      if (sec <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        if (intervalId != null) {
          clearInterval(intervalId);
          intervalId = undefined;
        }
        onExpireRef.current?.();
      }
    };

    // Synchronous first reading. If the persisted deadline is already past
    // (refresh after expiry), this fires onExpire immediately — and that's
    // now safe because `intervalId` is `undefined` (not in TDZ), so the
    // conditional clearInterval is a no-op.
    tick();
    // Don't schedule a ticker we already expired against. Saves a
    // 100ms-cycle of pointless setState noise during cascade.
    if (!expiredRef.current) {
      intervalId = setInterval(tick, 100);
    }

    // Browsers throttle setInterval aggressively in background tabs, so the
    // displayed countdown can be stale when the user returns. Recompute
    // from the absolute deadline on every visibility regain — never reset.
    function onVisibility() {
      if (!document.hidden) tick();
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (intervalId != null) clearInterval(intervalId);
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
