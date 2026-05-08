import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/session";
import { AdminQuestionForm } from "@/components/AdminQuestionForm";
import { AdminQuestionRow } from "@/components/AdminQuestionRow";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.email)) {
    return (
      <div className="wrap pt-12">
        <h1 className="display text-4xl">Wrong door.</h1>
        <p className="mt-3 text-muted">
          This screen is reality's backstage. Set <code>ADMIN_EMAIL</code> to your account email to get in.
        </p>
      </div>
    );
  }

  const questions = await prisma.question.findMany({
    orderBy: [{ status: "asc" }, { publishDate: "desc" }, { createdAt: "desc" }],
    include: { _count: { select: { predictions: true } } },
  });

  const pending = questions.filter((q) => q.status === "PENDING");
  const resolved = questions.filter((q) => q.status === "RESOLVED");

  return (
    <div className="wrap-wide pt-6">
      <h1 className="display text-5xl">Admin.</h1>
      <p className="mt-1 text-muted">Author. Publish. Resolve. Reality is your job here.</p>

      <section className="mt-6">
        <h2 className="display text-2xl">New question</h2>
        <div className="mt-3">
          <AdminQuestionForm
            initial={{
              publishDate: new Date().toISOString(),
              resolutionDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
            }}
          />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="display text-2xl">Pending ({pending.length})</h2>
        <div className="mt-3 space-y-2">
          {pending.length === 0 && <p className="card text-sm text-muted">No pending questions.</p>}
          {pending.map((q) => (
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
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="display text-2xl">Resolved ({resolved.length})</h2>
        <div className="mt-3 space-y-2">
          {resolved.length === 0 && <p className="card text-sm text-muted">Nothing resolved yet.</p>}
          {resolved.map((q) => (
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
          ))}
        </div>
      </section>
    </div>
  );
}
