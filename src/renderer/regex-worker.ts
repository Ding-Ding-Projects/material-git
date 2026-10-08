/** Bounded native JavaScript RegExp engine and cancellable worker coordinator. No eval. */
export const REGEX_LIMITS = Object.freeze({ pattern: 4096, sample: 65536, replacement: 4096, values: 10000, inputBytes: 2097152, matches: 200, output: 262144, timeout: 250 });
export interface RegexMatch {
    text: string;
    index: number;
    end: number;
    captures: (string | null)[];
    groups: Record<string, string | null>;
    captureIndices?: ([
        number,
        number
    ] | null)[];
}
export interface RegexRequest {
    id: number;
    kind?: 'filter' | 'preview';
    pattern: string;
    flags: string;
    values?: string[];
    sample?: string;
    replacement?: string;
}
export interface RegexResponse {
    id: number;
    matches?: boolean[];
    results?: RegexMatch[];
    replacement?: string;
    limited?: boolean;
    elapsedMs?: number;
    error?: string;
    cancelled?: boolean;
}
export interface RegexSnippet {
    name: string;
    pattern: string;
    flags: string;
    replacement: string;
    sample: string;
}
export function escapeLiteral(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
export function supportedFlags(): string[] { return ['d', 'g', 'i', 'm', 's', 'u', 'v', 'y'].filter(flag => { try {
    new RegExp('', flag);
    return true;
}
catch {
    return false;
} }); }
export function validateExpression(pattern: string, flags: string) {
    if (typeof pattern !== 'string' || pattern.length > REGEX_LIMITS.pattern)
        throw new Error(`Pattern exceeds ${REGEX_LIMITS.pattern} characters.`);
    if (typeof flags !== 'string' || flags.length > 8 || new Set(flags).size !== flags.length)
        throw new Error('Flags must be unique JavaScript RegExp flags.');
    if ([...flags].some(flag => !supportedFlags().includes(flag)))
        throw new Error('A selected flag is unsupported by this JavaScript engine.');
    if (flags.includes('u') && flags.includes('v'))
        throw new Error('Unicode flags u and v cannot be combined.');
    return new RegExp(pattern, flags);
}
export function validateSnippets(payload: unknown): RegexSnippet[] {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload))
        throw new Error('Snippet file must be an object.');
    const object = payload as Record<string, unknown>;
    if (Object.keys(object).some(key => !['schemaVersion', 'snippets'].includes(key)) || object.schemaVersion !== 1 || !Array.isArray(object.snippets) || object.snippets.length > 32)
        throw new Error('Expected snippet schema version 1 with at most 32 entries.');
    const snippets = object.snippets.map(item => {
        if (!item || typeof item !== 'object' || Array.isArray(item))
            throw new Error('Invalid snippet entry.');
        const record = item as Record<string, unknown>;
        const keys = ['name', 'pattern', 'flags', 'replacement', 'sample'];
        if (Object.keys(record).length !== keys.length || keys.some(key => typeof record[key] !== 'string') || Object.keys(record).some(key => !keys.includes(key)))
            throw new Error('Each snippet must contain only name, pattern, flags, replacement and sample strings.');
        const snippet = record as unknown as RegexSnippet;
        if (!snippet.name.trim() || snippet.name.length > 80 || snippet.sample.length > REGEX_LIMITS.sample || snippet.replacement.length > REGEX_LIMITS.replacement)
            throw new Error('Snippet fields exceed their limits.');
        validateExpression(snippet.pattern, snippet.flags);
        return { ...snippet };
    });
    if (new TextEncoder().encode(JSON.stringify({ schemaVersion: 1, snippets })).byteLength > 524288)
        throw new Error('Snippet collection exceeds 512 KiB.');
    return snippets;
}
function advanceIndex(sample: string, index: number, unicode: boolean) { if (unicode && index + 1 < sample.length) {
    const first = sample.charCodeAt(index), second = sample.charCodeAt(index + 1);
    if (first >= 0xd800 && first <= 0xdbff && second >= 0xdc00 && second <= 0xdfff)
        return index + 2;
} return index + 1; }
function replacementFor(template: string, match: RegexMatch, sample: string) {
    let output = '', cursor = 0;
    const tokens = /\$(\$|&|`|'|[0-9]{1,2}|<[^>]+>)/g;
    for (const result of template.matchAll(tokens)) {
        const key = result[1], token = result[0];
        let value = token;
        if (key === '$')
            value = '$';
        else if (key === '&')
            value = match.text;
        else if (key === '`')
            value = sample.slice(0, match.index);
        else if (key === "'")
            value = sample.slice(match.end);
        else if (key.startsWith('<'))
            value = Object.keys(match.groups).length ? (match.groups[key.slice(1, -1)] ?? '') : token;
        else {
            const number = Number(key);
            if (number > 0 && number <= match.captures.length)
                value = match.captures[number - 1] ?? '';
            else if (key.length === 2 && Number(key[0]) > 0 && Number(key[0]) <= match.captures.length)
                value = (match.captures[Number(key[0]) - 1] ?? '') + key[1];
        }
        const chunk = template.slice(cursor, result.index) + value;
        if (output.length + chunk.length > REGEX_LIMITS.output)
            throw new Error('Replacement expansion exceeds the 262144-character preview limit.');
        output += chunk;
        cursor = result.index! + token.length;
    }
    const tail = template.slice(cursor);
    if (output.length + tail.length > REGEX_LIMITS.output)
        throw new Error('Replacement expansion exceeds the preview limit.');
    return output + tail;
}
export function evaluateRegex(request: RegexRequest): RegexResponse {
    const started = performance.now();
    try {
        const expression = validateExpression(request.pattern, request.flags);
        if (request.kind !== 'preview') {
            if (!Array.isArray(request.values) || request.values.length > REGEX_LIMITS.values || request.values.some(value => typeof value !== 'string') || request.values.reduce((total, value) => total + value.length * 2, 0) > REGEX_LIMITS.inputBytes)
                throw new Error('Search data exceeds the bounded worker input limit.');
            return { id: request.id, matches: request.values.map(value => { expression.lastIndex = 0; return expression.test(value); }), elapsedMs: performance.now() - started };
        }
        const sample = request.sample ?? '', replacement = request.replacement ?? '';
        if (typeof sample !== 'string' || sample.length > REGEX_LIMITS.sample || typeof replacement !== 'string' || replacement.length > REGEX_LIMITS.replacement)
            throw new Error('Sample or replacement exceeds the workbench limit.');
        const scanner = new RegExp(request.pattern, request.flags.includes('g') ? request.flags : request.flags + 'g');
        const results: RegexMatch[] = [];
        let limited = false;
        let match: RegExpExecArray | null;
        while ((match = scanner.exec(sample)) !== null) {
            if (results.length >= REGEX_LIMITS.matches) {
                limited = true;
                break;
            }
            results.push({ text: match[0], index: match.index, end: match.index + match[0].length, captures: match.slice(1).map(value => value ?? null), groups: Object.fromEntries(Object.entries(match.groups || {}).map(([key, value]) => [key, value ?? null])), captureIndices: match.indices?.slice(1).map(index => index ? [index[0], index[1]] : null) });
            if (match[0] === '')
                scanner.lastIndex = advanceIndex(sample, scanner.lastIndex, request.flags.includes('u') || request.flags.includes('v'));
        }
        let output = '', cursor = 0;
        const replacements = request.flags.includes('g') ? results : results.slice(0, 1);
        for (const result of replacements) {
            const chunk = sample.slice(cursor, result.index) + replacementFor(replacement, result, sample);
            if (output.length + chunk.length > REGEX_LIMITS.output) {
                limited = true;
                break;
            }
            output += chunk;
            cursor = result.end;
        }
        const tail = sample.slice(cursor);
        if (output.length + tail.length > REGEX_LIMITS.output) {
            limited = true;
            output = (output + tail).slice(0, REGEX_LIMITS.output);
        }
        else
            output += tail;
        return { id: request.id, results, replacement: output, limited, elapsedMs: performance.now() - started };
    }
    catch (error) {
        return { id: request.id, error: error instanceof Error ? error.message : String(error), elapsedMs: performance.now() - started };
    }
}
export interface RegexWorkerLike {
    postMessage(data: RegexRequest): void;
    terminate(): void;
    onmessage: ((event: {
        data: RegexResponse;
    }) => void) | null;
    onerror: ((event: unknown) => void) | null;
}
export class RegexSession {
    private sequence = 0;
    private pending?: {
        id: number;
        worker: RegexWorkerLike;
        timer: ReturnType<typeof setTimeout>;
        resolve: (response: RegexResponse) => void;
    };
    constructor(private factory: () => RegexWorkerLike = () => new Worker(new URL('./regex-worker.ts', import.meta.url), { type: 'module' }) as unknown as RegexWorkerLike, private timeout: number = REGEX_LIMITS.timeout) { }
    cancel() { const pending = this.pending; if (!pending)
        return; this.pending = undefined; clearTimeout(pending.timer); pending.worker.terminate(); pending.resolve({ id: pending.id, error: 'Superseded by a newer search.', cancelled: true }); }
    run(request: Omit<RegexRequest, 'id'>): Promise<RegexResponse> {
        this.cancel();
        const id = ++this.sequence;
        return new Promise(resolve => {
            let worker: RegexWorkerLike;
            try {
                worker = this.factory();
            }
            catch (error) {
                resolve({ id, error: error instanceof Error ? error.message : String(error) });
                return;
            }
            const finish = (response: RegexResponse) => { if (this.pending?.id !== id)
                return; clearTimeout(this.pending.timer); this.pending = undefined; worker.terminate(); resolve(response); };
            const timer = setTimeout(() => finish({ id, error: `Expression exceeded the ${this.timeout} ms limit. Simplify the pattern.` }), this.timeout);
            this.pending = { id, worker, timer, resolve };
            worker.onmessage = event => { if (event.data.id === id)
                finish(event.data); };
            worker.onerror = () => finish({ id, error: 'The isolated regular expression worker failed.' });
            try {
                worker.postMessage({ ...request, id });
            }
            catch (error) {
                finish({ id, error: error instanceof Error ? error.message : String(error) });
            }
        });
    }
}
// The same module is imported for pure helpers; only a worker installs this receiver.
if (typeof self !== 'undefined' && typeof document === 'undefined')
    self.onmessage = (event: MessageEvent<RegexRequest>) => self.postMessage(evaluateRegex(event.data));
