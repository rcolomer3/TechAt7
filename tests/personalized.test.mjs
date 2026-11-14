import test from 'node:test';
import assert from 'node:assert/strict';
import {selectArticles} from '../scripts/personalized.mjs';

const catalogue=[
 {category:'Apple',title:'A'},
 {category:'Seguridad',title:'B'},
 {category:'Android',title:'C'},
 {category:'Apple',title:'D'}
];
const categories=['Apple','Seguridad','Android'];

test('solo incluye las categorías seleccionadas',()=>{
 assert.deepEqual(selectArticles(catalogue,{categories:['Apple'],dailyLimit:20},categories).map(a=>a.title),['A','D']);
});
test('sin noticias de una categoría devuelve una edición vacía, sin relleno',()=>{
 assert.deepEqual(selectArticles(catalogue,{categories:[],dailyLimit:20},categories),[]);
});
test('respeta el límite y Todas',()=>{
 assert.equal(selectArticles(catalogue,{categories,dailyLimit:1},categories).length,1);
 assert.equal(selectArticles(catalogue,{categories,dailyLimit:0},categories).length,4);
});
test('descarta categorías no reconocidas',()=>{
 assert.deepEqual(selectArticles(catalogue,{categories:['Inexistente'],dailyLimit:20},categories),[]);
});
