import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publicUsername } from "@/lib/usernames";
import { computeStreak } from "@/lib/streaks";
import { resolveTimezone } from "@/lib/timezone";
import { longestCompleteStreak, streakBadges, qualifiesAsCategoryLeader } from "@/lib/player-badges";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { userId: string } }) {
  const user = await prisma.user.findUnique({
    where: { id: params.userId }, select: { id: true, username: true, timezone: true },
  });
  if (!user) return NextResponse.json({ error: "Player not found." }, { status: 404 });
  const predictions = await prisma.prediction.findMany({
    where: { userId: user.id },
    select: { createdAt: true, score: true, confidence: true, question: { select: { category: true } } },
  });
  const timeZone = resolveTimezone(user.timezone);
  const dates = predictions.map((p) => p.createdAt);
  const longestStreak = longestCompleteStreak(dates, timeZone);
  const badges = streakBadges(longestStreak);
  const resolved = predictions.filter((p) => p.score !== null);
  const categories = new Map<string, { score: number; total: number }>();
  for (const p of resolved) {
    const value = categories.get(p.question.category) ?? { score: 0, total: 0 };
    value.score += p.score!;
    value.total++;
    categories.set(p.question.category, value);
  }
  // Only query competition for categories this player can actually qualify in.
  const categoryBadges = await Promise.all([...categories].filter(([, v]) => v.total >= 10 && v.score > 0).map(async ([category, value]) => {
    const competitors = await prisma.prediction.groupBy({
      by: ["userId"], where: { score: { not: null }, question: { category } },
      _sum: { score: true }, _count: { _all: true },
    });
    const leaders = competitors.map((r) => ({ score: r._sum.score ?? 0, total: r._count._all }));
    return qualifiesAsCategoryLeader(value.score, value.total, leaders) ? {
      id: `leader-${category}`, icon: "🏆", title: `${category} leader`,
      description: `Highest all-time Edge in ${category} among players with at least 10 resolved predictions. Ties count.`,
    } : null;
  }));
  badges.push(...categoryBadges.filter((b): b is NonNullable<typeof b> => b !== null));
  return NextResponse.json({
    username: publicUsername(user),
    score: resolved.reduce((sum, p) => sum + p.score!, 0),
    accuracy: resolved.length ? Math.round(resolved.filter((p) => p.score! > 0).length / resolved.length * 100) : null,
    averageConfidence: resolved.length ? Math.round(resolved.reduce((sum, p) => sum + p.confidence, 0) / resolved.length) : null,
    predictions: resolved.length,
    currentStreak: computeStreak(dates, timeZone).streak,
    longestStreak, badges,
  }, { headers: { "Cache-Control": "no-store" } });
}
