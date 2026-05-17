import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { isValidTimezone } from "@/lib/timezone";

/**
 * Sync the signed-in user's IANA timezone with what the browser detected.
 * Called by <TimezoneSync> on every page load — no-op when the values match,
 * single UPDATE otherwise.
 */
export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const raw = typeof body?.timezone === "string" ? body.timezone.trim() : "";

  if (!isValidTimezone(raw)) {
    return NextResponse.json({ error: "Invalid IANA timezone" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.timezone === raw) {
    return NextResponse.json({ timezone: raw, changed: false });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { timezone: raw },
  });

  return NextResponse.json({ timezone: raw, changed: true });
}
