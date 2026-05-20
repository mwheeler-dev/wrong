import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getUserTimezone } from "@/lib/session";
import { buildJournal } from "@/lib/journal";
import { ReflectionsBrowser, type ReflectionsItem } from "@/components/ReflectionsBrowser";

export const dynamic = "force-dynamic";

export default async function ReflectionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const timeZone = getUserTimezone(user);

  // Pull predictions that actually have a reflection attached (reasoning OR
  // text), plus every daily reflection. Server-side filter saves bytes —
  // the client only browses the writable ones.
  const [predictions, dailyReflections] = await Promise.all([
    prisma.prediction.findMany({
      where: {
        userId: user.id,
        reflection: { isNot: null },
      },
      orderBy: { createdAt: "desc" },
      include: {
        question: { select: { text: true, category: true, correctAnswer: true } },
        reflection: { select: { reasoning: true, text: true } },
      },
    }),
    prisma.dailyReflection.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
    }),
  ]);

  // Pass through buildJournal so the page shares the day-grouping +
  // empty-day filtering used on the dashboard. Then flatten into a single
  // list for client-side search/filter — easier than indexing days.
  const days = buildJournal(
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
    { timeZone },
  );

  const flat: ReflectionsItem[] = [];
  for (const day of days) {
    for (const entry of day.entries) {
      if (entry.kind === "prediction") {
        flat.push({
          kind: "prediction",
          id: entry.predictionId,
          dateIso: entry.createdAt.toISOString(),
          dayKey: day.date,
          text: entry.text,
          reasoning: entry.reasoning,
          question: entry.question,
        });
      } else {
        flat.push({
          kind: "daily",
          id: `daily-${entry.date.toISOString()}`,
          dateIso: entry.date.toISOString(),
          dayKey: day.date,
          text: entry.text,
        });
      }
    }
  }

  return (
    <div className="wrap-wide pt-4 pb-12">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink"
        >
          ← Back to You
        </Link>
        <span className="text-[11px] uppercase tracking-wider text-muted">
          {flat.length} reflection{flat.length === 1 ? "" : "s"}
        </span>
      </div>
      <h1 className="display mt-3 text-[36px] leading-[0.95] sm:text-5xl">
        Reflections
      </h1>
      <p className="mt-1 text-sm text-muted">
        Only what you actually wrote. Search and filter by reasoning style.
      </p>

      <div className="mt-5">
        <ReflectionsBrowser items={flat} />
      </div>
    </div>
  );
}
