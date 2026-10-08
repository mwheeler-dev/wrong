"use client";

import { useCallback, useState } from "react";
import { AdminQuestionForm, type EditingQuestion } from "./AdminQuestionForm";
import { CATEGORIES } from "@/lib/scoring";
import type { QuestionDraft } from "@/lib/questionGeneration";
import type { DraftTopic } from "@/lib/questionDiversity";

type ReviewDraft = {
  id: string;
  question: EditingQuestion;
  context: string;
  contextSourceUrl: string;
  contextSourceResearched?: boolean;
  topic: DraftTopic;
  status: "review" | "created" | "skipped";
};

export function AdminQuestionComposer({
  initial,
  generationEnabled,
}: {
  initial: EditingQuestion;
  generationEnabled: boolean;
}) {
  const [mode, setMode] = useState<"manual" | "generate">("manual");
  const [count, setCount] = useState(5);
  const [category, setCategory] = useState("");
  const [focus, setFocus] = useState("");
  const [drafts, setDrafts] = useState<ReviewDraft[]>([]);
  const [index, setIndex] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const current = drafts[index];
  const currentId = current?.id;
  const preserveDraft = useCallback(
    (question: EditingQuestion) => {
      setDrafts((previous) =>
        previous.map((draft) =>
          draft.id === currentId ? { ...draft, question } : draft,
        ),
      );
    },
    [currentId],
  );

  async function generate() {
    if (
      drafts.some((d) => d.status === "review") &&
      !confirm(
        "Replace the unapproved drafts with a new batch? Created questions will remain saved.",
      )
    )
      return;
    setGenerating(true);
    setError(null);
    setNotice(null);
    setGenerationProgress(0);
    const collected: ReviewDraft[] = [];
    const previousTopics = drafts.map((draft) => draft.topic);
    const seed = crypto.randomUUID();
    const failures: string[] = [];
    try {
      for (let offset = 0; offset < count; offset += 5) {
        const size = Math.min(5, count - offset);
        const before = collected.length;
        // One replacement attempt per group: retain usable drafts and fill the
        // missing slots with other stories, without an unbounded retry loop.
        for (
          let attempt = 0;
          attempt < 2 && collected.length - before < size;
          attempt++
        ) {
          try {
            const res = await fetch("/api/admin/questions/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                count: size - (collected.length - before),
                category,
                focus,
                totalCount: count,
                offset,
                seed,
                excludeTexts: collected.map((draft) => draft.question.text),
                excludeTopics: collected.map((draft) => draft.topic),
                previousTopics,
              }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              failures.push(data.error || "Could not generate this group.");
              if ([401, 403, 429, 503].includes(res.status)) break;
            } else if (Array.isArray(data.drafts)) {
              collected.push(
                ...data.drafts.map((draft: QuestionDraft, i: number) => ({
                  id: `${Date.now()}-${offset}-${attempt}-${i}`,
                  question: draft,
                  context: draft.context,
                  contextSourceUrl: draft.contextSourceUrl,
                  contextSourceResearched: draft.contextSourceResearched,
                  topic: {
                    text: draft.text,
                    category: draft.category,
                    subjectKey: draft.subjectKey,
                    storyKey: draft.storyKey,
                    researchSlot: draft.researchSlot,
                    contextSourceUrl: draft.contextSourceUrl,
                  },
                  status: "review" as const,
                })),
              );
              if (collected.length) {
                setDrafts([...collected]);
                setIndex(0);
              }
            }
          } catch {
            failures.push(
              "Connection lost for one group. Other groups continued.",
            );
          }
        }
        setGenerationProgress(offset + size);
      }
      const skipped = count - collected.length;
      if (collected.length) {
        setNotice(
          `${collected.length} of ${count} drafts ready for review.${skipped ? ` ${skipped} slots could not be filled after a replacement attempt; usable drafts were kept.` : ""}`,
        );
      } else {
        setError(
          failures[0] ||
            "No usable drafts were returned. Please try another topic or batch.",
        );
      }
    } finally {
      setGenerating(false);
    }
  }

  function mark(status: ReviewDraft["status"]) {
    setDrafts((previous) =>
      previous.map((d) => (d.id === currentId ? { ...d, status } : d)),
    );
    const next = drafts.findIndex((d, i) => i > index && d.status === "review");
    const earlier = drafts.findIndex(
      (d, i) => i < index && d.status === "review",
    );
    if (next >= 0 || earlier >= 0) setIndex(next >= 0 ? next : earlier);
  }

  return (
    <div>
      <div
        className="mb-3 flex flex-wrap gap-2"
        role="group"
        aria-label="Question creation method"
      >
        <button
          type="button"
          aria-pressed={mode === "manual"}
          disabled={saving}
          className={
            mode === "manual" ? "btn-primary" : "btn-ghost border border-line"
          }
          onClick={() => setMode("manual")}
        >
          Add manually
        </button>
        <button
          type="button"
          aria-pressed={mode === "generate"}
          disabled={saving}
          className={
            mode === "generate" ? "btn-accent" : "btn-ghost border border-line"
          }
          onClick={() => setMode("generate")}
        >
          Generate with AI
        </button>
      </div>
      <div hidden={mode !== "manual"}>
        <AdminQuestionForm initial={initial} />
      </div>
      <div hidden={mode !== "generate"}>
        <div className="card">
          <h3 className="display text-xl">
            Turn current events into questions.
          </h3>
          <p className="mt-2 text-sm text-muted">
            Choose 1–20 drafts. Review and edit each card, then approve it using
            the same form as manual entry.
          </p>
          {!generationEnabled && (
            <p className="mt-3 rounded-2xl border border-line bg-paper p-3 text-sm">
              Setup needed: add <code>OPENAI_API_KEY</code> to Wrong.&apos;s
              Railway variables to enable generation. You can keep adding
              questions manually.
            </p>
          )}
          <fieldset disabled={generating || saving} className="mt-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label>
                <span className="label">Number of questions</span>
                <select
                  aria-label="Number of questions"
                  className="input mt-1"
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                >
                  {Array.from({ length: 20 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="label">Category</span>
                <select
                  aria-label="Category"
                  className="input mt-1"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">Mix of categories</option>
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block">
              <span className="label">Topic or direction (optional)</span>
              <input
                className="input mt-1"
                maxLength={500}
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                placeholder="e.g. this week's music releases and sports matchups"
              />
            </label>
            <button
              type="button"
              disabled={!generationEnabled}
              className="btn-accent"
              onClick={generate}
            >
              {generating
                ? "Researching current events…"
                : drafts.length
                  ? "Generate a new batch"
                  : "Generate questions"}
            </button>
          </fieldset>
          {generating && (
            <p role="status" className="mt-2 text-sm text-muted">
              Researching and drafting… {generationProgress} of {count} checked.
              Usable drafts are kept while missing slots are retried with fresh
              stories.
            </p>
          )}
          {notice && (
            <p role="status" className="mt-3 text-sm">
              {notice}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-3 text-sm text-bad">
              {error}
            </p>
          )}
        </div>
        {current && (
          <section
            aria-label="Review generated questions"
            aria-roledescription="carousel"
            className="mt-4"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p aria-live="polite" className="text-sm font-semibold">
                Draft {index + 1} of {drafts.length} ·{" "}
                {drafts.filter((d) => d.status === "created").length} created
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn-ghost border border-line"
                  disabled={index === 0 || saving || generating}
                  onClick={() => setIndex(index - 1)}
                  aria-label="Previous draft"
                >
                  ← Previous
                </button>
                <button
                  type="button"
                  className="btn-ghost border border-line"
                  disabled={index === drafts.length - 1 || saving || generating}
                  onClick={() => setIndex(index + 1)}
                  aria-label="Next draft"
                >
                  Next →
                </button>
              </div>
            </div>
            <div className="mb-3 rounded-2xl border border-accent/40 bg-accent/5 p-4 text-sm">
              <p>{current.context}</p>
              {current.contextSourceResearched === false && (
                <p className="mt-2 font-semibold">
                  Background source needs review before approval.
                </p>
              )}
              <a
                className="mt-2 inline-block break-all underline"
                href={current.contextSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Read the current-events source ↗
              </a>
            </div>
            {current.status === "review" ? (
              <>
                <AdminQuestionForm
                  key={current.id}
                  initial={current.question}
                  disabled={generating}
                  onDraftChange={preserveDraft}
                  onBusyChange={setSaving}
                  onSaved={() => mark("created")}
                  submitLabel="Approve & create question"
                />
                <button
                  type="button"
                  className="btn-ghost mt-2"
                  disabled={saving || generating}
                  onClick={() => mark("skipped")}
                >
                  Skip this draft
                </button>
              </>
            ) : (
              <div className="card">
                <p role="status" className="font-semibold">
                  {current.status === "created"
                    ? "Question created. It follows the publish schedule you approved."
                    : "Draft skipped. No question was created."}
                </p>
                {current.status === "skipped" && (
                  <button
                    type="button"
                    className="btn-ghost mt-2"
                    disabled={generating}
                    onClick={() =>
                      setDrafts((previous) =>
                        previous.map((d) =>
                          d.id === currentId ? { ...d, status: "review" } : d,
                        ),
                      )
                    }
                  >
                    Review again
                  </button>
                )}
              </div>
            )}
            <p className="mt-2 text-xs text-muted">
              Unapproved drafts stay in this review session. Only “Approve &
              create question” saves a question.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
