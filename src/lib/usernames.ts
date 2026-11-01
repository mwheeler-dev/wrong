export const USERNAME_HELP = "Use 8–24 letters, numbers, or underscores.";

export function normalizeUsername(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isValidUsername(value: string): boolean {
  return /^[a-z0-9_]{8,24}$/.test(value);
}

/** An opaque, collision-free fallback; never derive a public handle from a name or email. */
export function publicUsername(user: { id: string; username: string | null }): string {
  return user.username ?? `player_${user.id}`;
}

export const USERNAME_CHANGE_HOURS = 72;
export const USERNAME_CHANGE_COOLDOWN_MS = USERNAME_CHANGE_HOURS * 60 * 60 * 1000;

export function usernameChangeAvailableAt(changedAt: Date | null): Date | null {
  return changedAt ? new Date(changedAt.getTime() + USERNAME_CHANGE_COOLDOWN_MS) : null;
}
