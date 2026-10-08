export interface SourceQuery {query:string;regex:boolean;pattern:string;flags:string}
export interface SourceEntry {id:string;ordinal:number;name:string;bytes:number}
export interface SourceDiscovery {id:string;version:string;name:string;state:'paused'|'scanning'|'complete'|'cancelled'|'failed';indexed:number;skipped:number;error?:string}
export interface SourcePage {discovery:SourceDiscovery;items:SourceEntry[];page:number;hasNext:boolean;matched:number;query:SourceQuery;nextCursor?:string}
export type SourceScope={kind:'all';excluded?:string[]}|{kind:'range';from:number;to:number}|{kind:'selected';ids:string[]};
import type {ConverterOptions} from './bundled-engines';
export interface SourceReview {id:string;discovery:string;version:string;count:number;adapter:string;options:ConverterOptions;destinationName:string;preview:string[];scope:SourceScope;query:SourceQuery;disclosures:string[]}
export interface SourceAdmission {id:string;status:'running'|'paused'|'completed'|'cancelled'|'failed';admitted:number;failed:number;skipped:number;total:number;error?:string}

export interface SourceAdmissionOutcome {id:string;ordinal:number;source:string;status:'pending'|'queued'|'failed';error?:string}
export interface SourceAdmissionPage {items:SourceAdmissionOutcome[];page:number;hasNext:boolean}
