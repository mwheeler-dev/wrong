import Link from "next/link";
import { getCurrentUser } from "@/lib/session";

export default async function LandingPage() {
  const user = await getCurrentUser();
  const primaryHref = user ? "/play" : "/signup";
  const primaryLabel = user ? "Play today" : "Sign up to play";

  return (
    <div>
      {/* Hero */}
      <section className="wrap pt-10 sm:pt-16">
        <div className="fade-in">
          <div className="flex items-baseline">
            <h1 className="display text-[68px] leading-[0.85] sm:text-[120px]">
              Wrong<span className="text-accent pulse-dot">.</span>
            </h1>
          </div>
          <p className="display mt-4 text-3xl sm:mt-6 sm:text-5xl">
            How wrong are you<br className="sm:hidden" /> today?
          </p>
          <p className="mt-4 max-w-md text-base text-muted sm:text-lg">
            Ten questions. Yes or no. Pick your confidence. Reality keeps score.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href={primaryHref} className="btn-accent w-full text-base sm:w-auto sm:px-7">
              {primaryLabel}
            </Link>
            {!user && (
              <Link href="/login" className="btn-ghost w-full text-sm sm:w-auto">
                I have an account
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="wrap mt-14 sm:mt-20">
        <p className="label">How it works</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Step n={1} title="Predict" body="Ten quick yes/no questions about the real world." />
          <Step n={2} title="Commit" body="Choose 60, 70, 80, or 90 percent confidence. That's your wager." />
          <Step
            n={3}
            title="Get scored"
            body="If you're right, you gain the number of points you risked. If you're wrong, you lose them."
          />
        </div>
      </section>

      {/* Closing CTA */}
      <section className="wrap mt-16 mb-20 sm:mt-24">
        <div className="rounded-3xl bg-ink p-6 text-paper sm:p-8">
          <p className="display text-3xl sm:text-4xl">
            Stop being<br />vaguely confident.
          </p>
          <p className="mt-3 text-paper/70">
            Wrong. turns gut feelings into numbers. Then it grades you.
          </p>
          <Link href={primaryHref} className="btn-accent mt-6 inline-flex">
            {primaryLabel}
          </Link>
        </div>
      </section>
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="card">
      <div className="display text-accent text-5xl leading-none">{String(n).padStart(2, "0")}</div>
      <p className="mt-3 text-lg font-bold">{title}</p>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </div>
  );
}
