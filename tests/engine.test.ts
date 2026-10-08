import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Engine } from '../src/main/engine';
import type { Catalog } from '../src/shared/types';
const catalog:Catalog={version:'2.102.0',generatedAt:'',source:'test',commands:[{id:'--version',path:['--version'],title:'Version',summary:'',description:'',usage:'',group:'test',options:[{name:'state',description:'',type:'choice',choices:['open','closed']}],arguments:[{name:'target',description:'',type:'text',position:0}],mutation:false,destructive:false}]};
const request=(values:Record<string,unknown>={},args:Record<string,unknown>={})=>({commandId:'--version',values,args});
test('rejects option injection, invalid enum, invalid positional input and workspace escape',()=>{
 const engine=new Engine(catalog,process.cwd(),process.execPath);
 assert.throws(()=>engine.execute(request({'evil':'x'})),/Unknown option/);
 assert.throws(()=>engine.execute(request({state:'open --exec=bad'})),/Invalid choice/);
 assert.throws(()=>engine.execute(request({}, {target:'x\0y'})),/Invalid text/);
 assert.throws(()=>engine.execute({...request(),cwd:'/'}),/workspace/);
});
test('process operation reports exit and subscriptions receive immutable snapshots',async()=>{
 const engine=new Engine(catalog,process.cwd(),process.execPath);
 const done=new Promise<void>(resolve=>engine.subscribe(op=>{if(op.status!=='running'){assert.equal(op.status,'succeeded');assert.match(op.stdout,/v\d/);op.stdout='changed';resolve();}}));
 const op=engine.execute(request());await done;assert.notEqual(engine.operation(op.id).stdout,'changed');
});
test('requires confirmation and blocks native terminal commands',()=>{
 const command=catalog.commands[0];const engine=new Engine({...catalog,commands:[{...command,mutation:true}]},process.cwd(),process.execPath);
 assert.throws(()=>engine.execute(request()),/confirm/);
 const blocked=new Engine({...catalog,commands:[{...command,interactive:true}]},process.cwd(),process.execPath);assert.throws(()=>blocked.execute(request()),/terminal/);
});
test('positional dash values cannot inject flags',async()=>{
 const engine=new Engine(catalog,process.cwd(),process.execPath);
 const done=new Promise<OperationResult>(resolve=>engine.subscribe(op=>{if(op.endedAt)resolve(op);}));
 engine.execute(request({}, {target:'--eval=throw new Error("injected")'}));
 const op=await done;assert.equal(op.status,'succeeded');assert.match(op.stdout,/^v\d/);
});
type OperationResult = ReturnType<Engine['operation']>;
test('API validates endpoint, host and managed authentication headers before launch',()=>{
 const definition={...catalog.commands[0],id:'api',path:['api'],mutation:true,options:[{name:'hostname',description:'',type:'text' as const},{name:'header',description:'',type:'text' as const,multiple:true}],arguments:[{name:'endpoint',position:0,description:'',type:'text' as const,required:true}]};
 const engine=new Engine({...catalog,commands:[definition]},process.cwd(),process.execPath);
 for(const [endpoint,values] of [['https://evil.example',{}],['repos/o/r',{hostname:'evil.example'}],['repos/o/r',{header:'Authorization: token secret'}]] as const)assert.throws(()=>engine.execute({commandId:'api',confirmed:true,args:{endpoint},values}),/API|headers/);
});
test('bounds output, redacts supplied secrets and cancels a running operation',async()=>{
 const {mkdtemp,writeFile,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const path=await import('node:path');
 const dir=await mkdtemp(path.join(tmpdir(),'material-engine-'));const script=path.join(dir,'fixture.cjs');
 try {
 await writeFile(script,'process.stdout.write(process.argv[2].split("=")[1] + "x".repeat(1100000));');
 const def={...catalog.commands[0],id:'fixture',path:[script],options:[{name:'token',description:'',type:'secret' as const}],arguments:[]};
 const engine=new Engine({...catalog,commands:[def]},process.cwd(),process.execPath);
 const done=new Promise<OperationResult>(resolve=>engine.subscribe(op=>{if(op.endedAt)resolve(op);}));engine.execute({commandId:'fixture',values:{token:'test-sensitive-value'},args:{}});
 const result=await done;assert.equal(result.truncated,true);assert.ok(result.stdout.length<=1024*1024);assert.ok(!result.stdout.includes('test-sensitive-value'));assert.match(result.stdout,/REDACTED/);
 await writeFile(script,'setInterval(()=>{},1000);');
 const cancelled=new Promise<OperationResult>(resolve=>engine.subscribe(op=>{if(op.status==='cancelled'&&op.endedAt)resolve(op);}));const running=engine.execute({commandId:'fixture',values:{},args:{}});engine.cancel(running.id);assert.equal((await cancelled).status,'cancelled');
 } finally {await rm(dir,{recursive:true,force:true});}
});
test('guided browse, repository override and clone flags generate safe argument arrays',async()=>{
 const {loadCatalog}=await import('../src/main/catalog');const {mkdtemp,writeFile,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const path=await import('node:path');
 const dir=await mkdtemp(path.join(tmpdir(),'material-guided-'));const script=path.join(dir,'fixture.cjs');await writeFile(script,'console.log(JSON.stringify(process.argv.slice(2)));');
 const catalog=loadCatalog();try{
 async function execute(id:string,values:Record<string,unknown>,args:Record<string,unknown>,repository?:string){const definition={...catalog.commands.find(c=>c.id===id)!,path:[script]};const engine=new Engine({...catalog,commands:[definition]},process.cwd(),process.execPath);const done=new Promise<OperationResult>(resolve=>engine.subscribe(op=>{if(op.endedAt)resolve(op);}));engine.execute({commandId:id,values,args,repository,confirmed:true});return (await done).data as string[];}
 const browse=await execute('browse',{'no-browser':false,repo:'selected/repo'},{location:'123'},'global/repo');assert.equal(browse.filter(v=>v.startsWith('--no-browser')).length,1);assert.ok(browse.includes('--no-browser'));assert.ok(browse.includes('--repo=selected/repo'));assert.ok(!browse.includes('--repo=global/repo'));
 const clone=await execute('repo clone',{'git-depth':10,'git-branch':'main','git-single-branch':true},{repository:'owner/repo',directory:'new-clone'});assert.ok(clone.includes('--depth=10'));assert.ok(clone.includes('--branch=main'));assert.ok(clone.includes('--single-branch'));assert.ok(!clone.some(value=>value.startsWith('--git-')));
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('command-specific create, clone, config, shell alias and API checks reject unsafe combinations',()=>{
 const {commands,...metadata}=JSON.parse(readFileSync('data/gh-catalog.json','utf8')) as Catalog;
 const engine=new Engine({...metadata,commands},process.cwd(),process.execPath);
 const execute=(commandId:string,values:Record<string,unknown>,args:Record<string,unknown>)=>engine.execute({commandId,values,args,confirmed:true});
 assert.throws(()=>execute('pr create',{title:'A title'},{}),/Required value: body/);
 assert.throws(()=>execute('repo clone',{}, {repository:'owner/repo',gitflags:['-c','core.sshCommand=unsafe']}),/Raw git/);
 assert.throws(()=>execute('repo clone',{}, {repository:'owner/repo',directory:'/tmp/escape'}),/workspace/);
 assert.throws(()=>execute('alias set',{shell:true},{alias:'unsafe',expansion:'echo unsafe'}),/Shell aliases/);
 assert.throws(()=>execute('config set',{}, {key:'git_protocol',value:'enabled'}),/configuration value/);
 assert.throws(()=>execute('api',{'raw-field':['invalid pair']},{endpoint:'repos/o/r'}),/structured name=value/);
});
test('stream decoding preserves split UTF-8 and credentials cannot leak across chunks or the output cap',async()=>{
 const {mkdtemp,writeFile,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const path=await import('node:path');
 const dir=await mkdtemp(path.join(tmpdir(),'material-stream-'));const script=path.join(dir,'fixture.cjs');
 const secret='SENSITIVE-CREDENTIAL-VALUE';
 try {
 async function capture(source:string,withSecret=true){await writeFile(script,source);const def={...catalog.commands[0],id:'fixture',path:[script],options:[{name:'credential',description:'',type:'secret' as const}],arguments:[]};const engine=new Engine({...catalog,commands:[def]},process.cwd(),process.execPath);const updates:OperationResult[]=[];const done=new Promise<OperationResult>(resolve=>engine.subscribe(op=>{updates.push(op);if(op.endedAt)resolve(op);}));engine.execute({commandId:'fixture',values:withSecret?{credential:secret}:{},args:{}});return {operation:await done,updates};}
 const unicode=await capture('const bytes=Buffer.from("廣東話😀");let i=0;const tick=setInterval(()=>{process.stdout.write(bytes.subarray(i,i+1));if(++i===bytes.length)clearInterval(tick);},2);');assert.equal(unicode.operation.stdout,'廣東話😀');assert.ok(unicode.updates.every(op=>!op.stdout.includes('\ufffd')));
 const boundary=await capture(`process.stdout.write('x'.repeat(1024*1024-12));process.stdout.write(${JSON.stringify(secret)});process.stdout.write('tail'.repeat(100));`);assert.equal(boundary.operation.truncated,true);assert.ok(boundary.operation.stdout.includes('[REDACTED]'));for(const op of boundary.updates){assert.ok(!op.stdout.includes('SENSITIVE'));assert.ok(!op.stdout.includes('CREDENTIAL'));assert.ok(Buffer.byteLength(op.stdout)<=1024*1024);}
 const split=await capture(`process.stdout.write(${JSON.stringify(secret.slice(0,9))});setTimeout(()=>{process.stdout.write(${JSON.stringify(secret.slice(9))});process.stdout.write(' done');},20);`);assert.equal(split.operation.stdout,'[REDACTED] done');assert.ok(split.updates.every(op=>!op.stdout.includes('SENSITIVE')));
 const unknown=await capture('process.stdout.write("ghp_");setTimeout(()=>{process.stdout.write("A".repeat(1100000));process.stdout.write(" done");},20);',false);assert.equal(unknown.operation.stdout,'[REDACTED] done');assert.ok(unknown.updates.every(op=>!op.stdout.includes('AAAA')));
 const partial=await capture(`process.stdout.write(${JSON.stringify(secret.slice(0,12))});`);assert.equal(partial.operation.stdout,'[REDACTED]');
 const nearUnicode=await capture('process.stdout.write("😀".repeat(35));',false);assert.equal(nearUnicode.operation.stdout,'😀'.repeat(35));
 const boundedUnicode=await capture('process.stdout.write("😀".repeat(300000));',false);assert.equal(boundedUnicode.operation.truncated,true);assert.ok(!boundedUnicode.operation.stdout.includes('\ufffd'));assert.ok(Buffer.byteLength(boundedUnicode.operation.stdout)<=1024*1024);
 }finally{await rm(dir,{recursive:true,force:true});}
});
