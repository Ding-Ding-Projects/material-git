import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { CheapLfsReleaseGateway } from '../src/main/cheap-lfs/release-gateway';
import { CheapLfsReleaseBodySentinel } from '../src/main/cheap-lfs/asset-version';
import { captureCheapLfsCommitProof, verifyCheapLfsCommit } from '../src/main/cheap-lfs/commit';
import { CheapLfsService } from '../src/main/cheap-lfs/service';
import { serializeCheapLfsPointer, CHEAP_LFS_POINTER_VERSION } from '../src/main/cheap-lfs/pointer';
import { ensureCheapLfsOras, validateCheapLfsOrasArchive } from '../src/main/cheap-lfs/oras-bootstrap';
import { withCheapLfsHost } from '../src/main/cheap-lfs/host';
import { pinFileToRelease, materializePointer } from '../src/main/cheap-lfs/operations';
import {ensureCheapLfsCloudCompressionWorkflow,CHEAP_LFS_CLOUD_COMPRESSION_WORKFLOW_PATH} from '../src/main/cheap-lfs/cloud-compression';
import {cheapLfsCloudWorkerBase64,cheapLfsCloudWorkerSha256} from '../src/main/cheap-lfs/cloud-worker-source';
import {parseDocument} from 'yaml';
import type { CheapLfsHostOptions, CheapLfsAccountSession, Repository } from '../src/main/cheap-lfs/host';
const execute: CheapLfsHostOptions['executeGit'] = request => new Promise(resolve => { const child = execFile('git', [...request.argv], { cwd: request.root, encoding: 'buffer', maxBuffer: request.maximumBytes, signal: request.signal }, (error, stdout, stderr) => resolve({ exitCode: error ? Number((error as {
        code?: unknown;
    }).code) || 1 : 0, stdout, stderr: stderr.toString() })); if (request.input)
    child.stdin?.end(request.input);
else
    child.stdin?.end(); });
const sha = (value: Buffer) => createHash('sha256').update(value).digest('hex');
const repository: Repository = { id: 'fixture', path: '', accountKey: 'account', defaultBranch: 'main', buildRunPreferences: {}, gitHubRepository: { dbID: 123, endpoint: 'https://api.github.com', owner: { login: 'fixture' }, name: 'payloads', fullName: 'fixture/payloads', htmlURL: null, isPrivate: false } };
test('public compression prepares only its owned workflow with exact embedded worker bytes',async()=>{
 const root=await mkdtemp(join(tmpdir(),'cheap-lfs-workflow-'));
 try{await mkdir(join(root,'.github','workflows'),{recursive:true});const other=join(root,'.github','workflows','user.yml');await writeFile(other,'name: User workflow\non: workflow_dispatch\n');const prepared=await ensureCheapLfsCloudCompressionWorkflow({...repository,path:root});assert.equal(prepared.changed,true);const text=await readFile(prepared.path,'utf8');assert.equal(parseDocument(text).errors.length,0);assert.match(text,/github.event.repository.private == false \|\| false/);assert.equal(sha(Buffer.from(cheapLfsCloudWorkerBase64,'base64')),cheapLfsCloudWorkerSha256);assert.deepEqual(Buffer.from(cheapLfsCloudWorkerBase64,'base64'),await readFile(new URL('../src/main/cheap-lfs/cloud-worker.mjs',import.meta.url)));assert.equal(await readFile(other,'utf8'),'name: User workflow\non: workflow_dispatch\n');await writeFile(join(root,CHEAP_LFS_CLOUD_COMPRESSION_WORKFLOW_PATH),'name: User-owned occupied path\n');await assert.rejects(ensureCheapLfsCloudCompressionWorkflow({...repository,path:root}),/unowned/);assert.equal(await readFile(join(root,CHEAP_LFS_CLOUD_COMPRESSION_WORKFLOW_PATH),'utf8'),'name: User-owned occupied path\n')}finally{await rm(root,{recursive:true,force:true})}
});
test('native Release transport streams exact bytes and preserves existing destinations', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cheap-lfs-http-'));
    const assets: Array<Record<string, unknown>> = [];
    const bytes = new Map<number, Buffer>();
    let next = 1;
    const date = '2026-10-15T00:00:00Z';
    const release = () => ({ id: 1, tag_name: 'assets', target_commitish: 'main', name: 'Storage', body: CheapLfsReleaseBodySentinel, draft: false, prerelease: false, created_at: date, published_at: date, author: { login: 'fixture' }, assets });
    const server = createServer(async (req, res) => { const url = new URL(req.url!, 'http://localhost'); const chunks: Buffer[] = []; for await (const chunk of req)
        chunks.push(Buffer.from(chunk)); res.setHeader('Content-Type', 'application/json'); if(url.pathname==='/repos/fixture/payloads'){res.end(JSON.stringify({id:123,full_name:'fixture/payloads',name:'payloads',owner:{login:'fixture'},private:false,default_branch:'main'}));return} if (req.method === 'POST' && url.pathname.endsWith('/assets')) {
        const value = Buffer.concat(chunks), id = next++;
        bytes.set(id, value);
        const asset = { id, name: url.searchParams.get('name'), label: url.searchParams.get('label'), state: 'uploaded', content_type: 'application/octet-stream', size: value.length, download_count: 0, created_at: date, updated_at: date, digest: 'sha256:' + sha(value) };
        assets.push(asset);
        res.end(JSON.stringify(asset));
        return;
    } if (req.method === 'POST' && url.pathname.endsWith('/releases')) {
        const draft = JSON.parse(Buffer.concat(chunks).toString());
        assert.equal(draft.prerelease, false);
        assert.equal(draft.make_latest, 'false');
        res.end(JSON.stringify(release()));
        return;
    } if (url.pathname.includes('/releases/assets/')) {
        res.setHeader('Content-Type', 'application/octet-stream');
        res.end(bytes.get(Number(url.pathname.split('/').at(-1))));
        return;
    } res.end(JSON.stringify(/\/releases\/[0-9]+\/assets$/.test(url.pathname) ? assets : release())); });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address() as {
        port: number;
    };
    const session: CheapLfsAccountSession = { key: 'account', login: 'fixture', hostname: 'github.com', apiOrigin: 'https://api.github.com', uploadOrigin: 'https://uploads.github.com', anonymous: false, assertCurrent: async () => { }, request: async (url, init) => { const target = new URL(url); return fetch(`http://127.0.0.1:${address.port}${target.pathname}${target.search}`, { ...init, headers: { ...init.headers }, body: init.body as never, duplex: 'half' } as RequestInit); } };
    try {
        const gateway = new CheapLfsReleaseGateway(session), source = join(root, 'source'), destination = join(root, 'restored');
        const content = Buffer.alloc(1024 * 1024 + 7, 89);
        await writeFile(source, content);
        const bucket = await gateway.create(repository, { tagName: 'assets', targetCommitish: 'main', name: 'Storage', body: CheapLfsReleaseBodySentinel, prerelease: false }, true);
        const events: number[] = [];
        const uploaded = await gateway.uploadAsset(repository, gateway.createMutationReview(repository, bucket), source, 'payload.bin', null, new AbortController().signal, event => events.push(event.transferredBytes), undefined, sha(content));
        assert.equal(uploaded.bytes, content.length);
        assert.deepEqual(bytes.get(uploaded.asset.id), content);
        assert.equal(events.at(-1), content.length);
        assert.ok(events.slice(0, -1).every(count => count < content.length));
        await gateway.downloadAsset(repository, bucket.id, uploaded.asset, destination, new AbortController().signal);
        assert.deepEqual(await readFile(destination), content);
        await assert.rejects(gateway.downloadAsset(repository, bucket.id, uploaded.asset, destination, new AbortController().signal), /EEXIST/);
        assert.deepEqual(await readFile(destination), content);
        await assert.rejects(gateway.uploadAsset(repository, gateway.createMutationReview(repository, { ...bucket, assets: [uploaded.asset] }), source, 'payload.bin', null, new AbortController().signal), /occupied/);
        const localRepository = { ...repository, path: root };
        const host: CheapLfsHostOptions = { preferencesDirectory: join(root, 'prefs'), executeGit: execute, resolveWorktree: async () => { throw Error('unused'); }, selectedAccount: async () => session };
        await execute({ root, argv: ['init'], maximumBytes: 1024 * 1024 });
        await withCheapLfsHost(host, undefined, async () => { const account = { key: session.key, endpoint: session.apiOrigin, login: session.login }; await pinFileToRelease(gateway, localRepository, account, { absoluteFilePath: source, trackedRelativePath: 'source', releaseTag: 'assets', targetCommitish: 'main' }, new AbortController().signal); const historical = await readFile(source, 'utf8'); assert.match(historical, /version desktop-material\/cheap-lfs\/v1/); await materializePointer(gateway, localRepository, account, 'source', new AbortController().signal); assert.deepEqual(await readFile(source), content); const changed = Buffer.from('new immutable bytes'); await writeFile(source, changed); await pinFileToRelease(gateway, localRepository, account, { absoluteFilePath: source, trackedRelativePath: 'source', releaseTag: 'assets', targetCommitish: 'main' }, new AbortController().signal); await writeFile(source, historical); await materializePointer(gateway, localRepository, account, 'source', new AbortController().signal); assert.deepEqual(await readFile(source), content); const password = Buffer.from('fixture protected password'); try {
            await pinFileToRelease(gateway, localRepository, account, { absoluteFilePath: source, trackedRelativePath: 'source', releaseTag: 'assets', targetCommitish: 'main', encryptionPassword: password }, new AbortController().signal);
            const encryptedPointer = await readFile(source);
            await assert.rejects(materializePointer(gateway, localRepository, account, 'source', new AbortController().signal, undefined, undefined, undefined, Buffer.from('wrong password')));
            assert.deepEqual(await readFile(source), encryptedPointer);
            await materializePointer(gateway, localRepository, account, 'source', new AbortController().signal, undefined, undefined, undefined, password);
            assert.deepEqual(await readFile(source), content);
        }
        finally {
            password.fill(0);
        } });
        const git=async(argv:string[])=>{const result=await execute({root,argv,maximumBytes:4*1024*1024});assert.equal(result.exitCode,0,result.stderr);return result.stdout.toString().trim()};
        await git(['config','user.name','Fixture']);await git(['config','user.email','fixture@example.invalid']);
        await writeFile(source,serializeCheapLfsPointer({version:CHEAP_LFS_POINTER_VERSION,releaseTag:'assets',assetName:'payload.bin',sizeInBytes:content.length,sha256:sha(content)}));await git(['add','source']);await git(['commit','-m','pointer']);
        const service=new CheapLfsService({...host,resolveWorktree:async()=>({id:'fixture',root,gitDir:join(root,'.git'),commonDir:join(root,'.git'),fingerprint:'fixture',head:await git(['rev-parse','HEAD']),branch:'main',remoteUrl:'https://github.com/fixture/payloads.git'})});
        try {
            const first=Buffer.from('original bytes for failed stage');await writeFile(source,first);const review=await service.reviewCommit({worktreeId:'fixture',paths:['source']});assert.equal(review.bytes,first.length);const prepared=await service.prepareStage({worktreeId:'fixture',paths:['source'],reviewId:review.reviewId});await git(['add','source']);await service.verifyIndex(prepared.id);const restored=await service.finishStage(prepared.id,false);assert.deepEqual(await readFile(source),first);assert.deepEqual(restored?.recovery,[]);
            const second=Buffer.from('verified original bytes before concurrent edit');await writeFile(source,second);const secondReview=await service.reviewCommit({worktreeId:'fixture',paths:['source']});const secondPrepared=await service.prepareStage({worktreeId:'fixture',paths:['source'],reviewId:secondReview.reviewId});const concurrent=Buffer.from('concurrent user edit');await writeFile(source,concurrent);const recovery=await service.finishStage(secondPrepared.id,false);assert.deepEqual(await readFile(source),concurrent);assert.equal(recovery?.recovery.length,1);assert.deepEqual(await readFile(recovery!.recovery[0].backupPath),second);const inventory=await service.handle('recovery-inventory',{worktreeId:'fixture'});assert.equal(inventory.kind,'recovery-inventory');if(inventory.kind==='recovery-inventory')assert.equal(inventory.recoveries[0].backupPath,recovery!.recovery[0].backupPath);await rm(join(recovery!.recovery[0].backupPath,'..'),{recursive:true,force:true});
        } finally {await service.dispose()}
    }
    finally {
        server.closeAllConnections();
        await new Promise<void>(resolve => server.close(() => resolve()));
        await rm(root, { recursive: true, force: true });
    }
});
test('post-hook commit proof rolls back only its own commit while preserving staged bytes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cheap-lfs-commit-'));
    const git = async (argv: string[]) => { const result = await execute({ root, argv, maximumBytes: 4 * 1024 * 1024 }); assert.equal(result.exitCode, 0, result.stderr); return result.stdout.toString().trim(); };
    try {
        await git(['init']);
        await git(['config', 'user.name', 'Fixture']);
        await git(['config', 'user.email', 'fixture@example.invalid']);
        await writeFile(join(root, 'pointer'), 'original');
        await git(['add', 'pointer']);
        await git(['commit', '-m', 'base']);
        const head = await git(['rev-parse', 'HEAD']);
        await writeFile(join(root, 'pointer'), 'required pointer bytes');
        const proof = await captureCheapLfsCommitProof(root, head, ['pointer']);
        await writeFile(join(root, 'pointer'), 'hook changed pointer');
        await git(['add', 'pointer']);
        await git(['commit', '-m', 'changed']);
        const wrong = await git(['rev-parse', 'HEAD']);
        await assert.rejects(verifyCheapLfsCommit(root, wrong, proof, execute), /changed a required/);
        assert.equal(await git(['rev-parse', 'HEAD']), head);
        assert.equal(await git(['show', ':pointer']), 'hook changed pointer');
        assert.equal(await readFile(join(root, 'pointer'), 'utf8'), 'hook changed pointer');
    }
    finally {
        await rm(root, { recursive: true, force: true });
    }
});
test('ordinary local commits do not request an account and both pointer families trigger coordination', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cheap-lfs-offline-'));
    let accounts = 0;
    const service = new CheapLfsService({ preferencesDirectory: join(root, 'prefs'), executeGit: execute, resolveWorktree: async () => { throw Error('not needed'); }, selectedAccount: async () => { accounts++; throw Error('not needed'); } });
    try {
        await writeFile(join(root, 'ordinary'), 'local text');
        assert.equal(await service.needsCommitCoordination(root, ['ordinary']), false);
        for (const header of ['desktop-material/cheap-lfs/v1', 'https://desktop-material.app/cheap-lfs/oci/v1']) {
            await writeFile(join(root, 'pointer'), `version ${header}\n`);
            assert.equal(await service.needsCommitCoordination(root, ['pointer']), true);
        }
        assert.equal(accounts, 0);
    }
    finally {
        await service.dispose();
        await rm(root, { recursive: true, force: true });
    }
});
test('ORAS rejects untrusted archive bytes before extraction', () => { assert.throws(() => validateCheapLfsOrasArchive(Buffer.from('untrusted'), 'linux-x64'), /integrity/); });
test('materialized staged pointer stays staged while unchanged HEAD payload is excluded', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cheap-lfs-staged-'));
    const git = async (argv: string[]) => { const result = await execute({ root, argv, maximumBytes: 4 * 1024 * 1024 }); assert.equal(result.exitCode, 0, result.stderr); return result.stdout.toString().trim(); };
    const session: CheapLfsAccountSession = { key: 'account', login: 'fixture', hostname: 'github.com', apiOrigin: 'https://api.github.com', uploadOrigin: 'https://uploads.github.com', anonymous: false, assertCurrent: async () => { }, request: async () => Response.json({ id: 123, full_name: 'fixture/payloads', name: 'payloads', owner: { login: 'fixture' }, private: false, default_branch: 'main' }) };
    const service = new CheapLfsService({ preferencesDirectory: join(root, 'prefs'), executeGit: execute, selectedAccount: async () => session, resolveWorktree: async () => ({ id: 'fixture', root, gitDir: join(root, '.git'), commonDir: join(root, '.git'), fingerprint: 'fixture', head: await git(['rev-parse', 'HEAD']), branch: 'main', remoteUrl: 'https://github.com/fixture/payloads.git' }) });
    try {
        await git(['init']);
        await git(['config', 'user.name', 'Fixture']);
        await git(['config', 'user.email', 'fixture@example.invalid']);
        const old = Buffer.from('old payload'), current = Buffer.from('new payload');
        const pointer = (bytes: Buffer) => serializeCheapLfsPointer({ version: CHEAP_LFS_POINTER_VERSION, releaseTag: 'assets', assetName: 'file.bin', sizeInBytes: bytes.length, sha256: sha(bytes) });
        await writeFile(join(root, 'file.bin'), pointer(old));
        await git(['add', 'file.bin']);
        await git(['commit', '-m', 'base']);
        await writeFile(join(root, 'file.bin'), pointer(current));
        await git(['add', 'file.bin']);
        await writeFile(join(root, 'file.bin'), current);
        assert.equal(await service.needsCommitCoordination(root, ['file.bin']), true);
        const review = await service.reviewCommit({ worktreeId: 'fixture', paths: ['file.bin'] });
        assert.equal(review.bytes, 0);
        const prepared = await service.prepareCommit({ worktreeId: 'fixture', paths: ['file.bin'], reviewId: review.reviewId });
        assert.deepEqual(prepared.preserveIndexPaths, ['file.bin']);
        assert.deepEqual(prepared.paths, ['file.bin']);
        assert.deepEqual(prepared.excludedPaths, []);
        await service.verifyIndex(prepared.id);
        await git(['commit', '-m', 'new pointer']);
        await service.verifyCommit(prepared.id, await git(['rev-parse', 'HEAD']));
        await service.finishCommit(prepared.id, true);
        assert.deepEqual(await readFile(join(root, 'file.bin')), current);
        const unchanged = await service.prepareCommit({ worktreeId: 'fixture', paths: ['file.bin'] });
        assert.deepEqual(unchanged.paths, []);
        assert.deepEqual(unchanged.excludedPaths, ['file.bin']);
        await service.finishCommit(unchanged.id, false);
    }
    finally {
        await service.dispose();
        await rm(root, { recursive: true, force: true });
    }
});
test('ignored-file review preserves original bytes and creates only a local submodule', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cheap-lfs-ignored-'));
    const git = async (argv: string[]) => { const result = await execute({ root, argv, maximumBytes: 4 * 1024 * 1024 }); assert.equal(result.exitCode, 0, result.stderr); return result.stdout.toString().trim(); };
    let accountRequests = 0;
    const service = new CheapLfsService({ preferencesDirectory: join(root, 'prefs'), executeGit: execute, selectedAccount: async () => { accountRequests++; throw Error('No network account is needed'); }, resolveWorktree: async () => ({ id: 'fixture', root, gitDir: join(root, '.git'), commonDir: join(root, '.git'), fingerprint: 'fixture', head: await git(['rev-parse', 'HEAD']), branch: 'main', remoteUrl: null }) });
    try {
        await git(['init']);
        await git(['config', 'user.name', 'Fixture']);
        await git(['config', 'user.email', 'fixture@example.invalid']);
        await writeFile(join(root, '.gitignore'), '*.payload\n');
        await git(['add', '.gitignore']);
        await git(['commit', '-m', 'base']);
        const original = Buffer.from('ignored original bytes');
        await writeFile(join(root, 'ignored.payload'), original);
        const inventory = await service.handle('ignored-inventory', { worktreeId: 'fixture' });
        assert.equal(inventory.kind, 'ignored-inventory');
        if (inventory.kind !== 'ignored-inventory')
            throw Error('Unexpected inventory');
        assert.deepEqual(inventory.files.map(file => file.path), ['ignored.payload']);
        const review = await service.handle('ignored-review', { worktreeId: 'fixture', paths: ['ignored.payload'], destination: 'preserved' });
        assert.equal(review.kind, 'ignored-review');
        if (review.kind !== 'ignored-review')
            throw Error('Unexpected review');
        const result = await service.handle('ignored-apply', { worktreeId: 'fixture', reviewId: review.reviewId, confirmed: true, operationId: '11111111-1111-4111-8111-111111111111' });
        assert.equal(result.kind, 'result');
        assert.deepEqual(await readFile(join(root, 'ignored.payload')), original);
        assert.deepEqual(await readFile(join(root, 'preserved', 'ignored.payload')), original);
        assert.match(await git(['ls-files', '--stage', 'preserved']), /^160000 /);
        assert.equal(accountRequests, 0);
        assert.equal(await git(['remote']), '');
        await assert.rejects(service.handle('ignored-apply', { worktreeId: 'fixture', reviewId: review.reviewId, confirmed: true, operationId: '22222222-2222-4222-8222-222222222222' }), /changed or expired/);
    }
    finally {
        await service.dispose();
        await rm(root, { recursive: true, force: true });
    }
});
