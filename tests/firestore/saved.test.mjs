import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initializeApp,deleteApp} from 'firebase/app';
import {getAuth,connectAuthEmulator,signInAnonymously} from 'firebase/auth';
import {getFirestore,connectFirestoreEmulator,doc,setDoc,getDocFromServer as getDoc,deleteDoc,serverTimestamp,terminate} from 'firebase/firestore';

test('saved news are private, validated and removable by their owner',async()=>{
 const apps=[];
 async function client(name){
  const app=initializeApp({projectId:'demo-techradar',apiKey:'demo-key',authDomain:'demo-techradar.firebaseapp.com'},name);
  apps.push(app);
  const auth=getAuth(app);
  connectAuthEmulator(auth,'http://'+process.env.FIREBASE_AUTH_EMULATOR_HOST,{disableWarnings:true});
  const db=getFirestore(app),[host,port]=process.env.FIRESTORE_EMULATOR_HOST.split(':');
  connectFirestoreEmulator(db,host,Number(port));
  return {db,uid:(await signInAnonymously(auth)).user.uid};
 }
 try{
  const alice=await client('alice'),bob=await client('bob');
  const id='a'.repeat(64),path=['users',alice.uid,'saved',id];
  const article={id:'story',title:'Noticia',summary:'Resumen de prueba.',url:'https://example.com/story',source:'Ejemplo',publishedAt:'2026-11-02T19:00:00Z',category:'Tecnología',editionDate:'2026-11-02'};
  await setDoc(doc(alice.db,...path),{article,savedAt:serverTimestamp()});
  assert.equal((await getDoc(doc(alice.db,...path))).data().article.title,'Noticia');
  await assert.rejects(getDoc(doc(bob.db,...path)),e=>e.code==='permission-denied');
  await assert.rejects(setDoc(doc(bob.db,...path),{article,savedAt:serverTimestamp()}),e=>e.code==='permission-denied');
  await assert.rejects(deleteDoc(doc(bob.db,...path)),e=>e.code==='permission-denied');
  await assert.rejects(setDoc(doc(alice.db,'users',alice.uid,'saved','invalid-id'),{article,savedAt:serverTimestamp()}),e=>e.code==='permission-denied');
  await assert.rejects(setDoc(doc(alice.db,...path),{article:{...article,summary:123},savedAt:serverTimestamp()}),e=>e.code==='permission-denied');
  await assert.rejects(setDoc(doc(alice.db,...path),{article,savedAt:'not-a-timestamp'}),e=>e.code==='permission-denied');
  await deleteDoc(doc(alice.db,...path));
  assert.equal((await getDoc(doc(alice.db,...path))).exists(),false);
 }finally{
  await Promise.all(apps.map(async app=>{await terminate(getFirestore(app));await deleteApp(app);}));
 }
});
