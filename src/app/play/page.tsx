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

export const dynamic = "force-dynamic";

export default async function PlayPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const userId = user.id;
  const timeZone = getUserTimezone(user);

  const now = new Date();
  const tomorrowMidnight = nextMidnight(timeZone, now);

  // Count today's predictions through the SAME helper the predict route uses,
  // so /play, the predict-response, and /dashboard can never disagree.
  // Streak input is the full createdAt history, grouped per-user-local-day
  // by computeStreak.
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

  // CASE 1 — daily cap reached in this user's local day.
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

  // CASE 2 — fetch up to `remainingToday` unanswered PENDING questions.
  // NOTE: no `resolutionDate > now` filter. PENDING is the source of truth
  // for "still answerable"; resolutionDate is a target, not a strict cutoff.
  const batch = await prisma.question.findMany({
    where: {
      publishDate: { lte: now },
      status: "PENDING",
      predictions: { none: { userId } },
    },
    orderBy: [{ publishDate: "desc" }, { createdAt: "desc" }],
    take: remainingToday,
    select: {
      id: true,
      text: true,
      category: true,
      resolutionDate: true,
      sourceUrl: true,
    },
  });

  // CASE 3 — under the cap but pool is dry for this user.
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

  const questions = batch.map((q) => ({
    id: q.id,
    text: q.text,
    category: q.category,
    resolutionDate: q.resolutionDate.toISOString(),
    sourceUrl: q.sourceUrl,
  }));

  // CASE 4 — normal round.
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
