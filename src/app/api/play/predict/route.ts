import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getUserTimezone } from "@/lib/session";
import { CONFIDENCE_LEVELS, scoreFor, type Answer, type Confidence } from "@/lib/scoring";
import { resultFeedback } from "@/lib/feedback";
import { checkRoundDeadline, verifyRoundToken } from "@/lib/round";
import { DAILY_CAP, countTodaysPredictions } from "@/lib/daily";

export async function POST(req: Request) {
  // We need the user's timezone (not just id) so the daily count we return
  // here is computed against THEIR local day — same window /play uses.
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const userId = user.id;
  const timeZone = getUserTimezone(user);

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const questionId = String(body.questionId ?? "");
  const answer = String(body.answer ?? "") as Answer;
  const confidence = Number(body.confidence) as Confidence;
  const roundToken = typeof body.roundToken === "string" ? body.roundToken : "";
  // Client-reported "when this question's 30s timer started". Used for the
  // per-question deadline check below; absent on legacy clients (the
  // round-token cumulative deadline is still in force as a backstop).
  const questionStartedAt =
    typeof body.questionStartedAt === "number" &&
    Number.isFinite(body.questionStartedAt) &&
    body.questionStartedAt > 0
      ? body.questionStartedAt
      : null;

  if (!questionId) return NextResponse.json({ error: "Missing questionId" }, { status: 400 });
  if (answer !== "YES" && answer !== "NO") {
    return NextResponse.json({ error: "Answer must be YES or NO" }, { status: 400 });
  }
  if (!CONFIDENCE_LEVELS.includes(confidence as Confidence)) {
    return NextResponse.json({ error: "Invalid confidence" }, { status: 400 });
  }

  // Round token signature (cheap, no DB)
  if (!roundToken) {
    return NextResponse.json({ error: "Missing round token" }, { status: 400 });
  }
  const claims = await verifyRoundToken(roundToken);
  if (!claims || claims.uid !== userId) {
    return NextResponse.json({ error: "Invalid round token" }, { status: 401 });
  }

  // Duplicate check first so a re-submit always gets 409 — even past the
  // round-token deadline. We include the current todayCount in the body so
  // the client can correct its local state without an extra round trip.
  const existing = await prisma.prediction.findUnique({
    where: { userId_questionId: { userId, questionId } },
    select: { id: true },
  });
  if (existing) {
    const todayCount = await countTodaysPredictions(userId, timeZone);
    return NextResponse.json(
      { error: "Already answered", todayCount, dailyCap: DAILY_CAP },
      { status: 409 },
    );
  }

  // Per-question 30s + grace check. Trust the client-reported start time
  // ONLY as an upper bound — a malicious client can always send a fresh
  // timestamp, but the round-token cumulative check below caps total time
  // since round mint regardless of what the client claims here.
  if (questionStartedAt != null) {
    const PER_QUESTION_BUDGET_MS = 30_000 + 5_000;
    if (Date.now() - questionStartedAt > PER_QUESTION_BUDGET_MS) {
      return NextResponse.json(
        { error: "Question timer expired" },
        { status: 408 },
      );
    }
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

  const correct = question.correctAnswer === "YES" || question.correctAnswer === "NO"
    ? (question.correctAnswer as Answer)
    : null;
  const score = scoreFor(answer, correct, confidence);
  const resolvedAt = correct != null ? new Date() : null;

  let prediction;
  try {
    prediction = await prisma.prediction.create({
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
  } catch (err: unknown) {
    const isUniqueError =
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "P2002";
    if (isUniqueError) {
      const todayCount = await countTodaysPredictions(userId, timeZone);
      return NextResponse.json(
        { error: "Already answered", todayCount, dailyCap: DAILY_CAP },
        { status: 409 },
      );
    }
    throw err;
  }

  // Crowd stats — only computed after the user has answered
  const all = await prisma.prediction.findMany({
    where: { questionId },
    select: { answer: true, confidence: true },
  });
  const total = all.length;
  const yesCount = all.filter((p) => p.answer === "YES").length;
  const yesPct = total === 0 ? 0 : Math.round((yesCount / total) * 100);
  const noPct = total === 0 ? 0 : 100 - yesPct;
  const avgConfidence = total === 0
    ? 0
    : Math.round(all.reduce((sum, p) => sum + p.confidence, 0) / total);

  const isCorrect = correct != null && answer === correct;
  const feedback = resultFeedback({ correct: isCorrect, confidence });

  // AUTHORITATIVE daily count — taken AFTER the create so it includes the
  // prediction we just inserted. The PlayClient treats this as the source of
  // truth and replaces its local count with it. No more "server + local"
  // double-counting.
  const todayCount = await countTodaysPredictions(userId, timeZone);

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
    todayCount,
    dailyCap: DAILY_CAP,
  });
}
