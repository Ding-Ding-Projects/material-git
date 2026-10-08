import {createHash} from 'node:crypto';
import {existsSync,lstatSync,realpathSync,readdirSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {packStore,packChecksum,validatePackIndex} from './git-packs';

/** Full guarded bytes are bound before any redundant loose copy is removed. */
export function objectStorageSnapshot(commonDir:string){
 const store=packStore(commonDir),objects=path.join(commonDir,'objects'),hash=createHash('sha256').update(store.fingerprint),indexes:string[]=[];let bytes=0,count=0;
 const file=(location:string)=>{const stat=lstatSync(location);if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||realpathSync(location)!==location)throw new Error('Object storage must contain regular files without links');bytes+=stat.size;if(++count>20000||stat.size>67108864||bytes>134217728)throw new Error('Object storage exceeds the 64 MiB per-file, 128 MiB total or 20000-file review limit');hash.update(location).update(String(stat.ino)).update(String(stat.mtimeMs)).update(String(stat.ctimeMs)).update(readFileSync(location));};
 for(const directory of readdirSync(objects).filter(name=>/^[a-f0-9]{2}$/.test(name)).sort()){
  const folder=path.join(objects,directory),stat=lstatSync(folder);if(!stat.isDirectory()||stat.isSymbolicLink()||realpathSync(folder)!==folder)throw new Error('Loose-object directories must stay inside approved metadata');hash.update(directory).update(String(stat.ino));
  for(const name of readdirSync(folder).sort()){if(!/^(?:[a-f0-9]{38}|[a-f0-9]{62})$/.test(name))throw new Error('Loose-object directory contains an unsupported entry');file(path.join(folder,name));}
 }
 if(existsSync(store.directory))for(const name of readdirSync(store.directory).sort()){const location=path.join(store.directory,name);file(location);if(name.endsWith('.idx'))indexes.push(location);}
 return {fingerprint:hash.digest('hex'),objects,indexes,files:count,bytes};
}

export function redundantObjectRows(output:string,root:string,objects:string){
 const seen=new Set<string>();return output.split('\n').filter(Boolean).map(line=>{const match=line.match(/^rm -f (.+)$/);if(!match)throw new Error('Git returned an unexpected redundant-object preview');const location=path.resolve(root,match[1]),relative=path.relative(objects,location),parts=relative.split(path.sep);if(parts.length!==2||!/^[a-f0-9]{2}$/.test(parts[0])||!/^(?:[a-f0-9]{38}|[a-f0-9]{62})$/.test(parts[1])||realpathSync(location)!==location)throw new Error('Redundant object preview is outside approved storage');const id=parts.join('');if(seen.has(id))throw new Error('Git returned duplicate redundant objects');seen.add(id);return {id,label:id.slice(0,12),detail:'Redundant loose copy; packed object remains',data:{object:id}};});
}

export function verifyPackFiles(index:string,format:string){const bytes=readFileSync(index);validatePackIndex(bytes,format);const pack=index.replace(/\.idx$/,'.pack');if(!existsSync(pack))throw new Error('Pack index has no matching object pack');const id=packChecksum(readFileSync(pack),format);if(path.basename(pack)!==`pack-${id}.pack`)throw new Error('Object pack filename does not match its contents');if(bytes.subarray(bytes.length-(format==='sha1'?40:64),bytes.length-(format==='sha1'?20:32)).toString('hex')!==id)throw new Error('Pack index does not match its object pack');return pack;}

export function packExportOptions(fields:Record<string,unknown>){
 if(Object.keys(fields).some(key=>!['name','scope','revision','compression','window','depth','trust'].includes(key)))throw new Error('Use typed object-pack export fields');
 const name=fields.name===undefined?'object-pack-export':fields.name;if(typeof name!=='string'||name.length>80||!/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(name))throw new Error('Choose a simple new export folder name');
 const scope=fields.scope===undefined?'selected-commit':fields.scope;if(typeof scope!=='string'||!['selected-commit','all-references'].includes(scope))throw new Error('Choose selected commit or all references');
 const number=(key:string,fallback:number,min:number,max:number)=>{const value=fields[key]===undefined?fallback:fields[key];if(typeof value!=='number'||!Number.isSafeInteger(value)||value<min||value>max)throw new Error(`Choose a valid ${key}`);return value;};
 return {name,scope:String(scope),argv:['--compression='+number('compression',6,0,9),'--window='+number('window',10,0,100),'--depth='+number('depth',50,0,4095),'--threads=1','--window-memory=64m','--no-reuse-object','--no-reuse-delta','--delta-base-offset','--max-pack-size=128m']};
}

export function parseObjectManifest(output:string,format:string){const length=format==='sha1'?40:format==='sha256'?64:0;if(!length)throw new Error('Unsupported repository object format');const objects=output.split('\n').filter(Boolean);if(!objects.length||objects.length>20000||objects.some(object=>!(new RegExp(`^[a-f0-9]{${length}}$`)).test(object)))throw new Error('Reachable object selection is empty, invalid or exceeds 20000 objects');return [...new Set(objects)].sort();}
export function validateObjectSizes(output:string,objects:string[]){let bytes=0;const lines=output.trimEnd().split('\n');if(lines.length!==objects.length)throw new Error('Git did not resolve the full selected object manifest');for(let i=0;i<lines.length;i++){const match=lines[i].match(/^([a-f0-9]{40}(?:[a-f0-9]{24})?) (blob|tree|commit|tag) (\d+)$/);if(!match||match[1]!==objects[i])throw new Error('Selected object is missing or has an unsupported type');const size=Number(match[3]);bytes+=size;if(!Number.isSafeInteger(bytes)||size>67108864||bytes>134217728)throw new Error('Selected object contents exceed the 64 MiB per-object or 128 MiB total export limit');}return bytes;}
