import {execFile} from 'node:child_process';
import {createChoiceSource} from './choices';

export function runGh(binary:string,args:string[],cwd:string):Promise<string>{return new Promise((resolve,reject)=>execFile(binary,args,{cwd,timeout:25000,maxBuffer:4*1024*1024,windowsHide:true,env:{...process.env,GH_PROMPT_DISABLED:'1',GH_PAGER:'cat',NO_COLOR:'1'}},(error,out,err)=>error?reject(new Error(String(err).replace(/(?:gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+)/g,'[REDACTED]').slice(0,1500)||'GitHub operation failed')):resolve(out)));}
export function repositoryPath(value:unknown):string {if(typeof value!=='string'||! /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value))throw new Error('Choose an owner/repository first');return value;}
export const listChoices=createChoiceSource(runGh);
export async function ollamaRequest(action:string,payload:Record<string,unknown>={}):Promise<unknown>{
 const routes:Record<string,{method:string;path:string}>= {health:{method:'GET',path:'/api/version'},models:{method:'GET',path:'/api/tags'},running:{method:'GET',path:'/api/ps'},chat:{method:'POST',path:'/api/chat'},show:{method:'POST',path:'/api/show'},pull:{method:'POST',path:'/api/pull'},delete:{method:'DELETE',path:'/api/delete'},copy:{method:'POST',path:'/api/copy'}};
 const route=routes[action];if(!route)throw new Error('Unknown local model operation');
 if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new Error('Invalid local model request');
 const encoded=JSON.stringify(payload);if(encoded.length>256000)throw new Error('Local model request is too large');
 const allowed=new Set(['model','messages','options','source','destination','name','confirmed']);for(const key of Object.keys(payload))if(!allowed.has(key))throw new Error('Unknown local model field');
 if(action==='delete'&&payload.confirmed!==true)throw new Error('Confirm deleting the local model');
 if(['chat','show','pull','delete'].includes(action)&&(typeof payload.model!=='string'||! /^[A-Za-z0-9_./:-]{1,200}$/.test(payload.model)))throw new Error('Choose a model');
 if(action==='chat'&&(!Array.isArray(payload.messages)||payload.messages.length>100||payload.messages.some((m:any)=>!m||!['user','assistant','system'].includes(m.role)||typeof m.content!=='string'||m.content.length>64000)))throw new Error('Invalid chat messages');
 try{
  const {confirmed,...body}=payload;
  const response=await fetch('http://127.0.0.1:11434'+route.path,{method:route.method,redirect:'error',signal:AbortSignal.timeout(action==='chat'||action==='pull'?120000:8000),headers:{'Content-Type':'application/json'},...(route.method==='GET'?{}:{body:JSON.stringify({...body,stream:false})})});
  if(!response.ok)throw new Error(`Local Ollama returned HTTP ${response.status}`);
  const reader=response.body?.getReader();let text='',size=0;const decoder=new TextDecoder();if(reader)while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4*1024*1024){await reader.cancel();throw new Error('Local model response is too large');}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();
  const result=JSON.parse(text);return action==='health'?{available:true,...result}:result;
 }catch(error){if(action==='health')return {available:false,error:'Ollama is not reachable at 127.0.0.1:11434. Start the local Ollama service and retry.'};throw error;}
}
