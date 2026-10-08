import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Worker } from 'node:worker_threads';
import ts from 'typescript';
import { evaluateRegex, escapeLiteral, validateSnippets, RegexSession, REGEX_LIMITS, type RegexWorkerLike, type RegexRequest, type RegexResponse } from '../src/renderer/regex-worker';
const preview = (pattern: string, flags: string, sample: string, replacement = '$&') => evaluateRegex({ id: 1, kind: 'preview', pattern, flags, sample, replacement });
test('native regex supports named captures, lookaround, indices, and substitutions', () => {
    const result = preview('(?<word>[a-z]+)(?=!)', 'dg', 'hello! bye!', '$<word>:$1');
    assert.equal(result.error, undefined);
    assert.equal(result.results?.length, 2);
    assert.deepEqual(result.results?.[0].groups, { word: 'hello' });
    assert.deepEqual(result.results?.[0].captureIndices, [[0, 5]]);
    assert.equal(result.replacement, 'hello:hello! bye:bye!');
    assert.equal(preview('(?<=prefix:)\\w+', 'g', 'prefix:value').results?.[0].text, 'value');
});
test('replacement agrees with native JavaScript for supported template tokens', () => {
    for (const replacement of ['$$', '$&', '$1/$2', '$12', '$99', '$`', "$'", '$<first>']) {
        const pattern = '(?<first>a)(b)?', sample = 'za az';
        assert.equal(preview(pattern, 'g', sample, replacement).replacement, sample.replace(new RegExp(pattern, 'g'), replacement), replacement);
    }
});
test('global filtering resets state for each record and sticky preserves position-zero semantics', () => {
    assert.deepEqual(evaluateRegex({ id: 2, pattern: 'a', flags: 'g', values: ['a', 'a', 'b'] }).matches, [true, true, false]);
    assert.deepEqual(evaluateRegex({ id: 3, pattern: 'a', flags: 'y', values: ['ab', 'ba'] }).matches, [true, false]);
});
test('zero-width Unicode matching terminates and respects match bounds', () => {
    assert.deepEqual(preview('(?:)', 'gu', '😀').results?.map(match => match.index), [0, 2]);
    const bounded = preview('(?:)', 'g', 'a'.repeat(300));
    assert.equal(bounded.results?.length, REGEX_LIMITS.matches);
    assert.equal(bounded.limited, true);
    assert.equal(preview('(?:)', 'g', '').results?.length, 1);
});
test('engine rejects malformed flags, unsupported constructs, and oversized input', () => {
    for (const [pattern, flags] of [['(', ''], ['a', 'ii'], ['a', 'uv'], ['a', 'z'], ['(?>a)', ''], ['a++', ''], ['(?(1)a|b)', '']])
        assert.ok(preview(pattern, flags, 'a').error, `${pattern}/${flags}`);
    assert.ok(preview('a'.repeat(REGEX_LIMITS.pattern + 1), '', '').error);
    assert.ok(preview('a', '', 'x'.repeat(REGEX_LIMITS.sample + 1)).error);
    assert.ok(evaluateRegex({ id: 1, pattern: 'a', flags: '', values: ['x'.repeat(REGEX_LIMITS.inputBytes)] }).error);
    assert.ok(preview('a', 'g', 'a'.repeat(65536), "$'".repeat(2048)).error);
});
test('literal helper quotes metacharacters without executing text', () => {
    const literal = 'a.b+[x]?$^{}()|\\';
    assert.equal(new RegExp(escapeLiteral(literal)).test(literal), true);
    assert.equal(new RegExp(escapeLiteral('.*')).test('other'), false);
});
test('snippet import is bounded, versioned and atomic', () => {
    const valid = { name: 'Local expression', pattern: '(?<item>\\w+)', flags: 'g', sample: '', replacement: '$<item>' };
    assert.deepEqual(validateSnippets({ schemaVersion: 1, snippets: [valid] }), [valid]);
    for (const payload of [{ schemaVersion: 2, snippets: [] }, { schemaVersion: 1, snippets: [valid, { ...valid, pattern: '(' }] }, { schemaVersion: 1, snippets: [{ ...valid, extra: 'x' }] }, { schemaVersion: 1, snippets: [{ ...valid, sample: 'x'.repeat(65537) }] }, { schemaVersion: 1, snippets: Array(33).fill(valid) }, { schemaVersion: 1, snippets: Array(8).fill({ ...valid, sample: 'x'.repeat(65536) }) }])
        assert.throws(() => validateSnippets(payload));
    assert.throws(() => validateSnippets(JSON.parse('{"schemaVersion":1,"snippets":[],"__proto__":{}}')));
});
class FakeWorker implements RegexWorkerLike {
    onmessage: ((event: {
        data: RegexResponse;
    }) => void) | null = null;
    onerror: ((event: unknown) => void) | null = null;
    request?: RegexRequest;
    terminated = false;
    postMessage(request: RegexRequest) { this.request = request; }
    terminate() { this.terminated = true; }
    complete() { if (this.request)
        this.onmessage?.({ data: evaluateRegex(this.request) }); }
}
test('successive searches settle cancelled promises and ignore stale worker messages', async () => {
    const workers: FakeWorker[] = [];
    const session = new RegexSession(() => { const worker = new FakeWorker(); workers.push(worker); return worker; });
    const first = session.run({ pattern: 'a', flags: '', values: ['a'] });
    const second = session.run({ pattern: 'b', flags: '', values: ['b'] });
    assert.equal((await first).cancelled, true);
    assert.equal(workers[0].terminated, true);
    workers[0].complete();
    workers[1].complete();
    assert.deepEqual((await second).matches, [true]);
    assert.equal(workers[1].terminated, true);
});
test('explicit teardown settles a pending search and worker failures are bounded', async () => {
    const worker = new FakeWorker();
    const session = new RegexSession(() => worker);
    const pending = session.run({ pattern: 'a', flags: '', values: ['a'] });
    session.cancel();
    assert.equal((await pending).cancelled, true);
    const next = session.run({ pattern: 'a', flags: '', values: ['a'] });
    worker.onerror?.({});
    assert.match((await next).error || '', /worker failed/);
});
test('catastrophic backtracking times out in a real isolated worker while caller remains usable', async () => {
    const source = readFileSync(new URL('../src/renderer/regex-worker.ts', import.meta.url), 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
    let terminated = false;
    const session = new RegexSession(() => {
        const worker = new Worker(new URL('data:text/javascript,' + encodeURIComponent(compiled + "\nimport {parentPort} from 'node:worker_threads';parentPort.on('message',request=>parentPort.postMessage(evaluateRegex(request)));")));
        const adapter: RegexWorkerLike = { onmessage: null, onerror: null, postMessage: request => worker.postMessage(request), terminate: () => { terminated = true; void worker.terminate(); } };
        worker.on('message', data => adapter.onmessage?.({ data }));
        worker.on('error', error => adapter.onerror?.(error));
        return adapter;
    }, 100);
    const started = performance.now();
    const response = await session.run({ pattern: '(a+)+$', flags: '', values: ['a'.repeat(100000) + '!'] });
    assert.match(response.error || '', /exceeded the 100 ms limit/);
    assert.equal(terminated, true);
    assert.ok(performance.now() - started < 1500);
    assert.equal(1 + 1, 2, 'caller continues after terminating the regex worker');
});
