import {_electron as electron} from 'playwright';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {join, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';

// Real built application, real settings UI and IPC, no provider or IPC substitution.
// MATRIX_LIMIT bounds exploratory runs; omitted means the complete inventory matrix.
const root=fileURLToPath(new URL('..',import.meta.url)), require=createRequire(import.meta.url);
const output=process.env.MATERIAL_GIT_QA_OUTPUT?resolve(process.env.MATERIAL_GIT_QA_OUTPUT):await fs.mkdtemp(join(tmpdir(),'material-git-matrix-'));
await fs.mkdir(output,{recursive:true});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function files(directory){const result=[];for(const item of await fs.readdir(directory,{withFileTypes:true})){const path=join(directory,item.name);result.push(...(item.isDirectory()?await files(path):[path]));}return result;}
async function provenance(){const sourceFiles={};for(const directory of ['src','assets'])for(const file of await files(join(root,directory)))sourceFiles[file.slice(root.length)]=hash(await fs.readFile(file));const artifacts={};for(const file of [...await files(join(root,'dist/renderer')),join(root,'dist/main/main.cjs'),join(root,'dist/main/preload.cjs'),join(root,'dist/main/provenance.json')])artifacts[file.slice(root.length)]=hash(await fs.readFile(file));return {sourceFiles,materialWebVersion:JSON.parse(await fs.readFile(join(root,'node_modules/@material/web/package.json'),'utf8')).version,commit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),trackedPatchSha256:hash(execFileSync('git',['diff','HEAD','--','src','assets','scripts','package.json','package-lock.json'],{cwd:root})),artifacts,build:JSON.parse(await fs.readFile(join(root,'dist/main/provenance.json'),'utf8'))};}
const start=await provenance(), startedAt=new Date().toISOString();
const environment={...process.env,MATERIAL_GIT_TEST:'1',MATERIAL_GIT_USER_DATA:join(output,'profile'),GH_CONFIG_DIR:join(output,'gh-config')};
for(const key of ['GH_TOKEN','GITHUB_TOKEN','GH_ENTERPRISE_TOKEN','GITHUB_ENTERPRISE_TOKEN','GH_HOST','GITHUB_SERVER_URL'])delete environment[key];
await fs.mkdir(environment.GH_CONFIG_DIR,{recursive:true});
const selectedTuples=process.env.MATRIX_TUPLES?JSON.parse(process.env.MATRIX_TUPLES):null;
const errors=[],results=[],failures=[];let app,page,inventory=[];
async function windowSize(width,height,zoom){await app.evaluate(({BrowserWindow},{width,height,zoom})=>{const window=BrowserWindow.getAllWindows()[0];window.setContentSize(width,height);window.webContents.setZoomFactor(zoom);},{width,height,zoom});await page.waitForTimeout(100);}
async function choose(key,value,tab){await page.getByTestId('nav-settings').click();const settings=page.locator('mg-settings');await settings.locator('md-primary-tab').nth(tab).click();const select=settings.locator(`[data-setting="${key}"] md-outlined-select`);await select.click();await select.locator(`md-select-option[value="${value}"]`).click();await page.waitForFunction(({key,value})=>document.querySelector('mg-app')?.data.settings[key]===value,{key,value});const persisted=await page.evaluate(()=>window.material.bootstrap());assert.equal(persisted.settings[key],value);}
function probe(){
 const nodes=[];function visit(root){for(const element of root.children||[]){nodes.push(element);if(element.shadowRoot)visit(element.shadowRoot);visit(element);}}visit(document);
 const parent=element=>element.assignedSlot||element.parentElement||element.getRootNode()?.host;
 const label=element=>element.localName+(element.id?'#'+element.id:'')+(element.getAttribute('data-testid')?'[data-testid='+element.getAttribute('data-testid')+']':'')+(typeof element.className==='string'&&element.className?'.'+element.className.trim().replaceAll(/\s+/g,'.'):'');
 const rect=element=>{const r=element.getBoundingClientRect();return {x:r.x,y:r.y,top:r.top,right:r.right,bottom:r.bottom,left:r.left,width:r.width,height:r.height};};
 const properties=['display','position','boxSizing','width','minWidth','maxWidth','height','minHeight','maxHeight','margin','padding','gap','flexDirection','flexBasis','flexGrow','flexShrink','gridTemplateColumns','gridTemplateRows','alignItems','justifyContent','overflowX','overflowY','transform','fontSize','lineHeight','fontFamily','visibility','opacity','zIndex','color','backgroundColor'];
 const computed=element=>{const s=getComputedStyle(element);return Object.fromEntries(properties.map(key=>[key,s[key]]));};
 const visible=element=>{if(!element.getClientRects().length)return false;for(let e=element;e;e=parent(e)){const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden'||s.opacity==='0')return false;}return true;};
 const controls=nodes.filter(e=>/^md-(.*button|.*text-field|.*select|.*chip|slider|switch|checkbox|radio|.*tab)$/.test(e.localName)||e.localName==='md-list-item'&&e.type==='button'||e.matches('button,input,select,textarea,[role="separator"]'));
 const elements=[],nativeControls=[],unregistered=[];
 for(const e of controls){if(!visible(e))continue;let officialAncestor=false;for(let a=parent(e);a;a=parent(a))if(a.localName.startsWith('md-'))officialAncestor=true;
 if(e.matches('button,input,select,textarea')&&officialAncestor)continue;
 const r=rect(e),ancestors=[],clips=[];let scrollingX=false,scrollingY=false;
 for(let a=parent(e);a;a=parent(a)){const ar=rect(a),c=computed(a);ancestors.push({selector:label(a),rect:ar,computed:c,scrollWidth:a.scrollWidth,scrollHeight:a.scrollHeight,clientWidth:a.clientWidth,clientHeight:a.clientHeight});
 if(['auto','scroll'].includes(c.overflowX))scrollingX=true;if(['auto','scroll'].includes(c.overflowY))scrollingY=true;
 if(!scrollingX&&['hidden','clip'].includes(c.overflowX)&&(r.left<ar.left-2||r.right>ar.right+2))clips.push({axis:'x',ancestor:label(a)});
 if(!scrollingY&&['hidden','clip'].includes(c.overflowY)&&(r.top<ar.top-2||r.bottom>ar.bottom+2))clips.push({axis:'y',ancestor:label(a)});}
 const name=e.getAttribute('aria-label')||e.getAttribute('label')||e.textContent?.trim().replaceAll(/\s+/g,' ').slice(0,180)||'';
 const interactive=e.shadowRoot?.querySelector('button,input,textarea,[role="button"],[role="combobox"]');
 const item={selector:label(e),name,rect:r,computed:computed(e),disabled:!!e.disabled,tabIndex:e.tabIndex,interactive:interactive?{rect:rect(interactive),computed:computed(interactive)}:null,ancestors,clips,offViewport:{x:r.left<0||r.right>innerWidth,y:r.top<0||r.bottom>innerHeight},scrollReachable:{x:scrollingX,y:scrollingY}};
 elements.push(item);if(e.matches('button,input,select,textarea'))nativeControls.push(item.selector);
 if(e.localName.startsWith('md-')&&!customElements.get(e.localName))unregistered.push(e.localName);
 }
 return {viewport:{width:innerWidth,height:innerHeight,devicePixelRatio,visualViewport:{width:visualViewport.width,height:visualViewport.height,scale:visualViewport.scale}},page:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight},fontScale:document.querySelector('mg-app')?.data.settings.fontScale,theme:document.documentElement.dataset.theme,language:document.querySelector('mg-app')?.data.settings.language,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,elements,nativeControls,unregistered,registered:[...new Set(nodes.filter(e=>e.localName.startsWith('md-')).map(e=>e.localName))].map(tag=>({tag,registered:!!customElements.get(tag),constructor:customElements.get(tag)?.name})),bodyText:document.querySelector('.primary-workspace')?.innerText?.slice(0,1500)};
}
async function navigate(lane){
 const nav=page.getByTestId('nav-'+lane);
 if(await nav.isVisible()){await nav.click({timeout:10000});return 'navigation';}
 const label=(await nav.textContent()).trim();await page.keyboard.press('Control+Shift+F');
 const palette=page.locator('mg-workspace-palette');await palette.locator('md-dialog[open]').waitFor();
 await palette.locator('mg-search').getByRole('textbox').first().fill(lane);
 const row=palette.locator('[data-palette-row]').filter({hasText:new RegExp('^'+label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$')});
 await row.click({timeout:10000});
 await palette.locator('md-dialog[open]').waitFor({state:'detached'});return 'keyboard-workspace-search';
}
async function capture(tuple,lane){const name=`${tuple.width}x${tuple.height}-${tuple.language}-${tuple.theme}-${Math.round(tuple.zoom*100)}pct-font${tuple.fontScale||1}-${lane}`;const before=errors.length;
 try{const navigationRoute=await navigate(lane);await page.waitForFunction(lane=>document.querySelector('mg-app')?.lane===lane,lane,{timeout:10000});await page.locator('#workspace-panel-'+lane).waitFor({state:'visible'});await page.waitForTimeout(80);const measurements=await page.evaluate(probe);const screenshot=name+'.png';await page.screenshot({path:join(output,screenshot),animations:'disabled',timeout:15000});const window=await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];return {bounds:w.getBounds(),contentBounds:w.getContentBounds(),zoomFactor:w.webContents.getZoomFactor(),pid:w.webContents.getOSProcessId(),url:w.webContents.getURL()};});
 const findings=[];if(measurements.page.width>measurements.viewport.width+2)findings.push('document-horizontal-overflow');if(measurements.nativeControls.length)findings.push('visible-native-controls');if(measurements.unregistered.length)findings.push('unregistered-material-control');const clips=measurements.elements.filter(e=>e.clips.length&&!e.disabled);if(clips.length)findings.push('control-clipping-candidates');if(errors.length>before)findings.push('renderer-errors');
 const receipt={version:1,capturedAt:new Date().toISOString(),tuple,lane,navigationRoute,source:start,route:'Playwright actual built Electron, Linux headless, isolated credential-free profile',window,screenshot:{path:screenshot,sha256:hash(await fs.readFile(join(output,screenshot))),animationsDisabled:true},measurements,findings};await fs.writeFile(join(output,name+'.json'),JSON.stringify(receipt,null,2));results.push({name,findings,clipCandidates:clips.map(e=>({selector:e.selector,name:e.name,clips:e.clips})),receipt:name+'.json'});
 }catch(error){failures.push({name,error:error.message});await page.screenshot({path:join(output,name+'-failure.png'),animations:'disabled',timeout:5000}).catch(()=>{});}
}
try{
 app=await electron.launch({executablePath:require('electron'),args:['--no-sandbox','--ozone-platform=headless','.'],cwd:root,env:environment});page=await app.firstWindow({timeout:60000});page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push({at:new Date().toISOString(),message:error.message}));await page.getByTestId('functional-desktop').waitFor({timeout:60000});
 inventory=await page.locator('[data-testid^="nav-"]').evaluateAll(elements=>elements.map(e=>e.dataset.testid.slice(4)));assert.ok(inventory.length>=25);
 const limit=Number(process.env.MATRIX_LIMIT||Infinity);let count=0;
 matrix:for(const language of ['en','yue','both'])for(const theme of ['light','dark']){
 if(selectedTuples&&!selectedTuples.some(t=>t.language===language&&t.theme===theme))continue;
 await windowSize(1420,940,1);await choose('language',language,0);await choose('theme',theme,1);
 for(const [width,height]of [[1420,940],[760,600]])for(const zoom of [1,1.25,1.5,2]){const tuple={width,height,zoom,language,theme,fontScale:1};if(selectedTuples&&!selectedTuples.some(t=>Object.entries(t).every(([key,value])=>tuple[key]===value)))continue;await windowSize(width,height,zoom);for(const lane of inventory){if(count++>=limit)break matrix;await capture(tuple,lane);if(failures.length>=3)throw new Error('Stopped after three navigation/capture failures; inspect evidence before continuing');}console.log(JSON.stringify({tuple,completed:results.length,failures:failures.length}));}
 }
 if(!Number.isFinite(limit)&&!selectedTuples){
 await windowSize(1420,940,1);await choose('language','both',0);await choose('theme','dark',1);const slider=page.locator('mg-settings [data-setting="fontScale"] md-slider');await slider.locator('input').focus();await page.keyboard.press('End');await page.waitForFunction(()=>document.querySelector('mg-app')?.data.settings.fontScale===2);await page.emulateMedia({reducedMotion:'reduce'});
 for(const [width,height]of [[1420,940],[760,600]]){await windowSize(width,height,1);for(const lane of inventory)await capture({width,height,zoom:1,language:'both',theme:'dark',fontScale:2,reducedMotion:true},lane);}
 }
}catch(error){failures.push({phase:'matrix',error:error.stack});process.exitCode=1;}
finally{
 if(app){await page?.evaluate(()=>window.material.window('confirm-close')).catch(()=>{});await app.close().catch(()=>{});}const end=await provenance();const stable=JSON.stringify(start)===JSON.stringify(end);if(!stable||failures.length||errors.length)process.exitCode=1;const summary={startedAt,finishedAt:new Date().toISOString(),start,end,stable,inventory,selectedTuples,expectedFullCaptures:inventory.length*50,completed:results.length,failures,errors,results,limitations:['Linux Electron zoom emulation; not Windows OS display scaling, installer, physical touch, authenticated API permission or secure-storage proof.','Screenshots disable animations during capture; interactive runtime otherwise retains configured motion.','Clipping candidates require review: ancestor measurements distinguish scroll reachability but do not prove every action keyboard reachable.','Real provider-unavailable and signed-out states; no fixture repositories or invented data.']};await fs.writeFile(join(output,'summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify({output,stable,completed:results.length,failures,errors}));
}
