import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { createSession } from "@/lib/session";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: "Wrong email or password" }, { status: 401 });

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "Wrong email or password" }, { status: 401 });

  await createSession(user.id);
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
}
