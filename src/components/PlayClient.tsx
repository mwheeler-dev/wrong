"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { QuestionCard, type QuestionForPlay } from "./QuestionCard";
import { ConfidenceSelector } from "./ConfidenceSelector";
import { Timer } from "./Timer";
import { ResultCard, type CrowdStats } from "./ResultCard";
import { Disclaimer } from "./Disclaimer";
import { Countdown } from "./Countdown";
import { FlameIcon } from "./icons/FlameIcon";
import { TrophyIcon } from "./icons/TrophyIcon";
import { CheckCircleIcon } from "./icons/CheckCircleIcon";
import type { Answer, Confidence } from "@/lib/scoring";

type Props = {
  questions: QuestionForPlay[];
  /** Question IDs (subset of `questions`) the user has already answered. */
  initialAnsweredIds: string[];
  /** Predictions the user has already made today (before this session). */
  todayProgress: number;
  /** Hard cap on predictions per day. */
  dailyCap: number;
  /** The user's next local midnight as an ISO string (UTC instant). */
  nextMidnightIso: string;
};

type SubmitResponse = {
  prediction: { answer: Answer; confidence: number; score: number | null };
  question: { correctAnswer: Answer | null };
  crowd: CrowdStats;
  feedback: string;
};

export function PlayClient({
  questions,
  initialAnsweredIds,
  todayProgress,
  dailyCap,
  nextMidnightIso,
}: Props) {
  const router = useRouter();

  // Source of truth for in-session progress. Set semantics so duplicate
  // submits can't inflate the counter. Seeded from any IDs the server flagged
  // as already-answered (the server pre-filters today, but we keep the prop
  // for defense if a stale RSC payload sneaks one through).
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(
    () => new Set(initialAnsweredIds),
  );
  const [skippedIds, setSkippedIds] = useState<Set<string>>(() => new Set());

  const [answer, setAnswer] = useState<Answer | null>(null);
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [roundToken, setRoundToken] = useState<string | null>(null);
  const tokenRequestedRef = useRef(false);

  const [reflection, setReflection] = useState("");
  const [reflectionSaved, setReflectionSaved] = useState(false);

  function recordAnswered(id: string) {
    setAnsweredIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }

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

  // ── DAILY-CAP-AWARE PROGRESS ──────────────────────────────────────────
  // SERVER-AUTHORITATIVE today count. Seeded from the prop on mount, then
  // replaced by the value returned in each predict response. We never sum
  // a server count with a local set — that's how the count diverged from
  // the dashboard and falsely triggered DoneScreen at 5 real saves.
  const [todayCount, setTodayCount] = useState<number>(todayProgress);
  const totalToday = todayCount;
  const progressPct = dailyCap === 0 ? 0 : Math.min(100, (totalToday / dailyCap) * 100);
  const allDoneToday = totalToday >= dailyCap;

  // Mint the round token once at mount, signed for the unanswered subset.
  // First question gets a fresh 30s deadline because the token's iat is "now".
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
        // surfaces as "missing round token" on submit
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── COMPLETION SCREENS ────────────────────────────────────────────────
  // Done for the day → DoneScreen with reflection prompt + countdown.
  if (allDoneToday && !result) {
    return (
      <DoneScreen
        todayCount={totalToday}
        dailyCap={dailyCap}
        nextMidnightIso={nextMidnightIso}
        reflection={reflection}
        setReflection={setReflection}
        reflectionSaved={reflectionSaved}
        setReflectionSaved={setReflectionSaved}
      />
    );
  }

  // Session-only edge: every remaining question was skipped (timer expired).
  // Offer to bring them back rather than leaving the user stuck.
  if (!current && !result) {
    return (
      <div className="wrap pt-12">
        <h1 className="display text-4xl">A few left.</h1>
        <p className="mt-3 text-muted">
          {totalToday} of {dailyCap} answered today. The rest of this batch was
          skipped — bring them back to try again.
        </p>
        <button
          className="btn-accent mt-6"
          onClick={() => {
            setSkippedIds(new Set());
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
        if (res.status === 409) {
          // Duplicate. The server already has this prediction; it returned
          // the current authoritative count so we sync without an extra
          // round trip. recordAnswered is a no-op for IDs already in the set.
          recordAnswered(current.id);
          if (typeof data.todayCount === "number") {
            setTodayCount(data.todayCount);
          }
          router.refresh();
          setSubmitting(false);
          goNext();
          return;
        }
        // Any non-2xx, non-409 response means the prediction did NOT save.
        // Do NOT touch answeredIds or todayCount — local progress must
        // never count an attempt that failed on the server.
        setError(data.error || "Could not save your prediction.");
        setSubmitting(false);
        return;
      }
      // 2xx success. The server already counted the new prediction; trust
      // its `todayCount` rather than incrementing locally.
      recordAnswered(current.id);
      if (typeof data.todayCount === "number") {
        setTodayCount(data.todayCount);
      }
      setResult(data);
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleTimerExpire() {
    if (!current || result) return;
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
      {/* Progress = today's unique predictions across all sessions */}
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted">
        <span className="tabular-nums">
          {totalToday} / {dailyCap}
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
              {allDoneToday ? "Finish" : "Next question"}
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

      <Disclaimer className="mt-8" />
    </div>
  );
}

function DoneScreen({
  todayCount,
  dailyCap,
  nextMidnightIso,
  reflection,
  setReflection,
  reflectionSaved,
  setReflectionSaved,
}: {
  todayCount: number;
  dailyCap: number;
  nextMidnightIso: string;
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
      <p className="label">Today</p>
      <h1 className="display mt-3 text-4xl sm:text-5xl">
        You’ve made your calls.
      </h1>
      <p className="mt-3 text-muted">
        Now reality decides. Tomorrow brings new predictions.
      </p>

      {/* Day-complete prestige card — flame + trophy, breathing lime halo. */}
      <div className="streak-card mt-8 border border-paper/10">
        <div className="relative flex items-center gap-4 p-5 sm:p-6">
          <FlameIcon className="streak-flame h-12 w-12 shrink-0 text-accent sm:h-14 sm:w-14" />
          <div className="min-w-0 flex-1">
            <p className="label text-accent">Today</p>
            <p className="display streak-number-glow mt-1 text-3xl tabular-nums sm:text-4xl">
              {todayCount}
              <span className="ml-2 text-sm font-bold text-paper/60 sm:text-base">
                / {dailyCap}
              </span>
            </p>
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-paper/55">
              predictions today
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-accent">
              <CheckCircleIcon className="h-3.5 w-3.5" />
              Day complete.
            </p>
          </div>
          <TrophyIcon className="streak-trophy h-12 w-12 shrink-0 text-accent sm:h-14 sm:w-14" />
        </div>
      </div>

      {/* Countdown card */}
      <div className="card mt-3 bg-ink text-paper">
        <p className="label text-paper/60">Reality resets in</p>
        <div className="display mt-2 text-5xl sm:text-6xl">
          <Countdown targetIso={nextMidnightIso} />
        </div>
        <p className="mt-3 text-sm text-paper/70">
          New predictions every midnight, your time.
        </p>
      </div>

      <div className="card mt-3">
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
