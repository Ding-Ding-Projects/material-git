import {createHash, randomInt} from 'node:crypto';
import {constants, mkdirSync, openSync, closeSync, writeFileSync, lstatSync} from 'node:fs';
import {mkdir, open, readdir, rename, rm, lstat} from 'node:fs/promises';
import {join} from 'node:path';
import {PNG} from 'pngjs';
import {readBoundedFile} from './bounded-file';
import {startupDrawWins, startupSuppressed, type StartupContext, type StartupDish, type StartupResult} from '../shared/startup-personalization.js';

export const DIM_SUM_CATALOG = 'https://raw.githubusercontent.com/Ding-Ding-Projects/dim-sum-photos/main/catalog/index.json';
export const DIM_SUM_RELEASES = 'https://api.github.com/repos/Ding-Ding-Projects/dim-sum-photos/releases?per_page=100';
export const STARTUP_LIMITS = {catalog: 12 * 1024 * 1024, releases: 10 * 1024 * 1024, metadata: 2 * 1024 * 1024, photo: 8 * 1024 * 1024, timeout: 12000, fresh: 86400000};
type Photo = {url: string; digest: string; size: number};
type Entry = {id: string; name: {en: string; zhHant: string}; photo?: Photo};
type Metadata = {schemaVersion: 1; sourceUrl: string; revision: string; fetchedAt: number; entries: Entry[]};
type Fetcher = (url: string, init: RequestInit) => Promise<Response>;
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const text = (value: unknown, max: number) => typeof value === 'string' && value.length > 0 && value.length <= max && !/[\u0000-\u001f\u007f]/.test(value);
const assetUrl = (value: unknown): value is string => typeof value === 'string' && /^https:\/\/github\.com\/Ding-Ding-Projects\/dim-sum-photos\/releases\/download\/catalog-v1[A-Za-z0-9._-]*\/hk-dish-[a-z0-9-]+\.png$/.test(value);

/** A dedicated launch record recognizes returning profiles even when preferences stay at defaults. */
export function recordStartupLaunch(directory: string): boolean {
  mkdirSync(directory, {recursive: true, mode: 0o700});
  const file = join(directory, 'startup-launch.marker');
  let descriptor: number;
  try {descriptor = openSync(file, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600);}
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    const stat = lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink() || readBoundedFile(file, 32).toString() !== 'material-git-startup-v1\n') throw new Error('Invalid startup launch record');
    return false;
  }
  try {writeFileSync(descriptor, 'material-git-startup-v1\n');} finally {closeSync(descriptor);}
  return true;
}

/** Only fixed metadata endpoints or catalog-v1 public photos may begin a transfer. */
export async function fetchStartupBytes(url: string, limit: number, signal: AbortSignal, fetcher: Fetcher = globalThis.fetch): Promise<Buffer> {
  if (url !== DIM_SUM_CATALOG && url !== DIM_SUM_RELEASES && !assetUrl(url)) throw new Error('Unapproved public source');
  const photo = assetUrl(url);
  for (let redirects = 0; redirects <= 3; redirects++) {
    const response = await fetcher(url, {signal, redirect: 'manual', credentials: 'omit', headers: {Accept: photo ? 'image/png' : 'application/json'}});
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const next = new URL(response.headers.get('location') || '', url);
      await response.body?.cancel();
      if (!photo || redirects === 3 || next.protocol !== 'https:' || next.username || next.password || next.port || !['release-assets.githubusercontent.com', 'objects.githubusercontent.com'].includes(next.hostname)) throw new Error('Unapproved redirect');
      url = next.href; continue;
    }
    if (!response.ok || !response.body) throw new Error('Public source unavailable');
    const declared = response.headers.get('content-length');
    if (declared && (!/^\d+$/.test(declared) || Number(declared) > limit)) {await response.body.cancel(); throw new Error('Source exceeds size limit');}
    const contentType = response.headers.get('content-type')?.split(';')[0].trim();
    if (photo && contentType !== 'image/png' && contentType !== 'application/octet-stream') {await response.body.cancel(); throw new Error('Public photo type unavailable');}
    const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
    try {while (true) {signal.throwIfAborted(); const {value, done} = await reader.read(); if (done) break; size += value.byteLength; if (size > limit) throw new Error('Source exceeds size limit'); chunks.push(value);}}
    finally {await reader.cancel(); reader.releaseLock();}
    return Buffer.concat(chunks, size);
  }
  throw new Error('Too many redirects');
}

export function parseStartupMetadata(catalogBytes: Buffer, releaseBytes: Buffer, now: number): Metadata {
  const catalog = JSON.parse(catalogBytes.toString('utf8')); const releases = JSON.parse(releaseBytes.toString('utf8'));
  if (!Array.isArray(catalog?.dishes) || catalog.dishes.length > 5000 || !Array.isArray(releases) || releases.length > 100) throw new Error('Invalid public catalog');
  const photos = new Map<string, Photo>();
  for (const release of releases) {
    if (release?.draft !== false || release?.prerelease !== false || !/^catalog-v1[A-Za-z0-9._-]*$/.test(release?.tag_name) || !Array.isArray(release.assets) || release.assets.length > 2000) continue;
    for (const asset of release.assets) {
      if (!assetUrl(asset?.browser_download_url) || asset.browser_download_url !== `https://github.com/Ding-Ding-Projects/dim-sum-photos/releases/download/${release.tag_name}/${asset.name}` || !/^sha256:[a-f0-9]{64}$/.test(asset.digest) || !Number.isSafeInteger(asset.size) || asset.size < 33 || asset.size > STARTUP_LIMITS.photo || asset.content_type !== 'image/png') continue;
      if (!photos.has(asset.name)) photos.set(asset.name, {url: asset.browser_download_url, digest: asset.digest.slice(7), size: asset.size});
    }
  }
  const ids = new Set<string>(); const entries: Entry[] = [];
  for (const dish of catalog.dishes) {
    if (!/^hk-dish-\d{4,6}$/.test(dish?.id) || ids.has(dish.id) || !text(dish.name?.en, 512) || !text(dish.name?.zhHant, 512)) continue;
    ids.add(dish.id);
    const imagePath = dish.image?.path; const filename = typeof imagePath === 'string' && /^images\/hk-dish-[a-z0-9-]+\.png$/.test(imagePath) && imagePath.startsWith(`images/${dish.id}-`) ? imagePath.slice(7) : '';
    entries.push({id: dish.id, name: {en: dish.name.en, zhHant: dish.name.zhHant}, ...(photos.has(filename) ? {photo: photos.get(filename)} : {})});
  }
  if (!entries.length) throw new Error('Public catalog is empty');
  const result: Metadata = {schemaVersion: 1, sourceUrl: DIM_SUM_CATALOG, revision: hash(catalogBytes), fetchedAt: now, entries};
  if (Buffer.byteLength(JSON.stringify(result)) > STARTUP_LIMITS.metadata) throw new Error('Catalog cache exceeds limit');
  return result;
}

function validMetadata(value: unknown): value is Metadata {
  const d = value as Metadata;
  return !!d && d.schemaVersion === 1 && d.sourceUrl === DIM_SUM_CATALOG && /^[a-f0-9]{64}$/.test(d.revision) && Number.isFinite(d.fetchedAt) && Array.isArray(d.entries) && d.entries.length > 0 && d.entries.length <= 5000 && d.entries.every(e => /^hk-dish-\d{4,6}$/.test(e.id) && text(e.name?.en, 512) && text(e.name?.zhHant, 512) && (!e.photo || assetUrl(e.photo.url) && /^[a-f0-9]{64}$/.test(e.photo.digest) && Number.isSafeInteger(e.photo.size) && e.photo.size >= 33 && e.photo.size <= STARTUP_LIMITS.photo));
}
export function validateStartupPhoto(bytes: Buffer, photo: Photo): void {
  if (bytes.length !== photo.size || bytes.length > STARTUP_LIMITS.photo || hash(bytes) !== photo.digest || bytes.length < 33 || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || bytes.subarray(12,16).toString() !== 'IHDR') throw new Error('Invalid public photo integrity');
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  if (width < 1 || height < 1 || width > 4096 || height > 4096 || width * height > 4194304) throw new Error('Photo dimensions exceed limit');
  const decoded = PNG.sync.read(bytes, {checkCRC: true});
  if (decoded.width !== width || decoded.height !== height) throw new Error('Invalid public photo');
}
async function boundedRead(file: string, limit: number): Promise<Buffer> {
  const handle = await open(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0));
  try {const stat = await handle.stat(); if (!stat.isFile() || stat.size > limit) throw new Error('Invalid cache file'); const buffer = Buffer.alloc(limit + 1); let size = 0; while (size < buffer.length) {const {bytesRead} = await handle.read(buffer, size, buffer.length - size, null); if (!bytesRead) break; size += bytesRead;} if (size > limit) throw new Error('Cache exceeds limit'); return buffer.subarray(0, size);} finally {await handle.close();}
}

/** Create one instance per native process. Suppression consumes the launch; it never queues a later surprise. */
export class StartupPersonalizationService {
  private attempted = false;
  constructor(private options: {directory: string; context: () => StartupContext; fetch?: Fetcher; random?: () => number; now?: () => number}) {}
  async startup(): Promise<StartupResult> {
    if (this.attempted) return {status: 'suppressed'};
    this.attempted = true;
    // Draw once even on suppressed launches; no renderer-controlled rerolls.
    const draw = (this.options.random ?? (() => randomInt(0, 1000000000) / 1000000000))();
    if (startupSuppressed(this.options.context())) return {status: 'suppressed'};
    if (!startupDrawWins(draw)) return {status: 'not-selected'};
    const abort = new AbortController(); const timer = setTimeout(() => abort.abort(), STARTUP_LIMITS.timeout);
    try {
      await mkdir(this.options.directory, {recursive: true, mode: 0o700});
      if (!(await lstat(this.options.directory)).isDirectory() || (await lstat(this.options.directory)).isSymbolicLink()) throw new Error('Invalid cache directory');
      for (const name of await readdir(this.options.directory)) if (/^(?:catalog-cache\.json|[a-f0-9]{64}\.png)\.pending$/.test(name)) await rm(join(this.options.directory, name), {force: true});
      const metadata = await this.metadata(abort.signal);
      if (startupSuppressed(this.options.context()) || abort.signal.aborted) return {status: 'suppressed'};
      const choice = (this.options.random ?? (() => randomInt(0, 1000000000) / 1000000000))();
      if (!Number.isFinite(choice) || choice < 0 || choice >= 1) throw new Error('Invalid dish draw');
      const entry = metadata.entries[Math.floor(choice * metadata.entries.length)];
      const dish: StartupDish = {id: entry.id, name: entry.name, sourceUrl: metadata.sourceUrl, catalogRevision: metadata.revision, photoStatus: entry.photo ? 'unavailable' : 'missing-public-asset'};
      if (entry.photo) {
        dish.photoSourceUrl = entry.photo.url;
        try {const file = join(this.options.directory, `${entry.photo.digest}.png`); let bytes: Buffer;
          try {bytes = await boundedRead(file, STARTUP_LIMITS.photo); validateStartupPhoto(bytes, entry.photo);} catch {bytes = await fetchStartupBytes(entry.photo.url, STARTUP_LIMITS.photo, abort.signal, this.options.fetch); validateStartupPhoto(bytes, entry.photo); await this.writeCache(file, bytes);}
          dish.image = `data:image/png;base64,${bytes.toString('base64')}`; dish.photoStatus = 'available';
        } catch {/* Omit the image and keep the truthful local unavailable state. */}
      }
      if (startupSuppressed(this.options.context()) || abort.signal.aborted) return {status: 'suppressed'};
      return {status: 'shown', dish};
    } catch {return {status: 'unavailable'};} finally {clearTimeout(timer);}
  }
  private async metadata(signal: AbortSignal): Promise<Metadata> {
    let cached: Metadata | undefined;
    try {const value = JSON.parse((await boundedRead(join(this.options.directory, 'catalog-cache.json'), STARTUP_LIMITS.metadata)).toString('utf8')); if (validMetadata(value)) cached = value;} catch {}
    const now = (this.options.now ?? Date.now)();
    if (cached && now >= cached.fetchedAt && now - cached.fetchedAt < STARTUP_LIMITS.fresh) return cached;
    try {const [catalog, releases] = await Promise.all([fetchStartupBytes(DIM_SUM_CATALOG, STARTUP_LIMITS.catalog, signal, this.options.fetch), fetchStartupBytes(DIM_SUM_RELEASES, STARTUP_LIMITS.releases, signal, this.options.fetch)]); const metadata = parseStartupMetadata(catalog, releases, now); await this.writeCache(join(this.options.directory, 'catalog-cache.json'), Buffer.from(JSON.stringify(metadata))); return metadata;} catch (error) {if (cached) return cached; throw error;}
  }
  private async writeCache(file: string, bytes: Buffer): Promise<void> {
    // Retain one verified photo and one small metadata document, never an unbounded collection.
    if (file.endsWith('.png')) for (const name of await readdir(this.options.directory)) if (/^[a-f0-9]{64}\.png$/.test(name) && join(this.options.directory, name) !== file) await rm(join(this.options.directory, name), {force: true});
    const temporary = file + '.pending'; const handle = await open(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600);
    try {try {await handle.writeFile(bytes);} finally {await handle.close();} await rename(temporary, file);} finally {await rm(temporary, {force: true});}
  }
}
