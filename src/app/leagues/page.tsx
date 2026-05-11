import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { CategoryStats, type CategoryStat } from "@/components/CategoryStats";
import { CATEGORIES } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export default async function LeaguesPage() {
  const userId = await getCurrentUserId();

  if (!userId) {
    // Signed-out teaser
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
        <p className="mt-1 text-muted">Where are you sharp? Where are you wrong?</p>

        <div className="card mt-4 flex flex-wrap items-center justify-between gap-3 bg-ink text-paper">
          <p className="text-sm">
            Leagues track <span className="font-semibold">your</span> performance by category.{" "}
            <span className="font-semibold">Sign up to start scoring.</span>
          </p>
          <Link href="/signup" className="btn-accent">
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
      <p className="mt-1 text-muted">Where are you sharp? Where are you wrong?</p>

      <div className="mt-6">
        <CategoryStats stats={stats} />
      </div>
    </div>
  );
}
