import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getUserTimezone } from "@/lib/session";
import { startOfToday } from "@/lib/dates";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const text = String(body?.text ?? "").trim();
  if (!text) return NextResponse.json({ error: "Empty reflection" }, { status: 400 });

  // Key the daily reflection by the user's local day so a Pittsburgh user
  // writing at 11pm and a London user writing at 4am next-day-UTC don't
  // collide or get misfiled.
  const date = startOfToday(getUserTimezone(user));
  const reflection = await prisma.dailyReflection.upsert({
    where: { userId_date: { userId: user.id, date } },
    create: { userId: user.id, date, text },
    update: { text },
  });

  return NextResponse.json({ reflection: { id: reflection.id } });
}
