import {LitElement,html,css} from 'lit';
import '@material/web/elevation/elevation.js';
/** Material 3 document compositions: official elevation and system typography tokens.
 * Browser document semantics remain in supported Lit internals; interactive controls
 * are registered official @material/web components, never painted HTML substitutes.
 */
class SiteSurface extends LitElement{
 static styles=css`:host{display:block;position:relative;min-width:0}section{display:contents}md-elevation{--md-elevation-level:0;pointer-events:none}`;
 render(){return html`<section><md-elevation></md-elevation><slot></slot></section>`}
}
class SiteLayout extends LitElement{
 static styles=css`:host{display:block;min-width:0}div{display:contents}`;
 render(){return html`<div><slot></slot></div>`}
}
customElements.define('mg-site-surface',SiteSurface);
customElements.define('mg-site-layout',SiteLayout);
