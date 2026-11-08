// ChatGPT researches and writes editions/*.json. This publisher never generates news.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {hash,validateCurated,madridDate} from './core.mjs';
import {validateEdition,rejectRepeats,editionHash,deliverOnce,planPublication} from './edition.mjs';

const now=new Date();
const today=madridDate(now);
const dry=process.argv.includes('--dry-run');
const date=process.env.RADAR_DATE;
const archive=process.env.RADAR_ARCHIVE==='true';
const scheduled=!dry&&!date&&!archive&&process.env.GITHUB_EVENT_NAME==='schedule';
const plan=planPublication(now,{date,archive,scheduled});

let firebase;
const completedNotifications=[];
async function connectFirebase(){
 if(!process.env.FIREBASE_SERVICE_ACCOUNT)throw new Error('Falta el secreto FIREBASE_SERVICE_ACCOUNT.');
 const [{initializeApp,cert},{getFirestore},{getMessaging}]=await Promise.all([import('firebase-admin/app'),import('firebase-admin/firestore'),import('firebase-admin/messaging')]);
 const app=initializeApp({credential:cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))});
 return {db:getFirestore(app),messaging:getMessaging(app)};
}

async function publish({date,archive,prepare,optional},report){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error('Fecha no válida.');
 if(date>today||date<today&&!archive&&!scheduled)throw new Error('Una edición histórica requiere el modo de archivo; no se puede publicar una fecha futura.');
 let input;
 try{
  input=JSON.parse(await readFile(new URL(`../editions/${date}.json`,import.meta.url),'utf8'));
 }catch(error){
  if(error.code!=='ENOENT')throw error;
  if(optional){report.status='missing';return;}
  throw new Error('ChatGPT todavía no ha entregado una edición para '+date+'. No se publican extractos RSS ni se envían avisos.');
 }
 const edition=validateEdition(input,date),contentHash=editionHash(edition);
 report.articles=edition.articles.length;
 report.events=edition.events?.length??0;
 if(dry){
  report.status='validated';
  console.log('Edición validada:',date,edition.articles.length,'noticias completas en español.');
  return;
 }

 const {db,messaging}=await (firebase??=connectFirebase());
 const ref=db.doc('digests/'+date);
 const notificationRun=archive||prepare?null:db.doc('notificationRuns/'+date);
 if(notificationRun&&(await notificationRun.get()).data()?.contentHash===contentHash){
  report.status='already-notified';
  console.log('Avisos ya completados:',date);
  return;
 }
 if(scheduled&&archive){
  const existing=(await ref.get()).data();
  if(existing?.status==='published'&&existing.contentHash===contentHash){
   report.status='already-published';
   return;
  }
 }
 const recent=await db.collection('digests').orderBy('date','desc').limit(14).get();
 if(!recent.docs.some(d=>d.id===date&&d.data().contentHash===contentHash)){
  rejectRepeats(edition.articles,recent.docs.filter(d=>d.id!==date).flatMap(d=>d.data().articles||[]));
 }
 if(prepare){
  await db.doc('drafts/'+date).set({...edition,contentHash,status:'ready',preparedAt:now.toISOString()});
  report.status='ready';
  console.log('Edición validada y preparada para las 19:00 de Madrid. Sin publicación ni avisos anticipados.');
  return;
 }

 const digest={...edition,contentHash,status:'published',publishedAt:now.toISOString()};
 const events=(edition.events??[]).filter(event=>event.date>=today);
 const eventRefs=events.map(event=>db.doc('events/'+hash(event.eventKey)));
 await db.runTransaction(async tx=>{
  const existing=await tx.get(ref);
  if(existing.data()?.contentHash===contentHash)return;
  if(existing.data()?.editorialVersion===2)throw new Error('La edición ya publicada es inmutable. No se sobrescribe ni reenvía.');
  const previousEvents=eventRefs.length?await tx.getAll(...eventRefs):[];
  if(existing.exists){
   // Keep legacy excerpts intact as a revision when correcting the former format.
   tx.set(db.doc('digestRevisions/'+date+'-legacy'),existing.data());
  }
  tx.set(ref,digest);
  for(const [index,event] of events.entries()){
   // A late edition cannot replace a more recent confirmation.
   const previousDate=previousEvents[index].data()?.editionDate;
   if(!previousDate||previousDate<=date)tx.set(eventRefs[index],{...event,editionDate:date});
  }
 });
 report.status='published';
 report.notifications={accepted:0,skipped:0,invalid:0,uncertain:0};
 if(notificationRun){
  const tokens=await db.collectionGroup('tokens').limit(501).get();
  if(tokens.size>500)throw new Error('Más de 500 dispositivos: se requiere paginación antes de notificar.');
  for(const tokenDoc of tokens.docs){
   const result=await deliverOnce({db,messaging,tokenDoc,date,articles:edition.articles.length});
   report.notifications[result]++;
  }
  if(report.notifications.uncertain)throw new Error('Resultado incierto de un envío; no se reintenta automáticamente para evitar duplicados.');
  if(report.notifications.accepted+report.notifications.skipped>0){
   completedNotifications.push({ref:notificationRun,contentHash});
  }
 }
 console.log('Edición publicada:',date,edition.articles.length,'noticias. Avisos aceptados:',report.notifications.accepted);
}

await mkdir('work',{recursive:true});
const reports=[];
for(const target of plan){
 const report={date:target.date,mode:dry?'validation':target.archive?'archive':'publication'};
 reports.push(report);
 try{
  await publish(target,report);
 }catch(error){
  report.status='failed';
  report.error=error.message;
  console.error(target.date+':',error.message);
  process.exitCode=1;
 }
}

const report=reports.length===1?reports[0]:{editions:reports};
try{
 if(reports.some(entry=>entry.status==='ready'||entry.status==='published')){
  const {db}=await firebase;
  const curated=validateCurated(JSON.parse(await readFile(new URL('./curated.json',import.meta.url),'utf8')));
  for(const item of curated.updates)await db.collection('updates').doc(hash(item.url)).set(item);
 }
 for(const {ref,contentHash} of completedNotifications){
  await ref.set({contentHash,completedAt:new Date().toISOString()});
 }
}catch(error){
 report.status='failed';
 report.error=error.message;
 console.error(error.message);
 process.exitCode=1;
}finally{
 await writeFile('work/publication-report.json',JSON.stringify(report,null,2));
}
