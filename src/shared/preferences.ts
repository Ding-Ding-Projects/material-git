import type { AppSettings } from './types.js';
export const defaults: AppSettings = {
 language:'en',theme:'system',seed:'#46b98b',density:'comfortable',fontScale:1,fontFamily:'system-ui',motion:true,
 englishHumor:5,cantoneseHumor:5,emojis:true,displayName:'Material Git',narrator:false,narrationLanguage:'en',
 englishVoice:'',cantoneseVoice:'',speechRate:1,speechPitch:1,focus:false,lowStimulation:false,timeAwareness:false,oneThing:false,momentum:false,currentTask:''
};
const choices: Partial<Record<keyof AppSettings, readonly string[]>> = {language:['en','yue','both'],theme:['dark','light','system'],density:['comfortable','compact'],narrationLanguage:['en','yue','both']};
const ranges: Partial<Record<keyof AppSettings, [number,number]>> = {fontScale:[0.75,2],englishHumor:[1,5],cantoneseHumor:[1,5],speechRate:[0.5,2],speechPitch:[0,2]};
/** Accept a bounded partial update; reject rather than silently coerce invalid values. */
export function validateSettings(input: unknown): Partial<AppSettings> {
 if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Settings must be an object');
 const output: Record<string,unknown> = {};
 for (const [key,value] of Object.entries(input)) {
  if (!Object.hasOwn(defaults,key)) throw new Error('Unknown setting');
  const name = key as keyof AppSettings;
  if (typeof value !== typeof defaults[name]) throw new Error('Invalid setting type');
  if (typeof value === 'number' && (!Number.isFinite(value) || (ranges[name] && (value < ranges[name]![0] || value > ranges[name]![1])) || ((name==='englishHumor'||name==='cantoneseHumor')&&!Number.isInteger(value)))) throw new Error('Setting outside allowed range');
  if (typeof value === 'string' && (value.length > (name==='currentTask'?2000:256) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value) || (choices[name] && !choices[name]!.includes(value)) || (name==='seed'&&!/^#[0-9a-f]{6}$/i.test(value)))) throw new Error('Invalid setting value');
  output[key]=value;
 }
 return output as Partial<AppSettings>;
}
