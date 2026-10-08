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

test('Codespaces connections, files and ports have selected-record task destinations',()=>{const areas=nativeAreas.codespaces!;const workflows=areas.flatMap(area=>area.workflows||[]);assert.deepEqual(workflows.map(task=>task.commandId),['codespace ssh','codespace code','codespace jupyter','codespace cp','codespace ports forward','codespace ports visibility']);for(const area of areas.filter(area=>area.workflows?.length)){assert.equal(area.selected,true);assert.equal(area.actions.length,0);for(const task of area.workflows!)assert.ok(task.label&&task.yue);}assert.ok(!workflows.some(task=>task.commandId==='preview prompter'));});

test('local Git handoffs belong to selected repository, gist and pull request records',()=>{
 const actual=Object.entries(nativeAreas).flatMap(([domain,areas])=>areas.flatMap(area=>(area.handoffs||[]).map(task=>({domain,area,task}))));
 assert.deepEqual(actual.map(item=>[item.domain,item.task.action]),[['repositories','repositories.clone-source'],['pull-requests','pulls.checkout-source'],['gists','gists.clone-source']]);
 for(const item of actual){assert.equal(item.area.selected,true);assert.equal(item.area.id,'local-git');assert.equal(item.area.actions.length,0);assert.ok(item.task.label&&item.task.yue);}
});
