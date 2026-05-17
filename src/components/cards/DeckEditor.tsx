"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Slide } from "@/cards/types";

type Mode = "create" | "edit";

type Props = {
  mode: Mode;
  /** Required when mode === "edit" */
  id?: string;
  initial?: {
    slug: string;
    title: string;
    notes?: string;
    slides: Slide[];
  };
};

const CATEGORY_OPTIONS = [
  "",
  "Politics",
  "Science",
  "Sports",
  "Tech",
  "Culture",
  "Business",
  "World",
  "Entertainment",
] as const;

const DEFAULT_HOOK = {
  type: "hook" as const,
  text: "I guarantee you'll get at least one wrong.",
  kicker: "",
};
const DEFAULT_PREDICTION = (): Slide => ({
  type: "prediction",
  question: "",
  yesPct: 50,
  noPct: 50,
  category: "",
  source: "",
});
const DEFAULT_CTA = {
  type: "cta" as const,
  text: "See how wrong you really are.",
  subtext: "Wrong.",
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Split incoming slides[] into the three editor sections. */
function partition(slides: Slide[]) {
  const hook = slides.find((s) => s.type === "hook") ?? DEFAULT_HOOK;
  const cta = [...slides].reverse().find((s) => s.type === "cta") ?? DEFAULT_CTA;
  const predictions = slides.filter((s) => s.type === "prediction");
  return {
    hook: { text: hook.text, kicker: hook.kicker ?? "" },
    cta: { text: cta.text, subtext: cta.subtext ?? "Wrong." },
    predictions:
      predictions.length > 0
        ? predictions.map((p) => ({
            question: p.question,
            yesPct: p.yesPct,
            noPct: p.noPct,
            category: p.category ?? "",
            source: p.source ?? "",
          }))
        : [emptyPrediction(), emptyPrediction(), emptyPrediction(), emptyPrediction(), emptyPrediction()],
  };
}

function emptyPrediction() {
  return { question: "", yesPct: 50, noPct: 50, category: "", source: "" };
}

export function DeckEditor({ mode, id, initial }: Props) {
  const router = useRouter();
  const seed = useMemo(
    () => partition(initial?.slides ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!initial?.slug);
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const [hookText, setHookText] = useState(seed.hook.text);
  const [hookKicker, setHookKicker] = useState(seed.hook.kicker);

  const [predictions, setPredictions] = useState(seed.predictions);

  const [ctaText, setCtaText] = useState(seed.cta.text);
  const [ctaSubtext, setCtaSubtext] = useState(seed.cta.subtext);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setPrediction(i: number, patch: Partial<(typeof predictions)[number]>) {
    setPredictions((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }
  function addPrediction() {
    if (predictions.length >= 8) return;
    setPredictions((prev) => [...prev, emptyPrediction()]);
  }
  function removePrediction(i: number) {
    if (predictions.length <= 1) return;
    setPredictions((prev) => prev.filter((_, idx) => idx !== i));
  }

  function buildPayload() {
    const slides: Slide[] = [
      {
        type: "hook",
        text: hookText.trim(),
        kicker: hookKicker.trim() || undefined,
      },
      ...predictions.map<Slide>((p) => ({
        type: "prediction",
        question: p.question.trim(),
        yesPct: Math.max(0, Math.min(100, Math.round(Number(p.yesPct) || 0))),
        noPct: Math.max(0, Math.min(100, Math.round(Number(p.noPct) || 0))),
        category: p.category.trim() || undefined,
        source: p.source.trim() || undefined,
      })),
      {
        type: "cta",
        text: ctaText.trim(),
        subtext: ctaSubtext.trim() || undefined,
      },
    ];
    return {
      slug: slug.trim(),
      title: title.trim(),
      notes: notes.trim() || undefined,
      slides,
    };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload = buildPayload();
      const url = mode === "create" ? "/api/admin/decks" : `/api/admin/decks/${id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not save deck.");
        setSubmitting(false);
        return;
      }
      const finalSlug: string = data.deck?.slug ?? payload.slug;
      router.push(`/studio/${finalSlug}`);
      router.refresh();
    } catch {
      setError("Network error.");
      setSubmitting(false);
    }
  }

  async function onDelete() {
    if (mode !== "edit" || !id) return;
    if (!window.confirm("Delete this deck? This cannot be undone.")) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/decks/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Could not delete deck.");
        setSubmitting(false);
        return;
      }
      router.push("/studio");
      router.refresh();
    } catch {
      setError("Network error.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-10">
      {/* DECK META */}
      <Section
        title="Deck"
        subtitle="Title shows in the studio. Slug is the URL and the PNG path."
      >
        <Row label="Title">
          <input
            className="input"
            required
            maxLength={80}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
          />
        </Row>
        <Row label="Slug">
          <input
            className="input font-mono text-sm"
            required
            pattern="[a-z0-9](?:[a-z0-9-]*[a-z0-9])?"
            maxLength={60}
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value.toLowerCase());
              setSlugTouched(true);
            }}
          />
          <p className="mt-1 text-xs text-muted">Lowercase letters, numbers, hyphens.</p>
        </Row>
        <Row label="Notes (optional)">
          <input
            className="input"
            maxLength={280}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Row>
      </Section>

      {/* HOOK */}
      <Section title="01 — Hook" subtitle="Slide 1. The stop-the-scroll line.">
        <Row label="Kicker (optional, small lime caps above the hook)">
          <input
            className="input"
            maxLength={80}
            value={hookKicker}
            onChange={(e) => setHookKicker(e.target.value)}
          />
        </Row>
        <Row label="Hook text">
          <textarea
            className="input min-h-[100px]"
            required
            maxLength={200}
            value={hookText}
            onChange={(e) => setHookText(e.target.value)}
          />
        </Row>
      </Section>

      {/* PREDICTIONS */}
      <Section
        title={`02–${String(predictions.length + 1).padStart(2, "0")} — Predictions`}
        subtitle="Each prediction is one card. Aim for 3–6."
      >
        <div className="space-y-4">
          {predictions.map((p, i) => (
            <div
              key={i}
              className="rounded-2xl border border-line bg-white p-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Prediction {i + 1}
                </p>
                <button
                  type="button"
                  onClick={() => removePrediction(i)}
                  disabled={predictions.length <= 1 || submitting}
                  className="text-xs text-bad disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
              <div className="mt-3 space-y-3">
                <Row label="Question">
                  <textarea
                    className="input min-h-[72px]"
                    required
                    maxLength={200}
                    value={p.question}
                    onChange={(e) => setPrediction(i, { question: e.target.value })}
                  />
                </Row>
                <div className="grid grid-cols-2 gap-3">
                  <Row label="Category (optional)">
                    <select
                      className="input"
                      value={p.category}
                      onChange={(e) => setPrediction(i, { category: e.target.value })}
                    >
                      {CATEGORY_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c || "—"}
                        </option>
                      ))}
                    </select>
                  </Row>
                  <Row label="Sample size / source (optional)">
                    <input
                      className="input"
                      maxLength={60}
                      placeholder="n = 1,432"
                      value={p.source}
                      onChange={(e) => setPrediction(i, { source: e.target.value })}
                    />
                  </Row>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Row label="YES %">
                    <input
                      className="input"
                      type="number"
                      min={0}
                      max={100}
                      value={p.yesPct}
                      onChange={(e) => {
                        const v = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                        setPrediction(i, { yesPct: v, noPct: 100 - v });
                      }}
                    />
                  </Row>
                  <Row label="NO %">
                    <input
                      className="input"
                      type="number"
                      min={0}
                      max={100}
                      value={p.noPct}
                      onChange={(e) => {
                        const v = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                        setPrediction(i, { noPct: v, yesPct: 100 - v });
                      }}
                    />
                  </Row>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addPrediction}
          disabled={predictions.length >= 8 || submitting}
          className="btn-outline text-sm"
        >
          + Add prediction
        </button>
      </Section>

      {/* CTA */}
      <Section title="Last — CTA" subtitle="Closing slide.">
        <Row label="CTA text">
          <textarea
            className="input min-h-[80px]"
            required
            maxLength={160}
            value={ctaText}
            onChange={(e) => setCtaText(e.target.value)}
          />
        </Row>
        <Row label="Subtext (defaults to Wrong.)">
          <input
            className="input"
            maxLength={60}
            value={ctaSubtext}
            onChange={(e) => setCtaSubtext(e.target.value)}
          />
        </Row>
      </Section>

      {error && <p className="text-sm text-bad">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
        <Link
          href={mode === "edit" && initial ? `/studio/${initial.slug}` : "/studio"}
          className="text-sm text-muted hover:text-ink"
        >
          Cancel
        </Link>
        <div className="flex items-center gap-3">
          {mode === "edit" && (
            <button
              type="button"
              onClick={onDelete}
              disabled={submitting}
              className="btn-ghost text-sm text-bad"
            >
              Delete deck
            </button>
          )}
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting
              ? "Saving..."
              : mode === "create"
                ? "Create deck"
                : "Save changes"}
          </button>
        </div>
      </div>
    </form>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="display text-2xl">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
