import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { PlayClient } from "@/components/PlayClient";

export const dynamic = "force-dynamic";

export default async function PlayPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const now = new Date();

  // Today's batch: published + still open. We deliberately do NOT filter by
  // "user hasn't answered" here, so the batch is stable. The user's answered
  // IDs are fetched separately and used by PlayClient to (a) start at the first
  // unanswered question on initial render and (b) defend against any stale
  // RSC payload the Router Cache might serve when navigating back to /play.
  const batch = await prisma.question.findMany({
    where: {
      publishDate: { lte: now },
      status: "PENDING",
      resolutionDate: { gt: now },
    },
    orderBy: [{ publishDate: "desc" }, { createdAt: "desc" }],
    take: 10,
    select: {
      id: true,
      text: true,
      category: true,
      resolutionDate: true,
      sourceUrl: true,
    },
  });

  const batchIds = batch.map((q) => q.id);
  const userPredictions =
    batchIds.length === 0
      ? []
      : await prisma.prediction.findMany({
          where: { userId, questionId: { in: batchIds } },
          select: { questionId: true },
        });
  const answeredIds = userPredictions.map((p) => p.questionId);

  const questions = batch.map((q) => ({
    id: q.id,
    text: q.text,
    category: q.category,
    resolutionDate: q.resolutionDate.toISOString(),
    sourceUrl: q.sourceUrl,
  }));

  return <PlayClient questions={questions} initialAnsweredIds={answeredIds} />;
}
