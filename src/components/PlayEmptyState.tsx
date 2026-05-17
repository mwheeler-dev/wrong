import Link from "next/link";
import { Countdown } from "./Countdown";
import { DAILY_CAP } from "@/lib/daily";

type Variant = "cap-reached" | "pool-empty";

type Props = {
  variant: Variant;
  todayCount: number;
  streak: number;
  /** Next local midnight for THIS user, as an ISO string. */
  nextMidnightIso: string;
};

/**
 * Shown on /play when there's nothing for the user to predict right now.
 *
 *   "cap-reached" — the user has hit today's prediction limit.
 *   "pool-empty"  — no PENDING-unanswered questions left for this user, but
 *                   they haven't hit the daily cap yet.
 *
 * Both variants share the structure: sharp headline, one-line sub, a
 * countdown to the user's local midnight, today's progress, streak callout.
 */
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

  const streakLine =
    streak > 0
      ? `${streak}-day streak. Come back tomorrow to keep it.`
      : isCap
        ? "Tomorrow’s round starts your streak."
        : "Predict 10 in a day to start a streak.";

  return (
    <div className="wrap pb-16 pt-10 sm:pt-14">
      <p className="label">Today</p>
      <h1 className="display mt-3 text-5xl sm:text-6xl">{headline}</h1>
      <p className="mt-4 max-w-md text-base text-muted sm:text-lg">{sub}</p>

      <div className="card mt-8 bg-ink text-paper">
        <p className="label text-paper/60">Reality resets in</p>
        <div className="display mt-2 text-5xl sm:text-6xl">
          <Countdown targetIso={nextMidnightIso} />
        </div>
        <p className="mt-3 text-sm text-paper/70">
          New predictions every midnight, your time.
        </p>
      </div>

      <div className="card mt-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="label">Today’s calls</p>
          <p className="display text-2xl tabular-nums">
            {todayCount} / {DAILY_CAP}
          </p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/10">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="mt-3 text-sm text-muted">{streakLine}</p>
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
