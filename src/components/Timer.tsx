"use client";

import { useEffect, useRef, useState } from "react";
import { ensureQuestionTimer } from "@/lib/questionTimer";
import { hapticLight, hapticMedium } from "@/lib/native";

// Timer warning pulses (single-fire per question). Lower numbers fire when
// the countdown CROSSES them moving downward; we never re-fire after a tab
// switch/recompute. The order { sec, kind } is descending so the gate
// (alreadyFired) closes them off as we pass through.
const WARNING_THRESHOLDS: { sec: number; kind: "light" | "medium" }[] = [
  { sec: 10, kind: "light" },
  { sec: 5, kind: "light" },
  { sec: 3, kind: "medium" },
];

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

  // Threshold buzzes already played (or deliberately skipped) for THIS
  // question. Reset only when the questionId changes — visibility-regain
  // recomputes remaining time but never re-fires a threshold, and never
  // back-fires thresholds we crossed while the tab was backgrounded
  // (those are marked "skipped" silently).
  const firedThresholdsRef = useRef<Set<number>>(new Set());
  // Per-threshold flag: did we previously observe `sec` strictly ABOVE this
  // threshold? Only then is a downward crossing a real "warning event".
  // First mount with `sec` already <= threshold = backgrounded across it
  // = silent skip.
  const observedAboveRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    expiredRef.current = false;
    firedThresholdsRef.current = new Set();
    observedAboveRef.current = new Set();
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

      // Single-fire warning pulses. Strategy:
      //   * If we've seen `sec` ABOVE this threshold in a previous tick,
      //     a downward crossing is a real event → fire once, mark fired.
      //   * If our very first observation is already at/below the
      //     threshold (e.g. user returned from background well after
      //     the threshold passed), mark fired WITHOUT firing — better
      //     to skip a missed warning than to spam a backlog of buzzes.
      const ceiled = Math.ceil(sec);
      for (const { sec: thresholdSec, kind } of WARNING_THRESHOLDS) {
        if (firedThresholdsRef.current.has(thresholdSec)) continue;
        if (ceiled > thresholdSec) {
          observedAboveRef.current.add(thresholdSec);
          continue;
        }
        // ceiled <= thresholdSec — crossing or already past.
        if (sec > 0 && observedAboveRef.current.has(thresholdSec)) {
          if (kind === "light") hapticLight();
          else hapticMedium();
        }
        firedThresholdsRef.current.add(thresholdSec);
      }

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
