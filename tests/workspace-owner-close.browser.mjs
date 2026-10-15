import {_electron as electron} from 'playwright';
import fs from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('..',import.meta.url)),require=createRequire(import.meta.url),output=await fs.mkdtemp(join(tmpdir(),'workspace-owner-close-'));
const env={...process.env,MATERIAL_GIT_TEST:'1',MATERIAL_GIT_USER_DATA:join(output,'profile'),GH_CONFIG_DIR:join(output,'gh')};await fs.mkdir(env.GH_CONFIG_DIR);for(const key of ['GH_TOKEN','GITHUB_TOKEN','GH_ENTERPRISE_TOKEN','GITHUB_ENTERPRISE_TOKEN'])delete env[key];
const app=await electron.launch({executablePath:require('electron'),args:['--no-sandbox','--ozone-platform=headless','.'],cwd:root,env}),checks=[],errors=[];
let page;
try{
 page=await app.firstWindow();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));await page.getByTestId('functional-desktop').waitFor({timeout:60000});
 const open=async id=>{await page.keyboard.press('Control+t');await page.locator(`mg-tab-catalog [data-catalog-id="${id}"]`).click();};
 const reviewClose=async()=>{await page.keyboard.press('Control+w');await page.getByRole('button',{name:'Discard and close',exact:true}).waitFor();await page.getByRole('button',{name:'Keep tabs',exact:true}).click();await page.keyboard.press('Control+w');await page.getByRole('button',{name:'Discard and close',exact:true}).click();};
 await open('cli-config');const config=page.locator('mg-cli-config');await page.waitForFunction(()=>document.querySelector('mg-cli-config')?.snapshot&&!document.querySelector('mg-cli-config').busy);
 const label=await config.evaluate(e=>e.snapshot.definitions.find(d=>d.key==='git_protocol').label),select=config.locator(`md-outlined-select[label="${label}"]`);await select.click();await select.locator('md-select-option[value="ssh"]').click();await page.waitForFunction(()=>document.querySelector('mg-app').tabState('cli-config').dirty===true);await reviewClose();await config.waitFor({state:'detached'});await open('cli-config');await page.waitForFunction(()=>document.querySelector('mg-cli-config')?.snapshot&&!document.querySelector('mg-cli-config').busy);assert.deepEqual(await config.evaluate(e=>e.pending),{});checks.push('CLI configuration drafts trigger owner close review, cancel retains and approved close purges session cache');
 await page.keyboard.press('Control+w');await config.waitFor({state:'detached'});
 await open('api');const api=page.locator('mg-api-explorer');const chooseOperation=async()=>{await api.locator('mg-search[search-id="api-operations"]').getByRole('textbox').first().fill('Get a repository');await api.getByRole('button',{name:'Get a repository',exact:true}).click();await api.getByRole('textbox',{name:/^owner/}).first().waitFor();};await chooseOperation();await api.getByRole('textbox',{name:/^owner/}).first().fill('draft-owner');await page.waitForFunction(()=>document.querySelector('mg-app').tabState('api').dirty===true);await reviewClose();await api.waitFor({state:'detached'});await open('api');await chooseOperation();assert.equal(await api.getByRole('textbox',{name:/^owner/}).first().inputValue(),'');checks.push('API request drafts trigger owner close review and are absent after approved close/reopen');
 await page.keyboard.press('Control+w');await api.waitFor({state:'detached'});
 await open('aliases');const aliases=page.locator('mg-github-local-workspace');await aliases.getByRole('button',{name:'New alias',exact:true}).click();await page.waitForFunction(()=>document.querySelector('mg-app').tabState('aliases').dirty===true);await reviewClose();await aliases.waitFor({state:'detached'});await open('aliases');assert.equal(await aliases.evaluate(e=>!!e.editor),false);checks.push('Local alias editor closes only after owner draft review');assert.deepEqual(errors,[]);
}catch(error){process.exitCode=1;checks.push({failure:String(error.stack||error)});if(page)await page.screenshot({path:join(output,'failure.png')});}
finally{if(page)await page.evaluate(()=>window.material.window('confirm-close')).catch(()=>{});await app.close();await fs.writeFile(join(output,'receipt.json'),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({output,checks,errors}));}
