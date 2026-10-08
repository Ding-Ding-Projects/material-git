import { spawn, type ChildProcess } from 'node:child_process';
import { StringDecoder } from 'node:string_decoder';
import { randomUUID } from 'node:crypto';
import { existsSync, realpathSync } from 'node:fs';
import path from 'node:path';
import type { Catalog, CommandOption, ExecutionRequest, Operation } from '../shared/types';
const LIMIT = 1024 * 1024;
/** Keep enough undecided text to match credentials across process chunks. */
class OutputRedactor {
 private pending=''; private token=false; private hold:number; private prefixes:number[][];
 constructor(private secrets:string[]) {this.secrets=secrets.filter(Boolean).sort((a,b)=>b.length-a.length);this.hold=Math.max(11,...this.secrets.map(s=>s.length));this.prefixes=this.secrets.map(secret=>{const table=Array(secret.length).fill(0) as number[];for(let i=1,j=0;i<secret.length;i++){while(j&&secret[i]!==secret[j])j=table[j-1];if(secret[i]===secret[j])j++;table[i]=j;}return table;});}
 write(text:string,final=false):string {
  this.pending+=text;let output='';
  while(this.pending){
   if(this.token){const length=this.pending.match(/^[A-Za-z0-9_]*/)?.[0].length || 0;this.pending=this.pending.slice(length);if(!this.pending)break;this.token=false;}
   let safe=final?this.pending.length:Math.max(0,this.pending.length-this.hold);if(safe>0&&safe<this.pending.length&&/[\uD800-\uDBFF]/.test(this.pending[safe-1])&&/[\uDC00-\uDFFF]/.test(this.pending[safe]))safe--;if(!safe)break;
   const token=this.pending.match(/gh[pousr]_|github_pat_/);let start=token?.index ?? Infinity;let end=start+(token?.[0].length||0);let isToken=!!token;
   for(const secret of this.secrets){const index=this.pending.indexOf(secret);if(index>=0&&index<start){start=index;end=index+secret.length;isToken=false;}}
   if(start>=safe){if(final){let suffix=0;for(let k=0;k<this.secrets.length;k++){const secret=this.secrets[k],table=this.prefixes[k];let length=0;for(const char of this.pending.split('')){while(length&&(length===secret.length||char!==secret[length]))length=table[length-1];if(char===secret[length])length++;}if(length>=4)suffix=Math.max(suffix,length);}if(suffix){output+=this.pending.slice(0,-suffix)+'[REDACTED]';this.pending='';break;}}output+=this.pending.slice(0,safe);this.pending=this.pending.slice(safe);continue;}
   {let changed=true;while(changed){changed=false;for(const secret of this.secrets){let index=this.pending.indexOf(secret,start);while(index>=0&&index<end){if(index+secret.length>end){end=index+secret.length;changed=true;}index=this.pending.indexOf(secret,index+1);}}}}
   if(token&&token.index!==undefined&&token.index>=start&&token.index<end)isToken=true;
   output+=this.pending.slice(0,start)+'[REDACTED]';this.pending=this.pending.slice(end);this.token=isToken;
  }
  return output;
 }
}
export class Engine {
 private operations = new Map<string, Operation>();
 private children = new Map<string, ChildProcess>();
 private killTimers=new Map<string,ReturnType<typeof setTimeout>>();
 private listeners = new Set<(operation: Operation) => void>();
 constructor(private catalog: Catalog, private cwd: string, private ghPath: string) {}
 subscribe(callback: (operation: Operation) => void): () => void {this.listeners.add(callback); return () => {this.listeners.delete(callback);};}
 operation(id: string): Operation {const op=this.operations.get(id); if(!op) throw new Error('Unknown operation'); return structuredClone(op);}
 private emit(op: Operation) {for(const callback of this.listeners) {try {callback(structuredClone(op));} catch { /* Subscriber failures must not interrupt process cleanup. */ }}}
 private terminate(child:ChildProcess,force=false){if(!child.pid)return;if(process.platform==='win32'){const killer=spawn('taskkill',['/PID',String(child.pid),'/T',...(force?['/F']:[])],{shell:false,windowsHide:true,stdio:'ignore'});killer.on('error',()=>{child.kill(force?'SIGKILL':'SIGTERM');});}else{try{process.kill(-child.pid,force?'SIGKILL':'SIGTERM');}catch{child.kill(force?'SIGKILL':'SIGTERM');}}}
 cancel(id: string): void {const child=this.children.get(id);const op=this.operations.get(id);if(child&&op?.status==='running'){op.status='cancelled';this.terminate(child);const timer=setTimeout(()=>{this.killTimers.delete(id);this.terminate(child,true);},2000);timer.unref();this.killTimers.set(id,timer);this.emit(op);}}
 execute(request: ExecutionRequest): Operation {
 if(!request || typeof request!=='object')throw new Error('Invalid request');
 const command=this.catalog.commands.find(c=>c.id===request.commandId); if(!command)throw new Error('Unknown command');
 if(command.interactive)throw new Error(command.availability || 'Command requires a native terminal');
 if(command.mutation && request.confirmed !== true)throw new Error('Review and confirm this command before execution');
 const cwd=realpathSync(request.cwd || this.cwd); const root=realpathSync(this.cwd);
 if(cwd!==root && !cwd.startsWith(root+path.sep))throw new Error('Working directory must remain within the workspace');
 const values=request.values || {}, args=request.args || {};
 if(typeof values!=='object'||Array.isArray(values)||typeof args!=='object'||Array.isArray(args))throw new Error('Values and arguments must be structured objects');
 for(const key of Object.keys(values))if(!command.options.some(o=>o.name===key))throw new Error(`Unknown option: ${key}`);
 for(const key of Object.keys(args))if(!command.arguments.some(o=>o.name===key))throw new Error(`Unknown argument: ${key}`);
 const argv=[...command.path]; if(command.id==='browse')argv.push('--no-browser');
 const cloneFlags:string[]=[]; const secrets:string[]=Object.entries(process.env).filter(([key,value])=> /TOKEN|PASSWORD|SECRET/.test(key) && value).map(([,value])=>value!);
 const validate=(o:CommandOption,value:unknown):string[]=>{
 if(value===undefined || value===null || value==='') {if(o.required)throw new Error(`Required value: ${o.name}`); return [];}
 const items=o.multiple ? (Array.isArray(value)?value:[value]) : [value]; if(!o.multiple && Array.isArray(value))throw new Error(`Single value required: ${o.name}`);
 if(items.length>100)throw new Error('Too many values');
 return items.map(v=>{if(o.type==='boolean') {if(typeof v!=='boolean')throw new Error(`Boolean required: ${o.name}`);return String(v);}
 if(o.type==='number'){if(typeof v!=='number'||!Number.isFinite(v)||!Number.isInteger(v)||v<(o.minimum??-Infinity)||v>(o.maximum??Infinity))throw new Error(`Invalid number: ${o.name}`);return String(v);}
 if(typeof v!=='string'||v.length>65536||v.includes('\0')||/[\r\n]/.test(v)&&o.type!=='multiline'&& !['body','notes','description'].includes(o.name))throw new Error(`Invalid text: ${o.name}`);
 if(o.type==='file'&&v==='-')throw new Error('Choose a file; reading from standard input is unavailable');
 if(o.choices&&!o.choices.includes(v))throw new Error(`Invalid choice: ${o.name}`);
 if(o.type==='secret')secrets.push(v);return v;});
 };
 for(const original of command.options){const o=original.name==='body'&&values['body-file']?{...original,required:false}:original;for(const value of (o.type==='multi-choice' ? [validate(o,values[o.name]).join(',')].filter(Boolean) : validate(o,values[o.name]))) {
 if(command.id==='browse'&&o.name==='no-browser')continue;
 if(command.id==='repo clone'&&o.name.startsWith('git-')){if(o.type==='boolean'){if(value==='true')cloneFlags.push('--single-branch');}else cloneFlags.push(`--${o.name.slice(4)}=${value}`);continue;}
 if(o.type==='boolean') {if(value==='true')argv.push(`--${o.name}`);else argv.push(`--${o.name}=false`);} else argv.push(`--${o.name}=${value}`);
 }}
 if(request.repository&&!values.repo){if(!command.options.some(o=>o.name==='repo'))throw new Error('This command does not accept a repository');if(typeof request.repository!=='string'||! /^(?:[\w.-]+\/)?[\w.-]+\/[\w.-]+$/.test(request.repository))throw new Error('Invalid repository');argv.push(`--repo=${request.repository}`);}
 const positional=command.arguments.flatMap(o=>validate(o,args[o.name]));
 if(command.arguments.some(o=>o.name==='gitflags')&&args.gitflags)throw new Error('Raw git flag forwarding is unavailable; use guided clone controls');
 if(['repo clone','gist clone'].includes(command.id)){
  const repository=String(args.repository||args.gist||'');if(repository.startsWith('-')||/^[a-z][a-z0-9+.-]*:\/\//i.test(repository)&&!repository.startsWith('https://github.com/')&&!repository.startsWith('https://gist.github.com/')||repository.includes('@')&&!repository.startsWith('git@github.com:'))throw new Error('Choose a GitHub repository or gist');
  if(args.directory){const destination=path.resolve(cwd,String(args.directory));let ancestor=destination;while(!existsSync(ancestor)){const parent=path.dirname(ancestor);if(parent===ancestor)break;ancestor=parent;}const resolved=realpathSync(ancestor);if(String(args.directory).startsWith('-')||destination!==root&&!destination.startsWith(root+path.sep)||resolved!==root&&!resolved.startsWith(root+path.sep))throw new Error('Clone destination must remain within the workspace');}
 }
 if(positional.length)argv.push('--',...positional,...cloneFlags);
 // Browser, editor, and terminal output paths can launch arbitrary helper programs.
 for(const key of ['web','editor','external','show-token'])if(values[key])throw new Error('Browser and editor actions require a dedicated workflow');
 if(command.id==='config set' && ['editor','browser','pager','api_host','http_unix_socket'].includes(String(args.key)))throw new Error('External helper configuration requires a dedicated workflow');
 if(['secret set','variable set'].includes(command.id)&& !values.body && !values['env-file'])throw new Error('Provide an explicit value or dotenv file instead of standard input');
 if(command.id==='codespace ports forward')for(const mapping of (Array.isArray(args['port-mappings'])?args['port-mappings']:[args['port-mappings']])){if(typeof mapping!=='string'||!/^\d{1,5}:\d{1,5}$/.test(mapping)||mapping.split(':').some(port=>Number(port)<1||Number(port)>65535))throw new Error('Each mapping requires remote and local ports from 1 to 65535');}
 if(command.id==='codespace ports visibility')for(const mapping of (Array.isArray(args['port-visibility'])?args['port-visibility']:[args['port-visibility']])){if(typeof mapping!=='string'||!/^\d{1,5}:(public|private|org)$/.test(mapping)||Number(mapping.split(':')[0])<1||Number(mapping.split(':')[0])>65535)throw new Error('Each visibility requires a port from 1 to 65535 and public, private, or org');}
 if(command.id==='codespace cp'&&values.expand)throw new Error('Remote shell expansion requires a dedicated reviewed workflow');
 if(command.id==='alias set'&&(values.shell||String(args.expansion||'').trimStart().startsWith('!')))throw new Error('Shell aliases require a dedicated external-code workflow');
 if(command.id==='agent-task create'&&!args['task-description']&&!values['from-file'])throw new Error('Provide a task description or file to avoid opening an editor');
 if(command.id==='skill install'&&!args['skill-version']&&!args.skill&&!values.all)throw new Error('Select a skill or explicitly choose all skills for noninteractive installation');
 if(command.id==='config set'){
 const key=String(args.key);const value=String(args.value);const choices=key==='git_protocol'?['https','ssh']:key==='telemetry'?['enabled','disabled','log']:['enabled','disabled'];if(!choices.includes(value))throw new Error('Choose a supported configuration value');
 }
 if(command.id==='api') {
 const endpoint=String(args.endpoint || '');
 if(!/^(?:\/)?[A-Za-z0-9_{}.-]+(?:[\/A-Za-z0-9_{}.?=&%+~-]*)$/.test(endpoint)||endpoint.includes('..')||endpoint.includes('://'))throw new Error('API endpoint must be a relative GitHub API path');
 if(values.hostname && values.hostname!=='github.com')throw new Error('API requests are restricted to github.com');
 for(const key of ['field','raw-field']){const fields=Array.isArray(values[key])?values[key]:[values[key]];if(fields.some(f=>f!==undefined&&(typeof f!=='string'||! /^(?:[A-Za-z0-9_]+(?:\[[A-Za-z0-9_-]*\])*)=/.test(f))))throw new Error('API fields must use a structured name=value pair');}
 const headers=Array.isArray(values.header)?values.header:[values.header];
 if(headers.some(h=>h!==undefined&&(typeof h!=='string'||! /^[A-Za-z0-9-]+:\s*[^\r\n]*$/.test(h))))throw new Error('API headers must use a structured name: value pair');
 if(headers.some(h=>typeof h==='string'&& /^(authorization|host|proxy-authorization)\s*:/i.test(h)))throw new Error('Authentication and host headers are managed by GitHub CLI');
 }
 return this.executeAdapter(command.id,argv,{secrets,cwd});
 }
 /** Main-process adapters alone may call this method; never expose argv directly over IPC. */
 executeAdapter(commandId:string,argv:string[],options:{secrets?:string[];cwd?:string;executable?:string;timeoutMs?:number;hostname?:string}={}):Operation {
 if(typeof commandId!=='string'||!Array.isArray(argv)||argv.length>200||argv.some(value=>typeof value!=='string'||value.includes('\0')||value.length>65536))throw new Error('Invalid adapter arguments');
 if(options.hostname&&!/^[a-zA-Z0-9.-]+$/.test(options.hostname))throw new Error('Invalid adapter hostname');
 const cwd=realpathSync(options.cwd||this.cwd),root=realpathSync(this.cwd);
 if(cwd!==root&&!cwd.startsWith(root+path.sep))throw new Error('Working directory must remain within the workspace');
 const secrets=[...(options.secrets||[]),...Object.entries(process.env).filter(([key,value])=>/TOKEN|PASSWORD|SECRET/.test(key)&&value).map(([,value])=>value!)];
 const op:Operation={id:randomUUID(),status:'running',commandId,startedAt:new Date().toISOString(),stdout:'',stderr:''};
 this.operations.set(op.id,op);
 const env={...process.env,...(options.hostname?{GH_HOST:options.hostname}:{}),GH_PROMPT_DISABLED:'1',GH_PAGER:'cat',PAGER:'cat',GH_EDITOR:'',GIT_TERMINAL_PROMPT:'0',NO_COLOR:'1',GH_FORCE_TTY:'',GH_BROWSER:''};
 const child=spawn(options.executable||this.ghPath,argv,{cwd,env,shell:false,windowsHide:true,detached:process.platform!=='win32',stdio:['ignore','pipe','pipe']}); this.children.set(op.id,child);
 const redact=(value:string)=>new OutputRedactor(secrets).write(value,true);
 const buffers={stdout:'',stderr:''};const byteCounts={stdout:0,stderr:0};const capped={stdout:false,stderr:false};
 const streams={stdout:{decoder:new StringDecoder('utf8'),redactor:new OutputRedactor(secrets)},stderr:{decoder:new StringDecoder('utf8'),redactor:new OutputRedactor(secrets)}};
 const retain=(key:'stdout'|'stderr',value:string)=>{if(capped[key])return;const bytes=Buffer.from(value,'utf8');const available=Math.max(0,LIMIT-byteCounts[key]);if(bytes.length>available){op.truncated=true;capped[key]=true;value=new StringDecoder('utf8').write(bytes.subarray(0,available));}buffers[key]+=value;byteCounts[key]+=Buffer.byteLength(value,'utf8');op[key]=buffers[key];};
 const append=(key:'stdout'|'stderr',chunk:Buffer)=>{retain(key,streams[key].redactor.write(streams[key].decoder.write(chunk)));this.emit(op);};
 child.stdout?.on('data',chunk=>append('stdout',chunk));child.stderr?.on('data',chunk=>append('stderr',chunk));
 const timeout=setTimeout(()=>{if(op.status==='running'){retain('stderr','\nCommand exceeded the operation time limit.');this.cancel(op.id);}},Math.min(Math.max(options.timeoutMs||300000,1000),3600000));timeout.unref();
 const finish=(code:number|null,error?:Error)=>{clearTimeout(timeout);const killTimer=this.killTimers.get(op.id);if(killTimer)clearTimeout(killTimer);this.killTimers.delete(op.id);this.children.delete(op.id);if(op.endedAt)return;for(const key of ['stdout','stderr'] as const)retain(key,streams[key].redactor.write(streams[key].decoder.end(),true));if(op.status!=='cancelled')op.status=code===0&&!error?'succeeded':'failed';op.exitCode=code??undefined;op.endedAt=new Date().toISOString();if(error)retain('stderr',redact(error.message));if(op.status==='succeeded'){try{op.data=JSON.parse(op.stdout);}catch{/* Text output is valid. */}}this.emit(op);};
 child.on('error',error=>finish(null,error));child.on('close',code=>finish(code));this.emit(op);return structuredClone(op);
 }
}
