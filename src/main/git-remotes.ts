import type {GitRow} from '../shared/git';
export function remoteReferenceQuery(fields:Record<string,unknown>){
 for(const key of Object.keys(fields))if(!['remote','scope','prefix','trust'].includes(key))throw new Error(`Unknown remote reference field: ${key}`);
 if(typeof fields.remote!=='string'||!fields.remote||fields.remote.length>255||! /^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(fields.remote))throw new Error('Choose a configured remote');
 const scope=fields.scope??'all';if(!['all','branches','tags'].includes(String(scope)))throw new Error('Choose all references, branches or tags');
 const prefix=fields.prefix??'';if(typeof prefix!=='string'||prefix.length>255||prefix.startsWith('-')||/[\x00-\x20\x7f\\:*?\[\]{}]/.test(prefix)||prefix.includes('..')||prefix.includes('//'))throw new Error('Choose a safe reference-name prefix');
 if(fields.trust!==undefined&&typeof fields.trust!=='boolean')throw new Error('Repository program trust must be a Boolean');
 return {remote:fields.remote,scope,prefix,trust:fields.trust===true,argv:['ls-remote','--symref',...(scope==='branches'?['--heads']:scope==='tags'?['--tags']:[]),'--',fields.remote,...(prefix?[`${scope==='branches'?'refs/heads/':scope==='tags'?'refs/tags/':''}${prefix}*`]:[])]};
}
export function parseRemoteReferences(output:string):GitRow[]{
 const references=new Map<string,GitRow>(),symbolic=new Map<string,string>();
 for(const line of output.split('\n')){
  const [value,reference]=line.replace(/\r$/,'').split('\t');if(!reference)continue;
  if(value.startsWith('ref: ')){symbolic.set(reference,value.slice(5));continue;}
  if(!/^[a-f0-9]{40,64}$/i.test(value)||reference.endsWith('^{}'))continue;
  references.set(reference,{id:reference,label:reference,detail:value,data:{object:value,remoteReference:reference}});
 }
 for(const [reference,target] of symbolic){const row=references.get(reference);if(row)row.data={...row.data,symbolic:target};}
 return [...references.values()];
}
