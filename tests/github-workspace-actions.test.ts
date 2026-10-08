import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nativeAreas,taskLabels,nativeAreaEligible} from '../src/renderer/github-workspace-actions.js';
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

test('run monitoring and release preparation have appropriate live contexts',()=>{const monitor=nativeAreas.actions!.find(area=>area.actions.includes('actions.watch'))!;assert.equal(monitor.selected,true);assert.equal(nativeAreaEligible(monitor,'runs'),true);assert.equal(nativeAreaEligible(monitor,'workflows'),false);assert.equal(nativeAreas.releases!.find(area=>area.actions.includes('releases.create-with-options'))!.selected,undefined);});

test('structured dispatch belongs only to workflow selections and creation is usable before selecting a repository',()=>{const dispatch=nativeAreas.actions!.find(area=>area.actions.includes('actions.dispatch-with-options'))!;assert.equal(nativeAreaEligible(dispatch,'workflows'),true);assert.equal(nativeAreaEligible(dispatch,'runs'),false);const create=nativeAreas.repositories!.find(area=>area.actions.includes('repositories.create-with-options'))!;assert.equal(create.selected,undefined);});
