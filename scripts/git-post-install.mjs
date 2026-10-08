import { spawnSync } from 'node:child_process';
import path from 'node:path';

// This exact invocation is documented in the checksum-bound official batch.
// Requesting a new console is unsuitable for the hidden build worker.
export const postInstallArguments = Object.freeze(['--no-needs-console', '--hide', '--no-cd', '--command=post-install.bat']);

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
 const result = launch(path.join(directory, 'git-bash.exe'), [...postInstallArguments], {
  encoding: 'utf8', shell: false, windowsHide: true, cwd: directory,
  timeout: 180000, maxBuffer: 2 * 1024 * 1024, env: environment,
 });
 if (result.error || result.status !== 0) {
  const errorCode = result.error?.code ?? 'none';
  throw new Error(`PortableGit post-install failed: status=${result.status ?? 'none'}; signal=${result.signal ?? 'none'}; error=${errorCode}; detail=${diagnostic(result.error?.message, directory)}; stdout=${diagnostic(result.stdout, directory)}; stderr=${diagnostic(result.stderr, directory)}`);
 }
 return result;
}
