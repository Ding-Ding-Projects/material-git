/** Privileged local tools use opaque IDs; filesystem paths never cross this bridge. */
export type LocalToolsAction = 'converter-catalog'|'converter-pick'|'converter-inspect'|'converter-start'|'converter-enqueue'|'converter-queue'|'converter-pause'|'converter-resume'|'converter-status'|'converter-cancel'|'catalog-status'|'catalog-refresh'|'catalog-page'|'hardware'|'pull-review'|'pull-start'|'pull-status'|'pull-cancel'|'pull-retry'|'sessions'|'session-create'|'session-rename'|'session-delete'|'session-export'|'chat-start'|'chat-status'|'chat-cancel'|'harness-preflight'|'harness-launch'|'harness-status'|'harness-restore';
export type LocalToolsPayload = Record<string, unknown>;
export type LocalToolsResponse = unknown;
export type ConverterCategory = 'Documents/PDF'|'Images'|'Audio'|'Video'|'Archives'|'Structured Data/Spreadsheets'|'Code/Text'|'Binary Encodings';
export interface ConverterAdapter {id:string;name:string;category:ConverterCategory;sourceTypes:string[];target:string;bundled:boolean;enabled:boolean;proof:string;reason?:string;disclosure:string;limitBytes:number;validator:string}
export interface FileGrant {id:string;name:string;bytes:number;type:string;preview:string;compatible:string[]}
export interface ConverterResult {id:string;source:string;adapter:string;status:'queued'|'paused'|'running'|'converted'|'cancelled'|'failed';outputName?:string;outputNames?:string[];bytes?:number;error?:string;details?:Record<string,unknown>;disclosures?:string[]}
export interface CatalogVariant {tag:string;family:string;bytes?:number;context?:number;parameterCount?:number;quantization?:string;kvBytesPerToken?:number;capabilities:string[];digest?:string;source:string}
export interface CatalogStatus {state:'empty'|'refreshing'|'ready'|'offline'|'failed';complete:boolean;at?:string;lastSuccess?:string;pages:number;families:number;variants:number;revision?:string;error?:string}
export interface HardwareEvidence {at:string;ram:number;freeRam:number;cpu:string;cpuCores:number;architecture:string;diskFree?:number;gpu:{status:'unknown'|'verified';name?:string;vram?:number;backend?:string;reason:string}}
export interface FitEvidence {verdict:'Runs well'|'Runs with limits'|'Unlikely'|'Unknown';at:string;evidence:string[]}
export interface PullItem {id:string;tag:string;status:'queued'|'pulling'|'pulled'|'skipped'|'cancelled'|'failed';completed?:number;total?:number;digest?:string;message?:string;error?:string}
export interface ChatMessage {role:'system'|'user'|'assistant';content:string}
export interface ChatSession {id:string;name:string;model:string;at:string;system:string;messages:ChatMessage[]}
export interface ChatRun {id:string;session:string;status:'running'|'succeeded'|'cancelled'|'failed';content:string;error?:string;tokens?:number}
export interface HarnessState {id:string;state:'review'|'starting'|'ready'|'exited'|'failed'|'restored';profile:'ollama-service';executable:string;arguments:string[];environmentKeys:string[];blockers:string[];snapshot?:string;message?:string}
