import {useMemo,useState} from 'react';
import {Icon} from './icons';
import {categoryCatalog,newsCategories} from './categories';
import {dailyLimitOptions} from './preferences';
import {searchable} from './news';

type CategorySettingsProps={
 selected:string[];
 onToggle:(category:string)=>void;
 onSetCategories:(categories:string[])=>void;
 dailyLimit:number;
 onDailyLimit:(limit:number)=>void;
 saving?:boolean;
 error?:string;
 cloud?:boolean;
};

export function CategorySettings({selected,onToggle,onSetCategories,dailyLimit,onDailyLimit,saving,error,cloud}:CategorySettingsProps){
 const [query,setQuery]=useState('');
 const needle=searchable(query.trim());
 const visible=useMemo(()=>needle
  ?categoryCatalog.filter(category=>searchable(category.name+' '+category.description).includes(needle))
  :categoryCatalog,[needle]);
 const visibleNames=visible.map(category=>category.name);
 const allVisibleSelected=visibleNames.length>0&&visibleNames.every(name=>selected.includes(name));
 const someVisibleSelected=visibleNames.some(name=>selected.includes(name));
 const filtered=needle.length>0;

 function selectVisible(){
  onSetCategories([...new Set([...selected,...visibleNames])]);
 }
 function clearVisible(){
  onSetCategories(selected.filter(name=>!visibleNames.includes(name)));
 }

 return <section className="settings-group category-settings" aria-labelledby="categories-heading">
  <div className="group-heading"><span className="group-symbol green"><Icon name="radar"/></span><div><h2 id="categories-heading">Categorías y cantidad</h2><p>Busca los temas que quieres leer y decide cuántas noticias ver.</p></div></div>
  <div className="daily-limit">
   <label htmlFor="daily-limit">Noticias por edición</label>
   <select id="daily-limit" value={dailyLimit} onChange={event=>onDailyLimit(Number(event.target.value))}>
    {dailyLimitOptions.map(limit=><option key={limit} value={limit}>{limit===0?'Todas':limit}</option>)}
   </select>
   <small>Se aplica a Hoy y a cada fecha de Anteriores. Guardadas no se filtra.</small>
  </div>
  <div className="category-search" role="search">
   <Icon name="search"/>
   <input type="search" value={query} onChange={event=>setQuery(event.target.value)}
    aria-label="Buscar categorías" placeholder="Buscar categorías"/>
   {query&&<button type="button" aria-label="Borrar búsqueda" onClick={()=>setQuery('')}>×</button>}
  </div>
  <div className="category-list" role="group" aria-label="Categorías de noticias">
   {visible.map(category=>{
    const checked=selected.includes(category.name);
    return <label key={category.name} className={'category-option'+(checked?' selected':'')}>
     <input type="checkbox" checked={checked} onChange={()=>onToggle(category.name)}/>
     <span className="category-check" aria-hidden="true">{checked?<Icon name="check"/>:null}</span>
     <span className="category-copy"><strong>{category.name}</strong><small>{category.description}</small></span>
    </label>;
   })}
  </div>
  {!visible.length&&<p className="category-empty" role="status">No hay categorías que coincidan con «{query.trim()}».</p>}
  <div className="category-actions">
   <button type="button" onClick={selectVisible} disabled={allVisibleSelected||!visibleNames.length}>{filtered?'Seleccionar visibles':'Seleccionar todas'}</button>
   <button type="button" onClick={clearVisible} disabled={!someVisibleSelected}>{filtered?'Quitar visibles':'Quitar todas'}</button>
   <span aria-live="polite">{selected.length} de {newsCategories.length} activas{filtered?` · ${visible.length} visibles`:''}</span>
  </div>
  {error?<p className="settings-caption settings-error" role="alert">{error}</p>
   :saving?<p className="settings-caption settings-saving" role="status">Guardando en Firebase…</p>
   :cloud?<p className="settings-caption">Tus preferencias se guardan en Firebase y se sincronizan en todos tus dispositivos.</p>
   :null}
  <p className="settings-caption">Los filtros «Todas» de Hoy y Anteriores muestran solo las categorías activas. Tus noticias guardadas siguen siempre disponibles.</p>
 </section>;
}
