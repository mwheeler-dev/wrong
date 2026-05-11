"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { QuestionCard, type QuestionForPlay } from "./QuestionCard";
import { ConfidenceSelector } from "./ConfidenceSelector";
import { Timer } from "./Timer";
import { ResultCard, type CrowdStats } from "./ResultCard";
import type { Answer, Confidence } from "@/lib/scoring";

type Props = {
  questions: QuestionForPlay[];
  /** Question IDs (subset of `questions`) the user has already answered server-side. */
  initialAnsweredIds: string[];
};

type SubmitResponse = {
  prediction: { answer: Answer; confidence: number; score: number | null };
  question: { correctAnswer: Answer | null };
  crowd: CrowdStats;
  feedback: string;
};

export function PlayClient({ questions, initialAnsweredIds }: Props) {
  const router = useRouter();

  // SOURCE OF TRUTH for progress.
  // - Always a Set<string>, so adding the same id multiple times is idempotent.
  // - Seeded from the server's snapshot of today's answered ids on mount.
  // - Grown on a successful predict (200) AND on a duplicate-detected predict
  //   (409) — both routes through the same setter, both go through Set
  //   semantics. Re-answering the same question can NEVER inflate the count.
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(
    () => new Set(initialAnsweredIds),
  );

  // Session-only "I gave up on this for now" set. Used purely so that the UI
  // can advance past a question whose timer expired without persisting a
  // prediction. NOT counted in progress. Wiped on remount, so on the next
  // /play visit, skipped questions reappear (per spec point 6: active = first
  // not in answeredIds).
  const [skippedIds, setSkippedIds] = useState<Set<string>>(() => new Set());

  // Current selections / submission state
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Round token covering the questions remaining at mount time
  const [roundToken, setRoundToken] = useState<string | null>(null);
  const tokenRequestedRef = useRef(false);

  // Reflection state for the completion screen
  const [reflection, setReflection] = useState("");
  const [reflectionSaved, setReflectionSaved] = useState(false);

  // Idempotent helper: add a single id to answeredIds, no-op if already in.
  function recordAnswered(id: string) {
    setAnsweredIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }

  // Additively merge any newer server-known answered ids into local state.
  // We never REMOVE locally. If router cache serves a momentarily stale
  // payload (e.g. immediately after a predict before revalidate propagates),
  // local progress survives the merge.
  useEffect(() => {
    if (initialAnsweredIds.length === 0) return;
    setAnsweredIds((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const id of initialAnsweredIds) {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [initialAnsweredIds]);

  // ── DERIVED STATE ──────────────────────────────────────────────────────
  // `current` is computed strictly from the spec: the first question in
  // today's batch whose id is not in answeredIds. Within a session we also
  // exclude `skippedIds` so the UI doesn't loop on a question whose timer
  // expired — but `skippedIds` does not affect progress or persistence.
  const passedIds = useMemo(() => {
    const s = new Set<string>(answeredIds);
    for (const id of skippedIds) s.add(id);
    return s;
  }, [answeredIds, skippedIds]);

  const remaining = useMemo(
    () => questions.filter((q) => !passedIds.has(q.id)),
    [questions, passedIds],
  );
  const current = remaining[0] ?? null;

  const total = questions.length;
  // PROGRESS DEFINITION — used by both the "X / total" label and the bar.
  // Equal to the Streak/dashboard definition: count of UNIQUE questionIds in
  // today's batch the user has actually predicted on.
  const uniqueAnsweredCount = answeredIds.size;
  const progressPct = total === 0 ? 0 : (uniqueAnsweredCount / total) * 100;
  const allAnswered = total > 0 && uniqueAnsweredCount >= total;

  // ── ROUND TOKEN ────────────────────────────────────────────────────────
  // Request once at mount, signed for the questions that are unanswered at
  // mount time. Per-question deadlines on the server are relative to this
  // token's iat, so the first question always gets a fresh 30s window.
  useEffect(() => {
    if (tokenRequestedRef.current) return;
    tokenRequestedRef.current = true;

    const initialRemaining = questions.filter(
      (q) => !initialAnsweredIds.includes(q.id),
    );
    if (initialRemaining.length === 0) return;

    (async () => {
      try {
        const res = await fetch("/api/play/round", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionIds: initialRemaining.map((q) => q.id),
          }),
        });
        const data = await res.json();
        if (res.ok && data.roundToken) {
          setRoundToken(data.roundToken);
        }
      } catch {
        // Submission will surface a "missing round token" error if this fails.
      }
    })();
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── EARLY SCREENS ──────────────────────────────────────────────────────
  // 0 published today
  if (total === 0) {
    return (
      <div className="wrap pt-12">
        <h1 className="display text-4xl">Nothing to predict.</h1>
        <p className="mt-3 text-muted">
          You&apos;re all caught up. Reality is busy resolving.
        </p>
        <Link href="/dashboard" className="btn-outline mt-6">
          See your dashboard
        </Link>
      </div>
    );
  }

  // All unique questions answered, and the user has dismissed the last result
  // (or never opened one because they returned to /play after finishing).
  if (allAnswered && !result) {
    return (
      <DoneScreen
        reflection={reflection}
        setReflection={setReflection}
        reflectionSaved={reflectionSaved}
        setReflectionSaved={setReflectionSaved}
      />
    );
  }

  // No current and no result, but not yet at 10/10 → everything remaining was
  // skipped this session. Offer to bring them back.
  if (!current && !result) {
    return (
      <div className="wrap pt-12">
        <h1 className="display text-4xl">A few left.</h1>
        <p className="mt-3 text-muted">
          {uniqueAnsweredCount} of {total} answered. The rest are still open —
          bring them back to try again.
        </p>
        <button
          className="btn-accent mt-6"
          onClick={() => {
            setSkippedIds(new Set());
            // Old token's deadlines may have lapsed — mint a fresh one for
            // the now-unanswered subset.
            const fresh = questions.filter((q) => !answeredIds.has(q.id));
            if (fresh.length === 0) return;
            setRoundToken(null);
            void (async () => {
              try {
                const res = await fetch("/api/play/round", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    questionIds: fresh.map((q) => q.id),
                  }),
                });
                const data = await res.json();
                if (res.ok && data.roundToken) {
                  setRoundToken(data.roundToken);
                }
              } catch {}
            })();
          }}
        >
          Bring them back
        </button>
      </div>
    );
  }

  function goNext() {
    setAnswer(null);
    setConfidence(null);
    setResult(null);
    setError(null);
  }

  async function lockIn() {
    if (!current || !answer || !confidence) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/play/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: current.id,
          answer,
          confidence,
          roundToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Duplicate submission: the server already has a prediction for this
        // (userId, questionId). Treat as already answered, do NOT show a
        // result card (we have no fresh response data for it), record the id
        // idempotently (Set semantics → never double-counts), and move on.
        if (res.status === 409) {
          recordAnswered(current.id);
          // Refresh the route cache so the next navigation to /play sees the
          // accurate answered set.
          router.refresh();
          setSubmitting(false);
          goNext();
          return;
        }
        setError(data.error || "Could not save your prediction.");
        setSubmitting(false);
        return;
      }

      // Success.
      recordAnswered(current.id);
      setResult(data);
      // Keep the Router Cache for /play in sync so a back-navigation from
      // any other route returns to the correct next question. The server
      // also calls revalidatePath('/play') as a server-side backstop.
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleTimerExpire() {
    if (!current || result) return;
    // Skip this question for the rest of this session. Does NOT touch
    // answeredIds and therefore does NOT touch progress. The question will
    // reappear on remount because it remains absent from answeredIds.
    setSkippedIds((prev) => {
      if (prev.has(current.id)) return prev;
      const next = new Set(prev);
      next.add(current.id);
      return next;
    });
    goNext();
  }

  return (
    <div className="wrap pt-3 sm:pt-4">
      {/* Progress strictly = unique answered count. Matches Streak. */}
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted">
        <span className="tabular-nums">
          {uniqueAnsweredCount} / {total}
        </span>
        <span>How wrong are you today?</span>
      </div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-ink/10">
        <div
          className="h-full bg-ink transition-all"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {!result && current && (
        <div className="mt-3 sm:mt-4">
          <Timer
            seconds={30}
            resetKey={current.id}
            onExpire={handleTimerExpire}
          />
        </div>
      )}

      <div className="mt-3 sm:mt-4">
        {result ? (
          <>
            <ResultCard
              answer={result.prediction.answer}
              confidence={result.prediction.confidence}
              correctAnswer={result.question.correctAnswer}
              score={result.prediction.score}
              crowd={result.crowd}
              feedback={result.feedback}
            />
            <button
              onClick={goNext}
              className="btn-primary mt-3 w-full text-base sm:mt-4"
            >
              {allAnswered ? "Finish" : "Next question"}
            </button>
          </>
        ) : current ? (
          <>
            <QuestionCard
              question={current}
              answer={answer}
              onSelectAnswer={setAnswer}
              disabled={submitting}
            />
            <div className="card mt-3 sm:mt-4">
              <ConfidenceSelector
                value={confidence}
                onChange={setConfidence}
                disabled={submitting}
              />
              {error && <p className="mt-3 text-sm text-bad">{error}</p>}
              <button
                onClick={lockIn}
                disabled={!answer || !confidence || submitting || !roundToken}
                className="btn-accent mt-5 w-full text-base"
              >
                {submitting
                  ? "Saving..."
                  : !roundToken
                    ? "Preparing round..."
                    : "Lock It In"}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function DoneScreen({
  reflection,
  setReflection,
  reflectionSaved,
  setReflectionSaved,
}: {
  reflection: string;
  setReflection: (s: string) => void;
  reflectionSaved: boolean;
  setReflectionSaved: (b: boolean) => void;
}) {
  async function saveReflection() {
    if (!reflection.trim()) {
      setReflectionSaved(true);
      return;
    }
    await fetch("/api/play/reflection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: reflection.trim() }),
    });
    setReflectionSaved(true);
  }

  return (
    <div className="wrap pt-8 sm:pt-10">
      <h1 className="display text-4xl sm:text-5xl">Locked in.</h1>
      <p className="mt-3 text-muted">
        Reality will get back to you. Most questions resolve within a few days.
      </p>

      <div className="card mt-8">
        <div className="label">One last thing</div>
        <h2 className="display mt-1 text-2xl sm:text-3xl">
          What would change your mind?
        </h2>
        <p className="mt-2 text-sm text-muted">
          Optional. A quick note for future-you.
        </p>

        {!reflectionSaved ? (
          <>
            <textarea
              className="input mt-4 min-h-[120px]"
              placeholder="A new piece of evidence, a person changing their tune, a number crossing a line..."
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={saveReflection}
                className="btn-primary flex-1 sm:flex-none"
              >
                Save
              </button>
              <button
                onClick={() => setReflectionSaved(true)}
                className="btn-ghost flex-1 sm:flex-none"
              >
                Skip
              </button>
            </div>
          </>
        ) : (
          <p className="mt-3 text-muted">Saved. Reality is on the clock.</p>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-2 sm:flex-row">
        <Link href="/dashboard" className="btn-accent w-full sm:w-auto">
          See your dashboard
        </Link>
        <Link href="/" className="btn-ghost w-full sm:w-auto">
          Home
        </Link>
      </div>
    </div>
  );
}
