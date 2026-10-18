import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, unlinkSync } from 'node:fs';
import path from 'node:path';

// The pinned upstream batch documents this launcher invocation. It deletes its own
// `post-install.bat` before returning, so run a byte-for-byte sibling copy instead.
// The preserved original is still removed by the upstream script, while the launcher
// never tries to reopen the file that just deleted itself.
export const documentedPostInstallArguments = Object.freeze(['--no-needs-console', '--hide', '--no-cd', '--command=post-install.bat']);
export const postInstallArguments = Object.freeze(['--no-needs-console', '--hide', '--no-cd', '--command=post-install-wrapper.bat']);

function diagnostic(value, directory) {
 return String(value ?? '').replaceAll(directory, '[owned stage]')
  .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '')
  .replace(/[\x00-\x08\x0b-\x1f\x7f]/g, '')
  .replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/gi, '$1[redacted]@')
  .replace(/\b(Bearer)\s+\S+/gi, '$1 [redacted]')
  .replace(/\b(token|password|secret|authorization)(\s*[:=]\s*)[^\s]+/gi, '$1$2[redacted]')
  .slice(-4096).trim() || '(empty)';
}

/** Execute only the reviewed portable post-install entrypoint, with bounded IO. */
export function runGitPostInstall(directory, environment, launch = spawnSync) {
 const original = path.join(directory, 'post-install.bat');
 const wrapper = path.join(directory, 'post-install-wrapper.bat');
 if (!existsSync(original) || existsSync(wrapper)) throw new Error('PortableGit post-install source or wrapper state is invalid');

 // Keep the search path inside this fresh PortableGit stage so its profile scripts
 // cannot select or modify a separate system installation.
 const systemRoot = environment.SystemRoot || environment.WINDIR;
 if (!systemRoot) throw new Error('PortableGit post-install requires the current Windows system root');
 const isolatedEnvironment = {
  ...environment,
  // Never read or write the host's Git system config during staged setup.
  GIT_CONFIG_SYSTEM: path.join(directory, '.verification-empty-system'),
  GIT_CONFIG_NOSYSTEM: '1',
  PATH: [
   path.join(directory, 'cmd'),
   path.join(directory, 'usr', 'bin'),
   path.join(directory, 'ucrt64', 'bin'),
   path.join(systemRoot, 'System32'),
   systemRoot,
  ].join(path.delimiter),
  SystemRoot: systemRoot,
  WINDIR: systemRoot,
  ComSpec: path.join(systemRoot, 'System32', 'cmd.exe'),
  GIT_INSTALL_ROOT: directory,
 };

 copyFileSync(original, wrapper);
 try {
  const result = launch(path.join(directory, 'git-bash.exe'), [...postInstallArguments], {
   encoding: 'utf8', shell: false, windowsHide: true, cwd: directory,
   timeout: 180000, maxBuffer: 2 * 1024 * 1024, env: isolatedEnvironment,
  });
  if (result.error || result.status !== 0) {
   const errorCode = result.error?.code ?? 'none';
   throw new Error(`PortableGit post-install failed: status=${result.status ?? 'none'}; signal=${result.signal ?? 'none'}; error=${errorCode}; detail=${diagnostic(result.error?.message, directory)}; stdout=${diagnostic(result.stdout, directory)}; stderr=${diagnostic(result.stderr, directory)}`);
  }
  if (existsSync(original)) throw new Error('PortableGit post-install did not remove its pinned source batch');
  return result;
 } finally {
  if (existsSync(wrapper)) unlinkSync(wrapper);
 }
}
