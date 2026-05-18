// Streak computation grouped by the USER'S local day (timezone-aware).

import { DAILY_CAP } from "./daily";
import { dayKeyInTz, dayKeyOffsetInTz } from "./timezone";

export const DAILY_TARGET = DAILY_CAP;

/**
 * The streak's relationship to TODAY.
 *
 *   "active"  — user completed today's daily cap (todayComplete === true).
 *   "at-risk" — user completed at least yesterday (streak > 0) but has not
 *               yet completed today.
 *   "broken"  — user hasn't completed yesterday or earlier. May or may not
 *               have predictions on today; either way, no streak to protect.
 *
 * Used to drive copy + visual state. NEVER used to gate play eligibility —
 * cap-reached is decided solely by `todayCount >= DAILY_CAP`.
 */
export type StreakState = "active" | "at-risk" | "broken";

export type StreakStats = {
  streak: number;
  todayCount: number;
  todayTarget: number;
  todayComplete: boolean;
  totalCompleteDays: number;
  state: StreakState;
};

function streakStateFor(todayComplete: boolean, streak: number): StreakState {
  if (todayComplete) return "active";
  if (streak > 0) return "at-risk";
  return "broken";
}

/**
 * Computes streak / today stats given:
 *   - every prediction's createdAt (UTC instants)
 *   - the user's IANA timezone (so "day" is their local calendar day)
 */
export function computeStreak(
  predictionCreatedAts: Date[],
  timeZone: string,
  now: Date = new Date(),
): StreakStats {
  const counts = new Map<string, number>();
  for (const at of predictionCreatedAts) {
    const k = dayKeyInTz(at, timeZone);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }

  const completeDays = new Set<string>();
  for (const [k, n] of counts.entries()) {
    if (n >= DAILY_TARGET) completeDays.add(k);
  }

  const todayKey = dayKeyInTz(now, timeZone);
  const todayCount = counts.get(todayKey) ?? 0;
  const todayComplete = todayCount >= DAILY_TARGET;

  // Walk back from today (or yesterday if today isn't done yet).
  let streak = 0;
  let offset = todayComplete ? 0 : -1;
  while (true) {
    const k = dayKeyOffsetInTz(offset, timeZone, now);
    if (completeDays.has(k)) {
      streak += 1;
      offset -= 1;
    } else {
      break;
    }
  }

  return {
    streak,
    todayCount,
    todayTarget: DAILY_TARGET,
    todayComplete,
    totalCompleteDays: completeDays.size,
    state: streakStateFor(todayComplete, streak),
  };
}
