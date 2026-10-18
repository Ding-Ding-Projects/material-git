import { randomUUID } from 'node:crypto';
import { lstat, readdir, readFile, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import type { CheapLfsHostOptions, CheapLfsWorktreeGrant, Repository } from './host';
import { withCheapLfsHost } from './host';
import { listIgnoredFileInventory, validateIgnoredSubmoduleSelection, stageIgnoredFilesIntoLocalSubmodule, type IIgnoredFileInventory, type IIgnoredSubmoduleRequest } from './ignored-submodule-local';
import type { CheapLfsAction, CheapLfsPayload, CheapLfsResponse } from '../../shared/cheap-lfs';
interface LocalReview {
    grant: CheapLfsWorktreeGrant;
    repository: Repository;
    inventory: IIgnoredFileInventory;
    request: IIgnoredSubmoduleRequest;
    expires: number;
}
/** Local-only preservation. The pinned reference has no remote publication phase. */
export class CheapLfsIgnoredService {
    private reviews = new Map<string, LocalReview>();
    constructor(private options: CheapLfsHostOptions) { }
    async handle(action: CheapLfsAction, payload: CheapLfsPayload, signal?: AbortSignal): Promise<CheapLfsResponse> {
        if (typeof payload.worktreeId !== 'string')
            throw Error('Open an approved working tree');
        const grant = await this.options.resolveWorktree(payload.worktreeId);
        const repository: Repository = { id: grant.id, path: grant.root, accountKey: '', defaultBranch: grant.branch, buildRunPreferences: {}, gitHubRepository: null };
        return withCheapLfsHost(this.options, signal, async () => {
            if (action === 'ignored-inventory') {
                const inventory = await listIgnoredFileInventory(repository, 4096);
                const recoveryRoot = join(grant.gitDir, 'desktop-material', 'ignored-submodule-recovery');
                const recoveries: Array<{
                    directory: string;
                    files: number;
                    createdAt: string;
                }> = [];
                for (const entry of await readdir(recoveryRoot, { withFileTypes: true }).catch(() => [])) {
                    if (!entry.isDirectory() || !/^run-[0-9]+-[a-f0-9]{12}$/.test(entry.name))
                        continue;
                    const directory = join(recoveryRoot, entry.name);
                    if (await realpath(directory) !== directory)
                        continue;
                    const manifestPath = join(directory, 'recovery-manifest.json');
                    const info = await lstat(manifestPath).catch(() => null);
                    if (!info?.isFile() || info.isSymbolicLink() || info.size > 4 * 1024 * 1024)
                        continue;
                    try {
                        const value = JSON.parse(await readFile(manifestPath, 'utf8'));
                        if (value.version !== 1 || value.parentRepositoryPath !== grant.root || value.recoveryDirectory !== directory || !Array.isArray(value.files) || value.files.length > 5000 || !Number.isSafeInteger(value.createdAtMs))
                            continue;
                        recoveries.push({ directory, files: value.files.length, createdAt: new Date(value.createdAtMs).toISOString() });
                    }
                    catch { /* Preserve unrecognized recovery data. */ }
                }
                return { kind: 'ignored-inventory', files: inventory.candidates.map(file => ({ path: file.path, size: file.size, pattern: file.proof.pattern })), truncated: inventory.truncated, recoveries };
            }
            if (action === 'ignored-review') {
                if (typeof payload.destination !== 'string' || payload.destination.length > 4096 || !Array.isArray(payload.paths) || payload.paths.some(path => typeof path !== 'string') || payload.paths.length > 4096)
                    throw Error('Choose ignored paths and a relative submodule destination');
                const inventory = await listIgnoredFileInventory(repository, 4096), request = { destinationPath: payload.destination, selectedPaths: payload.paths };
                const validated = await validateIgnoredSubmoduleSelection(repository, inventory, request);
                if (validated.destinationError || validated.rejected.length || !validated.accepted.length)
                    throw Error(`Ignored-file selection was refused: ${validated.destinationError ?? validated.rejected.map(file => file.reason).join(', ') ?? 'empty selection'}`);
                for (const [id, review] of this.reviews)
                    if (review.expires < Date.now())
                        this.reviews.delete(id);
                if (this.reviews.size >= 16)
                    throw Error('Finish an existing ignored-file review');
                const reviewId = randomUUID(), expires = Date.now() + 300000;
                this.reviews.set(reviewId, { grant, repository, inventory, request, expires });
                return { kind: 'ignored-review', reviewId, destination: request.destinationPath, paths: request.selectedPaths, bytes: validated.accepted.reduce((sum, file) => sum + file.candidate.size, 0) };
            }
            if (action === 'ignored-apply') {
                if (payload.confirmed !== true || typeof payload.reviewId !== 'string')
                    throw Error('Confirm the exact ignored-file review');
                const reviewed = this.reviews.get(payload.reviewId);
                this.reviews.delete(payload.reviewId);
                if (!reviewed || reviewed.expires < Date.now() || reviewed.grant.id !== grant.id || reviewed.grant.fingerprint !== grant.fingerprint)
                    throw Error('Ignored-file review changed or expired');
                const result = await stageIgnoredFilesIntoLocalSubmodule(repository, reviewed.inventory, reviewed.request, { onProgress: () => signal?.throwIfAborted(), onPhase: phase => { signal?.throwIfAborted(); this.options.emitProgress?.({ operationId: payload.operationId, worktreeId: grant.id, phase, path: null, completedBytes: 0, totalBytes: 0, completedFiles: 0, totalFiles: reviewed.request.selectedPaths.length }); } });
                return { kind: 'result', operationId: payload.operationId ?? randomUUID(), succeeded: result.stagedFiles.map(file => file.path), failures: [], cancelled: false, message: `Preserved originals and created local submodule ${result.destinationPath} at ${result.commitSha}. Review the parent repository changes. Remote upload and publication are a separate operation.` };
            }
            throw Error('Unknown ignored-file operation');
        });
    }
}
