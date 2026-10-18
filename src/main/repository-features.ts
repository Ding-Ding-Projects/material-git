import {app,dialog,shell,safeStorage,net,type BrowserWindow} from 'electron';
import {mkdirSync} from 'node:fs';
import {realpath} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import type {AuthService} from './auth';
import type {createAuthHostRegistry} from './auth-hosts';
import type {DownloadDependencies} from './downloads';
import type {GitService} from './git';
import {BuildToolsService} from './build-tools';
import {BuildRepairService} from './build-repair';
import {RepositoryFinishService} from './repository-finish';
import {CheapLfsService} from './cheap-lfs/service';
import {checkPayloadReady} from './cheap-lfs/commit';
import {GitIgnoreService} from './git-ignore';
import {acquireRepositoryLock} from './repository-locks';
import {createElectronFetch} from './electron-fetch';
import {createRepositoryAccountProvider,createRepositoryGitRunner,createRepositorySecrets} from './repository-native-host';
import type {BuildToolsRequest} from '../shared/build-tools';
import type {RepositoryFinishAction,RepositoryFinishPayload} from '../shared/repository-finish';
import type {CheapLfsAction,CheapLfsPayload} from '../shared/cheap-lfs';
import type {GitIgnoreAction,GitIgnoreRequest} from '../shared/git-ignore';

interface RepositoryFeatureOptions {
 git:GitService;auth:AuthService;hosts:ReturnType<typeof createAuthHostRegistry>;
 credentials:Pick<DownloadDependencies,'accountFingerprint'|'token'>;gitBinary:string;
 window:()=>BrowserWindow;accountChanging:()=>boolean;accountRevision:()=>number;
 handle:(name:string,handler:(...args:any[])=>unknown)=>void;
 authorizeLargeFiles:()=>Promise<void>;completeLargeFiles:()=>void;
}
/** Renderer input reaches only typed services backed by native folder grants. */
export function installRepositoryFeatures(options:RepositoryFeatureOptions){
 let inFlight=0;
 const handle=(channel:string,work:(...args:any[])=>unknown)=>options.handle(channel,async(...args:any[])=>{inFlight++;try{return await work(...args);}finally{inFlight--;}});
 const directory=path.join(app.getPath('userData'),'repository-tools'),hooks=path.join(directory,'disabled-hooks');mkdirSync(hooks,{recursive:true,mode:0o700});
 const run=createRepositoryGitRunner(options.gitBinary,hooks);
 const secrets=createRepositorySecrets(path.join(directory,'protected-secrets'),safeStorage);
 const publicTransport=createElectronFetch(net);
 const approvedProvider=(url:URL)=>options.hosts.list().some(host=>[host.restOrigin,host.uploadsOrigin].filter(Boolean).some(base=>{const allowed=new URL(base!);return url.origin===allowed.origin&&(allowed.pathname==='/'||url.pathname===allowed.pathname||url.pathname.startsWith(allowed.pathname.replace(/\/$/,'')+'/'));}));
 const account=createRepositoryAccountProvider({state:()=>options.auth.snapshot(),stateRevision:options.accountRevision,resolveHost:hostname=>options.hosts.resolveHost(hostname),credentials:options.credentials,fetch:createElectronFetch(net,{allowMutation:true,authorizeHeader:approvedProvider})});
 const chooseDirectory=async(title:string)=>{const result=await dialog.showOpenDialog(options.window(),{title,properties:['openDirectory','createDirectory']});return result.canceled?null:result.filePaths[0]??null;};
 const openPath=async(file:string)=>{const error=await shell.openPath(file);if(error)throw Error('The operating system could not open the selected file or folder');};
 const resolve=async(id:string)=>options.git.resolveApprovedWorktree(id);
 const largeFiles=new CheapLfsService({
  resolveWorktree:async id=>{const grant=await resolve(id);const result=await options.git.handle('status',{worktreeId:id});if(result.kind!=='snapshot')throw Error('The repository snapshot is unavailable');const remote=await run({root:grant.root,argv:['remote','get-url','origin'],maximumBytes:65536});return {id,...grant,head:result.snapshot.head,branch:result.snapshot.branch,remoteUrl:remote.exitCode===0?remote.stdout.toString('utf8').trim():null};},
  executeGit:run,selectedAccount:async()=>{if(options.accountChanging())throw Error('Finish changing accounts before starting a large-file request');return account();},
  preferencesDirectory:path.join(directory,'large-files'),...secrets,
  fetch:(url,init)=>publicTransport(url,{...init,redirect:'manual',signal:AbortSignal.any([...(init?.signal?[init.signal]:[]),AbortSignal.timeout(5*60*1000)])}),
  dockerCredentials:async()=>{const bytes=await secrets.readSecret('cheap-lfs-docker-hub');if(!bytes)throw Error('Configure Docker Hub credentials in Large files first');try{const value=JSON.parse(bytes.toString('utf8'));if(typeof value.username!=='string'||typeof value.token!=='string'||!value.username||!value.token)throw Error();return {username:value.username,token:value.token};}catch{throw Error('Protected Docker Hub credentials are unavailable');}finally{bytes.fill(0);}},
  chooseFiles:async id=>{const grant=await resolve(id),result=await dialog.showOpenDialog(options.window(),{title:'Choose large files in this repository',defaultPath:grant.root,properties:['openFile','multiSelections']});if(result.canceled)return [];const selected:string[]=[];for(const file of result.filePaths){const canonical=await realpath(file),relative=path.relative(grant.root,canonical);if(!relative||relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))throw Error('Choose files within the approved repository');selected.push(relative.split(path.sep).join('/'));}return selected;},
  emitProgress:event=>{const window=options.window();if(window&&!window.isDestroyed())window.webContents.send('material:cheap-lfs-progress',event);},
  openExternal:async url=>{const parsed=new URL(url);if(parsed.protocol!=='https:'||parsed.username||parsed.password)throw Error('Choose a valid HTTPS provider page');await shell.openExternal(url);},openDirectory:openPath
 });
 options.git.setLargeFileCoordinator(largeFiles,options.authorizeLargeFiles,options.completeLargeFiles);
 const finish=new RepositoryFinishService({binary:options.gitBinary,directory:path.join(directory,'completion'),resolveWorktree:resolve,checkPayloadReady:root=>checkPayloadReady(root,run)});
 const repair=new BuildRepairService({storageDirectory:path.join(directory,'repair-clis'),gitBinary:options.gitBinary,fetch:(input,init)=>createElectronFetch(net)(input instanceof Request?input.url:String(input),{...init,redirect:'manual'})});
 const build=new BuildToolsService({storageDirectory:path.join(directory,'installers'),resolveApprovedWorktree:resolve,gitBinary:options.gitBinary,
  pickExecutable:async()=>{const result=await dialog.showOpenDialog(options.window(),{title:'Choose a build or run executable',properties:['openFile'],...(process.platform==='win32'?{filters:[{name:'Executable programs',extensions:['exe','cmd','bat']}]}:{})});return result.canceled?null:result.filePaths[0]??null;},
  pickExportDirectory:()=>chooseDirectory('Export installers to folder'),
  openArtifact:async(file,action)=>{if(action==='reveal')shell.showItemInFolder(file);else await openPath(file);},repairBuild:request=>repair.repairBuild(request)
 });
 const ignore=new GitIgnoreService({resolve,temporaryDirectory:path.join(directory,'ignore-preview'),run:async(root,argv,input)=>{const result=await run({root,argv,input,maximumBytes:8*1024*1024});const output=result.stdout.toString('utf8');if(!Buffer.from(output).equals(result.stdout))throw Error('Ignore preview requires valid UTF-8 Git output');return {output,error:result.stderr,exitCode:result.exitCode};}});
 handle('build-tools',(request:BuildToolsRequest)=>build.request(request));
 handle('repository-finish',(action:RepositoryFinishAction,payload?:RepositoryFinishPayload)=>{if(action!=='cancel'&&options.accountChanging())throw Error('Finish changing accounts before repository completion');return finish.handle(action,payload);});
 handle('git-ignore',async(action:GitIgnoreAction,payload:GitIgnoreRequest)=>{let release:(()=>void)|undefined;if(action==='save'){const grant=await resolve(payload.worktreeId);release=acquireRepositoryLock(grant.commonDir,randomUUID());}try{return await ignore.handle(action,payload);}finally{release?.();}});
 handle('cheap-lfs',async(action:CheapLfsAction,payload:CheapLfsPayload)=>{if(action!=='cancel'&&options.accountChanging())throw Error('Finish changing accounts before large-file operations');let release:(()=>void)|undefined;if(action==='apply'||action==='ignored-apply'){const grant=await resolve(payload.worktreeId!);release=acquireRepositoryLock(grant.commonDir,randomUUID());}try{return await largeFiles.handle(action,payload);}finally{release?.();}});
 let disposing:Promise<void>|undefined;
 return {largeFiles,activeJobs:()=>inFlight+finish.activeJobs()+build.activeJobs(),dispose:()=>disposing??=(async()=>{finish.dispose();build.dispose();ignore.dispose();await largeFiles.dispose();})()};
}
