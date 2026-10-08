import {app,BrowserWindow,ipcMain,dialog,shell,safeStorage,clipboard,nativeImage,net,type IpcMainInvokeEvent} from 'electron';
import {existsSync,readFileSync,writeFileSync,statSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {Engine} from './engine';
import {handleSquirrelStartup} from './squirrel';
import {AuthService} from './auth';
import {createApiService} from './github-api';
import {CliConfigService} from './cli-config';
import {CliWorkflowsService} from './cli-workflows';
import {WorkspaceStore} from './workspace';
import {PreferencesAdvancedService} from './preferences-advanced';
import {LocalToolsService} from './local-tools';
import {createBundledEngines} from './bundled-engines';
import {serializeExport,type ExportFormat} from '../shared/exports';
import {createAuthHostRegistry} from './auth-hosts';
import {GitHubService} from './github';
import {GitService} from './git';
import {githubDomains} from '../shared/github';
import {nativeGitHubTaskRoutes} from '../shared/github-native';
import {createSecurityService} from './security';
import {startUpdater,getUpdateState,checkForUpdates,restartToInstallUpdate,updateEvents} from './updater';
import {loadCatalog} from './catalog';
import {LocalStore} from './store';
import {StartupPersonalizationService,recordStartupLaunch} from './startup-personalization';
import {createElectronFetch} from './electron-fetch';
import {readBoundedFile} from './bounded-file';
import {listChoices,runGh,ollamaRequest} from './services';
import type {ExecutionRequest,AppSettings} from '../shared/types';
import {nativeLockTargets,protectedLockIds} from '../shared/security';

app.setName('Material Git');
const identity=process.env.MATERIAL_GIT_USER_DATA;
if(identity&&process.env.MATERIAL_GIT_TEST==='1')app.setPath('userData',path.resolve(identity));
const installerLifecycle=handleSquirrelStartup();
if(process.platform==='win32')app.setAppUserModelId('com.squirrel.MaterialGit.MaterialGit');
let window:BrowserWindow;
let quitApproved=false;
const entry=path.join(__dirname,'../renderer/index.html');
const engineByRoot=new Map<string,Engine>();
const activeOperations=new Set<string>();
const approvedRoots=new Set([process.cwd()]);
let workspace=process.cwd();
const platform={win32:'windows',linux:'linux',darwin:'macOS'}[process.platform as 'win32'|'linux'|'darwin'];
const architecture=process.arch==='arm64'?'arm64':'amd64';
const ghName=process.platform==='win32'?'gh.exe':'gh';
const vendor=path.join(app.getAppPath(),'vendor',`gh_2.102.0_${platform}_${architecture}`,'bin',ghName);
const gh=vendor.replace('app.asar'+path.sep,'app.asar.unpacked'+path.sep);
const binary=existsSync(gh)?gh:vendor;
const gitDirectory=path.join(app.getAppPath(),'vendor','git','cmd').replace('app.asar'+path.sep,'app.asar.unpacked'+path.sep);
if(process.platform==='win32')process.env.PATH=gitDirectory+path.delimiter+(process.env.PATH??'');
let store:LocalStore;
async function installedFonts():Promise<string[]>{
 const run=promisify(execFile);
 try{if(process.platform==='linux'){const {stdout}=await run('fc-list',['--format','%{family}\n'],{timeout:5000,maxBuffer:512*1024,windowsHide:true});return [...new Set(stdout.split(/[\n,]/).map(value=>value.trim()).filter(Boolean))].sort();}
 if(process.platform==='win32'){const {stdout}=await run('powershell.exe',['-NoProfile','-NonInteractive','-Command','Add-Type -AssemblyName System.Drawing; @([System.Drawing.Text.InstalledFontCollection]::new().Families.Name) | ConvertTo-Json -Compress'],{timeout:5000,maxBuffer:512*1024,windowsHide:true});const values=JSON.parse(stdout);return Array.isArray(values)?values.filter(value=>typeof value==='string'):[];}}catch{}
 return [];
}
let actionGuard:((channel:string,args:unknown[])=>Promise<()=>void>)|undefined;
function engine(root=workspace){if(!approvedRoots.has(root))throw new Error('Choose the working folder with Browse first');let found=engineByRoot.get(root);if(!found){found=new Engine(loadCatalog(path.join(__dirname,'gh-catalog.json')),root,binary);found.subscribe(op=>{if(op.status==='running')activeOperations.add(op.id);else activeOperations.delete(op.id);if(window&&!window.isDestroyed())window.webContents.send('material:operation-update',op);});engineByRoot.set(root,found);}return found;}
function validateSender(event:IpcMainInvokeEvent){if(!window||event.sender!==window.webContents||event.senderFrame!==window.webContents.mainFrame||!event.senderFrame.url.startsWith(pathToFileURL(entry).href))throw new Error('Untrusted application frame');}
function handle(name:string,fn:(...args:any[])=>unknown){ipcMain.handle('material:'+name,async(event,...args)=>{validateSender(event);const consume=await actionGuard?.(name,args);const result=await fn(...args);consume?.();return result;});}
function sizeBound(data:unknown){const encoded=JSON.stringify(data);if(!encoded||encoded.length>8*1024*1024)throw new Error('Export exceeds the 8 MiB limit');return encoded;}
if(!installerLifecycle)app.whenReady().then(async()=>{
 let startupFirstRun=true;
 try{startupFirstRun=recordStartupLaunch(app.getPath('userData'));}catch{/* Unreadable launch state suppresses decoration without blocking the workspace. */}
 if(!existsSync(binary)){dialog.showErrorBox('Bundled GitHub CLI is missing','Run npm run fetch-dependencies for a source checkout, or reinstall Material Git.');app.quit();return;}
 const workspaceRecords=new WorkspaceStore(app.getPath('userData'),(kind,_id,snapshot)=>{if(kind!=='settings')throw new Error('This record contains review-only metadata. Restore it through its original feature.');return store.update(snapshot);});
 store=new LocalStore(app.getPath('userData'),(action,snapshot)=>{workspaceRecords.recordExternal(snapshot?'settings':'activity',snapshot?'base':'events',action,snapshot??{action});});
 handle('workspace',(action,payload)=>workspaceRecords.dispatch(action,payload));
 const security=createSecurityService({directory:path.join(process.env.MATERIAL_GIT_TEST==='1'?app.getPath('userData'):app.getPath('appData'),'shared-ui-state'),authenticatorDirectory:path.join(app.getPath('userData'),'authenticator'),vault:safeStorage,openRecoveryDirectory:async directory=>{const error=await shell.openPath(directory);if(error)throw new Error(error);},recordMutation:async(action,metadata)=>{workspaceRecords.recordExternal('security','local',action,metadata);}});
 let startupSecurity=await security.start();
 security.registerTargets(nativeLockTargets(loadCatalog(path.join(__dirname,'gh-catalog.json')).commands));
 actionGuard=async(channel,args)=>{if(['bootstrap','security','window','operation','cancel','pick','external','workspace'].includes(channel)||(channel==='github'&&args[0]==='actions.watch-cancel'))return()=>{};const mapped=channel==='cli-config'?'cliConfig':channel==='preferences-advanced'?'settings':channel==='local-tools'||channel==='ollama'?'tools':channel==='cli-workflows'?'execute':channel;const action=typeof args[0]==='string'?args[0]:undefined;const command=channel==='execute'?(args[0] as ExecutionRequest)?.commandId:channel==='cli-workflows'?(args[1] as {commandId?:string})?.commandId:undefined;const ids=protectedLockIds(mapped,action,command);await security.assertUnlocked(ids);return()=>{for(const id of ids)security.consumeSurfaceUnlock(id);};};
 security.subscribe(state=>{startupSecurity=state;if(window&&!window.isDestroyed())window.webContents.send('material:security-update',state);});
 handle('security',(action,payload)=>security.handle(action,payload));
 app.once('will-quit',()=>security.close());
 const hostRegistry=createAuthHostRegistry(app.getPath('userData'));
 await hostRegistry.load();
 security.registerTargets([...githubDomains,'git','extensions','aliases','repository-security'].map(domain=>({id:`destination:${domain}`,label:domain})));
 const githubLockIds=(action:string,payload?:{action?:string})=>{if(action==='apply')return ['github:apply'];const effective=['review','task-definition'].includes(action)?payload?.action||action:action;const domain=effective.split('.')[0],route=nativeGitHubTaskRoutes.find(task=>task.action===effective);return [`destination:${domain==='security'?'repository-security':githubDomains.includes(domain as typeof githubDomains[number])?domain:'repositories'}`,`github:${effective}`,...(route?[`command:${route.commandId.replaceAll(' ','.')}`,`tab:${route.commandId.replaceAll(' ','.')}`]:[])];};
 security.registerTargets(nativeGitHubTaskRoutes.map(task=>({id:`github:${task.action}`,label:task.title,ancestors:githubLockIds(task.action).filter(id=>id!==`github:${task.action}`)})));
 const githubTasks=new GitHubService(binary,workspace,engine(),{resolveHost:hostname=>hostRegistry.resolveHost(hostname).hostname,authorize:async(action,payload)=>{if(action!=='actions.watch-cancel')await security.assertUnlocked(githubLockIds(action,payload));},completed:async(action,payload)=>{for(const id of githubLockIds(action,payload))security.consumeSurfaceUnlock(id);}});
 app.once('will-quit',()=>githubTasks.close());
 handle('github',async(action,payload)=>{if(payload!==undefined&&sizeBound(payload).length>128000)throw new Error('GitHub task exceeds the request limit');if(action!=='actions.watch-cancel'&&accountChanging())throw new Error('Finish or cancel the current account change before starting a GitHub task');const id=randomUUID();activeOperations.add(id);try{return await githubTasks.handle(action,payload);}finally{activeOperations.delete(id);}});
 const auth=new AuthService(binary,workspace,{allowedHosts:hostRegistry.list().map(host=>host.hostname),registerHost:async hostname=>{await hostRegistry.register(hostname);},copyToken:token=>{clipboard.writeText(token);}});
 let accountMutation=false;
 const accountChanging=()=>accountMutation||['starting','waiting'].includes(auth.snapshot().status);
 app.once('will-quit',()=>{void auth.action('cancel');});
 let accountSnapshot='';
 auth.subscribe(state=>{if(state.status==='authenticated'||state.status==='idle'){const snapshot=JSON.stringify(state.accounts);if(snapshot!==accountSnapshot){workspaceRecords.recordExternal('accounts','github','GitHub account status changed',{accounts:state.accounts,credentialsOmitted:true});accountSnapshot=snapshot;}}if(window&&!window.isDestroyed())window.webContents.send('material:auth-update',state);});
 handle('auth',async(action,payload)=>{const changing=['login','switch','logout','refresh','setup-git','register-host'].includes(action);if(changing&&(activeOperations.size||githubTasks.activeOperations.size))throw new Error('Wait for current GitHub operations to finish before changing accounts');if(changing&&accountMutation)throw new Error('An account change is already running');if(changing)accountMutation=true;try{return await auth.action(action,payload);}finally{if(changing)accountMutation=false;}});
 const apiFiles=new Map<string,{file:string;size:number;modified:number}>();
 const githubApi=createApiService({binary,cwd:workspace,resolveHost:hostname=>hostRegistry.resolveHost(hostname),
  readBodyFile:async handle=>{const grant=apiFiles.get(handle);if(!grant)throw new Error('Choose the upload file again');const current=statSync(grant.file);if(current.size!==grant.size||current.mtimeMs!==grant.modified)throw new Error('The upload file changed. Choose it again before reviewing this request.');return {bytes:readBoundedFile(grant.file,64*1024*1024),filename:path.basename(grant.file)};},
  exportBinary:async(bytes,metadata)=>{const result=await dialog.showSaveDialog(window,{title:'Save GitHub API download',defaultPath:metadata.filename||'github-download.bin'});if(result.canceled||!result.filePath)return false;writeFileSync(result.filePath,bytes,{mode:0o600});return true;}
 });
 handle('api',async(action:string,payload:unknown)=>{
  if(action==='hosts')return hostRegistry.list().map(({hostname,label})=>({hostname,label}));
  if(action==='pick-body-file'){const result=await dialog.showOpenDialog(window,{title:'Choose a file to upload to GitHub',properties:['openFile']});if(result.canceled||!result.filePaths[0])return null;const file=result.filePaths[0],stats=statSync(file);if(!stats.isFile()||stats.size>64*1024*1024)throw new Error('Choose a regular file smaller than 64 MiB');if(apiFiles.size>=32)apiFiles.delete(apiFiles.keys().next().value!);const handle=randomUUID();apiFiles.set(handle,{file,size:stats.size,modified:stats.mtimeMs});return {handle,filename:path.basename(file),size:stats.size};}
  if(!['catalogue','describe','execute','graphqlCatalogue','graphqlDescribe','graphqlBuild','graphqlExecute','review','graphqlReview','apply','cancelReview'].includes(action))throw new Error('Unknown GitHub API action');
  if(payload!==undefined&&sizeBound(payload).length>256000)throw new Error('API request exceeds 256 KB');
  const bound=['execute','graphqlExecute','review','graphqlReview','apply'].includes(action);if(bound&&accountChanging())throw new Error('Finish or cancel the current account change before starting an API request');
  const id=randomUUID();if(bound)activeOperations.add(id);
  try{return await (githubApi[action as keyof typeof githubApi] as (input:unknown)=>unknown)(payload);}finally{activeOperations.delete(id);}
 });
 const cliConfiguration=new CliConfigService(binary,{chooseExecutable:async definition=>{const result=await dialog.showOpenDialog(window,{title:definition.filePicker?.title,properties:['openFile'],...(process.platform==='win32'?{filters:[{name:'Executable applications',extensions:['exe']}]}:{})});return result.canceled?null:result.filePaths[0]??null;}});
 handle('cli-config',async(action,payload)=>{const id=randomUUID();if(action==='apply')activeOperations.add(id);try{return await cliConfiguration.action(action,payload);}finally{activeOperations.delete(id);}});
 const cliWorkflows=new CliWorkflowsService(loadCatalog(path.join(__dirname,'gh-catalog.json')),engine(),workspace,binary,{chooseFile:async()=>{const result=await dialog.showOpenDialog(window,{title:'Choose GitHub CLI aliases',properties:['openFile'],filters:[{name:'YAML aliases',extensions:['yml','yaml']}]});return result.canceled?null:result.filePaths[0]??null;}});
 handle('cli-workflows',(action,payload)=>cliWorkflows.handle(action,payload));
 const preferencesAdvanced=new PreferencesAdvancedService({directory:path.join(app.getPath('userData'),'preferences'),vault:safeStorage,base:()=>store.settings(),record:action=>{store.record(action);workspaceRecords.recordExternal('schedules','settings',action,preferencesAdvanced.status().document);},fonts:installedFonts});
 await preferencesAdvanced.start();
 workspaceRecords.setRestorer(async(kind,_id,snapshot)=>{if(kind==='settings'){const result=store.update(snapshot);await preferencesAdvanced.refresh(false);return result;}if(kind==='schedules'){const result=await preferencesAdvanced.handle('save',snapshot);return result.document;}throw new Error('This revision contains review-only metadata. Credentials and external account changes must be managed through the original feature.');});
 preferencesAdvanced.subscribe(status=>{if(window&&!window.isDestroyed()){window.setTitle(status.effective.displayName);window.webContents.send('material:preferences-advanced-update',status);}});
 handle('preferences-advanced',(action,payload)=>preferencesAdvanced.handle(action,payload));
 app.once('will-quit',()=>preferencesAdvanced.close());
 const bundledEngines=createBundledEngines({vendorDirectory:path.join(app.getAppPath(),'vendor','converters').replace('app.asar'+path.sep,'app.asar.unpacked'+path.sep),workerPath:path.join(__dirname,'bundled-engines-worker.cjs')});
 const localTools=new LocalToolsService({engines:bundledEngines,storageDirectory:path.join(app.getPath('userData'),'local-tools'),pickSources:async()=>{const result=await dialog.showOpenDialog(window,{title:'Choose files to convert',properties:['openFile','multiSelections']});return result.canceled?[]:result.filePaths;},pickDestination:async suggestedName=>{const result=await dialog.showSaveDialog(window,{title:'Save converted file',defaultPath:suggestedName});return result.canceled?null:result.filePath??null;},imageEngine:async(bytes,target)=>{const image=nativeImage.createFromBuffer(Buffer.from(bytes));if(image.isEmpty())throw new Error('This image could not be decoded');return target==='png'?image.toPNG():image.toJPEG(90);},imageEngineProof:`Electron ${process.versions.electron} native image codec`});
 handle('local-tools',(action,payload)=>localTools.request(action,payload));
 app.once('will-quit',()=>localTools.dispose());
 const gitTasks=new GitService({binary:process.platform==='win32'?path.join(gitDirectory,'git.exe'):'git',directory:app.getPath('userData'),...(process.platform==='linux'?{helperDirectory:path.join(app.getAppPath(),'vendor','git-linux')}:{}),pickWorktree:async()=>{const result=await dialog.showOpenDialog(window,{title:'Choose a Git working tree',properties:['openDirectory']});return result.canceled?null:result.filePaths[0]??null;},pickFile:async()=>{const result=await dialog.showOpenDialog(window,{title:'Choose a Git input file',properties:['openFile'],filters:[{name:'Git patches and bundles',extensions:['patch','diff','mbox','bundle']},{name:'All files',extensions:['*']}]});return result.canceled?null:result.filePaths[0]??null;}});
 handle('git',async(action,payload)=>{if(payload!==undefined&&sizeBound(payload).length>1024*1024)throw new Error('Git request exceeds the input limit');const id=payload?.reviewId??randomUUID();if(action!=='cancel')activeOperations.add(id);try{return await gitTasks.handle(action,payload);}finally{activeOperations.delete(id);}});
 app.once('will-quit',()=>gitTasks.close());
 const startupPersonalization=new StartupPersonalizationService({directory:path.join(app.getPath('userData'),'startup-personalization'),fetch:createElectronFetch(net),context:()=>{const effective=preferencesAdvanced.status().effective,phase=getUpdateState().phase;return {firstRun:startupFirstRun,busy:activeOperations.size>0||githubTasks.activeOperations.size>0||localTools.activeJobs()||accountChanging(),error:!startupSecurity.available||Boolean(startupSecurity.error)||phase==='failed',updating:!['idle','unsupported'].includes(phase),schoolMode:startupSecurity.schoolMode.active,quiet:effective.lowStimulation||effective.quietNarration};}});
 handle('startup-personalization',(...args:unknown[])=>{if(args.length)throw new Error('Startup personalization takes no arguments');return startupPersonalization.startup();});
 handle('updates',(action:string)=>{if(action==='check')return checkForUpdates();if(action==='restart'){if(activeOperations.size||githubTasks.activeOperations.size||localTools.activeJobs())throw new Error('Wait for running operations or cancel them before restarting');const previous=quitApproved;quitApproved=true;try{restartToInstallUpdate();}catch(error){quitApproved=previous;throw error;}}else if(action!=='status')throw new Error('Unknown update action');return getUpdateState();});
 handle('bootstrap',async()=>{
  const settled=await Promise.allSettled([runGh(binary,['--version'],workspace),runGh(binary,['api','user'],workspace),runGh(binary,['repo','view','--json','nameWithOwner'],workspace)]);
  const output=(i:number)=>settled[i].status==='fulfilled'?(settled[i] as PromiseFulfilledResult<string>).value:null;
  let provenance:{version:string;builtAt:string|null}={version:app.getVersion(),builtAt:null};try{provenance=JSON.parse(readFileSync(path.join(__dirname,'provenance.json'),'utf8'));}catch{}
  return {startupFirstRun,catalog:loadCatalog(path.join(__dirname,'gh-catalog.json')),settings:store.settings(),persistedSettingsKeys:store.persistedSettingsKeys(),preferencesAdvanced:preferencesAdvanced.status(),...provenance,platform:process.platform,ghVersion:output(0)?.split('\n')[0]??null,authenticated:!!output(1),account:output(1)?JSON.parse(output(1)!).login:null,repository:output(2)?JSON.parse(output(2)!).nameWithOwner:null,operations:[]};
 });
 handle('execute',(request:ExecutionRequest)=>{if(sizeBound(request).length>256000)throw new Error('Request too large');const selected=request.cwd?path.resolve(request.cwd):workspace;const op=engine(selected).execute(request);store.record(`Started ${op.commandId}`);return op;});
 handle('operation',(id:string)=>{for(const e of engineByRoot.values()){try{return e.operation(id);}catch{}}throw new Error('Unknown operation');});
 handle('cancel',(id:string)=>{for(const e of engineByRoot.values()){try{e.operation(id);e.cancel(id);return;}catch{}}throw new Error('Unknown operation');});
 handle('choices',(entity:string,context:unknown)=>{if(typeof entity!=='string'||entity.length>100||!context||typeof context!=='object')throw new Error('Invalid picker');return listChoices(binary,workspace,entity,context);});
 handle('pick',async(kind:string,options:{extensions?:string[];multiple?:boolean}={})=>{if(!['file','directory'].includes(kind))throw new Error('Unknown picker');const extensions=options.extensions?.filter(v=>typeof v==='string'&&/^[a-z0-9]{1,8}$/i.test(v));const result=await dialog.showOpenDialog(window,{properties:[kind==='file'?'openFile':'openDirectory',...(options.multiple?['multiSelections' as const]:[])],...(extensions?.length?{filters:[{name:'Supported files',extensions}]}:{})});if(result.canceled)return [];if(kind==='directory'){for(const root of result.filePaths)approvedRoots.add(root);}return result.filePaths;});
 handle('settings',async(patch:Partial<AppSettings>)=>{const result=store.update(patch);await preferencesAdvanced.refresh(false);return result;});
 handle('history',()=>store.history());
 handle('vocabulary',async(action:string)=>{if(action==='clear')store.clearVocabulary();else if(action==='import'){const result=await dialog.showOpenDialog(window,{properties:['openFile'],filters:[{name:'Personal vocabulary',extensions:['json']}]});if(!result.canceled&&result.filePaths[0])store.setVocabulary(readBoundedFile(result.filePaths[0],65536));}else if(action!=='status')throw new Error('Unknown vocabulary operation');const current=store.vocabulary();return {loaded:!!current,...(current?{entries:current.entries}:{})};});
 handle('export',async(data:unknown,format:string)=>{sizeBound(data);const exported=serializeExport(data,format as ExportFormat);const result=await dialog.showSaveDialog(window,{defaultPath:`material-git-export.${exported.extension}`,filters:[{name:format.toUpperCase(),extensions:[exported.extension]}]});if(result.canceled||!result.filePath)return false;writeFileSync(result.filePath,exported.text,{mode:0o600});store.record('Requested data exported');return true;});
 handle('external',async(value:string)=>{const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password)throw new Error('Only HTTPS links can open externally');await shell.openExternal(url.href);});
 handle('window',(action:string)=>{if(action==='minimize')window.minimize();else if(action==='maximize')window.isMaximized()?window.unmaximize():window.maximize();else if(action==='close')window.close();else if(action==='confirm-close'){quitApproved=true;localTools.cancelAll();gitTasks.cancelAll();githubTasks.cancelAll();for(const e of engineByRoot.values())for(const id of activeOperations){try{e.cancel(id);}catch{}}window.close();}else throw new Error('Unknown window action');});
 handle('ollama',ollamaRequest);
 window=new BrowserWindow({width:1420,height:940,minWidth:760,minHeight:600,frame:false,icon:path.join(app.getAppPath(),'assets/icon.png'),backgroundColor:'#101412',title:store.settings().displayName,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});
 window.on('close',event=>{if(!quitApproved){event.preventDefault();window.webContents.send('material:close-request');}});
 window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 window.webContents.on('will-navigate',(event,url)=>{if(url!==pathToFileURL(entry).href)event.preventDefault();});
 window.webContents.session.setPermissionRequestHandler((_webContents,_permission,callback)=>callback(false));
 await window.loadFile(entry);
 updateEvents.on('state',state=>{if(!window.isDestroyed())window.webContents.send('material:update-state',state);});
 startUpdater();
});
app.on('window-all-closed',()=>app.quit());
