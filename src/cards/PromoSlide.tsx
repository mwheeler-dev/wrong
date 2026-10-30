import { deckColors } from "./theme";
import { Slide } from "./Slide";
import type { Slide as SlideData } from "./types";
import type { WeeklyDeck } from "./weekly";
/** The same templates used by the original Example Slides and PNG endpoint. */
export function PromoSlide({deck,index}:{deck:WeeklyDeck;index:number}) {
 const s=deck.slides[index];
 const slide:SlideData=s.type==="hook"
  ?{type:"hook",text:s.text||"Your hook here",kicker:s.kicker??deck.series}
  :s.type==="cta"
   ?{type:"cta",text:s.text||"See how wrong you really are.",subtext:s.subtext??"Wrong."}
   :{type:"prediction",question:s.text||"Your prediction here",category:s.category||deck.category,yesPct:s.yesPct??50,noPct:100-(s.yesPct??50),source:s.source??"Illustrative split"};
 return <Slide slide={slide} index={index} total={deck.slides.length} colors={deckColors(deck)} format={s.format}/>;
}
