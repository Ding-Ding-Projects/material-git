import { stringify as stringifyYaml } from 'yaml';
export const EXPORT_FORMATS = ['json', 'jsonl', 'yaml', 'xml', 'csv', 'tsv', 'html', 'sql', 'md', 'txt'] as const;
export type ExportFormat = typeof EXPORT_FORMATS[number];
export interface ExportOptions {
    table?: string;
    spreadsheetSafe?: boolean;
}
export interface SerializedExport {
    text: string;
    mime: string;
    extension: string;
    disclosures: string[];
}
export type Datum = null | boolean | number | string | Datum[] | {
    [key: string]: Datum;
};
export function validateDatum(value: unknown, depth = 0, budget = { items: 0 }): Datum { if (depth > 100 || ++budget.items > 100000)
    throw new Error('Data exceeds 100 nesting levels or 100,000 values'); if (value === null || typeof value === 'boolean' || typeof value === 'string')
    return value; if (typeof value === 'number') {
    if (!Number.isFinite(value) || Number.isInteger(value) && !Number.isSafeInteger(value))
        throw new Error('Nonfinite or unsafe integer values cannot be exported faithfully');
    return value;
} if (Array.isArray(value))
    return value.map(v => validateDatum(v, depth + 1, budget)); if (value && typeof value === 'object' && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)) {
    const output = Object.create(null) as {
        [k: string]: Datum;
    };
    for (const [k, v] of Object.entries(value)) {
        if (['__proto__', 'constructor', 'prototype'].includes(k))
            throw new Error('Reserved object keys are unsupported');
        if (v === undefined)
            throw new Error('Undefined properties are unsupported for faithful structured export');
        output[k] = validateDatum(v, depth + 1, budget);
    }
    return output;
} throw new Error('Export only bounded JSON-compatible data; functions, binary objects and undefined values are unsupported'); }
function rows(value: Datum): Array<Record<string, Datum>> { if (!Array.isArray(value) || !value.length || value.some(v => !v || Array.isArray(v) || typeof v !== 'object'))
    throw new Error('This format requires a nonempty array of records'); return value as Array<Record<string, Datum>>; }
function columns(records: Array<Record<string, Datum>>) { const names = [...new Set(records.flatMap(r => Object.keys(r)))]; if (names.length > 256)
    throw new Error('Tabular export exceeds 256 columns'); return names; }
const htmlEscape = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export function exportFormats(value: unknown): ExportFormat[] { try {
    const d = validateDatum(value);
    const base: ExportFormat[] = ['json', 'yaml', 'xml', 'html', 'md', 'txt'];
    if (Array.isArray(d))
        base.splice(1, 0, 'jsonl');
    if (Array.isArray(d) && d.length && d.every(v => v && typeof v === 'object' && !Array.isArray(v)))
        base.push('csv', 'tsv', 'sql');
    return base;
}
catch {
    return [];
} }
/** Deterministic textual exports. Nothing in these formats is executed. */
export function serializeExport(value: unknown, format: ExportFormat, options: ExportOptions = {}): SerializedExport { if (!EXPORT_FORMATS.includes(format))
    throw new Error('Unsupported export format'); const d = validateDatum(value), disclosures: string[] = []; let text = '', mime = 'text/plain'; const pretty = JSON.stringify(d, null, 2); if (BufferByteLength(pretty) > 32 * 1024 * 1024)
    throw new Error('Export data exceeds 32 MiB'); switch (format) {
    case 'json':
        text = pretty + '\n';
        mime = 'application/json';
        break;
    case 'jsonl':
        if (!Array.isArray(d))
            throw new Error('JSONL requires an array of values');
        text = d.map(v => JSON.stringify(v)).join('\n') + '\n';
        mime = 'application/x-ndjson';
        break;
    case 'yaml':
        text = stringifyYaml(d, { aliasDuplicateObjects: false, lineWidth: 0 });
        mime = 'application/yaml';
        break;
    case 'xml': {
            const xmlEscape=(value:string)=>{if(/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value)||/[\uD800-\uDFFF]/u.test(value))throw new Error('XML does not support these control characters or unpaired surrogates');return htmlEscape(value);};
        const encode = (v: Datum): string => v === null ? '<value type="null"/>' : Array.isArray(v) ? '<value type="array">' + v.map(x => '<item>' + encode(x) + '</item>').join('') + '</value>' : typeof v === 'object' ? '<value type="object">' + Object.entries(v).map(([k, x]) => `<entry key="${xmlEscape(k)}">${encode(x)}</entry>`).join('') + '</value>' : `<value type="${typeof v}">${xmlEscape(String(v))}</value>`;
        text = '<?xml version="1.0" encoding="UTF-8"?>\n<export schema="material-git-json-v1">' + encode(d) + '</export>\n';
        mime = 'application/xml';
        disclosures.push('XML uses a typed JSON-preserving schema, not a user document schema.');
        break;
    }
    case 'csv':
    case 'tsv': {
        const records = rows(d), names = columns(records), separator = format === 'csv' ? ',' : '\t';
        const cell = (v: Datum | undefined) => { let s = v === undefined ? '' : typeof v === 'string' ? v : JSON.stringify(v); if (options.spreadsheetSafe !== false && /^[\s]*[=+\-@]/.test(s)) {
            s = "'" + s;
            if (!disclosures.includes('Formula-like cells are prefixed with an apostrophe for spreadsheet safety.'))
                disclosures.push('Formula-like cells are prefixed with an apostrophe for spreadsheet safety.');
        } return '"' + s.replaceAll('"', '""') + '"'; };
        text = [names.map(n => cell(n)).join(separator), ...records.map(r => names.map(n => cell(r[n])).join(separator))].join('\r\n') + '\r\n';
        mime = format === 'csv' ? 'text/csv' : 'text/tab-separated-values';
        disclosures.push('Nested values and null are JSON cell text. Absent fields are empty. CSV/TSV cannot retain original JSON scalar types without a schema.');
        break;
    }
    case 'html':
        text = '<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'none\'; script-src \'none\'; base-uri \'none\'"><title>Data export</title></head><body><pre>' + htmlEscape(pretty) + '</pre></body></html>\n';
        mime = 'text/html';
        break;
    case 'sql': {
        const records = rows(d), names = columns(records), table = options.table ?? 'exported_records';
        if (!/^[A-Za-z_][A-Za-z0-9_]{0,62}$/.test(table) || names.some(n => n.includes('\0') || n.length > 128))
            throw new Error('Invalid SQL table or column identifier');
        const quoted = (s: string) => '"' + s.replaceAll('"', '""') + '"';
        const literal = (v: Datum | undefined) => { if (v === undefined || v === null) return 'NULL'; if (typeof v === 'number') return String(v); if (typeof v === 'boolean') return v ? '1' : '0'; const value = typeof v === 'string' ? v : JSON.stringify(v); if (value.includes('\0')) throw new Error('SQL string literals cannot preserve NUL characters'); return "'" + value.replaceAll("'", "''") + "'"; };
        text = records.map(r => `INSERT INTO ${quoted(table)} (${names.map(quoted).join(', ')}) VALUES (${names.map(n => literal(r[n])).join(', ')});`).join('\n') + '\n';
        mime = 'application/sql';
        disclosures.push('SQL uses standard quoted identifiers and string literals; select a compatible database mode before importing. It contains INSERT statements only. Nested values are JSON text; booleans are 1/0; schema creation and execution are not performed.');
        break;
    }
    case 'md':
        text = '```json\n' + pretty.replaceAll('```', '\\u0060\\u0060\\u0060') + '\n```\n';
        mime = 'text/markdown';
        break;
    case 'txt':
        text = typeof d === 'string' ? d : pretty;
        break;
} if (BufferByteLength(text) > 64 * 1024 * 1024)
    throw new Error('Serialized export exceeds 64 MiB'); return { text, mime, extension: format === 'yaml' ? 'yaml' : format === 'jsonl' ? 'jsonl' : format, disclosures }; }
function BufferByteLength(s: string) { return new TextEncoder().encode(s).length; }
