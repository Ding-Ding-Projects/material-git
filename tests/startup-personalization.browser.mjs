import {build} from 'esbuild';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {existsSync} from 'node:fs';
import assert from 'node:assert/strict';

// Compiled component harness with a fixture bridge; it does not prove installed-app IPC.
const root = fileURLToPath(new URL('..', import.meta.url));
const directory = await mkdtemp(join(tmpdir(), 'mg-startup-component-'));
await build({entryPoints: [join(root, 'src/renderer/startup-personalization.ts')], bundle: true, format: 'esm', platform: 'browser', outfile: join(directory, 'component.js')});
const script = await readFile(join(directory, 'component.js'));
const server = createServer((request, response) => {response.setHeader('Content-Type', request.url === '/component.js' ? 'text/javascript' : 'text/html'); response.end(request.url === '/component.js' ? script : '<!doctype html><meta charset="utf-8"><button id="work">Current task</button><script type="module" src="/component.js"></script>');});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const executablePath = process.env.MATERIAL_GIT_BROWSER || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : chromium.executablePath());
const browser = await chromium.launch({executablePath, headless: true, args: ['--no-sandbox']});
const page = await browser.newPage({viewport: {width: 320, height: 640}, reducedMotion: 'reduce'});
const errors = []; page.on('pageerror', error => errors.push(error.message));
const origin = `http://127.0.0.1:${server.address().port}`;
async function setup(options = {}) {
  await page.goto(origin); await page.waitForFunction(() => customElements.get('mg-startup-personalization'));
  await page.evaluate(options => {
    document.querySelector('#work').focus(); window.calls = 0;
    window.material = {startupPersonalization: async () => {window.calls++; if (options.pending) await new Promise(resolve => window.resolveStartup = resolve); return {status: 'shown', dish: {id: 'hk-dish-0001', name: {en: 'Exact public English name', zhHant: '目錄名稱'}, photoStatus: 'missing-public-asset', sourceUrl: 'https://raw.githubusercontent.com/Ding-Ding-Projects/dim-sum-photos/main/catalog/index.json', catalogRevision: '0'.repeat(64)}};}};
    const element = document.createElement('mg-startup-personalization');
    element.settings = {...element.settings, language: options.language || 'en'};
    element.context = {firstRun: false, busy: false, error: false, updating: false, schoolMode: false, quiet: false, ...(options.context || {})};
    element.ready = true; document.body.append(element);
  }, options);
}
try {
  for (const language of ['en', 'yue', 'both']) {
    await setup({language}); const card = page.locator('mg-startup-personalization'); await card.locator('[data-testid=startup-surprise]').waitFor();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'work');
    const name = await card.locator('mg-text[kind=title]').textContent(); assert.equal(name, language === 'yue' ? '目錄名稱' : 'Exact public English name');
    const allText = (await card.locator('mg-text').allTextContents()).join(' ');
    assert.match(allText, /Exact public English name/); assert.match(allText, /目錄名稱/);
    assert.equal(await card.locator('img').count(), 0); assert.match(allText, language === 'yue' ? /搵唔到/ : /No published public photo/);
    assert.equal(await card.evaluate(el => el.getBoundingClientRect().right <= innerWidth && el.getBoundingClientRect().left >= 0), true);
    await page.screenshot({path: join(directory, `${language}-320.png`)});
    await card.getByRole('button', {name: language === 'en' ? 'Dismiss dim sum surprise' : language === 'yue' ? '關閉點心驚喜' : 'Dismiss dim sum surprise · 關閉點心驚喜', exact: true}).focus();
    await page.keyboard.press('Escape'); await card.locator('[data-testid=startup-surprise]').waitFor({state: 'detached'});
  }
  for (const key of ['firstRun', 'busy', 'error', 'updating', 'schoolMode', 'quiet']) {
    await setup({context: {[key]: true}}); await page.evaluate(() => document.querySelector('mg-startup-personalization').updateComplete);
    assert.equal(await page.evaluate(() => window.calls), 0); assert.equal(await page.locator('[data-testid=startup-surprise]').count(), 0);
    await page.evaluate(key => {const el = document.querySelector('mg-startup-personalization'); el.context = {...el.context, [key]: false}; return el.updateComplete;}, key);
    assert.equal(await page.evaluate(() => window.calls), 0);
  }
  await setup({pending: true}); await page.waitForFunction(() => window.calls === 1); await page.getByRole('button', {name: 'Current task'}).click();
  await page.evaluate(() => window.resolveStartup()); await page.evaluate(() => document.querySelector('mg-startup-personalization').updateComplete);
  assert.equal(await page.locator('[data-testid=startup-surprise]').count(), 0);
  await setup(); await page.locator('[data-testid=startup-surprise]').waitFor();
  await page.evaluate(() => {const el = document.querySelector('mg-startup-personalization'); el.context = {...el.context, schoolMode: true}; return el.updateComplete;});
  assert.equal(await page.locator('[data-testid=startup-surprise]').count(), 0);
  await setup(); await page.locator('[data-testid=startup-surprise]').waitFor(); await page.locator('[data-testid=startup-surprise]').waitFor({state: 'detached', timeout: 9000});
  assert.deepEqual(errors, []);
  const receipt = {route: 'isolated Chromium compiled-component harness', fixtureBridge: true, installedAppProof: false, viewport: '320×640', reducedMotion: true, checks: ['three exact factual language modes', 'missing-image honesty', 'focus retained', 'keyboard dismissal', 'all native suppression contexts', 'suppression consumes readiness', 'in-flight interaction cancellation', 'live shared-mode removal', 'seven-second auto-dismiss', 'no clipping'], errors};
  await writeFile(join(directory, 'receipt.json'), JSON.stringify(receipt, null, 2)); console.log(JSON.stringify({directory, ...receipt}));
} finally {await browser.close(); await new Promise(resolve => server.close(resolve)); await rm(join(directory, 'component.js'), {force: true});}
