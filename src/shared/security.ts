import {workflowCommandIds} from './cli-workflows.js';
export type TotpAlgorithm='SHA1'|'SHA256'|'SHA512';
export interface TotpParameters{secret:string;algorithm:TotpAlgorithm;digits:6|7|8;period:number;issuer:string;account:string}
export interface SecurityStatus{available:boolean;vaultAvailable:boolean;watching:boolean;error?:string;recoveryDirectory:string;lockRecoveryDirectory?:string;schoolMode:{displayName:string;active:boolean;revision:number;updatedAt:string|null};credentialSet:boolean}
export interface AuthenticatorSummary{id:string;issuer:string;account:string;algorithm:TotpAlgorithm;digits:6|7|8;period:number}
export interface SecurityBridge{security(action:string,payload?:Record<string,unknown>):Promise<unknown>;onSecurity?(callback:(status:SecurityStatus)=>void):()=>void}
export function validateTotpParameters(input:unknown):TotpParameters{
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Invalid authenticator parameters');
 const value=input as Record<string,unknown>;
 if(Object.keys(value).some(k=>!['secret','algorithm','digits','period','issuer','account'].includes(k)))throw new Error('Unexpected authenticator parameter');
 const {secret,algorithm='SHA1',digits=6,period=30,issuer='',account=''}=value;
 if(typeof secret!=='string'||!secret.length||secret.length>256||!/^[A-Z2-7]+={0,6}$/i.test(secret)||!['SHA1','SHA256','SHA512'].includes(String(algorithm))||![6,7,8].includes(Number(digits))||typeof digits!=='number'||typeof period!=='number'||!Number.isInteger(period)||period<1||period>86400||typeof issuer!=='string'||issuer.length>128||typeof account!=='string'||!account.length||account.length>256||/[\u0000-\u001f]/.test(issuer+account))throw new Error('Invalid authenticator parameters');
 return {secret:secret.toUpperCase().replace(/=+$/,''),algorithm:algorithm as TotpAlgorithm,digits:digits as 6|7|8,period,issuer,account};
}
export function parseOtpAuth(uri:string):TotpParameters{
 if(uri.length>4096)throw new Error('Authenticator URI is too long');let url:URL;try{url=new URL(uri);}catch{throw new Error('Invalid authenticator URI');}
 if(url.protocol!=='otpauth:'||url.hostname!=='totp'||url.username||url.password||url.hash)throw new Error('Only local standard TOTP enrollment is supported');
 const seen=new Set<string>();for(const key of url.searchParams.keys()){if(!['secret','issuer','algorithm','digits','period'].includes(key)||seen.has(key))throw new Error('Unexpected or duplicate authenticator parameter');seen.add(key);}
 let label:string;try{label=decodeURIComponent(url.pathname.slice(1));}catch{throw new Error('Invalid authenticator label');}const colon=label.indexOf(':');const labelIssuer=colon<0?'':label.slice(0,colon),account=colon<0?label:label.slice(colon+1);const issuer=url.searchParams.get('issuer')??labelIssuer;if(labelIssuer&&issuer!==labelIssuer)throw new Error('Conflicting authenticator issuer');
 return validateTotpParameters({secret:url.searchParams.get('secret'),issuer,account,algorithm:(url.searchParams.get('algorithm')??'SHA1').toUpperCase(),digits:Number(url.searchParams.get('digits')??6),period:Number(url.searchParams.get('period')??30)});
}
export function otpAuthUri(parameters:TotpParameters):string{const value=validateTotpParameters(parameters);const label=value.issuer?`${value.issuer}:${value.account}`:value.account;const query=new URLSearchParams({secret:value.secret,issuer:value.issuer,algorithm:value.algorithm,digits:String(value.digits),period:String(value.period)});return `otpauth://totp/${encodeURIComponent(label)}?${query}`;}
export const lockPolicies=['pin','password','pin-password','password-totp','pin-totp','password-pin-totp'] as const;
export type LockPolicy=typeof lockPolicies[number];
export type UnlockDuration={kind:'surface'}|{kind:'session'}|{kind:'minutes';minutes:number};
export interface LockTarget{id:string;label:string;ancestors?:string[]}
export interface LockSummary extends LockTarget{policy:LockPolicy;duration:UnlockDuration;locked:boolean;unlockedUntil?:number}
export interface LockAnswers{pin?:string;password?:string;code?:string}
export function lockFactors(policy:LockPolicy):Array<'password'|'pin'|'totp'>{switch(policy){case'pin':return['pin'];case'password':return['password'];case'pin-password':return['pin','password'];case'password-totp':return['password','totp'];case'pin-totp':return['pin','totp'];case'password-pin-totp':return['password','pin','totp'];default:throw new Error('Choose a supported factor policy');}}
export function validLockId(id:unknown):id is string{return typeof id==='string'&&/^[a-zA-Z0-9:._-]{1,128}$/.test(id)&&!['__proto__','constructor','prototype'].includes(id);}
export function validateUnlockDuration(input:unknown):UnlockDuration{if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Choose an unlock duration');const v=input as Record<string,unknown>;if(v.kind==='minutes'&&Object.keys(v).length===2&&Number.isInteger(v.minutes)&&Number(v.minutes)>=1&&Number(v.minutes)<=1440)return{kind:'minutes',minutes:Number(v.minutes)};if((v.kind==='surface'||v.kind==='session')&&Object.keys(v).length===1)return{kind:v.kind};throw new Error('Choose this action, 1–1440 minutes, or until the app closes');}
/** The native caller chooses the channel and action; renderer-supplied target arrays never select permissions. */
export function protectedLockIds(channel:string,action?:string,commandId?:string):string[]{
 const lane=channel==='execute'||channel==='choices'?'commands':channel==='auth'?'accounts':channel==='api'?'api':channel==='cliConfig'?'cli-config':channel==='settings'?'settings':channel==='tools'?'tools':channel;
 const ids=[`destination:${lane}`];if(commandId){const key=commandId.replaceAll(' ','.');if(!validLockId(key))throw new Error('Invalid command lock identifier');ids.push(`command:${key}`,`tab:${key}`);}if(action){if(!validLockId(action))throw new Error('Invalid action lock identifier');ids.push(`${channel}:${action}`);}return ids;
}

const cliWorkflowDestinations=new Map<string,readonly string[]>(workflowCommandIds.map(command=>[command,command.startsWith('codespace ')?['codespaces']:command.startsWith('extension ')?['extensions']:command.startsWith('alias ')?['aliases']:command==='copilot'?['tools','copilot']:['tools']]));
/** Only supported native workflow IDs choose productive destinations; Apply uses the stored command. */
export function cliWorkflowLockIds(commandId:unknown):string[]{if(typeof commandId!=='string'||!cliWorkflowDestinations.has(commandId))throw new Error('Unknown workflow command');return [...protectedLockIds('execute',undefined,commandId),...cliWorkflowDestinations.get(commandId)!.map(lane=>`destination:${lane}`)];}

const providerGitSources=[
 {action:'repositories.clone-source',kind:'repository',destination:'repositories',command:'repo clone',label:'Clone selected repository'},
 {action:'gists.clone-source',kind:'gist',destination:'gists',command:'gist clone',label:'Clone selected gist'},
 {action:'pulls.checkout-source',kind:'pull-request',destination:'pulls',command:'pr checkout',label:'Check out selected pull request'},
] as const;
/** Native receipt provenance selects these fixed origins; renderer IDs never choose lock authority. */
export function providerGitLockIds(action:unknown):string[]{const source=providerGitSources.find(source=>source.action===action);if(!source)throw new Error('Unknown provider Git source');return [...protectedLockIds('execute',undefined,source.command),`destination:${source.destination}`,`github:${source.action}`];}
export function providerGitKindLockIds(kind:unknown):string[]{const source=providerGitSources.find(source=>source.kind===kind);if(!source)throw new Error('Unknown provider Git source kind');return providerGitLockIds(source.action);}
export function providerGitLockTargets():LockTarget[]{return [...providerGitSources.map(source=>({id:`destination:${source.destination}`,label:source.destination})),...providerGitSources.map(source=>({id:`github:${source.action}`,label:source.label,ancestors:providerGitLockIds(source.action).filter(id=>id!==`github:${source.action}`)}))];}

/** These actions only stop a native-owned operation; their service still validates ownership. */
export function isOwnedCancellation(channel:string,action:unknown):boolean{return channel==='git'&&action==='cancel'||channel==='cli-workflows'&&action==='cancel'||channel==='github'&&action==='actions.watch-cancel'||channel==='downloads'&&(action==='pause'||action==='cancel');}
/** Revocation only removes unused native receipts; each service validates its opaque identifier. */
export function isOwnedCleanup(channel:string,action:unknown):boolean{return isOwnedCancellation(channel,action)||channel==='github'&&action==='provider-source-discard'||channel==='git'&&action==='discard-review';}

export const nativeLockLanes=['commands','codespaces','extensions','aliases','copilot','accounts','api','cli-config','settings','tools','security','history','notifications','records','integrations','assistant','downloads','updates','docs','about','home'] as const;
export function nativeLockTargets(commands:Array<{id:string;title:string}>=[]):LockTarget[]{return [...nativeLockLanes.map(lane=>({id:`destination:${lane}`,label:lane})),...commands.flatMap(command=>[{id:`command:${command.id.replaceAll(' ','.')}`,label:command.title,ancestors:['destination:commands',...(cliWorkflowDestinations.get(command.id)||[]).map(lane=>`destination:${lane}`)]},{id:`tab:${command.id.replaceAll(' ','.')}`,label:command.title,ancestors:['destination:commands',...(cliWorkflowDestinations.get(command.id)||[]).map(lane=>`destination:${lane}`)]}])];}
