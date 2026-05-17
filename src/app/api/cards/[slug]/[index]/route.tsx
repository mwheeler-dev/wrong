import { ImageResponse } from "next/og";
import { getDeckBySlug } from "@/cards/storage";
import { Slide } from "@/cards/Slide";
import { SLIDE_HEIGHT, SLIDE_WIDTH } from "@/cards/theme";
import { loadCardFonts } from "@/cards/fonts";

// Node runtime — Prisma needs it, and ImageResponse works here too.
export const runtime = "nodejs";

type Params = { slug: string; index: string };

export async function GET(_req: Request, { params }: { params: Params }) {
  const post = await getDeckBySlug(params.slug);
  if (!post) {
    return new Response("Deck not found", { status: 404 });
  }

  const index = Number(params.index);
  if (!Number.isInteger(index) || index < 0 || index >= post.slides.length) {
    return new Response("Slide index out of range", { status: 404 });
  }

  const slide = post.slides[index];
  const fonts = await loadCardFonts();

  return new ImageResponse(
    <Slide slide={slide} index={index} total={post.slides.length} />,
    {
      width: SLIDE_WIDTH,
      height: SLIDE_HEIGHT,
      fonts,
      headers: {
        // Short cache because admins iterate. revalidatePath calls in the
        // PATCH route bust this immediately when an admin edits a deck.
        "Cache-Control": "public, max-age=60, s-maxage=60",
      },
    },
  );
}
