"use client";
import {useEffect,useRef,useState} from "react";
import {filename,type WeeklyDeck} from "@/cards/weekly";

type PngFile={file:File;url:string;index:number};
type Props={decks:WeeklyDeck[];deckIndex:number;available:number[];onSelect:(index:number)=>void;onClose:()=>void;onExported:()=>Promise<void>};
function canShareFiles(files:File[]){
 try{return files.length>0&&typeof navigator.share==="function"&&typeof navigator.canShare==="function"&&navigator.canShare({files});}catch{return false;}
}
function downloadPng(png:PngFile){
 const link=document.createElement("a");link.href=png.url;link.download=png.file.name;document.body.appendChild(link);link.click();link.remove();
}
export default function PngDownloads({decks,deckIndex,available,onSelect,onClose,onExported}:Props){
 // Freeze the rendered revision while the sheet is open; status updates must not refetch it.
 const [snapshot]=useState(()=>({decks,deckIndex}));
 const deck=snapshot.decks[snapshot.deckIndex];
 const dialog=useRef<HTMLDialogElement>(null);
 const [files,setFiles]=useState<PngFile[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [attempt,setAttempt]=useState(0);
 const [sharing,setSharing]=useState(false);
 const saved=useRef(new Set<number>());
 const ready=files.length===deck.slides.length&&!loading;
 const shareable=ready&&canShareFiles(files.map(p=>p.file));
 useEffect(()=>{dialog.current?.showModal();},[]);
 useEffect(()=>{
  const abort=new AbortController();const urls:string[]=[];
  setFiles([]);setError("");setNotice("");setLoading(true);saved.current.clear();
  async function render(){
   try{
    for(let index=0;index<deck.slides.length;index++){
     const response=await fetch("/api/admin/card-batches/png",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({decks:snapshot.decks,deckIndex:snapshot.deckIndex,index}),signal:abort.signal});
     if(!response.ok||!response.headers.get("Content-Type")?.includes("image/png"))throw Error(`Could not prepare slide ${index+1}. Please retry.`);
     const blob=await response.blob();if(abort.signal.aborted)return;
     const file=new File([blob],filename(deck,index),{type:"image/png"});
     const url=URL.createObjectURL(file);urls.push(url);setFiles(previous=>[...previous,{file,url,index}]);
    }
   }catch(e){if(!abort.signal.aborted)setError((e as Error).message);}
   finally{if(!abort.signal.aborted)setLoading(false);}
  }
  void render();
  return()=>{abort.abort();urls.forEach(url=>URL.revokeObjectURL(url));};
 },[attempt,deck,snapshot]);
 async function markSaved(indices:number[]){
  indices.forEach(i=>saved.current.add(i));
  if(saved.current.size===deck.slides.length){
   try{await onExported();}catch{setError("Your PNGs are ready, but the exported status could not be saved. You can still download every slide below.");}
  }
 }
 function downloadAll(){
  if(!ready)return;
  files.forEach(downloadPng);setNotice("PNG downloads requested. You can also save each slide individually below.");void markSaved(files.map(p=>p.index));
 }
 async function saveAll(){
  if(!ready||sharing)return;
  if(!shareable){downloadAll();return;}
  setError("");setSharing(true);
  try{
   // Files are already prepared. This call runs directly in the tap gesture,
   // preserving the user activation required by iOS/Android share sheets.
   await navigator.share({files:files.map(p=>p.file),title:`Wrong. — Deck ${deckIndex+1}`});
   setNotice("PNG files shared. Choose the save option offered by your phone.");await markSaved(files.map(p=>p.index));
  }catch(e){
   if((e as Error).name!=="AbortError")setError("Could not open your phone’s save/share menu. Use Download PNG files or the individual PNG buttons below.");
  }finally{setSharing(false);}
 }
 return <dialog ref={dialog} onCancel={onClose} aria-labelledby="png-title" className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-3xl max-h-[88dvh] overflow-y-auto rounded-2xl border border-line bg-paper p-5 text-ink shadow-xl backdrop:bg-black/60">
  <div className="flex items-start justify-between gap-4"><div><h2 id="png-title" className="display text-3xl">Download PNGs</h2><p className="mt-2 text-sm text-muted">Full-size images, one per slide. No ZIP needed.</p></div><button type="button" aria-label="Close PNG downloads" className="p-2" onClick={onClose}>✕</button></div>
  <label className="mt-5 block"><span className="label">Deck</span><select aria-label="PNG deck" className="input w-full" value={deckIndex} onChange={e=>onSelect(Number(e.target.value))}>{available.map(i=><option key={i} value={i}>Deck {i+1} — {decks[i].slides[0]?.text.slice(0,60)}</option>)}</select></label>
  <div className="sticky top-0 z-10 -mx-1 mt-4 flex flex-wrap gap-3 bg-paper px-1 py-3"><button type="button" className="btn-accent" disabled={!ready||sharing} onClick={saveAll}>{loading?`Preparing PNGs ${files.length}/${deck.slides.length}…`:`Save all ${deck.slides.length} PNGs`}</button>{shareable&&<button type="button" className="btn-outline" disabled={sharing} onClick={downloadAll}>Download PNG files</button>}</div>
  <p role="status" aria-live="polite" className="mt-2 text-sm">{notice||(!loading&&ready?"Slides are numbered in posting order. Tap any PNG to open it full-size.":"Preparing your full-resolution slides…")}</p>
  {error&&<p role="alert" className="mt-3 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}{!ready&&!loading&&<button type="button" className="ml-3 underline" onClick={()=>setAttempt(n=>n+1)}>Retry PNGs</button>}</p>}
  <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">{files.map(p=><section key={p.index} className="rounded-xl border border-line bg-white p-2"><a href={p.url} target="_blank" rel="noreferrer" aria-label={`Open slide ${p.index+1} PNG`}><img src={p.url} alt={`Deck ${deckIndex+1}, slide ${p.index+1}`} className="w-full rounded-lg" width={1080} height={1920}/></a><a href={p.url} download={p.file.name} onClick={()=>{setNotice(`Slide ${p.index+1} PNG download requested.`);void markSaved([p.index]);}} className="btn-outline mt-2 w-full text-xs">↓ PNG {String(p.index+1).padStart(2,"0")}</a></section>)}</div>
 </dialog>;
}
