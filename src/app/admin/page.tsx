import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/session";
import { AdminQuestionForm } from "@/components/AdminQuestionForm";
import { AdminQuestionRow } from "@/components/AdminQuestionRow";
import { PublishBatchButton } from "@/components/PublishBatchButton";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.email)) {
    return (
      <div className="wrap pt-12">
        <h1 className="display text-4xl">Wrong door.</h1>
        <p className="mt-3 text-muted">
          This screen is reality&apos;s backstage. Set <code>ADMIN_EMAIL</code> to your account email to get in.
        </p>
      </div>
    );
  }

  const now = new Date();
  const questions = await prisma.question.findMany({
    orderBy: [{ publishDate: "desc" }, { createdAt: "desc" }],
    include: { _count: { select: { predictions: true } } },
  });

  const scheduled = questions.filter((q) => q.status === "PENDING" && q.publishDate > now);
  const live = questions.filter((q) => q.status === "PENDING" && q.publishDate <= now);
  const resolved = questions.filter((q) => q.status === "RESOLVED");

  return (
    <div className="wrap-wide pt-6 pb-16">
      <h1 className="display text-4xl sm:text-5xl">Admin.</h1>
      <p className="mt-1 text-muted">Author. Publish. Resolve. Reality is your job here.</p>

      <section className="mt-6">
        <PublishBatchButton scheduledCount={scheduled.length} />
      </section>

      <section className="mt-8">
        <h2 className="display text-xl sm:text-2xl">New question</h2>
        <div className="mt-3">
          <AdminQuestionForm
            initial={{
              publishDate: new Date().toISOString(),
              resolutionDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
            }}
          />
        </div>
      </section>

      <Section title={`Scheduled (${scheduled.length})`} subtitle="Publish later. Or promote with the daily batch button.">
        {scheduled.length === 0 ? (
          <p className="card text-sm text-muted">Nothing scheduled.</p>
        ) : (
          scheduled.map((q) => (
            <AdminQuestionRow
              key={q.id}
              q={{
                id: q.id,
                text: q.text,
                category: q.category,
                status: q.status,
                correctAnswer: q.correctAnswer,
                publishDate: q.publishDate.toISOString(),
                resolutionDate: q.resolutionDate.toISOString(),
                predictionsCount: q._count.predictions,
              }}
            />
          ))
        )}
      </Section>

      <Section title={`Live (${live.length})`} subtitle="Currently visible on /play.">
        {live.length === 0 ? (
          <p className="card text-sm text-muted">Nothing live.</p>
        ) : (
          live.map((q) => (
            <AdminQuestionRow
              key={q.id}
              q={{
                id: q.id,
                text: q.text,
                category: q.category,
                status: q.status,
                correctAnswer: q.correctAnswer,
                publishDate: q.publishDate.toISOString(),
                resolutionDate: q.resolutionDate.toISOString(),
                predictionsCount: q._count.predictions,
              }}
            />
          ))
        )}
      </Section>

      <Section title={`Resolved (${resolved.length})`} subtitle="Scored and locked.">
        {resolved.length === 0 ? (
          <p className="card text-sm text-muted">Nothing resolved yet.</p>
        ) : (
          resolved.map((q) => (
            <AdminQuestionRow
              key={q.id}
              q={{
                id: q.id,
                text: q.text,
                category: q.category,
                status: q.status,
                correctAnswer: q.correctAnswer,
                publishDate: q.publishDate.toISOString(),
                resolutionDate: q.resolutionDate.toISOString(),
                predictionsCount: q._count.predictions,
              }}
            />
          ))
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
