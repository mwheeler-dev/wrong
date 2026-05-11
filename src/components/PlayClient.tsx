"use client";

import Link from "next/link";
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
  // IDs the user has answered. Seeded from the server's view (covers anything
  // persisted before this mount) and grown locally when the user answers more
  // questions in this session.
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(
    () => new Set(initialAnsweredIds),
  );
  // IDs the user skipped this session (timer expired). Session-only.
  const [skippedIds, setSkippedIds] = useState<Set<string>>(() => new Set());

  // Selections for the current question
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Server-issued round token covering the questions remaining at mount time
  const [roundToken, setRoundToken] = useState<string | null>(null);
  const tokenRequestedRef = useRef(false);

  // Reflection / completion state
  const [reflection, setReflection] = useState("");
  const [reflectionSaved, setReflectionSaved] = useState(false);
  const [doneAcknowledged, setDoneAcknowledged] = useState(false);

  // Whenever the server-provided answered set grows (e.g. via revalidatePath
  // bumping the route after a previous submission), merge it into our local
  // state. This is purely additive — we never forget locally-answered IDs.
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

  // Derived: questions to actually play, in order, skipping anything already
  // passed (answered or skipped). `current` is always the next unanswered.
  const passedIds = useMemo(() => {
    const s = new Set(answeredIds);
    for (const id of skippedIds) s.add(id);
    return s;
  }, [answeredIds, skippedIds]);

  const remaining = useMemo(
    () => questions.filter((q) => !passedIds.has(q.id)),
    [questions, passedIds],
  );
  const current = remaining[0] ?? null;

  // Position display: question N of M (1-based, in the full batch)
  const total = questions.length;
  const displayPosition = result
    ? // result is for the just-answered question; show its number
      total - remaining.length
    : // showing the live question; show its 1-based slot
      total - remaining.length + 1;

  // Request a round token once, signed for the questions remaining at mount.
  // Per-question deadlines on the server are relative to this token's iat,
  // so signing only the unanswered subset gives the first one a fresh 30s.
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
        // Submission will surface a "missing round token" error if this fails
      }
    })();
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // No questions to play at all — empty pipeline
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

  // Round complete: all questions in today's batch have been answered/skipped.
  const allDone = current == null && !result;
  if (allDone) {
    return <DoneScreen
      reflection={reflection}
      setReflection={setReflection}
      reflectionSaved={reflectionSaved}
      setReflectionSaved={setReflectionSaved}
      doneAcknowledged={doneAcknowledged}
      setDoneAcknowledged={setDoneAcknowledged}
    />;
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
        // Defensive: if the server already has this prediction (stale view,
        // duplicate submit, etc.), treat it as answered and move on instead
        // of getting stuck on the error.
        if (res.status === 409) {
          setAnsweredIds((prev) => new Set(prev).add(current.id));
          setSubmitting(false);
          goNext();
          return;
        }
        setError(data.error || "Could not save your prediction.");
        setSubmitting(false);
        return;
      }
      // Success: lock in locally so the current question is removed from
      // `remaining` and the next render shows the result card.
      setAnsweredIds((prev) => new Set(prev).add(current.id));
      setResult(data);
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleTimerExpire() {
    if (!current || result) return;
    // Skip this question this session without recording a prediction.
    setSkippedIds((prev) => new Set(prev).add(current.id));
    goNext();
  }

  return (
    <div className="wrap pt-3 sm:pt-4">
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted">
        <span className="tabular-nums">
          {displayPosition} / {total}
        </span>
        <span>How wrong are you today?</span>
      </div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-ink/10">
        <div
          className="h-full bg-ink transition-all"
          style={{ width: `${((displayPosition - (result ? 0 : 1)) / total) * 100}%` }}
        />
      </div>

      {!result && current && (
        <div className="mt-3 sm:mt-4">
          <Timer seconds={30} resetKey={current.id} onExpire={handleTimerExpire} />
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
              {remaining.length === 0 ? "Finish" : "Next question"}
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
  doneAcknowledged,
  setDoneAcknowledged,
}: {
  reflection: string;
  setReflection: (s: string) => void;
  reflectionSaved: boolean;
  setReflectionSaved: (b: boolean) => void;
  doneAcknowledged: boolean;
  setDoneAcknowledged: (b: boolean) => void;
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

      {!doneAcknowledged && (
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
                  onClick={() => {
                    setReflectionSaved(true);
                    setDoneAcknowledged(true);
                  }}
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
      )}

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
