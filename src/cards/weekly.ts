import { CARD_THEMES, deckTheme, type CardTextFormat, type CustomCardColors } from "./theme";
export const templates = ["Bold Challenge", "Confidence Trap", "Reality Check", "Category Clash"] as const;
export const series = ["Prove You’re Right", "Confidence Trap", "Reality Check", "Category Battles / Hot Takes"];
export type PromoSlide = { type: "hook" | "prediction" | "cta"; text: string; questionId?: string; format?: CardTextFormat; kicker?: string; subtext?: string; category?: string; yesPct?: number; source?: string };
export type WeeklyDeck = { id: string; series: string; category: string; template: number; theme?: number; customColors?: CustomCardColors; accent: boolean; slot: string; caption: string; exported: boolean; scheduled: boolean; slides: PromoSlide[] };
export type LiveQuestion = { id: string; text: string; category: string; status: string; publishDate: string; closesToPredictionsAt: string | null; resolutionDate: string; resolutionCriteria: string; correctAnswer: string | null };
export function makeWeek(week: string): WeeklyDeck[] {
 const decks: WeeklyDeck[] = [];
 for(let day=0;day<7;day++) {
  const date=new Date(week+"T12:00:00Z"); date.setUTCDate(date.getUTCDate()+day);
  const times=day===6?["12:00","19:00"]:day===5?["11:00","16:00","20:00"]:["12:00","17:30","20:30"];
  for(const time of times) {
   const i=decks.length; const s=i<8?0:i<13?1:i<17?2:3;
   decks.push({id:`deck-${i+1}`,series:series[s],category:"Mixed",template:s,theme:i%CARD_THEMES.length,accent:true,slot:date.toISOString().slice(0,10)+"T"+time,caption:"",exported:false,scheduled:false,slides:[{type:"hook",text:["Think you know what happens next?","How sure are you, really?","Time for a reality check.","Which side are you on?"][s]},...Array.from({length:5},()=>({type:"prediction" as const,text:""})),{type:"cta",text:"Prove it on Wrong."}]});
  }
 } return decks;
}
export function qa(deck: WeeklyDeck, questions: LiveQuestion[], all: WeeklyDeck[]): string[] {
 const issues:string[]=[];
 if(!deck.caption.trim()) issues.push("Add a caption");
 if(!deck.slot || !Number.isFinite(Date.parse(deck.slot))) issues.push("Choose a publish slot");
 if(all.some(d=>d.id!==deck.id&&d.slot===deck.slot)) issues.push("Duplicate publish slot");
 const seen=new Set<string>();
 deck.slides.forEach((s,i)=>{
  if(!s.text.trim()) issues.push(`Slide ${i+1}: add copy`);
  if(s.text.length>130) issues.push(`Slide ${i+1}: possible text overflow`);
  if(s.type!=="prediction") return;
  const q=questions.find(q=>q.id===s.questionId);
  if(q) {
   if(q.status!=="PENDING" || (q.closesToPredictionsAt||q.resolutionDate).slice(0,10)<=deck.slot.slice(0,10)) issues.push(`Slide ${i+1}: resolved or closing on/before posting day — review timing`);
   if(q.publishDate.slice(0,10)>deck.slot.slice(0,10)) issues.push(`Slide ${i+1}: question not published yet`);
  }
  const key=s.questionId||s.text.trim().toLowerCase();
  if(!key) return;
  if(seen.has(key)) issues.push(`Slide ${i+1}: duplicate question in deck`); seen.add(key);
  if(all.some(d=>d.id!==deck.id&&d.slides.some(x=>x.type==="prediction"&&(x.questionId===key||x.text.trim().toLowerCase()===s.text.trim().toLowerCase())))) issues.push(`Slide ${i+1}: repeated across decks`);
 });
 return issues;
}
export function validateBatch(raw: unknown): WeeklyDeck[] {
 if(!Array.isArray(raw)||raw.length!==20) throw new Error("A batch must contain 20 decks");
 const ids=new Set<string>();
 return raw.map(d=>{
  if(!d||typeof d!=="object"||typeof d.id!=="string"||ids.has(d.id)) throw new Error("Invalid deck ID"); ids.add(d.id);
  for(const k of ["id","series","category","slot","caption"]) if(typeof d[k]!=="string"||d[k].length>(k==="caption"?4000:160)) throw new Error(`Invalid ${k}`);
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(d.slot)||!Number.isFinite(Date.parse(d.slot))) throw new Error("Invalid slot");
  if(!Number.isInteger(d.template)||d.template<0||d.template>3) throw new Error("Invalid template");
  if(d.theme!==undefined&&(!Number.isInteger(d.theme)||d.theme<0||d.theme>=CARD_THEMES.length)) throw new Error("Invalid theme");
  if(d.customColors!==undefined){
   if(!d.customColors||typeof d.customColors!=="object"||["ink","paper","lime"].some(k=>typeof d.customColors[k]!=="string"||!/^#[0-9a-f]{6}$/i.test(d.customColors[k])))throw new Error("Invalid custom colors");
  }
  if(!Array.isArray(d.slides)||d.slides.length<3||d.slides.length>12) throw new Error("Use 3–12 slides");
  const slides=d.slides.map((s:PromoSlide)=>{
   if(!s||!["hook","prediction","cta"].includes(s.type)||typeof s.text!=="string"||s.text.length>200) throw new Error("Invalid slide");
   if(s.questionId!==undefined&&(typeof s.questionId!=="string"||s.questionId.length>100)) throw new Error("Invalid question reference");
   for(const [key,max] of Object.entries({kicker:80,subtext:60,category:40,source:60})) {
    const value=s[key as keyof PromoSlide];
    if(value!==undefined&&(typeof value!=="string"||value.length>max))throw new Error(`Invalid ${key}`);
   }
   if(s.yesPct!==undefined&&(!Number.isInteger(s.yesPct)||s.yesPct<0||s.yesPct>100))throw new Error("Invalid percentage");
   if(s.format!==undefined){
    if(!s.format||typeof s.format!=="object"||(s.format.alignment!==undefined&&!["left","center","right"].includes(s.format.alignment))||(s.format.fontScale!==undefined&&(typeof s.format.fontScale!=="number"||!Number.isFinite(s.format.fontScale)||s.format.fontScale<0.7||s.format.fontScale>1.15)))throw new Error("Invalid slide formatting");
   }
   return {format:s.format?{alignment:s.format.alignment,fontScale:s.format.fontScale}:undefined,type:s.type,text:s.text,questionId:s.questionId,kicker:s.kicker,subtext:s.subtext,category:s.category,yesPct:s.yesPct,source:s.source};
  });
  return {id:d.id,series:d.series,category:d.category,slot:d.slot,caption:d.caption,template:d.template,theme:d.theme,customColors:d.customColors?{ink:d.customColors.ink,paper:d.customColors.paper,lime:d.customColors.lime}:undefined,accent:d.accent===true,exported:d.exported===true,scheduled:d.scheduled===true,slides};
 });
}
export function filename(d:WeeklyDeck,i:number) {
 const date=d.slot.slice(0,10); const day=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date(date+"T12:00Z").getUTCDay()];
 return `${date}_${day}_${d.slot.slice(11).replace(":", "")}_${String(i+1).padStart(2,"0")}.png`;
}
export function manifest(decks:WeeklyDeck[]) {
 const cell=(v:unknown)=>'"'+String(v).replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';
 return [["deck","series","category","template","theme","publish_local","timezone","caption","exported","scheduled"],...decks.map(d=>[d.id,d.series,d.category,templates[d.template],CARD_THEMES[deckTheme(d)].name,d.slot,"America/New_York",d.caption,d.exported,d.scheduled])].map(row=>row.map(cell).join(",")).join("\r\n");
}
