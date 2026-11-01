import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { normalizeUsername, isValidUsername, USERNAME_HELP } from "@/lib/usernames";

export async function PUT(req: Request) {
  // Railway terminates HTTPS upstream; req.url may contain an internal origin.
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host;
  let originMatches = !origin;
  try { if (origin) originMatches = new URL(origin).host === host; } catch { /* reject malformed origins */ }
  if (!originMatches) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
  const id = await getCurrentUserId();
  if (!id) return NextResponse.json({ error: "Sign in to choose a username." }, { status: 401 });
  const body = await req.json().catch(() => null);
  const username = normalizeUsername(body?.username);
  if (!isValidUsername(username)) return NextResponse.json({ error: USERNAME_HELP }, { status: 400 });
  try {
    await prisma.user.update({ where: { id }, data: { username } });
    return NextResponse.json({ username });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "That username is taken. Try another." }, { status: 409 });
    }
    throw error;
  }
}
