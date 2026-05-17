import type { StreakStats } from "@/lib/streaks";
import { FlameIcon } from "./icons/FlameIcon";
import { TrophyIcon } from "./icons/TrophyIcon";
import { CheckCircleIcon } from "./icons/CheckCircleIcon";

type Props = {
  stats: StreakStats;
  /**
   * Optional sub-line shown in the footer band. Defaults to a derived
   * motivational line based on the streak state.
   */
  footer?: string;
};

/**
 * The premium streak card.
 *
 * Visual language:
 *   - Black card on white page = highest contrast on the dashboard
 *   - Lime breathing halo (streak-breath) — subtle, 6s cycle
 *   - Flame icon pulses (streak-flame) — left anchor
 *   - Trophy icon appears + pulses (streak-trophy) on day-complete days
 *   - Streak number gets a soft lime text-shadow
 *   - Single-row footer with one tasteful sparkle glyph
 *
 * Layout: stacked on mobile, two columns on sm+, divider between them.
 */
export function Streak({ stats, footer }: Props) {
  const pct = Math.min(100, (stats.todayCount / stats.todayTarget) * 100);
  const remaining = Math.max(0, stats.todayTarget - stats.todayCount);
  const streakAlive = stats.streak > 0;
  const footerLine = footer ?? defaultFooter(stats);

  return (
    <div className="streak-card border border-paper/10">
      {/* Top: streak block | divider | today block */}
      <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-stretch sm:gap-0 sm:p-8">
        {/* ── Streak side ─────────────────────────────────────── */}
        <div className="flex items-center gap-4 sm:flex-1">
          <FlameIcon
            className={`streak-flame h-12 w-12 shrink-0 sm:h-16 sm:w-16 ${
              streakAlive ? "text-accent" : "text-paper/30"
            }`}
          />
          <div className="min-w-0 flex-1">
            <p className="label text-accent">Streak</p>
            <p className="display streak-number-glow mt-1 text-4xl tabular-nums sm:text-5xl">
              {stats.streak}
              <span className="ml-2 text-base font-bold text-paper/60 sm:text-lg">
                {stats.streak === 1 ? "day" : "days"}
              </span>
            </p>
            <p
              className={`mt-1 text-sm font-bold ${
                streakAlive ? "text-accent" : "text-paper/60"
              }`}
            >
              {streakAlive ? "Streak alive." : "Streak idle."}
            </p>
            <p className="mt-0.5 text-xs text-paper/60">
              Reality remembers consistency.
            </p>
          </div>
        </div>

        {/* Divider — horizontal on mobile, vertical on sm+ */}
        <div className="h-px w-full bg-paper/12 sm:mx-8 sm:h-auto sm:w-px" />

        {/* ── Today side ──────────────────────────────────────── */}
        <div className="flex items-center gap-4 sm:flex-1">
          <div className="min-w-0 flex-1">
            <p className="label text-accent">Today</p>
            <p className="display mt-1 text-4xl tabular-nums sm:text-5xl">
              {stats.todayCount}
              <span className="ml-2 text-base font-bold text-paper/60 sm:text-lg">
                / {stats.todayTarget}
              </span>
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper/15">
              <div
                className="streak-progress-fill h-full bg-accent transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-sm font-bold">
              {stats.todayComplete ? (
                <>
                  <CheckCircleIcon className="h-4 w-4 text-accent" />
                  <span className="text-accent">Day complete.</span>
                </>
              ) : (
                <span className="text-paper/70">
                  {remaining} to go.
                </span>
              )}
            </p>
          </div>

          {stats.todayComplete && (
            <TrophyIcon className="streak-trophy h-12 w-12 shrink-0 text-accent sm:h-16 sm:w-16" />
          )}
        </div>
      </div>

      {/* Footer band */}
      <div className="relative border-t border-paper/10 px-6 py-3 text-center sm:px-8">
        <p className="text-xs text-paper/70">
          <span className="mr-1 text-accent" aria-hidden>
            ✦
          </span>
          {footerLine}
        </p>
      </div>
    </div>
  );
}

function defaultFooter(stats: StreakStats): string {
  if (stats.todayComplete) {
    return stats.streak >= 2
      ? "You’re building momentum. Come back tomorrow to keep the streak alive."
      : stats.streak === 1
        ? "Day one in the books. Make it two tomorrow."
        : "Day locked in. Reality will respond.";
  }
  if (stats.streak > 0) {
    return "Your streak is on the clock today.";
  }
  if (stats.todayCount > 0) {
    return "Finish today to start your streak.";
  }
  return "Predict 10 today to start a streak.";
}
