/** Package a reviewed, already-built Windows application with Squirrel.Windows. */
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import winstaller from 'electron-winstaller';

const args=process.argv.slice(2);
if(args.includes('--help')){
 console.log('node scripts/package-app.mjs --app-directory <payload> --exe <App.exe> --name <PackageName> --version <1.2.3> --authors <Author> --output-directory <new-folder>');
 process.exit(0);
}
if(process.platform!=='win32')throw Error('Squirrel.Windows packaging requires Windows. No Windows installer was produced.');
const allowed=new Set(['app-directory','exe','name','version','authors','output-directory']);
const options={};
for(let i=0;i<args.length;i+=2){const key=args[i]?.replace(/^--/,'');if(!allowed.has(key)||!args[i+1]||options[key])throw Error('Invalid or duplicate packaging argument');options[key]=args[i+1];}
for(const key of allowed)if(!options[key])throw Error('Missing --'+key);
if(!/^[A-Za-z][A-Za-z0-9_.-]{0,79}$/.test(options.name))throw Error('Invalid Squirrel package name');
if(!/^\d+\.\d+\.\d+(?:\.\d+)?$/.test(options.version))throw Error('Use a numeric Squirrel package version');
if(path.basename(options.exe)!==options.exe||!options.exe.endsWith('.exe'))throw Error('Choose a payload executable filename');
if(options.authors.length>200||/[\x00-\x1f]/.test(options.authors))throw Error('Invalid authors');
const appDirectory=await fs.realpath(options['app-directory']);
const outputDirectory=path.resolve(options['output-directory']);
if(outputDirectory===appDirectory||outputDirectory.startsWith(appDirectory+path.sep))throw Error('The output directory must be outside the application payload');
let count=0;
async function inspect(directory){for(const entry of await fs.readdir(directory,{withFileTypes:true})){if(++count>50000)throw Error('Payload contains too many entries');const target=path.join(directory,entry.name);const stat=await fs.lstat(target);if(stat.isSymbolicLink())throw Error('Application payload must not contain symbolic links');if(stat.isDirectory())await inspect(target);else if(!stat.isFile())throw Error('Payload contains an unsupported entry');}}
await inspect(appDirectory);
const executable=await fs.readFile(path.join(appDirectory,options.exe));
if(executable.length<64||executable.subarray(0,2).toString()!=='MZ')throw Error('Payload executable is not a Windows PE file');
const peOffset=executable.readUInt32LE(60);
if(peOffset+4>executable.length||executable.subarray(peOffset,peOffset+4).toString()!=='PE\0\0')throw Error('Payload executable has an invalid PE header');
// Exclusive directory creation preserves every existing output directory and its contents.
await fs.mkdir(outputDirectory,{recursive:false});
console.log('Creating an unsigned Squirrel.Windows installer. Windows may display an unknown-publisher warning.');
await winstaller.createWindowsInstaller({appDirectory,outputDirectory,exe:options.exe,name:options.name,version:options.version,authors:options.authors,description:options.name,setupExe:'Setup.exe',noMsi:true,skipUpdateIcon:true});
const files=await fs.readdir(outputDirectory);
if(!files.includes('Setup.exe')||!files.includes('RELEASES')||!files.some(n=>n.endsWith('-full.nupkg')))throw Error('Squirrel did not produce all required installer files');
const releaseText=await fs.readFile(path.join(outputDirectory,'RELEASES'),'utf8');
const hashes=[];
for(const name of files.filter(n=>n==='Setup.exe'||n==='RELEASES'||n.endsWith('.nupkg'))){const bytes=await fs.readFile(path.join(outputDirectory,name));if(!bytes.length)throw Error('Empty installer asset: '+name);if(name==='Setup.exe'&&bytes.subarray(0,2).toString()!=='MZ')throw Error('Setup.exe is not a Windows executable');if(name.endsWith('.nupkg')){if(bytes.subarray(0,2).toString()!=='PK')throw Error('Invalid package archive');const line=releaseText.split(/\r?\n/).find(l=>l.split(/\s+/)[1]===name);if(!line||line.split(/\s+/)[0].toLowerCase()!==createHash('sha1').update(bytes).digest('hex')||Number(line.split(/\s+/)[2])!==bytes.length)throw Error('RELEASES identity mismatch');}const hash=createHash('sha256').update(bytes).digest('hex');hashes.push(`${hash}  ${name}`);console.log(`${path.join(outputDirectory,name)} SHA-256 ${hash} (${bytes.length} bytes)`);}
await fs.writeFile(path.join(outputDirectory,'SHA256SUMS'),hashes.join('\n')+'\n',{flag:'wx'});
