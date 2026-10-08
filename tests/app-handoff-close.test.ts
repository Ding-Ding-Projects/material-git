import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';

async function fixture(discard:()=>Promise<boolean>,record:()=>Promise<void>=async()=>{}){
 const source=await readFile(new URL('../src/renderer/app.ts',import.meta.url),'utf8'),tree=ts.createSourceFile('app.ts',source,ts.ScriptTarget.Latest,true);let method='';
 const visit=(node:ts.Node)=>{if(ts.isMethodDeclaration(node)&&node.name.getText(tree)==='closeTabNow')method=node.getText(tree).replace(/^private\s+/,'');ts.forEachChild(node,visit);};visit(tree);assert.ok(method);
 const javascript=ts.transpileModule(`class App{${method}};globalThis.close=App.prototype.closeTabNow;`,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 const binding:{close?:(ids:string[])=>Promise<void>}={};new Function('globalThis','window',javascript)(binding,{material:{workspace:record}});
 const notices:string[]=[],model={workStates:{repositories:{busy:false,dirty:true}},workStateKey:(id:string)=>id,copy:(en:string)=>en,notify:(message:string)=>notices.push(message),querySelectorAll:(selector:string)=>selector==='mg-github-workspace'?[{domain:'repositories',discardDrafts:discard}]:[],workspace:{tabs:[{id:'repositories'},{id:'git'}]},closeTabs:['repositories'],lane:'repositories',navigate:(lane:string)=>{model.lane=lane;},persist:()=>{}};
 return {model,notices,close:()=>binding.close!.call(model,['repositories'])};
}

test('closing a provider tab waits for native handoff revocation and preserves the tab when cleanup refuses',async()=>{
 let settle!:(value:boolean)=>void,entered!:()=>void;const started=new Promise<void>(resolve=>entered=resolve),pending=new Promise<boolean>(resolve=>settle=resolve),order:string[]=[];
 const f=await fixture(()=>{order.push('discard');entered();return pending;},async()=>{order.push('receipt');});
 const closing=f.close();await started;assert.deepEqual(order,['receipt','discard']);assert.equal(f.model.workspace.tabs.length,2);
 settle(false);await closing;assert.equal(f.model.workspace.tabs.length,2);assert.deepEqual(f.model.closeTabs,['repositories']);assert.equal(f.model.workStates.repositories.dirty,true);assert.ok(f.notices.some(value=>value.includes('active task')));
});

test('native discard failure or activity starting during cleanup keeps a provider tab open',async()=>{
 const failure=await fixture(async()=>{throw Error('Owned source revocation failed');});await failure.close();assert.equal(failure.model.workspace.tabs.length,2);assert.ok(failure.notices.some(value=>value.includes('remains open')));
 const active=await fixture(async()=>{active.model.workStates.repositories.busy=true;return true;});await active.close();assert.equal(active.model.workspace.tabs.length,2);assert.ok(active.notices.some(value=>value.includes('request started')));
});

test('a provider tab closes only after successful scoped cleanup and retains its sibling',async()=>{
 let cleaned=false;const f=await fixture(async()=>{cleaned=true;return true;});await f.close();assert.equal(cleaned,true);assert.deepEqual(f.model.workspace.tabs,[{id:'git'}]);assert.equal(f.model.lane,'git');assert.deepEqual(f.model.closeTabs,[]);
});
