import test from 'node:test';
import assert from 'node:assert/strict';
test('picker provider calls and cursor caches are scoped to the explicit approved host',async()=>{const calls:string[][]=[];const list=createChoiceSource(async(_binary,args)=>{calls.push(args);return JSON.stringify([]);});await list('gh','/workspace','repository',{hostname:'github.com'});await list('gh','/workspace','repository',{hostname:'github.example'});assert.ok(calls[0].includes('--hostname=github.com'));assert.ok(calls[1].includes('--hostname=github.example'));await assert.rejects(list('gh','/workspace','repository',{hostname:'https://untrusted.example'}));assert.equal(calls.length,2);});
import { ChoiceSource, createChoiceSource } from '../src/main/choices';
const response=(body:unknown,next=false)=>`HTTP/2.0 200 OK\r\nContent-Type: application/json\r\n${next?'Link: <https://api.github.com/example?page=2>; rel="next", <https://api.github.com/example?page=5>; rel="last"\r\n':''}\r\n${JSON.stringify(body)}`;
test('repository search goes to the remote search API and does not filter a local page',async()=>{
 const calls:string[][]=[];const list=createChoiceSource(async(_binary,args)=>{calls.push(args);return response({items:[{full_name:'cli/cli',private:false}]},true);});
 const result=await list('gh','/workspace','repository',{query:'github cli language:go',page:2});assert.equal(result.items[0].value,'cli/cli');assert.equal(result.hasNext,true);assert.equal(result.searchMode,'remote');assert.equal(calls[0][1],'search/repositories?q=github%20cli%20language%3Ago&per_page=30&page=2');assert.ok(calls[0].includes('--include'));assert.ok(calls[0].includes('--method=GET'));
});
test('REST pagination follows Link metadata rather than row count, including empty filtered pages',async()=>{
 const full=Array.from({length:30},(_,i)=>({name:`branch-${i}`}));let call=0;const source=new ChoiceSource('gh','/workspace',async()=>response(++call===1?full:{workflows:[{id:1,name:'build',state:'active'}]},call===2));
 assert.equal((await source.list('branch',{repository:'o/r'})).hasNext,false);
 const filtered=await source.list('workflow',{repository:'o/r',query:'deploy'});assert.deepEqual(filtered.items,[]);assert.equal(filtered.hasNext,true);assert.equal(filtered.searchMode,'page-filter');assert.match(filtered.notice||'',/filters this page/);
});
test('issue sources exclude pull requests and issue searches carry repository/type scope',async()=>{
 const calls:string[][]=[];const source=new ChoiceSource('gh','/workspace',async(_b,args)=>{calls.push(args);return args[1].startsWith('search/')?response({items:[{number:5,title:'Bug',state:'open'}]}):response([{number:2,title:'PR',pull_request:{}},{number:3,title:'Issue'}],true);});
 const issues=await source.list('issue',{repository:'o/r'});assert.deepEqual(issues.items.map(c=>c.value),['3']);assert.equal(issues.hasNext,true);
 await source.list('issue',{repository:'o/r',query:'Bug'});assert.match(calls[1][1],/q=Bug%20repo%3Ao%2Fr%20is%3Aissue/);
});
test('environment, teams, milestones, and tags use semantic values and real collection endpoints',async()=>{
 const calls:string[][]=[];const source=new ChoiceSource('gh','/workspace',async(_b,args)=>{calls.push(args);return response(args[1].includes('/environments')?{environments:[{name:'production'}]}:args[1].includes('/teams')?[{name:'Platform',slug:'platform'}]:args[1].includes('/milestones')?[{number:7,title:'Next release',state:'open'}]:[{name:'v1.0'}]);});
 assert.equal((await source.list('environment',{repository:'org/r'})).items[0].value,'production');assert.equal((await source.list('team',{repository:'org/r'})).items[0].value,'org/platform');assert.equal((await source.list('milestone',{repository:'org/r'})).items[0].value,'Next release');assert.equal((await source.list('milestone-number',{repository:'org/r'})).items[0].value,'7');assert.equal((await source.list('tag',{repository:'org/r'})).items[0].value,'v1.0');assert.ok(calls.at(-1)?.[1].startsWith('repos/org/r/tags?'));
});
test('owners include the viewer and memberships; organization queries search remotely',async()=>{
 const calls:string[][]=[];const source=new ChoiceSource('gh','/workspace',async(_b,args)=>{calls.push(args);return response(args[1]==='user'?{login:'octocat'}:args[1].startsWith('search/')?{items:[{login:'openai',type:'Organization'}]}:[{login:'my-org',type:'Organization'}]);});
 assert.deepEqual((await source.list('owner')).items.map(c=>c.value),['octocat','my-org']);assert.equal((await source.list('organization',{query:'openai'})).searchMode,'remote');assert.match(calls.at(-1)?.[1]||'',/type%3Aorg/);
});
test('projects use GraphQL owner type, correct title/number values and actual pageInfo cursors',async()=>{
 const calls:string[][]=[];const source=new ChoiceSource('gh','/workspace',async(_b,args)=>{calls.push(args);if(args[1].startsWith('users/'))return response({type:'Organization'});const next=args.includes('after=cursor-1');return JSON.stringify({data:{organization:{projectsV2:{nodes:[{number:next?2:1,title:next?'Next':'Roadmap',id:'PVT_x',closed:false}],pageInfo:{hasNextPage:!next,endCursor:next?'cursor-2':'cursor-1'}}}}});});
 const first=await source.list('project',{repository:'org/repo',query:'Road'});assert.equal(first.items[0].value,'Roadmap');assert.equal(first.hasNext,true);
 const second=await source.list('project',{repository:'org/repo',query:'Road',page:2});assert.equal(second.items[0].value,'Next');assert.equal(second.hasNext,false);assert.ok(calls.at(-1)?.includes('after=cursor-1'));
 const numbered=await source.list('project-number',{repository:'org/repo'});assert.equal(numbered.items[0].value,'1');assert.ok(calls.some(args=>args.some(a=>a.startsWith('query=')&&a.includes('organization(login:$owner)'))));
});
test('searchable branch, milestone, label and user collections use GraphQL query variables',async()=>{
 const calls:string[][]=[];const source=new ChoiceSource('gh','/workspace',async(_b,args)=>{calls.push(args);const document=args.find(a=>a.startsWith('query='))||'';const field=document.includes('assignableUsers(')?'assignableUsers':document.includes('milestones(')?'milestones':document.includes('labels(')?'labels':'refs';return JSON.stringify({data:{repository:{[field]:{nodes:field==='assignableUsers'?[{login:'octocat'}]:field==='milestones'?[{number:1,title:'Shipping',state:'OPEN'}]:[{name:'shipping'}],pageInfo:{hasNextPage:false,endCursor:null}}}}});});
 for(const entity of ['branch','label','milestone','user']){const result=await source.list(entity,{repository:'o/r',query:'shipping'});assert.equal(result.searchMode,'remote');assert.equal(result.hasNext,false);assert.ok(result.items.length);}
 assert.ok(calls.every(args=>args.includes('search=shipping')));
});
test('invalid context and unsupported entities fail before invoking the CLI',async()=>{
 let calls=0;const source=new ChoiceSource('gh','/workspace',async()=>{calls++;return response([]);});
 for(const context of [{page:0},{page:1.2},{query:'x\n--hostname=evil'},{owner:'https://evil'}])await assert.rejects(source.list('repository',context));
 await assert.rejects(source.list('branch',{repository:'o/r/../../x'}));await assert.rejects(source.list('shell'));assert.equal(calls,0);
});
