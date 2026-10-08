import { LitElement, html, css } from './material';

export type ScrollAxis = 'vertical' | 'horizontal';
export interface ScrollMetrics { max: number; position: number; thumb: number; offset: number; travel: number }
/** Pure geometry shared by rendering, pointer interaction, and verification. */
export function scrollMetrics(client: number, total: number, position: number, track: number): ScrollMetrics {
    const max = Math.max(0, total - client);
    const thumb = max > 0 ? Math.min(track, Math.max(28, track * client / Math.max(1, total))) : track;
    const travel = Math.max(0, track - thumb);
    const clamped = Math.max(0, Math.min(max, position));
    return { max, position: clamped, thumb, travel, offset: max ? clamped / max * travel : 0 };
}

/** A Lit composition with a native scrolling viewport and accessible custom controls. */
export class ScrollSurface extends LitElement {
    static properties = { label: { type: String }, metricsY: { state: true }, metricsX: { state: true } };
    label = 'Content';
    private metricsY = scrollMetrics(0, 0, 0, 0);
    private metricsX = scrollMetrics(0, 0, 0, 0);
    private resizeObserver?: ResizeObserver;
    private mutationObserver?: MutationObserver;
    private frame = 0;
    private drag?: { axis: ScrollAxis; pointer: number; start: number; position: number; target: HTMLElement };
    /** The real viewport, available after updateComplete. Native scroll APIs remain usable. */
    get viewport(): HTMLDivElement | null { return this.renderRoot.querySelector<HTMLDivElement>('#viewport'); }
    static styles = css`
        :host{display:block;position:relative;min-width:0;min-height:0;height:100%;max-height:100%;box-sizing:border-box;--mg-scroll-size:14px}
        .shell{display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-rows:minmax(0,1fr) auto;height:100%;max-height:100%;min-height:0;min-width:0;overflow:hidden}
        #viewport{grid-area:1/1;min-width:0;min-height:0;overflow:auto;scrollbar-width:none;overscroll-behavior:contain;scroll-behavior:auto;outline-offset:-3px}
        #viewport::-webkit-scrollbar{display:none}
        :host([horizontal]) .content{height:100%;min-height:0;overflow-y:hidden}:host([horizontal]) #viewport{overflow-y:hidden}.content{display:flow-root;min-width:100%;min-height:100%;box-sizing:border-box}
        .track{position:relative;touch-action:none;user-select:none;background:var(--md-sys-color-surface-container,var(--surface,#152422));border-radius:var(--md-sys-shape-corner-full,999px);outline-offset:-2px;cursor:pointer}
        .vertical{grid-area:1/2;width:var(--mg-scroll-size)}.horizontal{grid-area:2/1;height:var(--mg-scroll-size)}
        .track[hidden]{display:none}.thumb{position:absolute;border-radius:var(--md-sys-shape-corner-full,999px);background:var(--md-sys-color-outline,var(--outline,#7b938a));transition:background-color 120ms ease}
        .vertical .thumb{left:3px;right:3px;top:0}.horizontal .thumb{top:3px;bottom:3px;left:0}
        .track:hover .thumb{background:var(--md-sys-color-on-surface-variant,var(--muted,#a6bbb4))}
        .track:active .thumb,.track.dragging .thumb{background:var(--md-sys-color-primary,var(--mint,#9ee8cf))}
        .track:focus-visible,#viewport:focus-visible{outline:2px solid var(--md-sys-color-primary,var(--mint,#9ee8cf))}
        @media(prefers-reduced-motion:reduce){.thumb{transition:none}#viewport{scroll-behavior:auto}}
        @media(forced-colors:active){.track{background:Canvas}.thumb{background:ButtonText}.track:focus-visible{outline-color:Highlight}}
    `;
    connectedCallback() { super.connectedCallback(); void this.updateComplete.then(() => { if (this.isConnected) this.observe(); }); }
    disconnectedCallback() {
        super.disconnectedCallback(); this.resizeObserver?.disconnect(); this.mutationObserver?.disconnect(); cancelAnimationFrame(this.frame); this.frame = 0;
        if (this.drag?.target.hasPointerCapture(this.drag.pointer)) this.drag.target.releasePointerCapture(this.drag.pointer);
        this.drag = undefined;
    }
    private observe() {
        this.resizeObserver?.disconnect(); this.mutationObserver?.disconnect();
        this.resizeObserver = new ResizeObserver(this.scheduleMeasurement);
        this.resizeObserver.observe(this);
        const viewport = this.viewport;
        const content = this.renderRoot.querySelector('.content');
        if (viewport) this.resizeObserver.observe(viewport);
        if (content) this.resizeObserver.observe(content);
        // Observe assigned descendants too: fixed-size wrappers can conceal growing overflow.
        for (const element of this.querySelectorAll('*')) this.resizeObserver.observe(element);
        this.mutationObserver = new MutationObserver(() => { this.observeDescendants(); this.scheduleMeasurement(); });
        this.mutationObserver.observe(this, { childList: true, subtree: true, attributes: true, characterData: true });
        this.scheduleMeasurement();
    }
    private observeDescendants() {
        // Rebuild subscriptions so detached descendants are not retained indefinitely.
        this.resizeObserver?.disconnect();
        for (const element of [this, this.viewport, this.renderRoot.querySelector('.content'), ...this.querySelectorAll('*')])
            if (element) this.resizeObserver?.observe(element);
    }
    private scheduleMeasurement = () => {
        if (!this.frame && this.isConnected) this.frame = requestAnimationFrame(() => { this.frame = 0; this.measure(); });
    };
    /** Refresh synchronously after external content or layout changes. */
    measure() {
        const viewport = this.viewport;
        if (!viewport) return;
        // Measure without tracks first so shrinking content can remove both bars.
        // Resolve their mutual layout effect before publishing the final geometry.
        const y = this.renderRoot.querySelector<HTMLElement>('.vertical');
        const x = this.renderRoot.querySelector<HTMLElement>('.horizontal');
        const previousTop = viewport.scrollTop, previousLeft = viewport.scrollLeft;
        const shell = this.renderRoot.querySelector<HTMLElement>('.shell')!;
        shell.style.gridTemplateColumns = 'minmax(0,1fr) 0px';
        shell.style.gridTemplateRows = 'minmax(0,1fr) 0px';
        for (let pass = 0; pass < 3; pass++) {
            shell.style.gridTemplateColumns = `minmax(0,1fr) ${viewport.scrollHeight > viewport.clientHeight ? 'var(--mg-scroll-size)' : '0px'}`;
            shell.style.gridTemplateRows = `minmax(0,1fr) ${viewport.scrollWidth > viewport.clientWidth ? 'var(--mg-scroll-size)' : '0px'}`;
        }
        viewport.scrollTop = previousTop;
        viewport.scrollLeft = previousLeft;
        this.metricsY = scrollMetrics(viewport.clientHeight, viewport.scrollHeight, viewport.scrollTop, y?.clientHeight || viewport.clientHeight);
        this.metricsX = scrollMetrics(viewport.clientWidth, viewport.scrollWidth, viewport.scrollLeft, x?.clientWidth || viewport.clientWidth);
    }
    private syncScroll = () => {
        const viewport = this.viewport;
        if (!viewport) return;
        this.metricsY = { ...this.metricsY, position: viewport.scrollTop, offset: this.metricsY.max ? viewport.scrollTop / this.metricsY.max * this.metricsY.travel : 0 };
        this.metricsX = { ...this.metricsX, position: viewport.scrollLeft, offset: this.metricsX.max ? viewport.scrollLeft / this.metricsX.max * this.metricsX.travel : 0 };
    };
    private metrics(axis: ScrollAxis) { return axis === 'vertical' ? this.metricsY : this.metricsX; }
    private move(axis: ScrollAxis, position: number) {
        const viewport = this.viewport;
        if (!viewport) return;
        if (axis === 'vertical') viewport.scrollTop = position; else viewport.scrollLeft = position;
        this.syncScroll();
    }
    private pointerDown(event: PointerEvent, axis: ScrollAxis) {
        if (event.button !== 0) return;
        const target = event.currentTarget as HTMLElement;
        target.focus(); event.preventDefault();
        const coordinate = axis === 'vertical' ? event.clientY : event.clientX;
        const metrics = this.metrics(axis);
        if ((event.target as HTMLElement).classList.contains('thumb')) {
            this.drag = { axis, pointer: event.pointerId, start: coordinate, position: metrics.position, target };
            target.setPointerCapture(event.pointerId); target.classList.add('dragging');
        } else {
            const bounds = target.getBoundingClientRect();
            const offset = coordinate - (axis === 'vertical' ? bounds.top : bounds.left);
            const page = axis === 'vertical' ? this.viewport!.clientHeight : this.viewport!.clientWidth;
            this.move(axis, metrics.position + (offset < metrics.offset ? -page : page));
        }
    }
    private pointerMove(event: PointerEvent) {
        const drag = this.drag;
        if (!drag || event.pointerId !== drag.pointer) return;
        const metrics = this.metrics(drag.axis);
        const coordinate = drag.axis === 'vertical' ? event.clientY : event.clientX;
        this.move(drag.axis, drag.position + (coordinate - drag.start) * metrics.max / Math.max(1, metrics.travel));
    }
    private pointerEnd(event: PointerEvent) {
        if (this.drag?.pointer !== event.pointerId) return;
        const target = this.drag.target;
        target.classList.remove('dragging');
        this.drag = undefined;
        if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
    }
    private keyDown(event: KeyboardEvent, axis: ScrollAxis) {
        const viewport = this.viewport;
        if (!viewport) return;
        const metrics = this.metrics(axis), page = axis === 'vertical' ? viewport.clientHeight : viewport.clientWidth;
        let position: number;
        switch (event.key) {
            case 'Home': position = 0; break;
            case 'End': position = metrics.max; break;
            case 'PageUp': position = metrics.position - page; break;
            case 'PageDown': position = metrics.position + page; break;
            case 'ArrowUp': if (axis !== 'vertical') return; position = metrics.position - 40; break;
            case 'ArrowDown': if (axis !== 'vertical') return; position = metrics.position + 40; break;
            case 'ArrowLeft': if (axis !== 'horizontal') return; position = metrics.position - 40; break;
            case 'ArrowRight': if (axis !== 'horizontal') return; position = metrics.position + 40; break;
            default: return;
        }
        event.preventDefault(); this.move(axis, position);
    }
    private track(axis: ScrollAxis) {
        const metrics = this.metrics(axis);
        const style = axis === 'vertical' ? `height:${metrics.thumb}px;transform:translateY(${metrics.offset}px)` : `width:${metrics.thumb}px;transform:translateX(${metrics.offset}px)`;
        return html`<div class="track ${axis}" ?hidden=${metrics.max <= 0} role="scrollbar" tabindex="0" aria-label=${`${this.label} ${axis} scroll`} aria-controls="viewport" aria-orientation=${axis} aria-valuemin="0" aria-valuemax=${Math.round(metrics.max)} aria-valuenow=${Math.round(metrics.position)}
            @pointerdown=${(event: PointerEvent) => this.pointerDown(event, axis)} @pointermove=${this.pointerMove} @pointerup=${this.pointerEnd} @pointercancel=${this.pointerEnd} @lostpointercapture=${this.pointerEnd} @keydown=${(event: KeyboardEvent) => this.keyDown(event, axis)}><div class="thumb" style=${style}></div></div>`;
    }
    render() {
        return html`<div class="shell"><div id="viewport" tabindex="0" role="region" aria-label=${this.label} @scroll=${this.syncScroll} @load=${this.scheduleMeasurement}><div class="content"><slot @slotchange=${() => { this.observeDescendants(); this.scheduleMeasurement(); }}></slot></div></div>${this.track('vertical')}${this.track('horizontal')}</div>`;
    }
}
if (!customElements.get('mg-scroll')) customElements.define('mg-scroll', ScrollSurface);
declare global { interface HTMLElementTagNameMap { 'mg-scroll': ScrollSurface } }

/** Native-painted fallback for remaining scrolling surfaces, including open shadows.
 * These rules are application composition styling, not an official Material Web API.
 */
export const nativeScrollbarCSS = `
*{scrollbar-width:thin;scrollbar-color:var(--md-sys-color-outline,var(--outline,#7b938a)) var(--md-sys-color-surface-container,var(--surface,#152422))}
*::-webkit-scrollbar{width:12px;height:12px}
*::-webkit-scrollbar-track,*::-webkit-scrollbar-corner{background:var(--md-sys-color-surface-container,var(--surface,#152422))}
*::-webkit-scrollbar-thumb{background:var(--md-sys-color-outline,var(--outline,#7b938a));border:3px solid var(--md-sys-color-surface-container,var(--surface,#152422));border-radius:999px}
*::-webkit-scrollbar-thumb:hover{background:var(--md-sys-color-on-surface-variant,var(--muted,#a6bbb4))}
*::-webkit-scrollbar-thumb:active{background:var(--md-sys-color-primary,var(--mint,#9ee8cf))}
@supports selector(::-webkit-scrollbar){*{scrollbar-width:auto;scrollbar-color:auto}}
mg-scroll{scrollbar-width:none}
`;

/** Install fallback styling into a document/subtree and all reachable open shadows.
 * Watches newly rendered and upgraded custom elements. Call the returned cleanup
 * when the owning application is disposed. Closed roots cannot be styled externally.
 */
export function installNativeScrollbarStyles(root: Document | ShadowRoot | HTMLElement = document): () => void {
    const observed = new Set<Node>();
    const styles = new Set<HTMLStyleElement>();
    const pending = new Set<HTMLElement>();
    let disposed = false;
    const observer = new MutationObserver(records => {
        for (const record of records) for (const node of record.addedNodes) if (node instanceof Element) scan(node);
    });
    function observe(target: Document | ShadowRoot | HTMLElement) {
        if (observed.has(target)) return;
        observed.add(target);
        const style = document.createElement('style');
        style.dataset.mgNativeScrollbars = '';
        style.textContent = nativeScrollbarCSS;
        (target instanceof Document ? target.head || target.documentElement : target).append(style);
        styles.add(style);
        observer.observe(target, { childList: true, subtree: true });
        scan(target);
    }
    function scan(target: Document | ShadowRoot | Element) {
        const elements = target instanceof Element ? [target, ...target.querySelectorAll('*')] : [...target.querySelectorAll('*')];
        for (const element of elements) {
            if (element.shadowRoot) { pending.delete(element as HTMLElement); if (element.localName !== 'mg-scroll') observe(element.shadowRoot); }
            else if (element instanceof HTMLElement && element.localName.includes('-')) pending.add(element);
        }
    }
    observe(root);
    // Shadow attachment itself is not a DOM mutation. Retry only custom hosts
    // without roots, avoiding rescanning the whole document on a timer.
    const timer = window.setInterval(() => {
        if (disposed) return;
        for (const host of pending) {
            if (!host.isConnected) pending.delete(host);
            else if (host.shadowRoot) { pending.delete(host); if (host.localName !== 'mg-scroll') observe(host.shadowRoot); }
        }
    }, 250);
    return () => { disposed = true; clearInterval(timer); observer.disconnect(); for (const style of styles) style.remove(); styles.clear(); pending.clear(); observed.clear(); };
}
