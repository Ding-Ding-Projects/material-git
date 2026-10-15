import { createHash, randomUUID } from 'node:crypto';
import { promises as fs, existsSync, mkdirSync, realpathSync, readFileSync, readdirSync, writeFileSync, renameSync, chmodSync } from 'node:fs';
import path from 'node:path';
import { GitProcesses, redactGit } from './git-process';
import { acquireRepositoryLock } from './repository-locks';
import type { FinishBatch, FinishContribution, FinishJob, FinishRepository, FinishReview, FinishSelection, FinishWorktree, RepositoryFinishAction, RepositoryFinishPayload, RepositoryFinishResponse } from '../shared/repository-finish';
export interface FinishGrant {
    root: string;
    gitDir: string;
    commonDir: string;
    bare: boolean;
}
export interface RepositoryFinishOptions {
    binary: string;
    directory: string;
    resolveWorktree: (id: string) => FinishGrant | Promise<FinishGrant>;
    helperDirectory?: string;
    checkPayloadReady?: (root: string) => Promise<void>;
}
const MAX_FILES = 50000, MAX_BYTES = 1024 * 1024 * 1024, MAX_FILE = 256 * 1024 * 1024, TTL = 300000;
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const clone = <T>(value: T): T => structuredClone(value);
const text = (value: unknown, label: string, max = 4096) => {
    if (typeof value !== 'string' || !value || value.length > max || /[\x00-\x1f]/.test(value))
        throw new Error('Invalid ' + label);
    return value;
};
const inside = (root: string, file: string) => { const rel = path.relative(root, file); return rel === '' || (!rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel)); };
interface Plan {
    review: FinishReview;
}
interface JobControl {
    cancelled: boolean;
    children: Set<string>;
}
/** Fixed native workflow; all renderer authority is limited to existing folder grants and reviewed choices. */
export class RepositoryFinishService {
    private runner: GitProcesses;
    private reviews = new Map<string, Plan>();
    private batches = new Map<string, FinishBatch>();
    private controls = new Map<string, JobControl>();
    private closed = false;
    private hooks: string;
    constructor(private options: RepositoryFinishOptions) {
        mkdirSync(options.directory, { recursive: true, mode: 0o700 });
        options.directory = realpathSync(options.directory);
        chmodSync(options.directory, 0o700);
        this.hooks = path.join(options.directory, 'disabled-hooks');
        mkdirSync(this.hooks, { recursive: true, mode: 0o700 });
        this.runner = new GitProcesses(options.binary, this.hooks, options.helperDirectory);
        for (const name of readdirSync(options.directory).filter(name => /^batch-[a-f0-9-]+\.json$/.test(name)).slice(-100)) {
            try {
                const file = path.join(options.directory, name);
                if (readFileSync(file).length > 2097152)
                    continue;
                const batch = JSON.parse(readFileSync(file, 'utf8')) as FinishBatch;
                if (!batch.id || !Array.isArray(batch.jobs))
                    continue;
                for (const job of batch.jobs)
                    if (job.state === 'running' || job.state === 'queued') {
                        job.state = 'interrupted';
                        job.partialEffects = job.attemptedWrites;
                        job.error = 'Application stopped. Inspect effects and prepare a fresh review before resuming.';
                    }
                batch.state = 'completed';
                this.batches.set(batch.id, batch);
            }
            catch { }
        }
    }
    activeJobs(): number { return this.controls.size; }
    dispose() {
        this.closed = true;
        for (const c of this.controls.values()) {
            c.cancelled = true;
            for (const id of c.children)
                this.runner.cancel(id);
        }
        this.runner.dispose();
    }
    private async grant(id: string) {
        const grant = await this.options.resolveWorktree(text(id, 'working tree'));
        if (grant.bare)
            throw new Error('Select a non-bare working tree');
        for (const key of ['root', 'gitDir', 'commonDir'] as const)
            if (realpathSync(grant[key]) !== grant[key])
                throw new Error('Native repository identity changed');
        if (inside(grant.root, this.options.directory) || inside(grant.commonDir, this.options.directory))
            throw new Error('Recovery storage must be outside the selected repository');
        return grant;
    }
    private async run(root: string, args: string[], job?: FinishJob, mutation = false, trust = false, allowFailure = false) {
        const control = job && this.controls.get(job.id);
        if (this.closed || control?.cancelled)
            throw new Error('Operation cancelled');
        const id = randomUUID();
        control?.children.add(id);
        if (mutation && job) {
            job.attemptedWrites = true;
            this.event(job, 'attempted', args[0], args[0] + ' operation started');
        }
        try {
            const result = await this.runner.run(root, args, { id, mutation, trust, allowFailure: true, localFile: true, timeout: 120000 });
            if (!result.ok && !allowFailure)
                throw new Error(result.error || 'Native Git operation failed');
            return result;
        }
        finally {
            control?.children.delete(id);
        }
    }
    private async read(root: string, args: string[], job?: FinishJob, trust = false) { return (await this.run(root, args, job, false, trust)).output; }
    private persist(batch: FinishBatch) { const target = path.join(this.options.directory, 'batch-' + batch.id + '.json'), temporary = target + '.tmp'; writeFileSync(temporary, JSON.stringify(batch), { mode: 0o600 }); renameSync(temporary, target); }
    private event(job: FinishJob, state: 'attempted' | 'completed' | 'retained' | 'failed', step: string, detail: string) {
        job.step = step;
        job.events.push({ at: new Date().toISOString(), state, step, detail: redactGit(detail).slice(0, 8192) });
        for (const batch of this.batches.values())
            if (batch.jobs.includes(job)) {
                this.persist(batch);
                break;
            }
    }
    private async fileIdentity(root: string, relative: string) {
        const file = path.resolve(root, relative);
        if (!inside(root, file) || file === root)
            throw new Error('Unsafe repository path');
        let stat;
        try {
            stat = await fs.lstat(file);
        }
        catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT')
                return { bytes: 0, identity: 'missing' };
            throw error;
        }
        if (stat.isSymbolicLink())
            return { bytes: stat.size, identity: 'link:' + await fs.readlink(file) };
        if (!stat.isFile() || stat.size > MAX_FILE)
            throw new Error('Unsupported or oversized repository file: ' + relative);
        if (realpathSync(file) !== file)
            throw new Error('Repository file traverses a symbolic link');
        return { bytes: stat.size, identity: hash(await fs.readFile(file)) };
    }
    private async inventory(id: string, job?: FinishJob, transportTrust=false, expectedTransportFingerprint?:string): Promise<FinishRepository> {
        const g = await this.grant(id);
        const read = (root: string, args: string[]) => this.read(root, args, job);
        const refs = await read(g.root, ['for-each-ref', '--format=%(refname)%09%(objectname)', 'refs/heads/']);
        const config = (await read(g.root, ['config', '--list', '--includes', '--show-scope'])).split('\n').filter(line => !line.startsWith('command\t')).map(line => line.replace(/^[^\t]+\t/, '')).join('\n');
        const trust = config.split('\n').filter(line => /^(?:core\.(?:hooksPath|sshCommand)|filter\.|merge\..*driver|credential\.|gpg\.|include|url\.|protocol\.|remote\..*\.(?:uploadpack|receivepack)|commit\.gpgsign)/i.test(line)).map(line => redactGit(line));
        const remotes = (await read(g.root, ['remote'])).trim().split('\n').filter(Boolean);
        const remote = remotes.includes('origin') ? 'origin' : remotes[0] || '';
        const blockers: string[] = [];
        const defaultHooks = path.join(g.commonDir, 'hooks');
        if (existsSync(defaultHooks))
            for (const name of await fs.readdir(defaultHooks)) {
                const stat = await fs.lstat(path.join(defaultHooks, name));
                if (!name.endsWith('.sample') && stat.isFile() && (process.platform === 'win32' || !!(stat.mode & 0o111)))
                    trust.push('hook.' + name);
            }
        if (existsSync(path.join(g.commonDir, 'objects', 'info', 'alternates')) && readFileSync(path.join(g.commonDir, 'objects', 'info', 'alternates'), 'utf8').trim())
            blockers.push('Copy alternate object storage into this repository before creating a complete recovery archive.');
        let remoteUrl = '', defaultBranch = '', remoteDefaultHead = '',transportFingerprint='';
        if (!remote)
            blockers.push('Configure a remote before preparing completion.');
        else {
            remoteUrl = (await read(g.root, ['remote', 'get-url', '--push', '--all', remote])).trim();
            if (remoteUrl.includes('\n') || remoteUrl.startsWith('-') || /^(?:ext|fd)::/.test(remoteUrl) || /[\x00-\x1f]/.test(remoteUrl))
                throw new Error('Choose one supported push URL');
            if (/:\/\/[^/]*@/.test(remoteUrl))
                throw new Error('Remote URLs with embedded credentials are not supported');
            transportFingerprint=hash(JSON.stringify({root:g.root,config,remote,remoteUrl,trust}));if(transportTrust&&expectedTransportFingerprint!==transportFingerprint)throw new Error('Remote destination or executable configuration changed. Inspect again without program trust.');
            let remoteInfo='';try{remoteInfo=await this.read(g.root,['ls-remote','--symref','--',remoteUrl,'HEAD'],job,transportTrust);}catch(error){blockers.push('Remote inspection failed. Inspect the destination and configured programs below, then explicitly trust them and retry inspection. '+redactGit(error instanceof Error?error.message:String(error)));}
            defaultBranch = remoteInfo.match(/^ref: refs\/heads\/([^\n\t]+)\tHEAD$/m)?.[1] || '';
            remoteDefaultHead = remoteInfo.match(/^([a-f0-9]{40,64})\tHEAD$/m)?.[1] || '';
            if (!defaultBranch || !remoteDefaultHead)
                blockers.push('The push destination must advertise an existing default branch.');
        }
        const worktrees: FinishWorktree[] = [];
        const listing = await read(g.root, ['worktree', 'list', '--porcelain', '-z']);
        for (const chunk of listing.split('\0\0').filter(Boolean)) {
            const fields = Object.fromEntries(chunk.split('\0').filter(Boolean).map(line => { const at = line.indexOf(' '); return at < 0 ? [line, 'true'] : [line.slice(0, at), line.slice(at + 1)]; }));
            if (!fields.worktree)
                continue;
            let root: string;
            try {
                root = realpathSync(fields.worktree);
            }
            catch {
                blockers.push('An unavailable registered working tree must be repaired first: ' + fields.worktree);
                continue;
            }
            const memberCommon=realpathSync((await read(root,['rev-parse','--path-format=absolute','--git-common-dir'])).trim());if(memberCommon!==g.commonDir){blockers.push('A registered working tree no longer belongs to this repository: '+root);continue;}
            const status = await read(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all']);
            const parts = status.split('\0').filter(Boolean), files: FinishWorktree['files'] = [], identities: string[] = [];
            for (let index = 0; index < parts.length; index++) {
                const row = parts[index], relative = row.slice(3);
                if (row[0] === 'R' || row[0] === 'C' || row[1] === 'R' || row[1] === 'C')
                    index++;
                const identity = await this.fileIdentity(root, relative);
                files.push({ path: relative, status: row.slice(0, 2), bytes: identity.bytes });
                identities.push(relative + ':' + identity.identity);
                if (identity.bytes > 10 * 1024 * 1024)
                    blockers.push('Prepare and verify large payload storage before committing: ' + relative);
                if (/^(?:UU|AA|DD|AU|UA|DU|UD)$/.test(row.slice(0, 2)))
                    blockers.push('Resolve existing conflicts in ' + path.basename(root) + ' first.');
            }
            if (files.length > MAX_FILES)
                throw new Error('Repository file inventory exceeds supported bounds');
            const ignored = (await read(root, ['ls-files', '--others', '--ignored', '--exclude-standard', '-z'])).split('\0').filter(Boolean);
            const gitDir = (await read(root, ['rev-parse', '--absolute-git-dir'])).trim();
            for (const marker of ['MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'rebase-merge', 'rebase-apply', 'BISECT_LOG'])
                if (existsSync(path.join(gitDir, marker)))
                    blockers.push('Finish the existing Git operation in ' + path.basename(root) + '.');
            const indexState = await read(root, ['ls-files', '--stage', '-z']);
            const localConfig = await read(root, ['config', '--list', '--includes']);
            const flags = await read(root, ['ls-files', '-v', '-z']);
            if (flags.split('\0').some(row => row && (/^[a-zS]/.test(row))))
                blockers.push('Disable sparse or assume-unchanged index entries before completion.');
            let diff = (await read(root, ['diff', '--no-ext-diff', '--no-textconv', 'HEAD', '--'])).slice(0, 131072);
            for (const file of files) {
                if (/(?:^|\/)(?:\.env(?:\..*)?|id_rsa|id_ed25519|credentials(?:\..*)?|.*\.(?:pem|p12|pfx|key))$/i.test(file.path))
                    blockers.push('Move sensitive material out of the commit inventory: ' + file.path);
                if (file.status === '??' && file.bytes > 131072)
                    blockers.push('Untracked file exceeds the review content limit; review it separately before completion: ' + file.path);
                if (file.status === '??' && file.bytes <= 131072) {
                    const content = await fs.readFile(path.join(root, file.path));
                    if (!content.includes(0))
                        diff += '\nNew file: ' + file.path + '\n' + content.toString('utf8');
                    else
                        blockers.push('Review binary content separately before completion: ' + file.path);
                }
            }
            if (diff.length > 262144)
                blockers.push('Review exceeds the content limit; commit smaller reviewed changes first.');
            const wt: FinishWorktree = { id: hash(root), root, branch: fields.branch || '', head: fields.HEAD || '', dirty: files.length > 0, locked: !!fields.locked, active: root === g.root, files, ignoredCount: ignored.length, diff, fingerprint: hash(JSON.stringify({ status, identities, ignored, indexState, localConfig, head: fields.HEAD, config })) };
            if (!wt.branch && wt.dirty)
                blockers.push('Assign a branch to detached dirty work before completion.');
            worktrees.push(wt);
        }
        const branches = refs.trim().split('\n').filter(Boolean).map(line => { const [ref, head] = line.split('\t'); return { ref, head, worktreeId: worktrees.find(w => w.branch === ref)?.id }; });
        const stashText = await read(g.root, ['stash', 'list', '--format=%gd%x09%H%x09%gs']);
        const stashes = stashText.trim().split('\n').filter(Boolean).map(line => { const [ref, head, ...subject] = line.split('\t'); return { ref, head, subject: subject.join('\t') }; });
        const identity = (await this.run(g.root, ['var', 'GIT_AUTHOR_IDENT'], job, false, false, true)).output.trim();
        if (!identity)
            blockers.push('Configure a commit author name and email.');
        const fingerprint = hash(JSON.stringify({ refs, config, listing, worktrees: worktrees.map(w => w.fingerprint), stashText, remote, remoteUrl, defaultBranch, remoteDefaultHead }));
        return { worktreeId: id, name: path.basename(g.root), root: g.root, commonDir: g.commonDir, fingerprint, remote, remoteUrl, defaultBranch, remoteDefaultHead, identity, trust, transportFingerprint,transportTrusted:transportTrust,branches, worktrees, stashes, blockers: [...new Set(blockers)] };
    }
    async handle(action: RepositoryFinishAction, payload: RepositoryFinishPayload = {}): Promise<RepositoryFinishResponse> {
        if (this.closed)
            throw new Error('Repository completion service is closed');
        if (!payload || typeof payload !== 'object' || Array.isArray(payload) || JSON.stringify(payload).length > 262144)
            throw new Error('Invalid completion request');
        if (action === 'prepare' || action === 'resume') {
            let ids = payload.worktreeIds;
            if (action === 'resume') {
                const batch = this.batches.get(text(payload.batchId, 'batch'));
                if (!batch || batch.state === 'running')
                    throw new Error('Choose a stopped batch');
                const unfinished = batch.jobs.filter(j => j.state !== 'completed');
                if (payload.worktreeIds) {
                    ids = [];
                    for (const id of payload.worktreeIds) {
                        const grant = await this.grant(id);
                        if (unfinished.some(job => job.root === grant.root))
                            ids.push(id);
                    }
                    if (ids.length !== unfinished.length)
                        throw new Error('Reconnect every unfinished repository with the native folder picker before resuming');
                }
                else
                    ids = unfinished.map(j => j.worktreeId);
            }
            if (!Array.isArray(ids) || !ids.length || ids.length > 30)
                throw new Error('Select between 1 and 30 repositories');
            const repositories: FinishRepository[] = [];
            for (const id of ids) {
                const choice=Array.isArray(payload.selections)?payload.selections.find(selection=>selection.worktreeId===id):undefined;const repo = await this.inventory(id,undefined,choice?.trustPrograms===true,choice?.transportFingerprint);
                if (repositories.some(r => r.commonDir === repo.commonDir))
                    throw new Error('Two selections share the same repository. Select it once.');
                repositories.push(repo);
            }
            return { kind: 'prepared', repositories };
        }
        if (action === 'review') {
            if (!Array.isArray(payload.selections) || !payload.selections.length || payload.selections.length > 30)
                throw new Error('Select repositories to review');
            const repositories: FinishRepository[] = [], selections: FinishSelection[] = [];
            for (const source of payload.selections) {
                const selected = clone(source), repo = await this.inventory(selected.worktreeId,undefined,selected.trustPrograms===true,selected.transportFingerprint);
                if (typeof selected.trustPrograms !== 'boolean')
                    throw new Error('Choose repository program trust explicitly');
                if (repositories.some(r => r.commonDir === repo.commonDir))
                    throw new Error('Duplicate repository selection');
                if (repo.fingerprint !== selected.fingerprint)
                    throw new Error('Repository changed. Prepare a fresh review.');
                if (selected.remote !== repo.remote || selected.defaultBranch !== repo.defaultBranch)
                    throw new Error('Remote or default branch changed');
                if (repo.blockers.length)
                    throw new Error(repo.blockers.join('\n'));
                if (repo.trust.length && selected.trustPrograms !== true)
                    throw new Error('Explicit repository program trust is required for ' + repo.name);
                if (!Array.isArray(selected.contributions) || !selected.contributions.length || selected.contributions.length > 1000)
                    throw new Error('Choose known branch contributions');
                const seen = new Set<string>();
                for (const contribution of selected.contributions) {
                    if (seen.has(contribution.ref) || !repo.branches.some(b => b.ref === contribution.ref))
                        throw new Error('Select each known branch once');
                    seen.add(contribution.ref);
                    const wt = repo.worktrees.find(w => w.branch === contribution.ref);
                    if (wt?.dirty)
                        text(contribution.commitMessage, 'per-branch commit message', 4096);
                    for (const key of ['integrate', 'cleanup', 'owned', 'inactive', 'ignoredFilesRebuildable'] as const)
                        if (typeof contribution[key] !== 'boolean')
                            throw new Error('Invalid contribution choice');
                    if (contribution.cleanup && (!contribution.integrate || !contribution.owned || !contribution.inactive || contribution.ref === 'refs/heads/' + repo.defaultBranch || wt?.active || wt?.locked || !!wt?.ignoredCount))
                        throw new Error('Cleanup requires an inactive owned contribution without ignored files; the selected/default working tree is retained.');
                }
                for (const wt of repo.worktrees)
                    if (wt.dirty && !seen.has(wt.branch))
                        throw new Error('Review preservation of every dirty working tree before integration.');
                repositories.push(repo);
                selections.push(selected);
            }
            const review: FinishReview = { id: randomUUID(), expiresAt: new Date(Date.now() + TTL).toISOString(), repositories, selections, steps: ['Revalidate all reviewed content and remote references', 'Create verified private recovery archive', 'Commit reviewed dirty files on their owning branches', 'Push and verify every selected source branch without force', 'Merge approved contributions in an isolated integration working tree; retain checked-out user default branches unchanged', 'Push default branch and verify exact remote tip and ancestry; advance an unoccupied local default reference only by compare-and-swap', 'Refresh and verify private archive before exact owned cleanup'], warnings: ['Repository programs run only with explicit trust. Remote transport authentication follows the selected Git configuration.', 'Ignored files are excluded from archives. Working trees containing ignored files are retained.', 'Stashes and unselected branches are retained. Conflicts and cancellation preserve partial effects.', 'Remote source deletion uses an exact expected-tip lease; a concurrently changed remote branch is retained.', 'A resumed job requires new native inventory and explicit review; completed steps are never blindly replayed.'] };
            for (const [id, p] of this.reviews)
                if (Date.parse(p.review.expiresAt) < Date.now())
                    this.reviews.delete(id);
            if (this.reviews.size >= 32)
                throw new Error('Too many open reviews');
            this.reviews.set(review.id, { review });
            return { kind: 'review', review: clone(review) };
        }
        if (action === 'start') {
            if(this.controls.size)throw new Error('A repository completion batch is already active. Open its progress before starting another batch.');
            if (payload.confirmed !== true)
                throw new Error('Confirm the exact reviewed operations');
            const id = text(payload.reviewId, 'review'), plan = this.reviews.get(id);
            if (!plan || Date.parse(plan.review.expiresAt) < Date.now())
                throw new Error('Review expired or was already used');
            this.reviews.delete(id);
            const concurrency = payload.concurrency ?? 3;
            if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 3)
                throw new Error('Choose concurrency from 1 to 3');
            const batch: FinishBatch = { id: randomUUID(), reviewId: id, createdAt: new Date().toISOString(), state: 'running', concurrency, jobs: plan.review.repositories.map(repo => ({ id: randomUUID(), worktreeId: repo.worktreeId, name: repo.name, root: repo.root, state: 'queued', step: 'queued', attemptedWrites: false, partialEffects: false, error: '', events: [] })) };
            for (const job of batch.jobs)
                this.controls.set(job.id, { cancelled: false, children: new Set() });
            this.batches.set(batch.id, batch);
            this.persist(batch);
            void this.schedule(batch, plan.review).catch(error => { for (const job of batch.jobs)
                if (job.state === 'queued' || job.state === 'running') {
                    job.state = 'failed';
                    job.error = 'Journal persistence failed: ' + redactGit(String(error));
                    job.partialEffects = job.attemptedWrites;
                } batch.state = 'completed'; try {
                this.persist(batch);
            }
            catch { } });
            return { kind: 'batch', batch: clone(batch) };
        }
        if (action === 'status') {
            if (!payload.batchId)
                return { kind: 'batches', batches: clone([...this.batches.values()]) };
            const batch = this.batches.get(text(payload.batchId, 'batch'));
            if (!batch)
                throw new Error('Unknown batch');
            return { kind: 'batch', batch: clone(batch) };
        }
        if (action === 'cancel') {
            const batch = this.batches.get(text(payload.batchId, 'batch'));
            if (!batch)
                throw new Error('Unknown batch');
            for (const job of batch.jobs)
                if (!payload.jobId || payload.jobId === job.id) {
                    const c = this.controls.get(job.id);
                    if (c) {
                        c.cancelled = true;
                        for (const id of c.children)
                            this.runner.cancel(id);
                    }
                }
            return { kind: 'batch', batch: clone(batch) };
        }
        throw new Error('Unsupported repository completion action');
    }
    private async schedule(batch: FinishBatch, review: FinishReview) {
        let next = 0;
        await Promise.all(Array.from({ length: batch.concurrency }, async () => {
            while (next < batch.jobs.length) {
                const index = next++, job = batch.jobs[index];
                await this.execute(job, review.repositories[index], review.selections[index]);
                this.persist(batch);
            }
        }));
        batch.state = 'completed';
        this.persist(batch);
    }
    private async remoteHead(root: string, url: string, ref: string, job: FinishJob, trust: boolean) {
        const result = await this.read(root, ['ls-remote', '--refs', '--', url, ref], job, trust);
        const rows = result.trim().split('\n').filter(Boolean);
        if (rows.length > 1)
            throw new Error('Remote reference is ambiguous');
        return rows.length ? rows[0].split('\t')[0] : '';
    }
    private async push(root: string, url: string, ref: string, expected: string, job: FinishJob, trust: boolean) {
        await this.run(root, ['push', '--porcelain', '--', url, expected + ':' + ref], job, true, trust);
        if (await this.remoteHead(root, url, ref, job, trust) !== expected)
            throw new Error('Remote tip verification failed for ' + ref);
        this.event(job, 'completed', 'push', ref + ' verified at ' + expected);
    }
    private async archive(repo: FinishRepository, job: FinishJob) {
        const folder = path.join(this.options.directory, 'archive-' + job.id + '-' + randomUUID());
        await fs.mkdir(folder, { mode: 0o700 });
        let bytes = 0;
        const entries: {
            file: string;
            hash: string;
            bytes: number;
            mode: number;
        }[] = [];
        const copy = async (source: string, target: string) => {
            if (this.controls.get(job.id)?.cancelled)
                throw new Error('Operation cancelled during recovery archive');
            const stat = await fs.lstat(source);
            if (stat.isSymbolicLink() || !stat.isFile() || stat.size > MAX_FILE)
                throw new Error('Recovery archive requires a regular bounded source: ' + path.basename(source));
            bytes += stat.size;
            if (entries.length >= MAX_FILES || bytes > MAX_BYTES)
                throw new Error('Recovery archive exceeds 50000 files or 1 GiB; retain work and use a dedicated backup workflow');
            await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
            const data = await fs.readFile(source);
            await fs.writeFile(target, data, { mode: 0o600, flag: 'wx' });
            entries.push({ file: path.relative(folder, target), hash: hash(data), bytes: data.length, mode: stat.mode & 0o777 });
        };
        const walk = async (source: string, target: string) => {
            for (const entry of await fs.readdir(source, { withFileTypes: true })) {
                const from = path.join(source, entry.name), to = path.join(target, entry.name);
                if (entry.isDirectory()) {
                    await fs.mkdir(to, { recursive: true, mode: 0o700 });
                    await walk(from, to);
                }
                else
                    await copy(from, to);
            }
        };
        await walk(repo.commonDir, path.join(folder, 'git'));
        for (const [index, wt] of repo.worktrees.entries()) {
            const files = (await this.read(wt.root, ['ls-files', '-co', '--exclude-standard', '-z'], job)).split('\0').filter(Boolean);
            for (const name of [...new Set(files)]) {
                const source = path.resolve(wt.root, name);
                if (!inside(wt.root, source) || realpathSync(path.dirname(source)) !== path.dirname(source))
                    throw new Error('Unsafe archive source');
                if (existsSync(source))
                    await copy(source, path.join(folder, 'worktrees', String(index), name));
            }
        }
        if (!entries.some(e => e.file.startsWith('git' + path.sep)))
            throw new Error('Recovery archive has no Git administrative data');
        for (const entry of entries)
            if (hash(await fs.readFile(path.join(folder, entry.file))) !== entry.hash)
                throw new Error('Recovery archive integrity verification failed');
        const manifest = JSON.stringify({ version: 1, createdAt: new Date().toISOString(), repository: repo.root, worktrees: repo.worktrees.map(w => w.root), excludedIgnored: repo.worktrees.reduce((sum, w) => sum + w.ignoredCount, 0), entries });
        await fs.writeFile(path.join(folder, 'manifest.json'), manifest, { mode: 0o600, flag: 'wx' });
        if (await fs.readFile(path.join(folder, 'manifest.json'), 'utf8') !== manifest)
            throw new Error('Recovery manifest verification failed');
        job.archive = { path: folder, entries: entries.length, bytes, digest: hash(manifest) };
        this.event(job, 'completed', 'archive', 'Verified private recovery archive: ' + folder);
    }
    private async execute(job: FinishJob, reviewed: FinishRepository, selection: FinishSelection) {
        let release: (() => void) | undefined;
        try {
            if (this.controls.get(job.id)?.cancelled)
                throw new Error('Operation cancelled before writes');
            release = acquireRepositoryLock(reviewed.commonDir, job.id);
            job.state = 'running';
            this.event(job, 'completed', 'validate', 'Revalidating repository review');
            const fresh = await this.inventory(job.worktreeId, job,selection.trustPrograms,selection.transportFingerprint);
            if (fresh.fingerprint !== reviewed.fingerprint)
                throw new Error('Review is stale. Repository contents, configuration or remote default changed.');
            await this.archive(fresh, job);
            if ((await this.inventory(job.worktreeId, job,selection.trustPrograms,selection.transportFingerprint)).fingerprint !== fresh.fingerprint)
                throw new Error('Repository changed during preservation archive');
            const root = fresh.root, url = fresh.remoteUrl, trust = selection.trustPrograms;
            const sources = new Map<string, string>();
            for (const selected of selection.contributions) {
                const wt = fresh.worktrees.find(w => w.branch === selected.ref);
                if (wt?.dirty) {
                    if (this.options.checkPayloadReady)
                        await this.options.checkPayloadReady(wt.root);
                    await this.run(wt.root, ['add', '--all', '--', ...wt.files.map(f => f.path)], job, true, trust);
                    await this.run(wt.root, ['commit', '-m', selected.commitMessage], job, true, trust);
                    this.event(job, 'completed', 'commit', 'Preserved ' + selected.ref);
                }
                const tip = (await this.read(root, ['rev-parse', '--verify', selected.ref + '^{commit}'], job, trust)).trim();
                sources.set(selected.ref, tip);
                await this.push(root, url, selected.ref, tip, job, trust);
                if ((await this.read(root, ['rev-parse', '--verify', selected.ref + '^{commit}'], job, trust)).trim() !== tip)
                    throw new Error('Source branch changed after preservation; integration stopped');
                if (wt && (await this.read(wt.root, ['status', '--porcelain=v1', '--untracked-files=all'], job, trust)).trim())
                    throw new Error('New uncommitted work appeared after preservation; integration stopped');
            }
            const target = 'refs/heads/' + fresh.defaultBranch;
            if (sources.has(target) && sources.get(target) !== fresh.remoteDefaultHead)
                fresh.remoteDefaultHead = sources.get(target)!;
            const integration = path.join(this.options.directory, 'integration-' + job.id);
            job.integrationPath = integration;
            await this.run(root, ['fetch', '--no-tags', '--', url, target], job, true, trust);
            const fetched = (await this.read(root, ['rev-parse', 'FETCH_HEAD'], job, trust)).trim();
            if (fetched !== fresh.remoteDefaultHead || fetched !== await this.remoteHead(root, url, target, job, trust))
                throw new Error('Remote changed while fetching integration base');
            await this.run(root, ['worktree', 'add', '--detach', '--', integration, fetched], job, true, trust);
            for (const selected of selection.contributions.filter(s => s.integrate && s.ref !== target)) {
                const tip = sources.get(selected.ref)!;
                await this.run(integration, ['merge', '--no-edit', '--no-ff', '-m', 'Integrate ' + selected.ref.slice(11), tip], job, true, trust);
                this.event(job, 'completed', 'integrate', selected.ref + ' merged');
            }
            const integrated = (await this.read(integration, ['rev-parse', 'HEAD'], job, trust)).trim();
            await this.run(integration, ['push', '--porcelain', '--', url, 'HEAD:' + target], job, true, trust);
            if (await this.remoteHead(root, url, target, job, trust) !== integrated)
                throw new Error('Default branch remote verification failed');
            for (const selected of selection.contributions.filter(s => s.integrate)) {
                const tip = sources.get(selected.ref)!;
                await this.read(integration, ['merge-base', '--is-ancestor', tip, integrated], job, trust);
            }
            this.event(job, 'completed', 'verify', 'Remote default ' + target + ' verified at ' + integrated + ' with all approved source ancestors');
            const defaultTree = fresh.worktrees.find(w => w.branch === target);
            if (defaultTree) {
                this.event(job, 'retained', 'default-checkout', 'Existing default checkout retained unchanged at ' + defaultTree.root + '. Remote integration is ' + integrated + '; update this checkout through a separate reviewed fast-forward.');
            }
            else {
                const old = (await this.read(root, ['rev-parse', '--verify', target], job, trust)).trim();
                await this.read(root, ['merge-base', '--is-ancestor', old, integrated], job, trust);
                await this.run(root, ['update-ref', target, integrated, old], job, true, trust);
            }
            const archived = await this.inventory(job.worktreeId, job,selection.trustPrograms,selection.transportFingerprint);
            await this.archive(archived, job);
            if ((await this.inventory(job.worktreeId, job,selection.trustPrograms,selection.transportFingerprint)).fingerprint !== archived.fingerprint)
                throw new Error('Repository changed during final recovery archive');
            for (const selected of selection.contributions.filter(s => s.cleanup)) {
                const tip = sources.get(selected.ref)!;
                const current = await this.inventory(job.worktreeId, job,selection.trustPrograms,selection.transportFingerprint);
                const wt = current.worktrees.find(w => w.branch === selected.ref);
                if (current.branches.find(b => b.ref === selected.ref)?.head !== tip || wt?.dirty || wt?.locked || wt?.active || wt?.ignoredCount)
                    throw new Error('Cleanup target changed; retained ' + selected.ref);
                if (await this.remoteHead(root, url, target, job, trust) !== integrated || await this.remoteHead(root, url, selected.ref, job, trust) !== tip)
                    throw new Error('Remote references changed; cleanup stopped');
                await this.read(root, ['merge-base', '--is-ancestor', tip, integrated], job, trust);
                if (wt)
                    await this.run(root, ['worktree', 'remove', '--', wt.root], job, true, trust);
                await this.run(root, ['push', '--porcelain', '--force-with-lease=' + selected.ref + ':' + tip, '--', url, ':' + selected.ref], job, true, trust);
                if (await this.remoteHead(root, url, selected.ref, job, trust))
                    throw new Error('Remote branch deletion was not verified');
                await this.run(root, ['update-ref', '-d', selected.ref, tip], job, true, trust);
                this.event(job, 'completed', 'cleanup', 'Removed verified owned ' + selected.ref);
            }
            for (const branch of fresh.branches.filter(b => !selection.contributions.some(s => s.ref === b.ref && s.cleanup)))
                this.event(job, 'retained', 'retained', branch.ref + ' retained');
            for (const stash of fresh.stashes)
                this.event(job, 'retained', 'retained', stash.ref + ' retained; no stash deletion is authorized');
            const integrationStatus = await this.read(integration, ['status', '--porcelain=v1', '--untracked-files=all'], job, trust);
            const integrationIgnored = await this.read(integration, ['ls-files', '--others', '--ignored', '--exclude-standard'], job, trust);
            if (!integrationStatus.trim() && !integrationIgnored.trim()) {
                await this.run(root, ['worktree', 'remove', '--', integration], job, true, trust);
                this.event(job, 'completed', 'cleanup', 'Removed the verified task-owned integration checkout');
            }
            else
                this.event(job, 'retained', 'retained', 'Integration checkout retained at ' + integration + ' because new files remain.');
            job.state = 'completed';
            job.partialEffects = false;
        }
        catch (error) {
            job.state = this.controls.get(job.id)?.cancelled ? 'cancelled' : 'failed';
            job.partialEffects = job.attemptedWrites;
            job.error = redactGit(error instanceof Error ? error.message : String(error));
            this.event(job, 'failed', job.step, job.error);
        }
        finally {
            release?.();
            this.controls.delete(job.id);
        }
    }
}
