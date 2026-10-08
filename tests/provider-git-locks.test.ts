import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,readdir,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {GitService} from '../src/main/git';
import {GitHubService} from '../src/main/github';
import {loadCatalog} from '../src/main/catalog';
import {createElementLocks} from '../src/main/element-locks';
import {isOwnedCancellation,isOwnedCleanup,nativeLockTargets,protectedLockIds,providerGitLockIds,providerGitKindLockIds,providerGitLockTargets} from '../src/shared/security';
import type {GitAction,GitPayload} from '../src/shared/git';
import type {GitHubLocalSourceAction,GitHubPayload} from '../src/shared/github';

async function fixture(){
 const directory=await mkdtemp(join(tmpdir(),'mg-provider-git-locks-'));
 const locks=createElementLocks({directory:join(directory,'locks'),encrypt:value=>Buffer.from(value).toString('base64'),decrypt:value=>Buffer.from(value,'base64').toString(),hash:value=>'fixture:'+value,verify:(value,hash)=>hash==='fixture:'+value,verifyOtp:()=>false,validateOtp:value=>value});
 locks.registerTargets([...nativeLockTargets(loadCatalog().commands),...providerGitLockTargets(),{id:'destination:git',label:'git'},{id:'git:apply',label:'Apply Git review'}]);
 const lock=async(id:string)=>locks.handle('lockSet',{id,policy:'password',password:'fixture-password',duration:{kind:'surface'},disclosed:true},false);
 const unlock=async(id:string)=>locks.handle('lockVerify',{id,password:'fixture-password'},false);
 return {directory,locks,lock,unlock,close:()=>rm(directory,{recursive:true,force:true})};
}

test('provider handoff lock origins are exact native action/kind mappings with registered command and tab targets',()=>{
 const registered=new Set([...nativeLockTargets(loadCatalog().commands),...providerGitLockTargets()].map(target=>target.id));
 for(const [action,kind,destination,command] of [['repositories.clone-source','repository','repositories','repo.clone'],['gists.clone-source','gist','gists','gist.clone'],['pulls.checkout-source','pull-request','pulls','pr.checkout']] as const){
  const ids=providerGitLockIds(action);assert.deepEqual(providerGitKindLockIds(kind),ids);
  for(const id of ['destination:commands',`destination:${destination}`,`command:${command}`,`tab:${command}`,`github:${action}`])assert.ok(ids.includes(id));
  assert.ok(ids.every(id=>registered.has(id)));
 }
 for(const action of ['git:apply','repositories.clone','repo clone','destination:gists',{},undefined])assert.throws(()=>providerGitLockIds(action),/Unknown provider/);
 for(const kind of ['repositories','repo','pr',{},undefined])assert.throws(()=>providerGitKindLockIds(kind),/Unknown provider/);
});

test('cleanup authority admits only scoped native cancellation and exact unused-receipt revocation pairs',async()=>{
 const f=await fixture();try{
  for(const [channel,action] of [['git','cancel'],['cli-workflows','cancel'],['github','actions.watch-cancel'],['downloads','pause'],['downloads','cancel']] as const){assert.equal(isOwnedCancellation(channel,action),true);assert.equal(isOwnedCleanup(channel,action),true);}
  for(const [channel,action] of [['github','provider-source-discard'],['git','discard-review']] as const){assert.equal(isOwnedCancellation(channel,action),false);assert.equal(isOwnedCleanup(channel,action),true);}
  await f.lock('destination:git');await f.lock('destination:repositories');
  for(const [channel,action] of [['git','apply'],['git','review'],['git','discard'],['github','repositories.clone-source'],['github','repositories.delete'],['github','discard-review'],['git','provider-source-discard'],['downloads','resume'],['cli-workflows','discard-review']] as const){
   assert.equal(isOwnedCleanup(channel,action),false);
  }
  for(const action of [undefined,{},['discard-review'],'discard-review;apply','provider-source-discard.extra'])assert.equal(isOwnedCleanup('git',action),false);
  const guard=async(channel:string,action:string)=>{if(!isOwnedCleanup(channel,action))await f.locks.assertUnlocked(channel==='github'?providerGitLockIds(action):protectedLockIds(channel,action));};
  await guard('git','discard-review');await guard('github','provider-source-discard');
  await assert.rejects(guard('git','apply'),/Element is locked/);await assert.rejects(guard('github','repositories.clone-source'),/Element is locked/);
 }finally{await f.close();}
});

test('original provider destination, command and tab locks protect resolved native receipts independently of generic Git Apply',async()=>{
 const f=await fixture();try{
  for(const [action,id] of [['repositories.clone-source','destination:repositories'],['gists.clone-source','command:gist.clone'],['pulls.checkout-source','tab:pr.checkout']] as const){
   await f.lock(id);await assert.rejects(f.locks.assertUnlocked(providerGitLockIds(action)),/Element is locked/);
   await f.locks.assertUnlocked(protectedLockIds('git','apply'));
   await f.unlock(id);await f.locks.assertUnlocked(providerGitLockIds(action));
   for(const target of providerGitLockIds(action))f.locks.consumeSurfaceUnlock(target);
   await assert.rejects(f.locks.assertUnlocked(providerGitLockIds(action)),/Element is locked/);
  }
 }finally{await f.close();}
});

test('GitHub-issued opaque source receipts repeat stored issuer locks before provider readback',async()=>{
 const f=await fixture(),calls:string[]=[];let completed=0;
 const service=new GitHubService(process.execPath,f.directory,undefined,{
  resolveHost:hostname=>{if(hostname&&hostname!=='github.com')throw Error('Unapproved fixture host');return 'github.com';},
  authorize:async action=>{await f.locks.assertUnlocked(providerGitLockIds(action));},
  completed:async()=>{completed++;},
  request:async(_method,endpoint)=>{calls.push(endpoint);const data=endpoint==='user'?{id:7}:endpoint==='repos/owner/repo'?{id:88,full_name:'owner/repo',clone_url:'https://github.com/owner/repo.git'}:endpoint==='gists/abcdef'?{id:'abcdef',git_pull_url:'https://gist.github.com/abcdef.git'}:endpoint==='repos/owner/repo/pulls/42'?{id:99042,number:42,base:{ref:'main',repo:{id:88,full_name:'owner/repo'}},head:{sha:'a'.repeat(40)}}:undefined;if(!data)throw Error('Unexpected fixture provider path');return {data,hasNext:false};},
 });
 try{
  const cases:Array<[GitHubLocalSourceAction,GitHubPayload,string]>=[['repositories.clone-source',{repository:'owner/repo',id:88},'destination:repositories'],['gists.clone-source',{id:'abcdef'},'command:gist.clone'],['pulls.checkout-source',{repository:'owner/repo',id:42},'tab:pr.checkout']];
  for(const [action,payload,lockId] of cases){
   await f.lock(lockId);await assert.rejects(service.handle(action,payload),/Element is locked/);
   await f.unlock(lockId);const response=await service.handle(action,payload),id=response.detail?.providerTargetId;
   assert.equal(typeof id,'string');assert.equal(response.detail?.url,undefined);assert.equal(response.detail?.accountFingerprint,undefined);
   const target=await service.resolveProviderTarget(String(id));await f.locks.assertUnlocked(providerGitLockIds(action));
   await f.locks.handle('lockAgain',{id:lockId},false);const reads=calls.length;
   await f.locks.assertUnlocked(protectedLockIds('git','apply'));
   await assert.rejects(service.resolveProviderTarget(String(id)),/Element is locked/);assert.equal(calls.length,reads);
   await f.unlock(lockId);assert.deepEqual(await service.resolveProviderTarget(String(id)),target);
  }
  assert.equal(completed,0,'issuing and revalidating a source must not consume a mutation grant');
  await assert.rejects(service.handle('repositories.clone-source',{repository:'owner/repo',id:88,values:{destination:'gists',command:'alias list'}}),/only the selected/);
  service.invalidateReviews();await assert.rejects(service.resolveProviderTarget('renderer-created-receipt'),/expired/);
 }finally{service.close();await f.close();}
});

test('owned Git cancellation remains reachable under locks and cannot cancel another UUID or authorize writes',async()=>{
 const f=await fixture();let release:((value:string|null)=>void)|undefined;
 let selected!:()=>void;const pickerEntered=new Promise<void>(resolve=>selected=resolve);
 const picker=new Promise<string|null>(resolve=>release=resolve);
 const service=new GitService({binary:'git',directory:f.directory,pickWorktree:()=>{selected();return picker;}});
 const request=async(action:GitAction,payload:GitPayload={})=>{if(!isOwnedCancellation('git',action))await f.locks.assertUnlocked(protectedLockIds('git',action));return service.handle(action,payload);};
 try{
  const operationId=randomUUID(),pending=request('open',{operationId});await pickerEntered;
  await f.lock('destination:git');await f.lock('git:apply');
  await assert.rejects(request('review',{task:'init',fields:{name:'must-not-exist'}}),/Element is locked/);
  await assert.rejects(request('apply',{reviewId:randomUUID(),confirmed:true}),/Element is locked/);
  assert.deepEqual(await request('cancel',{operationId:randomUUID()}),{kind:'cancelled',partialEffects:false});assert.ok(service.activeOperations>0);
  await assert.rejects(request('cancel',{operationId:'not-an-owned-uuid'}),/opaque UUID/);assert.ok(service.activeOperations>0);
  assert.deepEqual(await request('cancel',{operationId}),{kind:'cancelled',partialEffects:false});
  release!(f.directory);assert.deepEqual(await pending,{kind:'cancelled',partialEffects:false});assert.equal(service.activeOperations,0);
  for(const action of ['apply','review','open','provider-checkout','cancel;apply',{}])assert.equal(isOwnedCancellation('git',action),false);
  assert.equal(isOwnedCancellation('github','actions.cancel'),false);assert.equal(isOwnedCancellation('downloads','resume'),false);
 }finally{release?.(null);service.close();await f.close();}
});

test('Git review cleanup through locked native guards revokes only the named review without selecting a write action',async()=>{
 const f=await fixture(),parent=join(f.directory,'destinations');await mkdir(parent);
 const service=new GitService({binary:'git',directory:parent,pickWorktree:async()=>parent});
 const request=async(action:GitAction,payload:GitPayload)=>{if(!isOwnedCleanup('git',action))await f.locks.assertUnlocked(protectedLockIds('git',action));return service.handle(action,payload);};
 try{
  const discarded=await request('review',{task:'init',fields:{name:'discarded'}}),retained=await request('review',{task:'init',fields:{name:'retained'}});
  if(discarded.kind!=='review'||retained.kind!=='review')throw Error('Expected native reviews');
  await f.lock('destination:git');
  await assert.rejects(request('discard-review',{reviewId:discarded.reviewId,task:'init',fields:{name:'injected'}}),/cleanup field/);
  await assert.rejects(request('discard-review',{reviewId:'not-an-issued-uuid'}),/opaque UUID/);
  await assert.rejects(request('discard-review',{reviewId:discarded.reviewId,operationId:'not-an-owned-uuid'}),/opaque UUID/);
  assert.equal((await request('discard-review',{reviewId:randomUUID()})).kind,'text');
  for(let count=0;count<2;count++)assert.equal((await request('discard-review',{reviewId:discarded.reviewId})).kind,'text');
  assert.deepEqual(await request('cancel',{operationId:randomUUID(),task:'init',fields:{name:'injected'}}),{kind:'cancelled',partialEffects:false});
  assert.deepEqual(await readdir(parent),[],'cleanup and cancellation create no repository or injected destination');
  await assert.rejects(request('apply',{reviewId:retained.reviewId,confirmed:true}),/Element is locked/);
  await f.unlock('destination:git');
  await assert.rejects(request('apply',{reviewId:discarded.reviewId,confirmed:true}),/already used/);
  const applied=await request('apply',{reviewId:retained.reviewId,confirmed:true});assert.equal(applied.kind,'result');if(applied.kind==='result')assert.equal(applied.ok,true,applied.error);
  assert.deepEqual(await readdir(parent),['retained']);
 }finally{service.close();await f.close();}
});

test('GitHub source cleanup through locked native guards validates issued IDs before host, account or provider reads',async()=>{
 const f=await fixture();let blockedContext=false,hosts=0,authorized=0,reads=0;
 const service=new GitHubService(process.execPath,f.directory,undefined,{
  resolveHost:()=>{hosts++;if(blockedContext)throw Error('Changed fixture host');return 'github.com';},
  authorize:async action=>{authorized++;await f.locks.assertUnlocked(providerGitLockIds(action));},
  request:async(_method,endpoint)=>{reads++;const data=endpoint==='user'?{id:7}:endpoint==='repos/owner/repo'?{id:88,full_name:'owner/repo',clone_url:'https://github.com/owner/repo.git'}:endpoint==='gists/abcdef'?{id:'abcdef',git_pull_url:'https://gist.github.com/abcdef.git'}:undefined;if(!data)throw Error('Unexpected fixture provider path');return {data,hasNext:false};},
 });
 const request=async(action:GitHubLocalSourceAction|'provider-source-discard',payload:GitHubPayload)=>{if(!isOwnedCleanup('github',action))await f.locks.assertUnlocked(protectedLockIds('github',action));return service.handle(action,payload);};
 try{
  const first=await request('repositories.clone-source',{repository:'owner/repo',id:88}),second=await request('gists.clone-source',{id:'abcdef'}),id=String(first.detail?.providerTargetId),other=String(second.detail?.providerTargetId);
  await f.lock('github:repositories.clone-source');blockedContext=true;
  const before={hosts,authorized,reads},lockFile=join(f.directory,'locks','element-locks.json'),bytes=await readFile(lockFile);
  for(const invalid of [{id:'not-an-issued-uuid'},{id:randomUUID()},{id:other,hostname:'forge.example'},{id:other,action:'repositories.delete'},{id:other,values:{url:'https://injected.example/repo.git'}}])await assert.rejects(request('provider-source-discard',invalid as GitHubPayload),/issued opaque|scope replacements/);
  for(let count=0;count<2;count++)assert.deepEqual((await request('provider-source-discard',{id})).items,[]);
  assert.deepEqual({hosts,authorized,reads},before);assert.deepEqual(await readFile(lockFile),bytes);
  await assert.rejects(service.resolveProviderTarget(id),/expired/);assert.deepEqual({hosts,authorized,reads},before);
  blockedContext=false;const retained=await service.resolveProviderTarget(other);assert.equal(retained.kind,'gist');
  await assert.rejects(request('repositories.clone-source',{repository:'owner/repo',id:88}),/Element is locked/);
 }finally{service.close();await f.close();}
});
