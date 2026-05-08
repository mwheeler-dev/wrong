"use client";

import Link from "next/link";
import { useState } from "react";
import { QuestionCard, type QuestionForPlay } from "./QuestionCard";
import { ConfidenceSelector } from "./ConfidenceSelector";
import { Timer } from "./Timer";
import { ResultCard, type CrowdStats } from "./ResultCard";
import type { Answer, Confidence } from "@/lib/scoring";

type Props = {
  questions: QuestionForPlay[];
};

type SubmitResponse = {
  prediction: { answer: Answer; confidence: number; score: number | null };
  question: { correctAnswer: Answer | null };
  crowd: CrowdStats;
  feedback: string;
};

export function PlayClient({ questions }: Props) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // round complete state
  const [done, setDone] = useState(false);
  const [reflection, setReflection] = useState("");
  const [reflectionSaved, setReflectionSaved] = useState(false);

  if (questions.length === 0) {
    return (
      <div className="wrap pt-12">
        <h1 className="display text-4xl">Nothing to predict.</h1>
        <p className="mt-3 text-muted">
          You're all caught up for today. Reality is busy resolving.
        </p>
        <Link href="/dashboard" className="btn-outline mt-6">See your dashboard</Link>
      </div>
    );
  }

  const current = questions[index];
  const total = questions.length;
  const progress = ((index) / total) * 100;

  function next() {
    setAnswer(null);
    setConfidence(null);
    setResult(null);
    setError(null);
    if (index + 1 >= total) {
      setDone(true);
    } else {
      setIndex(index + 1);
    }
  }

  async function lockIn() {
    if (!answer || !confidence) return;
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
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save your prediction.");
        setSubmitting(false);
        return;
      }
      setResult(data);
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleTimerExpire() {
    if (result) return; // already submitted
    // Auto-skip: do not record a prediction; user can come back via dashboard
    next();
  }

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

  if (done) {
    return (
      <div className="wrap pt-10">
        <h1 className="display text-5xl">Locked in.</h1>
        <p className="mt-3 text-muted">
          Reality will get back to you. Most questions resolve within a few days.
        </p>

        <div className="card mt-8">
          <div className="label">One last thing</div>
          <h2 className="display mt-1 text-3xl">What would change your mind?</h2>
          <p className="mt-2 text-sm text-muted">Optional. A quick note for future-you.</p>

          {!reflectionSaved ? (
            <>
              <textarea
                className="input mt-4 min-h-[120px]"
                placeholder="A new piece of evidence, a person changing their tune, a number crossing a line..."
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
              />
              <div className="mt-3 flex gap-2">
                <button onClick={saveReflection} className="btn-primary">Save</button>
                <button
                  onClick={() => setReflectionSaved(true)}
                  className="btn-ghost"
                >
                  Skip
                </button>
              </div>
            </>
          ) : (
            <p className="mt-3 text-muted">Saved. Reality is on the clock.</p>
          )}
        </div>

        <div className="mt-8 flex gap-3">
          <Link href="/dashboard" className="btn-accent">See your dashboard</Link>
          <Link href="/" className="btn-ghost">Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap pt-4">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted">
        <span>{index + 1} / {total}</span>
        <span>How wrong are you today?</span>
      </div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-ink/10">
        <div className="h-full bg-ink transition-all" style={{ width: `${progress}%` }} />
      </div>

      {!result && (
        <div className="mt-4">
          <Timer seconds={30} resetKey={current.id} onExpire={handleTimerExpire} />
        </div>
      )}

      <div className="mt-4">
        {!result ? (
          <>
            <QuestionCard
              question={current}
              answer={answer}
              onSelectAnswer={setAnswer}
              disabled={submitting}
            />

            <div className="card mt-4">
              <ConfidenceSelector value={confidence} onChange={setConfidence} disabled={submitting} />
              {error && <p className="mt-3 text-sm text-bad">{error}</p>}
              <button
                onClick={lockIn}
                disabled={!answer || !confidence || submitting}
                className="btn-accent mt-5 w-full text-base"
              >
                {submitting ? "Saving..." : "Lock It In"}
              </button>
            </div>
          </>
        ) : (
          <>
            <ResultCard
              answer={result.prediction.answer}
              confidence={result.prediction.confidence}
              correctAnswer={result.question.correctAnswer}
              score={result.prediction.score}
              crowd={result.crowd}
              feedback={result.feedback}
            />
            <button onClick={next} className="btn-primary mt-4 w-full text-base">
              {index + 1 >= total ? "Finish" : "Next question"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
