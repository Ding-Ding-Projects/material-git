import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { captureCheapLfsCommitProof, verifyCheapLfsCommit } from '../src/main/cheap-lfs/commit';
import { CHEAP_LFS_OCI_POINTER_VERSION, serializeCheapLfsGhcrPointer } from '../src/main/cheap-lfs/ghcr-pointer';
import { withCheapLfsHost, type CheapLfsHostOptions, type Repository } from '../src/main/cheap-lfs/host';
import { pinCheapLfsFilesToOci, type ICheapLfsOciRuntime } from '../src/main/cheap-lfs/oci-operations';
import { discardCheapLfsRetainedPins, restoreCheapLfsPinnedPayloads, type ICheapLfsRetainedPin } from '../src/main/cheap-lfs/operations';

const execute: CheapLfsHostOptions['executeGit'] = request => new Promise(resolve => {
  const child = execFile('git', [...request.argv], { cwd: request.root, encoding: 'buffer', maxBuffer: request.maximumBytes }, (error, stdout, stderr) => resolve({ exitCode: error ? 1 : 0, stdout, stderr: stderr.toString() }));
  child.stdin?.end(request.input);
});
const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

// Only the remote registry boundary is injected: image construction, immutable
// pointer validation, owned copies, actual Git index/commits and restore are real.
for (const outcome of ['stage', 'commit', 'failed-commit', 'cancelled', 'concurrent-edit', 'publish-cancelled'] as const) {
  test(`OCI retained source survives ${outcome} without a registry restore`, async () => {
    const root = await mkdtemp(join(tmpdir(), 'cheap-lfs-oci-recovery-'));
    const pins: ICheapLfsRetainedPin[] = [];
    const content = Buffer.from('Exact original OCI source bytes\0\xff\n'.repeat(1024));
    const controller = new AbortController();
    let publishCount = 0;
    const git = async (argv: string[]) => {
      const result = await execute({ root, argv, maximumBytes: 4 * 1024 * 1024 });
      assert.equal(result.exitCode, 0, result.stderr);
      return result.stdout;
    };
    const host: CheapLfsHostOptions = {
      preferencesDirectory: join(root, 'prefs'), executeGit: execute,
      resolveWorktree: async () => { throw Error('unused'); },
      selectedAccount: async () => { throw Error('offline recovery must not ask for an account'); },
    };
    const repository: Repository = { id: 'fixture', path: root, accountKey: 'fixture', defaultBranch: 'main', buildRunPreferences: {}, gitHubRepository: null };
    const runtime: ICheapLfsOciRuntime = {
      withPulledImage: async () => { throw Error('Offline source recovery must not pull an image'); },
      publish: async request => {
        publishCount++;
        const image = request.image;
        assert.equal(image.snapshot.objects.length, 1);
        assert.equal(image.snapshot.objects[0].sha256, digest(content));
        const chunks: Buffer[] = [];
        for (const layer of image.layers) {
          assert.ok(layer.localPath);
          const bytes = await readFile(layer.localPath);
          assert.equal(`sha256:${digest(bytes)}`, layer.descriptor.digest);
          chunks.push(bytes);
        }
        assert.deepEqual(Buffer.concat(chunks), content);
        if (outcome === 'publish-cancelled') {
          controller.abort();
          controller.signal.throwIfAborted();
        }
        const immutableReference = `${request.registryRepository}@${image.manifestDescriptor.digest}`;
        return {
          provider: request.provider, immutableReference,
          taggedReference: `${request.registryRepository}:fixture`,
          manifestDigest: image.manifestDescriptor.digest,
          keyCreated: false, keyRelativePath: null,
          pointers: image.snapshot.objects.map(object => ({
            objectSha256: object.sha256, sizeInBytes: object.sizeInBytes,
            text: serializeCheapLfsGhcrPointer({ version: CHEAP_LFS_OCI_POINTER_VERSION, image: immutableReference, object: `sha256:${object.sha256}`, sizeInBytes: object.sizeInBytes, layers: object.chunks.map(chunk => chunk.blob.digest) }),
          })),
        };
      },
    };
    try {
      await git(['init']);
      await git(['config', 'user.name', 'Fixture']);
      await git(['config', 'user.email', 'fixture@example.invalid']);
      await git(['commit', '--allow-empty', '-m', 'Initial']);
      const parent = (await git(['rev-parse', 'HEAD'])).toString().trim();
      await writeFile(join(root, 'payload.bin'), content);
      await withCheapLfsHost(host, controller.signal, async () => {
        const pin = () => pinCheapLfsFilesToOci({ repositoryPath: root, repositoryIdentity: 'github.com/repositories/123', sourceRepositoryUrl: 'https://github.com/fixture/payloads', visibility: 'verified-public', provider: 'ghcr', registryRepository: 'ghcr.io/fixture/payloads-cheap-lfs', parallelBlobTransfers: false }, [{ relativePath: 'payload.bin' }], { runtime }, controller.signal, undefined, pins);
        if (outcome === 'publish-cancelled') {
          await assert.rejects(pin());
          assert.equal(pins.length, 0);
          assert.deepEqual(await readFile(join(root, 'payload.bin')), content);
          return;
        }
        const mutation = await pin();
        assert.deepEqual(mutation.failures, []);
        assert.deepEqual(mutation.commitPaths, ['payload.bin']);
        assert.equal(pins.length, 1);
        assert.deepEqual(await readFile(pins[0].owned.path), content);
        const pointer = await readFile(join(root, 'payload.bin'));
        assert.equal(pointer.toString(), pins[0].pointerText);
        const proof = await captureCheapLfsCommitProof(root, parent, mutation.commitPaths);
        await git(['add', '--', 'payload.bin']);
        if (outcome === 'commit' || outcome === 'failed-commit') {
          if (outcome === 'failed-commit') {
            // Reproduce a commit hook replacing the reviewed index entry.
            await writeFile(join(root, 'payload.bin'), 'hook replaced pointer');
            await git(['add', '--', 'payload.bin']);
            await writeFile(join(root, 'payload.bin'), pointer);
          }
          await git(['commit', '-m', 'Payload']);
          const committed = (await git(['rev-parse', 'HEAD'])).toString().trim();
          if (outcome === 'failed-commit') {
            await assert.rejects(verifyCheapLfsCommit(root, committed, proof, execute), /hook changed/);
            assert.equal((await git(['rev-parse', 'HEAD'])).toString().trim(), parent);
          } else {
            await verifyCheapLfsCommit(root, committed, proof, execute);
            assert.deepEqual(await git(['show', 'HEAD:payload.bin']), pointer);
          }
        }
        if (outcome === 'cancelled') controller.abort();
        const edit = Buffer.from('Concurrent user edit must survive');
        if (outcome === 'concurrent-edit') await writeFile(join(root, 'payload.bin'), edit);
        const restored = await restoreCheapLfsPinnedPayloads(repository, pins);
        assert.deepEqual(restored.failures, []);
        if (outcome === 'concurrent-edit') {
          assert.deepEqual(restored.skipped, ['payload.bin']);
          assert.deepEqual(await readFile(join(root, 'payload.bin')), edit);
          assert.deepEqual(await readFile(pins[0].owned.path), content);
        } else {
          assert.deepEqual(restored.restored, ['payload.bin']);
          assert.deepEqual(await readFile(join(root, 'payload.bin')), content);
        }
        if (outcome !== 'failed-commit') assert.deepEqual(await git(['show', ':payload.bin']), pointer);
      });
      assert.equal(publishCount, 1);
    } finally {
      await discardCheapLfsRetainedPins(pins);
      await rm(root, { recursive: true, force: true });
    }
  });
}
