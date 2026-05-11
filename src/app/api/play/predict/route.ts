import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { CONFIDENCE_LEVELS, scoreFor, type Answer, type Confidence } from "@/lib/scoring";
import { resultFeedback } from "@/lib/feedback";
import { checkRoundDeadline, verifyRoundToken } from "@/lib/round";

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const questionId = String(body.questionId ?? "");
  const answer = String(body.answer ?? "") as Answer;
  const confidence = Number(body.confidence) as Confidence;
  const roundToken = typeof body.roundToken === "string" ? body.roundToken : "";

  if (!questionId) return NextResponse.json({ error: "Missing questionId" }, { status: 400 });
  if (answer !== "YES" && answer !== "NO") {
    return NextResponse.json({ error: "Answer must be YES or NO" }, { status: 400 });
  }
  if (!CONFIDENCE_LEVELS.includes(confidence as Confidence)) {
    return NextResponse.json({ error: "Invalid confidence" }, { status: 400 });
  }

  // Server-side timer enforcement
  if (!roundToken) {
    return NextResponse.json({ error: "Missing round token" }, { status: 400 });
  }
  const claims = await verifyRoundToken(roundToken);
  if (!claims || claims.uid !== userId) {
    return NextResponse.json({ error: "Invalid round token" }, { status: 401 });
  }
  const deadlineCheck = checkRoundDeadline({
    claims,
    questionId,
    now: Date.now(),
  });
  if (!deadlineCheck.ok) {
    return NextResponse.json({ error: deadlineCheck.reason }, { status: 408 });
  }

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: {
      id: true,
      status: true,
      correctAnswer: true,
      resolutionDate: true,
      publishDate: true,
    },
  });
  if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });

  const existing = await prisma.prediction.findUnique({
    where: { userId_questionId: { userId, questionId } },
  });
  if (existing) {
    return NextResponse.json({ error: "Already answered" }, { status: 409 });
  }

  const correct = question.correctAnswer === "YES" || question.correctAnswer === "NO"
    ? (question.correctAnswer as Answer)
    : null;
  const score = scoreFor(answer, correct, confidence);
  const resolvedAt = correct != null ? new Date() : null;

  const prediction = await prisma.prediction.create({
    data: {
      userId,
      questionId,
      answer,
      confidence,
      score,
      resolvedAt,
    },
    select: {
      id: true,
      answer: true,
      confidence: true,
      score: true,
    },
  });

  // Crowd stats — only computed after the user has answered
  const all = await prisma.prediction.findMany({
    where: { questionId },
    select: { answer: true, confidence: true },
  });
  const total = all.length;
  const yesCount = all.filter((p) => p.answer === "YES").length;
  const noCount = total - yesCount;
  const yesPct = total === 0 ? 0 : Math.round((yesCount / total) * 100);
  const noPct = total === 0 ? 0 : 100 - yesPct;
  const avgConfidence = total === 0
    ? 0
    : Math.round(all.reduce((sum, p) => sum + p.confidence, 0) / total);

  const isCorrect = correct != null && answer === correct;
  const feedback = resultFeedback({ correct: isCorrect, confidence });

  // Invalidate the Router Cache for /play so that any future navigation
  // back to the round (e.g., user clicks "You" then "Play" mid-round) reads a
  // fresh server-rendered batch with this prediction reflected in the
  // answered-IDs set, instead of serving a stale RSC payload.
  revalidatePath("/play");

  return NextResponse.json({
    prediction: {
      answer: prediction.answer as Answer,
      confidence: prediction.confidence,
      score: prediction.score,
    },
    question: {
      correctAnswer: correct,
    },
    crowd: {
      yesPct,
      noPct,
      averageConfidence: avgConfidence,
      totalPredictions: total,
    },
    feedback,
  });
}
