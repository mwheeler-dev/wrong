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
  // closesToPredictionsAt may be explicitly null (to revert to legacy
  // fallback behavior) or a datetime. Only touch the field if the caller
  // sent the key — `in` is the right check for "field present in payload".
  if ("closesToPredictionsAt" in body) {
    if (body.closesToPredictionsAt == null) {
      data.closesToPredictionsAt = null;
    } else {
      const d = new Date(body.closesToPredictionsAt);
      if (isNaN(d.getTime())) {
        return NextResponse.json(
          { error: "Invalid closesToPredictionsAt" },
          { status: 400 },
        );
      }
      data.closesToPredictionsAt = d;
    }
  }

  // Cross-field validation against the merged record (incoming patch +
  // existing row) — catches "closes after resolve" without requiring the
  // caller to send every field.
  if (
    "closesToPredictionsAt" in data ||
    "publishDate" in data ||
    "resolutionDate" in data
  ) {
    const current = await prisma.question.findUnique({
      where: { id },
      select: {
        publishDate: true,
        resolutionDate: true,
        closesToPredictionsAt: true,
      },
    });
    if (!current) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }
    const merged = {
      publishDate: (data.publishDate as Date | undefined) ?? current.publishDate,
      resolutionDate:
        (data.resolutionDate as Date | undefined) ?? current.resolutionDate,
      closesToPredictionsAt:
        "closesToPredictionsAt" in data
          ? (data.closesToPredictionsAt as Date | null)
          : current.closesToPredictionsAt,
    };
    if (merged.resolutionDate <= merged.publishDate) {
      return NextResponse.json(
        { error: "resolutionDate must be after publishDate" },
        { status: 400 },
      );
    }
    if (merged.closesToPredictionsAt) {
      if (merged.closesToPredictionsAt <= merged.publishDate) {
        return NextResponse.json(
          { error: "closesToPredictionsAt must be after publishDate" },
          { status: 400 },
        );
      }
      if (merged.closesToPredictionsAt > merged.resolutionDate) {
        return NextResponse.json(
          { error: "closesToPredictionsAt cannot be after resolutionDate" },
          { status: 400 },
        );
      }
    }
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
