import {LitElement,html,nothing} from './material';
import './components';
export class Updates extends LitElement {
 static properties={state:{state:true},error:{state:true},dismissed:{state:true}};
 state:Awaited<ReturnType<Window['material']['updates']>>|null=null;error='';dismissed=false;private unsubscribe?:()=>void;
 connectedCallback(){super.connectedCallback();void window.material.updates('status').then(s=>this.state=s);this.unsubscribe=window.material.onUpdate(s=>{this.state=s;this.dismissed=false;});}
 disconnectedCallback(){super.disconnectedCallback();this.unsubscribe?.();}
 private async check(){try{this.state=await window.material.updates('check');}catch(error){this.error=error instanceof Error?error.message:'Update check failed';}}
 render(){if(!this.state)return nothing;return html`<mg-surface><mg-text kind="title">Application updates</mg-text><mg-text>${this.state.currentVersion} · ${this.state.phase}</mg-text><mg-text kind="muted">${this.state.message||'Updates use the project’s unsigned Squirrel.Windows release feed.'}</mg-text>${this.error?html`<mg-text role="alert">${this.error}</mg-text>`:nothing}<mg-layout><md-outlined-button ?disabled=${['checking','downloading','unsupported'].includes(this.state.phase)} @click=${()=>this.check()}>Check for updates</md-outlined-button><md-text-button @click=${()=>window.material.openExternal(this.state!.releaseNotesUrl)}>Release notes</md-text-button>${this.state.phase==='ready'?html`<md-filled-button @click=${()=>this.dispatchEvent(new CustomEvent('restart-request',{bubbles:true,composed:true}))}>Restart to install ${this.state.version}</md-filled-button>`:nothing}</mg-layout></mg-surface>`;}
}
customElements.define('mg-updates',Updates);
