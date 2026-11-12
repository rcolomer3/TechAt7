import {test} from 'node:test';
import assert from 'node:assert/strict';
import {editionFile,digestId} from '../scripts/edition.mjs';

test('extra editions use their own file and document without touching the daily edition',()=>{
 assert.equal(editionFile('2026-11-12'),'2026-11-12.json');
 assert.equal(editionFile('2026-11-12',true),'2026-11-12-extra.json');
 assert.equal(digestId('2026-11-12'),'2026-11-12');
 assert.equal(digestId('2026-11-12',true),'2026-11-12-extra');
 assert.notEqual(digestId('2026-11-12'),digestId('2026-11-12',true));
});
