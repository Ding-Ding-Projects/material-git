import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parse,validate,buildSchema} from 'graphql';
import {createApiService,redactApiSecrets} from '../src/main/github-api';
import type {ApiCatalogFile,ApiOperation} from '../src/shared/github-api';

const graphql=`enum State { OPEN CLOSED } input Change { title: String! } type Item { id: ID!, title: String! } type Query { item(id: ID!, state: State): Item! } type Mutation { change(input: Change!): Item! }`;
const base={category:'items',description:'',summary:'Items',deprecated:false,binary:false,responses:{'200':{description:'OK'}},parameters:[{name:'owner',in:'path' as const,required:true,schema:{type:'string'}},{name:'id',in:'path' as const,required:true,schema:{type:'integer'}},{name:'page',in:'query' as const,schema:{type:'integer',minimum:1}},{name:'state',in:'query' as const,schema:{type:'string',enum:['open','closed']}}]};
const ops:ApiOperation[]=[{...base,operationId:'items/get',method:'GET',path:'/items/{owner}/{id}',mutating:false},{...base,operationId:'items/update',method:'PATCH',path:'/items/{owner}/{id}',mutating:true,requestBody:{required:true,content:{'application/json':{schema:{$ref:'#/components/schemas/Change'}}}}}];
const source={url:'https://example.test/schema',commit:'a'.repeat(40),sha256:'b'.repeat(64),license:'MIT'};
const catalog:ApiCatalogFile={version:1,sources:{rest:source,graphql:source},restVersion:'1',operations:ops,components:{schemas:{Change:{type:'object',required:['title'],additionalProperties:false,properties:{title:{type:'string',minLength:1},labels:{type:'array',items:{type:'string'}}}}}},graphql:[{name:'Query',kind:'OBJECT',description:'',fields:[]}],counts:{restOperations:2,restPaths:1,restCategories:1,graphqlTypes:1,graphqlFields:1,graphqlQueryFields:1,graphqlMutationFields:1}};
const http=(body:unknown,status=200,headers:Record<string,string>={})=>Buffer.from(`HTTP/2.0 ${status} OK\r\nContent-Type: application/json\r\n${Object.entries(headers).map(([k,v])=>`${k}: ${v}\r\n`).join('')}\r\n${JSON.stringify(body)}`);
const request={operationId:'items/get',path:{owner:'someone',id:3}};
function service(runner:any=async()=>http({ok:true}),extra:any={}){return createApiService({binary:'/test/gh',cwd:'/test',catalog,graphqlSchema:graphql,runGh:runner,...extra});}

test('REST execution uses fixed host, structured argv and typed query serialization',async()=>{
 const calls:any[]=[];const api=service(async(...args:any[])=>{calls.push(args);return http({items:[]});});
 const result=await api.execute({...request,path:{owner:'space owner',id:3},query:{state:'closed',page:2}});
 assert.equal(result.status,200);assert.equal(result.ok,true);assert.deepEqual(result.data,{items:[]});
 assert.deepEqual(calls[0].slice(0,3),['/test/gh',['api','--hostname','github.com','--method','GET','--include','--header','Accept: application/vnd.github+json','/items/space%20owner/3?page=2&state=closed'],'/test']);
});
test('REST schema and host boundaries reject malformed inputs before launching',async()=>{
 let calls=0;const api=service(async()=>{calls++;return http({});});
 for(const bad of [{...request,path:{owner:'..',id:3}},{...request,path:{owner:'%2f',id:3}},{...request,path:{owner:'o',id:'3'}},{...request,path:{owner:'o'}},{...request,query:{state:'unknown'}},{...request,query:{page:0}},{...request,query:{command:'whoami'}},{...request,headers:{Authorization:'Bearer forbidden'}},{...request,headers:{Host:'elsewhere.test'}},{...request,headers:{Accept:'abc\r\nAuthorization:x'}},{...request,url:'https://elsewhere.test'}])await assert.rejects(()=>api.execute(bad as any));
 assert.equal(calls,0);
});
test('REST mutations require main-process review and validate nested body schemas',async()=>{
 const calls:any[]=[];const api=service(async(...args:any[])=>{calls.push(args);return {stdout:http({message:'invalid'},422),stderr:'validation failed',exitCode:1};});
 const change={...request,operationId:'items/update',body:{title:'Updated',labels:['one']}};
 await assert.rejects(()=>api.execute(change),/confirm/);await assert.rejects(()=>api.execute({...change,confirmed:true,body:{labels:['a']}}),/title/);
 await assert.rejects(()=>api.execute({...change,confirmed:true,body:{title:'x',labels:[1]}}),/text/);
 const result=await api.execute({...change,confirmed:true});assert.equal(result.status,422);assert.equal(result.ok,false);assert.equal(calls[0][3],JSON.stringify(change.body));assert.ok(calls[0][1].includes('--input'));
 const desc=api.describe('items/update');assert.equal(desc.references['#/components/schemas/Change'].type,'object');
});
test('pagination accepts only issued links to the same REST path and never paginates a mutation',async()=>{
 let calls=0;const api=service(async()=>{calls++;return http([] ,200,{Link:'<https://api.github.com/items/someone/3?page=2>; rel="next"'});});
 await assert.rejects(()=>api.execute({...request,nextPage:'/items/someone/3?page=2'}),/returned link/);
 const first=await api.execute(request);assert.equal(first.nextPage,'/items/someone/3?page=2');await api.execute({...request,nextPage:first.nextPage});assert.equal(calls,2);
 await assert.rejects(()=>api.execute({...request,nextPage:'https://api.github.com/items/someone/3?page=2'}));
 const foreign=service(async()=>http([],200,{Link:'<https://api.github.com/user?page=2>; rel="next"'}));assert.equal((await foreign.execute(request)).nextPage,undefined);
 await assert.rejects(()=>api.execute({...request,operationId:'items/update',confirmed:true,body:{title:'x'},nextPage:first.nextPage}),/Mutation pagination/);
});
test('binary responses export actual native bytes without pretending to be JSON',async()=>{
 const bytes=Buffer.from([0,255,128,13,10,0]),raw=Buffer.concat([Buffer.from('HTTP/2.0 200 OK\r\nContent-Type: application/octet-stream\r\nContent-Disposition: attachment; filename="artifact.zip"\r\n\r\n'),bytes]);let exported:Buffer|undefined;
 const api=service(async()=>raw,{exportBinary:async(data:Buffer,metadata:any)=>{exported=data;assert.equal(metadata.filename,'artifact.zip');return true;}});
 const result=await api.execute(request);assert.deepEqual(exported,bytes);assert.equal(result.binary,true);assert.equal(result.exported,true);assert.equal(result.data,undefined);assert.equal(result.text,'');
 await assert.rejects(()=>service(async()=>raw).execute(request),/Native file export/);
});
test('result and error redaction remove credential values and response cookies',async()=>{
 const api=service(async()=>http({access_token:'literal-secret',nested:{password:'secret',message:'ghp_abcdefghijklmnop'}},200,{'Set-Cookie':'credential=abc',Authorization:'Bearer abc'}));
 const result=await api.execute(request);assert.equal(result.headers['set-cookie'],undefined);assert.equal(result.headers.authorization,undefined);assert.ok(!JSON.stringify(result).includes('literal-secret'));assert.ok(!JSON.stringify(result).includes('ghp_abcdefghijklmnop'));
 await assert.rejects(()=>service(async()=>{throw new Error('Bearer abc123 ghp_secretsecret');}).execute(request),e=>!String(e).includes('abc123')&&!String(e).includes('ghp_secretsecret'));
 await assert.rejects(()=>service(async()=>'not HTTP').execute(request),/metadata/);
 const ordinary=await service(async()=>http({body:'Set token="example" in config',token:null})).execute(request);assert.equal(ordinary.status,200);assert.ok(ordinary.data);assert.equal((ordinary.data as any).token,'[REDACTED]');
 assert.ok(!redactApiSecrets('Authorization: token legacy-secret\n{"password":"secret with spaces"}').includes('legacy-secret'));assert.ok(!redactApiSecrets('{"password":"secret with spaces"}').includes('with spaces'));
});
test('native uploads use only picker-granted bytes and the pinned official upload server',async()=>{
 const official=JSON.parse(readFileSync('data/github-api-catalog.json','utf8')) as ApiCatalogFile;const calls:any[]=[];const bytes=Buffer.from([0,255,128]);let grants=0;
 const api=createApiService({binary:'/test/gh',cwd:'/test',catalog:official,graphqlSchema:graphql,readBodyFile:async(handle)=>{assert.equal(handle,'approved-handle');grants++;return {bytes};},runGh:async(...args)=>{calls.push(args);return http({id:1},201);}});
 const upload={operationId:'repos/upload-release-asset',path:{owner:'o',repo:'r',release_id:1},query:{name:'artifact.bin'},bodyFile:'approved-handle',contentType:'application/octet-stream'};
 await assert.rejects(()=>api.execute(upload),/confirm/);assert.equal(grants,0);
 const result=await api.execute({...upload,confirmed:true});assert.equal(result.status,201);assert.equal(calls[0][1].at(-1),'https://uploads.github.com/repos/o/r/releases/1/assets?name=artifact.bin');assert.deepEqual(calls[0][3],bytes);
 await assert.rejects(()=>service().execute({...request,bodyFile:'/etc/passwd'}),/approved native file/);
 await assert.rejects(()=>api.execute({...upload,confirmed:true,body:'also data'}),/either/);
});
test('GraphQL builder validates enum/input values and produces escaped literal AST selections',async()=>{
 const api=service();const built=api.graphqlBuild({operation:'query',name:'ReadItem',selections:[{field:'item',args:{id:'a" ) { change }',state:'OPEN'},selections:[{field:'id'},{field:'title'}]}]});
 assert.equal(validate(buildSchema(graphql),parse(built.document)).length,0);assert.equal(built.mutating,false);
 assert.throws(()=>api.graphqlBuild({operation:'query',selections:[{field:'item',args:{id:'a',state:'INVALID'},selections:[{field:'id'}]}]}),/Invalid value/);
 assert.throws(()=>api.graphqlBuild({operation:'query',selections:[{field:'item',selections:[{field:'id'}]}]}),/required/);
 assert.throws(()=>api.graphqlBuild({operation:'query',selections:[{field:'item',args:{id:'a'}}]}),/selection/);
 assert.throws(()=>api.graphqlBuild({operation:'query',selections:[{field:'__schema'}]}),/Unknown field/);
 assert.throws(()=>api.graphqlBuild({operation:'mutation',selections:[{field:'change',args:{input:{unexpected:'x'}},selections:[{field:'id'}]}]}),/Invalid value/);
});
test('GraphQL execution enforces mutation confirmation and sends only schema-validated document',async()=>{
 const calls:any[]=[];const api=service(async(...args:any[])=>{calls.push(args);return http({data:{change:{id:'1'}}});});const change={operation:'mutation' as const,selections:[{field:'change',args:{input:{title:'x'}},selections:[{field:'id'}]}]};
 await assert.rejects(()=>api.graphqlExecute(change),/confirm/);assert.equal(calls.length,0);
 await api.graphqlExecute({...change,confirmed:true});assert.equal(calls[0][1].at(-1),'graphql');assert.equal(validate(buildSchema(graphql),parse(JSON.parse(calls[0][3]).query)).length,0);
});
test('GraphQL HTTP 200 errors report failure and retain error-only or partial response data',async()=>{
 const query={operation:'query' as const,selections:[{field:'item',args:{id:'1'},selections:[{field:'id'}]}]};
 const errors=[{message:'Access denied',path:['item'],extensions:{token:'sensitive-token',code:'FORBIDDEN'}}];
 const failure=await service(async()=>({stdout:http({errors},200),stderr:'GraphQL: Access denied',exitCode:1})).graphqlExecute(query);
 assert.equal(failure.status,200);assert.equal(failure.ok,false);assert.equal(failure.partial,false);assert.deepEqual((failure.data as any).errors[0].path,['item']);assert.equal((failure.data as any).errors[0].extensions.token,'[REDACTED]');
 const result=await service(async()=>http({data:{item:{id:'1',title:null}},errors},200)).graphqlExecute(query);
 assert.equal(result.status,200);assert.equal(result.ok,false);assert.equal(result.partial,true);assert.equal((result.data as any).data.item.id,'1');assert.equal((result.data as any).errors[0].message,'Access denied');
 const empty=await service(async()=>http({data:null,errors},200)).graphqlExecute(query);assert.equal(empty.partial,false);assert.equal(empty.ok,false);
 const success=await service(async()=>http({data:{item:{id:'1'}},errors:[]},200)).graphqlExecute(query);assert.equal(success.ok,true);assert.equal(success.partial,undefined);
 // REST response envelopes are not interpreted as GraphQL responses.
 const rest=await service(async()=>http({errors},200)).execute(request);assert.equal(rest.ok,true);assert.equal(rest.partial,undefined);
});
test('official required-only REST union branches accept one valid alternative and reject absent or conflicting identifiers',async()=>{
 const official=JSON.parse(readFileSync('data/github-api-catalog.json','utf8')) as ApiCatalogFile;let calls=0;const api=createApiService({binary:'/test/gh',cwd:'/test',catalog:official,graphqlSchema:graphql,runGh:async()=>{calls++;return http({id:1},201);}});
 const add={operationId:'projects/add-item-for-org',path:{org:'example',project_number:1},confirmed:true};
 await api.execute({...add,body:{type:'Issue',id:3}});await api.execute({...add,body:{type:'Issue',owner:'example',repo:'repo',number:2}});
 await assert.rejects(()=>api.execute({...add,body:{type:'Issue'}}),/oneOf/);await assert.rejects(()=>api.execute({...add,body:{type:'Issue',id:3,owner:'example',repo:'repo',number:2}}),/oneOf/);
 await assert.rejects(()=>api.execute({...add,body:{type:'Issue',id:3,unexpected:true}}),/not declared/);
 const review={operationId:'pulls/request-reviewers',path:{owner:'example',repo:'repo',pull_number:1},confirmed:true};
 await api.execute({...review,body:{reviewers:['reviewer']}});await api.execute({...review,body:{reviewers:[],team_reviewers:['team']}});await assert.rejects(()=>api.execute({...review,body:{}}),/anyOf/);
 assert.equal(calls,4);
 // GitHub explicitly permits null to clear this enum override despite its non-null enum list.
 await api.execute({operationId:'secret-scanning/update-alert',path:{owner:'example',repo:'repo',alert_number:1},body:{validity:null},confirmed:true});
});
test('pinned official catalogue and GraphQL source are internally consistent and support real schema validation',()=>{
 const official=JSON.parse(readFileSync('data/github-api-catalog.json','utf8')) as ApiCatalogFile,sdl=readFileSync('data/github-graphql-schema.graphql','utf8');assert.equal(createHash('sha256').update(sdl).digest('hex'),official.sources.graphql.sha256);
 assert.equal(official.operations.length,1232);assert.equal(new Set(official.operations.map(o=>o.operationId)).size,1232);assert.equal(official.graphql.length,1829);
 const api=createApiService({binary:'/test/gh',cwd:'/test',catalog:official,graphqlSchema:sdl,runGh:async()=>{throw new Error('No network calls in schema validation');}});
 const page=api.catalogue({category:'repos',pageSize:10});assert.ok(page.total>10);assert.equal(page.operations.length,10);assert.equal('parameters' in page.operations[0],false);
 const repo=api.describe('repos/get');assert.ok(repo.parameters.some(p=>p.name==='owner'&&p.required));assert.ok(Object.keys(repo.references).length);
 const built=api.graphqlBuild({operation:'query',selections:[{field:'repository',args:{owner:'octocat',name:'Hello-World'},selections:[{field:'nameWithOwner'},{field:'issues',args:{first:5},selections:[{field:'nodes',selections:[{field:'title'}]},{field:'pageInfo',selections:[{field:'hasNextPage'},{field:'endCursor'}]}]}]}]});assert.ok(built.document.includes('repository'));
 assert.equal(api.graphqlDescribe('Repository').kind,'OBJECT');assert.equal(api.graphqlCatalogue({kind:'ENUM',pageSize:2}).types.length,2);
});

test('Approved hosts keep REST, GraphQL, uploads and pagination scoped to the registration',async()=>{
 const calls:any[]=[];const host={hostname:'enterprise.example',restOrigin:'https://enterprise.example/api/v3',graphqlEndpoint:'https://enterprise.example/api/graphql',uploadsOrigin:'https://enterprise.example/api/uploads'};
 const api=service(async(...args:any[])=>{calls.push(args);return http([],200,{Link:'<https://enterprise.example/api/v3/items/someone/3?page=2>; rel="next"'});},{resolveHost:(hostname:string)=>{if(hostname!=='enterprise.example')throw new Error('Host is not approved');return host;}});
 const first=await api.execute({...request,hostname:host.hostname});assert.equal(calls[0][1].at(-1),'https://enterprise.example/api/v3/items/someone/3');
 await api.execute({...request,hostname:host.hostname,nextPage:first.nextPage});assert.equal(calls[1][1].at(-1),'https://enterprise.example/api/v3/items/someone/3?page=2');
 await api.graphqlExecute({hostname:host.hostname,operation:'query',selections:[{field:'item',args:{id:'1'},selections:[{field:'id'}]}]});assert.equal(calls[2][1].at(-1),host.graphqlEndpoint);
 await assert.rejects(()=>api.execute({...request,hostname:'unapproved.example'}),/approved/);await assert.rejects(()=>service().execute({...request,hostname:host.hostname}),/approved/);
 await assert.rejects(()=>service(undefined,{resolveHost:()=>({...host,restOrigin:'https://foreign.example/api/v3'})}).execute({...request,hostname:host.hostname}),/origin/);
 const foreign=service(async()=>http([],200,{Link:'<https://foreign.example/api/v3/items/someone/3?page=2>; rel="next"'}),{resolveHost:()=>host});assert.equal((await foreign.execute({...request,hostname:host.hostname})).nextPage,undefined);
});
test('Read caching is enumerated and never applied to mutation requests',async()=>{
 const calls:any[]=[];const api=service(async(...args:any[])=>{calls.push(args);return http({});});await api.execute({...request,cacheSeconds:300});assert.ok(calls[0][1].includes('300s'));
 for(const cacheSeconds of [-1,10,Infinity])await assert.rejects(()=>api.execute({...request,cacheSeconds}),/duration/);
 await assert.rejects(()=>api.execute({...request,operationId:'items/update',body:{title:'x'},confirmed:true,cacheSeconds:60}),/read-only/);assert.equal(calls.length,1);
});
test('Pinned media inventory supports every declared request type and renders declared textual response variants',async()=>{
 const official=JSON.parse(readFileSync('data/github-api-catalog.json','utf8')) as ApiCatalogFile;
 assert.deepEqual([...new Set(official.operations.flatMap(op=>Object.keys(op.requestBody?.content||{})))].sort(),['application/json','application/octet-stream','text/plain','text/x-markdown']);
 const calls:any[]=[];let responseBody='';let responseMime='text/html';const api=createApiService({binary:'/test/gh',cwd:'/test',catalog:official,graphqlSchema:graphql,runGh:async(...args)=>{calls.push(args);return Buffer.from(`HTTP/2.0 200 OK\r\nContent-Type: ${responseMime}\r\n\r\n${responseBody}`);}});
 for(const contentType of ['text/plain','text/x-markdown']){responseBody='<p>hello</p>';const result=await api.execute({operationId:'markdown/render-raw',contentType,body:'# hello',confirmed:true});assert.equal(calls.at(-1)[3],'# hello');assert.equal(result.text,responseBody);assert.equal(result.binary,undefined);}
 for(const [operationId,path,mime,body] of [['meta/get-octocat',{},'application/octocat-stream','octocat'],['repos/get-commit',{owner:'o',repo:'r',ref:'main'},'application/vnd.github.diff','diff --git a/a b/a'],['repos/get-content',{owner:'o',repo:'r',path:'file'},'application/vnd.github.object','{"name":"file"}']] as const){responseMime=mime;responseBody=body;const result=await api.execute({operationId,path,headers:{Accept:mime}});assert.equal(result.binary,undefined);if(mime==='application/vnd.github.object')assert.deepEqual(result.data,{name:'file'});else assert.equal(result.text,body);}
});
