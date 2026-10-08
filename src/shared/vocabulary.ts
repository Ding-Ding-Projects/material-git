export const vocabularyLimits = {bytes:65536,entries:256,keyLength:128,valueLength:256,depth:2} as const;
export interface Vocabulary {schemaVersion:1; entries:Record<string,string>}
/** A small strict JSON reader prevents duplicate keys from disappearing in JSON.parse. */
export function parseVocabulary(source: string | Uint8Array): Vocabulary {
 const bytes = typeof source==='string'?new TextEncoder().encode(source):source;
 if(bytes.byteLength>vocabularyLimits.bytes) throw new Error('Vocabulary file is too large');
 let text:string; try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw new Error('Invalid UTF-8');}
 let index=0;
 const whitespace=()=>{while(/[ \t\r\n]/.test(text[index]??'')&&index<text.length)index++;};
 const string=():string=>{const start=index++;while(index<text.length){const c=text[index++];if(c==='\\'){index++;continue;}if(c==='"'){try{return JSON.parse(text.slice(start,index));}catch{break;}}}throw new Error('Invalid JSON string');};
 const value=(depth:number):unknown=>{
  whitespace(); if(text[index]==='"')return string();
  if(text[index]==='{'){
   if(depth>vocabularyLimits.depth)throw new Error('Vocabulary nesting too deep');
   index++; whitespace();const result:Record<string,unknown>=Object.create(null);if(text[index]==='}'){index++;return result;}
   while(index<text.length){whitespace();if(text[index]!=='"')throw new Error('Invalid JSON object');const key=string();if(['__proto__','prototype','constructor'].includes(key)||Object.hasOwn(result,key))throw new Error('Duplicate or unsafe key');whitespace();if(text[index++]!==':')throw new Error('Invalid JSON object');result[key]=value(depth+1);whitespace();const next=text[index++];if(next==='}')return result;if(next!==',')throw new Error('Invalid JSON object');}
  }
  const match=/^(?:-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/.exec(text.slice(index));if(match){index+=match[0].length;return JSON.parse(match[0]);}
  throw new Error('Invalid JSON');
 };
 const parsed=value(1) as Record<string,unknown>;whitespace();if(index!==text.length||!parsed||typeof parsed!=='object'||Object.keys(parsed).length!==2||parsed.schemaVersion!==1||!Object.hasOwn(parsed,'entries'))throw new Error('Unsupported vocabulary schema');
 const entries=parsed.entries;if(!entries||typeof entries!=='object'||Array.isArray(entries)||Object.keys(entries).length>vocabularyLimits.entries)throw new Error('Invalid vocabulary entries');
 for(const [key,replacement]of Object.entries(entries))if(!key.length||key.length>vocabularyLimits.keyLength||typeof replacement!=='string'||!replacement.length||replacement.length>vocabularyLimits.valueLength||/[\u0000-\u001f]/.test(key+replacement))throw new Error('Invalid vocabulary entry');
 return parsed as unknown as Vocabulary;
}
