"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  /** Accessible label, e.g. "What is Edge?". Read by screen readers. */
  label: string;
  /** Tooltip body. Plain text or small inline element. */
  children: React.ReactNode;
  className?: string;
};

/**
 * Minimal, on-brand info tooltip. A small "i" disc that pops a dark popover
 * with explanatory copy. Works on hover, focus, and tap (mobile).
 *
 * Design constraints:
 *   - Same palette as the rest of the app (ink/paper/lime).
 *   - No external positioning library — fixed mt-2, max-w 80vw, centered.
 *   - Keyboard accessible: focus opens, blur/Esc closes.
 *   - aria-hidden flips with state so screen readers don't surface the
 *     tooltip body unless it's open.
 */
export function InfoTooltip({ label, children, className = "" }: Props) {
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
        className={`absolute left-1/2 top-full z-30 mt-2 w-64 max-w-[80vw] -translate-x-1/2 rounded-2xl border border-paper/15 bg-ink p-3 text-xs leading-snug text-paper shadow-[0_8px_40px_rgba(0,0,0,0.25)] transition-opacity duration-150 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {children}
      </span>
    </span>
  );
}
