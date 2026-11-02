import type {Digest} from './models';
export function newsDigests(digests:Digest[], today:string, tab:string, date='') {
 const available=digests.filter(d=>d.date<=today).sort((a,b)=>b.date.localeCompare(a.date));
 if(tab==='Hoy')return available.filter(d=>d.date===today);
 if(tab==='Anteriores')return available.filter(d=>d.date<today&&(!date||d.date===date));
 return available;
}
export function brief(summary:string){
 const text=summary.trim();
 const first=new Intl.Segmenter('es',{granularity:'sentence'}).segment(text)[Symbol.iterator]().next().value?.segment.trim()||text;
 if(first.length<=240)return first;
 return first.slice(0,237).replace(/\s+\S*$/,'')+'…';
}
export const searchable=(text:string)=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');
