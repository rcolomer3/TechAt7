import {hash} from './core.mjs';

/** Validates a one-off push announcement and returns its stable fields. */
export function announcement({id,title,body}={}){
 const cleanId=String(id??'').trim(),cleanTitle=String(title??'').trim(),cleanBody=String(body??'').trim();
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cleanId)||cleanId.length<3||cleanId.length>80){
  throw new Error('El identificador del aviso debe ser único y estable: minúsculas, números y guiones (3–80 caracteres).');
 }
 if(!cleanTitle||cleanTitle.length>60)throw new Error('El título del aviso debe tener entre 1 y 60 caracteres.');
 if(!cleanBody||cleanBody.length>180)throw new Error('El texto del aviso debe tener entre 1 y 180 caracteres.');
 return {id:cleanId,title:cleanTitle,body:cleanBody};
}

/** One claim per device and announcement, so reruns never send twice. */
export function deliveryPath(id,tokenPath){
 return `announcement-${id}-${hash(tokenPath)}`;
}
