/** Ignore rules are edited locally; saving never changes the Git index. */
export type GitIgnoreAction='read'|'preview'|'save'|'discard';
export interface GitIgnoreRequest {worktreeId:string;revision?:string;content?:string;samplePaths?:string[];reviewId?:string;confirmed?:boolean}
export interface GitIgnoreMatch {path:string;tracked:boolean;directory:boolean;before:{ignored:boolean;source:string;line:number;pattern:string};after:{ignored:boolean;source:string;line:number;pattern:string}}
export interface GitIgnoreDocument {kind:'document';worktreeId:string;content:string;revision:string;exists:boolean;newline:'LF'|'CRLF'|'mixed';samples:string[];sampleTotal:number;sampleLimit:number}
export interface GitIgnorePreview {kind:'preview';worktreeId:string;reviewId:string;expiresAt:number;existing:string;proposed:string;matches:GitIgnoreMatch[];sources:string[];changed:boolean}
export type GitIgnoreResponse=GitIgnoreDocument|GitIgnorePreview|{kind:'saved';content:string;revision:string}|{kind:'discarded'};
export type GitIgnoreClient=(action:GitIgnoreAction,request:GitIgnoreRequest)=>Promise<GitIgnoreResponse>;
export interface IgnoreLine {id:number;text:string;ending:string}
export function ignoreLines(content:string):IgnoreLine[]{const rows:IgnoreLine[]=[];const pattern=/([^\r\n]*)(\r\n|\n|\r|$)/g;let match:RegExpExecArray|null;while((match=pattern.exec(content))&&match[0])rows.push({id:rows.length,text:match[1],ending:match[2]});return rows;}
export function ignoreText(rows:IgnoreLine[],newline='\n'):string{return rows.map((row,index)=>row.text+(row.ending||index<rows.length-1?row.ending||newline:'')).join('');}
export function ignorePattern(kind:'name'|'extension'|'directory'|'glob',value:string,negated=false,rootOnly=false):string{
 if(!value||value.length>2048||/[\0\r\n]/.test(value))throw Error('Enter a single nonempty pattern.');
 let pattern=value;
 if(kind!=='glob'){if(value.includes('/')||value.includes('\\')||value==='.'||value==='..')throw Error('Enter a name without directory separators.');pattern=value.replace(/[\\*?\[\]#! ]/g,'\\$&');if(kind==='extension')pattern='*.'+pattern.replace(/^\./,'');if(kind==='directory')pattern+='/';}
 if(rootOnly&&!pattern.startsWith('/'))pattern='/'+pattern;
 return (negated?'!':'')+pattern;
}
export const ignoreTemplates=[
 {id:'node',name:['Node.js dependencies and output','Node.js 相依套件同輸出'],lines:['# Node.js','node_modules/','npm-debug.log*','dist/']},
 {id:'python',name:['Python caches and environments','Python 快取同環境'],lines:['# Python','__pycache__/','*.py[cod]','.venv/']},
 {id:'editor',name:['Editor temporary files','編輯器暫存檔'],lines:['# Editor temporary files','*.swp','*.swo','*~']},
 {id:'system',name:['Operating system metadata','作業系統附加資料'],lines:['# Operating system metadata','.DS_Store','Thumbs.db']},
 {id:'logs',name:['Logs and temporary output','記錄同暫存輸出'],lines:['# Logs and temporary output','*.log','tmp/']}
] as const;
