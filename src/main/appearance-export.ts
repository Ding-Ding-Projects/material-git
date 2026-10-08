import {validateVector, vectorSvg} from '../shared/appearance-vector.js';
import {pngDimensions} from '../shared/appearance-raster.js';

export interface DecodedAppearancePng {bytes:Uint8Array;width:number;height:number}
export type ReencodeAppearancePng=(bytes:Buffer)=>DecodedAppearancePng;
export interface AppearanceExportBytes {extension:'svg'|'png';bytes:Buffer}

/** Validates renderer data only. The caller owns locks, native picking and exclusive file creation. */
export function serializeAppearanceExport(payload:unknown,reencodePng:ReencodeAppearancePng):AppearanceExportBytes {
 if(!payload||typeof payload!=='object'||Array.isArray(payload)||Object.keys(payload).some(key=>!['document','format','png'].includes(key)))throw Error('Invalid appearance export request');
 const input=payload as Record<string,unknown>;
 if(input.format!=='svg'&&input.format!=='png')throw Error('Choose SVG or PNG export');
 const document=validateVector(input.document);
 if(input.format==='svg'){
  if(input.png!==undefined)throw Error('SVG export does not accept raster bytes');
  return{extension:'svg',bytes:Buffer.from(vectorSvg(document),'utf8')};
 }
 if(typeof input.png!=='string'||input.png.length>49152||!/^data:image\/png;base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(input.png))throw Error('Use a bounded PNG data URL');
 const encoded=input.png.slice('data:image/png;base64,'.length),source=Buffer.from(encoded,'base64');
 if(source.toString('base64')!==encoded)throw Error('Invalid PNG base64 encoding');
 const header=pngDimensions(source);
 if(header.width!==document.width||header.height!==document.height)throw Error('PNG dimensions do not match the vector document');
 const decoded=reencodePng(Buffer.from(source));
 if(!decoded||!(decoded.bytes instanceof Uint8Array)||decoded.width!==header.width||decoded.height!==header.height)throw Error('Decoded PNG dimensions do not match the validated header');
 const bytes=Buffer.from(decoded.bytes),output=pngDimensions(bytes);
 if(output.width!==document.width||output.height!==document.height)throw Error('Reencoded PNG dimensions do not match the vector document');
 return{extension:'png',bytes};
}
