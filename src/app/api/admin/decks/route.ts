import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { ValidationError, validateDeck } from "@/cards/validation";
import { isStaticSlug } from "@/cards/storage";

export async function POST(req: Request) {
  const { response } = await requireAdmin();
  if (response) return response;

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

  if (isStaticSlug(input.slug)) {
    return NextResponse.json(
      { error: "That slug conflicts with a built-in example deck. Pick another." },
      { status: 409 },
    );
  }

  const existing = await prisma.cardDeck.findUnique({ where: { slug: input.slug } });
  if (existing) {
    return NextResponse.json({ error: "Slug already in use" }, { status: 409 });
  }

  const deck = await prisma.cardDeck.create({
    data: {
      slug: input.slug,
      title: input.title,
      notes: input.notes ?? null,
      slidesJson: input.slides,
    },
  });

  // Bust the studio listing + any cached PNG for this slug
  revalidatePath("/studio");
  for (let i = 0; i < input.slides.length; i++) {
    revalidatePath(`/api/cards/${input.slug}/${i}`);
  }

  return NextResponse.json({
    deck: { id: deck.id, slug: deck.slug, title: deck.title },
  });
}
