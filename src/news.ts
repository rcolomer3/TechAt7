import type {Digest} from './models';
export function newsDigests(digests:Digest[], today:string, tab:string, date='') {
 const available=digests.filter(d=>d.date<=today).sort((a,b)=>b.date.localeCompare(a.date)||Number(!!a.extra)-Number(!!b.extra));
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

/** Drops stories repeated by a same-day extra edition. */
export function uniqueArticles<T extends {url:string}>(articles:T[]):T[]{
 const seen=new Set<string>();
 return articles.filter(article=>{
  const key=article.url.trim();
  if(!key)return true;
  if(seen.has(key))return false;
  seen.add(key);
  return true;
 });
}

/** Changes when a new edition is published, so the app can announce it. */
export function digestKey(digest:{date:string;contentHash?:string;articles:unknown[]}):string{
 return `${digest.date}:${digest.contentHash||digest.articles.length}`;
}

/** Newest date already available, including same-day extras. */
export function latestEditionDate(digests:{date:string}[],today:string):string{
 return digests.filter(d=>d.date<=today).reduce((max,d)=>d.date>max?d.date:max,'');
}

/** Combines the daily edition and its extras for the newest date. */
export function latestEditionKey(digests:{date:string;contentHash?:string;articles:unknown[]}[],today:string):string{
 const latest=latestEditionDate(digests,today);
 if(!latest)return '';
 return digests.filter(d=>d.date===latest).map(digestKey).sort().join('|');
}

/** Caps how many stories are shown from each edition; 0 or less means no limit. */
export function limitPerEdition<T extends {editionDate:string;editionId?:string}>(articles:T[],limit:number):T[]{
 if(!Number.isInteger(limit)||limit<=0)return articles;
 const shown=new Map<string,number>();
 return articles.filter(article=>{
  const key=article.editionId||article.editionDate;
  const used=shown.get(key)||0;
  if(used>=limit)return false;
  shown.set(key,used+1);
  return true;
 });
}
