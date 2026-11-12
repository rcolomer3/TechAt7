// Sends one manual push announcement. It never publishes or edits an edition.
import {announcement,deliveryPath} from './announcement.mjs';

const notice=announcement({id:process.env.NOTIFY_ID,title:process.env.NOTIFY_TITLE,body:process.env.NOTIFY_BODY});
const dry=/^(1|true|yes)$/i.test(process.env.NOTIFY_DRY||'');

async function connectFirebase(){
 if(!process.env.FIREBASE_SERVICE_ACCOUNT)throw new Error('Falta el secreto FIREBASE_SERVICE_ACCOUNT.');
 const [{initializeApp,cert},{getFirestore},{getMessaging}]=await Promise.all([import('firebase-admin/app'),import('firebase-admin/firestore'),import('firebase-admin/messaging')]);
 const app=initializeApp({credential:cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))});
 return {db:getFirestore(app),messaging:getMessaging(app)};
}

const report={id:notice.id,title:notice.title,body:notice.body,dry,total:0,accepted:0,wouldSend:0,skipped:0,invalid:0,uncertain:0};
const {db,messaging}=await connectFirebase();
const tokens=await db.collectionGroup('tokens').limit(501).get();
if(tokens.size>500)throw new Error('Más de 500 dispositivos: se requiere paginación antes de notificar.');
report.total=tokens.size;

for(const tokenDoc of tokens.docs){
 const ref=db.doc('deliveries/'+deliveryPath(notice.id,tokenDoc.ref.path));
 if(dry){report.wouldSend++;continue;}
 try{await ref.create({state:'claimed',claimedAt:new Date().toISOString()});}
 catch(error){
  if(error.code!==6&&error.code!=='already-exists')throw error;
  const state=(await ref.get()).data()?.state;
  if(state==='accepted')report.skipped++;
  else if(state==='invalid')report.invalid++;
  else report.uncertain++;
  continue;
 }
 try{
  await messaging.send({
   token:tokenDoc.data().token,
   data:{title:notice.title,body:notice.body},
   webpush:{headers:{TTL:'86400',Urgency:'normal'}},
  });
 }catch(error){
  const invalid=['messaging/registration-token-not-registered','messaging/invalid-registration-token'].includes(error.code);
  await ref.set({state:invalid?'invalid':'uncertain',code:error.code||'transport-error'},{merge:true});
  if(invalid)await tokenDoc.ref.delete();
  if(invalid)report.invalid++;
  else report.uncertain++;
  continue;
 }
 await ref.set({state:'accepted',sentAt:new Date().toISOString()},{merge:true});
 report.accepted++;
}

console.log(JSON.stringify(report,null,2));
if(report.uncertain)throw new Error('Resultado incierto de un envío; no se reintenta automáticamente para evitar duplicados.');
