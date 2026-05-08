import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { CATEGORIES } from "@/lib/scoring";

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id } = ctx.params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (typeof body.text === "string") data.text = body.text.trim();
  if (typeof body.category === "string") {
    if (!CATEGORIES.includes(body.category as (typeof CATEGORIES)[number])) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    data.category = body.category;
  }
  if (typeof body.resolutionCriteria === "string") data.resolutionCriteria = body.resolutionCriteria.trim();
  if ("sourceUrl" in body) {
    data.sourceUrl = body.sourceUrl ? String(body.sourceUrl).trim() : null;
  }
  if (body.publishDate) {
    const d = new Date(body.publishDate);
    if (isNaN(d.getTime())) return NextResponse.json({ error: "Invalid publishDate" }, { status: 400 });
    data.publishDate = d;
  }
  if (body.resolutionDate) {
    const d = new Date(body.resolutionDate);
    if (isNaN(d.getTime())) return NextResponse.json({ error: "Invalid resolutionDate" }, { status: 400 });
    data.resolutionDate = d;
  }

  const updated = await prisma.question.update({ where: { id }, data });
  return NextResponse.json({ question: updated });
}

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const { response } = await requireAdmin();
  if (response) return response;
  await prisma.question.delete({ where: { id: ctx.params.id } });
  return NextResponse.json({ ok: true });
}
