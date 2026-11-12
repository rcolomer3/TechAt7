export type Article = {id:string; title:string; summary:string; url:string; source:string; publishedAt:string; category:string};
export type Digest = {id:string; date:string; publishedAt:string; articles:Article[]; contentHash?:string; demo?:boolean; belowTarget?:boolean; editorialVersion?:number; language?:'es'; status:'published'};
export type Update = {id:string; platform:'iOS'|'macOS'|'Windows'|'Synology'; title:string; summary:string; url:string; publishedAt:string};
export type LaunchEvent = {id:string; title:string; date:string; summary:string; url:string; confirmed:true};
export type RadarData = {digests:Digest[];updates:Update[];events:LaunchEvent[]};
export const madridDate = (date=new Date()) => new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
