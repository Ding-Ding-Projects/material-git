export type HarnessProfileId='ollama-service'|'ollama-conservative'|'ollama-balanced';
export interface HarnessProfile {id:HarnessProfileId;name:string;reason:string;environment:Record<string,string>}
export const harnessProfiles:HarnessProfile[]=[
 {id:'ollama-conservative',name:'Conservative local service',reason:'Start with one request, one loaded model and a 2048-token context to reduce concurrent memory demand. Actual model memory remains unknown until verified.',environment:{OLLAMA_NUM_PARALLEL:'1',OLLAMA_MAX_LOADED_MODELS:'1',OLLAMA_CONTEXT_LENGTH:'2048',OLLAMA_KEEP_ALIVE:'2m'}},
 {id:'ollama-balanced',name:'Balanced local service',reason:'One request and one loaded model with a 4096-token context. Choose only after reviewing actual model and hardware evidence.',environment:{OLLAMA_NUM_PARALLEL:'1',OLLAMA_MAX_LOADED_MODELS:'1',OLLAMA_CONTEXT_LENGTH:'4096',OLLAMA_KEEP_ALIVE:'5m'}},
 {id:'ollama-service',name:'Runtime default local service',reason:'Retain runtime defaults for model scheduling and context. The app still binds the service to the local interface.',environment:{}}
];
export interface HarnessRuntimeReview {id:string;name:string;bytes:number;sha256:string;format:'ELF'|'PE';provenance:'Execution trust required';disclosures:string[]}
export interface HarnessRuntimeRegistration {name:string;bytes:number;sha256:string;version:string;approvedAt:string;provenance:'User-reviewed exact bytes'}
