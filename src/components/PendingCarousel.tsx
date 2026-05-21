"use client";

import { useEffect, useRef, useState } from "react";
import { hapticSelection } from "@/lib/native";

export type PendingItem = {
  id: string;
  category: string;
  questionText: string;
  answer: string;
  confidence: number;
  resolvesLabel: string;
  /** True when the question is already past its resolution date. Surfaces a
   *  small "awaiting reality" vs "awaiting resolution" distinction. */
  overdue: boolean;
};

type Props = {
  items: PendingItem[];
};

/**
 * Mobile-first "focus wheel" for pending predictions.
 *
 * One card centered, neighbors peeking from either edge, horizontal scroll
 * with CSS scroll-snap. We don't reach for an animation library — native
 * scroll-snap is buttery on mobile and survives momentum / rubber-band
 * gestures without us writing pointer math.
 *
 * The peek width and gap are tuned for a 375px iPhone-class viewport;
 * larger screens get a wider card but the same peek treatment so it still
 * feels like a wheel rather than a grid.
 */
export function PendingCarousel({ items }: Props) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Watch which card is currently snapped into the center via
  // IntersectionObserver, so the "X of Y" indicator stays in sync with
  // whatever the user has flicked to. Cheaper than scroll-position math.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const slides = Array.from(
      scroller.querySelectorAll<HTMLElement>("[data-slide]"),
    );
    if (slides.length === 0) return;

    let lastReported = -1;

    const obs = new IntersectionObserver(
      (entries) => {
        // Pick the entry with the largest intersection ratio — that's the
        // one the snap has parked on.
        let best: IntersectionObserverEntry | null = null;
        for (const e of entries) {
          if (!best || e.intersectionRatio > best.intersectionRatio) best = e;
        }
        if (!best) return;
        const idx = Number((best.target as HTMLElement).dataset.index ?? -1);
        if (idx < 0) return;
        if (best.intersectionRatio < 0.6) return;
        if (idx === lastReported) return;
        lastReported = idx;
        setActiveIndex(idx);
        // Gentle "selection-changed" tap on each new card. Cheaper than
        // light impact so a fast flick doesn't feel buzzy.
        hapticSelection();
      },
      { root: scroller, threshold: [0.6, 0.85, 1] },
    );

    for (const s of slides) obs.observe(s);
    return () => obs.disconnect();
  }, [items.length]);

  if (items.length === 0) {
    return (
      <p className="card text-sm text-muted">
        Nothing pending. Reality is fast today.
      </p>
    );
  }

  const overdueCount = items.filter((i) => i.overdue).length;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted tabular-nums">
          {activeIndex + 1} of {items.length} awaiting reality
        </p>
        {overdueCount > 0 && (
          <p
            className="text-[11px] font-semibold uppercase tracking-wider text-accent"
            title="Past their resolution date — awaiting admin resolution."
          >
            {overdueCount} overdue
          </p>
        )}
      </div>

      <div
        ref={scrollerRef}
        className="pending-carousel mt-3 -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        style={{
          // The first card should sit flush with the surrounding wrap
          // padding (1.25rem = 20px) — same gutter as every other section
          // on the page. The previous version added an extra 2rem on the
          // left, which left a phantom card-shaped gap at the start and
          // made the carousel look mid-scroll on first paint.
          //
          // Right-side padding is generous so the LAST card can still snap
          // to start without sticking to the viewport edge.
          paddingLeft: "1.25rem",
          paddingRight: "3rem",
          scrollPaddingLeft: "1.25rem",
          scrollPaddingRight: "1.25rem",
        }}
      >
        {items.map((item, idx) => (
          <article
            key={item.id}
            data-slide
            data-index={idx}
            // snap-start (not center) so the first card rests at the left
            // gutter on initial render. The next card peeks ~2rem on the
            // right because the card width is narrower than the available
            // horizontal space.
            className="relative w-[calc(100vw-3rem)] max-w-[22rem] shrink-0 snap-start"
          >
            <div
              className={`card h-full transition ${
                item.overdue ? "border-accent/40 shadow-[0_0_0_1px_rgba(184,240,0,0.3)]" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="pill">{item.category}</span>
                <span className="text-[11px] uppercase tracking-wider text-muted">
                  {item.resolvesLabel}
                </span>
              </div>
              <p className="mt-3 line-clamp-4 font-semibold leading-snug">
                {item.questionText}
              </p>
              <p className="mt-3 text-sm text-muted">
                You said{" "}
                <strong className="text-ink">{item.answer}</strong>{" "}
                @ {item.confidence}%
              </p>
              {item.overdue && (
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-accent">
                  Past resolution date · awaiting admin
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
