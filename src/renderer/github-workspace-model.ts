import type {AppSettings} from '../shared/types';
export type Domain='repositories'|'issues'|'pull-requests'|'actions'|'releases'|'projects'|'discussions'|'search'|'repository-security'|'organizations'|'gists'|'codespaces';
export type RecordData=Record<string,unknown>;
export interface DomainPage {items:RecordData[];page:number;hasNext:boolean;total?:number;detail?:RecordData;notice?:string}
export interface DomainPayload {repository?:string;page?:number;query?:string;state?:string;id?:string;tab?:string;values?:Record<string,unknown>;confirmed?:boolean;owner?:string;action?:string;reviewId?:string;entity?:string}
export interface DomainDefinition {id:Domain;name:[string,string];icon:string;scoped:boolean;states?:string[];tabs:string[];create?:string}
export const domains:DomainDefinition[]=[
{id:'repositories',name:['Repositories','儲存庫'],icon:'repo',scoped:false,tabs:['Overview','Branches','Collaborators'],create:'Create repository'},
{id:'issues',name:['Issues','議題'],icon:'issue',scoped:true,states:['open','closed','all'],tabs:['Conversation','Labels','Assignees'],create:'New issue'},
{id:'pull-requests',name:['Pull requests','拉取要求'],icon:'pull',scoped:true,states:['open','closed','merged','all'],tabs:['Conversation','Files changed','Checks','Reviews','Commits'],create:'New pull request'},
{id:'actions',name:['Actions','自動化流程'],icon:'play',scoped:true,states:['all','queued','in_progress','completed','failure','success'],tabs:['Jobs','Logs','Artifacts','Workflows']},
{id:'releases',name:['Releases','發佈版本'],icon:'tag',scoped:true,tabs:['Release notes','Assets'],create:'Draft release'},
{id:'projects',name:['Projects','專案'],icon:'board',scoped:false,tabs:['Items','Fields','Overview'],create:'New project'},
{id:'discussions',name:['Discussions','討論'],icon:'comment',scoped:true,tabs:['Conversation','Answers'],create:'New discussion'},
{id:'search',name:['Search GitHub','搜尋 GitHub'],icon:'search',scoped:false,states:['repositories','issues','pull-requests','code','commits'],tabs:['Overview']},
{id:'repository-security',name:['Repository security','儲存庫安全'],icon:'shield',scoped:true,states:['dependabot','code-scanning','secret-scanning'],tabs:['Alert','Locations']},
{id:'organizations',name:['Organizations','組織'],icon:'organization',scoped:false,tabs:['Overview','Members','Teams','Repositories']},
{id:'gists',name:['Gists','程式碼片段'],icon:'code',scoped:false,tabs:['Files','Comments'],create:'New gist'},
{id:'codespaces',name:['Cloud workspaces','雲端工作空間'],icon:'cloud',scoped:false,tabs:['Overview','Ports'],create:'New cloud workspace'}
];
export const ui=(settings:AppSettings|undefined,en:string,yue:string)=>settings?.language==='yue'?yue:settings?.language==='both'?`${en} · ${yue}`:en;
export const rec=(value:unknown):RecordData=>value&&typeof value==='object'&&!Array.isArray(value)?value as RecordData:{};
export const arr=(value:unknown):RecordData[]=>Array.isArray(value)?value.map(rec):[];
export const str=(value:unknown):string=>typeof value==='string'?value:typeof value==='number'?String(value):'';
export const first=(data:RecordData,...keys:string[])=>keys.map(k=>data[k]).find(v=>v!==null&&v!==undefined&&v!=='');
export const titleOf=(data:RecordData)=>str(first(data,'title','displayTitle','full_name','nameWithOwner','name','tag_name','tagName','description','login','path','id','number'))||'Untitled';
export const idOf=(data:RecordData)=>str(first(data,'id','number','databaseId','name','full_name','nameWithOwner','tag_name','tagName','login'));
export const stateOf=(data:RecordData)=>str(first(data,'conclusion','state','status','visibility'));
export const authorOf=(data:RecordData)=>str(first(rec(first(data,'user','author','owner','actor')),'login','name'));
export const dateOf=(data:RecordData)=>str(first(data,'updated_at','updatedAt','created_at','createdAt','published_at','publishedAt','started_at','startedAt'));
export const urlOf=(data:RecordData)=>str(first(data,'html_url','url','web_url','permalink'));
export function relativeDate(value:string){const time=Date.parse(value);if(!Number.isFinite(time))return '';const delta=Date.now()-time;if(delta<60_000)return 'just now';if(delta<3_600_000)return `${Math.floor(delta/60_000)}m ago`;if(delta<86_400_000)return `${Math.floor(delta/3_600_000)}h ago`;if(delta<2_592_000_000)return `${Math.floor(delta/86_400_000)}d ago`;return new Date(time).toLocaleDateString();}
export function pageFrom(value:unknown,page:number):DomainPage{if(Array.isArray(value))return {items:arr(value),page,hasNext:value.length===30};const v=rec(value);return {items:arr(first(v,'items','repositories','workflow_runs','releases','projects','gists','codespaces','nodes','data')),page:Number(v.page)||page,hasNext:v.hasNext===true,total:typeof v.total==='number'?v.total:typeof v.total_count==='number'?v.total_count:undefined,detail:v.detail?rec(v.detail):undefined,notice:str(v.notice)||undefined};}
/** The privileged bridge owns endpoint selection, credentials and all validation. */
export async function github(action:string,payload:DomainPayload={}):Promise<unknown>{const bridge=window.material as typeof window.material & {github:(action:string,payload:Record<string,unknown>)=>Promise<unknown>};if(typeof bridge.github!=='function')throw Error('The GitHub connection is unavailable. Restart the application after updating.');const {owner,...request}=payload;const parameters:Record<string,unknown>={...request};if(payload.page!==undefined)parameters.page=Math.max(0,payload.page-1);if(action.startsWith('projects.')&&action.endsWith('.list')&&owner)parameters.values={...payload.values,owner};const response=await bridge.github(action,parameters);if(response&&typeof response==='object'&&!Array.isArray(response)){const result=rec(response);return {...result,page:typeof result.page==='number'?result.page+1:1};}return response;}
