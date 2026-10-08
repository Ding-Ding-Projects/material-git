import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile,copyFile,unlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {verifyFFmpegSourcePayload,sourceHash} from '../scripts/ffmpeg-source-build.mjs';
import {prepareConverterArtifact,importConverterArtifact} from '../scripts/converter-artifact.mjs';
const manifest=JSON.parse(await readFile('data/converter-engines.json','utf8'));

async function available(platform:string){try{await verifyFFmpegSourcePayload(resolve('vendor/converters',platform),platform,manifest);return true;}catch{return false;}}

test('corresponding-source payload includes the exact archives, build scripts, configuration and every codec license',async(t)=>{
 const platform=process.platform+'-'+process.arch;
 if(!await available(platform)){t.skip('Reviewed source-built payload absent; run source acquisition on the supported platform');return;}
 const directory=resolve('vendor/converters',platform),proof=await verifyFFmpegSourcePayload(directory,platform,manifest);
 assert.equal(proof.version,'9.0.2-material-git-1');
 assert.equal(Object.keys(proof.sources).length,7);
 assert.ok(proof.files.includes('gcc-runtime.COPYRIGHT'));
 const {execFileSync}=await import('node:child_process');
 if(process.platform==='linux'){
  const names=execFileSync('tar',['-tf',join(directory,'corresponding-source.tar')],{encoding:'utf8',timeout:10000,maxBuffer:1024*1024});
  for(const file of ['recipe/build.sh','recipe/Dockerfile','recipe/ffmpeg-source-build.mjs','recipe/source-manifest.json','configuration/ffmpeg-config.h','configuration/build-toolchain-packages.txt'])assert.ok(names.includes(file),file);
  for(const asset of Object.keys(proof.sources))assert.ok(names.includes('sources/'+asset),asset);
  assert.ok(names.includes('licenses/ffmpeg.LICENSE'));
 }
});

test('missing source and altered build/license bytes cannot be accepted as a redistributable media engine',async(t)=>{
 const platform=process.platform+'-'+process.arch;
 if(!await available(platform)){t.skip('Reviewed source-built payload absent');return;}
 const directory=await mkdtemp(join(tmpdir(),'material-source-negative-'));
 try{
  const proof=await verifyFFmpegSourcePayload(resolve('vendor/converters',platform),platform,manifest);
  for(const name of [...proof.files,'SOURCE_BUILD.json','corresponding-source.tar'])await copyFile(resolve('vendor/converters',platform,name),join(directory,name));
  await unlink(join(directory,'corresponding-source.tar'));
  await assert.rejects(verifyFFmpegSourcePayload(directory,platform,manifest));
  await copyFile(resolve('vendor/converters',platform,'corresponding-source.tar'),join(directory,'corresponding-source.tar'));
  await writeFile(join(directory,'ffmpeg.LICENSE'),'Synthetic invalid license replacement');
  await assert.rejects(verifyFFmpegSourcePayload(directory,platform,manifest),/checksum/);
  await copyFile(resolve('vendor/converters',platform,'ffmpeg.LICENSE'),join(directory,'ffmpeg.LICENSE'));
  await writeFile(join(directory,'SOURCE_BUILD.json'),'{"schema":1,"files":[]}');
  await assert.rejects(verifyFFmpegSourcePayload(directory,platform,manifest),/checksum/);
 }finally{await rm(directory,{recursive:true,force:true});}
});

test('same-run artifact verification rejects changed attempts, extra payloads and mismatched manifests before installation',async(t)=>{
 if(!await available('win32-x64')){t.skip('Reviewed cross-built Windows source payload absent');return;}
 const artifact=await mkdtemp(join(tmpdir(),'material-source-artifact-'));
 const keys=['GITHUB_SHA','GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT','GITHUB_ACTIONS'];
 const prior=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
 try{
  delete process.env.GITHUB_SHA;process.env.GITHUB_RUN_ID='123456';process.env.GITHUB_RUN_ATTEMPT='2';process.env.GITHUB_ACTIONS='true';
  await prepareConverterArtifact(artifact);
  const original=await readFile(join(artifact,'artifact.json'),'utf8');
  process.env.GITHUB_RUN_ATTEMPT='3';
  await assert.rejects(importConverterArtifact(artifact),/exact workflow run/);
  process.env.GITHUB_RUN_ATTEMPT='2';
  await writeFile(join(artifact,'payload','unexpected.exe'),'synthetic extra file');
  await assert.rejects(importConverterArtifact(artifact),/extra/);
  await unlink(join(artifact,'payload','unexpected.exe'));
  await writeFile(join(artifact,'converter-engines.json'),'{}');
  await assert.rejects(importConverterArtifact(artifact),/manifest/);
  await copyFile('data/converter-engines.json',join(artifact,'converter-engines.json'));
  const before=await sourceHash(resolve('vendor/converters/win32-x64/ffmpeg.exe'));
  await importConverterArtifact(artifact);
  assert.equal(await sourceHash(resolve('vendor/converters/win32-x64/ffmpeg.exe')),before);
  assert.equal(await readFile(join(artifact,'artifact.json'),'utf8'),original);
 }finally{for(const key of keys){if(prior[key]===undefined)delete process.env[key];else process.env[key]=prior[key];}await rm(artifact,{recursive:true,force:true});}
});
