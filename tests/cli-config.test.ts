import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,chmod,rm,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {CliConfigService,type CliConfigServiceOptions} from '../src/main/cli-config';
import {CLI_CONFIG_DEFINITIONS,type CliConfigPayload,type CliConfigReview,type CliConfigKey} from '../src/shared/cli-config';
import reference from '../data/gh-reference.json';

function fixture(environment:NodeJS.ProcessEnv={}) {
 const global=Object.fromEntries(CLI_CONFIG_DEFINITIONS.map(definition=>[definition.key,definition.defaultValue]));
 const host:Record<string,string>={};const calls:string[][]=[];let failSetKey='';let mismatchKey='';let currentTime=100000;
 const run:NonNullable<CliConfigServiceOptions['run']>=async(_binary,args,options)=>{
  assert.equal(options.shell,false);assert.equal(options.windowsHide,true);calls.push([...args]);
  if(args[0]==='--version')return {code:0,stdout:'gh version 2.102.0 (2026-10-06)\n'};
  const values=args.includes('--host=github.com')?{...global,...host}:global;
  if(args[1]==='list')return {code:0,stdout:Object.entries(values).map(([key,value])=>`${key}=${value}`).join('\n')+'\n'};
  if(args[1]==='get')return {code:0,stdout:(mismatchKey===args[2]?'unexpected':values[args[2]])+'\n'};
  if(args[1]==='set'){if(failSetKey===args[2])return {code:1,stdout:'sensitive native error should not surface'};(args.includes('--host=github.com')?host:global)[args[2]]=args[3];return {code:0,stdout:''};}
  throw new Error('Unexpected native operation');
 };
 const service=new CliConfigService('pinned-gh',{run,environment,now:()=>currentTime});
 return {service,global,host,calls,run,setFailure:(key:string)=>{failSetKey=key;},setMismatch:(key:string)=>{mismatchKey=key;},advance:()=>{currentTime+=300001;}};
}
async function review(service:CliConfigService,scope:'global'|'github.com'='global',key:CliConfigKey='prompt',value='disabled'):Promise<CliConfigReview>{const result=await service.action('review',{scope,changes:[{key,mode:'set',value}]});assert.equal(result.kind,'review');return result as CliConfigReview;}

test('generated pinned reference agrees with every guided key, enum and default',()=>{
 assert.equal(reference.version,'2.102.0');assert.equal(reference.coverage.catalogLeaves,reference.commands.length);
 assert.equal(reference.coverage.catalogGuided+reference.coverage.catalogExcluded,reference.commands.length);
 assert.equal(reference.helpTopics.length,8);assert.equal(reference.globalFlags.length,2);
 assert.equal(reference.configSettings.length,14);assert.equal(CLI_CONFIG_DEFINITIONS.filter(definition=>definition.available).length,12);
 assert.equal(reference.environment.length,27);const names=reference.environment.flatMap(entry=>entry.names);assert.equal(names.length,34);assert.equal(new Set(names).size,names.length);
 for(const definition of CLI_CONFIG_DEFINITIONS){const official=reference.configSettings.find(setting=>setting.key===definition.key);assert.ok(official,definition.key);assert.equal(definition.defaultValue,official.defaultValue);if(definition.kind==='choice')assert.deepEqual(definition.choices,official.choices);}
});

test('snapshot shows native global/host resolution and never secret or arbitrary command values',async()=>{
 const context=fixture({GH_TOKEN:'token-sentinel-must-stay-private',GH_EDITOR:'editor-env-sentinel',GH_TELEMETRY:'false',DO_NOT_TRACK:'1'});
 context.global.editor='code --token=secret-command-sentinel';context.global.api_host='private-host-sentinel';context.global.http_unix_socket='/private-socket-sentinel';context.global.oauth_token='stored-token-sentinel';context.host.git_protocol='ssh';
 const result=await context.service.action('snapshot',{scope:'github.com'});assert.equal(result.kind,'snapshot');if(result.kind!=='snapshot')return;
 const transport=result.values.find(value=>value.key==='git_protocol')!;assert.equal(transport.value,'ssh');assert.equal(transport.globalValue,'https');assert.equal(transport.hostRelation,'different-from-global');
 assert.equal(result.values.find(value=>value.key==='prompt')?.hostRelation,'same-as-global');assert.equal(result.values.find(value=>value.key==='editor')?.environmentSource,'GH_EDITOR');
 assert.equal(result.values.find(value=>value.key==='telemetry')?.environmentSource,'GH_TELEMETRY');
 assert.deepEqual(result.environment.find(entry=>entry.names.includes('GH_TOKEN'))?.presentNames,['GH_TOKEN']);
 const encoded=JSON.stringify(result);for(const sentinel of ['token-sentinel','editor-env-sentinel','secret-command-sentinel','private-host-sentinel','private-socket-sentinel','stored-token-sentinel'])assert.ok(!encoded.includes(sentinel));
 assert.equal(result.reset.supported,false);assert.match(result.reset.reason,/clear-cache/);
 assert.equal(context.calls.length,29);assert.deepEqual(context.calls[0],['--version']);assert.ok(context.calls.slice(1).every(args=>args[1]==='get'&&CLI_CONFIG_DEFINITIONS.some(definition=>definition.key===args[2])));
});

test('review is non-mutating; apply uses reviewed host and native readback, then blocks replay',async()=>{
 const context=fixture();const pending=await review(context.service,'github.com','git_protocol','ssh');
 assert.equal(pending.scope,'github.com');assert.deepEqual(pending.changes.map(change=>[change.before,change.after]),[['https','ssh']]);assert.equal(context.calls.filter(args=>args[1]==='set').length,0);
 const result=await context.service.action('apply',{reviewId:pending.reviewId,confirmed:true});assert.equal(result.kind,'mutation');assert.equal(context.global.git_protocol,'https');assert.equal(context.host.git_protocol,'ssh');
 assert.ok(context.calls.some(args=>JSON.stringify(args)===JSON.stringify(['config','set','git_protocol','ssh','--host=github.com'])));
 assert.ok(context.calls.some(args=>JSON.stringify(args)===JSON.stringify(['config','get','git_protocol','--host=github.com'])));
 await assert.rejects(context.service.action('apply',{reviewId:pending.reviewId,confirmed:true}),/expired|already applied/);
});

test('rejects host injection, unapproved hosts, extra properties, keys and untyped enum values',async()=>{
 const context=fixture();
 for(const scope of ['enterprise.example.com','github.com --host=elsewhere','GLOBAL'])await assert.rejects(context.service.action('snapshot',{scope} as CliConfigPayload),/approved/);
 await assert.rejects(context.service.action('snapshot',{scope:'global',confirmed:true}),/parameter/);
 for(const key of ['oauth_token','api_host','http_unix_socket'])await assert.rejects(context.service.action('review',{changes:[{key,mode:'set',value:'anything'}]} as CliConfigPayload),/unavailable adapter/);
 for(const value of ['true','enabled;cat private','ghp_token','disabled\nvalue'])await assert.rejects(review(context.service,'global','prompt',value),/documented|Invalid configuration value/);
 assert.equal(context.calls.filter(args=>args[1]==='set').length,0);
});

test('missing confirmation and non-reviewed arbitrary commands cannot mutate',async()=>{
 const context=fixture();const pending=await review(context.service);
 await assert.rejects(context.service.action('apply',{reviewId:pending.reviewId}),/confirm/);
 await assert.rejects(context.service.action('apply',{reviewId:pending.reviewId,confirmed:true,scope:'github.com'}),/parameter/);
 for(const value of ['code --wait','/usr/bin/true','echo unsafe'])await assert.rejects(review(context.service,'global','editor',value),/native executable/);
 await assert.rejects(context.service.action('choose-executable',{key:'editor'}),/adapter is unavailable/);
 assert.equal(context.calls.filter(args=>args[1]==='set').length,0);
});

test('clipboard and telemetry host controls fail with the exact global-scope limitation',async()=>{
 const context=fixture();await assert.rejects(review(context.service,'github.com','clipboard','disabled'),/only permits clipboard.*Global/);await assert.rejects(review(context.service,'github.com','telemetry','disabled'),/telemetry globally at runtime/);assert.equal(context.calls.filter(args=>args[1]==='set').length,0);
});

test('external changes to either scope invalidate the review before the first write',async()=>{
 for(const scope of ['global','github.com'] as const){const context=fixture();const pending=await review(context.service);context[scope==='global'?'global':'host'].prompt='disabled';await assert.rejects(context.service.action('apply',{reviewId:pending.reviewId,confirmed:true}),/changed since/);assert.equal(context.calls.filter(args=>args[1]==='set').length,0);}
});

test('hidden external command changes also invalidate a review',async()=>{
 const context=fixture();context.global.editor='existing hidden command one';const pending=await context.service.action('review',{changes:[{key:'editor',mode:'default'}]}) as CliConfigReview;
 context.global.editor='existing hidden command two';await assert.rejects(context.service.action('apply',{reviewId:pending.reviewId,confirmed:true}),/changed since/);assert.equal(context.calls.filter(args=>args[1]==='set').length,0);
});

test('expired reviews and duplicate changes are rejected before writes',async()=>{
 const context=fixture();const pending=await review(context.service);context.advance();await assert.rejects(context.service.action('apply',{reviewId:pending.reviewId,confirmed:true}),/expired/);
 await assert.rejects(context.service.action('review',{changes:[{key:'prompt',mode:'set',value:'enabled'},{key:'prompt',mode:'default'}]}),/only once/);assert.equal(context.calls.filter(args=>args[1]==='set').length,0);
});

test('restore writes explicit empty default without inventing unset, YAML edits or inheritance reset',async()=>{
 const context=fixture();context.host.editor='existing command with flags';
 const pending=await context.service.action('review',{scope:'github.com',changes:[{key:'editor',mode:'default'}]}) as CliConfigReview;
 assert.equal(pending.changes[0].before,'External command configured (hidden)');assert.equal(pending.changes[0].after,'');
 await context.service.action('apply',{reviewId:pending.reviewId,confirmed:true});assert.equal(context.host.editor,'');assert.ok(context.calls.some(args=>args[1]==='set'&&args[2]==='editor'&&args[3]===''));assert.ok(!context.calls.some(args=>['unset','clear-cache'].includes(args[1])));
});

test('partial writes and failed readback report limited success without leaking native output',async()=>{
 const context=fixture();context.setFailure('spinner');const pending=await context.service.action('review',{changes:[{key:'prompt',mode:'set',value:'disabled'},{key:'spinner',mode:'set',value:'disabled'}]}) as CliConfigReview;
 await assert.rejects(context.service.action('apply',{reviewId:pending.reviewId,confirmed:true}),error=>{assert.match((error as Error).message,/1 setting was written/);assert.ok(!(error as Error).message.includes('sensitive native'));return true;});
 assert.equal(context.global.prompt,'disabled');assert.equal(context.global.spinner,'enabled');
 const mismatch=fixture();mismatch.setMismatch('prompt');const mismatchReview=await review(mismatch.service);await assert.rejects(mismatch.service.action('apply',{reviewId:mismatchReview.reviewId,confirmed:true}),/written before/);
});

test('executable selection validates native file, safely quotes spaces and grants only the selected key',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'material-git-config-test-'));
 try {const program=join(directory,'chosen program');await writeFile(program,'fixture executable, never executed');await chmod(program,0o700);const context=fixture();const service=new CliConfigService('pinned-gh',{run:context.run,environment:{},chooseExecutable:async()=>program});
  const chosen=await service.action('choose-executable',{key:'editor'});assert.equal(chosen.kind,'executable');if(chosen.kind!=='executable')return;assert.equal(chosen.value,`"${program}"`);
  await assert.rejects(review(service,'global','browser',chosen.value!),/native executable/);
  const pending=await review(service,'global','editor',chosen.value!);assert.equal(pending.changes[0].after,program);await service.action('apply',{reviewId:pending.reviewId,confirmed:true});assert.equal(context.global.editor,chosen.value);
  const invalid=new CliConfigService('pinned-gh',{run:context.run,chooseExecutable:async()=>program+';echo unsafe'});await assert.rejects(invalid.action('choose-executable',{key:'editor'}),/without shell syntax/);
 }finally{await rm(directory,{recursive:true,force:true});}
});

test('reference returns official coverage and environment presence without running CLI or disclosing values',async()=>{
 const context=fixture({GITHUB_TOKEN:'reference-secret-sentinel',GH_HOST:'private-host-sentinel'});const result=await context.service.action('reference');assert.equal(result.kind,'reference');assert.equal(context.calls.length,0);
 assert.ok(!JSON.stringify(result).includes('reference-secret-sentinel'));assert.ok(!JSON.stringify(result).includes('private-host-sentinel'));
 if(result.kind==='reference'){assert.ok(result.reference.capabilities.some(capability=>capability.id==='aliases'&&capability.status==='adapter-required'));assert.equal(result.reference.commands.length,196);}
});

test('non-mutating actual pinned CLI distinguishes isolated Global and host fixtures',async t=>{
 const binary=process.env.GH_REFERENCE_BINARY||join(process.cwd(),'vendor','gh_2.102.0_linux_amd64','bin','gh');try{await access(binary);}catch{t.skip('Official pinned Linux binary is not available on this machine.');return;}
 const directory=await mkdtemp(join(tmpdir(),'material-git-native-config-read-'));
 try {
  await writeFile(join(directory,'config.yml'),'version: "1"\ngit_protocol: https\n');await writeFile(join(directory,'hosts.yml'),'github.com:\n    git_protocol: ssh\n');
  const service=new CliConfigService(binary,{environment:{PATH:process.env.PATH,GH_CONFIG_DIR:directory,GH_HOST:'github.com',GH_TELEMETRY:'0',XDG_STATE_HOME:join(directory,'state'),XDG_CACHE_HOME:join(directory,'cache')}});const result=await service.action('snapshot',{scope:'github.com'});assert.equal(result.kind,'snapshot');if(result.kind!=='snapshot')return;
  assert.equal(result.values.find(value=>value.key==='git_protocol')?.value,'ssh');assert.equal(result.values.find(value=>value.key==='git_protocol')?.globalValue,'https');assert.equal(result.values.find(value=>value.key==='telemetry')?.value,'enabled');assert.equal(result.values.length,14);
 }finally{await rm(directory,{recursive:true,force:true});}
});

test('a mismatched native CLI version is rejected before config access',async()=>{
 const calls:string[][]=[];const service=new CliConfigService('wrong-gh',{run:async(_binary,args)=>{calls.push(args);return {code:0,stdout:'gh version 2.99.0\n'};}});await assert.rejects(service.action('snapshot'),/2\.102\.0/);assert.deepEqual(calls,[['--version']]);
});
