import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, open, readFile, copyFile, rename, rm, mkdtemp, readdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
export const ffmpegSourceManifest = JSON.parse(await readFile(path.join(projectRoot, 'data/ffmpeg-source-build.json'), 'utf8'));
export async function sourceHash(file) {
 const hash = createHash('sha256');
 for await (const chunk of createReadStream(file)) hash.update(chunk);
 return hash.digest('hex');
}

async function acquireSource(item, directory) {
 const target = path.join(directory, item.asset);
 try { if (await sourceHash(target) === item.sha256) return target; } catch {}
 const response = await fetch(item.url, { redirect: 'follow', signal: AbortSignal.timeout(180000) });
 if (!response.ok || !response.body) throw new Error(`Pinned ${item.name} source download returned HTTP ${response.status}`);
 const temporary = target + '.tmp';
 const file = await open(temporary, 'w', 0o600);
 const hash = createHash('sha256');
 let bytes = 0;
 try {
  for await (const part of response.body) {
   bytes += part.length;
   if (bytes > 64 * 1024 * 1024) throw new Error('Source archive exceeds 64 MiB');
   hash.update(part);
   await file.write(part);
  }
  await file.sync();
  if (hash.digest('hex') !== item.sha256) throw new Error(`Pinned ${item.name} source checksum mismatch`);
 } catch (error) {
  await file.close();
  await rm(temporary, { force: true });
  throw error;
 }
 await file.close();
 await rename(temporary, target);
 return target;
}

/** The release input is a complete preferred-source bundle, not a source URL offer. */
export async function verifyFFmpegSourcePayload(directory, platform, converterManifest) {
 const expected = converterManifest.files[platform];
 if (!expected?.['corresponding-source.tar']) throw new Error('No reviewed corresponding-source payload for this platform');
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

function boundedCommand(binary, args, logfile, timeout = 1800000) {
 return new Promise(async (resolve, reject) => {
  const log = await open(logfile, 'w', 0o600);
  const env = { ...process.env };
  for (const key of ['DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH']) delete env[key];
  const child = spawn(binary, args, { shell: false, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let bytes = 0, tail = '', stopped = false;
  const timer = setTimeout(() => { stopped = true; child.kill('SIGKILL'); }, timeout);
  const chunks = [];
  for (const stream of [child.stdout, child.stderr]) stream.on('data', part => {
   bytes += part.length;
   tail = (tail + part.toString('utf8')).slice(-1200);
   if (bytes > 32 * 1024 * 1024) { stopped = true; child.kill('SIGKILL'); return; }
   chunks.push(log.write(part));
  });
  child.once('error', async error => { clearTimeout(timer); await Promise.allSettled(chunks); await log.close(); reject(error); });
  child.once('close', async status => {
   clearTimeout(timer);
   await Promise.allSettled(chunks);
   await log.close();
   if (status !== 0 || stopped) reject(new Error(`Bounded source build failed (${status}); inspect the owned build log. ${tail.replace(/https?:\/\/[^\s/]+:[^\s@]+@/g, '[REDACTED]@')}`));
   else resolve();
  });
 });
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
  for (const name of ['Dockerfile', 'build.sh']) {
   const original = path.join(projectRoot, 'scripts/converter-build', name);
   if (await sourceHash(original) !== ffmpegSourceManifest.recipe[name]) throw new Error('FFmpeg source recipe changed without manifest review');
   await copyFile(original, path.join(recipe, name));
  }
  await copyFile(path.join(projectRoot, 'data/ffmpeg-source-build.json'), path.join(recipe, 'source-manifest.json'));
  const image = 'material-git-converter-builder:' + ffmpegSourceManifest.recipe.Dockerfile.slice(0, 16);
  const docker = ['--host=unix:///var/run/docker.sock'];
  const ca = process.env.CONVERTER_BUILD_CA_BUNDLE ?? process.env.SSL_CERT_FILE ?? '/etc/ssl/certs/ca-certificates.crt';
  await boundedCommand('docker', [...docker, 'build', '--secret', 'id=proxy_ca,src=' + ca, '-t', image, recipe], path.join(cache, platform + '-toolchain.log'), 600000);
  containerName = 'material-git-source-' + platform + '-' + path.basename(stage);
  const mount = (src, dst, readOnly = false) => ['--mount', `type=bind,src=${src},dst=${dst}${readOnly ? ',readonly' : ''}`];
  await boundedCommand('docker', [...docker, 'run', '--rm', '--name', containerName, '--user', process.getuid() + ':' + process.getgid(), '--network=none', '--read-only', '--cap-drop=ALL', '--security-opt=no-new-privileges', '--pids-limit=128', '--memory=4g', '--cpus=4', '--tmpfs', '/build:rw,exec,size=2g,mode=1777', '--tmpfs', '/tmp:rw,exec,size=128m,mode=1777', ...mount(sources, '/sources', true), ...mount(recipe, '/recipe', true), ...mount(output, '/out'), image, 'sh', '/recipe/build.sh', platform], path.join(cache, platform + '-compile.log'));
  const names = await readdir(output);
  for (const name of names) {
   const expected = reviewedOutputs?.[name];
   if (expected && await sourceHash(path.join(output, name)) !== expected) throw new Error('Source build did not reproduce the reviewed output hash: ' + name);
  }
  const destination = bootstrap ? path.join(cache, 'candidate-' + platform) : path.join(root, 'vendor/converters', platform);
  await mkdir(destination, { recursive: true, mode: 0o700 });
  for (const name of Object.keys(reviewedOutputs ?? Object.fromEntries(names.map(name => [name, null])))) await copyFile(path.join(output, name), path.join(destination, name));
  return destination;
 } finally {
  if (containerName) await boundedCommand('docker', ['--host=unix:///var/run/docker.sock', 'rm', '-f', containerName], path.join(cache, platform + '-cleanup.log'), 30000).catch(() => {});
  await rm(stage, { recursive: true, force: true });
 }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
 console.log(await buildFFmpegSourcePayload(process.argv[2] ?? process.platform + '-' + process.arch, projectRoot, process.argv.includes('--bootstrap')));
}
