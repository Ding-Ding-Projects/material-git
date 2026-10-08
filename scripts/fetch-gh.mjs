import { createHash } from 'node:crypto';
import { mkdir, writeFile, chmod, mkdtemp, access, rm, rename } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
export const version = '2.102.0';
const checksums = {
 'linux_amd64.tar.gz': 'bb766f710eef8ede859c18578c72c327597cd4c8a85b06001b1f3843c6019386',
 'linux_arm64.tar.gz': '7862c86c72f43df3a2d93ddde6f473285b4e2af61b494849846827e513ef6484',
 'windows_amd64.zip': 'ae64e556ecc240b200f7eba60d550e4bb60d78e860e69dd88c449405b86067f4',
 'windows_arm64.zip': '5dcf12aa8525eabd0c46ec414f323ab6cf65229fc2cd46543cc705001bbaf223',
 'macOS_amd64.zip': 'b245f24eb2bf5f75b426b4c26da3651a107f8d5b6f4fddfbfccc5679041378b3',
 'macOS_arm64.zip': 'da922c20d1792e5b2cbf375593d7a658acf034c12c84e007e71c76ef959c337e'
};
export async function fetchGh(platform = process.platform, arch = process.arch) {
 const os = {linux:'linux',win32:'windows',darwin:'macOS'}[platform];
 const cpu = {x64:'amd64',arm64:'arm64'}[arch];
 const suffix = `${os}_${cpu}.${os === 'linux' ? 'tar.gz' : 'zip'}`;
 if (!checksums[suffix]) throw new Error('Unsupported GitHub CLI platform');
 const file = `gh_${version}_${suffix}`;
 const response = await fetch(`https://github.com/cli/cli/releases/download/v${version}/${file}`);
 if (!response.ok) throw new Error(`Download failed: ${response.status}`);
 const bytes = Buffer.from(await response.arrayBuffer());
 if (createHash('sha256').update(bytes).digest('hex') !== checksums[suffix]) throw new Error('GitHub CLI checksum mismatch');
 const dest = path.resolve('vendor'); await mkdir(dest,{recursive:true});
 const archive = path.join(dest,file); await writeFile(archive,bytes);
 const stage = await mkdtemp(path.join(dest,'.gh-extract-'));
 const directory = `gh_${version}_${os}_${cpu}`;
 const target = path.join(dest,directory);
 try {
  const result = suffix.endsWith('tar.gz') ? spawnSync('tar',['-xzf',archive,'-C',stage]) : process.platform === 'win32' ? spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',`Expand-Archive -LiteralPath '${archive.replaceAll("'","''")}' -DestinationPath '${stage.replaceAll("'","''")}' -Force`]) : spawnSync('unzip',['-o',archive,'-d',stage]);
  if (result.error || result.status !== 0) throw new Error('Archive extraction failed');
  const executable = platform === 'win32' ? 'gh.exe' : 'gh';
  let extracted = path.join(stage,directory);
  try { await access(path.join(extracted,'bin',executable)); }
  catch { extracted=stage; await access(path.join(extracted,'bin',executable)); }
  await access(path.join(extracted,'LICENSE'));
  await rm(target,{recursive:true,force:true});
  await rename(extracted,target);
 } finally { await rm(stage,{recursive:true,force:true}); }
 const binary = path.join(target,'bin',platform === 'win32' ? 'gh.exe' : 'gh');
 if (platform !== 'win32') await chmod(binary,0o755);
 await access(binary);
 return binary;
}
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(await fetchGh());
