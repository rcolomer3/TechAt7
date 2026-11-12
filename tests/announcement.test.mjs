import {test} from 'node:test';
import assert from 'node:assert/strict';
import {announcement,deliveryPath} from '../scripts/announcement.mjs';

test('manual announcements need a stable id and short title and body',()=>{
 const notice=announcement({id:'novedades-2026-11-12',title:'TechAt7 se actualiza',body:'Sincronización automática y hasta 20 noticias por edición.'});
 assert.equal(notice.id,'novedades-2026-11-12');
 assert.throws(()=>announcement({id:'Novedades',title:'Aviso',body:'Texto'}),/identificador/);
 assert.throws(()=>announcement({id:'aviso-',title:'Aviso',body:'Texto'}),/identificador/);
 assert.throws(()=>announcement({id:'aviso-1',title:'',body:'Texto'}),/título/);
 assert.throws(()=>announcement({id:'aviso-1',title:'Aviso',body:''}),/texto/);
 assert.throws(()=>announcement({id:'aviso-1',title:'x'.repeat(61),body:'Texto'}),/título/);
 assert.throws(()=>announcement({id:'aviso-1',title:'Aviso',body:'x'.repeat(181)}),/texto/);
});

test('each device and announcement gets its own delivery claim',()=>{
 const a=deliveryPath('novedades-2026-11-12','users/u1/tokens/t1');
 const b=deliveryPath('novedades-2026-11-12','users/u2/tokens/t1');
 assert.match(a,/^announcement-novedades-2026-11-12-[a-f0-9]{64}$/);
 assert.notEqual(a,b);
 assert.equal(a,deliveryPath('novedades-2026-11-12','users/u1/tokens/t1'));
 assert.notEqual(a,deliveryPath('novedades-2026-11-13','users/u1/tokens/t1'));
});
