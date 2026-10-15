import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {build} from 'esbuild';
import {mkdtemp,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import assert from 'node:assert/strict';
const out=await mkdtemp(join(tmpdir(),'material-primitives-'));
await build({stdin:{contents:`import '${resolve('src/renderer/workspace-controls.ts')}';import '${resolve('src/renderer/workbench.ts')}';`,resolveDir:process.cwd()},outfile:join(out,'fixture.js'),bundle:true,format:'esm',platform:'browser'});
await writeFile(join(out,'index.html'),'<html><body><script type="module" src="fixture.js"></script></body></html>');
const server=createServer(async(req,res)=>{try{res.setHeader('Content-Type',req.url==='/fixture.js'?'text/javascript':'text/html');res.end(await readFile(join(out,req.url==='/fixture.js'?'fixture.js':'index.html')));}catch{res.writeHead(500);res.end();}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const app=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox','--allow-file-access-from-files']});
try{
 const page=await app.newPage({viewport:{width:760,height:600}});await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForFunction(()=>customElements.get('mg-workspace-choice'));
 await page.evaluate(()=>{const c=document.createElement('mg-workspace-choice');c.label='Choose item';c.value='item-21';c.options=Array.from({length:42},(_,i)=>({value:`item-${i}`,label:`Item ${i}`,detail:`Description ${i}`}));c.addEventListener('value-change',e=>window.chosen=e.detail);document.body.append(c);const color=document.createElement('mg-color-field');color.label='Accent';color.value='#123456';color.addEventListener('value-change',e=>window.color=e.detail);document.body.append(color);document.body.append(document.createElement('mg-icon'));});
 const choice=page.locator('mg-workspace-choice');await choice.locator('md-outlined-button').first().click();await choice.locator('md-dialog[open]').waitFor();
 assert.equal(await choice.locator('md-list-item').count(),20);assert.equal(await choice.locator('div[role=option]').count(),0);
 await choice.getByRole('button',{name:'Next',exact:true}).click();await choice.locator('md-list-item').filter({hasText:'Item 21'}).locator('button').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>window.chosen==='item-21');
 await choice.locator('md-dialog[open]').waitFor({state:'hidden'});assert.equal(await choice.locator('md-outlined-button').first().evaluate(e=>e.matches(':focus-within')),true);
 await choice.locator('md-outlined-button').first().click();const filter=choice.getByRole('textbox',{name:'Filter choices',exact:true});await filter.fill('Item 41');await page.waitForFunction(()=>document.querySelector('mg-workspace-choice').shadowRoot.querySelectorAll('md-list-item').length===1);
 await filter.fill('absent');await choice.getByText('No choices match this search.',{exact:true}).waitFor();assert.equal(await choice.evaluate(e=>e.value),'item-21');
 await page.keyboard.press('Escape');await choice.locator('md-dialog[open]').waitFor({state:'hidden'});
 const color=page.locator('mg-color-field'),field=color.getByRole('textbox',{name:'Accent',exact:true});await field.fill('bad');await field.press('Tab');assert.equal(await color.evaluate(e=>e.invalid),true);assert.equal(await color.evaluate(e=>e.value),'#123456');
 await field.fill('#ABCDEF');await field.press('Tab');await page.waitForFunction(()=>window.color==='#abcdef');
 const red=color.getByRole('slider',{name:'Accent: Red',exact:true});await red.focus();await red.press('Home');await page.waitForFunction(()=>window.color==='#00cdef');
 assert.equal(await page.locator('mg-icon svg').getAttribute('viewBox'),'0 -960 960 960');assert.ok(await page.locator('mg-icon path').getAttribute('d'));assert.equal(await page.locator('mg-icon path').evaluate(e=>e.namespaceURI),'http://www.w3.org/2000/svg');assert.ok(await page.locator('mg-icon path').evaluate(e=>e.getBBox().width)>0);
 await choice.locator('md-dialog').evaluate(e=>{e.ready=new Promise(resolve=>e.addEventListener('opened',resolve,{once:true}));});await choice.locator('md-outlined-button').first().click();await choice.locator('md-dialog').evaluate(e=>e.ready);await filter.fill('');await page.waitForFunction(()=>document.querySelector('mg-workspace-choice').shadowRoot.querySelectorAll('md-list-item').length===20);await page.screenshot({path:join(out,'choices.png')});await choice.locator('md-dialog').evaluate(e=>{e.ready=new Promise(resolve=>e.addEventListener('closed',resolve,{once:true}));});await page.keyboard.press('Escape');await choice.locator('md-dialog').evaluate(e=>e.ready);await page.screenshot({path:join(out,'primitives.png')});console.log(JSON.stringify({passed:['official dialog/list pointer and keyboard selection','pagination','filter and empty state preserve current choice','Escape and focus return','invalid color retained','valid hex and RGB keyboard changes','vendored icon rendering'],evidence:out}));
}finally{await app.close();await new Promise(resolve=>server.close(resolve));}
