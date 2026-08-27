import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getUserTimezone } from "@/lib/session";
import { ScoreCard } from "@/components/ScoreCard";
import { Streak } from "@/components/Streak";
import { Calibration } from "@/components/Calibration";
import { ThinkingProfile } from "@/components/ThinkingProfile";
import { Journal } from "@/components/Journal";
import { InfoTooltip } from "@/components/InfoTooltip";
import { PendingCarousel, type PendingItem } from "@/components/PendingCarousel";
import { startOfToday, endOfToday, startOfWeek, formatShortDate } from "@/lib/dates";
import {
  dangerousConfidenceLabel,
  dangerousConfidenceLine,
  type DangerSeverity,
} from "@/lib/feedback";
import { computeStreak } from "@/lib/streaks";
import { calibrationVerdict, computeCalibration } from "@/lib/calibration";
import { buildJournal } from "@/lib/journal";
import { computeThinkingProfile } from "@/lib/thinkingProfile";
import { readReasoning } from "@/lib/reasoning";

export const dynamic = "force-dynamic";

const DASHBOARD_RESOLVED_PREVIEW = 5;
const DASHBOARD_JOURNAL_DAYS = 3;

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const timeZone = getUserTimezone(user);

  const [predictions, dailyReflections] = await Promise.all([
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
        // Per-prediction reflection (chips + optional text). Null until
        // the user submits via the ReasoningInput component on /play.
        reflection: {
          select: { reasoning: true, text: true },
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
  const now = new Date();

  const todayScore = resolved
    .filter((p) => p.resolvedAt && p.resolvedAt >= todayStart && p.resolvedAt <= todayEnd)
    .reduce((s, p) => s + (p.score ?? 0), 0);

  const weekScore = resolved
    .filter((p) => p.resolvedAt && p.resolvedAt >= weekStart)
    .reduce((s, p) => s + (p.score ?? 0), 0);

  const allTimeScore = resolved.reduce((s, p) => s + (p.score ?? 0), 0);

  const correctCount = resolved.filter((p) => (p.score ?? 0) > 0).length;
  const accuracy =
    resolved.length === 0
      ? null
      : Math.round((correctCount / resolved.length) * 100);

  const avgConfidence =
    predictions.length === 0
      ? null
      : Math.round(
          predictions.reduce((s, p) => s + p.confidence, 0) /
            predictions.length,
        );

  // Most dangerous confidence — accuracy-based. We look at every
  // confidence level with at least a small sample and pick the WORST
  // performer, then classify whether it's actually dangerous or just
  // the weakest of a strong set.
  //
  //   "high"  - the worst level is genuinely bad
  //               (≥80% conf with <60% acc, OR acc <55%)
  //   "watch" - the worst level is mediocre (acc <65 but not bad)
  //   "none"  - every level is performing well (acc ≥65 across the board)
  //
  // Switched away from the prior "net negative score" calculation
  // because score-driven ranking gave the same answer regardless of
  // accuracy (a -90 loss looked the same as a -60 loss did at 58% vs
  // 80% accuracy). The tile is interpretation — accuracy is the
  // honest signal here.
  const accByLevel = new Map<number, { total: number; correct: number }>();
  for (const p of resolved) {
    let row = accByLevel.get(p.confidence);
    if (!row) {
      row = { total: 0, correct: 0 };
      accByLevel.set(p.confidence, row);
    }
    row.total += 1;
    if ((p.score ?? 0) > 0) row.correct += 1;
  }
  // Sample-size guard: require at least 3 resolved predictions at a
  // level before we make any "this level is dangerous" claim. Stops a
  // single bad call from headlining the dashboard.
  type LevelStat = { level: number; total: number; accuracy: number };
  const levelStats: LevelStat[] = [];
  for (const [level, { total, correct }] of accByLevel.entries()) {
    if (total < 3) continue;
    levelStats.push({ level, total, accuracy: (correct / total) * 100 });
  }
  levelStats.sort((a, b) => a.accuracy - b.accuracy);

  let dangerousLevel: number | null = null;
  let dangerSeverity: DangerSeverity = "none";
  const weakest = levelStats[0];
  if (weakest) {
    if (
      (weakest.level >= 80 && weakest.accuracy < 60) ||
      weakest.accuracy < 55
    ) {
      dangerousLevel = weakest.level;
      dangerSeverity = "high";
    } else if (weakest.accuracy < 65) {
      dangerousLevel = weakest.level;
      dangerSeverity = "watch";
    }
    // else: every qualifying level is at ≥65% accuracy — no callout
  }

  const streakStats = computeStreak(
    predictions.map((p) => p.createdAt),
    timeZone,
  );

  const calibrationRows = computeCalibration(
    resolved.map((p) => ({ confidence: p.confidence, score: p.score })),
  );
  const verdict = calibrationVerdict(calibrationRows);

  // Thinking profile: per-style usage + accuracy, computed from the
  // already-fetched predictions. No extra DB hit. Sample-size guards live
  // inside computeThinkingProfile so the renderer can stay dumb.
  const thinkingProfile = computeThinkingProfile(
    predictions.map((p) => ({
      score: p.score,
      category: p.question.category,
      reasoning: readReasoning(p.reflection?.reasoning),
    })),
  );

  // Journal: only days with actual written reflections. Pass per-prediction
  // reflection records through; buildJournal filters out unreflected rows.
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
      reflection: p.reflection
        ? { reasoning: p.reflection.reasoning, text: p.reflection.text }
        : null,
    })),
    dailyReflections.map((r) => ({ date: r.date, text: r.text })),
    { limitDays: DASHBOARD_JOURNAL_DAYS, timeZone },
  );

  // Pending → carousel items. Overdue = the question's resolution date is
  // already in the past. That's the user-visible signal of the bug Part 1
  // fixed; once an admin resolves, the carousel item moves to Resolved.
  const pendingItems: PendingItem[] = pending.map((p) => ({
    id: p.id,
    category: p.question.category,
    questionText: p.question.text,
    answer: p.answer,
    confidence: p.confidence,
    resolvesLabel: `resolves ${formatShortDate(p.question.resolutionDate, timeZone)}`,
    overdue: p.question.resolutionDate < now,
  }));

  const resolvedPreview = resolved.slice(0, DASHBOARD_RESOLVED_PREVIEW);

  return (
    <div className="wrap-wide pt-6 pb-12">
      <header className="flex items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-3">
            <p className="label">Hello, {user.name}</p>
            <Link
              href="/dashboard/account"
              className="text-[11px] font-semibold uppercase tracking-wider text-muted underline decoration-line underline-offset-4 hover:text-ink"
            >
              Account
            </Link>
          </div>
          <h1 className="display mt-1 text-[40px] leading-[0.95] sm:text-5xl">
            How wrong are you today?
          </h1>
        </div>
        <Link
          href="/play"
          className="btn-accent hidden shrink-0 sm:inline-flex"
        >
          Play today
        </Link>
      </header>

      <div className="mt-6">
        <Streak stats={streakStats} />
      </div>

      <Link
        href="/play"
        className="btn-accent mt-4 inline-flex w-full sm:hidden"
      >
        Play today
      </Link>

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
          label={dangerousConfidenceLabel(dangerSeverity)}
          value={dangerousLevel == null ? "—" : `${dangerousLevel}%`}
          unit={dangerousLevel == null ? undefined : "confidence"}
          hint={dangerousConfidenceLine(dangerousLevel, dangerSeverity)}
        />
      </section>

      <section className="mt-10">
        <Calibration rows={calibrationRows} verdict={verdict} />
        <ThinkingProfile profile={thinkingProfile} />
      </section>

      <section className="mt-10">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <h2 className="display text-2xl sm:text-3xl">Pending</h2>
            <p className="text-sm text-muted">
              Predictions waiting on reality.
            </p>
          </div>
        </div>
        <div className="mt-3">
          <PendingCarousel items={pendingItems} />
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <h2 className="display text-2xl sm:text-3xl">Resolved</h2>
            <p className="text-sm text-muted">Reality has spoken.</p>
          </div>
          {resolved.length > DASHBOARD_RESOLVED_PREVIEW && (
            <Link
              href="/dashboard/resolved"
              className="text-sm font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4 hover:text-ink/80"
            >
              View all ({resolved.length})
            </Link>
          )}
        </div>
        <div className="mt-3 space-y-2">
          {resolved.length === 0 && (
            <p className="card text-sm text-muted">
              No resolved predictions yet.
            </p>
          )}
          {resolvedPreview.map((p) => {
            const positive = (p.score ?? 0) > 0;
            return (
              <div key={p.id} className="card">
                <div className="flex items-center justify-between gap-2">
                  <span className="pill">{p.question.category}</span>
                  <span
                    className={`display text-2xl ${
                      positive ? "text-good" : "text-bad"
                    }`}
                  >
                    {positive ? "+" : ""}
                    {p.score}
                  </span>
                </div>
                <p className="mt-2 font-semibold">{p.question.text}</p>
                <p className="mt-1 text-sm text-muted">
                  You said{" "}
                  <strong className="text-ink">{p.answer}</strong> @{" "}
                  {p.confidence}% · Reality said{" "}
                  <strong className="text-ink">
                    {p.question.correctAnswer}
                  </strong>
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <h2 className="display text-2xl sm:text-3xl">Reflections</h2>
            <p className="text-sm text-muted">
              Only days you actually wrote or picked reasoning.
            </p>
          </div>
          <Link
            href="/dashboard/reflections"
            className="text-sm font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4 hover:text-ink/80"
          >
            View reflections
          </Link>
        </div>
        <div className="mt-3">
          <Journal days={journalDays} />
        </div>
      </section>
    </div>
  );
}
