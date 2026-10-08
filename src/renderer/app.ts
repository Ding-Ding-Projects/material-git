import { LitElement, html, nothing } from './material';
import './components';
import { Search } from './components';
import './settings';
import './tools';
import './converters';
import './accounts';
import './updates';
import './security';
import type {SecurityStatus} from '../shared/security';
import {argbFromHex,themeFromSourceColor,applyTheme,hexFromArgb} from '@material/material-color-utilities';
import './appearance';
import { restoreAppearance } from './appearance';
import { t, announce, setPersonalVocabulary } from './localization';
import type { Bootstrap, CommandDefinition, CommandOption, Operation, Choice, HistoryEntry, AppSettings } from '../shared/types';
export class MaterialApp extends LitElement {
    static properties = { closeAppOpen:{state:true}, workingDirectory:{state:true}, securityStatus: { state: true }, data: { state: true }, lane: { state: true }, selected: { state: true }, filtered: { state: true }, repositoryChoices: { state: true }, repoPage: { state: true }, repoNext: { state: true }, repositoryOpen: { state: true }, paletteOpen: { state: true }, paletteItems: { state: true }, values: { state: true }, args: { state: true }, operations: { state: true }, historyEntries: { state: true }, notice: { state: true }, error: { state: true }, review: { state: true }, keyOne: { state: true }, keyTwo: { state: true }, confirmation: { state: true }, busy: { state: true }, resultPage: { state: true }, tabs: { state: true }, entityChoices: { state: true }, catalogPage: { state: true }, entityPages: { state: true }, appearanceTarget: { state: true }, appearanceId: { state: true }, appearanceOpen: { state: true }, closeTabId: { state: true }, expandedRecords: { state: true } };
    data?: Bootstrap;
    closeAppOpen=false;workingDirectory='';
    private closeUnsubscribe?:()=>void;
    securityStatus?:SecurityStatus;
    private baseSettings?:AppSettings;
    private vocabularyEntries:Record<string,string>={};
    private securityUnsubscribe?:()=>void;
    lane = 'home';
    selected?: CommandDefinition;
    filtered: CommandDefinition[] = [];
    repositoryChoices: Choice[] = [];
    repoPage = 1;
    repoNext = false;
    repositoryOpen = false;
    paletteOpen = false;
    paletteItems: CommandDefinition[] = [];
    values: Record<string, unknown> = {};
    args: Record<string, unknown> = {};
    operations: Operation[] = [];
    historyEntries: HistoryEntry[] = [];
    notice = '';
    error = '';
    review = false;
    keyOne = false;
    keyTwo = false;
    confirmation = 0;
    busy = false;
    resultPage = 1;
    tabs: string[] = [];
    entityChoices: Record<string, Choice[]> = {};
    catalogPage = 1;
    entityPages: Record<string, {
        page: number;
        notice?:string;
        hasNext: boolean;
        query: string;
    }> = {};
    appearanceTarget: HTMLElement | null = null;
    appearanceId = '';
    appearanceOpen = false;
    closeTabId = '';
    expandedRecords = new Set<string>();
    private drafts = new Map<string, {
        values: Record<string, unknown>;
        args: Record<string, unknown>;
        dirty: boolean;
    }>();
    private repositoryQuery = '';
    private repositoryPageItems: Choice[] = [];
    private unsubscribe?: () => void;
    private notificationTimer?: ReturnType<typeof setTimeout>;
    createRenderRoot() { return this; }
    protected updated() { restoreAppearance(this); }
    private copy(key: string) { return t(key, this.data?.settings); }
    connectedCallback() { super.connectedCallback(); void this.load(); window.addEventListener('keydown', this.keydown); this.addEventListener('contextmenu', this.appearanceMenu); }
    disconnectedCallback() { super.disconnectedCallback(); this.unsubscribe?.();this.securityUnsubscribe?.();this.closeUnsubscribe?.(); window.removeEventListener('keydown', this.keydown); this.removeEventListener('contextmenu', this.appearanceMenu); clearTimeout(this.notificationTimer); }
    private appearanceMenu = (event: Event) => {
        const target = event.composedPath().find(node => node instanceof HTMLElement && node.hasAttribute('data-design-id')) as HTMLElement | undefined;
        if (!target)
            return;
        event.preventDefault();
        this.appearanceTarget = target;
        this.appearanceId = target.dataset.designId || '';
        this.appearanceOpen = true;
    };
    private keydown = (event: KeyboardEvent) => {
        if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'f') {
            event.preventDefault();
            this.paletteItems = this.data?.catalog.commands || [];
            this.paletteOpen = !this.paletteOpen;
        }
        if (event.key === 'Escape') {
            this.paletteOpen = false;
            this.repositoryOpen = false;
            this.review = false;
        }
    };
    private async load() {
        try {
            this.closeUnsubscribe=window.material.onCloseRequested(()=>{this.saveDraft();if([...this.drafts.values()].some(v=>v.dirty)||this.operations.some(v=>v.status==='running'))this.closeAppOpen=true;else void window.material.window('confirm-close');});
            this.data = await window.material.bootstrap();
            this.filtered = this.data.catalog.commands;
            this.operations = this.data.operations;
            this.baseSettings=this.data.settings; this.applySettings(this.data.settings);
        this.securityStatus=await window.material.security('status') as SecurityStatus;
        this.securityUnsubscribe=window.material.onSecurity(s=>{this.securityStatus=s;this.effectiveSettings();});
        const vocabulary=await window.material.vocabulary('status');this.vocabularyEntries=vocabulary.entries??{};this.effectiveSettings();
            this.unsubscribe = window.material.onOperation(operation => {
                this.operations = [operation, ...this.operations.filter(item => item.id !== operation.id)];
                if (operation.status !== 'running')
                    this.notify(`${operation.commandId}: ${operation.status}`, operation.status === 'failed');
            });
        }
        catch (error) {
            this.error = this.errorText(error);
        }
    }
    private errorText(error: unknown) { return error instanceof Error ? error.message : String(error); }
    private notify(message: string, persistent = false) {
        this.notice = message;
        if (this.data)
            announce(message, this.data.settings);
        clearTimeout(this.notificationTimer);
        if (!persistent)
            this.notificationTimer = setTimeout(() => this.notice = '', 8000);
    }
    private applySettings(settings: AppSettings) { const dark=settings.theme==='dark'||(settings.theme==='system'&&matchMedia('(prefers-color-scheme: dark)').matches); const theme=themeFromSourceColor(argbFromHex(settings.seed)); applyTheme(theme,{target:document.documentElement,dark}); document.documentElement.style.setProperty('--mint',hexFromArgb((dark?theme.schemes.dark:theme.schemes.light).primary)); document.documentElement.dataset.motion = settings.motion && !settings.lowStimulation ? 'on' : 'off'; document.documentElement.style.fontSize = `${settings.fontScale * 100}%`; document.documentElement.style.setProperty('--md-ref-typeface-plain', settings.fontFamily);  document.documentElement.dataset.theme = dark?'dark':'light'; document.documentElement.dataset.focus = String(settings.focus); document.documentElement.dataset.lowStimulation = String(settings.lowStimulation); document.documentElement.dataset.oneThing = String(settings.oneThing); document.documentElement.dataset.density = settings.density; }
    private effectiveSettings(){if(!this.data||!this.baseSettings)return;const settings=this.securityStatus?.schoolMode.active?{...this.baseSettings,language:'en' as const,narrationLanguage:'en' as const,englishHumor:1,cantoneseHumor:1,emojis:false}:this.baseSettings;this.data={...this.data,settings};setPersonalVocabulary(this.securityStatus?.schoolMode.active?{}:this.vocabularyEntries);this.applySettings(settings);}
    private settingsChanged(event: CustomEvent<AppSettings>) {
        if (this.data) {
            this.data = { ...this.data, settings: event.detail };
            this.baseSettings=event.detail;this.effectiveSettings();
        }
    }
    private async switchLane(lane: string) {
        this.saveDraft();
        this.lane = lane;
        if (lane === 'history') {
            try {
                this.historyEntries = await window.material.history();
            }
            catch (error) {
                this.notify(this.errorText(error), true);
            }
        }
    }
    private saveDraft() { if (this.selected) {
        const previous = this.drafts.get(this.selected.id);
        this.drafts.set(this.selected.id, { values: { ...this.values }, args: { ...this.args }, dirty: previous?.dirty || false });
    } }
    private closeTab(id: string, discard = false) {
        this.saveDraft();
        if (this.drafts.get(id)?.dirty && !discard) {
            this.closeTabId = id;
            return;
        }
        this.tabs = this.tabs.filter(tab => tab !== id);
        this.drafts.delete(id);
        this.closeTabId = '';
        if (this.selected?.id === id) {
            this.selected = undefined;
            this.values = {};
            this.args = {};
            const next = this.data?.catalog.commands.find(command => command.id === this.tabs.at(-1));
            if (next)
                this.openCommand(next);
        }
    }
    private openCommand(command: CommandDefinition) {
        this.saveDraft();
        this.selected = command;
        const draft = this.drafts.get(command.id);
        this.values = draft ? { ...draft.values } : {};
        this.args = draft ? { ...draft.args } : {};
        if (!draft) {
            for (const option of command.options)
                if (option.default !== undefined)
                    this.values[option.name] = option.default;
            for (const argument of command.arguments)
                if (argument.default !== undefined)
                    this.args[argument.name] = argument.default;
            if (command.jsonFields?.length && command.options.some(option => option.name === 'json')) {
                const preferred = ['number', 'title', 'name', 'state', 'url', 'headRefName', 'updatedAt', 'status', 'conclusion', 'login'];
                const fields = preferred.filter(field => command.jsonFields!.includes(field));
                this.values.json = fields.length ? fields : command.jsonFields.slice(0, 8);
            }
            this.drafts.set(command.id, { values: { ...this.values }, args: { ...this.args }, dirty: false });
        }
        this.lane = 'commands';
        this.tabs = [...new Set([...this.tabs, command.id])];
        this.review = false;
        this.resultPage = 1;
        this.paletteOpen = false;
        this.entityChoices = {};
    }
    private async filter(event: Event, target: 'catalog' | 'palette') {
        const search = event.target as Search;
        const commands = this.data?.catalog.commands || [];
        const matches = await search.matchValues(commands.map(command => `${command.title} ${command.path.join(' ')} ${command.summary} ${command.group}`));
        if (target === 'catalog') {
            this.filtered = commands.filter((_, index) => matches[index]);
            this.catalogPage = 1;
        }
        else
            this.paletteItems = commands.filter((_, index) => matches[index]);
    }
    private async repositories() {
        try {
            const result = await window.material.choices('repository', { page: this.repoPage, query: this.repositoryQuery });
            this.repositoryPageItems = result.items;
            this.repositoryChoices = result.items;
            this.repoNext = result.hasNext;
            this.repositoryOpen = true;
        }
        catch (error) {
            this.notify(this.errorText(error), true);
        }
    }
    private async repositoryFilter(event: Event) {
        const search = event.target as Search;
        if (search.regex) {
            const result = await search.matchValues(this.repositoryPageItems.map(choice => `${choice.label} ${choice.detail || ''}`));
            this.repositoryChoices = this.repositoryPageItems.filter((_, i) => result[i]);
        }
        else {
            try {
                this.repoPage = 1;
                this.repositoryQuery = search.query;
                const result = await window.material.choices('repository', { query: search.query, page: 1 });
                this.repositoryPageItems = result.items;
                this.repositoryChoices = result.items;
                this.repoNext = result.hasNext;
            }
            catch (error) {
                this.notify(this.errorText(error), true);
            }
        }
    }
    private setValue(option: CommandOption, value: unknown, argument: boolean) {
        if (this.selected) {
            const draft = this.drafts.get(this.selected.id);
            this.drafts.set(this.selected.id, { values: { ...this.values }, args: { ...this.args }, dirty: true });
        }
        if (argument)
            this.args = { ...this.args, [option.name]: value };
        else
            this.values = { ...this.values, [option.name]: value };
    }
    private async pick(option: CommandOption, argument: boolean) {
        try {
            const files = await window.material.pick(option.type === 'directory' ? 'directory' : 'file', { multiple: option.multiple });
            if (files.length)
                this.setValue(option, option.multiple ? files : files[0], argument);
        }
        catch (error) {
            this.notify(this.errorText(error), true);
        }
    }
    private async entities(option: CommandOption, query = '', page = 1) {
        try {
            const source=option.entity==='project'&&'position' in option?'project-number':option.entity||option.name;
            const result = await window.material.choices(source, { repository: typeof this.values.repo==='string'?this.values.repo:(this.data?.repository || undefined), query, page });
            this.entityChoices = { ...this.entityChoices, [option.name]: result.items };
            this.entityPages = { ...this.entityPages, [option.name]: { page, hasNext: result.hasNext, query,notice:result.notice } };
        }
        catch (error) {
            this.notify(this.errorText(error), true);
        }
    }
    private field(option: CommandOption, argument = false) {
        const value = (argument ? this.args : this.values)[option.name];
        const label = `${argument ? '' : '--'}${option.name}${option.required ? ' · required' : ''}`;
        return html `<mg-surface class="field" data-design-id=${`field-${this.selected?.id}-${argument ? 'argument' : 'option'}-${option.name}`}><mg-layout spread><mg-text>${label}</mg-text><mg-text kind="muted">${option.type}</mg-text></mg-layout><mg-text kind="muted">${option.description}</mg-text>${option.type === 'boolean' ? html `<md-switch aria-label=${label} .selected=${Boolean(value)} @change=${(e: Event) => this.setValue(option, (e.target as unknown as {
            selected: boolean;
        }).selected, argument)}></md-switch>` : option.type === 'choice' ? html `<md-filled-select label=${label} .value=${String(value || '')} @change=${(e: Event) => this.setValue(option, (e.target as HTMLSelectElement).value, argument)}><md-select-option value=""><div slot="headline">Not specified</div></md-select-option>${(option.choices || []).map(choice => html `<md-select-option .value=${choice}><div slot="headline">${choice}</div></md-select-option>`)}</md-filled-select>` : option.type === 'multi-choice' ? html `<mg-layout>${(option.choices || []).map(choice => html `<md-filter-chip label=${choice} .selected=${Array.isArray(value) && value.includes(choice)} @click=${() => { const items = Array.isArray(value) ? value : []; this.setValue(option, items.includes(choice) ? items.filter(item => item !== choice) : [...items, choice], argument); }}></md-filter-chip>`)}</mg-layout>` : option.type === 'number' && option.minimum !== undefined && option.maximum !== undefined ? html `<md-slider aria-label=${label} .min=${option.minimum} .max=${option.maximum} .value=${Number(value ?? option.minimum)} labeled @input=${(e: Event) => this.setValue(option, Number((e.target as HTMLInputElement).value), argument)}></md-slider><mg-text kind="muted">${value ?? option.minimum} · range ${option.minimum}–${option.maximum}</mg-text>` : option.type === 'file' || option.type === 'directory' ? html `<mg-layout><md-outlined-button @click=${() => this.pick(option, argument)}>Choose ${option.type}</md-outlined-button><mg-text kind="code">${Array.isArray(value) ? value.join('\n') : String(value || 'No path selected')}</mg-text></mg-layout>` : option.type === 'entity' ? html `<mg-layout><md-outlined-button @click=${() => this.entities(option)}>Load available ${option.entity || option.name}</md-outlined-button><mg-text kind="code">${String(value || 'Nothing selected')}</mg-text></mg-layout><mg-search label=${`Filter ${option.entity || option.name}`} @search-change=${async (e: Event) => {
            const search = e.target as Search;
            if (search.regex) {
                const items = this.entityChoices[option.name] || [];
                const matches = await search.matchValues(items.map(item => item.label));
                this.entityChoices = { ...this.entityChoices, [option.name]: items.filter((_, i) => matches[i]) };
            }
            else
                await this.entities(option, search.query);
        }}></mg-search><mg-layout>${(this.entityChoices[option.name] || []).map(choice => html `<md-filter-chip label=${choice.label} .selected=${option.multiple?Array.isArray(value)&&value.includes(choice.value):value === choice.value} @click=${() => {const items=Array.isArray(value)?value:[];this.setValue(option,option.multiple?(items.includes(choice.value)?items.filter(v=>v!==choice.value):[...items,choice.value]):choice.value,argument);}}></md-filter-chip>`)}</mg-layout><mg-layout><md-text-button ?disabled=${(this.entityPages[option.name]?.page || 1) <= 1} @click=${() => {
            const state = this.entityPages[option.name];
            if (state)
                void this.entities(option, state.query, state.page - 1);
        }}>Previous choices</md-text-button><mg-text kind="muted">Page ${this.entityPages[option.name]?.page || 1}</mg-text><mg-text kind="muted">${this.entityPages[option.name]?.notice||'Regex filters the currently loaded choices.'}</mg-text><md-text-button ?disabled=${!this.entityPages[option.name]?.hasNext} @click=${() => {
            const state = this.entityPages[option.name];
            if (state)
                void this.entities(option, state.query, state.page + 1);
        }}>Next choices</md-text-button></mg-layout>` : html `<md-outlined-text-field label=${label} type=${option.type === 'secret' ? 'password' : option.type === 'number' ? 'number' : option.type === 'multiline' ? 'textarea' : 'text'} .value=${Array.isArray(value) ? value.join('\n') : String(value ?? '')} @input=${(e: Event) => { const text = (e.target as HTMLInputElement).value; this.setValue(option, option.type === 'number' ? Number(text) : option.multiple ? text.split('\n').filter(Boolean) : text, argument); }}></md-outlined-text-field>${option.multiple ? html `<mg-text kind="muted">One value per line.</mg-text>` : nothing}`}</mg-surface>`;
    }
    private validate() {
        if (!this.selected)
            return false;
        for (const [fields, values] of [[this.selected.arguments, this.args], [this.selected.options, this.values]] as const) {
            const missing = fields.find(field => field.required && (values[field.name] === undefined || values[field.name] === '' || (Array.isArray(values[field.name]) && !(values[field.name] as unknown[]).length)));
            if (missing) {
                this.notify(`${missing.name} is required.`);
                return false;
            }
        }
        return true;
    }
    private safetyKey(key: 'one' | 'two', selected: boolean) { if (key === 'one')
        this.keyOne = selected;
    else
        this.keyTwo = selected; if (!this.keyOne || !this.keyTwo)
        this.confirmation = 0; }
    private async run(confirmed = false) {
        if (confirmed && this.selected?.destructive && (!this.keyOne || !this.keyTwo || this.confirmation !== 100)) {
            this.notify('Complete both acknowledgement keys and move the confirmation slider to 100.', true);
            return;
        }
        if (this.busy || !this.selected || this.operations.some(operation => operation.commandId === this.selected!.id && operation.status === 'running') || !this.validate())
            return;
        if ((this.selected.mutation || this.selected.destructive) && !confirmed) {
            this.review = true;
            this.keyOne = false;
            this.keyTwo = false;
            this.confirmation = 0;
            return;
        }
        this.busy = true;
        try {
            const operation = await window.material.execute({ commandId: this.selected.id, values: this.values, args: this.args, cwd:this.workingDirectory||undefined, repository: this.selected.options.some(option => option.name === 'repo') ? (this.data?.repository || undefined) : undefined, confirmed });
            this.operations = [operation, ...this.operations.filter(item => item.id !== operation.id)];
            this.review = false;
            this.notify(operation.status === 'running' ? 'Operation started. Live output appears below.' : `Operation ${operation.status}.`, operation.status === 'failed');
        }
        catch (error) {
            this.notify(this.errorText(error), true);
        }
        finally {
            this.busy = false;
        }
    }
    private toggleRecord(key: string) { const expanded = new Set(this.expandedRecords); if (expanded.has(key))
        expanded.delete(key);
    else
        expanded.add(key); this.expandedRecords = expanded; }
    private externalValue(value: unknown): string | undefined {
        if (typeof value !== 'string')
            return;
        try {
            const url = new URL(value);
            if ((url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password)
                return url.href;
        }
        catch { }
        return;
    }
    private readableValue(value: unknown): string {
        if (value === null || value === undefined)
            return 'Not provided';
        if (Array.isArray(value))
            return value.map(item => this.readableValue(item)).join(', ');
        if (typeof value === 'object') {
            const record = value as Record<string, unknown>;
            return String(record.name || record.login || record.title || record.value || JSON.stringify(value));
        }
        return String(value);
    }
    private record(row: unknown, key: string, index: number) {
        if (!row || typeof row !== 'object')
            return html `<mg-surface class="result-row"><mg-text>${this.readableValue(row)}</mg-text></mg-surface>`;
        const record = row as Record<string, unknown>;
        const expanded = this.expandedRecords.has(key);
        const title = record.title || record.name || record.login || record.displayTitle || `Record ${index + 1}`;
        const entries = Object.entries(record).filter(([field]) => !['title', 'name', 'login', 'displayTitle', 'body'].includes(field));
        const status = record.state || record.status || record.conclusion;
        return html `<mg-surface class="result-row"><mg-layout spread><mg-text kind="title">${this.readableValue(title)}</mg-text>${status ? html `<md-assist-chip label=${this.readableValue(status)}></md-assist-chip>` : nothing}</mg-layout>
            <mg-layout grid class="gap">${entries.slice(0, expanded ? entries.length : 6).map(([field, value]) => html `<mg-layout column><mg-text kind="eyebrow">${field}</mg-text>${this.externalValue(value) ? html `<md-text-button @click=${() => window.material.openExternal(this.externalValue(value)!)}>Open ${field}</md-text-button>` : html `<mg-text kind="muted">${this.readableValue(value).slice(0, expanded ? 10000 : 200)}</mg-text>`}</mg-layout>`)}</mg-layout>
            ${record.body ? html `<mg-text kind="muted" class="gap">${this.readableValue(record.body).slice(0, expanded ? 10000 : 240)}</mg-text>` : nothing}
            <md-text-button aria-expanded=${expanded} @click=${() => this.toggleRecord(key)}>${expanded ? 'Show less' : 'Show all fields and metadata'}</md-text-button>
            ${expanded ? html `<mg-text kind="code">${JSON.stringify(row, null, 2)}</mg-text>` : nothing}</mg-surface>`;
    }
    private result(operation: Operation) {
        const rows = Array.isArray(operation.data) ? operation.data : operation.data !== undefined ? [operation.data] : [];
        const pages = Math.max(1, Math.ceil(rows.length / 20));
        const page = Math.min(this.resultPage, pages);
        return html `<mg-surface class="result" data-design-id=${`result-${operation.commandId}`}><mg-layout spread><mg-text kind="title">${operation.commandId}</mg-text><mg-text class="badge">${operation.status}${operation.exitCode !== undefined ? ` · exit ${operation.exitCode}` : ''}</mg-text></mg-layout><mg-text kind="muted">Started ${new Date(operation.startedAt).toLocaleString()}${operation.endedAt ? ` · Finished ${new Date(operation.endedAt).toLocaleString()}` : ''}</mg-text>${operation.status === 'running' ? html `<md-linear-progress indeterminate aria-label="Operation is running; output streams below"></md-linear-progress><md-outlined-button @click=${async () => {
            try {
                await window.material.cancel(operation.id);
            }
            catch (error) {
                this.notify(this.errorText(error), true);
            }
        }}>Cancel operation</md-outlined-button>` : nothing}${rows.length ? html `<mg-text kind="eyebrow" class="gap">Structured result · ${rows.length} records</mg-text>${rows.slice((page - 1) * 20, page * 20).map((row, index) => this.record(row, `${operation.id}-${(page - 1) * 20 + index}`, (page - 1) * 20 + index))}<mg-layout spread class="page-controls"><md-outlined-button ?disabled=${page <= 1} @click=${() => this.resultPage = page - 1}>${this.copy('previous')}</md-outlined-button><mg-text kind="muted">Page ${page} of ${pages}</mg-text><md-outlined-button ?disabled=${page >= pages} @click=${() => this.resultPage = page + 1}>${this.copy('next')}</md-outlined-button></mg-layout>` : nothing}${operation.stdout ? html `<md-text-button class="gap" aria-expanded=${!rows.length || this.expandedRecords.has(`${operation.id}-stdout`)} @click=${() => this.toggleRecord(`${operation.id}-stdout`)}>${rows.length ? 'Inspect raw standard output' : 'Standard output'}</md-text-button>${!rows.length || this.expandedRecords.has(`${operation.id}-stdout`) ? html `<mg-text kind="code">${operation.stdout}</mg-text>` : nothing}` : nothing}${operation.stderr ? html `<mg-text kind="eyebrow" class="gap danger">Diagnostic output</mg-text><mg-text kind="code">${operation.stderr}</mg-text>` : nothing}${operation.truncated ? html `<mg-text kind="muted">Output was truncated by the execution limit.</mg-text>` : nothing}<mg-layout class="gap"><md-text-button @click=${() => window.material.exportData(operation, 'json')}>Export JSON</md-text-button>${rows.length ? html `<md-text-button @click=${() => window.material.exportData(rows, 'csv')}>Export CSV</md-text-button>` : nothing}</mg-layout></mg-surface>`;
    }
    private card(command: CommandDefinition) { return html `<mg-surface class="card" data-design-id=${`command-card-${command.id}`}><mg-layout spread><mg-text kind="eyebrow">${command.group}</mg-text>${command.destructive ? html `<mg-text class="badge danger">Destructive</mg-text>` : command.mutation ? html `<mg-text class="badge">Changes data</mg-text>` : nothing}</mg-layout><mg-text kind="title">${command.title}</mg-text><mg-text kind="muted">${command.summary}</mg-text><mg-text kind="code">gh ${command.path.join(' ')}</mg-text>${command.availability ? html `<mg-text kind="muted">${command.availability}</mg-text>` : nothing}<md-text-button @click=${() => this.openCommand(command)}>${this.copy('openCommand')}</md-text-button></mg-surface>`; }
    private home() {
        const data = this.data!;
        return html `<mg-surface class="hero"><mg-text kind="eyebrow">Your development workspace</mg-text><mg-text kind="title">${data.account ? `Welcome, ${data.account}.` : 'A clear view of your next move.'}</mg-text><mg-text kind="muted">Guided GitHub CLI commands, live results, and deliberate changes.</mg-text><mg-layout class="gap"><md-filled-button @click=${() => this.switchLane('commands')}>Explore commands</md-filled-button><md-filled-tonal-button @click=${() => this.repositories()}>Choose repository</md-filled-tonal-button><md-filled-tonal-button @click=${() => this.switchLane('tools')}>Open utilities</md-filled-tonal-button></mg-layout></mg-surface><mg-layout grid class="cards"><mg-surface><mg-text kind="eyebrow">Repository</mg-text><mg-text kind="title">${data.repository || 'Choose your workspace'}</mg-text><mg-text kind="muted">${data.repository ? 'Command forms use this repository context.' : 'Select a repository to load contextual entity pickers.'}</mg-text><md-text-button @click=${() => this.repositories()}>Change repository</md-text-button></mg-surface><mg-surface><mg-text kind="eyebrow">Connection</mg-text><mg-text kind="title">${data.authenticated ? 'Authenticated' : 'Authentication required'}</mg-text><mg-text kind="muted">${data.ghVersion || 'GitHub CLI is unavailable'} · ${data.platform}</mg-text><md-text-button @click=${() => {
            const command = data.catalog.commands.find(item => item.path.join(' ') === 'auth status');
            if (command)
                this.openCommand(command);
            else
                this.notify('Authentication status is not available in the installed catalog.');
        }}>Inspect authentication</md-text-button></mg-surface><mg-surface><mg-text kind="eyebrow">Catalog</mg-text><mg-text kind="title">${data.catalog.commands.length} command definitions</mg-text><mg-text kind="muted">${data.catalog.source}. Metadata reflects this installed catalog; Some workflows remain unavailable; see each command’s availability before use.</mg-text></mg-surface></mg-layout>${data.settings.timeAwareness ? html `<mg-surface class="gap"><mg-text kind="muted">Session time awareness · ${new Date().toLocaleTimeString()} · ${Intl.DateTimeFormat().resolvedOptions().timeZone}</mg-text></mg-surface>` : nothing}${data.settings.momentum ? html `<mg-surface class="gap"><mg-text kind="muted">Momentum · ${this.operations.filter(item => item.status === 'succeeded').length} completed operations this session.</mg-text></mg-surface>` : nothing}${data.settings.currentTask ? html `<mg-surface class="gap"><mg-text>Current task: ${data.settings.currentTask}</mg-text></mg-surface>` : nothing}<mg-text kind="eyebrow" class="gap">Recent activity</mg-text>${this.operations.length ? this.operations.slice(0, 3).map(operation => this.result(operation)) : html `<mg-surface class="gap"><mg-text kind="muted">No operations recorded in this session. Open a command to get started.</mg-text></mg-surface>`}`;
    }
    private commands() {
        const command = this.selected;
        return html `${this.tabs.length ? html `<md-tabs role="tablist" class="tabs" .activeTabIndex=${Math.max(0, this.tabs.indexOf(command?.id || ''))} @change=${(event: Event) => {
            const index = (event.target as unknown as {
                activeTabIndex: number;
            }).activeTabIndex;
            const item = this.data!.catalog.commands.find(item => item.id === this.tabs[index]);
            if (item)
                this.openCommand(item);
        }}>${this.tabs.map(id => html `<md-primary-tab role="tab" aria-selected=${id===command?.id?'true':'false'} .active=${id === command?.id}>${this.data!.catalog.commands.find(item => item.id === id)?.title || id}</md-primary-tab>`)}</md-tabs><mg-layout>${this.tabs.map(id => html `<md-text-button aria-label=${`Close ${this.data!.catalog.commands.find(item => item.id === id)?.title || id} tab`} @click=${() => this.closeTab(id)}>Close ${this.data!.catalog.commands.find(item => item.id === id)?.title || id}</md-text-button>`)}</mg-layout>` : nothing}${command ? html `<mg-layout spread><mg-text kind="title">${command.title}</mg-text><md-text-button @click=${() => { this.saveDraft(); this.selected = undefined; }}>${this.copy('backToCatalog')}</md-text-button></mg-layout><mg-text kind="muted">${command.description}</mg-text><mg-text kind="code" class="command-usage gap">${command.usage}</mg-text>${command.interactive ? html `<mg-surface class="gap"><mg-text kind="muted">This command may require interactive terminal input. Guided execution is limited to the metadata and options shown here.</mg-text></mg-surface>` : nothing}<mg-layout grid class="command-form">${command.arguments.map(argument => this.field(argument, true))}${command.options.map(option => this.field(option))}</mg-layout><mg-layout><md-filled-button ?disabled=${this.busy || this.operations.some(operation => operation.commandId === command.id && operation.status === 'running')} @click=${() => this.run()}>${command.mutation ? this.copy('reviewChanges') : this.copy('runCommand')}</md-filled-button><md-outlined-button @click=${() => { this.values = {}; this.args = {}; }}>Clear inputs</md-outlined-button><mg-text kind="muted">${this.data!.repository || 'No repository context'}</mg-text></mg-layout>${this.operations.filter(operation => operation.commandId === command.id).slice(0, 5).map(operation => this.result(operation))}` : html `<mg-search label="Search commands, families, and descriptions" @search-change=${(event: Event) => this.filter(event, 'catalog')}></mg-search><mg-layout class="gap">${[...new Set(this.data!.catalog.commands.map(item => item.group))].map(group => html `<md-filter-chip label=${group} @click=${() => { this.catalogPage = 1; this.filtered = this.data!.catalog.commands.filter(item => item.group === group); }}></md-filter-chip>`)}<md-text-button @click=${() => { this.catalogPage = 1; this.filtered = this.data!.catalog.commands; }}>All families</md-text-button></mg-layout><mg-text kind="muted" class="gap">${this.filtered.length} definitions · Catalog ${this.data!.catalog.version}</mg-text><mg-layout grid class="cards">${this.filtered.slice((this.catalogPage - 1) * 36, this.catalogPage * 36).map(item => this.card(item))}</mg-layout><mg-layout spread class="page-controls"><md-outlined-button ?disabled=${this.catalogPage <= 1} @click=${() => this.catalogPage--}>Previous commands</md-outlined-button><mg-text kind="muted">Page ${this.catalogPage} of ${Math.max(1, Math.ceil(this.filtered.length / 36))}</mg-text><md-outlined-button ?disabled=${this.catalogPage * 36 >= this.filtered.length} @click=${() => this.catalogPage++}>Next commands</md-outlined-button></mg-layout>`}`;
    }
    render() {
        if (!this.data)
            return html `<mg-surface><mg-text kind="title">Material Git</mg-text>${this.error ? html `<mg-text role="alert">${this.error}</mg-text><md-filled-button @click=${() => this.load()}>Retry connection</md-filled-button>` : html `<md-linear-progress indeterminate aria-label="Loading installed command catalog"></md-linear-progress>`}</mg-surface>`;
        const data = this.data;
        const running = this.operations.filter(item => item.status === 'running').length;
        return html `<mg-layout spread class="titlebar" data-design-id="workspace-titlebar"><mg-text class="brand">${data.settings.displayName} <mg-text kind="muted">Developer workspace</mg-text></mg-text><mg-layout><md-text-button @click=${() => { this.paletteItems = data.catalog.commands; this.paletteOpen = true; }}>Command palette <mg-text class="key">Ctrl+Shift+F</mg-text></md-text-button><md-icon-button aria-label="Minimize window" @click=${() => window.material.window('minimize')}><md-icon>−</md-icon></md-icon-button><md-icon-button aria-label="Maximize or restore window" @click=${() => window.material.window('maximize')}><md-icon>□</md-icon></md-icon-button><md-icon-button aria-label="Close window" @click=${() => window.material.window('close')}><md-icon>×</md-icon></md-icon-button></mg-layout></mg-layout><mg-surface plain class="shell"><mg-surface plain class="rail"><mg-text kind="eyebrow">${this.copy('workspace')}</mg-text><mg-layout column>${[['home', this.copy('home')], ['commands', this.copy('commands')], ['jobs', `${this.copy('operations')}${running ? ` (${running})` : ''}`], ['accounts', this.copy('accounts')], ['history', this.copy('history')], ['tools', this.copy('utilities')], ['security', this.securityStatus?.schoolMode.displayName||'Access preferences'], ['updates', this.copy('updates')], ['settings', t('settings', data.settings)]].map(([lane, label]) => this.lane === lane ? html `<md-filled-tonal-button data-design-id=${`workspace-${lane}`} @click=${() => this.switchLane(lane)}>${label}</md-filled-tonal-button>` : html `<md-text-button data-design-id=${`workspace-${lane}`} @click=${() => this.switchLane(lane)}>${label}</md-text-button>`)}</mg-layout><mg-surface plain class="rail-bottom"><mg-text kind="eyebrow">${this.copy('commandFamilies')}</mg-text><mg-layout column>${[...new Set(data.catalog.commands.map(command => command.group))].slice(0, 14).map(group => html `<md-text-button @click=${() => { this.lane = 'commands'; this.selected = undefined; this.catalogPage = 1; this.filtered = data.catalog.commands.filter(command => command.group === group); }}>${group}</md-text-button>`)}</mg-layout></mg-surface><mg-text kind="muted" class="gap">Version ${data.version}</mg-text><mg-text kind="muted">Updated ${data.builtAt && !Number.isNaN(Date.parse(data.builtAt)) ? new Date(data.builtAt).toLocaleString(undefined, { timeZoneName: 'short', hour12: false }) : 'build provenance unavailable'}</mg-text></mg-surface><mg-surface plain class="main" data-design-id="workspace-main"><mg-layout><md-text-button @click=${async()=>{const paths=await window.material.pick('directory');if(paths[0])this.workingDirectory=paths[0];}}>Choose working folder</md-text-button><mg-text kind="muted">${this.workingDirectory||'Application working folder'}</mg-text></mg-layout><mg-text kind="muted" class="provenance">Version ${data.version} · Updated ${data.builtAt?new Date(data.builtAt).toLocaleString(undefined,{timeZoneName:'short',hour12:false}):'build provenance unavailable'}</mg-text><mg-layout spread class="heading"><mg-layout column><mg-text kind="eyebrow">${data.repository || 'Personal workspace'}</mg-text><mg-text kind="title">${this.lane === 'home' ? this.copy('overview') : this.lane === 'jobs' ? this.copy('operations') : this.lane === 'settings' ? t('settings', data.settings) : this.lane[0].toUpperCase() + this.lane.slice(1)}</mg-text></mg-layout><md-outlined-button data-design-id="repository-picker" @click=${() => this.repositories()}>${this.copy('repositoryPicker')}</md-outlined-button></mg-layout>${this.lane === 'home' ? this.home() : this.lane === 'commands' ? this.commands() : this.lane === 'settings' ? html `<mg-settings @vocabulary-change=${(event:CustomEvent<Record<string,string>>)=>{this.vocabularyEntries=event.detail;this.effectiveSettings();}} .schoolMode=${this.securityStatus?.schoolMode.active??false} .settings=${data.settings} @settings-change=${(event: CustomEvent<AppSettings>) => this.settingsChanged(event)}></mg-settings>` : this.lane === 'security' ? html`<mg-security .settings=${data.settings}></mg-security>` : this.lane === 'updates' ? html`<mg-updates @restart-request=${()=>{if([...this.drafts.values()].some(v=>v.dirty)||this.operations.some(v=>v.status==='running'))this.notify('Close or complete command drafts and running operations before restarting.',true);else void window.material.updates('restart');}}></mg-updates>` : this.lane === 'accounts' ? html`<mg-accounts @authentication-change=${(event:CustomEvent<import('../shared/types').AuthAccount[]>)=>{const active=event.detail.find(v=>v.active&&v.state==='success');this.data={...data,authenticated:!!active,account:active?.login||null};}}></mg-accounts>` : this.lane === 'tools' ? html `<mg-tools .settings=${data.settings} .schoolMode=${this.securityStatus?.schoolMode.active??false}></mg-tools>` : this.lane === 'history' ? html `<mg-text kind="muted">Local settings history. Personal vocabulary payloads and file metadata are omitted.</mg-text>${this.historyEntries.length ? this.historyEntries.map(entry => html `<mg-surface class="gap"><mg-text>${entry.action}</mg-text><mg-text kind="muted">${new Date(entry.at).toLocaleString()}</mg-text></mg-surface>`) : html `<mg-surface class="gap"><mg-text kind="muted">No local history entries.</mg-text></mg-surface>`}` : html `${this.operations.length ? this.operations.map(operation => this.result(operation)) : html `<mg-surface><mg-text kind="muted">No operations yet. Running commands report live output here and in their command tab.</mg-text></mg-surface>`}`}</mg-surface></mg-surface>${this.repositoryOpen ? html `<md-dialog open @closed=${() => this.repositoryOpen = false}><mg-text slot="headline">Choose repository</mg-text><mg-layout slot="content" column><mg-search label="Search repositories" @search-change=${(event: Event) => this.repositoryFilter(event)}></mg-search><md-list>${this.repositoryChoices.map(choice => html `<md-list-item type="button" @click=${() => { this.data = { ...data, repository: choice.value }; this.repositoryOpen = false; this.notify(`Repository context: ${choice.value}`); }}><div slot="headline">${choice.label}</div><div slot="supporting-text">${choice.detail || choice.value}</div></md-list-item>`)}</md-list>${!this.repositoryChoices.length ? html `<mg-text kind="muted">No repositories returned. Check authentication or refine your search.</mg-text>` : nothing}<mg-layout spread><md-outlined-button ?disabled=${this.repoPage === 1} @click=${() => { this.repoPage--; void this.repositories(); }}>${this.copy('previous')}</md-outlined-button><mg-text>Page ${this.repoPage}</mg-text><md-outlined-button ?disabled=${!this.repoNext} @click=${() => { this.repoPage++; void this.repositories(); }}>${this.copy('next')}</md-outlined-button></mg-layout></mg-layout><md-text-button slot="actions" @click=${() => this.repositoryOpen = false}>${this.copy('close')}</md-text-button></md-dialog>` : nothing}${this.paletteOpen ? html `<md-dialog open class="palette" @closed=${() => this.paletteOpen = false}><mg-text slot="headline">Go to a command or workspace</mg-text><mg-layout slot="content" column><mg-search label="Find commands" @search-change=${(event: Event) => this.filter(event, 'palette')}></mg-search><mg-layout>${['home', 'history', 'tools', 'settings'].map(lane => html `<md-assist-chip label=${lane === 'settings' ? t('settings', data.settings) : lane} @click=${() => { void this.switchLane(lane); this.paletteOpen = false; }}></md-assist-chip>`)}</mg-layout><md-list>${this.paletteItems.slice(0, 80).map(command => html `<md-list-item type="button" @click=${() => this.openCommand(command)}><div slot="headline">${command.title}</div><div slot="supporting-text">${command.summary}</div><div slot="trailing-supporting-text">${command.group}</div></md-list-item>`)}</md-list></mg-layout><md-text-button slot="actions" @click=${() => this.paletteOpen = false}>${this.copy('close')}</md-text-button></md-dialog>` : nothing}${this.review && this.selected ? html `<md-dialog open @closed=${() => this.review = false}><mg-text slot="headline">${this.selected.destructive ? 'Confirm destructive action' : 'Review changes'}</mg-text><mg-layout slot="content" column><mg-text>This runs gh ${this.selected.path.join(' ')}${data.repository ? ` in ${data.repository}` : ''}.</mg-text><mg-text kind="muted">${this.selected.description}</mg-text><mg-text kind="code">${JSON.stringify({ arguments: Object.fromEntries(Object.entries(this.args).map(([key, value]) => [key, this.selected!.arguments.some(argument => argument.name === key && argument.type === 'secret') ? '[redacted]' : value])), options: Object.fromEntries(Object.entries(this.values).map(([key, value]) => [key, this.selected!.options.some(option => option.name === key && option.type === 'secret') ? '[redacted]' : value])) }, null, 2)}</mg-text>${this.selected.destructive ? html `<mg-layout><md-switch aria-label="I checked the target and selected arguments" .selected=${this.keyOne} @change=${(e: Event) => this.safetyKey('one', (e.target as unknown as {
            selected: boolean;
        }).selected)}></md-switch><mg-text>I checked the target and selected arguments.</mg-text></mg-layout><mg-layout><md-switch aria-label="I understand this action may permanently remove data" .selected=${this.keyTwo} @change=${(e: Event) => this.safetyKey('two', (e.target as unknown as {
            selected: boolean;
        }).selected)}></md-switch><mg-text>I understand this action may permanently remove data.</mg-text></mg-layout><mg-text kind="muted">Move the confirmation slider to 100 to enable execution.</mg-text><md-slider ?disabled=${!this.keyOne || !this.keyTwo} aria-label="Destructive action confirmation" min="0" max="100" step="1" labeled .value=${this.confirmation} @input=${(e: Event) => this.confirmation = Number((e.target as HTMLInputElement).value)}></md-slider>` : nothing}</mg-layout><md-text-button slot="actions" @click=${() => this.review = false}>${this.copy('cancel')}</md-text-button><md-filled-button slot="actions" ?disabled=${this.busy || (this.selected.destructive && (!this.keyOne || !this.keyTwo || this.confirmation !== 100))} @click=${() => this.run(true)}>Confirm and run</md-filled-button></md-dialog>` : nothing}${this.closeAppOpen?html`<md-dialog open @closed=${()=>this.closeAppOpen=false}><mg-text slot="headline">Close Material Git?</mg-text><mg-text slot="content">Edited command inputs will be discarded. Running operations will be cancelled. Remote changes already completed cannot be undone.</mg-text><md-text-button slot="actions" @click=${()=>this.closeAppOpen=false}>Keep working</md-text-button><md-filled-button slot="actions" @click=${()=>window.material.window('confirm-close')}>Discard drafts and close</md-filled-button></md-dialog>`:nothing}${this.closeTabId ? html `<md-dialog open @closed=${() => this.closeTabId = ''}><mg-text slot="headline">Close command tab?</mg-text><mg-text slot="content">This tab has edited inputs. Discarding closes the tab and clears its draft. Running operations continue.</mg-text><md-text-button slot="actions" @click=${() => this.closeTabId = ''}>Keep tab</md-text-button><md-filled-button slot="actions" @click=${() => this.closeTab(this.closeTabId, true)}>Discard draft and close</md-filled-button></md-dialog>` : nothing}${this.appearanceOpen ? html `<md-dialog open @closed=${() => this.appearanceOpen = false}><mg-text slot="headline">Element appearance</mg-text><mg-appearance slot="content" .target=${this.appearanceTarget} .targetId=${this.appearanceId}></mg-appearance><md-text-button slot="actions" @click=${() => this.appearanceOpen = false}>${this.copy('close')}</md-text-button></md-dialog>` : nothing}${this.notice ? html `<mg-surface class="notice" role="status" aria-live="polite"><mg-layout spread><mg-text>${this.notice}</mg-text><md-text-button @click=${() => this.notice = ''}>Dismiss</md-text-button></mg-layout></mg-surface>` : nothing}`;
    }
}
customElements.define('mg-app', MaterialApp);
