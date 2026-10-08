import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {access,mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import type { ChildProcess, SpawnOptions } from 'node:child_process';
import { AuthService } from '../src/main/auth';
import type { AuthState } from '../src/shared/types';
class FakeChild extends EventEmitter {
 stdout=new PassThrough();stderr=new PassThrough();killed=false;
 kill(){this.killed=true;queueMicrotask(()=>this.emit('close',null));return true;}
}
const status={hosts:{'github.com':[{host:'github.com',login:'octocat',active:true,state:'success',scopes:'repo, read:org, gist',gitProtocol:'https',tokenSource:'keyring',token:'must-never-return-this-token'}]}};
function harness(){const calls:{args:string[];options:SpawnOptions;child:FakeChild}[]=[];
 const service=new AuthService('verified-gh',process.cwd(),{spawn:(binary,args,options)=>{assert.equal(binary,'verified-gh');const child=new FakeChild();calls.push({args,options,child});if(args[1]==='status')queueMicrotask(()=>{child.stdout.end(JSON.stringify(status));child.emit('close',0);});else if(args[1]==='switch'||args[1]==='logout')queueMicrotask(()=>child.emit('close',0));return child as unknown as ChildProcess;}});return {service,calls};
}
function next(service:AuthService,predicate:(state:AuthState)=>boolean){return new Promise<AuthState>(resolve=>{const unsubscribe=service.subscribe(state=>{if(predicate(state)){unsubscribe();resolve(state);}});});}
test('status only exposes safe fields and uses approved hosts with no shell',async()=>{
 const {service,calls}=harness();const state=await service.action('status');assert.equal(state.status,'authenticated');assert.equal(state.accounts[0].tokenSource,'credential-store');assert.deepEqual(state.accounts[0].scopes,['repo','read:org','gist']);assert.ok(!JSON.stringify(state).includes('must-never-return'));assert.ok(!('token' in state.accounts[0]));assert.deepEqual(calls[0].args,['auth','status','--hostname=github.com','--json=hosts']);assert.equal(calls[0].options.shell,false);
});
test('login rejects host URLs, unapproved hosts, parameter injection and unsupported scopes before spawn',async()=>{
 const {service,calls}=harness();for(const hostname of ['https://github.com','github.com:443','github.com/path','evil.example','github.com --show-token','GITHUB.COM'])await assert.rejects(service.action('login',{hostname}),/hostname/);
 await assert.rejects(service.action('login',{scopes:['repo --with-token']}),/scopes/);await assert.rejects(service.action('login',{token:'hidden'} as never),/parameter/);assert.equal(calls.length,0);
});
test('device code remains transient and cancellation suppresses stale process output',async()=>{
 const {service,calls}=harness();const snapshots:AuthState[]=[];service.subscribe(state=>snapshots.push(state));await service.action('login',{hostname:'github.com',scopes:['project']});
 const child=calls[0].child;assert.deepEqual(calls[0].args,['auth','login','--hostname=github.com','--web','--git-protocol=https','--skip-ssh-key','--clipboard=false','--scopes=project']);
 child.stderr.write('! First copy your one-time code: ABCD-');child.stderr.write('1234\nOpen this URL to continue in your web browser: https://github.com/login/device\n');
 assert.equal(service.snapshot().deviceCode,'ABCD-1234');assert.equal(service.snapshot().verificationUrl,'https://github.com/login/device');
 await service.action('cancel');assert.equal(service.snapshot().status,'cancelled');assert.equal(service.snapshot().deviceCode,undefined);assert.equal(child.killed,true);child.stderr.write('! First copy your one-time code: EVIL-4321\n');assert.equal(service.snapshot().deviceCode,undefined);assert.ok(snapshots.some(s=>s.status==='waiting'));
});
test('login success clears device data and refreshes verified account status',async()=>{
 const {service,calls}=harness();await service.action('login');calls[0].child.stderr.write('! First copy your one-time code: ABCD-1234\nOpen this URL to continue in your web browser: https://github.com/login/device\n');const done=next(service,state=>state.status==='authenticated');calls[0].child.emit('close',0);const state=await done;assert.equal(state.deviceCode,undefined);assert.equal(state.verificationUrl,undefined);assert.equal(state.accounts[0].login,'octocat');
});
test('account changes require confirmation and a known account',async()=>{
 const {service,calls}=harness();await assert.rejects(service.action('switch',{login:'octocat'}),/confirm/);await assert.rejects(service.action('logout',{confirmed:true,login:'unknown-user'}),/known/);await service.action('switch',{hostname:'github.com',login:'octocat',confirmed:true});assert.ok(calls.some(call=>JSON.stringify(call.args)===JSON.stringify(['auth','switch','--hostname=github.com','--user=octocat'])));
});
test('device URL must match exact approved host and expected device path',async()=>{
 const {service,calls}=harness();await service.action('login');calls[0].child.stderr.write('Open this URL: https://evil.example/login/device\nOpen this URL: https://github.com/login/device?steal=yes\n');assert.equal(service.snapshot().verificationUrl,undefined);await service.action('cancel');
});

test('account switching verifies the selected active account instead of trusting exit zero',async()=>{
 const base={hosts:{'github.com':[{login:'octocat',active:false,state:'success',tokenSource:'keyring',scopes:'repo',gitProtocol:'https'}]}};
 const service=new AuthService('verified-gh',process.cwd(),{spawn:(_binary,args)=>{const child=new FakeChild();queueMicrotask(()=>{if(args[1]==='status')child.stdout.end(JSON.stringify(base));child.emit('close',0);});return child as unknown as ChildProcess;}});
 const result=await service.action('switch',{login:'octocat',confirmed:true});assert.equal(result.status,'failed');assert.match(result.error!,/not active after switching/);assert.ok(!result.message);
});
test('an active environment credential cannot be reported as a successful saved-account switch',async()=>{
 let switched=false;const data={hosts:{'github.com':[{login:'environment-user',active:true,state:'success',tokenSource:'GH_TOKEN'},{login:'octocat',active:false,state:'success',tokenSource:'keyring'}]}};
 const service=new AuthService('verified-gh',process.cwd(),{spawn:(_binary,args)=>{const child=new FakeChild();if(args[1]==='switch')switched=true;queueMicrotask(()=>{if(args[1]==='status')child.stdout.end(JSON.stringify(data));child.emit('close',0);});return child as unknown as ChildProcess;}});
 await assert.rejects(service.action('switch',{login:'octocat',confirmed:true}),/environment token overrides/);assert.equal(switched,false);
});

function workflowHarness(options:{source?:string;login?:string;helper?:string;setupExit?:number}={}){
 const calls:{binary:string;args:string[];child:FakeChild}[]=[];
 const service=new AuthService('verified-gh',process.cwd(),{spawn:(binary,args,spawnOptions)=>{
  assert.equal(spawnOptions.shell,false);const child=new FakeChild();calls.push({binary,args,child});
  if(args[1]==='status')queueMicrotask(()=>{child.stdout.end(JSON.stringify({hosts:{'github.com':[{...status.hosts['github.com'][0],login:options.login??'octocat',tokenSource:options.source??'keyring'}]}}));child.emit('close',0);});
  else if(args[1]==='setup-git')queueMicrotask(()=>child.emit('close',options.setupExit??0));
  else if(binary==='git')queueMicrotask(()=>{child.stdout.end(options.helper??'\n!verified-gh auth git-credential\n');child.emit('close',0);});
  return child as unknown as ChildProcess;
 }});return {service,calls};
}
test('permission refresh reviews the active account and uses guided add/remove flags',async()=>{
 const {service,calls}=workflowHarness();
 await assert.rejects(service.action('refresh',{login:'octocat',scopes:['project']}),/confirm/);
 assert.equal(calls.length,0);
 const state=await service.action('refresh',{login:'octocat',confirmed:true,scopes:['project','project'],removeScopes:['workflow']});
 assert.equal(state.status,'starting');const call=calls.find(c=>c.args[1]==='refresh')!;
 assert.deepEqual(call.args,['auth','refresh','--hostname=github.com','--clipboard=false','--scopes=project','--remove-scopes=workflow']);
 call.child.stderr.write('! First copy your one-time code: ABCD-1234\nOpen this URL: https://github.com/login/device\n');
 assert.equal(service.snapshot().deviceCode,'ABCD-1234');
 const done=next(service,s=>s.message?.startsWith('Permission refresh completed')===true);call.child.emit('close',0);const result=await done;
 assert.equal(result.status,'authenticated');assert.equal(result.deviceCode,undefined);assert.equal(result.verificationUrl,undefined);assert.match(result.message!,/octocat/);assert.ok(!JSON.stringify(result).includes('must-never-return'));
});
test('refresh reset is exclusive and minimum scopes, unsupported values and inactive accounts are rejected',async()=>{
 const {service,calls}=workflowHarness();
 for(const payload of [{removeScopes:['gist']},{removeScopes:['repo']},{scopes:['project'],resetScopes:true},{scopes:['workflow'],removeScopes:['workflow']},{removeScopes:['--with-token']},{resetScopes:'true'}])
  await assert.rejects(service.action('refresh',{login:'octocat',confirmed:true,...payload} as never));
 await assert.rejects(service.action('refresh',{login:'other-account',confirmed:true}),/active authenticated/);
 assert.ok(!calls.some(c=>c.args[1]==='refresh'));
 await service.action('refresh',{login:'octocat',confirmed:true,resetScopes:true});
 assert.deepEqual(calls.at(-1)!.args,['auth','refresh','--hostname=github.com','--clipboard=false','--reset-scopes']);await service.action('cancel');
});
test('refresh rejects environment credentials and cancellation clears device data',async()=>{
 const environment=workflowHarness({source:'GH_TOKEN'});
 await assert.rejects(environment.service.action('refresh',{login:'octocat',confirmed:true}),/Environment credentials/);
 assert.ok(!environment.calls.some(c=>c.args[1]==='refresh'));
 const {service,calls}=workflowHarness();await service.action('refresh',{login:'octocat',confirmed:true});
 const call=calls.find(c=>c.args[1]==='refresh')!;call.child.stderr.write('! First copy your one-time code: ABCD-1234\n');
 await service.action('cancel');assert.equal(call.child.killed,true);assert.equal(service.snapshot().deviceCode,undefined);
 call.child.stderr.write('! First copy your one-time code: EVIL-1234\n');assert.equal(service.snapshot().deviceCode,undefined);
});
test('Git setup requires review, selects one approved authenticated host and reads back the global helper',async()=>{
 const {service,calls}=workflowHarness();await assert.rejects(service.action('setup-git',{login:'octocat'}),/confirm/);
 const result=await service.action('setup-git',{hostname:'github.com',login:'octocat',confirmed:true});
 assert.match(result.message!,/credential helper verified/);assert.ok(!result.error);
 assert.deepEqual(calls.find(c=>c.args[1]==='setup-git')!.args,['auth','setup-git','--hostname=github.com']);
 assert.deepEqual(calls.find(c=>c.binary==='git')!.args,['config','--global','--get-all','credential.https://github.com.helper']);
 assert.ok(!calls.some(c=>c.args.includes('--force')));
 await assert.rejects(service.action('setup-git',{hostname:'other.example',login:'octocat',confirmed:true}),/hostname/);
});
test('setup does not report success from exit zero when readback differs or setup failed',async()=>{
 for(const options of [{helper:'!other-tool auth git-credential\n'},{helper:'!verified-gh auth git-credential\n\n'},{helper:''},{setupExit:1}]){
  const {service,calls}=workflowHarness(options);const result=await service.action('setup-git',{login:'octocat',confirmed:true});assert.equal(result.status,'failed');assert.ok(result.error);assert.equal(result.message,undefined);
  if(options.setupExit)assert.ok(!calls.some(c=>c.binary==='git'));
 }
});

test('refresh completion rejects an account changed during browser authorization',async()=>{
 const options={login:'octocat'};const {service,calls}=workflowHarness(options);
 await service.action('refresh',{login:'octocat',confirmed:true});
 const call=calls.find(c=>c.args[1]==='refresh')!;options.login='different-account';
 const done=next(service,state=>state.status==='failed');call.child.emit('close',0);const state=await done;
 assert.match(state.error!,/expected authenticated account/);assert.equal(state.message,undefined);
});

test('a synchronous authorization launch failure clears the pending UI state',async()=>{
 const service=new AuthService('verified-gh',process.cwd(),{spawn:()=>{throw new Error('private launcher detail');}});
 const state=await service.action('login');assert.equal(state.status,'failed');assert.equal(state.message,undefined);assert.ok(!state.error?.includes('private launcher detail'));assert.equal(state.deviceCode,undefined);
});

test('credential copy requires reviewed consent and native callback; no token reaches state or events',async()=>{const token='fixture-usable-credential';let copied='';const snapshots:AuthState[]=[];const calls:string[][]=[];const service=new AuthService('fixture-gh',process.cwd(),{copyToken:v=>{copied=v;},spawn:(_binary,args)=>{calls.push(args);const child=new FakeChild();queueMicrotask(()=>{child.stdout.end(args[1]==='status'?JSON.stringify(status):token+'\n');child.emit('close',0);});return child as unknown as ChildProcess;}});service.subscribe(s=>snapshots.push(s));await assert.rejects(service.action('copy-token',{login:'octocat',confirmed:true}),/consent/);assert.equal(calls.length,0);const result=await service.action('copy-token',{login:'octocat',confirmed:true,clipboardConsent:true});assert.equal(copied,token);assert.deepEqual(calls.at(-1),['auth','token','--hostname=github.com','--user=octocat']);assert.equal(JSON.stringify([result,...snapshots]).includes(token),false);const noClipboard=harness();await assert.rejects(noClipboard.service.action('copy-token',{login:'octocat',confirmed:true,clipboardConsent:true}),/unavailable/);assert.equal(noClipboard.calls.length,0);});
test('host registration requires exact reviewed name and durable callback before approving',async()=>{let registered='';const service=new AuthService('fixture-gh',process.cwd(),{registerHost:async h=>{registered=h;},spawn:()=>{throw new Error('must not spawn');}});await assert.rejects(service.action('register-host',{hostname:'enterprise.test',confirmed:true}),/exact/);await assert.rejects(service.action('register-host',{hostname:'https://enterprise.test',confirmed:true,reviewedHostname:'https://enterprise.test'}),/DNS/);assert.equal(registered,'');const result=await service.action('register-host',{hostname:'enterprise.test',reviewedHostname:'enterprise.test',confirmed:true});assert.equal(registered,'enterprise.test');assert.ok(result.allowedHosts.includes('enterprise.test'));});


test('login applies real Git protocol selection and refuses unavailable deferred SSH setup',async()=>{const f=harness();await f.service.action('login',{gitProtocol:'ssh',skipSshKey:true});assert.ok(f.calls[0].args.includes('--git-protocol=ssh'));await f.service.action('cancel');for(const payload of [{gitProtocol:'sftp'},{skipSshKey:'false'},{gitProtocol:'ssh',skipSshKey:false}])await assert.rejects(f.service.action('login',payload as never),/HTTPS or SSH|SSH key setup|public-key/);});
test('Git setup force is an exact reviewed boolean and native unauthenticated-host option',async()=>{const f=workflowHarness();for(const payload of [{force:true},{confirmed:true,force:'yes'},{confirmed:true,force:true,hostname:'unapproved.example'}])await assert.rejects(f.service.action('setup-git',{login:'octocat',...payload} as never));const result=await f.service.action('setup-git',{hostname:'github.com',login:'octocat',confirmed:true,force:true});assert.match(result.message!,/credential helper verified/);assert.deepEqual(f.calls.find(call=>call.args[1]==='setup-git')?.args,['auth','setup-git','--hostname=github.com','--force']);await assert.rejects(f.service.action('login',{force:true}),/only for setup/);});

test('approved host Git setup before sign-in requires exact hostname review and no fabricated account',async()=>{const calls:string[][]=[];const service=new AuthService('verified-gh',process.cwd(),{allowedHosts:['github.com','forge.example'],spawn:(binary,args)=>{const child=new FakeChild();calls.push(args);queueMicrotask(()=>{child.stdout.end(binary==='git'?'\n!verified-gh auth git-credential\n':args[1]==='status'?JSON.stringify({hosts:{}}):'');child.emit('close',0);});return child as unknown as ChildProcess;}});for(const payload of [{force:true,confirmed:true},{force:false,confirmed:true,reviewedHostname:'forge.example'},{force:true,confirmed:true,reviewedHostname:'github.com'},{force:true,reviewedHostname:'forge.example'}])await assert.rejects(service.action('setup-git',{hostname:'forge.example',...payload}));assert.ok(!calls.some(args=>args[1]==='setup-git'));const result=await service.action('setup-git',{hostname:'forge.example',reviewedHostname:'forge.example',force:true,confirmed:true});assert.deepEqual(result.accounts,[]);assert.match(result.message!,/does not sign in/);assert.deepEqual(calls.find(args=>args[1]==='setup-git'),['auth','setup-git','--hostname=forge.example','--force']);});

test('pinned CLI force configures an approved unsigned host in isolated Git and CLI configuration',async t=>{const binary=process.env.GH_REFERENCE_BINARY||join(process.cwd(),'vendor','gh_2.102.0_linux_amd64','bin','gh');try{await access(binary);}catch{t.skip('Official pinned Linux binary is unavailable.');return;}const directory=await mkdtemp(join(tmpdir(),'material-git-force-host-')),globalPath=join(directory,'gitconfig'),systemPath=join(directory,'git-system');try{await writeFile(systemPath,'');await writeFile(join(directory,'config.yml'),'version: "1"\ngit_protocol: https\n');await writeFile(join(directory,'hosts.yml'),'{}\n');const service=new AuthService(binary,directory,{allowedHosts:['forge.example'],spawn:(executable,args,options)=>spawn(executable,args,{...options,env:{PATH:process.env.PATH,GH_CONFIG_DIR:directory,GH_PROMPT_DISABLED:'1',GH_TELEMETRY:'0',GIT_TERMINAL_PROMPT:'0',GIT_CONFIG_GLOBAL:globalPath,GIT_CONFIG_SYSTEM:systemPath,GIT_CONFIG_NOSYSTEM:'1'}})});const result=await service.action('setup-git',{hostname:'forge.example',reviewedHostname:'forge.example',confirmed:true,force:true});assert.deepEqual(result.accounts,[]);const config=await readFile(globalPath,'utf8');assert.match(result.message||'',/credential helper verified/,(result.error||'')+' '+config);assert.ok(config.includes('credential "https://forge.example"'));assert.ok(config.includes('auth git-credential'));assert.equal(await readFile(join(directory,'hosts.yml'),'utf8'),'{}\n');}finally{await rm(directory,{recursive:true,force:true});}});
