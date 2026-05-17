// Date-window helpers. All callers must pass the user's IANA timezone so
// "today" / "this week" mean the right thing wherever the user lives.

import {
  dayKeyInTz,
  nextMidnightInTz,
  startOfDayInTz,
} from "./timezone";

export function startOfToday(timeZone: string, now: Date = new Date()): Date {
  return startOfDayInTz(now, timeZone);
}

export function endOfToday(timeZone: string, now: Date = new Date()): Date {
  // Last representable millisecond of today's local day in `timeZone`.
  return new Date(nextMidnightInTz(now, timeZone).getTime() - 1);
}

/** Monday 00:00 in the user's timezone for the local week containing `now`. */
export function startOfWeek(timeZone: string, now: Date = new Date()): Date {
  const todayKey = dayKeyInTz(now, timeZone);
  const [y, mo, d] = todayKey.split("-").map(Number);
  // What day-of-week is "today" in the user's local timezone? We can compute
  // this from the local Y-M-D treated as UTC — getUTCDay() then has no
  // timezone bias because we constructed the Date from raw local numbers.
  const localAsUtc = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
  const dow = localAsUtc.getUTCDay(); // 0=Sun..6=Sat
  const daysFromMonday = (dow + 6) % 7;
  // Subtract `daysFromMonday` calendar days, still at noon, then resolve
  // back to the user's local Y-M-D and convert to that day's midnight in tz.
  const mondayProbe = new Date(Date.UTC(y, mo - 1, d - daysFromMonday, 12, 0, 0));
  const mondayKey = dayKeyInTz(mondayProbe, timeZone);
  const [my, mmo, md] = mondayKey.split("-").map(Number);
  // Re-use startOfDayInTz by formatting the Monday probe to its local Y-M-D
  // and converting that day's midnight via startOfDayInTz on the probe.
  return startOfDayInTz(
    new Date(Date.UTC(my, mmo - 1, md, 12, 0, 0)),
    timeZone,
  );
}

export function formatShortDate(d: Date, timeZone?: string): string {
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone,
  });
}
