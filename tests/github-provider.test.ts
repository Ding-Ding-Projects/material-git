import test from 'node:test';import assert from 'node:assert/strict';
import {GitHubProviderTargets} from '../src/main/github-provider';import {GitHubService} from '../src/main/github';

function fixture(host='github.com'){
 let account='7',selected=host,now=1000,sha='a'.repeat(40),repositoryId=88;const calls:string[]=[];
 const request=async(endpoint:string)=>{calls.push(endpoint);if(endpoint==='repos/owner/repo')return {id:repositoryId,full_name:'owner/repo',clone_url:`https://${host}/owner/repo.git`};if(endpoint==='gists/abcdef')return {id:'abcdef',git_pull_url:`https://gist.${host}/abcdef.git`};if(endpoint==='repos/owner/repo/pulls/42')return {id:99042,number:42,base:{ref:'main',repo:{id:88,full_name:'owner/repo'}},head:{ref:'feature',sha}};if(endpoint==='repos/owner/repo/issues/42')return {id:88042,number:42};throw Error('Unexpected fixture provider path');};
 const registry=new GitHubProviderTargets({request,account:async()=>account,selectedHostname:()=>selected,inHost:async(_host,work)=>work(),now:()=>now});
 return {registry,calls,account:(value:string)=>account=value,hostname:(value:string)=>selected=value,now:(value:number)=>now=value,sha:(value:string)=>sha=value,repositoryId:(value:number)=>repositoryId=value};
}
test('repository and gist sources are issued opaquely and bind exact canonical approved clone URLs',async()=>{
 const f=fixture();const repository=await f.registry.prepare('repositories.clone-source',{repository:'owner/repo',id:88},'github.com');assert.equal(repository.kind,'repository');assert.equal(repository.url,'https://github.com/owner/repo.git');assert.equal(repository.providerId,'88');assert.ok(repository.id!==repository.providerId);assert.match(repository.accountFingerprint,/^[a-f0-9]{64}$/);assert.deepEqual(await f.registry.resolve(repository.id),repository);
 const gist=await f.registry.prepare('gists.clone-source',{id:'abcdef'},'github.com');assert.equal(gist.url,'https://gist.github.com/abcdef.git');const enterprise=fixture('forge.example');const hosted=await enterprise.registry.prepare('gists.clone-source',{id:'abcdef'},'forge.example');assert.equal(hosted.url,'https://gist.forge.example/abcdef.git');
 await assert.rejects(f.registry.prepare('repositories.clone-source',{repository:'owner/repo',id:88,values:{url:'https://evil.example/x.git'}},'github.com'),/only the selected/);
 await assert.rejects(f.registry.prepare('repositories.clone-source',{repository:'owner/repo',id:89},'github.com'),/repository identity changed/);
 f.repositoryId(89);await assert.rejects(f.registry.resolve(repository.id),/identity changed/);
});
test('pull request receipt uses fresh base repository and exact head, including issue-search provenance',async()=>{
 const f=fixture();const target=await f.registry.prepare('pulls.checkout-source',{repository:'owner/repo',id:42,providerId:88042,providerKind:'issue'},'github.com');assert.equal(target.kind,'pull-request');if(target.kind!=='pull-request')throw Error();assert.equal(target.providerId,'99042');assert.equal(target.number,42);assert.equal(target.headSha,'a'.repeat(40));assert.equal(target.ref,'refs/pull/42/head');assert.equal(target.repository.id,'88');
 await assert.rejects(f.registry.prepare('pulls.checkout-source',{repository:'owner/repo',id:42,providerId:88042,providerKind:'pull-request'},'github.com'),/identity changed/);
 f.sha('b'.repeat(40));await assert.rejects(f.registry.resolve(target.id),/source changed/);
});
test('source receipts reject account/host drift, expiry, invalidation and unissued IDs',async()=>{
 const f=fixture();const source=await f.registry.prepare('repositories.clone-source',{repository:'owner/repo',id:88},'github.com');f.account('8');await assert.rejects(f.registry.resolve(source.id),/account changed/);f.account('7');f.hostname('forge.example');await assert.rejects(f.registry.resolve(source.id),/host changed/);f.hostname('github.com');f.now(301001);await assert.rejects(f.registry.resolve(source.id),/expired/);await assert.rejects(f.registry.resolve('renderer-created-id'),/expired/);f.now(1000);const next=await f.registry.prepare('gists.clone-source',{id:'abcdef'},'github.com');f.registry.invalidate();await assert.rejects(f.registry.resolve(next.id),/expired/);
});
test('provider source refuses URL redirection, credentials and changed account during issuance',async()=>{
 for(const url of ['https://evil.example/abcdef.git','https://gist.github.com/abcdef.git?redirect=evil','https://user:password@gist.github.com/abcdef.git']){const registry=new GitHubProviderTargets({request:async()=>({id:'abcdef',git_pull_url:url}),account:async()=> '7',selectedHostname:()=> 'github.com',inHost:async(_host,work)=>work()});await assert.rejects(registry.prepare('gists.clone-source',{id:'abcdef'},'github.com'),/approved host/);}
 let account='7';const registry=new GitHubProviderTargets({request:async()=>{account='8';return {id:88,full_name:'owner/repo',clone_url:'https://github.com/owner/repo.git'};},account:async()=>account,selectedHostname:()=> 'github.com',inHost:async(_host,work)=>work()});await assert.rejects(registry.prepare('repositories.clone-source',{repository:'owner/repo',id:88},'github.com'),/account changed/);
});
test('GitHub bridge exposes only an opaque source summary and native resolver repeats authorization',async()=>{
 const authorized:string[]=[];const service=new GitHubService(process.execPath,process.cwd(),undefined,{authorize:async action=>{authorized.push(action);},request:async(_method,endpoint)=>({data:endpoint==='user'?{id:7}:endpoint==='repos/owner/repo'?{id:88,full_name:'owner/repo',clone_url:'https://github.com/owner/repo.git'}:{},hasNext:false})});
 const response=await service.handle('repositories.clone-source',{repository:'owner/repo',id:88});const id=response.detail?.providerTargetId;assert.equal(typeof id,'string');assert.equal(response.detail?.url,undefined);assert.equal(response.detail?.accountFingerprint,undefined);assert.equal(response.detail?.repository,'owner/repo');const target=await service.resolveProviderTarget(String(id));assert.equal(target.url,'https://github.com/owner/repo.git');assert.equal(authorized.filter(action=>action==='repositories.clone-source').length,2);service.invalidateReviews();await assert.rejects(service.resolveProviderTarget(String(id)),/expired/);service.close();
});
test('owned source discard revokes without host/account/authorization reads and rejects scope replacements',async()=>{
 let locked=false,reads=0;const service=new GitHubService(process.execPath,process.cwd(),undefined,{resolveHost:()=>{if(locked)throw Error('Changed host');return 'github.com';},authorize:async()=>{if(locked)throw Error('Locked source');},request:async(_method,endpoint)=>{reads++;return {data:endpoint==='user'?{id:7}:{id:88,full_name:'owner/repo',clone_url:'https://github.com/owner/repo.git'},hasNext:false};}});
 const source=await service.handle('repositories.clone-source',{repository:'owner/repo',id:88});const id=String(source.detail?.providerTargetId);locked=true;const previous=reads;
 await assert.rejects(service.handle('provider-source-discard',{id,hostname:'evil.example'}),/scope replacements/);await assert.rejects(service.handle('provider-source-discard',{id,action:'repositories.clone-source'}),/scope replacements/);
 await service.handle('provider-source-discard',{id});await service.handle('provider-source-discard',{id});assert.equal(reads,previous);
 await assert.rejects(service.handle('provider-source-discard',{id:'renderer-created-id'}),/issued opaque/);await assert.rejects(service.handle('provider-source-discard',{id:'00000000-0000-4000-8000-000000000000'}),/issued opaque/);
 locked=false;await assert.rejects(service.resolveProviderTarget(id),/expired/);service.close();
});
test('revocation interrupts a provider target revalidation already in progress',async()=>{
 let hold=false,release!:()=>void,entered!:()=>void;const gate=new Promise<void>(resolve=>release=resolve),started=new Promise<void>(resolve=>entered=resolve);
 const registry=new GitHubProviderTargets({request:async()=>{if(hold){entered();await gate;}return {id:88,full_name:'owner/repo',clone_url:'https://github.com/owner/repo.git'};},account:async()=> '7',selectedHostname:()=> 'github.com',inHost:async(_host,work)=>work()});
 const source=await registry.prepare('repositories.clone-source',{repository:'owner/repo',id:88},'github.com');hold=true;const pending=registry.resolve(source.id);await started;registry.discard(source.id);release();await assert.rejects(pending,/revoked/);await assert.rejects(registry.resolve(source.id),/expired/);
});
