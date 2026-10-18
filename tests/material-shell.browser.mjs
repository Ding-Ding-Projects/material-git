import {_electron as electron} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const root=fileURLToPath(new URL('..',import.meta.url));
const require=createRequire(import.meta.url);
const output=process.env.MATERIAL_GIT_QA_OUTPUT?resolve(process.env.MATERIAL_GIT_QA_OUTPUT):await fs.mkdtemp(join(tmpdir(),'material-shell-'));
await fs.mkdir(join(output,'gh-config'),{recursive:true});
const env={...process.env,MATERIAL_GIT_TEST:'1',MATERIAL_GIT_USER_DATA:join(output,'profile'),GH_CONFIG_DIR:join(output,'gh-config')};
for(const key of ['GH_TOKEN','GITHUB_TOKEN','GH_ENTERPRISE_TOKEN','GITHUB_ENTERPRISE_TOKEN','GH_HOST','GITHUB_SERVER_URL'])delete env[key];
const hashes={};
for(const path of ['dist/main/main.cjs',...(await fs.readdir(join(root,'dist/renderer/assets'))).filter(name=>/\.(?:js|css)$/.test(name)).map(name=>'dist/renderer/assets/'+name)])hashes[path]=createHash('sha256').update(await fs.readFile(join(root,path))).digest('hex');
const receipt={schemaVersion:1,route:'Real Electron headless Linux; isolated tokenless profile',source:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),patchSha256:createHash('sha256').update(execFileSync('git',['diff','HEAD'],{cwd:root})).digest('hex'),build:JSON.parse(await fs.readFile(join(root,'dist/main/provenance.json'),'utf8')),artifacts:hashes,tuples:[],checks:[],errors:[]};
let app,page;
const snapshot=async(id)=>{
 const measurements=await page.evaluate(()=>{
  const rect=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {tag:e.tagName,className:typeof e.className==='string'?e.className:'',rect:{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom},computed:{display:s.display,overflowX:s.overflowX,overflowY:s.overflowY,gridTemplateRows:s.gridTemplateRows,gridTemplateColumns:s.gridTemplateColumns,minWidth:s.minWidth,minHeight:s.minHeight,maxWidth:s.maxWidth,maxHeight:s.maxHeight,fontSize:s.fontSize,lineHeight:s.lineHeight},scroll:{width:e.scrollWidth,height:e.scrollHeight,clientWidth:e.clientWidth,clientHeight:e.clientHeight}};};
  const targets=['mg-app','.titlebar','.context-toolbar','.desktop-body','.desktop-navigation','.desktop-content','.workspace-stack','.open-workspaces','.workspace-tab-content:not([hidden])','.statusbar','.workspace-tab-content:not([hidden]) .github-workspace','.workspace-tab-content:not([hidden]) .record-list-scroll','.workspace-tab-content:not([hidden]) .domain-toolbar','.workspace-tab-content:not([hidden]) .domain-filters','.workspace-tab-content:not([hidden]) .domain-split'];
  const targetMeasurements=targets.map(selector=>{const e=document.querySelector(selector);return {selector,target:e?rect(e):null,ancestors:e?[e.parentElement,e.parentElement?.parentElement].filter(Boolean).map(rect):[]};});
  const actions=[...document.querySelectorAll('.titlebar md-icon-button,.context-toolbar md-icon-button,.context-toolbar md-filled-tonal-button')].map(e=>({host:rect(e),interactive:e.shadowRoot?.querySelector('button')?rect(e.shadowRoot.querySelector('button')):null}));
  return {viewport:{width:innerWidth,height:innerHeight,devicePixelRatio},fontScale:parseFloat(getComputedStyle(document.documentElement).fontSize)/16,theme:document.documentElement.dataset.theme,language:document.querySelector('mg-app')?.data?.settings?.language,targets:targetMeasurements,actions,documentWidth:document.body.scrollWidth};
 });
 await page.screenshot({path:join(output,id+'.png')});
 receipt.tuples.push({id,...measurements,screenshot:id+'.png'});
 assert.equal(measurements.documentWidth,measurements.viewport.width,id+' document width');
 for(const {host} of measurements.actions){assert.ok(host.rect.height>=40,id+' action height');assert.ok(host.rect.x>=-1&&host.rect.right<=measurements.viewport.width+1,id+' toolbar action is horizontally reachable');}
 const content=measurements.targets.find(t=>t.selector==='.desktop-content').target;
 assert.ok(content.rect.height>=80,id+' content remains usable');
 const records=measurements.targets.find(t=>t.selector.endsWith(' .record-list-scroll')).target;
 if(records)assert.ok(records.rect.height>=48,id+' record viewport remains usable beneath enlarged toolbars');
 const domainParts=[' .domain-toolbar',' .domain-filters',' .domain-split'].map(suffix=>measurements.targets.find(t=>t.selector.endsWith(suffix)).target);
 if(domainParts.every(Boolean))for(let index=1;index<domainParts.length;index++)assert.ok(domainParts[index-1].rect.bottom<=domainParts[index].rect.y+1,id+' domain rows do not overlap');
};
try {
 app=await electron.launch({executablePath:require('electron'),args:['--no-sandbox','--ozone-platform=headless','.'],cwd:root,env,timeout:45000});
 page=await app.firstWindow({timeout:45000});page.setDefaultTimeout(15000);
 page.on('pageerror',error=>receipt.errors.push(error.message));
 await page.getByTestId('functional-desktop').waitFor({timeout:60000});
 await page.getByTestId('nav-settings').click();
 // Persist settings through the real bridge and notify the owning renderer just as
 // the settings component does. No fake domain data or operation result is injected.
 const configure=async patch=>page.evaluate(async value=>{const settings=await window.material.settings(value);document.querySelector('mg-settings').dispatchEvent(new CustomEvent('settings-change',{detail:settings,bubbles:true,composed:true}));await document.querySelector('mg-app').updateComplete;},patch);
 for(const [width,height] of (process.argv.includes('--stress')?[[760,600]]:[[1420,940],[760,600]])){
  await page.setViewportSize({width,height});
  for(const fontScale of (process.argv.includes('--stress')?[2]:[1,2])){
   await configure({theme:'dark',language:fontScale===2?'both':'en',fontScale,motion:false});
   for(const lane of ['repositories','accounts','settings']){
    await page.getByTestId('nav-'+lane).click();
    await page.evaluate(async()=>{await document.querySelector('mg-app').updateComplete;});
    await snapshot(`${lane}-dark-${width}x${height}-text${fontScale*100}`);
    if(lane==='repositories'&&width===760&&fontScale===2){
     const signIn=page.locator('.workspace-tab-content:not([hidden]) .domain-empty md-filled-tonal-button');
     await signIn.scrollIntoViewIfNeeded();
     const bounds=await signIn.boundingBox();assert.ok(bounds&&bounds.y>=0&&bounds.y+bounds.height<=height,'Enlarged empty-state action can be scrolled into view');
     await snapshot('repositories-dark-760x600-text200-scrolled');
     await signIn.click();await page.locator('mg-accounts').waitFor();
     receipt.checks.push('At minimum viewport and 200% bilingual text the actual sign-in action remains scrollable and operable');
    }
   }
  }
 }
 receipt.checks.push('Declared shell tuples and three destinations remain bounded, including bilingual enlarged text');
 await configure({fontScale:1,language:'en'});await page.setViewportSize({width:1420,height:940});
 await page.getByTestId('nav-repositories').click();
 const splitter=page.getByRole('separator',{name:'Navigation width',exact:true});
 await splitter.focus();const before=await page.locator('.desktop-navigation').evaluate(e=>e.getBoundingClientRect().width);
 await page.keyboard.press('ArrowRight');assert.ok(await page.locator('.desktop-navigation').evaluate(e=>e.getBoundingClientRect().width)>before);
 receipt.checks.push('Navigation splitter remains keyboard operable');
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await page.locator('.workspace-tab-content:not([hidden])').evaluate(e=>getComputedStyle(e).animationName),'none');
 receipt.checks.push('Reduced motion removes workspace transition');
 assert.deepEqual(receipt.errors,[]);
} catch(error) {
 receipt.failure=String(error.stack||error);process.exitCode=1;
 if(page)await page.screenshot({path:join(output,'failure.png')}).catch(()=>{});
} finally {
 await fs.writeFile(join(output,'receipt.json'),JSON.stringify(receipt,null,2));
 console.log(JSON.stringify({output,checks:receipt.checks,tuples:receipt.tuples.length,failure:receipt.failure,errors:receipt.errors}));
 if(page)await page.evaluate(()=>window.material.window('confirm-close')).catch(()=>{});
 if(app)await app.close().catch(()=>{});
}
