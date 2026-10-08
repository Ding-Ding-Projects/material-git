import { Worker } from 'node:worker_threads';
let activeSearches = 0;

/** Execute user expressions away from the application thread with a finite work budget. */
export async function catalogRegex(values: string[], pattern: unknown, flags: unknown): Promise<boolean[]> {
    if (typeof pattern !== 'string' || pattern.length > 500 || typeof flags !== 'string' || flags.length > 8 || /[^dgimsuvy]/.test(flags) || new Set(flags).size !== flags.length || flags.includes('u') && flags.includes('v')) throw new Error('Use a regular expression of at most 500 characters with supported, distinct flags');
    if (values.length > 500000 || values.reduce((sum, value) => sum + Buffer.byteLength(value), 0) > 64 * 1024 * 1024) throw new Error('Catalog search inventory exceeds 64 MiB');
    if (activeSearches >= 2) throw new Error('Two catalog searches are already active; wait before searching again');
    activeSearches++;
    let worker: Worker;
    try { worker = new Worker(`const {parentPort,workerData}=require('node:worker_threads');let expression;try{expression=new RegExp(workerData.pattern,workerData.flags)}catch(error){parentPort.postMessage({error:error.message})}if(expression)parentPort.postMessage({ready:true});parentPort.on('message',values=>{if(!expression)return;const matches=values.map(value=>{expression.lastIndex=0;return expression.test(value)});parentPort.postMessage({matches})});`, { eval: true, workerData: { pattern, flags }, resourceLimits: { maxOldGenerationSizeMb: 128, maxYoungGenerationSizeMb: 16, stackSizeMb: 2 } }); } catch (error) { activeSearches--; throw error; }
    return new Promise((resolve, reject) => {
        const matches: boolean[] = []; let position = 0, settled = false; let sliceTimer: ReturnType<typeof setTimeout>;
        const finish = (error?: Error) => { if (settled) return; settled = true; activeSearches--; clearTimeout(timer); clearTimeout(sliceTimer); void worker.terminate(); error ? reject(error) : resolve(matches); };
        const send = () => { if (position >= values.length) return finish(); const slice = values.slice(position, position + 2000); position += slice.length; sliceTimer = setTimeout(() => finish(new Error('Catalog regular expression exceeded its execution budget; simplify the expression')), 500); worker.postMessage(slice); };
        const timer = setTimeout(() => finish(new Error('Catalog search exceeded its five-second execution budget')), 5000);
        worker.on('message', (result: { matches?: boolean[]; error?: string; ready?: boolean }) => { clearTimeout(sliceTimer); if (result.ready) return send(); if (result.error) return finish(new Error('Invalid regular expression: ' + result.error.slice(0,200))); if (!Array.isArray(result.matches) || result.matches.length > 2000 || result.matches.some(value=>typeof value !== 'boolean')) return finish(new Error('Invalid isolated search result')); matches.push(...result.matches); send(); });
        worker.once('error', () => finish(new Error('Isolated catalog search failed')));
        worker.once('exit', code => { if (!settled) finish(new Error(`Isolated catalog search exited (${code})`)); });
        sliceTimer = setTimeout(() => finish(new Error('Isolated catalog search did not become ready')), 1000);
    });
}
