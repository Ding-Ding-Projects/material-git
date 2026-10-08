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
 const text=source(file),tree=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);let body:string|undefined,asynchronous=false;
 const visit=(node:ts.Node)=>{if(ts.isMethodDeclaration(node)&&node.name.getText(tree)===name&&node.body){body=node.body.getText(tree);asynchronous=!!node.modifiers?.some(m=>m.kind===ts.SyntaxKind.AsyncKeyword);}ts.forEachChild(node,visit);};visit(tree);assert.ok(body,`${file}:${name}`);
 const output=ts.transpileModule(`export default ${asynchronous?'async ':''}function tested(...args:unknown[])${body}`,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 // Named parameters in the body are supplied through bindings for event/ID methods.
 return new Function(...Object.keys(bindings),`const exports={};${output};return exports.default;`)(...Object.values(bindings)) as (this:unknown)=>unknown;
}
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
test('tab close controller preserves dirty work and refuses active operations',()=>{
 const ids=['issues'];const review=controllerMethod('src/renderer/app.ts','closeTabReview',{ids});let closed=0;
 const context={workStates:{issues:{dirty:true,busy:false}},closeTabs:[] as string[],closeTabNow:()=>closed++,notify:()=>{},copy:(en:string)=>en};
 review.call(context);assert.deepEqual(context.closeTabs,ids);assert.equal(closed,0);
 context.closeTabs=[];context.workStates.issues={dirty:false,busy:true};review.call(context);assert.equal(closed,0);assert.deepEqual(context.closeTabs,[]);
 context.workStates.issues={dirty:false,busy:false};review.call(context);assert.equal(closed,1);
});
test('reduced motion and build-bound provenance remain honest',()=>{
 assert.match(source('src/renderer/styles.css'),/prefers-reduced-motion:reduce/);
 const app=source('src/renderer/app.ts');assert.ok(app.includes('data.version'));assert.ok(app.includes('data.builtAt'));assert.ok(app.includes("this.copy('unavailable'"));assert.ok(!app.includes('builtAt:Date.now'));
 assert.match(source('design/material-provenance.md'),/do not establish real graphical interaction/);
});
test('Material control template boundaries remain paired in the shell',()=>{
 const app=source('src/renderer/app.ts');const tags=new Set([...app.matchAll(/<\/?(md-[a-z-]+)\b/g)].map(m=>m[1]));for(const tag of tags)assert.equal([...app.matchAll(new RegExp(`<${tag}(?=[\\s>])`,'g'))].length,[...app.matchAll(new RegExp(`</${tag}>`,'g'))].length,tag);
});
