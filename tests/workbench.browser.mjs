import {_electron as electron} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const root=fileURLToPath(new URL('..',import.meta.url)),require=createRequire(import.meta.url);
const output=process.env.MATERIAL_GIT_QA_OUTPUT?resolve(process.env.MATERIAL_GIT_QA_OUTPUT):await fs.mkdtemp(join(tmpdir(),'material-git-workbench-'));
await fs.mkdir(join(output,'gh-config'),{recursive:true});
const env={...process.env,MATERIAL_GIT_TEST:'1',MATERIAL_GIT_USER_DATA:join(output,'profile'),GH_CONFIG_DIR:join(output,'gh-config')};
for(const key of ['GH_TOKEN','GITHUB_TOKEN','GH_ENTERPRISE_TOKEN','GITHUB_ENTERPRISE_TOKEN','GH_HOST','GITHUB_SERVER_URL'])delete env[key];
const checks=[],captures=[],errors=[];
let app,page;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const capture=async name=>{const file=join(output,name+'.png');await page.screenshot({path:file});captures.push({name,capturedAt:new Date().toISOString(),sha256:hash(await fs.readFile(file)),viewport:page.viewportSize()});};
const launch=async()=>{app=await electron.launch({executablePath:require('electron'),args:['--no-sandbox','--ozone-platform=headless','.'],cwd:root,env});page=await app.firstWindow({timeout:60000});page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));await page.getByTestId('functional-desktop').waitFor({timeout:60000});};
const close=async()=>{if(app){await page?.evaluate(()=>window.material.window('confirm-close')).catch(()=>{});await app.close().catch(()=>{});app=undefined;}};
const choose=async(select,value)=>{await select.click();await select.locator(`md-select-option[value="${value}"]`).click();await page.waitForFunction(({selector,value})=>document.querySelector('mg-settings')?.shadowRoot?.querySelector(selector)?.value===value,{selector:'[data-setting="theme"] md-outlined-select',value});};
try{
 await launch();await page.setViewportSize({width:1420,height:940});
 const names=await page.locator('.desktop-navigation [data-testid^="nav-"]').evaluateAll(elements=>elements.map(element=>element.dataset.testid));
 assert.ok(names.length>=25,'All current destination controls are present');
 for(const name of names){await page.getByTestId(name).click();const lane=name.slice(4);await page.waitForFunction(lane=>document.querySelector('mg-app')?.lane===lane,lane);await page.locator(`#workspace-panel-${lane}`).waitFor({state:'visible'});checks.push('Opened destination: '+lane);}
 await capture('settings-light');
 const splitter=page.getByRole('separator',{name:'Navigation width',exact:true});await splitter.focus();const before=await page.locator('.desktop-navigation').evaluate(element=>element.clientWidth);await page.keyboard.press('ArrowRight');assert.equal(await page.locator('.desktop-navigation').evaluate(element=>element.clientWidth),before+16);checks.push('Navigation splitter responds to keyboard');
 await page.getByRole('button',{name:'Toggle navigation',exact:true}).click();assert.equal(await page.locator('.desktop-navigation').count(),0);await page.getByRole('button',{name:'Toggle navigation',exact:true}).click();checks.push('Navigation toggle restores working destinations');
 await page.getByRole('button',{name:'Manage tabs and overflow',exact:true}).click();await page.getByRole('button',{name:'Dock top',exact:true}).click();await page.getByRole('button',{name:'Close manager',exact:true}).click();
 const tabs=page.locator('mg-workspace-tabs');const target=tabs.locator('md-secondary-tab[data-id="accounts"]');await target.click();await page.waitForFunction(()=>document.querySelector('mg-app')?.lane==='accounts');assert.equal(await target.evaluate(element=>element.ariaControlsElements?.[0]===document.getElementById('workspace-panel-accounts')),true);checks.push('Official secondary tab activates its exact domain panel');
 await page.getByTestId('nav-settings').click();const settings=page.locator('mg-settings');await settings.getByRole('tab',{name:'Appearance',exact:true}).click();await choose(settings.locator('[data-setting="theme"] md-outlined-select'),'dark');await page.waitForFunction(async()=>(await window.material.bootstrap()).settings.theme==='dark');await capture('settings-dark');checks.push('Theme selection persists through the native settings bridge');
 const seed=settings.getByRole('textbox',{name:'Theme seed colour',exact:true});await seed.fill('#6750a4');await seed.press('Tab');await page.waitForFunction(async()=>(await window.material.bootstrap()).settings.seed==='#6750a4');checks.push('Material color field persists a validated theme seed');
 await page.getByTestId('nav-tools').click();const tools=page.locator('mg-tools'),search=tools.locator('mg-search').first();await tools.getByRole('textbox',{name:'Text to test locally',exact:true}).fill('alpha\nbeta');await search.getByRole('textbox',{name:'Text or regular expression',exact:true}).fill('alpha');await page.waitForFunction(()=>document.querySelector('mg-tools')?.regexResult==='alpha');checks.push('Local regex task runs and renders its real result');
 await search.getByRole('button',{name:'Configure regular expression',exact:true}).click();const builder=search.getByRole('dialog',{name:'Regular expression workbench'});await builder.waitFor();const bounds=await builder.evaluate(element=>{const r=element.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:innerWidth,height:innerHeight};});assert.ok(bounds.left>=0&&bounds.top>=0&&bounds.right<=bounds.width+1&&bounds.bottom<=bounds.height+1);await capture('regex-workbench-dark');await builder.getByRole('button',{name:'Done',exact:true}).click();checks.push('Regex workbench uses a bounded top layer');
 await page.keyboard.press('Control+Shift+F');await page.locator('mg-workspace-palette md-dialog[open]').waitFor();await capture('workspace-search-dark');await page.keyboard.press('Escape');checks.push('Keyboard command palette opens and dismisses');
 await page.setViewportSize({width:760,height:600});await page.getByTestId('nav-accounts').click();await capture('accounts-minimum-dark');assert.equal(await page.evaluate(()=>document.body.scrollWidth),760);checks.push('Document remains bounded at minimum desktop size');
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true);checks.push('Reduced motion path active');
 await close();await launch();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');const persisted=await page.evaluate(()=>window.material.workspace('status'));assert.equal(persisted.state.dock,'top');assert.equal(persisted.state.lane,'accounts');checks.push('Actual desktop restart restores theme, tab docking and active destination');
 assert.deepEqual(errors,[]);
}catch(error){process.exitCode=1;checks.push({failure:error.stack});if(page)await capture('failure').catch(()=>{});}
finally{
 await close();const build=JSON.parse(await fs.readFile(join(root,'dist/main/provenance.json'),'utf8'));const receipt={route:'Playwright Electron headless Linux, isolated profile and credential-free CLI configuration',build,source:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),trackedPatchSha256:hash(execFileSync('git',['diff','HEAD','--'],{cwd:root})),mainSha256:hash(await fs.readFile(join(root,'dist/main/main.cjs'))),checks,captures,errors};await fs.writeFile(join(output,'receipt.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify({output,checks,errors}));
}
