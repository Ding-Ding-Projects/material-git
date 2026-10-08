import {createHash,randomUUID} from 'node:crypto';
import {lstat,readFile,open,link,unlink,opendir} from 'node:fs/promises';
import {basename,join,extname} from 'node:path';
import {atomicJson} from './ollama-manager';
import {catalogRegex} from './catalog-query';
import type {ConverterResult,LocalToolsPayload} from '../shared/local-tools';

export interface OutputReceipt {path:string;bytes:number;digest:string}
export type ResultOperation='open'|'reveal'|'editor'|'export';
const uuid=(value:unknown)=>{if(typeof value!=='string'||!/^[a-f0-9-]{36}$/.test(value))throw new Error('Invalid opaque result identifier');return value;};
/** Filesystem destinations remain private and are always revalidated before handoff. */
export class ConverterResults {
 constructor(private directory:string,private receiptsDirectory:string,private readBounded:(path:string,limit:number)=>Promise<Buffer>,private saveDestination:(name:string)=>Promise<string|null>,private openResult?: (path:string,operation:Exclude<ResultOperation,'export'>)=>Promise<void>){ }
 async record(id:string,outputs:OutputReceipt[]){await atomicJson(join(this.receiptsDirectory,uuid(id)+'.json'),{outputs});}
 async act(payload:LocalToolsPayload){
  const id=uuid(payload.id),index=Number(payload.index??0),operation=payload.operation as ResultOperation;
  if(!Number.isInteger(index)||index<0||index>=250||!['open','reveal','editor','export'].includes(operation))throw new Error('Choose a valid output and result action');
  const result=JSON.parse(await readFile(join(this.directory,id+'.json'),'utf8'))as ConverterResult;
  if(result.status!=='converted')throw new Error('Only verified completed outputs can be opened or exported');
  let receipt:{outputs:OutputReceipt[]};try{receipt=JSON.parse(await readFile(join(this.receiptsDirectory,id+'.json'),'utf8'));}catch{throw new Error('This older history item has no output receipt. Convert the selected original again to enable result actions.');}
  const output=receipt.outputs[index];if(!output||!Number.isInteger(output.bytes)||output.bytes<0||output.bytes>64*1024*1024||typeof output.path!=='string'||!/^[a-f0-9]{64}$/.test(output.digest))throw new Error('Invalid private output receipt');
  let bytes:Buffer;
  try{if(!(await lstat(output.path)).isFile())throw new Error('Not a regular output');bytes=await this.readBounded(output.path,64*1024*1024);}catch{throw new Error('Verified output is unavailable or no longer a regular file. Convert the selected original again.');}
  if(bytes.length!==output.bytes||createHash('sha256').update(bytes).digest('hex')!==output.digest)throw new Error('Output changed after conversion. Select the current file as a new source to inspect it.');
  if(operation!=='export'){if(!this.openResult)throw new Error('Native result handoff is not configured in this build');await this.openResult(output.path,operation);return {completed:true};}
  const destination=await this.saveDestination(basename(output.path));if(!destination)return {cancelled:true};
  if(extname(destination).toLowerCase()!==extname(output.path).toLowerCase())throw new Error('Keep the verified output extension when exporting a copy');
  const temporary=destination+'.'+randomUUID()+'.tmp';let published=false;
  try{const file=await open(temporary,'wx',0o600);try{await file.writeFile(bytes);await file.sync();}finally{await file.close();}
   if(!bytes.equals(await this.readBounded(temporary,64*1024*1024)))throw new Error('Exported copy failed reopening validation');
   await link(temporary,destination);published=true;return {completed:true,name:basename(destination)};
  }catch(error){if(published)await unlink(destination).catch(()=>{});if((error as NodeJS.ErrnoException).code==='EEXIST')throw new Error('Destination already exists. Choose a new filename to preserve existing data.');if((error as NodeJS.ErrnoException).code)throw new Error('Export copy could not be written. Check destination permissions and free space.');throw error;}finally{await unlink(temporary).catch(()=>{});}
 }
 async page(payload:LocalToolsPayload,reconcile:(result:ConverterResult)=>Promise<ConverterResult>){
  const page=Number(payload.page??1);if(!Number.isInteger(page)||page<1||page>1_000_000)throw new Error('Invalid history page');
  const query=String(payload.query??'');if(query.length>1000)throw new Error('History query exceeds 1000 characters');
  const status=String(payload.status??'all');if(!['all','queued','paused','running','converted','cancelled','failed'].includes(status))throw new Error('Unsupported history status');
  const date=String(payload.date??'');if(date&&!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error('Use an ISO history date');
  if(payload.regex!==undefined&&typeof payload.regex!=='boolean')throw new Error('Regex mode must be boolean');
  if(payload.regex)await catalogRegex([],String(payload.pattern??query),String(payload.flags??'i'));
  const deadline=Date.now()+15000;
  const items:ConverterResult[]=[];let count=0,hasNext=false;const candidates:ConverterResult[]=[];
  const consume=async()=>{const texts=candidates.map(r=>`${r.source} ${r.adapter} ${r.outputName??''} ${r.error??''}`);const matches=payload.regex?await catalogRegex(texts,String(payload.pattern||query),String(payload.flags??'i')):texts.map(t=>t.toLocaleLowerCase().includes(query.toLocaleLowerCase()));for(let i=0;i<candidates.length;i++){if(!matches[i])continue;if(count++<(page-1)*40)continue;if(items.length===40){hasNext=true;break;}items.push(candidates[i]);}candidates.length=0;};
  // Stream disk-backed records in finite chunks; neither all paths nor all results are retained.
  for await(const entry of await opendir(this.directory)){
   if(Date.now()>deadline)throw new Error('History search exceeded its 15-second disk scan budget. Narrow the date or outcome filter.');
   if(!/^[a-f0-9-]{36}\.json$/.test(entry.name))continue;
   const file=join(this.directory,entry.name);if(!(await lstat(file)).isFile()||(await lstat(file)).size>256000)continue;
   const result=await reconcile(JSON.parse(await readFile(file,'utf8'))as ConverterResult);
   if(status!=='all'&&result.status!==status||date&&!(result.at??'').startsWith(date))continue;
   candidates.push(result);if(candidates.length===40){await consume();if(hasNext)break;}
  }if(!hasNext)await consume();return {items,page,hasNext};
 }
 async forget(id:unknown){const key=uuid(id);await unlink(join(this.directory,key+'.json'));await unlink(join(this.receiptsDirectory,key+'.json')).catch(()=>{});return {id:key,status:'forgotten'};}
}
