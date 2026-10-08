import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
// Build script deliberately remains a JavaScript module.
// @ts-expect-error JavaScript build helper has no declaration file.
import { postInstallArguments, runGitPostInstall } from '../scripts/git-post-install.mjs';

test('portable post-install uses the documented hidden non-console invocation in its owned stage', async () => {
 const directory = await mkdtemp(path.join(tmpdir(), 'git post-install fixture & '));
 try {
  const shim = path.join(directory, 'launcher-fixture.cjs');
  await writeFile(shim, 'process.stdout.write(JSON.stringify({args:process.argv.slice(2),cwd:process.cwd(),marker:process.env.POST_INSTALL_FIXTURE}));');
  const result = runGitPostInstall(directory, {...process.env, POST_INSTALL_FIXTURE:'isolated'}, (file: string, args: string[], options: Parameters<typeof spawnSync>[2]) => {
   assert.equal(file, path.join(directory,'git-bash.exe'));
   assert.equal(options?.shell, false);
   assert.equal(options?.windowsHide, true);
   assert.equal(options?.timeout, 180000);
   assert.equal(options?.maxBuffer, 2*1024*1024);
   return spawnSync(process.execPath, [shim, ...args], options);
  });
  assert.deepEqual(JSON.parse(result.stdout), {args:['--no-needs-console','--hide','--no-cd','--command=post-install.bat'],cwd:directory,marker:'isolated'});
  assert.equal(Object.isFrozen(postInstallArguments), true);
 } finally { await rm(directory,{recursive:true,force:true}); }
});

test('silent real subprocess failure reports its exit status and bounded safe captured output', () => {
 assert.throws(() => runGitPostInstall('/owned stage', process.env, (_file: string, _args: string[], options: Parameters<typeof spawnSync>[2]) =>
  spawnSync(process.execPath, ['-e', 'process.exit(37)'], {...options,cwd:process.cwd()})), /status=37; signal=none; error=none; detail=\(empty\); stdout=\(empty\); stderr=\(empty\)/);
 const result = {status:null,signal:'SIGTERM',error:Object.assign(new Error('timed out /owned stage'),{code:'ETIMEDOUT'}),stdout:'x'.repeat(5000)+'\nBearer PRIVATEVALUE\npassword=PASSWORDVALUE\nhttps://user:PASSWORDVALUE@example.test/',stderr:'\u001b[31mfailed /owned stage\u001b[0m'};
 assert.throws(() => runGitPostInstall('/owned stage', {}, () => result), (error: Error) => {
  assert.match(error.message,/status=none; signal=SIGTERM; error=ETIMEDOUT/);
  assert.match(error.message,/\[owned stage\]/);
  assert.match(error.message,/Bearer \[redacted\]/);
  assert.doesNotMatch(error.message,/PRIVATEVALUE|PASSWORDVALUE|\u001b/);
  assert.ok(error.message.length<4600);
  return true;
 });
});
