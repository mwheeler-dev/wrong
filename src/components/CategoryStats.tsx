export type CategoryStat = {
  category: string;
  totalScore: number;
  accuracy: number | null;
  predictions: number;
  averageConfidence: number | null;
};

export function CategoryStats({ stats }: { stats: CategoryStat[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {stats.map((s) => (
        <div key={s.category} className="card">
          <div className="flex items-center justify-between">
            <span className="pill">{s.category}</span>
            <span className={`display text-3xl ${s.totalScore >= 0 ? "text-ink" : "text-bad"}`}>
              {s.totalScore >= 0 ? "+" : ""}
              {s.totalScore}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted">
            <Stat label="Accuracy" value={s.accuracy == null ? "—" : `${s.accuracy}%`} />
            <Stat label="Avg. conf" value={s.averageConfidence == null ? "—" : `${s.averageConfidence}%`} />
            <Stat label="Plays" value={String(s.predictions)} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="mt-0.5 text-base font-bold text-ink tabular-nums">{value}</div>
    </div>
  );
}
