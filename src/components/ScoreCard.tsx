type Props = {
  label: string;
  value: string | number;
  hint?: string;
  emphasized?: boolean;
};

export function ScoreCard({ label, value, hint, emphasized }: Props) {
  return (
    <div className={`card ${emphasized ? "bg-ink text-paper" : ""}`}>
      <div className={`label ${emphasized ? "text-paper/70" : ""}`}>{label}</div>
      <div className={`display mt-1 text-4xl ${emphasized ? "text-paper" : ""}`}>{value}</div>
      {hint && (
        <div className={`mt-2 text-xs ${emphasized ? "text-paper/70" : "text-muted"}`}>{hint}</div>
      )}
    </div>
  );
}
