/** Reviewed repository completion. Native paths and executable arguments are never accepted from the renderer. */
export type RepositoryFinishAction = 'prepare' | 'review' | 'start' | 'status' | 'cancel' | 'resume';
export interface FinishWorktree {
    id: string;
    root: string;
    branch: string;
    head: string;
    dirty: boolean;
    locked: boolean;
    active: boolean;
    files: {
        path: string;
        status: string;
        bytes: number;
    }[];
    ignoredCount: number;
    diff: string;
    fingerprint: string;
}
export interface FinishBranch {
    ref: string;
    head: string;
    worktreeId?: string;
}
export interface FinishRepository {
    worktreeId: string;
    name: string;
    root: string;
    commonDir: string;
    fingerprint: string;
    remote: string;
    remoteUrl: string;
    defaultBranch: string;
    remoteDefaultHead: string;
    transportFingerprint:string;
    transportTrusted:boolean;
    identity: string;
    trust: string[];
    branches: FinishBranch[];
    worktrees: FinishWorktree[];
    stashes: {
        ref: string;
        head: string;
        subject: string;
    }[];
    blockers: string[];
}
export interface FinishContribution {
    ref: string;
    commitMessage: string;
    integrate: boolean;
    cleanup: boolean;
    owned: boolean;
    inactive: boolean;
    ignoredFilesRebuildable: boolean;
}
export interface FinishSelection {
    transportFingerprint:string;
    worktreeId: string;
    fingerprint: string;
    remote: string;
    defaultBranch: string;
    trustPrograms: boolean;
    contributions: FinishContribution[];
}
export interface FinishReview {
    id: string;
    expiresAt: string;
    repositories: FinishRepository[];
    selections: FinishSelection[];
    steps: string[];
    warnings: string[];
}
export type FinishJobState = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'interrupted';
export interface FinishEvent {
    at: string;
    step: string;
    state: 'attempted' | 'completed' | 'retained' | 'failed';
    detail: string;
}
export interface FinishJob {
    id: string;
    worktreeId: string;
    name: string;
    root: string;
    state: FinishJobState;
    step: string;
    attemptedWrites: boolean;
    partialEffects: boolean;
    error: string;
    events: FinishEvent[];
    archive?: {
        path: string;
        entries: number;
        bytes: number;
        digest: string;
    };
    integrationPath?: string;
}
export interface FinishBatch {
    id: string;
    reviewId: string;
    createdAt: string;
    state: 'running' | 'completed';
    concurrency: number;
    jobs: FinishJob[];
}
export interface RepositoryFinishPayload {
    worktreeIds?: string[];
    selections?: FinishSelection[];
    reviewId?: string;
    batchId?: string;
    jobId?: string;
    confirmed?: boolean;
    concurrency?: number;
}
export type RepositoryFinishResponse = {
    kind: 'prepared';
    repositories: FinishRepository[];
} | {
    kind: 'review';
    review: FinishReview;
} | {
    kind: 'batch';
    batch: FinishBatch;
} | {
    kind: 'batches';
    batches: FinishBatch[];
};
export interface RepositoryFinishBridge {
    repositoryFinish(action: RepositoryFinishAction, payload?: RepositoryFinishPayload): Promise<RepositoryFinishResponse>;
}
