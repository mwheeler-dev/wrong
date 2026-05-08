import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { CATEGORIES } from "@/lib/scoring";

export async function POST(req: Request) {
  const { response } = await requireAdmin();
  if (response) return response;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const text = String(body.text ?? "").trim();
  const category = String(body.category ?? "");
  const resolutionCriteria = String(body.resolutionCriteria ?? "").trim();
  const sourceUrl = body.sourceUrl ? String(body.sourceUrl).trim() : null;
  const publishDate = body.publishDate ? new Date(body.publishDate) : null;
  const resolutionDate = body.resolutionDate ? new Date(body.resolutionDate) : null;

  if (!text) return NextResponse.json({ error: "Question text is required" }, { status: 400 });
  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  if (!resolutionCriteria) {
    return NextResponse.json({ error: "Resolution criteria is required" }, { status: 400 });
  }
  if (!publishDate || isNaN(publishDate.getTime())) {
    return NextResponse.json({ error: "publishDate is required" }, { status: 400 });
  }
  if (!resolutionDate || isNaN(resolutionDate.getTime())) {
    return NextResponse.json({ error: "resolutionDate is required" }, { status: 400 });
  }
  if (resolutionDate <= publishDate) {
    return NextResponse.json({ error: "resolutionDate must be after publishDate" }, { status: 400 });
  }

  const question = await prisma.question.create({
    data: {
      text,
      category,
      resolutionCriteria,
      sourceUrl,
      publishDate,
      resolutionDate,
      status: "PENDING",
    },
  });

  return NextResponse.json({ question });
}
