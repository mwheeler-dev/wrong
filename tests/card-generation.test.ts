import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cardGenerationOptions,parseGeneratedDeck,generateCardDeck} from '../src/cards/generation';
import {makeWeek,validateBatch,qa} from '../src/cards/weekly';
const fixture={hook:"Think you know sports? Prove it.",kicker:"FIVE CALLS. NO HIDING.",cta:"See how wrong you really are.",caption:"Make your calls. #Wrong #Sports #Predictions",predictions:Array.from({length:5},(_,i)=>({text:`Will team ${i+1} win its next scheduled game?`,category:"Sports",yesPct:30+i*10}))};
test('AI decks contain seven editable standalone slides and survive persistence validation',()=>{
 const out=parseGeneratedDeck(fixture);assert.equal(out.slides.length,7);assert.equal(out.slides[1].source,'Illustrative split');assert.equal(out.slides[1].yesPct,30);assert.equal(out.slides[1].questionId,undefined);
 const batch=makeWeek('2026-11-02');batch[0]={...batch[0],...out};const roundTrip=validateBatch(JSON.parse(JSON.stringify(batch)));
 assert.deepEqual(roundTrip[0].slides,out.slides.map(s=>({...s,questionId:undefined,kicker:s.kicker,subtext:s.subtext,category:s.category,yesPct:s.yesPct,source:s.source})));
 assert.ok(!qa(roundTrip[0],[],roundTrip).some(s=>/live question|duplicate/.test(s)));
});
test('blank slots are not falsely marked as duplicates',()=>{const batch=makeWeek('2026-11-02');assert.ok(!qa(batch[0],[],batch).some(s=>/duplicate question|repeated across/.test(s)));});
test('malformed AI output and repeated predictions are rejected',()=>{
 assert.throws(()=>parseGeneratedDeck({...fixture,predictions:fixture.predictions.slice(1)}));
 assert.throws(()=>parseGeneratedDeck(fixture,[fixture.predictions[0].text]));
 assert.throws(()=>parseGeneratedDeck({...fixture,predictions:fixture.predictions.map(q=>({...q,yesPct:101}))}));
 assert.throws(()=>cardGenerationOptions({topic:'x'.repeat(351)}));
 assert.throws(()=>cardGenerationOptions({category:'not-a-category'}));
});
test('generation uses standalone copy without database or live-question inputs',async()=>{
 const original=global.fetch;const old=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-only';
 try{
  global.fetch=async (_url,init)=>{const body=JSON.parse(String(init?.body));assert.match(body.instructions,/STANDALONE EXAMPLES/);assert.equal(body.store,false);assert.equal(body.input,JSON.stringify(cardGenerationOptions({topic:'Sports'})));return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(fixture)}]}]});};
  const result=await generateCardDeck(cardGenerationOptions({topic:'Sports'}));assert.equal(result.slides.length,7);
  global.fetch=async()=>new Response('',{status:429});await assert.rejects(()=>generateCardDeck(cardGenerationOptions({})),/usage limit/);
 }finally{global.fetch=original;if(old===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=old;}
});
