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
