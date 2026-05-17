// Deck data access layer. Merges:
//   1. Admin-editable decks stored in Postgres (CardDeck table)
//   2. Built-in "example" decks shipped in src/cards/posts/*
//
// Studio and the PNG endpoint should always go through here. Admin-edited
// content wins on a slug conflict — built-ins are intended as starter
// examples, not protected names.

import { prisma } from "@/lib/prisma";
import { posts as staticPosts } from "./posts";
import type { Post, Slide } from "./types";

export type DeckSource = "db" | "static";

export type DeckSummary = {
  id: string | null; // DB row id; null for static decks
  slug: string;
  title: string;
  notes?: string;
  slideCount: number;
  source: DeckSource;
  updatedAt?: Date;
};

function rowToPost(row: {
  slug: string;
  title: string;
  notes: string | null;
  slidesJson: unknown;
}): Post {
  return {
    slug: row.slug,
    title: row.title,
    notes: row.notes ?? undefined,
    slides: row.slidesJson as Slide[],
  };
}

export async function listDeckSummaries(): Promise<DeckSummary[]> {
  const rows = await prisma.cardDeck.findMany({
    orderBy: { updatedAt: "desc" },
  });
  const dbSummaries: DeckSummary[] = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    notes: r.notes ?? undefined,
    slideCount: Array.isArray(r.slidesJson) ? r.slidesJson.length : 0,
    source: "db",
    updatedAt: r.updatedAt,
  }));
  const dbSlugs = new Set(dbSummaries.map((s) => s.slug));
  const staticSummaries: DeckSummary[] = staticPosts
    .filter((p) => !dbSlugs.has(p.slug))
    .map((p) => ({
      id: null,
      slug: p.slug,
      title: p.title,
      notes: p.notes,
      slideCount: p.slides.length,
      source: "static",
    }));
  return [...dbSummaries, ...staticSummaries];
}

export async function getDeckBySlug(slug: string): Promise<Post | undefined> {
  const row = await prisma.cardDeck.findUnique({ where: { slug } });
  if (row) return rowToPost(row);
  return staticPosts.find((p) => p.slug === slug);
}

export async function getDeckRowBySlug(slug: string) {
  return prisma.cardDeck.findUnique({ where: { slug } });
}

export async function getDeckRowById(id: string) {
  return prisma.cardDeck.findUnique({ where: { id } });
}

export function isStaticSlug(slug: string): boolean {
  return staticPosts.some((p) => p.slug === slug);
}
