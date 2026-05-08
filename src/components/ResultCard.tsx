"use client";

import type { Answer } from "@/lib/scoring";

export type CrowdStats = {
  yesPct: number;
  noPct: number;
  averageConfidence: number;
  totalPredictions: number;
};

type Props = {
  answer: Answer;
  confidence: number;
  correctAnswer: Answer | null; // null = pending
  score: number | null;
  crowd: CrowdStats;
  feedback: string;
};

export function ResultCard({ answer, confidence, correctAnswer, score, crowd, feedback }: Props) {
  const resolved = correctAnswer != null && score != null;
  const positive = (score ?? 0) > 0;

  return (
    <div className="card fade-in">
      <div className="label">Locked in</div>
      <p className="mt-1 text-lg">
        You said <strong>{answer}</strong> @ <strong>{confidence}%</strong>
      </p>

      <div className="mt-5 rounded-2xl bg-ink p-5 text-paper">
        {resolved ? (
          <>
            <div className="text-sm uppercase tracking-wider opacity-70">Reality says</div>
            <div className="display mt-1 text-5xl">{correctAnswer}</div>
            <div className={`display mt-3 text-4xl ${positive ? "text-accent" : "text-bad"}`}>
              {positive ? "+" : ""}
              {score}
            </div>
            <p className="mt-3 text-sm opacity-90">{feedback}</p>
          </>
        ) : (
          <>
            <div className="text-sm uppercase tracking-wider opacity-70">Reality says</div>
            <div className="display mt-1 text-3xl">Pending.</div>
            <p className="mt-3 text-sm opacity-90">We'll score this when it resolves.</p>
          </>
        )}
      </div>

      <div className="mt-5">
        <div className="label">What everyone else said</div>
        <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-ink/10">
          <div className="h-full bg-ink" style={{ width: `${crowd.yesPct}%` }} />
          <div className="h-full bg-accent" style={{ width: `${crowd.noPct}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-muted">
          <span><strong className="text-ink">{crowd.yesPct}%</strong> YES</span>
          <span><strong className="text-ink">{crowd.noPct}%</strong> NO</span>
        </div>
        <div className="mt-2 text-xs text-muted">
          Avg. confidence {crowd.averageConfidence}% · {crowd.totalPredictions} predictions
        </div>
      </div>
    </div>
  );
}
