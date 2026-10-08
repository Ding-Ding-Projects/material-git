export type ControlKind = 'text' | 'multiline' | 'boolean' | 'number' | 'choice' | 'multi-choice' | 'file' | 'directory' | 'entity' | 'secret';
export interface CommandOption {
  name: string; description: string; type: ControlKind; required?: boolean;
  multiple?: boolean; choices?: string[]; default?: string | number | boolean;
  entity?: string; minimum?: number; maximum?: number;
}
export interface CommandArgument extends CommandOption { position: number }
export interface CommandDefinition {
  id: string; path: string[]; title: string; summary: string; description: string;
  usage: string; group: string; options: CommandOption[]; arguments: CommandArgument[];
  destructive: boolean; mutation: boolean; interactive?: boolean;
  availability?: string; jsonFields?: string[];
}
export interface Catalog {
  version: string; generatedAt: string; source: string; commands: CommandDefinition[];
}
export interface Choice { value: string; label: string; detail?: string }
export interface ExecutionRequest {
  commandId: string; values: Record<string, unknown>; args: Record<string, unknown>;
  repository?: string; cwd?: string; confirmed?: boolean;
}
export interface Operation {
  id: string; status: 'running' | 'succeeded' | 'failed' | 'cancelled';
  commandId: string; startedAt: string; endedAt?: string; exitCode?: number;
  stdout: string; stderr: string; data?: unknown; truncated?: boolean;
}
export interface AppSettings {
  language: 'en' | 'yue' | 'both'; theme: 'dark' | 'light' | 'system'; seed: string;
  density: 'comfortable' | 'compact'; fontScale: number; fontFamily: string;
  motion: boolean; englishHumor: number; cantoneseHumor: number; emojis: boolean;
  displayName: string; narrator: boolean; narrationLanguage: 'en' | 'yue' | 'both';
  englishVoice: string; cantoneseVoice: string; speechRate: number; speechPitch: number;
  focus: boolean; lowStimulation: boolean; timeAwareness: boolean;
  oneThing: boolean; momentum: boolean; currentTask: string;
}
export interface Bootstrap {
  persistedSettingsKeys?:string[]; preferencesAdvanced?:import('./preferences-advanced').PreferenceStatus;
  catalog: Catalog; settings: AppSettings; version: string; builtAt: string | null;
  platform: string; ghVersion: string | null; authenticated: boolean;
  account: string | null; repository: string | null; operations: Operation[];
}
export interface HistoryEntry { id: string; at: string; action: string; snapshot?: AppSettings }
export type AuthAction = 'status' | 'login' | 'refresh' | 'setup-git' | 'cancel' | 'switch' | 'logout' | 'copy-token' | 'register-host';
export interface AuthAccount {
  host: string; login: string; active: boolean; state: string;
  scopes: string[]; gitProtocol: string; tokenSource: 'environment' | 'credential-store' | 'config-file' | 'unknown';
}
export interface AuthPayload { hostname?: string; login?: string; scopes?: string[]; removeScopes?: string[]; resetScopes?: boolean; confirmed?: boolean; reviewedHostname?: string; clipboardConsent?: boolean }
export interface AuthState {
  status: 'idle' | 'checking' | 'starting' | 'waiting' | 'authenticated' | 'failed' | 'cancelled';
  accounts: AuthAccount[]; allowedHosts: string[]; allowedScopes: string[];
  hostname?: string; deviceCode?: string; verificationUrl?: string; message?: string; error?: string; tokenCopyAvailable?: boolean; hostRegistrationAvailable?: boolean;
}
export interface MaterialBridge {
  workspace(action:import('./workspace').WorkspaceAction,payload?:unknown):Promise<import('./workspace').WorkspaceResponse>;
  cliWorkflows(action:import('./cli-workflows').CliWorkflowAction,payload?:import('./cli-workflows').CliWorkflowPayload):Promise<import('./cli-workflows').CliWorkflowResponse>;
  localTools(action:import('./local-tools').LocalToolsAction,payload?:import('./local-tools').LocalToolsPayload):Promise<import('./local-tools').LocalToolsResponse>;
  preferencesAdvanced(action:import('./preferences-advanced').PreferenceAction,payload?:unknown):Promise<import('./preferences-advanced').PreferenceStatus>;
  onPreferencesAdvanced(callback:(status:import('./preferences-advanced').PreferenceStatus)=>void):()=>void;
  api(action:'hosts'|'catalogue'|'describe'|'execute'|'graphqlCatalogue'|'graphqlDescribe'|'graphqlBuild'|'graphqlExecute'|'pick-body-file',payload?:unknown):Promise<unknown>;
  cliConfig(action:import('./cli-config').CliConfigAction,payload?:import('./cli-config').CliConfigPayload):Promise<import('./cli-config').CliConfigResponse>;
  onCloseRequested(callback:()=>void):()=>void;
  security(action:string,payload?:Record<string,unknown>):Promise<unknown>;
  onSecurity(callback:(status:import('./security').SecurityStatus)=>void):()=>void;
  updates(action: 'status' | 'check' | 'restart'): Promise<{phase:string;message?:string;version?:string;currentVersion:string;releaseNotesUrl:string;unsigned:true}>;
  onUpdate(callback:(state:{phase:string;message?:string;version?:string;currentVersion:string;releaseNotesUrl:string;unsigned:true})=>void):()=>void;
  bootstrap(): Promise<Bootstrap>;
  auth(action: AuthAction, payload?: AuthPayload): Promise<AuthState>;
  onAuth(callback: (state: AuthState) => void): () => void;
  execute(request: ExecutionRequest): Promise<Operation>;
  cancel(id: string): Promise<void>;
  operation(id: string): Promise<Operation>;
  choices(entity: string, context: { repository?: string; query?: string; page?: number }): Promise<{items: Choice[]; hasNext: boolean;searchMode?:'remote'|'page-filter';notice?:string}>;
  pick(kind: 'file' | 'directory', options?: {extensions?: string[]; multiple?: boolean}): Promise<string[]>;
  settings(patch: Partial<AppSettings>): Promise<AppSettings>;
  history(): Promise<HistoryEntry[]>;
  exportData(data: unknown, format: 'json' | 'csv' | 'md' | 'txt'): Promise<boolean>;
  vocabulary(action: 'import' | 'clear' | 'status'): Promise<{loaded: boolean; entries?: Record<string, string>}>;
  openExternal(url: string): Promise<void>;
  window(action: 'minimize' | 'maximize' | 'close' | 'confirm-close'): Promise<void>;
  ollama(action: string, payload?: Record<string, unknown>): Promise<unknown>;
  onOperation(callback: (operation: Operation) => void): () => void;
}
declare global { interface Window { material: MaterialBridge } }
