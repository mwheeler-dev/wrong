import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

// Publish today's batch: take up to 10 SCHEDULED questions (publishDate in the future)
// and re-stamp their publishDate to "now" so they appear in /play.
// Safe to call repeatedly — it just promotes the next 10 in the queue.
export async function POST(req: Request) {
  const { response } = await requireAdmin();
  if (response) return response;

  const url = new URL(req.url);
  const sizeParam = Number(url.searchParams.get("size") ?? "10");
  const size = Number.isFinite(sizeParam) && sizeParam > 0 && sizeParam <= 50 ? sizeParam : 10;

  const now = new Date();
  const scheduled = await prisma.question.findMany({
    where: { status: "PENDING", publishDate: { gt: now } },
    orderBy: { publishDate: "asc" },
    take: size,
    select: { id: true },
  });

  if (scheduled.length === 0) {
    return NextResponse.json({ published: 0 });
  }

  await prisma.question.updateMany({
    where: { id: { in: scheduled.map((q) => q.id) } },
    data: { publishDate: now },
  });

  return NextResponse.json({ published: scheduled.length });
}
