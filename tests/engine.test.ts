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
 assert.throws(()=>execute('repo clone',{}, {repository:'owner/repo',gitflags:['-c','core.sshCommand=unsafe']}),/Raw git|Unknown argument/);
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
test('real filenames and Go template expressions are accepted as structured values; remote shell expansion is rejected',async()=>{
 const {loadCatalog}=await import('../src/main/catalog');const {mkdtemp,writeFile,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const path=await import('node:path');
 const dir=await mkdtemp(path.join(tmpdir(),'material-native-types-'));const script=path.join(dir,'fixture.cjs');await writeFile(script,'console.log(JSON.stringify(process.argv.slice(2)));');const metadata=loadCatalog();
 try{
 async function execute(id:string,values:Record<string,unknown>,args:Record<string,unknown>){const definition={...metadata.commands.find(c=>c.id===id)!,path:[script]};const engine=new Engine({...metadata,commands:[definition]},process.cwd(),process.execPath);const done=new Promise<OperationResult>(resolve=>engine.subscribe(op=>{if(op.endedAt)resolve(op);}));engine.execute({commandId:id,values,args,confirmed:true});return (await done).data as string[];}
 const gist=await execute('gist create',{}, {'filename-pattern':['hello.py','*.md']});assert.deepEqual(gist,['--','hello.py','*.md']);
 const template='{{range .}}{{.title}}\n{{end}}';const api=await execute('api',{template},{endpoint:'repos/o/r/issues'});assert.ok(api.includes(`--template=${template}`));
 const engine=new Engine(metadata,process.cwd(),process.execPath);assert.throws(()=>engine.execute({commandId:'codespace cp',values:{expand:true},args:{sources:['remote:*.md'],dest:'.'},confirmed:true}),/Remote shell expansion/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('guided Codespaces mappings reject malformed ports and unreviewed copies before process launch',()=>{
 const {commands,...metadata}=JSON.parse(readFileSync('data/gh-catalog.json','utf8')) as Catalog;const engine=new Engine({...metadata,commands},process.cwd(),process.execPath);
 for(const mapping of ['0:8080','8080:65536','8080:8080 --exec=bad','localhost:8080'])assert.throws(()=>engine.execute({commandId:'codespace ports forward',confirmed:true,values:{},args:{'port-mappings':[mapping]}}),/ports/);
 for(const mapping of ['0:private','8080:everyone','65536:public'])assert.throws(()=>engine.execute({commandId:'codespace ports visibility',confirmed:true,values:{},args:{'port-visibility':[mapping]}}),/visibility/);
 assert.throws(()=>engine.execute({commandId:'codespace cp',values:{},args:{sources:['file'],dest:'remote:/file'}}),/confirm/);
});
import {CliWorkflowsService} from '../src/main/cli-workflows';
import {loadCatalog} from '../src/main/catalog';
const workflowService=(deps:ConstructorParameters<typeof CliWorkflowsService>[4]={})=>new CliWorkflowsService(loadCatalog(),new Engine(loadCatalog(),process.cwd(),process.execPath),process.cwd(),process.execPath,{copilotPath:null,read:argv=>JSON.stringify(argv.at(-1)?.startsWith('user/codespaces/')?{id:11,name:argv.at(-1)?.split('/').at(-1),repository:{id:22}}:{id:7,login:'fixture'}),...deps});
test('workflow inventory distinguishes all catalog leaves from actual installed/native blockers',async()=>{
 const response=await workflowService().handle('inventory');assert.equal(response.kind,'inventory');if(response.kind!=='inventory')return;assert.equal(response.commands.length,196);assert.equal(response.copilotInstalled,false);assert.ok(response.blockers.some(row=>row.id==='preview prompter'));
 await assert.rejects(workflowService().handle('review',{commandId:'copilot',fields:{mode:'help'}}),/not installed/);
 await assert.rejects(workflowService().handle('review',{commandId:'preview prompter',fields:{promptType:'select'}}),/PTY/);
});
test('server-side workflow reviews reject arbitrary fields, injection, ports and unsigned plans',async()=>{
 const service=workflowService();
 for(const fields of [{codespace:'valid',mappings:[{remote:0,local:8080}]},{codespace:'valid',mappings:[{remote:8080,local:65536}]},{codespace:'valid',mappings:[{remote:8080,local:8080},{remote:9090,local:8080}]},{codespace:'valid',mappings:[{remote:8080,local:8080}],shell:'bad'}])await assert.rejects(service.handle('review',{commandId:'codespace ports forward',fields}),/Ports|distinct|Unknown/);
 await assert.rejects(service.handle('review',{commandId:'extension install',fields:{repository:'https://evil.example/owner/repo'}}),/OWNER/);
 await assert.rejects(service.handle('review',{commandId:'codespace ssh',fields:{codespace:'valid',mode:'diagnostic',profile:'uname; rm -rf'}}),/profile/);
 await assert.rejects(service.handle('apply',{reviewId:'invented',confirmed:true}),/expired/);
 const plan=await service.handle('review',{commandId:'codespace ports forward',fields:{codespace:'valid',mappings:[{remote:8080,local:9000}]}});assert.equal(plan.kind,'review');if(plan.kind==='review'){assert.deepEqual(plan.argv,['codespace','ports','forward','--codespace=valid','--','8080:9000']);await assert.rejects(service.handle('apply',{reviewId:plan.reviewId}),/Confirm/);await assert.rejects(service.handle('apply',{reviewId:plan.reviewId,confirmed:true}),/expired/);}
});
test('dynamic extension execution requires a real installed choice and exact separate argv',async()=>{
 const service=workflowService({read:argv=>{assert.deepEqual(argv,['extension','list']);return 'gh sample\towner/gh-sample\tv1\n';}});
 await assert.rejects(service.handle('review',{commandId:'extension exec',fields:{name:'missing',arguments:[]}}),/currently installed/);
 const plan=await service.handle('review',{commandId:'extension exec',fields:{name:'sample',arguments:['--name=literal value','$(touch nope)']}});assert.equal(plan.kind,'review');if(plan.kind==='review'){assert.deepEqual(plan.argv,['extension','exec','--','sample','--name=literal value','$(touch nope)']);assert.ok(plan.warnings.some(value=>value.includes('account, files')));}
});
test('alias import grants file only via picker and rejects changed reviewed content',async()=>{
 const {mkdtemp,writeFile,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const path=await import('node:path');const dir=await mkdtemp(path.join(tmpdir(),'workflow-file-'));const file=path.join(dir,'aliases.yml');try{await writeFile(file,'bugs: issue list --label=bug\n');const service=workflowService({chooseFile:async()=>file});await assert.rejects(service.handle('review',{commandId:'alias import',fields:{file}}),/native/);const chosen=await service.handle('import-file');assert.equal(chosen.kind,'file');const plan=await service.handle('review',{commandId:'alias import',fields:{file,clobber:true}});assert.equal(plan.kind,'review');await writeFile(file,'bugs: issue list --label=changed\n');if(plan.kind==='review')await assert.rejects(service.handle('apply',{reviewId:plan.reviewId,confirmed:true}),/changed/);}finally{await rm(dir,{recursive:true,force:true});}
});
test('extension searches use actual remote pages and Copilot cannot implicitly download',async()=>{
 const calls:string[][]=[];const service=workflowService({read:argv=>{calls.push(argv);return JSON.stringify({total_count:42,items:[{full_name:'owner/gh-example',description:'Example'}]});}});
 const response=await service.handle('choices',{kind:'extension-search',query:'topic phrase',page:1});assert.equal(response.kind,'choices');if(response.kind==='choices'){assert.equal(response.hasNext,true);assert.equal(response.items[0].value,'owner/gh-example');}assert.match(calls[0][1],/page=2/);assert.match(calls[0][1],/topic%3Agh-extension/);
});
test('reviewed harmless native alias list reports actual CLI exit and rejects review replay',async()=>{
 const path=await import('node:path');const binary=path.resolve('vendor/gh_2.102.0_linux_amd64/bin/gh');const engine=new Engine(loadCatalog(),process.cwd(),binary);const service=new CliWorkflowsService(loadCatalog(),engine,process.cwd(),binary,{copilotPath:null});const plan=await service.handle('review',{commandId:'alias list',fields:{}});assert.equal(plan.kind,'review');if(plan.kind!=='review')return;const done=new Promise<OperationResult>(resolve=>engine.subscribe(op=>{if(op.endedAt)resolve(op);}));const result=await service.handle('apply',{reviewId:plan.reviewId,confirmed:true});assert.equal(result.kind,'operation');assert.equal((await done).status,'succeeded');await assert.rejects(service.handle('apply',{reviewId:plan.reviewId,confirmed:true}),/expired/);
});
test('cancellation stops a spawned descendant in the owned process tree',async()=>{
 const {mkdtemp,writeFile,readFile,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const path=await import('node:path');const dir=await mkdtemp(path.join(tmpdir(),'material-descendant-'));const script=path.join(dir,'parent.cjs'),counter=path.join(dir,'counter');
 try{await writeFile(script,`const {spawn}=require('node:child_process');const child=spawn(process.execPath,['-e',${JSON.stringify(`const fs=require('node:fs');let count=0;setInterval(()=>fs.writeFileSync(${JSON.stringify(counter)},String(++count)),20);`)}],{stdio:'inherit'});setInterval(()=>{},1000);`);
 const definition={...catalog.commands[0],id:'descendant',path:[script],options:[],arguments:[]};const engine=new Engine({...catalog,commands:[definition]},process.cwd(),process.execPath);const done=new Promise<OperationResult>(resolve=>engine.subscribe(op=>{if(op.endedAt)resolve(op);}));const operation=engine.execute({commandId:'descendant',values:{},args:{}});let started=false;for(let attempt=0;attempt<100;attempt++){try{await readFile(counter);started=true;break;}catch{await new Promise(resolve=>setTimeout(resolve,10));}}assert.equal(started,true);engine.cancel(operation.id);assert.equal((await done).status,'cancelled');const before=await readFile(counter,'utf8');await new Promise(resolve=>setTimeout(resolve,100));assert.equal(await readFile(counter,'utf8'),before);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('dedicated SSH profile, server port and explicit remote expansion have exact reviewed arguments',async()=>{
 const service=workflowService();const ssh=await service.handle('review',{commandId:'codespace ssh',fields:{codespace:'real-name',mode:'config',profile:'developer',diagnostic:'system',serverPort:0}});assert.equal(ssh.kind,'review');if(ssh.kind==='review'){assert.ok(ssh.argv.includes('--profile=developer'));assert.ok(ssh.argv.includes('--server-port=0'));assert.ok(ssh.argv.includes('--config'));}
 await assert.rejects(service.handle('review',{commandId:'codespace ssh',fields:{codespace:'real-name',mode:'config',serverPort:65536}}),/65535/);
 const copy=await service.handle('review',{commandId:'codespace cp',fields:{codespace:'real-name',direction:'upload',localPath:'package.json',remotePath:'~/project/',profile:'developer',expand:true}});assert.equal(copy.kind,'review');if(copy.kind==='review'){assert.ok(copy.argv.includes('--expand'));assert.ok(copy.argv.includes('--profile=developer'));assert.ok(copy.argv.includes('remote:~/project/'));assert.ok(copy.warnings.some(warning=>warning.includes('Bash expressions')));}
});

test('Codespace review binds the approved host, active account and provider target before execution',async()=>{
 let account=7,target=11;const calls:string[]=[];const service=workflowService({resolveHost:hostname=>({hostname:hostname||'github.example',label:'Fixture',restOrigin:'https://github.example/api/v3',graphqlEndpoint:'https://github.example/api/graphql'}),read:(argv,hostname)=>{assert.equal(hostname,'github.example');return JSON.stringify(argv.at(-1)?.startsWith('user/codespaces/')?{id:target,name:'fixture-space',repository:{id:22}}:{id:account,login:'fixture'});},authorize:async(command,host)=>{calls.push(`${command}@${host}`);}});
 const plan=await service.handle('review',{commandId:'codespace ssh',fields:{codespace:'fixture-space',mode:'config'}});assert.equal(plan.kind,'review');if(plan.kind!=='review')return;assert.equal(plan.hostname,'github.example');assert.equal(plan.account,'fixture');assert.equal(plan.target,'fixture-space');account=8;await assert.rejects(service.handle('apply',{reviewId:plan.reviewId,confirmed:true}),/account or Codespace changed/);assert.equal(service.activeOperations.size,0);assert.deepEqual(calls,['codespace ssh@github.example','codespace ssh@github.example']);account=7;const next=await service.handle('review',{commandId:'codespace code',fields:{codespace:'fixture-space',web:true}});if(next.kind!=='review')throw Error();target=12;await assert.rejects(service.handle('apply',{reviewId:next.reviewId,confirmed:true}),/Codespace changed/);
 const stale=await service.handle('review',{commandId:'codespace ssh',fields:{codespace:'fixture-space',mode:'config'}});if(stale.kind!=='review')throw Error();service.invalidateReviews();await assert.rejects(service.handle('apply',{reviewId:stale.reviewId,confirmed:true}),/expired/);
});

test('scoped workflow cancellation retains active ownership until the real fixture process exits',async()=>{
 const {mkdtemp,writeFile,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const path=await import('node:path');const directory=await mkdtemp(path.join(tmpdir(),'material-codespace-fixture-'));
 try{await writeFile(path.join(directory,'codespace'),"console.log('fixture forwarding');setInterval(()=>{},1000);");const engine=new Engine(loadCatalog(),directory,process.execPath);const calls:string[]=[];const service=new CliWorkflowsService(loadCatalog(),engine,directory,process.execPath,{copilotPath:null,read:argv=>JSON.stringify(argv.at(-1)?.startsWith('user/codespaces/')?{id:11,name:'fixture-space',repository:{id:22}}:{id:7,login:'fixture'}),authorize:async command=>{calls.push(command);}});const review=await service.handle('review',{commandId:'codespace ports forward',fields:{codespace:'fixture-space',mappings:[{remote:8080,local:9000}]}});if(review.kind!=='review')throw Error();const ended=new Promise<OperationResult>(resolve=>engine.subscribe(op=>{if(op.endedAt)resolve(op);}));const started=await service.handle('apply',{reviewId:review.reviewId,confirmed:true});if(started.kind!=='operation')throw Error();assert.ok(service.activeOperations.has(started.operation.id));await assert.rejects(service.handle('cancel',{operationId:'unowned'}),/does not own/);await service.handle('cancel',{operationId:started.operation.id,hostname:'not-approved.example'});assert.ok(service.activeOperations.has(started.operation.id));assert.equal((await ended).status,'cancelled');assert.equal(service.activeOperations.size,0);assert.deepEqual(calls,['codespace ports forward','codespace ports forward']);
 }finally{await rm(directory,{recursive:true,force:true});}
});

test('reviewed Codespace copy and SSH log paths reject changed local targets and symlink escapes',async()=>{const {mkdtemp,writeFile,rm,symlink}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const path=await import('node:path');const directory=await mkdtemp(path.join(tmpdir(),'material-copy-review-'));const outside=await mkdtemp(path.join(tmpdir(),'material-copy-outside-'));try{const file=path.join(directory,'source.txt');await writeFile(file,'before');const service=new CliWorkflowsService(loadCatalog(),new Engine(loadCatalog(),directory,process.execPath),directory,process.execPath,{copilotPath:null,read:argv=>JSON.stringify(argv.at(-1)?.startsWith('user/codespaces/')?{id:11,name:'fixture-space',repository:{id:22}}:{id:7,login:'fixture'})});const copy=await service.handle('review',{commandId:'codespace cp',fields:{codespace:'fixture-space',direction:'upload',localPath:file,remotePath:'/workspaces/destination'}});if(copy.kind!=='review')throw Error();await writeFile(file,'changed content');await assert.rejects(service.handle('apply',{reviewId:copy.reviewId,confirmed:true}),/local file or folder changed/);if(process.platform!=='win32'){const log=path.join(directory,'ssh.log');const ssh=await service.handle('review',{commandId:'codespace ssh',fields:{codespace:'fixture-space',mode:'config',debug:true,debugFile:log}});if(ssh.kind!=='review')throw Error();await writeFile(path.join(outside,'target'),'fixture');await symlink(path.join(outside,'target'),log);await assert.rejects(service.handle('apply',{reviewId:ssh.reviewId,confirmed:true}),/approved workspace/);}assert.equal(service.activeOperations.size,0);}finally{await rm(directory,{recursive:true,force:true});await rm(outside,{recursive:true,force:true});}});
