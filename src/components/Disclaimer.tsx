import { DISCLAIMER_TEXT } from "@/lib/legal";

type Props = {
  className?: string;
  /** Override the default text if needed */
  children?: React.ReactNode;
};

/**
 * Small, muted disclaimer for use near prediction/gameplay surfaces.
 * Renders as a <p role="note"> so screen readers expose it as supplemental.
 */
export function Disclaimer({ className = "", children }: Props) {
  return (
    <p
      role="note"
      className={`text-center text-[11px] leading-relaxed text-muted ${className}`}
    >
      {children ?? DISCLAIMER_TEXT}
    </p>
  );
}
