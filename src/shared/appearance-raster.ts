export interface RasterRecipe{x:number;y:number;width:number;height:number;rotation:0|90|180|270;flipX:boolean;flipY:boolean}
export function pngDimensions(bytes:Uint8Array):{width:number;height:number}{
 if(bytes.length<45||bytes.length>36864||![137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n))throw Error('Use a local PNG fill within 36 KiB');
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let offset=8,width=0,height=0,ended=false,data=false;
 while(offset+12<=bytes.length){const size=view.getUint32(offset),kind=String.fromCharCode(...bytes.slice(offset+4,offset+8));if(size>bytes.length-offset-12)throw Error('Truncated PNG chunk');
  if(offset===8){if(kind!=='IHDR'||size!==13)throw Error('PNG header missing');width=view.getUint32(offset+8);height=view.getUint32(offset+12);if(!width||!height||width>512||height>512||width*height>262144)throw Error('PNG exceeds the 512 by 512 pixel bound');}
  else if(kind==='IHDR')throw Error('Repeated PNG header');
  if(!['IHDR','IDAT','IEND','sRGB','gAMA','cHRM','pHYs','PLTE','tRNS'].includes(kind))throw Error('PNG metadata or animation is not supported in a converted fill');
  if(['acTL','fcTL','fdAT'].includes(kind))throw Error('Animated PNG fills are not supported');
  if(kind==='IDAT')data=true;
  offset+=size+12;if(kind==='IEND'){if(size!==0||offset!==bytes.length)throw Error('Unexpected PNG trailing data');ended=true;break;}
 }
 if(!ended||!data)throw Error('PNG image data is incomplete');return{width,height};
}
export function validateRasterRecipe(input:RasterRecipe,source:{width:number;height:number}):RasterRecipe{
 if(!input||Object.keys(input).some(k=>!['x','y','width','height','rotation','flipX','flipY'].includes(k)))throw Error('Invalid raster recipe');
 for(const k of ['x','y','width','height']as const)if(!Number.isInteger(input[k])||input[k]<(['width','height'].includes(k)?1:0))throw Error('Crop uses whole source pixels');
 if(input.x+input.width>source.width||input.y+input.height>source.height||![0,90,180,270].includes(input.rotation)||typeof input.flipX!=='boolean'||typeof input.flipY!=='boolean')throw Error('Crop or transform is outside the source image');return{...input};
}
