import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { startOfToday } from "@/lib/dates";

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const text = String(body?.text ?? "").trim();
  if (!text) return NextResponse.json({ error: "Empty reflection" }, { status: 400 });

  const date = startOfToday();
  const reflection = await prisma.dailyReflection.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, text },
    update: { text },
  });

  return NextResponse.json({ reflection: { id: reflection.id } });
}
