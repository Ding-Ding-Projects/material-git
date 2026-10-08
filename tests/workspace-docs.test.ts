import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {decodedDocumentationEntries,verifyDocumentationBundle} from '../scripts/docs-bundle.mjs';

async function fixture(run:(source:string,dist:string,asset:string,bodies:Record<string,string>)=>Promise<void>) {
 const directory=await mkdtemp(path.join(tmpdir(),'workspace-docs-'));
 const source=path.join(directory,'docs'),dist=path.join(directory,'dist');
 const bodies={'workspace.md':'# `Workspace`\nMain article.\n','nested/privacy.yue.md':'# 私隱\n保留 `source-id`，唔公開私人值。\n'};
 try {
  await mkdir(path.join(source,'nested'),{recursive:true});await mkdir(path.join(dist,'assets'),{recursive:true});
  for(const [id,body] of Object.entries(bodies)) await writeFile(path.join(source,id),body);
  await run(source,dist,path.join(dist,'assets','app.js'),bodies);
 } finally {await rm(directory,{recursive:true,force:true});}
}

test('raw documentation mapping decodes escaped backticks, unicode, template literals and variable aliases',()=>{
 const code='const a=`# \\`Workspace\\`\\nMain article.\\n`,b="# \\u79c1\\u96b1\\n",alias=a;const docs={"../../docs/workspace.md":alias,"../../docs/nested/privacy.yue.md":b};';
 const entries=decodedDocumentationEntries(code);
 assert.ok(entries.get('workspace.md')?.has('# `Workspace`\nMain article.\n'));
 assert.ok(entries.get('nested/privacy.yue.md')?.has('# 私隱\n'));
});

test('documentation completeness guard rejects an omitted article and passes complete exact bodies',async()=>{
 await fixture(async(source,dist,asset,bodies)=>{
  await writeFile(asset,'const docs='+JSON.stringify({'workspace.md':bodies['workspace.md']})+';');
  await assert.rejects(verifyDocumentationBundle(dist,source),/nested\/privacy.yue.md/);
  await writeFile(asset,'const docs='+JSON.stringify(bodies)+';');
  await verifyDocumentationBundle(dist,source);
  const inventory=JSON.parse(await readFile(path.join(dist,'documentation-inventory.json'),'utf8'));
  assert.equal(inventory.count,2);assert.deepEqual(inventory.articles.map((a:{id:string})=>a.id),['nested/privacy.yue.md','workspace.md']);
  assert.equal('body' in inventory.articles[0],false);
 });
});

test('unrelated literal text, swapped bodies and a matching title cannot satisfy an article mapping',async()=>{
 await fixture(async(source,dist,asset,bodies)=>{
  await writeFile(asset,'const unrelated='+JSON.stringify(bodies)+';const docs={"../../docs/workspace.md":"# `Workspace`"};');
  // Bare exact mappings are accepted fixture paths; unrelated literal strings
  // alone must not stand in for the missing source-path/body associations.
  await writeFile(asset,'const unrelated=['+Object.values(bodies).map(body=>JSON.stringify(body)).join(',')+'];const docs={"../../docs/workspace.md":"# `Workspace`","../../docs/nested/privacy.yue.md":"# 私隱"};');
  await assert.rejects(verifyDocumentationBundle(dist,source),/workspace.md/);
  await writeFile(asset,'const docs='+JSON.stringify({'workspace.md':bodies['nested/privacy.yue.md'],'nested/privacy.yue.md':bodies['workspace.md']})+';');
  await assert.rejects(verifyDocumentationBundle(dist,source),/nested\/privacy.yue.md.*workspace.md/);
 });
});

test('malformed JavaScript cannot bypass the documentation guard',()=>{
 assert.throws(()=>decodedDocumentationEntries('const docs={"workspace.md":'),/Cannot parse/);
});
