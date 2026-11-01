import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { normalizeUsername, isValidUsername, USERNAME_HELP, USERNAME_CHANGE_COOLDOWN_MS, usernameChangeAvailableAt } from "@/lib/usernames";

function cooldown(changedAt: Date, now: Date) {
  const nextChangeAt = usernameChangeAvailableAt(changedAt)!;
  return NextResponse.json({
    error: "You can change your username once every 72 hours. Please wait until the next available change time.",
    nextChangeAt: nextChangeAt.toISOString(),
  }, { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((nextChangeAt.getTime() - now.getTime()) / 1000))) } });
}

export async function PUT(req: Request) {
  // Railway terminates HTTPS upstream; req.url may contain an internal origin.
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host;
  let originMatches = !origin;
  try { if (origin) originMatches = new URL(origin).host === host; } catch { /* reject malformed origins */ }
  if (!originMatches) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const id = await getCurrentUserId();
  if (!id) return NextResponse.json({ error: "Sign in to choose a username." }, { status: 401 });
  const body = await req.json().catch(() => null);
  const username = normalizeUsername(body?.username);
  if (!isValidUsername(username)) return NextResponse.json({ error: USERNAME_HELP }, { status: 400 });
  const current = await prisma.user.findUnique({ where: { id }, select: { username: true, usernameChangedAt: true } });
  if (!current) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  const now = new Date();
  // Saving the same handle is a no-op and never restarts the clock.
  if (current.username === username) return NextResponse.json({ username, nextChangeAt: usernameChangeAvailableAt(current.usernameChangedAt)?.toISOString() ?? null });
  const availableAt = usernameChangeAvailableAt(current.usernameChangedAt);
  if (current.username && availableAt && availableAt > now) return cooldown(current.usernameChangedAt!, now);
  try {
    // One conditional statement enforces the cooldown even for simultaneous requests.
    const result = await prisma.user.updateMany({
      where: { id, username: current.username, OR: [
        { username: null }, { usernameChangedAt: null },
        { usernameChangedAt: { lte: new Date(now.getTime() - USERNAME_CHANGE_COOLDOWN_MS) } },
      ] },
      data: { username, usernameChangedAt: now },
    });
    if (!result.count) {
      const latest = await prisma.user.findUnique({ where: { id }, select: { usernameChangedAt: true } });
      if (!latest) return NextResponse.json({ error: "Account not found." }, { status: 404 });
      return cooldown(latest.usernameChangedAt ?? now, now);
    }
    return NextResponse.json({ username, nextChangeAt: usernameChangeAvailableAt(now)!.toISOString() });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "That username is taken. Try another." }, { status: 409 });
    }
    throw error;
  }
}
