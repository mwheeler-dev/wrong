import { NextResponse } from "next/server";
import { listDeckSummaries } from "@/cards/storage";

// Lightweight listing endpoint — used by the export CLI to discover all decks
// (built-in examples + admin-created). Public on purpose: it only returns
// slugs and slide counts, no admin-only content.
export const runtime = "nodejs";
// Don't prerender: this hits Postgres, which isn't reachable at build time
// (and CardDeck won't even exist as a table until you've run db push).
export const dynamic = "force-dynamic";

export async function GET() {
  const summaries = await listDeckSummaries();
  return NextResponse.json({
    decks: summaries.map((s) => ({
      slug: s.slug,
      title: s.title,
      slideCount: s.slideCount,
      source: s.source,
    })),
  });
}
