import { parentPort, workerData } from 'node:worker_threads';
import {inflateRawSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import { PDFDocument, degrees } from 'pdf-lib';
import { parseDocument } from 'yaml';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { PNG } from 'pngjs';
import * as jpeg from 'jpeg-js';
import { strFromU8, zipSync } from 'fflate';
import { serializeExport, validateDatum, type Datum, type ExportFormat } from '../shared/exports';
import { imageDimensions, FILE_LIMIT } from './local-tools-codecs';
import type { EngineRequest, EngineResult, ConverterOptions } from '../shared/bundled-engines';
const MAX_EXPANDED = 64 * 1024 * 1024;
const decoder = new TextDecoder('utf-8', { fatal: true });
function text(bytes: Uint8Array) { if (bytes.length > FILE_LIMIT)
    throw new Error('Source exceeds 32 MiB'); return decoder.decode(bytes); }
function csvParse(source: string, separator: string): Datum { const rows: string[][] = []; let row: string[] = [], cell = '', quoted = false, closed = false; for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (quoted) {
        if (c === '"' && source[i + 1] === '"') {
            cell += '"';
            i++;
        }
        else if (c === '"') {
            quoted = false;
            closed = true;
        }
        else
            cell += c;
    }
    else if (c === '"') {
        if (cell.length || closed)
            throw new Error('Invalid quote in delimited source');
        quoted = true;
    }
    else if (c === separator) {
        row.push(cell);
        cell = '';
        closed = false;
    }
    else if (c === '\r' || c === '\n') {
        if (c === '\r' && source[i + 1] === '\n')
            i++;
        row.push(cell);
        rows.push(row);
        if (rows.length > 100000)
            throw new Error('Delimited source exceeds 100,000 rows');
        row = [];
        cell = '';
        closed = false;
    }
    else {
        if (closed)
            throw new Error('Unexpected bytes after quoted cell');
        cell += c;
    }
} if (quoted)
    throw new Error('Unclosed quoted cell'); if (cell.length || row.length || closed) {
    row.push(cell);
    rows.push(row);
} if (rows.length < 2)
    throw new Error('Delimited data requires a header and at least one record'); const header = rows.shift()!; if (header.length > 256 || new Set(header).size !== header.length || header.some(k => !k || ['__proto__', 'constructor', 'prototype'].includes(k)))
    throw new Error('Use 1 to 256 distinct nonempty safe headers'); if (rows.some(r => r.length !== header.length))
    throw new Error('Delimited rows have inconsistent column counts'); return rows.map(r => Object.fromEntries(header.map((k, i) => [k, r[i]]))); }
function parseTypedXml(source: string): Datum { if (/<!DOCTYPE|<!ENTITY|<\?[^x]|\u0000/i.test(source))
    throw new Error('DTD, entities and processing instructions are unsupported'); if (XMLValidator.validate(source) !== true)
    throw new Error('Malformed XML'); const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@', textNodeName: '#text', parseTagValue: false, parseAttributeValue: false, processEntities: true, isArray: (name) => ['entry', 'item'].includes(name) }); const root = parser.parse(source); if (root.export?.['@schema'] !== 'material-git-json-v1')
    throw new Error('XML import supports the app typed JSON schema only'); const decode = (node: any, depth = 0): Datum => { if (depth > 100)
    throw new Error('XML exceeds 100 nesting levels'); if (!node || typeof node !== 'object')
    throw new Error('Invalid typed XML value'); switch (node['@type']) {
    case 'null': return null;
    case 'array': return (node.item ?? []).map((x: any) => decode(x.value, depth + 1));
    case 'object': {
        const out: Record<string, Datum> = {};
        for (const entry of node.entry ?? []) {
            const key = entry['@key'];
            if (typeof key !== 'string' || Object.hasOwn(out, key) || ['__proto__', 'constructor', 'prototype'].includes(key))
                throw new Error('Invalid or repeated XML object key');
            out[key] = decode(entry.value, depth + 1);
        }
        return out;
    }
    case 'string': return String(node['#text'] ?? '');
    case 'number': {
        const n = Number(node['#text']);
        if (!Number.isFinite(n))
            throw new Error('Invalid XML number');
        return n;
    }
    case 'boolean':
        if (!['true', 'false'].includes(node['#text']))
            throw new Error('Invalid XML boolean');
        return node['#text'] === 'true';
    default: throw new Error('Unsupported XML type');
} }; return validateDatum(decode(root.export.value)); }
function parseStructured(source: string, format: NonNullable<ConverterOptions['sourceFormat']>): Datum { if (format === 'json')
    return validateDatum(JSON.parse(source)); if (format === 'jsonl') {
    const lines = source.split(/\r?\n/).filter(l => l.trim());
    if (lines.length > 100000)
        throw new Error('JSONL exceeds 100,000 records');
    return validateDatum(lines.map(l => JSON.parse(l)));
} if (format === 'yaml') {
    const doc = parseDocument(source, { uniqueKeys: true, customTags: [], version: '1.2' });
    if (doc.errors.length)
        throw new Error(doc.errors[0].message.slice(0, 200));
    return validateDatum(doc.toJS({ maxAliasCount: 0 }));
} if (format === 'xml')
    return parseTypedXml(source); if (format === 'csv' || format === 'tsv')
    return validateDatum(csvParse(source, format === 'csv' ? ',' : '\t')); throw new Error('Unsupported structured source format'); }
function crc32(bytes: Uint8Array) { let value = 0xffffffff; for (const byte of bytes) { value ^= byte; for (let i = 0; i < 8; i++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0); } return (value ^ 0xffffffff) >>> 0; }
function zipEntries(bytes: Uint8Array) { const b = Buffer.from(bytes); let end = -1; for (let p = b.length - 22; p >= Math.max(0, b.length - 65557); p--)
    if (b.readUInt32LE(p) === 0x06054b50) {
        end = p;
        break;
} if (end < 0 || end + 22 + b.readUInt16LE(end + 20) !== b.length)
    throw new Error('ZIP central directory is missing'); if (b.readUInt16LE(end + 4) || b.readUInt16LE(end + 6))
    throw new Error('Multi-volume ZIP is unsupported'); const count = b.readUInt16LE(end + 10), start = b.readUInt32LE(end + 16); if (count === 65535 || count > 1000 || start >= b.length)
    throw new Error('ZIP64 or more than 1000 entries is unsupported'); let pos = start, total = 0; const names: string[] = [];const checked:Record<string,Uint8Array>=Object.create(null); for (let n = 0; n < count; n++) {
    if (pos + 46 > b.length || b.readUInt32LE(pos) !== 0x02014b50)
        throw new Error('Invalid ZIP central directory');
    const flags = b.readUInt16LE(pos + 8), method = b.readUInt16LE(pos + 10), size = b.readUInt32LE(pos + 24), len = b.readUInt16LE(pos + 28), extra = b.readUInt16LE(pos + 30), comment = b.readUInt16LE(pos + 32), attrs = b.readUInt32LE(pos + 38);
    if (flags & 1)
        throw new Error('Encrypted ZIP requires a native archive profile');
    if (![0, 8].includes(method))
        throw new Error('Only stored/deflated ZIP entries are supported');
    if (size === 0xffffffff)
        throw new Error('ZIP64 sizes are unsupported');
    const mode = attrs >>> 16;
    if ((mode & 0xf000) === 0xa000)
        throw new Error('ZIP symbolic links are unsupported');
    const name = decoder.decode(b.subarray(pos + 46, pos + 46 + len));
    safeArchiveName(name);
    if (names.includes(name))
        throw new Error('Duplicate ZIP entry paths are unsupported');
    names.push(name);
    total += size;
    if (total > MAX_EXPANDED)
        throw new Error('ZIP expanded content exceeds 64 MiB');
    const packed = b.readUInt32LE(pos + 20), local = b.readUInt32LE(pos + 42);
    if (packed === 0xffffffff || local + 30 > start || b.readUInt32LE(local) !== 0x04034b50 || b.readUInt16LE(local + 8) !== method || b.readUInt16LE(local + 6) !== flags)
        throw new Error('ZIP local header bounds or method are invalid');
    const localNameLength = b.readUInt16LE(local + 26), localExtraLength = b.readUInt16LE(local + 28), dataStart = local + 30 + localNameLength + localExtraLength;
    if (dataStart + packed > start || decoder.decode(b.subarray(local + 30, local + 30 + localNameLength)) !== name)
        throw new Error('ZIP compressed data bounds or filename are invalid');
    const compressed = b.subarray(dataStart, dataStart + packed);
    const expanded = method === 0 ? compressed : inflateRawSync(compressed, { maxOutputLength: Math.max(1, size) });
    if (expanded.length !== size || crc32(expanded) !== b.readUInt32LE(pos + 16))
        throw new Error('ZIP actual expanded size or CRC does not match metadata');
    checked[name] = expanded;
    pos += 46 + len + extra + comment;
    if (pos > end)
        throw new Error('Invalid ZIP central directory bounds');
} if (pos !== end || pos - start !== b.readUInt32LE(end + 12)) throw new Error('ZIP central directory size is invalid'); return { names, total, checked }; }
export function safeArchiveName(name: string) { if (!name || name.length > 240 || name.includes('\\') || name.includes('\0') || name.startsWith('/') || /^[A-Za-z]:/.test(name) || name.split('/').some(p => p === '..' || p === '.' || ['__proto__','constructor','prototype'].includes(p) || p.length > 120) || name.split('/').length > 20)
    throw new Error('Archive path is unsupported or unsafe'); }
async function pdf(request: EngineRequest): Promise<EngineResult> { const documents = []; for (const input of request.inputs) {
    if (input.bytes.length > FILE_LIMIT)
        throw new Error('PDF source exceeds 32 MiB');
    const source = Buffer.from(input.bytes).toString('latin1');
    if (/\/(?:ByteRange|JavaScript|JS|Launch|EmbeddedFiles|XFA|AcroForm)\b/.test(source))
        throw new Error('Signed, scripted, embedded-file and form PDFs are unsupported');
    const doc = await PDFDocument.load(input.bytes, { ignoreEncryption: false, updateMetadata: false });
    if (doc.getPageCount() > 250)
        throw new Error('PDF exceeds 250-page limit');
    documents.push(doc);
} const source = documents[0]; if (!source)
    throw new Error('Select a PDF source'); const selected = request.options.pages ?? source.getPageIndices(); if (!Array.isArray(selected) || !selected.length || selected.length > 250 || selected.some(p => !Number.isInteger(p) || p < 1 || p > source.getPageCount())) {
    if (request.options.pages)
        throw new Error('Use 1-based PDF page numbers within the actual source');
} const indices = request.options.pages ? selected.map(p => p - 1) : source.getPageIndices(); const details = { pages: source.getPageCount(), title: source.getTitle() ?? '', author: source.getAuthor() ?? '', subject: source.getSubject() ?? '', keywords: source.getKeywords() ?? '', rotation: source.getPages().map(p => p.getRotation().angle) }; if (request.adapter === 'pdf-inspect')
    return { outputs: [{ suffix: '.json', bytes: Buffer.from(JSON.stringify(details, null, 2)) }], details, disclosures: ['PDF inspection does not modify the source.'] }; if (!['pdf-split', 'pdf-extract', 'pdf-reorder', 'pdf-merge', 'pdf-rotate', 'pdf-metadata'].includes(request.adapter))
    throw new Error('Unsupported PDF operation'); const disclosures = ['Output rewrites PDF structure and retains supported page content; original sources remain untouched. Encrypted, signed, active-content and form PDFs are unsupported.']; const make = async (selectedDocs: Array<{
    doc: PDFDocument;
    indices: number[];
}>, suffix: string) => { const out = await PDFDocument.create(); for (const { doc, indices } of selectedDocs) {
    const pages = await out.copyPages(doc, indices);
    pages.forEach(p => out.addPage(p));
} for (const [get, set] of [['getTitle', 'setTitle'], ['getAuthor', 'setAuthor'], ['getSubject', 'setSubject'], ['getCreator', 'setCreator'], ['getProducer', 'setProducer']] as const) {
    const value = source[get]();
    if (value)
        out[set](value);
} if (source.getKeywords())
    out.setKeywords([source.getKeywords()!]); if (source.getCreationDate())
    out.setCreationDate(source.getCreationDate()!); const pageHashes=(doc:PDFDocument)=>doc.getPages().map(page=>{const contents=page.node.Contents();const hash=createHash('sha256');const visit=(value:any)=>{if(!value)return;const item:any=doc.context.lookup(value);if(item?.asArray)for(const entry of item.asArray())visit(entry);else if(item?.getContents)hash.update(item.getContents());};visit(contents);return hash.digest('hex')+':'+page.getWidth()+':'+page.getHeight();});const requestedHashes=pageHashes(out);
        const originalRotations = out.getPages().map(p => p.getRotation().angle); if (request.adapter === 'pdf-rotate') {
    const rotation = request.options.rotation ?? 90;
    if (![0, 90, 180, 270].includes(rotation))
        throw new Error('Unsupported PDF rotation');
    for (const [n, p] of out.getPages().entries())
        p.setRotation(degrees((originalRotations[n] + rotation) % 360));
} if (request.adapter === 'pdf-metadata') {
    const metadata = request.options.metadata ?? {};
    for (const [k, v] of Object.entries(metadata)) {
        if (k === 'keywords') {
            if (!Array.isArray(v) || v.length > 30 || v.some(s => typeof s !== 'string' || s.length > 200))
                throw new Error('Invalid PDF keywords');
            out.setKeywords(v);
        }
        else {
            if (typeof v !== 'string' || v.length > 500)
                throw new Error('PDF metadata fields must be strings up to 500 characters');
            if (k === 'title')
                out.setTitle(v);
            else if (k === 'author')
                out.setAuthor(v);
            else if (k === 'subject')
                out.setSubject(v);
            else
                throw new Error('Unsupported PDF metadata field');
        }
    }
} const bytes = await out.save({ useObjectStreams: false, addDefaultPage: false }), reopened = await PDFDocument.load(bytes, { updateMetadata: false }); if (JSON.stringify(pageHashes(reopened))!==JSON.stringify(requestedHashes)||reopened.getPageCount() !== out.getPageCount() || reopened.getPages().some((p, n) => p.getRotation().angle !== out.getPages()[n].getRotation().angle) || reopened.getTitle() !== out.getTitle() || reopened.getAuthor() !== out.getAuthor() || reopened.getSubject() !== out.getSubject())
    throw new Error('PDF reopen page/rotation/metadata validation failed'); if (bytes.length > MAX_EXPANDED)
    throw new Error('PDF output exceeds 64 MiB'); return { suffix, bytes }; }; let outputs; if (request.adapter === 'pdf-split') {
    outputs = [];
    for (const index of indices)
        outputs.push(await make([{ doc: source, indices: [index] }], `-page-${index + 1}.pdf`));
}
else if (request.adapter === 'pdf-merge') {
    if (documents.length < 2)
        throw new Error('Select at least two PDF sources to merge');
    if (documents.reduce((n, d) => n + d.getPageCount(), 0) > 250)
        throw new Error('Merged PDF exceeds 250 pages');
    outputs = [await make(documents.map(doc => ({ doc, indices: doc.getPageIndices() })), '.pdf')];
}
else
    outputs = [await make([{ doc: source, indices }], '.pdf')]; if (outputs.reduce((n, o) => n + o.bytes.length, 0) > MAX_EXPANDED)
    throw new Error('PDF batch exceeds 64 MiB'); return { outputs, details, disclosures }; }
export async function workerConvert(request: EngineRequest): Promise<EngineResult> { if (!request || !Array.isArray(request.inputs) || !request.inputs.length || request.inputs.length > 250 || request.inputs.reduce((n, i) => n + i.bytes.length, 0) > MAX_EXPANDED)
    throw new Error('Worker input batch exceeds supported bounds'); if (request.adapter.startsWith('pdf-'))
    return pdf(request); const input = request.inputs[0], options = request.options ?? {}; if (request.adapter.startsWith('data-')) {
    const target = request.adapter.slice(5) as ExportFormat, datum = parseStructured(text(input.bytes), options.sourceFormat ?? 'json');
    const output = serializeExport(datum, target, { table: options.table });
    if (['json', 'yaml', 'xml', 'jsonl'].includes(target)) {
        const restored = parseStructured(output.text, target as NonNullable<ConverterOptions['sourceFormat']>);
        if (JSON.stringify(restored) !== JSON.stringify(datum))
            throw new Error('Structured output failed semantic round-trip');
    }
    return { outputs: [{ suffix: '.' + output.extension, bytes: Buffer.from(output.text) }], disclosures: output.disclosures };
} if (request.adapter === 'isolated-png' || request.adapter === 'isolated-jpeg') {
    const before = imageDimensions(input.bytes);
    let image: {
        width: number;
        height: number;
        data: Uint8Array;
    };
    if (Buffer.from(input.bytes).subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
        image = PNG.sync.read(Buffer.from(input.bytes), { checkCRC: true });
    else
        image = jpeg.decode(input.bytes, { useTArray: true, tolerantDecoding: false, maxResolutionInMP: 16, maxMemoryUsageInMB: 128 });
    const quality = options.quality ?? 90;
    if (!Number.isInteger(quality) || quality < 1 || quality > 100)
        throw new Error('JPEG quality must be 1 to 100');
    const bytes = request.adapter === 'isolated-png' ? PNG.sync.write({ width: image.width, height: image.height, data: Buffer.from(image.data) } as PNG) : jpeg.encode({ width: image.width, height: image.height, data: image.data }, quality).data;
    const after = imageDimensions(bytes);
    if (before.width !== after.width || before.height !== after.height)
        throw new Error('Decoded image dimensions failed round-trip');
    if (request.adapter === 'isolated-png')
        PNG.sync.read(bytes, { checkCRC: true });
    else
        jpeg.decode(bytes, { useTArray: true, tolerantDecoding: false, maxResolutionInMP: 16, maxMemoryUsageInMB: 128 });
    return { outputs: [{ suffix: request.adapter === 'isolated-png' ? '.png' : '.jpeg', bytes }], details: after, disclosures: [request.adapter === 'isolated-jpeg' ? 'JPEG is lossy, flattens transparency and discards profiles/metadata.' : 'PNG conversion discards profiles and metadata; raster pixels and alpha are retained.'] };
} if (request.adapter === 'zip-create') {
    const data: Record<string, Uint8Array> = Object.create(null);
    for (const item of request.inputs) {
        safeArchiveName(item.name);
        if (Object.hasOwn(data, item.name))
            throw new Error('Choose sources with distinct basenames');
        data[item.name] = item.bytes;
    }
    const level = options.level ?? 6;
    if (!Number.isInteger(level) || level < 0 || level > 9)
        throw new Error('ZIP level must be 0 to 9');
    const bytes = zipSync(data, { level: level as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 });
    const reopened = zipEntries(bytes).checked;
    if (Object.keys(reopened).length !== Object.keys(data).length || Object.entries(data).some(([name, b]) => !Buffer.from(reopened[name]).equals(Buffer.from(b))))
        throw new Error('ZIP round-trip failed');
    return { outputs: [{ suffix: '.zip', bytes }], disclosures: ['ZIP stores source basenames and bytes. Filesystem metadata is not preserved.'] };
} if (request.adapter === 'zip-extract') {
    const expanded = zipEntries(input.bytes).checked;
    let bytes = 0;
    const outputs = Object.entries(expanded).filter(([name]) => !name.endsWith('/')).map(([name, b]) => { safeArchiveName(name); bytes += b.length; if (bytes > MAX_EXPANDED)
        throw new Error('ZIP expanded bytes exceed 64 MiB'); return { suffix: '-' + name.replaceAll('/', '-'), bytes: b }; });
    if (outputs.length > 250)
        throw new Error('ZIP extraction exceeds 250 output files');
    return { outputs, disclosures: ['Safe ZIP extraction writes new flat destination filenames. It rejects symlinks, traversal, encryption, ZIP64 and unsupported compression. Directory structure and filesystem metadata are not preserved.'] };
} throw new Error('Unsupported isolated converter'); }
if (parentPort && workerData) {
    void workerConvert(workerData as EngineRequest).then(result => parentPort!.postMessage({ ok: true, result }), error => parentPort!.postMessage({ ok: false, error: error instanceof Error ? error.message : 'Isolated conversion failed' }));
}
