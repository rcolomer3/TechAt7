import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateEdition,rejectRepeats,deliverOnce,planPublication,editionHash,categories} from '../scripts/edition.mjs';
import {hash} from '../scripts/core.mjs';
const sentences=['El fabricante ha publicado una actualización de seguridad para sus teléfonos móviles.','La nueva versión corrige un fallo que permitía acceder a datos privados del usuario.','El cambio protege las cuentas almacenadas en el dispositivo frente a ese acceso.','La actualización ya se puede descargar desde los ajustes del sistema del teléfono.'];
const input=()=>({schemaVersion:1,date:'2026-11-01',language:'es',producer:'chatgpt',articles:Array.from({length:10},(_,i)=>({title:'Una actualización protege los datos de los teléfonos '+i,storyKey:'fabricante correccion seguridad '+i,category:'Seguridad',sentences,sources:[{name:'Fuente '+i,url:`https://medio${i%3}.example/noticia-${i}`,publishedAt:'2026-10-31T12:00:00Z'}]}))});
test('accepts a complete Spanish edition and preserves the full summary',()=>{const edition=validateEdition(input(),'2026-11-01');assert.equal(edition.articles.length,10);assert.equal(edition.articles[0].summary,sentences.join(' '));});
test('rejects the old one-headline English edition, wrong dates and short snippets',()=>{
 const x=input();x.articles=x.articles.slice(0,1);assert.throws(()=>validateEdition(x,x.date),/10–20/);
 const tooMany=input();tooMany.articles=Array.from({length:21},(_,i)=>({...input().articles[0],title:'Una actualización protege los datos de los teléfonos '+i,storyKey:'fabricante correccion seguridad '+i,sources:[{...input().articles[0].sources[0],url:`https://extra.example/noticia-${i}`}]}));assert.throws(()=>validateEdition(tooMany,tooMany.date),/10–20/);
 assert.throws(()=>validateEdition(input(),'2026-11-02'),/Fecha/);
 const y=input();y.articles[0].title='Announcing new builds for all users';assert.throws(()=>validateEdition(y,y.date),/español/);
 const z=input();z.articles[0].sentences=['Un extracto breve.'];assert.throws(()=>validateEdition(z,z.date),/4–5/);
 const english=input();english.articles[0].sentences=['The company has released a major software update for all its customers.','The new version fixes a security issue that could expose private account details.','Customers can install the new software using the settings menu on their devices.','This change is available now and protects the information stored on the phone.'];assert.throws(()=>validateEdition(english,english.date),/español/);
});
test('rejects duplicate topics, homepages and insufficient source diversity',()=>{
 const x=input();x.articles[1].storyKey=x.articles[0].storyKey;assert.throws(()=>validateEdition(x,x.date),/repetidos/);
 const y=input();y.articles[0].sources[0].url='https://example.com/';assert.throws(()=>validateEdition(y,y.date),/portada/);
 const z=input();z.articles.forEach((a,i)=>a.sources[0].url='https://example.com/article-'+i);assert.throws(()=>validateEdition(z,z.date),/tres fuentes/);
});
test('uses the expanded category catalog and rejects unknown topics',()=>{
 assert.equal(new Set(categories).size,categories.length);
 for(const name of ['Android','Google','Microsoft','Hardware','Desarrollo','Web y privacidad','Ciencia','Videojuegos','Empresas','Movilidad','Criptomonedas','Regulación','Redes sociales','Startups','Cloud','Open source','Realidad virtual','Domótica','Audio y vídeo','Fotografía']){
  assert.ok(categories.includes(name));
  const edition=input();edition.articles[0].category=name;
  assert.equal(validateEdition(edition,edition.date).articles[0].category,name);
 }
 const unknown=input();unknown.articles[0].category='Cocina';assert.throws(()=>validateEdition(unknown,unknown.date),/categoría/);
});
test('rejects previously published stories, including a differently titled source URL',()=>{
 const edition=validateEdition(input(),'2026-11-01');assert.throws(()=>rejectRepeats(edition.articles,[{...edition.articles[0],title:'Un titular distinto'}]),/ya publicada/);
});
const event={
 eventKey:'organizador-presentacion-2026',storyKey:'fabricante correccion seguridad 0',
 title:'Presentación de ejemplo',summary:'El organizador ha anunciado la fecha de su presentación.',
 date:'2026-11-18',url:'https://organizador.example/eventos/presentacion-2026?utm_source=prueba',
 officialHost:'organizador.example',confirmed:true
};
test('links confirmed events to the edition without changing hashes of older editions',()=>{
 const previous=validateEdition(input(),'2026-11-01');
 assert.equal(editionHash(previous),hash(JSON.stringify({date:previous.date,articles:previous.articles})));
 const edition=validateEdition({...input(),events:[event]},'2026-11-01');
 assert.equal(edition.events[0].eventKey,event.eventKey);
 assert.equal(edition.events[0].storyKey,edition.articles[0].topicKey);
 assert.equal(edition.events[0].url,'https://organizador.example/eventos/presentacion-2026');
 assert.notEqual(editionHash(edition),editionHash(previous));
});
test('rejects events that are unconfirmed, unrelated, past, invalid or duplicated',()=>{
 const validate=events=>validateEdition({...input(),events},'2026-11-01');
 assert.throws(()=>validate([{...event,confirmed:false}]),/confirmado/);
 assert.throws(()=>validate([{...event,storyKey:'otra noticia'}]),/vinculado/);
 assert.throws(()=>validate([{...event,date:'2026-10-31'}]),/fecha/);
 assert.throws(()=>validate([{...event,date:'2026-11-31'}]),/fecha/);
 assert.throws(()=>validate([{...event,officialHost:'otro.example'}]),/enlace/);
 assert.throws(()=>validate([event,event]),/identificador/);
});
test('scheduled runs delayed past midnight use the previous Madrid date and can still notify',()=>{
 const delayed=new Date('2026-11-06T23:14:17Z');
 assert.deepEqual(planPublication(delayed,{scheduled:true}),[
  {date:'2026-11-06',archive:false,optional:false}
 ]);
});
test('scheduled runs recover older editions silently and also publish the current edition when due',()=>{
 assert.deepEqual(planPublication(new Date('2026-11-07T01:00:00Z'),{scheduled:true}),[
  {date:'2026-11-06',archive:true,optional:false}
 ]);
 assert.deepEqual(planPublication(new Date('2026-11-07T18:05:00Z'),{scheduled:true}),[
  {date:'2026-11-06',archive:true,optional:true},
  {date:'2026-11-07',archive:false}
 ]);
});
test('scheduled recovery uses the local calendar across the start of daylight saving time',()=>{
 assert.deepEqual(planPublication(new Date('2026-03-29T22:30:00Z'),{scheduled:true}),[
  {date:'2026-03-29',archive:false,optional:false}
 ]);
});
test('push and manual modes preserve draft preparation and explicit archive dates',()=>{
 const now=new Date('2026-11-06T17:46:31Z');
 assert.deepEqual(planPublication(now),[{date:'2026-11-06',archive:false,prepare:true}]);
 assert.deepEqual(planPublication(now,{date:'2026-11-05',archive:true}),[
  {date:'2026-11-05',archive:true,prepare:false}
 ]);
});
function memoryStore(){const docs=new Map();return {doc:path=>({get:async()=>({exists:docs.has(path),data:()=>docs.get(path)}),create:async value=>{if(docs.has(path))throw {code:6};docs.set(path,value);},set:async value=>docs.set(path,value)}),docs};}
const tokenDoc={ref:{path:'users/test/tokens/device',delete:async()=>{}},data:()=>({token:'private-test-token'})};
test('retries and concurrent runs send only once per device and edition',async()=>{
 const db=memoryStore();let sends=0;const args={db,tokenDoc,date:'2026-11-01',articles:5,messaging:{send:async()=>{sends++;}}};
 const results=await Promise.all([deliverOnce(args),deliverOnce(args)]);assert.equal(sends,1);assert.ok(results.includes('accepted'));assert.equal(await deliverOnce(args),'skipped');assert.equal(sends,1);
});
test('ambiguous FCM errors never cause an automatic duplicate',async()=>{
 const db=memoryStore();let sends=0;const args={db,tokenDoc,date:'2026-11-01',articles:5,messaging:{send:async()=>{sends++;throw {code:'messaging/server-unavailable'};}}};
 assert.equal(await deliverOnce(args),'uncertain');assert.equal(await deliverOnce(args),'uncertain');assert.equal(sends,1);
});
test('Firestore rules allow exactly the canonical category catalog',async()=>{
 const [rules,catalogFile]=await Promise.all([
  readFile(new URL('../firestore.rules',import.meta.url),'utf8'),
  readFile(new URL('../src/categories.json',import.meta.url),'utf8'),
 ]);
 const catalog=JSON.parse(catalogFile).categories.map(category=>category.name);
 const block=rules.match(/function allowedCategories\(\)\s*\{\s*return \[([\s\S]*?)\];/);
 assert.ok(block,'allowedCategories() not found in firestore.rules');
 const allowed=[...block[1].matchAll(/'([^']*)'/g)].map(match=>match[1]);
 assert.deepEqual(allowed,catalog);
 assert.deepEqual(categories,catalog);
});
