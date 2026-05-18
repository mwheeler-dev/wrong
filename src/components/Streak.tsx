import type { StreakStats, StreakState } from "@/lib/streaks";
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
 * The premium streak card. Renders three distinct states via copy and tone:
 *
 *   active   "Streak alive."     — today's cap is hit
 *   at-risk  "Streak at risk."   — yesterday completed, today not yet
 *   broken   "Streak idle."      — no recent completed day to protect
 *
 * Visual hierarchy is identical across states; only words change. Eligibility
 * to play is decided by todayCount vs DAILY_CAP on the server — never by
 * streak state.
 */
export function Streak({ stats, footer }: Props) {
  const pct = Math.min(100, (stats.todayCount / stats.todayTarget) * 100);
  const remaining = Math.max(0, stats.todayTarget - stats.todayCount);
  const footerLine = footer ?? defaultFooter(stats);

  // Flame is lit whenever there's a streak to protect (active OR at-risk).
  // Broken state dims it. We don't use a separate "warning" color for
  // at-risk — the copy carries the urgency, not the palette.
  const flameLit = stats.state === "active" || stats.state === "at-risk";

  return (
    <div className="streak-card border border-paper/10">
      <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-stretch sm:gap-0 sm:p-8">
        {/* ── Streak side ─────────────────────────────────────── */}
        <div className="flex items-center gap-4 sm:flex-1">
          <FlameIcon
            className={`streak-flame h-12 w-12 shrink-0 sm:h-16 sm:w-16 ${
              flameLit ? "text-accent" : "text-paper/30"
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
                flameLit ? "text-accent" : "text-paper/60"
              }`}
            >
              {statusLine(stats.state)}
            </p>
            <p className="mt-0.5 text-xs text-paper/60">
              Reality remembers consistency.
            </p>
          </div>
        </div>

        {/* Divider */}
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
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-paper/55">
              predictions today
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
                <span className="text-paper/70">{remaining} to go.</span>
              )}
            </p>
          </div>

          {stats.todayComplete && (
            <TrophyIcon className="streak-trophy h-12 w-12 shrink-0 text-accent sm:h-16 sm:w-16" />
          )}
        </div>
      </div>

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

function statusLine(state: StreakState): string {
  switch (state) {
    case "active":
      return "Streak alive.";
    case "at-risk":
      return "Streak at risk.";
    case "broken":
      return "Streak idle.";
  }
}

function defaultFooter(stats: StreakStats): string {
  if (stats.state === "active") {
    if (stats.streak >= 2) {
      return "You’re building momentum. Come back tomorrow to keep the streak alive.";
    }
    if (stats.streak === 1) {
      return "Day one in the books. Make it two tomorrow.";
    }
    return "Day locked in. Reality will respond.";
  }
  if (stats.state === "at-risk") {
    return `Complete today’s 10 predictions to keep your ${stats.streak}-day streak alive.`;
  }
  if (stats.todayCount > 0) {
    return "Finish today to start your streak.";
  }
  return "Predict 10 today to start a streak.";
}
