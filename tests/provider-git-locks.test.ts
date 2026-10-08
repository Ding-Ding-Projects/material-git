import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {GitService} from '../src/main/git';
import {loadCatalog} from '../src/main/catalog';
import {createElementLocks} from '../src/main/element-locks';
import {isOwnedCancellation,nativeLockTargets,protectedLockIds,providerGitLockIds,providerGitKindLockIds,providerGitLockTargets} from '../src/shared/security';
import type {GitAction,GitPayload} from '../src/shared/git';

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
