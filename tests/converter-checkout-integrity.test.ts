import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,copyFile,rm} from 'node:fs/promises';
import {execFileSync,spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {sourceHash,verifyFFmpegSourcePayload} from '../scripts/ffmpeg-source-build.mjs';

const boundFiles=['data/converter-engines.json','data/ffmpeg-source-build.json','scripts/converter-build/Dockerfile','scripts/converter-build/build.sh','scripts/ffmpeg-source-build.mjs','LICENSE','data/licenses/nodable-val-parsers-MIT.txt'];
const digest=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');

test('real autocrlf checkout reproduces artifact rejection and scoped LF attributes preserve every hash-bound input',async t=>{
 const fixture=await mkdtemp(join(tmpdir(),'material-converter-checkout-')),origin=join(fixture,'origin'),checkout=join(fixture,'windows-checkout'),artifact=join(fixture,'artifact');
 const gitEnv:NodeJS.ProcessEnv={...process.env,GIT_CONFIG_GLOBAL:join(fixture,'empty-git-config'),GIT_CONFIG_NOSYSTEM:'1'};
 for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_CONFIG_COUNT'])delete gitEnv[key as keyof typeof gitEnv];
 const env:NodeJS.ProcessEnv={...gitEnv,GITHUB_ACTIONS:'true',GITHUB_RUN_ID:'314159',GITHUB_RUN_ATTEMPT:'1'};delete env.GITHUB_SHA;
 const git=(args:string[],cwd=origin)=>execFileSync('git',args,{cwd,env:gitEnv,encoding:'utf8',timeout:15000,maxBuffer:1024*1024});
 const invoke=(action:'prepare'|'import',cwd:string)=>spawnSync(process.execPath,[join(cwd,'scripts/converter-artifact.mjs'),action,artifact],{cwd,env,encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
 try{
  await mkdir(origin);await writeFile(gitEnv.GIT_CONFIG_GLOBAL!,'');
  for(const file of [...boundFiles,'scripts/converter-artifact.mjs']){await mkdir(dirname(join(origin,file)),{recursive:true});await copyFile(resolve(file),join(origin,file));}
  await writeFile(join(origin,'ordinary-control.txt'),'Synthetic unbound checkout control.\nSecond line.\n');
  git(['init','--quiet']);git(['config','core.autocrlf','false']);git(['config','user.name','Claude Fable 5.1']);git(['config','user.email','noreply@anthropic.com']);git(['add','.']);git(['commit','--quiet','-m','Synthetic checkout regression baseline']);
  await mkdir(artifact);for(const file of ['converter-engines.json','ffmpeg-source-build.json'])await copyFile(join(origin,'data',file),join(artifact,file));
  const manifest=JSON.parse(await readFile(join(origin,'data/converter-engines.json'),'utf8'));
  let payloadAvailable=false;
  try{
   const payload=resolve('vendor/converters/win32-x64'),proof=await verifyFFmpegSourcePayload(payload,'win32-x64',manifest),destination=join(origin,'vendor/converters/win32-x64');
   await mkdir(destination,{recursive:true});for(const name of [...proof.files,'SOURCE_BUILD.json','corresponding-source.tar'])await copyFile(join(payload,name),join(destination,name));
   payloadAvailable=true;
  }catch{t.diagnostic('Native cross-built payload absent: checkout/recipe hash regression still runs; full payload import is separately covered when acquired.');}
  const bindArtifact=async()=>{
   if(payloadAvailable){const result=invoke('prepare',origin);assert.equal(result.status,0,result.stderr);}
   else await writeFile(join(artifact,'artifact.json'),JSON.stringify({schema:1,platform:'win32-x64',commit:git(['rev-parse','HEAD']).trim(),run:env.GITHUB_RUN_ID,attempt:env.GITHUB_RUN_ATTEMPT,engineManifest:await sourceHash(join(origin,'data/converter-engines.json')),sourceManifest:await sourceHash(join(origin,'data/ffmpeg-source-build.json')),files:{}}));
  };
  await bindArtifact();git(['clone','--quiet','--no-local','--config','core.autocrlf=true',origin,checkout],fixture);
  assert.ok((await readFile(join(checkout,'data/converter-engines.json'),'utf8')).includes('\r\n'),'Actual Git checkout must reproduce Windows CRLF conversion');
  const linuxHash=await sourceHash(join(origin,'data/converter-engines.json')),windowsHash=await sourceHash(join(checkout,'data/converter-engines.json'));assert.notEqual(windowsHash,linuxHash);
  const failed=invoke('import',checkout);assert.notEqual(failed.status,0);assert.match(failed.stderr,/Artifact manifest differs from the checked-out reviewed manifest/);
  t.diagnostic(`Reproduced raw engine manifest SHA mismatch: LF ${linuxHash}; CRLF ${windowsHash}`);
  await copyFile(resolve('.gitattributes'),join(origin,'.gitattributes'));git(['add','.gitattributes']);git(['commit','--quiet','-m','Synthetic scoped LF checkout regression']);
  await bindArtifact();await rm(checkout,{recursive:true,force:true});git(['clone','--quiet','--no-local','--config','core.autocrlf=true',origin,checkout],fixture);
  assert.equal(git(['config','--get','core.autocrlf'],checkout).trim(),'true');
  for(const file of boundFiles){const original=await readFile(join(origin,file)),actual=await readFile(join(checkout,file));assert.deepEqual(actual,original,file);assert.ok(!actual.includes(Buffer.from('\r\n')),file);}
  assert.ok((await readFile(join(checkout,'ordinary-control.txt'),'utf8')).includes('\r\n'),'Policy must remain scoped; unrelated text retains the configured checkout behavior');
  const source=JSON.parse(await readFile(join(checkout,'data/ffmpeg-source-build.json'),'utf8'));
  assert.equal(await sourceHash(join(checkout,'data/ffmpeg-source-build.json')),manifest.engines.ffmpeg.sourceManifestSha256);
  for(const [file,hash]of Object.entries(source.recipe))assert.equal(await sourceHash(join(checkout,file.endsWith('.mjs')?'scripts':'scripts/converter-build',file)),hash,file);
  assert.equal(digest(await readFile(join(checkout,'data/licenses/nodable-val-parsers-MIT.txt'))),'750cb3fb6362804957ef52caaf9b5c824015be44d494637330d7cd8834d31d40');
  if(payloadAvailable){const imported=invoke('import',checkout);assert.equal(imported.status,0,imported.stderr);await verifyFFmpegSourcePayload(join(checkout,'vendor/converters/win32-x64'),'win32-x64',manifest);}
  // Artifact input is never normalized: even semantically identical CRLF manifest bytes must fail.
  const raw=await readFile(join(artifact,'converter-engines.json'),'utf8');await writeFile(join(artifact,'converter-engines.json'),raw.replaceAll('\n','\r\n'));
  const tampered=invoke('import',checkout);assert.notEqual(tampered.status,0);assert.match(tampered.stderr,/Artifact manifest differs from the checked-out reviewed manifest/);
 }finally{await rm(fixture,{recursive:true,force:true});}
});
