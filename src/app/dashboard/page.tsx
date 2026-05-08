import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { ScoreCard } from "@/components/ScoreCard";
import { startOfToday, endOfToday, startOfWeek, formatShortDate } from "@/lib/dates";
import { dangerousConfidenceLine } from "@/lib/feedback";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const all = await prisma.prediction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      question: {
        select: {
          id: true,
          text: true,
          category: true,
          status: true,
          correctAnswer: true,
          resolutionDate: true,
        },
      },
    },
  });

  const resolved = all.filter((p) => p.score != null);
  const pending = all.filter((p) => p.score == null);

  const todayStart = startOfToday();
  const todayEnd = endOfToday();
  const weekStart = startOfWeek();

  const todayScore = resolved
    .filter((p) => p.resolvedAt && p.resolvedAt >= todayStart && p.resolvedAt <= todayEnd)
    .reduce((s, p) => s + (p.score ?? 0), 0);

  const weekScore = resolved
    .filter((p) => p.resolvedAt && p.resolvedAt >= weekStart)
    .reduce((s, p) => s + (p.score ?? 0), 0);

  const allTimeScore = resolved.reduce((s, p) => s + (p.score ?? 0), 0);

  const correctCount = resolved.filter((p) => (p.score ?? 0) > 0).length;
  const accuracy = resolved.length === 0
    ? null
    : Math.round((correctCount / resolved.length) * 100);

  const avgConfidence = all.length === 0
    ? null
    : Math.round(all.reduce((s, p) => s + p.confidence, 0) / all.length);

  // Most dangerous confidence: confidence level with the most-negative net score
  const lossByLevel = new Map<number, number>();
  for (const p of resolved) {
    if ((p.score ?? 0) < 0) {
      lossByLevel.set(p.confidence, (lossByLevel.get(p.confidence) ?? 0) + (p.score ?? 0));
    }
  }
  let dangerousLevel: number | null = null;
  let worst = 0;
  for (const [lvl, net] of lossByLevel.entries()) {
    if (net < worst) {
      worst = net;
      dangerousLevel = lvl;
    }
  }

  return (
    <div className="wrap-wide pt-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="label">Hello, {user.name}</p>
          <h1 className="display mt-1 text-5xl">How wrong are you today?</h1>
        </div>
        <Link href="/play" className="btn-accent hidden sm:inline-flex">Play today</Link>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <ScoreCard label="Today" value={todayScore >= 0 ? `+${todayScore}` : todayScore} emphasized />
        <ScoreCard label="This week" value={weekScore >= 0 ? `+${weekScore}` : weekScore} />
        <ScoreCard label="All time" value={allTimeScore >= 0 ? `+${allTimeScore}` : allTimeScore} />
        <ScoreCard label="Accuracy" value={accuracy == null ? "—" : `${accuracy}%`} hint={`${resolved.length} resolved`} />
        <ScoreCard label="Avg. confidence" value={avgConfidence == null ? "—" : `${avgConfidence}%`} hint={`${all.length} predictions`} />
        <ScoreCard
          label="Most dangerous"
          value={dangerousLevel == null ? "—" : `${dangerousLevel}%`}
          hint={dangerousConfidenceLine(dangerousLevel)}
        />
      </div>

      <Link href="/play" className="btn-accent mt-4 inline-flex sm:hidden">Play today</Link>

      <section className="mt-10">
        <h2 className="display text-3xl">Pending</h2>
        <p className="text-sm text-muted">Predictions waiting on reality.</p>
        <div className="mt-3 space-y-2">
          {pending.length === 0 && (
            <p className="card text-sm text-muted">Nothing pending. Reality is fast today.</p>
          )}
          {pending.map((p) => (
            <div key={p.id} className="card">
              <div className="flex items-center justify-between">
                <span className="pill">{p.question.category}</span>
                <span className="text-xs text-muted">resolves {formatShortDate(p.question.resolutionDate)}</span>
              </div>
              <p className="mt-2 font-semibold">{p.question.text}</p>
              <p className="mt-1 text-sm text-muted">
                You said <strong className="text-ink">{p.answer}</strong> @ {p.confidence}%
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="display text-3xl">Resolved</h2>
        <p className="text-sm text-muted">Reality has spoken.</p>
        <div className="mt-3 space-y-2">
          {resolved.length === 0 && (
            <p className="card text-sm text-muted">No resolved predictions yet.</p>
          )}
          {resolved.map((p) => {
            const positive = (p.score ?? 0) > 0;
            return (
              <div key={p.id} className="card">
                <div className="flex items-center justify-between">
                  <span className="pill">{p.question.category}</span>
                  <span className={`display text-2xl ${positive ? "text-good" : "text-bad"}`}>
                    {positive ? "+" : ""}
                    {p.score}
                  </span>
                </div>
                <p className="mt-2 font-semibold">{p.question.text}</p>
                <p className="mt-1 text-sm text-muted">
                  You said <strong className="text-ink">{p.answer}</strong> @ {p.confidence}% · Reality said <strong className="text-ink">{p.question.correctAnswer}</strong>
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
