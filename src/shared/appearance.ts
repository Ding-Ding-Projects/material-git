export const appearanceFields = {
 fontSize:[10,48,'px'],lineHeight:[1,2.5,''],width:[32,1200,'px'],minHeight:[24,240,'px'],padding:[0,64,'px'],gap:[0,48,'px'],borderRadius:[0,64,'px'],shadow:[0,24,'px'],motion:[0,1000,'ms'],hue:[0,360,''],saturation:[0,100,''],lightness:[0,100,''],alpha:[0,1,'']
} as const;
export type AppearanceValues = Partial<Record<keyof typeof appearanceFields,number>>;
export type AppearanceState = 'default'|'hover'|'focus'|'pressed'|'disabled';
export type AppearanceRecord = Partial<Record<AppearanceState,AppearanceValues>>;
export function validateAppearance(input:unknown):AppearanceRecord{
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Appearance must be an object');
 const result:AppearanceRecord={};
 for(const [state,values]of Object.entries(input)){
  if(!['default','hover','focus','pressed','disabled'].includes(state)||!values||typeof values!=='object'||Array.isArray(values))throw new Error('Invalid appearance state');
  const valid:AppearanceValues={};for(const[key,value]of Object.entries(values)){
   if(!Object.hasOwn(appearanceFields,key)||typeof value!=='number'||!Number.isFinite(value))throw new Error('Invalid appearance value');
   const [min,max]=appearanceFields[key as keyof typeof appearanceFields];if(value<min||value>max)throw new Error('Appearance value outside allowed range');valid[key as keyof typeof appearanceFields]=value;
  }result[state as AppearanceState]=valid;
 }return result;
}
export function hslToHex(h:number,s:number,l:number):string{
 s/=100;l/=100;const a=s*Math.min(l,1-l);const channel=(n:number)=>{const k=(n+h/30)%12;return Math.round(255*(l-a*Math.max(-1,Math.min(k-3,9-k,1)))).toString(16).padStart(2,'0');};return '#'+channel(0)+channel(8)+channel(4);
}
export function hexToHsl(hex:string):{hue:number;saturation:number;lightness:number}{
 if(!/^#[0-9a-f]{6}$/i.test(hex))throw new Error('Use a six-digit hexadecimal colour');
 const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255),max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min,l=(max+min)/2;
 const hue=d===0?0:60*((max===r?(g-b)/d+(g<b?6:0):max===g?(b-r)/d+2:(r-g)/d+4));return {hue,saturation:d===0?0:d/(1-Math.abs(2*l-1))*100,lightness:l*100};
}
export function appearanceCss(values:AppearanceValues):string{
 const props:Record<string,string>={fontSize:'font-size',lineHeight:'line-height',width:'width',minHeight:'min-height',padding:'padding',gap:'gap',borderRadius:'border-radius',motion:'transition-duration'};
 const rules=Object.entries(values).flatMap(([key,value])=>props[key]?[`${props[key]}:${value}${appearanceFields[key as keyof typeof appearanceFields][2]}`]:[]);
 if(values.shadow!==undefined)rules.push(`box-shadow:0 ${values.shadow/2}px ${values.shadow}px rgb(0 0 0 / .25)`);
 if(['hue','saturation','lightness','alpha'].some(key=>Object.hasOwn(values,key))){const colour=`hsl(${values.hue??270} ${values.saturation??50}% ${values.lightness??50}% / ${values.alpha??1})`;rules.push(`--md-sys-color-primary:${colour}`,`--md-filled-button-container-color:${colour}`,`--md-switch-selected-track-color:${colour}`,`color:${colour}`);}
 return rules.join(';');
}
