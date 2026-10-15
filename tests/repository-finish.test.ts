import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { RepositoryFinishService, type FinishGrant } from '../src/main/repository-finish';
import { acquireRepositoryLock } from '../src/main/repository-locks';
import type { FinishBatch, FinishRepository, FinishSelection } from '../src/shared/repository-finish';
process.env.GIT_CONFIG_NOSYSTEM = '1';
process.env.GIT_CONFIG_GLOBAL = process.platform === 'win32' ? 'NUL' : '/dev/null';
const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-c', 'init.defaultBranch=main', '-c', 'commit.gpgsign=false', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
function fixture() {
    const directory = mkdtempSync(path.join(tmpdir(), 'material-finish-')), root = path.join(directory, 'project'), remote = path.join(directory, 'remote.git'), topic = path.join(directory, 'topic'), state = path.join(directory, 'state');
    mkdirSync(root);
    git(directory, 'init', '--bare', remote);
    git(root, 'init');
    git(root, 'config', 'user.name', 'Fixture Author');
    git(root, 'config', 'user.email', 'fixture@example.test');
    writeFileSync(path.join(root, 'file.txt'), 'base\n');
    git(root, 'add', '.');
    git(root, 'commit', '-m', 'Base');
    git(root, 'remote', 'add', 'origin', remote);
    git(root, 'push', '-u', 'origin', 'main');
    git(root, 'worktree', 'add', '-b', 'feature', topic);
    const grants = new Map<string, FinishGrant>([['root', { root, gitDir: path.join(root, '.git'), commonDir: path.join(root, '.git'), bare: false }], ['topic', { root: topic, gitDir: git(topic, 'rev-parse', '--absolute-git-dir'), commonDir: path.join(root, '.git'), bare: false }]]);
    const service = new RepositoryFinishService({ binary: 'git', directory: state, resolveWorktree: id => {
            const g = grants.get(id);
            if (!g)
                throw new Error('Unknown native grant');
            return g;
        } });
    return { directory, root, remote, topic, state, service, close() { service.dispose(); rmSync(directory, { recursive: true, force: true }); } };
}
async function prepare(f: ReturnType<typeof fixture>) { const result = await f.service.handle('prepare', { worktreeIds: ['root'] }); assert.equal(result.kind, 'prepared'); return result.kind === 'prepared' ? result.repositories[0] : null!; }
function selection(repo: FinishRepository, cleanup = false): FinishSelection { return { transportFingerprint:repo.transportFingerprint,worktreeId: repo.worktreeId, fingerprint: repo.fingerprint, remote: repo.remote, defaultBranch: repo.defaultBranch, trustPrograms: false, contributions: repo.branches.map(b => ({ ref: b.ref, commitMessage: 'Preserve reviewed work', integrate: true, cleanup: cleanup && b.ref === 'refs/heads/feature', owned: cleanup, inactive: cleanup, ignoredFilesRebuildable: false })) }; }
async function start(f: ReturnType<typeof fixture>, chosen: FinishSelection[]) {
    const review = await f.service.handle('review', { selections: chosen });
    assert.equal(review.kind, 'review');
    if (review.kind !== 'review')
        throw new Error('Review missing');
    const response = await f.service.handle('start', { reviewId: review.review.id, confirmed: true, concurrency: 3 });
    assert.equal(response.kind, 'batch');
    return response.kind === 'batch' ? response.batch : null!;
}
async function wait(f: ReturnType<typeof fixture>, id: string) {
    for (let i = 0; i < 600; i++) {
        const result = await f.service.handle('status', { batchId: id });
        if (result.kind === 'batch' && result.batch.state === 'completed')
            return result.batch;
        await new Promise(r => setTimeout(r, 20));
    }
    throw new Error('Batch did not settle');
}
test('completion preserves dirty work, verifies bare remote integration and archive, then removes exact owned source', async () => {
    const f = fixture();
    try {
        writeFileSync(path.join(f.topic, 'file.txt'), 'feature work\n');
        writeFileSync(path.join(f.topic, 'new.txt'), 'new content\n');
        writeFileSync(path.join(f.root, 'file.txt'), 'stashed recovery\n');
        git(f.root, 'stash', 'push', '-m', 'retained stash');
        const repo = await prepare(f);
        const batch = await start(f, [selection(repo, true)]);
        const done = await wait(f, batch.id);
        assert.equal(done.jobs[0].state, 'completed', done.jobs[0].error);
        assert.equal(git(f.remote, 'show', 'main:file.txt'), 'feature work');
        assert.equal(git(f.remote, 'show', 'main:new.txt'), 'new content');
        assert.notEqual(git(f.root, 'rev-parse', 'main'), git(f.remote, 'rev-parse', 'main'));
        assert.equal(readFileSync(path.join(f.root, 'file.txt'), 'utf8'), 'base\n');
        assert.equal(existsSync(f.topic), false);
        assert.equal(git(f.remote, 'for-each-ref', '--format=%(refname)', 'refs/heads/feature'), '');
        const archive = done.jobs[0].archive!;
        assert.ok(existsSync(path.join(archive.path, 'manifest.json')));
        const manifest = JSON.parse(readFileSync(path.join(archive.path, 'manifest.json'), 'utf8'));
        assert.ok(manifest.entries.some((e: {
            file: string;
        }) => e.file.includes('new.txt')));
        assert.equal(done.jobs[0].partialEffects, false);
    }
    finally {
        f.close();
    }
});
test('duplicate native grants sharing one Git store are rejected', async () => {
    const f = fixture();
    try {
        await assert.rejects(f.service.handle('prepare', { worktreeIds: ['root', 'topic'] }), /share the same repository/);
    }
    finally {
        f.close();
    }
});
test('changed index invalidates a review even when working bytes match', async () => {
    const f = fixture();
    try {
        writeFileSync(path.join(f.topic, 'file.txt'), 'staged value\n');
        git(f.topic, 'add', 'file.txt');
        writeFileSync(path.join(f.topic, 'file.txt'), 'working value\n');
        const repo = await prepare(f);
        git(f.topic, 'add', 'file.txt');
        await assert.rejects(start(f, [selection(repo)]), /changed/);
    }
    finally {
        f.close();
    }
});
test('conflicting integration retains source commits and isolated conflict files', async () => {
    const f = fixture();
    try {
        writeFileSync(path.join(f.root, 'file.txt'), 'default edit\n');
        git(f.root, 'add', '.');
        git(f.root, 'commit', '-m', 'Default edit');
        git(f.root, 'push');
        writeFileSync(path.join(f.topic, 'file.txt'), 'topic edit\n');
        const repo = await prepare(f);
        const batch = await start(f, [selection(repo, true)]), done = await wait(f, batch.id);
        assert.equal(done.jobs[0].state, 'failed');
        assert.equal(done.jobs[0].partialEffects, true);
        assert.ok(existsSync(f.topic));
        assert.equal(git(f.remote, 'show', 'feature:file.txt'), 'topic edit');
        assert.ok(existsSync(path.join(done.jobs[0].integrationPath!, 'file.txt')));
        assert.match(readFileSync(path.join(done.jobs[0].integrationPath!, 'file.txt'), 'utf8'), /<<<<<<< HEAD/);
        assert.equal(git(f.remote, 'show', 'main:file.txt'), 'default edit');
    }
    finally {
        f.close();
    }
});
test('ignored files prevent destructive cleanup and remain excluded from private archive', async () => {
    const f = fixture();
    try {
        writeFileSync(path.join(f.topic, '.gitignore'), 'private.bin\n');
        writeFileSync(path.join(f.topic, 'private.bin'), 'private ignored data');
        const repo = await prepare(f);
        assert.equal(repo.worktrees.find(w => w.root === f.topic)?.ignoredCount, 1);
        await assert.rejects(start(f, [selection(repo, true)]), /without ignored files/);
        const batch = await start(f, [selection(repo)]), done = await wait(f, batch.id);
        assert.equal(done.jobs[0].state, 'completed', done.jobs[0].error);
        assert.equal(readFileSync(path.join(f.topic, 'private.bin'), 'utf8'), 'private ignored data');
        const manifest = readFileSync(path.join(done.jobs[0].archive!.path, 'manifest.json'), 'utf8');
        assert.ok(!manifest.includes('private.bin'));
    }
    finally {
        f.close();
    }
});
test('shared mutation lock rejects overlapping completion before repository writes', async () => {
    const f = fixture();
    try {
        const repo = await prepare(f), release = acquireRepositoryLock(path.join(f.root, '.git'), 'other-operation');
        const batch = await start(f, [selection(repo)]), done = await wait(f, batch.id);
        release();
        assert.equal(done.jobs[0].state, 'failed');
        assert.equal(done.jobs[0].attemptedWrites, false);
        assert.match(done.jobs[0].error, /already changing/);
    }
    finally {
        f.close();
    }
});
test('cancelled active native process is bounded and reports attempted partial effects', async () => {
    const f = fixture();
    try {
        if (process.platform === 'win32')
            return;
        writeFileSync(path.join(f.topic, 'file.txt'), 'cancel preservation\n');
        const hooks = path.join(f.directory, 'hooks');
        mkdirSync(hooks);
        const hook = path.join(hooks, 'pre-commit');
        writeFileSync(hook, '#!/bin/sh\nsleep 30\n');
        chmodSync(hook, 0o700);
        git(f.root, 'config', 'core.hooksPath', hooks);
        const repo = await prepare(f), chosen = selection(repo);
        chosen.trustPrograms = true;
        const batch = await start(f, [chosen]);
        let sawCommit = false;
        for (let i = 0; i < 300; i++) {
            const response = await f.service.handle('status', { batchId: batch.id });
            if (response.kind === 'batch' && response.batch.jobs[0].events.some(e => e.step === 'commit' && e.state === 'attempted')) {
                sawCommit = true;
                break;
            }
            await new Promise(r => setTimeout(r, 20));
        }
        assert.ok(sawCommit);
        await f.service.handle('cancel', { batchId: batch.id });
        const done = await wait(f, batch.id);
        assert.equal(done.jobs[0].state, 'cancelled');
        assert.equal(done.jobs[0].partialEffects, true);
        assert.ok(existsSync(f.topic));
        assert.equal(git(f.remote, 'show', 'main:file.txt'), 'base');
    }
    finally {
        f.close();
    }
});
test('a concurrent remote source update is retained instead of deleted', async () => {
    const f = fixture();
    try {
        if (process.platform === 'win32')
            return;
        writeFileSync(path.join(f.topic, 'file.txt'), 'feature contribution\n');
        git(f.topic, 'add', '.');
        git(f.topic, 'commit', '-m', 'Feature');
        const original = git(f.topic, 'rev-parse', 'HEAD');
        git(f.topic, 'checkout', '-b', 'concurrent');
        writeFileSync(path.join(f.topic, 'concurrent.txt'), 'another owner\n');
        git(f.topic, 'add', '.');
        git(f.topic, 'commit', '-m', 'Concurrent owner');
        const concurrent = git(f.topic, 'rev-parse', 'HEAD');
        git(f.topic, 'checkout', 'feature');
        git(f.topic, 'branch', '-D', 'concurrent');
        git(f.topic, 'push', 'origin', concurrent + ':refs/heads/concurrent');
        const hook = path.join(f.remote, 'hooks', 'post-receive');
        writeFileSync(hook, '#!/bin/sh\nwhile read old new ref; do\n if [ "$ref" = "refs/heads/main" ]; then git update-ref refs/heads/feature ' + concurrent + '; fi\ndone\n');
        chmodSync(hook, 0o700);
        const repo = await prepare(f), chosen = selection(repo, true);
        chosen.trustPrograms = true;
        const batch = await start(f, [chosen]), done = await wait(f, batch.id);
        assert.equal(done.jobs[0].state, 'failed');
        assert.match(done.jobs[0].error, /Remote references changed/);
        assert.equal(git(f.remote, 'rev-parse', 'feature'), concurrent);
        assert.equal(git(f.root, 'rev-parse', 'feature'), original);
        assert.ok(existsSync(f.topic));
    }
    finally {
        f.close();
    }
});
test('four selected repositories run with three slots and independent results', async () => {
    const fixtures = Array.from({ length: 4 }, fixture);
    const outer = mkdtempSync(path.join(tmpdir(), 'material-finish-batch-'));
    const grants = new Map(fixtures.map((f, i) => ['repo-' + i, { root: f.root, gitDir: path.join(f.root, '.git'), commonDir: path.join(f.root, '.git'), bare: false }]));
    const service = new RepositoryFinishService({ binary: 'git', directory: outer, resolveWorktree: id => grants.get(id)! });
    try {
        for (const f of fixtures)
            writeFileSync(path.join(f.topic, 'new.txt'), 'independent contribution\n');
        const prepared = await service.handle('prepare', { worktreeIds: [...grants.keys()] });
        assert.equal(prepared.kind, 'prepared');
        if (prepared.kind !== 'prepared')
            throw new Error('Missing preparation');
        const review = await service.handle('review', { selections: prepared.repositories.map(r => selection(r, true)) });
        if (review.kind !== 'review')
            throw new Error('Missing review');
        const response = await service.handle('start', { reviewId: review.review.id, confirmed: true, concurrency: 3 });
        if (response.kind !== 'batch')
            throw new Error('Missing batch');
        assert.equal(response.batch.jobs.filter(j => j.state === 'running').length, 3);
        assert.equal(response.batch.jobs.filter(j => j.state === 'queued').length, 1);
        await service.handle('cancel', { batchId: response.batch.id, jobId: response.batch.jobs[3].id });
        const done = await wait({ ...fixtures[0], service }, response.batch.id);
        assert.equal(done.jobs.filter(j => j.state === 'completed').length, 3, done.jobs.map(j => j.error).join('\n'));
        assert.equal(done.jobs[3].state, 'cancelled');
        assert.equal(done.jobs[3].attemptedWrites, false);
        for (const f of fixtures.slice(0, 3))
            assert.equal(git(f.remote, 'show', 'main:new.txt'), 'independent contribution');
        assert.equal(git(fixtures[3].remote, 'for-each-ref', '--format=%(refname)', 'refs/heads/feature'), '');
    }
    finally {
        service.dispose();
        for (const f of fixtures)
            f.close();
        rmSync(outer, { recursive: true, force: true });
    }
});
test('unselected branches are neither pushed nor integrated and consumed reviews cannot replay', async () => { const f = fixture(); try {
    git(f.root, 'branch', 'retained-feature');
    writeFileSync(path.join(f.topic, 'selected.txt'), 'selected contribution\n');
    const repo = await prepare(f), chosen = selection(repo, true);
    chosen.contributions = chosen.contributions.filter(c => c.ref === 'refs/heads/feature');
    const reviewed = await f.service.handle('review', { selections: [chosen] });
    if (reviewed.kind !== 'review')
        throw new Error('Missing review');
    const batch = await f.service.handle('start', { reviewId: reviewed.review.id, confirmed: true });
    if (batch.kind !== 'batch')
        throw new Error('Missing batch');
    await assert.rejects(f.service.handle('start', { reviewId: reviewed.review.id, confirmed: true }), /already used|already active/);
    const done = await wait(f, batch.batch.id);
    assert.equal(done.jobs[0].state, 'completed', done.jobs[0].error);
    assert.equal(git(f.remote, 'for-each-ref', '--format=%(refname)', 'refs/heads/retained-feature'), '');
    assert.ok(git(f.root, 'rev-parse', 'refs/heads/retained-feature'));
    assert.equal(git(f.remote, 'show', 'main:selected.txt'), 'selected contribution');
    assert.equal(f.service.activeJobs(), 0);await assert.rejects(f.service.handle('start',{reviewId:reviewed.review.id,confirmed:true}),/already used/);
}
finally {
    f.close();
} });
test('private transport retry requires the exact previously inspected program configuration',async()=>{const f=fixture();try{if(process.platform==='win32')return;const helper=path.join(f.directory,'ssh-fixture'),marker=path.join(f.directory,'helper-ran');writeFileSync(helper,'#!/bin/sh\nif [ "$1" = "-G" ]; then exit 1; fi\nprintf used > '+JSON.stringify(marker)+'\nexec git-upload-pack '+JSON.stringify(f.remote)+'\n');chmodSync(helper,0o700);git(f.root,'config','core.sshCommand',helper);git(f.root,'config','ssh.variant','ssh');git(f.root,'remote','set-url','origin','ssh://127.0.0.1:1'+f.remote);const initial=await prepare(f);assert.ok(initial.blockers.some(message=>message.includes('Remote inspection failed')));assert.equal(existsSync(marker),false);assert.ok(initial.trust.some(program=>program.includes(helper)));const chosen=selection(initial);chosen.trustPrograms=true;const retry=await f.service.handle('prepare',{worktreeIds:['root'],selections:[chosen]});assert.equal(retry.kind,'prepared');if(retry.kind!=='prepared')throw new Error('Missing inventory');assert.equal(retry.repositories[0].defaultBranch,'main',retry.repositories[0].blockers.join('\n'));assert.equal(retry.repositories[0].transportTrusted,true);assert.ok(existsSync(marker));rmSync(marker);git(f.root,'config','core.sshCommand',helper+' --changed');await assert.rejects(f.service.handle('prepare',{worktreeIds:['root'],selections:[chosen]}),/configuration changed/);assert.equal(existsSync(marker),false);}finally{f.close();}});
test('new assume-unchanged flags invalidate a reviewed batch before writes',async()=>{const f=fixture();try{const repo=await prepare(f);const response=await f.service.handle('review',{selections:[selection(repo,true)]});if(response.kind!=='review')throw new Error('Missing review');git(f.topic,'update-index','--assume-unchanged','file.txt');writeFileSync(path.join(f.topic,'file.txt'),'hidden recoverable change\n');const started=await f.service.handle('start',{reviewId:response.review.id,confirmed:true});if(started.kind!=='batch')throw new Error('Missing batch');const done=await wait(f,started.batch.id);assert.equal(done.jobs[0].state,'failed');assert.equal(done.jobs[0].attemptedWrites,false);assert.match(done.jobs[0].error,/stale/);assert.equal(readFileSync(path.join(f.topic,'file.txt'),'utf8'),'hidden recoverable change\n');}finally{f.close();}});
