import {_electron as electron} from 'playwright';
import {mkdtemp,mkdir,writeFile,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';import {createRequire} from 'node:module';import assert from 'node:assert/strict';
// Production main/preload/service, owned fixtures and scoped native dialog replacement.
const directory=await mkdtemp(join(tmpdir(),'material-folder-converter-ui-')),profile=join(directory,'profile'),sources=join(directory,'sources'),outputs=join(directory,'outputs');
await Promise.all([mkdir(sources),mkdir(outputs),mkdir(join(directory,'gh-config'))]);
for(let i=0;i<85;i++)await writeFile(join(sources,`source-${String(i).padStart(3,'0')}.json`),JSON.stringify({ownedFixture:i}));
const env={...process.env,MATERIAL_GIT_TEST:'1',MATERIAL_GIT_USER_DATA:profile,GH_CONFIG_DIR:join(directory,'gh-config')};for(const key of ['GH_TOKEN','GITHUB_TOKEN','GH_ENTERPRISE_TOKEN','GITHUB_ENTERPRISE_TOKEN'])delete env[key];
const app=await electron.launch({executablePath:createRequire(import.meta.url)('electron'),args:['--no-sandbox','--ozone-platform=headless','.'],cwd:process.cwd(),env}),page=await app.firstWindow(),errors=[];page.on('pageerror',error=>errors.push(error.message));
try{
 await app.evaluate(({dialog},paths)=>{dialog.showOpenDialog=async(_window,options)=>{if(options.title==='Choose a folder to inspect for conversion')return {canceled:false,filePaths:[paths.sources]};if(options.title==='Choose a folder for new converted files')return {canceled:false,filePaths:[paths.outputs]};throw Error('Unexpected native picker in owned folder fixture');};},{sources,outputs});
 await page.waitForFunction(()=>customElements.get('mg-local-files'));
 await page.evaluate(()=>{const view=document.createElement('mg-local-files');view.settings={...view.settings,language:'en'};document.body.replaceChildren(view);});
 await page.waitForFunction(()=>customElements.get('mg-converter-sources'));
 const browser=page.locator('mg-converter-sources');await browser.getByRole('button',{name:'Choose source folder',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('mg-local-files')?.shadowRoot.querySelector('mg-converter-sources')?.discovery?.state==='complete');
 await browser.getByRole('checkbox').first().waitFor();assert.equal(await browser.getByRole('checkbox').count(),40);await browser.getByRole('button',{name:'Next source page',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('mg-local-files')?.shadowRoot.querySelector('mg-converter-sources')?.sourcePage?.page===2);assert.equal(await browser.getByRole('checkbox').count(),40);
 await browser.getByRole('button',{name:'Next source page',exact:true}).click();await page.waitForFunction(()=>document.querySelector('mg-local-files')?.shadowRoot.querySelector('mg-converter-sources')?.sourcePage?.page===3);await browser.evaluate(view=>view.updateComplete);assert.equal(await browser.getByRole('checkbox').count(),5);
 const search=browser.getByRole('textbox',{name:'Search folder sources',exact:true});await search.fill('source-00');
 await page.waitForFunction(()=>document.querySelector('mg-local-files')?.shadowRoot.querySelector('mg-converter-sources')?.sourcePage?.items.length===10);
 await browser.getByRole('button',{name:'Inspect and choose source',exact:true}).first().click();
 await page.waitForFunction(()=>document.querySelector('mg-local-files')?.files.some(file=>file.type==='json'));
 await page.locator('mg-local-files').evaluate(view=>{view.category='Structured Data/Spreadsheets';});
 await page.locator('mg-local-files mg-surface').filter({has:page.getByText('JSON, formatted',{exact:true})}).getByRole('button',{name:'Choose adapter',exact:true}).click();
 await browser.getByRole('button',{name:'Select ordinal range',exact:true}).click();await browser.getByRole('spinbutton',{name:'First source ordinal',exact:true}).fill('0');await browser.getByText('Enter whole source ordinals from 1 to the indexed count, with the end at or after the start.',{exact:true}).waitFor();
 assert.equal(await browser.getByRole('button',{name:'Choose output folder and review source batch',exact:true}).isDisabled(),true);
 await browser.getByRole('button',{name:'Select all matching sources',exact:true}).click();await browser.getByRole('checkbox').first().uncheck();
 await browser.getByRole('button',{name:'Choose output folder and review source batch',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('mg-local-files')?.shadowRoot.querySelector('mg-converter-sources')?.review?.count===9);
 await browser.getByRole('button',{name:'Confirm streamed queue admission',exact:true}).click();
 await browser.getByRole('button',{name:'Pause source admission',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('mg-local-files')?.shadowRoot.querySelector('mg-converter-sources')?.admission?.status==='paused');
 const admissionId=await browser.evaluate(view=>view.admission.id);
 await page.evaluate(()=>{const view=document.createElement('mg-local-files');view.settings={...view.settings,language:'en'};document.body.replaceChildren(view);});
 await page.waitForFunction(()=>document.querySelector('mg-local-files')?.shadowRoot.querySelector('mg-converter-sources')?.admission?.status==='paused');assert.equal(await browser.evaluate(view=>view.admission.id),admissionId);
 await browser.getByRole('button',{name:'Resume source admission',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('mg-local-files')?.shadowRoot.querySelector('mg-converter-sources')?.admission?.status==='completed');
 const admission=await browser.evaluate(view=>view.admission);assert.equal(admission.admitted,9);assert.equal(admission.failed,0);const outcomeName=await browser.evaluate(view=>view.outcomePage.items[0].source);await browser.getByRole('textbox',{name:'Search source admission outcomes',exact:true}).fill(outcomeName);await page.waitForFunction(()=>document.querySelector('mg-local-files')?.shadowRoot.querySelector('mg-converter-sources')?.outcomePage?.items.length===1);
 await page.getByRole('button',{name:'Resume queue',exact:true}).click();
 let converted=[];for(let attempt=0;attempt<200;attempt++){converted=await page.evaluate(async()=>{const history=await window.material.localTools('converter-status',{status:'converted'});return history.items;});if(converted.length===9)break;await new Promise(resolve=>setTimeout(resolve,100));}assert.equal(converted.length,9);
 const names=await readdir(outputs);assert.equal(names.length,9);for(const name of names){const parsed=JSON.parse(await readFile(join(outputs,name),'utf8'));assert.ok(parsed.ownedFixture>=0&&parsed.ownedFixture<=9);}
 for(let i=0;i<85;i++)assert.deepEqual(JSON.parse(await readFile(join(sources,`source-${String(i).padStart(3,'0')}.json`),'utf8')),{ownedFixture:i});
 const calendar=page.locator('mg-record-date-range');await calendar.getByRole('button',{name:'Choose date range',exact:true}).click();await calendar.getByRole('dialog',{name:'Date range calendar',exact:true}).waitFor();await calendar.getByRole('button',{name:'Close calendar',exact:true}).click();
 assert.deepEqual(errors,[]);console.log(JSON.stringify({checks:['production native folder bridge','85 owned files, 40/40/5 pages','filtered finite page','isolated built source inspection','range validation','all query minus exclusion, frozen count 9','paused admission restores on view remount','resumable fixed-intent native admission','finite searchable admission outcomes','nine actual reopened JSON outputs','85 unchanged sources','shared advanced history calendar'],errors}));
}finally{await app.close().catch(()=>{});await rm(directory,{recursive:true,force:true});}
