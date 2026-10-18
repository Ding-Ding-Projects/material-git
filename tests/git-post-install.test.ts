import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
// Build script deliberately remains a JavaScript module.
// @ts-expect-error JavaScript build helper has no declaration file.
import { documentedPostInstallArguments, postInstallArguments, runGitPostInstall } from '../scripts/git-post-install.mjs';

test('portable post-install isolates its path and preserves the self-deleting source batch during launch', async () => {
 const directory = await mkdtemp(path.join(tmpdir(), 'git post-install fixture & '));
 try {
  const original = path.join(directory, 'post-install.bat');
  const wrapper = path.join(directory, 'post-install-wrapper.bat');
  await writeFile(original, '@REM pinned official batch\r\n@DEL post-install.bat\r\n');
  const shim = path.join(directory, 'launcher-fixture.cjs');
  await writeFile(shim, 'process.stdout.write(JSON.stringify({args:process.argv.slice(2),cwd:process.cwd(),marker:process.env.POST_INSTALL_FIXTURE}));');
  const result = runGitPostInstall(directory, {...process.env, SystemRoot:process.env.SystemRoot || 'C:\\Windows', GIT_CONFIG_SYSTEM:'C:\\machine\\gitconfig', GIT_CONFIG_NOSYSTEM:'0', POST_INSTALL_FIXTURE:'isolated'}, (file: string, args: string[], options: Parameters<typeof spawnSync>[2]) => {
   assert.equal(file, path.join(directory,'git-bash.exe'));
   assert.deepEqual(args,['--no-needs-console','--hide','--no-cd','--command=post-install-wrapper.bat']);
   assert.equal(options?.shell, false);
   assert.equal(options?.windowsHide, true);
   assert.equal(options?.timeout, 180000);
   assert.equal(options?.maxBuffer, 2*1024*1024);
   assert.equal(options?.env?.GIT_INSTALL_ROOT,directory);
   assert.equal(options?.env?.GIT_CONFIG_SYSTEM,path.join(directory,'.verification-empty-system'));
   assert.equal(options?.env?.GIT_CONFIG_NOSYSTEM,'1');
   assert.ok(options?.env?.PATH?.startsWith(path.join(directory,'cmd')));
   assert.equal(options?.env?.PATH?.includes(path.join('Program Files','Git')),false);
   assert.ok(existsSync(wrapper));
   assert.equal(readFileSync(wrapper,'utf8'),readFileSync(original,'utf8'));
   unlinkSync(original); // The upstream batch deletes its pinned source on success.
   return spawnSync(process.execPath, [shim, ...args], options);
  });
  assert.deepEqual(JSON.parse(result.stdout), {args:['--no-needs-console','--hide','--no-cd','--command=post-install-wrapper.bat'],cwd:directory,marker:'isolated'});
  assert.equal(existsSync(original),false);
  assert.equal(existsSync(wrapper),false);
  assert.deepEqual(documentedPostInstallArguments,['--no-needs-console','--hide','--no-cd','--command=post-install.bat']);
  assert.equal(Object.isFrozen(postInstallArguments), true);
 } finally { await rm(directory,{recursive:true,force:true}); }
});

test('silent subprocess failure reports bounded safe output and preserves the pinned batch for diagnosis', async () => {
 const directory = await mkdtemp(path.join(tmpdir(), 'git post-install failure & '));
 try {
  const original = path.join(directory,'post-install.bat');
  const wrapper = path.join(directory,'post-install-wrapper.bat');
  await writeFile(original,'@REM pinned official batch\r\n@DEL post-install.bat\r\n');
  const result = {status:null,signal:'SIGTERM',error:Object.assign(new Error(`timed out ${directory}`),{code:'ETIMEDOUT'}),stdout:'x'.repeat(5000)+'\nBearer PRIVATEVALUE\npassword=PASSWORDVALUE\nhttps://user:PASSWORDVALUE@example.test/',stderr:'\u001b[31mfailed /owned stage\u001b[0m'};
  assert.throws(() => runGitPostInstall(directory, {...process.env, SystemRoot:process.env.SystemRoot || 'C:\\Windows', GIT_CONFIG_SYSTEM:'C:\\machine\\gitconfig', GIT_CONFIG_NOSYSTEM:'0'}, (_file: string, _args: string[], options: Parameters<typeof spawnSync>[2]) => {
   assert.equal(options?.env?.GIT_CONFIG_SYSTEM,path.join(directory,'.verification-empty-system'));
   assert.equal(options?.env?.GIT_CONFIG_NOSYSTEM,'1');
   return result;
  }), (error: Error) => {
   assert.match(error.message,/status=none; signal=SIGTERM; error=ETIMEDOUT/);
   assert.match(error.message,/\[owned stage\]/);
   assert.match(error.message,/Bearer \[redacted\]/);
   assert.doesNotMatch(error.message,/PRIVATEVALUE|PASSWORDVALUE|\u001b/);
   assert.ok(error.message.length<4600);
   return true;
  });
  assert.equal(existsSync(original),true);
  assert.equal(existsSync(wrapper),false);
 } finally { await rm(directory,{recursive:true,force:true}); }
});
