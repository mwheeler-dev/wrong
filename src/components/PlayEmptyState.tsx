import Link from "next/link";
import { Countdown } from "./Countdown";
import { DAILY_CAP } from "@/lib/daily";
import { FlameIcon } from "./icons/FlameIcon";
import { CheckCircleIcon } from "./icons/CheckCircleIcon";
import { TrophyIcon } from "./icons/TrophyIcon";

type Variant = "cap-reached" | "pool-empty";

type Props = {
  variant: Variant;
  todayCount: number;
  streak: number;
  nextMidnightIso: string;
};

export function PlayEmptyState({
  variant,
  todayCount,
  streak,
  nextMidnightIso,
}: Props) {
  const isCap = variant === "cap-reached";

  const headline = isCap ? "You’ve made your calls." : "You’re ahead of reality.";
  const sub = isCap
    ? "Now reality decides. Tomorrow brings new predictions."
    : "You’ve cleared the board. New predictions arrive daily.";

  const progressPct = Math.min(100, Math.round((todayCount / DAILY_CAP) * 100));
  const streakAlive = streak > 0;

  return (
    <div className="wrap pb-16 pt-10 sm:pt-14">
      <p className="label">Today</p>
      <h1 className="display mt-3 text-5xl sm:text-6xl">{headline}</h1>
      <p className="mt-4 max-w-md text-base text-muted sm:text-lg">{sub}</p>

      {/* Streak prestige card — same visual language as the dashboard streak */}
      <div className="streak-card mt-8 border border-paper/10">
        <div className="relative flex items-center gap-4 p-5 sm:p-6">
          <FlameIcon
            className={`streak-flame h-12 w-12 shrink-0 sm:h-14 sm:w-14 ${
              streakAlive ? "text-accent" : "text-paper/30"
            }`}
          />
          <div className="min-w-0 flex-1">
            <p className="label text-accent">Streak</p>
            <p className="display streak-number-glow mt-1 text-3xl tabular-nums sm:text-4xl">
              {streak}
              <span className="ml-2 text-sm font-bold text-paper/60 sm:text-base">
                {streak === 1 ? "day" : "days"}
              </span>
            </p>
            <p
              className={`mt-1 text-xs font-bold ${
                streakAlive ? "text-accent" : "text-paper/60"
              }`}
            >
              {streakAlive ? "Streak alive." : "Streak idle."}
            </p>
          </div>
          {isCap && (
            <TrophyIcon className="streak-trophy hidden h-12 w-12 shrink-0 text-accent sm:block sm:h-14 sm:w-14" />
          )}
        </div>
      </div>

      {/* Countdown card */}
      <div className="card mt-3 bg-ink text-paper">
        <p className="label text-paper/60">Reality resets in</p>
        <div className="display mt-2 text-5xl sm:text-6xl">
          <Countdown targetIso={nextMidnightIso} />
        </div>
        <p className="mt-3 text-sm text-paper/70">
          New predictions every midnight, your time.
        </p>
      </div>

      {/* Today's progress */}
      <div className="card mt-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="label">Today’s predictions</p>
          <p className="display text-2xl tabular-nums">
            {todayCount} / {DAILY_CAP}
          </p>
        </div>
        <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted">
          predictions locked in today
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/10">
          <div
            className="h-full bg-accent shadow-[0_0_12px_rgba(217,255,0,0.5)] transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-sm">
          {isCap ? (
            <>
              <CheckCircleIcon className="h-4 w-4 text-good" />
              <span className="font-bold text-good">Day complete.</span>
            </>
          ) : (
            <span className="text-muted">
              {streakAlive
                ? `${streak}-day streak. Come back tomorrow.`
                : "Predict 10 in a day to start a streak."}
            </span>
          )}
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-2 sm:flex-row">
        <Link href="/dashboard" className="btn-accent">
          See your dashboard
        </Link>
        <Link href="/leaderboards" className="btn-ghost">
          Boards
        </Link>
      </div>
    </div>
  );
}
