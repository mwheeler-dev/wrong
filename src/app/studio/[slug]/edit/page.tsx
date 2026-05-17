import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/session";
import { getDeckRowBySlug } from "@/cards/storage";
import { DeckEditor } from "@/components/cards/DeckEditor";
import type { Slide } from "@/cards/types";

type Props = { params: { slug: string } };

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: Props) {
  return { title: `Edit ${params.slug} — Studio` };
}

export default async function EditDeckPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.email)) {
    return (
      <div className="wrap pt-12">
        <h1 className="display text-4xl">Wrong door.</h1>
        <p className="mt-3 text-muted">This area is admin-only.</p>
      </div>
    );
  }

  const row = await getDeckRowBySlug(params.slug);
  if (!row) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pt-8 pb-20">
      <Link
        href={`/studio/${row.slug}`}
        className="text-[11px] font-semibold uppercase tracking-wider text-muted hover:text-ink"
      >
        ← {row.title}
      </Link>
      <h1 className="display mt-3 text-4xl">Edit deck</h1>
      <p className="mt-1 text-sm text-muted">
        Changes are live the moment you save. The PNG endpoint and CLI export
        pick them up automatically.
      </p>

      <div className="mt-10">
        <DeckEditor
          mode="edit"
          id={row.id}
          initial={{
            slug: row.slug,
            title: row.title,
            notes: row.notes ?? undefined,
            slides: row.slidesJson as Slide[],
          }}
        />
      </div>
    </div>
  );
}
