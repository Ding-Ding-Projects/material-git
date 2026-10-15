import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createRepositoryAccountProvider,createRepositoryGitRunner,createRepositorySecrets} from '../src/main/repository-native-host';
import {validateAuthHost} from '../src/main/auth-hosts';
import type {AuthState} from '../src/shared/types';

test('native repository transport retains exact binary object bytes, cancellation and bounded output',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'repository-host-'));const hook=path.join(directory,'hooks');await mkdir(hook);
 try{execFileSync('git',['init','--quiet',directory]);const run=createRepositoryGitRunner('git',hook),bytes=Buffer.from([0,255,1,13,10,200]);const hashed=await run({root:directory,argv:['hash-object','-w','--stdin'],input:bytes,maximumBytes:1024});assert.equal(hashed.exitCode,0);const result=await run({root:directory,argv:['cat-file','blob',hashed.stdout.toString().trim()],maximumBytes:1024});assert.deepEqual(result.stdout,bytes);
 const controller=new AbortController();controller.abort();await assert.rejects(run({root:directory,argv:['status'],maximumBytes:1024,signal:controller.signal}));
 await assert.rejects(run({root:directory,argv:['status'],maximumBytes:1}),/exceeded/);
 }finally{await rm(directory,{recursive:true,force:true});}
});

test('repository secrets round-trip only through protected storage, reject links and refuse plaintext fallback',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'repository-secrets-')),folder=path.join(directory,'private');let available=true;
 const vault={isEncryptionAvailable:()=>available,getSelectedStorageBackend:()=>available?'test-vault':'basic_text',encryptString:(value:string)=>Buffer.from('encrypted:'+Buffer.from(value).toString('hex')),decryptString:(value:Buffer)=>Buffer.from(value.toString().slice(10),'hex').toString()};
 try{const store=createRepositorySecrets(folder,vault);assert.equal(await store.readSecret('missing'),null);await store.writeSecret('example',Buffer.from('private password'));assert.equal((await store.readSecret('example'))!.toString(),'private password');available=false;await assert.rejects(store.writeSecret('another',Buffer.from('secret')),/unavailable/);await assert.rejects(store.readSecret('example'),/unavailable/);available=true;await store.deleteSecret('example');assert.equal(await store.readSecret('example'),null);await assert.rejects(store.writeSecret('../escape',Buffer.from('secret')),/identity/);const linked=path.join(directory,'linked');await symlink(folder,linked,'dir');await assert.rejects(createRepositorySecrets(linked,vault).writeSecret('linked',Buffer.from('secret')),/directory changed/);
 }finally{await rm(directory,{recursive:true,force:true});}
});

function accountFixture(){let login='reviewed',fingerprint='one';const requests:{url:string;headers:Headers;method?:string}[]=[];let handler=(url:string)=>new Response(JSON.stringify({login}),{status:200});
 const provider=createRepositoryAccountProvider({state:()=>({selectedHostname:'github.com',accounts:[{host:'github.com',login,active:true,state:'success'}]} as AuthState),resolveHost:validateAuthHost,credentials:{accountFingerprint:async()=>fingerprint,token:async()=> 'private-test-credential'},fetch:async(input,init)=>{const url=String(input);requests.push({url,headers:new Headers(init?.headers),method:init?.method});return handler(url);}});
 return {provider,requests,setHandler:(fn:typeof handler)=>handler=fn,change:()=>{login='other';fingerprint='two';}};
}
test('provider session binds selected account, approves mutations, and strips credentials from asset redirects',async()=>{
 const fixture=accountFixture(),session=await fixture.provider();fixture.setHandler(url=>url.endsWith('/user')?new Response(JSON.stringify({login:'reviewed'})):url.startsWith('https://api.github.com/')?new Response(null,{status:302,headers:{location:'https://release-assets.githubusercontent.com/object?signature=private'}}):new Response('bytes'));
 const response=await session.request('https://api.github.com/repos/owner/repo/releases/assets/1',{method:'GET'});assert.equal(await response.text(),'bytes');assert.equal(fixture.requests.at(-1)!.headers.has('authorization'),false);assert.equal(fixture.requests.find(row=>row.url.includes('/releases/assets/'))!.headers.get('authorization'),'Bearer private-test-credential');
 await assert.rejects(session.request('https://api.github.com/repos/owner/repo/releases',{method:'POST',body:'{}'}),/mutation redirects/);
 await assert.rejects(session.request('https://attacker.invalid/repos',{method:'GET'}),/approved account host/);
 fixture.change();await assert.rejects(session.request('https://api.github.com/repos/owner/repo',{method:'GET'}),/account changed/);
});
test('account mismatch and unapproved redirects never receive provider credentials',async()=>{
 const fixture=accountFixture(),session=await fixture.provider();fixture.setHandler(url=>new Response(JSON.stringify({login:'unexpected'})));await assert.rejects(session.request('https://api.github.com/repos/owner/repo',{method:'GET'}),/no longer belongs/);assert.equal(fixture.requests.length,1);
 fixture.setHandler(url=>url.endsWith('/user')?new Response(JSON.stringify({login:'reviewed'})):new Response(null,{status:302,headers:{location:'https://attacker.invalid/steal'}}));await assert.rejects(session.request('https://api.github.com/repos/owner/repo/releases/assets/1',{method:'GET'}),/redirect was not approved/);assert.ok(fixture.requests.every(row=>!row.url.includes('attacker')));
});

function anonymousFixture(){
 let state={status:'idle',selectedHostname:'github.com',accounts:[]} as unknown as AuthState,revision=1;
 const requests:{url:string;init:Parameters<Parameters<typeof createRepositoryAccountProvider>[0]['fetch']>[1]}[]=[];
 let handler:Parameters<typeof createRepositoryAccountProvider>[0]['fetch']=async()=>Response.json({id:12,full_name:'owner/repo',private:false});
 let credentialCalls=0;
 const provider=createRepositoryAccountProvider({state:()=>state,stateRevision:()=>revision,resolveHost:validateAuthHost,credentials:{accountFingerprint:async()=>{credentialCalls++;throw Error('Unexpected credential request');},token:async()=>{credentialCalls++;throw Error('Unexpected credential request');}},fetch:async(url,init)=>{requests.push({url:String(url),init});return handler(url,init);}});
 return {provider,requests,setHandler:(value:typeof handler)=>handler=value,setState:(value:AuthState)=>state=value,advance:()=>revision++,credentialCalls:()=>credentialCalls};
}
test('anonymous sessions verify public metadata before release reads and never resolve or transmit credentials',async()=>{
 const fixture=anonymousFixture(),session=await fixture.provider();assert.equal(session.anonymous,true);assert.equal(session.hostname,'github.com');assert.equal(session.key,(await fixture.provider()).key);
 await assert.rejects(session.request('https://api.github.com/repos/owner/repo/releases/1',{method:'GET'}),/Verify public/);assert.equal(fixture.requests.length,0);
 assert.equal((await (await session.request('https://api.github.com/repos/owner/repo',{method:'GET'})).json()).private,false);
 fixture.setHandler(async url=>String(url).includes('releases/assets/1')?new Response(null,{status:302,headers:{location:'https://release-assets.githubusercontent.com/object?signature=example'}}):new Response('payload'));
 assert.equal(await (await session.request('https://api.github.com/repos/owner/repo/releases/assets/1',{method:'GET',headers:{Accept:'application/octet-stream'}})).text(),'payload');
 for(const request of fixture.requests){const headers=new Headers(request.init?.headers);assert.equal(headers.has('authorization'),false);assert.equal(headers.has('cookie'),false);assert.equal(request.init?.method,'GET');assert.equal(request.init?.credentials,'omit');assert.equal(request.init?.redirect,'manual');}
 assert.equal(fixture.credentialCalls(),0);await assert.rejects(session.registryCredentials(),/Sign in/);
});
test('anonymous sessions reject private, mismatched, oversized and unverified provider metadata',async()=>{
 for(const record of [{id:12,full_name:'owner/repo',private:true},{id:12,full_name:'other/repo',private:false},{full_name:'owner/repo',private:false},null]){
  const fixture=anonymousFixture(),session=await fixture.provider();fixture.setHandler(async()=>Response.json(record));await assert.rejects(session.request('https://api.github.com/repos/owner/repo',{method:'GET'}),/verified public/);await assert.rejects(session.request('https://api.github.com/repos/owner/repo/releases/1',{method:'GET'}),/Verify public/);
 }
 const fixture=anonymousFixture(),session=await fixture.provider();fixture.setHandler(async()=>new Response(' '.repeat(1024*1024+1)));await assert.rejects(session.request('https://api.github.com/repos/owner/repo',{method:'GET'}),/exceeds/);
});
test('anonymous provider rejects mutations, caller credentials, arbitrary hosts and unsafe asset redirects',async()=>{
 const fixture=anonymousFixture(),session=await fixture.provider();
 for(const method of ['POST','PUT','PATCH','DELETE','HEAD'])await assert.rejects(session.request('https://api.github.com/repos/owner/repo',{method}),/only public GET/);
 await assert.rejects(session.request('https://api.github.com/repos/owner/repo',{method:'GET',body:''}),/only public GET/);
 for(const name of ['authorization','cookie','proxy-authorization'])await assert.rejects(session.request('https://api.github.com/repos/owner/repo',{method:'GET',headers:{[name]:'secret'}}),/cannot supply/);
 await assert.rejects(session.request('https://api.github.com/repos/owner/repo?access_token=secret',{method:'GET'}),/cannot supply/);
 for(const url of ['https://attacker.invalid/repos/owner/repo','https://api.github.com:444/repos/owner/repo','https://user:secret@api.github.com/repos/owner/repo','https://uploads.github.com/repos/owner/repo','https://release-assets.githubusercontent.com/object'])await assert.rejects(session.request(url,{method:'GET'}),/approved GitHub.com/);
 assert.equal(fixture.requests.length,0);await (await session.request('https://api.github.com/repos/owner/repo',{method:'GET'})).body?.cancel();
 for(const location of ['https://attacker.invalid/object','http://release-assets.githubusercontent.com/object','https://release-assets.githubusercontent.com:444/object','https://api.github.com/repos/other/repo/releases/assets/1']){fixture.setHandler(async()=>new Response(null,{status:302,headers:{location}}));const before:number=fixture.requests.length;await assert.rejects(session.request('https://api.github.com/repos/owner/repo/releases/assets/1',{method:'GET'}),/redirect was not approved/);assert.equal(fixture.requests.length,before+1);}
 assert.equal(fixture.credentialCalls(),0);
});
test('anonymous account revision and account changes invalidate requests and previously reviewed sessions',async()=>{
 const fixture=anonymousFixture(),session=await fixture.provider();fixture.advance();await assert.rejects(session.assertCurrent(),/account changed/);await assert.rejects(session.request('https://api.github.com/repos/owner/repo',{method:'GET'}),/account changed/);assert.equal(fixture.requests.length,0);assert.notEqual(session.key,(await fixture.provider()).key);
 const changed=anonymousFixture(),prior=await changed.provider();changed.setState({status:'authenticated',selectedHostname:'github.com',accounts:[{host:'github.com',login:'new',active:true,state:'success'}]} as AuthState);await assert.rejects(prior.assertCurrent(),/account changed/);changed.setState({status:'idle',selectedHostname:'github.com',accounts:[]} as unknown as AuthState);await assert.rejects(prior.assertCurrent(),/account changed/);
 const enterprise=anonymousFixture();enterprise.setState({status:'idle',selectedHostname:'enterprise.example',accounts:[]} as unknown as AuthState);await assert.rejects(enterprise.provider(),/Sign in/);
 const inflight=anonymousFixture(),pending=await inflight.provider();inflight.setHandler(async()=>{inflight.advance();return Response.json({id:12,full_name:'owner/repo',private:false});});await assert.rejects(pending.request('https://api.github.com/repos/owner/repo',{method:'GET'}),/account changed/);
});
test('anonymous provider cancellation propagates through metadata requests and verified package reads stay owner-bound',async()=>{
 const fixture=anonymousFixture(),session=await fixture.provider(),cancelled=new AbortController();cancelled.abort();await assert.rejects(session.request('https://api.github.com/repos/owner/repo',{method:'GET',signal:cancelled.signal}));assert.equal(fixture.requests.length,0);
 await (await session.request('https://api.github.com/repos/owner/repo',{method:'GET'})).body?.cancel();fixture.setHandler(async()=>Response.json({visibility:'public'}));await session.request('https://api.github.com/users/owner/packages/container/example',{method:'GET'});await session.request('https://api.github.com/orgs/owner/packages/container/example',{method:'GET'});await assert.rejects(session.request('https://api.github.com/users/other/packages/container/example',{method:'GET'}),/Verify a public/);
 const controller=new AbortController();fixture.setHandler(async(_url,init)=>new Promise((_resolve,reject)=>{init!.signal!.addEventListener('abort',()=>reject(Error('cancelled')),{once:true});controller.abort();}));await assert.rejects(session.request('https://api.github.com/repos/owner/repo/releases/1',{method:'GET',signal:controller.signal}),/cancelled/);
});
test('authenticated sessions bind account revision and registry credentials retain cancellation',async()=>{
 let revision=1,calls=0;const state={status:'authenticated',selectedHostname:'github.com',accounts:[{host:'github.com',login:'reviewed',active:true,state:'success'}]} as AuthState;
 const provider=createRepositoryAccountProvider({state:()=>state,stateRevision:()=>revision,resolveHost:validateAuthHost,credentials:{accountFingerprint:async()=> 'one',token:async()=> 'secret'},fetch:async()=>{calls++;return Response.json({login:'reviewed'});}});
 const session=await provider(),controller=new AbortController();controller.abort();await assert.rejects(session.registryCredentials(controller.signal));assert.equal(calls,0);revision++;await assert.rejects(session.assertCurrent(),/account changed/);await assert.rejects(session.registryCredentials(),/account changed/);assert.equal(calls,0);
});
test('anonymous asset streams stop yielding bytes when the account context changes',async()=>{
 const fixture=anonymousFixture(),session=await fixture.provider();await (await session.request('https://api.github.com/repos/owner/repo',{method:'GET'})).body?.cancel();let released=false,cancelled=false;
 fixture.setHandler(async()=>new Response(new ReadableStream<Uint8Array>({async pull(controller){if(!released){released=true;controller.enqueue(new Uint8Array([1]));}else{fixture.advance();controller.enqueue(new Uint8Array([2]));}},cancel(){cancelled=true;}},{highWaterMark:0})));
 const response=await session.request('https://api.github.com/repos/owner/repo/releases/assets/1',{method:'GET'}),reader=response.body!.getReader();assert.deepEqual((await reader.read()).value,new Uint8Array([1]));await assert.rejects(reader.read(),/account changed/);assert.equal(cancelled,true);
});
