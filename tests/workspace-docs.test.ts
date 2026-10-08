import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const helper=new URL('../scripts/docs-bundle.mjs',import.meta.url).href;
test('documentation completeness guard fails when a nested article is omitted, then passes a complete bundle',async()=>{
 const {verifyDocumentationBundle}=await import(helper);const directory=await mkdtemp(path.join(tmpdir(),'workspace-docs-')),source=path.join(directory,'docs'),dist=path.join(directory,'dist');await mkdir(path.join(source,'nested'),{recursive:true});await mkdir(path.join(dist,'assets'),{recursive:true});await writeFile(path.join(source,'workspace.md'),'# Workspace\nMain article.');await writeFile(path.join(source,'nested','privacy.md'),'# Privacy\nNested article.');const asset=path.join(dist,'assets','app.js');await writeFile(asset,'const docs={"workspace.md":"# Workspace"};');await assert.rejects(verifyDocumentationBundle(dist,source),/nested\/privacy.md/);await writeFile(asset,'const docs={"workspace.md":"# Workspace","nested/privacy.md":"# Privacy"};');await verifyDocumentationBundle(dist,source);const inventory=JSON.parse(await readFile(path.join(dist,'documentation-inventory.json'),'utf8'));assert.equal(inventory.count,2);assert.deepEqual(inventory.articles.map((a:{id:string})=>a.id),['nested/privacy.md','workspace.md']);
});
