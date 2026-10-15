import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';

async function fixture(discard:()=>Promise<boolean>,record:()=>Promise<void>=async()=>{},domain:'repositories'|'git'='repositories'){
 const source=await readFile(new URL('../src/renderer/app.ts',import.meta.url),'utf8'),tree=ts.createSourceFile('app.ts',source,ts.ScriptTarget.Latest,true),methods:string[]=[];
 const visit=(node:ts.Node)=>{if(ts.isMethodDeclaration(node)&&['closeTabNow','ownerForTab','tabState'].includes(node.name.getText(tree)))methods.push(node.getText(tree).replace(/^private\s+/,''));ts.forEachChild(node,visit);};visit(tree);assert.equal(methods.length,3);
 const javascript=ts.transpileModule(`class App{${methods.join('\n')}};globalThis.methods=App.prototype;`,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 type Control={discardDraft?:()=>Promise<boolean>;discardDrafts?:()=>Promise<boolean>};type Panel={dataset:{surfaceOwner:string};controls:Control[]};
 const binding:{methods?:Record<string,Function>}={};new Function('globalThis','window','ownedControls',javascript)(binding,{material:{workspace:record}},(panel:Panel,selector:string)=>{assert.ok(selector.includes('mg-github-workspace'));assert.ok(selector.includes('mg-git-workspace'));return panel.controls;});
 const sibling=domain==='repositories'?'git':'repositories',notices:string[]=[],stateKey=domain+'::'+domain+'::work',siblingKey=sibling+'::'+sibling+'::work';let siblingCleanup=0;
 const panels:Panel[]=[{dataset:{surfaceOwner:domain},controls:[domain==='git'?{discardDraft:discard}:{discardDrafts:discard}]},{dataset:{surfaceOwner:sibling},controls:[{discardDrafts:async()=>{siblingCleanup++;return true;}}]}];
 const model={workStates:{[stateKey]:{busy:false,dirty:true},[siblingKey]:{busy:false,dirty:true}} as Record<string,{busy:boolean;dirty:boolean}>,ownerForTab:binding.methods!.ownerForTab,tabState:binding.methods!.tabState,notify:(message:string|{en:string;yue:string})=>notices.push(typeof message==='string'?message:message.en),querySelectorAll:(selector:string)=>{assert.equal(selector,'[data-surface-owner]');return panels;},workspace:{activeTab:domain,tabs:[{id:domain,target:{kind:domain==='git'?'local':'github'}},{id:sibling,target:{kind:sibling==='git'?'local':'github'}}]},surfaceCache:[{key:domain+'::'+domain,owner:domain,lane:domain},{key:sibling+'::'+sibling,owner:sibling,lane:sibling}],closeTabs:[domain],lane:domain as string,activateTab:(id:string)=>{model.workspace.activeTab=id;model.lane=id;},navigate:(lane:string)=>{model.lane=lane;},persist:()=>{}};
 return {model,notices,panels,stateKey,siblingKey,siblingCleanup:()=>siblingCleanup,close:()=>binding.methods!.closeTabNow.call(model,[domain]) as Promise<void>};
}

test('closing a provider tab waits for native handoff revocation and preserves the tab when cleanup refuses',async()=>{
 let settle!:(value:boolean)=>void,entered!:()=>void;const started=new Promise<void>(resolve=>entered=resolve),pending=new Promise<boolean>(resolve=>settle=resolve),order:string[]=[];
 const f=await fixture(()=>{order.push('discard');entered();return pending;},async()=>{order.push('receipt');});
 const closing=f.close();await started;assert.deepEqual(order,['receipt','discard']);assert.equal(f.model.workspace.tabs.length,2);
 settle(false);await closing;assert.equal(f.model.workspace.tabs.length,2);assert.deepEqual(f.model.closeTabs,['repositories']);assert.equal(f.model.workStates[f.stateKey].dirty,true);assert.ok(f.notices.some(value=>value.includes('task is still active')&&value.includes('remains open')));assert.equal(f.siblingCleanup(),0);
});

test('native discard failure or activity starting during cleanup keeps a provider tab open',async()=>{
 const failure=await fixture(async()=>{throw Error('Owned source revocation failed');});await failure.close();assert.equal(failure.model.workspace.tabs.length,2);assert.ok(failure.notices.some(value=>value.includes('Owned source revocation failed')));assert.equal(failure.model.workStates[failure.stateKey].dirty,true);assert.equal(failure.siblingCleanup(),0);
 const active=await fixture(async()=>{active.model.workStates[active.stateKey].busy=true;return true;});await active.close();assert.equal(active.model.workspace.tabs.length,2);assert.ok(active.notices.some(value=>value.includes('request started')));assert.equal(active.siblingCleanup(),0);
});

test('a provider tab closes only after successful scoped cleanup and retains its sibling',async()=>{
 let cleaned=false;const f=await fixture(async()=>{cleaned=true;return true;});await f.close();assert.equal(cleaned,true);assert.deepEqual(f.model.workspace.tabs.map(tab=>tab.id),['git']);assert.equal(f.model.lane,'git');assert.deepEqual(f.model.closeTabs,[]);assert.equal(f.model.workStates[f.stateKey],undefined);assert.equal(f.model.workStates[f.siblingKey].dirty,true);assert.deepEqual(f.model.surfaceCache.map(surface=>surface.owner),['git']);assert.equal(f.siblingCleanup(),0);
});

test('direct Source Control close awaits only its owned Git workspace cleanup',async()=>{
 let cleaned=false;const success=await fixture(async()=>{cleaned=true;return true;},async()=>{},'git');await success.close();assert.equal(cleaned,true);assert.deepEqual(success.model.workspace.tabs.map(tab=>tab.id),['repositories']);assert.equal(success.siblingCleanup(),0);
 const refused=await fixture(async()=>false,async()=>{},'git');await refused.close();assert.equal(refused.model.workspace.tabs.length,2);assert.ok(refused.notices.some(value=>value.includes('remains open')));assert.equal(refused.siblingCleanup(),0);
});

test('closing a repository disposes every retained sublane owned by that repository',async()=>{
 const cleaned:string[]=[];const f=await fixture(async()=>{cleaned.push('visible');return true;});f.panels.push({dataset:{surfaceOwner:'repositories'},controls:[{discardDrafts:async()=>{cleaned.push('hidden');return true;}}]});f.model.surfaceCache.push({key:'repositories::pull-requests',owner:'repositories',lane:'pull-requests'});f.model.workStates['repositories::pull-requests::work']={busy:false,dirty:true};await f.close();assert.deepEqual(cleaned,['visible','hidden']);assert.equal(f.siblingCleanup(),0);assert.deepEqual(Object.keys(f.model.workStates),[f.siblingKey]);assert.deepEqual(f.model.surfaceCache.map(surface=>surface.owner),['git']);
});
