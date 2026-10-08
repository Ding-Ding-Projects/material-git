import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, rm, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Digest published by the official git-for-windows/git GitHub release asset API.
export const gitRuntime = Object.freeze({
 version: '2.56.0.2',
 archive: 'MinGit-2.56.0.2-64-bit.zip',
 sha256: 'da35e72aa21c005a5a0d298cfbae110bc1609a815730ea0dde84b01a1b3cd3be',
 source: 'https://github.com/git-for-windows/git/releases/download/v2.56.0.windows.2/MinGit-2.56.0.2-64-bit.zip',
});
const root = fileURLToPath(new URL('..', import.meta.url));
export async function fetchGit(platform = process.platform) {
 if (platform !== 'win32') { console.log('Bundled MinGit targets Windows; Linux development uses the system Git runtime.'); return null; }
 const cache = path.join(root, 'vendor/.downloads');
 await mkdir(cache, { recursive: true });
 const archive = path.join(cache, gitRuntime.archive);
 const digest = bytes => createHash('sha256').update(bytes).digest('hex');
 let bytes;
 try { bytes = await readFile(archive); } catch {}
 if (!bytes || digest(bytes) !== gitRuntime.sha256) {
   console.log(`Fetching MinGit ${gitRuntime.version} from ${gitRuntime.source}`);
   const response = await fetch(gitRuntime.source, { signal: AbortSignal.timeout(180000) });
   if (!response.ok) throw new Error(`MinGit ${gitRuntime.version} download returned HTTP ${response.status} from ${gitRuntime.source}`);
   bytes = Buffer.from(await response.arrayBuffer());
   if (digest(bytes) !== gitRuntime.sha256) throw new Error(`MinGit ${gitRuntime.version} SHA-256 mismatch from ${gitRuntime.source}`);
   const temporary = `${archive}.${randomUUID()}.download`;
   await writeFile(temporary, bytes);
   await rename(temporary, archive);
 }
 // Always activate a fresh extraction of the verified archive; do not trust a warm marker.
 const stage = path.join(root, `vendor/.git-stage-${randomUUID()}`);
 const destination = path.join(root, 'vendor/git');
 const backup = path.join(root, `vendor/.git-backup-${randomUUID()}`);
 const extract = spawnSync('powershell.exe', ['-NoLogo', '-NoProfile', '-Command', 'Expand-Archive -LiteralPath $env:MATERIAL_GIT_ARCHIVE -DestinationPath $env:MATERIAL_GIT_STAGE -ErrorAction Stop'], { encoding: 'utf8', windowsHide: true, env: { ...process.env, MATERIAL_GIT_ARCHIVE: archive, MATERIAL_GIT_STAGE: stage } });
 if (extract.error || extract.status !== 0) { await rm(stage, { recursive: true, force: true }); throw new Error(`MinGit archive extraction failed: ${extract.error?.message ?? extract.stderr}`); }
 let backedUp = false;
 try {
   const executable = path.join(stage, 'cmd/git.exe');
   if (!(await stat(executable)).size) throw new Error('MinGit archive has no cmd/git.exe payload.');
   const license = await readFile(path.join(stage, 'LICENSE.txt'));
   if (!license.length) throw new Error('MinGit archive license is empty.');
   const check = spawnSync(executable, ['--version'], { encoding: 'utf8', windowsHide: true, timeout: 30000 });
   if (check.error || check.status !== 0 || !check.stdout.includes('git version 2.56.0.windows.2')) throw new Error(`MinGit verification failed: ${check.error?.message ?? check.stderr ?? check.stdout}`);
   try { await rename(destination, backup); backedUp = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
   await rename(stage, destination);
   await rm(backup, { recursive: true, force: true });
   console.log(`Verified bundled ${check.stdout.trim()} at ${destination}`);
   return path.join(destination, 'cmd/git.exe');
 } catch (error) {
   if (backedUp) { await rm(destination, { recursive: true, force: true }); await rename(backup, destination); }
   await rm(stage, { recursive: true, force: true });
   throw error;
 }
}
