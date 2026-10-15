import {spawn} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {constants} from 'node:fs';
import {lstat,mkdir,open,realpath,rename,unlink} from 'node:fs/promises';
import path from 'node:path';
import type {Readable} from 'node:stream';
import type {AuthState} from '../shared/types';
import type {ApprovedHost} from './auth-hosts';
import type {DownloadDependencies} from './downloads';
import type {NativeRequestInit} from './electron-fetch';
import {vaultAvailable,type SecretVault} from './security';
import {redactGit} from './git-process';

/** Native binary Git output is required for exact pointer and key commit proofs. */
export function createRepositoryGitRunner(binary:string,hooksDirectory:string){
 return async(request:{root:string;argv:ReadonlyArray<string>;input?:string|Buffer;signal?:AbortSignal;maximumBytes:number})=>{
  if(!Number.isSafeInteger(request.maximumBytes)||request.maximumBytes<1||request.maximumBytes>64*1024*1024)throw Error('Invalid native Git response limit');
  request.signal?.throwIfAborted();
  const environment={...process.env};
  for(const key of Object.keys(environment))if(/^(?:GIT_|SSH_ASKPASS|GCM_INTERACTIVE)/.test(key))delete environment[key];
  const args=['--no-pager','--literal-pathspecs','-c','color.ui=false','-c','core.quotePath=false','-c','core.fsmonitor=false','-c',`core.hooksPath=${hooksDirectory}`,'-c','credential.helper=','-c','core.sshCommand=ssh -oBatchMode=yes','-c','protocol.allow=never','-c','maintenance.auto=false','-c','gc.auto=0',...request.argv];
  return new Promise<{exitCode:number;stdout:Buffer;stderr:string}>((resolve,reject)=>{
   const child=spawn(binary,args,{cwd:request.root,shell:false,windowsHide:true,detached:process.platform!=='win32',env:{...environment,GIT_TERMINAL_PROMPT:'0',GIT_NO_LAZY_FETCH:'1',GIT_CONFIG_COUNT:'0',GIT_PAGER:'cat',GIT_EDITOR:'true'},stdio:['pipe','pipe','pipe']});
   let settled=false,bytes=0;const out:Buffer[]=[],err:Buffer[]=[];
   const stop=()=>{if(process.platform==='win32'&&child.pid){spawn('taskkill',['/PID',String(child.pid),'/T','/F'],{shell:false,windowsHide:true,stdio:'ignore'});}else if(child.pid){try{process.kill(-child.pid,'SIGKILL');}catch{child.kill();}}};
   const done=(error?:Error,code=-1)=>{if(settled)return;settled=true;clearTimeout(timer);request.signal?.removeEventListener('abort',abort);if(error){stop();reject(error);}else resolve({exitCode:code,stdout:Buffer.concat(out),stderr:redactGit(Buffer.concat(err).toString('utf8'))});};
   const abort=()=>done(Error('Repository operation cancelled'));
   const timer=setTimeout(()=>done(Error('Repository operation exceeded its time limit')),120000);timer.unref();
   for(const [stream,chunks]of [[child.stdout,out],[child.stderr,err]] as const)stream.on('data',(chunk:Buffer)=>{bytes+=chunk.length;if(bytes>request.maximumBytes)done(Error('Repository output exceeded its reviewed limit'));else chunks.push(chunk);});
   child.on('error',()=>done(Error('Native Git could not start')));child.on('close',code=>done(undefined,code??-1));child.stdin.on('error',()=>{});child.stdin.end(request.input);
   request.signal?.addEventListener('abort',abort,{once:true});if(request.signal?.aborted)abort();
  });
 };
}

/** Dedicated encrypted secret files never enter workspace records or ordinary exports. */
export function createRepositorySecrets(directory:string,vault:SecretVault){
 const filename=(key:string)=>{if(!/^[A-Za-z0-9_-]{1,160}$/.test(key))throw Error('Invalid native secret identity');return path.join(directory,createHash('sha256').update(key).digest('hex')+'.encrypted');};
 const checkedDirectory=async()=>{await mkdir(directory,{recursive:true,mode:0o700});if(await realpath(directory)!==path.resolve(directory)||(await lstat(directory)).isSymbolicLink())throw Error('Protected storage directory changed');};
 return {
  async readSecret(key:string){const file=filename(key);let handle;try{const stat=await lstat(file);if(!vaultAvailable(vault))throw Error('Operating-system encrypted storage is unavailable');if(!stat.isFile()||stat.isSymbolicLink()||stat.size>131072)throw Error('Invalid encrypted secret record');await checkedDirectory();handle=await open(file,constants.O_RDONLY|(constants.O_NOFOLLOW??0));const opened=await handle.stat();if(opened.dev!==stat.dev||opened.ino!==stat.ino)throw Error('Encrypted secret identity changed');const encoded=vault.decryptString(await handle.readFile());if(!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)||encoded.length>65536)throw Error('Invalid encrypted secret');return Buffer.from(encoded,'base64');}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw error;}finally{await handle?.close();}},
  async writeSecret(key:string,value:Buffer){if(!vaultAvailable(vault)||!Buffer.isBuffer(value)||value.length>32768)throw Error('Operating-system encrypted storage is unavailable or secret exceeds its limit');const file=filename(key);await checkedDirectory();const temporary=file+'.'+randomUUID();let handle;try{const encrypted=vault.encryptString(value.toString('base64'));if(!vaultAvailable(vault))throw Error('Encrypted storage became unavailable');handle=await open(temporary,'wx',0o600);await handle.writeFile(encrypted);await handle.sync();await handle.close();handle=undefined;await checkedDirectory();await rename(temporary,file);}finally{await handle?.close();await unlink(temporary).catch(()=>{});}},
  async deleteSecret(key:string){await checkedDirectory();await unlink(filename(key)).catch(error=>{if(error.code!=='ENOENT')throw error;});}
 };
}

interface AccountOptions {
 state:()=>AuthState;resolveHost:(hostname:string)=>ApprovedHost;
 credentials:Pick<DownloadDependencies,'accountFingerprint'|'token'>;
 fetch:(url:string|URL,init?:NativeRequestInit)=>Promise<Response>;
}
async function boundedIdentity(response:Response){if(!response.ok||!response.body){await response.body?.cancel();throw Error('Selected account could not be verified');}const reader=response.body.getReader(),parts:Uint8Array[]=[];let bytes=0;try{for(;;){const part=await reader.read();if(part.done)break;bytes+=part.value.length;if(bytes>65536)throw Error('Account identity exceeds its limit');parts.push(part.value);}return JSON.parse(Buffer.concat(parts).toString('utf8')) as {login?:unknown};}finally{await reader.cancel().catch(()=>{});}}
/** Credentials are resolved and checked natively; only approved provider requests receive them. */
export function createRepositoryAccountProvider(options:AccountOptions){return async()=>{
 const initial=options.state(),hostname=initial.selectedHostname;
 const selected=initial.accounts.find(account=>account.host===hostname&&account.active&&account.state==='success');
 if(!hostname||!selected)throw Error('Sign in and select an active GitHub account first');
 const host=options.resolveHost(hostname),key=await options.credentials.accountFingerprint(hostname),login=selected.login;
 const assertCurrent=async()=>{const state=options.state();if(state.selectedHostname!==hostname||!state.accounts.some(account=>account.host===hostname&&account.active&&account.state==='success'&&account.login===login)||await options.credentials.accountFingerprint(hostname)!==key)throw Error('The selected account changed. Review again.');};
 const credential=async()=>{await assertCurrent();const token=await options.credentials.token(hostname,key);if(!token)throw Error('Selected provider credential is unavailable');const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);try{const identity=await boundedIdentity(await options.fetch(host.restOrigin.replace(/\/$/,'')+'/user',{headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json'},redirect:'manual',signal:controller.signal}));if(identity.login!==login)throw Error('Credential no longer belongs to the selected account');await assertCurrent();return token;}finally{clearTimeout(timer);}};
 const approved=(url:URL)=>[host.restOrigin,host.uploadsOrigin].filter(Boolean).some(base=>{const allowed=new URL(base!);return url.origin===allowed.origin&&(allowed.pathname==='/'||url.pathname===allowed.pathname||url.pathname.startsWith(allowed.pathname.replace(/\/$/,'')+'/'));});
 return {key,login,hostname,apiOrigin:host.restOrigin,uploadOrigin:host.uploadsOrigin??host.restOrigin,anonymous:false,assertCurrent,
  async registryCredentials(){return {username:login,token:await credential()};},
  async request(input:string,init:{method:string;headers?:Readonly<Record<string,string>>;body?:string|Readable;signal?:AbortSignal}){
   let url=new URL(input);if(url.protocol!=='https:'||url.username||url.password||!approved(url))throw Error('Provider address is outside the approved account host');
   const token=await credential(),headers=new Headers(init.headers);for(const name of ['authorization','cookie','proxy-authorization'])if(headers.has(name))throw Error('Provider caller cannot supply credentials');headers.set('Authorization',`Bearer ${token}`);
   const signal=AbortSignal.any([...(init.signal?[init.signal]:[]),AbortSignal.timeout(30*60*1000)]);
   for(let hop=0;hop<=5;hop++){await assertCurrent();const response=await options.fetch(url,{...init,headers,redirect:'manual',signal});if(![301,302,303,307,308].includes(response.status))return response;await response.body?.cancel();const location=response.headers.get('location');if(init.method!=='GET'||init.body||!location||hop===5)throw Error('Provider mutation redirects are not followed');const next=new URL(location,url);const external=hostname==='github.com'&&['release-assets.githubusercontent.com','objects.githubusercontent.com','github.com','productionresultssa0.blob.core.windows.net'].includes(next.hostname);if(next.protocol!=='https:'||next.username||next.password||!approved(next)&&!external)throw Error('Provider download redirect was not approved');if(next.origin!==url.origin)headers.delete('Authorization');url=next;}
   throw Error('Provider redirect limit exceeded');
  }
 };
};}
