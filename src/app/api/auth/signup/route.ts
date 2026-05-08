import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, isValidEmail } from "@/lib/auth";
import { createSession } from "@/lib/session";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!isValidEmail(email)) return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { name, email, passwordHash },
    select: { id: true, name: true, email: true },
  });

  await createSession(user.id);
  return NextResponse.json({ user });
}
