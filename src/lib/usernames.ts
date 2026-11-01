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
