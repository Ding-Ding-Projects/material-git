import {Readable} from 'node:stream';
import type {Net} from 'electron';

/** Streaming fetch adapter. Redirects are exposed, never followed; callers approve the next URL. */
export type NativeRequestInit=Omit<RequestInit,'body'>&{body?:BodyInit|Readable|null};
export function createElectronFetch(network: Pick<Net, 'request'>, options: {authorizeHeader?: (url: URL) => boolean;allowMutation?:boolean} = {}): (url: string | URL, init?: NativeRequestInit) => Promise<Response> {
  return (input, init = {}) => new Promise((resolve, reject) => {
    const url = String(input);
    const signal = init.signal;
    if (signal?.aborted) {reject(signal.reason); return;}
    const method=init.method??'GET';
    if ((!options.allowMutation&&(method!=='GET'||init.body))||!['GET','HEAD','POST','PUT','PATCH','DELETE'].includes(method)||init.redirect&&init.redirect!=='manual') {reject(new Error('This transfer requires approved methods and manual redirects')); return;}
    if(init.body!=null&&typeof init.body!=='string'&&!(init.body instanceof Uint8Array)&&!(init.body instanceof Readable)){reject(new Error('Use a bounded string, byte array or native readable request body'));return;}
    let requestHeaders: Headers;
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('Unsupported download URL');
      requestHeaders = new Headers(init.headers);
      for (const [name] of requestHeaders) {
        if (/^(cookie|proxy-authorization)$/i.test(name) || /^authorization$/i.test(name) && !options.authorizeHeader?.(parsed)) throw new Error('Download credential headers are not approved for this URL');
      }
    } catch (error) {reject(error); return;}
    let request: ReturnType<Net['request']>;
    try {request = network.request({url, method, redirect: 'manual', credentials: 'omit', useSessionCookies: false});} catch (error) {reject(error); return;}
    const body=init.body instanceof Readable?init.body:undefined;
    const abort = () => {body?.destroy();request.abort(); reject(signal?.reason ?? new Error('Transfer cancelled'));};
    const cleanup = () => signal?.removeEventListener('abort', abort);
    signal?.addEventListener('abort', abort, {once: true});
    request.on('error', error => {body?.destroy();cleanup(); reject(error);});
    request.on('close', cleanup);
    request.on('redirect', (status, _method, redirectUrl) => {
      cleanup(); const response = new Response(null, {status, headers: {location: redirectUrl}});
      Object.defineProperty(response, 'url', {value: url});
      // Stop the original transaction before another URL can be approved or requested.
      body?.destroy();request.abort(); resolve(response);
    });
    request.on('response', incoming => {
      // Electron's runtime IncomingMessage extends Readable, although its public type omits that fact.
      if (!(incoming instanceof Readable)) {cleanup(); request.abort(); reject(new Error('Streaming response is unavailable')); return;}
      try {
        incoming.once('end', cleanup); incoming.once('close', cleanup); incoming.once('error', cleanup);
        const headers = new Headers();
        for (const [name, value] of Object.entries(incoming.headers)) headers.set(name, Array.isArray(value) ? value.join(', ') : value);
        const noBody = method==='HEAD'||[204, 205, 304].includes(incoming.statusCode);
        const body = noBody ? null : Readable.toWeb(incoming, {strategy: {highWaterMark: 64 * 1024, size: chunk => chunk.byteLength}}) as ReadableStream<Uint8Array>;
        const response = new Response(body, {status: incoming.statusCode, headers});
        Object.defineProperty(response, 'url', {value: url});
        // toWeb preserves native backpressure. Cancelling its reader destroys IncomingMessage;
        // explicitly abort the transaction too, so the network cannot continue in the background.
        incoming.once('close', () => {if (!incoming.readableEnded) request.abort();});
        if (noBody) {cleanup(); request.abort();}
        resolve(response);
      } catch (error) {cleanup(); request.abort(); reject(error);}
    });
    try {
      for (const [name, value] of requestHeaders) {
        request.setHeader(name, value);
      }
      if(body){
        // Electron ClientRequest.write returns void. Await its flush callback instead
        // of treating it as a Node Writable, which would lose upload backpressure.
        void (async()=>{try{for await(const chunk of body){await new Promise<void>((written,failed)=>{const closed=()=>failed(new Error('Upload connection closed'));request.once('close',closed);try{request.write(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk),undefined,()=>{request.removeListener('close',closed);written();});}catch(error){request.removeListener('close',closed);failed(error);}});}request.end();}catch{body.destroy();cleanup();request.abort();reject(new Error('Native upload source could not be transferred'));}})();
      }else request.end(typeof init.body==='string'?init.body:init.body instanceof Uint8Array?Buffer.from(init.body):undefined);
    } catch (error) {cleanup(); request.abort(); reject(error);}
  });
}
