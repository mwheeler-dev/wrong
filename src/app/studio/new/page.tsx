import Link from "next/link";
import { getCurrentUser, isAdmin } from "@/lib/session";
import { DeckEditor } from "@/components/cards/DeckEditor";

export const metadata = { title: "New deck — Studio" };
export const dynamic = "force-dynamic";

export default async function NewDeckPage() {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.email)) {
    return (
      <div className="wrap pt-12">
        <h1 className="display text-4xl">Wrong door.</h1>
        <p className="mt-3 text-muted">This area is admin-only.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pt-8 pb-20">
      <Link
        href="/studio"
        className="text-[11px] font-semibold uppercase tracking-wider text-muted hover:text-ink"
      >
        ← Studio
      </Link>
      <h1 className="display mt-3 text-4xl">New deck</h1>
      <p className="mt-1 text-sm text-muted">
        Title, slug, hook, 3–8 predictions, CTA. Renders the same way as the
        examples — straight to PNG via the existing endpoint.
      </p>

      <div className="mt-10">
        <DeckEditor mode="create" />
      </div>
    </div>
  );
}
