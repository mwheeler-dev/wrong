import {
  COLORS,
  SLIDE_HEIGHT,
  SLIDE_PADDING,
  SLIDE_WIDTH,
  TYPE_SCALE,
  autoFitSize,
} from "../theme";
import type { CTASlide as CTASlideData } from "../types";

type Props = {
  slide: CTASlideData;
  index: number;
  total: number;
};

/**
 * Slide 7 — the close. Lime background so the carousel ends loud.
 */
export function CTASlide({ slide, index, total }: Props) {
  const size = autoFitSize(slide.text, TYPE_SCALE.cta);

  return (
    <div
      style={{
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        display: "flex",
        flexDirection: "column",
        backgroundColor: COLORS.lime,
        color: COLORS.ink,
        padding: SLIDE_PADDING,
        fontFamily: "Inter",
      }}
    >
      {/* Top row: brand + counter */}
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
          <span>.</span>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "0.18em",
            color: COLORS.inkDim,
          }}
        >
          {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </div>
      </div>

      {/* Big CTA line */}
      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          fontSize: size,
          fontWeight: 900,
          lineHeight: 0.92,
          letterSpacing: "-0.045em",
        }}
      >
        {slide.text}
      </div>

      {/* Bottom: subtext + chunky underline accent */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {slide.subtext && (
          <div
            style={{
              display: "flex",
              fontSize: 44,
              fontWeight: 900,
              letterSpacing: "-0.02em",
            }}
          >
            {slide.subtext}
          </div>
        )}
        <div
          style={{
            display: "flex",
            marginTop: 32,
            width: 220,
            height: 12,
            backgroundColor: COLORS.ink,
            borderRadius: 999,
          }}
        />
      </div>
    </div>
  );
}
