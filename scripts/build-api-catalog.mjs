import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {buildSchema,isObjectType,isInterfaceType,isInputObjectType,isEnumType,isUnionType,isScalarType} from 'graphql';

const root=fileURLToPath(new URL('..',import.meta.url));
const sources={
 rest:{commit:'2eba8c3ba02f022011539cf01efc43e0251502f8',url:'https://raw.githubusercontent.com/github/rest-api-description/2eba8c3ba02f022011539cf01efc43e0251502f8/descriptions/api.github.com/api.github.com.json',sha256:'ba5ddc1eeeede9f3858abd96325359891f38a2bd8e20fd111abf4230741db194',license:'MIT'},
 graphql:{commit:'7b807926df3ccb7f3d1bcd4ad1c652fb42b0931d',url:'https://raw.githubusercontent.com/github/docs/7b807926df3ccb7f3d1bcd4ad1c652fb42b0931d/src/graphql/data/fpt/schema.docs.graphql',sha256:'4b11889444f390414dbce052da9f09771e0eb155c1981e2d22c012d73cdfe768',license:'CC-BY-4.0 (documentation), MIT (code)'},
};
function download(source){
 const bytes=execFileSync('curl',['--fail','--silent','--show-error','--location','--max-time','90',source.url],{maxBuffer:24*1024*1024});
 if(createHash('sha256').update(bytes).digest('hex')!==source.sha256)throw new Error(`Pinned source digest mismatch: ${source.url}`);
 return bytes.toString('utf8');
}
const rest=JSON.parse(download(sources.rest));
const sdl=download(sources.graphql),schema=buildSchema(sdl);
// Remove vendor extensions; preserve the official JSON Schema keywords and local references.
function clean(value){if(Array.isArray(value))return value.map(clean);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!key.startsWith('x-')).map(([key,item])=>[key,clean(item)]));return value;}
function resolve(value){if(!value?.$ref)return value;return value.$ref.split('/').slice(1).reduce((v,k)=>v?.[k.replace(/~1/g,'/').replace(/~0/g,'~')],rest);}
const operations=[];
for(const [path,item] of Object.entries(rest.paths))for(const method of ['get','post','put','patch','delete','head','options']){
 const op=item[method];if(!op)continue;
 const responses=Object.fromEntries(Object.entries(op.responses??{}).map(([code,response])=>[code,clean(resolve(response))]));
 const binary=Object.values(responses).some(r=>Object.entries(r.content??{}).some(([mime,c])=>!/(?:json|text\/|xml|javascript)/i.test(mime)||c.schema?.format==='binary'));
 const server=new URL(op.servers?.[0]?.url??rest.servers[0].url).hostname;
 if(!['api.github.com','uploads.github.com'].includes(server))throw new Error('Unreviewed official operation server');
 operations.push({operationId:op.operationId,method:method.toUpperCase(),path,server,category:op.tags?.[0]??'other',summary:op.summary??op.operationId,description:op.description??'',documentationUrl:op.externalDocs?.url,deprecated:!!op.deprecated,mutating:!['get','head','options'].includes(method),binary,parameters:[...(item.parameters??[]),...(op.parameters??[])].map(p=>clean(resolve(p))),...(op.requestBody?{requestBody:clean(resolve(op.requestBody))}:{}),responses});
}
operations.sort((a,b)=>a.operationId.localeCompare(b.operationId));
if(new Set(operations.map(o=>o.operationId)).size!==operations.length)throw new Error('Duplicate official operation IDs');
const argument=a=>({name:a.name,type:String(a.type),description:a.description??'',...(a.defaultValue!==undefined?{defaultValue:a.defaultValue}:{})});
const graphql=Object.values(schema.getTypeMap()).filter(t=>!t.name.startsWith('__')).map(t=>{
 const kind=isObjectType(t)?'OBJECT':isInterfaceType(t)?'INTERFACE':isInputObjectType(t)?'INPUT_OBJECT':isEnumType(t)?'ENUM':isUnionType(t)?'UNION':'SCALAR';
 return {name:t.name,kind,description:t.description??'',...((isObjectType(t)||isInterfaceType(t))?{fields:Object.values(t.getFields()).map(f=>({...argument(f),args:f.args.map(argument),deprecated:!!f.deprecationReason,...(f.deprecationReason?{deprecationReason:f.deprecationReason}:{})}))}:{}),...(isInputObjectType(t)?{inputFields:Object.values(t.getFields()).map(argument)}:{}),...(isEnumType(t)?{enumValues:t.getValues().map(v=>({name:v.name,description:v.description??'',deprecated:!!v.deprecationReason}))}:{}),...((isInterfaceType(t)||isUnionType(t))?{possibleTypes:schema.getPossibleTypes(t).map(v=>v.name)}:{})};
}).sort((a,b)=>a.name.localeCompare(b.name));
const counts={restOperations:operations.length,restPaths:Object.keys(rest.paths).length,restCategories:new Set(operations.map(o=>o.category)).size,graphqlTypes:graphql.length,graphqlFields:graphql.reduce((n,t)=>n+(t.fields?.length??0)+(t.inputFields?.length??0),0),graphqlQueryFields:Object.keys(schema.getQueryType().getFields()).length,graphqlMutationFields:Object.keys(schema.getMutationType()?.getFields()??{}).length};
const catalog={version:1,sources,restVersion:rest.info.version,operations,components:clean(rest.components),graphql,counts};
const files={'data/github-api-catalog.json':JSON.stringify(catalog)+'\n','data/github-graphql-schema.graphql':sdl};
mkdirSync(root+'/data',{recursive:true});
for(const [file,text] of Object.entries(files)){if(process.argv.includes('--check')){if(readFileSync(root+'/'+file,'utf8')!==text)throw new Error(`Generated schema is stale: ${file}`);}else writeFileSync(root+'/'+file,text);}
console.log(JSON.stringify({...counts,catalogBytes:Buffer.byteLength(files['data/github-api-catalog.json']),graphqlBytes:Buffer.byteLength(sdl)}));
