import test from 'node:test';import assert from 'node:assert/strict';
import {GitHubService} from '../src/main/github';
import {selectedTarget} from '../src/renderer/github-workspace-model';

test('issue/PR endpoint selections use visible numbers while retaining database identity',()=>{
 assert.deepEqual(selectedTarget('issues',{id:88042,number:42}),{id:'42',providerId:'88042',providerKind:'issue'});
 assert.deepEqual(selectedTarget('pull-requests',{id:99042,number:42}),{id:'42',providerId:'99042',providerKind:'pull-request'});
 assert.deepEqual(selectedTarget('pull-requests',{id:'42',number:42,databaseId:'88042',providerKind:'issue'}),{id:'42',providerId:'88042',providerKind:'issue'});
 assert.throws(()=>selectedTarget('issues',{id:88042}),/no valid.*number/);
});

test('native lists retain distinct database IDs and identify PR search issue records',async()=>{
 const service=new GitHubService(process.execPath,process.cwd(),undefined,{request:async(_method,endpoint)=>({data:endpoint.startsWith('search/')?{items:[{id:88042,number:42,title:'Search pull',pull_request:{url:'fixture'}}]}:[{id:endpoint.includes('/pulls')?99042:88042,number:42,title:'Fixture'}],hasNext:false})});
 const issue=(await service.handle('issues.list',{repository:'owner/repo'})).items[0];assert.equal(issue.id,'42');assert.equal(issue.databaseId,'88042');assert.equal(issue.providerKind,'issue');
 const pull=(await service.handle('pulls.list',{repository:'owner/repo'})).items[0];assert.equal(pull.id,'42');assert.equal(pull.databaseId,'99042');assert.equal(pull.providerKind,'pull-request');
 const search=(await service.handle('pulls.list',{repository:'owner/repo',state:'merged'})).items[0];assert.equal(search.databaseId,'88042');assert.equal(search.providerKind,'issue');
});

test('detail and reviewed mutations bind selected provider IDs without treating them as endpoint numbers',async()=>{
 const calls:{method:string;endpoint:string}[]=[];let issueId=88042;
 const service=new GitHubService(process.execPath,process.cwd(),undefined,{request:async(method,endpoint)=>{calls.push({method,endpoint});return {data:endpoint==='user'?{id:7}:endpoint.includes('/issues/42')?{id:issueId,number:42,node_id:'Issue_node'}:endpoint.includes('/pulls/42')?{id:99042,number:42,node_id:'Pull_node',head:{ref:'feature',sha:'a'.repeat(40),repo:{id:88}}}:{id:11},hasNext:false};}});
 const selected={repository:'owner/repo',id:42,providerId:88042,providerKind:'issue' as const};
 await service.handle('issues.detail',{...selected,tab:'overview'});assert.ok(calls.some(call=>call.endpoint==='repos/owner/repo/issues/42'));assert.ok(!calls.some(call=>call.endpoint.includes('/88042')));
 const review=await service.handle('review',{...selected,action:'issues.close',values:{}});assert.equal((review.review?.prepared as {endpoint:string}).endpoint,'repos/owner/repo/issues/42');
 issueId=88043;await assert.rejects(service.handle('apply',{reviewId:review.review!.reviewId,confirmed:true}),/selected provider record changed/);assert.equal(calls.filter(call=>call.method!=='GET').length,0);
 await assert.rejects(service.handle('issues.detail',{...selected,tab:'comments'}),/selected provider record changed/);
 await assert.rejects(service.handle('issues.lock',{...selected,values:{options:{},arguments:{}}}),/selected provider record changed/);assert.equal(calls.filter(call=>call.method!=='GET').length,0);
 issueId=88042;const pull=await service.handle('review',{...selected,action:'pulls.close',values:{}});assert.equal((pull.review?.prepared as {endpoint:string}).endpoint,'repos/owner/repo/pulls/42');
 await service.handle('apply',{reviewId:pull.review!.reviewId,confirmed:true});assert.deepEqual(calls.filter(call=>call.method!=='GET'),[{method:'PATCH',endpoint:'repos/owner/repo/pulls/42'}]);
});
