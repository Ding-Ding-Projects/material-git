import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, readFile, rm, symlink} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
// Build scripts intentionally remain JavaScript modules.
// @ts-expect-error JavaScript dependency policy module has no declaration file.
import {prepareGitPayload, assertGitPayloadPolicy, stripExcludedGitFilters} from '../scripts/git-payload-policy.mjs';

test('owned PortableGit policy removes only excluded filter sections and preserves native configuration', async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'material-git-payload-'));
 try {
  await mkdir(path.join(directory,'etc/post-install'),{recursive:true});
  const config='[core]\n fscache = true\n[filter "lfs"]\n clean = git-lfs clean -- %f\n process = git-lfs filter-process\n required = true\n[credential]\n helper = manager\n';
  await writeFile(path.join(directory,'etc/gitconfig'),config);
  await writeFile(path.join(directory,'etc/post-install/clean.post'),'echo "native post-install"\n');
  await prepareGitPayload(directory);
  assert.equal(await readFile(path.join(directory,'etc/gitconfig'),'utf8'),'[core]\n fscache = true\n[credential]\n helper = manager\n');
  await assertGitPayloadPolicy(directory);
  assert.equal(stripExcludedGitFilters('[filter.lfs]\nrequired=true\n[user]\nname=Fixture\n'),'[user]\nname=Fixture\n');
 } finally {await rm(directory,{recursive:true,force:true});}
});

test('dependency activation refuses excluded binaries, executable scripts and indirect configuration references',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'material-git-payload-'));
 try {
  await mkdir(path.join(directory,'ucrt64/bin'),{recursive:true});
  const executable=path.join(directory,'ucrt64/bin/git-lfs.exe');
  await writeFile(executable,'excluded fixture, never executed');
  await assert.rejects(assertGitPayloadPolicy(directory),/excluded extension payload/);
  await rm(executable);
  await mkdir(path.join(directory,'etc/post-install'),{recursive:true});
  const script=path.join(directory,'etc/post-install/program.post');
  await writeFile(script,'git lfs install\n');
  await assert.rejects(prepareGitPayload(directory),/post-install script references/);
  await rm(script);
  await writeFile(path.join(directory,'etc/gitconfig'),'[alias]\n external = !git-lfs version\n');
  await assert.rejects(prepareGitPayload(directory),/configuration references/);
  await rm(path.join(directory,'etc/gitconfig'));
  if(process.platform!=='win32') {
   await writeFile(path.join(directory,'foreign-config'),'[core]\n bare=true\n');
   await symlink('../foreign-config',path.join(directory,'etc/gitconfig'));
   await assert.rejects(prepareGitPayload(directory),/regular file/);
  }
 } finally {await rm(directory,{recursive:true,force:true});}
});
