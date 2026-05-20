import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { ResolvedHistory, type ResolvedRow } from "@/components/ResolvedHistory";
import { readReasoning } from "@/lib/reasoning";

export const dynamic = "force-dynamic";

export default async function ResolvedHistoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Server-rendered list — heavy lifting (search/filter) happens client-side
  // so the user can flip filters without round-trips. We fetch up to 2000
  // rows (generous ceiling for a power user); beyond that we'd want
  // pagination, but it's not needed for the launch population.
  const rows = await prisma.prediction.findMany({
    where: { userId: user.id, score: { not: null } },
    orderBy: { resolvedAt: "desc" },
    take: 2000,
    include: {
      question: {
        select: { text: true, category: true, correctAnswer: true },
      },
      reflection: { select: { reasoning: true, text: true } },
    },
  });

  const items: ResolvedRow[] = rows.map((p) => ({
    id: p.id,
    questionText: p.question.text,
    category: p.question.category,
    answer: p.answer,
    confidence: p.confidence,
    correctAnswer: p.question.correctAnswer,
    score: p.score,
    resolvedAt: (p.resolvedAt ?? p.createdAt).toISOString(),
    reasoning: readReasoning(p.reflection?.reasoning),
    reflectionText: p.reflection?.text ?? null,
  }));

  return (
    <div className="wrap-wide pt-4 pb-12">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/dashboard#resolved"
          className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink"
        >
          ← Back to You
        </Link>
        <span className="text-[11px] uppercase tracking-wider text-muted">
          {items.length} resolved
        </span>
      </div>
      <h1 className="display mt-3 text-[36px] leading-[0.95] sm:text-5xl">
        Resolved
      </h1>
      <p className="mt-1 text-sm text-muted">
        Search by keyword, filter by anything, or both at once.
      </p>

      <div className="mt-5">
        <ResolvedHistory items={items} />
      </div>
    </div>
  );
}
