// Per-question timer state, persisted in sessionStorage so the 30-second
// countdown survives tab-switches, page refreshes, and any PlayClient
// remount. The previous Timer reset on every mount because it captured
// `start = Date.now()` inside its useEffect — that's the bug this module
// closes.
//
// Storage shape: a single deadline timestamp (UTC ms) per question id.
//   key   = "wrong:questionTimer:<questionId>"
//   value = "<ms-since-epoch>"
//
// We deliberately store the DEADLINE rather than the start time. Reading
// remaining time is then `deadline - Date.now()` with no extra arithmetic,
// which matters when the tab returns from background after browsers have
// throttled setInterval to a crawl.

const PREFIX = "wrong:questionTimer:";

function isClient(): boolean {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

export function getStoredDeadline(questionId: string): number | null {
  if (!isClient()) return null;
  try {
    const raw = sessionStorage.getItem(PREFIX + questionId);
    if (!raw) return null;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function setStoredDeadline(questionId: string, deadline: number): void {
  if (!isClient()) return;
  try {
    sessionStorage.setItem(PREFIX + questionId, String(deadline));
  } catch {
    // sessionStorage can throw in some private modes — caller treats as best-effort
  }
}

export function clearStoredDeadline(questionId: string): void {
  if (!isClient()) return;
  try {
    sessionStorage.removeItem(PREFIX + questionId);
  } catch {}
}

/**
 * Return the existing deadline for this question, or create a fresh one
 * (`now + durationMs`) and persist it. Always returns both the deadline
 * and the implied startedAt — handy for callers that need to send
 * questionStartedAt to the server on submit.
 *
 * Once a deadline is stored, this function NEVER bumps it. That's the
 * core integrity property: switching tabs, refreshing, remounting — none
 * of these can reset the timer.
 */
export function ensureQuestionTimer(
  questionId: string,
  durationMs: number,
): { startedAt: number; deadline: number } {
  const existing = getStoredDeadline(questionId);
  if (existing != null) {
    return { startedAt: existing - durationMs, deadline: existing };
  }
  const startedAt = Date.now();
  const deadline = startedAt + durationMs;
  setStoredDeadline(questionId, deadline);
  return { startedAt, deadline };
}
