import { readFile, mkdir, copyFile, stat, readdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sourceHash, verifyFFmpegSourcePayload } from './ffmpeg-source-build.mjs';
const root = fileURLToPath(new URL('..', import.meta.url));
const manifest = JSON.parse(await readFile(path.join(root, 'data/converter-engines.json'), 'utf8'));
function identity() {
 const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
 if (process.env.GITHUB_SHA && process.env.GITHUB_SHA !== commit) throw new Error('Artifact commit differs from the checked-out workflow source');
 const run = process.env.GITHUB_RUN_ID ?? 'local', attempt = process.env.GITHUB_RUN_ATTEMPT ?? 'local';
 if (process.env.GITHUB_ACTIONS === 'true' && (!/^\d+$/.test(run) || !/^\d+$/.test(attempt))) throw new Error('Same-run artifact identity is missing');
 return { commit, run, attempt };
}
async function boundedJson(file) {
 const info = await stat(file);
 if (!info.isFile() || info.size > 1024 * 1024) throw new Error('Artifact metadata is not a bounded regular file');
 return JSON.parse(await readFile(file, 'utf8'));
}
export async function prepareConverterArtifact(destination, platform = 'win32-x64') {
 const directory = path.join(root, 'vendor/converters', platform);
 const proof = await verifyFFmpegSourcePayload(directory, platform, manifest);
 await mkdir(path.join(destination, 'payload'), { recursive: true });
 const files = {};
 for (const name of [...proof.files, 'corresponding-source.tar', 'SOURCE_BUILD.json']) {
  files[name] = manifest.files[platform][name];
  await copyFile(path.join(directory, name), path.join(destination, 'payload', name));
 }
 for (const [filename, source] of [['converter-engines.json', 'data/converter-engines.json'], ['ffmpeg-source-build.json', 'data/ffmpeg-source-build.json']]) await copyFile(path.join(root, source), path.join(destination, filename));
 await writeFile(path.join(destination, 'artifact.json'), JSON.stringify({ schema: 1, ...identity(), platform, engineManifest: await sourceHash(path.join(root, 'data/converter-engines.json')), sourceManifest: await sourceHash(path.join(root, 'data/ffmpeg-source-build.json')), files }, null, 2));
 return destination;
}
export async function importConverterArtifact(source) {
 const index = await boundedJson(path.join(source, 'artifact.json')), current = identity();
 if (index.schema !== 1 || index.platform !== 'win32-x64' || index.commit !== current.commit || index.run !== current.run || index.attempt !== current.attempt) throw new Error('Converter artifact is not from this exact workflow run, attempt and source commit');
 for (const [field, file] of [['engineManifest', 'converter-engines.json'], ['sourceManifest', 'ffmpeg-source-build.json']]) {
  const expected = await sourceHash(path.join(root, 'data', file));
  if (index[field] !== expected || await sourceHash(path.join(source, file)) !== expected) throw new Error('Artifact manifest differs from the checked-out reviewed manifest');
 }
 const payload = path.join(source, 'payload');
 const proof = await verifyFFmpegSourcePayload(payload, index.platform, manifest);
 const names = [...proof.files, 'corresponding-source.tar', 'SOURCE_BUILD.json'];
 if (!index.files || Object.keys(index.files).length !== names.length || (await readdir(payload)).length !== names.length) throw new Error('Artifact has missing or extra executable/source payload files');
 for (const name of names) if (index.files[name] !== manifest.files[index.platform][name]) throw new Error('Artifact file digest inventory differs from the reviewed manifest');
 const destination = path.join(root, 'vendor/converters', index.platform);
 await mkdir(destination, { recursive: true });
 for (const name of names) await copyFile(path.join(payload, name), path.join(destination, name));
 return destination;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
 const [action, directory] = process.argv.slice(2);
 if (!directory || !['prepare', 'import'].includes(action)) throw new Error('Use converter-artifact.mjs prepare|import <owned-directory>');
 console.log(await (action === 'prepare' ? prepareConverterArtifact(path.resolve(directory)) : importConverterArtifact(path.resolve(directory))));
}
