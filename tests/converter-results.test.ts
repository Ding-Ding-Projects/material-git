import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';import {join} from 'node:path';import {tmpdir} from 'node:os';
import {localRecordDay} from '../src/shared/record-filters';
import {LocalToolsService} from '../src/main/local-tools';import type {ConverterResult} from '../src/shared/local-tools';
const wait=async(test:()=>Promise<boolean>)=>{for(let i=0;i<100;i++){if(await test())return;await new Promise(r=>setTimeout(r,20));}throw new Error('Fixture timeout');};
test('opaque converter result actions verify receipts, export faithful copies and reject changed outputs',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'converter-result-fixture-')),source=join(directory,'source.json'),output=join(directory,'output.json'),copy=join(directory,'copy.json');await writeFile(source,'{"fixture":1}');let destination=output;const opened:string[]=[];
 const service=new LocalToolsService({storageDirectory:directory,pickSources:async()=>[source],pickDestination:async()=>destination,openResult:async(path,operation)=>{opened.push(path+' '+operation);},resultActionAvailability:{open:true,reveal:true,editor:false}});
 try{const grants=await service.request('converter-pick')as Array<{id:string}>;const result=await service.request('converter-start',{grant:grants[0].id,adapter:'json-pretty'})as ConverterResult;
  await wait(async()=>(await service.request('converter-status')as{items:ConverterResult[]}).items.some(r=>r.id===result.id&&r.status==='converted'));
  const history=await service.request('converter-status',{query:'source',status:'converted',date:localRecordDay(new Date().toISOString())})as{items:ConverterResult[]};assert.equal(history.items[0].hasOutputReceipt,true);assert.ok(!JSON.stringify(history).includes(directory));
  await service.request('converter-result',{id:result.id,index:0,operation:'open'});assert.deepEqual(opened,[output+' open']);
  await assert.rejects(service.request('converter-result',{id:result.id,operation:'editor'}),/unavailable/);
  destination=copy;await service.request('converter-result',{id:result.id,index:0,operation:'export'});assert.deepEqual(await readFile(copy),await readFile(output));
  await assert.rejects(service.request('converter-result',{id:result.id,operation:'export'}),/already exists/);
  await writeFile(output,'changed');await assert.rejects(service.request('converter-result',{id:result.id,operation:'open'}),/changed after/);assert.equal(opened.length,1);
  await assert.rejects(service.request('converter-result',{id:output,operation:'open'}),/opaque/);
  await assert.rejects(service.request('converter-bulk',{ids:[result.id],operation:'forget'}),/Review and confirm/);
  const forgotten=await service.request('converter-bulk',{ids:[result.id],operation:'forget',confirmed:true})as{outcomes:Array<{status:string}>};assert.equal(forgotten.outcomes[0].status,'forgotten');assert.equal(await readFile(source,'utf8'),'{"fixture":1}');assert.equal(await readFile(output,'utf8'),'changed');assert.equal((await service.request('converter-status')as{items:unknown[]}).items.length,0);
 }finally{service.dispose();await rm(directory,{recursive:true,force:true});}
});
test('history applies isolated regex before finite paging and bulk reports partial outcomes',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'converter-history-fixture-'));const service=new LocalToolsService({storageDirectory:directory,pickSources:async()=>[],pickDestination:async()=>null});
 try{await service.request('converter-status');const rows=Array.from({length:85},(_,i)=>({id:`00000000-0000-0000-0000-${String(i).padStart(12,'0')}`,at:'2026-10-08T00:00:00Z',source:'fixture'+i,adapter:'JSON fixture',status:'converted'}));for(const row of rows)await writeFile(join(directory,'local-tools/results',row.id+'.json'),JSON.stringify(row));
  const first=await service.request('converter-status',{query:'fixture'})as{items:ConverterResult[];hasNext:boolean};assert.equal(first.items.length,40);assert.equal(first.hasNext,true);
  const last=await service.request('converter-status',{page:3})as{items:ConverterResult[]};assert.equal(last.items.length,5);
  const filtered=await service.request('converter-status',{regex:true,pattern:'^fixture84 ',flags:'i'})as{items:ConverterResult[]};assert.equal(filtered.items.length,1);assert.equal(filtered.items[0].source,'fixture84');
  await assert.rejects(service.request('converter-status',{regex:true,pattern:'['}),/Invalid regular/);
  const day=localRecordDay(rows[0].at);assert.equal((await service.request('converter-status',{from:day,to:day})as{items:unknown[]}).items.length,40);assert.equal((await service.request('converter-status',{from:'2027-01-01'})as{items:unknown[]}).items.length,0);
  await assert.rejects(service.request('converter-status',{from:'2026-02-30'}),/real calendar date/);await assert.rejects(service.request('converter-status',{from:'2026-10-09',to:'2026-10-01'}),/end date/);await assert.rejects(service.request('converter-status',{from:'8/10/2026'}),/canonical ISO/);
  const bulk=await service.request('converter-bulk',{ids:[rows[0].id,'ffffffff-ffff-ffff-ffff-ffffffffffff'],operation:'forget',confirmed:true})as{outcomes:Array<{status:string}>};assert.deepEqual(bulk.outcomes.map(o=>o.status),['forgotten','failed']);
 }finally{service.dispose();await rm(directory,{recursive:true,force:true});}
});
