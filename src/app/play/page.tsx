import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { PlayClient } from "@/components/PlayClient";

export const dynamic = "force-dynamic";

export default async function PlayPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const now = new Date();

  // 10 questions: published, unresolved at this moment, not yet answered by user
  const candidates = await prisma.question.findMany({
    where: {
      publishDate: { lte: now },
      // include resolved-but-unanswered too? No: only let users predict on still-open questions
      OR: [
        { status: "PENDING" },
      ],
      resolutionDate: { gt: now },
      predictions: {
        none: { userId },
      },
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

  const questions = candidates.map((q) => ({
    id: q.id,
    text: q.text,
    category: q.category,
    resolutionDate: q.resolutionDate.toISOString(),
    sourceUrl: q.sourceUrl,
  }));

  return <PlayClient questions={questions} />;
}
