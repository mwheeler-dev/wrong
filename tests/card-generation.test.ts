import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cardGenerationOptions,parseGeneratedDeck,generateCardDeck} from '../src/cards/generation';
import {makeWeek,validateBatch,qa} from '../src/cards/weekly';
const fixture={hook:"Think you know sports? Prove it.",kicker:"FIVE CALLS. NO HIDING.",cta:"See how wrong you really are.",caption:"Make your calls. #Wrong #Sports #Predictions",predictions:Array.from({length:5},(_,i)=>({text:`Will team ${i+1} win its next scheduled game?`,category:"Sports",yesPct:30+i*10}))};
test('AI decks contain seven editable standalone slides and survive persistence validation',()=>{
 const out=parseGeneratedDeck(fixture);assert.equal(out.slides.length,7);assert.equal(out.slides[1].source,'Illustrative split');assert.equal(out.slides[1].yesPct,30);assert.equal(out.slides[1].questionId,undefined);
 const batch=makeWeek('2026-11-02');batch[0]={...batch[0],...out};const roundTrip=validateBatch(JSON.parse(JSON.stringify(batch)));
 assert.deepEqual(roundTrip[0].slides,out.slides.map(s=>({...s,questionId:undefined,kicker:s.kicker,subtext:s.subtext,category:s.category,yesPct:s.yesPct,source:s.source,format:s.format})));
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
  global.fetch=async (_url,init)=>{const body=JSON.parse(String(init?.body));assert.match(body.instructions,/STANDALONE EXAMPLES/);assert.equal(body.store,false);assert.equal(JSON.parse(body.input).topic,'Sports');assert.equal(JSON.parse(body.input).requestedPredictions,5);return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(fixture)}]}]});};
  const result=await generateCardDeck(cardGenerationOptions({topic:'Sports'}));assert.equal(result.slides.length,7);
  global.fetch=async()=>new Response('',{status:429});await assert.rejects(()=>generateCardDeck(cardGenerationOptions({})),/usage limit/);
 }finally{global.fetch=original;if(old===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=old;}
});
test('duplicate repair preserves four good cards and requests only the missing prediction',async()=>{
 const original=global.fetch;const old=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-only';let calls=0;
 const excluded=fixture.predictions[0].text;
 try{
  global.fetch=async (_url,init)=>{
   calls++;const body=JSON.parse(String(init?.body));const input=JSON.parse(body.input);
   const raw=calls===1?fixture:{...fixture,predictions:[{text:'Will a different contender win its next game?',category:'Sports',yesPct:61}]};
   if(calls===2){assert.equal(input.requestedPredictions,8);assert.equal(body.text.format.schema.properties.predictions.minItems,8);assert.ok(input.assignments.length===8);assert.ok(input.excludeTexts.includes(fixture.predictions[4].text));}
   return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(raw)}]}]});
  };
  const deck=await generateCardDeck(cardGenerationOptions({excludeTexts:[excluded]}));assert.equal(calls,2);assert.equal(deck.slides.length,7);assert.equal(deck.slides[1].text,fixture.predictions[1].text);assert.equal(deck.slides[5].text,'Will a different contender win its next game?');
 }finally{global.fetch=original;if(old===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=old;}
});
test('custom palette and slide formatting survive server validation',()=>{
 const batch=makeWeek('2026-11-02');batch[0].customColors={ink:'#102030',paper:'#fff0ee',lime:'#65abcd'};batch[0].slides[0].format={alignment:'center',fontScale:0.85};const saved=validateBatch(JSON.parse(JSON.stringify(batch)));
 assert.deepEqual(saved[0].customColors,batch[0].customColors);assert.deepEqual(saved[0].slides[0].format,batch[0].slides[0].format);
 assert.throws(()=>validateBatch(batch.map((d,i)=>i===0?{...d,customColors:{ink:'red',paper:'#ffffff',lime:'#123456'}}:d)));
 assert.throws(()=>validateBatch(batch.map((d,i)=>i===0?{...d,slides:d.slides.map(s=>({...s,format:{alignment:'diagonal'}}))}:d)));
});
