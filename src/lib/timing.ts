// Natural-language timing copy for the prediction lifecycle.
//
// Vocabulary:
//   - "Predictions close ..." → time until the answer window shuts
//   - "Outcome expected ..."  → when reality (admin) is meant to call it
//   - "Needs resolved ..."    → admin-facing label for the resolve deadline
//
// All helpers take an explicit `timeZone` so "tonight" / "tomorrow" are
// computed against the user's local calendar, not the server's.

import { dayKeyInTz, dayKeyOffsetInTz } from "./timezone";

/**
 * Returns the answer-window cutoff for a question. New questions always set
 * `closesToPredictionsAt`. Legacy rows (null) fall back to `resolutionDate`
 * so behavior is preserved without a backfill.
 */
export function effectiveClosesAt(q: {
  closesToPredictionsAt: Date | string | null | undefined;
  resolutionDate: Date | string;
}): Date {
  const closes = q.closesToPredictionsAt;
  if (closes) return closes instanceof Date ? closes : new Date(closes);
  return q.resolutionDate instanceof Date
    ? q.resolutionDate
    : new Date(q.resolutionDate);
}

/**
 * "Predictions close in 6 hours" / "Predictions close tonight" /
 * "Predictions close tomorrow" / "Predictions close May 24" / "Predictions
 * closed".
 */
export function closesLabel(
  closesAt: Date,
  timeZone: string,
  now: Date = new Date(),
): string {
  const diffMs = closesAt.getTime() - now.getTime();
  if (diffMs <= 0) return "Predictions closed";

  const diffMins = diffMs / (1000 * 60);
  const diffHours = diffMins / 60;

  if (diffMins < 60) {
    const m = Math.max(1, Math.round(diffMins));
    return `Predictions close in ${m} min${m === 1 ? "" : "s"}`;
  }
  if (diffHours < 12) {
    const h = Math.round(diffHours);
    return `Predictions close in ${h} hour${h === 1 ? "" : "s"}`;
  }

  // Calendar comparisons in the user's local timezone
  const todayKey = dayKeyInTz(now, timeZone);
  const closesKey = dayKeyInTz(closesAt, timeZone);
  if (todayKey === closesKey) return "Predictions close tonight";

  const tomorrowKey = dayKeyOffsetInTz(1, timeZone, now);
  if (closesKey === tomorrowKey) return "Predictions close tomorrow";

  if (diffHours < 7 * 24) {
    const days = Math.ceil(diffHours / 24);
    return `Predictions close in ${days} day${days === 1 ? "" : "s"}`;
  }
  return `Predictions close ${formatShort(closesAt, timeZone)}`;
}

/** "Outcome expected May 24" — secondary line on the user-facing card. */
export function outcomeLabel(resolvesAt: Date, timeZone: string): string {
  return `Outcome expected ${formatShort(resolvesAt, timeZone)}`;
}

/** Admin-facing absolute label for the answer cutoff. */
export function adminClosesLabel(closesAt: Date, timeZone: string): string {
  return formatDateTime(closesAt, timeZone);
}

/** Admin-facing absolute label for the resolution deadline. */
export function adminNeedsResolvedLabel(
  resolvesAt: Date,
  timeZone: string,
): string {
  return formatDateTime(resolvesAt, timeZone);
}

function formatShort(d: Date, timeZone: string): string {
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone,
  });
}

function formatDateTime(d: Date, timeZone: string): string {
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });
}
