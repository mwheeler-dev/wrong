import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { CONFIDENCE_LEVELS, type Answer } from "@/lib/scoring";

// Mark a question as RESOLVED and score all predictions in a bounded number of queries.
export async function POST(req: Request, ctx: { params: { id: string } }) {
  const { response } = await requireAdmin();
  if (response) return response;

  const body = await req.json().catch(() => null);
  const correctAnswer = String(body?.correctAnswer ?? "") as Answer;
  if (correctAnswer !== "YES" && correctAnswer !== "NO") {
    return NextResponse.json({ error: "correctAnswer must be YES or NO" }, { status: 400 });
  }

  const { id } = ctx.params;
  const question = await prisma.question.findUnique({ where: { id }, select: { id: true } });
  if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });

  const wrongAnswer: Answer = correctAnswer === "YES" ? "NO" : "YES";
  const now = new Date();

  // Batch the score updates: at most 2 × 4 = 8 queries regardless of how many predictions exist.
  await prisma.$transaction([
    prisma.question.update({
      where: { id },
      data: { status: "RESOLVED", correctAnswer },
    }),
    ...CONFIDENCE_LEVELS.flatMap((conf) => [
      prisma.prediction.updateMany({
        where: { questionId: id, answer: correctAnswer, confidence: conf },
        data: { score: conf, resolvedAt: now },
      }),
      prisma.prediction.updateMany({
        where: { questionId: id, answer: wrongAnswer, confidence: conf },
        data: { score: -conf, resolvedAt: now },
      }),
    ]),
  ]);

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

  return NextResponse.json({ ok: true });
}
