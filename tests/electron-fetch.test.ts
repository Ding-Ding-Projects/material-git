import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import type {Net} from 'electron';
import {createElectronFetch} from '../src/main/electron-fetch.js';

function fakeNetwork(start: (request: Request) => void) {
  let options: unknown;
  const request = new Request();
  const network = {request: (value: unknown) => {options = value; request.start = () => start(request); return request;}} as unknown as Pick<Net, 'request'>;
  return {fetch: createElectronFetch(network), request, options: () => options};
}
class Request extends EventEmitter {
  aborted = false; headers: Record<string, string> = {}; start = () => {};
  incoming?: PassThrough;
  setHeader(name: string, value: string) {this.headers[name] = value;}
  end() {queueMicrotask(() => this.start());}
  abort() {this.aborted = true; this.incoming?.destroy(); this.emit('close');}
  response(statusCode = 200) {
    const response = Object.assign(new PassThrough({highWaterMark: 64 * 1024}), {headers: {'content-type': 'application/octet-stream'}, statusCode});
    this.incoming = response; this.emit('response', response); return response;
  }
}

test('manual redirect exposes location and aborts original request without hidden credentials', async () => {
  const fake = fakeNetwork(request => request.emit('redirect', 302, 'GET', 'https://release-assets.githubusercontent.com/public'));
  const response = await fake.fetch('https://github.com/public', {redirect: 'manual', headers: {Accept: 'image/png'}});
  assert.equal(response.status, 302); assert.equal(response.headers.get('location'), 'https://release-assets.githubusercontent.com/public'); assert.equal(response.url, 'https://github.com/public');
  assert.equal(fake.request.aborted, true); assert.deepEqual(fake.options(), {url: 'https://github.com/public', method: 'GET', redirect: 'manual', credentials: 'omit', useSessionCookies: false});
  assert.deepEqual(fake.request.headers, {accept: 'image/png'});
});

test('bodyless and malformed response statuses do not throw outside the transfer promise', async () => {
  for (const status of [204, 205, 304]) {const fake = fakeNetwork(request => request.response(status)); const response = await fake.fetch('https://example.com'); assert.equal(response.status, status); assert.equal(response.body, null); assert.equal(fake.request.aborted, true);}
  const fake = fakeNetwork(request => request.response(0)); await assert.rejects(fake.fetch('https://example.com')); assert.equal(fake.request.aborted, true);
});

test('response streams before completion, preserves bounded backpressure and aborts on reader cancellation', async () => {
  const fake = fakeNetwork(request => {const incoming = request.response(); incoming.write(Buffer.from('first'));});
  const response = await fake.fetch('https://example.com/public'); const reader = response.body!.getReader();
  assert.equal(Buffer.from((await reader.read()).value!).toString(), 'first'); assert.equal(fake.request.incoming!.writableEnded, false);
  const chunk = Buffer.alloc(16 * 1024);
  let written = 0; while (fake.request.incoming!.write(chunk)) {written += chunk.length; if (written > 1024 * 1024) assert.fail('native response failed to apply backpressure');}
  await reader.cancel(); await new Promise(resolve => setImmediate(resolve)); assert.equal(fake.request.aborted, true);
});

test('abort before request and during a streamed response rejects or terminates the real transfer', async () => {
  const before = new AbortController(); before.abort(new Error('cancelled before request'));
  const never = fakeNetwork(() => assert.fail('request should not start'));
  await assert.rejects(never.fetch('https://example.com', {signal: before.signal}), /cancelled before request/); assert.equal(never.options(), undefined);
  const controller = new AbortController(); const fake = fakeNetwork(request => request.response());
  const response = await fake.fetch('https://example.com', {signal: controller.signal}); const reader = response.body!.getReader();
  const pending = reader.read(); controller.abort(new Error('cancelled transfer'));
  await assert.rejects(pending); assert.equal(fake.request.aborted, true);
});

test('request errors propagate and credential headers or implicit-follow transfers are rejected', async () => {
  const broken = fakeNetwork(request => request.emit('error', new Error('network unavailable')));
  await assert.rejects(broken.fetch('https://example.com'), /network unavailable/);
  for (const name of ['Authorization', 'Cookie', 'Proxy-Authorization']) {
    const fake = fakeNetwork(() => assert.fail('request should not start'));
    await assert.rejects(fake.fetch('https://example.com', {headers: {[name]: 'forbidden'}}), /credential headers/); assert.equal(fake.options(), undefined);
  }
  for (const init of [{method: 'POST'}, {redirect: 'follow'}, {body: 'data'}] as RequestInit[]) await assert.rejects(createElectronFetch({request: () => assert.fail('request should not start')} as unknown as Net)('https://example.com', init), /manual redirects/);
});

test('explicit authorization requires a trusted URL predicate and is never forwarded to redirected hosts', async () => {
  const request = new Request(); request.start = () => request.emit('redirect', 302, 'GET', 'https://release-assets.githubusercontent.com/public');
  const network = {request: () => request} as unknown as Pick<Net, 'request'>;
  const fetch = createElectronFetch(network, {authorizeHeader: url => url.origin === 'https://api.example.com' && url.pathname.startsWith('/repos/')});
  const response = await fetch(new URL('https://api.example.com/repos/owner/project/releases/assets/1'), {headers: {Authorization: 'Bearer explicit-test-value'}});
  assert.equal(response.status, 302); assert.equal(request.aborted, true); assert.equal(request.headers.authorization, 'Bearer explicit-test-value');
  await assert.rejects(fetch(response.headers.get('location')!, {headers: {Authorization: 'Bearer explicit-test-value'}}), /not approved/);
  await assert.rejects(fetch('https://api.example.com/user', {headers: {Authorization: 'Bearer explicit-test-value'}}), /not approved/);
  for (const name of ['Cookie', 'Proxy-Authorization']) await assert.rejects(fetch('https://api.example.com/repos/owner/project', {headers: {[name]: 'forbidden'}}), /not approved/);
});
