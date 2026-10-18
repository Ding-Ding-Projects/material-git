import {LitElement, html, css} from './material';
import {svg} from 'lit';
import {materialSymbols} from './material-symbols';

/** Official locally vendored Material Symbols; names preserve the workspace icon API. */
export class WorkbenchIcon extends LitElement {
 static properties={name:{type:String}};
 name='command';
 static styles=css`:host{display:inline-flex;width:24px;height:24px;flex:none;color:inherit}svg{width:100%;height:100%;fill:currentColor}`;
 render(){return html`<svg viewBox="0 -960 960 960" aria-hidden="true" focusable="false">${(materialSymbols[this.name]??materialSymbols.command).map(path=>svg`<path d=${path}></path>`)}</svg>`;}
}
customElements.define('mg-icon',WorkbenchIcon);

export class WorkbenchSplitter extends LitElement {
 static properties={axis:{type:String},value:{type:Number},min:{type:Number},max:{type:Number},label:{type:String}};
 axis='vertical';value=250;min=180;max=440;label='Resize panel';private previous=0;
 static styles=css`:host{display:block;touch-action:none;z-index:3;cursor:col-resize;background:var(--md-sys-color-surface);transition:background .12s}:host([axis=horizontal]){cursor:row-resize}div{height:100%;min-height:4px;outline:0}:host(:hover),:host(:focus-within){background:var(--md-sys-color-primary)}@media(prefers-reduced-motion:reduce){:host{transition:none}}`;
 private change(delta:number){this.dispatchEvent(new CustomEvent('resize-panel',{detail:delta,bubbles:true,composed:true}));}
 private start(e:PointerEvent){this.previous=this.axis==='horizontal'?e.clientY:e.clientX;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);}
 private move(e:PointerEvent){if(!(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId))return;const position=this.axis==='horizontal'?e.clientY:e.clientX;this.change(position-this.previous);this.previous=position;}
 private key(e:KeyboardEvent){let delta=0;if(['ArrowLeft','ArrowUp'].includes(e.key))delta=-16;if(['ArrowRight','ArrowDown'].includes(e.key))delta=16;if(e.key==='Home')delta=this.min-this.value;if(e.key==='End')delta=this.max-this.value;if(delta){e.preventDefault();this.change(delta);}}
 render(){return html`<div role="separator" tabindex="0" aria-label=${this.label} aria-orientation=${this.axis} aria-valuemin=${this.min} aria-valuemax=${this.max} aria-valuenow=${this.value} @pointerdown=${this.start} @pointermove=${this.move} @keydown=${this.key}></div>`;}
}
customElements.define('mg-splitter',WorkbenchSplitter);

/** The image is a bounded local PNG validated by the native settings boundary. */
export class ProductLogo extends LitElement {
 static properties={preset:{type:String},image:{type:String}};preset='git';image='';
 static styles=css`:host{display:inline-flex;width:20px;height:20px;flex:none}img{width:100%;height:100%;object-fit:contain}mg-icon{width:100%;height:100%}`;
 render(){return this.preset==='custom'&&/^data:image\/png;base64,[a-zA-Z0-9+/=]+$/.test(this.image)?html`<img alt="" src=${this.image}>`:html`<mg-icon name=${this.preset==='merge'?'pull':this.preset==='branches'?'branch':'repo'}></mg-icon>`;}
}
customElements.define('mg-product-logo',ProductLogo);
