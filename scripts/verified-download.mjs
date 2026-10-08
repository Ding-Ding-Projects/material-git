import {spawn} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {mkdir,open,rename,rm,stat} from 'node:fs/promises';
import path from 'node:path';

async function verified(file,expected,maxBytes){try{const info=await stat(file);if(!info.isFile()||info.size>maxBytes)return false;const hash=createHash('sha256');for await(const bytes of createReadStream(file))hash.update(bytes);return hash.digest('hex')===expected;}catch{return false;}}
/** Build-time acquisition only. A failed/truncated transport never publishes partial or unverified bytes. */
export async function verifiedDownload(item,directory,options={}){
 const {maxBytes=64*1024*1024,deadlineMs=180000,attempts=3,allowLoopback=false}=options;
 if(!/^[A-Za-z0-9_.-]{1,160}$/.test(item.asset)||['.','..'].includes(item.asset)||!/^[a-f0-9]{64}$/.test(item.sha256))throw new Error('Invalid pinned download identity');
 const url=new URL(item.url),loopback=allowLoopback&&url.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(url.hostname);
 if((url.protocol!=='https:'&&!loopback)||url.username||url.password||url.hash)throw new Error('Pinned downloads require credential-free HTTPS');
 if(!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>150*1024*1024||!Number.isInteger(attempts)||attempts<1||attempts>3||!Number.isInteger(deadlineMs)||deadlineMs<100||deadlineMs>180000)throw new Error('Invalid bounded download options');
 await mkdir(directory,{recursive:true,mode:0o700});const target=path.join(directory,item.asset);
 if(await verified(target,item.sha256,maxBytes))return target;
 const expires=Date.now()+deadlineMs;let lastError=new Error('Verified download failed');
 for(let attempt=0;attempt<attempts&&Date.now()<expires;attempt++){
  const temporary=target+'.'+randomUUID()+'.tmp',remaining=expires-Date.now(),protocol=loopback?'=http':'=https';
  const file=await open(temporary,'wx',0o600);let child,timer;
  try{
   // --disable prevents user curlrc behavior; argv never contains credentials or a shell command.
   child=spawn('curl',['--disable','--fail','--location','--max-redirs','5','--proto',protocol,'--proto-redir',protocol,'--tlsv1.2','--connect-timeout',String(Math.min(20,remaining/1000)),'--max-time',String(Math.min(60,remaining/1000)),'--max-filesize',String(maxBytes),'--silent','--show-error','--output','-',item.url],{shell:false,windowsHide:true,stdio:['ignore','pipe','pipe']});
   let failure,diagnosticBytes=0,bytes=0;const hash=createHash('sha256');
   const closed=new Promise(resolve=>{child.once('error',()=>{failure=new Error('The required build-time curl transport could not start');});child.once('close',code=>resolve(code));});
   const stop=error=>{failure??=error;child.kill('SIGKILL');};
   timer=setTimeout(()=>stop(new Error('Pinned download exceeded its total deadline')),remaining);
   child.stderr.on('data',part=>{diagnosticBytes+=part.length;if(diagnosticBytes>16384)stop(new Error('Download diagnostics exceeded their byte bound'));});
   for await(const chunk of child.stdout){bytes+=chunk.length;if(bytes>maxBytes){stop(new Error('Pinned download exceeded its byte bound'));break;}hash.update(chunk);await file.write(chunk);}
   const code=await closed;clearTimeout(timer);
   if(failure)throw failure;if(code!==0)throw new Error(`Pinned download transport failed (${code})`);
   if(hash.digest('hex')!==item.sha256)throw new Error('Pinned download checksum mismatch');
   await file.sync();await file.close();await rename(temporary,target);return target;
  }catch(error){lastError=error instanceof Error?error:new Error('Pinned download failed');child?.kill('SIGKILL');await file.close().catch(()=>{});await rm(temporary,{force:true});}
  finally{clearTimeout(timer);}
  if(attempt+1<attempts&&Date.now()<expires)await new Promise(resolve=>setTimeout(resolve,Math.min(200*(attempt+1),expires-Date.now())));
 }
 throw new Error(`Unable to acquire verified ${item.asset}: ${lastError.message}`);
}
