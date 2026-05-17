import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getUserTimezone, isAdmin } from "@/lib/session";
import { AdminQuestionForm } from "@/components/AdminQuestionForm";
import { AdminQuestionRow } from "@/components/AdminQuestionRow";
import { PublishBatchButton } from "@/components/PublishBatchButton";
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
  // "Today" in the admin's local timezone — drives the Needs Resolved Today queue.
  const todayStart = startOfToday(adminTz, now);
  const tomorrowMidnight = nextMidnight(adminTz, now);

  const questions = await prisma.question.findMany({
    orderBy: [{ publishDate: "desc" }, { createdAt: "desc" }],
    include: { _count: { select: { predictions: true } } },
  });

  const pending = questions.filter((q) => q.status === "PENDING");
  const resolved = questions.filter((q) => q.status === "RESOLVED");

  const scheduled = pending.filter((q) => q.publishDate > now);

  // Effective close time = closesToPredictionsAt with legacy fallback to
  // resolutionDate. Used to decide if a question is still answerable.
  function effectiveClosesAt(q: typeof pending[number]): Date {
    return q.closesToPredictionsAt ?? q.resolutionDate;
  }

  // Live = published AND not yet past the answer-window cutoff. The
  // "Needs Resolved Today" queue is a SEPARATE concept — it groups by
  // resolutionDate, not by visibility.
  const live = pending.filter(
    (q) => q.publishDate <= now && effectiveClosesAt(q) > now,
  );

  // Needs Resolved Today = PENDING questions whose resolutionDate falls
  // inside the admin's local day. Past-due questions and future-day
  // questions are intentionally excluded so this queue means exactly
  // "scheduled to be resolved today".
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

      <Section
        title={`Scheduled (${scheduled.length})`}
        subtitle="Publish later. Or promote with the daily batch button."
      >
        {scheduled.length === 0 ? (
          <p className="card text-sm text-muted">Nothing scheduled.</p>
        ) : (
          scheduled.map((q) => (
            <AdminQuestionRow key={q.id} q={toRowProps(q)} />
          ))
        )}
      </Section>

      <Section
        title={`Needs Resolved Today (${needsResolvedToday.length})`}
        subtitle="Scheduled to be resolved today, in your local timezone. Resolving here scores all related predictions."
      >
        {needsResolvedToday.length === 0 ? (
          <p className="card text-sm text-muted">
            Nothing scheduled to resolve today.
          </p>
        ) : (
          needsResolvedToday.map((q) => (
            <AdminQuestionRow key={q.id} q={toRowProps(q)} />
          ))
        )}
      </Section>

      <Section
        title={`Live (${live.length})`}
        subtitle="Currently answerable on /play. Resolve early from here if needed."
      >
        {live.length === 0 ? (
          <p className="card text-sm text-muted">Nothing live.</p>
        ) : (
          live.map((q) => <AdminQuestionRow key={q.id} q={toRowProps(q)} />)
        )}
      </Section>

      <Section title={`Resolved (${resolved.length})`} subtitle="Scored and locked.">
        {resolved.length === 0 ? (
          <p className="card text-sm text-muted">Nothing resolved yet.</p>
        ) : (
          resolved.map((q) => <AdminQuestionRow key={q.id} q={toRowProps(q)} />)
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="display text-xl sm:text-2xl">{title}</h2>
      {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}
