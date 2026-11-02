import {useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {defaultView,readPosition,type ReadingRecord,type ReadingView} from './reading-state';
export const readingId=(key:string)=>'news-'+encodeURIComponent(key);
export function useReadingPosition({uid,enabled,day,feedReady,savedReady}:{uid:string;enabled:boolean;day:string;feedReady:boolean;savedReady:boolean}){
 const key='techradar-reading-v1:'+uid;
 const [view,setView]=useState(defaultView),[expanded,setExpanded]=useState<string[]>([]),[loadedKey,setLoadedKey]=useState('');
 const pending=useRef<ReadingRecord|null>(null),restored=useRef(false),jumpToTop=useRef(false);
 const ready=enabled&&loadedKey===key;
 const contentReady=view.tab==='Guardadas'?savedReady:view.tab==='Ajustes'?true:feedReady;
 useEffect(()=>{
  restored.current=false;
  if(!enabled){setLoadedKey('');return;}
  let raw=null;try{raw=localStorage.getItem(key);}catch{}
  const record=readPosition(raw,day,new URLSearchParams(location.search).get('edition'));
  pending.current=record;setView(record.view);setExpanded(record.expanded);setLoadedKey(key);
 },[key,enabled,day]);
 const capture=useCallback(()=>{
  if(!ready||!contentReady||!restored.current)return;
  const anchor=Array.from(document.querySelectorAll<HTMLElement>('.news-card[id]')).find(card=>card.getBoundingClientRect().bottom>0);
  const record:ReadingRecord={version:1,day,view,y:window.scrollY,anchor:anchor?.id||'',offset:anchor?.getBoundingClientRect().top||0,expanded};
  try{localStorage.setItem(key,JSON.stringify(record));}catch{}
 },[ready,contentReady,day,view,expanded,key]);
 useLayoutEffect(()=>{
  if(!ready||!contentReady)return;
  if(jumpToTop.current){jumpToTop.current=false;window.scrollTo({top:0,behavior:'instant'});capture();return;}
  if(restored.current)return;
  let second=0;
  const first=requestAnimationFrame(()=>{second=requestAnimationFrame(()=>{
   const record=pending.current;
   const anchor=record?.anchor?document.getElementById(record.anchor):null;
   const top=anchor&&record?window.scrollY+anchor.getBoundingClientRect().top-record.offset:record?.y||0;
   window.scrollTo({top:Math.max(0,top),behavior:'instant'});restored.current=true;capture();
  });});
  return()=>{cancelAnimationFrame(first);cancelAnimationFrame(second);};
 },[ready,contentReady,capture]);
 useEffect(()=>{
  let timer:ReturnType<typeof setTimeout>|undefined;
  const save=()=>{clearTimeout(timer);capture();};
  const scroll=()=>{clearTimeout(timer);timer=setTimeout(capture,150);};
  const hidden=()=>{if(document.visibilityState==='hidden')save();};
  // Native history restoration remains available when returning via Back/Forward.
  window.addEventListener('scroll',scroll,{passive:true});window.addEventListener('pagehide',save);document.addEventListener('visibilitychange',hidden);
  capture();
  return()=>{clearTimeout(timer);window.removeEventListener('scroll',scroll);window.removeEventListener('pagehide',save);document.removeEventListener('visibilitychange',hidden);};
 },[capture]);
 function update(patch:Partial<ReadingView>){
  const url=new URL(location.href);url.searchParams.delete('edition');history.replaceState(history.state,'',url);
  restored.current=true;jumpToTop.current=true;setExpanded([]);setView(current=>({...current,...patch}));
 }
 function toggleExpanded(id:string){setExpanded(current=>current.includes(id)?current.filter(key=>key!==id):[...current,id]);}
 return {view,ready,expanded,update,toggleExpanded,capture};
}
