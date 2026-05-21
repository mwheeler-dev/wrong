import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { CATEGORIES } from "@/lib/scoring";

// Duplicate a RESOLVED question into a brand-new PENDING question.
//
// IMPORTANT: this is intentionally NOT "reopen the original". The original
// question's resolved predictions are scored, calibration-counted, and live
// in users' history. Flipping its status back to PENDING would corrupt that
// data. Instead we COPY the question text/category/source/criteria into a
// fresh row with a new id and let the new round of predictions live there.
//
// Behaviour:
//   * Source question must exist and be RESOLVED (we won't redeploy a
//     PENDING one — use plain Edit to push dates forward instead).
//   * Caller supplies the new publish/close/resolution dates. Everything
//     else defaults to a copy of the source.
//   * New question has its own id, status='PENDING', correctAnswer=null,
//     and NO predictions. The source row is untouched.
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
  if (source.status !== "RESOLVED") {
    return NextResponse.json(
      { error: "Only RESOLVED questions can be redeployed. Use Edit for pending rows." },
      { status: 400 },
    );
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
