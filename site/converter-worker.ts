import {converterLimits,sourceFormat,convertLocalData,rasterDimensions,type ConversionFormat} from '../src/site-shared/local-converter';
import type {ExportFormat} from '../src/shared/exports';
self.onmessage=async(event:MessageEvent<{file:File;target:ConversionFormat}>)=>{
 try{const {file,target}=event.data;if(!(file instanceof Blob)||!file.size||file.size>converterLimits.fileBytes)throw Error('Source must be between 1 byte and 8 MiB');
 const header=new Uint8Array(await file.slice(0,131072).arrayBuffer()),source=sourceFormat(file.name,header);self.postMessage({progress:'validated',source});
 let blob:Blob;
 if(['png','jpeg','webp'].includes(source)){
  if(!['png','jpeg','webp'].includes(target))throw Error('Raster sources require a raster destination');const size=rasterDimensions(header,source),bitmap=await createImageBitmap(file,{imageOrientation:'none'});
  try{if(bitmap.width!==size.width||bitmap.height!==size.height)throw Error('Decoded dimensions differ from inspected header');const canvas=new OffscreenCanvas(size.width,size.height),context=canvas.getContext('2d');if(!context)throw Error('Offscreen canvas unavailable');if(target==='jpeg'){context.fillStyle='#fff';context.fillRect(0,0,size.width,size.height)}context.drawImage(bitmap,0,0);blob=await canvas.convertToBlob({type:'image/'+target,quality:0.9});if(blob.type!=='image/'+target||blob.size>converterLimits.fileBytes)throw Error('Encoder unavailable or output exceeds 8 MiB');const check=await createImageBitmap(blob);try{if(check.width!==size.width||check.height!==size.height)throw Error('Output image validation failed')}finally{check.close()}}finally{bitmap.close()}
 }else{const text=new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer()),output=convertLocalData(text,source,target as ExportFormat);blob=new Blob([output.bytes as BlobPart],{type:output.mime})}
 self.postMessage({blob,source,target});
 }catch(error){self.postMessage({error:error instanceof Error?error.message:'Conversion failed'})}
};
