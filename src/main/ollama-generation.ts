import {mkdir,readFile,stat,opendir} from 'node:fs/promises';import {join} from 'node:path';import {randomUUID} from 'node:crypto';
import {atomicJson,validateModel,redactExport} from './ollama-manager';
import type {GenerationRun,ModelCapabilities} from '../shared/local-tools';
type Stream=(body:unknown,signal:AbortSignal,onRecord:(record:Record<string,unknown>)=>Promise<void>)=>Promise<void>;
/** Documented generate API, with finite prompts/outputs and durable private response records. */
export class OllamaGeneration {
 private active?:{run:GenerationRun;controller:AbortController};private admission=false;private admissionController?:AbortController;
 constructor(private directory:string,private capabilities:(model:string)=>Promise<ModelCapabilities>,private stream:Stream){ }
 activeJobs(){return this.admission||!!this.active;}
 cancelAll(){this.admissionController?.abort();this.active?.controller.abort();}
 private key(value:unknown){if(typeof value!=='string'||!/^[a-f0-9-]{36}$/.test(value))throw new Error('Invalid generation identifier');return value;}
 async start(payload:Record<string,unknown>){
  if(this.activeJobs())throw new Error('Only one local generation can run at a time');this.admission=true;const controller=new AbortController();this.admissionController=controller;
  try{const model=validateModel(payload.model),prompt=String(payload.prompt??''),system=String(payload.system??'');
   if(!prompt.trim()||prompt.length>16000||system.length>16000)throw new Error('Generation prompt/system must be at most 16,000 characters, with a nonempty prompt');
   const temperature=Number(payload.temperature??.7),tokens=Number(payload.tokens??1024),context=Number(payload.context??4096);
   if(!Number.isFinite(temperature)||temperature<0||temperature>2||!Number.isInteger(tokens)||tokens<1||tokens>8192||!Number.isInteger(context)||context<512||context>32768)throw new Error('Generation parameters are outside supported bounds');
   const metadata=await this.capabilities(model);if(!metadata.capabilities.includes('completion'))throw new Error('Installed model did not report completion support. Choose a completion model in Installed models.');
   if(metadata.context&&context>metadata.context)throw new Error('Selected context exceeds the installed model reported context length');
   if(controller.signal.aborted)throw new Error('Generation admission cancelled');const run:GenerationRun={id:randomUUID(),model,at:new Date().toISOString(),status:'running',content:''};await mkdir(this.directory,{recursive:true,mode:0o700});await atomicJson(join(this.directory,run.id+'.json'),run);this.active={run,controller};
   void this.execute(run,controller,{model,prompt,system,stream:true,options:{temperature,num_predict:tokens,num_ctx:context}});return {...run};
  }finally{this.admission=false;this.admissionController=undefined;}
 }
 private async execute(run:GenerationRun,controller:AbortController,body:unknown){let done=false,lastSaved=0;try{
  await this.stream(body,controller.signal,async record=>{if(record.error)throw new Error(String(record.error).slice(0,500));if(typeof record.response==='string'){if(run.content.length+record.response.length>128000)throw new Error('Generation response exceeded 128,000-character limit');run.content+=record.response;}
   if(record.done===true){done=true;if(Number.isSafeInteger(record.eval_count)&&Number(record.eval_count)>=0)run.tokens=Number(record.eval_count);}
   if(Date.now()-lastSaved>=750){await atomicJson(join(this.directory,run.id+'.json'),run);lastSaved=Date.now();}
  });if(!done)throw new Error('Generation stream ended before documented completion');run.status='succeeded';
 }catch(error){run.status=controller.signal.aborted?'cancelled':'failed';run.error=redactExport(error instanceof Error?error.message:'Generation failed');}
 finally{try{await atomicJson(join(this.directory,run.id+'.json'),run);}catch{run.status='failed';run.error='Generation response could not be saved locally';}this.active=undefined;}}
 async status(payload:Record<string,unknown>){const id=this.key(payload.id);if(this.active?.run.id===id)return {...this.active.run};const file=join(this.directory,id+'.json');if((await stat(file)).size>1024*1024)throw new Error('Saved generation exceeds its byte limit');const run=JSON.parse(await readFile(file,'utf8'))as GenerationRun;if(run.id!==id||typeof run.content!=='string'||run.content.length>128000||typeof run.at!=='string'||!['running','succeeded','cancelled','failed'].includes(run.status))throw new Error('Invalid saved generation');validateModel(run.model);if(run.status==='running'){run.status='failed';run.error='Application restarted during generation. Partial response is preserved; select an installed model to generate again.';await atomicJson(file,run);}return run;}
 async cancel(payload:Record<string,unknown>){const id=this.key(payload.id);if(this.active?.run.id!==id)throw new Error('Generation is no longer active');this.active.controller.abort();return {cancelRequested:true};}
 async history(payload:Record<string,unknown>){const page=Number(payload.page??1);if(!Number.isInteger(page)||page<1||page>1000000)throw new Error('Invalid generation history page');await mkdir(this.directory,{recursive:true,mode:0o700});const items:GenerationRun[]=[];let count=0,hasNext=false;for await(const entry of await opendir(this.directory)){if(!/^[a-f0-9-]{36}\.json$/.test(entry.name))continue;if(count++<(page-1)*40)continue;if(items.length===40){hasNext=true;break;}items.push({...await this.status({id:entry.name.slice(0,-5)}),content:''});}return {items,page,hasNext};}
}
