import {_electron as electron} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const root=fileURLToPath(new URL('..',import.meta.url));
const require=createRequire(import.meta.url);
const out=await fs.mkdtemp(join(tmpdir(),'material-controls-'));
const env={...process.env,MATERIAL_GIT_TEST:'1',MATERIAL_GIT_USER_DATA:join(out,'profile'),GH_CONFIG_DIR:join(out,'gh')};
for(const key of ['GH_TOKEN','GITHUB_TOKEN','GH_ENTERPRISE_TOKEN','GITHUB_ENTERPRISE_TOKEN'])delete env[key];
await fs.mkdir(env.GH_CONFIG_DIR,{recursive:true});
const app=await electron.launch({executablePath:require('electron'),args:['--no-sandbox','--ozone-platform=headless','.'],cwd:root,env});
const page=await app.firstWindow(),checks=[],errors=[];
page.on('pageerror',error=>errors.push(error.message));
// Material's role=option is inside a shadow root; visible text is slotted beside it.
// Click the genuine interactive option host so normal hit-testing crosses that slot.
async function eventAfter(locator,event,action){
 await locator.evaluate((element,name)=>{element.testEvent=new Promise(resolve=>element.addEventListener(name,()=>resolve(true),{once:true}));},event);
 await action();await locator.evaluate(element=>element.testEvent);
}
async function openSelect(select){await eventAfter(select,'opened',()=>select.click());}
async function choose(select,value){await openSelect(select);await eventAfter(select,'closed',()=>select.locator(`md-select-option[value="${value}"]`).click());assert.equal(await select.evaluate(element=>element.value),value);}
try{
 await page.setViewportSize({width:1280,height:900});
 await page.getByTestId('functional-desktop').waitFor({timeout:60000});
 await page.getByTestId('nav-settings').click();
 const settings=page.locator('mg-settings');
 await settings.getByRole('tab',{name:'Appearance',exact:true}).click();
 const theme=settings.locator('[data-setting="theme"] md-outlined-select');
 await choose(theme,'dark');
 await page.waitForFunction(async()=> (await window.material.bootstrap()).settings.theme==='dark');
 await page.screenshot({path:join(out,'settings-dark.png')});
 await choose(theme,'light');
 checks.push('Settings select accepts ordinary pointer clicks and persists each choice');
 await page.getByTestId('nav-tools').click();
 const tools=page.locator('mg-tools'),search=tools.locator('mg-search').first();
 await search.getByRole('button',{name:'Configure regular expression',exact:true}).click();
 const family=search.locator('md-filled-select[label="Token family"]');
 await choose(family,'groups');
 await openSelect(family);
 await eventAfter(family,'closed',()=>page.keyboard.press('Escape'));
 assert.equal(await search.evaluate(element=>element.expanded),true,'Escape from a select must preserve its parent workbench');
 assert.equal(await family.evaluate(element=>element.open),false);
 await family.focus();await eventAfter(family,'opened',()=>page.keyboard.press('ArrowDown'));await page.keyboard.press('ArrowDown');await eventAfter(family,'closed',()=>page.keyboard.press('Enter'));
 assert.equal(await family.evaluate(element=>element.value),'classes');
 checks.push('Nested popover select supports pointer, arrows, Enter and scoped Escape');
 await page.screenshot({path:join(out,'regex-light.png')});
 await page.keyboard.press('Escape');
 assert.equal(await search.evaluate(element=>element.expanded),false);
 await page.setViewportSize({width:800,height:700});
 await search.getByRole('button',{name:'Configure regular expression',exact:true}).click();
 await choose(search.locator('md-filled-select[label="Token family"]'),'quantifiers');
 await page.screenshot({path:join(out,'regex-narrow.png')});
 assert.equal(await page.evaluate(()=>document.body.scrollWidth),800);
 checks.push('Narrow workbench remains usable without horizontal document overflow');
 await search.getByRole('button',{name:'Done',exact:true}).click();
 for(const [language,title,tab] of [['yue','本機正則表達式工作台','轉換工具'],['both','Local regex workbench · 本機正則表達式工作台','Converters · 轉換工具']]){
  await page.getByTestId('nav-settings').click();
  await settings.locator('#settings-tab-general').click();
  await choose(settings.locator('[data-setting="language"] md-outlined-select'),language);
  await page.getByTestId('nav-tools').click();
  assert.equal(await tools.getByText(title,{exact:true}).count(),1);
  await tools.getByRole('tab',{name:tab,exact:true}).click();
  assert.equal(await tools.evaluate(element=>element.tab),1);
  await tools.locator('md-primary-tab').first().click();
  await page.screenshot({path:join(out,`tools-${language}.png`)});
 }
 checks.push('Tools tabs, authored workbench labels and accessibility names follow Cantonese and bilingual settings');
 assert.deepEqual(errors,[]);
}catch(error){process.exitCode=1;checks.push({failure:error.message});await page.screenshot({path:join(out,'failure.png')}).catch(()=>{});}
finally{
 const build=JSON.parse(await fs.readFile(join(root,'dist/main/provenance.json'),'utf8'));
 await fs.writeFile(join(out,'receipt.json'),JSON.stringify({route:'Playwright Electron headless; normal host clicks and physical keyboard input',build,checks,errors},null,2));
 console.log(JSON.stringify({out,checks,errors}));
 await page.evaluate(()=>window.material.window('confirm-close')).catch(()=>{});await app.close().catch(()=>{});
}
