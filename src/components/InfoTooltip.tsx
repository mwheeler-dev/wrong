"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Where the tooltip's body anchors relative to the trigger.
 *   - "center" (default): tooltip centered under the icon.
 *   - "left":   tooltip's left edge aligns with trigger's left edge —
 *               opens inward when the trigger sits near the left of a card.
 *   - "right":  mirror of "left", for triggers near a right edge.
 */
export type TooltipPlacement = "left" | "center" | "right";

type Props = {
  label: string;
  children: React.ReactNode;
  className?: string;
  placement?: TooltipPlacement;
};

/**
 * Minimal, on-brand info tooltip. A small "i" disc that pops a dark popover
 * with explanatory copy. Hover, focus, tap all open; Esc / outside-click
 * close. Width clamps to viewport on narrow screens so it never overflows.
 */
export function InfoTooltip({
  label,
  children,
  className = "",
  placement = "center",
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  // Position anchor classes. Each variant pins one edge so a tooltip near
  // the left side of a card opens inward to the right, etc.
  const positionClass =
    placement === "left"
      ? "left-0"
      : placement === "right"
        ? "right-0"
        : "left-1/2 -translate-x-1/2";

  return (
    <span
      ref={wrapRef}
      className={`relative inline-flex items-center ${className}`}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-current text-[10px] font-bold leading-none opacity-60 transition hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-accent/50"
      >
        i
      </button>
      <span
        role="tooltip"
        aria-hidden={!open}
        className={`absolute top-full z-30 mt-2 w-64 max-w-[min(16rem,calc(100vw-2rem))] rounded-2xl border border-paper/15 bg-ink p-3 text-xs leading-snug text-paper shadow-[0_8px_40px_rgba(0,0,0,0.25)] transition-opacity duration-150 ${positionClass} ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {children}
      </span>
    </span>
  );
}
