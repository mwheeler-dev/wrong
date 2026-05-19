"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { isNative, hapticLight, hapticSuccess } from "@/lib/native";

type Props = {
  /**
   * When false, the gesture is completely inert. Use this on screens where
   * a refresh could yank live state out from under the user (e.g. /play
   * while a question is active). If unset, /play is auto-disabled.
   */
  enabled?: boolean;
};

const TRIGGER_PX = 70;
const MAX_PX = 110;

/**
 * Native-feeling pull-to-refresh for mobile/touch only.
 *
 * Rules:
 *   - Touch only — pointer + wheel users keep the browser's default scroll.
 *   - Only engages when window scrollY is 0 at touchstart. Mid-page pulls
 *     never trigger; that prevents accidental refreshes while reading.
 *   - The indicator is fixed-position at the top with pointer-events: none
 *     so it cannot intercept taps on buttons/forms below.
 *   - On release past the trigger threshold, we do a hard reload of the
 *     current URL — same as a browser refresh. We don't try to coordinate
 *     with route-level cache because the live Next.js site is the source
 *     of truth.
 */
export function PullToRefresh({ enabled }: Props) {
  const pathname = usePathname();
  // Conservative default: disable on /play so an active question/timer
  // can't be torn down by an accidental pull.
  const effectiveEnabled =
    enabled ?? !(pathname?.startsWith("/play") ?? false);

  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const startYRef = useRef<number | null>(null);
  const activeRef = useRef(false);

  const reset = useCallback(() => {
    startYRef.current = null;
    activeRef.current = false;
    setPull(0);
  }, []);

  useEffect(() => {
    if (!effectiveEnabled) {
      reset();
      return;
    }
    if (typeof window === "undefined") return;

    function onTouchStart(e: TouchEvent) {
      if (refreshing) return;
      if (window.scrollY > 0) return;
      const t = e.touches[0];
      if (!t) return;
      startYRef.current = t.clientY;
      activeRef.current = true;
    }

    function onTouchMove(e: TouchEvent) {
      if (!activeRef.current || startYRef.current == null) return;
      const t = e.touches[0];
      if (!t) return;
      const dy = t.clientY - startYRef.current;
      if (dy <= 0) {
        setPull(0);
        return;
      }
      // Rubber-band: pull grows sub-linearly past the trigger point.
      const eased =
        dy <= TRIGGER_PX ? dy : TRIGGER_PX + (dy - TRIGGER_PX) * 0.4;
      setPull(Math.min(MAX_PX, eased));
      // While the user is dragging downward at the top of the page we
      // claim the gesture so the browser doesn't also scroll. Only when
      // we're confident — past a small dead zone — to avoid stealing
      // taps and ordinary down-swipes that should bubble.
      if (eased > 8 && e.cancelable) {
        e.preventDefault();
      }
    }

    function onTouchEnd() {
      if (!activeRef.current) return;
      const dy = pull;
      reset();
      if (dy >= TRIGGER_PX && !refreshing) {
        setRefreshing(true);
        if (isNative()) hapticSuccess();
        // Small delay so the "Refreshing…" label is visible before the
        // navigation tears the DOM down.
        setTimeout(() => {
          window.location.reload();
        }, 200);
      }
    }

    // passive:false on touchmove so we can preventDefault() to suppress the
    // browser's overscroll/refresh while we're handling the gesture.
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", reset, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", reset);
    };
  }, [effectiveEnabled, pull, refreshing, reset]);

  // Tiny haptic blip exactly once when the user crosses the trigger.
  const crossedRef = useRef(false);
  useEffect(() => {
    if (pull >= TRIGGER_PX && !crossedRef.current) {
      crossedRef.current = true;
      if (isNative()) hapticLight();
    } else if (pull < TRIGGER_PX - 4) {
      crossedRef.current = false;
    }
  }, [pull]);

  if (!effectiveEnabled) return null;
  const visible = pull > 4 || refreshing;
  const ready = pull >= TRIGGER_PX || refreshing;
  const translate = refreshing ? TRIGGER_PX : pull;

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 0,
        zIndex: 60,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -36,
          left: "50%",
          transform: `translate(-50%, ${translate}px)`,
          opacity: visible ? 1 : 0,
          transition: refreshing
            ? "transform 200ms ease, opacity 200ms ease"
            : "opacity 150ms ease",
          padding: "6px 12px",
          borderRadius: 999,
          background: "#0A0A0A",
          color: "#FFFFFF",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}
      >
        {refreshing ? "Refreshing…" : ready ? "Release to refresh" : "Pull to refresh"}
      </div>
    </div>
  );
}
