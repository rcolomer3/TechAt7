import {madridDate} from './models';
import type {RadarData} from './models';
// Fictional interface placeholders, deliberately neither headlines nor events.
const topics = ['Apple','Inteligencia artificial','Hardware','Desarrollo','Web y privacidad','Ciencia'];
export const demo:RadarData = {digests:[0,1,2].map(days=>madridDate(new Date(Date.now()-days*86400000))).map(date=>({id:date,date,publishedAt:date+'T18:00:00Z',status:'published',demo:true,articles:topics.map((category,i)=>({id:`${date}-${i}`,category,title:`Ejemplo de tarjeta · ${category}`,summary:'Aquí aparecerá un extracto breve de una fuente verificable. Esta tarjeta muestra el diseño; no describe una noticia real.',source:'Demostración de interfaz',url:'',publishedAt:date+'T18:00:00Z'}))})),updates:[],events:[]};
