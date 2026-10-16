export type BuildPurpose = 'build' | 'installer';
export interface BuildCommand { executable: string; args: string[]; cwd: string }
export interface BuildRecipe {
 id: string; name: string; adapter: string; purpose: BuildPurpose; commands: BuildCommand[];
 outputs: string[]; launch?: BuildCommand; version: string; platform: string; timeoutMs: number;
}
export interface BuildDiscovery { worktreeId: string; sourceRevision: string; adapters: string[]; recipes: BuildRecipe[]; notes: string[] }
export interface BuildPlan {
 id: string; worktreeId: string; recipe: BuildRecipe; sourceRevision: string; sourceFingerprint: string;
 commands: BuildCommand[]; launch?: BuildCommand; missingPrerequisites: string[]; expiresAt: number; warnings: string[];
}
export interface BuildArtifact { path: string; sha256: string; size: number }
export interface BuildJob {
 id: string; worktreeId: string; recipe: BuildRecipe; sourceRevision: string; sourceFingerprint: string;
 status: 'queued'|'running'|'succeeded'|'failed'|'cancelled'; phase: string; startedAt: string; endedAt?: string;
 output: string; exitCode?: number; error?: string; artifacts: BuildArtifact[]; installerIds: string[];
 launch?: {pid: number; status: 'running'|'exited'; exitCode?: number|null};
 repair?: {provider:'codex'|'opencode'; autoApprove:boolean; status:string};
}
export interface InstallerRecord {
 id: string; filename: string; sourceRevision: string; sourceFingerprint: string; recipe: BuildRecipe;
 platform: string; version: string; sha256: string; size: number; createdAt: string;
 status: 'verified'|'missing'|'changed';
}
export interface ArtifactReview { id: string; action:'delete'|'open'|'install'; records: InstallerRecord[]; expiresAt:number }
export type BuildToolsRequest =
 | {action:'discover'; worktreeId:string}
 | {action:'recipes';worktreeId:string} | {action:'save-recipe';worktreeId:string;recipe:BuildRecipe} | {action:'delete-recipe';worktreeId:string;recipeId:string}
 | {action:'pick-executable'}
 | {action:'review'; worktreeId:string; recipe:BuildRecipe; run:boolean}
 | {action:'start'; reviewId:string; trustExecution:boolean}
 | {action:'jobs'} | {action:'cancel'; jobId:string} | {action:'installers'}
 | {action:'export'; ids:string[]}
 | {action:'artifact-review'; ids:string[]; operation:'delete'|'open'|'install'}
 | {action:'artifact-apply'; reviewId:string}
 | {action:'reveal'; id:string}
 | {action:'repair'; jobId:string; provider:'codex'|'opencode'; autoApprove:boolean; trustExecution:boolean};
export interface BuildToolsResponse {
 discovery?:BuildDiscovery; executable?:string|null; plan?:BuildPlan; job?:BuildJob; jobs?:BuildJob[];
 installers?:InstallerRecord[]; review?:ArtifactReview; exported?:string[]; cancelled?:boolean; message?:string;
 recipes?:BuildRecipe[];
}
export type BuildToolsAPI = (request:BuildToolsRequest)=>Promise<BuildToolsResponse>;
