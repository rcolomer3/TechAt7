import React,{useEffect,useRef,useState} from 'react';
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
import {newsDigests,brief,searchable,limitPerEdition,latestEditionKey,latestEditionDate,uniqueArticles} from './news';
import {useSavedNews,savedKey,type SavedArticle} from './saved-news';
import {useRadarPreferences} from './preferences';
import {CategorySettings} from './category-settings';
import {useReadingPosition,readingId} from './reading-position';
import {readingTabs} from './reading-state';
import {ShareButton} from './share-button';
import {categoryColor} from './categories';
import './style.css';
const pageSizes=[10,20,30,50];
const pageSizeKey='techat7-archive-page-size';
const tabs=readingTabs;
function App(){
 const [appearance,setAppearance]=useAppearance();
 const [authReady,setAuthReady]=useState(!configured);
 const [archiveQuery,setArchiveQuery]=useState('');
 const [archiveCategories,setArchiveCategories]=useState<string[]>([]);
 const [savedQuery,setSavedQuery]=useState('');
 const [page,setPage]=useState(1);
 const [filtersOpen,setFiltersOpen]=useState(false);
 const filtersId=React.useId();
 const [pageSize,setPageSize]=useState(()=>{
  const stored=Number(localStorage.getItem(pageSizeKey));
  return pageSizes.includes(stored)?stored:20;
 });
 const archiveStart=useRef<HTMLDivElement>(null);
 const readingHeader=useRef<HTMLDivElement>(null);
 const archiveSearch=useRef<HTMLInputElement>(null);
 useEffect(()=>{const receive=(event:MessageEvent)=>{if(event.data?.type==='radar-digest')window.dispatchEvent(new Event('radar-digest'));};navigator.serviceWorker?.addEventListener('message',receive);return()=>navigator.serviceWorker?.removeEventListener('message',receive);},[]);
 const [data,setData]=useState<RadarData>(configured?{digests:[],updates:[],events:[]}:demo),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState(''),[user,setUser]=useState<User|null>(null),[busy,setBusy]=useState(false),[online,setOnline]=useState(navigator.onLine);
 const [syncing,setSyncing]=useState(false),[lastSync,setLastSync]=useState<number|null>(null),[syncIssue,setSyncIssue]=useState(false),[newEdition,setNewEdition]=useState<string|null>(null),[showAll,setShowAll]=useState(false);
 const knownEdition=useRef<string|null>(null);
 async function refresh(mode:'initial'|'manual'|'auto'='auto'):Promise<boolean>{
  if(configured&&!auth?.currentUser)return false;
  if(mode==='initial')setLoading(true);else setSyncing(true);
  setError('');
  try{
   const next=configured?await loadRadar():demo;
   const key=latestEditionKey(next.digests,madridDate());
   const found=!!(key&&knownEdition.current&&key!==knownEdition.current);
   if(found){setNewEdition(latestEditionDate(next.digests,madridDate()));setNotice('');}
   if(key)knownEdition.current=key;
   setData(next);setLastSync(Date.now());setSyncIssue(false);
   if(mode==='manual')setShowAll(true);
   if(mode==='manual'&&!found)setNotice(key?'Estás al día. No hay noticias nuevas.':'Estás al día.');
   return true;
  }catch(e){
   setSyncIssue(true);
   if(mode!=='auto')setError((e as Error).message);
   return false;
  }finally{setLoading(false);setSyncing(false);}
 }
 useEffect(()=>{if(!configured)void refresh('initial');const unsub=auth?onAuthStateChanged(auth,next=>{setUser(next);setAuthReady(true);if(next)void refresh('initial');else{knownEdition.current=null;setNewEdition(null);setLastSync(null);setSyncIssue(false);setShowAll(false);setData({digests:[],updates:[],events:[]});setLoading(false);setNotice('');}}):()=>{};const on=()=>setOnline(navigator.onLine);const receive=()=>void refresh('auto');window.addEventListener('online',on);window.addEventListener('offline',on);window.addEventListener('radar-digest',receive);navigator.serviceWorker?.register(import.meta.env.BASE_URL+'sw.js').catch(()=>setNotice('No se pudo activar el modo sin conexión.'));return()=>{unsub();window.removeEventListener('online',on);window.removeEventListener('offline',on);window.removeEventListener('radar-digest',receive);};},[]);
 useEffect(()=>{
  if(!configured||!user)return;
  let timer:number|undefined;
  const stop=()=>{if(timer!==undefined){window.clearInterval(timer);timer=undefined;}};
  const start=()=>{stop();timer=window.setInterval(()=>{if(document.visibilityState==='visible'&&navigator.onLine)void refresh('auto');},300000);};
  const onVisibility=()=>{if(document.visibilityState==='visible'){void refresh('auto');start();}else stop();};
  const onFocus=()=>{if(document.visibilityState==='visible'&&navigator.onLine)void refresh('auto');};
  const onOnline=()=>{void refresh('auto');start();};
  start();
  document.addEventListener('visibilitychange',onVisibility);
  window.addEventListener('focus',onFocus);
  window.addEventListener('online',onOnline);
  return()=>{stop();document.removeEventListener('visibilitychange',onVisibility);window.removeEventListener('focus',onFocus);window.removeEventListener('online',onOnline);};
 },[user?.uid]);
 async function action(fn:()=>Promise<unknown>,message=''){setBusy(true);try{await fn();setNotice(message);}catch(e){setNotice((e as Error).message);}finally{setBusy(false);}}
 const saved=useSavedNews(user?.uid);
 const categoryPrefs=useRadarPreferences(configured?user?.uid||'signed-out':'demo');
 useEffect(()=>{setShowAll(false);},[categoryPrefs.dailyLimit]);
 const today=madridDate();
 const reading=useReadingPosition({uid:configured?user?.uid||'signed-out':'demo',enabled:authReady&&(!configured||!!user),day:today,feedReady:!loading&&!error,savedReady:saved.ready&&!saved.error});
 const {tab,date,filter}=reading.view;
 const syncLabel=syncing?'Sincronizando…':!online?'Sin conexión':syncIssue?'No se pudo sincronizar':lastSync?`Al día · ${formatPublicationTimeES(new Date(lastSync).toISOString())??''}`:'';
 useEffect(()=>{
  if(tab!=='Anteriores')setArchiveQuery('');
 },[tab]);
 useEffect(()=>{if(tab==='Hoy'&&newEdition)setNewEdition(null);},[tab,newEdition]);
 const archive=newsDigests(data.digests,today,'Anteriores');
 const archiveDate=archive.some(d=>d.date===date)?date:'';
 const visible=newsDigests(data.digests,today,tab,archiveDate);
 const hasExtra=visible.some(d=>d.extra);
 const allArticles=tab==='Guardadas'?[...saved.items].sort((a,b)=>b.editionDate.localeCompare(a.editionDate)):uniqueArticles(visible.flatMap(d=>d.articles.map(a=>({...a,editionDate:d.date,editionId:d.id}))));
 const searchInSaved=tab==='Guardadas';
 const searchQuery=searchInSaved?savedQuery:archiveQuery;
 const setSearchQuery=searchInSaved?setSavedQuery:setArchiveQuery;
 const searchLabel=searchInSaved?'Buscar en Guardadas':'Buscar en Anteriores';
 const searchTerms=tab==='Anteriores'||searchInSaved?searchable(searchQuery).trim().split(/\s+/).filter(Boolean):[];
 const matchingArticles=searchTerms.length?allArticles.filter(article=>{
  const text=searchable([article.title,article.source,searchInSaved?article.category:article.summary].join(' '));
  return searchTerms.every(term=>text.includes(term));
 }):allArticles;
 const preferred=new Set(categoryPrefs.categories);
 const categoryArticles=tab==='Guardadas'?matchingArticles:matchingArticles.filter(article=>preferred.has(article.category));
 const isArchive=tab==='Anteriores';
 const categoryOptions=isArchive?allArticles.filter(article=>preferred.has(article.category)):searchInSaved?allArticles:categoryArticles;
 const articleCategories=[...new Set([
  ...categoryOptions.map(article=>article.category),
  ...(isArchive?archiveCategories.filter(category=>preferred.has(category)):[])
 ])];
 const categories=['Todas',...articleCategories.sort((a,b)=>a.localeCompare(b,'es'))];
 const activeFilter=categories.includes(filter)?filter:'Todas';
 const selectedArchiveCategories=archiveCategories.filter(category=>preferred.has(category));
 const filteredArticles=isArchive
  ?selectedArchiveCategories.length?categoryArticles.filter(article=>selectedArchiveCategories.includes(article.category)):categoryArticles
  :activeFilter==='Todas'?categoryArticles:categoryArticles.filter(article=>article.category===activeFilter);
 const filterLabel=isArchive
  ?selectedArchiveCategories.length===0?'Todas':selectedArchiveCategories.length===1?selectedArchiveCategories[0]:`${selectedArchiveCategories.length} seleccionadas`
  :activeFilter;
 function selectCategory(category:string){
  if(isArchive){
   setArchiveCategories(current=>{
    const selected=current.filter(item=>preferred.has(item));
    if(category==='Todas')return [];
    return selected.includes(category)?selected.filter(item=>item!==category):[...selected,category];
   });
   return;
  }
  reading.update({filter:category});
  setFiltersOpen(false);
 }
 const dailyLimit=showAll?0:categoryPrefs.dailyLimit;
 const articles=tab==='Guardadas'?filteredArticles:limitPerEdition(filteredArticles,dailyLimit);
 const noPreferred=tab!=='Guardadas'&&categoryPrefs.categories.length===0;
 const limitNote=showAll?' · todas las noticias de la edición':categoryPrefs.dailyLimit>0?` · máximo ${categoryPrefs.dailyLimit} por edición`:'';
 const todayEdition=tab==='Hoy'?visible[0]:undefined;
 const publicationTime=formatPublicationTimeES(todayEdition?.publishedAt);
 const pages=Math.max(1,Math.ceil(articles.length/pageSize));
 const currentPage=Math.min(page,pages);
 const displayed=tab==='Anteriores'?articles.slice((currentPage-1)*pageSize,currentPage*pageSize):articles;
 useEffect(()=>{setPage(1);},[archiveQuery,archiveDate,archiveCategories,activeFilter,pageSize,dailyLimit]);
 function changePage(next:number){
  setPage(next);
  const start=archiveStart.current;
  if(start){
   const headerHeight=readingHeader.current?.offsetHeight??0;
   const top=window.scrollY+start.getBoundingClientRect().top-headerHeight-(readingHeader.current?parseFloat(getComputedStyle(readingHeader.current).top)||0:0);
   window.scrollTo({top});
  }
 }
 const groupArchive=tab==='Anteriores'&&!archiveDate;
 const archiveGroups=new Map<string,SavedArticle[]>();
 if(groupArchive){
  for(const article of displayed){
   const group=archiveGroups.get(article.editionDate);
   if(group)group.push(article);
   else archiveGroups.set(article.editionDate,[article]);
  }
 }
 useEffect(()=>{const contentReady=tab==='Guardadas'?saved.ready&&!saved.error:!loading&&!error;if(reading.ready&&contentReady&&!categories.includes(filter))reading.update({filter:'Todas'});},[reading.ready,tab,saved.ready,saved.error,loading,error,filter,categories.join('\u0000')]);
 const upcoming=data.events.filter(e=>e.confirmed&&e.date>=madridDate());
 const changeTab=(t:typeof tabs[number])=>{
  if(t!==tab)setFiltersOpen(false);
  reading.update({tab:t,date:'',filter:'Todas'});
 };
 const archiveImages=tab==='Guardadas'?new Map(data.digests.flatMap(digest=>digest.articles
  .filter(article=>article.image)
  .map(article=>[savedKey({...article,editionDate:digest.date}),article.image] as const))):null;
 function renderCard(article:SavedArticle){
  const key=savedKey(article);
  const image=article.image??archiveImages?.get(key);
  return <NewsCard key={key} article={image?{...article,image}:article}
   date={tab==='Hoy'||groupArchive?undefined:article.editionDate}
   saved={saved.items.some(item=>savedKey(item)===key)} saving={saved.pending.includes(key)} canSave={saved.ready}
   onSave={()=>action(()=>saved.toggle(article))} expanded={reading.expanded.includes(key)}
   onToggle={()=>reading.toggleExpanded(key)} onOpenSource={reading.capture}/>;
 }
 const preparingSession=!authReady||((!configured||user)&&(!reading.ready||!categoryPrefs.ready));
 if(preparingSession||(configured&&!user)){
  const status=preparingSession
   ? authReady ? 'Preparando tu edición…' : 'Comprobando sesión…'
   : busy ? 'Conectando con Google…' : 'Accede a tu cuenta';
  const detail=preparingSession
   ? authReady ? 'Cargando tu espacio de lectura.' : 'Buscando tu sesión guardada.'
   : busy ? 'Completa el acceso en la ventana de Google.' : 'Lee las noticias del día y accede a tus guardadas.';
  return <div className="auth-screen">
   <main className="login-card" aria-labelledby="login-title">
    <AppIcon className="radar-mark"/>
    <h1 id="login-title">TechAt7</h1>
    <p className="login-subtitle">Tu resumen diario de tecnología</p>
    <div className="auth-stage">
     <div className="auth-notice" role="status" aria-atomic="true">
      <div className="auth-status-line">
       {(preparingSession||busy)&&<span className="auth-spinner" aria-hidden="true"/>}
       <strong>{status}</strong>
      </div>
      <p>{detail}</p>
     </div>
     <button type="button" className="google-login" data-preparing={preparingSession} disabled={preparingSession||busy} onClick={()=>action(login)}>
      <GoogleIcon/>
      <span>Entrar con Google</span>
     </button>
     {!preparingSession&&!busy&&notice&&<p className="login-error" role="alert">{notice}</p>}
    </div>
   </main>
  </div>;
 }
 return <div className="shell"><aside className="navigation"><a className="navigation-brand" href={import.meta.env.BASE_URL} aria-label="TechAt7 inicio"><AppIcon/><span>TechAt7<small>Resumen diario</small></span></a><nav className="navigation-tabs" aria-label="Principal">{tabs.map(t=><button key={t} aria-current={tab===t?'page':undefined} className={tab===t?'active':''} onClick={()=>changeTab(t)}><span className="nav-icon"><Icon name={t==='Hoy'?'today':t==='Anteriores'?'archive':t==='Guardadas'?'bookmark':t==='Eventos'?'calendar':'settings'}/>{t==='Hoy'&&newEdition&&tab!=='Hoy'&&<span className="nav-dot" aria-hidden="true"/>}</span><span className="nav-label">{t}</span></button>)}</nav></aside><main className={tab==='Ajustes'?undefined:'reading-main'}><div ref={readingHeader} className={tab==='Ajustes'?undefined:'reading-header'}><section className="heading"><div><h1 className={tab==='Eventos'?'heading-long-title':undefined}>{tab==='Hoy'?'El mundo tech, al día':tab==='Anteriores'?'El mundo tech, día a día':tab==='Guardadas'?'Tus noticias, a tu ritmo':tab==='Eventos'?'Lo próximo en el mundo tech':'Ajustes'}</h1></div>{tab!=='Ajustes'&&<button className="refresh" aria-label={syncing?'Sincronizando noticias':'Sincronizar noticias'} title={syncLabel?`${syncLabel} · Pulsa para sincronizar`:'Sincronizar noticias'} onClick={()=>void refresh('manual')} disabled={loading||syncing}><Icon name="refresh" className={loading||syncing?'spinning':''}/><span>{syncing?'Sincronizando':'Sincronizar'}</span></button>}</section>{newEdition&&tab!=='Hoy'&&<div className="banner new-edition" role="status"><b>NUEVA EDICIÓN</b><span>{newEdition===today?'Ya está disponible la edición de hoy.':`Ya está disponible la edición del ${formatDateES(newEdition)}.`}</span><button type="button" className="new-edition-action" onClick={()=>{setNewEdition(null);changeTab('Hoy');}}>Ver ahora</button><button type="button" className="new-edition-dismiss" aria-label="Descartar aviso" onClick={()=>setNewEdition(null)}>×</button></div>}{!online&&<div className="banner">Sin conexión. La interfaz está disponible; los datos en vivo requieren internet.</div>}{!configured&&<div className="banner"><b>VISTA DE DEMOSTRACIÓN</b><span>Tarjetas de ejemplo, sin noticias inventadas. Conecta Firebase para recibir tu resumen real.</span></div>}{saved.error&&tab!=='Guardadas'&&<div className="banner" role="alert">{saved.error}<button onClick={saved.reload}>Reintentar</button></div>}{notice&&<div role="status" className="banner notice">{notice}<button aria-label="Cerrar aviso" onClick={()=>setNotice('')}>×</button></div>}{tab!=='Ajustes'&&<><div className="section-title">
  <div>
   <h2>{tab==='Hoy'?'Tu resumen de hoy':tab==='Anteriores'?'Archivo de noticias':tab==='Guardadas'?'Tus noticias guardadas':'Eventos y lanzamientos'}</h2>
   {tab==='Hoy'?<span>
    {formatDateES(today)}
    {todayEdition&&<> · {articles.length} {articles.length===1?'noticia':'noticias'}{limitNote}{hasExtra?' · edición extra':''} · {publicationTime
     ?<time className="publication-time" dateTime={todayEdition.publishedAt}>Publicado a las {publicationTime}</time>
     :'Edición publicada'}</>}
   </span>:tab==='Anteriores'?<span aria-live="polite">{searchTerms.length
    ?`${articles.length} ${articles.length===1?'resultado':'resultados'}${limitNote}`
    :`${articles.length} noticias anteriores a hoy${limitNote}`}</span>
    :<span aria-live="polite">{tab==='Guardadas'?`${articles.length} ${searchTerms.length?(articles.length===1?'resultado':'resultados'):(articles.length===1?'noticia guardada':'noticias guardadas')}`:'Fechas anunciadas oficialmente'}</span>}
  </div>
  {tab==='Anteriores'&&<select aria-label="Fecha de las noticias" value={archiveDate} onChange={e=>reading.update({date:e.target.value,filter:'Todas'})}>
   <option value="">Todas las fechas</option>
   {archive.map(d=><option key={d.id} value={d.date}>{formatDateES(d.date)}</option>)}
  </select>}
 </div>
 {(tab==='Anteriores'||searchInSaved)&&<div className="archive-search" role="search" aria-label={searchLabel}>
  <Icon name="search"/>
  <input ref={archiveSearch} type="search" value={searchQuery} onChange={event=>setSearchQuery(event.target.value)}
   aria-label={searchLabel} placeholder={searchLabel}/>
  {searchQuery&&<button type="button" aria-label="Borrar búsqueda" onClick={()=>{
   setSearchQuery('');
   archiveSearch.current?.focus();
  }}>×</button>}
 </div>}
 {(tab==='Hoy'||tab==='Anteriores'||tab==='Guardadas')&&<div className="category-filters">
  {categories.length>5&&<button type="button" className="mobile-filters-toggle" aria-expanded={filtersOpen} aria-controls={filtersId} onClick={()=>setFiltersOpen(open=>!open)}>
   <span>Categorías · {filterLabel}</span>
   <span aria-hidden="true">{filtersOpen?'−':'+'}</span>
  </button>}
  <div id={filtersId} className={'filters'+(categories.length>5&&!filtersOpen?' filters-collapsed':'')}>{categories.map(category=>{
   const selected=isArchive
    ?category==='Todas'?selectedArchiveCategories.length===0:selectedArchiveCategories.includes(category)
    :category===activeFilter;
   return <button type="button" aria-pressed={selected} className={selected?'chosen':''} key={category} onClick={()=>selectCategory(category)}>{category}</button>;
  })}{tab!=='Guardadas'&&<button type="button" className="filter-manage" aria-label="Elegir categorías que quiero leer" onClick={()=>changeTab('Ajustes')}><Icon name="settings"/><span>Categorías</span></button>}</div></div>}
 </>}</div>
 {tab==='Ajustes'?<div className="settings-layout"><AppearanceSettings value={appearance} onChange={setAppearance}/><CategorySettings selected={categoryPrefs.categories} onToggle={categoryPrefs.toggle} onSetCategories={categoryPrefs.setCategories} dailyLimit={categoryPrefs.dailyLimit} onDailyLimit={categoryPrefs.setDailyLimit} saving={categoryPrefs.saving} error={categoryPrefs.error} cloud={configured}/><section className="settings-panel">
 <h2>Historial de noticias</h2>
 <label className="daily-limit">
  Noticias por página en Anteriores
  <select value={pageSize} onChange={event=>{
   const next=Number(event.target.value);
   setPageSize(next);
   localStorage.setItem(pageSizeKey,String(next));
  }}>
   {pageSizes.map(size=><option key={size} value={size}>{size}</option>)}
  </select>
 </label>
</section><NotificationSettings user={user} onNotice={setNotice}/><AccountSettings user={user} busy={busy} onAction={action} onRefresh={refresh}/></div>:<>
 {tab==='Anteriores'&&<div ref={archiveStart} className="archive-start"/>}
 {tab==='Guardadas'&&saved.error?<div className="empty" role="alert"><h3>No hemos podido cargar tus guardadas</h3><p>{saved.error}</p><button onClick={saved.reload}>Reintentar</button></div>
 :tab==='Guardadas'&&!saved.ready?<div className="empty" role="status">Sincronizando tus guardadas…</div>
 :loading&&tab!=='Guardadas'?<div className="grid" aria-busy="true" aria-label="Cargando noticias">{[1,2,3,4,5,6].map(n=><div key={n} className="skeleton"/>)}</div>
 :error&&tab!=='Guardadas'?<div className="empty" role="alert"><h3>No hemos podido cargar tu radar</h3><p>{error}</p><button onClick={()=>void refresh('manual')}>Reintentar</button></div>
 :noPreferred?<Empty title="Elige tus categorías" text="Activa al menos un tema en Ajustes para ver las noticias que te interesan." action={<button onClick={()=>changeTab('Ajustes')}>Elegir categorías</button>}/>
 :(tab==='Hoy'||tab==='Anteriores'||tab==='Guardadas')?articles.length
  ?groupArchive?<div className="archive-groups">
   {[...archiveGroups].map(([groupDate,groupArticles])=><section key={groupDate} aria-labelledby={`archive-${groupDate}`}>
    <header className="archive-date" id={`archive-${groupDate}`}><time dateTime={groupDate}>{formatEditionDateES(groupDate)}</time></header>
    <div className="grid">{groupArticles.map(renderCard)}</div>
   </section>)}
  </div>:<div className="grid">{displayed.map(renderCard)}</div>
  :tab==='Hoy'?todayEdition
   ?<Empty title={categories.length>1?'Sin noticias en esta categoría':'Sin noticias en tus categorías'} text={categories.length>1?'Elige otra categoría para ver más noticias de hoy.':'Hoy no hay noticias de los temas que has elegido. Puedes activar más categorías en Ajustes.'}/>
   :<Empty title="La edición de hoy aún no está disponible" text="Se publica a partir de las 19:00, hora de Madrid. Mientras tanto, puedes consultar Anteriores."/>
  :tab==='Anteriores'?searchTerms.length
   ?<Empty title="No encontramos coincidencias" text="Prueba con otras palabras o cambia la fecha o la categoría."/>
   :<Empty title="Sin noticias anteriores" text={categories.length>1?'Aquí encontrarás las noticias publicadas antes de hoy. Prueba otra fecha o categoría.':'No hay noticias anteriores de los temas que has elegido. Puedes activar más categorías en Ajustes.'}/>
  :searchTerms.length&&allArticles.length
   ?<Empty title="No encontramos coincidencias" text="Prueba con otro título, fuente o categoría."/>
   :<Empty title="Nada guardado todavía" text="Pulsa el marcador de una noticia para guardarla aquí y leerla cuando quieras."/>
 :upcoming.length?upcoming.map(e=><article className="list-card" key={e.id}><span className="tag">{formatDateES(e.date)} · Confirmado</span><h3>{e.title}</h3><p>{e.summary}</p><a onClick={reading.capture} onAuxClick={reading.capture} href={e.url} target="_blank" rel="noopener noreferrer">Ver anuncio oficial ↗</a></article>):<Empty title="Sin eventos confirmados" text="Los eventos y lanzamientos aparecerán aquí cuando tengan una fecha anunciada oficialmente."/>}
 {tab==='Anteriores'&&!loading&&!error&&pages>1&&<nav className="archive-pagination" aria-label="Páginas de Anteriores">
  <button type="button" disabled={currentPage===1} onClick={()=>changePage(currentPage-1)}><span aria-hidden="true">‹</span> Anterior</button>
  <span className="page-indicator" aria-live="polite"><span className="sr-only">Página </span>{currentPage} <span>de</span> {pages}</span>
  <button type="button" disabled={currentPage===pages} onClick={()=>changePage(currentPage+1)}>Siguiente <span aria-hidden="true">›</span></button>
 </nav>}
 </>}</main></div>;
}
function NewsCard({article:a,date,saved,saving,canSave,onSave,expanded,onToggle,onOpenSource}:{article:SavedArticle;date?:string;saved:boolean;saving:boolean;canSave:boolean;onSave:()=>void;expanded:boolean;onToggle:()=>void;onOpenSource:()=>void}){
 const [failedImage,setFailedImage]=useState('');
 const thumbnail=a.image?.url.startsWith('https://')&&a.image.url!==failedImage?a.image:undefined;
 const short=brief(a.summary);
 const panelId=React.useId();
 const paragraphs=expanded?Array.from(new Intl.Segmenter('es',{granularity:'sentence'}).segment(a.summary),part=>part.segment.trim()).filter(Boolean):[short];
 return <article className="card news-card" id={readingId(savedKey(a))} style={{'--category-color':categoryColor(a.category)} as React.CSSProperties}><div className="card-top"><div className="card-meta"><span className="tag category-tag">{a.category}</span>{date&&<time dateTime={date}>{formatDateES(date)}</time>}</div><div className="card-actions">{a.url&&<ShareButton title={a.title} url={a.url} onBeforeShare={onOpenSource}/>}<button className={'save-news'+(saved?' is-saved':'')} title={saving?'Guardando…':saved?'Quitar de guardadas':'Guardar noticia'} aria-label={(saved?'Quitar de guardadas: ':'Guardar noticia: ')+a.title} aria-pressed={saved} aria-busy={saving} disabled={!canSave||saving} onClick={onSave}><Icon name={saving?'refresh':'bookmark'} className={saving?'spinning':undefined}/></button></div></div>{thumbnail?<div className="news-headline"><h3>{a.title}</h3><img src={thumbnail.url} alt={thumbnail.alt} width="72" height="72" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={()=>setFailedImage(thumbnail.url)}/></div>:<h3>{a.title}</h3>}<div className="news-summary" id={panelId} lang="es">{paragraphs.map((text,i)=><p key={i}>{text}</p>)}</div>{short!==a.summary.trim()&&<button className="read-more" aria-expanded={expanded} aria-controls={panelId} onClick={onToggle}>{expanded?'Ver menos':'Ampliar resumen'} <span aria-hidden="true">{expanded?'−':'+'}</span></button>}<div className="card-footer"><span>{a.source}</span>{a.url?<a href={a.url} target="_blank" rel="noopener noreferrer" aria-label={'Leer en '+a.source+': '+a.title} onClick={onOpenSource} onAuxClick={onOpenSource}>Leer noticia ↗</a>:<span className="demo-label">DEMO</span>}</div></article>;
}
function Empty({title,text,action}:{title:string;text:string;action?:React.ReactNode}){return <div className="empty"><span className="empty-symbol"><Icon name="radar"/></span><h3>{title}</h3><p>{text}</p>{action&&<div className="empty-actions">{action}</div>}</div>}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);

