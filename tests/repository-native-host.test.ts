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
