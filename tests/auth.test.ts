import test from 'node:test';
import assert from 'node:assert/strict';
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
