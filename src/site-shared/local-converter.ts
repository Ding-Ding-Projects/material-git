import {parseDocument} from 'yaml';
import {XMLParser,XMLValidator} from 'fast-xml-parser';
import {serializeExport,validateDatum,type Datum,type ExportFormat} from '../shared/exports';

export const converterLimits={fileBytes:8*1024*1024,sourceBytes:64*1024*1024,outputBytes:32*1024*1024,metadataBytes:1024*1024,pixels:8_388_608,side:4096,deadline:15000} as const;
export type SourceFormat='json'|'jsonl'|'yaml'|'xml'|'csv'|'tsv'|'png'|'jpeg'|'webp';
export type ConversionFormat=ExportFormat|'png'|'jpeg'|'webp';
export const conversionFormats:ConversionFormat[]=['json','jsonl','yaml','xml','csv','tsv','html','sql','md','txt','png','jpeg','webp'];
export function sourceFormat(name:string,bytes:Uint8Array):SourceFormat{
 if([137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n))return 'png';
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'jpeg';
 const ascii=new TextDecoder().decode(bytes.subarray(0,16));if(ascii.startsWith('RIFF')&&ascii.slice(8,12)==='WEBP')return 'webp';
 if(bytes.some(byte=>byte===0))throw Error('Unsupported binary source');
 const prefix=new TextDecoder('utf-8',{fatal:true}).decode(bytes,{stream:true}).trimStart(),extension=name.split('.').at(-1)?.toLowerCase();
 if(prefix.startsWith('<'))return 'xml';
 if(extension==='jsonl'||extension==='ndjson')return 'jsonl';
 if(prefix.startsWith('{')||prefix.startsWith('[')||extension==='json')return 'json';
 if(extension==='csv'||extension==='tsv')return extension;
 if(extension==='yaml'||extension==='yml')return 'yaml';
 throw Error('No supported signature or structured-text candidate');
}
function delimited(source:string,separator:string):Datum{
 const rows:string[][]=[];let row:string[]=[],cell='',quoted=false,closed=false,values=0;
 const push=()=>{if(++values>100000||row.length>=256)throw Error('Delimited data exceeds 100,000 cells or 256 columns');row.push(cell);cell='';closed=false};
 for(let i=0;i<source.length;i++){const c=source[i];if(quoted){if(c==='"'&&source[i+1]==='"'){cell+='"';i++}else if(c==='"'){quoted=false;closed=true}else cell+=c}
 else if(c==='"'){if(cell||closed)throw Error('Invalid quote');quoted=true}
 else if(c===separator)push();else if(c==='\r'||c==='\n'){if(c==='\r'&&source[i+1]==='\n')i++;push();rows.push(row);row=[]}
 else{if(closed)throw Error('Unexpected text after quoted cell');cell+=c}}
 if(quoted)throw Error('Unclosed quote');if(cell||row.length||closed){push();rows.push(row)}
 if(rows.length<2)throw Error('Delimited data needs a header and record');const header=rows.shift()!;
 if(new Set(header).size!==header.length||header.some(k=>!k||['__proto__','constructor','prototype'].includes(k))||rows.some(r=>r.length!==header.length))throw Error('Duplicate, unsafe or inconsistent columns');
 return validateDatum(rows.map(r=>Object.fromEntries(header.map((k,i)=>[k,r[i]]))));
}
function typedXml(source:string):Datum{
 if(/<!|<\?(?!xml\s)|\u0000/i.test(source)||XMLValidator.validate(source)!==true)throw Error('Only typed XML without DTD, entities or processing instructions is supported');
 const root=new XMLParser({ignoreAttributes:false,attributeNamePrefix:'@',textNodeName:'#text',parseTagValue:false,parseAttributeValue:false,trimValues:false,isArray:name=>['item','entry'].includes(name)}).parse(source);
 if(Object.keys(root).some(k=>!['?xml','export'].includes(k))||!root.export||root.export['@schema']!=='material-git-json-v1'||Object.keys(root.export).some(k=>!['@schema','value'].includes(k)))throw Error('Use the Material Git typed XML schema');
 let values=0;const decode=(node:any,depth=0):Datum=>{if(depth>100||++values>100000||!node||typeof node!=='object')throw Error('Invalid typed XML value or resource limit');
 const type=node['@type'],allowed=type==='array'?['@type','item']:type==='object'?['@type','entry']:type==='null'?['@type']:['@type','#text'];
 if(Object.keys(node).some(k=>!allowed.includes(k)))throw Error('Unexpected typed XML field');
 if(type==='null')return null;
 if(type==='array')return(node.item??[]).map((item:any)=>{if(Object.keys(item).some(k=>k!=='value'))throw Error('Invalid typed XML item');return decode(item.value,depth+1)});
 if(type==='object'){const output:Record<string,Datum>=Object.create(null);for(const entry of node.entry??[]){const key=entry['@key'];if(Object.keys(entry).some(k=>!['@key','value'].includes(k))||typeof key!=='string'||Object.hasOwn(output,key)||['__proto__','constructor','prototype'].includes(key))throw Error('Invalid typed XML key');output[key]=decode(entry.value,depth+1)}return output}
 if(type==='string')return String(node['#text']??'');
 if(type==='boolean'&&['true','false'].includes(node['#text']))return node['#text']==='true';
 if(type==='number'&&typeof node['#text']==='string'&&/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(node['#text']))return Number(node['#text']);
 throw Error('Invalid typed XML scalar')};return validateDatum(decode(root.export.value));
}
export function parseLocalData(source:string,format:SourceFormat):Datum{
 if(new TextEncoder().encode(source).length>converterLimits.fileBytes)throw Error('Structured source exceeds 8 MiB');
 if(format==='json')return validateDatum(JSON.parse(source));
 if(format==='jsonl'){const values:Datum[]=[];for(const line of source.split(/\r?\n/)){if(!line.trim())continue;if(values.length>=100000)throw Error('JSONL exceeds 100,000 values');values.push(validateDatum(JSON.parse(line)))}return validateDatum(values)}
 if(format==='yaml'){const doc=parseDocument(source,{uniqueKeys:true,customTags:[],schema:'core',version:'1.2'});if(doc.errors.length||doc.warnings.length)throw Error('Invalid or unsupported YAML');return validateDatum(doc.toJS({maxAliasCount:0}))}
 if(format==='xml')return typedXml(source);
 if(format==='csv'||format==='tsv')return delimited(source,format==='csv'?',':'\t');throw Error('Not a structured source');
}
export function convertLocalData(source:string,format:SourceFormat,target:ExportFormat){
 const datum=parseLocalData(source,format),output=serializeExport(datum,target),bytes=new TextEncoder().encode(output.text);
 if(bytes.length>converterLimits.fileBytes)throw Error('Output exceeds 8 MiB');
 if(['json','yaml','xml','jsonl'].includes(target)){const reopened=parseLocalData(output.text,target as SourceFormat);if(JSON.stringify(reopened)!==JSON.stringify(datum))throw Error('Output round-trip validation failed')}
 if(target==='csv'||target==='tsv')parseLocalData(output.text,target);
 return {...output,bytes};
}
/** Read dimensions before invoking the browser decoder. No full-source admission arrays. */
export function rasterDimensions(bytes:Uint8Array,format:SourceFormat):{width:number;height:number}{
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let width=0,height=0;
 if(format==='png'){if(bytes.length<33||new TextDecoder().decode(bytes.subarray(12,16))!=='IHDR'||view.getUint32(8)!==13)throw Error('Invalid PNG header');width=view.getUint32(16);height=view.getUint32(20)}
 else if(format==='jpeg'){let offset=2;while(offset+4<=bytes.length){if(bytes[offset]!==255)throw Error('Invalid JPEG marker');while(bytes[offset]===255)offset++;const marker=bytes[offset++];if(marker===217||marker===218)break;if(marker===1||marker>=208&&marker<=215)continue;const size=view.getUint16(offset);if(size<2||offset+size>bytes.length)break;if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)){if(size<8)throw Error('Invalid JPEG dimensions');height=view.getUint16(offset+3);width=view.getUint16(offset+5);break}offset+=size}}
 else if(format==='webp'){const kind=new TextDecoder().decode(bytes.subarray(12,16));if(bytes.length>=30&&kind==='VP8X'){width=1+bytes[24]+(bytes[25]<<8)+(bytes[26]<<16);height=1+bytes[27]+(bytes[28]<<8)+(bytes[29]<<16)}else if(bytes.length>=25&&kind==='VP8L'&&bytes[20]===47){const bits=view.getUint32(21,true);width=(bits&16383)+1;height=((bits>>>14)&16383)+1}else if(bytes.length>=30&&kind==='VP8 '&&bytes[23]===157&&bytes[24]===1&&bytes[25]===42){width=view.getUint16(26,true)&16383;height=view.getUint16(28,true)&16383}}
 if(!width||!height||width>converterLimits.side||height>converterLimits.side||width*height>converterLimits.pixels)throw Error('Raster header unavailable or exceeds 4096 pixels per side / 8,388,608 pixels');return{width,height};
}
export type ConverterReceipt={id:string;at:string;source:SourceFormat;target:ConversionFormat;inputBytes:number;outputBytes:number;state:'done'|'failed'|'cancelled'|'interrupted'};
export const converterReceiptKey='material-git-site.converter-receipts.v1';
export function validateConverterReceipts(value:unknown):ConverterReceipt[]{if(!Array.isArray(value)||value.length>200)throw Error('Invalid conversion receipts');const ids=new Set<string>();return value.map(r=>{if(!r||typeof r!=='object'||Object.keys(r).some(k=>!['id','at','source','target','inputBytes','outputBytes','state'].includes(k))||typeof r.id!=='string'||!/^[-a-z0-9]{1,64}$/.test(r.id)||ids.has(r.id)||typeof r.at!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(r.at)||!Number.isFinite(Date.parse(r.at))||!['json','jsonl','yaml','xml','csv','tsv','png','jpeg','webp'].includes(r.source)||!conversionFormats.includes(r.target)||!['done','failed','cancelled','interrupted'].includes(r.state)||!Number.isSafeInteger(r.inputBytes)||r.inputBytes<0||r.inputBytes>converterLimits.fileBytes||!Number.isSafeInteger(r.outputBytes)||r.outputBytes<0||r.outputBytes>converterLimits.fileBytes)throw Error('Invalid conversion receipt');ids.add(r.id);return {...r}})}
