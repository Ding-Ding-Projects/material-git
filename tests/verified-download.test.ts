import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {mkdtemp,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {verifiedDownload} from '../scripts/verified-download.mjs';
const bytes=Buffer.from('Explicit synthetic bounded download fixture.\n'),sha256=createHash('sha256').update(bytes).digest('hex');

test('actual curl acquisition retries truncated transfers and transient errors, verifies bytes and never publishes failed payloads',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'material-download-fixture-'));let requests=0;
 const server=createServer((request,response)=>{
  requests++;
  if(request.url==='/truncated'&&requests===1){response.writeHead(200,{'Content-Length':bytes.length+100,'Connection':'close'});response.end(bytes);return;}
  if(request.url==='/transient'&&requests<3){response.writeHead(503);response.end('Synthetic temporary failure');return;}
  if(request.url==='/wrong'){response.end('Synthetic checksum mismatch');return;}
  if(request.url==='/large'){response.write(Buffer.alloc(2048));response.end();return;}
  if(request.url==='/stall')return;
  response.end(bytes);
 });
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();assert.ok(address&&typeof address!=='string');const url=`http://127.0.0.1:${address.port}`;
 const item=(endpoint:string)=>({asset:'synthetic-source.tar.xz',url:url+endpoint,sha256});
 const options={allowLoopback:true,maxBytes:1024,deadlineMs:3000};
 try{
  const downloaded=await verifiedDownload(item('/truncated'),directory,options);assert.equal(requests,2);assert.deepEqual(await readFile(downloaded),bytes);
  await verifiedDownload(item('/truncated'),directory,options);assert.equal(requests,2,'An exactly verified cache avoids network acquisition');
  await rm(downloaded);requests=0;await verifiedDownload(item('/transient'),directory,options);assert.equal(requests,3);
  await writeFile(downloaded,'Original unverified cache fixture');requests=0;
  await assert.rejects(verifiedDownload(item('/wrong'),directory,options),/checksum mismatch/);assert.equal(requests,3);assert.equal(await readFile(downloaded,'utf8'),'Original unverified cache fixture');
  await assert.rejects(verifiedDownload(item('/large'),directory,{...options,attempts:1}),/byte bound|transport failed/);
  await assert.rejects(verifiedDownload(item('/stall'),directory,{...options,deadlineMs:150,attempts:1}),/deadline|transport failed/);
  assert.deepEqual(await readdir(directory),['synthetic-source.tar.xz'],'No partial attempt remains in the cache');
  await assert.rejects(verifiedDownload(item('/truncated'),directory),/HTTPS/);
  await assert.rejects(verifiedDownload({...item('/truncated'),asset:'../unsafe'},directory,options),/identity/);
 }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));await rm(directory,{recursive:true,force:true});}
});

test('short filesystem writes are completed and persisted-byte corruption cannot become a verified cache entry',async()=>{
 const {createRequire,syncBuiltinESMExports}=await import('node:module'),require=createRequire(import.meta.url),filesystem=require('node:fs/promises'),originalOpen=filesystem.open;
 const directory=await mkdtemp(join(tmpdir(),'material-download-write-'));let writes=0,corrupt=false;
 const server=createServer((_request,response)=>response.end(bytes));await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();assert.ok(address&&typeof address!=='string');
 const item={asset:'synthetic-source.tar.xz',url:`http://127.0.0.1:${address.port}/source`,sha256};
 try{
  filesystem.open=async(...args:Parameters<typeof originalOpen>)=>{
   const handle=await originalOpen(...args);
   if(args[1]==='wx'){
    const write=handle.write.bind(handle),sync=handle.sync.bind(handle);
    handle.write=async(buffer:Buffer,offset:number,length:number,position:number|null)=>{writes++;return write(buffer,offset,Math.min(length,7),position);};
    handle.sync=async()=>{await sync();if(corrupt)await writeFile(args[0] as string,Buffer.alloc(bytes.length,33));};
   }
   return handle;
  };syncBuiltinESMExports();
  const path=await verifiedDownload(item,directory,{allowLoopback:true,attempts:1,deadlineMs:3000});assert.ok(writes>1,'The actual file handle deliberately performs short writes');assert.deepEqual(await readFile(path),bytes);
  await writeFile(path,'Original unverified cache fixture');corrupt=true;
  await assert.rejects(verifiedDownload(item,directory,{allowLoopback:true,attempts:1,deadlineMs:3000}),/Persisted download checksum mismatch/);
  assert.equal(await readFile(path,'utf8'),'Original unverified cache fixture');assert.deepEqual(await readdir(directory),[item.asset]);
 }finally{filesystem.open=originalOpen;syncBuiltinESMExports();server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));await rm(directory,{recursive:true,force:true});}
});
