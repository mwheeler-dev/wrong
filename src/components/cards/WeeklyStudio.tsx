"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { makeWeek, qa, series, filename, manifest, type WeeklyDeck, type PromoSlide as SlideData } from "@/cards/weekly";
import { PromoSlide } from "@/cards/PromoSlide";
import { zip } from "@/cards/zip";
import { CARD_THEMES, deckTheme } from "@/cards/theme";
import { CATEGORIES } from "@/lib/scoring";

function nextMonday() {
 const d=new Date();d.setDate(d.getDate()+((8-d.getDay())%7||7));
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function download(blob:Blob,name:string) {
 const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
export function complete(d:WeeklyDeck) {return d.slides.every(s=>s.text.trim())&&d.slides.some(s=>s.type==="prediction");}
function Preview({deck,index,width=270}:{deck:WeeklyDeck;index:number;width?:number}) {
 return <div className="overflow-hidden rounded-xl border border-line bg-white" style={{width,height:width*1920/1080}}>
  <div style={{width:1080,height:1920,transform:`scale(${width/1080})`,transformOrigin:"top left",maxWidth:"none"}}><PromoSlide deck={deck} index={index}/></div>
 </div>;
}

export default function WeeklyStudio() {
 const [week,setWeek]=useState(nextMonday);
 const [decks,setDecks]=useState<WeeklyDeck[]>([]);
 const [count,setCount]=useState(20);
 const [category,setCategory]=useState("");
 const [topic,setTopic]=useState("");
 const [selected,setSelected]=useState<number|null>(null);
 const [editing,setEditing]=useState(0);
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [dirty,setDirty]=useState(false);
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");
 const [progress,setProgress]=useState<{done:number;total:number}|null>(null);
 const [failures,setFailures]=useState<number[]>([]);
 const stop=useRef(false);
 const lock=useRef(false);
 const inputRef=useRef<HTMLTextAreaElement>(null);
 const editorRef=useRef<HTMLElement>(null);
 const ready=decks.map((d,i)=>({d,i})).filter(({d})=>complete(d));
 const active=selected===null?undefined:decks[selected];
 const current=active?.slides[editing];

 useEffect(()=>{
  let alive=true;setLoading(true);setDecks([]);setSelected(null);setError("");setMessage("");setFailures([]);
  fetch(`/api/admin/card-batches?week=${week}`,{cache:"no-store"}).then(async r=>{
   if(!r.ok)throw Error("Could not load your saved decks. Reload to try again.");return r.json();
  }).then(data=>{if(alive){setDecks(data.decks||makeWeek(week));setDirty(false);}}).catch(e=>{if(alive)setError(String(e.message));}).finally(()=>{if(alive)setLoading(false);});
  return()=>{alive=false;};
 },[week]);
 useEffect(()=>{
  const warn=(e:BeforeUnloadEvent)=>{if(dirty||busy){e.preventDefault();e.returnValue="";}};
  window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);
 },[dirty,busy]);

 async function persist(next:WeeklyDeck[]) {
  const r=await fetch("/api/admin/card-batches",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({week,decks:next})});
  const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||"Save failed. Keep this tab open and retry Save.");
  setDirty(false);
 }
 function update(patch:Partial<WeeklyDeck>) {
  if(selected===null)return;
  setDecks(ds=>ds.map((d,i)=>i===selected?{...d,...patch,exported:false,scheduled:false}:d));setDirty(true);
 }
 function updateSlide(patch:Partial<SlideData>) {
  if(!active)return;update({slides:active.slides.map((s,i)=>i===editing?{...s,...patch}:s)});
 }
 async function save() {
  if(lock.current)return;lock.current=true;setBusy(true);setError("");
  try{await persist(decks);setMessage("All changes saved.");}catch(e){setError((e as Error).message);}finally{lock.current=false;setBusy(false);}
 }
 async function generate(indices?:number[]) {
  if(lock.current||loading||!decks.length)return;
  const targets=indices||decks.map((d,i)=>({d,i})).filter(({d})=>!complete(d)).slice(0,count).map(({i})=>i);
  if(!targets.length){setMessage("All 20 decks are filled. Open a deck to regenerate it, or start another week.");return;}
  lock.current=true;setBusy(true);setError("");setFailures([]);stop.current=false;setProgress({done:0,total:targets.length});
  let next=decks;let done=0;const failed:number[]=[];
  try{
   await persist(next);
   for(const i of targets){
    if(stop.current)break;
    setMessage(`Generating deck ${i+1} · ${done}/${targets.length} complete`);
    let generated:{caption:string;slides:SlideData[]};
    try{
     const r=await fetch("/api/admin/card-batches/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({topic,category,series:next[i].series,excludeTexts:next.filter((_,j)=>j!==i).flatMap(d=>d.slides.filter(s=>s.type==="prediction"&&s.text.trim()).map(s=>s.text))})});
     const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||"Generation failed. Retry this deck.");
     if(!data.deck||!Array.isArray(data.deck.slides)||data.deck.slides.length!==7)throw Error("AI returned incomplete slides. Retry this deck.");
     generated=data.deck;
    }catch(e){failed.push(i);setFailures([...failed]);setError(`Deck ${i+1}: ${(e as Error).message}`);break;}
    next=next.map((d,j)=>j===i?{...d,...generated,category:category||"Mixed",theme:deckTheme(d),exported:false,scheduled:false}:d);
    setDecks(next);setDirty(true);
    await persist(next); // Checkpoint every completed deck; stop if saving fails.
    done++;setProgress({done,total:targets.length});
   }
   setMessage(`${done} deck${done===1?"":"s"} generated and saved.${stop.current?" Generation stopped.":failed.length?" Retry the failed deck or generate the remaining empty slots.":" Click a deck below to edit its slides."}`);
  }catch(e){setError((e as Error).message);setMessage("Generation paused. Your latest deck is still in this tab; click Save before leaving.");}
  finally{lock.current=false;setBusy(false);setProgress(null);}
 }
 async function exportDecks(indices:number[]) {
  if(lock.current||!indices.length)return;lock.current=true;setBusy(true);setError("");
  try{
   await persist(decks);const files:{name:string;data:Uint8Array}[]=[];
   for(const di of indices){const d=decks[di];for(let i=0;i<d.slides.length;i++){
    setMessage(`Exporting deck ${di+1}, slide ${i+1}/${d.slides.length}`);
    const r=await fetch("/api/admin/card-batches/png",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({decks,deckIndex:di,index:i})});
    if(!r.ok)throw Error(`Could not export deck ${di+1}, slide ${i+1}. Retry export.`);
    files.push({name:`${String(di+1).padStart(2,"0")}_${d.id}/${filename(d,i)}`,data:new Uint8Array(await r.arrayBuffer())});
   }}
   const next=decks.map((d,i)=>indices.includes(i)?{...d,exported:true}:d);
   files.push({name:"manifest.csv",data:new TextEncoder().encode(manifest(next.filter((_,i)=>indices.includes(i))))});
   download(zip(files),`wrong-${week}${indices.length===1?`-deck-${indices[0]+1}`:""}.zip`);
   setDecks(next);setDirty(true);await persist(next);setMessage("PNG decks downloaded. Each folder is in slide order.");
  }catch(e){setError((e as Error).message);}finally{lock.current=false;setBusy(false);}
 }
 function openDeck(i:number) {setSelected(i);setEditing(0);setTimeout(()=>editorRef.current?.scrollIntoView({behavior:"smooth",block:"start"}),0);}
 const input="input w-full";
 return <main className="mx-auto max-w-7xl px-5 py-10 pb-24">
  <Link href="/studio" className="text-sm text-muted">← Card Studio</Link>
  <h1 className="display text-4xl md:text-5xl mt-4">Make your next 20 posts.</h1>
  <p className="text-muted mt-3 max-w-2xl">Generate complete example decks with AI. Pick a topic, edit any slide, and download. Same black, white, and lime designs as the Example Slides.</p>
  <section className="mt-7 rounded-2xl border border-line bg-white p-5 md:p-6">
   <fieldset disabled={busy||loading||!decks.length}>
    <div className="grid gap-4 md:grid-cols-[1fr_2fr_120px]">
     <label><span className="label">Category</span><select aria-label="Category" className={input} value={category} onChange={e=>setCategory(e.target.value)}><option value="">Mix it up</option>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label>
     <label><span className="label">Topic or direction <span className="text-muted">(optional)</span></span><input className={input} maxLength={350} placeholder="NBA rivalries, music hot takes, gaming…" value={topic} onChange={e=>setTopic(e.target.value)}/></label>
     <label><span className="label">Decks</span><select aria-label="Decks" className={input} value={count} onChange={e=>setCount(Number(e.target.value))}>{[1,5,10,20].map(n=><option key={n} value={n}>{n}</option>)}</select></label>
    </div>
    <button className="btn-accent mt-5" onClick={()=>generate()}>✦ Generate {count} deck{count===1?"":"s"} with AI</button>
    <p className="text-xs text-muted mt-3">7 slides per deck · Fresh standalone examples · Editable copy and example percentages · Auto-saved as each deck finishes</p>
   </fieldset>
   {progress&&<div className="mt-5"><progress aria-label="Deck generation progress" value={progress.done} max={progress.total} className="w-full"/><button className="btn-outline mt-2" onClick={()=>{stop.current=true;setMessage("Stopping after the current deck finishes and saves…");}}>Stop after this deck</button><p className="text-xs text-muted mt-2">Keep this tab open while AI generates your decks.</p></div>}
  </section>
  <div role="status" aria-live="polite" className="mt-4 text-sm">{loading?"Loading your decks…":message}</div>
  {error&&<div role="alert" className="mt-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">{error}{failures.length>0&&<button disabled={busy} onClick={()=>generate(failures)} className="ml-3 underline">Retry failed deck</button>}</div>}
  <div className="mt-8 flex flex-wrap items-center justify-between gap-4"><h2 className="display text-2xl">Your decks <span className="text-muted">{ready.length}/20</span></h2><div className="flex flex-wrap gap-3"><button disabled={busy||!dirty} className="btn-outline" onClick={save}>{dirty?"Save changes *":"Saved"}</button><button disabled={busy||!ready.length} className="btn-primary" onClick={()=>exportDecks(ready.map(({i})=>i))}>Download all decks</button></div></div>
  {!loading&&decks.length>0&&ready.length===0&&<div className="mt-5 border border-dashed border-line rounded-2xl p-8 text-center"><p className="font-bold text-xl">Your first batch starts here.</p><p className="text-muted mt-2">AI writes the hook, five predictions, closing slide, and caption for every deck.</p><button disabled={busy} className="mt-4 underline text-sm" onClick={()=>openDeck(0)}>Or write a deck manually</button></div>}
  <div className="mt-5 flex flex-wrap gap-3">{ready.map(({d,i})=><button disabled={busy} key={d.id} aria-label={`Edit deck ${i+1}`} onClick={()=>openDeck(i)} className={`rounded-2xl p-1 text-left border ${selected===i?"border-ink bg-ink/5":"border-line"}`}><Preview deck={d} index={0} width={144}/><p className="mt-2 font-bold text-sm">Deck {i+1} · {d.slides.length} slides</p><p className="text-xs text-muted">{CARD_THEMES[deckTheme(d)].name} · {d.exported?"Exported":"Click to edit"}</p></button>)}</div>

  {active&&current&&<section ref={editorRef} className="mt-10 scroll-mt-24 border-t border-line pt-7">
   <div className="flex flex-wrap justify-between items-center gap-3"><h2 className="display text-3xl">Deck {selected!+1}</h2><div className="flex gap-3"><button disabled={busy} className="btn-outline" onClick={()=>{if(confirm("Replace this deck’s copy with a fresh AI version?"))generate([selected!]);}}>Regenerate deck</button><button disabled={busy||!complete(active)} className="btn-primary" onClick={()=>exportDecks([selected!])}>Download deck</button><button disabled={busy} aria-label="Close deck editor" onClick={()=>setSelected(null)}>✕</button></div></div>
   <p className="mt-2 text-muted text-sm">Click any slide to edit it. Your changes appear immediately.</p>
   <label className="mt-4 block max-w-xs"><span className="label">Deck theme</span><select aria-label="Deck theme" disabled={busy} className={input} value={deckTheme(active)} onChange={e=>update({theme:Number(e.target.value)})}>{CARD_THEMES.map((t,i)=><option key={t.name} value={i}>{t.name}</option>)}</select></label>
   <div className="flex overflow-x-auto gap-3 mt-5 pb-4">{active.slides.map((s,i)=><button key={i} disabled={busy} aria-label={`Edit slide ${i+1}: ${s.type}`} aria-pressed={editing===i} onClick={()=>{setEditing(i);setTimeout(()=>inputRef.current?.focus({preventScroll:true}),0);}} className={`shrink-0 rounded-2xl p-1 border-2 ${editing===i?"border-ink":"border-transparent"}`}><Preview deck={active} index={i} width={162}/><span className="block text-xs mt-2">{i+1} · {s.type}</span></button>)}</div>
   <div className="grid gap-8 lg:grid-cols-[1fr_290px] mt-4">
    <fieldset disabled={busy} className="space-y-4">
     <label className="block"><span className="label">Slide {editing+1} — {current.type==='prediction'?"Example prediction":"Copy"}</span><textarea aria-label={`Slide ${editing+1} — ${current.type==='prediction'?"Example prediction":"Copy"}`} ref={inputRef} className={`${input} min-h-[120px] text-lg`} maxLength={200} value={current.text} onChange={e=>updateSlide({text:e.target.value})}/></label>
     {current.type==='hook'&&<label className="block"><span className="label">Small headline</span><input className={input} maxLength={80} value={current.kicker??active.series} onChange={e=>updateSlide({kicker:e.target.value})}/></label>}
     {current.type==='cta'&&<label className="block"><span className="label">Closing subtext</span><input className={input} maxLength={60} value={current.subtext??"Wrong."} onChange={e=>updateSlide({subtext:e.target.value})}/></label>}
     {current.type==='prediction'&&<><div className="grid grid-cols-2 gap-4"><label><span className="label">Category label</span><input className={input} maxLength={40} value={current.category??active.category} onChange={e=>updateSlide({category:e.target.value})}/></label><label><span className="label">YES % / NO %</span><div className="flex items-center gap-3"><input aria-label="Example yes percentage" className={input} type="number" min={0} max={100} value={current.yesPct??50} onChange={e=>updateSlide({yesPct:Math.max(0,Math.min(100,Math.round(Number(e.target.value)||0)))})}/><span className="shrink-0">/ {100-(current.yesPct??50)}%</span></div></label></div><p className="text-xs text-muted">Example percentages are labeled “Illustrative split” on the card.</p></>}
     <div className="flex flex-wrap gap-4 text-sm"><button disabled={editing===0} onClick={()=>{const slides=[...active.slides];[slides[editing-1],slides[editing]]=[slides[editing],slides[editing-1]];update({slides});setEditing(editing-1);}}>← Move earlier</button><button disabled={editing===active.slides.length-1} onClick={()=>{const slides=[...active.slides];[slides[editing+1],slides[editing]]=[slides[editing],slides[editing+1]];update({slides});setEditing(editing+1);}}>Move later →</button><button disabled={active.slides.length<=3} onClick={()=>{update({slides:active.slides.filter((_,i)=>i!==editing)});setEditing(0);}}>Remove slide</button><button disabled={active.slides.length>=12} onClick={()=>{const slides=[...active.slides];slides.splice(slides.length-1,0,{type:"prediction",text:"",yesPct:50,source:"Illustrative split"});update({slides});setEditing(slides.length-2);}}>+ Add prediction</button></div>
     <label className="block"><span className="label">Caption and hashtags</span><textarea className={`${input} min-h-[100px]`} maxLength={4000} value={active.caption} onChange={e=>update({caption:e.target.value})}/></label>
     <button className="btn-accent" disabled={!dirty} onClick={save}>Save edits</button>
     <details className="border-t border-line pt-4"><summary className="cursor-pointer text-sm font-bold">Schedule & review</summary><div className="space-y-4 mt-4"><label className="block"><span className="label">Series</span><select className={input} value={active.series} onChange={e=>update({series:e.target.value})}>{series.map(s=><option key={s}>{s}</option>)}</select></label><label className="block"><span className="label">Publish slot (New York)</span><input className={input} type="datetime-local" value={active.slot} onChange={e=>update({slot:e.target.value})}/></label><label className="block text-sm"><input type="checkbox" checked={active.scheduled} onChange={e=>{setDecks(ds=>ds.map((d,i)=>i===selected?{...d,scheduled:e.target.checked}:d));setDirty(true);}}/> Scheduled in TikTok</label><ul className="list-disc pl-5 text-sm">{qa(active,[],decks).map((q,i)=><li key={i}>{q}</li>)}</ul></div></details>
    </fieldset>
    <aside className="hidden lg:block"><Preview deck={active} index={editing}/></aside>
   </div>
  </section>}
  <details className="mt-10 border-t border-line pt-5"><summary className="cursor-pointer text-sm font-bold">Weekly calendar & exports</summary><div className="mt-4 space-y-4"><label className="block"><span className="label">Week beginning Monday</span><input disabled={busy||loading} type="date" className="input max-w-xs" value={week} onChange={e=>{if(new Date(e.target.value+"T12:00Z").getUTCDay()!==1){setError("Choose a Monday.");return;}if(!dirty||confirm("Discard unsaved edits and switch weeks?"))setWeek(e.target.value);}}/></label><p className="text-sm">{ready.length}/20 created · {decks.filter(d=>d.exported).length} exported · {decks.filter(d=>d.scheduled).length} scheduled · America/New_York</p><div className="grid grid-cols-2 md:grid-cols-7 gap-2">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((day,n)=><section className="border border-line rounded-xl p-3" key={day}><b>{day}</b>{decks.map((d,i)=>({d,i})).filter(({d})=>Math.round((Date.parse(d.slot.slice(0,10))-Date.parse(week))/86400000)===n).map(({d,i})=><button disabled={busy} className="block text-left text-xs mt-3" key={d.id} onClick={()=>openDeck(i)}>{d.slot.slice(11)} · Deck {i+1}<br/>{d.scheduled?"Scheduled":complete(d)?"Ready to edit":"Empty"}</button>)}</section>)}</div><button className="btn-outline" disabled={!decks.length} onClick={()=>download(new Blob([manifest(decks)],{type:"text/csv"}),`wrong-${week}.csv`)}>Download schedule CSV</button></div></details>
 </main>;
}
