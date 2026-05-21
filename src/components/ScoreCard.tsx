type Props = {
  label: string;
  value: string | number;
  /**
   * Optional qualifier rendered immediately under the big number — e.g.
   * "confidence" turns "90%" into "90%" + a small "confidence" subtitle.
   * Keeps the numeric prominence consistent with other score tiles while
   * giving the value semantic meaning on its own. Stacked instead of
   * inline because the mobile tile inner width (~130px on a 375px
   * viewport) is too narrow to hold "90% confidence" at text-4xl on one
   * line without redesigning the grid.
   */
  unit?: string;
  hint?: string;
  emphasized?: boolean;
};

export function ScoreCard({ label, value, unit, hint, emphasized }: Props) {
  return (
    <div className={`card ${emphasized ? "bg-ink text-paper" : ""}`}>
      <div className={`label ${emphasized ? "text-paper/70" : ""}`}>{label}</div>
      <div className={`display mt-1 text-4xl ${emphasized ? "text-paper" : ""}`}>{value}</div>
      {unit && (
        <div
          className={`mt-1 text-[11px] font-semibold uppercase tracking-wider ${
            emphasized ? "text-paper/70" : "text-muted"
          }`}
        >
          {unit}
        </div>
      )}
      {hint && (
        <div className={`mt-2 text-xs ${emphasized ? "text-paper/70" : "text-muted"}`}>{hint}</div>
      )}
    </div>
  );
}
