import {LitElement, html, css} from './material';

/** Local Material-token compositions. These are not upstream Material Web components. */
export class WorkbenchIcon extends LitElement {
  static properties={name:{type:String}};
  name='command';
  static styles=css`:host{display:inline-flex;width:20px;height:20px;flex:none;color:inherit}svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}`;
  render(){const paths:Record<string,string>={command:'m8 7-5 5 5 5m5 0h8',repo:'M5 3h14v18H5zM8 3v18m3-13h5m-5 4h5',home:'M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 0h6v6h-6z',activity:'M3 12h4l3-8 4 16 3-8h4',account:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-2a8 8 0 0 1 16 0v2',history:'M4 5v5h5M4.5 10a8 8 0 1 1 .5 7M12 7v5l3 2',tools:'m14 5 5 5M9 14l-6 6 1 1 6-6M14 3l7 7-5 5-7-7z',settings:'M4 7h16M4 17h16M8 4v6m8 4v6',shield:'M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6zM8 12l3 3 5-6',update:'M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4',chevron:'m9 5 7 7-7 7',down:'m5 9 7 7 7-7',close:'m6 6 12 12M18 6 6 18',folder:'M3 6h7l2 2h9v12H3z',search:'M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0m-2 5 6 6',panel:'M3 4h18v16H3zM9 4v16',bottom:'M3 4h18v16H3zm0 11h18',play:'m8 4 12 8-12 8z',check:'m4 12 5 5L20 6',minus:'M5 12h14',square:'M5 5h14v14H5z',branch:'M6 5v14m12-14v4c0 5-12 2-12 8M8 4a2 2 0 1 1-4 0 2 2 0 0 1 4 0m0 16a2 2 0 1 1-4 0 2 2 0 0 1 4 0M20 4a2 2 0 1 1-4 0 2 2 0 0 1 4 0'};return html`<svg viewBox="0 0 24 24" aria-hidden="true"><path d=${paths[this.name]||paths.command}></path></svg>`;}
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
