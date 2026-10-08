import {LitElement,html,css,nothing} from './material';
import './components';
import type {GitRow} from '../shared/git';
/** Registered Material view for native file attribution and recovery records. */
export class GitAttribution extends LitElement {
 static properties={rows:{attribute:false},kind:{},page:{type:Number},hasNext:{type:Boolean},busy:{type:Boolean},language:{}};
 rows:GitRow[]=[];kind='blame';page=0;hasNext=false;busy=false;language='en';
 static styles=css`:host{display:block;color:var(--md-sys-color-on-surface,#18201b)}.records{display:grid;gap:8px;max-height:460px;overflow:auto;scrollbar-width:thin;scrollbar-color:var(--md-sys-color-primary,#006b55) transparent}.record{display:grid;grid-template-columns:minmax(180px,.35fr) minmax(0,1fr);gap:12px;padding:10px}.code{white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.7 ui-monospace,monospace}.pager{display:flex;gap:8px;align-items:center;margin-top:12px}@media(max-width:760px){.record{grid-template-columns:1fr}}`;
 private label(value:string){const yue:Record<string,string>={'File attribution':'檔案逐行追蹤','Recovery entries':'復原記錄','Inspect commit':'檢視提交','Previous':'上一頁','Next':'下一頁'};return this.language==='yue'?(yue[value]||value):this.language==='both'&&yue[value]?value+' · '+yue[value]:value;}
 private commit(row:GitRow){this.dispatchEvent(new CustomEvent('commit-select',{detail:{revision:row.data?.hash},bubbles:true,composed:true}));}
 private navigate(page:number){this.dispatchEvent(new CustomEvent('inspection-page',{detail:{page},bubbles:true,composed:true}));}
 render(){return html`<mg-text kind="title">${this.label(this.kind==='blame'?'File attribution':'Recovery entries')}</mg-text><div class="records" aria-label=${this.kind==='blame'?'Native Git line attribution':'Native Git recovery records'}>${this.rows.map(row=>html`<mg-surface><div class="record"><div><mg-text kind="muted">${row.detail}</mg-text><md-text-button ?disabled=${this.busy} @click=${()=>this.commit(row)}>${this.label('Inspect commit')}</md-text-button></div><mg-text class="code">${row.label}</mg-text></div></mg-surface>`)}</div>${this.rows.length?html`<div class="pager"><md-outlined-button ?disabled=${this.busy||this.page===0} @click=${()=>this.navigate(this.page-1)}>${this.label('Previous')}</md-outlined-button><mg-text kind="muted">Page ${this.page+1}</mg-text><md-outlined-button ?disabled=${this.busy||!this.hasNext} @click=${()=>this.navigate(this.page+1)}>${this.label('Next')}</md-outlined-button></div>`:nothing}`;}
}
customElements.define('mg-git-attribution',GitAttribution);
