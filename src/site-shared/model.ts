export interface Article {id:string;title:string;category:string;source:string;body:string;html:string}
export interface Capture {file:string;title:string;titleYue:string;description:string;descriptionYue:string;screen:string;sourceCommit:string;capturedAt:string}
export const categories=[['Getting started','開始使用'],['Workflows','工作流程'],['Personalization','個人化'],['Security','安全'],['Reference','參考'],['Development','開發']] as const;
export function categoryFor(file:string):string{
 if(/auth|security/.test(file))return 'Security';
 if(/personal|regex|ollama|converter|scroll/.test(file))return 'Personalization';
 if(/build|verif|coverage/.test(file))return 'Development';
 if(/reference/.test(file))return 'Reference';
 if(/start|install|site/.test(file))return 'Getting started';
 return 'Workflows';
}
export function safeDownloadURL(value:unknown):string|null{try{const url=new URL(String(value));return url.protocol==='https:'&&['github.com','objects.githubusercontent.com','release-assets.githubusercontent.com'].includes(url.hostname)?url.href:null}catch{return null}}
export function releaseAssets(value:unknown):{name:string;url:string;size:number}[]{
 if(!Array.isArray(value))return [];
 return value.flatMap(item=>{if(!item||typeof item!=='object')return [];const {name,browser_download_url,size}=item as Record<string,unknown>,url=safeDownloadURL(browser_download_url);return typeof name==='string'&&/\.exe$/i.test(name)&&url&&typeof size==='number'&&Number.isFinite(size)&&size>=0?[{name,url,size}]:[]});
}
export function validCapture(value:unknown):value is Capture{
 if(!value||typeof value!=='object')return false;
 const item=value as Capture;
 return ['title','titleYue','description','descriptionYue','screen'].every(key=>typeof item[key as keyof Capture]==='string'&&item[key as keyof Capture].length>0)&&/^docs\/images\/[a-z0-9][a-z0-9._-]*\.(png|webp|jpg)$/.test(item.file)&&/^[a-f0-9]{40}$/.test(item.sourceCommit)&&/^\d{4}-\d{2}-\d{2}T/.test(item.capturedAt)&&Number.isFinite(Date.parse(item.capturedAt));
}
export function provenanceDate(value:string):string|null{return /^\d{4}-\d{2}-\d{2}T/.test(value)&&Number.isFinite(Date.parse(value))?value:null}
