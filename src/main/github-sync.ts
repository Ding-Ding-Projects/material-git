import type {GitHubPayload} from '../shared/github';

type RecordData=Record<string,unknown>;
export type SyncRequest=(method:string,endpoint:string,body?:RecordData)=>Promise<{data:unknown;hasNext:boolean}>;
interface RepositoryIdentity {id:string;repository:string;defaultBranch:string;parent?:{id:string;repository:string}}
export interface PreparedRepositorySync {kind:'repository-sync';destination:RepositoryIdentity;source:RepositoryIdentity;branch:string;beforeSha:string;sourceSha:string;force:boolean;relation:'ahead'|'behind'|'identical'|'diverged';ahead:number;behind:number}
const object=(value:unknown):RecordData=>{if(!value||typeof value!=='object'||Array.isArray(value))throw Error('GitHub returned no synchronization identity');return value as RecordData;};
const identity=(value:unknown)=>{const result=String(value??'');if(!/^[1-9][0-9]{0,15}$/.test(result)||typeof value==='number'&&!Number.isSafeInteger(value))throw Error('Repository identity is unavailable');return result;};
const repository=(value:unknown)=>{if(typeof value!=='string'||value.length>202||!/^[-A-Za-z0-9_.]+\/[-A-Za-z0-9_.]+$/.test(value)||value.split('/').some(part=>part==='.'||part==='..'))throw Error('Choose an OWNER/repository from this host');return value;};
const branch=(value:unknown)=>{if(typeof value!=='string'||!value||value.length>500||/[\0\r\n]/.test(value))throw Error('Choose a valid synchronization branch');return value;};
const sha=(value:unknown)=>{if(typeof value!=='string'||!/^[a-f0-9]{40,64}$/.test(value))throw Error('Branch commit identity is unavailable');return value;};
async function readRepository(request:SyncRequest,selected:string):Promise<RepositoryIdentity>{const row=object((await request('GET',`repos/${repository(selected)}`)).data),canonical=repository(row.full_name);if(canonical.toLowerCase()!==selected.toLowerCase())throw Error('The selected repository was renamed or replaced. Refresh before synchronizing.');const parent=row.parent?object(row.parent):undefined;return {id:identity(row.id),repository:canonical,defaultBranch:branch(row.default_branch),...(parent?{parent:{id:identity(parent.id),repository:repository(parent.full_name)}}:{})};}
function reference(value:unknown,selectedBranch:string){const row=object(value),commit=object(row.object);if(row.ref!==`refs/heads/${selectedBranch}`||commit.type!=='commit')throw Error('GitHub returned a different synchronization branch');return sha(commit.sha);}
const refEndpoint=(repo:string,selectedBranch:string)=>`repos/${repo}/git/ref/heads/${encodeURIComponent(selectedBranch)}`;

/** Explicit remote destination only; no local Git mutation or renderer commit claims. */
export async function prepareRepositorySync(request:SyncRequest,payload:GitHubPayload):Promise<PreparedRepositorySync>{
 const values=object(payload.values||{});for(const key of Object.keys(values))if(!['options','arguments'].includes(key))throw Error('Use only structured synchronization options');const options=object(values.options||{}),args=object(values.arguments||{});
 for(const key of Object.keys(options))if(!['source','branch','force'].includes(key))throw Error(`Unknown synchronization option: ${key}`);for(const key of Object.keys(args))if(key!=='destination-repository')throw Error('Choose the destination in its repository view');
 const selected=repository(payload.repository);if(args['destination-repository']!==undefined&&args['destination-repository']!==selected)throw Error('The selected synchronization destination cannot be replaced');
 const destination=await readRepository(request,selected);if(destination.id!==identity(payload.id))throw Error('The selected destination repository identity changed');
 if(options.force!==undefined&&typeof options.force!=='boolean')throw Error('Choose whether to reset the destination branch');
 const selectedSource=options.source===undefined||options.source===''?destination.parent?.repository:repository(options.source);if(!selectedSource)throw Error('This repository has no parent. Choose a source repository.');
 const source=await readRepository(request,selectedSource);if(destination.parent?.repository===selectedSource&&destination.parent.id!==source.id)throw Error('The parent repository identity changed');if(source.id===destination.id)throw Error('Choose a source repository different from the destination');
 const selectedBranch=options.branch===undefined||options.branch===''?destination.defaultBranch:branch(options.branch);
 const beforeSha=reference((await request('GET',refEndpoint(destination.repository,selectedBranch))).data,selectedBranch),sourceSha=reference((await request('GET',refEndpoint(source.repository,selectedBranch))).data,selectedBranch);
 const compared=object((await request('GET',`repos/${destination.repository}/compare/${beforeSha}...${sourceSha}?per_page=1&page=1`)).data);const relation=compared.status,ahead=compared.ahead_by,behind=compared.behind_by;
 if(!['ahead','behind','identical','diverged'].includes(String(relation))||!Number.isSafeInteger(ahead)||!Number.isSafeInteger(behind)||Number(ahead)<0||Number(behind)<0||sha(object(compared.base_commit).sha)!==beforeSha)throw Error('GitHub returned no exact branch comparison');
 if(beforeSha===sourceSha&&relation!=='identical'||relation==='identical'&&(beforeSha!==sourceSha||ahead!==0||behind!==0)||relation==='ahead'&&(Number(ahead)<1||behind!==0)||relation==='behind'&&(Number(behind)<1||ahead!==0)||relation==='diverged'&&(Number(ahead)<1||Number(behind)<1))throw Error('GitHub returned an inconsistent branch comparison');
 const force=options.force===true;if(!force&&['behind','diverged'].includes(String(relation)))throw Error('The destination has commits absent from the source. Review an explicit reset to replace them, or resolve the divergence separately.');
 return {kind:'repository-sync',destination,source,branch:selectedBranch,beforeSha,sourceSha,force,relation:relation as PreparedRepositorySync['relation'],ahead:Number(ahead),behind:Number(behind)};
}

export async function executeRepositorySync(request:SyncRequest,prepared:PreparedRepositorySync):Promise<{detail:RecordData;notice:string}>{
 const {destination,source,branch:selectedBranch,sourceSha}=prepared;
 if(prepared.relation==='identical')return {detail:{repository:destination.repository,source:source.repository,branch:selectedBranch,sha:sourceSha,changed:false},notice:'The reviewed source and destination branch already match. No remote branch update was needed.'};
 const response=await request('PATCH',`repos/${destination.repository}/git/refs/heads/${encodeURIComponent(selectedBranch)}`,{sha:sourceSha,force:prepared.force});
 if(reference(response.data,selectedBranch)!==sourceSha)throw Error('GitHub returned a different commit after the branch update. Remote effects are uncertain; refresh before retrying.');
 const detail={repository:destination.repository,source:source.repository,branch:selectedBranch,sha:sourceSha,previousSha:prepared.beforeSha,reset:prepared.force,changed:true};
 try{const actual=reference((await request('GET',refEndpoint(destination.repository,selectedBranch))).data,selectedBranch);if(actual!==sourceSha)return {detail:{...detail,observedSha:actual,partialEffects:true,ok:false},notice:'GitHub accepted the reviewed update, but the branch changed again before verification. Current source equality is not established. Refresh before retrying.'};}
 catch(error){return {detail:{...detail,partialEffects:true,verified:false},notice:`GitHub accepted the reviewed update. Its follow-up branch read failed: ${error instanceof Error?error.message:'provider error'}. Refresh to verify the current branch.`};}
 return {detail:{...detail,verified:true},notice:`Synchronized ${destination.repository}:${selectedBranch} to the reviewed commit from ${source.repository}. Refresh to read current provider state.`};
}
