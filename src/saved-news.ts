import {useEffect,useRef,useState} from 'react';
import {collection,deleteDoc,doc,onSnapshot,serverTimestamp,setDoc} from 'firebase/firestore';
import {db,configured} from './firebase';
import type {Article} from './models';
export type SavedArticle=Article&{editionDate:string};
export const savedKey=(a:SavedArticle)=>JSON.stringify([a.editionDate,a.id]);
const demoKey='techradar-demo-saved-v1';
export function useSavedNews(uid:string|undefined){
 const [items,setItems]=useState<SavedArticle[]>([]),[ready,setReady]=useState(!configured),[error,setError]=useState(''),[pending,setPending]=useState<string[]>([]),[retry,setRetry]=useState(0);
 const locks=useRef(new Set<string>()),owner=useRef(uid);owner.current=uid;
 useEffect(()=>{
  setItems([]);setError('');setReady(!configured);locks.current.clear();setPending([]);
  if(!configured){try{const saved=JSON.parse(localStorage.getItem(demoKey)||'[]');if(Array.isArray(saved))setItems(saved);}catch{setError('No se pudieron recuperar las noticias guardadas de demostración.');}return;}
  if(!uid||!db)return;
  return onSnapshot(collection(db,'users',uid,'saved'),snapshot=>{setItems(snapshot.docs.map(d=>d.data().article as SavedArticle));setReady(true);setError('');},()=>{setReady(false);setError('No se pudieron sincronizar tus guardadas. Comprueba la conexión y vuelve a intentarlo.');});
 },[uid,retry]);
 async function toggle(article:SavedArticle){
  const key=savedKey(article),startOwner=uid;
  if(locks.current.has(key)||!ready)return;
  locks.current.add(key);setPending([...locks.current]);
  try{
   const exists=items.some(a=>savedKey(a)===key);
   if(!configured){const next=exists?items.filter(a=>savedKey(a)!==key):[article,...items];localStorage.setItem(demoKey,JSON.stringify(next));setItems(next);return;}
   if(!db||!uid)throw new Error('Inicia sesión para guardar noticias.');
   if(!navigator.onLine)throw new Error('Conéctate a internet para cambiar tus guardadas.');
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key)))).map(n=>n.toString(16).padStart(2,'0')).join('');
   if(owner.current!==startOwner)return;
   const ref=doc(db,'users',uid,'saved',hash);
   if(exists)await deleteDoc(ref);else {const {id,title,summary,url,source,publishedAt,category,editionDate}=article;await setDoc(ref,{article:{id,title,summary,url,source,publishedAt,category,editionDate},savedAt:serverTimestamp()});}
  }finally{if(owner.current===startOwner){locks.current.delete(key);setPending([...locks.current]);}}
 }
 return {items,ready,error,pending,toggle,reload:()=>setRetry(n=>n+1)};
}
