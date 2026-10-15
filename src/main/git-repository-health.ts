import type {GitSnapshot} from '../shared/git';
import type {WorktreeGrant} from './git-worktrees';
type Read=(grant:WorktreeGrant,argv:string[],allowFailure?:boolean)=>Promise<{ok:boolean;output:string;error:string}>;
/** Local health facts and recovery next steps. Integrity checking and cleanup remain explicit tasks. */
export async function repositoryHealth(grant:WorktreeGrant,snapshot:GitSnapshot,read:Read):Promise<string>{
 const [objects,shallow,sparse,remotes,upstream]=await Promise.all([
  read(grant,['count-objects','-v']),read(grant,['rev-parse','--is-shallow-repository']),
  read(grant,['config','--bool','--get','core.sparseCheckout'],true),read(grant,['remote','-v']),
  read(grant,['rev-parse','--symbolic-full-name','@{upstream}'],true),
 ]);
 let tracking='No configured upstream. Select a tracking branch before comparing publication state.';
 if(upstream.ok){const divergence=await read(grant,['rev-list','--left-right','--count','HEAD...@{upstream}'],true);tracking=upstream.output.trim()+(divergence.ok?'\nAhead / behind recorded upstream: '+divergence.output.trim():'\nComparison unavailable: '+divergence.error.trim());}
 const lines=[`Repository: ${snapshot.name}`,`Root: ${grant.root}`,`Git directory: ${grant.gitDir}`,`Shared directory: ${grant.commonDir}`,`Layout: ${grant.bare?'Bare object store':'Working repository'}`,`Branch: ${snapshot.branch}`,`HEAD: ${snapshot.head||'Unborn branch'}`,`Changed paths: ${snapshot.files.length}`,`In-progress operation: ${snapshot.operation||'None'}`,`Shallow history: ${shallow.output.trim()}`,`Sparse checkout: ${sparse.output.trim()||'false'}`,'','Recorded upstream',tracking,'','Configured remotes',remotes.output.trim()||'No remotes configured.','','Object storage (Git reports size and size-pack in KiB)',objects.output.trim(),'','Repository program settings',...(snapshot.trust.length?snapshot.trust:['No executable repository settings detected by the trust inspector.']),'','Next steps'];
 if(snapshot.operation)lines.push('Open Conflicts to inspect the active operation, then explicitly continue or abort.');
 if(snapshot.files.length)lines.push('Review Changes and preserve staged, unstaged and untracked work before cleanup.');
 if(shallow.output.trim()==='true')lines.push('History is incomplete. Deepen history through an explicitly reviewed remote operation before ancestry-dependent cleanup.');
 lines.push('Use Integrity check to run an explicit object consistency inspection. This overview does not certify object integrity.','Use Recovery log to find earlier commits; retain a recovery branch before reset or expiration.','Run maintenance only after reviewing its task and retention effects. No repair, fetch, prune or cleanup ran while generating this overview.','Upstream comparisons use local references and may be stale. Refresh a selected remote separately when live publication evidence is required.');
 return lines.join('\n');
}
