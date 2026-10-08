/** Native-only provider source. Renderer IPC carries its opaque id, never these claims. */
interface GitProviderSource {
 id:string;
 kind:'repository'|'gist'|'pull-request';
 hostname:string;
 accountFingerprint:string;
 providerId:string;
 url:string;
 name:string;
 expiresAt:string;
}
interface RepositoryIdentity {id:string;owner:string;name:string;}
export type GitProviderTarget =
 | (GitProviderSource & {kind:'repository';repository:RepositoryIdentity})
 | (GitProviderSource & {kind:'gist'})
 | (GitProviderSource & {kind:'pull-request';repository:RepositoryIdentity;number:number;headSha:string;ref:string;baseRef:string});
