import {createHash,randomUUID} from 'node:crypto';
import {constants,closeSync,existsSync,fstatSync,fsyncSync,lstatSync,mkdirSync,mkdtempSync,openSync,readFileSync,realpathSync,renameSync,rmSync,statSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {homedir} from 'node:os';
import type {GitIgnoreAction,GitIgnoreDocument,GitIgnoreMatch,GitIgnorePreview,GitIgnoreRequest,GitIgnoreResponse} from '../shared/git-ignore';

export interface IgnoreGrant {root:string;gitDir:string;commonDir:string;bare:boolean}
export interface GitIgnoreOptions {resolve:(worktreeId:string)=>IgnoreGrant|Promise<IgnoreGrant>;run:(root:string,argv:string[],input?:string)=>Promise<{output:string;error?:string;exitCode:number|null}>;temporaryDirectory:string;now?:()=>number}
interface Source {file:string;label:string;content:string;fingerprint:string;exists:boolean;mode:number}
interface Context {grant:IgnoreGrant;rootIdentity:string;root:Source;sources:Source[];index:string;indexFingerprint:string;ignoreCase:string;tracked:Set<string>;samples:string[];directory:Set<string>;revision:string;total:number}
interface Review {worktreeId:string;context:Context;content:string;expiresAt:number}
const MAX_BYTES=262144,MAX_SAMPLES=200,MAX_SOURCES=400,TTL=300000;
const digest=(data:string|Buffer)=>createHash('sha256').update(data).digest('hex');
function indexFingerprint(grant:IgnoreGrant){const file=path.join(grant.gitDir,'index');try{const info=lstatSync(file);if(!info.isFile()||info.isSymbolicLink()||info.size>67108864)throw Error('Git index exceeds the safe review limit or is not a regular file.');return digest(readFileSync(file));}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return 'missing';throw error;}}
function samplePath(value:unknown):string {if(typeof value!=='string'||!value||value.length>2048||/[\x00-\x1f\x7f\\]/.test(value)||path.isAbsolute(value)||value.split('/').some(part=>part==='..'||part==='.'||part.toLowerCase()==='.git')||value.startsWith('/'))throw Error('Choose a relative working-tree sample path without parent or metadata segments.');return value;}
function text(value:unknown):string {if(typeof value!=='string'||Buffer.byteLength(value)>MAX_BYTES||value.includes('\0')||value.split('\n').length>4000)throw Error('Ignore content must be UTF-8 text of at most 256 KiB and 4000 lines.');return value;}
function fileSource(file:string,label:string):Source {
 let info;try{info=lstatSync(file);}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return {file,label,content:'',fingerprint:'missing',exists:false,mode:0o644};throw error;}
 if(!info.isFile()||info.isSymbolicLink()||info.size>MAX_BYTES)throw Error('Ignore sources must be regular files no larger than 256 KiB.');
 const fd=openSync(file,constants.O_RDONLY|(constants.O_NOFOLLOW||0));try{const current=fstatSync(fd);if(current.dev!==info.dev||current.ino!==info.ino)throw Error('An ignore source changed while being read.');const bytes=readFileSync(fd),content=bytes.toString('utf8');if(!Buffer.from(content).equals(bytes)||content.includes('\0'))throw Error('Ignore sources must contain valid UTF-8 text.');return {file,label,content,fingerprint:digest(Buffer.concat([Buffer.from(`${info.dev}:${info.ino}:${info.mode}:${info.size}:${info.mtimeMs}:`),bytes])),exists:true,mode:info.mode&0o777};}finally{closeSync(fd);}
}
/** Uses only native-approved worktree grants. Preview never writes to the real working tree. */
export class GitIgnoreService {
 private reviews=new Map<string,Review>();private active=new Set<string>();private now:()=>number;private closed=false;
 constructor(private options:GitIgnoreOptions){this.now=options.now||Date.now;mkdirSync(options.temporaryDirectory,{recursive:true,mode:0o700});if(realpathSync(options.temporaryDirectory)!==path.resolve(options.temporaryDirectory))throw Error('Ignore preview storage cannot traverse symbolic links.');}
 get activeOperations(){return this.active.size;}
 dispose(){this.closed=true;this.reviews.clear();}
 private async resolve(id:string){if(this.closed)throw Error('Ignore service is closed.');const grant=await this.options.resolve(id);if(this.closed)throw Error('Ignore service is closed.');if(grant.bare)throw Error('Ignore rules require a working tree.');if(realpathSync(grant.root)!==grant.root||realpathSync(grant.gitDir)!==grant.gitDir||realpathSync(grant.commonDir)!==grant.commonDir)throw Error('The approved working tree changed. Open it again.');const stat=lstatSync(grant.root);if(!stat.isDirectory()||stat.isSymbolicLink())throw Error('The approved working tree is no longer a directory.');return {grant,identity:`${grant.root}:${stat.dev}:${stat.ino}`};}
 private async run(root:string,argv:string[],input?:string,allowNoMatch=false){const result=await this.options.run(root,argv,input);if(result.exitCode!==0&&!(allowNoMatch&&result.exitCode===1))throw Error(result.error||'Native Git inspection failed.');return result.output;}
 private inside(grant:IgnoreGrant,relative:string){const target=path.join(grant.root,relative);let current=grant.root;for(const segment of relative.split('/').slice(0,-1)){current=path.join(current,segment);if(existsSync(current)){const info=lstatSync(current);if(info.isSymbolicLink()||!info.isDirectory())throw Error('Sample ancestors cannot traverse links or non-directory paths.');}}return target;}
 private async context(id:string,requested?:string[]):Promise<Context>{
  const {grant,identity}=await this.resolve(id),root=fileSource(path.join(grant.root,'.gitignore'),'.gitignore');
  const index=await this.run(grant.root,['ls-files','--stage','-z']),tracked=new Set(index.split('\0').filter(Boolean).map(row=>row.slice(row.indexOf('\t')+1)));
  let candidates:string[];
  if(requested){if(!Array.isArray(requested)||requested.length>MAX_SAMPLES)throw Error('Choose at most 200 sample paths.');candidates=requested.map(samplePath);}else{const listed=await this.run(grant.root,['ls-files','--cached','--others','--exclude-standard','-z']);const ignored=await this.run(grant.root,['ls-files','--others','--ignored','--exclude-standard','-z']);candidates=[...new Set([...listed.split('\0'),...ignored.split('\0')].filter(Boolean))];}
  const total=candidates.length,samples=[...new Set(candidates.slice(0,MAX_SAMPLES).map(samplePath))],directory=new Set<string>(),sources:Source[]=[root],seen=new Set(['.gitignore']);
  for(const value of samples){const relative=value.replace(/\/$/,''),target=this.inside(grant,relative);let isDirectory=value.endsWith('/');try{isDirectory=lstatSync(target).isDirectory();}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}if(isDirectory)directory.add(value);
   const ancestors=relative.split('/').slice(0,-1);for(let index=1;index<=ancestors.length;index++){const local=ancestors.slice(0,index).join('/')+'/.gitignore';if(seen.has(local))continue;seen.add(local);sources.push(fileSource(this.inside(grant,local),local));if(sources.length>MAX_SOURCES)throw Error('Too many nested ignore sources. Narrow the sample selection.');}}
  const infoDirectory=path.join(grant.commonDir,'info');if(existsSync(infoDirectory)&&realpathSync(infoDirectory)!==infoDirectory)throw Error('Repository exclude directory cannot be a symbolic link.');sources.push(fileSource(path.join(infoDirectory,'exclude'),'repository exclude'));
  const global=(await this.run(grant.root,['config','--path','--get','core.excludesFile'],undefined,true)).trim();const globalLocation=global?(path.isAbsolute(global)?global:path.resolve(grant.root,global)):path.join(process.env.XDG_CONFIG_HOME||path.join(homedir(),'.config'),'git','ignore');sources.push(fileSource(globalLocation,'global exclude'));
  if(sources.reduce((sum,source)=>sum+Buffer.byteLength(source.content),0)>2097152)throw Error('Combined ignore sources exceed 2 MiB. Narrow the sample selection.');
  const ignoreCase=(await this.run(grant.root,['config','--bool','--get','core.ignoreCase'],undefined,true)).trim()||'false';
  const indexHash=indexFingerprint(grant),fingerprint=digest(JSON.stringify({identity,index,indexHash,ignoreCase,sources:sources.map(s=>[s.file,s.fingerprint]),samples,directory:[...directory]}));
  return {grant,rootIdentity:identity,root,sources,index,indexFingerprint:indexHash,ignoreCase,tracked,samples,directory,revision:fingerprint,total};
 }
 private document(id:string,context:Context):GitIgnoreDocument {const content=context.root.content,crlf=content.includes('\r\n'),lf=/(?<!\r)\n/.test(content);return {kind:'document',worktreeId:id,content,revision:context.revision,exists:context.root.exists,newline:crlf&&lf?'mixed':crlf?'CRLF':'LF',samples:context.samples,sampleTotal:context.total,sampleLimit:MAX_SAMPLES};}
 private async matches(context:Context,content:string):Promise<Map<string,GitIgnoreMatch['after']>>{
  const temp=mkdtempSync(path.join(this.options.temporaryDirectory,'ignore-preview-'));
  try{await this.run(temp,['-c','init.templateDir=','init','--quiet']);
   for(const source of context.sources){if(!source.exists||source.label==='global exclude'||source.label==='repository exclude')continue;const target=path.join(temp,source.label);mkdirSync(path.dirname(target),{recursive:true});writeFileSync(target,source.label==='.gitignore'?content:source.content,{mode:0o600});}
   writeFileSync(path.join(temp,'.gitignore'),content,{mode:0o600});
   const excludes=context.sources.find(s=>s.label==='repository exclude');mkdirSync(path.join(temp,'.git','info'),{recursive:true});writeFileSync(path.join(temp,'.git','info','exclude'),excludes?.content||'',{mode:0o600});
   const globalFile=path.join(temp,'.git','global-exclude');writeFileSync(globalFile,context.sources.find(s=>s.label==='global exclude')?.content||'',{mode:0o600});
   for(const sample of context.samples){const target=path.join(temp,sample);if(context.directory.has(sample))mkdirSync(target,{recursive:true});else{mkdirSync(path.dirname(target),{recursive:true});if(!existsSync(target))writeFileSync(target,'');}}
   if(!context.samples.length)return new Map();
   const result=await this.run(temp,['--no-literal-pathspecs','-c',`core.ignoreCase=${context.ignoreCase}`,'-c',`core.excludesFile=${globalFile}`,'check-ignore','--no-index','--verbose','--non-matching','-z','--stdin'],context.samples.join('\0')+'\0',true),parts=result.split('\0'),matches=new Map<string,GitIgnoreMatch['after']>();
   for(let index=0;index+3<parts.length;index+=4){const [source,line,pattern,sample]=parts.slice(index,index+4);matches.set(sample,{ignored:!!pattern&&!pattern.startsWith('!'),source:source===globalFile?'global exclude':source==='.git/info/exclude'?'repository exclude':source,line:Number(line)||0,pattern});}return matches;
  }finally{rmSync(temp,{recursive:true,force:true});}
 }
 private async currentMatches(context:Context){const matches=new Map<string,GitIgnoreMatch['before']>();if(!context.samples.length)return matches;const result=await this.run(context.grant.root,['--no-literal-pathspecs','check-ignore','--no-index','--verbose','--non-matching','-z','--stdin'],context.samples.join('\0')+'\0',true),parts=result.split('\0');for(let index=0;index+3<parts.length;index+=4){const [source,line,pattern,sample]=parts.slice(index,index+4);const known=context.sources.find(item=>item.file===source||item.file===path.resolve(context.grant.root,source));matches.set(sample,{ignored:!!pattern&&!pattern.startsWith('!'),source:known?.label||source,line:Number(line)||0,pattern});}return matches;}
 async handle(action:GitIgnoreAction,request:GitIgnoreRequest):Promise<GitIgnoreResponse>{
  if(!request||typeof request!=='object'||Array.isArray(request)||Object.keys(request).some(key=>!['worktreeId','revision','content','samplePaths','reviewId','confirmed'].includes(key))||typeof request.worktreeId!=='string'||!/^[a-f0-9-]{36}$/i.test(request.worktreeId))throw Error('Choose an approved opaque working-tree identity.');
  const id=request.worktreeId;if(this.active.has(id))throw Error('Wait for the active ignore operation.');this.active.add(id);
  try{for(const [key,review] of this.reviews)if(review.expiresAt<this.now())this.reviews.delete(key);
   if(action==='discard'){const review=this.reviews.get(request.reviewId||'');if(review&&review.worktreeId!==id)throw Error('Review belongs to a different working tree.');this.reviews.delete(request.reviewId||'');return {kind:'discarded'};}
   if(action==='read')return this.document(id,await this.context(id));
   if(action==='preview'){const content=text(request.content),context=await this.context(id,request.samplePaths);if(request.revision){const original=await this.context(id);if(original.revision!==request.revision)throw Error('Ignore sources or the index changed. Reload before reviewing.');}
    const [before,after]=await Promise.all([this.currentMatches(context),this.matches(context,content)]);const verified=await this.context(id,context.samples);if(context.revision!==verified.revision)throw Error('Ignore sources changed during preview. Review again.');
    const reviewId=randomUUID(),expiresAt=this.now()+TTL;for(const [key,review] of this.reviews)if(review.worktreeId===id)this.reviews.delete(key);if(this.reviews.size>=32)this.reviews.delete(this.reviews.keys().next().value!);this.reviews.set(reviewId,{worktreeId:id,context,content,expiresAt});
    const empty={ignored:false,source:'',line:0,pattern:''};return {kind:'preview',worktreeId:id,reviewId,expiresAt,existing:context.root.content,proposed:content,changed:content!==context.root.content,sources:context.sources.filter(s=>s.exists).map(s=>s.label),matches:context.samples.map(sample=>({path:sample,tracked:context.tracked.has(sample.replace(/\/$/,'')),directory:context.directory.has(sample),before:before.get(sample)||empty,after:after.get(sample)||empty}))};
   }
   if(action==='save'){if(request.confirmed!==true)throw Error('Review the exact ignore edits before saving.');const review=this.reviews.get(request.reviewId||'');if(!review||review.worktreeId!==id||review.expiresAt<this.now())throw Error('Ignore review expired or was already used. Review again.');this.reviews.delete(request.reviewId!);const current=await this.context(id,review.context.samples);if(current.revision!==review.context.revision)throw Error('Ignore sources, sample kinds or the index changed. Review again.');if(review.content===current.root.content)return {kind:'saved',content:review.content,revision:current.revision};
    const target=path.join(current.grant.root,'.gitignore'),temporary=path.join(current.grant.root,'.material-git-ignore-'+randomUUID()+'.tmp');let descriptor:number|undefined;
    try{descriptor=openSync(temporary,constants.O_CREAT|constants.O_EXCL|constants.O_WRONLY,current.root.exists?current.root.mode:0o644);writeFileSync(descriptor,review.content,'utf8');fsyncSync(descriptor);closeSync(descriptor);descriptor=undefined;
     const final=await this.resolve(id);if(final.identity!==current.rootIdentity||indexFingerprint(current.grant)!==current.indexFingerprint||fileSource(target,'.gitignore').fingerprint!==current.root.fingerprint||current.sources.some(source=>fileSource(source.file,source.label).fingerprint!==source.fingerprint))throw Error('An ignore source changed before save. Review again.');renameSync(temporary,target);
    }finally{if(descriptor!==undefined)closeSync(descriptor);rmSync(temporary,{force:true});}
    const saved=fileSource(target,'.gitignore');if(saved.content!==review.content)throw Error('Ignore save could not be verified. Reload the working file.');return {kind:'saved',content:saved.content,revision:saved.fingerprint};
   }
   throw Error('Unsupported ignore-builder action.');
  }finally{this.active.delete(id);}
 }
}
