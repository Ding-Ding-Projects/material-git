export type EngineKind='worker'|'ffmpeg'|'archive';
export interface EngineStatus{kind:EngineKind;available:boolean;proof?:string;reason?:string;version?:string}
export interface ConverterOptions{pages?:number[];rotation?:0|90|180|270;metadata?:{title?:string;author?:string;subject?:string;keywords?:string[]};quality?:number;compression?:'store'|'deflate'|'lzma2';level?:number;dictionaryMiB?:number;solid?:boolean;threads?:number;volumeMiB?:number;encryption?:'none'|'content'|'content-and-headers';password?:string;sourceFormat?:'json'|'jsonl'|'yaml'|'xml'|'csv'|'tsv';table?:string}
export interface EngineOutput{suffix:string;bytes:Uint8Array}
export interface EngineResult{outputs:EngineOutput[];details?:Record<string,unknown>;disclosures:string[]}
export interface EngineRequest{adapter:string;inputs:Array<{name:string;bytes:Uint8Array}>;options:ConverterOptions}
export interface BundledEngineFacade{status():Promise<EngineStatus[]>;convert(request:EngineRequest,signal:AbortSignal):Promise<EngineResult>}
