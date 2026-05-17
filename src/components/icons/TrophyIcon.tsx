type Props = { className?: string };

/** Trophy glyph. currentColor — lime on the streak card when day is complete. */
export function TrophyIcon({ className = "" }: Props) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M9 4h14v5a7 7 0 0 1-2 4.9V18a5 5 0 0 1-4 4.9V25h3a1 1 0 0 1 1 1v1H11v-1a1 1 0 0 1 1-1h3v-2.1A5 5 0 0 1 11 18v-4.1A7 7 0 0 1 9 9V4z" />
      <path d="M6 6h2v3a3 3 0 0 0 .5 1.7A5 5 0 0 1 6 7V6zm20 0h-2v3a3 3 0 0 1-.5 1.7A5 5 0 0 0 26 7V6z" />
      <path d="M9 28h14v2H9z" />
    </svg>
  );
}
