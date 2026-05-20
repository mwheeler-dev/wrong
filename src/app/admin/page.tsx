import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getUserTimezone, isAdmin } from "@/lib/session";
import { AdminQuestionForm } from "@/components/AdminQuestionForm";
import { AdminQuestionList } from "@/components/AdminQuestionList";
import { PublishBatchButton } from "@/components/PublishBatchButton";
import { BackfillScoresButton } from "@/components/BackfillScoresButton";
import { nextMidnight, startOfToday } from "@/lib/daily";

export const dynamic = "force-dynamic";

type QuestionRowInput = {
  id: string;
  text: string;
  category: string;
  status: string;
  correctAnswer: string | null;
  publishDate: Date;
  resolutionDate: Date;
  closesToPredictionsAt: Date | null;
  _count: { predictions: number };
};

function toRowProps(q: QuestionRowInput) {
  return {
    id: q.id,
    text: q.text,
    category: q.category,
    status: q.status,
    correctAnswer: q.correctAnswer,
    publishDate: q.publishDate.toISOString(),
    resolutionDate: q.resolutionDate.toISOString(),
    closesToPredictionsAt: q.closesToPredictionsAt
      ? q.closesToPredictionsAt.toISOString()
      : null,
    predictionsCount: q._count.predictions,
  };
}

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.email)) {
    return (
      <div className="wrap pt-12">
        <h1 className="display text-4xl">Wrong door.</h1>
        <p className="mt-3 text-muted">
          This screen is reality&apos;s backstage. Set <code>ADMIN_EMAIL</code>{" "}
          to your account email to get in.
        </p>
      </div>
    );
  }

  const adminTz = getUserTimezone(user);
  const now = new Date();
  const todayStart = startOfToday(adminTz, now);
  const tomorrowMidnight = nextMidnight(adminTz, now);

  const questions = await prisma.question.findMany({
    orderBy: [{ publishDate: "desc" }, { createdAt: "desc" }],
    include: { _count: { select: { predictions: true } } },
  });

  const pending = questions.filter((q) => q.status === "PENDING");
  const resolved = questions.filter((q) => q.status === "RESOLVED");

  function effectiveClosesAt(q: typeof pending[number]): Date {
    return q.closesToPredictionsAt ?? q.resolutionDate;
  }

  const scheduled = pending.filter((q) => q.publishDate > now);

  const live = pending.filter(
    (q) => q.publishDate <= now && effectiveClosesAt(q) > now,
  );

  // OVERDUE: PENDING questions whose resolutionDate is in the past
  // (strictly before todayStart in the admin's local timezone). These used
  // to disappear from every section — that's the bug that left their
  // predictions stuck on "Pending" forever. Showing them here is the fix.
  const overdue = pending
    .filter((q) => q.resolutionDate < todayStart)
    .sort((a, b) => a.resolutionDate.getTime() - b.resolutionDate.getTime());

  const needsResolvedToday = pending.filter(
    (q) =>
      q.resolutionDate >= todayStart && q.resolutionDate < tomorrowMidnight,
  );

  return (
    <div className="wrap-wide pt-6 pb-16">
      <h1 className="display text-4xl sm:text-5xl">Admin.</h1>
      <p className="mt-1 text-muted">
        Author. Publish. Resolve. Reality is your job here.
      </p>

      <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <PublishBatchButton scheduledCount={scheduled.length} />
        <a
          href="/studio"
          className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-ink p-5 text-paper hover:opacity-95"
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-paper/60">
              Card studio
            </p>
            <p className="display mt-1 text-2xl">Make cards →</p>
            <p className="mt-1 text-xs text-paper/70">
              TikTok / IG carousels. Edit, preview, export PNG.
            </p>
          </div>
        </a>
      </section>

      <section className="mt-6">
        <BackfillScoresButton />
      </section>

      <section className="mt-8">
        <h2 className="display text-xl sm:text-2xl">New question</h2>
        <div className="mt-3">
          <AdminQuestionForm
            initial={{
              publishDate: new Date().toISOString(),
              resolutionDate: new Date(
                Date.now() + 1000 * 60 * 60 * 24 * 3,
              ).toISOString(),
            }}
          />
        </div>
      </section>

      <AdminQuestionList
        title={`Overdue (${overdue.length})`}
        subtitle="Past resolution date and still PENDING. Resolve these first — every day they sit here, users see their predictions stuck on Pending."
        emphasize={overdue.length > 0}
        emptyText="Nothing overdue. Reality is on time."
        rows={overdue.map(toRowProps)}
      />

      <AdminQuestionList
        title={`Needs Resolved Today (${needsResolvedToday.length})`}
        subtitle="Scheduled to be resolved today, in your local timezone."
        emptyText="Nothing scheduled to resolve today."
        rows={needsResolvedToday.map(toRowProps)}
      />

      <AdminQuestionList
        title={`Live (${live.length})`}
        subtitle="Currently answerable on /play. Resolve early from here if needed."
        emptyText="Nothing live."
        rows={live.map(toRowProps)}
      />

      <AdminQuestionList
        title={`Scheduled (${scheduled.length})`}
        subtitle="Publish later. Or promote with the daily batch button."
        emptyText="Nothing scheduled."
        rows={scheduled.map(toRowProps)}
      />

      <AdminQuestionList
        title={`Resolved (${resolved.length})`}
        subtitle="Scored and locked."
        emptyText="Nothing resolved yet."
        rows={resolved.map(toRowProps)}
      />
    </div>
  );
}
