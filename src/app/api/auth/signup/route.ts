import { Prisma } from "@prisma/client";
import { normalizeUsername, isValidUsername, USERNAME_HELP } from "@/lib/usernames";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, isValidEmail } from "@/lib/auth";
import { createSession } from "@/lib/session";
import { isValidTimezone } from "@/lib/timezone";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const username = normalizeUsername(body.username);
  if (!isValidUsername(username)) return NextResponse.json({ error: USERNAME_HELP }, { status: 400 });

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const rawTimezone = typeof body.timezone === "string" ? body.timezone.trim() : "";
  const timezone = isValidTimezone(rawTimezone) ? rawTimezone : null;

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!isValidEmail(email)) return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

  const passwordHash = await hashPassword(password);
  let user;
  try {
    user = await prisma.user.create({
      data: { name, username, usernameChangedAt: new Date(), email, passwordHash, timezone },
      select: { id: true, name: true, username: true, email: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const field = Array.isArray(error.meta?.target) && error.meta.target.includes("username") ? "Username" : "Email";
      return NextResponse.json({ error: `${field} already in use. Please choose another.` }, { status: 409 });
    }
    throw error;
  }

  await createSession(user.id);
  return NextResponse.json({ user });
}
