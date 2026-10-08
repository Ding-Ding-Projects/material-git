import {LitElement,html,css,nothing} from './material';
import './components';import './scroll-surface';
import {defaults} from '../shared/preferences';
import type {AppSettings} from '../shared/types';
import type {WorkspaceNotification,NotificationCategory} from '../shared/workspace';
import {localizePair} from './localization';

export interface VisibleNotice extends WorkspaceNotification {saved?:boolean;saveError?:boolean;visible?:boolean}
export {safeNoticeFacts,noticeKind} from '../shared/notifications';
export class NotificationStack extends LitElement {
 static properties={items:{attribute:false},settings:{attribute:false}};
 items:VisibleNotice[]=[];settings:AppSettings={...defaults};
 static styles=css`:host{position:fixed;right:16px;bottom:38px;z-index:95;width:min(480px,calc(100vw - 32px));height:min(55vh,var(--stack-height,55vh));max-height:55vh;display:block;pointer-events:none}:host([hidden]){display:none}mg-scroll{height:100%;max-height:100%;display:block;pointer-events:auto}.stack{display:grid;gap:8px;padding:4px}.notice{border:1px solid var(--md-sys-color-outline-variant);border-radius:16px;background:var(--md-sys-color-surface-container-high);color:var(--md-sys-color-on-surface);box-shadow:0 4px 18px #0003;padding:12px;transition:background-color 160ms ease}.heading,.actions{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}mg-text{overflow-wrap:anywhere}.error mg-icon{color:var(--md-sys-color-error)}@media(prefers-reduced-motion:reduce){*{transition:none}}:host([quiet]) *{transition:none}`;
 private stackObserver?:ResizeObserver;
 protected updated(){this.stackObserver?.disconnect();const stack=this.renderRoot.querySelector('.stack');if(stack){const measure=()=>this.style.setProperty('--stack-height',`${Math.ceil(stack.getBoundingClientRect().height)}px`);measure();this.stackObserver=new ResizeObserver(measure);this.stackObserver.observe(stack);}}
 disconnectedCallback(){super.disconnectedCallback();this.stackObserver?.disconnect();}
 private copy(en:string,yue:string){return localizePair(en,yue,this.settings);}
 protected willUpdate(){this.hidden=!this.items.some(item=>!item.dismissed&&item.visible!==false);this.toggleAttribute('quiet',this.settings.lowStimulation||!this.settings.motion);}
 private action(name:string,detail:string){this.dispatchEvent(new CustomEvent(name,{detail,bubbles:true,composed:true}));}
 render(){const active=this.items.filter(item=>!item.dismissed&&item.visible!==false),shown=active.slice(-3).reverse();if(!shown.length)return nothing;return html`<mg-scroll label=${this.copy('Recent notifications','最近通知')}><div class="stack">${shown.map(item=>html`<div class=${`notice ${item.kind}`} role=${item.kind==='error'?'alert':'status'}><div class="heading"><mg-icon name=${item.kind==='error'?'warning':item.kind==='warning'?'shield':'bell'}></mg-icon><mg-text kind="muted">${this.copy(item.kind==='error'?'Error':item.kind==='warning'?'Warning':'Information',item.kind==='error'?'錯誤':item.kind==='warning'?'警告':'資訊')} · ${new Date(item.at).toLocaleTimeString()}</mg-text></div><mg-text>${item.facts?this.copy(item.facts.en,item.facts.yue):item.title}</mg-text>${item.saveError?html`<mg-text kind="muted">${this.copy('History could not be saved. This message remains in this window.','未能儲存歷史，訊息會保留喺目前視窗。')}</mg-text>`:nothing}<div class="actions">${item.route?html`<md-text-button @click=${()=>this.action('notice-open',item.id)}>${this.copy('Open related task','開啟相關工作')}</md-text-button>`:nothing}<md-text-button @click=${()=>this.action('notice-dismiss',item.id)}>${this.copy('Dismiss notification','關閉通知')}</md-text-button></div></div>`)}<md-filled-tonal-button @click=${()=>this.action('workspace-navigate','notifications')}>${this.copy('Open notification history','開啟通知歷史')} (${active.length})</md-filled-tonal-button></div></mg-scroll>`;}
}
customElements.define('mg-notification-stack',NotificationStack);
