import Link from "next/link";
import { hasStartedPlayToday } from "@/lib/play-intro";
import { getCurrentUser, getUserTimezone } from "@/lib/session";
import { DAILY_CAP } from "@/lib/daily";
import { FlameIcon } from "@/components/icons/FlameIcon";
import { CheckCircleIcon } from "@/components/icons/CheckCircleIcon";
import { CategoryIcon } from "@/components/icons/CategoryIcon";
import { TrophyIcon } from "@/components/icons/TrophyIcon";

export const dynamic = "force-dynamic";

export default async function PlayIntroPage() {
  const user = await getCurrentUser();
  const returningPlayer = !!user && hasStartedPlayToday(user.playIntroStartedAt, getUserTimezone(user));
  return (
    <div className="wrap pb-4 pt-4 sm:pt-6">
      <p className="label">Your daily reality check</p>
      <h1 className="display mt-2 flex items-center gap-2 text-4xl">Prove it.<FlameIcon className="h-8 w-8 text-accent" /></h1>
      <p className="mt-2 text-sm text-muted">{returningPlayer ? "Pick up where you left off. Active question timers keep running while you’re here." : "Predict what happens next. Find out how right you really are."}</p>

      <ol className="mt-4 divide-y divide-line rounded-2xl border border-line bg-white px-3">
        <li className="flex gap-3 py-3">
          <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-ink" />
          <div>
            <h2 className="text-sm font-bold">30 seconds. Make your call.</h2>
            <p className="mt-1 text-[13px] leading-[18px] text-muted">Pick YES or NO, choose your confidence, then lock it in. Answers are final. The question timer keeps running if you leave the game.</p>
          </div>
        </li>
        <li className="flex gap-3 py-3">
          <CategoryIcon category="Business" className="mt-0.5 h-5 w-5 shrink-0 text-ink" />
          <div>
            <h2 className="text-sm font-bold">Back your confidence.</h2>
            <p className="mt-1 text-[13px] leading-[18px] text-muted">Choose 60%, 70%, 80%, or 90%. Correct predictions add those points to your Edge score; incorrect predictions subtract them.</p>
          </div>
        </li>
        <li className="flex gap-3 py-3">
          <CategoryIcon category="Science" className="mt-0.5 h-5 w-5 shrink-0 text-ink" />
          <div>
            <h2 className="text-sm font-bold">Show your thinking.</h2>
            <p className="mt-1 text-[13px] leading-[18px] text-muted">After each answer, pick Intuition, Research, or Experience to continue. Personal notes are optional.</p>
          </div>
        </li>
      </ol>

      <div className="mt-3 flex items-center justify-center gap-2 text-center text-xs leading-4 text-muted"><TrophyIcon className="h-5 w-5 shrink-0 text-accent" /><p>Up to {DAILY_CAP} predictions a day. Complete all {DAILY_CAP} to build your streak. Resets at midnight, your time.</p></div>
      <form action="/api/play/start" method="post" className="mt-3">
        <button type="submit" className="btn-accent w-full text-base">{returningPlayer ? "Continue playing" : "Play"}<span aria-hidden className="ml-2">→</span></button>
      </form>
      <p className="mt-2 text-center text-xs leading-4 text-muted">Reality settles the results. Track your predictions in <strong>You</strong> and your Edge ranking on <strong>Boards</strong>.</p>
      {!user && <p className="mt-2 text-center text-xs text-muted"><Link href="/login" className="underline">Sign in</Link> or <Link href="/signup" className="underline">create an account</Link> to play.</p>}
    </div>
  );
}
