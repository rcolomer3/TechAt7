import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../src/news.ts',import.meta.url),'utf8');
const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
const {newsDigests,brief,searchable,limitPerEdition,latestDigest,digestKey}=await import('data:text/javascript;base64,'+Buffer.from(outputText).toString('base64'));
const digests=['2026-11-02','2026-11-03','2026-10-31','2026-11-01'].map(date=>({date}));
test('archive excludes today and future and defaults to all past dates newest first',()=>{
 assert.deepEqual(newsDigests(digests,'2026-11-02','Anteriores').map(d=>d.date),['2026-11-01','2026-10-31']);
 assert.deepEqual(newsDigests(digests,'2026-11-02','Anteriores','2026-11-02'),[]);
 assert.deepEqual(newsDigests(digests,'2026-11-02','Anteriores','2026-10-31').map(d=>d.date),['2026-10-31']);
 assert.deepEqual(newsDigests([],'2026-11-02','Anteriores'),[]);
});
test('today never falls back to yesterday; explore excludes future editions',()=>{
 assert.equal(newsDigests(digests,'2026-11-04','Hoy').length,0);
 assert.deepEqual(newsDigests(digests,'2026-11-02','Hoy').map(d=>d.date),['2026-11-02']);
 assert.equal(newsDigests(digests,'2026-11-02','Explorar').length,3);
});
test('brief uses a complete first sentence and caps very long sentences',()=>{
 assert.equal(brief('Una noticia breve. Más contexto para ampliar.'),'Una noticia breve.');
 assert.equal(brief('Solo una frase.'),'Solo una frase.');
 assert.ok(brief('palabra '.repeat(100)).length<=240);
 assert.equal(brief(''),'');
 assert.equal(searchable('TECNOLOGÍA'),searchable('tecnologia'));
});
test('the daily limit applies to each edition independently',()=>{
 const items=[
  {id:'a',editionDate:'2026-11-03'},{id:'b',editionDate:'2026-11-03'},{id:'c',editionDate:'2026-11-03'},
  {id:'d',editionDate:'2026-11-02'},{id:'e',editionDate:'2026-11-02'},
 ];
 assert.deepEqual(limitPerEdition(items,2).map(item=>item.id),['a','b','d','e']);
 assert.deepEqual(limitPerEdition(items,1).map(item=>item.id),['a','d']);
 assert.deepEqual(limitPerEdition(items,0).map(item=>item.id),['a','b','c','d','e']);
 assert.deepEqual(limitPerEdition(items,-1).map(item=>item.id),['a','b','c','d','e']);
 assert.deepEqual(limitPerEdition([],3),[]);
});
test('sync detects the newest available edition and changes when a new one arrives',()=>{
 const editions=[
  {date:'2026-11-12',articles:[1,2,3]},
  {date:'2026-11-13',articles:[1,2,3,4]},
  {date:'2026-11-11',articles:[1]},
 ];
 assert.equal(latestDigest(editions,'2026-11-12').date,'2026-11-12');
 assert.equal(latestDigest(editions,'2026-11-13').date,'2026-11-13');
 assert.equal(latestDigest(editions,'2026-11-10'),undefined);
 const before=latestDigest(editions,'2026-11-12'),after=latestDigest(editions,'2026-11-13');
 assert.notEqual(digestKey(before),digestKey(after));
 assert.equal(digestKey({date:'2026-11-12',contentHash:'abc',articles:[]}),'2026-11-12:abc');
 assert.equal(digestKey({date:'2026-11-12',articles:[1,2]}),'2026-11-12:2');
});
