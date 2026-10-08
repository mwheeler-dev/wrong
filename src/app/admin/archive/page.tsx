import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/session";
import { toAdminQuestionRow } from "@/lib/adminQuestions";
import {
  archiveFilters,
  ARCHIVE_PAGE_SIZE,
  type ArchiveParams,
} from "@/lib/questionArchive";
import { AdminQuestionRow } from "@/components/AdminQuestionRow";
import { CATEGORIES } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export default async function QuestionArchive({
  searchParams,
}: {
  searchParams: ArchiveParams;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.email)) redirect("/dashboard");

  const filters = archiveFilters(searchParams);
  const total = await prisma.question.count({ where: filters.where });
  const totalPages = Math.max(1, Math.ceil(total / ARCHIVE_PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);
  const questions = await prisma.question.findMany({
    where: filters.where,
    take: ARCHIVE_PAGE_SIZE,
    skip: (page - 1) * ARCHIVE_PAGE_SIZE,
    orderBy: [{ resolutionDate: "desc" }, { id: "desc" }],
    include: { _count: { select: { predictions: true } } },
  });
  function pageUrl(next: number) {
    const params = new URLSearchParams({ page: String(next) });
    for (const [key, value] of Object.entries({
      q: filters.search,
      category: filters.category,
      answer: filters.answer,
      from: filters.from,
      to: filters.to,
    }))
      if (value) params.set(key, value);
    return `/admin/archive?${params}`;
  }

  return (
    <div className="wrap-wide pt-6 pb-16">
      <Link href="/admin" className="text-sm underline">
        ← Back to admin
      </Link>
      <h1 className="display mt-5 text-4xl sm:text-5xl">Question archive.</h1>
      <p className="mt-2 text-sm text-muted">
        Find past questions without scrolling through the daily work queue. Open
        a result to view its details and manage it.
      </p>
      <form
        action="/admin/archive"
        method="get"
        className="card mt-5 space-y-3"
      >
        <label className="block">
          <span className="label">Search questions or resolution criteria</span>
          <input
            name="q"
            defaultValue={filters.search}
            maxLength={200}
            className="input mt-1"
            placeholder="Search an event, person, team, or topic"
          />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label>
            <span className="label">Category</span>
            <select
            aria-label="Category"
              name="category"
              defaultValue={filters.category}
              className="input mt-1"
            >
              <option value="">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Outcome</span>
            <select
            aria-label="Outcome"
              name="answer"
              defaultValue={filters.answer}
              className="input mt-1"
            >
              <option value="">YES and NO</option>
              <option>YES</option>
              <option>NO</option>
            </select>
          </label>
          <label>
            <span className="label">Resolution deadline from (UTC)</span>
            <input
              name="from"
              type="date"
              defaultValue={filters.from}
              className="input mt-1"
            />
          </label>
          <label>
            <span className="label">Through (UTC)</span>
            <input
              name="to"
              type="date"
              defaultValue={filters.to}
              className="input mt-1"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary">Search archive</button>
          <Link href="/admin/archive" className="btn-ghost">
            Clear filters
          </Link>
        </div>
      </form>
      <p className="mt-5 text-sm text-muted">
        {total.toLocaleString()} matching question{total === 1 ? "" : "s"}
      </p>
      <div className="mt-3 space-y-2">
        {!questions.length && (
          <p className="card text-sm text-muted">
            No resolved questions match these filters.
          </p>
        )}
        {questions.map((q) => (
          <details
            key={q.id}
            className="rounded-2xl border border-line bg-white"
          >
            <summary className="cursor-pointer px-4 py-3 marker:text-muted">
              <span className="ml-1 font-semibold">{q.text}</span>
              <span className="mt-1 block pl-5 text-xs text-muted">
                {q.category} · {q.correctAnswer} · {q._count.predictions}{" "}
                predictions · Deadline{" "}
                {q.resolutionDate.toISOString().slice(0, 10)}
              </span>
            </summary>
            <div className="border-t border-line p-3">
              <AdminQuestionRow q={toAdminQuestionRow(q)} />
            </div>
          </details>
        ))}
      </div>
      {totalPages > 1 && (
        <nav
          aria-label="Archive pages"
          className="mt-4 flex flex-wrap items-center justify-between gap-3"
        >
          <p className="text-xs text-muted">
            {(page - 1) * ARCHIVE_PAGE_SIZE + 1}–
            {Math.min(page * ARCHIVE_PAGE_SIZE, total)} of{" "}
            {total.toLocaleString()}
          </p>
          <div className="flex items-center gap-3">
            {page > 1 && (
              <Link href={pageUrl(page - 1)} className="btn-ghost">
                ← Previous
              </Link>
            )}
            <span className="text-xs">
              Page {page} of {totalPages}
            </span>
            {page < totalPages && (
              <Link href={pageUrl(page + 1)} className="btn-ghost">
                Next →
              </Link>
            )}
          </div>
          <form
            method="get"
            action="/admin/archive"
            className="flex items-center gap-2"
          >
            {Object.entries({
              q: filters.search,
              category: filters.category,
              answer: filters.answer,
              from: filters.from,
              to: filters.to,
            }).map(
              ([name, value]) =>
                value && (
                  <input key={name} name={name} value={value} type="hidden" />
                ),
            )}
            <label className="text-xs text-muted" htmlFor="archive-page">
              Jump to page
            </label>
            <input
              id="archive-page"
              name="page"
              type="number"
              min={1}
              max={totalPages}
              defaultValue={page}
              className="input w-24"
            />
            <button className="btn-ghost border border-line">Go</button>
          </form>
        </nav>
      )}
    </div>
  );
}
