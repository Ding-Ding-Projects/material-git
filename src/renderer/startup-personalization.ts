import {LitElement, html, css, nothing} from './material';
import './components';
import {defaults} from '../shared/preferences.js';
import type {AppSettings} from '../shared/types.js';
import {startupPhotoCopy, startupSuppressed, type StartupBridge, type StartupContext, type StartupDish} from '../shared/startup-personalization.js';
import {localizePair, message} from './localization.js';

/** Registered Material composition. It never opens a dialog, focuses a control or delays app readiness. */
export class StartupPersonalization extends LitElement {
  static properties = {settings: {attribute: false}, context: {attribute: false}, ready: {type: Boolean}, dish: {state: true}};
  static styles = css`
    :host{position:fixed;inset:auto 16px 16px auto;z-index:8;max-width:calc(100vw - 32px);color:var(--md-sys-color-on-surface);font-family:var(--md-ref-typeface-plain,system-ui,sans-serif)}
    :host([hidden]){display:none}mg-surface{display:block;width:min(340px,calc(100vw - 32px));--surface:var(--md-sys-color-surface-container-high);--outline:var(--md-sys-color-outline-variant);--mg-surface-radius:var(--md-sys-shape-corner-large,16px);--mg-surface-padding:12px}
    mg-layout{display:block;min-width:0}mg-text{overflow-wrap:anywhere}mg-text[kind=title]{font-size:1rem}mg-text[kind=muted]{font-size:.8125rem;color:var(--md-sys-color-on-surface-variant)}
    img{display:block;width:100%;height:140px;object-fit:contain;border-radius:8px;margin-top:8px;background:var(--md-sys-color-surface-container)}
    md-text-button{max-width:100%;--md-text-button-container-shape:12px}md-text-button:focus-visible{outline:2px solid var(--md-sys-color-primary);outline-offset:3px}
    @media(max-height:440px){img{height:72px}:host{inset:auto 8px 8px auto}mg-surface{--mg-surface-padding:8px}}
    @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
  `;
  settings: AppSettings = {...defaults};
  context: StartupContext = {firstRun: true, busy: false, error: false, updating: false, schoolMode: false, quiet: false};
  ready = false;
  private dish?: StartupDish;
  private attempted = false;
  private stopped = false;
  private timer?: ReturnType<typeof setTimeout>;
  private onInteraction = (event: Event) => {
    if (event.composedPath().includes(this)) return;
    this.dismiss();
  };
  private onEscape = (event: KeyboardEvent) => {if (event.key === 'Escape') this.dismiss();};
  connectedCallback() {
    super.connectedCallback(); this.hidden = true;
    // Any task interaction cancels a pending result. It is never postponed until the task ends.
    document.addEventListener('pointerdown', this.onInteraction, true);
    document.addEventListener('keydown', this.onInteraction, true);
    document.addEventListener('keydown', this.onEscape);
    document.addEventListener('visibilitychange', this.onVisibility);
  }
  disconnectedCallback() {
    super.disconnectedCallback(); this.dismiss();
    document.removeEventListener('pointerdown', this.onInteraction, true);
    document.removeEventListener('keydown', this.onInteraction, true);
    document.removeEventListener('keydown', this.onEscape);
    document.removeEventListener('visibilitychange', this.onVisibility);
  }
  private onVisibility = () => {if (document.hidden) this.dismiss();};
  protected updated() {
    if (!this.ready) return;
    const suppressed = startupSuppressed(this.context) || this.settings.lowStimulation || this.settings.quietNarration || document.hidden;
    if (!this.attempted) {this.attempted = true; if (suppressed) this.dismiss(); else if (!this.stopped) void this.start();}
    else if (suppressed) this.dismiss();
  }
  private async start() {
    try {
      const result = await (window.material as typeof window.material & Partial<StartupBridge>).startupPersonalization?.();
      if (!this.isConnected || this.stopped || startupSuppressed(this.context) || this.settings.lowStimulation || this.settings.quietNarration || document.hidden || result?.status !== 'shown' || !result.dish) return;
      this.dish = result.dish; this.hidden = false;
      this.timer = setTimeout(() => this.dismiss(), 7000);
    } catch {/* The app remains usable when decoration is unavailable. */}
  }
  private dismiss() {this.stopped = true; clearTimeout(this.timer); this.dish = undefined; this.hidden = true;}
  private name() {
    const name = this.dish!.name;
    return this.settings.language === 'yue' ? {primary: name.zhHant, secondary: name.en} : {primary: name.en, secondary: name.zhHant};
  }
  private imageFailed() {if (this.dish) this.dish = {...this.dish, image: undefined, photoStatus: 'unavailable'};}
  render() {
    if (!this.dish || startupSuppressed(this.context) || this.settings.lowStimulation || this.settings.quietNarration) return nothing;
    const name = this.name(); const unavailable = this.dish.photoStatus !== 'available' ? startupPhotoCopy[this.dish.photoStatus] : undefined;
    return html`<mg-surface role="status" aria-live="polite" aria-atomic="true" data-testid="startup-surprise">
      <mg-layout spread><mg-text>${message('status', {en: 'A little dim sum to start.', yue: '開工前，送上一款點心。'}, this.settings)}</mg-text><md-text-button aria-label=${localizePair('Dismiss dim sum surprise', '關閉點心驚喜', this.settings)} @click=${() => this.dismiss()}>${localizePair('Dismiss', '關閉', this.settings)}</md-text-button></mg-layout>
      <mg-text kind="title" lang=${this.settings.language === 'yue' ? 'yue' : 'en'}>${name.primary}</mg-text><mg-text kind="muted" lang=${this.settings.language === 'yue' ? 'en' : 'yue'}>${name.secondary}</mg-text>
      ${this.dish.image ? html`<img src=${this.dish.image} alt=${name.primary + (name.secondary ? ' · ' + name.secondary : '')} @error=${() => this.imageFailed()}>` : nothing}
      ${unavailable ? html`<mg-text kind="muted">${localizePair(unavailable.en, unavailable.yue, this.settings)}</mg-text>` : nothing}
    </mg-surface>`;
  }
}
customElements.define('mg-startup-personalization', StartupPersonalization);
