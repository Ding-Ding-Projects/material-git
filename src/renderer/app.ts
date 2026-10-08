import { LitElement, html, nothing } from './material';
import './components';
import './workbench';
import {installNativeScrollbarStyles} from './scroll-surface';
import { Search } from './components';
import './settings';
import './tools';
import './converters';
import './accounts';
import './api-explorer';
import './cli-config';
import './updates';
import './security';
import type {SecurityStatus} from '../shared/security';
import {argbFromHex,themeFromSourceColor,applyTheme,hexFromArgb} from '@material/material-color-utilities';
import './appearance';
import { restoreAppearance } from './appearance';
import { t, announce, setPersonalVocabulary } from './localization';
import type { Bootstrap, CommandDefinition, CommandOption, Operation, Choice, HistoryEntry, AppSettings } from '../shared/types';
export class MaterialApp extends LitElement {
    static properties = { configBusy:{state:true},configDirty:{state:true}, apiBusy:{state:true},apiDirty:{state:true}, explorerWidth:{state:true}, dockHeight:{state:true}, explorerVisible:{state:true}, dockVisible:{state:true}, dockTab:{state:true}, activeOperation:{state:true}, activeGroup:{state:true}, fieldMatches:{state:true}, closeAppOpen:{state:true}, workingDirectory:{state:true}, securityStatus: { state: true }, data: { state: true }, lane: { state: true }, selected: { state: true }, filtered: { state: true }, repositoryChoices: { state: true }, repoPage: { state: true }, repoNext: { state: true }, repositoryOpen: { state: true }, paletteOpen: { state: true }, paletteItems: { state: true }, values: { state: true }, args: { state: true }, operations: { state: true }, historyEntries: { state: true }, notice: { state: true }, error: { state: true }, review: { state: true }, keyOne: { state: true }, keyTwo: { state: true }, confirmation: { state: true }, busy: { state: true }, resultPage: { state: true }, tabs: { state: true }, entityChoices: { state: true }, catalogPage: { state: true }, entityPages: { state: true }, appearanceTarget: { state: true }, appearanceId: { state: true }, appearanceOpen: { state: true }, closeTabId: { state: true }, expandedRecords: { state: true } };
    data?: Bootstrap;
    closeAppOpen=false;workingDirectory='';apiBusy=false;apiDirty=false;configBusy=false;configDirty=false;
    private closeUnsubscribe?:()=>void;
    private scrollbarCleanup?:()=>void;
    securityStatus?:SecurityStatus;
    private baseSettings?:AppSettings;
    private vocabularyEntries:Record<string,string>={};
    private securityUnsubscribe?:()=>void;
    lane = 'home';
    explorerWidth=250;dockHeight=210;explorerVisible=true;dockVisible=true;dockTab='activity';activeOperation='';activeGroup='';fieldMatches:string[]|null=null;
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
    connectedCallback() { super.connectedCallback(); this.scrollbarCleanup=installNativeScrollbarStyles(document); void this.load(); window.addEventListener('keydown', this.keydown); window.addEventListener('api-work-state',this.apiWorkState); window.addEventListener('cli-config-work-state',this.configWorkState); this.addEventListener('contextmenu', this.appearanceMenu); }
    disconnectedCallback() { super.disconnectedCallback(); this.scrollbarCleanup?.(); this.unsubscribe?.();this.securityUnsubscribe?.();this.closeUnsubscribe?.(); window.removeEventListener('keydown', this.keydown); window.removeEventListener('api-work-state',this.apiWorkState); window.removeEventListener('cli-config-work-state',this.configWorkState); this.removeEventListener('contextmenu', this.appearanceMenu); clearTimeout(this.notificationTimer); }
    private configWorkState=(event:Event)=>{const detail=(event as CustomEvent<{busy?:boolean;dirty?:boolean}>).detail;if(detail){this.configBusy=detail.busy===true;this.configDirty=detail.dirty===true;}};
    private apiWorkState=(event:Event)=>{const detail=(event as CustomEvent<{busy?:boolean;dirty?:boolean}>).detail;if(detail){this.apiBusy=detail.busy===true;this.apiDirty=detail.dirty===true;}};
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
            this.closeUnsubscribe=window.material.onCloseRequested(()=>{this.saveDraft();if(this.configBusy){this.notify('Wait for the CLI configuration operation to finish before closing.',true);return;}if(this.apiBusy){this.notify('An API request is still running. Wait for it to finish before closing; requests time out within 60 seconds.',true);return;}if(this.configDirty||this.apiDirty||[...this.drafts.values()].some(v=>v.dirty)||this.operations.some(v=>v.status==='running'))this.closeAppOpen=true;else void window.material.window('confirm-close');});
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
        this.fieldMatches=null;
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
    private numericField(option:CommandOption,argument:boolean,value:unknown,label:string){
        const min=option.minimum??Number.MIN_SAFE_INTEGER,max=option.maximum??Number.MAX_SAFE_INTEGER;
        const everydayMin=Math.max(min,0),everydayMax=Math.min(max,Math.max(everydayMin+1,100,Math.min(1000,Number(option.default)||0)));
        const current=value===undefined?undefined:Number(value),valid=current===undefined||(Number.isSafeInteger(current)&&current>=min&&current<=max);
        const change=(number:number|undefined)=>this.setValue(option,number,argument);
        const presets=[...new Set([everydayMin,10,30,50,100,Number(option.default)].filter(number=>Number.isSafeInteger(number)&&number>=min&&number<=max))].sort((a,b)=>a-b);
        return html`<md-slider aria-label=${`${label} everyday range`} .min=${everydayMin} .max=${everydayMax} .value=${Math.max(everydayMin,Math.min(everydayMax,current??Number(option.default??everydayMin)))} labeled @input=${(event:Event)=>change(Number((event.target as HTMLInputElement).value))}></md-slider><mg-text kind="muted">Everyday slider: ${everydayMin} to ${everydayMax}.${current!==undefined&&(current<everydayMin||current>everydayMax)?` Exact value ${current} is outside this slider range; exact entry remains active.`:''}</mg-text><mg-layout><md-outlined-button aria-label=${`Decrease ${option.name} by one`} ?disabled=${current!==undefined&&(!valid||current<=min)} @click=${()=>change(Math.max(min,(current??Number(option.default??everydayMin))-1))}>−1</md-outlined-button><md-outlined-text-field label=${`${label} exact value`} type="number" .min=${String(min)} .max=${String(max)} step="1" .value=${value===undefined?'':String(value)} .error=${!valid} .errorText=${`Enter a whole number from ${min} to ${max}.`} supporting-text=${`Full range: ${min} to ${max}. Blank leaves this option unspecified.`} @input=${(event:Event)=>{const text=(event.target as HTMLInputElement).value;change(text===''?undefined:Number(text));}}></md-outlined-text-field><md-outlined-button aria-label=${`Increase ${option.name} by one`} ?disabled=${current!==undefined&&(!valid||current>=max)} @click=${()=>change(Math.min(max,(current??Number(option.default??everydayMin))+1))}>+1</md-outlined-button></mg-layout><mg-layout aria-label=${`${option.name} presets`}>${presets.map(number=>html`<md-filter-chip label=${String(number)} .selected=${current===number} @click=${()=>change(number)}></md-filter-chip>`)}</mg-layout>`;
    }
    private entityError(value:unknown,option:CommandOption):string{
        if(value===undefined||value==='')return '';const items=Array.isArray(value)?value:[value];if(items.length>100)return 'Use at most 100 identifiers.';
        for(const item of items){if(typeof item!=='string'||item.length>2048||!item.trim()||/[\u0000-\u001f\u007f]/.test(item)||item.startsWith('-'))return 'Use a nonempty identifier, without control characters or a leading dash.';
            if(item.includes('://')){if(!['issue','pull-request','repository','gist'].includes(option.entity||''))return 'This field expects a name or identifier, not a URL.';try{const url=new URL(item);if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||!url.hostname||url.pathname==='/')return 'Use an HTTPS GitHub resource URL without credentials, a query, or a fragment.';}catch{return 'Enter a valid HTTPS resource URL.';}}
        }return '';
    }
    private directEntity(option:CommandOption,argument:boolean,value:unknown,label:string){const error=this.entityError(value,option);return html`<mg-text kind="muted">Alternatively enter a known ${option.entity==='user'?'username or team name':option.entity||'identifier'}${['issue','pull-request','repository','gist'].includes(option.entity||'')?', or a supported HTTPS resource URL':''}. The picker above is the primary route. Format is checked here; GitHub verifies existence and access when the command runs.${option.multiple?' Use one identifier per line.':''}</mg-text><md-outlined-text-field label=${`${label} direct identifier (optional)`} type=${option.multiple?'textarea':'text'} .value=${Array.isArray(value)?value.join('\n'):String(value??'')} .error=${Boolean(error)} .errorText=${error} @input=${(event:Event)=>{const text=(event.target as HTMLInputElement).value;this.setValue(option,option.multiple?text.split('\n').map(item=>item.trim()).filter(Boolean):text.trim(),argument);}}></md-outlined-text-field>`;}
    private dedicatedRoute(command:CommandDefinition):{lane:string;label:string;reason:string}|undefined{
        if(command.path[0]==='auth'&&['login','status','switch','logout','refresh','setup-git'].includes(command.path[1]))return {lane:'accounts',label:'Open Accounts',reason:'Use Accounts for sign-in, verified status, switching, permission refresh, Git authentication setup, and removal. Authentication output stays out of command history.'};
        if(command.path[0]==='config'&&customElements.get('mg-cli-config'))return {lane:'cli-config',label:'Open CLI configuration',reason:'Use the guided CLI configuration panel to inspect, edit, and verify settings.'};
        if(command.path[0]==='api'&&customElements.get('mg-api-explorer'))return {lane:'api',label:'Open API Explorer',reason:'Use API Explorer for endpoint details, guided parameters, review, and structured results.'};
    }
    private blockedReason(command:CommandDefinition):string{
        if(this.dedicatedRoute(command)||!command.interactive)return '';
        if(command.id==='auth token')return 'Token display is intentionally unavailable. Open Accounts to inspect identity and authorization without exposing credentials.';
        return `${command.availability||'This command requires an interactive terminal and cannot run in the guided runner.'} Run this command in an external terminal or choose a supported command.`;
    }
    private field(option: CommandOption, argument = false) {
        const value = (argument ? this.args : this.values)[option.name];
        const label = `${argument ? '' : '--'}${option.name}${option.required ? ' · required' : ''}`;
        return html `<mg-surface class="field" data-design-id=${`field-${this.selected?.id}-${argument ? 'argument' : 'option'}-${option.name}`}><mg-layout spread><mg-text>${label}</mg-text><mg-text kind="muted">${option.type}</mg-text></mg-layout><mg-text kind="muted">${option.description}${option.name==='body'&&this.selected?.options.some(field=>field.name==='body-file')?' You may choose a body-file instead of entering text.':''}</mg-text>${option.type === 'boolean' ? html `<md-switch aria-label=${label} .selected=${Boolean(value)} @change=${(e: Event) => this.setValue(option, (e.target as unknown as {
            selected: boolean;
        }).selected, argument)}></md-switch>` : option.type === 'choice' ? html `<md-filled-select label=${label} .value=${String(value || '')} @change=${(e: Event) => this.setValue(option, (e.target as HTMLSelectElement).value, argument)}><md-select-option value="" ?selected=${value===undefined||value===''}><div slot="headline">Not specified</div></md-select-option>${(option.choices || []).map(choice => html `<md-select-option .value=${choice} ?selected=${String(value)===choice}><div slot="headline">${choice}</div></md-select-option>`)}</md-filled-select>` : option.type === 'multi-choice' ? html `<mg-layout>${(option.choices || []).map(choice => html `<md-filter-chip label=${choice} .selected=${Array.isArray(value) && value.includes(choice)} @click=${() => { const items = Array.isArray(value) ? value : []; this.setValue(option, items.includes(choice) ? items.filter(item => item !== choice) : [...items, choice], argument); }}></md-filter-chip>`)}</mg-layout>` : option.type === 'number' ? this.numericField(option,argument,value,label) : option.type === 'file' || option.type === 'directory' ? html `<mg-layout><md-outlined-button @click=${() => this.pick(option, argument)}>Choose ${option.type}</md-outlined-button><mg-text kind="code">${Array.isArray(value) ? value.join('\n') : String(value || 'No path selected')}</mg-text></mg-layout>` : option.type === 'entity' ? html `<mg-layout><md-outlined-button @click=${() => this.entities(option)}>Load available ${option.entity || option.name}</md-outlined-button><mg-text kind="code">${String(value || 'Nothing selected')}</mg-text></mg-layout><mg-search label=${`Filter ${option.entity || option.name}`} @search-change=${async (e: Event) => {
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
        }}>Next choices</md-text-button></mg-layout>${this.directEntity(option,argument,value,label)}` : html `<md-outlined-text-field label=${label} type=${option.type === 'secret' ? 'password' : option.type === 'multiline' ? 'textarea' : 'text'} .value=${Array.isArray(value) ? value.join('\n') : String(value ?? '')} @input=${(e: Event) => { const text = (e.target as HTMLInputElement).value; this.setValue(option, option.multiple ? text.split('\n').filter(Boolean) : text, argument); }}></md-outlined-text-field>${option.multiple ? html `<mg-text kind="muted">One value per line.</mg-text>` : nothing}`}</mg-surface>`;
    }
    private validate() {
        if (!this.selected)
            return false;
        for (const [fields, values] of [[this.selected.arguments, this.args], [this.selected.options, this.values]] as const) {
            const missing = fields.find(field => field.required && !(field.name==='body'&&values===this.values&&this.values['body-file']) && (values[field.name] === undefined || values[field.name] === '' || (Array.isArray(values[field.name]) && !(values[field.name] as unknown[]).length)));
            if (missing) {
                this.notify(`${missing.name} is required.`);
                return false;
            }
        }
        for(const [fields,values] of [[this.selected.arguments,this.args],[this.selected.options,this.values]] as const){for(const field of fields){const value=values[field.name];if(value===undefined||value==='')continue;if(field.type==='number'&&(!Number.isSafeInteger(value)||Number(value)<(field.minimum??Number.MIN_SAFE_INTEGER)||Number(value)>(field.maximum??Number.MAX_SAFE_INTEGER))){this.notify(`${field.name}: enter a whole number from ${field.minimum??Number.MIN_SAFE_INTEGER} to ${field.maximum??Number.MAX_SAFE_INTEGER}.`,true);return false;}if(field.type==='entity'){const error=this.entityError(value,field);if(error){this.notify(`${field.name}: ${error}`,true);return false;}}}}
        return true;
    }
    private safetyKey(key: 'one' | 'two', selected: boolean) { if (key === 'one')
        this.keyOne = selected;
    else
        this.keyTwo = selected; if (!this.keyOne || !this.keyTwo)
        this.confirmation = 0; }
    private async run(confirmed = false) {
        if(this.selected){const route=this.dedicatedRoute(this.selected);if(route){void this.switchLane(route.lane);return;}const blocked=this.blockedReason(this.selected);if(blocked){this.notify(blocked,true);return;}}
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
            this.activeOperation=operation.id;this.dockVisible=true;this.dockTab='output';
            this.notify(operation.status === 'running' ? 'Operation started. Live output appears in the output panel.' : `Operation ${operation.status}.`, operation.status === 'failed');
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
    private taskTabKey(event:KeyboardEvent){if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;const tabs=[...this.querySelectorAll<HTMLElement>('.task-tab-row md-text-button[data-task-tab]')];const current=event.composedPath().find(node=>tabs.includes(node as HTMLElement)) as HTMLElement;const index=tabs.indexOf(current);if(index<0)return;event.preventDefault();const target=tabs[event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length];target.click();target.focus();}
    private group(group: string) {
        this.saveDraft();this.activeGroup=group;this.lane='home';this.catalogPage=1;
        this.filtered=group?this.data!.catalog.commands.filter(command=>command.group===group):this.data!.catalog.commands;
    }
    private commandRow(command:CommandDefinition){const route=this.dedicatedRoute(command),blocked=this.blockedReason(command);return html`<md-list-item class="command-row" type="button" data-design-id=${`command-${command.id}`} @click=${()=>this.openCommand(command)}><mg-icon slot="start" name=${command.mutation?'branch':'command'}></mg-icon><div slot="headline">${command.title}</div><div slot="supporting-text">${blocked||command.summary}</div><mg-text slot="trailing-supporting-text" class=${command.destructive&&!route?'danger':''}>${blocked?'Unavailable':route?'Dedicated panel':command.destructive?'Destructive':command.mutation?'Write':'Read'}</mg-text></md-list-item>`;}
    private home() {return html`<mg-layout spread class="document-heading"><mg-layout column><mg-text kind="title">${this.activeGroup?`${this.activeGroup} commands`:'Command catalog'}</mg-text><mg-text kind="muted">Choose a command to open its guided form in a task tab.</mg-text></mg-layout><mg-text class="count-label">${this.filtered.length} commands</mg-text></mg-layout><mg-surface plain class="catalog-search"><mg-search search-id="catalog" label="Search commands" @search-change=${(event:Event)=>{this.activeGroup='';void this.filter(event,'catalog');}}></mg-search></mg-surface><mg-layout spread class="table-heading"><mg-text>COMMAND / DESCRIPTION</mg-text><mg-text>ACCESS</mg-text></mg-layout><md-list class="command-list">${this.filtered.map(command=>this.commandRow(command))}</md-list>${!this.filtered.length?html`<mg-text class="empty" kind="muted">No matching commands. Adjust the search or choose a command family.</mg-text>`:nothing}<mg-text class="catalog-footnote" kind="muted">Catalog ${this.data!.catalog.version}. Each form states its availability; some workflows remain incomplete.</mg-text>`;}
    private commands() {
        const command=this.selected;if(!command)return this.home();const route=this.dedicatedRoute(command),blocked=this.blockedReason(command);
        const matches=(field:CommandOption,argument=false)=>this.fieldMatches===null||this.fieldMatches.includes(`${argument?'argument':'option'}:${field.name}`);
        return html`<mg-layout spread class="document-heading"><mg-layout column><mg-text kind="eyebrow">${command.group} / ${command.mutation?'Change data':'Read data'}</mg-text><mg-text kind="title">${command.title}</mg-text></mg-layout>${command.destructive?html`<mg-text class="badge danger">Destructive</mg-text>`:nothing}<md-text-button @click=${()=>this.group(command.group)}>Browse family</md-text-button></mg-layout><mg-text kind="muted">${command.description}</mg-text><mg-text kind="code" class="command-usage">${command.usage}</mg-text>${route||blocked||command.availability?html`<mg-surface class="availability"><mg-text kind="muted">${route?.reason||blocked||command.availability}</mg-text></mg-surface>`:nothing}<mg-search class="field-search" search-id=${`fields-${command.id}`} label="Find arguments and options" @search-change=${async(event:Event)=>{const fields=[...command.arguments.map(field=>({field,key:`argument:${field.name}`})),...command.options.map(field=>({field,key:`option:${field.name}`}))];const matches=await(event.target as Search).matchValues(fields.map(({field})=>`${field.name} ${field.description}`));this.fieldMatches=fields.filter((_,i)=>matches[i]).map(item=>item.key);}}></mg-search><mg-layout grid class="command-form">${command.arguments.filter(field=>matches(field,true)).map(field=>this.field(field,true))}${command.options.filter(field=>matches(field)).map(field=>this.field(field))}</mg-layout>${!command.arguments.length&&!command.options.length?html`<mg-text class="empty" kind="muted">This command needs no inputs. Run it to inspect the result.</mg-text>`:nothing}<mg-layout class="command-actions"><md-filled-button ?disabled=${Boolean(blocked)||this.busy||this.operations.some(operation=>operation.commandId===command.id&&operation.status==='running')} title=${blocked||route?.reason||'Run this guided command'} @click=${()=>this.run()}><mg-icon slot="icon" name="play"></mg-icon>${route?.label||(blocked?'Unavailable in guided runner':command.mutation?this.copy('reviewChanges'):this.copy('runCommand'))}</md-filled-button><md-outlined-button @click=${()=>{this.values={};this.args={};}}>Clear inputs</md-outlined-button><mg-text kind="muted">${this.data!.repository||'No repository selected'}</mg-text></mg-layout>`;
    }
    private navigation(){return [['home','home','Catalog'],['jobs','activity',this.copy('operations')],['accounts','account',this.copy('accounts')],['history','history',this.copy('history')],['api','branch','GitHub API'],['cli-config','settings','CLI configuration'],['tools','tools',this.copy('utilities')],['security','shield','Access'],['updates','update',this.copy('updates')],['settings','settings',t('settings',this.data!.settings)]].filter(([lane])=>lane==='api'?Boolean(customElements.get('mg-api-explorer')):lane==='cli-config'?Boolean(customElements.get('mg-cli-config')):true);}
    private document(){const data=this.data!;return this.lane==='home'?this.home():this.lane==='commands'?this.commands():this.lane==='settings'?html`<mg-settings @vocabulary-change=${(event:CustomEvent<Record<string,string>>)=>{this.vocabularyEntries=event.detail;this.effectiveSettings();}} .schoolMode=${this.securityStatus?.schoolMode.active??false} .settings=${data.settings} @settings-change=${(event:CustomEvent<AppSettings>)=>this.settingsChanged(event)}></mg-settings>`:this.lane==='security'?html`<mg-security .settings=${data.settings}></mg-security>`:this.lane==='updates'?html`<mg-updates @restart-request=${()=>{if(this.configBusy||this.configDirty||this.apiBusy||this.apiDirty||[...this.drafts.values()].some(v=>v.dirty)||this.operations.some(v=>v.status==='running'))this.notify(this.configBusy?'Wait for CLI configuration to finish before restarting.':this.apiBusy?'An API request is still running. Wait for it to finish before restarting; requests time out within 60 seconds.':'Discard or complete command, API, and CLI configuration drafts and running operations before restarting.',true);else void window.material.updates('restart');}}></mg-updates>`:this.lane==='accounts'?html`<mg-accounts @authentication-change=${(event:CustomEvent<import('../shared/types').AuthAccount[]>)=>{const active=event.detail.find(v=>v.active&&v.state==='success');this.data={...data,authenticated:!!active,account:active?.login||null};}}></mg-accounts>`:this.lane==='api'?html`<mg-api-explorer .settings=${data.settings} .schoolMode=${this.securityStatus?.schoolMode.active??false}></mg-api-explorer>`:this.lane==='cli-config'?html`<mg-cli-config .settings=${data.settings} .schoolMode=${this.securityStatus?.schoolMode.active??false}></mg-cli-config>`:this.lane==='tools'?html`<mg-tools .settings=${data.settings} .schoolMode=${this.securityStatus?.schoolMode.active??false}></mg-tools>`:this.lane==='history'?html`<mg-text class="document-heading" kind="title">Local history</mg-text><mg-text kind="muted">Settings changes on this device. Personal vocabulary payloads and file metadata are omitted.</mg-text>${this.historyEntries.length?this.historyEntries.map(entry=>html`<mg-surface class="gap"><mg-text>${entry.action}</mg-text><mg-text kind="muted">${new Date(entry.at).toLocaleString()}</mg-text></mg-surface>`):html`<mg-text class="empty" kind="muted">No local history entries.</mg-text>`}`:html`<mg-text class="document-heading" kind="title">Operations</mg-text>${this.operations.length?this.operations.map(operation=>this.result(operation)):html`<mg-text class="empty" kind="muted">No operations yet. Open a command from the explorer to begin.</mg-text>`}`;}
    private dock(){const operation=this.operations.find(item=>item.id===this.activeOperation)||this.operations[0];return html`<mg-surface plain class="dock" data-design-id="operation-dock"><mg-layout spread class="dock-toolbar"><md-tabs role="tablist" aria-label="Operation inspector" .activeTabIndex=${this.dockTab==='output'?1:0} @change=${(event:Event)=>this.dockTab=(event.target as unknown as {activeTabIndex:number}).activeTabIndex===1?'output':'activity'}><md-primary-tab role="tab" aria-selected=${this.dockTab==='activity'}>Activity ${this.operations.length?`(${this.operations.length})`:''}</md-primary-tab><md-primary-tab role="tab" aria-selected=${this.dockTab==='output'}>Output</md-primary-tab></md-tabs><md-icon-button aria-label="Hide operation inspector" title="Hide operation inspector" @click=${()=>this.dockVisible=false}><mg-icon name="close"></mg-icon></md-icon-button></mg-layout><mg-scroll class="dock-scroll" label="Operation inspector">${this.dockTab==='output'?(operation?this.result(operation):html`<mg-layout class="dock-empty"><mg-icon name="command"></mg-icon><mg-text kind="muted">Run a command to inspect its output here.</mg-text></mg-layout>`):this.operations.length?html`<md-list>${this.operations.map(item=>html`<md-list-item type="button" @click=${()=>{this.activeOperation=item.id;this.dockTab='output';}}><mg-icon slot="start" name=${item.status==='succeeded'?'check':'activity'}></mg-icon><div slot="headline">${item.commandId}</div><div slot="supporting-text">${new Date(item.startedAt).toLocaleTimeString()}</div><div slot="trailing-supporting-text">${item.status}</div></md-list-item>`)}</md-list>`:html`<mg-layout class="dock-empty"><mg-icon name="activity"></mg-icon><mg-layout column><mg-text>No operations this session</mg-text><mg-text kind="muted">Commands report progress, results, and cancellation here.</mg-text></mg-layout></mg-layout>`}</mg-scroll></mg-surface>`;}
    render() {
        if (!this.data)
            return html `<mg-surface><mg-text kind="title">Material Git</mg-text>${this.error ? html `<mg-text role="alert">${this.error}</mg-text><md-filled-button @click=${() => this.load()}>Retry connection</md-filled-button>` : html `<md-linear-progress indeterminate aria-label="Loading installed command catalog"></md-linear-progress>`}</mg-surface>`;
        const data = this.data;
        const running = this.operations.filter(item => item.status === 'running').length;
        return html`<mg-layout spread class="titlebar" data-design-id="workspace-titlebar"><mg-layout class="window-brand"><mg-icon name="branch"></mg-icon><mg-text class="brand">${data.settings.displayName}</mg-text><mg-text class="window-context" kind="muted">${data.repository||'No repository selected'}</mg-text></mg-layout><mg-layout class="window-actions"><md-text-button class="palette-trigger" @click=${()=>{this.paletteItems=data.catalog.commands;this.paletteOpen=true;}}><mg-icon slot="icon" name="search"></mg-icon>Command palette <mg-text class="key">Ctrl+Shift+F</mg-text></md-text-button><md-icon-button aria-label="Minimize window" @click=${()=>window.material.window('minimize')}><mg-icon name="minus"></mg-icon></md-icon-button><md-icon-button aria-label="Maximize or restore window" @click=${()=>window.material.window('maximize')}><mg-icon name="square"></mg-icon></md-icon-button><md-icon-button aria-label="Close window" @click=${()=>window.material.window('close')}><mg-icon name="close"></mg-icon></md-icon-button></mg-layout></mg-layout>
        <mg-layout spread class="context-toolbar" data-design-id="workspace-toolbar"><mg-layout><md-icon-button aria-label="Toggle command explorer" title="Toggle command explorer" aria-pressed=${this.explorerVisible} @click=${()=>this.explorerVisible=!this.explorerVisible}><mg-icon name="panel"></mg-icon></md-icon-button><md-text-button data-design-id="repository-picker" @click=${()=>this.repositories()}><mg-icon slot="icon" name="repo"></mg-icon>${data.repository||this.copy('repositoryPicker')}</md-text-button><md-text-button title=${this.workingDirectory||'Choose working folder'} @click=${async()=>{const paths=await window.material.pick('directory');if(paths[0])this.workingDirectory=paths[0];}}><mg-icon slot="icon" name="folder"></mg-icon>${this.workingDirectory?this.workingDirectory.split(/[\\/]/).at(-1):'Working folder'}</md-text-button></mg-layout><mg-layout><md-icon-button aria-label="Toggle operation inspector" title="Toggle operation inspector" aria-pressed=${this.dockVisible} @click=${()=>this.dockVisible=!this.dockVisible}><mg-icon name="bottom"></mg-icon></md-icon-button><md-filled-tonal-button class="account-action" @click=${()=>this.switchLane('accounts')}><mg-icon slot="icon" name="account"></mg-icon>${data.authenticated?data.account||'Accounts':'Sign in to GitHub'}</md-filled-tonal-button></mg-layout></mg-layout>
        <mg-surface plain class="workbench" style=${`--explorer-width:${this.explorerVisible?this.explorerWidth:0}px;--splitter-width:${this.explorerVisible?4:0}px;--dock-height:${this.dockVisible?this.dockHeight:0}px;--dock-divider:${this.dockVisible?4:0}px`}>
        <mg-surface plain class="activity-rail" aria-label="Workspace navigation">${this.navigation().map(([lane,icon,label])=>html`<md-icon-button aria-label=${label} title=${label} aria-pressed=${this.lane===lane||(lane==='home'&&this.lane==='commands')} class=${this.lane===lane||(lane==='home'&&this.lane==='commands')?'active':''} data-design-id=${`workspace-${lane}`} @click=${()=>this.switchLane(lane)}><mg-icon name=${icon}></mg-icon></md-icon-button>`)}</mg-surface>
        ${this.explorerVisible?html`<mg-surface plain class="explorer" data-design-id="command-explorer"><mg-layout spread class="panel-heading"><mg-text kind="eyebrow">Explorer</mg-text><mg-text class="count-label">${data.catalog.commands.length}</mg-text></mg-layout><md-text-button class="all-commands" @click=${()=>this.group('')}><mg-icon slot="icon" name="command"></mg-icon>All commands</md-text-button><mg-layout class="explorer-label"><mg-text kind="eyebrow">Command families</mg-text></mg-layout><mg-scroll class="explorer-scroll" label="Command families"><md-list>${[...new Set(data.catalog.commands.map(item=>item.group))].map(group=>html`<md-list-item type="button" class=${this.activeGroup===group?'selected-family':''} @click=${()=>this.group(group)}><mg-icon slot="start" name=${group===this.activeGroup?'down':'chevron'}></mg-icon><div slot="headline">${group}</div><div slot="trailing-supporting-text">${data.catalog.commands.filter(item=>item.group===group).length}</div></md-list-item>`)}</md-list></mg-scroll><mg-surface plain class="explorer-context"><mg-text kind="eyebrow">Repository scope</mg-text><mg-text kind="muted">${data.repository||'Choose a repository for contextual entity pickers.'}</mg-text><md-text-button @click=${()=>this.repositories()}>${data.repository?'Change repository':'Select repository'}</md-text-button></mg-surface></mg-surface><mg-splitter class="explorer-splitter" axis="vertical" label="Command explorer width" .value=${this.explorerWidth} min="190" max="380" @resize-panel=${(event:CustomEvent<number>)=>this.explorerWidth=Math.max(190,Math.min(380,this.explorerWidth+event.detail))}></mg-splitter>`:nothing}
        <mg-surface plain class="document-workspace" data-design-id="workspace-main"><mg-scroll class="document-tabs" label="Open task tabs" horizontal><mg-layout class="task-tab-row" role="tablist" aria-label="Open task documents" @keydown=${(event:KeyboardEvent)=>this.taskTabKey(event)}><md-text-button data-task-tab role="tab" aria-selected=${this.lane==='home'} tabindex=${this.lane==='home'?0:-1} class=${this.lane==='home'?'task-tab active':'task-tab'} @click=${()=>this.switchLane('home')}><mg-icon slot="icon" name="command"></mg-icon>Catalog</md-text-button>${this.tabs.map(id=>html`<mg-layout class=${this.lane==='commands'&&this.selected?.id===id?'task-tab-group active':'task-tab-group'}><md-text-button data-task-tab role="tab" aria-selected=${this.lane==='commands'&&this.selected?.id===id} tabindex=${this.lane==='commands'&&this.selected?.id===id?0:-1} @click=${()=>{const command=data.catalog.commands.find(item=>item.id===id);if(command)this.openCommand(command);}}>${data.catalog.commands.find(item=>item.id===id)?.title||id}${this.drafts.get(id)?.dirty?' •':''}</md-text-button><md-icon-button aria-label=${`Close ${data.catalog.commands.find(item=>item.id===id)?.title||id} tab`} @click=${()=>this.closeTab(id)}><mg-icon name="close"></mg-icon></md-icon-button></mg-layout>`)}${!['home','commands'].includes(this.lane)?html`<md-text-button data-task-tab role="tab" aria-selected="true" tabindex="0" class="task-tab active">${this.navigation().find(([lane])=>lane===this.lane)?.[2]||this.lane}</md-text-button>`:nothing}</mg-layout></mg-scroll><mg-scroll class="document-scroll" label="Task document"><mg-surface plain class="document-content">${this.document()}</mg-surface></mg-scroll>${this.dockVisible?html`<mg-splitter class="dock-splitter" axis="horizontal" label="Operation inspector height" .value=${this.dockHeight} min="110" .max=${Math.max(120,window.innerHeight*.55)} @resize-panel=${(event:CustomEvent<number>)=>this.dockHeight=Math.max(110,Math.min(window.innerHeight*.55,this.dockHeight-event.detail))}></mg-splitter>${this.dock()}`:nothing}</mg-surface></mg-surface>
        <mg-layout spread class="statusbar" data-design-id="workspace-status"><mg-layout><mg-text class="connection-state">${data.authenticated?'Connected':'Not signed in'}</mg-text><mg-text>${running?`${running} running`:'Ready'}</mg-text>${data.settings.currentTask?html`<mg-text>${data.settings.currentTask}</mg-text>`:nothing}</mg-layout><mg-layout><mg-text>v${data.version}</mg-text><mg-text class="build-time">Updated ${data.builtAt&&!Number.isNaN(Date.parse(data.builtAt))?new Date(data.builtAt).toLocaleString(undefined,{timeZoneName:'short',hour12:false}):'build provenance unavailable'}</mg-text></mg-layout></mg-layout>${this.repositoryOpen ? html `<md-dialog open @closed=${() => this.repositoryOpen = false}><mg-text slot="headline">Choose repository</mg-text><mg-layout slot="content" column><mg-search label="Search repositories" @search-change=${(event: Event) => this.repositoryFilter(event)}></mg-search><md-list>${this.repositoryChoices.map(choice => html `<md-list-item type="button" @click=${() => { this.data = { ...data, repository: choice.value }; this.repositoryOpen = false; this.notify(`Repository context: ${choice.value}`); }}><div slot="headline">${choice.label}</div><div slot="supporting-text">${choice.detail || choice.value}</div></md-list-item>`)}</md-list>${!this.repositoryChoices.length ? html `<mg-text kind="muted">No repositories returned. Check authentication or refine your search.</mg-text>` : nothing}<mg-layout spread><md-outlined-button ?disabled=${this.repoPage === 1} @click=${() => { this.repoPage--; void this.repositories(); }}>${this.copy('previous')}</md-outlined-button><mg-text>Page ${this.repoPage}</mg-text><md-outlined-button ?disabled=${!this.repoNext} @click=${() => { this.repoPage++; void this.repositories(); }}>${this.copy('next')}</md-outlined-button></mg-layout></mg-layout><md-text-button slot="actions" @click=${() => this.repositoryOpen = false}>${this.copy('close')}</md-text-button></md-dialog>` : nothing}${this.paletteOpen ? html `<md-dialog open class="palette" @closed=${() => this.paletteOpen = false}><mg-text slot="headline">Go to a command or workspace</mg-text><mg-layout slot="content" column><mg-search label="Find commands" @search-change=${(event: Event) => this.filter(event, 'palette')}></mg-search><mg-layout>${this.navigation().map(([lane,,label]) => html `<md-assist-chip label=${label} @click=${() => { void this.switchLane(lane); this.paletteOpen = false; }}></md-assist-chip>`)}</mg-layout><md-list>${this.paletteItems.map(command => html `<md-list-item type="button" @click=${() => this.openCommand(command)}><div slot="headline">${command.title}</div><div slot="supporting-text">${command.summary}</div><div slot="trailing-supporting-text">${command.group}</div></md-list-item>`)}</md-list></mg-layout><md-text-button slot="actions" @click=${() => this.paletteOpen = false}>${this.copy('close')}</md-text-button></md-dialog>` : nothing}${this.review && this.selected ? html `<md-dialog open @closed=${() => this.review = false}><mg-text slot="headline">${this.selected.destructive ? 'Confirm destructive action' : 'Review changes'}</mg-text><mg-layout slot="content" column><mg-text>This runs gh ${this.selected.path.join(' ')}${data.repository ? ` in ${data.repository}` : ''}.</mg-text><mg-text kind="muted">${this.selected.description}</mg-text><mg-text kind="code">${JSON.stringify({ arguments: Object.fromEntries(Object.entries(this.args).map(([key, value]) => [key, this.selected!.arguments.some(argument => argument.name === key && argument.type === 'secret') ? '[redacted]' : value])), options: Object.fromEntries(Object.entries(this.values).map(([key, value]) => [key, this.selected!.options.some(option => option.name === key && option.type === 'secret') ? '[redacted]' : value])) }, null, 2)}</mg-text>${this.selected.destructive ? html `<mg-layout><md-switch aria-label="I checked the target and selected arguments" .selected=${this.keyOne} @change=${(e: Event) => this.safetyKey('one', (e.target as unknown as {
            selected: boolean;
        }).selected)}></md-switch><mg-text>I checked the target and selected arguments.</mg-text></mg-layout><mg-layout><md-switch aria-label="I understand this action may permanently remove data" .selected=${this.keyTwo} @change=${(e: Event) => this.safetyKey('two', (e.target as unknown as {
            selected: boolean;
        }).selected)}></md-switch><mg-text>I understand this action may permanently remove data.</mg-text></mg-layout><mg-text kind="muted">Move the confirmation slider to 100 to enable execution.</mg-text><md-slider ?disabled=${!this.keyOne || !this.keyTwo} aria-label="Destructive action confirmation" min="0" max="100" step="1" labeled .value=${this.confirmation} @input=${(e: Event) => this.confirmation = Number((e.target as HTMLInputElement).value)}></md-slider>` : nothing}</mg-layout><md-text-button slot="actions" @click=${() => this.review = false}>${this.copy('cancel')}</md-text-button><md-filled-button slot="actions" ?disabled=${this.busy || (this.selected.destructive && (!this.keyOne || !this.keyTwo || this.confirmation !== 100))} @click=${() => this.run(true)}>Confirm and run</md-filled-button></md-dialog>` : nothing}${this.closeAppOpen?html`<md-dialog open @closed=${()=>this.closeAppOpen=false}><mg-text slot="headline">Close Material Git?</mg-text><mg-text slot="content">Edited command, API, and CLI configuration inputs will be discarded. Running CLI operations will be cancelled. Remote changes already completed cannot be undone.</mg-text><md-text-button slot="actions" @click=${()=>this.closeAppOpen=false}>Keep working</md-text-button><md-filled-button slot="actions" ?disabled=${this.apiBusy||this.configBusy} @click=${()=>{if(this.apiBusy||this.configBusy)this.notify('Wait for the active API request to finish before closing.',true);else void window.material.window('confirm-close');}}>Discard drafts and close</md-filled-button></md-dialog>`:nothing}${this.closeTabId ? html `<md-dialog open @closed=${() => this.closeTabId = ''}><mg-text slot="headline">Close command tab?</mg-text><mg-text slot="content">This tab has edited inputs. Discarding closes the tab and clears its draft. Running operations continue.</mg-text><md-text-button slot="actions" @click=${() => this.closeTabId = ''}>Keep tab</md-text-button><md-filled-button slot="actions" @click=${() => this.closeTab(this.closeTabId, true)}>Discard draft and close</md-filled-button></md-dialog>` : nothing}${this.appearanceOpen ? html `<md-dialog open @closed=${() => this.appearanceOpen = false}><mg-text slot="headline">Element appearance</mg-text><mg-appearance slot="content" .target=${this.appearanceTarget} .targetId=${this.appearanceId}></mg-appearance><md-text-button slot="actions" @click=${() => this.appearanceOpen = false}>${this.copy('close')}</md-text-button></md-dialog>` : nothing}${this.notice ? html `<mg-surface class="notice" role="status" aria-live="polite"><mg-layout spread><mg-text>${this.notice}</mg-text><md-text-button @click=${() => this.notice = ''}>Dismiss</md-text-button></mg-layout></mg-surface>` : nothing}`;
    }
}
customElements.define('mg-app', MaterialApp);
