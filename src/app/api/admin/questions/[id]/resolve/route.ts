import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { scoreFor, type Answer } from "@/lib/scoring";

// Mark a question as RESOLVED with a correct answer, then score all predictions.
export async function POST(req: Request, ctx: { params: { id: string } }) {
  const { response } = await requireAdmin();
  if (response) return response;

  const body = await req.json().catch(() => null);
  const correctAnswer = String(body?.correctAnswer ?? "") as Answer;
  if (correctAnswer !== "YES" && correctAnswer !== "NO") {
    return NextResponse.json({ error: "correctAnswer must be YES or NO" }, { status: 400 });
  }

  const { id } = ctx.params;
  const question = await prisma.question.findUnique({ where: { id } });
  if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.question.update({
      where: { id },
      data: {
        status: "RESOLVED",
        correctAnswer,
      },
    });

    const predictions = await tx.prediction.findMany({
      where: { questionId: id },
      select: { id: true, answer: true, confidence: true },
    });

    for (const p of predictions) {
      const score = scoreFor(p.answer as Answer, correctAnswer, p.confidence);
      await tx.prediction.update({
        where: { id: p.id },
        data: {
          score,
          resolvedAt: now,
        },
      });
    }
  });

  return NextResponse.json({ ok: true });
}

// Undo resolution
export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id } = ctx.params;

  await prisma.$transaction(async (tx) => {
    await tx.question.update({
      where: { id },
      data: {
        status: "PENDING",
        correctAnswer: null,
      },
    });
    await tx.prediction.updateMany({
      where: { questionId: id },
      data: { score: null, resolvedAt: null },
    });
  });

  return NextResponse.json({ ok: true });
}
