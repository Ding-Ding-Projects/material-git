import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {buildGitComparison, type GitComparisonKind} from '../src/main/git-comparison';
const context = {reference(value: unknown) {if (typeof value !== 'string') throw new Error('Select reference'); return value;}, safePath(value: unknown) {return String(value);}};
function fixture() {
  const directory = mkdtempSync(path.join(tmpdir(), 'git-comparison-'));
  const root = path.join(directory, 'repo');
  const env = {...process.env, GIT_CONFIG_GLOBAL: path.join(directory, 'empty-config'), GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0', GIT_AUTHOR_NAME: 'Fixture Author', GIT_AUTHOR_EMAIL: 'fixture@example.invalid', GIT_COMMITTER_NAME: 'Fixture Committer', GIT_COMMITTER_EMAIL: 'committer@example.invalid'};
  for (const key of Object.keys(env)) if (/^GIT_(?:DIR|WORK_TREE|INDEX_FILE|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES|CONFIG_(?:COUNT|KEY_|VALUE_|PARAMETERS)|TRACE|EXEC_PATH)/.test(key)) delete env[key as keyof typeof env];
  writeFileSync(env.GIT_CONFIG_GLOBAL, '');
  function git(...argv: string[]) {const result = spawnSync('git', ['--no-pager', '--literal-pathspecs', '-C', root, ...argv], {env, encoding: 'utf8', shell: false, timeout: 15000, maxBuffer: 2 * 1024 * 1024}); assert.equal(result.status, 0, result.stderr); return result.stdout.trim();}
  const initialized = spawnSync('git', ['init', '-b', 'main', root], {env, encoding: 'utf8', shell: false}); assert.equal(initialized.status, 0, initialized.stderr);
  writeFileSync(path.join(root, 'file.txt'), 'base\n'); git('add', '--', 'file.txt'); git('commit', '-m', 'Base');
  const base = git('rev-parse', 'HEAD');
  const run = (kind: GitComparisonKind, fields: Record<string, unknown>) => {
    const plan = buildGitComparison(kind, fields, context);
    const result = spawnSync('git', ['--no-pager', '--literal-pathspecs', '-C', root, ...plan.argv], {env, input: plan.input, encoding: 'utf8', shell: false, timeout: 15000, maxBuffer: 2 * 1024 * 1024});
    assert.equal(result.status, 0, result.stderr); return result.stdout;
  };
  return {directory, root, env, git, base, run, close: () => rmSync(directory, {recursive: true, force: true})};
}
test('shortlog counts actual selected commits, groups authors or committers, and pages commit windows', () => {
  const f = fixture(); try {
    writeFileSync(path.join(f.root, 'file.txt'), 'second\n'); f.git('add', '--', 'file.txt'); f.git('commit', '-m', 'Second');
    assert.match(f.run('shortlog', {refs: ['main'], email: true}), /2\s+Fixture Author <fixture@example.invalid>/);
    assert.match(f.run('shortlog', {refs: ['main'], group: 'committer'}), /2\s+Fixture Committer/);
    assert.match(f.run('shortlog', {refs: ['main'], pageSize: 1, page: 1}), /1\s+Fixture Author/);
    assert.equal(f.run('shortlog', {refs: ['main'], pageSize: 1, page: 2}), '');
  } finally {f.close();}
});
test('cherry detects a real cherry-picked patch and a new patch; range-diff compares rebased series', () => {
  const f = fixture(); try {
    f.git('switch', '-c', 'old-series'); writeFileSync(path.join(f.root, 'file.txt'), 'base\npatch\n'); f.git('add', '--', 'file.txt'); f.git('commit', '-m', 'Shared patch'); const oldTip = f.git('rev-parse', 'HEAD');
    f.git('switch', 'main'); writeFileSync(path.join(f.root, 'other.txt'), 'new base\n'); f.git('add', '--', 'other.txt'); f.git('commit', '-m', 'New base'); const newBase = f.git('rev-parse', 'HEAD');
    f.git('switch', '-c', 'new-series'); f.git('cherry-pick', oldTip); const equivalent = f.git('rev-parse', 'HEAD');
    writeFileSync(path.join(f.root, 'another.txt'), 'new patch\n'); f.git('add', '--', 'another.txt'); f.git('commit', '-m', 'Unique patch');
    const cherry = f.run('cherry', {upstream: 'old-series', head: 'new-series', limit: newBase});
    assert.match(cherry, new RegExp(`^- ${equivalent} Shared patch`, 'm')); assert.match(cherry, /^\+ [a-f0-9]+ Unique patch/m);
    const compared = f.run('range-diff', {oldBase: f.base, oldTip, newBase, newTip: equivalent, creationFactor: 60});
    assert.match(compared, /1:.*=.*1:.*Shared patch/);
    const before = f.git('status', '--porcelain');
    f.git('config', 'diff.external', 'false'); f.run('range-diff', {oldBase: f.base, oldTip, newBase, newTip: equivalent}); assert.equal(f.git('status', '--porcelain'), before);
  } finally {f.close();}
});
test('name-rev identifies native branch and tag names for selected commit objects', () => {
  const f = fixture(); try {
    f.git('tag', 'release-one');
    assert.match(f.run('name-rev', {commits: [f.base], nameScope: 'tags'}), new RegExp(`${f.base} tags/release-one`));
    assert.match(f.run('name-rev', {commits: [f.base], nameScope: 'branches'}), new RegExp(`${f.base} main`));
  } finally {f.close();}
});
test('mailmap accepts bounded identities through stdin and reports actual canonical mapping', () => {
  const f = fixture(); try {
    writeFileSync(path.join(f.root, '.mailmap'), 'Canonical Person <canonical@example.invalid> Alias Person <alias@example.invalid>\n');
    assert.equal(f.run('check-mailmap', {identities: ['Alias Person <alias@example.invalid>', 'Unknown Person <unknown@example.invalid>']}), 'Canonical Person <canonical@example.invalid>\nUnknown Person <unknown@example.invalid>\n');
  } finally {f.close();}
});
test('patch IDs are native stable identities and stripspace handles declared comments without writes', () => {
  const f = fixture(); try {
    writeFileSync(path.join(f.root, 'file.txt'), 'base\npatch\n'); f.git('add', '--', 'file.txt'); f.git('commit', '-m', 'Patch');
    const patch = f.git('show', '--no-ext-diff', '--no-textconv', '--format=medium', 'HEAD');
    assert.match(f.run('patch-id', {patch, strategy: 'stable'}), /^[a-f0-9]{40,64} [a-f0-9]{40,64}\n$/);
    assert.match(f.run('patch-id', {patch, strategy: 'verbatim'}), /^[a-f0-9]{40,64} [a-f0-9]{40,64}\n$/);
    assert.equal(f.run('stripspace', {text: '\nhello  \n\n\nworld\t\n\n'}), 'hello\n\nworld\n');
    assert.equal(f.run('stripspace', {text: '# comment\nhello\n', comments: 'remove'}), 'hello\n');
    assert.equal(f.run('stripspace', {text: 'hello\n\nworld\n', comments: 'add'}), '# hello\n#\n# world\n');
    assert.equal(f.git('status', '--porcelain'), '');
  } finally {f.close();}
});
test('exact schemas reject option injection, invalid enumerations, multiline identities, oversized inputs and unknown fields', () => {
  for (const ref of ['--all', 'a..b', 'HEAD\n--all', 'HEAD:path', 'refs/heads/*']) assert.throws(() => buildGitComparison('cherry', {upstream: ref}, context));
  assert.throws(() => buildGitComparison('shortlog', {refs: ['HEAD'], group: '--all'}, context));
  assert.throws(() => buildGitComparison('shortlog', {refs: ['HEAD'], email: 'yes'}, context));
  assert.throws(() => buildGitComparison('shortlog', {page: -1}, context));
  assert.throws(() => buildGitComparison('shortlog', {pageSize: 1001}, context));
  assert.throws(() => buildGitComparison('range-diff', {oldBase: 'HEAD', oldTip: 'HEAD', newBase: 'HEAD', newTip: 'HEAD', creationFactor: '60'}, context));
  assert.throws(() => buildGitComparison('name-rev', {commits: []}, context));
  assert.throws(() => buildGitComparison('check-mailmap', {identities: ['X <x@example.invalid>\nY <y@example.invalid>']}, context));
  assert.throws(() => buildGitComparison('patch-id', {patch: '😀'.repeat(60000)}, context));
  assert.throws(() => buildGitComparison('stripspace', {text: '\0'}, context));
  assert.throws(() => buildGitComparison('shortlog', {argv: ['--all']}, context));
  assert.throws(() => buildGitComparison('toString' as GitComparisonKind, {}, context));
});

test('registered Material comparison panel runs actual Git through its host bridge and localizes entity forms', async t => {
  const {existsSync} = await import('node:fs');
  const {chromium} = await import('playwright');
  const browserPath = process.env.MATERIAL_GIT_CHROMIUM || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : chromium.executablePath());
  if (!existsSync(browserPath)) {t.skip('No usable headless Chromium executable');return;}
  const {build} = await import('esbuild');
  const {createServer} = await import('node:http');
  const f = fixture();
  const bundled = await build({entryPoints: [path.resolve('src/renderer/git-comparison.ts')], bundle: true, write: false, format: 'esm', platform: 'browser', logLevel: 'silent'});
  const requests: GitComparisonKind[] = [];
  const server = createServer(async (request, response) => {
    if (request.url === '/bundle.js') {response.setHeader('content-type', 'application/javascript');response.end(bundled.outputFiles[0].text);return;}
    if (request.url === '/compare' && request.method === 'POST') {
      let body = '';for await (const chunk of request) body += chunk;
      try {const {kind, fields} = JSON.parse(body);requests.push(kind);response.setHeader('content-type', 'application/json');response.end(JSON.stringify({kind: 'text', text: f.run(kind, fields)}));}
      catch (error) {response.statusCode = 400;response.end(JSON.stringify({error: error instanceof Error ? error.message : String(error)}));}return;
    }
    response.setHeader('content-type', 'text/html');response.end(`<!doctype html><html><head><meta charset="utf-8"><style>body{font:14px system-ui;background:#f5faf4;color:#18201b}mg-git-comparison{max-width:1080px;--md-sys-color-primary:#006b55;--md-sys-color-on-surface:#18201b;--md-sys-color-surface:#f5faf4}</style></head><body><mg-git-comparison></mg-git-comparison><script type="module">import '/bundle.js';const panel=document.querySelector('mg-git-comparison');panel.references=[{id:'main',label:'Main branch',detail:''}];panel.commits=[{id:'${f.base}',label:'Base commit',detail:''}];panel.bridge=async(kind,fields)=>{const response=await fetch('/compare',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({kind,fields})});const result=await response.json();if(!response.ok)throw new Error(result.error);return result;};</script></body></html>`);
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();assert.ok(address && typeof address !== 'string');
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    browser = await chromium.launch({headless: true, executablePath: browserPath, args: ['--no-sandbox']});
    const page = await browser.newPage({viewport: {width: 1100, height: 1000}});const errors: string[] = [];page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${address.port}`);
    await page.getByRole('button', {name: 'Run comparison', exact: true}).click();
    await page.getByRole('cell', {name: 'Fixture Author', exact: true}).waitFor();
    assert.equal(await page.getByRole('cell', {name: '1', exact: true}).count(), 1);
    await page.getByRole('button', {name: 'Reference names', exact: true}).click();
    await page.getByRole('checkbox', {name: 'Base commit', exact: true}).check();
    await page.getByRole('button', {name: 'Run comparison', exact: true}).click();
    await page.getByRole('cell', {name: 'main', exact: true}).waitFor();
    await page.getByRole('button', {name: 'Identity mapping', exact: true}).click();
    await page.getByRole('textbox', {name: 'Identities, one per line', exact: true}).fill('Unknown Person <unknown@example.invalid>');
    await page.getByRole('button', {name: 'Run comparison', exact: true}).click();
    await page.getByRole('cell', {name: 'Unknown Person <unknown@example.invalid>', exact: true}).waitFor();
    await page.getByRole('button', {name: 'Normalize draft', exact: true}).click();
    await page.getByRole('textbox', {name: 'Draft text', exact: true}).fill('hello  \n\n\nworld\t\n');
    await page.getByRole('button', {name: 'Run comparison', exact: true}).click();
    await page.waitForFunction(() => (document.querySelector('mg-git-comparison') as HTMLElement & {output: string}).output === 'hello\n\nworld\n');
    await page.evaluate(async () => {const panel = document.querySelector('mg-git-comparison') as HTMLElement & {language: string;updateComplete: Promise<boolean>};panel.language = 'yue';await panel.updateComplete;});
    await page.getByRole('button', {name: '執行比較', exact: true}).waitFor();
    await page.setViewportSize({width: 420, height: 800});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('mg-git-comparison')!).color), 'rgb(24, 32, 27)');
    assert.deepEqual(requests, ['shortlog', 'name-rev', 'check-mailmap', 'stripspace']);assert.deepEqual(errors, []);
    assert.equal(f.git('status', '--porcelain'), '');
  } finally {await browser?.close();await new Promise<void>(resolve => server.close(() => resolve()));f.close();}
});
