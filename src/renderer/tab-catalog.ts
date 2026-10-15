import {LitElement,html,css,nothing} from './material';
import './components';
import type {Search} from './components';
import type {AppSettings} from '../shared/types';
import {localizePair} from './localization';

/** Explicit tab creation, separate from ordinary menu navigation and workspace search. */
export class TabCatalog extends LitElement {
 static properties={destinations:{attribute:false},settings:{attribute:false},matchedIds:{state:true}};
 destinations:string[][]=[];settings?:AppSettings;matchedIds:string[]|null=null;private generation=0;
 static styles=css`:host{display:contents}md-dialog{width:min(680px,calc(100vw - 24px));max-height:calc(100dvh - 24px)}.content{display:grid;gap:12px;min-width:0}.items{max-height:55vh;overflow:auto}.hint{color:var(--md-sys-color-on-surface-variant)}md-list-item{min-height:56px}mg-search{min-width:0}`;
 private copy(en:string,yue:string){return localizePair(en,yue,this.settings);}
 private entries(){return [['open-local','repo',this.copy('Open local repository','開啟本機儲存庫')],['open-github','repo',this.copy('Open GitHub repository','開啟 GitHub 儲存庫')],...this.destinations];}
 private choose(id:string){this.dispatchEvent(new CustomEvent('catalog-select',{detail:id,bubbles:true,composed:true}));}
 private close(){this.dispatchEvent(new CustomEvent('catalog-close',{bubbles:true,composed:true}));}
 private async filter(event:Event){const generation=++this.generation,search=event.target as Search,entries=this.entries(),matched=await search.matchValues(entries.map(entry=>entry[2]));if(generation===this.generation)this.matchedIds=search.error?[]:entries.filter((_,index)=>matched[index]).map(entry=>entry[0]);}
 render(){const entries=this.entries().filter(entry=>this.matchedIds===null||this.matchedIds.includes(entry[0]));return html`<md-dialog open aria-label=${this.copy('New tab catalog','新增分頁目錄')} @closed=${this.close}><span slot="headline">${this.copy('New tab','新增分頁')}</span><div slot="content" class="content"><span class="hint">${this.copy('Open a repository or keep a utility page in the tab strip. Existing tabs are focused.','開啟儲存庫，或將工具頁保留喺分頁列。已開啟分頁會直接顯示。')}</span><mg-search search-id="new-tab-catalog" label=${this.copy('Search tab catalog','搜尋分頁目錄')} @search-change=${this.filter}></mg-search><md-list class="items">${entries.map(([id,icon,label])=>html`<md-list-item type="button" data-catalog-id=${id} @click=${()=>this.choose(id)}><mg-icon slot="start" name=${icon}></mg-icon><span slot="headline">${label}</span></md-list-item>`)}</md-list>${entries.length?nothing:html`<span role="status">${this.copy('No matching destinations. Check the search or regular expression.','冇符合嘅目的地。請檢查搜尋或正則表達式。')}</span>`}</div><md-text-button slot="actions" @click=${this.close}>${this.copy('Cancel','取消')}</md-text-button></md-dialog>`;}
}
customElements.define('mg-tab-catalog',TabCatalog);
