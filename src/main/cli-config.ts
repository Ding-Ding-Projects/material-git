import {validateAuthHost} from './auth-hosts';
import {spawn, type SpawnOptions} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
import {stat} from 'node:fs/promises';
import {isAbsolute,win32} from 'node:path';
import referenceData from '../../data/gh-reference.json';
import {CLI_CONFIG_DEFINITIONS,type CliConfigAction,type CliConfigPayload,type CliConfigResponse,type CliConfigScope,type CliConfigKey,type CliConfigDefinition,type CliConfigSnapshot,type CliConfigReview,type CliConfigChange,type CliReference} from '../shared/cli-config';

export interface CliConfigServiceOptions {
 run?:(binary:string,args:string[],options:SpawnOptions)=>Promise<{code:number|null;stdout:string}>;
 environment?:NodeJS.ProcessEnv;
 chooseExecutable?:(definition:CliConfigDefinition)=>Promise<string|null>;
 now?:()=>number;
 resolveHost?:(hostname?:string)=>{hostname:string};
 approvedHosts?:()=>readonly {hostname:string}[];
}
type RawValues=Record<CliConfigKey,string>;
interface PendingReview {review:CliConfigReview;changes:{key:CliConfigKey;value:string}[];fingerprint:string;}
const DEFINITIONS=new Map(CLI_CONFIG_DEFINITIONS.map(definition=>[definition.key,definition]));
const REFERENCE=referenceData as unknown as CliReference;
const SECRET_LIKE=/(?:gh[pousr]_|github_pat_|(?:token|password|secret)\s*[=:])/i;
const NOTES=[
 'Values come from native GitHub CLI resolution. A value equal to the global value may be inherited or an explicit host override; the CLI does not expose that distinction.',
 'Environment variable names are shown for context. Their values are never returned. Guided desktop commands use their own noninteractive output and prompt settings.',
 'Restore default writes an explicit documented value. It does not remove a stored key or restore host inheritance.',
];

/** Only allowlisted, non-secret config keys cross this dedicated channel. No YAML or credential file is read. */
export class CliConfigService {
 private readonly environment:NodeJS.ProcessEnv;
 private readonly runner:NonNullable<CliConfigServiceOptions['run']>;
 private readonly now:()=>number;
 private reviews=new Map<string,PendingReview>();
 private selectedExecutables=new Map<string,string>();
 private versionChecked=false;
 private applying=false;
 private contextGeneration=0;
 constructor(private readonly binary:string,private readonly options:CliConfigServiceOptions={}) {
  this.environment={...(options.environment??process.env)};this.now=options.now??Date.now;
  this.runner=options.run??((binary,args,options)=>new Promise((resolve,reject)=>{
   const child=spawn(binary,args,options);let stdout='';let settled=false;
   const finish=(error?:Error,code:number|null=null)=>{if(settled)return;settled=true;clearTimeout(timer);error?reject(error):resolve({code,stdout});};
   const timer=setTimeout(()=>{child.kill();finish(new Error('GitHub CLI configuration timed out.'));},15000);timer.unref();
   child.stdout?.on('data',(chunk:Buffer)=>{stdout+=chunk.toString('utf8');if(stdout.length>131072){child.kill();finish(new Error('GitHub CLI configuration response exceeded its limit.'));}});
   child.stderr?.resume();child.on('error',()=>finish(new Error('Unable to start GitHub CLI configuration.')));child.on('close',code=>finish(undefined,code));
  }));
 }
 private async run(args:string[]) {
  // These commands are local config operations. Preserve config-directory selection, disable interaction.
  const env={...this.environment,GH_PROMPT_DISABLED:'1',GH_PAGER:'cat',NO_COLOR:'1',GH_NO_UPDATE_NOTIFIER:'1'};
  const result=await this.runner(this.binary,args,{shell:false,windowsHide:true,stdio:['ignore','pipe','pipe'],env});
  if(result.stdout.length>131072)throw new Error('GitHub CLI configuration response exceeded its limit.');
  return result;
 }
 private async version() {if(this.versionChecked)return;const result=await this.run(['--version']);if(result.code!==0||!result.stdout.startsWith('gh version 2.102.0 '))throw new Error('Configuration requires the bundled GitHub CLI 2.102.0.');this.versionChecked=true;}
 private scopes():CliConfigScope[]{const hosts=this.options.approvedHosts?.()||[{hostname:'github.com'}];if(!Array.isArray(hosts)||hosts.length>32)throw new Error('Approved configuration hosts are unavailable.');const scopes=['global',...hosts.map(host=>validateAuthHost(host.hostname).hostname)];if(scopes.some(scope=>typeof scope!=='string'||scope.length>253||!/^[a-z0-9][a-z0-9.-]*$/.test(scope))||new Set(scopes).size!==scopes.length)throw new Error('Approved configuration hosts are invalid.');return scopes;}
 private hostname(value?:string):string {const hostname=this.options.resolveHost?this.options.resolveHost(value).hostname:value||'github.com';if(!this.scopes().includes(hostname)||hostname==='global'||value&&value!==hostname)throw new Error('Choose an exact approved configuration host.');return hostname;}
 private scope(value:unknown):CliConfigScope {if(value===undefined||value==='global')return 'global';if(typeof value!=='string'||!this.scopes().includes(value))throw new Error('Choose Global or an approved configuration host.');return this.hostname(value);}
 private scoped(args:string[],scope:CliConfigScope) {const checked=this.scope(scope);return checked==='global'?args:[...args,`--host=${checked}`];}
 invalidateReviews(){this.contextGeneration++;this.reviews.clear();}

 private async raw(scope:CliConfigScope):Promise<RawValues> {
  // config list defaults to the active host; get with no --host is the actual global scope.
  const entries: [CliConfigKey,string][]=[];
  for(const definition of CLI_CONFIG_DEFINITIONS){const result=await this.run(this.scoped(['config','get',definition.key],scope));if(result.code!==0)throw new Error('Unable to read GitHub CLI configuration.');entries.push([definition.key,result.stdout.replace(/\r?\n$/,'')]);}
  return Object.fromEntries(entries) as RawValues;
 }
 private safeValue(key:CliConfigKey,value:string):string {
  const definition=DEFINITIONS.get(key)!;
  if(!value)return '';
  if(definition.kind==='unavailable')return 'Configured value hidden';
  if(definition.kind==='choice')return definition.choices!.includes(value)?value:'Unsupported value hidden';
  const selected=this.selectedExecutables.get(`${key}:${value}`);
  return selected&&!SECRET_LIKE.test(selected)?selected:'External command configured (hidden)';
 }
 private environmentReference() {return REFERENCE.environment.map(entry=>({...entry,names:[...entry.names],presentNames:entry.names.filter(name=>Object.prototype.hasOwnProperty.call(this.environment,name))}));}
 private source(definition:CliConfigDefinition):string|undefined {
  return definition.environment.find(name=>{
   const value=this.environment[name];if(value===undefined)return false;
   if(['GH_PROMPT_DISABLED','GH_COLOR_LABELS'].includes(name))return true;
   if(name==='GH_TELEMETRY')return ['log','false','0'].includes(value);
   if(name==='DO_NOT_TRACK')return this.environment.GH_TELEMETRY===undefined&&['true','1'].includes(value);
   if(['GH_ACCESSIBLE_COLORS','GH_ACCESSIBLE_PROMPTER','GH_SPINNER_DISABLED'].includes(name))return ['1','true','yes','on'].includes(value.toLowerCase());
   return value.length>0;
  });
 }
 private async snapshot(scope:CliConfigScope):Promise<CliConfigSnapshot> {
  const hostname=this.hostname(scope==='global'?undefined:scope);const global=await this.raw('global');const host=await this.raw(hostname);
  return {kind:'snapshot',version:REFERENCE.version,scope,hostname,scopes:this.scopes(),definitions:structuredClone(CLI_CONFIG_DEFINITIONS),values:CLI_CONFIG_DEFINITIONS.map(definition=>({key:definition.key,value:this.safeValue(definition.key,(scope==='global'?global:host)[definition.key]),globalValue:this.safeValue(definition.key,global[definition.key]),hostValue:this.safeValue(definition.key,host[definition.key]),origin:'cli-resolved',hostRelation:host[definition.key]===global[definition.key]?'same-as-global':'different-from-global',...(this.source(definition)?{environmentSource:this.source(definition)}:{}),...(definition.kind==='executable'&&(scope==='global'?global:host)[definition.key]?{configuredCommandHidden:!this.selectedExecutables.has(`${definition.key}:${(scope==='global'?global:host)[definition.key]}`)}:{})})),environment:this.environmentReference(),notes:[...NOTES],reset:{supported:false,reason:'This CLI has no config unset/reset command. Removing a host override requires a separate storage adapter; config clear-cache only removes cached responses.'}};
 }
 private fingerprint(global:RawValues,host:RawValues,keys:CliConfigKey[]) {return createHash('sha256').update(JSON.stringify(keys.map(key=>[key,global[key],host[key]]))).digest('hex');}
 private validateChanges(changes:unknown,scope:CliConfigScope):{key:CliConfigKey;value:string}[] {
  if(!Array.isArray(changes)||!changes.length||changes.length>12)throw new Error('Select from 1 to 12 supported configuration changes.');
  const seen=new Set<string>();return changes.map((change:CliConfigChange)=>{
   if(!change||typeof change!=='object'||Array.isArray(change)||Object.keys(change).some(key=>!['key','mode','value'].includes(key)))throw new Error('Invalid configuration change.');
   const definition=DEFINITIONS.get(change.key);if(!definition||!definition.available)throw new Error('This configuration key requires an unavailable adapter.');
   if(definition.scopes&&!definition.scopes.includes(scope))throw new Error(definition.scopeReason||'This setting is unavailable in the selected scope.');
   if(seen.has(change.key))throw new Error('Review each configuration key only once.');seen.add(change.key);
   if(change.mode!=='set'&&change.mode!=='default')throw new Error('Choose a value or restore the documented default.');
   const value=change.mode==='default'?definition.defaultValue:change.value;
   if(typeof value!=='string'||value.length>4096||/[\r\n\0]/.test(value)||SECRET_LIKE.test(value))throw new Error('Invalid configuration value.');
   if(definition.kind==='choice'&&!definition.choices!.includes(value))throw new Error('Choose a documented configuration value.');
   if(definition.kind==='executable'&&value!==''&&!this.selectedExecutables.has(`${change.key}:${value}`))throw new Error('Choose the program using its native executable file picker. Arbitrary command strings are unavailable.');
   return {key:change.key,value};
  });
 }
 private pruneReviews(){for(const [key,pending] of this.reviews)if(Date.parse(pending.review.expiresAt)<=this.now())this.reviews.delete(key);while(this.reviews.size>=20)this.reviews.delete(this.reviews.keys().next().value!);}
 async action(action:CliConfigAction,payload:CliConfigPayload={}):Promise<CliConfigResponse> {
  if(!['snapshot','review','apply','choose-executable','reference'].includes(action))throw new Error('Unknown CLI configuration action.');
  if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new Error('Invalid CLI configuration request.');
  const allowed:Record<CliConfigAction,string[]>={snapshot:['scope'],review:['scope','changes'],apply:['reviewId','confirmed'],'choose-executable':['key'],reference:[]};
  if(Object.keys(payload).some(key=>!allowed[action].includes(key)))throw new Error('Unknown CLI configuration parameter.');
  if(action==='reference')return {kind:'reference',reference:{version:REFERENCE.version,source:REFERENCE.source,globalFlags:structuredClone(REFERENCE.globalFlags),helpTopics:structuredClone(REFERENCE.helpTopics),environment:this.environmentReference(),capabilities:structuredClone(REFERENCE.capabilities),coverage:structuredClone(REFERENCE.coverage),commands:structuredClone(REFERENCE.commands)}};
  await this.version();
  if(action==='snapshot')return this.snapshot(this.scope(payload.scope));
  if(action==='choose-executable') {
   const definition=DEFINITIONS.get(payload.key!);if(!definition||definition.kind!=='executable')throw new Error('Select an editor, browser or pager executable.');
   if(!this.options.chooseExecutable)throw new Error('The native executable picker adapter is unavailable.');
   const path=await this.options.chooseExecutable(structuredClone(definition));if(path===null)return {kind:'executable',key:definition.key,value:null};
   if(typeof path!=='string'||path.length>2048||/[\r\n\0"'`$;&|<>]/.test(path)||SECRET_LIKE.test(path)||(!isAbsolute(path)&&!win32.isAbsolute(path)))throw new Error('Choose an absolute executable file without shell syntax.');
   try {const file=await stat(path);if(!file.isFile()||(process.platform==='win32'?!/\.exe$/i.test(path):(file.mode&0o111)===0))throw new Error('Not executable');}catch{throw new Error('Choose a readable executable file.');}
   const value=/\s/.test(path)?`"${path}"`:path;this.selectedExecutables.set(`${definition.key}:${value}`,path);
   return {kind:'executable',key:definition.key,value};
  }
  this.pruneReviews();
  if(action==='review') {
   if(this.applying)throw new Error('Wait for the current configuration change to finish.');
   const scope=this.scope(payload.scope);const changes=this.validateChanges(payload.changes,scope);
   const generation=this.contextGeneration,hostname=this.hostname(scope==='global'?undefined:scope);const global=await this.raw('global');const host=await this.raw(hostname);if(generation!==this.contextGeneration)throw new Error('Configuration context changed while preparing this review. Refresh and review again.');
   const review:CliConfigReview={kind:'review',reviewId:randomUUID(),scope,hostname,expiresAt:new Date(this.now()+5*60*1000).toISOString(),changes:changes.map(change=>({key:change.key,label:DEFINITIONS.get(change.key)!.label,before:this.safeValue(change.key,(scope==='global'?global:host)[change.key]),after:this.safeValue(change.key,change.value),...(this.source(DEFINITIONS.get(change.key)!)?{environmentSource:this.source(DEFINITIONS.get(change.key)!)}:{})})),notes:[...NOTES]};
   this.reviews.set(review.reviewId,{review,changes,fingerprint:this.fingerprint(global,host,changes.map(change=>change.key))});return structuredClone(review);
  }
  if(this.applying)throw new Error('Wait for the current configuration change to finish.');
  if(typeof payload.reviewId!=='string'||payload.confirmed!==true)throw new Error('Review and confirm the configuration changes first.');
  const pending=this.reviews.get(payload.reviewId);if(!pending)throw new Error('This review expired or was already applied. Review the changes again.');
  this.reviews.delete(payload.reviewId);this.applying=true;
  let written=0;const generation=this.contextGeneration;
  try {
   const hostname=this.hostname(pending.review.hostname);this.scope(pending.review.scope);if(pending.review.scope==='global'&&this.hostname()!==hostname)throw new Error('The selected comparison host changed. Refresh and review again.');const global=await this.raw('global');const host=await this.raw(hostname);
   if(this.fingerprint(global,host,pending.changes.map(change=>change.key))!==pending.fingerprint)throw new Error('Configuration changed since this review. Refresh and review again.');
   for(const change of pending.changes){if(Date.parse(pending.review.expiresAt)<=this.now())throw new Error('Configuration review expired before the write. Review again.');if(pending.review.scope==='global'&&this.hostname()!==pending.review.hostname)throw new Error('The selected comparison host changed before the write. Review again.');if(generation!==this.contextGeneration)throw new Error('Configuration context changed before the write. Refresh and review again.');this.hostname(pending.review.hostname);const result=await this.run(this.scoped(['config','set',change.key,change.value],pending.review.scope));if(result.code!==0)throw new Error('GitHub CLI could not write a reviewed setting.');written++;const check=await this.run(this.scoped(['config','get',change.key],pending.review.scope));if(check.code!==0||check.stdout.replace(/\r?\n$/,'')!==change.value)throw new Error('A setting was written but its native readback did not match.');}
   this.reviews.clear();return {kind:'mutation',snapshot:await this.snapshot(pending.review.scope),message:`Applied ${written} reviewed ${written===1?'setting':'settings'} to ${pending.review.scope==='global'?'Global':pending.review.scope}. Native CLI readback matched.`};
  }catch(error){this.reviews.clear();if(written)throw new Error(`${written} ${written===1?'setting was':'settings were'} written before the operation stopped. Refresh configuration before continuing. No automatic rollback was attempted.`);throw error;}finally{this.applying=false;}
 }
}
