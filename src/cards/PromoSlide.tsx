import type { WeeklyDeck } from "./weekly";
export function PromoSlide({deck,index}:{deck:WeeklyDeck;index:number}) {
 const slide=deck.slides[index]; const dark=deck.template===1||deck.template===2; const lime=deck.accent?"#B8F000":dark?"#FAFAFA":"#0A0A0A";
 return <div style={{width:1080,height:1920,display:"flex",flexDirection:"column",padding:"180px 150px 300px 100px",background:dark?"#0A0A0A":"#FAFAFA",color:dark?"#FAFAFA":"#0A0A0A",fontFamily:"Inter",borderTop:`32px solid ${lime}`}}>
 <div style={{display:"flex",fontSize:30,fontWeight:700,color:dark?lime:"#0A0A0A"}}>{["PROVE YOU’RE RIGHT","CONFIDENCE TRAP","REALITY CHECK","CATEGORY CLASH"][deck.template]}</div>
 <div style={{display:"flex",fontSize:26,marginTop:35}}>{deck.category} · {index+1}/{deck.slides.length}</div>
 <div style={{display:"flex",flex:1,alignItems:deck.template===2?"flex-start":"center",paddingTop:deck.template===2?140:0,fontWeight:900,fontSize:slide.text.length>130?62:slide.text.length>80?78:100,lineHeight:1.06,letterSpacing:"-0.04em"}}>{slide.text||"Your copy here"}</div>
 {slide.type==="prediction"&&<div style={{display:"flex",gap:35,fontSize:60,fontWeight:900}}><span style={{background:lime,color:"#0A0A0A",padding:30}}>YES</span><span style={{border:"4px solid",padding:26}}>NO</span></div>}
 <div style={{display:"flex",marginTop:55,fontSize:25}}>{slide.type==="prediction"?"Promotional wording · Exact question on Wrong.":"Make your call."}</div>
 <div style={{display:"flex",marginTop:45,fontWeight:900,fontSize:52}}>Wrong.</div>
 </div>;
}
