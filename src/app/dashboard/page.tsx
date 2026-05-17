import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getUserTimezone } from "@/lib/session";
import { ScoreCard } from "@/components/ScoreCard";
import { Streak } from "@/components/Streak";
import { Calibration } from "@/components/Calibration";
import { Journal } from "@/components/Journal";
import { InfoTooltip } from "@/components/InfoTooltip";
import { startOfToday, endOfToday, startOfWeek, formatShortDate } from "@/lib/dates";
import { dangerousConfidenceLine } from "@/lib/feedback";
import { computeStreak } from "@/lib/streaks";
import { calibrationVerdict, computeCalibration } from "@/lib/calibration";
import { buildJournal } from "@/lib/journal";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const timeZone = getUserTimezone(user);

  const [predictions, reflections] = await Promise.all([
    prisma.prediction.findMany({
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
    }),
    prisma.dailyReflection.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
    }),
  ]);

  const resolved = predictions.filter((p) => p.score != null);
  const pending = predictions.filter((p) => p.score == null);

  const todayStart = startOfToday(timeZone);
  const todayEnd = endOfToday(timeZone);
  const weekStart = startOfWeek(timeZone);

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

  const avgConfidence = predictions.length === 0
    ? null
    : Math.round(predictions.reduce((s, p) => s + p.confidence, 0) / predictions.length);

  // Most dangerous confidence (most-negative net resolved score at a level)
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

  // Streak
  const streakStats = computeStreak(
    predictions.map((p) => p.createdAt),
    timeZone,
  );

  // Calibration
  const calibrationRows = computeCalibration(
    resolved.map((p) => ({ confidence: p.confidence, score: p.score })),
  );
  const verdict = calibrationVerdict(calibrationRows);

  // Journal (predictions + reflections, last 14 days)
  const journalDays = buildJournal(
    predictions.map((p) => ({
      id: p.id,
      createdAt: p.createdAt,
      answer: p.answer,
      confidence: p.confidence,
      score: p.score,
      question: {
        text: p.question.text,
        category: p.question.category,
        correctAnswer: p.question.correctAnswer,
      },
    })),
    reflections.map((r) => ({ date: r.date, text: r.text })),
    { limitDays: 14, timeZone },
  );

  return (
    <div className="wrap-wide pt-6 pb-12">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="label">Hello, {user.name}</p>
          <h1 className="display mt-1 text-4xl sm:text-5xl">How wrong are you today?</h1>
        </div>
        <Link href="/play" className="btn-accent hidden shrink-0 sm:inline-flex">Play today</Link>
      </header>

      <div className="mt-6">
        <Streak stats={streakStats} />
      </div>

      <Link href="/play" className="btn-accent mt-4 inline-flex w-full sm:hidden">Play today</Link>

      <div className="mt-10 flex items-center gap-2">
        <p className="label">Edge</p>
        <InfoTooltip label="What is Edge?">
          Edge increases when your predictions are correct relative to your
          confidence.
        </InfoTooltip>
      </div>
      <p className="mt-1 text-sm text-muted">
        Reality keeps score. Edge is the difference.
      </p>
      <section className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <ScoreCard
          label="Today’s Edge"
          value={todayScore >= 0 ? `+${todayScore}` : todayScore}
          emphasized
        />
        <ScoreCard
          label="This week’s Edge"
          value={weekScore >= 0 ? `+${weekScore}` : weekScore}
        />
        <ScoreCard
          label="All-time Edge"
          value={allTimeScore >= 0 ? `+${allTimeScore}` : allTimeScore}
        />
        <ScoreCard
          label="Accuracy"
          value={accuracy == null ? "—" : `${accuracy}%`}
          hint={`${resolved.length} resolved`}
        />
        <ScoreCard
          label="Avg. confidence"
          value={avgConfidence == null ? "—" : `${avgConfidence}%`}
          hint={`${predictions.length} predictions`}
        />
        <ScoreCard
          label="Most dangerous"
          value={dangerousLevel == null ? "—" : `${dangerousLevel}%`}
          hint={dangerousConfidenceLine(dangerousLevel)}
        />
      </section>

      <section className="mt-10">
        <Calibration rows={calibrationRows} verdict={verdict} />
      </section>

      <section className="mt-10">
        <h2 className="display text-2xl sm:text-3xl">Pending</h2>
        <p className="text-sm text-muted">Predictions waiting on reality.</p>
        <div className="mt-3 space-y-2">
          {pending.length === 0 && (
            <p className="card text-sm text-muted">Nothing pending. Reality is fast today.</p>
          )}
          {pending.map((p) => (
            <div key={p.id} className="card">
              <div className="flex items-center justify-between gap-2">
                <span className="pill">{p.question.category}</span>
                <span className="text-[11px] uppercase tracking-wider text-muted">
                  resolves {formatShortDate(p.question.resolutionDate, timeZone)}
                </span>
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
        <h2 className="display text-2xl sm:text-3xl">Resolved</h2>
        <p className="text-sm text-muted">Reality has spoken.</p>
        <div className="mt-3 space-y-2">
          {resolved.length === 0 && (
            <p className="card text-sm text-muted">No resolved predictions yet.</p>
          )}
          {resolved.slice(0, 25).map((p) => {
            const positive = (p.score ?? 0) > 0;
            return (
              <div key={p.id} className="card">
                <div className="flex items-center justify-between gap-2">
                  <span className="pill">{p.question.category}</span>
                  <span className={`display text-2xl ${positive ? "text-good" : "text-bad"}`}>
                    {positive ? "+" : ""}
                    {p.score}
                  </span>
                </div>
                <p className="mt-2 font-semibold">{p.question.text}</p>
                <p className="mt-1 text-sm text-muted">
                  You said <strong className="text-ink">{p.answer}</strong> @ {p.confidence}% · Reality said{" "}
                  <strong className="text-ink">{p.question.correctAnswer}</strong>
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="display text-2xl sm:text-3xl">Journal</h2>
        <p className="text-sm text-muted">What you thought, paired with how it played out.</p>
        <div className="mt-3">
          <Journal days={journalDays} />
        </div>
      </section>
    </div>
  );
}
