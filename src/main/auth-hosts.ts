import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
export interface ApprovedHost {hostname:string;label:string;restOrigin:string;graphqlEndpoint:string;uploadsOrigin?:string}
export function validateAuthHost(input:unknown):ApprovedHost {
 if(typeof input!=='string'||!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(input)||/^\d+(?:\.\d+){3}$/.test(input)||input.endsWith('.localhost'))throw new Error('Enter an exact lowercase DNS hostname without a URL, port, or path');
 return input==='github.com'?{hostname:input,label:'GitHub',restOrigin:'https://api.github.com',graphqlEndpoint:'https://api.github.com/graphql',uploadsOrigin:'https://uploads.github.com'}:{hostname:input,label:input,restOrigin:`https://${input}/api/v3`,graphqlEndpoint:`https://${input}/api/graphql`,uploadsOrigin:`https://${input}/api/uploads`};
}
/** Exact approved origins and selected workspace host; no credentials or TLS overrides. */
export function createAuthHostRegistry(directory:string){
 const file=path.join(directory,'approved-hosts.json');let hosts=[validateAuthHost('github.com')],selectedHostname='github.com';let serial:Promise<unknown>=Promise.resolve();
 const save=async(values:ApprovedHost[],selected:string)=>{await mkdir(directory,{recursive:true,mode:0o700});const temporary=file+'.'+randomUUID()+'.tmp';await writeFile(temporary,JSON.stringify({schemaVersion:2,hosts:values.map(h=>h.hostname),selectedHostname:selected}),{mode:0o600});await rename(temporary,file);hosts=values;selectedHostname=selected;};
 const serialize=<T>(work:()=>Promise<T>)=>{const operation=serial.then(work);serial=operation.catch(()=>{});return operation;};
 return {
  async load(){try{const raw=await readFile(file,'utf8');if(raw.length>16384)throw new Error();const data=JSON.parse(raw);if(![1,2].includes(data.schemaVersion)||!Array.isArray(data.hosts)||data.hosts.length>32||Object.keys(data).some(k=>!['schemaVersion','hosts',...(data.schemaVersion===2?['selectedHostname']:[])].includes(k)))throw new Error();const values=data.hosts.map(validateAuthHost),next=[...new Map([validateAuthHost('github.com'),...values].map(h=>[h.hostname,h])).values()];const selected=data.schemaVersion===1?'github.com':validateAuthHost(data.selectedHostname).hostname;if(!next.some(h=>h.hostname===selected)||next.length>32)throw new Error();hosts=next;selectedHostname=selected;}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw new Error('Approved host record is unavailable or invalid');}return this.list();},
  getHosts(){return structuredClone(hosts);},list(){return structuredClone(hosts);},
  selectedHost(){return this.resolveHost(selectedHostname);},
  resolveHost(host=selectedHostname){const found=hosts.find(h=>h.hostname===host);if(!found)throw new Error('Choose an approved GitHub hostname');return {...found};},
  selectHost(host:string){return serialize(async()=>{const approved=this.resolveHost(host);if(approved.hostname!==selectedHostname)await save(hosts,approved.hostname);return this.selectedHost();});},
  register(host:string){return serialize(async()=>{const next=validateAuthHost(host);if(hosts.some(h=>h.hostname===next.hostname))return this.list();if(hosts.length>=32)throw new Error('Approved host limit reached');await save([...hosts,next],selectedHostname);return this.list();});}
 };
}
