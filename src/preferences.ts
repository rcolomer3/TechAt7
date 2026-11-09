import {useEffect,useRef,useState} from 'react';
import {doc,getDocFromServer,serverTimestamp,setDoc} from 'firebase/firestore';
import {db,configured} from './firebase';
import {newsCategories,normalizeCategorySelection} from './categories';
import {PREFERENCES_DOC_ID} from './preferences-doc';

export const dailyLimitOptions=[0,3,5,8,12,20] as const;

export type RadarPreferences={categories:string[];dailyLimit:number};

export const defaultPreferences=():RadarPreferences=>({categories:[...newsCategories],dailyLimit:0});

/** 0 means "all stories"; any other value caps each edition. */
export function normalizeDailyLimit(value:unknown):number{
 return typeof value==='number'&&Number.isInteger(value)&&value>=0&&value<=50?value:0;
}

export function normalizePreferences(value:unknown):RadarPreferences{
 const stored=value&&typeof value==='object'?value as Record<string,unknown>:{};
 return {categories:normalizeCategorySelection(stored.categories),dailyLimit:normalizeDailyLimit(stored.dailyLimit)};
}

const storageKey=(uid:string)=>`techradar-preferences-v2:${uid}`;
const legacyKey=(uid:string)=>`techradar-categories-v1:${uid}`;

function readLocal(uid:string):RadarPreferences{
 try{
  const stored=localStorage.getItem(storageKey(uid));
  if(stored!==null)return normalizePreferences(JSON.parse(stored));
  const legacy=localStorage.getItem(legacyKey(uid));
  if(legacy!==null)return {...defaultPreferences(),categories:normalizeCategorySelection(JSON.parse(legacy))};
 }catch{/* Fall back to the default selection when storage is unavailable or corrupt. */}
 return defaultPreferences();
}

function writeLocal(uid:string,preferences:RadarPreferences){
 try{localStorage.setItem(storageKey(uid),JSON.stringify(preferences));}catch{/* The app still works without local storage. */}
}

const isLocalOnly=(uid:string)=>!configured||!db||uid==='demo'||uid==='signed-out';

type Transport='preferences'|'saved';

const preferencesRef=(uid:string)=>doc(db!,'users',uid,'preferences','radar');
const savedRef=(uid:string)=>doc(db!,'users',uid,'saved',PREFERENCES_DOC_ID);
const savedArticle=(preferences:RadarPreferences)=>({
 id:PREFERENCES_DOC_ID,
 title:'Preferencias de TechRadar',
 summary:JSON.stringify(preferences),
 url:'',
 source:'TechRadar',
 publishedAt:'1970-01-01T00:00:00Z',
 category:'Sistema',
 editionDate:'1970-01-01',
});

function permissionDenied(error:unknown):boolean{
 return typeof error==='object'&&error!==null&&'code' in error&&(error as {code?:unknown}).code==='permission-denied';
}

/** Reads the clean preferences document or the reserved saved document. */
async function readRemote(uid:string):Promise<{preferences:RadarPreferences|null;transport:Transport}>{
 try{
  const snapshot=await getDocFromServer(preferencesRef(uid));
  return {preferences:snapshot.exists()?normalizePreferences(snapshot.data()):null,transport:'preferences'};
 }catch(error){
  if(!permissionDenied(error))throw error;
 }
 const snapshot=await getDocFromServer(savedRef(uid));
 if(!snapshot.exists())return {preferences:null,transport:'saved'};
 const article=snapshot.data()?.article as {summary?:unknown}|undefined;
 if(typeof article?.summary!=='string')return {preferences:null,transport:'saved'};
 try{
  return {preferences:normalizePreferences(JSON.parse(article.summary)),transport:'saved'};
 }catch{
  return {preferences:null,transport:'saved'};
 }
}

/** Writes to preferences, falling back to the reserved saved document if rules deny it. */
async function writeRemote(uid:string,preferences:RadarPreferences,transport:Transport):Promise<Transport>{
 if(transport==='saved'){
  await setDoc(savedRef(uid),{article:savedArticle(preferences),savedAt:serverTimestamp()});
  return 'saved';
 }
 try{
  await setDoc(preferencesRef(uid),{categories:preferences.categories,dailyLimit:preferences.dailyLimit,updatedAt:serverTimestamp()});
  return 'preferences';
 }catch(error){
  if(!permissionDenied(error))throw error;
  await setDoc(savedRef(uid),{article:savedArticle(preferences),savedAt:serverTimestamp()});
  return 'saved';
 }
}

export function useRadarPreferences(uid:string){
 const [preferences,setPreferences]=useState<RadarPreferences>(()=>readLocal(uid));
 const [readyUid,setReadyUid]=useState<string|null>(()=>isLocalOnly(uid)?uid:null);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState('');
 const ready=isLocalOnly(uid)||readyUid===uid;
 const synced=useRef(JSON.stringify(readLocal(uid)));
 const loading=useRef(false);
 const dirty=useRef(false);
 const owner=useRef(uid);
 const prefsUid=useRef(uid);
 const transport=useRef<Transport>('preferences');

 useEffect(()=>{
  owner.current=uid;
  dirty.current=false;
  prefsUid.current=uid;
  transport.current='preferences';
  const local=readLocal(uid);
  setPreferences(local);
  setError('');
  if(isLocalOnly(uid)){
   loading.current=false;
   synced.current=JSON.stringify(local);
   setReadyUid(uid);
   return;
  }
  loading.current=true;
  setReadyUid(null);
  let cancelled=false;
  void (async()=>{
   try{
    const remote=await readRemote(uid);
    if(cancelled||owner.current!==uid)return;
    transport.current=remote.transport;
    if(remote.preferences){
     if(dirty.current)return;
     synced.current=JSON.stringify(remote.preferences);
     prefsUid.current=uid;
     setPreferences(remote.preferences);
     writeLocal(uid,remote.preferences);
    }else if(!dirty.current){
     const used=await writeRemote(uid,local,remote.transport);
     if(cancelled||owner.current!==uid)return;
     transport.current=used;
     synced.current=JSON.stringify(local);
    }
   }catch{
    if(!cancelled)setError('No se pudieron sincronizar tus preferencias. Se conservarán en este dispositivo.');
   }finally{
    if(!cancelled&&owner.current===uid){
     loading.current=false;
     setReadyUid(uid);
     if(dirty.current){
      synced.current='';
      setPreferences(current=>({...current}));
     }
    }
   }
  })();
  return()=>{cancelled=true;};
 },[uid]);

 useEffect(()=>{
  if(prefsUid.current!==uid)return;
  if(loading.current)return;
  writeLocal(uid,preferences);
  if(isLocalOnly(uid)){
   synced.current=JSON.stringify(preferences);
   return;
  }
  const serialized=JSON.stringify(preferences);
  if(serialized===synced.current)return;
  let cancelled=false;
  const timer=window.setTimeout(async()=>{
   setSaving(true);
   try{
    const used=await writeRemote(uid,preferences,transport.current);
    if(!cancelled&&owner.current===uid){transport.current=used;synced.current=serialized;setError('');}
   }catch{
    if(!cancelled)setError('No se pudieron guardar tus preferencias en Firebase.');
   }finally{
    if(!cancelled)setSaving(false);
   }
  },500);
  return()=>{cancelled=true;window.clearTimeout(timer);};
 },[uid,preferences]);

 useEffect(()=>{
  const sync=(event:StorageEvent)=>{
   if(event.key!==storageKey(uid))return;
   const next=readLocal(uid);
   synced.current=JSON.stringify(next);
   setPreferences(next);
  };
  window.addEventListener('storage',sync);
  return()=>window.removeEventListener('storage',sync);
 },[uid]);

 function update(change:(current:RadarPreferences)=>RadarPreferences){
  dirty.current=true;
  setPreferences(current=>change(current));
 }
 function toggle(category:string){
  update(current=>({...current,categories:current.categories.includes(category)
   ?current.categories.filter(name=>name!==category)
   :newsCategories.filter(name=>name===category||current.categories.includes(name))}));
 }
 function setCategories(categories:string[]){
  const next=newsCategories.filter(name=>categories.includes(name));
  update(current=>({...current,categories:next}));
 }
 function selectAll(){update(current=>({...current,categories:[...newsCategories]}));}
 function clear(){update(current=>({...current,categories:[]}));}
 function setDailyLimit(value:number){update(current=>({...current,dailyLimit:normalizeDailyLimit(value)}));}

 return {
  categories:preferences.categories,
  dailyLimit:preferences.dailyLimit,
  toggle,setCategories,selectAll,clear,setDailyLimit,
  ready,saving,error,
 };
}
