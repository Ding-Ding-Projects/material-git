import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compactTabLabel} from '../src/renderer/workspace-labels.js';
test('compact tabs retain readable labels for English, Cantonese and bilingual destinations',()=>{
 assert.equal(compactTabLabel('Repositories'),'RP');
 assert.equal(compactTabLabel('Pull requests'),'PR');
 assert.equal(compactTabLabel('拉取要求'),'拉取');
 assert.equal(compactTabLabel('Pull requests · 拉取要求'),'PR');
 assert.equal(compactTabLabel(''),'…');
});

test('compact destination codes remain distinct for localized and renamed tabs',()=>{
 assert.notEqual(compactTabLabel('Repositories'),compactTabLabel('Releases'));
 assert.equal(compactTabLabel('版本','releases'),'RL');
 assert.equal(compactTabLabel('My saved releases','destination:releases'),'RL');
 assert.equal(compactTabLabel('Actions'),'AX');
 assert.equal(compactTabLabel('Accounts'),'AC');
});
