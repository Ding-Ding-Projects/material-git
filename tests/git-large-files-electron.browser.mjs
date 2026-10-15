// Opt-in native transport proof: node tests/git-large-files-electron.browser.mjs
// Uses real Electron net.request and local HTTP only; no provider credentials.
import {build} from 'esbuild';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const require=createRequire(import.meta.url),root=process.cwd(),directory=await mkdtemp(path.join(tmpdir(),'mg-lfs-native-transfer-'));
const entry=path.join(directory,'main.cjs'),receipt=path.join(directory,'receipt.json');
await build({stdin:{resolveDir:root,loader:'ts',contents:`
import {app,net} from 'electron';
import {createServer} from 'node:http';
import {Readable} from 'node:stream';
import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createElectronFetch} from ${JSON.stringify(path.join(root,'src/main/electron-fetch.ts'))};
app.disableHardwareAcceleration();app.setPath('userData',${JSON.stringify(path.join(directory,'profile'))});
const pause=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
void(async()=>{
 await app.whenReady();let firstUpload!:()=>void,firstCancel!:()=>void,closedCancel!:()=>void;
 const uploadStarted=new Promise<void>(resolve=>firstUpload=resolve),cancelStarted=new Promise<void>(resolve=>firstCancel=resolve),cancelClosed=new Promise<void>(resolve=>closedCancel=resolve);
 let uploaded=0,cancelledBytes=0,redirectTargetRequests=0,sourceEnded=false,receivedBeforeSourceEnd=false;
 const server=createServer(async(req,res)=>{
  if(req.url==='/redirect'){res.writeHead(302,{Location:'/forbidden'});res.end();return;}
  if(req.url==='/forbidden'){redirectTargetRequests++;res.end('must not follow');return;}
  if(req.url==='/cancel'){req.on('close',closedCancel);req.on('data',chunk=>{cancelledBytes+=chunk.length;firstCancel();});return;}
  const hash=createHash('sha256');for await(const chunk of req){uploaded+=chunk.length;hash.update(chunk);if(!sourceEnded)receivedBeforeSourceEnd=true;firstUpload();}
  res.writeHead(201,{'content-type':'application/json'});res.end(JSON.stringify({bytes:uploaded,sha256:hash.digest('hex')}));
 });
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const base='http://127.0.0.1:'+(server.address() as {port:number}).port,fetch=createElectronFetch(net,{allowMutation:true});
  const payload=Buffer.alloc(3*1024*1024);for(let i=0;i<payload.length;i++)payload[i]=i%251;
  const source=Readable.from((async function*(){yield payload.subarray(0,16384);await Promise.race([uploadStarted,pause(2000).then(()=>{throw Error('Electron buffered the complete upload instead of transmitting its first chunk');})]);for(let i=16384;i<payload.length;i+=16384)yield payload.subarray(i,i+16384);sourceEnded=true;})());
  const response=await fetch(base+'/upload',{method:'POST',headers:{'Content-Type':'application/octet-stream','Content-Length':String(payload.length)},body:source,signal:AbortSignal.timeout(10000)});
  assert.equal(response.status,201);const upload=await response.json();assert.deepEqual(upload,{bytes:payload.length,sha256:createHash('sha256').update(payload).digest('hex')});assert.equal(receivedBeforeSourceEnd,true);
  const controller=new AbortController(),cancelSource=Readable.from((async function*(){for(let i=0;i<1000;i++){yield Buffer.alloc(16384);await pause(5);}})());
  const cancelRequest=fetch(base+'/cancel',{method:'POST',body:cancelSource,signal:controller.signal});
  const rejected=assert.rejects(cancelRequest,/cancel native upload/);
  await Promise.race([cancelStarted,pause(2000).then(()=>{throw Error('Cancellation upload never reached local server');})]);controller.abort(Error('cancel native upload'));await rejected;
  assert.equal(cancelSource.destroyed,true);await Promise.race([cancelClosed,pause(2000).then(()=>{throw Error('Cancellation left native request open');})]);assert.ok(cancelledBytes<16384*1000);
  const redirected=await fetch(base+'/redirect',{redirect:'manual'});assert.equal(redirected.status,302);assert.equal(redirectTargetRequests,0);assert.ok(redirected.headers.get('location')!.endsWith('/forbidden'));
  const evidence={electron:process.versions.electron,node:process.versions.node,upload,receivedBeforeSourceEnd,cancelledBytes,cancelSourceDestroyed:cancelSource.destroyed,redirectTargetRequests};await writeFile(${JSON.stringify(receipt)},JSON.stringify(evidence,null,2));
 }finally{server.closeAllConnections();server.close();app.quit();}
})().catch(error=>{console.error(error);app.exit(1)});
`},bundle:true,platform:'node',format:'cjs',external:['electron'],outfile:entry});
try{const environment={...process.env};delete environment.ELECTRON_RUN_AS_NODE;await promisify(execFile)(require('electron'),['--no-sandbox','--ozone-platform=headless','--disable-gpu',entry],{env:environment,timeout:30000,maxBuffer:1024*1024});console.log(JSON.stringify({evidence:directory,...JSON.parse(await readFile(receipt,'utf8'))},null,2));}catch(error){console.error('Native transfer evidence:',directory);throw error;}
