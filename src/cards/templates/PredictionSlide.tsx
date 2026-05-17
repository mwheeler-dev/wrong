import {
  COLORS,
  SLIDE_HEIGHT,
  SLIDE_PADDING,
  SLIDE_WIDTH,
  TYPE_SCALE,
  autoFitSize,
} from "../theme";
import type { PredictionSlide as PredictionSlideData } from "../types";

type Props = {
  slide: PredictionSlideData;
  index: number;
  total: number;
};

/**
 * Slides 2–6 — the predictions.
 * White bg. Category pill on top, huge question center, two YES/NO bars
 * stacked, with the leading bar filled in lime to create instant tension.
 */
export function PredictionSlide({ slide, index, total }: Props) {
  const size = autoFitSize(slide.question, TYPE_SCALE.question);
  const yesLeads = slide.yesPct >= slide.noPct;

  return (
    <div
      style={{
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        display: "flex",
        flexDirection: "column",
        backgroundColor: COLORS.paper,
        color: COLORS.ink,
        padding: SLIDE_PADDING,
        fontFamily: "Inter",
      }}
    >
      {/* Top row: category pill + counter */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {slide.category ? (
          <div
            style={{
              display: "flex",
              backgroundColor: COLORS.ink,
              color: COLORS.paper,
              padding: "16px 28px",
              borderRadius: 999,
              fontSize: 28,
              fontWeight: 900,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            {slide.category}
          </div>
        ) : (
          <div style={{ display: "flex" }} />
        )}
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

      {/* The question — auto-fit, takes the available middle space.
          paddingBottom guarantees a gutter above the bars even when text
          wraps to its max line count. */}
      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          fontSize: size,
          fontWeight: 900,
          lineHeight: 0.96,
          letterSpacing: "-0.04em",
          marginTop: 48,
          paddingBottom: 56,
        }}
      >
        {slide.question}
      </div>

      {/* Two stacked bars */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <YesNoBar label="YES" pct={slide.yesPct} leading={yesLeads} />
        <div style={{ display: "flex", height: 28 }} />
        <YesNoBar label="NO" pct={slide.noPct} leading={!yesLeads} />
      </div>

      {/* Bottom row: brand + optional source */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 56,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            fontSize: 40,
            fontWeight: 900,
            letterSpacing: "-0.04em",
          }}
        >
          <span>Wrong</span>
          <span style={{ color: COLORS.lime }}>.</span>
        </div>
        {slide.source && (
          <div
            style={{
              display: "flex",
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: "0.14em",
              color: COLORS.inkDim,
              textTransform: "uppercase",
            }}
          >
            {slide.source}
          </div>
        )}
      </div>
    </div>
  );
}

function YesNoBar({
  label,
  pct,
  leading,
}: {
  label: string;
  pct: number;
  leading: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: leading ? COLORS.lime : COLORS.paper,
        borderColor: COLORS.ink,
        borderStyle: "solid",
        borderWidth: leading ? 0 : 6,
        color: COLORS.ink,
        borderRadius: 999,
        padding: "44px 64px",
        fontSize: 110,
        fontWeight: 900,
        letterSpacing: "-0.03em",
        // Compensate the height delta from the missing border on the
        // leading bar so the two bars align visually
        ...(leading ? { padding: "50px 70px" } : {}),
      }}
    >
      <span style={{ display: "flex" }}>{label}</span>
      <span style={{ display: "flex" }}>{pct}%</span>
    </div>
  );
}
