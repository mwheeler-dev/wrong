import { CategoryIcon } from "./icons/CategoryIcon";

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
        <CategoryCard key={s.category} stat={s} />
      ))}
    </div>
  );
}

function CategoryCard({ stat }: { stat: CategoryStat }) {
  const score = stat.totalScore;
  const hasData = stat.predictions > 0;
  // Edge-tint: positive lime, negative red, neutral muted ink.
  const tone =
    score > 0 ? "positive" : score < 0 ? "negative" : "neutral";

  // Subtle left accent bar keyed to Edge sign. Strongest when there's real
  // data; muted when the user hasn't predicted in this category yet.
  const accentBar =
    !hasData
      ? "before:bg-ink/5"
      : tone === "positive"
        ? "before:bg-accent before:shadow-[0_0_12px_rgba(217,255,0,0.45)]"
        : tone === "negative"
          ? "before:bg-bad before:shadow-[0_0_12px_rgba(220,38,38,0.35)]"
          : "before:bg-ink/15";

  const hoverGlow =
    tone === "positive"
      ? "hover:border-accent/60 hover:shadow-[0_0_30px_rgba(217,255,0,0.14)]"
      : tone === "negative"
        ? "hover:border-bad/40 hover:shadow-[0_0_30px_rgba(220,38,38,0.10)]"
        : "hover:border-ink/30";

  return (
    <div
      className={`card relative overflow-hidden transition before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] ${accentBar} ${hoverGlow}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="pill inline-flex items-center gap-1.5">
          <CategoryIcon category={stat.category} className="h-3.5 w-3.5" />
          {stat.category}
        </span>
        <span
          className={`display text-3xl tabular-nums ${
            tone === "negative" ? "text-bad" : "text-ink"
          }`}
        >
          {score >= 0 ? "+" : ""}
          {score}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted">
        <Stat
          label="Accuracy"
          value={stat.accuracy == null ? "—" : `${stat.accuracy}%`}
        />
        <Stat
          label="Avg. conf"
          value={
            stat.averageConfidence == null ? "—" : `${stat.averageConfidence}%`
          }
        />
        <Stat label="Plays" value={String(stat.predictions)} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="mt-0.5 text-base font-bold text-ink tabular-nums">
        {value}
      </div>
    </div>
  );
}
