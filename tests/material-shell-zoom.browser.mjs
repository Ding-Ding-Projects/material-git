import {_electron as electron} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';

const root=fileURLToPath(new URL('..',import.meta.url)),require=createRequire(import.meta.url);
const output=process.env.MATERIAL_GIT_QA_OUTPUT?resolve(process.env.MATERIAL_GIT_QA_OUTPUT):await fs.mkdtemp(join(tmpdir(),'material-shell-zoom-'));
await fs.mkdir(join(output,'gh-config'),{recursive:true});
const env={...process.env,MATERIAL_GIT_TEST:'1',MATERIAL_GIT_USER_DATA:join(output,'profile'),GH_CONFIG_DIR:join(output,'gh-config')};
for(const key of ['GH_TOKEN','GITHUB_TOKEN','GH_ENTERPRISE_TOKEN','GITHUB_ENTERPRISE_TOKEN','GH_HOST','GITHUB_SERVER_URL'])delete env[key];
const sha=value=>createHash('sha256').update(value).digest('hex');
const artifacts={};
for(const file of ['dist/main/main.cjs',...(await fs.readdir(join(root,'dist/renderer/assets'))).filter(name=>/\.(css|js)$/.test(name)).map(name=>'dist/renderer/assets/'+name)])artifacts[file]=sha(await fs.readFile(join(root,file)));
const receipt={version:1,source:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),patchSha256:sha(execFileSync('git',['diff','HEAD','--','src'],{cwd:root})),build:JSON.parse(await fs.readFile(join(root,'dist/main/provenance.json'),'utf8')),artifacts,route:'Built Electron Linux, native capturePage, isolated tokenless profile',tuple:{contentWidth:760,contentHeight:600,zoomFactor:2,language:'both',theme:'dark',fontScale:1},checks:[],captures:[],errors:[]};
let app,page;
async function capture(name){
 const measurements=await page.evaluate(()=>{
  const selectors=['mg-app','.titlebar','.context-toolbar','.desktop-body','.workspace-tab-content:not([hidden])','.statusbar'];
  return {viewport:{width:innerWidth,height:innerHeight,devicePixelRatio},targets:selectors.map(selector=>{const e=document.querySelector(selector),r=e.getBoundingClientRect(),s=getComputedStyle(e);return {selector,rect:{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right},computed:{display:s.display,overflowY:s.overflowY,gridTemplateRows:s.gridTemplateRows,minHeight:s.minHeight},scrollTop:e.scrollTop,scrollHeight:e.scrollHeight,clientHeight:e.clientHeight};})};
 });
 const native=await app.evaluate(async({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0],image=await w.webContents.capturePage();return {png:image.toPNG().toString('base64'),size:image.getSize(),contentBounds:w.getContentBounds(),zoomFactor:w.webContents.getZoomFactor()};});
 const bytes=Buffer.from(native.png,'base64');await fs.writeFile(join(output,name+'.png'),bytes);
 receipt.captures.push({name,measurements,size:native.size,contentBounds:native.contentBounds,zoomFactor:native.zoomFactor,sha256:sha(bytes)});
 assert.deepEqual(native.size,{width:760,height:600});
 assert.equal(measurements.viewport.width,380);assert.equal(measurements.viewport.height,300);
 const toolbar=measurements.targets.find(t=>t.selector==='.context-toolbar');assert.ok(toolbar.rect.height<=64,'Compact toolbar must leave room for work');
 const panel=measurements.targets.find(t=>t.selector==='.workspace-tab-content:not([hidden])');assert.ok(panel.rect.height>=120,'Workspace remains usable at actual desktop zoom');assert.equal(panel.computed.overflowY,'auto');
}
async function navigate(query,name){
 await page.keyboard.press('Control+Shift+F');const palette=page.locator('mg-workspace-palette');await palette.locator('md-dialog[open]').waitFor();
 await palette.locator('mg-search').getByRole('textbox').first().fill(query);
 await palette.getByRole('button',{name}).click();await palette.locator('md-dialog[open]').waitFor({state:'detached'});
}
try{
 app=await electron.launch({executablePath:require('electron'),args:['--no-sandbox','--ozone-platform=headless','.'],cwd:root,env,timeout:45000});page=await app.firstWindow({timeout:45000});page.setDefaultTimeout(15000);page.on('pageerror',e=>receipt.errors.push(e.message));await page.getByTestId('functional-desktop').waitFor({timeout:60000});
 await page.getByTestId('nav-settings').click();
 await page.evaluate(async()=>{const settings=await window.material.settings({language:'both',theme:'dark',fontScale:1,motion:false});document.querySelector('mg-settings').dispatchEvent(new CustomEvent('settings-change',{detail:settings,bubbles:true,composed:true}));await document.querySelector('mg-app').updateComplete;});
 await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.setContentSize(760,600);w.webContents.setZoomFactor(2);});
 await page.waitForFunction(()=>innerWidth===380&&innerHeight===300);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await navigate('git',/^Source Control · 版本控制 · Workspace destination/);await page.locator('#workspace-panel-git').waitFor({state:'visible'});await capture('git-before-scroll');
 const clone=page.locator('mg-git-workspace').getByRole('button',{name:'Clone repository · 複製儲存庫',exact:true});
 await clone.scrollIntoViewIfNeeded();const box=await clone.boundingBox();assert.ok(box.y>=0&&box.y+box.height<=300,'Clone action can be scrolled into the real CSS viewport');
 await clone.focus();await page.keyboard.press('Enter');
 const close=page.locator('mg-git-workspace').getByRole('button',{name:'Discard draft · 捨棄草稿',exact:true});await close.waitFor();await close.scrollIntoViewIfNeeded();await capture('git-clone-editor');await close.click();
 receipt.checks.push('Source Control clone editor opens by keyboard after scrolling; no clone is submitted');
 await navigate('downloads',/^Downloads · 下載 · Workspace destination/);await page.locator('#workspace-panel-downloads').waitFor({state:'visible'});
 const refresh=page.locator('mg-downloads').getByRole('button',{name:/^Refresh/});await refresh.scrollIntoViewIfNeeded();await refresh.click();await capture('downloads-refreshed');receipt.checks.push('Downloads Refresh is scroll reachable and invokes its real read-only list path');
 const account=page.locator('.account-action');await account.click();await page.locator('#workspace-panel-accounts').waitFor({state:'visible'});await capture('compact-account-action');receipt.checks.push('Compact account action retains ordinary click navigation and its accessible text');
 assert.deepEqual(receipt.errors,[]);
}catch(error){receipt.failure=String(error.stack||error);process.exitCode=1;}
finally{await fs.writeFile(join(output,'receipt.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify({output,checks:receipt.checks,captures:receipt.captures.length,failure:receipt.failure,errors:receipt.errors}));if(page)await page.evaluate(()=>window.material.window('confirm-close')).catch(()=>{});if(app)await app.close().catch(()=>{});}
