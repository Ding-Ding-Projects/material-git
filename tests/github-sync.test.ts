import test from 'node:test';import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';import {build} from 'esbuild';import {chromium} from 'playwright';
import {GitHubService} from '../src/main/github';import {prepareRepositorySync} from '../src/main/github-sync';
const original='a'.repeat(40),incoming='b'.repeat(40);
function fixture(){
 let destinationSha=original,sourceSha=incoming,sourceId=77,account=7,status='ahead',deny=false,afterMove=false;const calls:{method:string;endpoint:string;body?:Record<string,unknown>}[]=[];
 const request=async(method:string,endpoint:string,body?:Record<string,unknown>)=>{calls.push({method,endpoint,body});let data:unknown;
  if(endpoint==='user')data={id:account};else if(endpoint.startsWith('user/repos?'))data=[{id:88,name:'fork',full_name:'me/fork',default_branch:'main',description:'Selected destination'},{id:77,name:'repo',full_name:'upstream/repo',default_branch:'main'}];else if(endpoint.startsWith('repos/upstream/repo/branches?'))data=[{name:'main',commit:{sha:sourceSha}}];else if(endpoint==='repos/me/fork')data={id:88,full_name:'me/fork',default_branch:'main',parent:{id:77,full_name:'upstream/repo'}};else if(endpoint==='repos/upstream/repo')data={id:sourceId,full_name:'upstream/repo',default_branch:'main'};
  else if(endpoint==='repos/me/fork/git/ref/heads/main')data={ref:'refs/heads/main',object:{type:'commit',sha:destinationSha}};else if(endpoint==='repos/upstream/repo/git/ref/heads/main')data={ref:'refs/heads/main',object:{type:'commit',sha:sourceSha}};
  else if(endpoint.startsWith('repos/me/fork/compare/'))data={status:destinationSha===sourceSha?'identical':status,ahead_by:destinationSha===sourceSha?0:status==='behind'?0:2,behind_by:destinationSha===sourceSha?0:status==='ahead'?0:1,base_commit:{sha:destinationSha}};
  else if(method==='PATCH'&&endpoint==='repos/me/fork/git/refs/heads/main'){if(deny)throw Error('Fixture provider denied branch update (HTTP 403)');destinationSha=String(body?.sha);data={ref:'refs/heads/main',object:{type:'commit',sha:destinationSha}};if(afterMove)destinationSha='c'.repeat(40);}
  else throw Error('Unexpected synchronization provider path');return {data,hasNext:false};};
 const service=new GitHubService(process.execPath,process.cwd(),undefined,{request,resolveHost:hostname=>{if(hostname&&hostname!=='forge.example')throw Error('Unapproved host');return 'forge.example';}});
 const payload={hostname:'forge.example',repository:'me/fork',id:88,values:{options:{},arguments:{}}};
 return {service,request,payload,calls,sourceSha:(value:string)=>sourceSha=value,destinationSha:(value:string)=>destinationSha=value,sourceId:(value:number)=>sourceId=value,account:(value:number)=>account=value,status:(value:string)=>status=value,deny:()=>deny=true,afterMove:()=>afterMove=true,writes:()=>calls.filter(call=>call.method==='PATCH')};
}
test('selected synchronization prepares exact provider commits and applies one bound remote update',async()=>{
 const f=fixture();try{const definition=(await f.service.handle('task-definition',{...f.payload,action:'repositories.synchronize'})).task!;assert.equal(definition.commandId,'repo sync');assert.equal(definition.destructive,true);assert.equal(definition.options.find(field=>field.name==='source')?.entity,'repository');assert.equal(definition.options.find(field=>field.name==='source')?.type,'entity');assert.deepEqual(definition.arguments,[]);assert.equal(definition.initialOptions?.source,'upstream/repo');
  const response=await f.service.handle('repositories.synchronize',f.payload),review=response.review!;assert.ok(review.reviewId);assert.equal(f.writes().length,0);assert.equal(review.prepared?.kind,'repository-sync');assert.equal(review.prepared?.beforeSha,original);assert.equal(review.prepared?.sourceSha,incoming);assert.match(JSON.stringify(review.prepared),/upstream\/repo/);
  const applied=await f.service.handle('apply',{reviewId:review.reviewId,confirmed:true});assert.equal(applied.detail?.verified,true);assert.equal(applied.detail?.sha,incoming);assert.equal(applied.detail?.previousSha,original);assert.deepEqual(f.writes(),[{method:'PATCH',endpoint:'repos/me/fork/git/refs/heads/main',body:{sha:incoming,force:false}}]);await assert.rejects(f.service.handle('apply',{reviewId:review.reviewId,confirmed:true}),/expired/);
 }finally{f.service.close();}
});
test('source/destination drift and account changes reject synchronization before remote effects',async()=>{
 for(const drift of ['source','destination','account','identity'] as const){const f=fixture();try{const review=(await f.service.handle('repositories.synchronize',f.payload)).review!;if(drift==='source')f.sourceSha('c'.repeat(40));if(drift==='destination')f.destinationSha('d'.repeat(40));if(drift==='account')f.account(8);if(drift==='identity')f.sourceId(78);await assert.rejects(f.service.handle('apply',{reviewId:review.reviewId,confirmed:true}),/changed/);assert.equal(f.writes().length,0);}finally{f.service.close();}}
});
test('divergent commits require an explicit reviewed reset and cannot be introduced during Apply',async()=>{
 const f=fixture();try{f.status('diverged');await assert.rejects(f.service.handle('repositories.synchronize',f.payload),/destination has commits/);assert.equal(f.writes().length,0);const payload={...f.payload,values:{options:{force:true},arguments:{}}};const review=(await f.service.handle('repositories.synchronize',payload)).review!;assert.equal(review.prepared?.force,true);assert.ok(review.warnings.some(warning=>warning.includes('atomic expected-old-commit')));await assert.rejects(f.service.handle('apply',{reviewId:review.reviewId,confirmed:true,values:{options:{force:false}}}),/cannot replace/);assert.equal(f.writes().length,0);const fresh=(await f.service.handle('repositories.synchronize',payload)).review!;await f.service.handle('apply',{reviewId:fresh.reviewId,confirmed:true});assert.deepEqual(f.writes()[0].body,{sha:incoming,force:true});}finally{f.service.close();}
});
test('synchronization validates semantic inputs and selected repository identity without accepting commit claims',async()=>{
 const f=fixture();try{for(const payload of [{...f.payload,id:89},{...f.payload,values:{options:{force:'yes'},arguments:{}}},{...f.payload,values:{options:{source:'../../elsewhere'},arguments:{}}},{...f.payload,values:{options:{sha:incoming},arguments:{}}},{...f.payload,values:{options:{},arguments:{'destination-repository':'someone/else'}}}])await assert.rejects(prepareRepositorySync(f.request,payload));assert.equal(f.writes().length,0);}finally{f.service.close();}
});
test('matching branches need no write and provider rejection never reports synchronization success',async()=>{
 const f=fixture();try{f.destinationSha(incoming);const review=(await f.service.handle('repositories.synchronize',f.payload)).review!;const result=await f.service.handle('apply',{reviewId:review.reviewId,confirmed:true});assert.equal(result.detail?.changed,false);assert.equal(f.writes().length,0);f.destinationSha(original);f.deny();const denied=(await f.service.handle('repositories.synchronize',f.payload)).review!;await assert.rejects(f.service.handle('apply',{reviewId:denied.reviewId,confirmed:true}),/denied branch update/);}finally{f.service.close();}
});
test('a branch moved after an accepted update is reported as an uncertain final outcome',async()=>{
 const f=fixture();try{f.afterMove();const review=(await f.service.handle('repositories.synchronize',f.payload)).review!;const result=await f.service.handle('apply',{reviewId:review.reviewId,confirmed:true});assert.equal(result.detail?.ok,false);assert.equal(result.detail?.partialEffects,true);assert.equal(result.detail?.observedSha,'c'.repeat(40));assert.match(result.notice!,/equality is not established/);}finally{f.service.close();}
});

const browserPath=existsSync('/usr/bin/chromium')?'/usr/bin/chromium':chromium.executablePath();
test('selected repository Sync is reachable with real provider choices, exact review, and guarded Apply',{skip:!existsSync(browserPath)},async()=>{
 const f=fixture(),uiCalls:{action:string;payload:Record<string,unknown>}[]=[];
 const bundle=await build({stdin:{contents:"import './src/renderer/github-workspace.ts';import './src/renderer/scroll-surface.ts';import {defaults} from './src/shared/preferences.ts';window.fixtureSettings=defaults;",resolveDir:process.cwd(),sourcefile:'sync-fixture.ts'},bundle:true,write:false,format:'iife',platform:'browser',logLevel:'silent'});
 const browser=await chromium.launch({headless:true,executablePath:browserPath,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1440,height:1100}});page.setDefaultTimeout(8000);const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.exposeBinding('nativeGithub',async(_source,action,payload)=>{uiCalls.push({action,payload});return f.service.handle(action,payload);});
  await page.setContent('<style>mg-github-workspace{display:block;height:1050px}.record-tab-scroll{height:60px}.record-list-scroll{height:250px}.detail-content-scroll{height:300px}.native-task-scroll{height:750px}</style>');
  await page.evaluate('globalThis.__name=value=>value');
  await page.evaluate(()=>{Object.assign(window,{__name:(value:unknown)=>value,material:{github:(window as unknown as {nativeGithub:unknown}).nativeGithub,openExternal:async()=>{}}});});
  await page.evaluate(()=>{Object.assign(window,{fixtureMessages:[]});document.addEventListener('application-message',event=>{(window as unknown as {fixtureMessages:unknown[]}).fixtureMessages.push((event as CustomEvent).detail);});});
  await page.addScriptTag({content:bundle.outputFiles[0].text});
  await page.evaluate(()=>{const element=document.createElement('mg-github-workspace') as HTMLElement&{domain:string;hostname:string;authenticated:boolean;settings:unknown};element.settings=(window as unknown as {fixtureSettings:unknown}).fixtureSettings;element.domain='repositories';element.hostname='forge.example';element.authenticated=true;document.body.append(element);});
  await page.locator('[data-testid=github-record]').first().click();await page.locator('[data-testid=native-area-synchronize]').click();await page.locator('[data-testid="native-task-repositories.synchronize"]').click();
  const task=page.locator('mg-github-task');await task.locator('md-outlined-text-field[label="Source repository"]').waitFor();
  await task.locator('.field').filter({has:page.locator('md-outlined-text-field[label="Source repository"]')}).getByRole('button',{name:'Choose from GitHub',exact:true}).click();
  await task.locator('.picker-row').filter({hasText:'upstream/repo'}).getByRole('button',{name:'Select',exact:true}).click();
  await task.locator('.field').filter({has:page.locator('md-outlined-text-field[label="Matching branch"]')}).getByRole('button',{name:'Choose from GitHub',exact:true}).click();
  await task.locator('.picker-row').filter({hasText:'main'}).getByRole('button',{name:'Select',exact:true}).click();
  await task.getByRole('button',{name:'Review changes',exact:true}).click();const apply=task.getByRole('button',{name:'Apply reviewed changes',exact:true});await apply.waitFor();assert.equal(await apply.isDisabled(),true);assert.equal(f.writes().length,0);
  await task.getByRole('checkbox',{name:'I reviewed the exact target and values',exact:true}).click();assert.equal(await apply.isDisabled(),true);
  await task.getByRole('checkbox',{name:'I understand the effect',exact:true}).click();assert.equal(await apply.isDisabled(),true);
  await task.getByRole('slider',{name:'Set confirmation to 100',exact:true}).press('End');
  await apply.click();await task.getByRole('status').filter({hasText:'Synchronized me/fork:main'}).waitFor();
  assert.deepEqual(f.writes().map(call=>call.body),[{sha:incoming,force:false}]);
  const review=uiCalls.find(call=>call.action==='review'&&call.payload.action==='repositories.synchronize');assert.equal(review?.payload.hostname,'forge.example');assert.equal(review?.payload.repository,'me/fork');assert.equal(String(review?.payload.id),'88');
  assert.ok(uiCalls.some(call=>call.action==='choices'&&call.payload.entity==='branches'&&call.payload.repository==='upstream/repo'));
  assert.ok(uiCalls.filter(call=>call.action==='repositories.list').length>=2,'provider list reloads after accepted update');assert.deepEqual(errors,[]);
  const messages=await page.evaluate(()=>(window as unknown as {fixtureMessages:{category:string;facts:{en:string;yue:string}}[]}).fixtureMessages);assert.equal(messages.at(-1)?.category,'status');assert.match(messages.at(-1)!.facts.en,/commit was verified/);assert.match(messages.at(-1)!.facts.yue,/已驗證提交/);
  f.sourceSha('c'.repeat(40));f.deny();await task.getByRole('button',{name:'Review changes',exact:true}).click();await task.getByRole('checkbox',{name:'I reviewed the exact target and values',exact:true}).check();await task.getByRole('checkbox',{name:'I understand the effect',exact:true}).check();await task.getByRole('slider',{name:'Set confirmation to 100',exact:true}).press('End');await apply.click();await task.getByRole('alert').filter({hasText:'GitHub task failed: Fixture provider denied branch update (HTTP 403)'}).waitFor();
  const failure=await page.evaluate(()=>(window as unknown as {fixtureMessages:{category:string;facts:{en:string;yue:string}}[]}).fixtureMessages.at(-1));assert.equal(failure?.category,'error');assert.match(failure!.facts.en,/task failed/);assert.match(failure!.facts.yue,/工作失敗/);assert.ok(!JSON.stringify(failure).includes('HTTP 403'),'external provider error detail stays in the task, not narration');
 }finally{f.service.close();await browser.close();}
});
