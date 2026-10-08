import {LitElement,html,css} from './material';
import './components';
import './converters';
import './ollama';
import type {AppSettings} from '../shared/types';
import {defaults} from '../shared/preferences';
import {t} from './localization';
export class MaterialTools extends LitElement{
 static properties={settings:{attribute:false},schoolMode:{type:Boolean},sample:{state:true},regexResult:{state:true},tab:{state:true}};
 settings:AppSettings={...defaults};schoolMode=false;sample='';regexResult='';tab=0;
 static styles=css`:host{display:block}mg-layout{padding:16px 0}md-outlined-text-field{width:100%}md-tabs{margin-bottom:24px}`;
 render(){return html`<mg-layout column aria-label=${t('tools',this.settings)}><md-tabs role="tablist" @change=${(event:Event)=>this.tab=(event.target as HTMLElement&{activeTabIndex:number}).activeTabIndex}><md-primary-tab role="tab" aria-selected=${this.tab===0?'true':'false'} .active=${this.tab===0}>Regular expressions</md-primary-tab><md-primary-tab role="tab" aria-selected=${this.tab===1?'true':'false'} .active=${this.tab===1}>Converters</md-primary-tab><md-primary-tab role="tab" aria-selected=${this.tab===2?'true':'false'} .active=${this.tab===2}>Local models</md-primary-tab></md-tabs>${this.tab===0?html`<mg-layout column><mg-text kind="title">Local regex workbench</mg-text><mg-text kind="muted">Use the expression builder for groups, flags, captures, replacements and local snippets.</mg-text><md-outlined-text-field type="textarea" label="Text to test locally" .value=${this.sample} @input=${(e:Event)=>{this.sample=(e.target as HTMLInputElement).value;}}></md-outlined-text-field><mg-search label="Text or regular expression" @search-change=${async(e:CustomEvent)=>{try{const matches=await(e.target as HTMLElement&{matchValues(values:string[]):Promise<boolean[]>}).matchValues(this.sample.split('\n'));this.regexResult=this.sample.split('\n').filter((_,i)=>matches[i]).join('\n')||'No matching lines.';}catch{this.regexResult='Invalid or timed out expression.';}}}></mg-search><mg-text kind="code" role="status">${this.regexResult}</mg-text></mg-layout>`:this.tab===1?html`<mg-converters .settings=${this.settings}></mg-converters>`:html`<mg-ollama .settings=${this.settings} .schoolMode=${this.schoolMode}></mg-ollama>`}</mg-layout>`;}
}
customElements.define('mg-tools',MaterialTools);
