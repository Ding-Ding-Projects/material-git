import type {AppSettings} from '../shared/types.js';import {defaults} from '../shared/preferences.js';
import {words,messageStyles} from './localization-resources.js';
export type MessageCategory='status'|'error'|'warning'|'destructive'|'financial'|'security'|'accessibility'|'progress';
export interface MessageFacts {en:string;yue:string}
export interface ApplicationMessage {category:MessageCategory;facts:MessageFacts}
/** Application-owned bilingual facts cross shadow boundaries without pre-rendered language strings. */
export function publishMessage(target:EventTarget,category:MessageCategory,facts:MessageFacts){target.dispatchEvent(new CustomEvent<ApplicationMessage>('application-message',{detail:{category,facts},bubbles:true,composed:true}));}
let personal:Record<string,string>={};
export function setPersonalVocabulary(entries:Record<string,string>={}){personal={...entries};}
function personalize(text:string){for(const[key,value]of Object.entries(personal).sort((a,b)=>b[0].length-a[0].length)){const escaped=key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');text=text.replace(new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`,'gu'),()=>value);}return text;}
function level(value:number){return Number.isFinite(value)?Math.max(1,Math.min(5,Math.round(value)))-1:4;}
export function languageParts(key:string,settings:AppSettings=defaults):{primary:string;secondary?:string} {const pair=words[key]??[key,key];const render=(language:'en'|'yue')=>{let value=pair[language==='en'?0:1];if(['saved','ready','error'].includes(key)){const tail=messageStyles[language][level(language==='en'?settings.englishHumor:settings.cantoneseHumor)];if(tail)value+=' '+tail;}return Object.hasOwn(words,key)?personalize(value):value;};return settings.language==='yue'?{primary:render('yue')}:settings.language==='both'?{primary:render('en'),secondary:render('yue')}:{primary:render('en')};}
export function t(key:string,settings:AppSettings=defaults):string {const value=languageParts(key,settings);return value.primary+(value.secondary?' · '+value.secondary:'');}
/** Local text boundary for authored labels that supply both language resources.
 * Callers keep provider records, paths, commands and identifiers outside this helper.
 * No vocabulary data leaves the local replacement cache.
 */
export function localizePair(english:string,cantonese:string,settings:AppSettings=defaults):string {
 const primary=personalize(settings.language==='yue'?cantonese:english);
 return settings.language==='both'?primary+' · '+personalize(cantonese):primary;
}
/** Exact application-owned strings only. Never call on commands, paths, provider records, voice names or identifiers. */
export function localizeText(text:string,settings:AppSettings=defaults):string {const key=Object.keys(words).find(key=>words[key][0]===text);return key?t(key,settings):text;}
/** Keep external factual payloads exact; humor is a separate suffix in every category. */
export function message(category:MessageCategory,facts:{en:string;yue:string},settings:AppSettings=defaults):string {const format=(language:'en'|'yue')=>{const tail=messageStyles[language][level(language==='en'?settings.englishHumor:settings.cantoneseHumor)];return facts[language]+(tail?' '+tail:'');};void category;return settings.language==='yue'?format('yue'):settings.language==='both'?format('en')+' · '+format('yue'):format('en');}
export function dialogDecoration(settings:AppSettings=defaults):string{return settings.emojis?'💬':'';}
export interface VoiceState {voices:SpeechSynthesisVoice[];voice:SpeechSynthesisVoice|null;missing:boolean;network:boolean;available:boolean}
export function voiceState(language:'en'|'yue',settings:AppSettings,voices:SpeechSynthesisVoice[]):VoiceState {const matching=voices.filter(v=>language==='en'?/^en(?:-|$)/i.test(v.lang):/^(?:yue(?:-HK)?|zh-HK)(?:-|$)/i.test(v.lang));const selected=language==='en'?settings.englishVoice:settings.cantoneseVoice;const chosen=matching.find(v=>v.voiceURI===selected);const voice=chosen??matching.find(v=>v.localService)??matching[0]??null;return{voices:matching,voice,missing:Boolean(selected&&!chosen),network:Boolean(voice&&!voice.localService),available:Boolean(voice)};}
interface NarrationLine {key:string;category:MessageCategory;settings:AppSettings;tracks:('en'|'yue')[];facts?:{en:string;yue:string}}
/** Serialized narrator. Ordinary categories are bounded/coalesced; error facts retain FIFO order and bypass cooldown. */
export class EventNarrator {
 private queue:NarrationLine[]=[];private current:NarrationLine|null=null;private utterance:SpeechSynthesisUtterance|null=null;private pending=new Map<MessageCategory,{line:NarrationLine;timer:ReturnType<typeof setTimeout>}>();private last=new Map<MessageCategory,number>();private generation=0;
 constructor(private synth:SpeechSynthesis=globalThis.speechSynthesis,private create:(text:string)=>SpeechSynthesisUtterance=text=>new SpeechSynthesisUtterance(text),private now=()=>Date.now(),private cooldown=4000,private debounce=180){}
 announce(key:string,settings:AppSettings,category:MessageCategory=key==='error'?'error':'status',facts?:{en:string;yue:string}){if(!settings.narrator||!this.synth||settings.screenReaderActive||settings.quietNarration){this.cancel();return;}const line:NarrationLine={key,category,settings:{...settings},tracks:settings.narrationLanguage==='both'?['en','yue']:[settings.narrationLanguage],...(facts?{facts}:{})};const prior=this.pending.get(category);if(prior)clearTimeout(prior.timer);this.pending.delete(category);if(category!=='error')this.queue=this.queue.filter(v=>v.category!==category);const enqueue=()=>{this.pending.delete(category);if(category!=='error'&&this.now()-(this.last.get(category)??-Infinity)<this.cooldown)return;if(this.queue.length>=32){const expendable=this.queue.findIndex(value=>value.category!=='error');if(expendable>=0)this.queue.splice(expendable,1);else if(category!=='error')return;}this.queue.push(line);this.next();};if(category==='error')enqueue();else this.pending.set(category,{line,timer:setTimeout(enqueue,this.debounce)});}
 private next(){if(this.utterance)return;if(!this.current)this.current=this.queue.shift()??null;if(!this.current)return;const line=this.current,language=line.tracks.shift();if(!language){this.last.set(line.category,this.now());this.current=null;this.next();return;}const state=voiceState(language,line.settings,this.synth.getVoices());if(!state.voice||state.network&&globalThis.navigator?.onLine===false){this.next();return;}const utterance=this.create(line.facts?message(line.category,line.facts,{...line.settings,language}):t(line.key,{...line.settings,language}));utterance.voice=state.voice;utterance.lang=state.voice.lang;utterance.rate=Math.max(.5,Math.min(2,line.settings.speechRate));utterance.pitch=Math.max(0,Math.min(2,line.settings.speechPitch));const generation=this.generation;const done=()=>{if(generation!==this.generation||this.utterance!==utterance)return;this.utterance=null;this.next();};utterance.onend=done;utterance.onerror=done;this.utterance=utterance;try{this.synth.speak(utterance);}catch{done();}}
 cancel(){this.generation++;for(const v of this.pending.values())clearTimeout(v.timer);this.pending.clear();this.queue=[];this.current=null;this.utterance=null;this.synth?.cancel?.();}
}
let narrator:EventNarrator|undefined;
export function announce(key:string,settings:AppSettings=defaults,category?:MessageCategory):void {if(!globalThis.speechSynthesis)return;narrator??=new EventNarrator();narrator.announce(key,settings,category);}
export function cancelNarration():void{narrator?.cancel();}

export function announceMessage(category:MessageCategory,facts:{en:string;yue:string},settings:AppSettings=defaults):void{if(!globalThis.speechSynthesis)return;narrator??=new EventNarrator();narrator.announce(category,settings,category,facts);}
