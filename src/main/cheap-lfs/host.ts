import { AsyncLocalStorage } from 'node:async_hooks';
import type { Readable } from 'node:stream';
export type CheapLfsStorageProvider = 'release' | 'ghcr' | 'docker-hub';
export interface IBuildRunPreferences {
    cheapLfsStorageProvider?: CheapLfsStorageProvider;
    cheapLfsCloudCompression?: boolean;
}
export interface Account {
    readonly key: string;
    readonly endpoint: string;
    readonly login: string;
    readonly anonymous?: boolean;
}
export interface Repository {
    readonly id: string;
    readonly path: string;
    readonly accountKey: string;
    readonly defaultBranch: string;
    readonly buildRunPreferences: IBuildRunPreferences;
    readonly gitHubRepository: {
        readonly dbID: number;
        readonly endpoint: string;
        readonly owner: {
            readonly login: string;
        };
        readonly name: string;
        readonly fullName: string;
        readonly htmlURL: string | null;
        readonly isPrivate: boolean | null;
    } | null;
}
export type GitHubContainerPackageOwnerKind = 'authenticated-user' | 'organization' | 'user';
export interface IAPIFullRepository {
    id: number;
    name: string;
    private: boolean;
    owner: {
        login: string;
        type: string;
    };
    permissions?: {
        admin?: boolean;
        push?: boolean;
        pull?: boolean;
    };
}
export type TranslationKey = string;
export const CheapLfsPinThresholdBytes = 100 * 1024 * 1024;
export type GitHubReleasesAvailability = 'available' | 'signed-out' | 'unsupported' | 'unassociated';
export class GitHubReleasesError extends Error {
    constructor(public readonly code: string, message: string, public readonly status?: number) { super(message); }
}
export interface IGitHubReleaseMutationReview {
    readonly repositoryFingerprint: string;
    readonly accountKey: string;
    readonly accountGeneration: number;
    readonly releaseId: number;
    readonly releaseFingerprint: string;
    readonly releaseIdentityFingerprint: string;
    readonly reviewedAssets: ReadonlyArray<{
        id: number;
        fingerprint: string;
    }>;
    readonly assetId: number | null;
    readonly assetFingerprint: string | null;
}
export interface IGitHubReleaseAssetUploadRange {
    readonly offset: number;
    readonly length: number;
}
export interface IGitHubReleaseTransferProgressEvent {
    readonly operationId: string;
    readonly direction: 'upload' | 'download';
    readonly transferredBytes: number;
    readonly totalBytes: number;
    readonly phase?: string;
}
export interface CheapLfsGitRequest {
    readonly root: string;
    readonly argv: ReadonlyArray<string>;
    readonly input?: string | Buffer;
    readonly signal?: AbortSignal;
    readonly maximumBytes: number;
}
export interface CheapLfsGitResult {
    readonly exitCode: number;
    readonly stdout: Buffer;
    readonly stderr: string;
}
export interface CheapLfsWorktreeGrant {
    readonly id: string;
    readonly root: string;
    readonly gitDir: string;
    readonly commonDir: string;
    readonly fingerprint: string;
    readonly head: string;
    readonly branch: string;
    readonly remoteUrl: string | null;
}
/** Main-process only capability. It must bind every request to the selected account and host. */
export interface CheapLfsAccountSession {
    readonly key: string;
    readonly login: string;
    readonly hostname: string;
    readonly apiOrigin: string;
    readonly uploadOrigin: string;
    readonly anonymous: boolean;
    request(url: string, init: {
        method: string;
        headers?: Readonly<Record<string, string>>;
        body?: string | Readable;
        signal?: AbortSignal;
    }): Promise<Response>;
    registryCredentials?(signal?:AbortSignal): Promise<{
        username: string;
        token: string;
    }>;
    assertCurrent(): Promise<void>;
}
export interface CheapLfsHostOptions {
    fetch?: (input: string | URL, init?: RequestInit) => Promise<Response>;
    chooseFiles?: (worktreeId: string) => Promise<string[]>;
    resolveWorktree(worktreeId: string): Promise<CheapLfsWorktreeGrant>;
    executeGit(request: CheapLfsGitRequest): Promise<CheapLfsGitResult>;
    selectedAccount(worktreeId: string): Promise<CheapLfsAccountSession>;
    readSecret?(key: string): Promise<Buffer | null>;
    writeSecret?(key: string, value: Buffer): Promise<void>;
    deleteSecret?(key: string): Promise<void>;
    preferencesDirectory: string;
    orasExecutable?: string;
    orasExecutableSha256?: string;
    diagnostic?: (message: string) => void;
    dockerCredentials?: () => Promise<{
        username: string;
        token: string;
    }>;
    emitProgress?: (event: unknown) => void;
    openExternal?: (url: string) => Promise<void>;
    openDirectory?: (path: string) => Promise<void>;
}
interface NativeContext {
    execute: CheapLfsHostOptions['executeGit'];
    signal?: AbortSignal;
    diagnostic?: CheapLfsHostOptions['diagnostic'];
}
const nativeContext = new AsyncLocalStorage<NativeContext>();
export const withCheapLfsHost = <T>(options: CheapLfsHostOptions, signal: AbortSignal | undefined, work: () => Promise<T>) => nativeContext.run({ execute: options.executeGit, signal, diagnostic: options.diagnostic }, work);
interface GitOptions {
    encoding?: 'buffer';
    stdin?: string | Buffer;
    maxBuffer?: number;
    successExitCodes?: Set<number>;
}
export async function git(argv: ReadonlyArray<string>, root: string, label: string, options: GitOptions & {
    encoding: 'buffer';
}): Promise<{
    stdout: Buffer;
    stderr: string;
    exitCode: number;
}>;
export async function git(argv: ReadonlyArray<string>, root: string, label: string, options?: GitOptions): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
}>;
export async function git(argv: ReadonlyArray<string>, root: string, _label: string, options: GitOptions = {}) { const context = nativeContext.getStore(); if (!context)
    throw Error('Cheap LFS requires an approved native repository context'); const maximumBytes = Math.min(Number.isFinite(options.maxBuffer) ? options.maxBuffer! : 64 * 1024 * 1024, 64 * 1024 * 1024); const result = await context.execute({ root, argv, input: options.stdin, maximumBytes, signal: context.signal }); if (!(options.successExitCodes || new Set([0])).has(result.exitCode))
    throw Error('Cheap LFS repository operation failed'); return { ...result, stdout: options.encoding === 'buffer' ? result.stdout : result.stdout.toString('utf8') }; }
export function largeRepositoryGitArgsForPath(_path: string): string[] { return ['--no-optional-locks', '-c', 'core.fsmonitor=false', '-c', 'core.untrackedCache=false']; }
export function getGitHubReleasesAccount(repository: Repository, accounts: ReadonlyArray<Account>): Account | null { return accounts.find(account => !account.anonymous && account.key === repository.accountKey && account.endpoint === repository.gitHubRepository?.endpoint) || null; }
export function getGitHubReleasesReadAccount(repository: Repository, accounts: ReadonlyArray<Account>): Account | null { return getGitHubReleasesAccount(repository, accounts) || accounts.find(account => account.anonymous && repository.gitHubRepository?.isPrivate === false && account.endpoint === 'https://api.github.com') || null; }
export function getHTMLURL(endpoint: string): string { const url = new URL(endpoint); if (url.protocol !== 'https:' || url.username || url.password)
    throw Error('HTTPS provider required'); return url.hostname === 'api.github.com' ? 'https://github.com' : url.origin; }
export function t(key: TranslationKey, values?: Record<string, unknown>): string { return messages[key] ?? key.replace(/^cheapLfs\./, '').replaceAll('.', ': '); }
const messages: Record<string, string> = { 'cheapLfs.firstPublish.noGitHubRepository': 'Connect this working tree to a GitHub repository first.', 'cheapLfs.firstPublish.noRemote': 'Choose a publication remote.', 'cheapLfs.firstPublish.detachedHead': 'Choose a branch before publishing large files.', 'cheapLfs.firstPublish.unbornBranch': 'Create and publish the initial commit before uploading large files.' };
export const log = { warn: (message: string, _error?: unknown) => nativeContext.getStore()?.diagnostic?.(message.replace(/(?:gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+)/g, '[REDACTED]').replace(/[\r\n\0]/g, ' ').slice(0, 500)) };
