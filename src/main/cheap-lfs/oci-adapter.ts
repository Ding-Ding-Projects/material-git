import { ensureCheapLfsOras } from './oras-bootstrap';
import { join } from 'node:path';
import { Buffer } from 'node:buffer';
import type { CheapLfsAccountSession, CheapLfsHostOptions, Repository, IAPIFullRepository } from './host';
import { readBoundedJson } from './release-gateway';
import { deriveCheapLfsRegistryTarget, createCheapLfsRegistryPolicyVerifier } from './oci-registry-runtime';
import { GitHubCheapLfsSourceRepositoryPolicyApi, GhcrCheapLfsRegistryRepositoryPolicyApi, DockerHubCheapLfsRegistryRepositoryPolicyApi, type ICheapLfsGitHubPolicyApi } from './oci-registry-policy-api';
import { publishCheapLfsGhcrImage, withPulledCheapLfsGhcrObject } from './ghcr-oras-transport';
import { listCheapLfsStoredPointers, type ICheapLfsOciRuntime, type ICheapLfsOciRepositoryContext } from './oci-operations';
import { getCheapLfsOciRegistryProvider, getCheapLfsOciRegistryRepository } from './ghcr-pointer';
export async function createCheapLfsOciAdapter(options: CheapLfsHostOptions, repository: Repository, session: CheapLfsAccountSession, provider: 'ghcr' | 'docker-hub', parallel: boolean, signal?: AbortSignal) {
    const source = repository.gitHubRepository;
    if (!source || source.endpoint !== 'https://api.github.com' || source.isPrivate === null)
        throw Error('OCI storage requires verified GitHub.com source identity and visibility');
    if (!options.orasExecutable || !options.orasExecutableSha256) {
        const acquired = await ensureCheapLfsOras(join(options.preferencesDirectory, 'runtimes'), { signal, fetch: options.fetch as typeof fetch | undefined });
        options = { ...options, orasExecutable: acquired.path, orasExecutableSha256: acquired.sha256 };
    }
    if (!/^sha256:[a-f0-9]{64}$/.test(options.orasExecutableSha256 || ''))
        throw Error('ORAS runtime requires its pinned integrity receipt');
    const sourceInput = { repositoryId: source.dbID, owner: source.owner.login, name: source.name };
    const credentialsFor = async (which: 'ghcr' | 'docker-hub', requestSignal=signal) => { await session.assertCurrent(); const value = which === 'ghcr' ? await session.registryCredentials?.(requestSignal) : await options.dockerCredentials?.(); if (!value || !value.username || !value.token)
        throw Error('The selected registry requires its protected credentials'); return value; };
    const publishCredentials = async (requestSignal=signal) => credentialsFor(provider,requestSignal);
    let namespace: string | undefined;
    if (provider === 'docker-hub' && !session.anonymous)
        namespace = (await publishCredentials()).username.toLowerCase();
    let target = deriveCheapLfsRegistryTarget({ ...sourceInput, provider, dockerHubNamespace: namespace });
    const stored = await listCheapLfsStoredPointers(repository.path);
    const existing = new Set(stored.flatMap(entry => entry.backend === 'oci' && entry.provider === provider ? [getCheapLfsOciRegistryRepository(entry.pointer.image)] : []));
    if (existing.size > 1)
        throw Error('Multiple registry packages require explicit migration');
    if (existing.size === 1) {
        const registryRepository = [...existing][0];
        if (registryRepository === null)
            throw Error('Invalid existing registry coordinate');
        target = { ...target, registryRepository };
    }
    const api: ICheapLfsGitHubPolicyApi = {
        fetchRepository: async (owner, name) => { const response = await session.request(`${session.apiOrigin}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`, { method: 'GET',signal }); if (response.status === 404) {
            await response.body?.cancel();
            return null;
        } if (!response.ok) {
            await response.body?.cancel();
            throw Error('Source repository visibility could not be verified');
        } return await readBoundedJson(response) as IAPIFullRepository; },
        fetchGitHubContainerPackageMetadata: async (owner, name, kind, signal) => { const prefix = kind === 'authenticated-user' ? 'user' : `${kind === 'organization' ? 'orgs' : 'users'}/${encodeURIComponent(owner)}`; const response = await session.request(`${session.apiOrigin}/${prefix}/packages/container/${encodeURIComponent(name)}`, { method: 'GET', signal }); if (response.status === 404) {
            await response.body?.cancel();
            return null;
        } if (!response.ok) {
            await response.body?.cancel();
            throw Error('Registry package access could not be verified');
        } return readBoundedJson(response); }
    };
    const context: ICheapLfsOciRepositoryContext = { repositoryPath: repository.path, repositoryIdentity: target.repositoryIdentity, sourceRepositoryUrl: target.sourceRepositoryUrl, visibility: source.isPrivate ? 'verified-private' : 'verified-public', provider, registryRepository: target.registryRepository, parallelBlobTransfers: parallel };
    const runtime: ICheapLfsOciRuntime = {
        async publish(request) {
            const credential = await publishCredentials(request.signal);
            const token = Buffer.from(credential.token);
            const registryApi = provider === 'ghcr' ? new GhcrCheapLfsRegistryRepositoryPolicyApi(api, sourceInput, session.login) : new DockerHubCheapLfsRegistryRepositoryPolicyApi({ username: credential.username, token }, async (url, init) => { const target = new URL(url); if (target.origin !== 'https://hub.docker.com' || target.username || target.password)
                throw Error('Unapproved Docker policy URL'); return (options.fetch ?? fetch)(url, { ...init, redirect: 'error' }); });
            try {
                const visibility = context.visibility === 'verified-private' ? 'private' : 'public';
                if (registryApi instanceof GhcrCheapLfsRegistryRepositoryPolicyApi)
                    await registryApi.preflightRegistryRepository({ provider: 'ghcr', registryRepository: context.registryRepository }, visibility);
                else
                    await registryApi.ensureRegistryRepository(context.registryRepository, visibility, request.signal);
                const verifier = createCheapLfsRegistryPolicyVerifier({ source: sourceInput, target, sourceApi: new GitHubCheapLfsSourceRepositoryPolicyApi(api), registryApi });
                return await publishCheapLfsGhcrImage({ image: request.image, registryRepository: request.registryRepository, orasExecutablePath: options.orasExecutable!, orasExecutableSha256: options.orasExecutableSha256!, credentials: { username: credential.username, token }, packagePolicyVerifier: verifier, parallelBlobUploads: request.parallelBlobUploads, keyCreated: request.keyCreated, keyRelativePath: request.keyRelativePath, signal: request.signal, onProgress: request.onProgress });
            }
            finally {
                token.fill(0);
                credential.token = '';
            }
        },
        async withPulledImage(request, operation) { const which = getCheapLfsOciRegistryProvider(request.pointer.image); if (!which)
            throw Error('Unknown immutable registry provider'); const credential = request.expectedVisibility === 'public' && session.anonymous ? null : await credentialsFor(which,request.signal); const token = credential ? Buffer.from(credential.token) : null; try {
            return await withPulledCheapLfsGhcrObject({ pointer: request.pointer, expectedRepositoryIdentity: request.expectedRepositoryIdentity, expectedVisibility: request.expectedVisibility, orasExecutablePath: options.orasExecutable!, orasExecutableSha256: options.orasExecutableSha256!, credentials: credential && token ? { username: credential.username, token } : null, parallelBlobDownloads: parallel, signal: request.signal, onProgress: request.onProgress }, operation);
        }
        finally {
            token?.fill(0);
            if (credential)
                credential.token = '';
        } }
    };
    return { context, dependencies: { runtime } };
}
