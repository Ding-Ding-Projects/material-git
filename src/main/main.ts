import {CameraPermission} from './camera-permission';
import {decodeAuthenticatorQrImage,inspectQrImage,QR_IMAGE_LIMITS} from './authenticator-media';
import {validateAuthenticatorBackupEnvelope} from './authenticator-store';
import {serializeAppearanceExport} from './appearance-export';
import {activeHostAccount} from '../shared/account-context.js';
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
import {DownloadQueue} from './downloads';
import {createNativeDownloadDeps} from './downloads-native';
import type {DownloadRequest} from '../shared/downloads';
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
import {nativeLockTargets,protectedLockIds,cliWorkflowLockIds,providerGitLockIds,providerGitKindLockIds,providerGitLockTargets,isOwnedCleanup} from '../shared/security';

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
 const cameraPermission=new CameraPermission();
 const security=createSecurityService({chooseSensitiveImport:async()=>{const result=await dialog.showOpenDialog(window,{title:'Choose an encrypted authenticator backup',properties:['openFile'],filters:[{name:'Encrypted authenticator backup',extensions:['json']}]});if(result.canceled||!result.filePaths[0])return null;try{return readBoundedFile(result.filePaths[0],1500000).toString('utf8');}catch{throw new Error('Choose an encrypted authenticator backup within 1.5 MB.');}},chooseQrImage:async()=>{const result=await dialog.showOpenDialog(window,{title:'Choose an authenticator QR image',properties:['openFile'],filters:[{name:'PNG and JPEG images',extensions:['png','jpg','jpeg']}]});if(result.canceled||!result.filePaths[0])return null;try{const bytes=readBoundedFile(result.filePaths[0],QR_IMAGE_LIMITS.bytes);inspectQrImage(bytes);return bytes;}catch{throw new Error('Choose a valid PNG or JPEG QR image within 8 MiB and 2048 by 2048 pixels.');}},clipboardQrImage:async()=>{const items=await clipboard.read(),images=items.filter(item=>item.types.includes('image/png')||item.types.includes('image/jpeg'));if(!images.length)return null;if(images.length!==1)throw new Error('Copy one QR image before importing.');const item=images[0],blob=await item.getType(item.types.includes('image/png')?'image/png':'image/jpeg');if(blob.size>QR_IMAGE_LIMITS.bytes)throw new Error('The clipboard QR image exceeds 8 MiB.');const bytes=new Uint8Array(await blob.arrayBuffer());inspectQrImage(bytes);return bytes;},decodeQrImage:decodeAuthenticatorQrImage,requestCameraPermission:async()=>{if(!window||window.isDestroyed()||window.webContents.mainFrame.url!==pathToFileURL(entry).href)return false;return cameraPermission.arm(window.webContents.id,window.webContents.mainFrame.routingId,pathToFileURL(entry).href);},saveSensitiveExport:async text=>{if(Buffer.byteLength(text,'utf8')>1500000)throw new Error('The encrypted authenticator backup exceeds the export limit.');const envelope=validateAuthenticatorBackupEnvelope(JSON.parse(text));const result=await dialog.showSaveDialog(window,{title:'Save encrypted authenticator backup',defaultPath:'material-git-authenticator-backup.json',filters:[{name:'Encrypted authenticator backup',extensions:['json']}]});if(result.canceled||!result.filePath)return false;writeFileSync(result.filePath,JSON.stringify(envelope),{mode:0o600,flag:'wx'});return true;},directory:path.join(process.env.MATERIAL_GIT_TEST==='1'?app.getPath('userData'):app.getPath('appData'),'shared-ui-state'),authenticatorDirectory:path.join(app.getPath('userData'),'authenticator'),vault:safeStorage,openRecoveryDirectory:async directory=>{const error=await shell.openPath(directory);if(error)throw new Error(error);},recordMutation:async(action,metadata)=>{workspaceRecords.recordExternal('security','local',action,metadata);}});
 let startupSecurity=await security.start();
 security.registerTargets(nativeLockTargets(loadCatalog(path.join(__dirname,'gh-catalog.json')).commands));
 actionGuard=async(channel,args)=>{if(['bootstrap','security','window','operation','cancel','pick','external','workspace'].includes(channel)||channel==='auth'&&args[0]==='ssh-key-discard'||isOwnedCleanup(channel,typeof args[0]==='string'?args[0]:(args[0] as {action?:string}|undefined)?.action))return()=>{};const mapped=channel==='cli-config'?'cliConfig':['preferences-advanced','appearance-export'].includes(channel)?'settings':channel==='local-tools'||channel==='ollama'?'tools':channel==='cli-workflows'?'execute':channel;const action=channel==='downloads'?(args[0] as {action?:string}|undefined)?.action:typeof args[0]==='string'?args[0]:undefined;const command=channel==='execute'?(args[0] as ExecutionRequest)?.commandId:channel==='cli-workflows'?(args[1] as {commandId?:string})?.commandId:undefined;const ids=protectedLockIds(mapped,action,command);await security.assertUnlocked(ids);return()=>{if(channel==='auth'&&['ssh-key-review','ssh-key-apply'].includes(action||''))return;if(channel==='github'&&['repositories.clone-source','gists.clone-source','pulls.checkout-source'].includes(action||''))return;for(const id of ids)security.consumeSurfaceUnlock(id);};};
 security.subscribe(state=>{startupSecurity=state;if(window&&!window.isDestroyed())window.webContents.send('material:security-update',state);});
 handle('security',(action,payload)=>security.handle(action,payload));
 app.once('will-quit',()=>security.close());
 const hostRegistry=createAuthHostRegistry(app.getPath('userData'));
 await hostRegistry.load();
 security.registerTargets([...githubDomains,'git','extensions','aliases','repository-security'].map(domain=>({id:`destination:${domain}`,label:domain})));
 const githubLockIds=(action:string,payload?:{action?:string})=>{if(action==='apply')return ['github:apply'];const effective=['review','task-definition'].includes(action)?payload?.action||action:action;if(['repositories.clone-source','gists.clone-source','pulls.checkout-source'].includes(effective))return providerGitLockIds(effective);const domain=effective.split('.')[0],route=nativeGitHubTaskRoutes.find(task=>task.action===effective);return [`destination:${domain==='security'?'repository-security':githubDomains.includes(domain as typeof githubDomains[number])?domain:'repositories'}`,`github:${effective}`,...(route?[`command:${route.commandId.replaceAll(' ','.')}`,`tab:${route.commandId.replaceAll(' ','.')}`]:[])];};
 security.registerTargets(providerGitLockTargets());
 security.registerTargets(nativeGitHubTaskRoutes.map(task=>({id:`github:${task.action}`,label:task.title,ancestors:githubLockIds(task.action).filter(id=>id!==`github:${task.action}`)})));
 const githubTasks=new GitHubService(binary,workspace,engine(),{resolveHost:hostname=>hostRegistry.resolveHost(hostname).hostname,authorize:async(action,payload)=>{if(!isOwnedCleanup('github',action))await security.assertUnlocked(githubLockIds(action,payload));},completed:async(action,payload)=>{for(const id of githubLockIds(action,payload))security.consumeSurfaceUnlock(id);}});
 app.once('will-quit',()=>githubTasks.close());
 handle('github',async(action,payload)=>{if(payload!==undefined&&sizeBound(payload).length>128000)throw new Error('GitHub task exceeds the request limit');if(!isOwnedCleanup('github',action)&&accountChanging())throw new Error('Finish or cancel the current account change before starting a GitHub task');const id=randomUUID();activeOperations.add(id);try{return await githubTasks.handle(action,payload);}finally{activeOperations.delete(id);}});
 const sshAuthLocks=['destination:accounts','auth:ssh-key-apply','command:ssh-key.add','tab:ssh-key.add'];
 const auth=new AuthService(binary,workspace,{pickSshPublicKey:async()=>{const result=await dialog.showOpenDialog(window,{title:'Choose a public SSH key',properties:['openFile'],filters:[{name:'Public SSH keys',extensions:['pub']},{name:'All files',extensions:['*']}]});return result.canceled?null:result.filePaths[0]??null;},authorize:async action=>{await security.assertUnlocked(action==='ssh-key-apply'?sshAuthLocks:protectedLockIds('auth',action));},completed:async action=>{if(action==='ssh-key-apply')for(const id of sshAuthLocks)security.consumeSurfaceUnlock(id);},allowedHosts:hostRegistry.list().map(host=>host.hostname),selectedHostname:hostRegistry.selectedHost().hostname,selectHost:async hostname=>{const selected=await hostRegistry.selectHost(hostname);invalidateContextReviews();return selected.hostname;},registerHost:async hostname=>{await hostRegistry.register(hostname);},copyToken:token=>clipboard.writeText(token)});
 let accountMutation=false;
 const accountChanging=()=>accountMutation||['starting','waiting'].includes(auth.snapshot().status);
 app.once('will-quit',()=>{void auth.action('cancel');});
 let accountSnapshot='',accountContextFingerprint='';
 auth.subscribe(state=>{const active=activeHostAccount(state),fingerprint=JSON.stringify({hostname:state.selectedHostname,active});if(accountContextFingerprint&&fingerprint!==accountContextFingerprint)invalidateContextReviews();accountContextFingerprint=fingerprint;if(state.status==='authenticated'||state.status==='idle'){const snapshot=JSON.stringify({accounts:state.accounts,selectedHostname:state.selectedHostname});if(snapshot!==accountSnapshot){workspaceRecords.recordExternal('accounts','github','GitHub account status changed',{accounts:state.accounts,selectedHostname:state.selectedHostname,credentialsOmitted:true});accountSnapshot=snapshot;}}if(window&&!window.isDestroyed())window.webContents.send('material:auth-update',state);});
 handle('auth',async(action,payload)=>{const changing=['login','switch','logout','refresh','setup-git','register-host','select-host','ssh-key-review','ssh-key-apply'].includes(action);if(changing&&(activeOperations.size||githubTasks.activeOperations.size||cliWorkflows.activeOperations.size||downloads.activeJobs()||gitTasks.activeOperations))throw new Error('Wait for current GitHub operations to finish before changing accounts');if(changing&&accountMutation)throw new Error('An account change is already running');if(changing)accountMutation=true;try{return await auth.action(action,payload);}finally{if(changing)accountMutation=false;}});
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
 const cliConfiguration=new CliConfigService(binary,{resolveHost:hostname=>hostRegistry.resolveHost(hostname),approvedHosts:()=>hostRegistry.list(),chooseExecutable:async definition=>{const result=await dialog.showOpenDialog(window,{title:definition.filePicker?.title,properties:['openFile'],...(process.platform==='win32'?{filters:[{name:'Executable applications',extensions:['exe']}]}:{})});return result.canceled?null:result.filePaths[0]??null;}});
 handle('cli-config',async(action,payload)=>{const id=randomUUID();if(action==='apply')activeOperations.add(id);try{return await cliConfiguration.action(action,payload);}finally{activeOperations.delete(id);}});
 const cliWorkflows=new CliWorkflowsService(loadCatalog(path.join(__dirname,'gh-catalog.json')),engine(),workspace,binary,{resolveHost:hostname=>hostRegistry.resolveHost(hostname),authorize:async commandId=>{await security.assertUnlocked(cliWorkflowLockIds(commandId));},completed:async commandId=>{for(const id of cliWorkflowLockIds(commandId))security.consumeSurfaceUnlock(id);},chooseFile:async()=>{const result=await dialog.showOpenDialog(window,{title:'Choose GitHub CLI aliases',properties:['openFile'],filters:[{name:'YAML aliases',extensions:['yml','yaml']}]});return result.canceled?null:result.filePaths[0]??null;}});
 app.once('will-quit',()=>cliWorkflows.cancelAll());
 const invalidateContextReviews=()=>{auth.invalidateReviews();cliConfiguration.invalidateReviews();githubTasks.invalidateReviews();githubApi.invalidateReviews();cliWorkflows.invalidateReviews();apiFiles.clear();};
 handle('cli-workflows',async(action,payload)=>{if(!isOwnedCleanup('git',action)&&accountChanging())throw new Error('Finish or cancel the current account change before starting a CLI task');const id=randomUUID();activeOperations.add(id);try{return await cliWorkflows.handle(action,payload);}finally{activeOperations.delete(id);}});
 const preferencesAdvanced=new PreferencesAdvancedService({directory:path.join(app.getPath('userData'),'preferences'),vault:safeStorage,base:()=>store.settings(),record:action=>{store.record(action);workspaceRecords.recordExternal('schedules','settings',action,preferencesAdvanced.status().document);},fonts:installedFonts});
 await preferencesAdvanced.start();
 workspaceRecords.setRestorer(async(kind,_id,snapshot)=>{if(kind==='settings'){const result=store.update(snapshot);await preferencesAdvanced.refresh(false);return result;}if(kind==='schedules'){const result=await preferencesAdvanced.handle('save',snapshot);return result.document;}throw new Error('This revision contains review-only metadata. Credentials and external account changes must be managed through the original feature.');});
 preferencesAdvanced.subscribe(status=>{if(window&&!window.isDestroyed()){window.setTitle(status.effective.displayName);window.webContents.send('material:preferences-advanced-update',status);}});
 handle('preferences-advanced',(action,payload)=>preferencesAdvanced.handle(action,payload));
 app.once('will-quit',()=>preferencesAdvanced.close());
 const bundledEngines=createBundledEngines({vendorDirectory:path.join(app.getAppPath(),'vendor','converters').replace('app.asar'+path.sep,'app.asar.unpacked'+path.sep),workerPath:path.join(__dirname,'bundled-engines-worker.cjs')});
 const localTools=new LocalToolsService({engines:bundledEngines,pickHarnessExecutable:async()=>{const result=await dialog.showOpenDialog(window,{title:'Choose a local Ollama executable for review',properties:['openFile'],...(process.platform==='win32'?{filters:[{name:'Windows executable',extensions:['exe']}]}:{})});return result.canceled?null:result.filePaths[0]??null;},pickSourceDirectory:async()=>{const result=await dialog.showOpenDialog(window,{title:'Choose a folder to inspect for conversion',properties:['openDirectory']});return result.canceled?null:result.filePaths[0]??null;},pickOutputDirectory:async()=>{const result=await dialog.showOpenDialog(window,{title:'Choose a folder for new converted files',properties:['openDirectory']});return result.canceled?null:result.filePaths[0]??null;},resultActionAvailability:{open:true,reveal:true,editor:false},openResult:async(file,operation)=>{if(operation==='reveal'){shell.showItemInFolder(file);return;}if(operation==='open'){const error=await shell.openPath(file);if(error)throw new Error('The operating system could not open this result. Choose another installed application.');return;}throw new Error('A reviewed editor integration is not configured. Use Open with the operating system or export a copy.');},storageDirectory:path.join(app.getPath('userData'),'local-tools'),pickSources:async purpose=>{const result=await dialog.showOpenDialog(window,{title:purpose==='chat-images'?'Choose images for local chat':'Choose files to convert',properties:['openFile','multiSelections'],...(purpose==='chat-images'?{filters:[{name:'PNG and JPEG images',extensions:['png','jpg','jpeg']}]}:{})});return result.canceled?[]:result.filePaths;},pickDestination:async suggestedName=>{const result=await dialog.showSaveDialog(window,{title:'Save converted file',defaultPath:suggestedName});return result.canceled?null:result.filePath??null;},imageEngine:async(bytes,target)=>{const image=nativeImage.createFromBuffer(Buffer.from(bytes));if(image.isEmpty())throw new Error('This image could not be decoded');return target==='png'?image.toPNG():image.toJPEG(90);},imageEngineProof:`Electron ${process.versions.electron} native image codec`});
 handle('local-tools',(action,payload)=>localTools.request(action,payload));
 app.once('will-quit',()=>localTools.dispose());
 const gitTasks=new GitService({binary:process.platform==='win32'?path.join(gitDirectory,'git.exe'):'git',directory:app.getPath('userData'),resolveProviderTarget:id=>githubTasks.resolveProviderTarget(id),providerCompleted:async target=>{for(const id of providerGitKindLockIds(target.kind))security.consumeSurfaceUnlock(id);},...(process.platform==='linux'?{helperDirectory:path.join(app.getAppPath(),'vendor','git-linux')}:{}),pickOutputDirectory:async()=>{const result=await dialog.showOpenDialog(window,{title:'Choose a folder for new Git object packs',properties:['openDirectory']});return result.canceled?null:result.filePaths[0]??null;},pickWorktree:async()=>{const result=await dialog.showOpenDialog(window,{title:'Choose a Git working tree',properties:['openDirectory']});return result.canceled?null:result.filePaths[0]??null;},pickFile:async(purpose)=>{const merge=purpose==='merge-text',pack=purpose==='pack',mailbox=purpose==='mailbox';const result=await dialog.showOpenDialog(window,{title:merge?'Choose a UTF-8 text file to merge':pack?'Choose a Git object pack or index':mailbox?'Choose an email or patch mailbox':'Choose a Git patch or bundle',properties:['openFile'],filters:[merge?{name:'Text and source files',extensions:['txt','md','csv','json','yaml','yml','xml','html','css','js','ts','tsx','jsx','py','c','cpp','h','rs','go','sh']}:pack?{name:'Git object packs and indexes',extensions:['pack','idx']}:mailbox?{name:'Email and patch mailboxes',extensions:['eml','mbox','mbx','patch']}:{name:'Git patches and bundles',extensions:['patch','diff','mbox','bundle']},{name:'All files',extensions:['*']}]});return result.canceled?null:result.filePaths[0]??null;}});
 handle('git',async(action,payload)=>{if(!isOwnedCleanup('git',action)&&accountChanging())throw new Error('Finish or cancel the current account change before starting a Git task');if(payload!==undefined&&sizeBound(payload).length>1024*1024)throw new Error('Git request exceeds the input limit');const id=payload?.reviewId??randomUUID();if(action!=='cancel')activeOperations.add(id);try{return await gitTasks.handle(action,payload);}finally{activeOperations.delete(id);}});
 app.once('will-quit',()=>gitTasks.close());
 const downloadTransport=createElectronFetch(net,{authorizeHeader:url=>hostRegistry.list().some(host=>{const api=new URL(host.restOrigin);return url.origin===api.origin&&(api.pathname==='/'||url.pathname.startsWith(api.pathname.replace(/\/$/,'')+'/'));})});
 const downloads=new DownloadQueue(createNativeDownloadDeps({binary,cwd:workspace,directory:path.join(app.getPath('userData'),'protected-downloads'),vault:safeStorage,resolveHost:hostname=>hostRegistry.resolveHost(hostname),pickDestination:async suggestedName=>{const result=await dialog.showSaveDialog(window,{title:'Save GitHub download',defaultPath:suggestedName});return result.canceled?null:result.filePath??null;},fetch:(input,init)=>downloadTransport(input instanceof Request?input.url:input,init)}));
 security.registerTargets(['list','enqueue','pause','cancel','resume','retry','remove'].map(action=>({id:`downloads:${action}`,label:`Downloads: ${action}`,ancestors:['destination:downloads']})));
 downloads.subscribe(job=>{if(window&&!window.isDestroyed())window.webContents.send('material:download-update',job);});
 handle('downloads',async(request:DownloadRequest)=>{if(sizeBound(request).length>4096)throw new Error('Download request exceeds its input limit');const starts=['enqueue','resume','retry'].includes(request?.action);if(starts&&accountChanging())throw new Error('Finish or cancel the current account change before starting a download');const id=randomUUID();if(starts)activeOperations.add(id);try{return await downloads.handle(request);}finally{activeOperations.delete(id);}});

 const startupPersonalization=new StartupPersonalizationService({directory:path.join(app.getPath('userData'),'startup-personalization'),fetch:createElectronFetch(net),context:()=>{const effective=preferencesAdvanced.status().effective,phase=getUpdateState().phase;return {firstRun:startupFirstRun,busy:activeOperations.size>0||githubTasks.activeOperations.size>0||cliWorkflows.activeOperations.size>0||localTools.activeJobs()||downloads.activeJobs()>0||gitTasks.activeOperations>0||accountChanging(),error:!startupSecurity.available||Boolean(startupSecurity.error)||phase==='failed',updating:!['idle','unsupported'].includes(phase),schoolMode:startupSecurity.schoolMode.active,quiet:effective.lowStimulation||effective.quietNarration};}});
 handle('startup-personalization',(...args:unknown[])=>{if(args.length)throw new Error('Startup personalization takes no arguments');return startupPersonalization.startup();});
 handle('updates',(action:string)=>{if(action==='check')return checkForUpdates();if(action==='restart'){if(activeOperations.size||githubTasks.activeOperations.size||cliWorkflows.activeOperations.size||localTools.activeJobs()||downloads.activeJobs()||gitTasks.activeOperations||accountChanging())throw new Error('Wait for running operations or cancel them before restarting');const previous=quitApproved;quitApproved=true;try{restartToInstallUpdate();}catch(error){quitApproved=previous;throw error;}}else if(action!=='status')throw new Error('Unknown update action');return getUpdateState();});
 handle('bootstrap',async()=>{
  const [version,state]=await Promise.all([runGh(binary,['--version'],workspace).catch(()=>null),auth.action('status')]);
  const active=activeHostAccount(state),hostname=hostRegistry.selectedHost().hostname;
  let provenance:{version:string;builtAt:string|null}={version:app.getVersion(),builtAt:null};try{provenance=JSON.parse(readFileSync(path.join(__dirname,'provenance.json'),'utf8'));}catch{}
  return {startupFirstRun,hostname,catalog:loadCatalog(path.join(__dirname,'gh-catalog.json')),settings:store.settings(),persistedSettingsKeys:store.persistedSettingsKeys(),preferencesAdvanced:preferencesAdvanced.status(),...provenance,platform:process.platform,ghVersion:version?.split('\n')[0]??null,authenticated:active?.state==='success',account:active?.login||null,repository:null,operations:[]};
 });
 handle('execute',(request:ExecutionRequest)=>{if(accountChanging())throw new Error('Finish or cancel the current account change before starting a CLI task');if(sizeBound(request).length>256000)throw new Error('Request too large');const selected=request.cwd?path.resolve(request.cwd):workspace;const op=engine(selected).execute(request);store.record(`Started ${op.commandId}`);return op;});
 handle('operation',(id:string)=>{for(const e of engineByRoot.values()){try{return e.operation(id);}catch{}}throw new Error('Unknown operation');});
 handle('cancel',(id:string)=>{for(const e of engineByRoot.values()){try{e.operation(id);e.cancel(id);return;}catch{}}throw new Error('Unknown operation');});
 handle('choices',async(entity:string,context:unknown)=>{if(typeof entity!=='string'||entity.length>100||!context||typeof context!=='object'||Array.isArray(context))throw new Error('Invalid picker');if(accountChanging())throw new Error('Finish or cancel the current account change before loading choices');const input=context as import('./choices').ChoiceContext,hostname=hostRegistry.resolveHost(input.hostname).hostname,id=randomUUID();activeOperations.add(id);try{return await listChoices(binary,workspace,entity,{...input,hostname});}finally{activeOperations.delete(id);}});
 handle('pick',async(kind:string,options:{extensions?:string[];multiple?:boolean}={})=>{if(!['file','directory'].includes(kind))throw new Error('Unknown picker');const extensions=options.extensions?.filter(v=>typeof v==='string'&&/^[a-z0-9]{1,8}$/i.test(v));const result=await dialog.showOpenDialog(window,{properties:[kind==='file'?'openFile':'openDirectory',...(options.multiple?['multiSelections' as const]:[])],...(extensions?.length?{filters:[{name:'Supported files',extensions}]}:{})});if(result.canceled)return [];if(kind==='directory'){for(const root of result.filePaths)approvedRoots.add(root);}return result.filePaths;});
 handle('settings',async(patch:Partial<AppSettings>)=>{const result=store.update(patch);await preferencesAdvanced.refresh(false);return result;});
 handle('history',()=>store.history());
 handle('vocabulary',async(action:string)=>{if(action==='clear')store.clearVocabulary();else if(action==='import'){const result=await dialog.showOpenDialog(window,{properties:['openFile'],filters:[{name:'Personal vocabulary',extensions:['json']}]});if(!result.canceled&&result.filePaths[0])store.setVocabulary(readBoundedFile(result.filePaths[0],65536));}else if(action!=='status')throw new Error('Unknown vocabulary operation');const current=store.vocabulary();return {loaded:!!current,...(current?{entries:current.entries}:{})};});
 handle('export',async(data:unknown,format:string)=>{sizeBound(data);const exported=serializeExport(data,format as ExportFormat);const result=await dialog.showSaveDialog(window,{defaultPath:`material-git-export.${exported.extension}`,filters:[{name:format.toUpperCase(),extensions:[exported.extension]}]});if(result.canceled||!result.filePath)return false;writeFileSync(result.filePath,exported.text,{mode:0o600});store.record('Requested data exported');return true;});
 handle('appearance-export',async(payload:unknown)=>{const exported=serializeAppearanceExport(payload,bytes=>{const decoded=nativeImage.createFromBuffer(bytes);if(decoded.isEmpty())throw new Error('The appearance image could not be decoded.');return {...decoded.getSize(),bytes:decoded.toPNG()};});const result=await dialog.showSaveDialog(window,{title:'Save appearance artwork',defaultPath:`material-git-artwork.${exported.extension}`,filters:[{name:exported.extension.toUpperCase(),extensions:[exported.extension]}]});if(result.canceled||!result.filePath)return {saved:false};writeFileSync(result.filePath,exported.bytes,{mode:0o600,flag:'wx'});return {saved:true,name:path.basename(result.filePath)};});
 handle('external',async(value:string)=>{const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password)throw new Error('Only HTTPS links can open externally');await shell.openExternal(url.href);});
 handle('window',async(action:string)=>{if(action==='minimize')window.minimize();else if(action==='maximize')window.isMaximized()?window.unmaximize():window.maximize();else if(action==='close')window.close();else if(action==='confirm-close'){await downloads.close();quitApproved=true;localTools.cancelAll();gitTasks.cancelAll();githubTasks.cancelAll();cliWorkflows.cancelAll();for(const e of engineByRoot.values())for(const id of activeOperations){try{e.cancel(id);}catch{}}window.close();}else throw new Error('Unknown window action');});
 handle('ollama',ollamaRequest);
 window=new BrowserWindow({width:1420,height:940,minWidth:760,minHeight:600,frame:false,icon:path.join(app.getAppPath(),'assets/icon.png'),backgroundColor:'#101412',title:store.settings().displayName,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});
 window.on('close',event=>{if(!quitApproved){event.preventDefault();window.webContents.send('material:close-request');}});
 window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 window.webContents.on('will-navigate',(event,url)=>{if(url!==pathToFileURL(entry).href)event.preventDefault();});
 window.webContents.session.setPermissionCheckHandler(()=>false);
 window.webContents.session.setPermissionRequestHandler((sender,permission,callback,details)=>callback(cameraPermission.request({owner:sender.id,frame:sender.mainFrame.routingId,url:details.requestingUrl,isMainFrame:details.isMainFrame,permission,mediaTypes:'mediaTypes' in details?details.mediaTypes:undefined})));
 window.webContents.on('did-start-navigation',()=>cameraPermission.clear());
 window.webContents.on('render-process-gone',()=>cameraPermission.clear());
 await window.loadFile(entry);
 updateEvents.on('state',state=>{if(!window.isDestroyed())window.webContents.send('material:update-state',state);});
 startUpdater();
});
app.on('window-all-closed',()=>app.quit());
