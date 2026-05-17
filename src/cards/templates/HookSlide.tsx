import {
  COLORS,
  SLIDE_HEIGHT,
  SLIDE_PADDING,
  SLIDE_WIDTH,
  TYPE_SCALE,
  autoFitSize,
} from "../theme";
import type { HookSlide as HookSlideData } from "../types";

type Props = {
  slide: HookSlideData;
  index: number;
  total: number;
};

/**
 * Slide 1 — the hook.
 * Black bg, lime period, huge white type. Designed to stop the scroll.
 */
export function HookSlide({ slide, index, total }: Props) {
  const size = autoFitSize(slide.text, TYPE_SCALE.hook);

  return (
    <div
      style={{
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        display: "flex",
        flexDirection: "column",
        backgroundColor: COLORS.ink,
        color: COLORS.paper,
        padding: SLIDE_PADDING,
        fontFamily: "Inter",
        position: "relative",
      }}
    >
      {/* Top row: brand mark + counter */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            fontSize: 64,
            fontWeight: 900,
            letterSpacing: "-0.04em",
          }}
        >
          <span>Wrong</span>
          <span style={{ color: COLORS.lime }}>.</span>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "0.18em",
            color: COLORS.paperDim,
          }}
        >
          {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </div>
      </div>

      {/* Kicker (optional) */}
      {slide.kicker && (
        <div
          style={{
            display: "flex",
            marginTop: 60,
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: COLORS.lime,
          }}
        >
          {slide.kicker}
        </div>
      )}

      {/* The hook — auto-fit, centered vertically */}
      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          fontSize: size,
          fontWeight: 900,
          lineHeight: 0.95,
          letterSpacing: "-0.04em",
        }}
      >
        {slide.text}
      </div>

      {/* Bottom row: swipe indicator */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          fontSize: 32,
          fontWeight: 700,
          letterSpacing: "0.22em",
          color: COLORS.paperDim,
        }}
      >
        SWIPE →
      </div>
    </div>
  );
}
