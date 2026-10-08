import { randomUUID, createHash } from 'node:crypto';
import { mkdir, open, stat, statfs, unlink, link, readFile, writeFile, readdir, opendir } from 'node:fs/promises';
import {constants} from 'node:fs';
import { basename, join, extname, dirname } from 'node:path';
import type { LocalToolsAction, LocalToolsPayload, FileGrant, ConverterResult } from '../shared/local-tools';
import { converterRegistry, inspectBytes, FILE_LIMIT, imageDimensions, isolatedCodec } from './local-tools-codecs';
import { OllamaManager, atomicJson } from './ollama-manager';
import {CHAT_IMAGE_LIMIT,type PreparedChatImage} from './chat-attachments';
import {bundledRegistry} from './bundled-engines-registry';
import {inspectSourceBytes} from './converter-source-inspect';
import {ConverterDiscovery,verifyFolderSource,type PrivateSourceEntry} from './converter-discovery';
import {ConverterSourceAdmission} from './converter-source-admission';
import {ConverterResults,type ResultOperation} from './converter-results';
import {ConverterQueue,type QueueRecord} from './converter-queue';
import type {BundledEngineFacade,ConverterOptions,EngineOutput} from '../shared/bundled-engines';
export interface LocalToolsOptions {
    storageDirectory: string;
    pickSourceDirectory?:()=>Promise<string|null>;
    pickOutputDirectory?:()=>Promise<string|null>;
    openResult?: (path:string,operation:Exclude<ResultOperation,'export'>)=>Promise<void>;
    resultActionAvailability?: {open:boolean;reveal:boolean;editor:boolean};
    pickSources: (purpose?:'chat-images') => Promise<string[]>;
    pickDestination: (suggestedName: string) => Promise<string | null>;
    imageEngine?: (bytes: Uint8Array, target: 'png' | 'jpeg') => Promise<Uint8Array>;
    imageEngineProof?: string;
    fetcher?: typeof fetch;
    engines?:BundledEngineFacade;
}
const schemas: Record<LocalToolsAction, string[]> = { 'converter-discovery-start':[],'converter-discovery-status':['id'],'converter-discovery-pause':['id'],'converter-discovery-resume':['id'],'converter-discovery-cancel':['id'],'converter-discovery-page':['id','version','page','cursor','query','regex','pattern','flags'],'converter-source-inspect':['discovery','version','id'],'converter-source-review-cancel':[],'converter-source-review':['id','version','query','regex','pattern','flags','scope','adapter','options'],'converter-source-admit':['review','confirmed'],'converter-admission-status':['id'],'converter-admission-cancel':['id'], 'converter-catalog': [], 'converter-pick': ['purpose'],'converter-inspect':['grant'], 'converter-start': ['grant', 'grants', 'adapter','options'], 'converter-status': ['page','query','regex','pattern','flags','status','date','from','to'],'converter-result':['id','index','operation'],'converter-bulk':['ids','operation','confirmed'], 'converter-cancel': ['id'],'converter-enqueue':['grant','grants','adapter','options'],'converter-queue':[],'converter-pause':[],'converter-resume':[], 'catalog-status': [], 'catalog-refresh': [], 'catalog-page': ['page', 'size', 'query', 'regex', 'pattern', 'flags', 'family', 'capability', 'sort', 'state', 'variant', 'quantization', 'maxBytes', 'fit'], 'model-capabilities':['model'],'model-copy':['source','destination','confirmed'],'generation-start':['model','prompt','system','temperature','tokens','context'],'generation-status':['id'],'generation-cancel':['id'],'generation-history':['page'],'hardware': [], 'pull-review': ['tags'], 'pull-start': ['tags', 'confirmed', 'parallel'], 'pull-status': [], 'pull-cancel': ['id'], 'pull-retry': ['id'], 'sessions': ['id'], 'session-create': ['model', 'name'], 'session-rename': ['id', 'name'], 'session-delete': ['id', 'confirmed'], 'session-export': ['id'], 'chat-start': ['session', 'prompt', 'system', 'temperature', 'tokens', 'context', 'regenerate', 'attachments'], 'chat-status': ['id'], 'chat-cancel': ['id'], 'harness-preflight': [], 'harness-launch': ['id', 'confirmed'], 'harness-status': ['id'], 'harness-restore': ['id'] };
interface PrivateGrant extends FileGrant {
    path: string;
    mtime: number;
    digest: string;
    folderRoot?:string;
    folderEntry?:PrivateSourceEntry;
}
function id(value: unknown) { if (typeof value !== 'string' || !/^[a-f0-9-]{36}$/.test(value))
    throw new Error('Invalid opaque local tool identifier'); return value; }
/** Native file capabilities and local network calls stay inside the privileged boundary. */
export class LocalToolsService {
    private options: LocalToolsOptions;
    private directory: string;
    private ready: Promise<void>;
    private jobs = new Map<string, AbortController>();private admissions=0;private preparations=new Set<AbortController>();
    private results = new Map<string, ConverterResult>();
    private models: OllamaManager;private queue:ConverterQueue;private history:ConverterResults;private discovery:ConverterDiscovery;private sourceAdmission:ConverterSourceAdmission;
    constructor(options: LocalToolsOptions) { this.options = options; this.directory = join(options.storageDirectory, 'local-tools'); this.ready = mkdir(join(this.directory, 'grants'), { recursive: true, mode: 0o700 }).then(() => mkdir(join(this.directory, 'results'), { recursive: true, mode: 0o700 })).then(() => mkdir(join(this.directory,'output-receipts'),{recursive:true,mode:0o700})).then(() => { });this.history=new ConverterResults(join(this.directory,'results'),join(this.directory,'output-receipts'),(path,limit)=>this.readBounded(path,limit),options.pickDestination,options.openResult); this.models = new OllamaManager({ directory: join(this.directory, 'ollama'), fetcher: options.fetcher });this.queue=new ConverterQueue(join(this.directory,'queue'),join(this.directory,'results'),()=>this.jobs.size+this.admissions,async(record)=>{await this.ready;await this.convert({grants:record.grants,adapter:record.adapter,options:record.options},false,record);});this.discovery=new ConverterDiscovery(join(this.directory,'discoveries'),options.pickSourceDirectory??(async()=>{throw new Error('Native folder picker is unavailable in this build');}),[this.directory]);this.sourceAdmission=new ConverterSourceAdmission(join(this.directory,'source-batches'),this.discovery,()=>this.registry(),(discovery,version,item)=>this.inspectDiscoverySource(discovery,version,item.id),options.pickOutputDirectory??(async()=>{throw new Error('Native output-directory picker is unavailable in this build');}),async(grant,adapter,options,destination)=>{const result:ConverterResult={id:randomUUID(),at:new Date().toISOString(),source:grant.name,adapter:adapter.name,status:'queued'};await this.ensureNew(destination);await this.queue.enqueue({id:result.id,grants:[grant.id],adapter:adapter.id,options,destination},result);}); }
    activeJobs() { return this.jobs.size > 0 || this.admissions > 0 || this.models.activeJobs()||this.discovery.activeJobs()||this.sourceAdmission.activeJobs(); }
    cancelAll() { for (const controller of this.jobs.values())
        controller.abort();for(const controller of this.preparations)controller.abort();void this.queue.pause().catch(()=>{}); this.models.cancelAll();this.discovery.cancelAll();this.sourceAdmission.cancelAll(); }
    dispose() { this.queue.dispose();this.discovery.dispose();this.sourceAdmission.dispose();this.cancelAll(); this.models.dispose(); }
    async request(action:LocalToolsAction,payload:LocalToolsPayload={}):Promise<unknown>{try{return await this.dispatch(action,payload);}catch(error){const code=(error as NodeJS.ErrnoException)?.code;if(typeof code==='string')throw new Error(code==='ENOENT'?'The selected local record or source is no longer available. Refresh the view or select it again.':code==='EACCES'||code==='EPERM'?'Local file permissions refused this operation. Choose an accessible source or destination.':code==='EEXIST'?'Destination already exists. Choose a new filename to preserve existing data.':'Local storage could not complete this operation. Check permissions and free space.');throw error;}}
    private async dispatch(action: LocalToolsAction, payload: LocalToolsPayload = {}): Promise<unknown> {
        await this.ready;
        if (!Object.hasOwn(schemas, action))
            throw new Error('Unknown local tool operation');
        if (!payload || typeof payload !== 'object' || Array.isArray(payload) || JSON.stringify(payload).length > 256000)
            throw new Error('Invalid or oversized local tool payload');
        for (const field of Object.keys(payload))
            if (!schemas[action].includes(field))
                throw new Error('Unsupported local tool field');
        switch (action) {
            case 'converter-discovery-start':return this.discovery.start();
            case 'converter-discovery-status':return payload.id?this.discovery.status(payload):{sourceDirectory:!!this.options.pickSourceDirectory,outputDirectory:!!this.options.pickOutputDirectory,last:await this.discovery.latest()};
            case 'converter-discovery-pause':return this.discovery.pause(payload);
            case 'converter-discovery-resume':return this.discovery.resume(payload);
            case 'converter-discovery-cancel':return this.discovery.pause(payload,true);
            case 'converter-discovery-page':return this.discovery.page(payload);
            case 'converter-source-inspect':return this.inspectDiscoverySource(payload.discovery,payload.version,payload.id);
            case 'converter-source-review-cancel':return this.sourceAdmission.cancelReview();
            case 'converter-source-review':return this.sourceAdmission.review(payload);
            case 'converter-source-admit':return this.sourceAdmission.admit(payload);
            case 'converter-admission-status':return this.sourceAdmission.status(payload);
            case 'converter-admission-cancel':return this.sourceAdmission.cancel(payload);
            case 'converter-catalog': return this.registry();
            case 'converter-pick': if(payload.purpose!==undefined&&payload.purpose!=='chat-images')throw new Error('Unsupported native file picker purpose');return this.pick(payload.purpose as 'chat-images'|undefined);
            case 'converter-inspect':{const grant=await this.grant(payload.grant);if(grant.type!=='pdf')return {type:grant.type,bytes:grant.bytes};if(!this.options.engines)throw new Error('Bundled PDF worker is not configured');const bytes=await this.readBounded(grant.path);if(createHash('sha256').update(bytes).digest('hex')!==grant.digest)throw new Error('Source changed; select it again');return (await this.options.engines.convert({adapter:'pdf-inspect',inputs:[{name:grant.name,bytes}],options:{}},AbortSignal.timeout(45000))).details;}
            case 'converter-start': return this.convert(payload);
            case 'converter-enqueue':return this.convert(payload,true);
            case 'converter-queue':return this.queue.state();
            case 'converter-pause':return this.queue.pause();
            case 'converter-resume':return this.queue.resume();
            case 'converter-status': return this.conversionStatus(payload);
            case 'converter-result': {if(payload.operation!=='export'&&(!this.options.openResult||this.options.resultActionAvailability?.[payload.operation as 'open'|'reveal'|'editor']===false))throw new Error('This native output handoff is unavailable. Export a verified copy instead.');return this.history.act(payload);}
            case 'converter-bulk':return this.bulkResults(payload);
            case 'converter-cancel':
                if(this.jobs.has(id(payload.id)))this.jobs.get(id(payload.id))?.abort();else await this.queue.cancel(id(payload.id));
                return { cancelRequested: true };
            case 'catalog-status': return this.models.status();
            case 'catalog-refresh': return this.models.refreshCatalog();
            case 'catalog-page': return this.models.catalogPage(payload);
            case 'model-capabilities':return this.models.modelCapabilities(payload);
            case 'model-copy':return this.models.copyModel(payload);
            case 'generation-start':return this.models.startGeneration(payload);
            case 'generation-status':return this.models.generationStatus(payload);
            case 'generation-cancel':return this.models.cancelGeneration(payload);
            case 'generation-history':return this.models.generationHistory(payload);
            case 'hardware': return this.models.hardware();
            case 'pull-review': return this.models.pullReview(payload);
            case 'pull-start': return this.models.startPulls(payload);
            case 'pull-status': return this.models.pullStatus();
            case 'pull-cancel': return this.models.cancelPull(payload);
            case 'pull-retry': return this.models.retryPull(payload);
            case 'sessions': return payload.id ? this.models.session(payload.id) : this.models.sessions();
            case 'session-create': return this.models.createSession(payload);
            case 'session-rename': return this.models.renameSession(payload);
            case 'session-delete': return this.models.deleteSession(payload);
            case 'session-export': return this.models.exportSession(payload);
            case 'chat-start': return this.models.startChat(payload,await this.prepareChatImages(payload.attachments));
            case 'chat-status': return this.models.chatStatus(payload);
            case 'chat-cancel': return this.models.cancelChat(payload);
            case 'harness-preflight': return this.models.preflight();
            case 'harness-launch': return this.models.launchHarness(payload);
            case 'harness-status': return this.models.harnessStatus(payload);
            case 'harness-restore': return this.models.restoreHarness(payload);
        }
    }
    private async readBounded(path: string,limit=FILE_LIMIT): Promise<Buffer> { const file = await open(path, constants.O_RDONLY|(constants.O_NOFOLLOW??0)); try {
        const s = await file.stat();
        if (!s.isFile() || s.size > limit)
            throw new Error('Choose a regular file no larger than 32 MiB');
        const buffer = Buffer.alloc(s.size);
        let position = 0;
        while (position < buffer.length) {
            const part = await file.read(buffer, position, Math.min(65536, buffer.length - position), position);
            if (!part.bytesRead)
                throw new Error('Source changed during read');
            position += part.bytesRead;
        }
        const after = await file.stat();
        if (after.size !== s.size || after.mtimeMs !== s.mtimeMs)
            throw new Error('Source changed during read');
        return buffer;
    }
    finally {
        await file.close();
    } }
    private async pick(purpose?:'chat-images') { const paths = await this.options.pickSources(purpose);if(paths.length>250)throw new Error('Choose at most 250 files with this picker, or use paged folder discovery for a larger source set'); const registry = await this.registry(); const result: FileGrant[] = []; for (const path of paths) {
        const bytes = await this.readBounded(path), s = await stat(path), type = (await inspectSourceBytes(bytes)).type;
        const grant: PrivateGrant = { id: randomUUID(), name: basename(path), bytes: bytes.length, type, path, mtime: s.mtimeMs, digest: createHash('sha256').update(bytes).digest('hex'), preview: ['text', 'json', 'base64'].includes(type) ? new TextDecoder().decode(bytes.subarray(0, 2048)) : 'Binary file, preview restricted to detected type and byte count.', compatible: registry.filter(a => a.enabled && (a.sourceTypes.includes(type) || a.sourceTypes.includes('*'))).map(a => a.id) };
        await atomicJson(join(this.directory, 'grants', grant.id + '.json'), grant);
        const { path: _path, mtime: _mtime, digest: _digest, ...publicGrant } = grant;
        result.push(publicGrant);
    } return result; }
    private async inspectDiscoverySource(discovery:unknown,version:unknown,entryId:unknown):Promise<FileGrant>{const {manifest,item}=await this.discovery.entry(discovery,entryId,version),path=await verifyFolderSource(manifest.root,item),bytes=await this.readBounded(path);await verifyFolderSource(manifest.root,item);const type=(await inspectSourceBytes(bytes)).type;const registry=await this.registry(),grant:PrivateGrant={id:item.id,name:basename(path),path,mtime:item.mtime,digest:createHash('sha256').update(bytes).digest('hex'),folderRoot:manifest.root,folderEntry:item,bytes:bytes.length,type,preview:['text','json','base64'].includes(type)?new TextDecoder().decode(bytes.subarray(0,2048)):'Binary source; inspect an adapter before conversion.',compatible:registry.filter(adapter=>adapter.enabled&&(adapter.sourceTypes.includes('*')||adapter.sourceTypes.includes(type))).map(adapter=>adapter.id)};await atomicJson(join(this.directory,'grants',item.id+'.json'),grant);const {path:_path,mtime:_mtime,digest:_digest,folderRoot:_root,folderEntry:_entry,...publicGrant}=grant;return publicGrant;}
    private async grant(identifier: unknown): Promise<PrivateGrant> { const record = JSON.parse(await readFile(join(this.directory, 'grants', id(identifier) + '.json'), 'utf8')); if (typeof record.path !== 'string' || typeof record.digest !== 'string')
        throw new Error('Invalid source capability'); if(record.folderRoot&&record.folderEntry){const resolved=await verifyFolderSource(record.folderRoot,record.folderEntry);if(resolved!==record.path)throw new Error('Folder source path changed after granting');}return record; }
    private async prepareChatImages(values: unknown): Promise<PreparedChatImage[]> {
        if (values === undefined) return [];
        if (!Array.isArray(values) || values.length > 4 || new Set(values).size !== values.length) throw new Error('Select at most four distinct opaque image grants');
        if (!values.length) return [];
        if (!this.options.engines) throw new Error('The bundled image decoder is unavailable; build the converter worker');
        if (this.jobs.size + this.admissions >= 2) throw new Error('Wait for an active conversion before preparing attachments');
        this.admissions++;const controller=new AbortController();this.preparations.add(controller);
        try {
            const result: PreparedChatImage[] = []; let total = 0;
            for (const value of values) {
                if(controller.signal.aborted)throw new Error('Attachment preparation cancelled');
                const grant = await this.grant(value);
                if (!['png','jpeg'].includes(grant.type) || grant.bytes > CHAT_IMAGE_LIMIT) throw new Error('Choose a PNG or JPEG image no larger than 4 MiB');
                const bytes = await this.readBounded(grant.path,CHAT_IMAGE_LIMIT);
                if (bytes.length !== grant.bytes || createHash('sha256').update(bytes).digest('hex') !== grant.digest) throw new Error('Attachment source changed; select it again');
                const dimensions = imageDimensions(bytes);
                if (!dimensions || dimensions.width * dimensions.height > 2000000) throw new Error('Chat images support at most two million pixels');
                const normalized = await this.options.engines.convert({ adapter:'isolated-png',inputs:[{name:grant.name,bytes}],options:{} },AbortSignal.any([controller.signal,AbortSignal.timeout(45000)]));
                const output = normalized.outputs[0]?.bytes;
                if (normalized.outputs.length !== 1 || !output) throw new Error('Image decoder did not return a verified PNG');
                total += output.length; if (total > CHAT_IMAGE_LIMIT) throw new Error('Selected images exceed 4 MiB after normalization; choose smaller images');
                result.push({name:grant.name,bytes:output});
            }
            return result;
        } finally { this.admissions--;this.preparations.delete(controller); }
    }
    private async registry(){const native=this.options.engines?bundledRegistry(await this.options.engines.status()):bundledRegistry([]);const existing=converterRegistry();return [...existing.filter(a=>!['pdf','ffmpeg-audio','ffmpeg-video','zip'].includes(a.id)&&!a.id.startsWith('image-')),...native];}
    private async convert(payload:LocalToolsPayload,enqueue=false,record?:QueueRecord){if(!enqueue&&this.jobs.size+this.admissions>=2)throw new Error('Two conversions are active or awaiting admission');if(!enqueue)this.admissions++;try{return await this.convertAdmitted(payload,enqueue,record);}finally{if(!enqueue)this.admissions--;}}
    private async convertAdmitted(payload:LocalToolsPayload,enqueue=false,record?:QueueRecord){
      if(!enqueue&&this.jobs.size>=2)throw new Error('Two conversions are active. Wait or cancel before adding another.');
      const values=payload.grants??[payload.grant];if(!Array.isArray(values)||!values.length||values.length>250)throw new Error('Select 1 to 250 granted sources per operation');
      const grants:PrivateGrant[]=[];for(const value of values)grants.push(await this.grant(value));
      const adapter=(await this.registry()).find(a=>a.id===payload.adapter);if(!adapter?.enabled||grants.some(g=>!adapter.sourceTypes.includes('*')&&!adapter.sourceTypes.includes(g.type)))throw new Error(adapter?.reason??'Adapter is unavailable for the inspected source type');
      const options=payload.options??{};if(!options||typeof options!=='object'||Array.isArray(options))throw new Error('Use structured converter options');
      const stem=basename(grants[0].name,extname(grants[0].name)),destination=record?.destination??await this.options.pickDestination(stem+'-converted.'+adapter.target);if(!destination)return {cancelled:true};
      const extension=extname(destination).toLowerCase();if(extension!=='.'+adapter.target&&!(adapter.target==='jpeg'&&extension==='.jpg'))throw new Error('Choose a destination with the selected .'+adapter.target+' extension');
      await this.ensureNew(destination);const free=await statfs(dirname(destination)).catch(()=>undefined);if(!free||free.bavail*free.bsize<128*1024*1024)throw new Error('Destination requires at least 128 MiB free for bounded temporary output');
      if(enqueue&&(options as ConverterOptions).password)throw new Error('Archive passwords are never saved in a durable queue. Choose Convert now instead');const result:ConverterResult={id:record?.id??randomUUID(),at:new Date().toISOString(),source:grants.map(g=>g.name).join(', ').slice(0,1000),adapter:adapter.name,status:'running'},controller=new AbortController();if(enqueue){result.status='queued';await this.queue.enqueue({id:result.id,grants:grants.map(g=>g.id),adapter:adapter.id,options:options as ConverterOptions,destination},result);return {...result};}this.jobs.set(result.id,controller);this.results.set(result.id,result);await atomicJson(join(this.directory,'results',result.id+'.json'),result);
      void(async()=>{const temporary:string[]=[],created:string[]=[];try{const inputs=[];let total=0;for(const grant of grants){const bytes=await this.readBounded(grant.path);if(createHash('sha256').update(bytes).digest('hex')!==grant.digest)throw new Error('Source changed after selection. Select it again.');total+=bytes.length;if(total>64*1024*1024)throw new Error('Operation source bytes exceed 64 MiB');inputs.push({name:grant.name,bytes});}
        let outputs:EngineOutput[];if(['pdf-','data-','isolated-','zip-','7z-','media-'].some(prefix=>adapter.id.startsWith(prefix))){const converted=await this.options.engines!.convert({adapter:adapter.id,inputs,options:options as ConverterOptions},controller.signal);outputs=converted.outputs;result.details=converted.details;result.disclosures=converted.disclosures;}else{if(inputs.length!==1)throw new Error('This adapter accepts one source at a time');outputs=[{suffix:'.'+adapter.target,bytes:await isolatedCodec(adapter.id,inputs[0].bytes,controller.signal)}];}
        if(!outputs.length||outputs.length>250||outputs.reduce((n,o)=>n+o.bytes.length,0)>64*1024*1024)throw new Error('Converter output count or byte bounds exceeded');const base=destination.slice(0,-extension.length);const paths=outputs.map(o=>{if(!/^[.-][^\\/\x00-\x1f]{0,240}$/.test(o.suffix))throw new Error('Converter returned an unsafe output suffix');return outputs.length===1&&o.suffix==='.'+adapter.target?destination:base+o.suffix;});if(new Set(paths).size!==paths.length)throw new Error('Converted output names collide; choose different sources');
        for(let n=0;n<outputs.length;n++){await this.ensureNew(paths[n]);if(controller.signal.aborted)throw new Error('Conversion cancelled');const temp=paths[n]+'.'+randomUUID()+'.tmp';temporary.push(temp);const handle=await open(temp,'wx',0o600);try{await handle.writeFile(outputs[n].bytes);await handle.sync();}finally{await handle.close();}const reopened=await this.readBounded(temp,64*1024*1024);if(!Buffer.from(outputs[n].bytes).equals(reopened))throw new Error('Post-write byte verification failed');}
        for(let n=0;n<outputs.length;n++){if(controller.signal.aborted)throw new Error('Conversion cancelled');await link(temporary[n],paths[n]);created.push(paths[n]);}await this.history.record(result.id,paths.map((path,i)=>({path,bytes:outputs[i].bytes.length,digest:createHash('sha256').update(outputs[i].bytes).digest('hex')})));result.hasOutputReceipt=true;result.status='converted';result.outputNames=paths.map(path=>basename(path));result.outputName=result.outputNames.join(', ');result.bytes=outputs.reduce((n,o)=>n+o.bytes.length,0);
      }catch(error){for(const path of created)await unlink(path).catch(()=>{});result.status=controller.signal.aborted?'cancelled':'failed';result.error=error instanceof Error?error.message.replace(/(?:[A-Za-z]:\\|\/(?:home|workspace|tmp|Users)\/)[^\s"']+/g,'[local path]'):'Conversion failed';}
      finally{for(const path of temporary)await unlink(path).catch(()=>{});this.jobs.delete(result.id);this.results.delete(result.id);await atomicJson(join(this.directory,'results',result.id+'.json'),result);if(record)await this.queue.finished(result.id).catch(()=>{});}})();return {...result};
    }
    private async ensureNew(path:string){try{await stat(path);throw new Error('Destination already exists. Choose a new filename to preserve existing data.');}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}}
    private async conversionStatus(payload:LocalToolsPayload){const page=await this.history.page(payload,async result=>{if(result.status==='running'&&!this.jobs.has(result.id)){if(await this.queue.has(result.id)){result.status='paused';result.error='Interrupted queue item. Resume revalidates the source and refuses an existing destination.';}else{result.status='failed';result.error='Application restarted during conversion. Source remains untouched; select it again.';}}return result;});return {...page,active:this.jobs.size,queue:await this.queue.state(),resultActions:{export:true,open:!!this.options.openResult&&(this.options.resultActionAvailability?.open??true),reveal:!!this.options.openResult&&(this.options.resultActionAvailability?.reveal??true),editor:!!this.options.openResult&&(this.options.resultActionAvailability?.editor??false)}};}
    private async bulkResults(payload:LocalToolsPayload){if(!Array.isArray(payload.ids)||!payload.ids.length||payload.ids.length>250)throw new Error('Select 1 to 250 result IDs for a bounded bulk action');const ids=[...new Set(payload.ids.map(id))];if(!['cancel','forget'].includes(String(payload.operation)))throw new Error('Unsupported result bulk action');if(payload.operation==='forget'&&payload.confirmed!==true)throw new Error('Review and confirm forgetting history metadata; output files remain untouched');const outcomes=[];for(const key of ids){try{if(payload.operation==='cancel'){if(this.jobs.has(key)){this.jobs.get(key)!.abort();outcomes.push({id:key,status:'cancel-requested'});}else if(await this.queue.has(key)){await this.queue.cancel(key);outcomes.push({id:key,status:'cancelled'});}else throw new Error('Only active or queued conversions can be cancelled');}else{if(this.jobs.has(key)||await this.queue.has(key))throw new Error('Cancel active or queued conversions before forgetting their history');outcomes.push(await this.history.forget(key));}}catch(error){outcomes.push({id:key,status:'failed',error:(error as NodeJS.ErrnoException).code?'History metadata is unavailable':error instanceof Error?error.message:'Result operation failed'});}}return {outcomes};}

}
