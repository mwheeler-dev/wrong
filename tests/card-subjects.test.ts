import {test} from 'node:test';
import assert from 'node:assert/strict';
import {subjectAssignments} from '../src/cards/subjects';
import {cardGenerationOptions} from '../src/cards/generation';
test('twenty mixed decks receive 100 distinct positive subject/angle assignments',()=>{
 const all=Array.from({length:20},(_,i)=>subjectAssignments('',i,0,5)).flat();
 assert.equal(all.length,100);assert.equal(new Set(all.map(p=>`${p.category}|${p.subject}|${p.angle}`)).size,100);
 assert.equal(all.filter(p=>p.category==='Sports').length,25);
 assert.notDeepEqual(subjectAssignments('',12,0,5),subjectAssignments('',12,1,8).slice(0,5));
});
test('a focused category also gets distinct assignments across a 20-deck run',()=>{
 const all=Array.from({length:20},(_,i)=>subjectAssignments('Sports',i,0,5)).flat();
 assert.equal(new Set(all.map(p=>`${p.subject}|${p.angle}`)).size,100);assert.ok(all.every(p=>p.category==='Sports'));
 assert.equal(cardGenerationOptions({excludeTexts:Array(65).fill('Example')}).deckIndex,13);
 assert.throws(()=>cardGenerationOptions({deckIndex:20}));
});
