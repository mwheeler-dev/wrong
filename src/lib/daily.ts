// Daily-cap + reset helpers. All helpers are per-user-timezone aware —
// pass the user's IANA timezone string (resolved via session.ts helpers).
//
// "Day" means the calendar day in the user's local timezone. Two users
// in different timezones see different "today"s at the same UTC instant.

import {
  msUntilNextMidnightInTz,
  nextMidnightInTz,
  startOfDayInTz,
} from "./timezone";
import { prisma } from "./prisma";

export const DAILY_CAP = 10;

export { DEFAULT_TIMEZONE } from "./timezone";

/** The UTC instant of "today's 00:00" in `timeZone`. */
export function startOfToday(timeZone: string, now: Date = new Date()): Date {
  return startOfDayInTz(now, timeZone);
}

/** The UTC instant of "tomorrow's 00:00" in `timeZone`. */
export function nextMidnight(timeZone: string, now: Date = new Date()): Date {
  return nextMidnightInTz(now, timeZone);
}

/** Millis until the next local midnight. */
export function msUntilMidnight(
  timeZone: string,
  now: Date = new Date(),
): number {
  return msUntilNextMidnightInTz(now, timeZone);
}

/**
 * SINGLE source of truth for "how many predictions has this user made today
 * (in their local timezone)?" — used by /play, /api/play/predict, and the
 * predict-response payload so the client never has to derive this number.
 *
 * Always query through this helper. Inlining the filter in callers is the
 * exact mistake that let the count drift between /play and /dashboard.
 */
export async function countTodaysPredictions(
  userId: string,
  timeZone: string,
  now: Date = new Date(),
): Promise<number> {
  return prisma.prediction.count({
    where: { userId, createdAt: { gte: startOfToday(timeZone, now) } },
  });
}
