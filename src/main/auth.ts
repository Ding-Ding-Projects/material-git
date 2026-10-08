import { spawn, type ChildProcess, type SpawnOptions } from 'node:child_process';
import type { AuthAccount, AuthAction, AuthPayload, AuthState } from '../shared/types';
export interface AuthServiceOptions {
 allowedHosts?: string[];
 spawn?: (binary: string, args: string[], options: SpawnOptions) => ChildProcess;
}
const ADDITIONAL_SCOPES = ['project','workflow','read:user','user:email','read:packages','write:packages','delete:packages','admin:public_key','admin:repo_hook','read:discussion','write:discussion'];
const HOST = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
/** Dedicated authentication channel: never forward its output to operation history or exports. */
export class AuthService {
 private readonly spawnProcess: NonNullable<AuthServiceOptions['spawn']>;
 private readonly hosts: string[];
 private listeners = new Set<(state: AuthState) => void>();
 private child?: ChildProcess;
 private generation = 0;
 private checking?: Promise<AuthState>;
 private state: AuthState;
 constructor(private binary: string, private cwd: string, options: AuthServiceOptions = {}) {
  this.hosts = [...new Set(options.allowedHosts || ['github.com'])];
  if(!this.hosts.length || this.hosts.some(host=>!HOST.test(host)))throw new Error('Authentication hosts must be exact lowercase DNS hostnames');
  this.spawnProcess=options.spawn || ((binary,args,opts)=>spawn(binary,args,opts));
  this.state={status:'idle',accounts:[],allowedHosts:[...this.hosts],allowedScopes:[...ADDITIONAL_SCOPES]};
 }
 subscribe(callback: (state: AuthState) => void): () => void {this.listeners.add(callback);return()=>{this.listeners.delete(callback);};}
 snapshot(): AuthState {return structuredClone(this.state);}
 private update(patch: Partial<AuthState>) {this.state={...this.state,...patch};for(const callback of this.listeners){try{callback(this.snapshot());}catch{/* Subscriber errors cannot interrupt authentication cleanup. */}}}
 private host(payload: AuthPayload): string {
  const host=payload.hostname || 'github.com';if(typeof host!=='string'||!HOST.test(host)||!this.hosts.includes(host))throw new Error('Choose an approved GitHub hostname');return host;
 }
 private options(): SpawnOptions {
  // User-initiated browser opening belongs to the renderer's validated external-link workflow.
  return {cwd:this.cwd,shell:false,windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,GH_PROMPT_DISABLED:'1',GH_PAGER:'cat',NO_COLOR:'1',GIT_TERMINAL_PROMPT:'0'}};
 }
 private async run(args: string[]): Promise<{code:number|null;stdout:string}> {
  return new Promise((resolve,reject)=>{
   const child=this.spawnProcess(this.binary,args,this.options());let stdout='';let settled=false;
   const finish=(error?:Error,code:number|null=null)=>{if(settled)return;settled=true;clearTimeout(timer);error?reject(error):resolve({code,stdout});};
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
 async action(action: AuthAction, payload: AuthPayload = {}): Promise<AuthState> {
  if(!['status','login','cancel','switch','logout'].includes(action))throw new Error('Unknown authentication action');
  if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new Error('Invalid authentication request');
  for(const key of Object.keys(payload))if(!['hostname','login','scopes','confirmed'].includes(key))throw new Error('Unknown authentication parameter');
  if(action==='status')return this.refresh();
  if(action==='cancel') {const child=this.child;this.child=undefined;this.generation++;if(child){child.kill();const timer=setTimeout(()=>child.kill('SIGKILL'),2000);timer.unref();}this.update({status:'cancelled',deviceCode:undefined,verificationUrl:undefined,message:'Sign-in cancelled.',error:undefined});return this.snapshot();}
  if(this.child)throw new Error('Finish or cancel the current sign-in first');
  const host=this.host(payload);
  if(action==='login') {
   const scopes=payload.scopes || [];if(!Array.isArray(scopes)||scopes.length>ADDITIONAL_SCOPES.length||scopes.some(s=>typeof s!=='string'||!ADDITIONAL_SCOPES.includes(s)))throw new Error('Choose supported GitHub authorization scopes');
   const args=['auth','login',`--hostname=${host}`,'--web','--git-protocol=https','--skip-ssh-key','--clipboard=false'];if(scopes.length)args.push(`--scopes=${[...new Set(scopes)].join(',')}`);
   this.update({status:'starting',hostname:host,deviceCode:undefined,verificationUrl:undefined,error:undefined,message:'Starting GitHub device sign-in…'});
   const generation=++this.generation;const child=this.spawnProcess(this.binary,args,this.options());this.child=child;let buffer='';let closed=false;
   const timeout=setTimeout(()=>{if(this.child===child){void this.action('cancel');this.update({status:'failed',error:'The GitHub sign-in request expired. Start a new sign-in.'});}},900000);timeout.unref();
   const receive=(chunk:Buffer)=>{
    if(generation!==this.generation)return;buffer=(buffer+chunk.toString('utf8')).slice(-16384);
    const code=buffer.match(/(?:one-time code[:\s]+|code \()([A-Z0-9]{4}-[A-Z0-9]{4})/i)?.[1];
    const candidates=buffer.match(/https:\/\/[^\s<>]+/g) || [];
    const verificationUrl=candidates.find(value=>{try{const u=new URL(value);return u.protocol==='https:'&&u.hostname===host&&!u.username&&!u.password&&!u.port&&u.pathname==='/login/device'&&!u.search&&!u.hash;}catch{return false;}});
    if(code||verificationUrl)this.update({status:'waiting',...(code?{deviceCode:code}:{}),...(verificationUrl?{verificationUrl}:{}),message:'Enter the one-time code on GitHub to finish signing in.'});
   };
   child.stdout?.on('data',receive);child.stderr?.on('data',receive);
   const finish=async(code:number|null)=>{if(closed)return;closed=true;clearTimeout(timeout);buffer='';if(generation!==this.generation)return;this.child=undefined;this.update({deviceCode:undefined,verificationUrl:undefined});if(code===0){this.update({message:'GitHub sign-in completed.'});await this.refresh();}else this.update({status:'failed',error:'GitHub sign-in did not complete. Start again or check the network.'});};
   child.on('error',()=>{void finish(null);});child.on('close',code=>{void finish(code);});return this.snapshot();
  }
  if(payload.confirmed!==true)throw new Error('Review and confirm the account change');
  if(typeof payload.login!=='string'||! /^(?:[A-Za-z0-9][A-Za-z0-9-]{0,38})(?:\[bot\])?$/.test(payload.login))throw new Error('Select a valid GitHub account');
  await this.refresh();const account=this.state.accounts.find(a=>a.host===host&&a.login===payload.login);if(!account)throw new Error('Select a known GitHub account');
  if(account.tokenSource==='environment')throw new Error('This account is managed by an environment token. Update the environment to change it.');
  const result=await this.run(['auth',action,`--hostname=${host}`,`--user=${payload.login}`]);
  if(result.code!==0){this.update({status:'failed',error:`GitHub account ${action} did not complete.`});return this.snapshot();}
  this.update({message:action==='logout'?'Account removed from this device. Existing tokens remain valid until revoked on GitHub.':'Active GitHub account changed.'});return this.refresh();
 }
}
