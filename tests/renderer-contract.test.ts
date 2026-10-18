import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
const root=process.env.MATERIAL_TEST_SOURCE_ROOT||fileURLToPath(new URL('..',import.meta.url));
const source=(relative:string)=>readFileSync(path.join(root,relative),'utf8');
// Execute the actual controller method with a fake bridge; no DOM or remote mutation.
function controllerMethod(file:string,name:string,bindings:Record<string,unknown>={}) {
 const text=source(file),tree=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);let body:string|undefined,parameters='',asynchronous=false;
 const visit=(node:ts.Node)=>{if(ts.isMethodDeclaration(node)&&node.name.getText(tree)===name&&node.body){body=node.body.getText(tree);parameters=node.parameters.map(p=>p.getText(tree)).join(',');asynchronous=!!node.modifiers?.some(m=>m.kind===ts.SyntaxKind.AsyncKeyword);}if(ts.isPropertyDeclaration(node)&&node.name.getText(tree)===name&&node.initializer&&ts.isArrowFunction(node.initializer)&&ts.isBlock(node.initializer.body)){const arrow=node.initializer;body=arrow.body.getText(tree);parameters=arrow.parameters.map(p=>p.getText(tree)).join(',');asynchronous=!!arrow.modifiers?.some(m=>m.kind===ts.SyntaxKind.AsyncKeyword);}ts.forEachChild(node,visit);};visit(tree);assert.ok(body,`${file}:${name}`);
 const output=ts.transpileModule(`export default ${asynchronous?'async ':''}function tested(${parameters})${body}`,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 // Named parameters in the body are supplied through bindings for event/ID methods.
 return new Function(...Object.keys(bindings),`const exports={};${output};return exports.default;`)(...Object.values(bindings)) as (this:unknown,...args:unknown[])=>unknown;
}
function modelBinding(name:string,bindings:Record<string,unknown>={}) {
 const file='src/renderer/github-workspace-model.ts',text=source(file),tree=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);let expression:string|undefined;
 const visit=(node:ts.Node)=>{if(ts.isVariableDeclaration(node)&&node.name.getText(tree)===name&&node.initializer)expression=node.initializer.getText(tree);ts.forEachChild(node,visit);};visit(tree);assert.ok(expression,`${file}:${name}`);
 const output=ts.transpileModule(`export default ${expression};`,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 return new Function(...Object.keys(bindings),`const exports={};${output};return exports.default;`)(...Object.values(bindings));
}
type OwnedControl={tag:string;domain?:string;mode?:string;discardDrafts:()=>unknown};
function closeContext(id:string,controls:OwnedControl[]=[]) {
 const owner='utility:'+id,stateKey=owner+'::'+id+'::'+id;
 const context={ownerForTab:controllerMethod('src/renderer/app.ts','ownerForTab'),tabState:controllerMethod('src/renderer/app.ts','tabState'),workStates:{[stateKey]:{dirty:true,busy:false}} as Record<string,{dirty:boolean;busy:boolean}>,workspace:{activeTab:'repositories',tabs:[{id:'repositories',target:{kind:'utility',lane:'repositories'}},{id,target:{kind:'utility',lane:id}}]},surfaceCache:[{owner,key:owner+'::'+id,lane:id},{owner:'utility:repositories',key:'utility:repositories::repositories',lane:'repositories'}],closeTabs:[id],lane:'repositories',notify:()=>{},persist:()=>{},navigate:()=>{},activateTab:()=>{},querySelectorAll:(selector:string)=>{assert.equal(selector,'[data-surface-owner]');return [{dataset:{surfaceOwner:owner},controls},{dataset:{surfaceOwner:'utility:sibling'},controls:[{tag:'mg-github-workspace',discardDrafts:()=>assert.fail('Sibling draft must remain untouched')}]}];}};
 return {context,stateKey};
}
function closeController(record:(...args:unknown[])=>Promise<unknown>){return controllerMethod('src/renderer/app.ts','closeTabNow',{window:{material:{workspace:record}},ownedControls:(panel:{controls:OwnedControl[]},selector:string)=>panel.controls.filter(control=>selector.split(',').includes(control.tag))});}
test('actual export controller snapshots selected visible provider rows and omits absent optional JSON fields',()=>{
 const str=modelBinding('str'),first=modelBinding('first'),idOf=modelBinding('idOf',{str,first});
 const exportRows=controllerMethod('src/renderer/github-workspace.ts','exportRows',{idOf});
 const selected={number:11,title:'Visible selected',optional:undefined,nested:{value:'before',missing:undefined},labels:[{name:'original'}]};
 const other={number:12,title:'Visible unselected'},hidden={number:13,title:'Filtered out'};
 const context={rows:[selected,other],page:{items:[selected,other,hidden]},checked:new Set(['11','13']),exportRecords:[] as unknown[]};
 exportRows.call(context);
 assert.deepEqual(context.exportRecords,[{number:11,title:'Visible selected',nested:{value:'before'},labels:[{name:'original'}]}]);
 assert.equal(Object.hasOwn(context.exportRecords[0] as object,'optional'),false);
 assert.equal(Object.hasOwn(selected,'optional'),true,'normalization must not mutate provider rows');
 selected.nested.value='after';selected.labels[0].name='changed';context.rows.push(hidden);context.checked.clear();
 assert.deepEqual(context.exportRecords,[{number:11,title:'Visible selected',nested:{value:'before'},labels:[{name:'original'}]}]);
 context.rows=[selected,other];exportRows.call(context);
 assert.deepEqual(context.exportRecords.map(row=>(row as {number:number}).number),[11,12],'empty selection exports the visible rows, not the full provider page');
});
test('functional shell wires domain bridge, operation stream and isolated renderer',()=>{
 const app=source('src/renderer/app.ts');for(const boundary of ['window.material.bootstrap()','window.material.onOperation(','window.material.cancel(','window.material.choices(','mg-github-workspace','mg-api-explorer'])assert.ok(app.includes(boundary),boundary);
 assert.match(source('src/renderer/github-workspace-model.ts'),/bridge\.github\(action,parameters\)/);
 assert.ok(!app.includes('execSync'));assert.ok(!app.includes('innerHTML'));
});
test('official Material package and registered compositions remain genuine',()=>{
 assert.match(source('src/renderer/material.ts'),/import '@material\/web\/all.js'/);
 for(const tag of ['mg-surface','mg-text','mg-layout','mg-search'])assert.ok(source('src/renderer/components.ts').includes(`customElements.define('${tag}'`));
});
test('actual domain mutation handler rejects missing review, reentry and incomplete destructive confirmation',async()=>{
 const calls:unknown[]=[];const save=controllerMethod('src/renderer/github-workspace.ts','save',{github:async(...args:unknown[])=>{calls.push(args);return{};},rec:(v:unknown)=>v,str:(v:unknown)=>typeof v==='string'?v:''});
 const reviewed={action:'delete',fields:[],values:{},review:true,reviewId:'native-receipt',destructive:true,keyOne:true,keyTwo:true,confirmation:100};
 const context=(editor:unknown,saving=false,valid=true)=>({editor,saving,editorValid:()=>valid,workState:()=>{},copy:(en:string)=>en,load:async()=>{},readDetail:async()=>{},page:{page:1},selected:undefined,notice:''});
 for(const editor of [undefined,{...reviewed,review:false},{...reviewed,reviewId:undefined},{...reviewed,keyOne:false},{...reviewed,keyTwo:false},{...reviewed,confirmation:99}])await save.call(context(editor));
 await save.call(context(reviewed,true));await save.call(context(reviewed,false,false));assert.equal(calls.length,0);
 const allowed=context(reviewed);await save.call(allowed);assert.deepEqual(calls,[['apply',{reviewId:'native-receipt',confirmed:true}]]);assert.equal(allowed.editor,undefined);assert.equal(allowed.saving,false);
});
test('failed apply invalidates review before a retry',async()=>{
 let calls=0;const save=controllerMethod('src/renderer/github-workspace.ts','save',{github:async()=>{calls++;throw new Error('permission denied');},rec:(v:unknown)=>v,str:String});
 const context={editor:{fields:[],values:{},review:true,reviewId:'receipt',destructive:false},saving:false,editorValid:()=>true,workState:()=>{},notice:'',copy:(en:string)=>en};
 await save.call(context);await save.call(context);assert.equal(calls,1);assert.equal(context.editor.review,false);assert.equal(context.editor.reviewId,undefined);assert.equal(context.notice,'permission denied');assert.equal(context.saving,false);
});
test('tab close controller uses actual work-state mapping for dirty and active destinations',()=>{
 const review=controllerMethod('src/renderer/app.ts','closeTabReview');
 for(const id of ['issues','api','cli-config','tools']){
  let closed=0;const {context,stateKey}=closeContext(id),model={...context,closeTabs:[] as string[],closeTabNow:()=>closed++};
  review.call(model,[id]);assert.deepEqual(model.closeTabs,[id]);assert.equal(closed,0);
  model.closeTabs=[];model.workStates[stateKey]={dirty:false,busy:true};review.call(model,[id]);assert.equal(closed,0);assert.deepEqual(model.closeTabs,[]);
  model.workStates[stateKey]={dirty:false,busy:false};review.call(model,[id]);assert.equal(closed,1);
 }
});
test('actual tab discard waits for its native record before clearing matching nested drafts and preserves them on failure',async()=>{
 let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve),calls:unknown[]=[],cacheDiscards:string[]=[];
 const close=closeController(async(...args)=>{calls.push(args);await gate;});const {context}=closeContext('issues',[{tag:'mg-github-workspace',domain:'issues',discardDrafts:()=>cacheDiscards.push('issues')}]);
 const pending=close.call(context,['issues']);assert.equal(context.workspace.tabs.length,2);assert.deepEqual(cacheDiscards,[]);assert.deepEqual(calls,[['discard',{ids:['issues']}]]);
 release();await pending;assert.deepEqual(context.workspace.tabs.map(tab=>tab.id),['repositories']);assert.deepEqual(cacheDiscards,['issues']);
 const failureDiscards:string[]=[],failed=closeController(async()=>{throw new Error('disk unavailable');}),unchanged=closeContext('issues',[{tag:'mg-github-workspace',domain:'issues',discardDrafts:()=>failureDiscards.push('issues')}]).context;
 await failed.call(unchanged,['issues']);assert.equal(unchanged.workspace.tabs.length,2);assert.deepEqual(unchanged.closeTabs,['issues']);assert.deepEqual(failureDiscards,[]);
});
test('tab discard preserves nested drafts when an operation becomes busy during native recording',async()=>{
 let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);let discarded=0;
 const close=closeController(async()=>{await gate;}),{context,stateKey}=closeContext('issues',[{tag:'mg-github-workspace',domain:'issues',discardDrafts:()=>discarded++}]);
 const pending=close.call(context,['issues']);context.workStates[stateKey].busy=true;release();await pending;
 assert.equal(discarded,0);assert.equal(context.workspace.tabs.length,2);assert.deepEqual(context.closeTabs,['issues']);
});
test('reduced motion and build-bound provenance remain honest',()=>{
 assert.match(source('src/renderer/styles.css'),/prefers-reduced-motion:reduce/);
 const app=source('src/renderer/app.ts');assert.ok(app.includes('data.version'));assert.ok(app.includes('data.builtAt'));assert.ok(app.includes("this.copy('unavailable'"));assert.ok(!app.includes('builtAt:Date.now'));
 assert.match(source('design/material-provenance.md'),/do not establish real graphical interaction/);
});
test('Material control template boundaries remain paired in the shell',()=>{
 const app=source('src/renderer/app.ts');const tags=new Set([...app.matchAll(/<\/?(md-[a-z-]+)\b/g)].map(m=>m[1]));for(const tag of tags)assert.equal([...app.matchAll(new RegExp(`<${tag}(?=[\\s>])`,'g'))].length,[...app.matchAll(new RegExp(`</${tag}>`,'g'))].length,tag);
});

test('Tools discard uses its public child boundary only after a durable receipt and busy recheck',async()=>{
 for(const outcome of ['saved','failed','became-busy']as const){let release!:()=>void,discarded=0;const gate=new Promise<void>(resolve=>release=resolve),calls:unknown[]=[];
  const close=closeController(async(...args)=>{calls.push(args);await gate;if(outcome==='failed')throw Error('Fixture record failure');}),{context,stateKey}=closeContext('tools',[{tag:'mg-tools',discardDrafts:()=>discarded++}]);
  const pending=close.call(context,['tools']);assert.equal(discarded,0);assert.equal(context.workspace.tabs.length,2);if(outcome==='became-busy')context.workStates[stateKey].busy=true;release();await pending;
  assert.deepEqual(calls,[['discard',{ids:['tools']}]]);assert.equal(discarded,outcome==='saved'?1:0);assert.equal(context.workspace.tabs.length,outcome==='saved'?1:2);if(outcome!=='saved')assert.deepEqual(context.closeTabs,['tools']);
 }
});
test('managed history refuses tab closure when its exact nested editor cannot discard',async()=>{
 for(const allowed of [false,true]){const events:string[]=[],close=closeController(async()=>events.push('record')),{context}=closeContext('history',[{tag:'mg-workspace-records',mode:'history',discardDrafts:()=>{events.push('discard');return allowed;}}]);await close.call(context,['history']);assert.deepEqual(events,['record','discard']);assert.equal(context.workspace.tabs.length,allowed?1:2);}
});
test('unchanged child work state does not rescan the complete desktop appearance tree',()=>{
 class ElementFixture{dataset={surfaceOwner:'utility:tools',surfaceLane:'tools'};}
 const owner=new ElementFixture(),workState=controllerMethod('src/renderer/app.ts','workState',{HTMLElement:ElementFixture}),key='utility:tools::tools::tools';
 const original={[key]:{busy:false,dirty:false}},context={workStates:original,taskChangedAt:123};
 const event=(busy:boolean)=>({type:'tools-work-state',detail:{id:'tools',busy,dirty:false},composedPath:()=>[{},owner]});
 workState.call(context,event(false));assert.equal(context.workStates,original);assert.equal(context.taskChangedAt,123);
 workState.call(context,event(true));assert.notEqual(context.workStates,original);assert.deepEqual(context.workStates[key],{busy:true,dirty:false});
 const changed=context.workStates;workState.call(context,event(true));assert.equal(context.workStates,changed);
});
