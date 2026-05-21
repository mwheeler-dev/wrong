import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { CATEGORIES } from "@/lib/scoring";

// Duplicate any existing question into a brand-new PENDING question.
//
// This is the canonical "reuse a card" operation. The new row has its own
// id, fresh dates, no predictions, and no score — totally independent of
// the source. The source row (whatever status it's in) is never touched.
// Users who already predicted on the source can answer the duplicate
// because the unique constraint is (userId, questionId), keyed on id.
//
// Works on ANY source status — Overdue, Live, Scheduled, Resolved. We do
// NOT flip the source to PENDING, copy predictions, or rescore. Editing
// dates on the source is a separate operation (PATCH on /questions/[id]);
// that's the right tool when you want to keep the same question id and
// keep existing predictions intact.
export async function POST(req: Request, ctx: { params: { id: string } }) {
  const { response } = await requireAdmin();
  if (response) return response;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const source = await prisma.question.findUnique({
    where: { id: ctx.params.id },
    select: {
      text: true,
      category: true,
      resolutionCriteria: true,
      sourceUrl: true,
      status: true,
    },
  });
  if (!source) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  // Allow the admin to override copied fields, but default to the source row
  // so a one-click redeploy with only new dates still works.
  const text = typeof body.text === "string" && body.text.trim()
    ? body.text.trim()
    : source.text;
  const category =
    typeof body.category === "string" &&
    (CATEGORIES as readonly string[]).includes(body.category)
      ? body.category
      : source.category;
  const resolutionCriteria =
    typeof body.resolutionCriteria === "string" && body.resolutionCriteria.trim()
      ? body.resolutionCriteria.trim()
      : source.resolutionCriteria;
  const sourceUrl =
    "sourceUrl" in body
      ? body.sourceUrl
        ? String(body.sourceUrl).trim()
        : null
      : source.sourceUrl;

  // Dates: required from the caller. We don't reuse the source row's
  // resolved-in-the-past dates by accident.
  const publishDate = body.publishDate ? new Date(body.publishDate) : null;
  const resolutionDate = body.resolutionDate ? new Date(body.resolutionDate) : null;
  if (!publishDate || isNaN(publishDate.getTime())) {
    return NextResponse.json({ error: "publishDate is required" }, { status: 400 });
  }
  if (!resolutionDate || isNaN(resolutionDate.getTime())) {
    return NextResponse.json({ error: "resolutionDate is required" }, { status: 400 });
  }
  if (resolutionDate <= publishDate) {
    return NextResponse.json(
      { error: "resolutionDate must be after publishDate" },
      { status: 400 },
    );
  }

  let closesToPredictionsAt: Date | null = null;
  if ("closesToPredictionsAt" in body && body.closesToPredictionsAt) {
    const d = new Date(body.closesToPredictionsAt);
    if (isNaN(d.getTime())) {
      return NextResponse.json(
        { error: "Invalid closesToPredictionsAt" },
        { status: 400 },
      );
    }
    if (d <= publishDate) {
      return NextResponse.json(
        { error: "closesToPredictionsAt must be after publishDate" },
        { status: 400 },
      );
    }
    if (d > resolutionDate) {
      return NextResponse.json(
        { error: "closesToPredictionsAt cannot be after resolutionDate" },
        { status: 400 },
      );
    }
    closesToPredictionsAt = d;
  }

  const created = await prisma.question.create({
    data: {
      text,
      category,
      resolutionCriteria,
      sourceUrl,
      status: "PENDING",
      correctAnswer: null,
      publishDate,
      resolutionDate,
      closesToPredictionsAt,
    },
    select: { id: true },
  });

  revalidatePath("/admin");
  revalidatePath("/play");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/resolved");

  return NextResponse.json({ ok: true, id: created.id });
}
