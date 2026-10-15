import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {build} from 'esbuild';
import {chromium, type Locator} from 'playwright';

test('reference searches filter real Git records independently without changing selections or issuing remote reads', async t => {
  const browserPath = process.env.MATERIAL_GIT_CHROMIUM || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : chromium.executablePath());
  if (!existsSync(browserPath)) {t.skip('No usable headless Chromium executable'); return;}
  const directory = mkdtempSync(path.join(tmpdir(), 'reference-search-'));
  const env = {...process.env, GIT_CONFIG_GLOBAL: path.join(directory, 'empty-config'), GIT_CONFIG_NOSYSTEM: '1', GIT_AUTHOR_NAME: 'Search Fixture', GIT_AUTHOR_EMAIL: 'search@example.invalid', GIT_COMMITTER_NAME: 'Search Fixture', GIT_COMMITTER_EMAIL: 'search@example.invalid'};
  for (const key of Object.keys(env)) if (/^GIT_(?:DIR|WORK_TREE|INDEX_FILE|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES|CONFIG_(?:COUNT|KEY_|VALUE_|PARAMETERS)|TRACE|EXEC_PATH)/.test(key)) delete env[key as keyof typeof env];
  writeFileSync(env.GIT_CONFIG_GLOBAL, '');
  function git(...args: string[]) {const result = spawnSync('git', ['-C', directory, ...args], {env, encoding: 'utf8', shell: false, timeout: 10000}); assert.equal(result.status, 0, result.stderr); return result.stdout.trim();}
  git('init', '-b', 'main'); writeFileSync(path.join(directory, 'file'), 'fixture\n'); git('add', '--', 'file'); git('commit', '-m', 'Fixture'); git('branch', 'feature/alpha'); git('tag', 'v1.0');
  const rows = git('ls-remote', '--refs', directory).split('\n').map(line => {const [detail, id] = line.split('\t'); return {id, label: id, detail};});
  const commit = {id: git('rev-parse', 'HEAD'), label: 'Fixture commit', detail: 'Selected history'};
  const bundle = await build({stdin: {contents: "import './src/renderer/git-comparison';import './src/renderer/git-remote-refs';", resolveDir: process.cwd()}, bundle: true, write: false, format: 'esm', platform: 'browser', logLevel: 'silent'});
  const worker = await build({entryPoints: ['src/renderer/regex-worker.ts'], bundle: true, write: false, format: 'esm', platform: 'browser', logLevel: 'silent'});
  const server = createServer((request, response) => {
    if (request.url === '/regex-worker.ts') {response.setHeader('content-type', 'application/javascript'); response.end(worker.outputFiles[0].text); return;}
    if (request.url === '/bundle.js') {response.setHeader('content-type', 'application/javascript'); response.end(bundle.outputFiles[0].text); return;}
    response.setHeader('content-type', 'text/html'); response.end(`<!doctype html><style>body{font:14px system-ui}mg-git-comparison,mg-git-remote-refs{display:block;margin:20px;max-width:1000px}</style><mg-git-comparison></mg-git-comparison><mg-git-remote-refs></mg-git-remote-refs><script type="module">import '/bundle.js';const rows=${JSON.stringify(rows)};const panel=document.querySelector('mg-git-comparison');panel.references=rows;panel.commits=[${JSON.stringify(commit)}];panel.bridge=async()=>({kind:'text',text:''});const remote=document.querySelector('mg-git-remote-refs');remote.remote='fixture';window.reads=[];remote.bridge=async(fields,page)=>{window.reads.push({fields,page});return {kind:'rows',rows:page?rows.filter(r=>r.id.startsWith('refs/tags/')):rows.filter(r=>r.id.startsWith('refs/heads/')),hasNext:!page};};</script>`);
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const browser = await chromium.launch({headless: true, executablePath: browserPath, args: ['--no-sandbox']});
  try {
    const page = await browser.newPage({viewport: {width: 1100, height: 1000}}); page.setDefaultTimeout(10000); const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${address.port}`);
    const comparison = page.locator('mg-git-comparison'), remote = page.locator('mg-git-remote-refs');
    const pollCount = (locator: Locator, count: number) => page.waitForFunction(({selector, count}) => {
      const host = document.querySelector(selector.host); return host?.shadowRoot?.querySelectorAll(selector.inner).length === count;
    }, {selector: {host: locator === remote ? 'mg-git-remote-refs' : 'mg-git-comparison', inner: locator === remote ? '.row' : '.entity'}, count});
    await comparison.getByRole('checkbox', {name: 'refs/heads/feature/alpha', exact: true}).check();
    await comparison.getByRole('textbox', {name: 'Filter references', exact: true}).fill('main'); await pollCount(comparison, 1);
    assert.deepEqual(await comparison.evaluate((element: any) => element.drafts.shortlog.refs), ['HEAD', 'refs/heads/feature/alpha']);
    await comparison.getByRole('textbox', {name: 'Filter references', exact: true}).fill(''); await pollCount(comparison, 4);
    assert.equal(await comparison.getByRole('checkbox', {name: 'refs/heads/feature/alpha', exact: true}).isChecked(), true);
    await comparison.getByRole('button', {name: 'Reference names', exact: true}).click();
    await comparison.getByRole('checkbox', {name: 'Fixture commit', exact: true}).check();
    await comparison.getByRole('textbox', {name: 'Filter selected history commits', exact: true}).fill('absent'); await pollCount(comparison, 0);
    await comparison.getByRole('button', {name: 'Contributors', exact: true}).click(); await pollCount(comparison, 4);
    await comparison.getByRole('button', {name: 'Patch equivalence', exact: true}).click();
    const upstream = comparison.locator('mg-workspace-choice').nth(0), head = comparison.locator('mg-workspace-choice').nth(1);
    await upstream.getByRole('button', {name: 'Upstream reference', exact: true}).click();
    await upstream.getByRole('textbox', {name: 'Filter choices', exact: true}).fill('feature');
    await upstream.locator('md-list-item').filter({hasText: 'refs/heads/feature/alpha'}).click();
    await head.getByRole('button', {name: 'Head reference', exact: true}).click();
    assert.equal(await head.getByRole('textbox', {name: 'Filter choices', exact: true}).inputValue(), '');
    await head.getByRole('textbox', {name: 'Filter choices', exact: true}).fill('v1');
    await head.locator('md-list-item').filter({hasText: 'refs/tags/v1.0'}).click();
    await upstream.getByRole('button', {name: 'Upstream reference', exact: true}).click();
    const search = upstream.locator('mg-search'); await search.getByRole('button', {name: 'Configure regular expression', exact: true}).click();
    await search.getByRole('switch', {name: 'Use regular expression for this search', exact: true}).check();
    await search.getByRole('textbox', {name: 'Pattern', exact: true}).fill('[');
    await search.getByRole('alert').first().waitFor(); assert.match(await search.getByRole('alert').first().innerText(), /Invalid regular expression/);
    await page.waitForFunction(() => !document.querySelector('mg-git-comparison')?.shadowRoot?.querySelector('mg-workspace-choice')?.shadowRoot?.querySelector('md-list-item'));
    assert.equal(await comparison.evaluate((element: any) => element.drafts.cherry.upstream), 'refs/heads/feature/alpha');
    assert.equal(await comparison.evaluate((element: any) => element.drafts.cherry.head), 'refs/tags/v1.0');
    await search.getByRole('button', {name: 'Done', exact: true}).click(); await upstream.getByRole('button', {name: 'Close', exact: true}).click();
    await remote.getByRole('button', {name: 'Inspect remote references', exact: true}).click(); await pollCount(remote, 2);
    await remote.getByRole('textbox', {name: 'Filter this page of advertised references', exact: true}).fill('v1'); await pollCount(remote, 0);
    await remote.getByRole('button', {name: 'Next', exact: true}).click(); await pollCount(remote, 1);
    const remoteSearch = remote.locator('mg-search'); await remoteSearch.getByRole('button', {name: 'Configure regular expression', exact: true}).click();
    await remoteSearch.getByRole('switch', {name: 'Use regular expression for this search', exact: true}).check();
    await remoteSearch.getByRole('textbox', {name: 'Pattern', exact: true}).fill('['); await remoteSearch.getByRole('alert').first().waitFor(); await pollCount(remote, 0);
    await remoteSearch.getByRole('textbox', {name: 'Pattern', exact: true}).fill('refs/tags/v[0-9]'); await pollCount(remote, 1);
    await remoteSearch.getByRole('button', {name: 'Done', exact: true}).click();
    assert.deepEqual(await page.evaluate(() => (window as any).reads), [{fields: {remote: 'fixture', scope: 'all', prefix: ''}, page: 0}, {fields: {remote: 'fixture', scope: 'all', prefix: ''}, page: 1}]);
    await page.setViewportSize({width: 420, height: 800}); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    if (process.env.MATERIAL_GIT_REFERENCE_CAPTURE) await page.screenshot({path: process.env.MATERIAL_GIT_REFERENCE_CAPTURE, fullPage: true});
    assert.deepEqual(errors, []); assert.equal(git('status', '--porcelain', '--untracked-files=no'), '');
  } finally {await browser.close(); await new Promise<void>(resolve => server.close(() => resolve())); rmSync(directory, {recursive: true, force: true});}
});
