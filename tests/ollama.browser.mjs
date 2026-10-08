import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

// Actual compiled Electron IPC and controls, with an explicitly synthetic isolated saved-history fixture.
// This does not establish live Ollama inference or native Windows behavior.
const root=fileURLToPath(new URL('..',import.meta.url)),require=createRequire(import.meta.url);
const directory=await mkdtemp(join(tmpdir(),'material-ollama-browser-')),profile=join(directory,'profile');
const saved=join(profile,'local-tools','local-tools','ollama'),session='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
await mkdir(join(saved,'sessions'),{recursive:true});
await writeFile(join(saved,'sessions',session+'.json'),JSON.stringify({id:session,name:'Synthetic saved-history fixture',model:'synthetic-fixture:vision',at:new Date().toISOString(),system:'',messages:[{role:'user',content:'Explicit synthetic saved-history fixture; no inference was performed.'}]}));
const env={...process.env,MATERIAL_GIT_TEST:'1',MATERIAL_GIT_USER_DATA:profile,GH_CONFIG_DIR:join(directory,'gh')};
for(const key of ['GH_TOKEN','GITHUB_TOKEN','GH_ENTERPRISE_TOKEN','GITHUB_ENTERPRISE_TOKEN'])delete env[key];
const app=await electron.launch({executablePath:require('electron'),args:['--no-sandbox','--ozone-platform=headless','.'],cwd:root,env});
let page;const errors=[];
async function choose(select,value){await select.evaluate(element=>{element.openedEvent=new Promise(resolve=>element.addEventListener('opened',resolve,{once:true}));element.closedEvent=new Promise(resolve=>element.addEventListener('closed',resolve,{once:true}));});await select.click();await select.evaluate(element=>element.openedEvent);const index=await select.locator('md-select-option').evaluateAll((options,value)=>options.findIndex(option=>option.value===value),value);assert.ok(index>=0,'The actual Material option must have the requested value');await select.locator('md-select-option').nth(index).click();await select.evaluate(element=>element.closedEvent);assert.equal(await select.evaluate(element=>element.value),value);}
async function idle(models){await models.evaluate(async element=>{for(let i=0;i<100;i++){if(!element.busy)return;await new Promise(resolve=>setTimeout(resolve,100));}throw new Error('Local model workspace did not finish its bounded request');});}
try{
 page=await app.firstWindow();page.on('pageerror',error=>errors.push(error.message));
 await page.setViewportSize({width:1100,height:900});await page.getByTestId('functional-desktop').waitFor({timeout:60000});await page.getByTestId('nav-tools').click();
 const tools=page.locator('mg-tools');await tools.getByRole('tab',{name:'Local models',exact:true}).click();const models=tools.locator('mg-ollama');
 await models.getByRole('button',{name:'Refresh service',exact:true}).waitFor();await idle(models);
 const section=models.locator('md-outlined-select[label="Workspace section"]');await choose(section,'store');
 for(const label of ['Local state','Published variant','Reported quantization','Maximum reported size','Hardware fit'])await models.locator(`md-outlined-select[label="${label}"]`).waitFor();
 await choose(models.locator('md-outlined-select[label="Local state"]'),'installed');await idle(models);
 await choose(section,'chat');await choose(models.locator('md-outlined-select[label="Saved conversation"]'),session);
 await models.getByRole('button',{name:'Choose PNG/JPEG images',exact:true}).waitFor();
 await app.evaluate(({dialog})=>{globalThis.ollamaPickerOptions=null;dialog.showOpenDialog=async(_window,options)=>{globalThis.ollamaPickerOptions=options;return {canceled:true,filePaths:[]};};});
 await models.getByRole('button',{name:'Choose PNG/JPEG images',exact:true}).click();
 await idle(models);
 const options=await app.evaluate(()=>globalThis.ollamaPickerOptions);assert.equal(options.title,'Choose images for local chat');assert.deepEqual(options.filters,[{name:'PNG and JPEG images',extensions:['png','jpg','jpeg']}]);assert.deepEqual(options.properties,['openFile','multiSelections']);
 await page.setViewportSize({width:800,height:700});assert.equal(await models.getByRole('button',{name:'Choose PNG/JPEG images',exact:true}).isVisible(),true);
 assert.deepEqual(errors,[]);console.log('Actual Electron catalog filter controls, isolated saved-history fixture and purpose-specific native image picker passed. No live model inference claimed.');
}finally{await app.close();await rm(directory,{recursive:true,force:true});}
