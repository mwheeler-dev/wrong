import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeWeek,validateBatch,filename,manifest,qa} from '../src/cards/weekly';
import {zip} from '../src/cards/zip';
import {writeFile} from 'node:fs/promises';
test('weekly defaults and deterministic exports',()=>{const ds=makeWeek('2026-11-02');assert.equal(ds.length,20);assert.equal(ds[19].slot,'2026-11-08T19:00');assert.equal(filename(ds[0],0),'2026-11-02_Mon_1200_01.png');assert.equal(validateBatch(ds).length,20);assert.ok(qa(ds[0],[],ds).length>0);assert.ok(manifest(ds).includes('America/New_York'));assert.throws(()=>validateBatch(ds.slice(1)));});
test('ZIP can be read by standard tools',async()=>{const blob=zip([{name:'01/test.txt',data:new TextEncoder().encode('hello')}]);await writeFile('/tmp/wrong-export-test.zip',Buffer.from(await blob.arrayBuffer()));});
