import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {materialSymbols} from '../src/renderer/material-symbols';
test('every runtime symbol path is preserved from a vendored official SVG',()=>{
 const originals=readdirSync('assets/material-symbols').filter(name=>name.endsWith('.svg')).map(name=>readFileSync(`assets/material-symbols/${name}`,'utf8'));
 for(const [name,paths] of Object.entries(materialSymbols)){assert.ok(paths.length,name);for(const path of paths)assert.ok(originals.some(svg=>svg.includes(`d="${path}"`)),name);}
 assert.match(readFileSync('assets/material-symbols/LICENSE','utf8'),/Apache License/);
 assert.match(readFileSync('assets/material-symbols/README.md','utf8'),/49d4db35df873165d6bd6ba09b063c7dafbac2f4/);
});
test('workspace primitive interactions use official controls and shadow modules preserve default anatomy',()=>{
 for(const name of ['workspace-controls','material-color-field']){
  const source=readFileSync(`src/renderer/${name}.ts`,'utf8');
  assert.doesNotMatch(source,/<(?:details|summary|button|select|textarea)\b/i,name);
  for(const input of source.matchAll(/<input\b[^>]*>/gi))assert.match(input[0],/\bhidden\b/,name);
  assert.doesNotMatch(source,/<div\b[^>]*\brole=["']?option\b/i,name);
 }
 for(const name of ['accounts','api-controls','api-explorer-style','api-explorer','converter-source-browser','converters','ollama','security','startup-personalization','task-support','tools','updates']){
  const source=readFileSync(`src/renderer/${name}.ts`,'utf8');
  assert.doesNotMatch(source,/--md-[\w-]+-container-shape:(?:8|12)px/,name);
  assert.doesNotMatch(source,/--md-[\w-]+-container-height:32px/,name);
 }
});
