import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const requiredFeatureIds = Object.freeze([
 'language','funny-emoji','personal-vocabulary','school-mode','narration','scheduled-settings','display-name','adhd-modes','dim-sum','dim-sum-photo-source',
 'material-design','workflow-navigation','motion','appearance-editor','color-picker','logo-customization','overlay-panels','collapse-filters','accessibility-sizing','functional-ui',
 'tabs','regex-search','command-palette','context-menus','menu-shortcuts','rich-controls','guided-forms','settings-explanations','blank-editors',
 'super-confirmation','element-locks','support-tickets','unlock-ladder','authenticator','qr-pairing','honest-monetization',
 'local-history','exports','bulk-actions','changelog','offline-docs','rendered-provider-text','notifications',
 'file-converter','ollama-suite','external-editor','download-handoff','forge-publishing','progress-recovery',
 'completeness-parity','front-provenance','product-evidence','screen-recording','design-reference-parity','design-folder','responsive-layout-matrix','public-capture-gallery',
 'landing-site','responsive-documentation-site','installer-download-button','feature-articles','vendored-fonts','shared-link-embed','homepage-link','vocabulary-unlock-boundary',
 'status-hub','discord-status-bridge','panic-webhooks','tidbyt-displays',
 'build-entrypoints','fresh-build-run-command','dependency-fetcher','bundled-dependencies','squirrel-installer','self-signing','auto-updates','app-icon',
 'release-workflow','release-timing','release-line-counts','release-dim-sum-photo','dim-sum-code-names','ci-bootstrap','runner-selection','encrypted-public-builder',
 'tabbed-readme','human-time-estimate','sanitized-instruction-copy','agents-md-vocabulary-block','vocabulary-hash-lock','roadmap-checklist','feature-docs','postman-collections','wiki-and-site-sync','handoff-record','closeout-prompt','discussion-records','project-board','operational-skill',
 'instruction-prompt-banner','portable-instruction-editions','project-profile','roblox-model-catalogue','roblox-visual-realism',
]);
// Hand-maintained applicability boundaries: a=desktop, s=site, r=repository.
const expectedScopes={
 "language": "as",
 "funny-emoji": "as",
 "personal-vocabulary": "as",
 "school-mode": "as",
 "narration": "as",
 "scheduled-settings": "as",
 "display-name": "a",
 "adhd-modes": "as",
 "dim-sum": "as",
 "dim-sum-photo-source": "asr",
 "material-design": "as",
 "workflow-navigation": "as",
 "motion": "as",
 "appearance-editor": "as",
 "color-picker": "as",
 "logo-customization": "as",
 "overlay-panels": "as",
 "collapse-filters": "as",
 "accessibility-sizing": "as",
 "functional-ui": "as",
 "tabs": "as",
 "regex-search": "as",
 "command-palette": "as",
 "context-menus": "as",
 "menu-shortcuts": "as",
 "rich-controls": "as",
 "guided-forms": "as",
 "settings-explanations": "as",
 "blank-editors": "as",
 "super-confirmation": "as",
 "element-locks": "as",
 "support-tickets": "as",
 "unlock-ladder": "as",
 "authenticator": "as",
 "qr-pairing": "as",
 "honest-monetization": "as",
 "local-history": "as",
 "exports": "as",
 "bulk-actions": "as",
 "changelog": "as",
 "offline-docs": "a",
 "rendered-provider-text": "as",
 "notifications": "as",
 "file-converter": "as",
 "ollama-suite": "as",
 "external-editor": "a",
 "download-handoff": "a",
 "forge-publishing": "a",
 "progress-recovery": "as",
 "completeness-parity": "asr",
 "front-provenance": "as",
 "product-evidence": "asr",
 "screen-recording": "ar",
 "design-reference-parity": "as",
 "design-folder": "r",
 "responsive-layout-matrix": "as",
 "public-capture-gallery": "sr",
 "landing-site": "s",
 "responsive-documentation-site": "s",
 "installer-download-button": "s",
 "feature-articles": "s",
 "vendored-fonts": "asr",
 "shared-link-embed": "sr",
 "homepage-link": "sr",
 "vocabulary-unlock-boundary": "as",
 "status-hub": "asr",
 "discord-status-bridge": "",
 "panic-webhooks": "",
 "tidbyt-displays": "",
 "build-entrypoints": "r",
 "fresh-build-run-command": "r",
 "dependency-fetcher": "r",
 "bundled-dependencies": "a",
 "squirrel-installer": "ar",
 "self-signing": "",
 "auto-updates": "a",
 "app-icon": "ar",
 "release-workflow": "r",
 "release-timing": "r",
 "release-line-counts": "r",
 "release-dim-sum-photo": "r",
 "dim-sum-code-names": "asr",
 "ci-bootstrap": "r",
 "runner-selection": "r",
 "encrypted-public-builder": "",
 "tabbed-readme": "r",
 "human-time-estimate": "r",
 "sanitized-instruction-copy": "r",
 "agents-md-vocabulary-block": "r",
 "vocabulary-hash-lock": "r",
 "roadmap-checklist": "r",
 "feature-docs": "r",
 "postman-collections": "r",
 "wiki-and-site-sync": "sr",
 "handoff-record": "r",
 "closeout-prompt": "r",
 "discussion-records": "r",
 "project-board": "r",
 "operational-skill": "r",
 "instruction-prompt-banner": "",
 "portable-instruction-editions": "",
 "project-profile": "r",
 "roblox-model-catalogue": "",
 "roblox-visual-realism": ""
};
const statuses=new Set(['implemented','partial','open','blocked','unknown','not-applicable']);
const proofFields=['documentation','localization','persistence','focusedGate','negativeGate','builtInteraction','screenshot'];
const kinds=new Set(['scope','source-review','unverified','interaction','screenshot','gate','persistence','localization','external-state']);
const nonempty=value=>typeof value==='string'&&value.trim().length>0;
function localFile(root,relative){if(!nonempty(relative)||path.isAbsolute(relative)||relative.includes('://'))throw new Error('Evidence must reference a repository-relative public file');const file=path.resolve(root,relative);if(!file.startsWith(path.resolve(root)+path.sep))throw new Error('Evidence path escapes repository');return file;}
export async function validateFeatureInventory(inventory,root,{requireComplete=false}={}) {
 if(inventory.version!==1||inventory.features.length!==104||requiredFeatureIds.length!==104)throw new Error('Required feature inventory must contain all 104 rows');
 const ids=inventory.features.map(x=>x.id);
 if(new Set(ids).size!==104)throw new Error('Duplicate feature identifier');
 for(const id of requiredFeatureIds)if(!ids.includes(id))throw new Error(`Missing required feature ${id}`);
 const unresolved=[];
 for(const row of inventory.features){
  if(!requiredFeatureIds.includes(row.id)||!nonempty(row.title)||!nonempty(row.category)||!nonempty(row.requirement)||!nonempty(row.implementationNotes)||!nonempty(row.remaining))throw new Error(`${row.id}: missing requirement or assessment`);
  for(const locale of ['en','yue']){const file=localFile(root,row.documentation?.[locale]);const article=await readFile(file,'utf8').catch(()=>{throw new Error(`${row.id}: missing ${locale} article`);});if(article.length<700||!article.includes('## ')||!article.includes(row.id))throw new Error(`${row.id}: incomplete ${locale} article`);}
  for(const surface of ['app','site','repository']){
   const state=row.surfaces?.[surface];
   if(!state||typeof state.applicable!=='boolean'||!statuses.has(state.status))throw new Error(`${row.id}/${surface}: missing applicability/status`);
   if(state.applicable!==expectedScopes[row.id].includes({app:'a',site:'s',repository:'r'}[surface]))throw new Error(`${row.id}/${surface}: applicability differs from the reviewed scope boundary`);
   if(!Array.isArray(state.evidence)||!state.evidence.length)throw new Error(`${row.id}/${surface}: missing evidence`);
   for(const item of state.evidence){if(!kinds.has(item.kind)||!nonempty(item.detail))throw new Error(`${row.id}/${surface}: invalid evidence`);await stat(localFile(root,item.reference)).catch(()=>{throw new Error(`${row.id}/${surface}: missing evidence file ${item.reference}`);});}
   if(!state.applicable){if(state.status!=='not-applicable'||!nonempty(state.reason))throw new Error(`${row.id}/${surface}: missing narrow-scope exclusion reason`);continue;}
   if(state.status==='not-applicable'||!Array.isArray(state.missing)||!nonempty(state.implementation))throw new Error(`${row.id}/${surface}: invalid applicable assessment`);
   for(const field of proofFields){
    if(!nonempty(state.proof?.[field]))throw new Error(`${row.id}/${surface}: missing ${field} proof state`);
    if(state.proof[field].startsWith('not-applicable:')&&(surface!=='repository'||!['builtInteraction','screenshot','localization','persistence'].includes(field)))throw new Error(`${row.id}/${surface}: unsupported ${field} proof exclusion`);
   }
   if(state.status==='implemented'){
    if(state.missing.length||proofFields.some(key=>state.proof[key]!=='verified'&&!state.proof[key].startsWith('not-applicable:')))throw new Error(`${row.id}/${surface}: implemented claim has unresolved proof`);
    for(const [kind,field] of [['interaction','builtInteraction'],['screenshot','screenshot'],['gate','focusedGate'],['persistence','persistence'],['localization','localization']])if(state.proof[field]==='verified'&&!state.evidence.some(e=>e.kind===kind))throw new Error(`${row.id}/${surface}: implemented claim missing ${kind} evidence`);
   }else{if(!state.missing.length)throw new Error(`${row.id}/${surface}: unresolved row has no next action`);unresolved.push(`${row.id}/${surface}:${state.status}`);}
  }
 }
 if(inventory.completenessCertified===true&&unresolved.length)throw new Error('False completeness certification with unresolved obligations');
 if(requireComplete&&unresolved.length)throw new Error(`Functional completeness remains open for ${unresolved.length} surface obligations: ${unresolved.join(', ')}`);
 return {inventoryComplete:true,featureCount:104,functionalCompleteness:unresolved.length===0,unresolved};
}
export async function checkFeatureCoverage(root,{requireComplete=false}={}) {
 const inventory=JSON.parse(await readFile(path.join(root,'docs/coverage/features.json'),'utf8'));
 const publishedIds=JSON.parse(await readFile(path.join(root,'docs/requirements/required-feature-ids.json'),'utf8'));
 if(JSON.stringify([...publishedIds].sort())!==JSON.stringify([...requiredFeatureIds].sort()))throw new Error('Published required feature IDs differ from the reviewed canonical boundary');
 return validateFeatureInventory(inventory,root,{requireComplete});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=await checkFeatureCoverage(fileURLToPath(new URL('..',import.meta.url)),{requireComplete:process.argv.includes('--require-complete')});
 console.log(`Inventory complete: ${result.featureCount} rows. Functional completeness: ${result.functionalCompleteness?'verified':'OPEN'}. Unresolved surface obligations: ${result.unresolved.length}.`);
}
