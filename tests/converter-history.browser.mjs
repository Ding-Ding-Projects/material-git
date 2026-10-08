import {_electron as electron} from 'playwright';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';import {createRequire} from 'node:module';import assert from 'node:assert/strict';
import {LocalToolsService} from '../src/main/local-tools.ts';
const directory=await mkdtemp(join(tmpdir(),'material-converter-ui-')),profile=join(directory,'profile'),source=join(directory,'synthetic.json'),output=join(directory,'converted.json');
await mkdir(join(directory,'gh-config'),{recursive:true});await writeFile(source,'{"syntheticFixture":true}');
const service=new LocalToolsService({storageDirectory:join(profile,'local-tools'),pickSources:async()=>[source],pickDestination:async()=>output});
const grants=await service.request('converter-pick');const result=await service.request('converter-start',{grant:grants[0].id,adapter:'json-pretty'});
for(let i=0;i<100;i++){if((await service.request('converter-status')).items.some(r=>r.id===result.id&&r.status==='converted'))break;await new Promise(r=>setTimeout(r,20));}service.dispose();assert.deepEqual(JSON.parse(await readFile(output,'utf8')),{syntheticFixture:true});
const env={...process.env,MATERIAL_GIT_TEST:'1',MATERIAL_GIT_USER_DATA:profile,GH_CONFIG_DIR:join(directory,'gh-config')};for(const key of ['GH_TOKEN','GITHUB_TOKEN','GH_ENTERPRISE_TOKEN','GITHUB_ENTERPRISE_TOKEN'])delete env[key];
const app=await electron.launch({executablePath:createRequire(import.meta.url)('electron'),args:['--no-sandbox','--ozone-platform=headless','.'],cwd:process.cwd(),env});const page=await app.firstWindow(),errors=[];page.on('pageerror',error=>errors.push(error.message));
try{
 await page.waitForFunction(()=>customElements.get('mg-local-files')&&customElements.get('mg-export-menu'));
 await page.evaluate(()=>{const view=document.createElement('mg-local-files');view.settings={...view.settings,language:'en'};document.body.replaceChildren(view);});
 await page.getByText('synthetic.json → JSON, formatted: converted',{exact:true}).waitFor({timeout:30000});
 const history=page.getByRole('textbox',{name:'Search all conversion history',exact:true});await history.fill('not-present');await page.getByText('synthetic.json → JSON, formatted: converted',{exact:true}).waitFor({state:'detached'});await history.fill('synthetic');await page.getByText('synthetic.json → JSON, formatted: converted',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Select this page',exact:true}).click();assert.equal(await page.getByRole('checkbox',{name:'Select history item synthetic.json',exact:true}).isChecked(),true);
 assert.equal(await page.getByRole('button',{name:'Export verified copy',exact:true}).isEnabled(),true);
 assert.equal(await page.getByRole('button',{name:'Open in editor',exact:true}).isDisabled(),true);
 assert.equal(await page.locator('mg-export-menu md-filter-chip').count(),10);
 const docs=page.getByRole('textbox',{name:'Documents/PDF · Search adapters',exact:true});await docs.fill('split');
 await page.locator('mg-local-files').evaluate(view=>{view.category='Images';});await page.getByRole('textbox',{name:'Images · Search adapters',exact:true}).fill('JPEG');
 await page.locator('mg-local-files').evaluate(view=>{view.category='Documents/PDF';});assert.equal(await docs.inputValue(),'split');
 await page.getByRole('button',{name:'Review forgetting selected history',exact:true}).click();await page.getByRole('button',{name:'Confirm forgetting history',exact:true}).click();await page.getByText('synthetic.json → JSON, formatted: converted',{exact:true}).waitFor({state:'detached'});
 assert.deepEqual(JSON.parse(await readFile(output,'utf8')),{syntheticFixture:true});assert.deepEqual(errors,[]);
 console.log(JSON.stringify({directory,checks:['real converted output','native history search','page selection','ten export formats','unavailable editor gated','independent category search state','reviewed metadata removal preserves output'],errors}));
}finally{await app.close().catch(()=>{});await rm(directory,{recursive:true,force:true});}
