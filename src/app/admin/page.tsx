import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getUserTimezone, isAdmin } from "@/lib/session";
import { AdminQuestionComposer } from "@/components/AdminQuestionComposer";
import { toAdminQuestionRow as toRowProps } from "@/lib/adminQuestions";
import Link from "next/link";
import { AdminQuestionList } from "@/components/AdminQuestionList";
import { PublishBatchButton } from "@/components/PublishBatchButton";
import { BackfillScoresButton } from "@/components/BackfillScoresButton";
import { nextMidnight, startOfToday } from "@/lib/daily";

export const dynamic = "force-dynamic";

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

  const [questions, resolvedCount] = await Promise.all([
    prisma.question.findMany({
      where: { status: "PENDING" },
      orderBy: [{ publishDate: "desc" }, { createdAt: "desc" }],
      include: { _count: { select: { predictions: true } } },
    }),
    prisma.question.count({ where: { status: "RESOLVED" } }),
  ]);

  const pending = questions.filter((q) => q.status === "PENDING");

  function effectiveClosesAt(q: (typeof pending)[number]): Date {
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
        <h2 className="display text-xl sm:text-2xl">New questions</h2>
        <div className="mt-3">
          <AdminQuestionComposer
            generationEnabled={!!process.env.OPENAI_API_KEY}
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

      <section className="mt-10">
        <h2 className="display text-xl sm:text-2xl">Past questions</h2>
        <Link
          href="/admin/archive"
          className="card mt-3 flex items-center justify-between gap-4 hover:border-ink"
        >
          <div>
            <p className="font-semibold">
              Question archive ({resolvedCount.toLocaleString()})
            </p>
            <p className="mt-1 text-sm text-muted">
              Search resolved questions by topic, category, outcome, or date.
            </p>
          </div>
          <span aria-hidden="true">→</span>
        </Link>
      </section>
    </div>
  );
}
