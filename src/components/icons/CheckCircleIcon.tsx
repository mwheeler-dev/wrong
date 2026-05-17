type Props = { className?: string };

export function CheckCircleIcon({ className = "" }: Props) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10 20a10 10 0 1 1 0-20 10 10 0 0 1 0 20zm4.7-12.3a1 1 0 0 0-1.4-1.4L9 10.6 6.7 8.3a1 1 0 1 0-1.4 1.4l3 3a1 1 0 0 0 1.4 0l5-5z"
      />
    </svg>
  );
}
