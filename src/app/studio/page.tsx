import Link from "next/link";
import { getCurrentUser, isAdmin } from "@/lib/session";
import { listDeckSummaries } from "@/cards/storage";

export const metadata = {
  title: "Studio — Wrong.",
};

export const dynamic = "force-dynamic";

export default async function StudioIndex() {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.email)) {
    return <NotAdmin />;
  }

  const decks = await listDeckSummaries();
  const dbDecks = decks.filter((d) => d.source === "db");
  const exampleDecks = decks.filter((d) => d.source === "static");

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pt-10 pb-20">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
        Wrong. — Studio
      </p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <h1 className="display text-5xl">Card decks</h1>
        <Link href="/studio/new" className="btn-accent">
          New deck
        </Link>
      </div>
      <p className="mt-3 text-base text-muted">
        TikTok / IG / Shorts. 1080×1920. Each slide has a PNG endpoint for
        direct download. Use the CLI <code>npm run cards:export</code> for batch
        export.
      </p>

      <section className="mt-10">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          Your decks ({dbDecks.length})
        </p>
        <div className="mt-3 space-y-2">
          {dbDecks.length === 0 && (
            <div className="rounded-2xl border border-line bg-ink/[0.02] p-5 text-sm text-muted">
              No custom decks yet. Hit <strong className="text-ink">New deck</strong> above to make one.
            </div>
          )}
          {dbDecks.map((d) => (
            <DeckRow key={d.slug} summary={d} editable />
          ))}
        </div>
      </section>

      <section className="mt-10">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          Examples ({exampleDecks.length})
        </p>
        <p className="mt-1 text-xs text-muted">
          Reference decks shipped in code. Read-only — duplicate to a custom deck if you want to edit.
        </p>
        <div className="mt-3 space-y-2">
          {exampleDecks.map((d) => (
            <DeckRow key={d.slug} summary={d} editable={false} />
          ))}
        </div>
      </section>
    </div>
  );
}

function DeckRow({
  summary,
  editable,
}: {
  summary: import("@/cards/storage").DeckSummary;
  editable: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white px-5 py-4">
      <Link href={`/studio/${summary.slug}`} className="min-w-0 flex-1 hover:text-ink">
        <p className="truncate text-lg font-bold">{summary.title}</p>
        <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted">
          {summary.slideCount} slides · {summary.slug}
          {summary.source === "static" && " · example"}
        </p>
        {summary.notes && (
          <p className="mt-1 truncate text-sm text-muted">{summary.notes}</p>
        )}
      </Link>
      {editable && (
        <Link
          href={`/studio/${summary.slug}/edit`}
          className="shrink-0 rounded-full border border-ink px-3 py-1.5 text-xs font-semibold hover:bg-ink hover:text-paper"
        >
          Edit
        </Link>
      )}
    </div>
  );
}

function NotAdmin() {
  return (
    <div className="wrap pt-12">
      <h1 className="display text-4xl">Wrong door.</h1>
      <p className="mt-3 text-muted">
        This screen is reality&apos;s backstage. Set <code>ADMIN_EMAIL</code> to your account email to get in.
      </p>
    </div>
  );
}
