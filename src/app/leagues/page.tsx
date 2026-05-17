import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { CategoryStats, type CategoryStat } from "@/components/CategoryStats";
import { CATEGORIES } from "@/lib/scoring";

export const dynamic = "force-dynamic";

/**
 * Reusable "Forecasting tournaments coming soon" banner.
 * Black breathing card — same prestige treatment as the dashboard streak
 * card and the /boards hero, so the three pages feel like one product.
 */
function TournamentsBanner() {
  return (
    <div className="streak-card border border-paper/10">
      <div className="relative p-6 sm:p-8">
        <p className="label text-accent">Coming soon</p>
        <h2 className="display mt-2 text-3xl sm:text-4xl">
          Forecasting tournaments are coming.
        </h2>
        <p className="mt-3 max-w-md text-sm text-paper/75">
          Soon, leagues won’t just track your category performance. They’ll
          host seasonal competitions, head-to-head matchups, and prediction
          tournaments. Rankings are only the beginning.
        </p>
      </div>
    </div>
  );
}

export default async function LeaguesPage() {
  const userId = await getCurrentUserId();

  if (!userId) {
    const emptyStats: CategoryStat[] = CATEGORIES.map((category) => ({
      category,
      totalScore: 0,
      accuracy: null,
      predictions: 0,
      averageConfidence: null,
    }));
    return (
      <div className="wrap-wide pt-6 pb-16">
        <h1 className="display text-4xl sm:text-5xl">Leagues.</h1>
        <p className="mt-1 text-muted">
          Where you’re sharp. Where you’re wrong.
        </p>

        <div className="mt-4">
          <TournamentsBanner />
        </div>

        <div className="card mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            Leagues track <strong className="text-ink">your</strong> performance
            by category. Sign up to start scoring.
          </p>
          <Link href="/signup" className="btn-primary">
            Sign up
          </Link>
        </div>

        <div className="mt-6 opacity-60">
          <CategoryStats stats={emptyStats} />
        </div>
      </div>
    );
  }

  const predictions = await prisma.prediction.findMany({
    where: { userId },
    select: {
      score: true,
      confidence: true,
      question: { select: { category: true } },
    },
  });

  const stats: CategoryStat[] = CATEGORIES.map((category) => {
    const inCat = predictions.filter((p) => p.question.category === category);
    const resolved = inCat.filter((p) => p.score != null);
    const correct = resolved.filter((p) => (p.score ?? 0) > 0).length;
    const score = resolved.reduce((s, p) => s + (p.score ?? 0), 0);
    const avgConf =
      inCat.length === 0
        ? null
        : Math.round(inCat.reduce((s, p) => s + p.confidence, 0) / inCat.length);

    return {
      category,
      totalScore: score,
      accuracy: resolved.length === 0 ? null : Math.round((correct / resolved.length) * 100),
      predictions: inCat.length,
      averageConfidence: avgConf,
    };
  });

  return (
    <div className="wrap-wide pt-6 pb-16">
      <h1 className="display text-4xl sm:text-5xl">Leagues.</h1>
      <p className="mt-1 text-muted">
        Where you’re sharp. Where you’re wrong.
      </p>

      <div className="mt-4">
        <TournamentsBanner />
      </div>

      <div className="mt-6">
        <CategoryStats stats={stats} />
      </div>
    </div>
  );
}
