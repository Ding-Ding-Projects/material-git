import type { AppSettings } from './types.js';
export const defaults: AppSettings = {
 language:'en',theme:'system',seed:'#46b98b',density:'comfortable',fontScale:1,fontFamily:'system-ui',motion:true,
 englishHumor:5,cantoneseHumor:5,emojis:true,displayName:'Material Git',narrator:false,narrationLanguage:'en',
 englishVoice:'',cantoneseVoice:'',speechRate:1,speechPitch:1,focus:false,lowStimulation:false,timeAwareness:false,oneThing:false,momentum:false,currentTask:'',screenReaderActive:false,quietNarration:false,logoPreset:'git',logoImage:'',fontWeight:400,fontStyle:'normal',letterSpacing:0,lineHeight:1.5,borderRadius:8
};
const choices: Partial<Record<keyof AppSettings, readonly string[]>> = {language:['en','yue','both'],theme:['dark','light','system'],density:['comfortable','compact'],narrationLanguage:['en','yue','both'],logoPreset:['git','branches','merge','custom'],fontStyle:['normal','italic']};
const ranges: Partial<Record<keyof AppSettings, [number,number]>> = {fontScale:[0.75,2],englishHumor:[1,5],cantoneseHumor:[1,5],speechRate:[0.5,2],speechPitch:[0,2],fontWeight:[100,900],letterSpacing:[-2,10],lineHeight:[1,3],borderRadius:[0,64]};
/** Accept a bounded partial update; reject rather than silently coerce invalid values. */
export function validateSettings(input: unknown): Partial<AppSettings> {
 if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Settings must be an object');
 const output: Record<string,unknown> = {};
 for (const [key,value] of Object.entries(input)) {
  if (!Object.hasOwn(defaults,key)) throw new Error('Unknown setting');
  const name = key as keyof AppSettings;
  if (typeof value !== typeof defaults[name]) throw new Error('Invalid setting type');
  if (typeof value === 'number' && (!Number.isFinite(value) || (ranges[name] && (value < ranges[name]![0] || value > ranges[name]![1])) || ((name==='englishHumor'||name==='cantoneseHumor')&&!Number.isInteger(value)))) throw new Error('Setting outside allowed range');
  if (typeof value === 'string' && (value.length > (name==='logoImage'?49152:name==='currentTask'?2000:256) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value) || (choices[name] && !choices[name]!.includes(value)) || (name==='seed'&&!/^#[0-9a-f]{6}$/i.test(value)))) throw new Error('Invalid setting value');
  if(name==='logoImage'&&value!==''&&(typeof value!=='string'||!/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(value)))throw new Error('Logo must be a bounded converted PNG');
  if(name==='displayName'&&typeof value==='string'&&!value.trim())throw new Error('Display name is required');
  output[key]=value;
 }
 return output as Partial<AppSettings>;
}
export const settingChoices=choices;
export const settingRanges=ranges;
export const settingsFields=Object.fromEntries(Object.keys(defaults).map(key=>[key,{key,type:typeof defaults[key as keyof AppSettings],...(choices[key as keyof AppSettings]?{choices:choices[key as keyof AppSettings]}:{}),...(ranges[key as keyof AppSettings]?{min:ranges[key as keyof AppSettings]![0],max:ranges[key as keyof AppSettings]![1]}:{})}])) as Record<keyof AppSettings,{key:string;type:string;choices?:readonly string[];min?:number;max?:number}>;
