export const readingTabs=['Hoy','Anteriores','Guardadas','Eventos','Ajustes'] as const;
export type ReadingTab=typeof readingTabs[number];
export type ReadingView={tab:ReadingTab;date:string;filter:string};
export type ReadingRecord={version:1;day:string;view:ReadingView;y:number;anchor:string;offset:number;expanded:string[]};
export const defaultView=():ReadingView=>({tab:'Hoy',date:'',filter:'Todas'});
export function readPosition(raw:string|null,today:string,edition:string|null=null):ReadingRecord{
 const empty:ReadingRecord={version:1,day:today,view:defaultView(),y:0,anchor:'',offset:0,expanded:[]};
 if(edition&&/^\d{4}-\d{2}-\d{2}$/.test(edition)&&edition<=today)return {...empty,view:{tab:edition===today?'Hoy':'Anteriores',date:edition,filter:'Todas'}};
 try{
  const value=JSON.parse(raw||'null');
  if(value?.version!==1||!readingTabs.includes(value.view?.tab)||typeof value.view.filter!=='string'||typeof value.view.date!=='string')return empty;
  if(value.view.tab==='Hoy'&&value.day!==today)return empty;
  return {...empty,view:{tab:value.view.tab,date:/^\d{4}-\d{2}-\d{2}$/.test(value.view.date)&&value.view.date<today?value.view.date:'',filter:value.view.filter.slice(0,256)},y:Number.isFinite(value.y)?Math.max(0,value.y):0,anchor:typeof value.anchor==='string'?value.anchor.slice(0,3000):'',offset:Number.isFinite(value.offset)?value.offset:0,expanded:Array.isArray(value.expanded)?value.expanded.filter((id:unknown)=>typeof id==='string').slice(0,200):[]};
 }catch{return empty;}
}
