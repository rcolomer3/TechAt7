import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {onAuthStateChanged,type User} from 'firebase/auth';
import {auth,configured,loadRadar,login} from './firebase';
import {demo} from './demo';
import {madridDate,type RadarData} from './models';
import {Icon,GoogleIcon,AppIcon} from './icons';
import {useAppearance,AppearanceSettings} from './appearance';
import {AccountSettings} from './account-settings';
import {formatDateES,formatEditionDateES,formatPublicationTimeES} from './date-format';
import {NotificationSettings} from './notifications';
import {newsDigests,brief} from './news';
import {useSavedNews,savedKey,type SavedArticle} from './saved-news';
import {useReadingPosition,readingId} from './reading-position';
import {readingTabs} from './reading-state';
import {ShareButton} from './share-button';
import './style.css';
const tabs=readingTabs;
function App(){
 const [appearance,setAppearance]=useAppearance();
 const [authReady,setAuthReady]=useState(!configured);
 useEffect(()=>{const receive=(event:MessageEvent)=>{if(event.data?.type==='radar-digest')window.dispatchEvent(new Event('radar-digest'));};navigator.serviceWorker?.addEventListener('message',receive);return()=>navigator.serviceWorker?.removeEventListener('message',receive);},[]);
 const [data,setData]=useState<RadarData>(configured?{digests:[],updates:[],events:[]}:demo),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState(''),[user,setUser]=useState<User|null>(null),[busy,setBusy]=useState(false),[online,setOnline]=useState(navigator.onLine);
 async function refresh():Promise<boolean>{if(configured&&!auth?.currentUser)return false;setLoading(true);setError('');try{setData(configured?await loadRadar():demo);return true;}catch(e){setError((e as Error).message);return false;}finally{setLoading(false);}}
 useEffect(()=>{if(!configured)void refresh();const unsub=auth?onAuthStateChanged(auth,next=>{setUser(next);setAuthReady(true);if(next)void refresh();else{setData({digests:[],updates:[],events:[]});setLoading(false);setNotice('');}}):()=>{};const on=()=>setOnline(navigator.onLine);window.addEventListener('online',on);window.addEventListener('offline',on);window.addEventListener('radar-digest',refresh);navigator.serviceWorker?.register(import.meta.env.BASE_URL+'sw.js').catch(()=>setNotice('No se pudo activar el modo sin conexión.'));return()=>{unsub();window.removeEventListener('online',on);window.removeEventListener('offline',on);window.removeEventListener('radar-digest',refresh);};},[]);
 async function action(fn:()=>Promise<unknown>,message=''){setBusy(true);try{await fn();setNotice(message);}catch(e){setNotice((e as Error).message);}finally{setBusy(false);}}
 const saved=useSavedNews(user?.uid);
 const today=madridDate();
 const reading=useReadingPosition({uid:configured?user?.uid||'signed-out':'demo',enabled:authReady&&(!configured||!!user),day:today,feedReady:!loading&&!error,savedReady:saved.ready&&!saved.error});
 const {tab,date,filter}=reading.view;
 const archive=newsDigests(data.digests,today,'Anteriores');
 const archiveDate=archive.some(d=>d.date===date)?date:'';
 const visible=newsDigests(data.digests,today,tab,archiveDate);
 const allArticles=tab==='Guardadas'?[...saved.items].sort((a,b)=>b.editionDate.localeCompare(a.editionDate)):visible.flatMap(d=>d.articles.map(a=>({...a,editionDate:d.date})));
 const activeFilter=filter;
 const categories=['Todas',...new Set(allArticles.map(a=>a.category))];
 const articles=allArticles.filter(a=>activeFilter==='Todas'||a.category===activeFilter);
 const todayEdition=tab==='Hoy'?visible[0]:undefined;
 const publicationTime=formatPublicationTimeES(todayEdition?.publishedAt);
 const groupArchive=tab==='Anteriores'&&!archiveDate;
 const archiveGroups=new Map<string,SavedArticle[]>();
 if(groupArchive){
  for(const article of articles){
   const group=archiveGroups.get(article.editionDate);
   if(group)group.push(article);
   else archiveGroups.set(article.editionDate,[article]);
  }
 }
 useEffect(()=>{const contentReady=tab==='Guardadas'?saved.ready&&!saved.error:!loading&&!error;if(reading.ready&&contentReady&&!categories.includes(filter))reading.update({filter:'Todas'});},[reading.ready,tab,saved.ready,saved.error,loading,error,filter,categories.join('\u0000')]);
 const upcoming=data.events.filter(e=>e.confirmed&&e.date>=madridDate());
 const changeTab=(t:typeof tabs[number])=>reading.update({tab:t,date:'',filter:'Todas'});
 function renderCard(article:SavedArticle,index:number){
  const key=savedKey(article);
  return <NewsCard key={key} article={article} index={index}
   date={tab==='Hoy'||groupArchive?undefined:article.editionDate}
   saved={saved.items.some(item=>savedKey(item)===key)} saving={saved.pending.includes(key)} canSave={saved.ready}
   onSave={()=>action(()=>saved.toggle(article))} expanded={reading.expanded.includes(key)}
   onToggle={()=>reading.toggleExpanded(key)} onOpenSource={reading.capture}/>;
 }
 if(!authReady||((!configured||user)&&!reading.ready))return <div className="auth-screen"><div className="auth-loading" role="status"><AppIcon className="radar-mark"/><span>Preparando tu radar…</span><Icon name="refresh" className="spinning"/></div></div>;
 if(configured&&!user)return <div className="auth-screen"><main className="login-card"><AppIcon className="radar-mark"/><div className="login-wordmark">TechRadar</div><h1>Tu mundo tech<br/>En un solo lugar</h1><p>Noticias, eventos y tus lecturas guardadas.<br/>Entra con tu cuenta para abrir tu radar.</p><button className="google-login" disabled={busy} onClick={()=>action(login)}><GoogleIcon/><span>{busy?'Conectando con Google…':'Continuar con Google'}</span>{busy&&<Icon name="refresh" className="spinning"/>}</button>{notice&&<p className="login-error" role="alert">{notice}</p>}<small>Tu sesión se mantiene en este dispositivo.</small></main></div>;
 return <><aside className="sidebar"><a className="brand" href={import.meta.env.BASE_URL} aria-label="TechRadar inicio"><AppIcon className="logo"/><span>TechRadar</span></a><nav aria-label="Principal">{tabs.map(t=><button key={t} aria-current={tab===t?'page':undefined} className={tab===t?'active':''} onClick={()=>changeTab(t)}><span className="nav-icon"><Icon name={t==='Hoy'?'today':t==='Anteriores'?'archive':t==='Guardadas'?'bookmark':t==='Eventos'?'calendar':'settings'}/></span><span className="nav-label">{t}</span></button>)}</nav><div className="sidebar-bottom"><Icon name="calendar"/><div>Resumen diario<small>19:00 · Madrid</small></div></div></aside><div className="shell"><main><section className="heading"><div><h1>{tab==='Hoy'?'El mundo tech, al día':tab==='Anteriores'?'El mundo tech, día a día':tab==='Guardadas'?'Tus noticias, a tu ritmo':tab==='Eventos'?'Lo próximo en el mundo tech':'Ajustes'}</h1></div>{tab!=='Ajustes'&&<button className="refresh" aria-label="Actualizar contenido" title="Actualizar contenido" onClick={refresh} disabled={loading}><Icon name="refresh" className={loading?'spinning':''}/><span>Actualizar</span></button>}</section>{!online&&<div className="banner">Sin conexión. La interfaz está disponible; los datos en vivo requieren internet.</div>}{!configured&&<div className="banner"><b>VISTA DE DEMOSTRACIÓN</b><span>Tarjetas de ejemplo, sin noticias inventadas. Conecta Firebase para recibir tu resumen real.</span></div>}{saved.error&&tab!=='Guardadas'&&<div className="banner" role="alert">{saved.error}<button onClick={saved.reload}>Reintentar</button></div>}{notice&&<div role="status" className="banner notice">{notice}<button aria-label="Cerrar aviso" onClick={()=>setNotice('')}>×</button></div>}{tab==='Ajustes'?<div className="settings-layout"><AppearanceSettings value={appearance} onChange={setAppearance}/><NotificationSettings user={user} onNotice={setNotice}/><AccountSettings user={user} busy={busy} onAction={action} onRefresh={refresh}/></div>:<><div className="section-title">
  <div>
   <h2>{tab==='Hoy'?'Tu resumen de hoy':tab==='Anteriores'?'Archivo de noticias':tab==='Guardadas'?'Tus noticias guardadas':'Eventos y lanzamientos'}</h2>
   {tab==='Hoy'?<span>
    {formatDateES(today)}
    {todayEdition&&<> · {articles.length} {articles.length===1?'noticia':'noticias'} · {publicationTime
     ?<time className="publication-time" dateTime={todayEdition.publishedAt}>Publicado a las {publicationTime}</time>
     :'Edición publicada'}</>}
   </span>:<span>{tab==='Anteriores'?`${articles.length} noticias anteriores a hoy`:tab==='Guardadas'?`${articles.length} ${articles.length===1?'noticia guardada':'noticias guardadas'}`:'Fechas anunciadas oficialmente'}</span>}
  </div>
  {tab==='Anteriores'&&<select aria-label="Fecha de las noticias" value={archiveDate} onChange={e=>reading.update({date:e.target.value,filter:'Todas'})}>
   <option value="">Todas las fechas</option>
   {archive.map(d=><option key={d.id} value={d.date}>{formatDateES(d.date)}</option>)}
  </select>}
 </div>
 {(tab==='Hoy'||tab==='Anteriores'||tab==='Guardadas')&&<div className="filters">{categories.map(c=><button aria-pressed={c===activeFilter} className={c===activeFilter?'chosen':''} key={c} onClick={()=>reading.update({filter:c})}>{c}</button>)}</div>}
 {tab==='Guardadas'&&saved.error?<div className="empty" role="alert"><h3>No hemos podido cargar tus guardadas</h3><p>{saved.error}</p><button onClick={saved.reload}>Reintentar</button></div>
 :tab==='Guardadas'&&!saved.ready?<div className="empty" role="status">Sincronizando tus guardadas…</div>
 :loading&&tab!=='Guardadas'?<div className="grid" aria-busy="true" aria-label="Cargando noticias">{[1,2,3,4,5,6].map(n=><div key={n} className="skeleton"/>)}</div>
 :error&&tab!=='Guardadas'?<div className="empty" role="alert"><h3>No hemos podido cargar tu radar</h3><p>{error}</p><button onClick={refresh}>Reintentar</button></div>
 :(tab==='Hoy'||tab==='Anteriores'||tab==='Guardadas')?articles.length
  ?groupArchive?<div className="archive-groups">
   {[...archiveGroups].map(([groupDate,groupArticles])=><section key={groupDate} aria-labelledby={`archive-${groupDate}`}>
    <header className="archive-date" id={`archive-${groupDate}`}><time dateTime={groupDate}>{formatEditionDateES(groupDate)}</time></header>
    <div className="grid">{groupArticles.map(renderCard)}</div>
   </section>)}
  </div>:<div className="grid">{articles.map(renderCard)}</div>
  :tab==='Hoy'?todayEdition
   ?<Empty title="Sin noticias en esta categoría" text="Elige otra categoría para ver más noticias de hoy."/>
   :<Empty title="La edición de hoy aún no está disponible" text="Se publica a partir de las 19:00, hora de Madrid. Mientras tanto, puedes consultar Anteriores."/>
  :tab==='Anteriores'?<Empty title="Sin noticias anteriores" text="Aquí encontrarás las noticias publicadas antes de hoy. Prueba otra fecha o categoría."/>
  :<Empty title="Nada guardado todavía" text="Pulsa el marcador de una noticia para guardarla aquí y leerla cuando quieras."/>
 :upcoming.length?upcoming.map(e=><article className="list-card" key={e.id}><span className="tag">{formatDateES(e.date)} · Confirmado</span><h3>{e.title}</h3><p>{e.summary}</p><a onClick={reading.capture} onAuxClick={reading.capture} href={e.url} target="_blank" rel="noopener noreferrer">Ver anuncio oficial ↗</a></article>):<Empty title="Sin eventos confirmados" text="Los eventos y lanzamientos aparecerán aquí cuando tengan una fecha anunciada oficialmente."/>}</>}</main></div></>;
}
function NewsCard({article:a,index,date,saved,saving,canSave,onSave,expanded,onToggle,onOpenSource}:{article:SavedArticle;index:number;date?:string;saved:boolean;saving:boolean;canSave:boolean;onSave:()=>void;expanded:boolean;onToggle:()=>void;onOpenSource:()=>void}){
 const short=brief(a.summary);
 const panelId=React.useId();
 const paragraphs=expanded?Array.from(new Intl.Segmenter('es',{granularity:'sentence'}).segment(a.summary),part=>part.segment.trim()).filter(Boolean):[short];
 return <article className="card news-card" id={readingId(savedKey(a))}><div className="card-top"><div className="card-meta"><span className={'tag tag-'+index%3}>{a.category}</span>{date&&<time dateTime={date}>{formatDateES(date)}</time>}</div><div className="card-actions">{a.url&&<ShareButton title={a.title} url={a.url} onBeforeShare={onOpenSource}/>}<button className={'save-news'+(saved?' is-saved':'')} title={saving?'Guardando…':saved?'Quitar de guardadas':'Guardar noticia'} aria-label={(saved?'Quitar de guardadas: ':'Guardar noticia: ')+a.title} aria-pressed={saved} aria-busy={saving} disabled={!canSave||saving} onClick={onSave}><Icon name={saving?'refresh':'bookmark'} className={saving?'spinning':undefined}/></button></div></div><h3>{a.title}</h3><div className="news-summary" id={panelId} lang="es">{paragraphs.map((text,i)=><p key={i}>{text}</p>)}</div>{short!==a.summary.trim()&&<button className="read-more" aria-expanded={expanded} aria-controls={panelId} onClick={onToggle}>{expanded?'Ver menos':'Ampliar resumen'} <span aria-hidden="true">{expanded?'−':'+'}</span></button>}<div className="card-footer"><span>{a.source}</span>{a.url?<a href={a.url} target="_blank" rel="noopener noreferrer" aria-label={'Leer en '+a.source+': '+a.title} onClick={onOpenSource} onAuxClick={onOpenSource}>Leer noticia ↗</a>:<span className="demo-label">DEMO</span>}</div></article>;
}
function Empty({title,text}:{title:string;text:string}){return <div className="empty"><span className="empty-symbol"><Icon name="radar"/></span><h3>{title}</h3><p>{text}</p></div>}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
