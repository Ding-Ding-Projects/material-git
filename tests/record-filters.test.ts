import test from 'node:test';import assert from 'node:assert/strict';
import {parseRecordDate,recordDateRange,filterHistoryRecords,recordSelection,recordDifference} from '../src/shared/record-filters';import type {ManagedRecordRevision} from '../src/shared/workspace';
const rows:ManagedRecordRevision[]=Array.from({length:45},(_,index)=>({id:String(index),at:`2026-10-${String(index%8+1).padStart(2,'0')}T12:00:00Z`,kind:index%2?'settings':'schedules',recordId:'local',action:index%3?'Settings changed':'Record restored',label:'',snapshot:{revision:index}}));
test('history date parser accepts explicit local and ISO formats and rejects partial, impossible and reversed dates without coercion',()=>{
 assert.equal(parseRecordDate('22/11/2026','en-HK'),'2026-11-22');assert.equal(parseRecordDate('2024-02-29'),'2024-02-29');assert.equal(parseRecordDate('11/22/2026','en-US'),'2026-11-22');assert.equal(parseRecordDate(''),'');
 for(const input of ['2026-02-29','2026-10','31/04/2026','22/11/26','13/40/2026','2026-01-01 trailing'])assert.throws(()=>parseRecordDate(input));assert.throws(()=>recordDateRange('2026-10-08','2026-10-01'),/end date/);
});
test('managed history text, dates, actual actions and kinds compose, and page/all/inverse selection preserves hidden choices',()=>{
 const filtered=filterHistoryRecords(rows,{matchIds:rows.filter(row=>Number(row.id)%2).map(row=>row.id),from:'2026-10-01',to:'2026-10-08',actions:new Set(['Settings changed']),kinds:new Set(['settings'])});assert.ok(filtered.length>0);assert.ok(filtered.every(row=>'snapshot'in row&&row.kind==='settings'&&row.action==='Settings changed'));
 const page=recordSelection(new Set(['hidden']),rows,'page',2);assert.equal(page.size,21);assert.ok(page.has('hidden'));assert.ok(page.has('20'));assert.ok(!page.has('0'));
 const inverse=recordSelection(page,filtered,'inverse',1);assert.ok(inverse.has('hidden'));for(const row of filtered)assert.equal(inverse.has(row.id),!page.has(row.id));assert.equal(recordSelection(inverse,rows,'clear',1).size,0);
});
test('managed revision comparison preserves nested fields, additions, deletion and false values',()=>{
 const diff=recordDifference({theme:'dark',motion:false,nested:{priority:0,removed:'x'}},{theme:'light',motion:false,nested:{priority:3,added:'y'}});assert.deepEqual(diff.map(row=>row.path),['nested.added','nested.priority','nested.removed','theme']);assert.equal(diff.find(row=>row.path==='nested.priority')?.before,0);assert.equal(diff.find(row=>row.path==='nested.removed')?.after,null);assert.deepEqual(recordDifference({unchanged:false},{unchanged:false}),[]);
});
