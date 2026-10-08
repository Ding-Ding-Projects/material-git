import {randomUUID} from 'node:crypto';
import {realpath} from 'node:fs/promises';
import {readSshPublicKey,type SshPublicKeyFile} from './auth-ssh';
import { spawn, type ChildProcess, type SpawnOptions } from 'node:child_process';
import {validateAuthHost} from './auth-hosts.js';
import type { AuthAccount, AuthAction, AuthPayload, AuthState } from '../shared/types';
export interface AuthServiceOptions {
 allowedHosts?: string[];
 selectedHostname?:string;
 selectHost?:(hostname:string)=>Promise<string>;
 copyToken?: (token:string)=>void|Promise<void>;
 pickSshPublicKey?:()=>Promise<string|null>;
 completed?:(action:AuthAction,payload:AuthPayload)=>Promise<void>;
 registerHost?: (hostname:string)=>Promise<void>;
 authorize?: (action:AuthAction,payload:AuthPayload)=>Promise<void>;
 spawn?: (binary: string, args: string[], options: SpawnOptions) => ChildProcess;
}
const ADDITIONAL_SCOPES = ['repo:status','repo_deployment','public_repo','repo:invite','security_events','admin:repo_hook','write:repo_hook','read:repo_hook','admin:org','write:org','admin:public_key','write:public_key','read:public_key','admin:org_hook','gist','notifications','user','read:user','user:email','user:follow','project','read:project','workflow','write:packages','read:packages','delete:packages','delete_repo','admin:gpg_key','write:gpg_key','read:gpg_key','admin:ssh_signing_key','write:ssh_signing_key','read:ssh_signing_key','read:discussion','write:discussion','codespace','codespace:secrets','copilot','manage_billing:copilot','audit_log','read:audit_log','admin:enterprise','manage_runners:enterprise','manage_billing:enterprise','read:enterprise','scim:enterprise','codespace:metadata','codespace:startup_script','codespace:user_secrets'];
const HOST = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
/** Dedicated authentication channel: never forward its output to operation history or exports. */
export class AuthService {
 private readonly spawnProcess: NonNullable<AuthServiceOptions['spawn']>;
 private readonly hosts: string[];
 private listeners = new Set<(state: AuthState) => void>();
 private child?: ChildProcess;
 private generation = 0;
 private checking?: Promise<AuthState>;
 private changing=false;
 private state: AuthState;
 private sshReviews=new Map<string,{hostname:string;login:string;accountId:string;title:string;file:Omit<SshPublicKeyFile,'key'>;expiresAt:number;epoch:number}>();private sshIssued=new Set<string>();private sshEpoch=0;
 invalidateReviews(){this.sshEpoch++;this.sshReviews.clear();if(this.state.sshKeyReview||this.state.pendingSshKey)this.update({sshKeyReview:undefined,pendingSshKey:undefined});}
 constructor(private binary: string, private cwd: string, private serviceOptions: AuthServiceOptions = {}) {
  const options=this.serviceOptions;
  this.hosts = [...new Set(options.allowedHosts || ['github.com'])];
  if(!this.hosts.length || this.hosts.some(host=>!HOST.test(host)))throw new Error('Authentication hosts must be exact lowercase DNS hostnames');
  this.spawnProcess=options.spawn || ((binary,args,opts)=>spawn(binary,args,opts));
  const selectedHostname=options.selectedHostname??this.hosts[0];if(!this.hosts.includes(selectedHostname))throw new Error('Choose an approved GitHub hostname');
  this.state={status:'idle',selectedHostname,hostSelectionAvailable:Boolean(options.selectHost),accounts:[],allowedHosts:[...this.hosts],allowedScopes:[...ADDITIONAL_SCOPES],tokenCopyAvailable:Boolean(options.copyToken),hostRegistrationAvailable:Boolean(options.registerHost),sshKeyAvailable:Boolean(options.pickSshPublicKey)};
 }
 subscribe(callback: (state: AuthState) => void): () => void {this.listeners.add(callback);return()=>{this.listeners.delete(callback);};}
 snapshot(): AuthState {return structuredClone(this.state);}
 private update(patch: Partial<AuthState>) {this.state={...this.state,...patch};for(const callback of this.listeners){try{callback(this.snapshot());}catch{/* Subscriber errors cannot interrupt authentication cleanup. */}}}
 private host(payload: AuthPayload): string {
  const host=payload.hostname || this.state.selectedHostname;if(typeof host!=='string'||!HOST.test(host)||!this.hosts.includes(host))throw new Error('Choose an approved GitHub hostname');return host;
 }
 private options(): SpawnOptions {
  // User-initiated browser opening belongs to the renderer's validated external-link workflow.
  return {cwd:this.cwd,shell:false,windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,GH_PROMPT_DISABLED:'1',GH_PAGER:'cat',NO_COLOR:'1',GIT_TERMINAL_PROMPT:'0'}};
 }
 private async run(args: string[], binary=this.binary,input?:string,owned=false): Promise<{code:number|null;stdout:string}> {
  return new Promise((resolve,reject)=>{
   let child:ChildProcess;try{child=this.spawnProcess(binary,args,{...this.options(),...(input!==undefined?{stdio:['pipe','pipe','pipe'] as SpawnOptions['stdio']}:{})});if(owned)this.child=child;if(input!==undefined){child.stdin?.on('error',()=>{});child.stdin?.end(input);}}catch{reject(new Error('Unable to start GitHub CLI authentication'));return;}let stdout='';let settled=false;
   const finish=(error?:Error,code:number|null=null)=>{if(settled)return;settled=true;clearTimeout(timer);if(owned&&this.child===child)this.child=undefined;error?reject(error):resolve({code,stdout});};
   const timer=setTimeout(()=>{child.kill();finish(new Error('Authentication status timed out'));},30000);timer.unref();
   child.stdout?.on('data',(chunk:Buffer)=>{stdout+=chunk.toString('utf8');if(stdout.length>131072){child.kill();finish(new Error('Authentication response exceeded its limit'));}});
   child.stderr?.resume();child.on('error',()=>finish(new Error('Unable to start GitHub CLI authentication')));child.on('close',code=>finish(undefined,code));
  });
 }
 private parse(stdout:string): AuthAccount[] {
  let data:unknown;try{data=JSON.parse(stdout);}catch{throw new Error('GitHub CLI returned an invalid authentication response');}
  if(!data||typeof data!=='object'||!('hosts' in data)||!data.hosts||typeof data.hosts!=='object')throw new Error('GitHub CLI returned an invalid authentication response');
  const accounts:AuthAccount[]=[];
  for(const [host,entries] of Object.entries(data.hosts)) {
   if(!this.hosts.includes(host)||!Array.isArray(entries))continue;
   for(const entry of entries){if(!entry||typeof entry!=='object')continue;
    const source=String(entry.tokenSource || '');
    accounts.push({host,login:typeof entry.login==='string'?entry.login.slice(0,100):'',active:entry.active===true,state:['success','error','timeout'].includes(entry.state)?entry.state:'unknown',
     scopes:typeof entry.scopes==='string'?entry.scopes.split(',').map((s:string)=>s.trim()).filter((s:string)=>/^[a-z_:]+$/.test(s)):[],gitProtocol:['ssh','https'].includes(entry.gitProtocol)?entry.gitProtocol:'unknown',
     tokenSource:/^(GH_TOKEN|GITHUB_TOKEN|GH_ENTERPRISE_TOKEN|GITHUB_ENTERPRISE_TOKEN)$/.test(source)?'environment':source==='keyring'?'credential-store':/hosts\.yml$/.test(source)?'config-file':'unknown'});
   }
  }
  return accounts;
 }
 private async refresh(): Promise<AuthState> {
  if(this.checking)return this.checking;
  this.checking=(async()=>{
   const accounts:AuthAccount[]=[];
   for(const host of this.hosts){const result=await this.run(['auth','status',`--hostname=${host}`,'--json=hosts']);if(result.code!==0&&!result.stdout.trim())continue;accounts.push(...this.parse(result.stdout));}
   if(this.child)this.update({accounts});else this.update({accounts,status:accounts.some(a=>a.active&&a.state==='success')?'authenticated':'idle',deviceCode:undefined,verificationUrl:undefined,error:undefined});return this.snapshot();
  })().catch(()=>{if(!this.child)this.update({status:'failed',error:'Unable to check GitHub authentication. Check the network and CLI installation.'});return this.snapshot();}).finally(()=>{this.checking=undefined;});
  return this.checking;
 }
 private async sshAccount(hostname:string,login:unknown):Promise<string>{await this.refresh();const account=this.state.accounts.find(item=>item.host===hostname&&item.login===login&&item.active&&item.state==='success');if(!account)throw new Error('Choose the active authenticated account for this SSH key');const response=await this.run(['api',`--hostname=${hostname}`,'user']);let user:{id?:number;login?:string};try{user=JSON.parse(response.stdout);}catch{throw new Error('The effective SSH key account could not be verified');}finally{response.stdout='';}if(response.code!==0||user.login!==login||!Number.isSafeInteger(user.id)||Number(user.id)<1)throw new Error('The effective SSH key account changed. Refresh accounts.');return String(user.id);}
 private async reviewSshKey(hostname:string,payload:AuthPayload):Promise<AuthState>{if(Object.keys(payload).some(key=>!['hostname','login','title'].includes(key)))throw new Error('Use the selected account and a public-key title');if(!this.serviceOptions.pickSshPublicKey)throw new Error('Native public-key selection is unavailable');const title=payload.title||'Material Git SSH key';if(typeof title!=='string'||title.length>100||/[\0\r\n]/.test(title))throw new Error('Use a public-key title of at most 100 characters');this.changing=true;const epoch=this.sshEpoch;try{const path=await this.serviceOptions.pickSshPublicKey();if(!path)return this.snapshot();const file=await readSshPublicKey(path),accountId=await this.sshAccount(hostname,payload.login);if(epoch!==this.sshEpoch)throw new Error('The SSH key review context changed');const reviewId=randomUUID(),expiresAt=Date.now()+300000;const {key:ignored,...receipt}=file;void ignored;this.sshReviews.set(reviewId,{hostname,login:payload.login!,accountId,title,file:receipt,expiresAt,epoch});this.sshIssued.add(reviewId);while(this.sshIssued.size>256)this.sshIssued.delete(this.sshIssued.values().next().value!);while(this.sshReviews.size>20)this.sshReviews.delete(this.sshReviews.keys().next().value!);this.update({sshKeyReview:{reviewId,hostname,login:payload.login!,title,algorithm:file.algorithm,fingerprint:file.fingerprint,expiresAt:new Date(expiresAt).toISOString()},error:undefined});return this.snapshot();}finally{this.changing=false;}}
 private async applySshKey(payload:AuthPayload):Promise<AuthState>{if(Object.keys(payload).some(key=>!['reviewId','confirmed'].includes(key))||payload.confirmed!==true)throw new Error('Confirm the exact native SSH key review');const plan=this.sshReviews.get(payload.reviewId||'');if(!plan||plan.expiresAt<Date.now())throw new Error('SSH key review expired. Review again.');if(this.child||this.changing)throw new Error('Finish the current account operation first');this.sshReviews.delete(payload.reviewId!);this.update({sshKeyReview:undefined});this.changing=true;let attempted=false;const generation=this.generation;try{const hostname=this.host({hostname:plan.hostname});if(plan.epoch!==this.sshEpoch||await this.sshAccount(hostname,plan.login)!==plan.accountId)throw new Error('The reviewed SSH key account changed');const file=await readSshPublicKey(plan.file.path);if(file.receipt!==plan.file.receipt)throw new Error('The reviewed public-key file changed. Review again.');await this.serviceOptions.authorize?.('ssh-key-apply',{hostname,login:plan.login,reviewId:payload.reviewId,confirmed:true});if(plan.epoch!==this.sshEpoch||generation!==this.generation||plan.expiresAt<Date.now())throw new Error('SSH key review context changed or expired before upload');this.update({status:'starting',sshKeyUploading:true,hostname,message:'Uploading the reviewed SSH public key…',error:undefined});attempted=true;const result=await this.run(['api',`--hostname=${hostname}`,'--method=POST','user/keys','--input=-'],this.binary,JSON.stringify({title:plan.title,key:file.key}),true);if(generation!==this.generation)throw new Error('SSH key upload was cancelled. Provider effects may be uncertain; refresh SSH keys before retrying.');if(result.code!==0)throw new Error('GitHub refused the SSH key upload. Check account permissions and existing keys; no success is claimed.');let added:{id?:number;key?:string};try{added=JSON.parse(result.stdout);}catch{throw new Error('The SSH key upload result could not be verified. Provider effects may have occurred.');}finally{result.stdout='';}if(!Number.isSafeInteger(added.id)||Number(added.id)<1||added.key?.split(' ').slice(0,2).join(' ')!==file.key.split(' ').slice(0,2).join(' '))throw new Error('GitHub returned a different SSH key after upload. Provider effects are uncertain.');await this.refresh();this.update({sshKeyUploading:false,pendingSshKey:undefined,message:`SSH public key uploaded for ${plan.login} on ${hostname}. Fingerprint: ${file.fingerprint}. No local key was generated.`,error:undefined});return this.snapshot();}catch(error){this.update({status:'failed',message:undefined,sshKeyUploading:false,error:error instanceof Error?error.message:'The SSH key operation failed'});return this.snapshot();}finally{this.changing=false;if(attempted)await this.serviceOptions.completed?.('ssh-key-apply',{hostname:plan.hostname,login:plan.login,reviewId:payload.reviewId,confirmed:true});}}
 async action(action: AuthAction, payload: AuthPayload = {}): Promise<AuthState> {
  if(!['status','login','refresh','setup-git','cancel','switch','logout','copy-token','register-host','select-host','ssh-key-review','ssh-key-apply','ssh-key-discard'].includes(action))throw new Error('Unknown authentication action');
  if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new Error('Invalid authentication request');
  for(const key of Object.keys(payload))if(!['hostname','login','scopes','removeScopes','resetScopes','confirmed','reviewedHostname','clipboardConsent','gitProtocol','skipSshKey','force','title','reviewId'].includes(key))throw new Error('Unknown authentication parameter');
  if(action==='ssh-key-discard'){if(Object.keys(payload).length!==1||typeof payload.reviewId!=='string'||! /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(payload.reviewId)||!this.sshIssued.has(payload.reviewId))throw new Error('Choose an issued SSH key review to discard');this.sshReviews.delete(payload.reviewId);if(this.state.sshKeyReview?.reviewId===payload.reviewId)this.update({sshKeyReview:undefined});return this.snapshot();}
  if(payload.title!==undefined&&action!=='ssh-key-review'||payload.reviewId!==undefined&&!['ssh-key-apply','ssh-key-discard'].includes(action))throw new Error('Use only fields for the selected authentication task');
  if(payload.force!==undefined&&(action!=='setup-git'||typeof payload.force!=='boolean'))throw new Error('Choose the reviewed unauthenticated-host option only for setup');if(payload.gitProtocol!==undefined&&(action!=='login'||!['https','ssh'].includes(payload.gitProtocol)))throw new Error('Choose HTTPS or SSH for sign-in');if(payload.skipSshKey!==undefined&&(action!=='login'||typeof payload.skipSshKey!=='boolean'))throw new Error('Choose the SSH key setup policy for sign-in');
  if(action!=='status'&&action!=='cancel')await this.serviceOptions.authorize?.(action,payload);
  if(action==='status')return this.refresh();
  if(action==='select-host'){
   const host=this.host(payload);if(payload.confirmed!==true||payload.reviewedHostname!==host)throw new Error('Review and confirm the exact workspace hostname');
   if(!this.serviceOptions.selectHost)throw new Error('Workspace host selection is unavailable in this installation');
   if(this.child||this.changing)throw new Error('Finish the current account change first');
   this.changing=true;try{const selected=await this.serviceOptions.selectHost(host);if(selected!==host||!this.hosts.includes(selected))throw new Error('The native workspace hostname could not be verified');this.invalidateReviews();this.state={...this.state,selectedHostname:selected,error:undefined,message:`Workspace host selected: ${selected}. Choose a repository on this host; credentials and environment tokens are unchanged.`};return await this.refresh();}finally{this.changing=false;}
  }
  if(action==='register-host'){
   const host=validateAuthHost(payload.hostname).hostname;
   if(payload.confirmed!==true||payload.reviewedHostname!==host)throw new Error('Review and confirm the exact enterprise hostname');
   if(!this.serviceOptions.registerHost)throw new Error('Host registration is unavailable in this installation');
   if(this.child||this.changing)throw new Error('Finish the current account change first');
   this.changing=true;try{await this.serviceOptions.registerHost(host);if(!this.hosts.includes(host))this.hosts.push(host);this.update({allowedHosts:[...this.hosts],message:`Approved ${host} for HTTPS GitHub Enterprise authentication and API requests. TLS certificates are verified; sign-in is a separate action.`,error:undefined});return this.snapshot();}finally{this.changing=false;}
  }
  if(action==='cancel') {this.sshEpoch++;const child=this.child;this.child=undefined;this.generation++;if(child){child.kill();const timer=setTimeout(()=>child.kill('SIGKILL'),2000);timer.unref();}this.update({status:'cancelled',sshKeyUploading:false,deviceCode:undefined,verificationUrl:undefined,message:'GitHub authorization cancelled.',error:undefined});return this.snapshot();}
  if(action==='ssh-key-apply')return this.applySshKey(payload);
  if(this.child)throw new Error('Finish or cancel the current sign-in first');
  if(this.changing)throw new Error('Wait for the current account change to finish');
  const host=this.host(payload);
  if(action==='ssh-key-review')return this.reviewSshKey(host,payload);
  if(action==='login'||action==='refresh') {
   const scopes=payload.scopes || [];if(!Array.isArray(scopes)||scopes.length>ADDITIONAL_SCOPES.length||scopes.some(s=>typeof s!=='string'||!ADDITIONAL_SCOPES.includes(s)))throw new Error('Choose supported GitHub authorization scopes');
   const removeScopes=payload.removeScopes??[];
   if(!Array.isArray(removeScopes)||removeScopes.length>ADDITIONAL_SCOPES.length||removeScopes.some(s=>typeof s!=='string'||!ADDITIONAL_SCOPES.includes(s)||['gist','repo','read:org'].includes(s)))throw new Error('Choose removable GitHub authorization scopes; minimum scopes cannot be removed');
   if(payload.resetScopes!==undefined&&typeof payload.resetScopes!=='boolean')throw new Error('Invalid reset-scopes choice');
   if(payload.resetScopes&&(scopes.length||removeScopes.length))throw new Error('Choose reset to minimum permissions or individual permission changes');
   if(scopes.some(scope=>removeScopes.includes(scope)))throw new Error('A permission cannot be added and removed in the same refresh');
   if(action==='login'&&(removeScopes.length||payload.resetScopes))throw new Error('Permission removal and reset require Refresh permissions');
   if(action==='login'&&payload.gitProtocol==='ssh'&&payload.skipSshKey===false&&!this.serviceOptions.pickSshPublicKey)throw new Error('Native public-key selection is unavailable; keep SSH key setup skipped');
   let expectedLogin:string|undefined;
   if(action==='refresh'){
    if(payload.confirmed!==true)throw new Error('Review and confirm the permission refresh');
    this.changing=true;
    try{await this.refresh();const active=this.state.accounts.find(a=>a.host===host&&a.active&&a.state==='success');if(!active||active.login!==payload.login)throw new Error('Select the active authenticated account for this host; switch accounts before refreshing another account');if(active.tokenSource==='environment')throw new Error('Environment credentials cannot be refreshed here. Start without that credential to refresh a saved account');expectedLogin=active.login;}finally{this.changing=false;}
   }
   const args=action==='login'?['auth','login',`--hostname=${host}`,'--web',`--git-protocol=${payload.gitProtocol||'https'}`,'--skip-ssh-key','--clipboard=false']:['auth','refresh',`--hostname=${host}`,'--clipboard=false'];
   if(scopes.length)args.push(`--scopes=${[...new Set(scopes)].join(',')}`);
   if(removeScopes.length)args.push(`--remove-scopes=${[...new Set(removeScopes)].join(',')}`);
   if(payload.resetScopes)args.push('--reset-scopes');
   this.update({status:'starting',hostname:host,deviceCode:undefined,verificationUrl:undefined,error:undefined,message:action==='refresh'?'Starting reviewed GitHub permission refresh…':'Starting GitHub device sign-in…'});
   const generation=++this.generation;let child:ChildProcess;try{child=this.spawnProcess(this.binary,args,this.options());}catch{this.update({status:'failed',message:undefined,error:'Unable to start GitHub authorization. Check the bundled CLI installation.'});return this.snapshot();}this.child=child;let buffer='';let closed=false;
   const timeout=setTimeout(()=>{if(this.child===child){void this.action('cancel');this.update({status:'failed',error:'The GitHub sign-in request expired. Start a new sign-in.'});}},900000);timeout.unref();
   const receive=(chunk:Buffer)=>{
    if(generation!==this.generation)return;buffer=(buffer+chunk.toString('utf8')).slice(-16384);
    const code=buffer.match(/(?:one-time code[:\s]+|code \()([A-Z0-9]{4}-[A-Z0-9]{4})/i)?.[1];
    const candidates=buffer.match(/https:\/\/[^\s<>]+/g) || [];
    const verificationUrl=candidates.find(value=>{try{const u=new URL(value);return u.protocol==='https:'&&u.hostname===host&&!u.username&&!u.password&&!u.port&&u.pathname==='/login/device'&&!u.search&&!u.hash;}catch{return false;}});
    if(code||verificationUrl)this.update({status:'waiting',...(code?{deviceCode:code}:{}),...(verificationUrl?{verificationUrl}:{}),message:'Enter the one-time code on GitHub to finish signing in.'});
   };
   child.stdout?.on('data',receive);child.stderr?.on('data',receive);
   const finish=async(code:number|null)=>{if(closed)return;closed=true;clearTimeout(timeout);buffer='';if(generation!==this.generation)return;this.child=undefined;this.update({deviceCode:undefined,verificationUrl:undefined});if(code===0){await this.refresh();const active=this.state.accounts.find(a=>a.host===host&&a.active&&a.state==='success');if(!active||(expectedLogin&&active.login!==expectedLogin)){this.update({status:'failed',message:undefined,error:'GitHub did not report the expected authenticated account after authorization. Refresh accounts before continuing.'});return;}this.update({pendingSshKey:action==='login'&&payload.gitProtocol==='ssh'&&payload.skipSshKey===false?{hostname:host,login:active.login}:undefined,message:action==='refresh'?`Permission refresh completed for ${active.login} on ${host}. Reported scopes: ${active.scopes.join(', ')||'not reported'}.`:'GitHub sign-in completed.',error:undefined});}else this.update({status:'failed',message:undefined,error:'GitHub authorization did not complete. Start again or check the network.'});};
   child.on('error',()=>{void finish(null);});child.on('close',code=>{void finish(code);});return this.snapshot();
  }
  if(payload.confirmed!==true)throw new Error('Review and confirm the account change');
  const setupWithoutAccount=action==='setup-git'&&payload.force===true&&payload.login===undefined;
  if(setupWithoutAccount&&payload.reviewedHostname!==host)throw new Error('Review the exact approved hostname before configuring Git without sign-in');
  if(!setupWithoutAccount&&(typeof payload.login!=='string'||! /^(?:[A-Za-z0-9][A-Za-z0-9-]{0,38})(?:\[bot\])?$/.test(payload.login)))throw new Error('Select a valid GitHub account');
  if(action==='copy-token'){
   if(payload.clipboardConsent!==true)throw new Error('Explicitly consent to copying a usable credential to the system clipboard');
   if(!this.serviceOptions.copyToken)throw new Error('Native credential clipboard is unavailable in this installation');
   this.changing=true;let token='';try{
    await this.refresh();const account=this.state.accounts.find(a=>a.host===host&&a.login===payload.login&&a.state==='success');if(!account)throw new Error('Select a known authenticated account');
    const result=await this.run(['auth','token',`--hostname=${host}`,`--user=${payload.login}`]);token=result.stdout.trim();result.stdout='';
    if(result.code!==0||!token||token.length>16384||/[\s\u0000-\u001f]/.test(token))throw new Error('GitHub CLI could not retrieve the selected account credential');
    try{await this.serviceOptions.copyToken(token);}catch{throw new Error('The native clipboard could not accept the credential');}
    this.update({message:`Credential copied to the system clipboard for ${payload.login} on ${host}. Other applications may read it; clear the clipboard after use.`,error:undefined});return this.snapshot();
   }finally{token='';this.changing=false;}
  }
  if(action==='setup-git'){
   this.changing=true;
   try{
    await this.refresh();if(!setupWithoutAccount){const account=this.state.accounts.find(a=>a.host===host&&a.login===payload.login&&a.active&&a.state==='success');if(!account)throw new Error('Select the active authenticated account before configuring Git');}
    const result=await this.run(['auth','setup-git',`--hostname=${host}`,...(payload.force?['--force']:[])]);
    if(result.code!==0){this.update({status:'failed',message:undefined,error:'Git credential-helper setup did not complete. Check Git installation and configuration permissions.'});return this.snapshot();}
    const readback=await this.run(['config','--global','--get-all',`credential.https://${host}.helper`],'git');
    const helpers=readback.stdout.split(/\r?\n/);if(helpers.at(-1)==='')helpers.pop();
    const canonicalBinary=await realpath(this.binary).catch(()=>this.binary);const expected=canonicalBinary.replaceAll('\\','/').replace(/\.exe$/i,'');
    const installed=helpers.at(-1)?.replaceAll('\\','/');
    if(readback.code!==0||!installed||!installed.startsWith('!')||!installed.includes(expected)||! /\bauth git-credential\s*$/.test(installed)){this.update({status:'failed',message:undefined,error:'GitHub CLI completed setup, but the expected global credential helper could not be read back. Setup may have changed Git configuration; inspect it before retrying.'});return this.snapshot();}
    this.update({message:`GitHub CLI credential helper verified in global Git configuration for ${host}. This changes Git authentication on this device; repository settings may override the global helper. Configuring the helper does not sign in to this host.`,error:undefined});return this.snapshot();
   }catch(error){this.update({status:'failed',message:undefined,error:error instanceof Error?error.message:'Git credential-helper verification failed after setup; configuration may have changed.'});return this.snapshot();}finally{this.changing=false;}
  }
  this.changing=true;
  try {
   await this.refresh();const account=this.state.accounts.find(a=>a.host===host&&a.login===payload.login);if(!account)throw new Error('Select a known GitHub account');
   if(account.tokenSource==='environment')throw new Error('This account is managed by an environment token. Update the environment to change it.');
   if(action==='switch'&&this.state.accounts.some(a=>a.host===host&&a.active&&a.tokenSource==='environment'))throw new Error('An environment token overrides saved accounts for this host. Start Material Git without that environment credential to switch saved accounts.');
   const result=await this.run(['auth',action,`--hostname=${host}`,`--user=${payload.login}`]);
   if(result.code!==0){this.update({status:'failed',error:`GitHub account ${action} did not complete.`});return this.snapshot();}
   await this.refresh();
   const selected=this.state.accounts.find(a=>a.host===host&&a.login===payload.login);
   if(action==='switch'&&(!selected?.active||selected.state!=='success')){this.update({status:'failed',message:undefined,error:'The selected account is not active after switching. Refresh accounts and check whether an environment credential overrides it.'});return this.snapshot();}
   if(action==='logout'&&selected){this.update({status:'failed',message:undefined,error:'The account is still reported after removal. Refresh accounts to check its credential source.'});return this.snapshot();}
   this.update({message:action==='logout'?'Account removed from this device. Existing tokens remain valid until revoked on GitHub.':`Verified active account: ${payload.login} on ${host}.`,error:undefined});return this.snapshot();
  } finally {this.changing=false;}
 }
}
