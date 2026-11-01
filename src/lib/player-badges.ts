import { DAILY_TARGET } from "./streaks";
import { dayKeyInTz } from "./timezone";

export type PlayerBadge = { id: string; icon: string; title: string; description: string };

export function longestCompleteStreak(dates: Date[], timeZone: string): number {
  const counts = new Map<string, number>();
  for (const at of dates) {
    const key = dayKeyInTz(at, timeZone);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const days = [...counts].filter(([, count]) => count >= DAILY_TARGET)
    .map(([day]) => Date.parse(`${day}T00:00:00Z`)).sort((a, b) => a - b);
  let best = 0, current = 0, previous = -Infinity;
  for (const day of days) {
    current = day - previous === 86_400_000 ? current + 1 : 1;
    best = Math.max(best, current);
    previous = day;
  }
  return best;
}

export function streakBadges(longest: number): PlayerBadge[] {
  return [3, 7, 30].filter((days) => longest >= days).map((days) => ({
    id: `streak-${days}`, icon: "🔥", title: `${days}-day streak`,
    description: `Completed ${DAILY_TARGET} predictions a day for ${days} consecutive days.`,
  }));
}

export function qualifiesAsCategoryLeader(score: number, total: number, leaders: { score: number; total: number }[]): boolean {
  return total >= 10 && score > 0 && !leaders.some((other) => other.total >= 10 && other.score > score);
}
