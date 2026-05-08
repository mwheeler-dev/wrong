"use client";

import clsx from "clsx";
import type { Answer } from "@/lib/scoring";

export type QuestionForPlay = {
  id: string;
  text: string;
  category: string;
  resolutionDate: string; // ISO
  sourceUrl?: string | null;
};

type Props = {
  question: QuestionForPlay;
  answer: Answer | null;
  onSelectAnswer: (a: Answer) => void;
  disabled?: boolean;
};

export function QuestionCard({ question, answer, onSelectAnswer, disabled }: Props) {
  const resolves = new Date(question.resolutionDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <article className="card fade-in">
      <div className="flex items-center justify-between">
        <span className="pill-accent">{question.category}</span>
        <span className="text-xs text-muted">Resolves {resolves}</span>
      </div>
      <h2 className="display mt-5 text-3xl sm:text-4xl">{question.text}</h2>

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

      <div className="mt-6 grid grid-cols-2 gap-3">
        <AnswerButton label="YES" selected={answer === "YES"} onClick={() => onSelectAnswer("YES")} disabled={disabled} />
        <AnswerButton label="NO" selected={answer === "NO"} onClick={() => onSelectAnswer("NO")} disabled={disabled} />
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
        "rounded-3xl border-2 py-7 text-2xl font-black tracking-wide transition active:scale-[0.98]",
        selected ? "border-ink bg-ink text-paper" : "border-ink/20 bg-white text-ink hover:border-ink"
      )}
    >
      {label}
    </button>
  );
}
