import {_electron as electron} from 'playwright';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

// Real built Electron app, native preload and native service. Production randomness is unchanged.
const root = fileURLToPath(new URL('..', import.meta.url)), require = createRequire(import.meta.url);
const directory = await fs.mkdtemp(join(tmpdir(), 'mg-startup-integrated-'));
const profile = join(directory, 'profile');
const environment = {...process.env, MATERIAL_GIT_TEST: '1', MATERIAL_GIT_USER_DATA: profile, GH_CONFIG_DIR: join(directory, 'gh-config')};
for (const key of ['GH_TOKEN', 'GITHUB_TOKEN', 'GH_ENTERPRISE_TOKEN', 'GITHUB_ENTERPRISE_TOKEN']) delete environment[key];
await fs.mkdir(environment.GH_CONFIG_DIR, {recursive: true});
const attempts = [], checks = [], errors = [];
let activeApp;
async function launch(interact = false) {
  const proxy = environment.HTTPS_PROXY || environment.HTTP_PROXY;
  activeApp = await electron.launch({executablePath: require('electron'), args: ['--no-sandbox', '--ozone-platform=headless', ...(proxy ? [`--proxy-server=${proxy}`] : []), '.'], cwd: root, env: environment});
  const page = await activeApp.firstWindow(); page.on('pageerror', error => errors.push(error.message));
  if (interact) await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.querySelector('mg-app')?.startupReady, {timeout: 20000});
  await page.waitForFunction(() => {const card = document.querySelector('mg-startup-personalization'); return card && (card.context.firstRun || card.context.busy || card.context.error || card.context.updating || card.context.schoolMode || card.context.quiet || !!card.dish || card.attempted);});
  return page;
}
async function close() {
  if (!activeApp) return;
  await (await activeApp.firstWindow()).evaluate(() => window.material.window('confirm-close')).catch(() => {});
  await activeApp.close().catch(() => {}); activeApp = undefined;
}
try {
  let page = await launch();
  assert.equal(await page.evaluate(() => document.querySelector('mg-app').data.startupFirstRun), true);
  assert.equal(await page.locator('[data-testid=startup-surprise]').count(), 0);
  assert.equal(await page.evaluate(() => typeof window.material.startupPersonalization), 'function');
  assert.equal((await page.evaluate(() => window.material.startupPersonalization())).status, 'suppressed');
  assert.equal((await page.evaluate(() => window.material.startupPersonalization())).status, 'suppressed');
  await page.screenshot({path: join(directory, 'first-run-suppressed.png')});
  checks.push('actual first-run marker, typed preload method and native repeated suppression');
  await close();

  page = await launch(true);
  assert.equal(await page.evaluate(() => document.querySelector('mg-app').data.startupFirstRun), false);
  assert.equal(await page.evaluate(() => document.querySelector('mg-app').startupInteracted), true);
  assert.equal(await page.locator('[data-testid=startup-surprise]').count(), 0);
  checks.push('returning unchanged profile recognized and startup interaction cancels opportunity');
  await page.evaluate(() => window.material.settings({quietNarration: true})); await close();

  page = await launch(); assert.equal(await page.locator('[data-testid=startup-surprise]').count(), 0);
  assert.equal(await page.evaluate(() => document.querySelector('mg-startup-personalization').context.quiet), true);
  await page.evaluate(() => window.material.settings({quietNarration: false})); await close();
  checks.push('persisted native quiet preferences suppress startup');

  // Observe normal chance across bounded real launches. Failure to win is reported, never bypassed.
  const maximum = Math.min(40, Math.max(1, Number(process.env.MATERIAL_GIT_STARTUP_LAUNCHES || 20)));
  for (let launchNumber = 1; launchNumber <= maximum; launchNumber++) {
    page = await launch();
    await page.waitForFunction(() => {const card = document.querySelector('mg-startup-personalization'); return card?.outcome || card?.stopped;}, null, {timeout: 16000});
    const card = page.locator('mg-startup-personalization');
    if (await card.locator('[data-testid=startup-surprise]').count()) {
      const observed = await card.evaluate(el => ({id: el.dish.id, name: el.dish.name, photoStatus: el.dish.photoStatus, sourceUrl: el.dish.sourceUrl, catalogRevision: el.dish.catalogRevision, photoSourceUrl: el.dish.photoSourceUrl}));
      attempts.push({launchNumber, outcome: 'shown', ...observed});
      const names = (await card.locator('mg-text').allTextContents()).join(' ');
      assert.ok(names.includes(observed.name.en)); assert.ok(names.includes(observed.name.zhHant));
      if (observed.photoStatus === 'available') {const image = card.locator('img'); assert.ok((await image.getAttribute('alt')).includes(observed.name.en)); assert.ok((await image.getAttribute('alt')).includes(observed.name.zhHant)); assert.ok((await image.getAttribute('src')).startsWith('data:image/png;base64,'));}
      await page.screenshot({path: join(directory, 'normal-chance-surprise.png')});
      await card.getByRole('button').focus(); await page.keyboard.press('Escape');
      await card.locator('[data-testid=startup-surprise]').waitFor({state: 'detached'});
      assert.equal((await page.evaluate(() => window.material.startupPersonalization())).status, 'suppressed');
      checks.push('normal native launch draw produced exact bilingual card; keyboard dismissal and native no-repeat verified');
      await close(); break;
    }
    const nativeResult = await page.evaluate(() => window.material.startupPersonalization());
    attempts.push({launchNumber, outcome: 'no-card', componentOutcome: await card.evaluate(el => el.outcome), context: await card.evaluate(el => el.context), subsequentNativeStatus: nativeResult.status});
    console.log(JSON.stringify({launchNumber, componentOutcome: attempts.at(-1).componentOutcome}));
    await close();
  }
  assert.deepEqual(errors, []);
  const provenance = JSON.parse(await fs.readFile(join(root, 'dist/main/provenance.json'), 'utf8'));
  const artifacts = {};
  for (const file of ['dist/main/main.cjs', 'dist/main/preload.cjs']) artifacts[file] = createHash('sha256').update(await fs.readFile(join(root, file))).digest('hex');
  const receipt = {route: 'isolated headless Electron built application', productionRandomnessUnmodified: true, profile, provenance, artifacts, checks, attempts, observedSurprise: attempts.some(attempt => attempt.outcome === 'shown'), errors, limitations: ['Linux source artifact; Windows build entrypoints, installer and OS secure-storage behavior not verified', 'A bounded set of genuine launches may produce no winning draw; no winning draw is fabricated']};
  await fs.writeFile(join(directory, 'receipt.json'), JSON.stringify(receipt, null, 2)); console.log(JSON.stringify({directory, ...receipt}));
} catch (error) {
  await (await activeApp?.firstWindow())?.screenshot({path: join(directory, 'failure.png')}).catch(() => {});
  console.error(JSON.stringify({directory, checks, attempts, errors, failure: error.stack})); process.exitCode = 1;
} finally {await close();}
