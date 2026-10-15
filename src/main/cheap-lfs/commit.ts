import {createHash} from 'node:crypto';
import {lstat} from 'node:fs/promises';
import {join} from 'node:path';
import type {CheapLfsHostOptions} from './host';
import {CheapLfsPinThresholdBytes} from './host';
import {validateCheapLfsTrackedPath} from './pointer';
import {isCheapLfsOwnedArtifactPath} from './owned-artifacts';
import {defaultCheapLfsTrackedPathStore as tracked} from './tracked-path-store';

export interface CheapLfsCommitProof {readonly expectedParent:string;readonly rollbackHead?:string;readonly files:ReadonlyArray<{relativePath:string;sha256:string}>}
export async function captureCheapLfsCommitProof(root:string,expectedParent:string,paths:ReadonlyArray<string>,rollbackHead=expectedParent):Promise<CheapLfsCommitProof>{const files=[];for(const relativePath of new Set(paths)){const proof=await tracked.proveExisting(root,relativePath);if(proof.sizeInBytes>4*1024*1024||!proof.sha256)throw Error('Required pointer or registry key exceeds its bounded commit proof');files.push({relativePath,sha256:proof.sha256})}return {expectedParent,rollbackHead,files}}
/** Prove post-hook commit contents. Rollback is exact compare-and-swap and preserves index/worktree. */
export async function verifyCheapLfsCommit(root:string,commitSha:string,proof:CheapLfsCommitProof,execute:CheapLfsHostOptions['executeGit']):Promise<void>{
 if(!/^[a-f0-9]{40,64}$/.test(commitSha)||!/^([a-f0-9]{40,64})?$/.test(proof.expectedParent))throw Error('Invalid commit proof identity');
 const rollbackHead=proof.rollbackHead??proof.expectedParent;if(!/^([a-f0-9]{40,64})?$/.test(rollbackHead))throw Error('Invalid rollback identity');
 const run=(argv:string[],maximumBytes=4*1024*1024)=>execute({root,argv,maximumBytes});
 try{const actualHead=await run(['rev-parse','--verify','HEAD'],1024);if(actualHead.exitCode!==0||actualHead.stdout.toString('utf8').trim()!==commitSha)throw Error('HEAD changed before Cheap LFS commit verification');const parent=await run(['rev-parse',`${commitSha}^`],1024);if(proof.expectedParent&&(parent.exitCode!==0||parent.stdout.toString('utf8').trim()!==proof.expectedParent))throw Error('Cheap LFS commit has an unexpected parent');if(!proof.expectedParent&&parent.exitCode===0)throw Error('Expected an initial Cheap LFS commit without a parent');for(const file of proof.files){const contents=await run(['show',`${commitSha}:${file.relativePath}`]);if(contents.exitCode!==0||createHash('sha256').update(contents.stdout).digest('hex')!==file.sha256)throw Error('Commit hook changed a required Cheap LFS pointer or key')}}catch(error){if(rollbackHead){const rollback=await run(['update-ref','HEAD',rollbackHead,commitSha],1024);if(rollback.exitCode!==0)throw Error('Cheap LFS commit proof failed and HEAD moved concurrently. Preserve the current state and inspect both commits.')}else{const rollback=await run(['update-ref','-d','HEAD',commitSha],1024);if(rollback.exitCode!==0)throw Error('Cheap LFS initial commit proof failed; concurrent HEAD was preserved.')}throw error}
}
/** Conservative offline gate for bulk workflows that cannot interactively prepare payloads. */
export async function checkPayloadReady(root:string,execute:CheapLfsHostOptions['executeGit']):Promise<void>{const listed=await execute({root,argv:['ls-files','-z','--cached','--others','--exclude-standard'],maximumBytes:8*1024*1024});if(listed.exitCode!==0)throw Error('Cannot verify large-file readiness');for(const relativePath of new Set(listed.stdout.toString('utf8').split('\0').filter(Boolean))){if(isCheapLfsOwnedArtifactPath(relativePath))throw Error('Private Cheap LFS scratch requires recovery before bulk staging');if(validateCheapLfsTrackedPath(relativePath)!==relativePath)continue;const info=await lstat(join(root,relativePath)).catch(()=>null);if(info?.isFile()&&info.size>CheapLfsPinThresholdBytes)throw Error(`Prepare large-file pointers in the repository workspace before bulk commit: ${relativePath}`)}}
