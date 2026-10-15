export type CheapLfsProvider = 'release' | 'ghcr' | 'docker-hub';
export interface CheapLfsSettings {
    provider: CheapLfsProvider;
    releaseTag: string;
    autoPin: boolean;
    parallel: boolean;
    autoRestore: boolean;
    encrypt: boolean;
    encryptionAcknowledged: boolean;
    privateCompression: boolean;
}
export interface CheapLfsFile {
    path: string;
    provider: CheapLfsProvider | 'unmanaged';
    size: number;
    sha256: string | null;
    state: 'pointer' | 'materialized' | 'modified' | 'unmanaged';
    encrypted: boolean;
    compressed: boolean;
}
export interface CheapLfsInventory {
    kind: 'inventory';
    worktreeId: string;
    repository: string;
    visibility: 'public' | 'private' | 'unknown';
    providerAvailable?:boolean;
    providerNotice?:string;
    files: CheapLfsFile[];
    settings: CheapLfsSettings;
    vaultAvailable: boolean;
    orasAvailable: boolean;
}
export type CheapLfsTask = 'pin' | 'restore' | 'remove' | 'manual-upload' | 'compression';
export interface CheapLfsReview {
    kind: 'review';
    reviewId: string;
    worktreeId: string;
    task: CheapLfsTask;
    paths: string[];
    provider: CheapLfsProvider;
    repository: string;
    bytes: number;
    warnings: string[];
    expiresAt: string;
    requiresPassword: boolean;
}
export interface CheapLfsResult {
    kind: 'result';
    operationId: string;
    succeeded: string[];
    failures: {
        path: string;
        reason: string;
    }[];
    cancelled: boolean;
    message: string;
    requiredCommitPaths?: string[];
    builder?: {
        name: string;
        projectId: string;
        secrets: string[];
    };
}
export interface CheapLfsProgress {
    operationId: string;
    worktreeId: string;
    phase: string;
    path: string | null;
    completedBytes: number;
    totalBytes: number;
    completedFiles: number;
    totalFiles: number;
    detail?: unknown;
}
export type CheapLfsAction = 'recovery-inventory' | 'ignored-inventory' | 'ignored-review' | 'ignored-apply' | 'registry-credentials' | 'choose-files' | 'inspect' | 'settings' | 'review' | 'apply' | 'cancel' | 'forget-password';
export interface CheapLfsPayload {
    worktreeId?: string;
    operationId?: string;
    task?: CheapLfsTask;
    paths?: string[];
    reviewId?: string;
    confirmed?: boolean;
    settings?: CheapLfsSettings;
    password?: string;
    savePassword?: boolean;
    username?: string;
    destination?: string;
    passwordConfirmation?: string;
}
export interface CheapLfsIgnoredInventory {
    kind: 'ignored-inventory';
    files: {
        path: string;
        size: number;
        pattern: string;
    }[];
    truncated: boolean;
    recoveries: {
        directory: string;
        files: number;
        createdAt: string;
    }[];
}
export interface CheapLfsIgnoredReview {
    kind: 'ignored-review';
    reviewId: string;
    destination: string;
    paths: string[];
    bytes: number;
}
export type CheapLfsResponse = {kind:'recovery-inventory';recoveries:{path:string;backupPath:string;size:number;sha256:string}[]} | CheapLfsIgnoredInventory | CheapLfsIgnoredReview | CheapLfsInventory | CheapLfsReview | CheapLfsResult | {
    kind: 'settings';
    settings: CheapLfsSettings;
} | {
    kind: 'cancelled';
} | {
    kind: 'chosen-files';
    paths: string[];
};
export interface CheapLfsBridge {
    invoke(action: CheapLfsAction, payload: CheapLfsPayload): Promise<CheapLfsResponse>;
    progress?(listener: (value: CheapLfsProgress) => void): () => void;
}
export const defaultCheapLfsSettings: CheapLfsSettings = { provider: 'release', releaseTag: 'assets', autoPin: true, parallel: true, autoRestore: true, encrypt: false, encryptionAcknowledged: false, privateCompression: false };
