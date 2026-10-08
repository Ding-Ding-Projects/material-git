/** Public contract for the dedicated GitHub CLI configuration channel. */
/** 'global' or an exact native-approved hostname; validated in the privileged service. */
export type CliConfigScope = string;
export type CliConfigKey = 'api_host' | 'git_protocol' | 'editor' | 'prompt' | 'prefer_editor_prompt' | 'pager' | 'http_unix_socket' | 'browser' | 'clipboard' | 'color_labels' | 'accessible_colors' | 'accessible_prompter' | 'spinner' | 'telemetry';
export interface CliConfigDefinition {
 key: CliConfigKey; label: string; group: string; description: string;
 kind: 'choice' | 'executable' | 'unavailable'; choices?: string[]; defaultValue: string;
 environment: string[]; available: boolean; unavailableReason?: string;
 scopes?:CliConfigScope[]; scopeReason?:string;
 filePicker?: {kind:'executable'; title:string; argumentsSupported:false};
}
export const CLI_CONFIG_DEFINITIONS: CliConfigDefinition[] = [
 {key:'git_protocol',label:'Git transport',group:'Git and connections',description:'Choose HTTPS or SSH for clone and push operations. SSH needs a working SSH key. This applies to every account on the selected host.',kind:'choice',choices:['https','ssh'],defaultValue:'https',environment:[],available:true},
 {key:'api_host',label:'API hostname override',group:'Git and connections',description:'Experimental API routing can send authenticated requests to another hostname. The CLI says this is not a security boundary.',kind:'unavailable',defaultValue:'',environment:[],available:false,unavailableReason:'Custom API routing requires a reviewed connection adapter. Approved host selection does not enable custom API routing.'},
 {key:'http_unix_socket',label:'HTTP Unix socket',group:'Git and connections',description:'Route HTTP requests through a local Unix socket.',kind:'unavailable',defaultValue:'',environment:[],available:false,unavailableReason:'A platform-specific socket and connection adapter is required. No socket path editor is available.'},
 {key:'editor',label:'Text editor',group:'External applications',description:'The program GitHub CLI uses to author text. Select an executable without extra arguments. Existing command strings remain hidden.',kind:'executable',defaultValue:'',environment:['GH_EDITOR','GIT_EDITOR','VISUAL','EDITOR'],available:true,filePicker:{kind:'executable',title:'Choose a text editor executable',argumentsSupported:false}},
 {key:'browser',label:'Web browser',group:'External applications',description:'The browser GitHub CLI uses to open links. Material Git links continue through its own approved link workflow.',kind:'executable',defaultValue:'',environment:['GH_BROWSER','BROWSER'],available:true,filePicker:{kind:'executable',title:'Choose a web browser executable',argumentsSupported:false}},
 {key:'pager',label:'Terminal pager',group:'External applications',description:'The program used to page CLI output in a terminal. The guided desktop runner captures output directly, so it does not use this setting.',kind:'executable',defaultValue:'',environment:['GH_PAGER','PAGER'],available:true,filePicker:{kind:'executable',title:'Choose a terminal pager executable',argumentsSupported:false}},
 {key:'prompt',label:'Terminal questions',group:'Prompts and clipboard',description:'Allow the CLI to ask interactive questions in a terminal. Material Git supplies structured inputs and disables terminal prompts for its guided commands.',kind:'choice',choices:['enabled','disabled'],defaultValue:'enabled',environment:['GH_PROMPT_DISABLED'],available:true},
 {key:'prefer_editor_prompt',label:'Prefer editor prompts',group:'Prompts and clipboard',description:'Prefer the editor when a terminal workflow asks for text. Requires a usable editor program.',kind:'choice',choices:['enabled','disabled'],defaultValue:'disabled',environment:[],available:true},
 {key:'clipboard',label:'Copy device sign-in codes',group:'Prompts and clipboard',description:'Allow the CLI to copy one-time OAuth device codes. The Accounts screen controls its own sign-in flow separately.',kind:'choice',choices:['enabled','disabled'],defaultValue:'enabled',environment:[],available:true,scopes:['global'],scopeReason:'The native CLI only permits clipboard changes at Global scope.'},
 {key:'color_labels',label:'True-color labels',group:'Accessibility and terminal display',description:'Show labels in their RGB colors when the terminal supports true color.',kind:'choice',choices:['enabled','disabled'],defaultValue:'disabled',environment:['GH_COLOR_LABELS'],available:true},
 {key:'accessible_colors',label:'Accessible terminal colors',group:'Accessibility and terminal display',description:'Use customizable 4-bit accessible colors. This CLI capability is a preview and does not change Material Git’s theme.',kind:'choice',choices:['enabled','disabled'],defaultValue:'disabled',environment:['GH_ACCESSIBLE_COLORS'],available:true},
 {key:'accessible_prompter',label:'Accessible terminal prompts',group:'Accessibility and terminal display',description:'Use terminal prompts compatible with speech synthesis and braille readers. This capability is a preview.',kind:'choice',choices:['enabled','disabled'],defaultValue:'disabled',environment:['GH_ACCESSIBLE_PROMPTER'],available:true},
 {key:'spinner',label:'Animated terminal progress',group:'Accessibility and terminal display',description:'Use a spinner for terminal progress. Disable it for a textual progress indicator. Desktop progress controls are independent.',kind:'choice',choices:['enabled','disabled'],defaultValue:'enabled',environment:['GH_SPINNER_DISABLED'],available:true},
 {key:'telemetry',label:'GitHub CLI telemetry',group:'Privacy',description:'Enabled sends CLI telemetry, disabled stops it, and log writes telemetry to standard error. Environment settings can override this choice.',kind:'choice',choices:['enabled','disabled','log'],defaultValue:'enabled',environment:['GH_TELEMETRY','DO_NOT_TRACK'],available:true,scopes:['global'],scopeReason:'CLI 2.102.0 reads telemetry globally at runtime. A stored host value would not control telemetry; use Global.'},
];
export interface CliConfigValue {
 key:CliConfigKey; value:string; globalValue:string; hostValue:string;
 origin:'cli-resolved'; hostRelation:'different-from-global'|'same-as-global';
 environmentSource?:string; configuredCommandHidden?:boolean;
}
export interface CliEnvironmentEntry {names:string[]; description:string; sensitive:boolean; presentNames:string[]; precedence:string;}
export interface CliFeatureReference {id:string; title:string; description:string; status:'reference'|'guided'|'adapter-required';}
export interface CliReference {
 version:string; source:string; globalFlags:{name:string;description:string}[];
 helpTopics:{id:string;summary:string;help:string}[]; environment:CliEnvironmentEntry[];
 capabilities:CliFeatureReference[]; coverage:{catalogLeaves:number;catalogGuided:number;catalogExcluded:number;configKeys:number;guidedConfigKeys:number};
 commands:{id:string;summary:string;status:'catalog-guided'|'adapter-required';availability?:string;options:number;arguments:number}[];
}
export interface CliConfigSnapshot {
 kind:'snapshot'; version:string; scope:CliConfigScope; hostname:string; scopes:CliConfigScope[]; definitions:CliConfigDefinition[];
 values:CliConfigValue[]; environment:CliEnvironmentEntry[]; notes:string[];
 reset:{supported:false; reason:string};
}
export interface CliConfigChange {key:CliConfigKey;mode:'set'|'default';value?:string;}
export interface CliConfigReview {
 kind:'review'; reviewId:string; scope:CliConfigScope; hostname:string; expiresAt:string;
 changes:{key:CliConfigKey;label:string;before:string;after:string;environmentSource?:string}[];
 notes:string[];
}
export type CliConfigAction = 'snapshot' | 'review' | 'apply' | 'choose-executable' | 'reference';
export interface CliConfigPayload {scope?:CliConfigScope;changes?:CliConfigChange[];reviewId?:string;confirmed?:boolean;key?:CliConfigKey;}
export type CliConfigResponse = CliConfigSnapshot | CliConfigReview | {kind:'mutation';snapshot:CliConfigSnapshot;message:string} | {kind:'executable';key:CliConfigKey;value:string|null} | {kind:'reference';reference:CliReference};
export interface CliConfigBridge {cliConfig(action:CliConfigAction,payload?:CliConfigPayload):Promise<CliConfigResponse>;}
