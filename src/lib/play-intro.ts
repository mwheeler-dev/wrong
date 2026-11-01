import { dayKeyInTz } from "./timezone";

/** Same local calendar-day boundary as the player's daily prediction allowance. */
export function hasStartedPlayToday(startedAt: Date | null, timeZone: string, now = new Date()): boolean {
  return startedAt !== null && dayKeyInTz(startedAt, timeZone) === dayKeyInTz(now, timeZone);
}
