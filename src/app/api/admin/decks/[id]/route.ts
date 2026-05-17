import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { ValidationError, validateDeck } from "@/cards/validation";
import { isStaticSlug } from "@/cards/storage";

type Ctx = { params: { id: string } };

export async function PATCH(req: Request, { params }: Ctx) {
  const { response } = await requireAdmin();
  if (response) return response;

  const existing = await prisma.cardDeck.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Deck not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  let input;
  try {
    input = validateDeck(body);
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  // If the slug is changing, check for conflicts (built-in OR another deck)
  if (input.slug !== existing.slug) {
    if (isStaticSlug(input.slug)) {
      return NextResponse.json(
        { error: "That slug conflicts with a built-in example deck. Pick another." },
        { status: 409 },
      );
    }
    const dupe = await prisma.cardDeck.findUnique({ where: { slug: input.slug } });
    if (dupe) {
      return NextResponse.json({ error: "Slug already in use" }, { status: 409 });
    }
  }

  const updated = await prisma.cardDeck.update({
    where: { id: params.id },
    data: {
      slug: input.slug,
      title: input.title,
      notes: input.notes ?? null,
      slidesJson: input.slides,
    },
  });

  revalidatePath("/studio");
  revalidatePath(`/studio/${existing.slug}`);
  revalidatePath(`/studio/${updated.slug}`);
  const slideCount = Math.max(input.slides.length, (existing.slidesJson as unknown[])?.length ?? 0);
  for (let i = 0; i < slideCount; i++) {
    revalidatePath(`/api/cards/${existing.slug}/${i}`);
    if (existing.slug !== updated.slug) {
      revalidatePath(`/api/cards/${updated.slug}/${i}`);
    }
  }

  return NextResponse.json({
    deck: { id: updated.id, slug: updated.slug, title: updated.title },
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { response } = await requireAdmin();
  if (response) return response;

  const existing = await prisma.cardDeck.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Deck not found" }, { status: 404 });

  await prisma.cardDeck.delete({ where: { id: params.id } });
  revalidatePath("/studio");
  revalidatePath(`/studio/${existing.slug}`);
  return NextResponse.json({ ok: true });
}
