import {useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {defaultView,readPosition,type ReadingRecord,type ReadingView} from './reading-state';
export const readingId=(key:string)=>'news-'+encodeURIComponent(key);
export function useReadingPosition({uid,enabled,day,feedReady,savedReady}:{uid:string;enabled:boolean;day:string;feedReady:boolean;savedReady:boolean}){
 const [view,setView]=useState(defaultView),[expanded,setExpanded]=useState<string[]>([]),[loadedUid,setLoadedUid]=useState('');
 const positions=useRef(new Map<string,ReadingRecord>());
 const pending=useRef<ReadingRecord|null>(null),restored=useRef(false),jumpToTop=useRef(false);
 const tabScrollFrame=useRef(0);
 const ready=enabled&&loadedUid===uid;
 const contentReady=view.tab==='Guardadas'?savedReady:view.tab==='Ajustes'?true:feedReady;
 useEffect(()=>{
  restored.current=false;
  if(!enabled){setLoadedUid('');return;}
  const record=readPosition(positions.current.get(uid),day,new URLSearchParams(location.search).get('edition'));
  pending.current=record;setView(record.view);setExpanded(record.expanded);setLoadedUid(uid);
  return()=>cancelAnimationFrame(tabScrollFrame.current);
 },[uid,enabled,day]);
 const capture=useCallback(()=>{
  if(!ready||!contentReady||!restored.current)return;
  const anchor=Array.from(document.querySelectorAll<HTMLElement>('.news-card[id]')).find(card=>card.getBoundingClientRect().bottom>0);
  const record:ReadingRecord={day,view,y:window.scrollY,anchor:anchor?.id||'',offset:anchor?.getBoundingClientRect().top||0,expanded};
  positions.current.set(uid,record);
 },[ready,contentReady,day,view,expanded,uid]);
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
  function applyView(){
   const url=new URL(location.href);url.searchParams.delete('edition');history.replaceState(history.state,'',url);
   restored.current=true;jumpToTop.current=true;setExpanded([]);setView(current=>({...current,...patch}));
  }
  if(patch.tab===undefined){applyView();return;}
  cancelAnimationFrame(tabScrollFrame.current);
  const startY=window.scrollY;
  if(startY<=0||window.matchMedia('(prefers-reduced-motion: reduce)').matches){
   applyView();
   return;
  }
  // Scroll the current page first so a shorter destination cannot cut the animation short.
  const start=performance.now();
  function scrollFrame(now:number){
   const progress=Math.min((now-start)/300,1);
   window.scrollTo({top:startY*(1-progress)**3,behavior:'instant'});
   if(progress<1)tabScrollFrame.current=requestAnimationFrame(scrollFrame);
   else applyView();
  }
  tabScrollFrame.current=requestAnimationFrame(scrollFrame);
 }
 function toggleExpanded(id:string){setExpanded(current=>current.includes(id)?current.filter(key=>key!==id):[...current,id]);}
 return {view,ready,expanded,update,toggleExpanded,capture};
}
