import { HookSlide } from "./templates/HookSlide";
import { PredictionSlide } from "./templates/PredictionSlide";
import { CTASlide } from "./templates/CTASlide";
import { COLORS, type CardColors } from "./theme";
import type { Slide as SlideData } from "./types";

type Props = {
  slide: SlideData;
  index: number;
  total: number;
  colors?: CardColors;
};

/**
 * Dispatcher — pick the right template for the slide variant.
 * Used by both the studio (browser HTML) and the Satori PNG endpoint.
 */
export function Slide({ slide, index, total, colors = COLORS }: Props) {
  switch (slide.type) {
    case "hook":
      return <HookSlide slide={slide} index={index} total={total} colors={colors} />;
    case "prediction":
      return <PredictionSlide slide={slide} index={index} total={total} colors={colors} />;
    case "cta":
      return <CTASlide slide={slide} index={index} total={total} colors={colors} />;
  }
}
