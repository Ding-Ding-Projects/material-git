import {_electron as electron} from 'playwright';
import {mkdtemp,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),root=fileURLToPath(new URL('..',import.meta.url)),out=await mkdtemp(join(tmpdir(),'material-tabs-'));
const env={...process.env,MATERIAL_GIT_TEST:'1',MATERIAL_GIT_USER_DATA:join(out,'profile'),GH_CONFIG_DIR:join(out,'gh')};
for(const key of ['GH_TOKEN','GITHUB_TOKEN','GH_ENTERPRISE_TOKEN','GITHUB_ENTERPRISE_TOKEN'])delete env[key];await mkdir(env.GH_CONFIG_DIR);
const app=await electron.launch({executablePath:require('electron'),args:['--no-sandbox','--ozone-platform=headless','.'],cwd:root,env});
try{
 const page=await app.firstWindow();await page.getByTestId('functional-desktop').waitFor({timeout:60000});await page.getByTestId('nav-accounts').click();
 const tab=page.locator('mg-workspace-tabs md-secondary-tab[data-id="accounts"]');
 await page.waitForFunction(()=>document.querySelector('mg-workspace-tabs')?.shadowRoot.querySelector('[data-id="accounts"]')?.ariaControlsElements?.[0]===document.getElementById('workspace-panel-accounts'));
 await tab.focus();await page.keyboard.press('Home');await page.waitForFunction(()=>document.querySelector('mg-app').lane==='repositories');await page.keyboard.press('End');await page.waitForFunction(()=>document.querySelector('mg-app').lane==='accounts');
 assert.equal(await tab.evaluate(e=>e.ariaSelected),'true');
 const replacement=await page.evaluate(async()=>{const app=document.querySelector('mg-app'),tabs=document.querySelector('mg-workspace-tabs'),tab=tabs.shadowRoot.querySelector('[data-id="accounts"]'),previous=document.getElementById('workspace-panel-accounts'),next=document.createElement('section');next.id=previous.id;next.setAttribute('role','tabpanel');previous.replaceWith(next);app.requestUpdate();await app.updateComplete;await tabs.updateComplete;await Promise.resolve();return {resolved:tab.ariaControlsElements?.[0]===next,stale:tab.ariaControlsElements?.includes(previous)};});
 assert.deepEqual(replacement,{resolved:true,stale:false});
 const removed=await page.evaluate(async()=>{const app=document.querySelector('mg-app'),tabs=document.querySelector('mg-workspace-tabs');document.getElementById('workspace-panel-accounts').remove();app.requestUpdate();await app.updateComplete;await tabs.updateComplete;await Promise.resolve();return tabs.shadowRoot.querySelector('[data-id="accounts"]').ariaControlsElements.length;});assert.equal(removed,0);
 const mutations=await page.evaluate(async()=>{const tabs=document.querySelector('mg-workspace-tabs'),observer=new MutationObserver(()=>{});observer.observe(tabs.shadowRoot,{attributes:true,subtree:true});tabs.syncPanels();tabs.syncPanels();const count=observer.takeRecords().length;observer.disconnect();return count;});assert.equal(mutations,0);
 console.log(JSON.stringify({passed:['actual tab resolves light-DOM panel across shadow root','Home/End keyboard activation','parent rerender rebinds replaced panel','removed panel clears stale reference','unchanged binding emits no DOM mutation'],profile:out}));
}finally{await app.close();}
