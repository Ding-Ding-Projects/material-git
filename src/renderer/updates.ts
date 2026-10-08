import {LitElement,html,css,nothing} from './material';
import './components';
import {defaults} from '../shared/preferences';import type {AppSettings} from '../shared/types';import {localizePair,publishMessage} from './localization';
export class Updates extends LitElement {
 static styles=css`
 :host{display:block;min-width:0;color:var(--md-sys-color-on-surface);font-family:var(--md-ref-typeface-plain,system-ui,sans-serif);font-size:var(--mg-body-size,.8125rem);line-height:1.5}
 *,*::before,*::after{box-sizing:border-box}mg-layout,mg-surface,mg-text,mg-search{min-width:0;max-width:100%}mg-text,p,h2,h3,label,small{overflow-wrap:anywhere}
 md-outlined-text-field,md-outlined-select,md-filled-select{min-width:0;max-width:100%;--md-outlined-text-field-container-shape:8px;--md-outlined-select-text-field-container-shape:8px;--md-filled-select-text-field-container-shape:8px;--md-outlined-text-field-input-text-size:var(--mg-body-size,.8125rem);--md-outlined-select-text-field-input-text-size:var(--mg-body-size,.8125rem)}
 md-filled-button,md-outlined-button,md-text-button{max-width:100%;--md-filled-button-container-shape:8px;--md-outlined-button-container-shape:8px;--md-text-button-container-shape:8px;--md-filled-button-label-text-size:var(--mg-body-size,.8125rem);--md-outlined-button-label-text-size:var(--mg-body-size,.8125rem);--md-text-button-label-text-size:var(--mg-body-size,.8125rem)}
 md-dialog{max-width:calc(100vw - 32px);--md-dialog-container-shape:12px;--md-dialog-container-color:var(--md-sys-color-surface-container-high)}
 ::-webkit-scrollbar{width:10px;height:10px}::-webkit-scrollbar-track{background:var(--md-sys-color-surface-container-low)}::-webkit-scrollbar-thumb{background:var(--md-sys-color-outline-variant);border:2px solid var(--md-sys-color-surface-container-low);border-radius:8px}::-webkit-scrollbar-thumb:hover{background:var(--md-sys-color-outline)}
mg-layout{display:flex;flex-wrap:wrap;gap:12px}mg-surface{display:block}`;
 static properties={settings:{attribute:false},state:{state:true},error:{state:true},dismissed:{state:true}};
 settings:AppSettings={...defaults};
 state:Awaited<ReturnType<Window['material']['updates']>>|null=null;error='';dismissed=false;private unsubscribe?:()=>void;
 private copy(en:string,yue:string){return localizePair(en,yue,this.settings);}
 connectedCallback(){super.connectedCallback();void window.material.updates('status').then(state=>this.state=state).catch(()=>this.failed());this.unsubscribe=window.material.onUpdate(state=>{const previous=this.state?.phase;this.state=state;this.dismissed=false;if(previous!==state.phase)publishMessage(this,state.phase==='failed'?'error':state.phase==='downloading'?'progress':'status',this.facts());});}
 disconnectedCallback(){super.disconnectedCallback();this.unsubscribe?.();}
 private failed(){this.error=this.copy('The update request could not be completed. Try again or open the release notes.','未能完成更新要求，請再試或者開啟版本說明。');publishMessage(this,'error',{en:'The update request could not be completed.',yue:'未能完成更新要求。'});}
 private async check(){this.error='';try{this.state=await window.material.updates('check');}catch{this.failed();}}
 private facts(){const state=this.state,known:Record<string,{en:string;yue:string}>={
 'Automatic updates are available for the installed Windows application. Development builds on this platform can be rebuilt locally.':{en:'Automatic updates require the installed Windows application. On this platform, rebuild the source locally or use an available release for this platform.',yue:'自動更新需要已安裝嘅 Windows 程式。呢個平台可以重新建置原始碼，或者使用適用嘅發行版本。'},
 'Automatic updates are available after installation through Setup.exe.':{en:'Install through Setup.exe to enable automatic updates.',yue:'經 Setup.exe 安裝後先可以使用自動更新。'},
 'The installed version is current.':{en:'The installed version is current.',yue:'已安裝版本係最新版本。'},
 'The downloaded update did not report a valid version; restart installation is unavailable.':{en:'The downloaded update did not report a valid version. Restart installation is unavailable.',yue:'已下載更新未有有效版本資料，暫時無法重新啟動安裝。'}};
 if(state?.message&&known[state.message])return known[state.message];
 const phases={unsupported:{en:'Automatic updates are unavailable in this runtime.',yue:'目前執行環境無法使用自動更新。'},idle:{en:'Check the release feed for a newer version.',yue:'檢查發行來源有冇較新版本。'},checking:{en:'Checking the release feed.',yue:'正在檢查發行來源。'},downloading:{en:'Downloading an unsigned update in the background.',yue:'正在背景下載未簽署更新。'},ready:{en:'An unsigned update is ready. Save your work before restarting to install.',yue:'未簽署更新已準備好。重新啟動安裝前請先儲存工作。'},failed:{en:'The update failed. Try again or inspect the release notes; no completed installation is claimed.',yue:'更新失敗。請再試或者查看版本說明；目前未確認完成安裝。'}};
 return phases[(state?.phase??'idle') as keyof typeof phases]??phases.failed;
 }
 private async notes(){try{await window.material.openExternal(this.state!.releaseNotesUrl);}catch{this.failed();}}
 render(){if(!this.state)return nothing;const facts=this.facts(),phases={unsupported:['Unavailable','無法使用'],idle:['Ready to check','可以檢查'],checking:['Checking','檢查中'],downloading:['Downloading','下載中'],ready:['Ready to install','可以安裝'],failed:['Failed','失敗']} as const,phase=phases[this.state.phase as keyof typeof phases]??phases.failed;return html`<mg-surface><mg-text kind="title">${this.copy('Application updates','程式更新')}</mg-text><mg-text>${this.state.currentVersion} · ${this.copy(phase[0],phase[1])}</mg-text><mg-text kind="muted">${this.copy(facts.en,facts.yue)}</mg-text><mg-text kind="muted">${this.copy('Windows updates use the project’s unsigned Squirrel.Windows release feed. Release availability and platform support are shown separately.','Windows 更新使用專案未簽署嘅 Squirrel.Windows 發行來源。發行可用性同平台支援會分開顯示。')}</mg-text>${['checking','downloading'].includes(this.state.phase)?html`<md-linear-progress indeterminate aria-label=${this.copy(phase[0],phase[1])}></md-linear-progress>`:nothing}${this.error?html`<mg-text role="alert">${this.error}</mg-text>`:nothing}<mg-layout><md-outlined-button ?disabled=${['checking','downloading','unsupported','ready'].includes(this.state.phase)} @click=${()=>this.check()}>${this.copy('Check for updates','檢查更新')}</md-outlined-button><md-text-button @click=${()=>this.notes()}>${this.copy('Release notes','版本說明')}</md-text-button>${this.state.phase==='ready'?html`<md-filled-button @click=${()=>this.dispatchEvent(new CustomEvent('restart-request',{bubbles:true,composed:true}))}>${this.copy('Restart to install','重新啟動安裝')} ${this.state.version}</md-filled-button>`:nothing}</mg-layout></mg-surface>`;}

}
customElements.define('mg-updates',Updates);
