import {test} from 'node:test';import assert from 'node:assert/strict';
import {sourceFormat,parseLocalData,convertLocalData,rasterDimensions,converterLimits,validateConverterReceipts} from '../src/site-shared/local-converter';
const bytes=(text:string)=>new TextEncoder().encode(text);
test('structured conversions reopen typed values and reject unsafe inputs',()=>{
 const source='[{"name":"港","count":2,"active":true,"items":[null,3],"space":"  padded  "}]';
 for(const target of ['json','yaml','xml','jsonl'] as const){const output=convertLocalData(source,'json',target);assert.deepEqual(JSON.parse(JSON.stringify(parseLocalData(output.text,target))),JSON.parse(source))}
 assert.throws(()=>parseLocalData('{"__proto__":{}}','json'),/Reserved/);assert.throws(()=>parseLocalData('9007199254740992','json'),/unsafe/);
 assert.throws(()=>parseLocalData('a: &anchor [1]\nb: *anchor','yaml'));assert.throws(()=>parseLocalData('a: 1\na: 2','yaml'));
 assert.throws(()=>parseLocalData('<!DOCTYPE x><export schema="material-git-json-v1"/>','xml'));
 assert.throws(()=>parseLocalData('<export schema="material-git-json-v1"><value type="null" extra="ignored"/></export>','xml'));
});
test('delimited cells preserve quoting while loss disclosures and spreadsheet protection are real',()=>{
 const data=parseLocalData('name,note\r\n"港","first\nsecond"\r\n"a","""quoted"""\r\n','csv');assert.equal((data as any)[0].note,'first\nsecond');assert.equal((data as any)[1].note,'"quoted"');
 assert.throws(()=>parseLocalData('a,a\n1,2','csv'));assert.throws(()=>parseLocalData('a\n"broken','csv'));assert.throws(()=>parseLocalData('a\n"x"suffix','csv'));
 const output=convertLocalData('[{"name":"=DANGER","count":2}]','json','csv');assert.ok(output.text.includes("'=DANGER"));assert.ok(output.disclosures.some(d=>d.includes('scalar types')));assert.ok(output.disclosures.some(d=>d.includes('apostrophe')));
 assert.throws(()=>convertLocalData('{"not":"records"}','json','csv'));
});
test('bounded byte inspection rejects unsupported binaries and checks raster size before decode',()=>{
 assert.equal(sourceFormat('misnamed.bin',bytes('[1,2]')),'json');assert.equal(sourceFormat('name.csv',bytes('a,b\n1,2')),'csv');assert.throws(()=>sourceFormat('unsafe.yaml',new Uint8Array([0,1,2])));
 const png=new Uint8Array(33);png.set([137,80,78,71,13,10,26,10]);png.set(bytes('IHDR'),12);const view=new DataView(png.buffer);view.setUint32(8,13);view.setUint32(16,2);view.setUint32(20,3);assert.deepEqual(rasterDimensions(png,'png'),{width:2,height:3});view.setUint32(16,4097);assert.throws(()=>rasterDimensions(png,'png'),/Raster/);view.setUint32(16,4096);view.setUint32(20,4096);assert.throws(()=>rasterDimensions(png,'png'),/Raster/);
 assert.throws(()=>parseLocalData(' '.repeat(converterLimits.fileBytes+1),'json'),/8 MiB/);
});
test('receipt validation accepts only bounded outcome facts, excluding names, paths and file contents',()=>{
 const receipt={id:'conversion-1',at:new Date().toISOString(),source:'json',target:'yaml',inputBytes:10,outputBytes:20,state:'done'};
 assert.deepEqual(validateConverterReceipts([receipt]),[receipt]);assert.throws(()=>validateConverterReceipts([receipt,receipt]));assert.throws(()=>validateConverterReceipts([{...receipt,at:0}]));assert.throws(()=>validateConverterReceipts([{...receipt,name:'private.json'}]));assert.throws(()=>validateConverterReceipts([{...receipt,state:'running'}]));assert.throws(()=>validateConverterReceipts([{...receipt,outputBytes:converterLimits.fileBytes+1}]));
});
