import {_electron as electron} from 'playwright';import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {tmpdir} from 'node:os';import {join} from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
const root=fileURLToPath(new URL('..',import.meta.url)),require=createRequire(import.meta.url),directory=await fs.mkdtemp(join(tmpdir(),'mg-host-context-gui-')),profile=join(directory,'profile');
await fs.mkdir(profile,{recursive:true});
// An isolated approved-host metadata fixture supplies a second real native choice.
// No token, saved account, registration request or browser login is supplied.
await fs.writeFile(join(profile,'approved-hosts.json'),JSON.stringify({schemaVersion:1,hosts:['github.com','forge.example']}));
const env={...process.env,MATERIAL_GIT_TEST:'1',MATERIAL_GIT_USER_DATA:profile,GH_CONFIG_DIR:join(directory,'gh-config'),GH_HOST:'unapproved.example'};
for(const key of ['GH_TOKEN','GITHUB_TOKEN','GH_ENTERPRISE_TOKEN','GITHUB_ENTERPRISE_TOKEN'])delete env[key];await fs.mkdir(env.GH_CONFIG_DIR,{recursive:true});
const errors=[],checks=[];
async function launch(){return electron.launch({executablePath:require('electron'),args:['--no-sandbox','--ozone-platform=headless','.'],cwd:root,env});}
let app,page;
try{
 app=await launch();page=await app.firstWindow();page.on('pageerror',error=>errors.push(error.message));await page.setViewportSize({width:1280,height:900});
 await page.waitForFunction(()=>document.querySelector('mg-app')?.data?.hostname==='github.com');
 assert.equal(await page.locator('mg-app').evaluate(e=>e.data.repository),null);
 await page.locator('[data-testid="nav-accounts"]').click();const accounts=page.locator('mg-accounts');await page.waitForFunction(()=>document.querySelector('mg-accounts')?.busy===false);
 assert.equal(await accounts.getByRole('button',{name:'Use this host for workspaces…',exact:true}).isDisabled(),true);
 await accounts.getByRole('combobox',{name:'Approved GitHub host',exact:true}).click();await accounts.locator('md-select-option[value="forge.example"]').click();
 await accounts.getByRole('button',{name:'Use this host for workspaces…',exact:true}).click();const dialog=accounts.locator('md-dialog[open]');
 await dialog.waitFor();const confirm=dialog.getByRole('button',{name:'Use reviewed workspace host',exact:true});assert.equal(await confirm.isDisabled(),true);
 await dialog.getByRole('checkbox',{name:'I checked the account and host.',exact:true}).check();assert.equal(await confirm.isDisabled(),true);
 await dialog.getByRole('checkbox',{name:'I understand the effect of this change.',exact:true}).check();await confirm.click();
 await page.waitForFunction(()=>document.querySelector('mg-app')?.data?.hostname==='forge.example'&&document.querySelector('mg-accounts')?.busy===false);
 assert.equal(await page.locator('mg-app').evaluate(e=>e.data.repository),null);assert.equal(await page.locator('mg-app').evaluate(e=>e.data.authenticated),false);
 const record=JSON.parse(await fs.readFile(join(profile,'approved-hosts.json'),'utf8'));assert.equal(record.selectedHostname,'forge.example');assert.equal(record.schemaVersion,2);
 checks.push('Native-approved host fixture; exact two-acknowledgement GUI review; persisted host context; explicit repository reset; no credentials changed');
 await page.locator('[data-testid="nav-repositories"]').click();assert.equal(await page.locator('mg-github-workspace').filter({visible:true}).evaluate(e=>e.hostname),'forge.example');
 checks.push('Domain workspace receives native selected hostname rather than ambient GH_HOST');
 await page.locator('[data-testid="nav-accounts"]').click();await accounts.getByRole('button',{name:'Refresh accounts',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:join(directory,'selected-native-host.png')});
 await page.evaluate(()=>window.material.window('confirm-close'));await app.close();app=await launch();page=await app.firstWindow();page.on('pageerror',error=>errors.push(error.message));
 await page.waitForFunction(()=>document.querySelector('mg-app')?.data?.hostname==='forge.example');assert.equal(await page.locator('mg-app').evaluate(e=>e.data.repository),null);checks.push('Actual Electron relaunch restores selected host through native bootstrap');
 assert.deepEqual(errors,[]);await fs.writeFile(join(directory,'receipt.json'),JSON.stringify({checks,errors,scope:'Real native host selection and persistence using isolated approved-host metadata. No real saved account, authorization, credential copying, host registration, account switching/removal or Git-helper configuration.'},null,2));console.log(JSON.stringify({directory,checks,errors}));
}catch(error){await page?.screenshot({path:join(directory,'failure.png')}).catch(()=>{});console.error(JSON.stringify({directory,checks,errors,failure:error.stack}));process.exitCode=1;}finally{await page?.evaluate(()=>window.material.window('confirm-close')).catch(()=>{});await app?.close().catch(()=>{});}
