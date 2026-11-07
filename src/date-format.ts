/** Calendar dates keep their announced day; timestamps use Madrid local time. */
export function formatDateES(value:string):string{
 const calendar=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
 if(calendar)return `${calendar[3]}/${calendar[2]}/${calendar[1]}`;
 const date=new Date(value);
 if(!Number.isFinite(date.getTime()))return 'Fecha no disponible';
 return new Intl.DateTimeFormat('es-ES',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'Europe/Madrid'}).format(date);
}

export function formatEditionDateES(value:string):string{
 const date=new Date(value+'T12:00:00Z');
 if(!Number.isFinite(date.getTime()))return formatDateES(value);
 const label=new Intl.DateTimeFormat('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Madrid'}).format(date);
 return label.charAt(0).toLocaleUpperCase('es-ES')+label.slice(1);
}

export function formatPublicationTimeES(value:string|undefined):string|null{
 if(typeof value!=='string'||!value.includes('T'))return null;
 const date=new Date(value);
 if(!Number.isFinite(date.getTime()))return null;
 return new Intl.DateTimeFormat('es-ES',{hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:'Europe/Madrid'}).format(date);
}
