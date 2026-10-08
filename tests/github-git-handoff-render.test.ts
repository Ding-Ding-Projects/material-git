import test from 'node:test';import assert from 'node:assert/strict';import {existsSync} from 'node:fs';import {build} from 'esbuild';import {chromium} from 'playwright';
const browserPath=existsSync('/usr/bin/chromium')?'/usr/bin/chromium':chromium.executablePath();
/** Compiled domain controls and native-bound source selectors; no simulated successful Git write. */
test('selected provider records open scoped local Git drafts and await native source cleanup',{skip:!existsSync(browserPath)},async()=>{
 const bundle=await build({stdin:{contents:"import './src/renderer/github-workspace.ts';import './src/renderer/scroll-surface.ts';",resolveDir:process.cwd(),sourcefile:'provider-handoff-fixture.ts'},bundle:true,write:false,format:'iife',platform:'browser',logLevel:'silent'});
 const browser=await chromium.launch({headless:true,executablePath:browserPath,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1280,height:1000}});page.setDefaultTimeout(5000);const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.route('http://127.0.0.1/provider-fixture',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));await page.goto('http://127.0.0.1/provider-fixture');
  await page.setContent('<style>mg-github-workspace{display:block;height:900px}.record-list-scroll{height:240px}.detail-content-scroll{height:300px}.native-task-scroll{height:700px}</style>');await page.evaluate('globalThis.__name=value=>value');
  await page.evaluate(()=>{Object.assign(window,{fixtureCalls:[],fixtureFailCleanup:false,material:{github:async(action:string,payload:Record<string,unknown>)=>{
   (window as unknown as {fixtureCalls:unknown[]}).fixtureCalls.push({action,payload});
   if(action==='provider-source-discard'){if((window as unknown as {fixtureFailCleanup:boolean}).fixtureFailCleanup)throw Error('Fixture cleanup denied');return {items:[],page:0,hasNext:false};}
   const row=action.startsWith('repositories.')?{id:88,full_name:'owner/repo',name:'repo',title:'owner/repo'}:action.startsWith('gists.')?{id:'abcdef',description:'Selected gist',files:{'demo.txt':{filename:'demo.txt'}}}:{id:99042,number:42,title:'Selected pull request',state:'open'};
   if(action.endsWith('-source'))return {items:[],page:0,hasNext:false,detail:{providerTargetId:'00000000-0000-4000-8000-000000000123',kind:action.startsWith('repositories.')?'repository':action.startsWith('gists.')?'gist':'pull-request',hostname:payload.hostname,name:action.startsWith('gists.')?'gist-abcdef':action.startsWith('pulls.')?'pr-42':'repo',repository:action.startsWith('gists.')?undefined:'owner/repo',number:action.startsWith('pulls.')?42:undefined,headSha:action.startsWith('pulls.')?'a'.repeat(40):undefined,expiresAt:'2099-01-01T00:00:00Z'}};
   return {items:action.endsWith('.list')?[row]:[],detail:row,page:0,hasNext:false};
  },git:async(action:string,payload:Record<string,unknown>)=>{(window as unknown as {fixtureCalls:unknown[]}).fixtureCalls.push({action:`git:${action}`,payload});if(action==='provider-source')return {kind:'provider-source',providerTargetId:payload.providerTargetId,sourceKind:'repository',name:'repo',hostname:'forge.example',url:'https://forge.example/owner/repo.git',expiresAt:'2099-01-01T00:00:00Z'};if(action==='review')return {kind:'review',reviewId:'00000000-0000-4000-8000-000000000456',worktreeId:'',task:'clone',title:'Clone repository',summary:'Fixture exact native source review',argv:['clone','--','https://forge.example/owner/repo.git'],warnings:[],expiresAt:'2099-01-01T00:00:00Z',fingerprint:'fixture'};return {kind:'text',text:''};},openExternal:async()=>{},workspace:async()=>({})}});});
  await page.addScriptTag({content:bundle.outputFiles[0].text});
  for(const domain of ['repositories','gists']){
   await page.evaluate(domain=>{document.querySelector('mg-github-workspace')?.remove();const workspace=document.createElement('mg-github-workspace') as HTMLElement&{domain:string;hostname:string;repository:string;authenticated:boolean};workspace.domain=domain;workspace.hostname='forge.example';workspace.repository='owner/repo';workspace.authenticated=true;document.body.append(workspace);},domain);
   await page.locator('[data-testid=github-record]').click();await page.locator('[data-testid=selected-local-git]').click();await page.locator('mg-github-git-handoff').locator('mg-git-workspace').waitFor();
   assert.equal(await page.evaluate(()=>{const workspace=document.querySelector('mg-github-workspace') as HTMLElement&{nativeDirty:boolean};return workspace.nativeDirty;}),true);
   const seed=await page.evaluate(()=>{const child=document.querySelector('mg-github-git-handoff')!.shadowRoot!.querySelector('mg-git-workspace') as HTMLElement&{fields:Record<string,unknown>;providerTargetId:string;task:string};return {fields:child.fields,providerTargetId:child.providerTargetId,task:child.task};});
   assert.equal(seed.fields.url,undefined);assert.equal(seed.providerTargetId,'00000000-0000-4000-8000-000000000123');assert.equal(seed.task,domain==='pull-requests'?'provider-checkout':'clone');
   await page.locator('mg-github-git-handoff').getByText('Git uses its own transport credentials',{exact:false}).waitFor();
   assert.equal(await page.locator('mg-github-git-handoff').getByRole('textbox',{name:'HTTPS or SSH URL',exact:true}).count(),0);
   await page.locator('mg-github-git-handoff').getByRole('button',{name:'Review operation',exact:true}).click();await page.locator('mg-github-git-handoff').getByRole('region',{name:'Reviewed Git operation'}).waitFor();
   const cleanup=await page.evaluate(async()=>{const workspace=document.querySelector('mg-github-workspace') as HTMLElement&{discardDrafts():Promise<boolean>;nativeDirty:boolean;localHandoff:unknown};const handoff=workspace.querySelector('mg-github-git-handoff')!;(window as unknown as {fixtureFailCleanup:boolean}).fixtureFailCleanup=true;const failed=await workspace.discardDrafts();const preserved=workspace.nativeDirty&&!!workspace.localHandoff;(window as unknown as {fixtureFailCleanup:boolean}).fixtureFailCleanup=false;const succeeded=await workspace.discardDrafts();return {failed,preserved,succeeded,dirty:workspace.nativeDirty};});
   assert.deepEqual(cleanup,{failed:false,preserved:true,succeeded:true,dirty:false});
  }
  const calls=await page.evaluate(()=>(window as unknown as {fixtureCalls:{action:string;payload?:Record<string,unknown>}[]}).fixtureCalls);const source=calls.filter(call=>['repositories.clone-source','gists.clone-source'].includes(call.action));
  assert.deepEqual(source.map(call=>({action:call.action,payload:call.payload})),[
   {action:'repositories.clone-source',payload:{hostname:'forge.example',repository:'owner/repo',id:'88'}},
   {action:'gists.clone-source',payload:{hostname:'forge.example',id:'abcdef'}},
  ]);
  assert.equal(calls.some(call=>['git:open','git:apply'].includes(call.action)),false,'No folder open or Git mutation is performed by this source/review fixture');
  for(const call of calls.filter(call=>call.action==='git:review')){assert.equal(call.payload?.providerTargetId,'00000000-0000-4000-8000-000000000123');assert.equal((call.payload?.fields as Record<string,unknown>).url,undefined);}
  for(let i=0;i<calls.length;i++)if(calls[i].action==='git:discard-review')assert.equal(calls[i-1].action,'provider-source-discard');assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
