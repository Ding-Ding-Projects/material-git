import {createHash,randomUUID} from 'node:crypto';
import type {GitProviderTarget} from '../shared/git-provider';
import type {GitHubLocalSourceAction,GitHubPayload} from '../shared/github';

type Row=Record<string,unknown>;
interface SourcePlan {action:GitHubLocalSourceAction;payload:GitHubPayload;target:GitProviderTarget;account:string}
export interface GitHubProviderDependencies {
 request:(endpoint:string)=>Promise<unknown>;
 account:()=>Promise<string>;
 selectedHostname:()=>string;
 inHost:<T>(hostname:string,work:()=>Promise<T>)=>Promise<T>;
 authorize?:(action:GitHubLocalSourceAction,payload:GitHubPayload)=>Promise<void>;
 now?:()=>number;
}
const ttl=300000;
const object=(value:unknown):Row=>{if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Provider source identity is unavailable');return value as Row;};
const numeric=(value:unknown,label:string)=>{const text=String(value??'');if(!/^[1-9][0-9]{0,15}$/.test(text))throw Error(`Invalid ${label}`);return text;};
const name=(value:unknown,label:string)=>{if(typeof value!=='string'||!/^[-A-Za-z0-9_.]+$/.test(value)||value.length>100||value==='.'||value==='..')throw Error(`Invalid ${label}`);return value;};
const repo=(value:unknown)=>{if(typeof value!=='string'||value.length>202||value.split('/').length!==2)throw Error('Choose the selected OWNER/repository');const [owner,repository]=value.split('/');return {owner:name(owner,'repository owner'),name:name(repository,'repository name')};};
const ref=(value:unknown)=>{if(typeof value!=='string'||!value||value.length>500||/[\0\r\n]/.test(value))throw Error('Provider branch identity is unavailable');return value;};
const sourceURL=(value:unknown,expected:string)=>{if(typeof value!=='string'||value!==expected)throw Error('Provider clone URL does not match the approved host and selected identity');const parsed=new URL(value);if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.port||parsed.search||parsed.hash)throw Error('Provider clone URL is not a canonical credential-free HTTPS source');return value;};

/** Opaque source receipts are native-owned; renderer URLs and head claims are never accepted. */
export class GitHubProviderTargets {
 private plans=new Map<string,SourcePlan>();private now:()=>number;
 constructor(private deps:GitHubProviderDependencies){this.now=deps.now||Date.now;}
 invalidate(){this.plans.clear();}
 async prepare(action:GitHubLocalSourceAction,payload:GitHubPayload,hostname:string):Promise<GitProviderTarget>{
  for(const key of Object.keys(payload))if(!['hostname','repository','id','providerId','providerKind'].includes(key))throw Error('Use only the selected provider record for a local handoff');
  if(hostname!==this.deps.selectedHostname())throw Error('The selected GitHub host changed. Select the local source again.');
  const account=await this.deps.account(),id=randomUUID(),expiresAt=new Date(this.now()+ttl).toISOString();
  const target=await this.read(action,payload,hostname,account,id,expiresAt);
  if(await this.deps.account()!==account)throw Error('The active account changed while reading the local source. Select it again.');
  if(hostname!==this.deps.selectedHostname())throw Error('The selected GitHub host changed while reading the local source. Select it again.');
  for(const [key,plan] of this.plans)if(Date.parse(plan.target.expiresAt)<this.now())this.plans.delete(key);
  if(this.plans.size>=32)throw Error('Finish a pending local handoff or wait for its source receipt to expire.');
  this.plans.set(id,{action,payload:structuredClone(payload),account,target:structuredClone(target)});return target;
 }
 async resolve(id:string):Promise<GitProviderTarget>{
  if(typeof id!=='string'||id.length>100)throw Error('Choose an issued provider source receipt');const plan=this.plans.get(id);
  if(!plan||Date.parse(plan.target.expiresAt)<this.now()){this.plans.delete(id);throw Error('Provider source receipt expired. Select the record again.');}
  if(this.deps.selectedHostname()!==plan.target.hostname)throw Error('The selected GitHub host changed. Select the local source again.');
  return this.deps.inHost(plan.target.hostname,async()=>{
   await this.deps.authorize?.(plan.action,plan.payload);
   if(await this.deps.account()!==plan.account)throw Error('The selected GitHub account changed. Select the local source again.');
   const current=await this.read(plan.action,plan.payload,plan.target.hostname,plan.account,id,plan.target.expiresAt);
   if(await this.deps.account()!==plan.account)throw Error('The active account changed while verifying the local source. Review again.');
   if(this.deps.selectedHostname()!==plan.target.hostname||Date.parse(plan.target.expiresAt)<this.now())throw Error('The provider source context changed or expired. Select it again.');
   if(JSON.stringify(current)!==JSON.stringify(plan.target))throw Error('The selected provider source changed. Refresh and review again.');
   return structuredClone(current);
  });
 }
 private async repository(value:string):Promise<{identity:{id:string;owner:string;name:string};url:string}>{const expected=repo(value),record=object(await this.deps.request(`repos/${expected.owner}/${expected.name}`));const actual=repo(record.full_name);if(`${actual.owner}/${actual.name}`.toLowerCase()!==value.toLowerCase())throw Error('The selected repository was renamed or replaced. Refresh its list.');const identity={id:numeric(record.id,'repository identity'),...actual};return {identity,url:sourceURL(record.clone_url,`https://${this.deps.selectedHostname()}/${actual.owner}/${actual.name}.git`)};}
 private async read(action:GitHubLocalSourceAction,payload:GitHubPayload,hostname:string,account:string,id:string,expiresAt:string):Promise<GitProviderTarget>{
  const common={id,hostname,accountFingerprint:createHash('sha256').update(JSON.stringify([hostname,account])).digest('hex'),expiresAt};
  if(action==='gists.clone-source'){
   if(payload.repository||payload.providerKind||payload.providerId!==undefined)throw Error('Choose only the selected gist identity');const gist=String(payload.id??'');if(!/^[a-f0-9]{1,64}$/.test(gist))throw Error('Invalid selected gist identity');const record=object(await this.deps.request(`gists/${gist}`));if(record.id!==gist)throw Error('The selected gist identity changed');
   // Pinned gh gist clone maps each API host to its exact gist subdomain.
   return {...common,kind:'gist',providerId:gist,url:sourceURL(record.git_pull_url,`https://gist.${hostname}/${gist}.git`),name:`gist-${gist}`};
  }
  if(action==='repositories.clone-source'){
   if(payload.providerId!==undefined||payload.providerKind)throw Error('Choose only the selected repository identity');const expected=repo(payload.repository),source=await this.repository(`${expected.owner}/${expected.name}`);if(source.identity.id!==numeric(payload.id,'selected repository identity'))throw Error('The selected repository identity changed');
   return {...common,kind:'repository',providerId:source.identity.id,url:source.url,name:source.identity.name,repository:source.identity};
  }
  if(action!=='pulls.checkout-source')throw Error('Unknown local provider source');
  const expected=repo(payload.repository),number=Number(numeric(payload.id,'pull request number'));const pull=object(await this.deps.request(`repos/${expected.owner}/${expected.name}/pulls/${number}`));
  if(Number(pull.number)!==number)throw Error('The selected pull request number changed');const providerId=numeric(pull.id,'pull request identity');
  if(payload.providerId!==undefined){const kind=payload.providerKind||'pull-request';if(kind!=='issue'&&kind!=='pull-request')throw Error('Invalid selected pull request identity type');const record=kind==='issue'?object(await this.deps.request(`repos/${expected.owner}/${expected.name}/issues/${number}`)):pull;if(numeric(record.id,'selected provider identity')!==numeric(payload.providerId,'selected provider identity')||Number(record.number)!==number)throw Error('The selected pull request identity changed');}
  const base=object(pull.base),baseRepo=object(base.repo),head=object(pull.head),canonical=repo(baseRepo.full_name);if(`${canonical.owner}/${canonical.name}`.toLowerCase()!==`${expected.owner}/${expected.name}`.toLowerCase())throw Error('The pull request belongs to a different base repository');
  const source=await this.repository(`${canonical.owner}/${canonical.name}`);if(source.identity.id!==numeric(baseRepo.id,'base repository identity'))throw Error('The pull request base repository identity changed');
  const headSha=head.sha;if(typeof headSha!=='string'||!/^[a-f0-9]{40,64}$/.test(headSha))throw Error('The pull request head commit is unavailable');
  return {...common,kind:'pull-request',providerId,url:source.url,name:`pr-${number}`,repository:source.identity,number,headSha,ref:`refs/pull/${number}/head`,baseRef:ref(base.ref)};
 }
}
