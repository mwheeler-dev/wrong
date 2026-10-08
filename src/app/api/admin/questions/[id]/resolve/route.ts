import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { type Answer } from "@/lib/scoring";

// Mark a question as RESOLVED and score every existing prediction on it.
//
// Implementation note (the historical bug): we used to fan out a
// per-confidence-level updateMany pair, which silently SKIPS any prediction
// whose confidence value isn't in the canonical [60,70,80,90] set. Two
// failure modes that produced "stuck on Pending":
//   * legacy/seed rows with off-canonical confidence values
//   * partial backfills on retries
//
// We now use raw SQL with `score = confidence` (or `-confidence`), which
// pulls each row's actual confidence value and works regardless of the set
// it came from. The IS NULL guard makes the operation idempotent: rerunning
// resolve never double-counts an already-scored prediction. Wrapping
// transaction keeps Question.status and Prediction.score consistent on
// failure.
export async function POST(req: Request, ctx: { params: { id: string } }) {
  const { response } = await requireAdmin();
  if (response) return response;

  const body = await req.json().catch(() => null);
  const correctAnswer = String(body?.correctAnswer ?? "") as Answer;
  if (correctAnswer !== "YES" && correctAnswer !== "NO") {
    return NextResponse.json(
      { error: "correctAnswer must be YES or NO" },
      { status: 400 },
    );
  }

  const { id } = ctx.params;
  const question = await prisma.question.findUnique({
    where: { id },
    select: { id: true, updatedAt: true, status: true },
  });
  if (!question)
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  // AI recommendations carry the version researched. Manual resolution is
  // unchanged; stale recommendations require a fresh check before approval.
  if (
    body?.expectedUpdatedAt !== undefined &&
    (body.expectedUpdatedAt !== question.updatedAt.toISOString() ||
      question.status !== "PENDING")
  ) {
    return NextResponse.json(
      {
        error:
          "This question changed since the AI check. Check it again before approving.",
      },
      { status: 409 },
    );
  }

  const wrongAnswer: Answer = correctAnswer === "YES" ? "NO" : "YES";

  await prisma.$transaction([
    prisma.question.update({
      where: { id },
      data: { status: "RESOLVED", correctAnswer },
    }),
    // Correct predictions: +confidence. IS NULL gate = idempotent retry.
    prisma.$executeRaw(
      Prisma.sql`UPDATE "Prediction" SET "score" = "confidence", "resolvedAt" = NOW() WHERE "questionId" = ${id} AND "answer" = ${correctAnswer} AND "score" IS NULL`,
    ),
    // Wrong predictions: -confidence.
    prisma.$executeRaw(
      Prisma.sql`UPDATE "Prediction" SET "score" = -"confidence", "resolvedAt" = NOW() WHERE "questionId" = ${id} AND "answer" = ${wrongAnswer} AND "score" IS NULL`,
    ),
  ]);

  // Invalidate the pages that read prediction state so the user sees the
  // newly-scored row without a manual reload. Previously this was missing
  // and contributed to the "stuck Pending" appearance even after the
  // resolve transaction succeeded.
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  revalidatePath("/play");
  revalidatePath("/dashboard/resolved");

  return NextResponse.json({ ok: true });
}

// Undo resolution: clear scores back to null.
export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id } = ctx.params;

  await prisma.$transaction([
    prisma.question.update({
      where: { id },
      data: { status: "PENDING", correctAnswer: null },
    }),
    prisma.prediction.updateMany({
      where: { questionId: id },
      data: { score: null, resolvedAt: null },
    }),
  ]);

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  revalidatePath("/play");
  revalidatePath("/dashboard/resolved");

  return NextResponse.json({ ok: true });
}
