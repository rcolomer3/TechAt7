import {franc} from 'franc-min';
import {canonical,hash,titleKey,plain,madridDate} from './core.mjs';

export function planPublication(now,{date,archive=false,scheduled=false}={}){
 const today=madridDate(now);
 const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',hour:'2-digit',hourCycle:'h23'}).format(now));
 if(scheduled&&!date&&!archive){
  // Use the calendar date in Madrid, including on daylight saving changes.
  const previousDay=new Date(today+'T12:00:00Z');
  previousDay.setUTCDate(previousDay.getUTCDate()-1);
  const recovery={date:madridDate(previousDay),archive:hour>=2,optional:hour>=19};
  return hour<19?[recovery]:[recovery,{date:today,archive:false}];
 }
 return [{date:date||today,archive,prepare:(date||today)===today&&hour<19}];
}

export const categories=['Apple','Inteligencia artificial','Tecnología','Lanzamientos','Seguridad'];
export function sentenceCount(text){
 const normalized=text.replace(/EE\.\s?UU\./g,'Estados Unidos').replace(/p\.\s?ej\./gi,'por ejemplo');
 return [...new Intl.Segmenter('es',{granularity:'sentence'}).segment(normalized)].filter(s=>s.segment.trim()).length;
}
function sourceURL(value){
 const url=new URL(canonical(value));
 if(url.username||url.password||url.port||url.hostname==='localhost'||!url.hostname.includes('.')||/^[\d.]+$/.test(url.hostname)||url.hostname.endsWith('.local'))throw new Error('Fuente no válida.');
 if(url.pathname==='/'&&!url.search)throw new Error('La fuente debe enlazar el artículo, no solo la portada.');
 return url.href;
}
export function validateEdition(input,expectedDate){
 if(input?.schemaVersion!==1||input.language!=='es'||input.producer!=='chatgpt')throw new Error('La edición debe proceder de ChatGPT y estar en español.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(input.date)||input.date!==expectedDate||new Date(input.date+'T12:00:00Z').toISOString().slice(0,10)!==input.date)throw new Error('Fecha de edición incorrecta.');
 if(!Array.isArray(input.articles)||input.articles.length<5||input.articles.length>8)throw new Error('Se necesitan 5–8 noticias completas; no se publica una edición incompleta.');
 const urls=new Set(),topics=new Set(),titles=new Set(),domains=new Set();
 const articles=input.articles.map(item=>{
  const title=plain(item.title),topicKey=titleKey(item.storyKey);
  if(!title||title.length<20||title.length>180||!categories.includes(item.category)||topicKey.length<12)throw new Error('Titular, categoría o identificador del acontecimiento no válidos.');
  if(/\b(announcing|announces|introducing|launches|new builds|here is|here are|what you need|with the|for the)\b/i.test(title))throw new Error('El titular debe estar en español.');
  if(!Array.isArray(item.sentences)||item.sentences.length<4||item.sentences.length>5)throw new Error('Cada noticia necesita 4–5 frases.');
  const sentences=item.sentences.map(plain),summary=sentences.join(' ');
  if(sentences.some(s=>s.length<30||!/[.!?]$/.test(s))||summary.length<240||summary.length>1600||sentenceCount(summary)<4||sentenceCount(summary)>5)throw new Error('El resumen está incompleto o tiene una extensión incorrecta.');
  if(franc(summary,{minLength:100})!=='spa')throw new Error('El resumen no está en español.');
  if(/como modelo de lenguaje|no puedo|no se proporciona|información insuficiente|as an ai/i.test(summary))throw new Error('El resumen contiene relleno o una respuesta de error.');
  if(!Array.isArray(item.sources)||!item.sources.length||item.sources.length>3)throw new Error('Cada noticia necesita fuentes verificables.');
  const sources=item.sources.map(s=>{
   const name=plain(s.name),url=sourceURL(s.url),publishedAt=new Date(s.publishedAt).toISOString();
   const age=(new Date(input.date+'T23:59:59Z')-new Date(publishedAt))/3600000;
   if(name.length<3||name.length>100||!Number.isFinite(age)||age<0||age>72)throw new Error('Fuente sin nombre o fecha reciente verificable.');
   domains.add(new URL(url).hostname.replace(/^www\./,''));return {name,url,publishedAt};
  });
  const url=sources[0].url,key=titleKey(title);
  if(topics.has(topicKey)||titles.has(key)||sources.some(s=>urls.has(s.url)))throw new Error('Hay acontecimientos repetidos en la edición.');
  topics.add(topicKey);titles.add(key);sources.forEach(s=>urls.add(s.url));
  return {id:hash(url),title,summary,category:item.category,source:sources.map(s=>s.name).join(' · '),url,publishedAt:sources[0].publishedAt,sources,topicKey};
 });
 if(domains.size<3)throw new Error('Se necesitan al menos tres fuentes diferentes en la edición.');
 return {date:input.date,language:'es',editorialVersion:2,summaryMethod:'chatgpt-researched',articles};
}
export function rejectRepeats(articles,previous){
 for(const a of articles){
  if(previous.some(old=>old.topicKey===a.topicKey||titleKey(old.title)===titleKey(a.title)||(old.url&&canonical(old.url)===a.url)||(old.sources||[]).some(s=>a.sources.some(n=>canonical(s.url)===n.url))))throw new Error('Noticia ya publicada en una edición anterior: '+a.title);
 }
}
export function editionHash(digest){return hash(JSON.stringify({date:digest.date,articles:digest.articles}));}
export async function deliverOnce({db,messaging,tokenDoc,date,articles}){
 const delivery=db.doc(`deliveries/${date}-${hash(tokenDoc.ref.path)}`);
 // Backwards compatibility with the former scheduled/manual split.
 if((await db.doc(`deliveries/${date}-scheduled-${hash(tokenDoc.ref.path)}`).get()).exists)return 'skipped';
 try{await delivery.create({state:'claimed',claimedAt:new Date().toISOString()});}
 catch(error){
  if(error.code!==6&&error.code!=='already-exists')throw error;
  const state=(await delivery.get()).data()?.state;
  if(state==='accepted')return 'skipped';
  if(state==='invalid')return 'invalid';
  return 'uncertain';
 }
 try{
  await messaging.send({token:tokenDoc.data().token,data:{title:'Tu TechRadar está listo',body:`${articles} noticias resumidas en español. Abre la edición.`,date},webpush:{headers:{TTL:'86400',Urgency:'normal'}}});
 }catch(error){
  const invalid=['messaging/registration-token-not-registered','messaging/invalid-registration-token'].includes(error.code);
  await delivery.set({state:invalid?'invalid':'uncertain',code:error.code||'transport-error'},{merge:true});
  if(invalid)await tokenDoc.ref.delete();return invalid?'invalid':'uncertain';
 }
 // Failure after FCM acceptance does not allow a resend: the claim remains.
 await delivery.set({state:'accepted',sentAt:new Date().toISOString()},{merge:true});return 'accepted';
}
