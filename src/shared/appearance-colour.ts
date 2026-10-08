/** Color editing uses unbounded working channels until the user accepts sRGB clipping. */
export type ColourSpace='rgb'|'hsl'|'hsv'|'hwb'|'lab'|'lch'|'oklab'|'oklch'|'cmyk';
export interface Colour {r:number;g:number;b:number;a:number}
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const linear=(v:number)=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
const encoded=(v:number)=>v<=.0031308?v*12.92:1.055*v**(1/2.4)-.055;
const matrix=(m:number[][],v:number[])=>m.map(row=>row.reduce((sum,n,i)=>sum+n*v[i],0));
const toXYZ=[[.4123908,.3575843,.1804808],[.212639,.7151687,.0721923],[.0193308,.1191948,.9505322]];
const fromXYZ=[[3.2409699,-1.5373832,-.4986108],[-.9692436,1.8759675,.0415551],[.0556301,-.203977,1.0569715]];
const d50=[[1.0479298,.0229468,-.0501922],[.0296278,.9904345,-.0170738],[-.009243,.0150552,.7518743]];
const d65=[[.9554734,-.0230985,.0632593],[-.0283697,1.0099955,.0210414],[.012314,-.0205077,1.3303659]];
const polar=([l,a,b]:number[])=>[l,Math.hypot(a,b),(Math.atan2(b,a)*180/Math.PI+360)%360];
const cartesian=([l,c,h]:number[])=>[l,c*Math.cos(h*Math.PI/180),c*Math.sin(h*Math.PI/180)];
export const colourSpaces:Record<ColourSpace,{label:string;channels:string[];ranges:number[][]}>={
 rgb:{label:'RGB',channels:['R','G','B'],ranges:[[0,255],[0,255],[0,255]]},hsl:{label:'HSL',channels:['H','S %','L %'],ranges:[[0,360],[0,100],[0,100]]},hsv:{label:'HSV / HSB',channels:['H','S %','V %'],ranges:[[0,360],[0,100],[0,100]]},hwb:{label:'HWB',channels:['H','W %','B %'],ranges:[[0,360],[0,100],[0,100]]},lab:{label:'CIELAB (D50)',channels:['L','a','b'],ranges:[[0,100],[-160,160],[-160,160]]},lch:{label:'LCH (D50)',channels:['L','C','H'],ranges:[[0,100],[0,230],[0,360]]},oklab:{label:'OKLab (D65)',channels:['L','a','b'],ranges:[[0,1],[-.5,.5],[-.5,.5]]},oklch:{label:'OKLCH (D65)',channels:['L','C','H'],ranges:[[0,1],[0,.7],[0,360]]},cmyk:{label:'CMYK (unprofiled)',channels:['C %','M %','Y %','K %'],ranges:[[0,100],[0,100],[0,100],[0,100]]}};
export function inSrgb(c:Colour):boolean{return[c.r,c.g,c.b].every(v=>v>=-.00001&&v<=1.00001);}
export function colourHex(c:Colour,alpha=false):string{return '#'+[c.r,c.g,c.b,...(alpha?[c.a]:[])].map(v=>Math.round(clamp(v)*255).toString(16).padStart(2,'0')).join('');}
export function parseColourHex(value:string):Colour {if(!/^#(?:[a-f\d]{6}|[a-f\d]{8})$/i.test(value))throw Error('Use HEX or HEX8');const n=[1,3,5,7].map(i=>value.length>i?parseInt(value.slice(i,i+2),16)/255:1);return{r:n[0],g:n[1],b:n[2],a:n[3]};}
export function colourChannels(space:ColourSpace,c:Colour):number[]{
 const {r,g,b}=c,max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min,l=(max+min)/2,h=delta===0?0:((max===r?(g-b)/delta:max===g?(b-r)/delta+2:(r-g)/delta+4)*60+360)%360;
 if(space==='rgb')return[r*255,g*255,b*255];
 if(space==='hsl')return[h,delta===0?0:100*delta/(1-Math.abs(2*l-1)),l*100];
 if(space==='hsv')return[h,max===0?0:delta/max*100,max*100];
 if(space==='hwb')return[h,min*100,(1-max)*100];
 if(space==='cmyk')return max===0?[0,0,0,100]:[(max-r)/max*100,(max-g)/max*100,(max-b)/max*100,(1-max)*100];
 const rgb=[r,g,b].map(linear);
 if(space==='lab'||space==='lch'){
  const xyz=matrix(d50,matrix(toXYZ,rgb)).map((v,i)=>v/[.96422,1,.82521][i]);
  const f=xyz.map(v=>v>216/24389?Math.cbrt(v):v*841/108+4/29);
  const lab=[116*f[1]-16,500*(f[0]-f[1]),200*(f[1]-f[2])];return space==='lch'?polar(lab):lab;
 }
 const lms=matrix([[.4122214708,.5363325363,.0514459929],[.2119034982,.6806995451,.1073969566],[.0883024619,.2817188376,.6299787005]],rgb).map(Math.cbrt);
 const lab=matrix([[.2104542553,.793617785,-.0040720468],[1.9779984951,-2.428592205,.4505937099],[.0259040371,.7827717662,-.808675766]],lms);return space==='oklch'?polar(lab):lab;
}
export function channelsColour(space:ColourSpace,channels:number[],a=1):Colour{
 const spec=colourSpaces[space];if(channels.length!==spec.channels.length||channels.some((v,i)=>!Number.isFinite(v)||v<spec.ranges[i][0]||v>spec.ranges[i][1])||!Number.isFinite(a)||a<0||a>1)throw Error('Color channel outside allowed range');
 let rgb:number[]=[];
 if(space==='rgb')rgb=channels.map(v=>v/255);
 else if(space==='cmyk'){const[c,m,y,k]=channels.map(v=>v/100);rgb=[c,m,y].map(v=>(1-v)*(1-k));}
 else if(['hsl','hsv','hwb'].includes(space)){
  const[h,s0,l0]=channels,s=s0/100,l=l0/100;
  if(space==='hwb'){const pure=channelsColour('hsv',[h,100,100]);rgb=s+l>=1?[s/(s+l),s/(s+l),s/(s+l)]:[pure.r,pure.g,pure.b].map(v=>v*(1-s-l)+s);}
  else{const c=space==='hsl'?(1-Math.abs(2*l-1))*s:l*s,x=c*(1-Math.abs((h/60)%2-1)),m=space==='hsl'?l-c/2:l-c;rgb=(h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x]).map(v=>v+m);}
 }else if(space==='lab'||space==='lch'){
  const[L,A,B]=space==='lch'?cartesian(channels):channels,y=(L+16)/116;
  const xyz=[y+A/500,y,y-B/200].map((v,i)=>(v>6/29?v**3:(v-4/29)*108/841)*[.96422,1,.82521][i]);rgb=matrix(fromXYZ,matrix(d65,xyz)).map(encoded);
 }else{
  const[L,A,B]=space==='oklch'?cartesian(channels):channels;
  const lms=[L+.3963377774*A+.2158037573*B,L-.1055613458*A-.0638541728*B,L-.0894841775*A-1.291485548*B].map(v=>v**3);
  rgb=matrix([[4.0767416621,-3.3077115913,.2309699292],[-1.2684380046,2.6097574011,-.3413193965],[-.0041960863,-.7034186147,1.707614701]],lms).map(encoded);
 }
 return{r:rgb[0],g:rgb[1],b:rgb[2],a};
}
export function compositeColour(c:Colour,b:Colour):Colour{const a=c.a+b.a*(1-c.a);return a===0?{r:0,g:0,b:0,a:0}:{r:(c.r*c.a+b.r*b.a*(1-c.a))/a,g:(c.g*c.a+b.g*b.a*(1-c.a))/a,b:(c.b*c.a+b.b*b.a*(1-c.a))/a,a};}
export function colourContrast(c:Colour,b:Colour):number{const white={r:1,g:1,b:1,a:1},bg=compositeColour(b,white),fg=compositeColour(c,bg),lum=(v:Colour)=>linear(v.r)*.2126+linear(v.g)*.7152+linear(v.b)*.0722;return(Math.max(lum(fg),lum(bg))+.05)/(Math.min(lum(fg),lum(bg))+.05);}
