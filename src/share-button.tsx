import {useEffect,useState} from 'react';
import {Icon} from './icons';
import {shareNews,type ShareResult} from './share-news';
export function ShareButton({title,url,onBeforeShare}:{title:string;url:string;onBeforeShare:()=>void}){
 const [result,setResult]=useState<ShareResult|null>(null),[busy,setBusy]=useState(false);
 useEffect(()=>{if(result==='copied'){const timer=setTimeout(()=>setResult(null),3000);return()=>clearTimeout(timer);}},[result]);
 async function share(){
  onBeforeShare();setBusy(true);setResult(null);
  try{setResult(await shareNews({title,url},{share:typeof navigator.share==='function'?data=>navigator.share(data):undefined,copy:navigator.clipboard?.writeText?text=>navigator.clipboard.writeText(text):undefined}));}finally{setBusy(false);}
 }
 return <span className="share-control"><button className="share-news" title="Compartir noticia" aria-label={'Compartir noticia: '+title} aria-busy={busy} disabled={busy} onClick={share}><Icon name={busy?'refresh':'share'} className={busy?'spinning':undefined}/></button>{result==='copied'&&<span className="share-feedback" role="status">Enlace copiado</span>}{result==='manual'&&<span className="share-feedback share-manual"><label>Copia el enlace<input aria-label="Enlace para compartir" readOnly value={url} onFocus={e=>e.currentTarget.select()}/></label><button onClick={()=>setResult(null)} aria-label="Cerrar enlace para compartir">×</button></span>}</span>;
}
