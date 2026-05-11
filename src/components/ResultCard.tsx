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
      <div className="flex items-baseline justify-between gap-2">
        <span className="label">Locked in</span>
        <p className="text-sm">
          <strong>{answer}</strong>
          <span className="text-muted"> @ </span>
          <strong>{confidence}%</strong>
        </p>
      </div>

      <div className="mt-4 rounded-2xl bg-ink p-4 text-paper sm:p-5">
        {resolved ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wider opacity-70">Reality says</div>
              <div className="display mt-1 text-4xl sm:text-5xl">{correctAnswer}</div>
            </div>
            <div className={`display text-4xl sm:text-5xl ${positive ? "text-accent" : "text-bad"}`}>
              {positive ? "+" : ""}
              {score}
            </div>
          </div>
        ) : (
          <>
            <div className="text-[11px] uppercase tracking-wider opacity-70">Reality says</div>
            <div className="display mt-1 text-3xl">Pending.</div>
          </>
        )}
        <p className="mt-3 text-sm opacity-90">
          {resolved ? feedback : "We'll score this when it resolves."}
        </p>
      </div>

      <div className="mt-4">
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
          Avg. confidence {crowd.averageConfidence}% · {crowd.totalPredictions} prediction
          {crowd.totalPredictions === 1 ? "" : "s"}
        </div>
      </div>
    </div>
  );
}
