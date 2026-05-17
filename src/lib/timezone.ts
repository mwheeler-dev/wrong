// Low-level IANA timezone math. No external dependencies — everything
// is built on top of `Intl.DateTimeFormat` so we get the platform's TZDB.
//
// Concepts:
//   - "day key"  → YYYY-MM-DD as seen IN THE USER'S TIMEZONE
//   - "midnight" → the UTC instant that corresponds to 00:00 wall-clock
//                  on a given day, in a given timezone
//
// Higher-level helpers (startOfToday, nextMidnight, etc.) live in daily.ts /
// dates.ts and call into this module.

/** Default fallback when we have no stored or detected timezone. */
export const DEFAULT_TIMEZONE = "America/New_York";

export function isValidTimezone(tz: string | null | undefined): boolean {
  if (!tz || typeof tz !== "string") return false;
  try {
    // Will throw RangeError for an unknown zone
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Coalesce a possibly-missing tz to the default. Also validates input. */
export function resolveTimezone(tz: string | null | undefined): string {
  return isValidTimezone(tz) ? (tz as string) : DEFAULT_TIMEZONE;
}

/** Returns YYYY-MM-DD as seen in `timeZone` for the instant `date`. */
export function dayKeyInTz(date: Date, timeZone: string): string {
  // en-CA gives YYYY-MM-DD by default
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Offset of `timeZone` from UTC at the instant `date`, in milliseconds.
 * Positive when `timeZone` is ahead of UTC, negative when behind.
 * (E.g. America/New_York returns ~-5h * 3600_000 in winter, -4h in summer.)
 */
function offsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const m: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== "literal") m[p.type] = parseInt(p.value, 10);
  }
  const wallAsUtc = Date.UTC(m.year, m.month - 1, m.day, m.hour, m.minute, m.second);
  return wallAsUtc - date.getTime();
}

/**
 * The UTC instant that corresponds to 00:00 wall-clock on the given local
 * (year, month, day) in `timeZone`. We compute the timezone's offset at a
 * naïve approximation of that instant and shift by it. Robust for ordinary
 * days; DST edge cases are within an hour of midnight in only two days/year.
 */
function midnightOfLocalDay(
  year: number,
  month: number,
  day: number,
  timeZone: string,
): Date {
  const naïve = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  return new Date(naïve.getTime() - offsetMs(naïve, timeZone));
}

/** The UTC instant of "today's 00:00" in `timeZone`. */
export function startOfDayInTz(now: Date, timeZone: string): Date {
  const [y, mo, d] = dayKeyInTz(now, timeZone).split("-").map(Number);
  return midnightOfLocalDay(y, mo, d, timeZone);
}

/** The UTC instant of "tomorrow's 00:00" in `timeZone`. */
export function nextMidnightInTz(now: Date, timeZone: string): Date {
  const [y, mo, d] = dayKeyInTz(now, timeZone).split("-").map(Number);
  // Add 24h to UTC-noon of the local day so we always cross a calendar
  // boundary, even on DST fall-back days (which have 25 local hours).
  const noonToday = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
  const noonTomorrow = new Date(noonToday.getTime() + 24 * 60 * 60 * 1000);
  const [ty, tmo, td] = dayKeyInTz(noonTomorrow, timeZone).split("-").map(Number);
  return midnightOfLocalDay(ty, tmo, td, timeZone);
}

/** Millis from `now` until the next local midnight in `timeZone`. */
export function msUntilNextMidnightInTz(now: Date, timeZone: string): number {
  return Math.max(0, nextMidnightInTz(now, timeZone).getTime() - now.getTime());
}

/** Day-key offset N days from today in `timeZone`. Used by streak walking. */
export function dayKeyOffsetInTz(
  offsetDays: number,
  timeZone: string,
  now: Date = new Date(),
): string {
  const [y, mo, d] = dayKeyInTz(now, timeZone).split("-").map(Number);
  // Noon-of-local-day + offsetDays*24h keeps us safely inside the target day
  const probe = new Date(Date.UTC(y, mo - 1, d + offsetDays, 12, 0, 0));
  return dayKeyInTz(probe, timeZone);
}
