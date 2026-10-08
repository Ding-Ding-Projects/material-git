import { resolveBuildVersion } from './build-version.mjs';
import packager from '@electron/packager';
import winstaller from 'electron-winstaller';
import { readFile, mkdir, rm, readdir, stat, writeFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));
if (process.platform !== 'win32') throw new Error('Squirrel.Windows packaging requires Windows. Use npm run build for a Linux development build.');
// Reverify the Windows x64 dependency before copying executable payloads.
const { fetchGh } = await import('./fetch-gh.mjs');
await fetchGh('win32', 'x64');
const { fetchGit } = await import('./fetch-git.mjs');
await fetchGit('win32');
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
pkg.version = resolveBuildVersion(pkg.version);
const provenance = JSON.parse(await readFile('dist/main/provenance.json', 'utf8'));
if (provenance.version !== pkg.version) throw new Error(`Build version ${provenance.version} does not match package version ${pkg.version}; rebuild using the same version.`);
await rm('out/app', { recursive: true, force: true });
await rm('out/installer', { recursive: true, force: true });
await mkdir('out/staging', { recursive: true });
await rm('out/staging', { recursive: true, force: true });
await mkdir('out/staging', { recursive: true });
const { cp } = await import('node:fs/promises');
await cp('dist', 'out/staging/dist', { recursive: true });
await cp('assets', 'out/staging/assets', { recursive: true });
// Ship executable payload and license only; downloaded archives remain build caches.
const vendorFiles = [];
async function copyVendor(directory, relative = '') {
 for (const item of await readdir(directory, { withFileTypes: true })) {
  const next = path.join(relative, item.name);
  if (item.isDirectory()) { await copyVendor(path.join(directory, item.name), next); continue; }
  if (!/^(gh\.exe|LICENSE(?:\.txt|\.md)?|COPYING)$/i.test(item.name)) continue;
  if (!next.includes('windows_amd64')) continue;
  const destination = path.join('out/staging/vendor', next);
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(path.join(directory, item.name), destination);
  vendorFiles.push(next);
 }
}
await copyVendor('vendor');
await cp('vendor/git', 'out/staging/vendor/git', { recursive: true });
if (!vendorFiles.some(file => path.basename(file) === 'gh.exe')) throw new Error('Verified Windows x64 GitHub CLI is missing.');
if (!vendorFiles.some(file => /LICENSE|COPYING/i.test(path.basename(file)))) throw new Error('Bundled GitHub CLI license is missing.');
await copyFile('LICENSE', 'out/staging/LICENSE');
const { writeThirdPartyNotices } = await import('./third-party-notices.mjs');
await writeThirdPartyNotices('out/staging/THIRD_PARTY_NOTICES.txt');
await writeFile('out/staging/package.json', JSON.stringify({ name: pkg.name, productName: pkg.productName, version: pkg.version, description: pkg.description, author: pkg.author, license: pkg.license, main: pkg.main }));
const { existsSync } = await import('node:fs');
const [appDirectory] = await packager({ dir: 'out/staging', out: 'out/app', name: 'MaterialGit', executableName: 'MaterialGit', platform: 'win32', arch: 'x64', electronVersion: pkg.devDependencies.electron, asar: { unpackDir: 'vendor' }, overwrite: true, prune: false, ...(existsSync(path.resolve('assets/icon.ico')) ? { icon: path.resolve('assets/icon.ico') } : {}) });
for (const file of ['MaterialGit.exe', 'resources/app.asar']) if (!(await stat(path.join(appDirectory, file))).size) throw new Error(`Empty packaged file: ${file}`);
for (const relative of vendorFiles) {
 const original = await readFile(path.join('out/staging/vendor', relative));
 const unpacked = await readFile(path.join(appDirectory, 'resources/app.asar.unpacked/vendor', relative));
 if (!original.equals(unpacked)) throw new Error(`Packaged vendor payload mismatch: ${relative}`);
}
const { spawnSync } = await import('node:child_process');
const ghExecutable = path.join(appDirectory, 'resources/app.asar.unpacked/vendor', vendorFiles.find(file => path.basename(file) === 'gh.exe'));
const smoke = spawnSync(ghExecutable, ['--version'], { encoding: 'utf8', windowsHide: true, timeout: 30000 });
if (smoke.error || smoke.status !== 0 || !smoke.stdout.startsWith('gh version ')) throw new Error(`Packaged GitHub CLI smoke check failed: ${smoke.error?.message ?? smoke.stderr}`);
console.log(smoke.stdout.trim());
const packagedGit = path.join(appDirectory, 'resources/app.asar.unpacked/vendor/git/cmd/git.exe');
const gitSmoke = spawnSync(packagedGit, ['--version'], { encoding: 'utf8', windowsHide: true, timeout: 30000 });
if (gitSmoke.error || gitSmoke.status !== 0 || !gitSmoke.stdout.includes('git version 2.56.0.windows.2')) throw new Error(`Packaged MinGit smoke check failed: ${gitSmoke.error?.message ?? gitSmoke.stderr}`);
console.log(gitSmoke.stdout.trim());
const icon = path.resolve('assets/icon.ico');
console.log('Creating unsigned Squirrel.Windows installer. Windows may display an unknown-publisher warning.');
await winstaller.createWindowsInstaller({ appDirectory, outputDirectory: 'out/installer', authors: pkg.author, exe: 'MaterialGit.exe', setupExe: 'Setup.exe', name: 'MaterialGit', version: pkg.version, description: pkg.description, noMsi: true, skipUpdateIcon: true, ...(existsSync(icon) ? { setupIcon: icon } : {}) });
const files = await readdir('out/installer');
if (!files.includes('Setup.exe') || !files.includes('RELEASES') || !files.some(name => name.endsWith('-full.nupkg'))) throw new Error('Squirrel output is incomplete.');
const hashes = [];
for (const name of files.filter(name => /^(Setup\.exe|RELEASES)$|\.nupkg$/.test(name))) {
 const bytes = await readFile(path.join('out/installer', name));
 if (bytes.length === 0) throw new Error(`Empty installer asset ${name}`);
 if (name === 'Setup.exe' && bytes.subarray(0, 2).toString() !== 'MZ') throw new Error('Setup.exe is not a Windows executable.');
 const hash = createHash('sha256').update(bytes).digest('hex');
 hashes.push(`${hash}  ${name}`); console.log(`${path.resolve('out/installer', name)} SHA-256 ${hash}`);
}
await writeFile('out/installer/SHA256SUMS', `${hashes.join('\n')}\n`);
