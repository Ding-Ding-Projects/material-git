import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, rm, stat, chmod } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Digest published by the official git-for-windows/git GitHub release asset API.
export const gitRuntime = Object.freeze({
 version: '2.56.0.2',
 archive: 'PortableGit-2.56.0.2-64-bit.7z.exe',
 sha256: '075e158ef8e1f0ab80b347e245405d3eca735c2dc88fd8e032e137d0ca61f61b',
 source: 'https://github.com/git-for-windows/git/releases/download/v2.56.0.windows.2/PortableGit-2.56.0.2-64-bit.7z.exe',
});
/** Honor configured proxies and CA trust through supported Node runtime flags. */
async function downloadPinnedSource(source, limit) {
 const script = "const response=await fetch(process.argv[1],{signal:AbortSignal.timeout(180000)});if(!response.ok)throw new Error('Dependency download HTTP '+response.status);let size=0;const chunks=[];for await(const chunk of response.body){size+=chunk.length;if(size>Number(process.argv[2]))throw new Error('Dependency download exceeds its size limit');chunks.push(Buffer.from(chunk));}process.stdout.write(Buffer.concat(chunks));";
 const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.https_proxy || process.env.http_proxy;
 const flags = [];
 if (process.allowedNodeEnvironmentFlags.has('--use-env-proxy')) flags.push('--use-env-proxy');
 else if (proxy) throw new Error('This configured proxy requires a Node runtime with --use-env-proxy support.');
 if (process.allowedNodeEnvironmentFlags.has('--use-system-ca')) flags.push('--use-system-ca');
 const result = spawnSync(process.execPath, [...flags, '--input-type=module', '-e', script, source, String(limit)], {shell:false,windowsHide:true,timeout:190000,maxBuffer:limit+65536});
 if (result.error || result.status !== 0) throw new Error(`Pinned Git dependency download failed: ${result.error?.message || result.stderr.toString().slice(0,4096)}`);
 return result.stdout;
}
const root = fileURLToPath(new URL('..', import.meta.url));
export async function fetchGit(platform = process.platform) {
 if (platform === 'linux') return fetchLinuxGitHelpers();
 if (platform !== 'win32') throw new Error('This Git dependency route supports Windows and Linux.');
 const cache = path.join(root, 'vendor/.downloads');
 await mkdir(cache, { recursive: true });
 const archive = path.join(cache, gitRuntime.archive);
 const digest = bytes => createHash('sha256').update(bytes).digest('hex');
 let bytes;
 try { bytes = await readFile(archive); } catch {}
 if (!bytes || digest(bytes) !== gitRuntime.sha256) {
   console.log(`Fetching PortableGit ${gitRuntime.version} from ${gitRuntime.source}`);
   bytes = await downloadPinnedSource(gitRuntime.source, 100 * 1024 * 1024);
   if (digest(bytes) !== gitRuntime.sha256) throw new Error(`PortableGit ${gitRuntime.version} SHA-256 mismatch from ${gitRuntime.source}`);
   const temporary = `${archive}.${randomUUID()}.download`;
   await writeFile(temporary, bytes);
   await rename(temporary, archive);
 }
 // Always activate a fresh extraction of the verified archive; do not trust a warm marker.
 const stage = path.join(root, `vendor/.git-stage-${randomUUID()}`);
 const destination = path.join(root, 'vendor/git');
 const backup = path.join(root, `vendor/.git-backup-${randomUUID()}`);
 await mkdir(stage, { recursive: true });
 // The official SFX executes its own hidden post-install.bat step. Manual 7z extraction
 // is insufficient according to the bundled README.portable. These switches suppress
 // prompts and bind extraction to this fresh owned stage without a registry install.
 const extract = spawnSync(archive, ['-y', '-gm2', `-InstallPath=${stage}`], { encoding: 'utf8', shell: false, windowsHide: true, timeout: 180000, maxBuffer: 2 * 1024 * 1024, cwd: cache });
 if (extract.error || extract.status !== 0) { await rm(stage, { recursive: true, force: true }); throw new Error(`PortableGit archive extraction failed: ${extract.error?.message ?? extract.stderr}`); }
 let backedUp = false;
 try {
   const check = await verifyGitPayload(stage);
   try { await rename(destination, backup); backedUp = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
   await rename(stage, destination);
   await rm(backup, { recursive: true, force: true });
   console.log(`Verified bundled ${check.gitVersion} at ${destination}`);
   return path.join(destination, 'cmd/git.exe');
 } catch (error) {
   if (backedUp) { await rm(destination, { recursive: true, force: true }); await rename(backup, destination); }
   await rm(stage, { recursive: true, force: true });
   throw error;
 }
}

/** Verify the unpacked full Windows payload before activation and after packaging. */
export async function verifyGitPayload(directory) {
 if (process.platform !== 'win32') throw new Error('Native PortableGit verification requires Windows. Linux archive inspection cannot prove Windows execution.');
 const expected = ['cmd/git.exe', 'usr/bin/bash.exe', 'usr/bin/gpg.exe', 'usr/bin/perl.exe', 'usr/bin/ssh.exe', 'ucrt64/libexec/git-core/git-subtree', 'post-install.bat', 'LICENSE.txt', 'README.portable'];
 for (const relative of expected) if (!(await stat(path.join(directory, relative))).isFile() || !(await stat(path.join(directory, relative))).size) throw new Error(`PortableGit required payload missing: ${relative}`);
 const env = { ...process.env, GIT_CONFIG_GLOBAL: path.join(directory, '.verification-empty-global'), GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0', GIT_PAGER: 'cat' };
 for (const key of Object.keys(env)) if (/^(?:GIT_EXEC_PATH$|GIT_DIR$|GIT_WORK_TREE$|GIT_CONFIG_PARAMETERS$|GIT_CONFIG_KEY_|GIT_CONFIG_VALUE_)/.test(key)) delete env[key];
 env.GIT_CONFIG_COUNT = '0';
 const run = (relative, argv) => spawnSync(path.join(directory, relative), argv, { encoding: 'utf8', shell: false, windowsHide: true, timeout: 30000, maxBuffer: 2 * 1024 * 1024, cwd: directory, env });
 const git = run('cmd/git.exe', ['--version']);
 if (git.error || git.status !== 0 || !git.stdout.includes('git version 2.56.0.windows.2')) throw new Error(`PortableGit version verification failed: ${git.error?.message ?? git.stderr ?? git.stdout}`);
 const bash = run('usr/bin/bash.exe', ['--noprofile', '--norc', '--version']);
 if (bash.error || bash.status !== 0 || !bash.stdout.includes('GNU bash')) throw new Error(`PortableGit Bash verification failed: ${bash.error?.message ?? bash.stderr}`);
 const subtree = run('cmd/git.exe', ['--no-pager', 'subtree', '-h']);
 const help = subtree.stdout + subtree.stderr;
 if (subtree.error || ![0, 129].includes(subtree.status) || !help.includes('git subtree') || /not a git command/.test(help)) throw new Error(`PortableGit subtree verification failed: ${subtree.error?.message ?? help}`);
 const gpg = run('usr/bin/gpg.exe', ['--no-options', '--version']);
 if (gpg.error || gpg.status !== 0 || !gpg.stdout.includes('gpg (GnuPG)')) throw new Error(`PortableGit signing tool verification failed: ${gpg.error?.message ?? gpg.stderr}`);
 return { gitVersion: git.stdout.trim(), bashVersion: bash.stdout.split('\n')[0].trim(), subtreeHelp: true, gpgVersion: gpg.stdout.split('\n')[0].trim() };
}

export const linuxGitHelper = Object.freeze({
 version: '2.56.0', commit: 'a018953688f1b10bddf91bff8747068f5f4746a4',
 source: 'https://raw.githubusercontent.com/git/git/a018953688f1b10bddf91bff8747068f5f4746a4/contrib/subtree/git-subtree.sh',
 sha256: '444416f46ec74b1c5cfed1df07ce89fe32f17b368950c86780079ded3a3577ae',
 licenseSource: 'https://raw.githubusercontent.com/git/git/a018953688f1b10bddf91bff8747068f5f4746a4/COPYING',
 licenseSha256: '5b2198d1645f767585e8a88ac0499b04472164c0d2da22e75ecf97ef443ab32e',
});
/** App-owned Linux helper, never a global Git or shell installation. */
export async function fetchLinuxGitHelpers() {
 if (process.platform !== 'linux') throw new Error('Linux Git helper verification requires Linux.');
 const destination = path.join(root, 'vendor/git-linux');
 await mkdir(destination, { recursive: true });
 for (const [name, source, expected] of [['git-subtree', linuxGitHelper.source, linuxGitHelper.sha256], ['COPYING', linuxGitHelper.licenseSource, linuxGitHelper.licenseSha256]]) {
  const file = path.join(destination, name);
  let bytes;try { bytes = await readFile(file); } catch {}
  const digest = value => createHash('sha256').update(value).digest('hex');
  if (!bytes || digest(bytes) !== expected) {
   bytes = await downloadPinnedSource(source, 65536);
   if (bytes.length > 65536 || digest(bytes) !== expected) throw new Error(`Pinned Git helper integrity mismatch: ${name}`);
   const temporary = `${file}.${randomUUID()}.download`;await writeFile(temporary, bytes, {mode: name === 'git-subtree' ? 0o755 : 0o644});await rename(temporary, file);
  }
  if (name === 'git-subtree') await chmod(file, 0o755);
 }
 const environment = {...process.env, PATH: destination + path.delimiter + (process.env.PATH || ''), GIT_CONFIG_GLOBAL: path.join(destination, '.verification-empty-global'), GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_COUNT: '0'};
 delete environment.GIT_EXEC_PATH;
 const core = spawnSync('git', ['--version'], {encoding:'utf8',shell:false,env:environment,timeout:30000});
 const help = spawnSync('git', ['--no-pager','subtree','-h'], {encoding:'utf8',shell:false,env:environment,timeout:30000});
 if (core.error || core.status !== 0 || help.error || ![0,129].includes(help.status) || !(help.stdout + help.stderr).includes('git subtree')) throw new Error(`Linux Git helper verification failed: ${help.error?.message || help.stderr || core.stderr}`);
 console.log(`Verified ${core.stdout.trim()} with app-owned Git subtree ${linuxGitHelper.version} helper.`);
 return destination;
}
