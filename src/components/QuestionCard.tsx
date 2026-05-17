"use client";

import clsx from "clsx";
import type { Answer } from "@/lib/scoring";

export type QuestionForPlay = {
  id: string;
  text: string;
  category: string;
  /**
   * Server-rendered natural-language line:
   *   "Predictions close in 6 hours" / "Predictions close tonight" / etc.
   */
  closesLabel: string;
  /**
   * Optional secondary line — present only when the resolve window is
   * meaningfully later than the answer window.
   */
  outcomeLabel?: string | null;
  sourceUrl?: string | null;
};

type Props = {
  question: QuestionForPlay;
  answer: Answer | null;
  onSelectAnswer: (a: Answer) => void;
  disabled?: boolean;
};

export function QuestionCard({
  question,
  answer,
  onSelectAnswer,
  disabled,
}: Props) {
  const len = question.text.length;
  const sizeClass =
    len > 120
      ? "text-xl sm:text-3xl"
      : len > 80
        ? "text-2xl sm:text-3xl"
        : "text-3xl sm:text-4xl";

  return (
    <article className="card fade-in">
      <div className="flex items-start justify-between gap-3">
        <span className="pill-accent shrink-0">{question.category}</span>
        <div className="text-right">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            {question.closesLabel}
          </p>
          {question.outcomeLabel && (
            <p className="mt-0.5 text-[11px] tracking-wider text-muted/80">
              {question.outcomeLabel}
            </p>
          )}
        </div>
      </div>
      <h2 className={`display mt-4 ${sizeClass} sm:mt-5`}>{question.text}</h2>

      {question.sourceUrl && (
        <a
          href={question.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-xs text-muted underline hover:text-ink"
        >
          source
        </a>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-6">
        <AnswerButton
          label="YES"
          selected={answer === "YES"}
          onClick={() => onSelectAnswer("YES")}
          disabled={disabled}
        />
        <AnswerButton
          label="NO"
          selected={answer === "NO"}
          onClick={() => onSelectAnswer("NO")}
          disabled={disabled}
        />
      </div>
    </article>
  );
}

function AnswerButton({
  label,
  selected,
  onClick,
  disabled,
}: {
  label: "YES" | "NO";
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "min-h-[80px] rounded-3xl border-2 py-6 text-2xl font-black tracking-wide transition active:scale-[0.98] sm:py-7 sm:text-3xl",
        selected
          ? "border-ink bg-ink text-paper"
          : "border-ink/15 bg-white text-ink hover:border-ink",
      )}
    >
      {label}
    </button>
  );
}
