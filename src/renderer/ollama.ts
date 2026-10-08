import { LitElement, html, css, nothing } from './material';
import './components';
import { Search } from './components';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import type { AppSettings } from '../shared/types';
/** Provider-authored Markdown is sanitized inside a scriptless, opaque-origin frame. */
class ModelText extends LitElement {
    static properties = { content: { type: String } };
    content = '';
    private themeObserver?: MutationObserver;
    connectedCallback() {
        super.connectedCallback();
        this.themeObserver = new MutationObserver(() => this.requestUpdate());
        this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'data-theme'] });
    }
    disconnectedCallback() { super.disconnectedCallback(); this.themeObserver?.disconnect(); }
    private frameColor(style: CSSStyleDeclaration, token: string) {
        const value = style.getPropertyValue(token).trim();
        return value && !/[;{}<>]/.test(value) && CSS.supports('color', value) ? value : 'CanvasText';
    }
    static styles = css `:host{display:block;min-width:0}iframe{width:100%;height:clamp(130px,28vh,420px);border:0;border-radius:12px;background:transparent}`;
    render() {
        const markup = DOMPurify.sanitize(marked.parse(this.content, { async: false }), { ALLOWED_TAGS: ['p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'strong', 'em', 'del', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'sub', 'sup'], ALLOWED_ATTR: [] });
        const style = getComputedStyle(this);
        const foreground = this.frameColor(style, '--md-sys-color-on-surface');
        const surface = this.frameColor(style, '--md-sys-color-surface-container-low');
        const outline = this.frameColor(style, '--md-sys-color-outline-variant');
        const primary = this.frameColor(style, '--md-sys-color-primary');
        const hover = this.frameColor(style, '--md-sys-color-outline');
        const fontSize = Number.parseFloat(style.fontSize) || 13;
        const documentSource = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'none'; script-src 'none'; form-action 'none'; base-uri 'none'"><style>:root{--md-sys-color-on-surface:${foreground};--md-sys-color-surface-container-low:${surface};--md-sys-color-outline-variant:${outline};--md-sys-color-outline:${hover};--md-sys-color-primary:${primary}}*{box-sizing:border-box}body{margin:0;padding:12px;color:var(--md-sys-color-on-surface);background:transparent;font:${fontSize}px/1.5 Segoe UI,Arial,sans-serif;overflow-wrap:anywhere}h1,h2,h3{font-size:1.15em}pre{white-space:pre-wrap;padding:12px;background:var(--md-sys-color-surface-container-low);border-radius:8px}code{font:inherit;font-family:ui-monospace,monospace}blockquote{margin:12px 0;padding-left:12px;border-left:2px solid var(--md-sys-color-primary)}table{border-collapse:collapse;width:100%;table-layout:fixed}td,th{padding:6px;border:1px solid var(--md-sys-color-outline-variant)}::-webkit-scrollbar{width:10px;height:10px}::-webkit-scrollbar-track{background:var(--md-sys-color-surface-container-low)}::-webkit-scrollbar-thumb{background:var(--md-sys-color-outline-variant);border:2px solid var(--md-sys-color-surface-container-low);border-radius:8px}::-webkit-scrollbar-thumb:hover{background:var(--md-sys-color-outline)}</style></head><body>${markup}</body></html>`;
        return html `<iframe sandbox="" title="Local model response" .srcdoc=${documentSource}></iframe>`;
    }
}
customElements.define('mg-model-text', ModelText);
interface LocalModel {
    name: string;
    model?: string;
    size?: number;
    digest?: string;
    modified_at?: string;
    details?: Record<string, unknown>;
    expires_at?: string;
    size_vram?: number;
}
interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}
const suggestedModels = [
    { name: 'llama3.2:3b', purpose: 'General conversation and everyday drafting' },
    { name: 'qwen3:4b', purpose: 'General reasoning and multilingual conversation' },
    { name: 'gemma3:4b', purpose: 'General conversation; requirements vary by model variant' },
    { name: 'qwen2.5-coder:7b', purpose: 'Coding assistance; typically requires more memory than smaller models' }
];
const words: Record<string, [
    string,
    string
]> = { title: ['Local model workspace', '本機模型工作空間'], refresh: ['Refresh local service', '重新檢查本機服務'], connected: ['Connected to local Ollama', '已連接本機 Ollama'], disconnected: ['Ollama is disconnected', 'Ollama 未連接'], checking: ['Checking local Ollama', '正在檢查本機 Ollama'], installed: ['Installed models', '已安裝模型'], running: ['Loaded in memory', '記憶體中嘅模型'], chat: ['Conversation', '對話'], send: ['Send message', '傳送訊息'], clear: ['Clear conversation', '清除對話'], model: ['Choose installed model', '選擇已安裝模型'], prompt: ['Your message', '你嘅訊息'], pull: ['Download model', '下載模型'], copy: ['Copy model', '複製模型'], remove: ['Delete local model', '刪除本機模型'], detail: ['Model details', '模型詳情'], previous: ['Previous', '上一頁'], next: ['Next', '下一頁'], close: ['Close', '關閉'], cancel: ['Cancel', '取消'], review: ['Review local change', '檢查本機變更'], confirm: ['Confirm and continue', '確認並繼續'], temperature: ['Temperature', '溫度'], tokens: ['Maximum generated tokens', '產生字詞數量上限'], help: ['Ollama setup documentation', 'Ollama 設定文件'], catalog: ['Browse official model library', '瀏覽官方模型庫'] };
/** Dedicated registered Material composition. All model requests cross the main-process bridge. */
export class OllamaWorkspace extends LitElement {
    static properties = { settings: { attribute: false }, schoolMode: { type: Boolean }, health: { state: true }, models: { state: true }, running: { state: true }, filtered: { state: true }, page: { state: true }, tab: { state: true }, busy: { state: true }, actionStatus: { state: true }, error: { state: true }, selectedModel: { state: true }, prompt: { state: true }, messages: { state: true }, temperature: { state: true }, tokenBudget: { state: true }, detail: { state: true }, detailModel: { state: true }, reviewAction: { state: true }, reviewModel: { state: true }, destination: { state: true }, suggestion: { state: true }, keyOne: { state: true }, keyTwo: { state: true }, confirmation: { state: true }, metadata: { state: true } };
    settings?: AppSettings;
    schoolMode = false;
    health: {
        available: boolean;
        version?: string;
        error?: string;
    } | null = null;
    models: LocalModel[] = [];
    running: LocalModel[] = [];
    filtered: LocalModel[] = [];
    page = 1;
    tab = 'models';
    busy = '';
    actionStatus = '';
    error = '';
    selectedModel = '';
    prompt = '';
    messages: ChatMessage[] = [];
    temperature = .7;
    tokenBudget = 1024;
    detail: Record<string, unknown> | null = null;
    detailModel = '';
    reviewAction: '' | 'pull' | 'delete' | 'copy' = '';
    reviewModel = '';
    destination = '';
    suggestion = suggestedModels[0].name;
    keyOne = false;
    keyTwo = false;
    confirmation = 0;
    metadata = false;
    private generation = 0;
    static styles = css `
 :host{display:block;min-width:0;color:var(--md-sys-color-on-surface);font-family:var(--md-ref-typeface-plain,system-ui,sans-serif);font-size:var(--mg-body-size,.8125rem);line-height:1.5}
 *,*::before,*::after{box-sizing:border-box}mg-layout,mg-surface,mg-text,mg-search{min-width:0;max-width:100%}mg-text,p,h2,h3,label,small{overflow-wrap:anywhere}
 md-outlined-text-field,md-outlined-select,md-filled-select{min-width:0;max-width:100%;--md-outlined-text-field-container-shape:8px;--md-outlined-select-text-field-container-shape:8px;--md-filled-select-text-field-container-shape:8px;--md-outlined-text-field-input-text-size:var(--mg-body-size,.8125rem);--md-outlined-select-text-field-input-text-size:var(--mg-body-size,.8125rem)}
 md-filled-button,md-outlined-button,md-text-button{max-width:100%;--md-filled-button-container-shape:8px;--md-outlined-button-container-shape:8px;--md-text-button-container-shape:8px;--md-filled-button-label-text-size:var(--mg-body-size,.8125rem);--md-outlined-button-label-text-size:var(--mg-body-size,.8125rem);--md-text-button-label-text-size:var(--mg-body-size,.8125rem)}
 md-dialog{max-width:calc(100vw - 32px);--md-dialog-container-shape:12px;--md-dialog-container-color:var(--md-sys-color-surface-container-high)}
 ::-webkit-scrollbar{width:10px;height:10px}::-webkit-scrollbar-track{background:var(--md-sys-color-surface-container-low)}::-webkit-scrollbar-thumb{background:var(--md-sys-color-outline-variant);border:2px solid var(--md-sys-color-surface-container-low);border-radius:8px}::-webkit-scrollbar-thumb:hover{background:var(--md-sys-color-outline)}
 .stack{display:grid;gap:12px}.toolbar{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.models{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:12px}.summary{display:grid;gap:8px}.muted{color:var(--md-sys-color-on-surface-variant);font-size:inherit;line-height:1.5}.error{color:var(--md-sys-color-error)}.conversation{display:grid;gap:12px}.message{--surface:var(--md-sys-color-surface-container-low)}.message[user]{--surface:var(--md-sys-color-secondary-container)}.message mg-text[kind=code]{font-family:inherit}.composer{display:grid;gap:12px}.two{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:12px}md-filled-select,md-outlined-text-field{width:100%}md-slider{width:100%}.dialog-content{display:grid;gap:12px}.detail{overflow-wrap:anywhere}.controls{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.temperature{display:grid;gap:6px}.status{border-left:3px solid var(--md-sys-color-primary);padding-left:12px}.card-title{font-size:1.15em;line-height:1.4;overflow-wrap:anywhere}@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}`;
    connectedCallback() { super.connectedCallback(); void this.refresh(); }
    disconnectedCallback() { super.disconnectedCallback(); this.generation++; }
    private copy(key: string) { const [en, yue] = words[key] || [key, key]; const language = this.schoolMode ? 'en' : this.settings?.language || 'en'; return language === 'both' ? `${en} · ${yue}` : language === 'yue' ? yue : en; }
    private failure(error: unknown) { this.error = error instanceof Error ? error.message : String(error); }
    private bytes(value: unknown) { if (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
        return 'Unavailable'; if (value >= 1073741824)
        return `${(value / 1073741824).toFixed(2)} GiB`; if (value >= 1048576)
        return `${(value / 1048576).toFixed(1)} MiB`; return `${value.toLocaleString()} bytes`; }
    private modelRows(result: unknown): LocalModel[] { const models = (result as {
        models?: unknown;
    })?.models; if (!Array.isArray(models) || models.length > 10000)
        throw new Error('Local Ollama returned an invalid or oversized model collection.'); return models.filter((item): item is LocalModel => Boolean(item) && typeof item === 'object' && typeof item.name === 'string' && item.name.length <= 200); }
    async refresh() {
        if (this.busy)
            return;
        const generation = ++this.generation;
        this.busy = 'refresh';
        this.error = '';
        try {
            const health = await window.material.ollama('health') as {
                available: boolean;
                version?: string;
                error?: string;
            };
            if (generation !== this.generation)
                return;
            this.health = health;
            if (!health.available) {
                this.models = [];
                this.running = [];
                this.filtered = [];
                this.actionStatus = health.error || 'Start the local Ollama service, then retry.';
                return;
            }
            const [models, running] = await Promise.allSettled([window.material.ollama('models'), window.material.ollama('running')]);
            if (generation !== this.generation)
                return;
            if (models.status === 'fulfilled') {
                this.models = this.modelRows(models.value);
                this.filtered = this.models;
                this.page = 1;
                this.selectedModel = this.models.some(model => model.name === this.selectedModel) ? this.selectedModel : this.models[0]?.name || '';
            }
            else
                throw models.reason;
            if (running.status === 'fulfilled')
                this.running = this.modelRows(running.value);
            else {
                this.running = [];
                this.actionStatus = 'Installed models loaded. Memory status is unavailable: ' + String(running.reason);
            }
            if (running.status === 'fulfilled')
                this.actionStatus = `${this.models.length} installed models · ${this.running.length} loaded in memory.`;
        }
        catch (error) {
            if (generation === this.generation)
                this.failure(error);
        }
        finally {
            if (generation === this.generation)
                this.busy = '';
        }
    }
    private async filter(event: Event) { const search = event.target as Search; const matches = await search.matchValues(this.models.map(model => `${model.name} ${JSON.stringify(model.details || {})}`)); this.filtered = this.models.filter((_, index) => matches[index]); this.page = 1; }
    private async show(model: string) { if (this.busy)
        return; this.busy = 'show'; this.error = ''; try {
        const result = await window.material.ollama('show', { model });
        if (!result || typeof result !== 'object' || Array.isArray(result))
            throw new Error('No model details were returned.');
        this.detail = result as Record<string, unknown>;
        this.detailModel = model;
        this.metadata = false;
    }
    catch (error) {
        this.failure(error);
    }
    finally {
        this.busy = '';
    } }
    private review(action: 'pull' | 'delete' | 'copy', model: string) { if (this.busy)
        return; this.reviewAction = action; this.reviewModel = model; this.destination = ''; this.keyOne = false; this.keyTwo = false; this.confirmation = 0; }
    private safetyKey(key: 'one' | 'two', value: boolean) { if (key === 'one')
        this.keyOne = value;
    else
        this.keyTwo = value; if (!this.keyOne || !this.keyTwo)
        this.confirmation = 0; }
    private modelIdentity(name: string) { return name.lastIndexOf(':') > name.lastIndexOf('/') ? name : name + ':latest'; }
    private async mutate() {
        if (this.busy || !this.reviewAction)
            return;
        const action = this.reviewAction, model = this.reviewModel;
        if (action === 'delete' && (!this.keyOne || !this.keyTwo || this.confirmation !== 100)) {
            this.error = 'Complete both deletion acknowledgements and move the slider to 100.';
            return;
        }
        if (action === 'copy' && (!/^[A-Za-z0-9_./:-]{1,200}$/.test(this.destination) || this.models.some(item => this.modelIdentity(item.name) === this.modelIdentity(this.destination)))) {
            this.error = 'Choose a new valid local model name. Existing names cannot be overwritten here.';
            return;
        }
        this.busy = action;
        this.error = '';
        this.actionStatus = action === 'pull' ? `Downloading ${model}. Ollama provides no progress stream through this bounded interface; the request has a 120-second deadline.` : `Applying ${action} to ${model}.`;
        try {
            const payload = action === 'copy' ? { source: model, destination: this.destination } : action === 'delete' ? { model, confirmed: true } : { model };
            await window.material.ollama(action, payload);
            this.actionStatus = `${action} completed for ${model}.`;
            this.reviewAction = '';
            this.busy = '';
            await this.refresh();
            this.actionStatus = `${action} completed for ${model}. ${this.actionStatus}`;
        }
        catch (error) {
            this.failure(error);
        }
        finally {
            this.busy = '';
        }
    }
    private async send() {
        if (this.busy || !this.selectedModel)
            return;
        if (!Number.isFinite(this.temperature) || this.temperature < 0 || this.temperature > 2 || !Number.isInteger(this.tokenBudget) || this.tokenBudget < 256 || this.tokenBudget > 4096) {
            this.error = 'Generation controls are outside their supported bounds.';
            return;
        }
        const prompt = this.prompt.trim();
        if (!prompt || prompt.length > 16000) {
            this.error = 'Enter a message between 1 and 16000 characters.';
            return;
        }
        if (!this.models.some(model => model.name === this.selectedModel)) {
            this.error = 'Choose a currently installed model.';
            return;
        }
        const request: ChatMessage[] = [...this.messages.slice(-20), { role: 'user', content: prompt }];
        if (JSON.stringify(request).length > 240000) {
            this.error = 'Conversation context is too large. Clear this conversation or shorten your message.';
            return;
        }
        this.busy = 'chat';
        this.error = '';
        this.actionStatus = 'Waiting for the local model. This interface returns one complete response; streaming and cancellation are unavailable. The service deadline is 120 seconds.';
        try {
            const result = await window.material.ollama('chat', { model: this.selectedModel, messages: request, options: { temperature: this.temperature, num_predict: this.tokenBudget } }) as {
                message?: {
                    content?: unknown;
                };
                done?: boolean;
                prompt_eval_count?: number;
                eval_count?: number;
                total_duration?: number;
            };
            if (typeof result.message?.content !== 'string')
                throw new Error('The local model returned no assistant message.');
            this.messages = [...this.messages, { role: 'user', content: prompt }, { role: 'assistant', content: result.message.content.slice(0, 100000) }];
            this.prompt = '';
            this.actionStatus = `Response received${typeof result.eval_count === 'number' ? ` · ${result.eval_count} generated tokens` : ''}${typeof result.total_duration === 'number' ? ` · ${(result.total_duration / 1e9).toFixed(2)} seconds` : ''}${result.message.content.length > 100000 ? ' · Display was truncated to 100000 characters' : ''}.`;
        }
        catch (error) {
            this.failure(error);
        }
        finally {
            this.busy = '';
        }
    }
    private modelCard(model: LocalModel) { const details = model.details || {}; const loaded = this.running.find(item => item.name === model.name); return html `<mg-surface class="summary"><mg-layout spread><mg-text class="card-title">${model.name}</mg-text><md-assist-chip label=${loaded ? 'Loaded' : 'On disk'}></md-assist-chip></mg-layout><mg-text kind="muted">${this.bytes(model.size)}${details.parameter_size ? ` · ${details.parameter_size}` : ''}${details.quantization_level ? ` · ${details.quantization_level}` : ''}</mg-text><mg-text kind="muted">${details.family ? `Family ${details.family} · ` : ''}${model.modified_at ? `Modified ${new Date(model.modified_at).toLocaleString()}` : 'Modification date unavailable'}</mg-text>${loaded ? html `<mg-text kind="muted">Memory ${this.bytes(loaded.size_vram)}${loaded.expires_at ? ` · expires ${new Date(loaded.expires_at).toLocaleString()}` : ''}</mg-text>` : nothing}<mg-layout><md-outlined-button ?disabled=${Boolean(this.busy)} @click=${() => this.show(model.name)}>${this.copy('detail')}</md-outlined-button><md-text-button ?disabled=${Boolean(this.busy)} @click=${() => { this.selectedModel = model.name; this.tab = 'chat'; }}>${this.copy('chat')}</md-text-button><md-text-button ?disabled=${Boolean(this.busy)} @click=${() => this.review('copy', model.name)}>${this.copy('copy')}</md-text-button><md-text-button ?disabled=${Boolean(this.busy)} @click=${() => this.review('delete', model.name)}>${this.copy('remove')}</md-text-button></mg-layout></mg-surface>`; }
    render() {
        const pages = Math.max(1, Math.ceil(this.filtered.length / 8));
        const online = this.health?.available === true;
        return html `<mg-layout column><mg-surface><mg-layout spread><mg-layout column><mg-text kind="eyebrow">Ollama · local-only service</mg-text><mg-text kind="title">${this.copy('title')}</mg-text><mg-text kind="muted">${this.health === null ? this.copy('checking') : online ? `${this.copy('connected')}${this.health.version ? ` · ${this.health.version}` : ''}` : this.copy('disconnected')}</mg-text></mg-layout><md-outlined-button ?disabled=${Boolean(this.busy)} @click=${() => this.refresh()}>${this.copy('refresh')}</md-outlined-button></mg-layout><mg-layout class="toolbar"><md-text-button @click=${() => window.material.openExternal('https://docs.ollama.com/quickstart')}>${this.copy('help')}</md-text-button><md-text-button @click=${() => window.material.openExternal('https://ollama.com/library')}>${this.copy('catalog')}</md-text-button></mg-layout><mg-text kind="muted">Only http://127.0.0.1:11434 is used. This app does not install, start or stop Ollama. Model downloads are handled by the local service and may use its upstream network.</mg-text></mg-surface>
        ${this.error ? html `<mg-surface role="alert"><mg-text class="error">${this.error}</mg-text><md-text-button ?disabled=${Boolean(this.busy)} @click=${() => this.refresh()}>Retry local connection</md-text-button><md-text-button @click=${() => this.error = ''}>Dismiss error</md-text-button></mg-surface>` : nothing}${this.actionStatus ? html `<mg-surface role="status"><mg-text class="status">${this.actionStatus}</mg-text>${this.busy ? html `<md-linear-progress indeterminate aria-label=${`Local Ollama ${this.busy} request pending; numerical progress is unavailable`}></md-linear-progress>` : nothing}</mg-surface>` : nothing}
        ${!online ? html `<mg-surface><mg-text kind="title">Start your local model service</mg-text><mg-text kind="muted">${this.health?.error || 'Availability has not been confirmed.'} Install Ollama using the official setup documentation, start its local service, and choose Refresh. Installed model and conversation controls become available after a successful connection.</mg-text></mg-surface>` : html `<md-tabs .activeTabIndex=${this.tab === 'models' ? 0 : 1} @change=${(e: Event) => this.tab = (e.target as unknown as {
            activeTabIndex: number;
        }).activeTabIndex === 0 ? 'models' : 'chat'}><md-primary-tab>${this.copy('installed')} (${this.models.length})</md-primary-tab><md-primary-tab>${this.copy('chat')}</md-primary-tab></md-tabs>${this.tab === 'models' ? html `<mg-search search-id="ollama-installed-models" label="Search installed local models" @search-change=${(e: Event) => this.filter(e)}></mg-search><mg-layout grid>${this.filtered.slice((this.page - 1) * 8, this.page * 8).map(model => this.modelCard(model))}</mg-layout>${!this.filtered.length ? html `<mg-surface><mg-text kind="muted">${this.models.length ? 'No installed models match this search.' : 'No models are installed. Choose a suggested model below and review its download.'}</mg-text></mg-surface>` : nothing}<mg-layout spread><md-outlined-button ?disabled=${this.page <= 1} @click=${() => this.page--}>${this.copy('previous')}</md-outlined-button><mg-text kind="muted">Page ${this.page} of ${pages}</mg-text><md-outlined-button ?disabled=${this.page >= pages} @click=${() => this.page++}>${this.copy('next')}</md-outlined-button></mg-layout><mg-surface><mg-text kind="title">Suggested model downloads</mg-text><mg-text kind="muted">Curated registry suggestions are not installed-model status. Availability, download size, licenses and memory requirements vary; inspect the official model library before downloading.</mg-text><md-filled-select label="Suggested model" .value=${this.suggestion} @change=${(e: Event) => this.suggestion = (e.target as HTMLSelectElement).value}>${suggestedModels.map(model => html `<md-select-option value=${model.name}><div slot="headline">${model.name}</div><div slot="supporting-text">${model.purpose}</div></md-select-option>`)}</md-filled-select><md-filled-tonal-button ?disabled=${Boolean(this.busy)} @click=${() => this.review('pull', this.suggestion)}>${this.copy('pull')}</md-filled-tonal-button></mg-surface>` : html `<mg-surface class="composer"><md-filled-select label=${this.copy('model')} ?disabled=${Boolean(this.busy) || Boolean(this.messages.length)} .value=${this.selectedModel} @change=${(e: Event) => this.selectedModel = (e.target as HTMLSelectElement).value}>${this.models.map(model => html `<md-select-option value=${model.name}><div slot="headline">${model.name}</div></md-select-option>`)}</md-filled-select><mg-text kind="muted">Conversation stays in memory in this window. Clear it to change models. Each request sends at most the latest 20 messages plus your new message; older messages remain visible. Streaming and cancellation are unavailable.</mg-text><mg-layout column class="conversation" role="log" aria-label="Local model conversation" aria-live="polite">${this.messages.map(message => html `<mg-surface class="message" ?user=${message.role === 'user'}><mg-text kind="eyebrow">${message.role === 'user' ? 'You' : this.selectedModel}</mg-text>${message.role === 'assistant' ? html `<mg-model-text .content=${message.content}></mg-model-text>` : html `<mg-text kind="code">${message.content}</mg-text>`}</mg-surface>`)}</mg-layout><md-outlined-text-field type="textarea" rows="4" label=${this.copy('prompt')} ?disabled=${Boolean(this.busy)} .value=${this.prompt} @input=${(e: Event) => this.prompt = (e.target as HTMLInputElement).value}></md-outlined-text-field><mg-layout grid><mg-layout column class="temperature"><mg-text>${this.copy('temperature')} · ${this.temperature}</mg-text><md-slider aria-label=${this.copy('temperature')} min="0" max="2" step="0.1" labeled ?disabled=${Boolean(this.busy)} .value=${this.temperature} @input=${(e: Event) => this.temperature = Number((e.target as HTMLInputElement).value)}></md-slider></mg-layout><mg-layout column class="temperature"><mg-text>${this.copy('tokens')} · ${this.tokenBudget}</mg-text><md-slider aria-label=${this.copy('tokens')} min="256" max="4096" step="256" labeled ?disabled=${Boolean(this.busy)} .value=${this.tokenBudget} @input=${(e: Event) => this.tokenBudget = Number((e.target as HTMLInputElement).value)}></md-slider></mg-layout></mg-layout><mg-layout><md-filled-button ?disabled=${Boolean(this.busy) || !this.selectedModel || !this.prompt.trim()} @click=${() => this.send()}>${this.copy('send')}</md-filled-button><md-text-button ?disabled=${Boolean(this.busy) || !this.messages.length} @click=${() => { this.messages = []; this.actionStatus = 'Conversation cleared from this window.'; }}>${this.copy('clear')}</md-text-button></mg-layout></mg-surface>`}`}
        ${this.detail ? html `<md-dialog open @closed=${() => this.detail = null}><mg-text slot="headline">${this.detailModel}</mg-text><mg-layout slot="content" column class="dialog-content"><mg-text kind="eyebrow">Installed model details</mg-text>${Object.entries((this.detail.details && typeof this.detail.details === 'object' ? this.detail.details : {}) as Record<string, unknown>).map(([key, value]) => html `<mg-layout spread><mg-text>${key}</mg-text><mg-text kind="muted">${String(value)}</mg-text></mg-layout>`)}<md-text-button aria-expanded=${this.metadata} @click=${() => this.metadata = !this.metadata}>${this.metadata ? 'Hide complete metadata' : 'Show complete metadata'}</md-text-button>${this.metadata ? html `<mg-text kind="code" class="detail">${JSON.stringify(this.detail, null, 2)}</mg-text>` : nothing}<mg-text kind="muted">Model-authored templates, parameters and license data are factual external metadata; this view does not certify their accuracy or suitability.</mg-text></mg-layout><md-text-button slot="actions" @click=${() => this.detail = null}>${this.copy('close')}</md-text-button></md-dialog>` : nothing}
        ${this.reviewAction ? html `<md-dialog open @cancel=${(event: Event) => { if (this.busy)
            event.preventDefault(); }} @closed=${() => { if (!this.busy)
            this.reviewAction = ''; }}><mg-text slot="headline">${this.copy('review')}</mg-text><mg-layout slot="content" column class="dialog-content"><mg-text kind="title">${this.reviewAction} · ${this.reviewModel}</mg-text><mg-text kind="muted">${this.reviewAction === 'pull' ? 'The local Ollama service will download this registry model and store it on this computer. Download size and license must be checked in the official library. Requests time out after 120 seconds; a timeout does not establish whether the service stopped downloading.' : this.reviewAction === 'copy' ? 'Create a new local model alias from this installed model. Existing local names cannot be overwritten through this form.' : 'Delete this model from the local Ollama installation. It becomes unavailable to local conversations until downloaded again. Existing conversation messages in this app are not deleted.'}</mg-text>${this.reviewAction === 'copy' ? html `<md-outlined-text-field label="New local model name" .value=${this.destination} ?disabled=${Boolean(this.busy)} @input=${(e: Event) => this.destination = (e.target as HTMLInputElement).value}></md-outlined-text-field>` : nothing}${this.reviewAction === 'delete' ? html `<mg-layout><md-switch aria-label="I checked the local model selected for deletion" .selected=${this.keyOne} ?disabled=${Boolean(this.busy)} @change=${(e: Event) => this.safetyKey('one', (e.target as unknown as {
            selected: boolean;
        }).selected)}></md-switch><mg-text>I checked the selected local model.</mg-text></mg-layout><mg-layout><md-switch aria-label="I understand the model must be downloaded again after deletion" .selected=${this.keyTwo} ?disabled=${Boolean(this.busy)} @change=${(e: Event) => this.safetyKey('two', (e.target as unknown as {
            selected: boolean;
        }).selected)}></md-switch><mg-text>I understand the model must be downloaded again after deletion.</mg-text></mg-layout><md-slider aria-label="Local model deletion confirmation" min="0" max="100" step="1" labeled .value=${this.confirmation} ?disabled=${Boolean(this.busy) || !this.keyOne || !this.keyTwo} @input=${(e: Event) => this.confirmation = Number((e.target as HTMLInputElement).value)}></md-slider>` : nothing}${this.busy ? html `<md-linear-progress indeterminate aria-label="Local model change pending; service progress is unavailable"></md-linear-progress><mg-text kind="muted">${this.actionStatus}</mg-text>` : nothing}${this.error ? html `<mg-text role="alert" class="error">${this.error}</mg-text>` : nothing}</mg-layout><md-text-button slot="actions" ?disabled=${Boolean(this.busy)} @click=${() => this.reviewAction = ''}>${this.copy('cancel')}</md-text-button><md-filled-button slot="actions" ?disabled=${Boolean(this.busy) || (this.reviewAction === 'delete' && (!this.keyOne || !this.keyTwo || this.confirmation !== 100)) || (this.reviewAction === 'copy' && !this.destination.trim())} @click=${() => this.mutate()}>${this.copy('confirm')}</md-filled-button></md-dialog>` : nothing}</mg-layout>`;
    }
}
customElements.define('mg-ollama', OllamaWorkspace);
