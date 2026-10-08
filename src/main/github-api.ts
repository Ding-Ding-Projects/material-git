import {execFile} from 'node:child_process';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {buildSchema,validate,print,astFromValue,coerceInputValue,getNamedType,isObjectType,isInterfaceType,isCompositeType,Kind,type GraphQLSchema,type GraphQLOutputType,type SelectionNode,type FieldNode} from 'graphql';
import type {ApiCatalogFile,ApiCatalogRequest,ApiCatalogPage,ApiOperation,ApiOperationDescription,ApiRestRequest,ApiResult,ApiSchema,ApiJson,GraphqlRequest,GraphqlSelection,GraphqlBuildResult,GraphqlCatalogRequest,GraphqlCatalogPage,GitHubApiBridge} from '../shared/github-api';

type RunnerResult=string|Buffer|{stdout:string|Buffer;stderr?:string;exitCode?:number};
export interface ApiServiceOptions {
 binary:string; cwd:string; catalogPath?:string; graphqlSchemaPath?:string;
 /** Injectable process boundary, never a shell command string. */
 runGh?:(binary:string,args:string[],cwd:string,input?:string|Buffer)=>Promise<RunnerResult>;
 catalog?:ApiCatalogFile; graphqlSchema?:string;
 exportBinary?:(bytes:Buffer,metadata:{operationId:string;contentType:string;filename?:string})=>Promise<boolean>;
 /** Resolve only a main-process file-picker grant, never an arbitrary renderer path. */
 readBodyFile?:(handle:string)=>Promise<{bytes:Buffer;filename?:string}>;
}
const REQUEST_LIMIT=256_000,RESPONSE_LIMIT=4*1024*1024,REFERENCE_LIMIT=1024*1024;
const plain=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const secretKey=/^(?:authorization|proxy-authorization|cookie|set-cookie|password|passwd|secret|token|access_token|refresh_token|client_secret|private_key|credential)$/i;
export function redactApiSecrets(text:string):string{return text.replace(/(?:gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+)/g,'[REDACTED]').replace(/((?:authorization|proxy-authorization|cookie|set-cookie)\s*:\s*)[^\r\n]+/gi,'$1[REDACTED]').replace(/((?:Bearer|Basic)\s+)[A-Za-z0-9+/_.=-]+/gi,'$1[REDACTED]').replace(/((?:access_token|refresh_token|client_secret|password|token)["']?\s*[=:]\s*)(["'])(?:\\.|(?!\2)[^\\])*?\2/gi,'$1$2[REDACTED]$2').replace(/((?:access_token|refresh_token|client_secret|password|token)["']?\s*[=:]\s*)[^\s,;"'}]+/gi,'$1[REDACTED]');}
function sanitize(value:any,depth=0):any{if(depth>40)return '[DEPTH LIMIT]';if(typeof value==='string')return redactApiSecrets(value);if(Array.isArray(value))return value.map(v=>sanitize(v,depth+1));if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,v])=>[key,secretKey.test(key)?'[REDACTED]':sanitize(v,depth+1)]));return value;}
function bounded(value:unknown):void{let encoded:string;try{encoded=JSON.stringify(value);}catch{throw new Error('Request must contain JSON values');}if(!encoded||Buffer.byteLength(encoded)>REQUEST_LIMIT)throw new Error('API request exceeds 256 KB');}
function record(value:unknown,label:string):Record<string,any>{if(value===undefined)return {};if(!plain(value))throw new Error(`${label} must be an object`);for(const key of Object.keys(value))if(['__proto__','constructor','prototype'].includes(key))throw new Error('Unsafe object key');return value;}
function nativeRunner(binary:string,args:string[],cwd:string,input?:string|Buffer):Promise<RunnerResult>{return new Promise((resolve,reject)=>{
 const child=execFile(binary,args,{cwd,timeout:60000,maxBuffer:RESPONSE_LIMIT+65536,encoding:'buffer',windowsHide:true,shell:false,env:{...process.env,GH_HOST:'github.com',GH_PROMPT_DISABLED:'1',GH_PAGER:'cat',NO_COLOR:'1'}},(error,stdout,stderr)=>{
  if(error&&!stdout.length){reject(new Error(redactApiSecrets(stderr.toString('utf8')).slice(0,1500)||'GitHub API process failed'));return;}
  if(error&&('code' in error)&&typeof error.code!=='number'){reject(new Error('GitHub API response exceeded the limit or the process could not finish'));return;}
  resolve({stdout,stderr:stderr.toString('utf8'),exitCode:error?Number(error.code)||1:0});
 });
 child.stdin?.end(input);
});}
function pagination(request:{page?:number;pageSize?:number}){const page=request.page??1,pageSize=request.pageSize??25;if(!Number.isInteger(page)||page<1||page>100000||!Number.isInteger(pageSize)||pageSize<1||pageSize>100)throw new Error('Invalid catalogue page');return {page,pageSize,start:(page-1)*pageSize};}
function summary({parameters,requestBody,responses,...operation}:ApiOperation){return operation;}
export function createApiService(options:ApiServiceOptions):GitHubApiBridge {
 const catalog=options.catalog??JSON.parse(readFileSync(options.catalogPath??path.join(__dirname,'github-api-catalog.json'),'utf8')) as ApiCatalogFile;
 if(catalog.version!==1||!Array.isArray(catalog.operations))throw new Error('Unsupported GitHub API catalogue');
 const operations=new Map(catalog.operations.map(o=>[o.operationId,o]));
 const types=new Map(catalog.graphql.map(t=>[t.name,t]));
 const schema:GraphQLSchema=buildSchema(options.graphqlSchema??readFileSync(options.graphqlSchemaPath??path.join(__dirname,'github-graphql-schema.graphql'),'utf8'));
 const run=options.runGh??nativeRunner;
 const issuedPages=new Set<string>();
 function operation(id:unknown){if(typeof id!=='string'||!operations.has(id))throw new Error('Unknown official REST operation');return operations.get(id)!;}
 function ref(pointer:string):ApiSchema{if(!pointer.startsWith('#/components/'))throw new Error('External schema references are not supported');let value:any={components:catalog.components};for(const part of pointer.slice(2).split('/')){const key=part.replace(/~1/g,'/').replace(/~0/g,'~');if(['__proto__','constructor','prototype'].includes(key)||!value||!Object.hasOwn(value,key))throw new Error('Unknown schema reference');value=value[key];}return value;}
 function validateValue(value:any,s:ApiSchema,label:string,depth=0):void{
  if(depth>32)throw new Error(`${label} is nested too deeply`);
  if(s.$ref){validateValue(value,ref(s.$ref),label,depth+1);return;}
  if(value===null&&s.nullable===true)return;
  if(s.enum&&!s.enum.some(v=>JSON.stringify(v)===JSON.stringify(value)))throw new Error(`${label} must use a listed value`);
  if(s.const!==undefined&&JSON.stringify(s.const)!==JSON.stringify(value))throw new Error(`${label} must use the schema constant`);
  // Required-only branches are common in official oneOf/anyOf request schemas.
  if(plain(value))for(const key of s.required??[])if(value[key]===undefined)throw new Error(`${label}.${key} is required`);
  for(const sub of s.allOf??[])validateValue(value,sub,label,depth+1);
  for(const kind of ['oneOf','anyOf'] as const)if(s[kind]){let matches=0;for(const sub of s[kind]!){try{validateValue(value,sub,label,depth+1);matches++;}catch{}}if(!matches||(kind==='oneOf'&&matches!==1))throw new Error(`${label} does not match ${kind}`);}
  const type=s.type??(s.properties?'object':s.items?'array':undefined);
  if(type==='object'){
   if(!plain(value))throw new Error(`${label} must be an object`);record(value,label);
   for(const [key,v] of Object.entries(value)){if(s.properties?.[key])validateValue(v,s.properties[key],`${label}.${key}`,depth+1);else if(s.additionalProperties===false)throw new Error(`${label}.${key} is not declared`);else if(plain(s.additionalProperties))validateValue(v,s.additionalProperties,`${label}.${key}`,depth+1);}
  }else if(type==='array'){
   if(!Array.isArray(value))throw new Error(`${label} must be an array`);
   if(typeof s.minItems==='number'&&value.length<s.minItems||typeof s.maxItems==='number'&&value.length>s.maxItems)throw new Error(`${label} has an invalid item count`);
   if(s.uniqueItems===true&&new Set(value.map(v=>JSON.stringify(v))).size!==value.length)throw new Error(`${label} must contain unique items`);
   if(s.items)for(const item of value)validateValue(item,s.items,label+'[]',depth+1);
  }else if(type==='string'){
   if(typeof value!=='string')throw new Error(`${label} must be text`);
   if(typeof s.minLength==='number'&&value.length<s.minLength||typeof s.maxLength==='number'&&value.length>s.maxLength)throw new Error(`${label} has an invalid text length`);
   // Official patterns are metadata, never compiled against untrusted input in the process boundary.
  }else if(type==='integer'||type==='number'){
   if(typeof value!=='number'||!Number.isFinite(value)||(type==='integer'&&!Number.isInteger(value)))throw new Error(`${label} must be ${type}`);
   if(typeof s.minimum==='number'&&value<s.minimum||typeof s.maximum==='number'&&value>s.maximum)throw new Error(`${label} is outside the allowed range`);
  }else if(type==='boolean'&&typeof value!=='boolean')throw new Error(`${label} must be true or false`);
 }
 function describe(operationId:string):ApiOperationDescription{
  const op=operation(operationId),references:Record<string,ApiSchema>={};let bytes=0,truncated=false;
  function visit(value:any,depth=0):void{if(!value||typeof value!=='object'||depth>40)return;if(typeof value.$ref==='string'&&!Object.hasOwn(references,value.$ref)){
   const resolved=ref(value.$ref),size=Buffer.byteLength(JSON.stringify(resolved));if(bytes+size>REFERENCE_LIMIT||Object.keys(references).length>=200){truncated=true;return;}bytes+=size;references[value.$ref]=resolved;visit(resolved,depth+1);
  }for(const item of Object.values(value))visit(item,depth+1);}
  visit(op);return {...op,references,referencesTruncated:truncated};
 }
 function catalogue(request:ApiCatalogRequest={}):ApiCatalogPage{
  record(request,'Catalogue request');if(typeof request.query!=='undefined'&&typeof request.query!=='string')throw new Error('Invalid search');const p=pagination(request),q=(request.query??'').toLowerCase();
  const matching=catalog.operations.filter(o=>(!request.category||o.category===request.category)&&(!q||`${o.operationId} ${o.summary} ${o.path} ${o.method} ${o.category}`.toLowerCase().includes(q)));
  return {operations:matching.slice(p.start,p.start+p.pageSize).map(summary),total:matching.length,page:p.page,pageSize:p.pageSize,categories:[...new Set(catalog.operations.map(o=>o.category))].sort(),sources:catalog.sources,counts:catalog.counts};
 }
 async function response(args:string[],input:string|Buffer|undefined,method:string,endpoint:string,opId:string):Promise<ApiResult>{
  let raw:RunnerResult;try{raw=await run(options.binary,args,options.cwd,input);}catch(error){throw new Error(redactApiSecrets(error instanceof Error?error.message:String(error)).slice(0,1500));}
  const output=typeof raw==='string'||Buffer.isBuffer(raw)?raw:raw.stdout,bytes=Buffer.isBuffer(output)?output:Buffer.from(output);
  if(bytes.length>RESPONSE_LIMIT+65536)throw new Error('API response exceeds the 4 MiB limit');
  let start=0,status=0,headers:Record<string,string>={};
  // gh --include prints HTTP status, response headers, a blank line, then exact body bytes.
  while(bytes.subarray(start,start+5).toString()==='HTTP/'){
   const tail=bytes.subarray(start),text=tail.toString('latin1'),separator=text.match(/\r?\n\r?\n/);if(!separator||separator.index===undefined)throw new Error('Malformed GitHub HTTP response');
   const lines=text.slice(0,separator.index).split(/\r?\n/),match=/^HTTP\/[\d.]+\s+(\d{3})/.exec(lines.shift()??'');if(!match)throw new Error('Missing GitHub HTTP status');status=Number(match[1]);headers={};
   for(const line of lines){const colon=line.indexOf(':');if(colon>0){const key=line.slice(0,colon).toLowerCase();if(!secretKey.test(key))headers[key]=redactApiSecrets(line.slice(colon+1).trim());}}
   start+=separator.index+separator[0].length;if(status>=200)break;
  }
  if(!status){const stderr=typeof raw==='object'&&!Buffer.isBuffer(raw)?raw.stderr??'':'';throw new Error(redactApiSecrets(stderr).slice(0,1500)||'GitHub did not return HTTP response metadata');}
  const body=bytes.subarray(start);if(body.length>RESPONSE_LIMIT)throw new Error('API response exceeds the 4 MiB limit');
  const mime=(headers['content-type']??'').split(';')[0],json=/json/i.test(mime),binary=!!mime&&!json&&!/^text\/|xml|javascript/i.test(mime);
  if(binary&&status>=200&&status<300){if(!options.exportBinary)throw new Error('This endpoint returns a download. Native file export is unavailable');const disposition=headers['content-disposition'],filename=/filename="?([^";]+)"?/.exec(disposition??'')?.[1]?.replace(/[\/\\\x00-\x1f]/g,'_');const exported=await options.exportBinary(body,{operationId:opId,contentType:mime,filename});return {ok:true,status,headers,text:'',truncated:false,method,endpoint,binary:true,exported};}
  const originalText=body.toString('utf8');let text:string,data:ApiJson|undefined;try{data=sanitize(JSON.parse(originalText));text=JSON.stringify(data,null,2);}catch{if(json&&body.length)throw new Error('GitHub returned invalid JSON');text=redactApiSecrets(originalText);}
  const envelope=plain(data)?data as Record<string,ApiJson>:null;
  const graphqlErrors=opId==='graphql'&&!!envelope&&Array.isArray(envelope.errors)&&envelope.errors.length>0;
  const partial=graphqlErrors&&!!envelope&&envelope.data!==undefined&&envelope.data!==null;
  let truncated=false;if(Buffer.byteLength(text)>RESPONSE_LIMIT){text=text.slice(0,RESPONSE_LIMIT/2);data=undefined;truncated=true;}
  let nextPage:string|undefined;const next=/<([^>]+)>\s*;\s*rel="next"/.exec(headers.link??'')?.[1];if(next&&method==='GET'){try{const url=new URL(next,'https://api.github.com'),current=new URL(endpoint,'https://api.github.com');if(url.origin==='https://api.github.com'&&url.pathname===current.pathname&&!url.username&&!url.password){nextPage=url.pathname+url.search;if(issuedPages.size>=200)issuedPages.clear();issuedPages.add(opId+' '+nextPage);}}catch{}}
  return {ok:status>=200&&status<300&&!graphqlErrors,status,headers,...(data!==undefined?{data}:{}),text,truncated,...(graphqlErrors?{partial}:{}),...(nextPage?{nextPage}:{}),method,endpoint};
 }
 async function execute(request:ApiRestRequest):Promise<ApiResult>{
  record(request,'REST request');bounded(request);for(const key of Object.keys(request))if(!['operationId','path','query','headers','body','bodyFile','contentType','confirmed','nextPage'].includes(key))throw new Error(`Unknown REST request field: ${key}`);
  const op=operation(request.operationId);if(op.mutating&&request.confirmed!==true)throw new Error('Review and confirm this REST mutation');
  const pathValues=record(request.path,'Path values'),queryValues=record(request.query,'Query values'),headerValues=record(request.headers,'Headers'),params=op.parameters;
  for(const [location,values] of [['path',pathValues],['query',queryValues]] as const){for(const key of Object.keys(values))if(!params.some(p=>p.in===location&&p.name===key))throw new Error(`Unknown ${location} parameter: ${key}`);}
  for(const p of params){const values=p.in==='path'?pathValues:p.in==='query'?queryValues:p.in==='header'?headerValues:{};if(p.required&&values[p.name]===undefined)throw new Error(`${p.in} parameter ${p.name} is required`);if(values[p.name]!==undefined&&p.schema)validateValue(values[p.name],p.schema,p.name);}
  let endpoint=op.path.replace(/\{([^}]+)\}/g,(_,name:string)=>{const value=pathValues[name];if(typeof value!=='string'&&typeof value!=='number')throw new Error(`Path ${name} needs text or a number`);const text=String(value);if(!text||/[\x00-\x1f\x7f]/.test(text)||text.split('/').some(p=>p==='.'||p==='..')||/%(?:2e|2f|5c)/i.test(text))throw new Error(`Invalid path parameter ${name}`);return encodeURIComponent(text);});
  const query=new URLSearchParams();for(const p of params.filter(p=>p.in==='query')){const value=queryValues[p.name];if(value===undefined)continue;if(Array.isArray(value)){const join=p.style==='spaceDelimited'?' ':p.style==='pipeDelimited'?'|':',';if(p.explode!==false&&(p.style===undefined||p.style==='form'))for(const item of value)query.append(p.name,String(item));else query.set(p.name,value.map(String).join(join));}else if(plain(value)){if(p.style!=='deepObject')throw new Error('This query object serialization is unavailable');for(const [k,v] of Object.entries(value))query.set(`${p.name}[${k}]`,String(v));}else query.set(p.name,String(value));}
  if(query.size)endpoint+='?'+query.toString();
  if(request.nextPage!==undefined){if(op.mutating)throw new Error('Mutation pagination is not allowed');if(typeof request.nextPage!=='string'||!request.nextPage.startsWith('/')||request.nextPage.startsWith('//')||/[\r\n\\#]/.test(request.nextPage))throw new Error('Invalid next page');const next=new URL(request.nextPage,'https://api.github.com'),current=new URL(endpoint,'https://api.github.com');if(next.origin!==current.origin||next.pathname!==current.pathname||!issuedPages.has(op.operationId+' '+request.nextPage))throw new Error('Next page must be a returned link for this operation path');for(const key of next.searchParams.keys())if(!params.some(p=>p.in==='query'&&p.name===key)&&!['page','per_page','since','before','after'].includes(key))throw new Error('Unknown pagination parameter');endpoint=next.pathname+next.search;}
  const args=['api','--hostname','github.com','--method',op.method,'--include'];
  for(const [key,value] of Object.entries(headerValues)){if(typeof value!=='string'||/[\r\n\x00]/.test(value)||! /^[A-Za-z0-9-]+$/.test(key)||/^(?:authorization|proxy-authorization|cookie|host|content-length|content-type|connection|x-forwarded-)/i.test(key))throw new Error('Disallowed API header');if(!['accept','x-github-api-version'].includes(key.toLowerCase())&&!params.some(p=>p.in==='header'&&p.name.toLowerCase()===key.toLowerCase()))throw new Error('Header is not declared for this operation');args.push('--header',`${key}: ${value}`);}
  if(!Object.keys(headerValues).some(k=>k.toLowerCase()==='accept'))args.push('--header','Accept: application/vnd.github+json');
  let input:string|Buffer|undefined;const content=op.requestBody?.content??{},mime=request.contentType??(content['application/json']?'application/json':Object.keys(content)[0]);
  if(request.bodyFile!==undefined){if(request.body!==undefined)throw new Error('Choose either structured body data or a native body file');if(typeof request.bodyFile!=='string'||!request.bodyFile||request.bodyFile.length>256||!options.readBodyFile)throw new Error('Choose an approved native file first');if(!mime||!Object.hasOwn(content,mime)||mime!=='application/octet-stream')throw new Error('This operation does not accept a binary body file');const file=await options.readBodyFile(request.bodyFile);if(!Buffer.isBuffer(file.bytes)||file.bytes.length>64*1024*1024)throw new Error('Native upload exceeds the 64 MiB limit');input=file.bytes;}
  else if(request.body!==undefined){if(!mime||!Object.hasOwn(content,mime))throw new Error('Body content type is not declared');if(content[mime].schema)validateValue(request.body,content[mime].schema,'body');if(/json/i.test(mime))input=JSON.stringify(request.body);else if(/^text\//.test(mime)&&typeof request.body==='string')input=request.body;else throw new Error('Choose a native file for this request media type');}else if(op.requestBody?.required)throw new Error('A request body is required');
  if(input!==undefined)args.push('--header',`Content-Type: ${mime}`,'--input','-');
  if(op.server&&op.server!=='api.github.com'){if(op.server!=='uploads.github.com'||op.operationId!=='repos/upload-release-asset')throw new Error('Unreviewed API server');endpoint='https://uploads.github.com'+endpoint;}
  args.push(endpoint);return response(args,input,op.method,endpoint,op.operationId);
 }
 function graphqlCatalogue(request:GraphqlCatalogRequest={}):GraphqlCatalogPage{record(request,'GraphQL catalogue request');const p=pagination(request);if(request.query!==undefined&&typeof request.query!=='string')throw new Error('Invalid GraphQL search');const q=(request.query??'').toLowerCase(),matching=catalog.graphql.filter(t=>(!request.kind||t.kind===request.kind)&&(!q||`${t.name} ${t.description}`.toLowerCase().includes(q)));return {types:matching.slice(p.start,p.start+p.pageSize),total:matching.length,page:p.page,pageSize:p.pageSize,queryType:schema.getQueryType()!.name,mutationType:schema.getMutationType()?.name??null,sources:catalog.sources,counts:catalog.counts};}
 function graphqlDescribe(name:string){const found=types.get(name);if(!found)throw new Error('Unknown GraphQL type');return found;}
 function graphqlBuild(request:GraphqlRequest):GraphqlBuildResult{
  record(request,'GraphQL request');bounded(request);if(!['query','mutation'].includes(request.operation))throw new Error('Unknown GraphQL operation');for(const key of Object.keys(request))if(!['operation','name','selections','confirmed'].includes(key))throw new Error('Unknown GraphQL request field');if(request.name!==undefined&&!/^[_A-Za-z][_0-9A-Za-z]{0,99}$/.test(request.name))throw new Error('Invalid GraphQL operation name');
  const root=request.operation==='query'?schema.getQueryType():schema.getMutationType();if(!root)throw new Error('GraphQL operation is unavailable');let fieldCount=0;
  function selections(items:GraphqlSelection[],parent:GraphQLOutputType,depth=0):SelectionNode[]{if(depth>16||!Array.isArray(items)||!items.length||items.length>100)throw new Error('GraphQL selections exceed the limits');return items.map(item=>{
   record(item,'GraphQL selection');for(const key of Object.keys(item))if(!['field','alias','args','selections','onType'].includes(key))throw new Error('Unknown GraphQL selection field');if(++fieldCount>500)throw new Error('Select at most 500 GraphQL fields');
   if(item.onType){if(item.field||item.alias||item.args)throw new Error('Fragments only accept a type and selections');const type=schema.getType(item.onType);if(!type||!isCompositeType(type))throw new Error('Unknown GraphQL fragment type');return {kind:Kind.INLINE_FRAGMENT,typeCondition:{kind:Kind.NAMED_TYPE,name:{kind:Kind.NAME,value:item.onType}},selectionSet:{kind:Kind.SELECTION_SET,selections:selections(item.selections!,type,depth+1)}};}
   if(typeof item.field!=='string'||!/^[_A-Za-z][_0-9A-Za-z]*$/.test(item.field)||item.alias&&!/^[_A-Za-z][_0-9A-Za-z]{0,99}$/.test(item.alias))throw new Error('Invalid GraphQL field name');
   const type=getNamedType(parent),field=(isObjectType(type)||isInterfaceType(type))?type.getFields()[item.field]:undefined;
   if(!field&&item.field!=='__typename')throw new Error(`Unknown field ${type.name}.${item.field}`);if(!field&&item.selections)throw new Error('__typename does not have child selections');
   const args=record(item.args,'GraphQL arguments');const astArgs=Object.entries(args).map(([name,value])=>{const definition=field?.args.find(a=>a.name===name);if(!definition)throw new Error(`Unknown GraphQL argument ${name}`);let failed=false;coerceInputValue(value,definition.type,()=>{failed=true;});if(failed)throw new Error(`Invalid value for GraphQL argument ${name}`);const ast=astFromValue(value,definition.type);if(!ast)throw new Error(`Invalid GraphQL argument ${name}`);return {kind:Kind.ARGUMENT as const,name:{kind:Kind.NAME as const,value:name},value:ast};});
   const node:FieldNode={kind:Kind.FIELD,name:{kind:Kind.NAME,value:item.field},...(item.alias?{alias:{kind:Kind.NAME,value:item.alias}}:{}),arguments:astArgs,...(item.selections?{selectionSet:{kind:Kind.SELECTION_SET,selections:selections(item.selections,field!.type,depth+1)}}:{})};return node;
  });}
  const document={kind:Kind.DOCUMENT as const,definitions:[{kind:Kind.OPERATION_DEFINITION as const,operation:request.operation as any,...(request.name?{name:{kind:Kind.NAME as const,value:request.name}}:{}),selectionSet:{kind:Kind.SELECTION_SET as const,selections:selections(request.selections,root)}}]};
  const errors=validate(schema,document);if(errors.length)throw new Error(errors.slice(0,5).map(e=>e.message).join('; '));return {document:print(document),operation:request.operation,mutating:request.operation==='mutation'};
 }
 async function graphqlExecute(request:GraphqlRequest):Promise<ApiResult>{const built=graphqlBuild(request);if(built.mutating&&request.confirmed!==true)throw new Error('Review and confirm this GraphQL mutation');return response(['api','--hostname','github.com','--method','POST','--include','--header','Accept: application/vnd.github+json','--header','Content-Type: application/json','--input','-','graphql'],JSON.stringify({query:built.document}),'POST','/graphql','graphql');}
 return {catalogue,describe,execute,graphqlCatalogue,graphqlDescribe,graphqlBuild,graphqlExecute};
}
