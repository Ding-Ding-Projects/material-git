import {execFile} from 'node:child_process';
import {createChoiceSource} from './choices';
import {localApi} from './ollama-manager';

export function runGh(binary:string,args:string[],cwd:string):Promise<string>{return new Promise((resolve,reject)=>execFile(binary,args,{cwd,timeout:25000,maxBuffer:4*1024*1024,windowsHide:true,env:{...process.env,GH_PROMPT_DISABLED:'1',GH_PAGER:'cat',NO_COLOR:'1'}},(error,out,err)=>error?reject(new Error(String(err).replace(/(?:gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+)/g,'[REDACTED]').slice(0,1500)||'GitHub operation failed')):resolve(out)));}
export function repositoryPath(value:unknown):string {if(typeof value!=='string'||! /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value))throw new Error('Choose an owner/repository first');return value;}
export const listChoices=createChoiceSource(runGh);
export async function ollamaRequest(action:string,payload:Record<string,unknown>={}):Promise<unknown>{
 const allowed=['health','models','running','show','copy','delete'] as const;
 if(!allowed.includes(action as typeof allowed[number]))throw new Error('Use the durable local tools manager for streaming chat and model downloads');
 return localApi(action as typeof allowed[number],payload);
}
