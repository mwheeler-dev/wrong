import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/session";
import { getDeckBySlug, isStaticSlug } from "@/cards/storage";
import { Slide } from "@/cards/Slide";
import { SLIDE_HEIGHT, SLIDE_WIDTH } from "@/cards/theme";

type Props = { params: { slug: string } };

const PREVIEW_SCALE = 0.32;

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: Props) {
  return { title: `${params.slug} — Studio` };
}

export default async function PostStudioPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.email)) return <NotAdmin />;

  const post = await getDeckBySlug(params.slug);
  if (!post) notFound();

  const fromStatic = isStaticSlug(params.slug);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pt-8 pb-20">
      <Link
        href="/studio"
        className="text-[11px] font-semibold uppercase tracking-wider text-muted hover:text-ink"
      >
        ← Studio
      </Link>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="display truncate text-4xl">{post.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {post.slides.length} slides · slug <code>{post.slug}</code>
            {fromStatic && " · example (read-only)"}
          </p>
        </div>
        {!fromStatic && (
          <Link
            href={`/studio/${post.slug}/edit`}
            className="btn-outline shrink-0 text-sm"
          >
            Edit deck
          </Link>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {post.slides.map((slide, i) => (
          <SlideTile
            key={i}
            slug={post.slug}
            index={i}
            total={post.slides.length}
            slide={slide}
          />
        ))}
      </div>
    </div>
  );
}

function SlideTile({
  slug,
  index,
  total,
  slide,
}: {
  slug: string;
  index: number;
  total: number;
  slide: import("@/cards/types").Slide;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_0_rgba(0,0,0,0.04)]">
        <div
          style={{
            width: SLIDE_WIDTH * PREVIEW_SCALE,
            height: SLIDE_HEIGHT * PREVIEW_SCALE,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              transform: `scale(${PREVIEW_SCALE})`,
              transformOrigin: "top left",
              width: SLIDE_WIDTH,
              height: SLIDE_HEIGHT,
            }}
          >
            <Slide slide={slide} index={index} total={total} />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between px-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          {String(index + 1).padStart(2, "0")} · {slide.type}
        </p>
        <div className="flex items-center gap-3 text-xs">
          <Link
            href={`/studio/${slug}/${index}`}
            className="text-muted underline-offset-2 hover:text-ink hover:underline"
          >
            full size
          </Link>
          <a
            href={`/api/cards/${slug}/${index}`}
            target="_blank"
            rel="noreferrer"
            className="text-muted underline-offset-2 hover:text-ink hover:underline"
          >
            PNG ↓
          </a>
        </div>
      </div>
    </div>
  );
}

function NotAdmin() {
  return (
    <div className="wrap pt-12">
      <h1 className="display text-4xl">Wrong door.</h1>
      <p className="mt-3 text-muted">This area is admin-only.</p>
    </div>
  );
}
