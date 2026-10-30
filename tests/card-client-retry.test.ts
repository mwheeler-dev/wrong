import {test} from 'node:test';
import assert from 'node:assert/strict';
import {requestCardDeck,CardRequestError} from '../src/cards/generationClient';
test('client automatically retries recoverable errors and respects non-retryable failures',async()=>{
 const original=global.fetch;let calls=0,retries=0;
 try{
  global.fetch=async()=>{calls++;return calls===1?Response.json({error:'Temporary failure',retryable:true},{status:502}):Response.json({deck:{caption:'Example',slides:Array.from({length:7},()=>({type:'hook',text:'Example'}))}});};
  const result=await requestCardDeck({},()=>retries++);assert.equal(calls,2);assert.equal(retries,1);assert.equal(result.slides.length,7);
  calls=0;global.fetch=async()=>{calls++;return Response.json({error:'Sign in',retryable:false},{status:401});};
  await assert.rejects(()=>requestCardDeck({},()=>retries++),(e:unknown)=>e instanceof CardRequestError&&!e.retryable);assert.equal(calls,1);
 }finally{global.fetch=original;}
});
