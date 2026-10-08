import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const checker=await import('../scripts/check-action-audits.mjs');
const json=async(p:string)=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
const [github,git,catalog,reference,api]=await Promise.all(['docs/coverage/github-action-map.json','docs/coverage/git-action-map.json','data/gh-catalog.json','data/gh-reference.json','data/github-api-catalog.json'].map(json));
test('official inventories retain every action and explicitly do not certify functionality',()=>{
 assert.deepEqual(checker.checkGithubAudit(github,catalog,reference,api),{inventoryComplete:true,functionalityCertified:false});
 assert.deepEqual(checker.checkGitAudit(git),{inventoryComplete:true,functionalityCertified:false});
});
test('audit integrity rejects missing leaves, flags, config, environment and API rows',()=>{
 for(const field of ['cli','configuration','environment','rest','graphql']){const bad=structuredClone(github);bad[field].pop();assert.throws(()=>checker.checkGithubAudit(bad,catalog,reference,api));}
 const bad=structuredClone(github);bad.cli[0].flags.pop();assert.throws(()=>checker.checkGithubAudit(bad,catalog,reference,api),/flags/);
 const missingEvidence=structuredClone(github);delete missingEvidence.rest[0].evidence;assert.throws(()=>checker.checkGithubAudit(missingEvidence,catalog,reference,api),/evidence/);
});
test('Git map rejects omitted plumbing, option safeguards and evidence limits',()=>{
 const bad=structuredClone(git);bad.commands=bad.commands.filter((x:{name:string})=>x.name!=='update-ref');assert.throws(()=>checker.checkGitAudit(bad),/incomplete/);
 const missing=structuredClone(git);missing.commands.find((x:{name:string})=>x.name==='reset').optionCoverage.pop();assert.throws(()=>checker.checkGitAudit(missing),/option coverage/);
 const limits=structuredClone(git);limits.limitations=[];assert.throws(()=>checker.checkGitAudit(limits),/limits/);
});
