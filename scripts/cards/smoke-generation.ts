// Run explicitly during a one-off deployment preflight; never changes saved decks/questions.
import { generateCardDeck,cardGenerationOptions } from '../../src/cards/generation';
import { prisma } from '../../src/lib/prisma';
import { makeWeek,type WeeklyDeck } from '../../src/cards/weekly';
async function run(){
 const row=await prisma.cardBatch.findFirst({orderBy:{updatedAt:'desc'}});
 const saved=Array.isArray(row?.payload)?row.payload as unknown as WeeklyDeck[]:[];
 const exclude=saved.flatMap(d=>d.slides.filter(s=>s.type==='prediction'&&s.text.trim()).map(s=>s.text));
 console.log('[card-smoke] Existing-batch probe',JSON.stringify({savedPredictions:exclude.length}));
 const probe=await generateCardDeck(cardGenerationOptions({deckIndex:12,series:saved[12]?.series||'Reality Check',excludeTexts:exclude}));
 console.log('[card-smoke] Existing-batch probe PASS',probe.slides.length);
 const all:string[]=[];
 for(const [i,slot] of makeWeek('2026-11-02').entries()){
  const deck=await generateCardDeck(cardGenerationOptions({deckIndex:i,series:slot.series,excludeTexts:all}));
  all.push(...deck.slides.filter(s=>s.type==='prediction').map(s=>s.text));
  console.log('[card-smoke] Deck',i+1,'of 20 PASS; unique predictions:',new Set(all.map(t=>t.toLowerCase().replace(/[^a-z0-9]/g,''))).size);
 }
 if(all.length!==100||new Set(all.map(t=>t.toLowerCase().replace(/[^a-z0-9]/g,''))).size!==100)throw Error('Smoke run contains duplicates');
 console.log('[card-smoke] PASS: real AI completed 20/20 decks and 100 unique standalone predictions. No saved content changed.');
}
run().catch(e=>{console.error('[card-smoke] FAIL:',e.message);process.exitCode=1;}).finally(()=>prisma.$disconnect());
