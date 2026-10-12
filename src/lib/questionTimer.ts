// Per-question timer state, persisted in sessionStorage so the 30-second
// countdown survives tab-switches, page refreshes, and any PlayClient
// remount. The previous Timer reset on every mount because it captured
// `start = Date.now()` inside its useEffect — that's the bug this module
// closes.
//
// Storage shape: a single deadline timestamp (UTC ms) per question id.
//   key   = "wrong:questionTimer:visible:<questionId>"
//   value = "<ms-since-epoch>"
//
// We deliberately store the DEADLINE rather than the start time. Reading
// remaining time is then `deadline - Date.now()` with no extra arithmetic,
// which matters when the tab returns from background after browsers have
// throttled setInterval to a crawl.

const PREFIX = "wrong:questionTimer:";
const VISIBLE_PREFIX = `${PREFIX}visible:`;

function isClient(): boolean {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

export function getStoredDeadline(questionId: string): number | null {
  if (!isClient()) return null;
  try {
    const raw = sessionStorage.getItem(VISIBLE_PREFIX + questionId);
    if (raw) {
      const deadline = Number(raw);
      return Number.isFinite(deadline) ? deadline : null;
    }
    // Old clients started timers for cards never shown in a background tab.
    // Preserve an active legacy deadline, but don't import expired deadlines
    // whose presentation history cannot be established. New-format expiry is
    // always retained, including on reload: this is a one-time cache repair.
    const legacy = sessionStorage.getItem(PREFIX + questionId);
    const deadline = legacy ? Number(legacy) : NaN;
    if (!Number.isFinite(deadline) || deadline <= Date.now()) return null;
    sessionStorage.setItem(VISIBLE_PREFIX + questionId, String(deadline));
    sessionStorage.removeItem(PREFIX + questionId);
    return deadline;
  } catch {
    return null;
  }
}

export function setStoredDeadline(questionId: string, deadline: number): void {
  if (!isClient()) return;
  try {
    sessionStorage.setItem(VISIBLE_PREFIX + questionId, String(deadline));
    sessionStorage.removeItem(PREFIX + questionId);
  } catch {
    // sessionStorage can throw in some private modes — caller treats as best-effort
  }
}

export function clearStoredDeadline(questionId: string): void {
  if (!isClient()) return;
  try {
    sessionStorage.removeItem(PREFIX + questionId);
    sessionStorage.removeItem(VISIBLE_PREFIX + questionId);
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
