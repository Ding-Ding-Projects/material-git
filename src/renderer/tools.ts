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
 static styles=css`
 :host{display:block;min-width:0;color:var(--md-sys-color-on-surface);font-family:var(--md-ref-typeface-plain,system-ui,sans-serif);font-size:var(--mg-body-size,.8125rem);line-height:1.5}
 *,*::before,*::after{box-sizing:border-box}mg-layout,mg-surface,mg-text,mg-search{min-width:0;max-width:100%}mg-text,p,h2,h3,label,small{overflow-wrap:anywhere}
 md-outlined-text-field,md-outlined-select,md-filled-select{min-width:0;max-width:100%;--md-outlined-text-field-container-shape:8px;--md-outlined-select-text-field-container-shape:8px;--md-filled-select-text-field-container-shape:8px;--md-outlined-text-field-input-text-size:var(--mg-body-size,.8125rem);--md-outlined-select-text-field-input-text-size:var(--mg-body-size,.8125rem)}
 md-filled-button,md-outlined-button,md-text-button{max-width:100%;--md-filled-button-container-shape:8px;--md-outlined-button-container-shape:8px;--md-text-button-container-shape:8px;--md-filled-button-label-text-size:var(--mg-body-size,.8125rem);--md-outlined-button-label-text-size:var(--mg-body-size,.8125rem);--md-text-button-label-text-size:var(--mg-body-size,.8125rem)}
 md-dialog{max-width:calc(100vw - 32px);--md-dialog-container-shape:12px;--md-dialog-container-color:var(--md-sys-color-surface-container-high)}
 ::-webkit-scrollbar{width:10px;height:10px}::-webkit-scrollbar-track{background:var(--md-sys-color-surface-container-low)}::-webkit-scrollbar-thumb{background:var(--md-sys-color-outline-variant);border:2px solid var(--md-sys-color-surface-container-low);border-radius:8px}::-webkit-scrollbar-thumb:hover{background:var(--md-sys-color-outline)}
[hidden]{display:none!important}mg-layout{gap:12px;padding:16px}mg-layout mg-layout{padding:0}md-outlined-text-field{width:100%}md-tabs{max-width:100%;margin-bottom:0;--md-primary-tab-label-text-size:var(--mg-body-size,.8125rem)}`;
 render(){return html`<mg-layout column aria-label=${t('tools',this.settings)}><md-tabs role="tablist" @change=${(event:Event)=>this.tab=(event.target as HTMLElement&{activeTabIndex:number}).activeTabIndex}><md-primary-tab role="tab" aria-selected=${this.tab===0?'true':'false'} .active=${this.tab===0}>Regular expressions</md-primary-tab><md-primary-tab role="tab" aria-selected=${this.tab===1?'true':'false'} .active=${this.tab===1}>Converters</md-primary-tab><md-primary-tab role="tab" aria-selected=${this.tab===2?'true':'false'} .active=${this.tab===2}>Local models</md-primary-tab></md-tabs><mg-layout column ?hidden=${this.tab!==0}><mg-text kind="title">Local regex workbench</mg-text><mg-text kind="muted">Use the expression builder for groups, flags, captures, replacements and local snippets.</mg-text><md-outlined-text-field type="textarea" label="Text to test locally" .value=${this.sample} @input=${(e:Event)=>{this.sample=(e.target as HTMLInputElement).value;}}></md-outlined-text-field><mg-search label="Text or regular expression" @search-change=${async(e:CustomEvent)=>{try{const matches=await(e.target as HTMLElement&{matchValues(values:string[]):Promise<boolean[]>}).matchValues(this.sample.split('\n'));this.regexResult=this.sample.split('\n').filter((_,i)=>matches[i]).join('\n')||'No matching lines.';}catch{this.regexResult='Invalid or timed out expression.';}}}></mg-search><mg-text kind="code" role="status">${this.regexResult}</mg-text></mg-layout><mg-converters ?hidden=${this.tab!==1} .settings=${this.settings}></mg-converters><mg-ollama ?hidden=${this.tab!==2} .settings=${this.settings} .schoolMode=${this.schoolMode}></mg-ollama></mg-layout>`;}
}
customElements.define('mg-tools',MaterialTools);
