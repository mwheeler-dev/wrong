import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/session";
import { getDeckBySlug } from "@/cards/storage";
import { Slide } from "@/cards/Slide";
import { SLIDE_HEIGHT, SLIDE_WIDTH } from "@/cards/theme";

type Props = { params: { slug: string; index: string } };

export const dynamic = "force-dynamic";

export default async function SingleSlidePage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.email)) {
    return (
      <div className="wrap pt-12">
        <h1 className="display text-4xl">Wrong door.</h1>
        <p className="mt-3 text-muted">This area is admin-only.</p>
      </div>
    );
  }

  const post = await getDeckBySlug(params.slug);
  if (!post) notFound();
  const index = Number(params.index);
  if (!Number.isInteger(index) || index < 0 || index >= post.slides.length) {
    notFound();
  }
  const slide = post.slides[index];
  const total = post.slides.length;

  return (
    <div className="mx-auto w-full max-w-5xl px-5 pt-8 pb-20">
      <div className="flex items-center justify-between">
        <Link
          href={`/studio/${post.slug}`}
          className="text-[11px] font-semibold uppercase tracking-wider text-muted hover:text-ink"
        >
          ← {post.title}
        </Link>
        <div className="flex items-center gap-4 text-xs">
          <a
            href={`/api/cards/${post.slug}/${index}`}
            target="_blank"
            rel="noreferrer"
            className="text-muted underline-offset-2 hover:text-ink hover:underline"
          >
            Open PNG
          </a>
          <a
            href={`/api/cards/${post.slug}/${index}`}
            download={`${post.slug}-${String(index + 1).padStart(2, "0")}.png`}
            className="text-muted underline-offset-2 hover:text-ink hover:underline"
          >
            Download
          </a>
        </div>
      </div>

      <h1 className="display mt-3 text-2xl">
        {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}{" "}
        — {slide.type}
      </h1>

      <div className="mt-6 overflow-auto rounded-2xl border border-line">
        <div
          style={{
            width: SLIDE_WIDTH,
            height: SLIDE_HEIGHT,
          }}
        >
          <Slide slide={slide} index={index} total={total} />
        </div>
      </div>

      <SlideNav slug={post.slug} index={index} total={total} />
    </div>
  );
}

function SlideNav({
  slug,
  index,
  total,
}: {
  slug: string;
  index: number;
  total: number;
}) {
  const prev = index > 0 ? index - 1 : null;
  const next = index < total - 1 ? index + 1 : null;
  return (
    <div className="mt-6 flex items-center justify-between text-sm">
      {prev != null ? (
        <Link
          href={`/studio/${slug}/${prev}`}
          className="text-muted underline-offset-2 hover:text-ink hover:underline"
        >
          ← previous
        </Link>
      ) : (
        <span />
      )}
      {next != null ? (
        <Link
          href={`/studio/${slug}/${next}`}
          className="text-muted underline-offset-2 hover:text-ink hover:underline"
        >
          next →
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}
