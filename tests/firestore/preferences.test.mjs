import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initializeApp,deleteApp} from 'firebase/app';
import {getAuth,connectAuthEmulator,signInAnonymously} from 'firebase/auth';
import {getFirestore,connectFirestoreEmulator,doc,setDoc,getDocFromServer as getDoc,deleteDoc,serverTimestamp,terminate} from 'firebase/firestore';

test('radar preferences are private, validated and removable by their owner',async()=>{
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
  const path=['users',alice.uid,'preferences','radar'];
  const valid={categories:['Apple','Inteligencia artificial'],dailyLimit:5,updatedAt:serverTimestamp()};
  await setDoc(doc(alice.db,...path),valid);
  const stored=(await getDoc(doc(alice.db,...path))).data();
  assert.deepEqual(stored.categories,['Apple','Inteligencia artificial']);
  assert.equal(stored.dailyLimit,5);

  await assert.rejects(getDoc(doc(bob.db,...path)),e=>e.code==='permission-denied');
  await assert.rejects(setDoc(doc(bob.db,...path),valid),e=>e.code==='permission-denied');
  await assert.rejects(deleteDoc(doc(bob.db,...path)),e=>e.code==='permission-denied');
  await assert.rejects(setDoc(doc(alice.db,'users',bob.uid,'preferences','radar'),valid),e=>e.code==='permission-denied');

  const invalid=[
   {categories:['Cocina'],dailyLimit:5,updatedAt:serverTimestamp()},
   {categories:['Apple','Apple'],dailyLimit:5,updatedAt:serverTimestamp()},
   {categories:['Apple'],dailyLimit:-1,updatedAt:serverTimestamp()},
   {categories:['Apple'],dailyLimit:51,updatedAt:serverTimestamp()},
   {categories:['Apple'],dailyLimit:'5',updatedAt:serverTimestamp()},
   {categories:'Apple',dailyLimit:5,updatedAt:serverTimestamp()},
   {categories:['Apple'],dailyLimit:5},
   {categories:['Apple'],dailyLimit:5,updatedAt:'not-a-timestamp'},
   {categories:['Apple'],dailyLimit:5,updatedAt:serverTimestamp(),extra:true},
  ];
  for(const data of invalid){
   await assert.rejects(setDoc(doc(alice.db,...path),data),e=>e.code==='permission-denied');
  }
  await assert.rejects(setDoc(doc(alice.db,'users',alice.uid,'preferences','otro'),valid),e=>e.code==='permission-denied');

  await setDoc(doc(alice.db,...path),{categories:[],dailyLimit:0,updatedAt:serverTimestamp()});
  const cleared=(await getDoc(doc(alice.db,...path))).data();
  assert.deepEqual(cleared.categories,[]);
  assert.equal(cleared.dailyLimit,0);

  await deleteDoc(doc(alice.db,...path));
  assert.equal((await getDoc(doc(alice.db,...path))).exists(),false);
 }finally{
  await Promise.all(apps.map(async app=>{await terminate(getFirestore(app));await deleteApp(app);}));
 }
});
