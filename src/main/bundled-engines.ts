import { Worker } from 'node:worker_threads';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, mkdtemp, readFile, writeFile, readdir, stat, rm } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { tmpdir, platform, arch } from 'node:os';
import { spawn } from 'node:child_process';
import manifest from '../../data/converter-engines.json';
import type { BundledEngineFacade, EngineRequest, EngineResult, EngineStatus, ConverterOptions } from '../shared/bundled-engines';
export interface BundledEngineOptions {
    vendorDirectory: string;
    workerPath: string;
}
const MAX_BYTES = 64 * 1024 * 1024;
async function sha(path: string) { const hash = createHash('sha256'); for await (const chunk of createReadStream(path))
    hash.update(chunk); return hash.digest('hex'); }
function safeName(name: string) { if (!name || name.length > 200 || /[\x00-\x1f\\/:]/.test(name) || name === '.' || name === '..' || /[. ]$/.test(name) || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name) || name.startsWith('output.') || ['__proto__','constructor','prototype'].includes(name))
    throw new Error('Archive sources require distinct safe basenames'); return name; }
function validateOptions(options: ConverterOptions) { const allowed = ['pages', 'rotation', 'metadata', 'quality', 'compression', 'level', 'dictionaryMiB', 'wordSize', 'solidBlockMiB', 'solid', 'threads', 'volumeMiB', 'encryption', 'password', 'sourceFormat', 'table']; for (const key of Object.keys(options))
    if (!allowed.includes(key))
        throw new Error('Unknown converter option'); if (options.password !== undefined && (typeof options.password !== 'string' || !options.password.length || options.password.length > 200 || /[\r\n\0]/.test(options.password)))
    throw new Error('Archive password must be 1 to 200 characters without line breaks'); if (options.threads !== undefined && (!Number.isInteger(options.threads) || options.threads < 1 || options.threads > 4))
    throw new Error('Use 1 to 4 converter threads'); if (options.level !== undefined && (!Number.isInteger(options.level) || options.level < 0 || options.level > 9))
    throw new Error('Compression level must be 0 to 9'); if (options.dictionaryMiB !== undefined && (![1, 2, 4, 8, 16, 32, 64].includes(options.dictionaryMiB)))
    throw new Error('Unsupported archive dictionary size'); if (options.solid !== undefined && typeof options.solid !== 'boolean')
    throw new Error('Solid mode must be boolean'); if (options.volumeMiB !== undefined && (![0, 4, 8, 16, 32].includes(options.volumeMiB)))
    throw new Error('Unsupported volume size'); if (options.encryption !== undefined && !['none', 'content', 'content-and-headers'].includes(options.encryption))
    throw new Error('Unsupported encryption mode'); if (options.compression !== undefined && !['store', 'deflate', 'lzma2', 'lzma', 'ppmd', 'bzip2'].includes(options.compression))
    throw new Error('Unsupported compression method'); if (options.sourceFormat !== undefined && !['json', 'jsonl', 'yaml', 'xml', 'csv', 'tsv'].includes(options.sourceFormat))
    throw new Error('Unsupported structured source format'); }
export class BundledEngines implements BundledEngineFacade {
    constructor(private options: BundledEngineOptions) { this.options = { ...options, workerPath: options.workerPath.replace(/app\.asar([\\/])/, 'app.asar.unpacked$1') }; }
    private directory() { return join(this.options.vendorDirectory, platform() + '-' + arch()); }
    async status(): Promise<EngineStatus[]> { const status: EngineStatus[] = []; try {
        const size = (await stat(this.options.workerPath)).size;
        if (size <= 0 || size > 16 * 1024 * 1024)
            throw new Error('Invalid bundled worker artifact');
        status.push({ kind: 'worker', available: true, proof: 'Bundled fixed worker source with locked pdf-lib, YAML/XML, ZIP and raster decoders; isolated heap/time/resource bounds', version: 'pdf-lib 1.17.1 / pngjs 7.0.0 / jpeg-js 0.4.4' });
    }
    catch {
        status.push({ kind: 'worker', available: false, reason: 'The built bundled-engines-worker.cjs artifact is missing. Run the application build with the converter worker entry.' });
    } const key = (platform() + '-' + arch()) as keyof typeof manifest.files; const files = manifest.files[key]; for (const [kind, names] of [['ffmpeg', manifest.engines.ffmpeg.files[key] ?? []], ['archive', [platform() === 'win32' ? '7za.exe' : '7zz', '7zip.LICENSE','7zip.SOURCE.tar.xz']]] as const) {
        try {
            if (!files)
                throw new Error('Unsupported converter platform');
            const receipt = JSON.parse(await readFile(join(this.directory(), 'receipt.json'), 'utf8'));
            if (receipt.key !== key)
                throw new Error('Converter receipt platform mismatch');
            for (const name of names) {
                const expected = (files as Record<string, string>)[name];
                if (!expected || receipt.files[name] !== expected || await sha(join(this.directory(), name)) !== expected)
                    throw new Error('Pinned payload checksum mismatch');
            }
            if(kind==='ffmpeg'){const proof=JSON.parse(await readFile(join(this.directory(),'SOURCE_BUILD.json'),'utf8'));if(proof.platform!==key||proof.version!==manifest.engines.ffmpeg.version||proof.sourceManifest!==manifest.engines.ffmpeg.sourceManifestSha256)throw new Error('FFmpeg corresponding-source identity mismatch');}
            status.push({ kind, available: true, proof: 'App-owned pinned binaries, licenses and receipt reverified by SHA256', version: kind === 'archive' ? '7-Zip 26.04' : receipt.versions.ffmpeg });
        }
        catch (error) {
            status.push({ kind, available: false, reason: error instanceof Error ? error.message : 'Bundled engine unavailable' });
        }
    } return status; }
    async convert(request: EngineRequest, signal: AbortSignal): Promise<EngineResult> { validateOptions(request.options ?? {}); if (!Array.isArray(request.inputs) || !request.inputs.length || request.inputs.length > 250 || request.inputs.reduce((n, i) => n + i.bytes.length, 0) > MAX_BYTES)
        throw new Error('Conversion batch exceeds 250 sources or 64 MiB'); const needed = request.adapter.startsWith('media-') ? 'ffmpeg' : request.adapter.startsWith('7z-') ? 'archive' : 'worker'; const state = (await this.status()).find(s => s.kind === needed); if (!state?.available)
        throw new Error(state?.reason ?? 'Required bundled converter is unavailable'); if (needed === 'worker')
        return this.worker(request, signal); if (needed === 'ffmpeg')
        return this.media(request, signal); return this.archive(request, signal); }
    private worker(request: EngineRequest, signal: AbortSignal): Promise<EngineResult> { return new Promise((resolve, reject) => { const worker = new Worker(this.options.workerPath, { workerData: request, execArgv: [], resourceLimits: { maxOldGenerationSizeMb: 256, maxYoungGenerationSizeMb: 32, stackSizeMb: 4 } }); let settled = false; const finish = (error?: Error, result?: EngineResult) => { if (settled)
        return; settled = true; clearTimeout(timer); signal.removeEventListener('abort', cancel); void worker.terminate(); if (error)
        return reject(error); if (!result || !Array.isArray(result.outputs) || result.outputs.length > 250 || result.outputs.reduce((n, o) => n + o.bytes.length, 0) > MAX_BYTES)
        return reject(new Error('Worker output exceeded safety bounds')); resolve(result); }; const timer = setTimeout(() => finish(new Error('Isolated converter exceeded 45-second deadline')), 45000); const cancel = () => finish(new Error('Conversion cancelled')); signal.addEventListener('abort', cancel, { once: true }); if (signal.aborted)
        return cancel(); worker.once('message', m => m.ok ? finish(undefined, m.result) : finish(new Error(String(m.error).slice(0, 500)))); worker.once('error', e => finish(e)); worker.once('exit', c => { if (!settled)
        finish(new Error(`Isolated converter exited (${c})`)); }); }); }
    /** All native paths share limits, including streamed archive entries. Secrets use stdin only. */
    private execute(binary: string, args: string[], cwd: string, signal: AbortSignal, outputLimit: number, timeout: number, password?: string): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const child = spawn(binary, args, { cwd, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], env: { PATH: '', HOME: cwd, TMPDIR: cwd, TEMP: cwd, TMP: cwd, SYSTEMROOT: process.env.SYSTEMROOT ?? '' } });
            const chunks: Buffer[] = []; let bytes = 0, diagnostics = '', failure: Error | undefined, settled = false, inspecting = false;
            const stop = (error: Error) => { if (failure || settled) return; failure = error; child.kill('SIGKILL'); };
            const cancel = () => stop(new Error('Conversion cancelled'));
            const timer = setTimeout(() => stop(new Error('Native converter exceeded its execution deadline')), timeout);
            const monitor = setInterval(() => {
                if (inspecting || settled || failure) return;
                inspecting = true;
                void (async () => {
                    try {
                        let total = 0;
                        for (const entry of await readdir(cwd)) { const info = await stat(join(cwd, entry)); if (info.isFile()) total += info.size; }
                        if (total > MAX_BYTES * 2) stop(new Error('Native converter temporary bytes exceeded 128 MiB'));
                        if (platform() === 'linux' && child.pid) {
                            const rss = /VmRSS:\s+(\d+)\s+kB/.exec(await readFile(`/proc/${child.pid}/status`, 'utf8'));
                            if (rss && Number(rss[1]) * 1024 > 512 * 1024 * 1024) stop(new Error('Native converter resident memory exceeded 512 MiB'));
                        }
                    } catch { /* The process may have exited between the monitor reads. */ }
                    finally { inspecting = false; }
                })();
            }, 100);
            const cleanup = () => { clearTimeout(timer); clearInterval(monitor); signal.removeEventListener('abort', cancel); };
            signal.addEventListener('abort', cancel, { once: true });
            child.stdout.on('data', (part: Buffer) => { bytes += part.length; if (bytes > outputLimit) stop(new Error('Native converter output exceeded its verified byte bound')); else if (!failure) chunks.push(part); });
            child.stderr.on('data', (part: Buffer) => { diagnostics += part.toString('utf8'); if (diagnostics.length > 1024 * 1024) stop(new Error('Native converter diagnostics exceeded 1 MiB')); });
            child.once('error', () => { failure ??= new Error('Verified native converter could not start'); });
            child.once('close', code => {
                if (settled) return; settled = true; cleanup();
                if (!failure && code !== 0) {
                    const text = (diagnostics || Buffer.concat(chunks).toString('utf8')).replaceAll(cwd, '[temporary directory]').replaceAll(password ?? '\0', '[REDACTED]').slice(-700);
                    failure = new Error(`Native converter failed (${code}): ${text}`);
                }
                // Wait for closed stdio before deleting the private input/output directory.
                failure ? reject(failure) : resolve(Buffer.concat(chunks, bytes));
            });
            child.stdin.on('error', () => {});
            child.stdin.end(password ? password + '\n' + password + '\n' : undefined);
            if (signal.aborted) cancel();
        });
    }
    private async run(binary: string, args: string[], cwd: string, signal: AbortSignal, password?: string): Promise<string> {
        return (await this.execute(binary, args, cwd, signal, 1024 * 1024, 90000, password)).toString('utf8');
    }
    private async owned<T>(task: (directory: string) => Promise<T>): Promise<T> { const directory = await mkdtemp(join(tmpdir(), 'material-conversion-')); try {
        return await task(directory);
    }
    finally {
        await rm(directory, { recursive: true, force: true });
    } }
    private async probe(file: string, directory: string, signal: AbortSignal) { const probe = join(this.directory(), platform() === 'win32' ? 'ffprobe.exe' : 'ffprobe'); const output = await this.run(probe, ['-v', 'error','-max_alloc','67108864', '-protocol_whitelist', 'file','-format_whitelist','mov,mp4,m4a,3gp,3g2,mj2,matroska,webm,mp3,wav,flac,ogg,avi', '-show_entries', 'format=duration,format_name:stream=codec_type,codec_name,width,height,sample_rate,channels', '-of', 'json', file], directory, signal); const data = JSON.parse(output); if (!Array.isArray(data.streams) || data.streams.length > 16)
        throw new Error('Media has no valid bounded stream inventory'); for (const stream of data.streams) {
        if (stream.codec_type === 'video' && (!Number.isInteger(stream.width) || !Number.isInteger(stream.height) || stream.width < 1 || stream.height < 1 || stream.width > 4096 || stream.height > 4096 || stream.width * stream.height > 8294400))
            throw new Error('Media video exceeds 4096 pixels per side or 8.3 million pixels');
    } const duration = Number(data.format?.duration); if (!Number.isFinite(duration) || duration <= 0 || duration > 300)
        throw new Error('Media duration must be reported and at most 300 seconds'); return data; }
    private async media(request: EngineRequest, signal: AbortSignal) { return this.owned(async (directory) => { const input = join(directory, 'input.bin'); await writeFile(input, request.inputs[0].bytes); const before = await this.probe(input, directory, signal), target = request.adapter.slice(6); const presets: Record<string, string[]> = { wav: ['-vn', '-c:a', 'pcm_s16le'], mp3: ['-vn', '-c:a', 'libmp3lame', '-b:a', '192k'], flac: ['-vn', '-c:a', 'flac'], ogg: ['-vn', '-c:a', 'libvorbis', '-q:a', '4'], mp4: ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart'], webm: ['-c:v', 'libvpx-vp9', '-deadline', 'realtime', '-cpu-used', '6', '-b:v', '1M', '-c:a', 'libopus'], mkv: ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-c:a', 'aac'] }; if (!Object.hasOwn(presets, target))
        throw new Error('Unsupported media target preset'); if (['wav', 'mp3', 'flac', 'ogg'].includes(target) && !before.streams.some((s: any) => s.codec_type === 'audio'))
        throw new Error('Source has no audio stream'); if (['mp4', 'webm', 'mkv'].includes(target) && !before.streams.some((s: any) => s.codec_type === 'video'))
        throw new Error('Source has no video stream'); const output = join(directory, 'output.' + target), binary = join(this.directory(), platform() === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'); const threads = request.options.threads ?? 1; await this.run(binary, ['-nostdin', '-hide_banner', '-v', 'error','-max_alloc','67108864', '-protocol_whitelist', 'file','-format_whitelist','mov,mp4,m4a,3gp,3g2,mj2,matroska,webm,mp3,wav,flac,ogg,avi', '-threads', String(threads), '-filter_threads', '1', '-filter_complex_threads', '1', '-i', input, '-map', '0:v:0?', '-map', '0:a:0?', '-map_metadata', '-1', '-sn', '-dn', ...presets[target], '-threads', String(threads), '-t', '300', '-fs', String(MAX_BYTES), '-n', output], directory, signal); const after = await this.probe(output, directory, signal); if (Math.abs(Number(after.format.duration) - Number(before.format.duration)) > Math.max(1, Number(before.format.duration) * .02))
        throw new Error('Converted media duration failed reopening validation'); const size = (await stat(output)).size; if (size < 1 || size > MAX_BYTES)
        throw new Error('Converted media exceeds output limits'); return { outputs: [{ suffix: '.' + target, bytes: await readFile(output) }], details: { source: before, output: after }, disclosures: ['Media transcoding may be lossy. It removes metadata, subtitles, data streams and additional audio/video tracks; sources are untouched. Maximum duration 300 seconds; no network protocols are allowed.'] }; }); }
    private async archive(request: EngineRequest, signal: AbortSignal) { signal = AbortSignal.any([signal, AbortSignal.timeout(120000)]); return this.owned(async (directory) => { const binary = join(this.directory(), platform() === 'win32' ? '7za.exe' : '7zz'), password = request.options.password, encrypted = request.options.encryption && request.options.encryption !== 'none'; if (encrypted && !password)
        throw new Error('Enter the archive password before encrypting'); const secretArgs:string[] = []; /* Encrypted archive readers prompt on stdin; -p without a value means an empty reader password. */ if (request.adapter === '7z-extract') {
        const source = join(directory, 'source.7z');
        await writeFile(source, request.inputs[0].bytes);
        const listing = await this.run(binary, ['l', '-slt','-mmt=1', ...secretArgs, source], directory, signal, password);
        const records = this.archiveListing(listing);
        if (records.total > MAX_BYTES || records.files.length > 250)
            throw new Error('Archive extraction exceeds 250 files or 64 MiB expanded bytes');
        const outputs = [];
        for (const file of records.files) {
            const bytes = await this.extractEntry(binary, source, file.name, file.bytes, directory, signal, password);
            if (bytes.length !== file.bytes)
                throw new Error('Archive entry size failed verification');
            outputs.push({ suffix: '-' + file.name.replaceAll('/', '-'), bytes });
        }
        return { outputs, disclosures: ['Archive extraction writes verified bytes to new flat names. It rejects traversal, symlinks, malformed size metadata and excessive expanded content. Directory structure and metadata are not preserved.'] };
    } if (!['7z-create', '7z-zip'].includes(request.adapter))
        throw new Error('Unsupported native archive operation'); const isZip = request.adapter === '7z-zip'; if (isZip && request.options.encryption === 'content-and-headers')
        throw new Error('ZIP does not support header encryption'); if (isZip && request.options.solid)
        throw new Error('ZIP does not support solid compression'); const method = request.options.compression ?? (isZip ? 'deflate' : 'lzma2'); if (isZip && !['store', 'deflate'].includes(method) || !isZip && !['store', 'lzma2', 'lzma', 'ppmd', 'bzip2', 'deflate'].includes(method))
        throw new Error('Compression method is incompatible with archive format'); if (request.options.solidBlockMiB !== undefined && (![1,2,4,8,16,32,64].includes(request.options.solidBlockMiB) || !request.options.solid || isZip)) throw new Error('Solid block size requires solid 7z compression and a 1 to 64 MiB choice'); const word=request.options.wordSize; if(word!==undefined && (!Number.isInteger(word) || !(['lzma','lzma2'].includes(method)?word>=5&&word<=273:method==='ppmd'?word>=2&&word<=32:method==='deflate'?word>=3&&word<=258:false))) throw new Error('Word size is unsupported for this compression method'); const names = new Set<string>(); for (const item of request.inputs) {
        safeName(item.name);
        if (names.has(item.name))
            throw new Error('Archive inputs require distinct basenames');
        names.add(item.name);
        await writeFile(join(directory, item.name), item.bytes, { flag: 'wx' });
    } const methodNames={store:'Copy',deflate:'Deflate',lzma2:'LZMA2',lzma:'LZMA',ppmd:'PPMd',bzip2:'BZip2'}; const output = join(directory, 'output.' + (isZip ? 'zip' : '7z')), args = ['a','-spd', isZip ? '-tzip' : '-t7z', '-mx=' + String(request.options.level ?? 6), '-mmt=' + String(request.options.threads ?? 1), (isZip ? '-mm=' : '-m0=') + methodNames[method]]; if (!isZip) {
        args.push('-ms=' + (request.options.solid ? request.options.solidBlockMiB ? request.options.solidBlockMiB+'m' : 'on' : 'off'));
        if (['lzma2','lzma','ppmd'].includes(method))
            args.push((method==='ppmd'?'-mmem=':'-md=') + String(request.options.dictionaryMiB ?? 16) + 'm');
    } if(word!==undefined)args.push((method==='ppmd'?'-mo=':isZip?'-mfb=':'-mfb=')+word); if (request.options.volumeMiB)
        args.push('-v' + request.options.volumeMiB + 'm'); if (encrypted) {
        args.push('-p');
        if (isZip)
            args.push('-mem=AES256');
        else
            args.push('-mhe=' + (request.options.encryption === 'content-and-headers' ? 'on' : 'off'));
    } args.push(output, ...[...names].map(name => join(directory, name))); await this.run(binary, args, directory, signal, encrypted ? password : undefined); const files = (await readdir(directory)).filter(n => n.startsWith('output.')).sort(); if (files.length < 1 || files.length > 32)
        throw new Error('Archive output volumes exceed supported bounds'); const first = join(directory, files[0]); await this.run(binary, ['t','-mmt=1', ...secretArgs, first], directory, signal, password); const listing = this.archiveListing(await this.run(binary, ['l', '-slt','-mmt=1', ...secretArgs, first], directory, signal, password)); if (listing.files.length !== request.inputs.length || request.inputs.some(i => !listing.files.some(f => f.name === i.name && f.bytes === i.bytes.length)))
        throw new Error('Archive reopened contents do not match selected inputs');
        for (const input of request.inputs) {
            const reopened = await this.extractEntry(binary, first, input.name, input.bytes.length, directory, signal, password);
            if (!Buffer.from(input.bytes).equals(reopened)) throw new Error('Archive reopened bytes do not match selected inputs');
        }
        let total = 0; const outputs = []; for (const file of files) {
        const bytes = await readFile(join(directory, file));
        total += bytes.length;
        if (total > MAX_BYTES)
            throw new Error('Archive output exceeds 64 MiB');
        outputs.push({ suffix: file.slice('output'.length), bytes });
    } return { outputs, details:{compression:method,level:request.options.level??6,dictionaryMiB:['lzma2','lzma','ppmd'].includes(method)?request.options.dictionaryMiB??16:null,wordSize:word??null,solid:request.options.solid??false,solidBlockMiB:request.options.solidBlockMiB??null,threads:request.options.threads??1,encryption:request.options.encryption??'none'}, disclosures: ['Archive stores source basenames. Compression options are bounded to 64 MiB dictionary and four threads. Passwords enter controlled stdin only, never argument arrays or durable history. ZIP header encryption and solid mode are unavailable.'] }; }); }
    private archiveListing(source: string) { const marker = source.indexOf('----------'); if (marker < 0) throw new Error('Archive inventory is incomplete'); const records = source.slice(marker + 10).split(/\r?\n\r?\n/); const files: Array<{
        name: string;
        bytes: number;
    }> = []; let total = 0; for (const record of records) {
        const path = /^Path = (.+)$/m.exec(record)?.[1]?.trim();
        if (!path)
            continue;
        if (path.startsWith('/') || /^[A-Za-z]:/.test(path) || path.includes('\\') || path.includes(':') || path.split('/').some(p => !p || p === '..' || p === '.' || /[. ]$/.test(p) || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p)) || path.length > 240 || path.split('/').length > 20 || /[\x00-\x1f]/.test(path))
            throw new Error('Archive path is unsafe');
        if (/Symbolic Link =|Hard Link =|^Mode = l|^Attributes =.*\bL\b/m.test(record))
            throw new Error('Archive links are unsupported');
        if (/^Folder = \+/m.test(record))
            continue;
        const size = Number(/^Size = (\d+)$/m.exec(record)?.[1]);
        if (!Number.isSafeInteger(size) || size < 0)
            throw new Error('Archive size metadata is invalid');
        total += size;
        if (total > MAX_BYTES || files.length >= 250)
            throw new Error('Archive expanded content exceeds limits');
        if (files.some(f => f.name === path))
            throw new Error('Archive contains duplicate paths');
        files.push({ name: path, bytes: size });
    } return { files, total }; }
    private async extractEntry(binary: string, archive: string, name: string, expectedBytes: number, directory: string, signal: AbortSignal, password?: string): Promise<Buffer> {
        return this.execute(binary, ['x', '-so', '-mmt=1', '-spd', archive, name], directory, signal, expectedBytes, 30000, password);
    }
}
export function createBundledEngines(options: BundledEngineOptions) { return new BundledEngines(options); }
