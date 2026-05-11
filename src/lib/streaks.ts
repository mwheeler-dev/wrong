// A day is "complete" when the user made at least DAILY_TARGET predictions on it.
// Streak: consecutive complete days ending at today or yesterday.
// Today doesn't break a streak — only a missed full day does.

export const DAILY_TARGET = 10;

function dayKey(d: Date): string {
  // Local-date key, YYYY-MM-DD
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayKeyOffset(offsetDays: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return dayKey(d);
}

export type StreakStats = {
  streak: number;
  todayCount: number;
  todayTarget: number;
  todayComplete: boolean;
  totalCompleteDays: number;
};

export function computeStreak(predictionCreatedAts: Date[]): StreakStats {
  const counts = new Map<string, number>();
  for (const at of predictionCreatedAts) {
    const k = dayKey(at);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }

  const completeDays = new Set<string>();
  for (const [k, n] of counts.entries()) {
    if (n >= DAILY_TARGET) completeDays.add(k);
  }

  const todayKey = dayKeyOffset(0);
  const todayCount = counts.get(todayKey) ?? 0;
  const todayComplete = todayCount >= DAILY_TARGET;

  // Count consecutive complete days walking back from today (or yesterday if today incomplete)
  let streak = 0;
  let offset = todayComplete ? 0 : -1;
  // If today isn't done, the streak ends at yesterday. But we still allow today to extend it.
  while (true) {
    const k = dayKeyOffset(offset);
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
