import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getUserTimezone } from "@/lib/session";
import { PlayClient } from "@/components/PlayClient";
import { PlayEmptyState } from "@/components/PlayEmptyState";
import {
  DAILY_CAP,
  countTodaysPredictions,
  nextMidnight,
} from "@/lib/daily";
import { computeStreak } from "@/lib/streaks";
import {
  closesLabel,
  effectiveClosesAt,
  outcomeLabel,
} from "@/lib/timing";

export const dynamic = "force-dynamic";

export default async function PlayPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const userId = user.id;
  const timeZone = getUserTimezone(user);

  const now = new Date();
  const tomorrowMidnight = nextMidnight(timeZone, now);

  // SOLE source of truth for the daily cap.
  const [todayCount, predictionCreatedAts] = await Promise.all([
    countTodaysPredictions(userId, timeZone, now),
    prisma.prediction.findMany({
      where: { userId },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Streak is computed for COPY ONLY. It is never used to gate play.
  const streak = computeStreak(
    predictionCreatedAts.map((p) => p.createdAt),
    timeZone,
    now,
  );

  const remainingToday = Math.max(0, DAILY_CAP - todayCount);

  // CAP-REACHED — driven solely by `todayCount >= DAILY_CAP`. No streak
  // status, no client cache, no done-screen state participates in this check.
  if (remainingToday === 0) {
    return (
      <PlayEmptyState
        variant="cap-reached"
        todayCount={todayCount}
        streak={streak.streak}
        streakState={streak.state}
        nextMidnightIso={tomorrowMidnight.toISOString()}
      />
    );
  }

  // ELIGIBILITY — strict server-side filter.
  //   status   = PENDING
  //   publish  <= now
  //   close    > now  (with legacy fallback to resolutionDate when null)
  //   user has not already predicted this question
  //
  // Use explicit AND + equals:null inside the OR so the clause is robust
  // against Prisma shorthand differences. Same SQL, fewer footguns.
  const batch = await prisma.question.findMany({
    where: {
      publishDate: { lte: now },
      status: "PENDING",
      predictions: { none: { userId } },
      OR: [
        { closesToPredictionsAt: { gt: now } },
        {
          AND: [
            { closesToPredictionsAt: { equals: null } },
            { resolutionDate: { gt: now } },
          ],
        },
      ],
    },
    orderBy: [{ publishDate: "desc" }, { createdAt: "desc" }],
    take: remainingToday,
    select: {
      id: true,
      text: true,
      category: true,
      resolutionDate: true,
      closesToPredictionsAt: true,
      sourceUrl: true,
    },
  });

  // POOL-EMPTY — no eligible questions for this user right now, but the
  // user is still within their daily cap. Copy acknowledges they CAN play
  // when reality publishes more; we never tell them "come back tomorrow"
  // here because their day has already started.
  if (batch.length === 0) {
    return (
      <PlayEmptyState
        variant="pool-empty"
        todayCount={todayCount}
        streak={streak.streak}
        streakState={streak.state}
        nextMidnightIso={tomorrowMidnight.toISOString()}
      />
    );
  }

  const questions = batch.map((q) => {
    const closesAt = effectiveClosesAt(q);
    const closesEqualsResolves =
      q.closesToPredictionsAt == null ||
      closesAt.getTime() === q.resolutionDate.getTime();
    return {
      id: q.id,
      text: q.text,
      category: q.category,
      sourceUrl: q.sourceUrl,
      closesLabel: closesLabel(closesAt, timeZone, now),
      outcomeLabel: closesEqualsResolves
        ? null
        : outcomeLabel(q.resolutionDate, timeZone),
    };
  });

  // NORMAL ROUND — eligible questions exist and the daily cap isn't reached.
  return (
    <PlayClient
      questions={questions}
      initialAnsweredIds={[]}
      todayProgress={todayCount}
      dailyCap={DAILY_CAP}
      nextMidnightIso={tomorrowMidnight.toISOString()}
    />
  );
}
