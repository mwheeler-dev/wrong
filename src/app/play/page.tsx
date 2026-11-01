import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { DAILY_CAP } from "@/lib/daily";

export const dynamic = "force-dynamic";

export default async function PlayIntroPage() {
  const user = await getCurrentUser();
  return (
    <div className="wrap-wide pb-16 pt-6 sm:pt-10">
      <p className="label">How to play</p>
      <h1 className="display mt-2 text-4xl sm:text-5xl">Think you know what happens next?</h1>
      <p className="mt-3 max-w-xl text-base text-muted">
        Wrong. is a prediction game about real-world events. Make your calls,
        choose how sure you are, and see how your judgment holds up when the results arrive.
      </p>

      <ol className="mt-6 space-y-3">
        <li className="card">
          <h2 className="font-bold">1. Make your prediction</h2>
          <p className="mt-1 text-sm text-muted">You have <strong className="text-ink">30 seconds per question</strong> to choose YES or NO, select your confidence, and tap <strong className="text-ink">Lock It In</strong>. If time runs out, that question is skipped.</p>
        </li>
        <li className="card">
          <h2 className="font-bold">2. Choose how sure you are</h2>
          <p className="mt-1 text-sm text-muted">Pick 60%, 70%, 80%, or 90% confidence. Locked predictions are final. Once the real-world outcome is confirmed, correct predictions add that many points to your <strong className="text-ink">Edge score</strong>; incorrect predictions subtract them. An 80% prediction earns +80 points if correct or −80 if incorrect.</p>
        </li>
        <li className="card">
          <h2 className="font-bold">3. Track how you think</h2>
          <p className="mt-1 text-sm text-muted">After each prediction, choose what informed your answer: <strong className="text-ink">Intuition, Research, or Experience</strong>. Save that choice to continue. Writing a personal reflection is optional.</p>
        </li>
      </ol>

      <div className="mt-5 rounded-2xl border border-line bg-ink/[0.03] p-4 text-sm">
        <p><strong>Your daily game:</strong> Make up to {DAILY_CAP} predictions. Your allowance resets at midnight in your timezone. Complete all {DAILY_CAP} daily predictions to build your streak.</p>
        <p className="mt-2"><strong>Your results:</strong> Predictions stay pending until their real-world outcomes are confirmed. Visit <strong>You</strong> to see your prediction history and accuracy. Visit <strong>Boards</strong> to compare Edge scores with other players.</p>
      </div>

      <div className="mt-6">
        <Link href="/play/round" prefetch={false} className="btn-accent w-full text-base sm:w-auto sm:min-w-48">Play</Link>
        <p className="mt-2 text-sm text-muted">The question timer starts when you enter the game.</p>
        {!user && <p className="mt-2 text-sm text-muted">You’ll need to <Link href="/login" className="underline">sign in</Link> or <Link href="/signup" className="underline">create an account</Link> to play.</p>}
      </div>
    </div>
  );
}
