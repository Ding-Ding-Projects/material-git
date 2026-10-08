import { LitElement, html, css, nothing } from 'lit';
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/select/outlined-select.js';
import '@material/web/select/select-option.js';
import '@material/web/checkbox/checkbox.js';
import '@material/web/dialog/dialog.js';
import '@material/web/progress/circular-progress.js';
import type { AuthAccount, AuthAction, AuthPayload, AuthState } from '../shared/types';
/** Account and device codes remain component state and never enter command history. */
export class MaterialAccounts extends LitElement {
 static properties={state:{state:true},host:{state:true},scopes:{state:true},busy:{state:true},error:{state:true},review:{state:true},reviewAccount:{state:true},keyAccount:{state:true},keyEffect:{state:true}};
 state:AuthState={status:'idle',accounts:[],allowedHosts:['github.com'],allowedScopes:[]};
 host='github.com';scopes:string[]=[];busy=false;error='';review:'switch'|'logout'|null=null;reviewAccount?:AuthAccount;keyAccount=false;keyEffect=false;
 private unsubscribe?:()=>void;
 static styles=css`
 :host{display:block;color:var(--md-sys-color-on-surface,#e3e3e3);font:var(--md-sys-typescale-body-medium-font,400 1rem/1.5 sans-serif)}
 section{display:grid;gap:20px;padding:24px;max-width:960px}h2,h3,p{margin:0}header,.actions{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.accounts,.scope-grid{display:grid;gap:12px}.scope-grid{grid-template-columns:repeat(auto-fit,minmax(210px,1fr))}article,.device{border:1px solid var(--md-sys-color-outline,#79747e);border-radius:16px;padding:20px;display:grid;gap:12px}label{display:flex;align-items:center;gap:8px}.code{font:600 2rem/1.4 monospace;letter-spacing:.15em;user-select:all}.error{color:var(--md-sys-color-error,#ffb4ab)}small{overflow-wrap:anywhere}md-outlined-select{min-width:240px}md-dialog{max-width:560px}.review{display:grid;gap:16px}md-circular-progress{width:24px;height:24px}
 `;
 connectedCallback(){super.connectedCallback();this.unsubscribe=window.material.onAuth(state=>{this.state=state;this.dispatchEvent(new CustomEvent('authentication-change',{detail:state.accounts,bubbles:true,composed:true}));if(!state.allowedHosts.includes(this.host))this.host=state.allowedHosts[0]||'github.com';});void this.perform('status');}
 disconnectedCallback(){super.disconnectedCallback();this.unsubscribe?.();this.state={...this.state,deviceCode:undefined,verificationUrl:undefined};}
 private async perform(action:AuthAction,payload?:AuthPayload){if(this.busy&&action!=='cancel')return;this.busy=true;this.error='';try{this.state=await window.material.auth(action,payload);this.dispatchEvent(new CustomEvent('authentication-change',{detail:this.state.accounts,bubbles:true,composed:true}));}catch(error){this.error=error instanceof Error?error.message:'Authentication request failed.';}finally{this.busy=false;}}
 private toggleScope(scope:string,checked:boolean){this.scopes=checked?[...this.scopes,scope]:this.scopes.filter(item=>item!==scope);}
 private openReview(action:'switch'|'logout',account:AuthAccount){this.review=action;this.reviewAccount=account;this.keyAccount=false;this.keyEffect=false;}
 private async confirm(){if(!this.review||!this.reviewAccount||!this.keyAccount||!this.keyEffect)return;const action=this.review;const account=this.reviewAccount;this.review=null;await this.perform(action,{hostname:account.host,login:account.login,confirmed:true});}
 private async openSignIn(){const url=this.state.verificationUrl;if(!url)return;try{await window.material.openExternal(url);}catch(error){this.error=error instanceof Error?error.message:'Unable to open GitHub sign-in.';}}
 render(){const signingIn=['starting','waiting'].includes(this.state.status);return html`
 <section aria-label="GitHub accounts">
  <header><h2>GitHub accounts</h2><md-outlined-button ?disabled=${this.busy} @click=${()=>this.perform('status')}>Refresh accounts</md-outlined-button>${this.busy?html`<md-circular-progress indeterminate aria-label="Checking GitHub accounts"></md-circular-progress>`:nothing}</header>
  <p>Sign in using GitHub’s browser device flow. The bundled CLI manages credentials; this application does not display stored tokens.</p>
  ${this.error||this.state.error?html`<p class="error" role="alert">${this.error||this.state.error}</p>`:nothing}
  ${this.state.message?html`<p role="status">${this.state.message}</p>`:nothing}
  <div class="accounts">${this.state.accounts.length?this.state.accounts.map(account=>html`<article aria-label=${`${account.login||'Environment account'} on ${account.host}`}>
   <h3>${account.login||'Environment account'} ${account.active?'· Active':''}</h3>
   <p>${account.host} · ${account.state==='success'?'Authenticated':account.state} · ${account.gitProtocol.toUpperCase()}</p>
   <small>Credential source: ${account.tokenSource}. Scopes: ${account.scopes.join(', ')||'Not reported by GitHub'}.</small>
   ${account.tokenSource==='config-file'?html`<p>GitHub CLI reports credentials stored in its configuration file. Configure a system credential store to use secure storage.</p>`:nothing}
   ${account.tokenSource==='environment'?html`<p>This account is supplied by an environment token. Change the environment to switch or remove it.</p>`:html`<div class="actions"><md-outlined-button ?disabled=${this.busy||signingIn||account.active} @click=${()=>this.openReview('switch',account)}>Use this account</md-outlined-button><md-outlined-button ?disabled=${this.busy||signingIn} @click=${()=>this.openReview('logout',account)}>Remove from this device</md-outlined-button></div>`}
  </article>`):html`<p>No authenticated accounts found. Sign in below to connect GitHub.</p>`}</div>
  ${signingIn?html`<div class="device" aria-label="Temporary GitHub sign-in code"><h3>Complete sign-in on GitHub</h3>${this.state.deviceCode?html`<p>Enter this one-time code on the GitHub page:</p><p class="code" aria-live="polite">${this.state.deviceCode}</p>`:html`<p role="status">Waiting for GitHub to issue a sign-in code…</p>`}<p>This code is temporary. It disappears when sign-in completes or is cancelled.</p><div class="actions"><md-filled-button ?disabled=${!this.state.verificationUrl} @click=${()=>this.openSignIn()}>Open GitHub sign-in</md-filled-button><md-outlined-button @click=${()=>this.perform('cancel')}>Cancel sign-in</md-outlined-button></div></div>`:html`
   <h3>Add a GitHub account</h3>
   <md-outlined-select label="Approved GitHub host" .value=${this.host} @change=${(event:Event)=>{this.host=(event.target as HTMLSelectElement).value;}}>${this.state.allowedHosts.map(host=>html`<md-select-option value=${host}><div slot="headline">${host}</div></md-select-option>`)}</md-outlined-select>
   <p>GitHub CLI requests its standard repo, read:org, and gist scopes. Select additional scopes only for the features you plan to use.</p>
   <div class="scope-grid" aria-label="Additional GitHub authorization scopes">${this.state.allowedScopes.map(scope=>html`<label><md-checkbox ?checked=${this.scopes.includes(scope)} @change=${(event:Event)=>this.toggleScope(scope,(event.target as HTMLInputElement).checked)}></md-checkbox><span>${scope}</span></label>`)}</div>
   <div class="actions"><md-filled-button ?disabled=${this.busy} @click=${()=>this.perform('login',{hostname:this.host,scopes:this.scopes})}>Sign in with GitHub</md-filled-button></div>
  `}
  <md-dialog ?open=${!!this.review} @closed=${()=>{this.review=null;}}><div slot="headline">${this.review==='logout'?'Remove account from this device':'Change active account'}</div><div slot="content" class="review"><p>${this.reviewAccount?.login} on ${this.reviewAccount?.host}</p><p>${this.review==='logout'?'This removes locally stored credentials. Existing tokens remain valid until you revoke them on GitHub.':'Future commands for this host will use the selected account.'}</p><label><md-checkbox ?checked=${this.keyAccount} @change=${(event:Event)=>{this.keyAccount=(event.target as HTMLInputElement).checked;}}></md-checkbox>I checked the account and host.</label><label><md-checkbox ?checked=${this.keyEffect} @change=${(event:Event)=>{this.keyEffect=(event.target as HTMLInputElement).checked;}}></md-checkbox>I understand the effect of this change.</label></div><div slot="actions"><md-outlined-button @click=${()=>{this.review=null;}}>Cancel</md-outlined-button><md-filled-button ?disabled=${!this.keyAccount||!this.keyEffect||this.busy} @click=${()=>this.confirm()}>Confirm account change</md-filled-button></div></md-dialog>
 </section>`;}
}
customElements.define('mg-accounts',MaterialAccounts);
