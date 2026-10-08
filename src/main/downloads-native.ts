import {spawn} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {constants} from 'node:fs';
import {lstat,mkdir,open,rename,unlink} from 'node:fs/promises';
import path from 'node:path';
import type {ApprovedHost} from './auth-hosts';
import {vaultAvailable,type SecretVault} from './security';
import type {DownloadDependencies,DownloadSource,StoredDownload} from './downloads';
import {validateDownloadSelection,type DownloadSelection} from '../shared/downloads';

/** Private captures never enter the command engine, renderer history or diagnostic output. */
export interface DownloadPrivateProcess {argv:readonly string[];hostname:string;maxBytes:number}
export interface NativeDownloadOptions {
 binary:string;cwd:string;directory:string;vault:SecretVault;
 resolveHost(hostname:string):ApprovedHost;
 pickDestination(suggestedName:string):Promise<string|null>;
 /** Inject the native manual-redirect transport; Electron net.fetch cannot expose every redirect. */
 fetch:typeof fetch;
 run?:(request:DownloadPrivateProcess)=>Promise<string>;
 approveRedirect?:DownloadDependencies['approveRedirect'];
}
const MAX_METADATA=2*1024*1024;
const fail=(message='The native download provider could not verify this request.')=>new Error(message);
function accountId(value:unknown):string {
 if(typeof value==='number'&&Number.isSafeInteger(value)&&value>0)return String(value);
 if(typeof value==='string'&&/^[1-9]\d{0,19}$/.test(value))return value;
 throw fail('The signed-in account could not be verified.');
}
function record(value:unknown):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))throw fail();return value as Record<string,unknown>;}
function parse(raw:string):Record<string,unknown>{try{return record(JSON.parse(raw));}catch{throw fail();}}
const fingerprint=(hostname:string,id:string)=>createHash('sha256').update(JSON.stringify(['material-git-download-account-v1',hostname,id])).digest('hex');

/** Tokens are captured with bounded pipes and fixed errors, never shell text or logged argv. */
function privateRunner(options:NativeDownloadOptions){return async({argv,hostname,maxBytes}:DownloadPrivateProcess):Promise<string>=>new Promise((resolve,reject)=>{
 const env:NodeJS.ProcessEnv={...process.env,GH_HOST:hostname,GH_PROMPT_DISABLED:'1',GH_PAGER:'cat',PAGER:'cat'};delete env.GH_DEBUG;
 let settled=false,bytes=0;const chunks:Buffer[]=[];
 const child=spawn(options.binary,[...argv],{cwd:options.cwd,env,shell:false,windowsHide:true,stdio:['pipe','pipe','pipe'],detached:process.platform!=='win32'});
 const stop=()=>{if(process.platform==='win32')child.kill();else if(child.pid)try{process.kill(-child.pid,'SIGKILL');}catch{child.kill();}};
 const finish=(error?:Error)=>{if(settled)return;settled=true;clearTimeout(timer);if(error){stop();reject(error);}else resolve(Buffer.concat(chunks).toString('utf8'));};
 const timer=setTimeout(()=>finish(fail('The download account request timed out.')),30000);
 child.stdin.end();child.stderr.resume();child.stdout.on('data',(chunk:Buffer)=>{bytes+=chunk.length;if(bytes>maxBytes)finish(fail('The download provider response exceeded its limit.'));else chunks.push(chunk);});
 child.on('error',()=>finish(fail('The GitHub CLI could not start the download request.')));child.on('close',code=>finish(code===0?undefined:fail('Sign in to the approved GitHub host and retry this download.')));
 });}

function protectedStore(directory:string,vault:SecretVault):DownloadDependencies['store'] {
 const durable=vaultAvailable(vault);const file=path.join(directory,'downloads.encrypted');let memory:StoredDownload[]=[];let serial:Promise<unknown>=Promise.resolve();
 const encode=(rows:StoredDownload[])=>{if(!Array.isArray(rows)||rows.length>200)throw fail('Download recovery data exceeds its limit.');let raw:string;try{raw=JSON.stringify({version:1,records:rows});}catch{throw fail('Download recovery data is invalid.');}if(Buffer.byteLength(raw)>MAX_METADATA)throw fail('Download recovery data exceeds its limit.');return raw;};
 return {get durable(){return durable&&vaultAvailable(vault);},async read(){
  if(!durable)return structuredClone(memory);
  if(!vaultAvailable(vault))throw fail('Operating-system encrypted download storage is unavailable.');
  let handle;try{const before=await lstat(file);if(!before.isFile()||before.isSymbolicLink())throw fail();handle=await open(file,constants.O_RDONLY|(constants.O_NOFOLLOW??0));const stat=await handle.stat();if(!stat.isFile()||stat.dev!==before.dev||stat.ino!==before.ino||stat.size>MAX_METADATA+65536)throw fail();const encrypted=await handle.readFile();const raw=vault.decryptString(encrypted);if(!vaultAvailable(vault)||Buffer.byteLength(raw)>MAX_METADATA)throw fail();const data=record(JSON.parse(raw));if(data.version!==1||Object.keys(data).some(key=>!['version','records'].includes(key))||!Array.isArray(data.records)||data.records.length>200)throw fail();return structuredClone(data.records);
  }catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return [];throw fail('Encrypted download recovery data is unavailable or invalid.');}finally{await handle?.close();}
 },async write(rows){const raw=encode(rows);if(!durable){memory=JSON.parse(raw).records;return;}const operation=serial.catch(()=>{}).then(async()=>{
  if(!vaultAvailable(vault))throw fail('Operating-system encrypted download storage is unavailable.');
  const temporary=file+'.'+randomUUID()+'.tmp';let handle;try{const encrypted=vault.encryptString(raw);if(!vaultAvailable(vault)||encrypted.length>MAX_METADATA+65536)throw fail();await mkdir(directory,{recursive:true,mode:0o700});const folderStat=await lstat(directory);if(!folderStat.isDirectory()||folderStat.isSymbolicLink())throw fail();handle=await open(temporary,'wx',0o600);await handle.writeFile(encrypted);await handle.sync();await handle.close();handle=undefined;await rename(temporary,file);if(process.platform!=='win32'){const folder=await open(directory,constants.O_RDONLY);try{await folder.sync();}finally{await folder.close();}}}catch{throw fail('Encrypted download recovery data could not be saved.');}finally{await handle?.close().catch(()=>{});await unlink(temporary).catch(()=>{});}
 });serial=operation;await operation;}};
}

async function boundedJSON(response:Response):Promise<Record<string,unknown>> {
 if(response.status!==200||!response.body){await response.body?.cancel();throw fail('The download credential could not be verified.');}
 const reader=response.body.getReader();let bytes=0;const chunks:Uint8Array[]=[];
 try{for(;;){const part=await reader.read();if(part.done)break;bytes+=part.value.length;if(bytes>65536)throw fail();chunks.push(part.value);}return parse(Buffer.concat(chunks).toString('utf8'));}finally{await reader.cancel().catch(()=>{});}
}

/** Approved provider IDs and native-picked paths are the only download inputs. */
export function createNativeDownloadDeps(options:NativeDownloadOptions):DownloadDependencies {
 const run=options.run??privateRunner(options);const hosts=new Map<string,ApprovedHost>();
 function host(hostname:string){const approved=options.resolveHost(hostname);const rest=new URL(approved.restOrigin);if(approved.hostname!==hostname||rest.protocol!=='https:'||rest.username||rest.password||rest.search||rest.hash||rest.pathname!=='/'&&rest.pathname!=='/api/v3')throw fail('Choose an approved HTTPS GitHub host.');hosts.set(hostname,{...approved});return approved;}
 async function capture(hostname:string,argv:string[],maxBytes=65536){host(hostname);try{const result=await run({hostname,argv,maxBytes});if(Buffer.byteLength(result)>maxBytes)throw fail();return result;}catch{throw fail('Sign in to the approved GitHub host and retry this download.');}}
 async function api(hostname:string,endpoint:string){return parse(await capture(hostname,['api',`--hostname=${hostname}`,'--method=GET','--',endpoint]));}
 async function identity(hostname:string){const user=await api(hostname,'user');return {id:accountId(user.id),login:typeof user.login==='string'&&/^[A-Za-z0-9][A-Za-z0-9-]{0,99}$/.test(user.login)?user.login:(()=>{throw fail('The signed-in account could not be verified.');})()};}
 const nativeFetch:typeof fetch=async(input,init)=>{
  const request=input instanceof Request?input:undefined;const url=new URL(request?.url??String(input));
  for(const approved of hosts.values()){const rest=new URL(approved.restOrigin);if(!url.search&&url.origin===rest.origin&&/^\/repos\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/(?:releases\/assets\/[1-9]\d{0,15}|actions\/artifacts\/[1-9]\d{0,15}\/zip)$/.test(url.pathname)){url.pathname=(rest.pathname==='/'?'':rest.pathname)+url.pathname;break;}}
  return options.fetch(request?new Request(url,request):url,init);
 };
 return {fetch:nativeFetch,approveRedirect:options.approveRedirect,pickDestination:options.pickDestination,store:protectedStore(options.directory,options.vault),
  async accountFingerprint(hostname){host(hostname);const user=await identity(hostname);return fingerprint(hostname,user.id);},
  async token(hostname,expectedAccount){
   const approved=host(hostname);if(!/^[a-f0-9]{64}$/.test(expectedAccount))throw fail('The download account has changed.');
   const before=await identity(hostname);if(fingerprint(hostname,before.id)!==expectedAccount)throw fail('The download account has changed.');
   // The active lookup preserves environment credentials; --user would suppress them.
   // Binding comes from immutable provider IDs on both sides of the private lookup.
   const token=(await capture(hostname,['auth','token',`--hostname=${hostname}`],16384)).trim();if(!token||token.length>16384||/\s|[\x00-\x1f\x7f]/.test(token))throw fail('The download credential is unavailable.');
   const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),30000);
   try{const effective=await boundedJSON(await options.fetch(new URL(approved.restOrigin.replace(/\/$/,'')+'/user'),{headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${token}`},redirect:'manual',signal:controller.signal}));if(fingerprint(hostname,accountId(effective.id))!==expectedAccount||fingerprint(hostname,(await identity(hostname)).id)!==expectedAccount)throw fail('The download account has changed.');return token;}catch{throw fail('The download credential could not be bound to the selected account.');}finally{clearTimeout(timer);}
  },async resolveSource(input){
   const selection=validateDownloadSelection(input);const approved=host(selection.hostname);const base=`/repos/${selection.repository}/${selection.kind==='release-asset'?'releases/assets':'actions/artifacts'}/${selection.id}`;
   const data=await api(selection.hostname,base.slice(1));if(accountId(data.id)!==selection.id||typeof data.name!=='string'||!data.name||data.name.length>512||/[\x00-\x1f\x7f]/.test(data.name))throw fail('The selected download record has changed.');
   const expected=approved.restOrigin.replace(/\/$/,'')+base;if(data.url!==expected)throw fail('The selected download location has changed.');
   if(selection.kind==='artifact'&&(data.expired!==false||typeof data.expires_at==='string'&&(!Number.isFinite(Date.parse(data.expires_at))||Date.parse(data.expires_at)<=Date.now())||data.archive_download_url!==expected+'/zip'))throw fail('The selected artifact is expired or unavailable.');
   let sha256:string|undefined;if(data.digest!==undefined&&data.digest!==null){if(typeof data.digest!=='string'||!/^sha256:[a-f0-9]{64}$/i.test(data.digest))throw fail('The selected download digest is invalid.');sha256=data.digest.slice(7).toLowerCase();}
   const source:DownloadSource={selection,apiOrigin:new URL(approved.restOrigin).origin,endpoint:base+(selection.kind==='artifact'?'/zip':''),name:data.name,...(sha256?{sha256}:{})};
   if(selection.kind==='release-asset'){if(typeof data.size!=='number'||!Number.isSafeInteger(data.size)||data.size<0)throw fail('The selected download length is invalid.');source.size=data.size;}
   return source;
  }};
}
