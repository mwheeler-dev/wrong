import type { StreakStats } from "@/lib/streaks";

export function Streak({ stats }: { stats: StreakStats }) {
  const pct = Math.min(100, Math.round((stats.todayCount / stats.todayTarget) * 100));
  const remaining = Math.max(0, stats.todayTarget - stats.todayCount);
  const line = stats.todayComplete
    ? "Today's done. Streak alive."
    : remaining === stats.todayTarget
      ? "You haven't played today."
      : `${remaining} to go today.`;

  return (
    <div className="card flex items-center justify-between gap-4 bg-ink text-paper">
      <div>
        <div className="label text-paper/70">Streak</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="display text-5xl">{stats.streak}</span>
          <span className="text-sm text-paper/70">day{stats.streak === 1 ? "" : "s"}</span>
        </div>
        <p className="mt-2 text-xs text-paper/70">{line}</p>
      </div>
      <div className="w-28 sm:w-36">
        <div className="label text-paper/70">Today</div>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-2xl font-bold tabular-nums">{stats.todayCount}</span>
          <span className="text-sm text-paper/70">/ {stats.todayTarget}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper/20">
          <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
