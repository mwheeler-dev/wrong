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

  const [todayCount, predictionCreatedAts] = await Promise.all([
    countTodaysPredictions(userId, timeZone, now),
    prisma.prediction.findMany({
      where: { userId },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const streak = computeStreak(
    predictionCreatedAts.map((p) => p.createdAt),
    timeZone,
    now,
  );

  const remainingToday = Math.max(0, DAILY_CAP - todayCount);

  if (remainingToday === 0) {
    return (
      <PlayEmptyState
        variant="cap-reached"
        todayCount={todayCount}
        streak={streak.streak}
        nextMidnightIso={tomorrowMidnight.toISOString()}
      />
    );
  }

  // Visibility cutoff is `closesToPredictionsAt`, NOT resolutionDate.
  // Legacy rows where closesToPredictionsAt is null fall back to
  // resolutionDate so existing live questions keep working without backfill.
  const batch = await prisma.question.findMany({
    where: {
      publishDate: { lte: now },
      status: "PENDING",
      predictions: { none: { userId } },
      OR: [
        { closesToPredictionsAt: { gt: now } },
        {
          closesToPredictionsAt: null,
          resolutionDate: { gt: now },
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

  if (batch.length === 0) {
    return (
      <PlayEmptyState
        variant="pool-empty"
        todayCount={todayCount}
        streak={streak.streak}
        nextMidnightIso={tomorrowMidnight.toISOString()}
      />
    );
  }

  // Server-render the timing strings using the user's timezone — server is
  // authoritative for "tonight" vs "tomorrow", so labels stay consistent for
  // anyone in the same zone. Slight drift while the page is open (e.g., "in
  // 6 hours" → "in 5 hours") is acceptable; navigating refreshes.
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
      // Only surface the secondary outcome line when the resolve window is
      // meaningfully later than the answer window. Otherwise we'd just be
      // saying the same date twice.
      outcomeLabel: closesEqualsResolves
        ? null
        : outcomeLabel(q.resolutionDate, timeZone),
    };
  });

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
