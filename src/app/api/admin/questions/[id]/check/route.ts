import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { getUserTimezone } from "@/lib/session";
import { hasSameOrigin } from "@/lib/requestOrigin";
import { GenerationError } from "@/lib/questionGeneration";
import { checkQuestion } from "@/lib/questionVerification";

export const runtime = "nodejs";
export const maxDuration = 200;
// Bound paid calls on the existing single-replica service. Bulk review sends
// two independent requests at a time, so each failure is isolated.
const running = new Set<string>();

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const { user, response } = await requireAdmin();
  if (response) return response;
  if (!hasSameOrigin(req))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = ctx.params;
  if (running.has(id) || running.size >= 4)
    return NextResponse.json(
      { error: "An AI check is already running. Try again shortly." },
      { status: 429 },
    );
  running.add(id);
  try {
    const question = await prisma.question.findUnique({ where: { id } });
    if (!question)
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 },
      );
    if (question.status !== "PENDING")
      return NextResponse.json(
        { error: "This question is already resolved." },
        { status: 409 },
      );
    const result = await checkQuestion(
      {
        text: question.text,
        resolutionCriteria: question.resolutionCriteria,
        sourceUrl: question.sourceUrl,
        publishDate: question.publishDate,
        closesToPredictionsAt: question.closesToPredictionsAt,
        resolutionDate: question.resolutionDate,
      },
      getUserTimezone(user),
    );
    const latest = await prisma.question.findUnique({
      where: { id },
      select: { status: true, updatedAt: true },
    });
    if (
      !latest ||
      latest.status !== "PENDING" ||
      latest.updatedAt.getTime() !== question.updatedAt.getTime()
    )
      return NextResponse.json(
        { error: "The question changed during this check. Check it again." },
        { status: 409 },
      );
    return NextResponse.json(
      {
        result: {
          ...result,
          questionVersion: question.updatedAt.toISOString(),
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof GenerationError
            ? error.message
            : "Could not check this question. It was skipped.",
      },
      { status: error instanceof GenerationError ? error.status : 502 },
    );
  } finally {
    running.delete(id);
  }
}
