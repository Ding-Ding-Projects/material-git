import type { Choice } from '../shared/types';
export type ChoiceRunner = (binary: string, args: string[], cwd: string) => Promise<string>;
export interface ChoiceContext { repository?: string; query?: string; page?: number; owner?: string; valueField?: 'title' | 'number' | 'id' | 'slug' }
export interface ChoiceResult { items: Choice[]; hasNext: boolean; searchMode: 'remote' | 'page-filter'; notice?: string }
const SIZE=30;
const LOGIN=/^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/;
const aliases:Record<string,string>={repos:'repository',repo:'repository',repositories:'repository',branches:'branch',issues:'issue',prs:'pull-request',pr:'pull-request','pull-requests':'pull-request',labels:'label',releases:'release',tags:'tag',workflows:'workflow',runs:'run',secrets:'secret',variables:'variable',users:'user',assignee:'user',reviewer:'user',org:'organization',orgs:'organization',organizations:'organization',owners:'owner',codespaces:'codespace',milestones:'milestone',gists:'gist',teams:'team',environments:'environment',projects:'project',discussions:'discussion'};
function repository(value:unknown):[string,string]{if(typeof value!=='string'||! /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value)||value.includes('..'))throw new Error('Choose an owner/repository first');return value.split('/') as [string,string];}
function text(value:unknown,fallback=''):string{return typeof value==='string'?value.slice(0,1000):typeof value==='number'?String(value):fallback;}
function array(value:unknown):Record<string,unknown>[] {if(!Array.isArray(value))throw new Error('Unexpected GitHub collection response');return value.filter(v=>v&&typeof v==='object');}
function decode(output:string):{body:unknown;hasNext:boolean}{
 let content=output;let headers='';
 while(/^HTTP\/\S+\s+\d{3}/.test(content)){const separator=content.match(/\r?\n\r?\n/);if(!separator||separator.index===undefined)throw new Error('Invalid GitHub HTTP response');headers=content.slice(0,separator.index);const status=Number(headers.match(/^HTTP\/\S+\s+(\d{3})/)?.[1]);if(status>=400)throw new Error(`GitHub returned HTTP ${status}`);content=content.slice(separator.index+separator[0].length);}
 let body:unknown;try{body=JSON.parse(content);}catch{throw new Error('Invalid GitHub collection JSON');}
 const link=headers.split(/\r?\n/).find(line=>/^link:/i.test(line)) || '';
 return {body,hasNext:[...link.matchAll(/<[^>]+>\s*;\s*rel="([^"]+)"/g)].some(m=>m[1].split(/\s+/).includes('next'))};
}
/** Read-only picker sources. Unsupported API search is identified as filtering the displayed page. */
export function createChoiceSource(runGh:ChoiceRunner){
 const sources=new Map<string,ChoiceSource>();
 return async(binary:string,cwd:string,entity:string,context:ChoiceContext={}):Promise<ChoiceResult>=>{
  const key=JSON.stringify([binary,cwd]);let source=sources.get(key);if(!source){source=new ChoiceSource(binary,cwd,runGh);sources.set(key,source);if(sources.size>32)sources.delete(sources.keys().next().value!);}return source.list(entity,context);
 };
}
export class ChoiceSource {
 private cursors=new Map<string,Map<number,string|null>>();
 private ownerTypes=new Map<string,'User'|'Organization'>();
 constructor(private binary:string,private cwd:string,private runGh:ChoiceRunner){}
 private async rest(endpoint:string){return decode(await this.runGh(this.binary,['api',endpoint,'--method=GET','--include'],this.cwd));}
 private async collection(endpoint:string,key:string|undefined,page:number,map:(row:Record<string,unknown>)=>Choice,query:string,remote=false):Promise<ChoiceResult>{
  const response=await this.rest(`${endpoint}${endpoint.includes('?')?'&':'?'}per_page=${SIZE}&page=${page}`);
  const body=response.body as Record<string,unknown>;
  const rows=array(key?body?.[key]:body);
  const items=rows.map(map).filter(c=>c.value&&c.label).filter(c=>remote||!query||`${c.label} ${c.detail||''}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const incomplete=body?.incomplete_results===true;
  return {items,hasNext:response.hasNext,searchMode:remote?'remote':'page-filter',...(incomplete?{notice:'GitHub reports incomplete search results. Refine the query and try again.'}:query&&!remote?{notice:'GitHub does not provide server search for this collection. The query filters this page; continue to later pages to find more matches.'}:{})};
 }
 private async owner(context:ChoiceContext):Promise<string>{
  if(context.owner){if(!LOGIN.test(context.owner))throw new Error('Choose a valid project owner');return context.owner;}
  if(context.repository)return repository(context.repository)[0];
  const body=(await this.rest('user')).body as Record<string,unknown>;const login=text(body?.login);if(!LOGIN.test(login))throw new Error('GitHub did not return an account owner');return login;
 }
 private async graphql(context:ChoiceContext,entity:string,document:string,fields:Record<string,string>,connection:(data:Record<string,unknown>)=>unknown,map:(node:Record<string,unknown>)=>Choice):Promise<ChoiceResult>{
  const page=context.page || 1;const query=context.query || '';const cacheKey=JSON.stringify([entity,fields,query]);
  let cursors=this.cursors.get(cacheKey);if(page===1||!cursors){cursors=new Map([[1,null]]);this.cursors.set(cacheKey,cursors);if(this.cursors.size>64)this.cursors.delete(this.cursors.keys().next().value!);}
  let current=Math.max(...[...cursors.keys()].filter(p=>p<=page));
  if(page-current>10)throw new Error('Load the preceding pages before jumping ahead in this GitHub collection');
  while(current<=page){
   const args=['api','graphql','--method=POST','-f',`query=${document}`,'-F',`first=${SIZE}`,'-f',`search=${query}`];
   for(const [name,value] of Object.entries(fields))args.push('-f',`${name}=${value}`);
   const cursor=cursors.get(current);if(cursor)args.push('-f',`after=${cursor}`);
   const raw=JSON.parse(await this.runGh(this.binary,args,this.cwd)) as {data?:Record<string,unknown>;errors?:unknown[]};
   if(raw.errors?.length||!raw.data)throw new Error('GitHub could not load this collection. Check access to the selected repository or owner.');
   const result=connection(raw.data) as {nodes?:unknown;pageInfo?:{hasNextPage?:boolean;endCursor?:unknown}};
   if(!result||!result.pageInfo||typeof result.pageInfo.hasNextPage!=='boolean')throw new Error('Unexpected GitHub GraphQL collection response');
   const hasNext=result.pageInfo.hasNextPage;const endCursor=result.pageInfo.endCursor;
   if(hasNext&&(typeof endCursor!=='string'||!endCursor))throw new Error('GitHub omitted the next page cursor');
   if(hasNext)cursors.set(current+1,endCursor as string);
   if(current===page)return {items:array(result.nodes).map(map).filter(c=>c.value&&c.label),hasNext,searchMode:'remote'};
   if(!hasNext)return {items:[],hasNext:false,searchMode:'remote'};
   current++;
  }
  throw new Error('Invalid GitHub page');
 }
 async list(entity:string,context:ChoiceContext={}):Promise<ChoiceResult>{
  if(typeof entity!=='string'||entity.length>64)throw new Error('Choose a valid entity source');
  if(!context||typeof context!=='object'||Array.isArray(context))throw new Error('Invalid choice context');
  const page=context.page??1;if(!Number.isInteger(page)||page<1||page>1000)throw new Error('Invalid page');
  const query=context.query??'';if(typeof query!=='string'||query.length>256||/[\0\r\n]/.test(query))throw new Error('Search must be at most 256 characters on one line');
  if(context.owner!==undefined&&(typeof context.owner!=='string'||!LOGIN.test(context.owner)))throw new Error('Choose a valid owner');
  if(context.valueField&&!['title','number','id','slug'].includes(context.valueField))throw new Error('Choose a supported entity value field');
  const normalized=aliases[entity]||entity;
  const repo=()=>repository(context.repository).join('/');
  const owner=()=>repository(context.repository)[0];
  const name=(row:Record<string,unknown>)=>({value:text(row.name),label:text(row.name)});
  const search=(kind:string,searchQuery:string,map:(row:Record<string,unknown>)=>Choice)=>this.collection(`search/${kind}?q=${encodeURIComponent(searchQuery)}`, 'items',page,map,query,true);
  const user=(row:Record<string,unknown>)=>({value:text(row.login),label:text(row.login),detail:text(row.type)});
  switch(normalized){
   case 'repository':return query?search('repositories',query,row=>({value:text(row.full_name),label:text(row.full_name),detail:row.private?'Private':'Public'})):this.collection('user/repos?sort=updated',undefined,page,row=>({value:text(row.full_name),label:text(row.full_name),detail:row.private?'Private':'Public'}),query);
   case 'owner':{
    if(query)return search('users',query,user);
    const result=await this.collection('user/orgs',undefined,page,user,'');if(page===1){const viewer=(await this.rest('user')).body as Record<string,unknown>;const login=text(viewer.login);if(login)result.items.unshift({value:login,label:login,detail:'Your account'});}return result;
   }
   case 'organization':return query?search('users',`${query} type:org`,user):this.collection('user/orgs',undefined,page,user,query);
   case 'author':return query?search('users',`${query} type:user`,user):this.collection(`repos/${repo()}/contributors`,undefined,page,user,query);
   case 'user':{
    if(!context.repository)return query?search('users',`${query} type:user`,user):this.collection('user/following',undefined,page,user,query);
    if(!query)return this.collection(`repos/${repo()}/assignees`,undefined,page,user,query);
    const [owner,repoName]=repository(context.repository);return this.graphql(context,'user',`query($owner:String!,$repo:String!,$first:Int!,$after:String,$search:String!){repository(owner:$owner,name:$repo){assignableUsers(first:$first,after:$after,query:$search){nodes{login}pageInfo{hasNextPage endCursor}}}}`,{owner,repo:repoName},data=>(data.repository as Record<string,unknown>)?.assignableUsers,user);
   }
   case 'issue':case 'pull-request':{
    const isIssue=normalized==='issue';const map=(row:Record<string,unknown>)=>({value:text(row.number),label:`#${text(row.number)} ${text(row.title)}`,detail:text(row.state)});
    if(query)return search('issues',`${query} repo:${repo()} is:${isIssue?'issue':'pr'}`,map);
    if(!isIssue)return this.collection(`repos/${repo()}/pulls?state=all`,undefined,page,map,query);
    const response=await this.rest(`repos/${repo()}/issues?state=all&per_page=${SIZE}&page=${page}`);return {items:array(response.body).filter(row=>!row.pull_request).map(map),hasNext:response.hasNext,searchMode:'page-filter'};
   }
   case 'branch':case 'label':case 'milestone':{
    const map=normalized==='milestone'?(row:Record<string,unknown>)=>({value:text(context.valueField==='number'?row.number:row.title),label:text(row.title),detail:text(row.state)}):normalized==='label'?(row:Record<string,unknown>)=>({value:text(row.name),label:text(row.name),detail:text(row.description)}):name;
    if(!query)return this.collection(`repos/${repo()}/${normalized==='branch'?'branches':normalized==='label'?'labels':'milestones?state=all'}`,undefined,page,map,query);
    const [owner,repoName]=repository(context.repository);const field=normalized==='branch'?'refs':normalized==='label'?'labels':'milestones';
    const extra=normalized==='branch'?'refPrefix:"refs/heads/",':'';const nodeFields=normalized==='milestone'?'number title state':normalized==='label'?'name description':'name';
    const document=`query($owner:String!,$repo:String!,$first:Int!,$after:String,$search:String!){repository(owner:$owner,name:$repo){${field}(${extra}first:$first,after:$after,query:$search){nodes{${nodeFields}}pageInfo{hasNextPage endCursor}}}}`;
    return this.graphql(context,normalized,document,{owner,repo:repoName},data=>(data.repository as Record<string,unknown>)?.[field],map);
   }
   case 'milestone-number':return this.list('milestone',{...context,valueField:'number'});
   case 'project':case 'project-number':case 'project-id':{
    const login=await this.owner(context);let type=this.ownerTypes.get(login);if(!type){const body=(await this.rest(`users/${encodeURIComponent(login)}`)).body as Record<string,unknown>;if(body.type!=='User'&&body.type!=='Organization')throw new Error('GitHub did not return a project owner type');type=body.type;this.ownerTypes.set(login,type);if(this.ownerTypes.size>64)this.ownerTypes.delete(this.ownerTypes.keys().next().value!);}
    const root=type==='Organization'?'organization':'user';
    const document=`query($owner:String!,$first:Int!,$after:String,$search:String!){${root}(login:$owner){projectsV2(first:$first,after:$after,query:$search){nodes{id number title closed url}pageInfo{hasNextPage endCursor}}}}`;
    const field=context.valueField || (normalized==='project-number'?'number':normalized==='project-id'?'id':'title');
    return this.graphql(context,`${root}-project-${field}`,document,{owner:login},data=>(data[root] as Record<string,unknown>)?.projectsV2,row=>({value:text(row[field]),label:`#${text(row.number)} ${text(row.title)}`,detail:`${login} · ${row.closed?'Closed':'Open'}`}));
   }
   case 'team':return this.collection(`orgs/${context.owner&&LOGIN.test(context.owner)?context.owner:owner()}/teams`,undefined,page,row=>({value:context.valueField==='slug'?text(row.slug):`${context.owner||owner()}/${text(row.slug)}`,label:text(row.name),detail:text(row.description)}),query);
   case 'environment':return this.collection(`repos/${repo()}/environments`,'environments',page,name,query);
   case 'release':return this.collection(`repos/${repo()}/releases`,undefined,page,row=>({value:text(row.tag_name),label:text(row.name)||text(row.tag_name),detail:row.draft?'Draft':'Published'}),query);
   case 'tag':return this.collection(`repos/${repo()}/tags`,undefined,page,name,query);
   case 'workflow':return this.collection(`repos/${repo()}/actions/workflows`,'workflows',page,row=>({value:text(row.id),label:text(row.name),detail:text(row.state)}),query);
   case 'run':return this.collection(`repos/${repo()}/actions/runs`,'workflow_runs',page,row=>({value:text(row.id),label:`#${text(row.run_number)} ${text(row.display_title)||text(row.name)}`,detail:text(row.conclusion)||text(row.status)}),query);
   case 'secret':return this.collection(`repos/${repo()}/actions/secrets`,'secrets',page,name,query);
   case 'variable':return this.collection(`repos/${repo()}/actions/variables`,'variables',page,name,query);
   case 'codespace':return this.collection('user/codespaces','codespaces',page,row=>({value:text(row.name),label:text(row.display_name)||text(row.name),detail:text(row.state)}),query);
   case 'gist':return this.collection('gists',undefined,page,row=>({value:text(row.id),label:text(row.description)||text(row.id)}),query);
   case 'discussion':{
    const [owner,repoName]=repository(context.repository);
    const document='query($owner:String!,$repo:String!,$first:Int!,$after:String){repository(owner:$owner,name:$repo){discussions(first:$first,after:$after){nodes{number title url}pageInfo{hasNextPage endCursor}}}}';
    const result=await this.graphql(context,'discussion',document,{owner,repo:repoName},data=>(data.repository as Record<string,unknown>)?.discussions,row=>({value:text(row.number),label:`#${text(row.number)} ${text(row.title)}`}));
    if(query)return {...result,items:result.items.filter(c=>c.label.toLocaleLowerCase().includes(query.toLocaleLowerCase())),searchMode:'page-filter',notice:'Discussion search filters this page. Continue to later pages for more results.'};return {...result,searchMode:'page-filter'};
   }
   default:throw new Error(`No guided source is registered for ${entity}`);
  }
 }
}
