import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import ts from 'typescript';
import {createElementLocks} from '../src/main/element-locks';
import {loadCatalog} from '../src/main/catalog';
import {isOwnedCleanup,nativeLockTargets,protectedLockIds,providerGitLockIds,providerGitLockTargets} from '../src/shared/security';

test('application IPC guard preserves original one-use handoff locks until native mutation and leaves owned cancellation reachable',async()=>{
 const source=await readFile(new URL('../src/main/main.ts',import.meta.url),'utf8');
 const tree=ts.createSourceFile('main.ts',source,ts.ScriptTarget.Latest,true);let expression='';
 const visit=(node:ts.Node)=>{if(ts.isBinaryExpression(node)&&node.left.getText(tree)==='actionGuard'&&ts.isArrowFunction(node.right))expression=node.right.getText(tree);ts.forEachChild(node,visit);};visit(tree);assert.ok(expression);
 const javascript=ts.transpileModule(`globalThis.guard=${expression};`,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 const directory=await mkdtemp(join(tmpdir(),'mg-main-handoff-guard-'));
 try{
  const security=createElementLocks({directory,encrypt:value=>Buffer.from(value).toString('base64'),decrypt:value=>Buffer.from(value,'base64').toString(),hash:value=>'fixture:'+value,verify:(value,hash)=>hash==='fixture:'+value,verifyOtp:()=>false,validateOtp:value=>value});
  security.registerTargets([...nativeLockTargets(loadCatalog().commands),...providerGitLockTargets(),{id:'destination:git',label:'git'}]);
  const binding:{guard?:(channel:string,args:unknown[])=>Promise<()=>void>}={};
  new Function('globalThis','security','protectedLockIds','isOwnedCleanup',javascript)(binding,security,protectedLockIds,isOwnedCleanup);
  for(const action of ['repositories.clone-source','gists.clone-source','pulls.checkout-source']){
   const target=`github:${action}`;
   await security.handle('lockSet',{id:target,policy:'password',password:'fixture-password',duration:{kind:'surface'},disclosed:true},false);
   await assert.rejects(binding.guard!('github',[action,{}]),/locked/);
   await security.handle('lockVerify',{id:target,password:'fixture-password'},false);
   const completeReceipt=await binding.guard!('github',[action,{}]);completeReceipt();
   await security.assertUnlocked(providerGitLockIds(action));
   for(const id of providerGitLockIds(action))security.consumeSurfaceUnlock(id);
   await assert.rejects(security.assertUnlocked(providerGitLockIds(action)),/locked/);
  }
  await security.handle('lockSet',{id:'destination:git',policy:'password',password:'fixture-password',duration:{kind:'surface'},disclosed:true},false);
  for(const [channel,action] of [['git','cancel'],['git','discard-review'],['github','provider-source-discard']]){const cleanup=await binding.guard!(channel,[action,{id:'only-the-native-service-validates-this'}]);cleanup();}
  await assert.rejects(binding.guard!('git',['apply',{confirmed:true}]),/locked/);
 }finally{await rm(directory,{recursive:true,force:true});}
});
