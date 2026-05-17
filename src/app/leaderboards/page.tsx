import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getUserTimezone } from "@/lib/session";
import { LeaderboardTable, type LeaderboardRow } from "@/components/LeaderboardTable";
import { InfoTooltip } from "@/components/InfoTooltip";
import { TrophyIcon } from "@/components/icons/TrophyIcon";
import { CategoryIcon } from "@/components/icons/CategoryIcon";
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
}: {
  searchParams: SearchParams;
}) {
  const user = await getCurrentUser();
  const userId = user?.id ?? null;
  const timeZone = getUserTimezone(user);
  const tab = searchParams.tab === "all" || searchParams.tab === "category" ? searchParams.tab : "week";
  const category =
    searchParams.category &&
    CATEGORIES.includes(searchParams.category as (typeof CATEGORIES)[number])
      ? searchParams.category
      : CATEGORIES[0];

  let rows: LeaderboardRow[] = [];
  if (tab === "week") {
    // "This week" scoped to the viewer's local week, not the server's UTC week
    rows = await buildRows({ resolvedAfter: startOfWeek(timeZone) });
  } else if (tab === "all") {
    rows = await buildRows({});
  } else {
    rows = await buildRows({ category });
  }

  return (
    <div className="wrap-wide pt-6 pb-16">
      {/* Title — lime period mirrors the "Wrong." brand mark; trophy glyph
          to its left signals competition without going gamer. */}
      <div className="flex items-baseline gap-3">
        <TrophyIcon className="streak-trophy h-8 w-8 shrink-0 self-center text-accent sm:h-10 sm:w-10" />
        <h1 className="display text-4xl sm:text-5xl">
          Boards<span className="text-accent">.</span>
        </h1>
      </div>

      {/* Prestige hero — black breathing card carrying the Edge definition.
          Same visual language as the dashboard streak card. Tooltip opens
          inward (placement="left") because the trigger sits near the card's
          left edge — center placement was clipping off-screen on narrow widths. */}
      <div className="streak-card mt-4 border border-paper/10">
        <div className="relative p-6 sm:p-8">
          <TrophyIcon
            aria-hidden
            className="streak-trophy pointer-events-none absolute right-6 top-6 hidden h-14 w-14 text-accent/70 sm:right-8 sm:top-8 sm:block sm:h-20 sm:w-20"
          />
          <div className="relative max-w-md pr-0 sm:pr-24">
            <div className="flex items-center gap-2">
              <p className="label text-accent">Edge</p>
              <InfoTooltip label="What is Edge?" placement="left">
                Edge increases when your predictions are correct relative to
                your confidence.
              </InfoTooltip>
            </div>
            <h2 className="display mt-2 text-3xl sm:text-4xl">
              Reality keeps score.<br />
              Edge is the difference.
            </h2>
            <p className="mt-3 text-sm text-paper/70">
              Earned when your confidence meets reality. The board ranks the
              sharpest.
            </p>
            {!userId && (
              <Link href="/signup" className="btn-accent mt-5 inline-flex">
                Sign up
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Tab href="/leaderboards?tab=week" active={tab === "week"} label="This week" />
        <Tab href="/leaderboards?tab=all" active={tab === "all"} label="All time" />
        <Tab
          href={`/leaderboards?tab=category&category=${encodeURIComponent(category)}`}
          active={tab === "category"}
          label="By category"
        />
      </div>

      {tab === "category" && (
        <div className="mt-3 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <a
              key={c}
              href={`/leaderboards?tab=category&category=${encodeURIComponent(c)}`}
              className={`pill inline-flex items-center gap-1.5 transition ${
                c === category
                  ? "border-ink bg-ink text-paper shadow-[0_0_18px_rgba(217,255,0,0.18)]"
                  : "hover:border-ink"
              }`}
            >
              <CategoryIcon category={c} className="h-3.5 w-3.5" />
              {c}
            </a>
          ))}
        </div>
      )}

      <div className="mt-6">
        <LeaderboardTable rows={rows} highlightUserId={userId ?? undefined} />
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
