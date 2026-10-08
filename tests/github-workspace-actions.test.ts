import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nativeAreas,taskLabels} from '../src/renderer/github-workspace-actions.js';
import {nativeGitHubTaskRoutes} from '../src/shared/github-native.js';

test('every native GitHub task has one localized contextual destination',()=>{
 const actions=Object.values(nativeAreas).flatMap(areas=>areas.flatMap(area=>area.actions));
 assert.equal(new Set(actions).size,actions.length,'Tasks must have a single contextual home');
 assert.deepEqual([...actions].sort(),nativeGitHubTaskRoutes.map(route=>route.action).sort());
 for(const [domain,areas] of Object.entries(nativeAreas))for(const area of areas){
  assert.ok(area.label&&area.yue&&area.icon,`${domain}/${area.id} needs authored UI labels`);
  if(area.initial)assert.ok(area.actions.includes(area.initial));
  for(const action of area.actions)assert.ok(taskLabels[action.split('.').at(-1)!],`${action} needs Cantonese copy`);
 }
});
