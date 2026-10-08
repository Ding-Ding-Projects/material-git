import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function exact(rows, expected, key, label) {
 const names=rows.map(key); const set=new Set(names);
 if(set.size!==names.length)throw new Error(`${label}: duplicate row`);
 const missing=expected.filter(x=>!set.has(x));const extra=names.filter(x=>!expected.includes(x));
 if(missing.length||extra.length)throw new Error(`${label}: missing ${missing.join(', ')}; extra ${extra.join(', ')}`);
}
export function checkGithubAudit(map,catalog,reference,api) {
 if(map.cli.length!==196||map.rest.length!==1232||map.graphql.length!==309)throw new Error('Pinned official inventory boundary is incomplete');
 exact(map.cli,catalog.commands.map(x=>x.id),x=>x.command,'CLI commands');
 for(const command of catalog.commands){const row=map.cli.find(x=>x.command===command.id);exact(row.flags,command.options.map(x=>x.name),x=>x.name,`${command.id} flags`);if(!row.evidence||!row.gui||!row.backend)throw new Error(`${command.id}: missing evidence/status`);}
 exact(map.configuration,reference.configSettings.map(x=>x.key),x=>x.key,'Configuration');
 exact(map.environment,reference.environment.flatMap(x=>x.names),x=>x.name,'Environment');
 exact(map.globalFlags,reference.globalFlags.map(x=>x.name),x=>x.name,'Global flags');
 exact(map.helpTopics,reference.helpTopics.map(x=>x.id),x=>x.id,'Help topics');
 exact(map.rest,api.operations.map(x=>x.operationId),x=>x.operationId,'REST operations');
 const roots=api.graphql.filter(x=>['Query','Mutation'].includes(x.name)).flatMap(x=>x.fields.map(f=>`${x.name.toLowerCase()}:${f.name}`));
 exact(map.graphql,roots,x=>`${x.kind}:${x.field}`,'GraphQL root fields');
 for(const row of [...map.rest,...map.graphql])if(!row.evidence||!row.gui||!row.permission)throw new Error('API row missing evidence/status/permission');
 for(const name of ['rest','graphql'])if(map.sources[name].pinned.sha256!==api.sources[name].sha256)throw new Error(`Pinned ${name} provenance mismatch`);
 return {inventoryComplete:true,functionalityCertified:false};
}
export function checkGitAudit(map) {
 if(map.commands.length!==173||map.commands.filter(x=>x.builtin).length!==149||map.configuration.length!==763||map.environment.length!==183)throw new Error('Git official-source inventory boundary is incomplete');
 for(const key of ['commands','configuration','environment']){const ids=map[key].map(x=>x.name??x.key);if(new Set(ids).size!==ids.length)throw new Error(`Duplicate ${key}`);}
 for(const row of map.commands){if(!row.proposedDestination||!row.risk||!row.implementation||!row.gui||!row.verification.length)throw new Error(`${row.name}: missing mapping/evidence`);exact(row.optionCoverage,row.options,x=>x.name,`${row.name} option coverage`);}
 if(!map.limitations.length||map.scope!=='official-source-inventory;not-implementation-completion')throw new Error('Missing inventory evidence limits');
 return {inventoryComplete:true,functionalityCertified:false};
}
export async function checkActionAudits(root) {
 const json=async p=>JSON.parse(await readFile(path.join(root,p),'utf8'));
 const [github,git,catalog,reference,api]=await Promise.all(['docs/coverage/github-action-map.json','docs/coverage/git-action-map.json','data/gh-catalog.json','data/gh-reference.json','data/github-api-catalog.json'].map(json));
 return {github:checkGithubAudit(github,catalog,reference,api),git:checkGitAudit(git)};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await checkActionAudits(fileURLToPath(new URL('..',import.meta.url))),null,2));
