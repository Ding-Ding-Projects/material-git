export type VectorCommand={kind:'M'|'L';x:number;y:number}|{kind:'Q';x1:number;y1:number;x:number;y:number}|{kind:'C';x1:number;y1:number;x2:number;y2:number;x:number;y:number}|{kind:'Z'};
export type VectorBlend='source-over'|'multiply'|'screen'|'overlay'|'darken'|'lighten';
export interface VectorShape{id:string;name:string;visible:boolean;locked:boolean;commands:VectorCommand[];fill:string;stroke:string;strokeWidth:number;opacity:number;blend:VectorBlend;fillRule:'nonzero'|'evenodd';lineJoin:'miter'|'round'|'bevel'}
export interface VectorDocument{schemaVersion:1;width:number;height:number;background:string;shapes:VectorShape[]}
const color=(v:unknown):v is string=>typeof v==='string'&&(v==='none'||/^#[a-f\d]{6}(?:[a-f\d]{2})?$/i.test(v));
const keys=(v:unknown,allowed:string[]):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>allowed.includes(k));
const finite=(v:unknown,min:number,max:number):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
export function validateVector(input:unknown):VectorDocument{
 if(!keys(input,['schemaVersion','width','height','background','shapes'])||input.schemaVersion!==1||!finite(input.width,16,512)||!finite(input.height,16,512)||!Number.isInteger(input.width)||!Number.isInteger(input.height)||!color(input.background)||!Array.isArray(input.shapes)||input.shapes.length>16)throw Error('Invalid bounded vector document');
 let count=0;const ids=new Set<string>();const shapes=input.shapes.map(raw=>{
  if(!keys(raw,['id','name','visible','locked','commands','fill','stroke','strokeWidth','opacity','blend','fillRule','lineJoin'])||typeof raw.id!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(raw.id)||ids.has(raw.id)||typeof raw.name!=='string'||!raw.name.trim()||raw.name.length>80||/[\u0000-\u001f]/.test(raw.name)||typeof raw.visible!=='boolean'||typeof raw.locked!=='boolean'||!Array.isArray(raw.commands)||raw.commands.length<2||raw.commands.length>128||!color(raw.fill)||!color(raw.stroke)||!finite(raw.strokeWidth,0,64)||!finite(raw.opacity,0,1)||!['source-over','multiply','screen','overlay','darken','lighten'].includes(String(raw.blend))||!['nonzero','evenodd'].includes(String(raw.fillRule))||!['miter','round','bevel'].includes(String(raw.lineJoin)))throw Error('Invalid vector shape');
  ids.add(raw.id);count+=raw.commands.length;if(count>512)throw Error('Vector command limit exceeded');
  const commands=raw.commands.map((command,index)=>{if(!command||typeof command!=='object'||Array.isArray(command))throw Error('Invalid path command');const c=command as Record<string,unknown>,args=c.kind==='M'||c.kind==='L'?['x','y']:c.kind==='Q'?['x1','y1','x','y']:c.kind==='C'?['x1','y1','x2','y2','x','y']:c.kind==='Z'?[]:null;if(!args||index===0&&c.kind!=='M'||Object.keys(c).some(k=>k!=='kind'&&!args.includes(k))||args.some(k=>!finite(c[k],-1024,1024)))throw Error('Only bounded M, L, Q, C and Z commands are supported');return{...c}as VectorCommand;});
  return{...raw,commands}as unknown as VectorShape;
 });
 const result={schemaVersion:1,width:input.width,height:input.height,background:input.background,shapes}as VectorDocument;if(new TextEncoder().encode(JSON.stringify(result)).length>32768)throw Error('Vector source byte limit exceeded');return result;
}
export function vectorPath(commands:VectorCommand[]):string{return commands.map(c=>c.kind==='Z'?'Z':c.kind==='C'?`C ${c.x1} ${c.y1} ${c.x2} ${c.y2} ${c.x} ${c.y}`:c.kind==='Q'?`Q ${c.x1} ${c.y1} ${c.x} ${c.y}`:`${c.kind} ${c.x} ${c.y}`).join(' ');}
/** SVG is generated exclusively from validated numeric commands and allowlisted paint. */
export function vectorSvg(input:unknown):string{const d=validateVector(input);return `<svg xmlns="http://www.w3.org/2000/svg" width="${d.width}" height="${d.height}" viewBox="0 0 ${d.width} ${d.height}"><g style="isolation:isolate"><rect width="${d.width}" height="${d.height}" fill="${d.background}"/>${d.shapes.filter(s=>s.visible).map(s=>`<path d="${vectorPath(s.commands)}" fill="${s.fill}" stroke="${s.stroke}" stroke-width="${s.strokeWidth}" opacity="${s.opacity}" fill-rule="${s.fillRule}" stroke-linejoin="${s.lineJoin}" style="mix-blend-mode:${s.blend==='source-over'?'normal':s.blend}"/>`).join('')}</g></svg>`;}
export function vectorPreset(kind:'rectangle'|'ellipse'|'triangle'|'curve',width:number,height:number,id:string):VectorShape{const x=width*.2,y=height*.2,w=width*.6,h=height*.6,cx=width/2,cy=height/2,k=.5522847498,rx=w/2,ry=h/2;let commands:VectorCommand[];
 if(kind==='rectangle')commands=[{kind:'M',x,y},{kind:'L',x:x+w,y},{kind:'L',x:x+w,y:y+h},{kind:'L',x,y:y+h},{kind:'Z'}];
 else if(kind==='triangle')commands=[{kind:'M',x:cx,y},{kind:'L',x:x+w,y:y+h},{kind:'L',x,y:y+h},{kind:'Z'}];
 else if(kind==='curve')commands=[{kind:'M',x,y:y+h},{kind:'C',x1:x,y1:y,x2:x+w,y2:y+h,x:x+w,y}];
 else commands=[{kind:'M',x:cx+rx,y:cy},{kind:'C',x1:cx+rx,y1:cy+k*ry,x2:cx+k*rx,y2:cy+ry,x:cx,y:cy+ry},{kind:'C',x1:cx-k*rx,y1:cy+ry,x2:cx-rx,y2:cy+k*ry,x:cx-rx,y:cy},{kind:'C',x1:cx-rx,y1:cy-k*ry,x2:cx-k*rx,y2:cy-ry,x:cx,y:cy-ry},{kind:'C',x1:cx+k*rx,y1:cy-ry,x2:cx+rx,y2:cy-k*ry,x:cx+rx,y:cy},{kind:'Z'}];
 return{id,name:kind,visible:true,locked:false,commands,fill:kind==='curve'?'none':'#6750a4',stroke:'#211b2c',strokeWidth:2,opacity:1,blend:'source-over',fillRule:'nonzero',lineJoin:'round'};
}
/** Quadratic-to-cubic conversion is exact; cubic-to-quadratic uses a disclosed approximation. */
export function convertVectorCommand(commands:VectorCommand[],index:number,kind:'L'|'Q'|'C'):VectorCommand[]{
 if(!Number.isInteger(index)||index<1||index>=commands.length||!['L','Q','C'].includes(kind))throw Error('Choose an existing drawable segment');const current=commands[index];if(current.kind==='Z'||current.kind==='M')throw Error('Move and close commands cannot be converted');
 let previous={x:0,y:0},start={x:0,y:0};for(const c of commands.slice(0,index)){if(c.kind==='Z')previous=start;else{previous={x:c.x,y:c.y};if(c.kind==='M')start=previous;}}
 const{x,y}=current;let next:VectorCommand;
 if(kind==='L')next={kind,x,y};
 else if(kind==='Q')next={kind,x,y,x1:current.kind==='Q'?current.x1:current.kind==='C'?(3*(current.x1+current.x2)-previous.x-x)/4:(previous.x+x)/2,y1:current.kind==='Q'?current.y1:current.kind==='C'?(3*(current.y1+current.y2)-previous.y-y)/4:(previous.y+y)/2};
 else next=current.kind==='C'?{...current}:current.kind==='Q'?{kind,x,y,x1:previous.x+2/3*(current.x1-previous.x),y1:previous.y+2/3*(current.y1-previous.y),x2:x+2/3*(current.x1-x),y2:y+2/3*(current.y1-y)}:{kind,x,y,x1:previous.x+(x-previous.x)/3,y1:previous.y+(y-previous.y)/3,x2:previous.x+2*(x-previous.x)/3,y2:previous.y+2*(y-previous.y)/3};
 return commands.map((c,i)=>i===index?next:{...c});
}
