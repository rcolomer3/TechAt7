export const readingTabs=['Hoy','Anteriores','Guardadas','Eventos','Ajustes'] as const;
export type ReadingTab=typeof readingTabs[number];
export type ReadingView={tab:ReadingTab;date:string;filter:string};
export type ReadingRecord={day:string;view:ReadingView;y:number;anchor:string;offset:number;expanded:string[]};
export const defaultView=():ReadingView=>({tab:'Hoy',date:'',filter:'Todas'});
export function readPosition(record:ReadingRecord|undefined,today:string,edition:string|null=null):ReadingRecord{
 const empty:ReadingRecord={day:today,view:defaultView(),y:0,anchor:'',offset:0,expanded:[]};
 if(edition&&/^\d{4}-\d{2}-\d{2}$/.test(edition)&&edition<=today)return {...empty,view:{tab:edition===today?'Hoy':'Anteriores',date:edition,filter:'Todas'}};
 if(!record||(record.view.tab==='Hoy'&&record.day!==today))return empty;
 return {...record,day:today,view:{...record.view,date:record.view.date<today?record.view.date:''}};
}
