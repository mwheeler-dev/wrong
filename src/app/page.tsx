import Link from "next/link";
import { getCurrentUser } from "@/lib/session";

export default async function LandingPage() {
  const user = await getCurrentUser();
  const cta = user ? "/play" : "/signup";

  return (
    <div className="wrap pt-12 sm:pt-20">
      <section className="fade-in">
        <div className="display text-[88px] sm:text-[128px]">
          Wrong<span className="text-accent">.</span>
        </div>
        <h1 className="display mt-2 text-4xl sm:text-5xl">
          How wrong are you<br />today?
        </h1>
        <p className="mt-5 max-w-md text-lg text-muted">
          Swipe. Predict. Reality scores you.
        </p>

        <div className="mt-10 flex items-center gap-3">
          <Link href={cta} className="btn-accent text-base px-7 py-4">
            Play Today
          </Link>
          {!user && (
            <Link href="/login" className="btn-ghost text-sm">
              I have an account
            </Link>
          )}
        </div>

        <ul className="mt-14 space-y-4 text-sm text-muted">
          <li><strong className="text-ink">Ten questions a day.</strong> Yes or No. Pick a confidence.</li>
          <li><strong className="text-ink">Right answer?</strong> Gain points equal to your confidence.</li>
          <li><strong className="text-ink">Wrong?</strong> Lose them. Reality keeps score.</li>
        </ul>
      </section>
    </div>
  );
}
