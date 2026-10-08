import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compactTabLabel} from '../src/renderer/workspace-labels.js';
test('compact tabs retain readable labels for English, Cantonese and bilingual destinations',()=>{
 assert.equal(compactTabLabel('Repositories'),'RE');
 assert.equal(compactTabLabel('Pull requests'),'PR');
 assert.equal(compactTabLabel('拉取要求'),'拉取');
 assert.equal(compactTabLabel('Pull requests · 拉取要求'),'PR');
 assert.equal(compactTabLabel(''),'…');
});
