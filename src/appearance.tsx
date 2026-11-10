import {useLayoutEffect,useState} from 'react';
import {Icon} from './icons';
export type Appearance='light'|'dark'|'system';
const KEY='techradar-appearance';
function savedAppearance():Appearance{try{const saved=localStorage.getItem(KEY);return saved==='light'||saved==='dark'?saved:'system';}catch{return 'system';}}
export function useAppearance(){
 const [appearance,setAppearance]=useState<Appearance>(savedAppearance);
 useLayoutEffect(()=>{
  const media=matchMedia('(prefers-color-scheme: dark)');
  const apply=()=>{const dark=appearance==='dark'||(appearance==='system'&&media.matches);document.documentElement.dataset.theme=dark?'dark':'light';document.documentElement.style.colorScheme=dark?'dark':'light';document.querySelector('meta[name="theme-color"]')?.setAttribute('content',dark?'#080d1c':'#0e1a33');};
  apply();try{localStorage.setItem(KEY,appearance);}catch{/* The choice still works when storage is unavailable. */}
  media.addEventListener('change',apply);return()=>media.removeEventListener('change',apply);
 },[appearance]);
 useLayoutEffect(()=>{const sync=(event:StorageEvent)=>{if(event.key===KEY)setAppearance(savedAppearance());};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);},[]);
 return [appearance,setAppearance] as const;
}
const choices=[{value:'light',label:'Claro',icon:'sun'},{value:'dark',label:'Oscuro',icon:'moon'},{value:'system',label:'Automático',icon:'display'}] as const;
export function AppearanceSettings({value,onChange}:{value:Appearance;onChange:(value:Appearance)=>void}){return <section className="settings-group appearance-group" aria-labelledby="appearance-heading"><div className="group-heading"><span className="group-symbol purple"><Icon name="appearance"/></span><div><h2 id="appearance-heading">Apariencia</h2><p>A tu gusto. O al ritmo de tu dispositivo.</p></div></div><fieldset className="theme-options"><legend className="sr-only">Elige la apariencia de TechAt7</legend>{choices.map(choice=><label key={choice.value} className={'theme-option '+(choice.value===value?'selected':'')}><input type="radio" name="appearance" value={choice.value} checked={choice.value===value} onChange={()=>onChange(choice.value)}/><span className={'theme-preview preview-'+choice.value} aria-hidden="true"><span className="mini-sidebar"/><span className="mini-content"><i/><b/><b/></span><span className="mini-dock"/></span><span className="theme-name"><Icon name={choice.icon}/>{choice.label}</span><span className="theme-check" aria-hidden="true">{choice.value===value?<Icon name="check"/>:<span/>}</span></label>)}</fieldset><p className="settings-caption">{value==='system'?'Cambia entre claro y oscuro con la apariencia del sistema.':'Se guarda en este dispositivo y se aplica también a la pantalla de entrada.'}</p></section>}
