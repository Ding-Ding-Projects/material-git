import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Collect upstream license text for every locked production npm dependency. */
export async function writeThirdPartyNotices(outputPath, projectRoot = fileURLToPath(new URL('..', import.meta.url))) {
 const lock = JSON.parse(await readFile(path.join(projectRoot, 'package-lock.json'), 'utf8'));
 if (!lock.packages) throw new Error('A modern reviewed package-lock.json is required for license collection.');
 const sections = ['Material Git third-party notices', 'Bundled GitHub CLI and MinGit retain their upstream license files in vendor.', 'Electron runtime license and Chromium notices are shipped beside the application executable.'];
 for (const [relative, metadata] of Object.entries(lock.packages).sort(([a], [b]) => a.localeCompare(b))) {
  if (!relative || metadata.dev === true || !relative.includes('node_modules/')) continue;
  const directory = path.resolve(projectRoot, relative);
  if (!directory.startsWith(`${path.resolve(projectRoot)}${path.sep}`)) throw new Error(`Dependency path escapes project: ${relative}`);
  const pkg = JSON.parse(await readFile(path.join(directory, 'package.json'), 'utf8'));
  if (metadata.version && pkg.version !== metadata.version) throw new Error(`Installed ${pkg.name} version does not match reviewed lockfile.`);
  const files = (await readdir(directory, { withFileTypes: true })).filter(entry => entry.isFile() && /^(licen[sc]e|copying|notice)(?:[._-].*)?$/i.test(entry.name));
  let sharedLicense;
  // This Lit package publishes SPDX/copyright headers but omits the monorepo LICENSE.
  // The installed Lit package supplies that same upstream BSD-3-Clause license text.
  if (!files.length && pkg.name === '@lit-labs/ssr-dom-shim' && pkg.license === 'BSD-3-Clause') {
    const litDirectory = path.join(projectRoot, 'node_modules/lit');
    const lit = JSON.parse(await readFile(path.join(litDirectory, 'package.json'), 'utf8'));
    if (lit.license !== pkg.license || lit.repository?.url !== pkg.repository?.url) throw new Error('Lit shared license metadata does not match.');
    const source = await readFile(path.join(directory, 'index.js'), 'utf8');
    const copyrightHeader = source.match(/^\/\*\*[\s\S]*?\*\//)?.[0];
    if (!copyrightHeader?.includes('@license')) throw new Error('Lit shim upstream copyright header is missing.');
    sharedLicense = `${copyrightHeader}\n\n${await readFile(path.join(litDirectory, 'LICENSE'), 'utf8')}`;
  }
  if (!files.length && !sharedLicense) throw new Error(`No upstream license or notice file found for production dependency ${pkg.name}@${pkg.version}.`);
  sections.push(`\n===== ${pkg.name}@${pkg.version} =====\nDeclared license: ${typeof pkg.license === 'string' ? pkg.license : JSON.stringify(pkg.license ?? 'unspecified')}\nUpstream: ${typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url ?? pkg.homepage ?? 'See package metadata'}`);
  if (sharedLicense) sections.push(`\n--- Upstream copyright header and shared Lit LICENSE ---\n${sharedLicense}`);
  for (const file of files.sort((a, b) => a.name.localeCompare(b.name))) {
    sections.push(`\n--- ${file.name} ---\n${await readFile(path.join(directory, file.name), 'utf8')}`);
  }
 }
 await writeFile(outputPath, `${sections.join('\n')}\n`);
 console.log(`Collected locked production dependency notices at ${outputPath}`);
 return outputPath;
}
