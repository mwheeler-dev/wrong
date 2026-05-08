import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { LeaderboardTable, type LeaderboardRow } from "@/components/LeaderboardTable";
import { startOfWeek } from "@/lib/dates";
import { CATEGORIES } from "@/lib/scoring";

export const dynamic = "force-dynamic";

type SearchParams = {
  tab?: string;
  category?: string;
};

async function buildRows(opts: {
  resolvedAfter?: Date;
  category?: string;
}): Promise<LeaderboardRow[]> {
  const predictions = await prisma.prediction.findMany({
    where: {
      score: { not: null },
      ...(opts.resolvedAfter ? { resolvedAt: { gte: opts.resolvedAfter } } : {}),
      ...(opts.category ? { question: { category: opts.category } } : {}),
    },
    select: {
      userId: true,
      score: true,
      confidence: true,
      user: { select: { name: true } },
    },
  });

  const byUser = new Map<string, {
    name: string;
    score: number;
    correct: number;
    total: number;
    confidenceSum: number;
  }>();

  for (const p of predictions) {
    const existing = byUser.get(p.userId) ?? {
      name: p.user.name,
      score: 0,
      correct: 0,
      total: 0,
      confidenceSum: 0,
    };
    existing.score += p.score ?? 0;
    existing.total += 1;
    existing.confidenceSum += p.confidence;
    if ((p.score ?? 0) > 0) existing.correct += 1;
    byUser.set(p.userId, existing);
  }

  const rows: LeaderboardRow[] = Array.from(byUser.entries()).map(([userId, v]) => ({
    userId,
    name: v.name,
    score: v.score,
    accuracy: v.total === 0 ? null : Math.round((v.correct / v.total) * 100),
    averageConfidence: v.total === 0 ? null : Math.round(v.confidenceSum / v.total),
    predictions: v.total,
  }));

  rows.sort((a, b) => b.score - a.score);
  return rows.slice(0, 50);
}

export default async function LeaderboardsPage({
  searchParams,
}: { searchParams: SearchParams }) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const tab = searchParams.tab === "all" || searchParams.tab === "category" ? searchParams.tab : "week";
  const category = searchParams.category && CATEGORIES.includes(searchParams.category as (typeof CATEGORIES)[number])
    ? searchParams.category
    : CATEGORIES[0];

  let rows: LeaderboardRow[] = [];
  if (tab === "week") {
    rows = await buildRows({ resolvedAfter: startOfWeek() });
  } else if (tab === "all") {
    rows = await buildRows({});
  } else {
    rows = await buildRows({ category });
  }

  return (
    <div className="wrap-wide pt-6">
      <h1 className="display text-5xl">Boards.</h1>
      <p className="mt-1 text-muted">Reality keeps score. We just rank it.</p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Tab href="/leaderboards?tab=week" active={tab === "week"} label="This week" />
        <Tab href="/leaderboards?tab=all" active={tab === "all"} label="All time" />
        <Tab href={`/leaderboards?tab=category&category=${encodeURIComponent(category)}`} active={tab === "category"} label="By category" />
      </div>

      {tab === "category" && (
        <div className="mt-3 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <a
              key={c}
              href={`/leaderboards?tab=category&category=${encodeURIComponent(c)}`}
              className={`pill ${c === category ? "bg-ink text-paper border-ink" : ""}`}
            >
              {c}
            </a>
          ))}
        </div>
      )}

      <div className="mt-6">
        <LeaderboardTable rows={rows} highlightUserId={userId} />
      </div>
    </div>
  );
}

function Tab({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <a
      href={href}
      className={`btn ${active ? "bg-ink text-paper" : "bg-white border border-line text-ink"}`}
    >
      {label}
    </a>
  );
}
