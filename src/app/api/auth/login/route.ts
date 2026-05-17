import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { createSession } from "@/lib/session";
import { isValidTimezone } from "@/lib/timezone";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const rawTimezone = typeof body.timezone === "string" ? body.timezone.trim() : "";
  const timezone = isValidTimezone(rawTimezone) ? rawTimezone : null;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: "Wrong email or password" }, { status: 401 });

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "Wrong email or password" }, { status: 401 });

  // Opportunistically update the stored timezone whenever the client supplies
  // one. Cheap, keeps users who roam between zones aligned without forcing
  // them to use a settings screen.
  if (timezone && timezone !== user.timezone) {
    await prisma.user.update({
      where: { id: user.id },
      data: { timezone },
    });
  }

  await createSession(user.id);
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
}
