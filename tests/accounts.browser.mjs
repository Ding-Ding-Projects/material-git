import {_electron as electron} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

// Built Electron, real read-only native status and genuine Material controls.
// No authentication or credential mutation is submitted by this test.
const root = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(import.meta.url);
const directory = await fs.mkdtemp(join(tmpdir(), 'mg-accounts-language-'));
const env = {...process.env, MATERIAL_GIT_TEST:'1', MATERIAL_GIT_USER_DATA:join(directory,'profile'), GH_CONFIG_DIR:join(directory,'gh-config')};
for (const key of ['GH_TOKEN','GITHUB_TOKEN','GH_ENTERPRISE_TOKEN','GITHUB_ENTERPRISE_TOKEN']) delete env[key];
await fs.mkdir(env.GH_CONFIG_DIR, {recursive:true});
const app = await electron.launch({executablePath:require('electron'), args:['--no-sandbox','--ozone-platform=headless','.'], cwd:root, env});
let page;
const errors = [], checks = [];
try {
 page = await app.firstWindow();
 page.on('pageerror', error => errors.push(error.message));
 await page.setViewportSize({width:1280,height:900});
 await page.locator('[data-testid="nav-accounts"]').click();
 const accounts = page.locator('mg-accounts');
 await accounts.getByRole('button',{name:'Refresh accounts',exact:true}).waitFor();
 await page.waitForFunction(() => document.querySelector('mg-accounts')?.busy === false);
 const search = accounts.getByRole('textbox',{name:'Search additional permissions',exact:true});
 await search.fill('delete_repo');
 await accounts.getByRole('checkbox',{name:/^delete_repo:/}).check();
 await search.fill('workflow');
 assert.ok((await accounts.locator('.scope-selection').textContent()).includes('delete_repo'));
 await search.fill('');
 await accounts.getByRole('button',{name:'Next additional permissions page',exact:true}).click();
 assert.ok((await accounts.locator('.scope-selection').textContent()).includes('delete_repo'));
 checks.push('Real native account status; permission selection retained across search and pagination');
 const hostname = accounts.getByRole('textbox',{name:'Enterprise DNS hostname',exact:true});
 await hostname.fill('forge.example');
 await accounts.getByRole('checkbox',{name:'I reviewed the exact enterprise hostname and HTTPS destinations',exact:true}).check();
 assert.equal(await accounts.getByRole('button',{name:'Register reviewed host',exact:true}).isEnabled(),true);
 assert.ok((await accounts.evaluate(e=>e.shadowRoot.textContent)).includes('https://forge.example/api/v3'));
 await hostname.fill('https://forge.example');
 assert.equal(await accounts.getByRole('button',{name:'Register reviewed host',exact:true}).isDisabled(),true);
 await hostname.fill('');
 const host = accounts.getByRole('combobox',{name:'Approved GitHub host',exact:true});
 await host.click();
 await accounts.getByRole('textbox',{name:'Search approved hosts',exact:true}).fill('github');
 await accounts.locator('md-select-option[value="github.com"]').click();
 assert.equal(await accounts.locator('md-outlined-select').evaluate(e=>e.value),'github.com');
 checks.push('Real approved-host choices; valid enterprise preview; invalid hostname blocks registration');

 const permissionSearch = accounts.locator('mg-search[search-id="account-login-permissions"]');
 await search.fill('workflow');
 await permissionSearch.getByRole('button',{name:'Configure regular expression',exact:true}).click();
 await permissionSearch.getByRole('switch',{name:'Use regular expression for this search',exact:true}).check();
 await permissionSearch.getByRole('textbox',{name:'Pattern',exact:true}).fill('workflow');
 await permissionSearch.getByRole('button',{name:'Done',exact:true}).click();

 for (const [language,refresh,scopeSearch,nextPage,reviewHost,register] of [
  ['en','Refresh accounts','Search additional permissions','Next additional permissions page','I reviewed the exact enterprise hostname and HTTPS destinations','Register reviewed host'],
  ['yue','更新帳戶','搜尋額外權限','下一頁額外權限','我已檢查企業主機精確名稱同 HTTPS 目的地','登記已檢查主機'],
  ['both','Refresh accounts 更新帳戶','Search additional permissions · 搜尋額外權限','Next additional permissions page · 下一頁額外權限','I reviewed the exact enterprise hostname and HTTPS destinations · 我已檢查企業主機精確名稱同 HTTPS 目的地','Register reviewed host 登記已檢查主機'],
 ]) {
  await page.locator('[data-testid="nav-settings"]').click();
  const settings = page.locator('mg-settings');
  const field = settings.locator('[data-setting="language"] md-outlined-select');
  await field.click();
  await field.locator(`md-select-option[value="${language}"]`).click();
  await page.waitForFunction(value=>document.querySelector('mg-settings')?.settings.language===value,language);
  await page.locator('[data-testid="nav-accounts"]').click();
  await page.waitForFunction(value=>document.querySelector('mg-accounts')?.settings.language===value,language);
  await accounts.getByRole('button',{name:refresh,exact:true}).waitFor();
  const localizedSearch = accounts.getByRole('textbox',{name:scopeSearch,exact:true});
  await localizedSearch.waitFor();
  assert.equal(await localizedSearch.inputValue(),'workflow');
  assert.deepEqual(await permissionSearch.evaluate(e=>({regex:e.regex,pattern:e.pattern})),{regex:true,pattern:'workflow'});
  await accounts.getByRole('button',{name:nextPage,exact:true}).waitFor();
  await accounts.getByRole('checkbox',{name:reviewHost,exact:true}).waitFor();
  assert.equal(await accounts.getByRole('button',{name:register,exact:true}).isDisabled(),true);
  assert.ok((await accounts.locator('.scope-selection').textContent()).includes('delete_repo'));
  await page.setViewportSize({width:600,height:900});
  assert.equal(await accounts.evaluate(e=>e.scrollWidth>e.clientWidth+2),false);
  if (language==='both') {
   assert.ok(await accounts.locator('.secondary').count()>0);
   const metrics=await accounts.locator('.copy').first().evaluate(e=>{const [primary,secondary]=e.children;return{primaryBottom:primary.getBoundingClientRect().bottom,secondaryTop:secondary.getBoundingClientRect().top,primarySize:parseFloat(getComputedStyle(primary).fontSize),secondarySize:parseFloat(getComputedStyle(secondary).fontSize)}});
   assert.ok(metrics.secondaryTop>=metrics.primaryBottom-1);
   assert.ok(metrics.secondarySize<metrics.primarySize);
  }
  await accounts.getByRole('button',{name:refresh,exact:true}).scrollIntoViewIfNeeded();
  await page.screenshot({path:join(directory,`accounts-live-${language}.png`)});
  await page.setViewportSize({width:1280,height:900});
  checks.push(`Persisted ${language} language; accessible controls; exact selected scope; query/regex retained; narrow layout`);
 }
 assert.deepEqual(errors,[]);
 await fs.writeFile(join(directory,'receipt.json'),JSON.stringify({checks,errors,scope:'Live read-only account status and local controls. Language changed through actual Settings controls. No login, credential copy, account switch/removal, Git-helper configuration or host registration submitted.'},null,2));
 console.log(JSON.stringify({directory,checks,errors}));
} catch (error) {
 await page?.screenshot({path:join(directory,'failure.png')}).catch(()=>{});
 console.error(JSON.stringify({directory,checks,errors,failure:error.stack}));
 process.exitCode=1;
} finally {
 await page?.evaluate(()=>window.material.window('confirm-close')).catch(()=>{});
 await app.close().catch(()=>{});
}
