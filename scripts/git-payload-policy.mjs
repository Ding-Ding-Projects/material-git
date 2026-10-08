import {readdir, readFile, writeFile, lstat} from 'node:fs/promises';
import path from 'node:path';

const configurations = ['etc/gitconfig', 'ucrt64/etc/gitconfig', 'mingw64/etc/gitconfig'];
/** Remove the excluded extension's preconfigured filters from owned dependency files. */
export function stripExcludedGitFilters(text) {
 let excluded = false;
 const lines = text.split(/(?<=\n)/);
 return lines.filter(line => {
  const heading = line.match(/^\s*\[([^\]]+)\]/);
  if (heading) excluded = /^filter\s+"lfs"\s*$/i.test(heading[1]) || /^filter\.lfs\s*$/i.test(heading[1]);
  return !excluded;
 }).join('');
}
async function walk(directory, visit, depth = 0, budget = {count: 0}) {
 if (depth > 30) throw new Error('Git dependency exceeds the supported directory depth');
 for (const entry of await readdir(directory, {withFileTypes: true})) {
  if (++budget.count > 20000) throw new Error('Git dependency exceeds the supported entry count');
  const file = path.join(directory, entry.name);
  await visit(file, entry);
  if (entry.isDirectory()) await walk(file, visit, depth + 1, budget);
 }
}
async function configuration(directory, relative) {
 const file = path.join(directory, relative);
 let details;
 try {details = await lstat(file);} catch (error) {if (error.code === 'ENOENT') return null;throw error;}
 if (!details.isFile() || details.size > 1024 * 1024) throw new Error('Git dependency configuration must be a bounded regular file');
 return {file, text: await readFile(file, 'utf8')};
}
/** Verify extraction excluded the optional extension, without ever invoking it. */
export async function assertGitPayloadPolicy(directory) {
 await walk(directory, async (file, entry) => {
  if (/^git-lfs(?:[.\-]|$)/i.test(entry.name)) throw new Error('Git dependency contains an excluded extension payload');
  if (file.toLowerCase().endsWith('.post')) {
   const details = await lstat(file);
   if (!details.isFile() || details.size > 128 * 1024) throw new Error('Git post-install script must be a bounded regular file');
   if (/\blfs\b/i.test(await readFile(file, 'utf8'))) throw new Error('Git post-install script references an excluded extension');
  }
 });
 for (const relative of configurations) {
  const config = await configuration(directory, relative);
  if (config && /git-lfs|filter\s*(?:\.lfs|"lfs")/i.test(config.text)) throw new Error('Git dependency configuration references an excluded extension');
 }
}
/** This operates only on a fresh task-owned extraction, before activation or scripts. */
export async function prepareGitPayload(directory) {
 for (const relative of configurations) {
  const config = await configuration(directory, relative);
  if (config) await writeFile(config.file, stripExcludedGitFilters(config.text));
 }
 await assertGitPayloadPolicy(directory);
}
