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
