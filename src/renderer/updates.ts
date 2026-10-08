import {LitElement,html,css,nothing} from './material';
import './components';
export class Updates extends LitElement {
 static styles=css`
 :host{display:block;min-width:0;color:var(--md-sys-color-on-surface);font-family:var(--md-ref-typeface-plain,system-ui,sans-serif);font-size:var(--mg-body-size,.8125rem);line-height:1.5}
 *,*::before,*::after{box-sizing:border-box}mg-layout,mg-surface,mg-text,mg-search{min-width:0;max-width:100%}mg-text,p,h2,h3,label,small{overflow-wrap:anywhere}
 md-outlined-text-field,md-outlined-select,md-filled-select{min-width:0;max-width:100%;--md-outlined-text-field-container-shape:8px;--md-outlined-select-text-field-container-shape:8px;--md-filled-select-text-field-container-shape:8px;--md-outlined-text-field-input-text-size:var(--mg-body-size,.8125rem);--md-outlined-select-text-field-input-text-size:var(--mg-body-size,.8125rem)}
 md-filled-button,md-outlined-button,md-text-button{max-width:100%;--md-filled-button-container-shape:8px;--md-outlined-button-container-shape:8px;--md-text-button-container-shape:8px;--md-filled-button-label-text-size:var(--mg-body-size,.8125rem);--md-outlined-button-label-text-size:var(--mg-body-size,.8125rem);--md-text-button-label-text-size:var(--mg-body-size,.8125rem)}
 md-dialog{max-width:calc(100vw - 32px);--md-dialog-container-shape:12px;--md-dialog-container-color:var(--md-sys-color-surface-container-high)}
 ::-webkit-scrollbar{width:10px;height:10px}::-webkit-scrollbar-track{background:var(--md-sys-color-surface-container-low)}::-webkit-scrollbar-thumb{background:var(--md-sys-color-outline-variant);border:2px solid var(--md-sys-color-surface-container-low);border-radius:8px}::-webkit-scrollbar-thumb:hover{background:var(--md-sys-color-outline)}
mg-layout{display:flex;flex-wrap:wrap;gap:12px}mg-surface{display:block}`;
 static properties={state:{state:true},error:{state:true},dismissed:{state:true}};
 state:Awaited<ReturnType<Window['material']['updates']>>|null=null;error='';dismissed=false;private unsubscribe?:()=>void;
 connectedCallback(){super.connectedCallback();void window.material.updates('status').then(s=>this.state=s);this.unsubscribe=window.material.onUpdate(s=>{this.state=s;this.dismissed=false;});}
 disconnectedCallback(){super.disconnectedCallback();this.unsubscribe?.();}
 private async check(){try{this.state=await window.material.updates('check');}catch(error){this.error=error instanceof Error?error.message:'Update check failed';}}
 render(){if(!this.state)return nothing;return html`<mg-surface><mg-text kind="title">Application updates</mg-text><mg-text>${this.state.currentVersion} · ${this.state.phase}</mg-text><mg-text kind="muted">${this.state.message||'Updates use the project’s unsigned Squirrel.Windows release feed.'}</mg-text>${this.error?html`<mg-text role="alert">${this.error}</mg-text>`:nothing}<mg-layout><md-outlined-button ?disabled=${['checking','downloading','unsupported'].includes(this.state.phase)} @click=${()=>this.check()}>Check for updates</md-outlined-button><md-text-button @click=${()=>window.material.openExternal(this.state!.releaseNotesUrl)}>Release notes</md-text-button>${this.state.phase==='ready'?html`<md-filled-button @click=${()=>this.dispatchEvent(new CustomEvent('restart-request',{bubbles:true,composed:true}))}>Restart to install ${this.state.version}</md-filled-button>`:nothing}</mg-layout></mg-surface>`;}
}
customElements.define('mg-updates',Updates);
