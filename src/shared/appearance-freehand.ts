export interface FreehandPoint{x:number;y:number}
export interface FreehandRecipe{points:FreehandPoint[];tolerance:number}
export function validateFreehand(input:unknown):FreehandRecipe{
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['points','tolerance'].includes(k)))throw Error('Invalid freehand recipe');
 const r=input as Record<string,unknown>;
 if(!Array.isArray(r.points)||r.points.length<2||r.points.length>256||typeof r.tolerance!=='number'||!Number.isFinite(r.tolerance)||r.tolerance<0||r.tolerance>32)throw Error('Freehand requires 2–256 points and a tolerance from 0 to 32');
 const points=r.points.map(value=>{if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['x','y'].includes(k)))throw Error('Invalid freehand point');const p=value as FreehandPoint;if(![p.x,p.y].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=-1024&&n<=1024))throw Error('Freehand coordinates exceed the source bounds');return{x:p.x,y:p.y};});
 return{points,tolerance:r.tolerance};
}
/** Iterative Ramer–Douglas–Peucker; no automatic tolerance increase or point-budget truncation. */
export function simplifyFreehand(input:unknown):FreehandPoint[]{
 const{points,tolerance}=validateFreehand(input);if(!tolerance)return points;
 const keep=new Set([0,points.length-1]),segments:[[number,number]]|[number,number][]=[[0,points.length-1]],limit=tolerance*tolerance;
 while(segments.length){const[start,end]=segments.pop()!,a=points[start],b=points[end],dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy;let far=-1,distance=limit;
  for(let i=start+1;i<end;i++){const p=points[i],t=length?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/length)):0,x=p.x-a.x-t*dx,y=p.y-a.y-t*dy,d=x*x+y*y;if(d>distance){far=i;distance=d;}}
  if(far>=0){keep.add(far);segments.push([start,far],[far,end]);}
 }
 return[...keep].sort((a,b)=>a-b).map(i=>({...points[i]}));
}
export function freehandCommands(input:unknown):({kind:'M'|'L';x:number;y:number})[]{const points=simplifyFreehand(input);if(points.length>128)throw Error('Preview exceeds 128 commands; explicitly increase tolerance or edit the source points');return points.map((p,i)=>({kind:i?'L':'M',...p}));}
