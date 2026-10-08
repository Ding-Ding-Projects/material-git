import {PNG} from 'pngjs';
import * as jpeg from 'jpeg-js';
import jsQR from 'jsqr';

export const QR_IMAGE_LIMITS={bytes:8*1024*1024,dimension:2048,pixels:4*1024*1024,candidates:4} as const;
function dimensions(width:number,height:number){if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>QR_IMAGE_LIMITS.dimension||height>QR_IMAGE_LIMITS.dimension||width*height>QR_IMAGE_LIMITS.pixels)throw Error('Choose a QR image no larger than 2048 by 2048 pixels.');return{width,height};}
/** Inspect encoded dimensions before any image decoder allocation. No image metadata leaves this module. */
export function inspectQrImage(input:Uint8Array):{width:number;height:number;format:'png'|'jpeg'}{
 if(!(input instanceof Uint8Array)||input.byteLength<24||input.byteLength>QR_IMAGE_LIMITS.bytes)throw Error('Choose a PNG or JPEG QR image within 8 MiB.');
 const bytes=Buffer.from(input.buffer,input.byteOffset,input.byteLength);
 if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))){if(bytes.readUInt32BE(8)!==13||bytes.toString('ascii',12,16)!=='IHDR')throw Error('The PNG header is invalid.');const size=dimensions(bytes.readUInt32BE(16),bytes.readUInt32BE(20));let offset=8,ended=false,data=false;
  while(offset+12<=bytes.length){const length=bytes.readUInt32BE(offset),kind=bytes.toString('ascii',offset+4,offset+8);if(length>bytes.length-offset-12)throw Error('The PNG is truncated.');if(offset!==8&&kind==='IHDR'||['acTL','fcTL','fdAT'].includes(kind))throw Error('Use one still QR image.');if(kind==='IDAT')data=true;offset+=length+12;if(kind==='IEND'){if(length||offset!==bytes.length)throw Error('The PNG has unexpected trailing data.');ended=true;break;}}
  if(!ended||!data)throw Error('The PNG image is incomplete.');return{...size,format:'png'};
 }
 if(bytes[0]===255&&bytes[1]===216){let offset=2;while(offset+4<=bytes.length){if(bytes[offset++]!==255)throw Error('The JPEG marker is invalid.');while(bytes[offset]===255)offset++;const marker=bytes[offset++];if(marker===217||marker===218)break;if(marker===1||marker>=208&&marker<=215)continue;if(offset+2>bytes.length)break;const length=bytes.readUInt16BE(offset);if(length<2||length>bytes.length-offset)throw Error('The JPEG is truncated.');if([192,193,194].includes(marker)){if(length<8)throw Error('The JPEG frame is invalid.');return{...dimensions(bytes.readUInt16BE(offset+5),bytes.readUInt16BE(offset+3)),format:'jpeg'};}offset+=length;}throw Error('Use a supported still JPEG QR image.');
 }
 throw Error('Choose a real PNG or JPEG QR image.');
}

/** Bounded decoding happens only after the user selects/imports an image. Candidates remain native. */
export async function decodeAuthenticatorQrImage(input:Uint8Array):Promise<string[]>{
 const expected=inspectQrImage(input);let decoded:{width:number;height:number;data:Uint8Array};
 try{decoded=expected.format==='png'?PNG.sync.read(Buffer.from(input),{checkCRC:true}):jpeg.decode(input,{useTArray:true,formatAsRGBA:true,tolerantDecoding:false,maxResolutionInMP:4.2,maxMemoryUsageInMB:64});}catch{throw Error('The selected QR image could not be decoded.');}
 if(decoded.width!==expected.width||decoded.height!==expected.height||decoded.data.length!==expected.width*expected.height*4)throw Error('The decoded QR image dimensions differ from its header.');
 const candidates=new Set<string>();
 const areas=[{x:0,y:0,width:decoded.width,height:decoded.height}];
 if(decoded.width>=128)areas.push({x:0,y:0,width:Math.floor(decoded.width/2),height:decoded.height},{x:Math.floor(decoded.width/2),y:0,width:Math.ceil(decoded.width/2),height:decoded.height});
 if(decoded.height>=128)areas.push({x:0,y:0,width:decoded.width,height:Math.floor(decoded.height/2)},{x:0,y:Math.floor(decoded.height/2),width:decoded.width,height:Math.ceil(decoded.height/2)});
 for(const area of areas){const pixels=new Uint8ClampedArray(area.width*area.height*4);for(let y=0;y<area.height;y++)pixels.set(decoded.data.subarray(((y+area.y)*decoded.width+area.x)*4,((y+area.y)*decoded.width+area.x+area.width)*4),y*area.width*4);
  for(let index=0;index<QR_IMAGE_LIMITS.candidates;index++){const code=jsQR(pixels,area.width,area.height,{inversionAttempts:'attemptBoth'});if(!code)break;if(code.data.length>8192)throw Error('The QR payload exceeds the enrollment limit.');candidates.add(code.data);if(candidates.size>1)return [...candidates];const corners=[code.location.topLeftCorner,code.location.topRightCorner,code.location.bottomLeftCorner,code.location.bottomRightCorner],left=Math.max(0,Math.floor(Math.min(...corners.map(point=>point.x)))-2),right=Math.min(area.width,Math.ceil(Math.max(...corners.map(point=>point.x)))+2),top=Math.max(0,Math.floor(Math.min(...corners.map(point=>point.y)))-2),bottom=Math.min(area.height,Math.ceil(Math.max(...corners.map(point=>point.y)))+2);for(let y=top;y<bottom;y++)pixels.fill(255,(y*area.width+left)*4,(y*area.width+right)*4);}
  await new Promise<void>(resolve=>setImmediate(resolve));
 }
 return [...candidates];
}
