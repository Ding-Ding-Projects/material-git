import {Readable} from 'node:stream';
import type {Net} from 'electron';

/** Streaming fetch adapter. Redirects are exposed, never followed; callers approve the next URL. */
export function createElectronFetch(network: Pick<Net, 'request'>): (url: string, init?: RequestInit) => Promise<Response> {
  return (url, init = {}) => new Promise((resolve, reject) => {
    const signal = init.signal;
    if (signal?.aborted) {reject(signal.reason); return;}
    if (init.method && init.method !== 'GET' || init.body || init.redirect && init.redirect !== 'manual') {reject(new Error('Public downloads support GET with manual redirects')); return;}
    let request: ReturnType<Net['request']>;
    try {request = network.request({url, method: 'GET', redirect: 'manual', credentials: 'omit', useSessionCookies: false});} catch (error) {reject(error); return;}
    const abort = () => {request.abort(); reject(signal?.reason ?? new Error('Public transfer cancelled'));};
    const cleanup = () => signal?.removeEventListener('abort', abort);
    signal?.addEventListener('abort', abort, {once: true});
    request.on('error', error => {cleanup(); reject(error);});
    request.on('close', cleanup);
    request.on('redirect', (status, _method, redirectUrl) => {
      cleanup(); const response = new Response(null, {status, headers: {location: redirectUrl}});
      Object.defineProperty(response, 'url', {value: url});
      // Stop the original transaction before another URL can be approved or requested.
      request.abort(); resolve(response);
    });
    request.on('response', incoming => {
      // Electron's runtime IncomingMessage extends Readable, although its public type omits that fact.
      if (!(incoming instanceof Readable)) {cleanup(); request.abort(); reject(new Error('Streaming response is unavailable')); return;}
      incoming.once('end', cleanup); incoming.once('close', cleanup); incoming.once('error', cleanup);
      const headers = new Headers();
      for (const [name, value] of Object.entries(incoming.headers)) headers.set(name, Array.isArray(value) ? value.join(', ') : value);
      const body = Readable.toWeb(incoming, {strategy: {highWaterMark: 64 * 1024, size: chunk => chunk.byteLength}}) as ReadableStream<Uint8Array>;
      const response = new Response(body, {status: incoming.statusCode, headers});
      Object.defineProperty(response, 'url', {value: url});
      // toWeb preserves native backpressure. Cancelling its reader destroys IncomingMessage;
      // explicitly abort the transaction too, so the network cannot continue in the background.
      incoming.once('close', () => {if (!incoming.readableEnded) request.abort();});
      resolve(response);
    });
    try {
      for (const [name, value] of new Headers(init.headers)) {
        if (/^(authorization|cookie|proxy-authorization)$/i.test(name)) throw new Error('Public downloads omit credential headers');
        request.setHeader(name, value);
      }
      request.end();
    } catch (error) {cleanup(); request.abort(); reject(error);}
  });
}
