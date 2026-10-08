import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('./dist/regex-worker.js',import.meta.url),'utf8');
function run(pattern,entries){let result;const context={self:{postMessage:value=>{result=value}}};vm.runInNewContext(source,context);context.self.onmessage({data:{pattern,entries}});return result;}
test('anchors, alternatives and case-insensitive matching work',()=>{const result=run('^(repo|issue) list$',[{key:'1',text:'REPO list'},{key:'2',text:'issue list'},{key:'3',text:'repo list extra'}]);assert.deepEqual(Array.from(result.matches,row=>row.match),[true,true,false]);});
test('invalid syntax returns an explicit error',()=>{assert.match(run('[',[]).error,/Invalid/);});
test('pattern and candidate count bounds reject oversized jobs',()=>{assert.ok(run('x'.repeat(257),[]).error);assert.ok(run('x',Array.from({length:513},(_,index)=>({key:String(index),text:'x'}))).error);});
