// Streak computation grouped by the USER'S local day (timezone-aware).

import { DAILY_CAP } from "./daily";
import { dayKeyInTz, dayKeyOffsetInTz } from "./timezone";

export const DAILY_TARGET = DAILY_CAP;

export type StreakStats = {
  streak: number;
  todayCount: number;
  todayTarget: number;
  todayComplete: boolean;
  totalCompleteDays: number;
};

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
  };
}
