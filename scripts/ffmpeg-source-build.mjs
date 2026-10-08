import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, open, readFile, copyFile, rename, rm, mkdtemp, readdir, writeFile, stat } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifiedDownload } from './verified-download.mjs';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
export const ffmpegSourceManifest = JSON.parse(await readFile(path.join(projectRoot, 'data/ffmpeg-source-build.json'), 'utf8'));
export async function sourceHash(file) {
 const info = await stat(file);
 if (!info.isFile() || info.size > 150 * 1024 * 1024) throw new Error('Engine/source artifact is not a bounded regular file');
 const hash = createHash('sha256');
 for await (const chunk of createReadStream(file)) hash.update(chunk);
 return hash.digest('hex');
}

async function acquireSource(item,directory){return verifiedDownload(item,directory);}

/** The release input is a complete preferred-source bundle, not a source URL offer. */
export async function verifyFFmpegSourcePayload(directory, platform, converterManifest) {
 const expected = converterManifest.files[platform];
 if (!expected?.['corresponding-source.tar']) throw new Error('No reviewed corresponding-source payload for this platform');
 if (await sourceHash(path.join(directory, 'SOURCE_BUILD.json')) !== expected['SOURCE_BUILD.json']) throw new Error('FFmpeg source proof checksum mismatch');
 const proof = JSON.parse(await readFile(path.join(directory, 'SOURCE_BUILD.json'), 'utf8'));
 if (proof.schema !== 1 || proof.platform !== platform || proof.version !== ffmpegSourceManifest.version || proof.sourceManifest !== await sourceHash(path.join(projectRoot, 'data/ffmpeg-source-build.json'))) throw new Error('FFmpeg source-build identity mismatch');
 for (const source of ffmpegSourceManifest.sources) {
  if (proof.sources[source.asset] !== source.sha256) throw new Error('FFmpeg corresponding-source inventory mismatch');
 }
 for (const name of proof.files) {
  if (!/^[A-Za-z0-9_.-]+$/.test(name) || !expected[name] || await sourceHash(path.join(directory, name)) !== expected[name]) throw new Error(`FFmpeg build payload checksum mismatch: ${name}`);
 }
 for (const name of ['corresponding-source.tar', 'SOURCE_BUILD.json']) {
  if (await sourceHash(path.join(directory, name)) !== expected[name]) throw new Error(`FFmpeg source payload checksum mismatch: ${name}`);
 }
 return proof;
}

async function boundedCommand(binary, args, logfile, timeout = 1800000) {
 const log = await open(logfile, 'w', 0o600);
 return new Promise((resolve, reject) => {
  const env = { ...process.env };
  for (const key of ['DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH']) delete env[key];
  const child = spawn(binary, args, { shell: false, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let bytes = 0, stopped = false, settled = false;
  const timer = setTimeout(() => { stopped = true; child.kill('SIGKILL'); }, timeout);
  let pending = Promise.resolve();
  for (const stream of [child.stdout, child.stderr]) stream.on('data', part => {
   bytes += part.length;
   if (bytes > 32 * 1024 * 1024) { stopped = true; child.kill('SIGKILL'); return; }
   pending = pending.then(() => log.write(part));
  });
  const finish = async error => {
   if (settled) return;
   settled = true;
   clearTimeout(timer);
   try { await pending; await log.close(); } catch (failure) { error ??= failure; }
   error ? reject(error) : resolve();
  };
  child.once('error', error => void finish(error));
  child.once('close', status => void finish(status !== 0 || stopped ? new Error(`Bounded source build failed (${status}); inspect the owned build log.`) : undefined));
 });
}

/** Include every exact source archive and every script controlling the build. */
export async function sealFFmpegSourcePayload(output, platform, sources, recipe) {
 const bundle = await mkdtemp(path.join(path.dirname(output), 'source-payload-'));
 try {
  const selected = (await readdir(output)).filter(name => !name.endsWith('.log') && !['SOURCE_BUILD.json', 'corresponding-source.tar', 'ffmpeg.README'].includes(name)).sort();
  const notices = selected.filter(name => /\.(?:COPYING|LICENSE|COPYRIGHT)$/.test(name));
  const configuration = ['ffmpeg-config.h', 'ffmpeg-config.mak', 'configure-output.txt', 'build-toolchain-packages.txt'];
  for (const directory of ['sources', 'recipe', 'configuration', 'licenses']) await mkdir(path.join(bundle, directory));
  for (const item of ffmpegSourceManifest.sources) {
   if (await sourceHash(path.join(sources, item.asset)) !== item.sha256) throw new Error('Corresponding source archive changed before sealing');
   await copyFile(path.join(sources, item.asset), path.join(bundle, 'sources', item.asset));
  }
  for (const name of await readdir(recipe)) await copyFile(path.join(recipe, name), path.join(bundle, 'recipe', name));
  for (const name of configuration) await copyFile(path.join(output, name), path.join(bundle, 'configuration', name));
  for (const name of notices) await copyFile(path.join(output, name), path.join(bundle, 'licenses', name));
  const readme = `FFmpeg ${ffmpegSourceManifest.version}, target ${platform}\n\nThis package contains the complete exact preferred source archives for FFmpeg and all separately bundled codec libraries, their license notices, build scripts and compiler configuration. No codec patches were applied. The recipe enables only the local-file demuxers and codec presets needed by the application.\n\nBuild on Linux x64 using Docker. Extract the archives to a private sources directory. Build the pinned toolchain with: docker build --secret id=proxy_ca,src=<trusted CA bundle> -t converter-builder recipe\nThen run the recipe/build.sh script in that container with the sources directory mounted read-only at /sources, a writable private output directory at /out, and writable /build and /tmp scratch space. Pass ${platform} as its only argument. The recipe fixes paths, SOURCE_DATE_EPOCH and compiler options; recipe/source-manifest.json records source hashes and reviewed output hashes. Full acquisition and bounded execution are implemented in recipe/ffmpeg-source-build.mjs.\n\nThe standard operating-system C, math and threading libraries and compiler runtime are system libraries/toolchain components rather than separately bundled media libraries. Their runtime notices are retained. Linux requires glibc 2.31 or newer. Windows requires the normal Windows system DLLs; no third-party codec DLLs are needed. Native Windows execution must be verified on Windows.\n\nEach source archive retains its upstream license. FFmpeg and the combined codec build are distributed under GPL version 3 or later. The application communicates with these executables through separate processes.\n`;
  await writeFile(path.join(bundle, 'README.txt'), readme);
  await writeFile(path.join(output, 'ffmpeg.README'), readme);
  await boundedCommand('tar', ['--sort=name', '--format=ustar', '--mtime=@' + ffmpegSourceManifest.sourceDateEpoch, '--owner=0', '--group=0', '--numeric-owner', '--mode=u+rwX,go+rX', '-cf', path.join(output, 'corresponding-source.tar'), '-C', bundle, '.'], path.join(path.dirname(output), platform + '-source-archive.log'), 60000);
  const files = [...selected, 'ffmpeg.README'].sort();
  const proof = { schema: 1, platform, version: ffmpegSourceManifest.version, sourceManifest: await sourceHash(path.join(recipe, 'source-manifest.json')), sources: Object.fromEntries(ffmpegSourceManifest.sources.map(source => [source.asset, source.sha256])), files };
  await writeFile(path.join(output, 'SOURCE_BUILD.json'), JSON.stringify(proof, null, 2) + '\n');
  return files;
 } finally { await rm(bundle, { recursive: true, force: true }); }
}

/** Linux builds both targets; Windows release packaging consumes the reviewed build artifact. */
export async function buildFFmpegSourcePayload(platform = process.platform + '-' + process.arch, root = projectRoot, bootstrap = false) {
 if (!['linux-x64', 'win32-x64'].includes(platform)) throw new Error('Source-built FFmpeg supports Linux x64 and Windows x64');
 if (process.platform !== 'linux' || process.arch !== 'x64') throw new Error('Build the pinned media payload on Linux x64 and supply it as a verified release artifact before Windows packaging');
 const reviewedOutputs = ffmpegSourceManifest.outputHashes[platform];
 if (!reviewedOutputs && !bootstrap) throw new Error('Reviewed output hashes are not ready; --bootstrap only prepares isolated candidates for review');
 const cache = path.join(root, '.cache/converters/source-build');
 await mkdir(cache, { recursive: true, mode: 0o700 });
 const stage = await mkdtemp(path.join(cache, 'build-'));
 const sources = path.join(stage, 'sources'), recipe = path.join(stage, 'recipe'), output = path.join(stage, 'output');
 await Promise.all([sources, recipe, output].map(directory => mkdir(directory, { mode: 0o700 })));
 let containerName;
 try {
  for (const source of ffmpegSourceManifest.sources) await copyFile(await acquireSource(source, cache), path.join(sources, source.asset));
  for (const name of ['Dockerfile', 'build.sh', 'ffmpeg-source-build.mjs', 'verified-download.mjs']) {
   const original = path.join(projectRoot, name.endsWith('.mjs') ? 'scripts' : 'scripts/converter-build', name);
   if (await sourceHash(original) !== ffmpegSourceManifest.recipe[name]) throw new Error('FFmpeg source recipe changed without manifest review');
   await copyFile(original, path.join(recipe, name));
  }
  await copyFile(path.join(projectRoot, 'data/ffmpeg-source-build.json'), path.join(recipe, 'source-manifest.json'));
  await copyFile(path.join(projectRoot, 'LICENSE'), path.join(recipe, 'LICENSE'));
  const image = 'material-git-converter-builder:' + ffmpegSourceManifest.recipe.Dockerfile.slice(0, 16);
  const docker = ['--host=unix:///var/run/docker.sock'];
  const ca = process.env.CONVERTER_BUILD_CA_BUNDLE ?? process.env.SSL_CERT_FILE ?? '/etc/ssl/certs/ca-certificates.crt';
  await boundedCommand('docker', [...docker, 'build', '--secret', 'id=proxy_ca,src=' + ca, '-t', image, recipe], path.join(cache, platform + '-toolchain.log'), 600000);
  containerName = 'material-git-source-' + platform + '-' + path.basename(stage);
  const mount = (src, dst, readOnly = false) => ['--mount', `type=bind,src=${src},dst=${dst}${readOnly ? ',readonly' : ''}`];
  await boundedCommand('docker', [...docker, 'run', '--rm', '--name', containerName, '--user', process.getuid() + ':' + process.getgid(), '--network=none', '--read-only', '--cap-drop=ALL', '--security-opt=no-new-privileges', '--pids-limit=128', '--memory=4g', '--cpus=4', '--tmpfs', '/build:rw,exec,size=2g,mode=1777', '--tmpfs', '/tmp:rw,exec,size=128m,mode=1777', ...mount(sources, '/sources', true), ...mount(recipe, '/recipe', true), ...mount(output, '/out'), image, 'sh', '/recipe/build.sh', platform], path.join(cache, platform + '-compile.log'));
  await sealFFmpegSourcePayload(output, platform, sources, recipe);
  const names = await readdir(output);
  for (const name of names) {
   const expected = reviewedOutputs?.[name];
   if (expected && await sourceHash(path.join(output, name)) !== expected) throw new Error('Source build did not reproduce the reviewed output hash: ' + name);
  }
  if (!bootstrap) await verifyFFmpegSourcePayload(output, platform, JSON.parse(await readFile(path.join(projectRoot, 'data/converter-engines.json'), 'utf8')));
  const destination = bootstrap ? path.join(cache, 'candidate-' + platform) : path.join(root, 'vendor/converters', platform);
  await mkdir(destination, { recursive: true, mode: 0o700 });
  for (const name of bootstrap ? names : [...Object.keys(reviewedOutputs), 'corresponding-source.tar', 'SOURCE_BUILD.json']) await copyFile(path.join(output, name), path.join(destination, name));
  return destination;
 } finally {
  if (containerName) await boundedCommand('docker', ['--host=unix:///var/run/docker.sock', 'rm', '-f', containerName], path.join(cache, platform + '-cleanup.log'), 30000).catch(() => {});
  await rm(stage, { recursive: true, force: true });
 }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
 if ((process.env.HTTPS_PROXY || process.env.HTTP_PROXY) && process.env.NODE_USE_ENV_PROXY !== '1' && !process.execArgv.includes('--use-env-proxy')) {
  const child = spawnSync(process.execPath, ['--use-env-proxy', fileURLToPath(import.meta.url), ...process.argv.slice(2)], { stdio: 'inherit', env: { ...process.env, NODE_USE_ENV_PROXY: '1' } });
  if (child.error || child.status !== 0) throw new Error('Proxy-aware source build failed: ' + (child.error?.message ?? child.status));
 } else console.log(await buildFFmpegSourcePayload(process.argv[2] ?? process.platform + '-' + process.arch, projectRoot, process.argv.includes('--bootstrap')));
}
