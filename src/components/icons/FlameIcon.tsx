type Props = { className?: string };

/**
 * Simple flame glyph. Single-color (currentColor) so it picks up whatever
 * text color the parent sets — lime when on the streak card.
 */
export function FlameIcon({ className = "" }: Props) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M16 2c.6 4-2 5.5-2 8.3 0 1.6.8 2.5 1.6 2.5 1 0 1.6-1.3 1.6-3.2C18.4 11.4 22 14 22 19a6 6 0 0 1-12 0c0-3.3 2.8-4.5 2.8-7.6 0-1.4-1-2-2-1.8C12 8.4 13 7 14 5.7 14.6 5 15.4 3.7 16 2z" />
      <path
        opacity="0.7"
        d="M16 20a3 3 0 0 0 3-3c0-1.3-1-2-1-2-.3.9-1 1.4-1.7 1.4-1 0-1.6-.8-1.6-2-.6.5-1.7 1.7-1.7 3 0 1.6 1.3 2.6 3 2.6z"
      />
    </svg>
  );
}
