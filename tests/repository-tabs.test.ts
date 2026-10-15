import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,symlinkSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {workspaceDefaults,validateWorkspace,validateEnvelope} from '../src/shared/workspace';
import {migrateDesktopTabs,openWorkspaceTab,tabLane} from '../src/shared/workspace-tabs';
import {WorkspaceStore} from '../src/main/workspace';
import {GitService} from '../src/main/git';

test('explicit targets deduplicate repository and utility tabs without changing group collapse or drafts',()=>{
 let state={...structuredClone(workspaceDefaults),groups:[{id:'work',label:'Work',color:'#abcdef',collapsed:true,pinned:false}]};
 state=openWorkspaceTab(state,{kind:'github',hostname:'GITHUB.COM',repository:'Owner/Example'},'Example','first');
 state.tabs[0]={...state.tabs[0],group:'work',pinned:true,lane:'issues'};
 const focused=openWorkspaceTab(state,{kind:'github',hostname:'github.com',repository:'owner/example'},'Other label','duplicate');
 assert.equal(focused.tabs.length,1);assert.equal(focused.activeTab,'first');assert.equal(focused.lane,'issues');assert.equal(focused.groups[0].collapsed,true);assert.equal(focused.tabs[0].label,'Example');
 const utility=openWorkspaceTab(focused,{kind:'utility',lane:'settings'},'Settings','settings');
 assert.equal(openWorkspaceTab(utility,{kind:'utility',lane:'settings'},'Settings','duplicate').tabs.length,2);
});

test('legacy tabs preserve all layout metadata and migrate through native history and export',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'repository-tabs-'));try{
 const old={...structuredClone(workspaceDefaults),tabs:[{id:'git',label:'My source control',pinned:true,group:'work'},{id:'settings',label:'Preferences',pinned:false,group:''}],groups:[{id:'work',label:'Work',color:'#abcdef',collapsed:true,pinned:true}],activeTab:'git',lane:'git',dock:'bottom' as const};
 const store=new WorkspaceStore(dir);store.dispatch('save',old);const historical=store.dispatch('status').revisions![0];
 const migrated=migrateDesktopTabs(validateWorkspace(old),['git','settings']);store.dispatch('save',migrated);
 assert.deepEqual(migrated.tabs.map(({target,...tab})=>tab),old.tabs);assert.deepEqual(migrated.groups,old.groups);assert.equal(tabLane(migrated.tabs[0]),'git');
 assert.deepEqual(new WorkspaceStore(dir).dispatch('status').state,migrated);
 const envelope=validateEnvelope(store.dispatch('export',{kind:'workspace'}).export);assert.deepEqual(envelope.records,migrated);
 store.dispatch('restore',{id:historical.id});assert.deepEqual(store.dispatch('status').state,old);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('tab target validation rejects paths, native grants, malformed identities and duplicate repositories atomically',()=>{
 const target={kind:'local' as const,key:'a'.repeat(64)},state=openWorkspaceTab(structuredClone(workspaceDefaults),target,'Example','local-one');
 assert.equal(validateWorkspace(state).tabs[0].target?.kind,'local');
 for(const invalid of [{...target,root:'/private/path'},{...target,worktreeId:'native-grant'},{kind:'local',key:'/private/path'},{kind:'github',hostname:'https://github.com',repository:'owner/name'},{kind:'utility',lane:'unsupported'}])assert.throws(()=>validateWorkspace({...state,tabs:[{...state.tabs[0],target:invalid}]}));
 assert.throws(()=>validateWorkspace({...state,tabs:[...state.tabs,{...state.tabs[0],id:'duplicate'}]}));
 assert.throws(()=>validateWorkspace({...state,tabs:[{...state.tabs[0],lane:'settings'}]}));
 const utility=openWorkspaceTab(structuredClone(workspaceDefaults),{kind:'utility',lane:'settings'},'Settings','settings');assert.throws(()=>validateWorkspace({...utility,tabs:[...utility.tabs,{...utility.tabs[0],id:'second-settings'}]}));
 assert.equal(JSON.stringify(validateWorkspace(state)).includes('/private/path'),false);
});

test('native picker canonicalizes aliases, distinguishes working trees, and keeps repository grants independent',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'repository-identity-')),first=path.join(dir,'first'),second=path.join(dir,'second'),linked=path.join(dir,'linked'),alias=path.join(dir,'alias');
 for(const root of [first,second]){mkdirSync(root);execFileSync('git',['init','--quiet',root]);execFileSync('git',['-C',root,'-c','user.name=Test','-c','user.email=test@example.invalid','commit','--quiet','--allow-empty','--no-gpg-sign','-m','Initial']);}
 execFileSync('git',['-C',first,'worktree','add','--quiet','--detach',linked]);symlinkSync(first,alias,'dir');let selected=first;
 const service=new GitService({binary:'git',directory:dir,pickWorktree:async()=>selected});
 try{const open=async()=>{const result=await service.handle('open');assert.equal(result.kind,'snapshot');if(result.kind!=='snapshot')throw Error();return result.snapshot;};const a=await open();selected=alias;const same=await open();assert.equal(same.repositoryId,a.repositoryId);assert.equal(same.worktreeId,a.worktreeId);selected=second;const b=await open();selected=linked;const c=await open();assert.notEqual(b.repositoryId,a.repositoryId);assert.notEqual(c.repositoryId,a.repositoryId);assert.equal(c.commonDir,a.commonDir);
 const aStatus=await service.handle('status',{worktreeId:a.worktreeId});assert.equal(aStatus.kind,'snapshot');if(aStatus.kind==='snapshot')assert.equal(aStatus.snapshot.root,first);
 const bStatus=await service.handle('status',{worktreeId:b.worktreeId});assert.equal(bStatus.kind,'snapshot');if(bStatus.kind==='snapshot')assert.equal(bStatus.snapshot.root,second);
 }finally{service.close();rmSync(dir,{recursive:true,force:true});}
});
