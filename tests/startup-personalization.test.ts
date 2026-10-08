import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm, writeFile, readdir, readFile, symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {DIM_SUM_CATALOG, DIM_SUM_RELEASES, STARTUP_LIMITS, StartupPersonalizationService, fetchStartupBytes, parseStartupMetadata, validateStartupPhoto, recordStartupLaunch} from '../src/main/startup-personalization.js';
import {startupDrawWins, startupSuppressed, type StartupContext} from '../src/shared/startup-personalization.js';
const context = (): StartupContext => ({firstRun: false, busy: false, error: false, updating: false, schoolMode: false, quiet: false});
const dish = {id: 'hk-dish-0001', name: {en: 'Catalog English name', zhHant: '目錄名稱'}, image: {path: 'images/hk-dish-0001-catalog-name.png'}};
const photoUrl = 'https://github.com/Ding-Ding-Projects/dim-sum-photos/releases/download/catalog-v1/hk-dish-0001-catalog-name.png';
const bytes = (value: unknown) => Buffer.from(JSON.stringify(value));
const catalogue = bytes({dishes: [dish, {...dish, id: 'hk-dish-0002', name: {en: 'Second dish', zhHant: '第二款'}}]});
const release = (asset: Record<string, unknown>, tag = 'catalog-v1') => ({tag_name: tag, draft: false, prerelease: false, assets: [asset]});
const invalidPhoto = Buffer.alloc(33); // Deliberately invalid parser input; never a substitute photo.
const digest = createHash('sha256').update(invalidPhoto).digest('hex');
const asset = {name: 'hk-dish-0001-catalog-name.png', browser_download_url: photoUrl, digest: 'sha256:' + digest, size: 33, content_type: 'image/png'};
const fetchMetadata = async (url: string) => new Response(url === DIM_SUM_CATALOG ? catalogue : bytes([]));

test('dedicated startup marker recognizes unchanged returning profiles and rejects corrupt state', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mg-startup-marker-'));
  try {
    assert.equal(recordStartupLaunch(directory), true); assert.equal(recordStartupLaunch(directory), false);
    assert.deepEqual(await readdir(directory), ['startup-launch.marker']);
    await writeFile(join(directory, 'startup-launch.marker'), 'unknown-version');
    assert.throws(() => recordStartupLaunch(directory));
  } finally {await rm(directory, {recursive: true, force: true});}
});

test('startup draw has precisely the [0, 0.1) boundary; invalid values never win', () => {
  for (const value of [0, .099999999]) assert.equal(startupDrawWins(value), true);
  for (const value of [.1, .100000001, 1, -1, NaN, Infinity]) assert.equal(startupDrawWins(value), false);
  for (const key of Object.keys(context())) assert.equal(startupSuppressed({...context(), [key]: true}), true);
});

test('each suppression consumes one launch without accessing network or disk', async () => {
  for (const key of Object.keys(context())) {
    let draws = 0, requests = 0; const state = {...context(), [key]: true};
    const service = new StartupPersonalizationService({directory: '/unused', context: () => state, random: () => {draws++; return 0;}, fetch: async () => {requests++; throw Error();}});
    assert.equal((await service.startup()).status, 'suppressed'); state[key as keyof StartupContext] = false;
    assert.equal((await service.startup()).status, 'suppressed'); assert.equal(draws, 1); assert.equal(requests, 0);
  }
  const service = new StartupPersonalizationService({directory: '/unused', context, random: () => .1, fetch: async () => {throw Error('must not fetch');}});
  assert.equal((await service.startup()).status, 'not-selected'); assert.equal((await service.startup()).status, 'suppressed');
});

test('catalog names remain authoritative and only exact published catalog-v1 PNG assets match', () => {
  for (const bad of [{...asset, browser_download_url: 'https://evil.example/photo.png'}, {...asset, digest: undefined}, {...asset, size: STARTUP_LIMITS.photo + 1}, {...asset, content_type: 'text/html'}, {...asset, name: '../../escape.png'}]) {
    assert.equal(parseStartupMetadata(catalogue, bytes([release(bad)]), 1).entries[0].photo, undefined);
  }
  const metadata = parseStartupMetadata(catalogue, bytes([release(asset)]), 1);
  assert.deepEqual(metadata.entries[0].name, dish.name); assert.equal(metadata.entries[0].photo?.url, photoUrl);
  assert.equal(metadata.sourceUrl, DIM_SUM_CATALOG); assert.match(metadata.revision, /^[a-f0-9]{64}$/);
  assert.equal(parseStartupMetadata(catalogue, bytes([release(asset, 'desktop-1')]), 1).entries[0].photo, undefined);
  assert.throws(() => parseStartupMetadata(bytes({dishes: []}), bytes([]), 1));
});

test('native transport rejects arbitrary URLs, unsafe redirects, content type and both size bounds', async () => {
  const signal = new AbortController().signal;
  await assert.rejects(fetchStartupBytes('https://evil.example', 5, signal));
  for (const location of ['http://release-assets.githubusercontent.com/a', 'https://evil.example/a', 'https://user:secret@release-assets.githubusercontent.com/a', 'https://release-assets.githubusercontent.com:8443/a']) {
    await assert.rejects(fetchStartupBytes(photoUrl, 5, signal, async () => new Response(null, {status: 302, headers: {location}})));
  }
  await assert.rejects(fetchStartupBytes(DIM_SUM_CATALOG, 5, signal, async () => new Response('123456', {headers: {'content-length': '6'}})));
  await assert.rejects(fetchStartupBytes(DIM_SUM_CATALOG, 5, signal, async () => new Response('123456')));
  await assert.rejects(fetchStartupBytes(photoUrl, 5, signal, async () => new Response('html', {headers: {'content-type': 'text/html'}})));
  const calls: string[] = [];
  assert.equal((await fetchStartupBytes(photoUrl, 5, signal, async (url, init) => {calls.push(url); assert.equal(init.credentials, 'omit'); assert.equal(init.redirect, 'manual'); return calls.length === 1 ? new Response(null, {status: 302, headers: {location: 'https://release-assets.githubusercontent.com/public/photo'}}) : new Response('png', {headers: {'content-type': 'image/png'}});})).toString(), 'png');
  assert.equal(calls.length, 2);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(fetchStartupBytes(DIM_SUM_CATALOG, 5, controller.signal, async () => new Response('abc')));
});

test('missing published image is honest and metadata cache works offline without a second authority', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mg-startup-'));
  try {
    const service = new StartupPersonalizationService({directory, context, random: () => 0, fetch: fetchMetadata, now: () => 1});
    const result = await service.startup(); assert.equal(result.status, 'shown'); assert.equal(result.dish?.photoStatus, 'missing-public-asset'); assert.equal(result.dish?.image, undefined); assert.deepEqual(result.dish?.name, dish.name);
    const saved = JSON.parse(await readFile(join(directory, 'catalog-cache.json'), 'utf8')); assert.equal(saved.sourceUrl, DIM_SUM_CATALOG); assert.match(saved.revision, /^[a-f0-9]{64}$/);
    assert.ok(Buffer.byteLength(JSON.stringify(saved)) <= STARTUP_LIMITS.metadata);
    const offline = new StartupPersonalizationService({directory, context, random: () => 0, now: () => STARTUP_LIMITS.fresh + 2, fetch: async () => {throw Error('offline');}});
    assert.equal((await offline.startup()).dish?.photoStatus, 'missing-public-asset');
  } finally {await rm(directory, {recursive: true, force: true});}
});

test('intervening native work suppresses an in-flight startup without showing a late result', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mg-startup-state-')); const state = context();
  try {
    const service = new StartupPersonalizationService({directory, context: () => state, random: () => 0, fetch: async url => {state.busy = true; return fetchMetadata(url);}});
    assert.equal((await service.startup()).status, 'suppressed'); state.busy = false; assert.equal((await service.startup()).status, 'suppressed');
  } finally {await rm(directory, {recursive: true, force: true});}
});

test('corrupt or oversized cache is rejected; stale transfer files are bounded and removed', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mg-startup-cache-'));
  try {
    await writeFile(join(directory, 'catalog-cache.json'), ' '.repeat(STARTUP_LIMITS.metadata + 1));
    await writeFile(join(directory, 'catalog-cache.json.pending'), 'incomplete');
    const service = new StartupPersonalizationService({directory, context, random: () => 0, fetch: fetchMetadata});
    assert.equal((await service.startup()).status, 'shown'); assert.deepEqual(await readdir(directory), ['catalog-cache.json']);
    await writeFile(join(directory, 'catalog-cache.json'), bytes({schemaVersion: 1, sourceUrl: 'https://evil.example'}));
    const offline = new StartupPersonalizationService({directory, context, random: () => 0, fetch: async () => {throw Error('offline');}});
    assert.equal((await offline.startup()).status, 'unavailable');
  } finally {await rm(directory, {recursive: true, force: true});}
});

test('photo integrity and decoding failures omit images rather than caching a fake asset', async () => {
  assert.throws(() => validateStartupPhoto(invalidPhoto, {url: photoUrl, digest, size: invalidPhoto.length}));
  assert.throws(() => validateStartupPhoto(invalidPhoto, {url: photoUrl, digest: '0'.repeat(64), size: invalidPhoto.length}));
  const directory = await mkdtemp(join(tmpdir(), 'mg-startup-photo-'));
  try {
    const service = new StartupPersonalizationService({directory, context, random: () => 0, fetch: async url => new Response(url === DIM_SUM_CATALOG ? catalogue : url === DIM_SUM_RELEASES ? bytes([release(asset)]) : invalidPhoto, {headers: {'content-type': url === photoUrl ? 'image/png' : 'application/json'}})});
    const result = await service.startup(); assert.equal(result.dish?.photoStatus, 'unavailable'); assert.equal(result.dish?.image, undefined); assert.deepEqual(await readdir(directory), ['catalog-cache.json']);
  } finally {await rm(directory, {recursive: true, force: true});}
});

test('symlink cache directories are rejected without following them', {skip: process.platform === 'win32'}, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mg-startup-link-'));
  try {
    await symlink(directory, join(directory, 'link'));
    const service = new StartupPersonalizationService({directory: join(directory, 'link'), context, random: () => 0, fetch: async () => {throw Error('must not fetch');}});
    assert.equal((await service.startup()).status, 'unavailable'); assert.deepEqual(await readdir(directory), ['link']);
  } finally {await rm(directory, {recursive: true, force: true});}
});
