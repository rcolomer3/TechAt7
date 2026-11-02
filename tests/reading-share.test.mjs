import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
async function load(name){
 const source=await readFile(new URL('../src/'+name+'.ts',import.meta.url),'utf8');
 const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
 return import('data:text/javascript;base64,'+Buffer.from(outputText).toString('base64'));
}
const {readPosition}=await load('reading-state');
const {shareNews}=await load('share-news');
const record={version:1,day:'2026-11-02',view:{tab:'Anteriores',date:'2026-11-01',filter:'Seguridad'},y:900,anchor:'news-story',offset:-70,expanded:['story']};
test('restores the edition, category, visible story and expanded summaries',()=>{
 assert.deepEqual(readPosition(JSON.stringify(record),'2026-11-02'),record);
});
test('notification links take priority over the remembered view',()=>{
 const restored=readPosition(JSON.stringify(record),'2026-11-02','2026-10-31');
 assert.deepEqual(restored.view,{tab:'Anteriores',date:'2026-10-31',filter:'Todas'});
 assert.equal(restored.y,0);assert.deepEqual(restored.expanded,[]);
 assert.equal(readPosition(JSON.stringify(record),'2026-11-02','2026-11-02').view.tab,'Hoy');
});
test('a new daily edition starts at the top instead of an old reading position',()=>{
 const restored=readPosition(JSON.stringify({...record,view:{tab:'Hoy',date:'',filter:'Seguridad'}}),'2026-11-03');
 assert.equal(restored.y,0);assert.equal(restored.view.filter,'Todas');assert.deepEqual(restored.expanded,[]);
});
test('unavailable or corrupted storage cannot stop the app from opening',()=>{
 for(const value of [null,'broken','{}',JSON.stringify({...record,view:{tab:'unknown'}})])assert.equal(readPosition(value,'2026-11-02').view.tab,'Hoy');
 const restored=readPosition(JSON.stringify({...record,y:-10,offset:'invalid',expanded:[null,'story',12]}),'2026-11-02');
 assert.equal(restored.y,0);assert.equal(restored.offset,0);assert.deepEqual(restored.expanded,['story']);
});
const article={title:'Noticia de prueba',url:'https://example.com/story'};
test('native sharing receives the original article and does not also copy',async()=>{
 let copied=false,received;
 assert.equal(await shareNews(article,{share:async data=>{received=data;},copy:async()=>{copied=true;}}),'shared');
 assert.deepEqual(received,article);assert.equal(copied,false);
});
test('cancelling the share sheet is quiet and does not copy anything',async()=>{
 let copied=false;
 assert.equal(await shareNews(article,{share:async()=>{throw {name:'AbortError'};},copy:async()=>{copied=true;}}),'cancelled');
 assert.equal(copied,false);
});
test('desktop sharing copies the article URL and offers manual copying if denied',async()=>{
 let copied;
 assert.equal(await shareNews(article,{copy:async text=>{copied=text;}}),'copied');assert.equal(copied,article.url);
 assert.equal(await shareNews(article,{copy:async()=>{throw new Error('denied');}}),'manual');
 assert.equal(await shareNews(article,{}),'manual');
});
