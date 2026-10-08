import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const target=process.env.SITE_QA_URL??'http://127.0.0.1:4288';
const out=process.env.SITE_NARRATION_CAPTURE_DIR??'/tmp/material-git-site-narration';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.SITE_QA_CHROMIUM??'/usr/bin/chromium',args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:320,height:1000},reducedMotion:'reduce'});
await context.route('https://api.github.com/**',route=>route.fulfill({status:404,body:'{}'}));
await context.addInitScript(()=>{
 // A deterministic speech adapter tests queue semantics; it does not establish audible/platform speech.
 class Adapter extends EventTarget {
  voices=[];spoken=[];active=null;overlap=false;cancelCount=0;
  getVoices(){return this.voices}
  speak(line){if(this.active)this.overlap=true;this.active=line;this.spoken.push({text:line.text,voice:line.voice?.voiceURI,rate:line.rate,pitch:line.pitch})}
  cancel(){this.cancelCount++;this.active=null}
  finish(){const line=this.active;this.active=null;line?.onend?.({})}
 }
 const adapter=new Adapter();Object.defineProperty(window,'speechSynthesis',{value:adapter});
 Object.defineProperty(window,'SpeechSynthesisUtterance',{value:class{constructor(text){this.text=text}}});
 window.__siteSpeech=adapter;
});
const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
const jsonFile=value=>({name:'visitor-state.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});
const invalid={name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{invalid')};
async function finishAll(){await page.evaluate(()=>{for(let n=0;n<30&&window.__siteSpeech.active;n++)window.__siteSpeech.finish()})}
try{
 await page.goto(target+'/#settings');await page.waitForSelector('#setting-narrator');
 assert.equal(await page.locator('#setting-narrator md-switch').evaluate(control=>control.selected),false);
 assert.match(await page.locator('.voice-status[data-language=en]').innerText(),/enumeration can arrive later/);
 await page.locator('#setting-transfer input').setInputFiles(jsonFile({schemaVersion:1,settings:{englishVoice:'removed-choice',narrationLanguage:'both',englishHumor:1,cantoneseHumor:1}}));
 await page.waitForFunction(()=>document.querySelector('#setting-englishVoice md-outlined-select')?.value==='removed-choice');
 assert.match(await page.locator('.voice-status[data-language=en]').innerText(),/saved identity is kept/);
 await page.evaluate(()=>{window.__siteSpeech.voices=[{voiceURI:'en-fixture',name:'English adapter',lang:'en-GB',localService:true},{voiceURI:'hk-fixture',name:'Cantonese adapter',lang:'zh-HK',localService:true},{voiceURI:'mandarin-fixture',name:'Mandarin adapter',lang:'zh-CN',localService:true}];window.__siteSpeech.dispatchEvent(new Event('voiceschanged'))});
 await page.waitForFunction(()=>document.querySelector('.voice-status[data-language=en]')?.textContent.includes('English adapter'));
 assert.equal(await page.locator('#setting-cantoneseVoice md-select-option[value=mandarin-fixture]').count(),0);
 await page.locator('#setting-narrator md-switch').click();await page.waitForFunction(()=>window.__siteSpeech.spoken.length>0);await finishAll();
 await page.evaluate(()=>window.__siteSpeech.spoken=[]);
 await page.locator('#vocabulary-upload').setInputFiles(invalid);await page.waitForFunction(()=>window.__siteSpeech.spoken.length===1);
 await page.locator('#setting-transfer input').setInputFiles(invalid);
 await page.waitForFunction(()=>[...document.querySelectorAll('.snackbar.error')].some(record=>record.textContent.includes('Invalid preference file')));
 assert.equal(await page.evaluate(()=>window.__siteSpeech.spoken.length),1,'second error waits for the first track');
 await finishAll();const facts=await page.evaluate(()=>window.__siteSpeech.spoken);
 assert.equal(facts.length,4);assert.match(facts[0].text,/vocabulary file is invalid/);assert.match(facts[1].text,/詞彙檔案無效/);assert.match(facts[2].text,/Invalid preference file/);assert.match(facts[3].text,/偏好設定檔案無效/);
 assert.deepEqual(facts.map(fact=>fact.voice),['en-fixture','hk-fixture','en-fixture','hk-fixture']);
 assert.equal(await page.evaluate(()=>window.__siteSpeech.overlap),false);
 await page.locator('#setting-quietNarration md-switch').click();const quietCount=await page.evaluate(()=>window.__siteSpeech.spoken.length);
 await page.locator('#vocabulary-upload').setInputFiles(invalid);assert.equal(await page.evaluate(()=>window.__siteSpeech.spoken.length),quietCount);
 assert.match(await page.locator('#setting-quietNarration .narration-status').innerText(),/paused by Quiet/);
 await page.locator('#setting-screenReaderActive md-switch').click();assert.match(await page.locator('#setting-screenReaderActive .narration-status').innerText(),/cannot reliably detect/);
 await page.reload();await page.waitForSelector('#setting-quietNarration');
 assert.equal(await page.locator('#setting-quietNarration md-switch').evaluate(control=>control.selected),true);assert.equal(await page.locator('#setting-screenReaderActive md-switch').evaluate(control=>control.selected),true);
 const exportReady=page.waitForEvent('download');await page.locator('#setting-transfer md-outlined-button').click();const download=await exportReady;const exported=JSON.parse(await readFile(await download.path(),'utf8'));
 assert.equal(exported.schemaVersion,2);assert.ok(exported.records.presentation.attention);assert.ok(exported.records.schedule);assert.ok(exported.records.workspace);assert.ok(exported.records.appearance);
 assert.equal('pinHash' in exported.records.presentation,false);assert.equal('logo' in exported.records.presentation,false);
 const changed=structuredClone(exported);changed.records.presentation.attention.pausedUntil=Date.now()+60*60_000;
 await page.locator('#setting-transfer input').setInputFiles(jsonFile(changed));await page.waitForFunction(()=>JSON.parse(localStorage.getItem('material-git-site.v2')).extras.attention.pausedUntil>0);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('material-git-site.v2')).extras.attention.pausedUntil),changed.records.presentation.attention.pausedUntil);
 await page.keyboard.press('Control+Shift+F');await page.waitForSelector('.palette');await page.locator('.palette .search-row md-outlined-text-field input').first().fill('Quiet narration');await page.waitForFunction(()=>document.querySelectorAll('.palette-setting').length===1);
 assert.equal(await page.locator('.palette-setting md-switch').count(),1);assert.deepEqual(errors,[]);
 // The capture uses an unmodified browser context with its actual voice enumeration.
 const realContext=await browser.newContext({viewport:{width:320,height:1000},reducedMotion:'reduce'}),real=await realContext.newPage();await real.goto(target+'/#settings');await real.waitForSelector('#setting-narrator');await real.locator('#setting-language md-outlined-select').click();await real.locator('#setting-language md-select-option[value=both]').click();await real.locator('#setting-fontScale md-slider input').first().focus();await real.keyboard.press('End');await real.locator('#setting-englishVoice').scrollIntoViewIfNeeded();
 assert.equal(await real.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 const file=out+'/actual-browser-voice-status-320.png';await real.screenshot({path:file});
 await writeFile(out+'/receipt.json',JSON.stringify({route:'playwright-chromium-headless',sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),artifactSha256:createHash('sha256').update(await readFile(new URL('./dist/app.js',import.meta.url))).digest('hex'),isolatedProfiles:true,queueEvidence:'Controlled speech-synthesis adapter, no audible or installed-voice claim.',capture:{file,capturedAt:new Date().toISOString(),timezone:'UTC',sha256:createHash('sha256').update(await readFile(file)).digest('hex'),voices:await real.evaluate(()=>speechSynthesis?.getVoices().map(v=>({identity:v.voiceURI,language:v.lang,local:v.localService}))??[])},remaining:'Existing navigation labels overlap at 200% text; no screen-reader detection or audible quality proof.'},null,2));await realContext.close();
 console.log('PASS: factual FIFO bilingual errors, no overlap, retained/late voice identities, Mandarin exclusion, quiet/screen-reader persistence, actual voice availability, rich palette switch and visitor-state export/import. Speech adapter evidence is separate from the real-browser capture.');
}finally{await context.close();await browser.close()}
