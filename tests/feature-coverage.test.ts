import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {validateFeatureInventory,validateFeatureArticlePair,requiredFeatureIds} from '../scripts/check-feature-coverage.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
const inventory=JSON.parse(await readFile(new URL('../docs/coverage/features.json',import.meta.url),'utf8'));
test('all 104 feature rows preserve open implementation and independent surface assessments',async()=>{
 assert.equal(requiredFeatureIds.length,104);
 const result=await validateFeatureInventory(inventory,root);
 assert.equal(result.inventoryComplete,true);assert.equal(result.functionalCompleteness,false);assert.ok(result.unresolved.length>100);
 await assert.rejects(validateFeatureInventory(inventory,root,{requireComplete:true}),/Functional completeness remains open/);
});
test('feature boundary rejects omitted row, renamed canonical obligation and missing evidence',async()=>{
 const absent=structuredClone(inventory);absent.features.pop();await assert.rejects(validateFeatureInventory(absent,root),/all 104/);
 const renamed=structuredClone(inventory);renamed.features[0].id='unrecognized-feature';await assert.rejects(validateFeatureInventory(renamed,root),/Missing required/);
 const evidence=structuredClone(inventory);evidence.features[0].surfaces.app.evidence=[];await assert.rejects(validateFeatureInventory(evidence,root),/missing evidence/);
 const doc=structuredClone(inventory);doc.features[0].documentation.en='docs/requirements/missing.md';await assert.rejects(validateFeatureInventory(doc,root),/missing en article/);
});
test('removing any one canonical obligation fails the completeness boundary',async()=>{
 for(const id of requiredFeatureIds){const missing={...inventory,features:inventory.features.filter((row:{id:string})=>row.id!==id)};await assert.rejects(validateFeatureInventory(missing,root),/all 104/,id);}
});
test('false completion, absent proof and unsupported exclusions fail closed',async()=>{
 const complete=structuredClone(inventory);complete.features[0].surfaces.app.status='implemented';await assert.rejects(validateFeatureInventory(complete,root),/unresolved proof/);
 const proof=structuredClone(inventory);delete proof.features[0].surfaces.app.proof.screenshot;await assert.rejects(validateFeatureInventory(proof,root),/screenshot proof/);
 const excluded=structuredClone(inventory);excluded.features[0].surfaces.app.applicable=false;excluded.features[0].surfaces.app.status='not-applicable';await assert.rejects(validateFeatureInventory(excluded,root),/scope boundary/);
 const unproven=structuredClone(inventory);unproven.features[0].surfaces.app.proof.screenshot='not-applicable:no capture';await assert.rejects(validateFeatureInventory(unproven,root),/unsupported screenshot proof exclusion/);
});

test('every Cantonese article contains its own requirement, support, remaining work and preserved source literals',async()=>{
 const requirements=new Set<string>();
 for(const row of inventory.features){
  const en=await readFile(new URL('../'+row.documentation.en,import.meta.url),'utf8');
  const yue=await readFile(new URL('../'+row.documentation.yue,import.meta.url),'utf8');
  const pair=validateFeatureArticlePair(row.id,en,yue);
  assert.equal(requirements.has(pair.requirement),false,row.id);requirements.add(pair.requirement);
  // Remove each required editorial section independently, across all 104 rows.
  for(const heading of ['要求嘅行為','目前支援同設定','失敗情況同剩餘工作']){
   const absent=yue.replace(new RegExp('^## '+heading+'\\n\\n[\\s\\S]*?(?=\\n## |$)','m'),'');
   assert.throws(()=>validateFeatureArticlePair(row.id,en,absent),/missing feature-specific Cantonese/,row.id+'/'+heading);
  }
 }
 assert.equal(requirements.size,104);
});
test('translation integrity rejects generic fallback, changed identifiers, missing controls and altered numeric facts',async()=>{
 const row=inventory.features.find((feature:{id:string})=>feature.id==='accessibility-sizing');
 const en=await readFile(new URL('../'+row.documentation.en,import.meta.url),'utf8');
 const yue=await readFile(new URL('../'+row.documentation.yue,import.meta.url),'utf8');
 assert.throws(()=>validateFeatureArticlePair(row.id,en,yue+'\n粵語說明草稿'),/generic Cantonese template/);
 assert.throws(()=>validateFeatureArticlePair(row.id,en,yue.replace('`fontScale`','`otherScale`')),/changed translated technical literal/);
 assert.throws(()=>validateFeatureArticlePair(row.id,en,yue.replace('`0.75`','`0.8`')),/changed translated technical literal/);
 const absent=yue.replace(/^## 控制項、預設值同限制\n\n[\s\S]*?(?=\n## |$)/m,'');
 assert.throws(()=>validateFeatureArticlePair(row.id,en,absent),/missing translated controls/);
 const plainEn=en+'\nMandatory 777-unit boundary.\n';
 assert.throws(()=>validateFeatureArticlePair(row.id,plainEn,yue),/missing translated numeric fact 777/);
});
