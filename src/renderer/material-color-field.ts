import {LitElement,html,css} from './material';
import {defaults} from '../shared/preferences';
import type {AppSettings} from '../shared/types';
import {localizePair} from './localization';

/** Color composition built from official Material Web text field and sliders. */
export class MaterialColorField extends LitElement {
 static properties={value:{type:String},label:{type:String},disabled:{type:Boolean,reflect:true},settings:{attribute:false},invalid:{state:true}};
 value='#6750a4';label='Color';disabled=false;settings:AppSettings={...defaults};invalid=false;
 static styles=css`:host{display:block;min-width:0}md-outlined-text-field{width:100%}.channels{display:grid;gap:4px;margin-top:8px}.channel{display:grid;grid-template-columns:minmax(44px,auto) minmax(80px,1fr) 3ch;align-items:center;gap:8px}.channel span{font-size:.875rem}md-slider{width:100%;min-width:0}.swatch{display:inline-block;width:24px;height:24px;border-radius:50%;border:1px solid var(--md-sys-color-outline);align-self:center;margin-inline-end:12px}`;
 private change(value:string){if(this.disabled)return;this.invalid=!/^#[0-9a-f]{6}$/i.test(value);if(this.invalid)return;this.value=value.toLowerCase();this.dispatchEvent(new CustomEvent('value-change',{detail:this.value,bubbles:true,composed:true}));}
 private channel(index:number,value:number){const channels=this.channels();channels[index]=Math.round(Math.max(0,Math.min(255,value)));this.change('#'+channels.map(value=>value.toString(16).padStart(2,'0')).join(''));}
 private channels(){return /^#[0-9a-f]{6}$/i.test(this.value)?[1,3,5].map(offset=>parseInt(this.value.slice(offset,offset+2),16)):[0,0,0];}
 render(){const labels=[localizePair('Red','紅',this.settings),localizePair('Green','綠',this.settings),localizePair('Blue','藍',this.settings)];return html`<md-outlined-text-field .label=${this.label} .value=${this.value} ?disabled=${this.disabled} ?error=${this.invalid} .errorText=${localizePair('Enter a six-digit hexadecimal color, for example #6750a4.','輸入六位十六進位顏色，例如 #6750a4。',this.settings)} supporting-text="#RRGGBB" @change=${(event:Event)=>this.change((event.target as HTMLInputElement).value)}><span slot="trailing-icon" class="swatch" style=${`background:${/^#[0-9a-f]{6}$/i.test(this.value)?this.value:'transparent'}`} aria-hidden="true"></span></md-outlined-text-field><div class="channels">${this.channels().map((value,index)=>html`<div class="channel"><span aria-hidden="true">${labels[index]}</span><md-slider aria-label=${`${this.label}: ${labels[index]}`} min="0" max="255" step="1" .value=${value} ?disabled=${this.disabled} @change=${(event:Event)=>this.channel(index,Number((event.target as HTMLInputElement).value))}></md-slider><span aria-hidden="true">${value}</span></div>`)}</div>`;}
}
customElements.define('mg-color-field',MaterialColorField);
