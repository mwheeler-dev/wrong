import Link from "next/link";
import { getCurrentUser } from "@/lib/session";

export const metadata = {
  title: "About — Wrong.",
};

export default async function AboutPage() {
  const user = await getCurrentUser();
  const cta = user ? "/play" : "/signup";
  const ctaLabel = user ? "Play today" : "Start playing";

  return (
    <div className="wrap pt-10 sm:pt-14">
      <p className="label">About</p>
      <h1 className="display mt-2 text-5xl sm:text-6xl">
        How wrong are you<br className="sm:hidden" /> today?
      </h1>

      <p className="mt-6 text-lg leading-relaxed">
        Wrong. is a daily reality check. Ten questions. Yes or no. Pick your confidence. Reality keeps score.
      </p>

      <div className="mt-10 space-y-6 text-base text-muted">
        <p>
          Most of us walk around <span className="text-ink font-semibold">vaguely confident</span> about
          things we have no business being confident about. Markets. Sports. Politics. Our own plans.
        </p>
        <p>
          Wrong. is a small daily habit that turns those vibes into numbers. You answer ten
          yes-or-no questions, and for each one you have to <span className="text-ink font-semibold">put a
          number on it</span> — 60, 70, 80, or 90 percent.
        </p>
        <p>
          Then the world happens. When a question resolves, the math is simple:{" "}
          <span className="text-ink font-semibold">
            if you&apos;re right, you gain the number of points you risked. If you&apos;re wrong, you lose
            them.
          </span>
        </p>
        <p>
          Over time you&apos;ll notice patterns. You&apos;re sharper than you thought on some things.
          Spectacularly off on others. There&apos;s usually a confidence level you keep getting burned at.
          Reality will point at it.
        </p>
      </div>

      <hr className="my-12 border-line" />

      <p className="label">The rules</p>
      <ul className="mt-3 space-y-2 text-base">
        <li><strong>10 questions a day.</strong> One round. Thirty seconds each.</li>
        <li><strong>Pick a side.</strong> YES or NO. No skipping.</li>
        <li><strong>Pick a number.</strong> 60, 70, 80, or 90 percent.</li>
        <li><strong>Reality scores you.</strong> If you&apos;re right, you gain the number of points you risked. If you&apos;re wrong, you lose them.</li>
        <li><strong>Pending until it resolves.</strong> Some questions take a day. Some take a week.</li>
      </ul>

      <hr className="my-12 border-line" />

      <p className="label">What it isn&apos;t</p>
      <ul className="mt-3 space-y-2 text-base text-muted">
        <li>Not betting. No money in, no money out.</li>
        <li>Not a social feed. No comments, no profiles to fight in.</li>
        <li>Not a quiz. The answers don&apos;t exist yet.</li>
      </ul>

      <div className="my-16">
        <Link href={cta} className="btn-accent w-full sm:w-auto sm:px-8">
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}
