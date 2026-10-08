import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
console.log('Installing pinned dependencies from package-lock.json (npm integrity verification enabled).');
if (!existsSync('package-lock.json')) throw new Error('package-lock.json is required; dependency installation must use the reviewed lockfile.');
const result = spawnSync(npm, ['ci', '--no-audit', '--no-fund'], { stdio: 'inherit', shell: process.platform === 'win32' });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
const { fetchGh } = await import('./fetch-gh.mjs');
await fetchGh();

const { fetchGit } = await import('./fetch-git.mjs');
await fetchGit();

const {fetchConverterEngines}=await import('./fetch-converter-engines.mjs');
await fetchConverterEngines();
