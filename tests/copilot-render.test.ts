import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {build} from 'esbuild';
import {chromium} from 'playwright';

const browserPath=existsSync('/usr/bin/chromium')?'/usr/bin/chromium':chromium.executablePath();
test('built Tools Copilot mounts reviewed help, Explain/Suggest, scoped cancellation and discard without clearing another child state',{skip:!existsSync(browserPath)},async()=>{
 const bundle=await build({stdin:{contents:"import './src/renderer/tools.ts';",resolveDir:process.cwd(),sourcefile:'copilot-render-fixture.ts'},bundle:true,write:false,format:'iife',platform:'browser',logLevel:'silent'});
 const browser=await chromium.launch({headless:true,executablePath:browserPath,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1280,height:1000}});page.setDefaultTimeout(5000);
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.setContent('<mg-tools></mg-tools>');await page.evaluate('globalThis.__name=value=>value');
  await page.evaluate(()=>{
   const calls:{action:string;payload:Record<string,unknown>}[]=[],states:{busy:boolean;dirty:boolean}[]=[],listeners=new Set<(operation:unknown)=>void>();
   const operations=new Map<string,Record<string,unknown>>();let checked=false,sequence=0;let fields:Record<string,unknown>={};
   const catalog={state:'empty',complete:false,pages:0,families:0,variants:0};
   const finish=(id:string,status:string)=>{const op=operations.get(id)!;op.status=status;op.endedAt='fixture';for(const listener of listeners)listener({...op});};
   document.querySelector('mg-tools')!.addEventListener('tools-work-state',(event:Event)=>states.push((event as CustomEvent).detail));
   Object.assign(window,{fixtureCalls:calls,fixtureStates:states,material:{
    localTools:async(action:string)=>action==='converter-catalog'?[]:action==='converter-status'?{items:[],active:0,hasNext:false,queue:{paused:false,queued:0,running:0}}:action==='catalog-status'?catalog:action==='catalog-page'?{status:catalog,items:[],total:0,hasNext:false,families:[]}:action==='hardware'?null:action==='sessions'?[]:{items:[],active:false},
    ollama:async()=>({available:false}),
    onOperation:(listener:(operation:unknown)=>void)=>{listeners.add(listener);return()=>listeners.delete(listener);},
    operation:async(id:string)=>({...operations.get(id)!}),
    cliWorkflows:async(action:string,payload:Record<string,unknown>={})=>{
     calls.push({action,payload});
     if(action==='inventory')return {kind:'inventory',commands:[],copilotInstalled:true,copilotCapabilities:{checked,prompt:checked,message:checked?'Advertised prompt and tool denial verified by fixture help.':'Read capabilities first.'},blockers:[]};
     if(action==='review'){fields=payload.fields as Record<string,unknown>;return {kind:'review',reviewId:'fixture-receipt',commandId:'copilot',argv:fields.mode==='help'?['--help']:['-p',String(fields.prompt),'--deny-tool','*'],executable:'copilot',hostname:'github.example',account:'fixture',expiresAt:'2099-01-01T00:00:00Z',warnings:['Reviewed external program; answers are never executed.']};}
     if(action==='apply'){const id=String(++sequence);const help=fields.mode==='help';const operation={id,commandId:'copilot',status:help?'succeeded':'running',startedAt:'fixture',...(help?{endedAt:'fixture'}:{}),stdout:help?'  -p, --prompt <prompt>\n  --deny-tool <tool>':'<script>literal model answer</script>',stderr:''};if(help)checked=true;operations.set(id,operation);return {kind:'operation',operation};}
     if(action==='cancel'){finish(String(payload.operationId),'cancelled');return {kind:'cancelled'};}
     throw Error('Unexpected fixture workflow');
    },
    workspace:async(action:string,payload:Record<string,unknown>)=>{calls.push({action:`workspace.${action}`,payload});return {};},
    openExternal:async()=>{},exportData:async()=>{}
   }});
  });
  await page.addScriptTag({content:bundle.outputFiles[0].text});
  await page.evaluate(()=>{(document.querySelector('mg-tools') as unknown as {hostname:string}).hostname='github.example';});
  await page.locator('mg-tools').getByRole('tab',{name:'Copilot',exact:true}).click();
  const workspace=page.locator('mg-copilot-workspace');const child=workspace.locator('mg-cli-workflows');
  await child.getByRole('button',{name:'Review operation',exact:true}).click();
  const dialog=child.locator('md-dialog[open]');const run=dialog.getByRole('button',{name:'Run reviewed operation',exact:true});
  assert.ok(await run.isDisabled());await dialog.getByRole('checkbox',{name:'I reviewed the executable and arguments',exact:true}).check();await run.click();await child.locator('md-dialog').first().locator('dialog[open]').waitFor({state:'hidden'});
  const command=workspace.getByRole('textbox',{name:'Command to explain',exact:true});await command.fill('git status $(do-not-execute)');
  assert.equal(await child.locator('md-outlined-select[label="Action"]').count(),0);
  await child.getByRole('button',{name:'Review operation',exact:true}).click();
  await dialog.getByRole('checkbox',{name:'I reviewed the executable and arguments',exact:true}).check();await run.click();await child.locator('md-dialog').first().locator('dialog[open]').waitFor({state:'hidden'});
  await page.waitForFunction(()=>(window as unknown as {fixtureStates:{busy:boolean}[]}).fixtureStates.at(-1)?.busy===true);
  await child.locator('.rows').getByRole('button',{name:'Cancel',exact:true}).click();
  await page.waitForFunction(()=>(window as unknown as {fixtureStates:{busy:boolean}[]}).fixtureStates.at(-1)?.busy===false);
  assert.match(await child.locator('.output').first().innerText(),/<script>literal model answer<\/script>/);
  assert.equal(await child.locator('script').count(),0);
  await workspace.locator('md-primary-tab').filter({hasText:'Suggest command'}).click();
  const description=workspace.getByRole('textbox',{name:'Task description',exact:true});await description.fill('Create a branch');
  await workspace.getByRole('button',{name:'Discard edited inputs',exact:true}).click();
  await page.waitForFunction(()=>{const tools=document.querySelector('mg-tools')!;const copilot=tools.shadowRoot!.querySelector('mg-copilot-workspace')!;return !(copilot as unknown as {dirty:boolean}).dirty;});
  assert.equal(await description.inputValue(),'');
  await description.fill('Create a branch with a meaningful name');
  await workspace.getByRole('combobox',{name:'Suggestion type',exact:true}).click();
  await workspace.locator('md-select-option[value=git] div[slot=headline]').click();
  await child.getByRole('button',{name:'Review operation',exact:true}).click();
  await dialog.getByRole('checkbox',{name:'I reviewed the executable and arguments',exact:true}).check();await run.click();
  await child.locator('md-dialog').first().locator('dialog[open]').waitFor({state:'hidden'});
  await child.locator('.rows').getByRole('button',{name:'Cancel',exact:true}).click();
  await page.waitForFunction(()=>(window as unknown as {fixtureStates:{busy:boolean}[]}).fixtureStates.at(-1)?.busy===false);
  await description.fill('A draft for close discard');
  await page.evaluate(()=>{(document.querySelector('mg-tools') as unknown as {discardDrafts():void}).discardDrafts();});
  assert.equal(await description.inputValue(),'');
  await page.evaluate(()=>{const converters=document.querySelector('mg-tools')!.shadowRoot!.querySelector('mg-converters')!;converters.dispatchEvent(new CustomEvent('tools-work-state',{detail:{busy:true,dirty:false},bubbles:true,composed:true}));const copilot=document.querySelector('mg-tools')!.shadowRoot!.querySelector('mg-copilot-workspace')!;copilot.dispatchEvent(new CustomEvent('copilot-work-state',{detail:{busy:false,dirty:false},bubbles:true,composed:true}));});
  const states=await page.evaluate(()=>(window as unknown as {fixtureStates:{busy:boolean;dirty:boolean}[]}).fixtureStates);assert.equal(states.at(-1)?.busy,true);
  const calls=await page.evaluate(()=>(window as unknown as {fixtureCalls:{action:string;payload:Record<string,unknown>}[]}).fixtureCalls);
  assert.equal(calls.find(call=>call.action==='review')?.payload.hostname,'github.example');
  assert.equal((calls.find(call=>call.action==='review'&&(call.payload.fields as Record<string,unknown>)?.mode==='explain')?.payload.fields as Record<string,unknown>)?.prompt,'git status $(do-not-execute)',JSON.stringify(calls.filter(call=>call.action==='review')));
  assert.deepEqual(calls.find(call=>call.action==='cancel')?.payload,{hostname:'github.example',operationId:'2'});
  assert.deepEqual(calls.find(call=>call.action==='review'&&(call.payload.fields as Record<string,unknown>)?.mode==='suggest')?.payload.fields,{mode:'suggest',prompt:'Create a branch with a meaningful name',target:'git'});
  assert.deepEqual(calls.find(call=>call.action==='workspace.discard')?.payload,{ids:['tools:copilot']});
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
