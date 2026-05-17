// Single-color stroke/fill SVG icons for the 8 prediction categories.
// Renders via `currentColor` so they pick up text color (lime when wrapped
// in `text-accent`, muted ink otherwise). Designed to read at 14px to 32px.

import type { Category } from "@/lib/scoring";

type Props = {
  category: string;
  className?: string;
};

export function CategoryIcon({ category, className = "" }: Props) {
  const path = PATHS[category as Category];
  if (!path) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {path}
    </svg>
  );
}

// Each icon is hand-tuned to read cleanly at small sizes. Stroke-style for
// consistency. Tech is the one exception (filled bolt) — a stroke bolt
// reads as a slash, the filled shape reads as energy.
const PATHS: Record<Category, React.ReactNode> = {
  Politics: (
    <>
      <path d="M3 9 12 4l9 5" />
      <path d="M4 21h16" />
      <path d="M5 9v12M9 9v12M15 9v12M19 9v12" />
    </>
  ),
  Science: (
    <>
      <path d="M9 3h6" />
      <path d="M10 4v5L5 18a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V4" />
      <path d="M7 15h10" />
    </>
  ),
  Sports: (
    <>
      <ellipse cx="12" cy="12" rx="9.5" ry="5" />
      <ellipse cx="12" cy="12" rx="3.5" ry="1.8" />
    </>
  ),
  Tech: (
    <path
      d="M13 3 5 14h6l-1 7 9-12h-7l1-6z"
      fill="currentColor"
      stroke="none"
    />
  ),
  Culture: (
    <>
      <path d="M5 4v8a7 7 0 0 0 14 0V4z" />
      <circle cx="9.5" cy="9" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="9" r="0.9" fill="currentColor" stroke="none" />
      <path d="M9 14c.7.7 1.8 1.2 3 1.2s2.3-.5 3-1.2" />
    </>
  ),
  Business: (
    <>
      <path d="M3 17l5-5 4 4 8-8" />
      <path d="M15 8h5v5" />
    </>
  ),
  World: (
    <>
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
      <line x1="3" y1="12" x2="21" y2="12" />
    </>
  ),
  Entertainment: (
    <>
      <rect x="3" y="9" width="18" height="12" rx="0.5" />
      <path d="M3 9l2-4M9 9l2-4M15 9l2-4M21 9l-2-4" />
    </>
  ),
};
