// Server-side validation for admin-submitted deck payloads.
// Keeps the trust boundary tight — DB only ever stores a well-shaped Slide[].

import type { Post, Slide } from "./types";

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

function asString(value: unknown, field: string, opts: { max?: number; min?: number } = {}): string {
  if (typeof value !== "string") throw new ValidationError(`${field} must be a string`);
  const trimmed = value.trim();
  if (opts.min != null && trimmed.length < opts.min) {
    throw new ValidationError(`${field} must be at least ${opts.min} character(s)`);
  }
  if (opts.max != null && trimmed.length > opts.max) {
    throw new ValidationError(`${field} must be at most ${opts.max} character(s)`);
  }
  return trimmed;
}

function asOptionalString(value: unknown, field: string, opts: { max?: number } = {}): string | undefined {
  if (value == null) return undefined;
  if (typeof value !== "string") throw new ValidationError(`${field} must be a string`);
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (opts.max != null && trimmed.length > opts.max) {
    throw new ValidationError(`${field} must be at most ${opts.max} character(s)`);
  }
  return trimmed;
}

function asPct(value: unknown, field: string): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) throw new ValidationError(`${field} must be a number`);
  if (n < 0 || n > 100) throw new ValidationError(`${field} must be between 0 and 100`);
  return Math.round(n);
}

function validateSlide(raw: unknown, idx: number): Slide {
  if (typeof raw !== "object" || raw === null) {
    throw new ValidationError(`slide ${idx + 1} must be an object`);
  }
  const obj = raw as Record<string, unknown>;
  switch (obj.type) {
    case "hook":
      return {
        type: "hook",
        text: asString(obj.text, `slide ${idx + 1} (hook) text`, { min: 1, max: 200 }),
        kicker: asOptionalString(obj.kicker, `slide ${idx + 1} (hook) kicker`, { max: 80 }),
      };
    case "prediction":
      return {
        type: "prediction",
        question: asString(obj.question, `slide ${idx + 1} (prediction) question`, { min: 1, max: 200 }),
        yesPct: asPct(obj.yesPct, `slide ${idx + 1} (prediction) yesPct`),
        noPct: asPct(obj.noPct, `slide ${idx + 1} (prediction) noPct`),
        category: asOptionalString(obj.category, `slide ${idx + 1} (prediction) category`, { max: 40 }),
        source: asOptionalString(obj.source, `slide ${idx + 1} (prediction) source`, { max: 60 }),
      };
    case "cta":
      return {
        type: "cta",
        text: asString(obj.text, `slide ${idx + 1} (cta) text`, { min: 1, max: 160 }),
        subtext: asOptionalString(obj.subtext, `slide ${idx + 1} (cta) subtext`, { max: 60 }),
      };
    default:
      throw new ValidationError(`slide ${idx + 1}: unknown type "${String(obj.type)}"`);
  }
}

export type DeckInput = {
  slug: string;
  title: string;
  notes?: string;
  slides: Slide[];
};

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export function validateDeck(raw: unknown): DeckInput {
  if (typeof raw !== "object" || raw === null) {
    throw new ValidationError("payload must be an object");
  }
  const obj = raw as Record<string, unknown>;

  const slug = asString(obj.slug, "slug", { min: 2, max: 60 }).toLowerCase();
  if (!SLUG_RE.test(slug)) {
    throw new ValidationError("slug must be lowercase letters, numbers, and hyphens");
  }

  const title = asString(obj.title, "title", { min: 1, max: 80 });
  const notes = asOptionalString(obj.notes, "notes", { max: 280 });

  if (!Array.isArray(obj.slides) || obj.slides.length < 3) {
    throw new ValidationError("slides must be an array of at least 3 entries");
  }
  if (obj.slides.length > 12) {
    throw new ValidationError("slides cannot exceed 12 entries");
  }
  const slides = obj.slides.map((s, i) => validateSlide(s, i));

  return { slug, title, notes, slides };
}

export function deckInputToPost(d: DeckInput): Post {
  return { slug: d.slug, title: d.title, notes: d.notes, slides: d.slides };
}

export { ValidationError };
