import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {validateFeatureInventory,requiredFeatureIds} from '../scripts/check-feature-coverage.mjs';
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
