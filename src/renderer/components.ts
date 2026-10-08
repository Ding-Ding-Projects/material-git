import { LitElement, html, css, nothing } from './material';
import { RegexSession, escapeLiteral, supportedFlags, validateSnippets, REGEX_LIMITS, type RegexResponse, type RegexSnippet } from './regex-worker';
/** Registered composition surfaces keep document structure inside supported Lit internals. */
export class Surface extends LitElement {
    static styles = css `:host{display:block;min-width:0}section{background:var(--surface,#152422);border:1px solid var(--outline,#314843);border-radius:var(--mg-surface-radius,10px);padding:var(--mg-surface-padding,16px);box-sizing:border-box;height:100%;transition:background .2s,border-color .2s,box-shadow .2s} :host([plain]) section{display:contents;background:none;border:0;padding:0} @media(prefers-reduced-motion:reduce){*{transition:none!important}}`;
    render() { return html `<section><slot></slot></section>`; }
}
customElements.define('mg-surface', Surface);
export class Typography extends LitElement {
    static styles = css `:host{display:block;color:inherit} :host([kind=title]){font-size:20px;font-weight:600;letter-spacing:-.3px} :host([kind=eyebrow]){font-size:10px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:var(--mint,#9ee8cf)} :host([kind=muted]){color:var(--muted,#a6bbb4);font-size:12px;line-height:1.55} :host([kind=code]){white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.65 ui-monospace,monospace}`;
    render() { return html `<slot></slot>`; }
}
customElements.define('mg-text', Typography);
export class Layout extends LitElement {
    static styles = css `:host{display:block;min-width:0}div{display:flex;gap:var(--gap,12px);align-items:center;flex-wrap:wrap}:host([column]) div{flex-direction:column;align-items:stretch}:host([spread]) div{justify-content:space-between}:host([grid]) div{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));align-items:stretch}:host([scroll]){overflow:auto;max-height:100%}`;
    render() { return html `<div part="container"><slot></slot></div>`; }
}
customElements.define('mg-layout', Layout);
const REGEX_TOKENS: Record<string, {
    label: string;
    value: string;
    explanation: string;
    unsupported?: string;
}[]> = {
    tokens: [{ label: 'Any character', value: '.', explanation: 'One character; excludes line terminators unless s is enabled.' }, { label: 'Alternation', value: '|', explanation: 'Choose the expression on either side.' }, { label: 'Escaped newline', value: '\\n', explanation: 'A newline character.' }, { label: 'Escaped tab', value: '\\t', explanation: 'A tab character.' }, { label: 'Numbered backreference', value: '\\1', explanation: 'Match the text captured by group 1.' }, { label: 'Named backreference', value: '\\k<name>', explanation: 'Match a named group; replace name with the capture name.' }],
    groups: [{ label: 'Capturing group', value: '()', explanation: 'Capture the enclosed expression.' }, { label: 'Noncapturing group', value: '(?:)', explanation: 'Group without creating a numbered capture.' }, { label: 'Named capture', value: '(?<name>)', explanation: 'Capture with a name; use the name field below.' }, { label: 'Positive lookahead', value: '(?=)', explanation: 'Require following text without consuming it.' }, { label: 'Negative lookahead', value: '(?!)', explanation: 'Require that following text does not match.' }, { label: 'Positive lookbehind', value: '(?<=)', explanation: 'Require preceding text without consuming it.' }, { label: 'Negative lookbehind', value: '(?<!)', explanation: 'Require that preceding text does not match.' }, { label: 'Atomic group', value: '(?>)', explanation: 'Atomic groups prevent backtracking.', unsupported: 'JavaScript RegExp does not implement atomic groups.' }, { label: 'Conditional group', value: '(?(1))', explanation: 'Conditional groups branch on captures.', unsupported: 'JavaScript RegExp does not implement conditionals.' }],
    classes: [{ label: 'Digits', value: '\\d', explanation: 'ASCII decimal digit.' }, { label: 'Non-digits', value: '\\D', explanation: 'Anything except an ASCII decimal digit.' }, { label: 'Word character', value: '\\w', explanation: 'ASCII letters, digits and underscore; Unicode behavior depends on flags.' }, { label: 'Non-word character', value: '\\W', explanation: 'The inverse of word character.' }, { label: 'Whitespace', value: '\\s', explanation: 'Whitespace including line terminators.' }, { label: 'Non-whitespace', value: '\\S', explanation: 'Anything except whitespace.' }, { label: 'Character set', value: '[]', explanation: 'One member of a character set.' }, { label: 'Negated set', value: '[^]', explanation: 'A character not in the specified set.' }, { label: 'Character range', value: '[a-z]', explanation: 'One character between a and z.' }, { label: 'Unicode letter', value: '\\p{Letter}', explanation: 'Unicode letter property; requires u or v.' }, { label: 'Unicode non-letter', value: '\\P{Letter}', explanation: 'Inverse Unicode letter property; requires u or v.' }],
    quantifiers: [{ label: 'Zero or more', value: '*', explanation: 'Greedy repetition zero or more times.' }, { label: 'One or more', value: '+', explanation: 'Greedy repetition one or more times.' }, { label: 'Optional', value: '?', explanation: 'Greedy repetition zero or one times.' }, { label: 'Lazy zero or more', value: '*?', explanation: 'Prefer the shortest repetition.' }, { label: 'Lazy one or more', value: '+?', explanation: 'Prefer the shortest nonempty repetition.' }, { label: 'Lazy optional', value: '??', explanation: 'Prefer omitting the preceding expression.' }, { label: 'Exact count', value: '{n}', explanation: 'Repeat the preceding expression n times.' }, { label: 'Bounded range', value: '{min,max}', explanation: 'Repeat between min and max times.' }, { label: 'Open-ended count', value: '{min,}', explanation: 'Repeat at least min times.' }, { label: 'Possessive repetition', value: '++', explanation: 'Repetition without backtracking.', unsupported: 'JavaScript RegExp does not implement possessive quantifiers.' }],
    anchors: [{ label: 'Start', value: '^', explanation: 'Start of input; with m, also start of a line.' }, { label: 'End', value: '$', explanation: 'End of input; with m, also end of a line.' }, { label: 'Word boundary', value: '\\b', explanation: 'Boundary between word and non-word characters.' }, { label: 'Non-word boundary', value: '\\B', explanation: 'A position that is not a word boundary.' }]
};
export class Search extends LitElement {
    static properties = { query: { state: true }, regex: { state: true }, pattern: { state: true }, flags: { state: true }, error: { state: true }, expanded: { state: true }, category: { state: true }, token: { state: true }, fragment: { state: true }, captureName: { state: true }, captureIndex: { state: true }, minimum: { state: true }, maximum: { state: true }, literal: { state: true }, sample: { state: true }, replacement: { state: true }, preview: { state: true }, previewBusy: { state: true }, matchIndex: { state: true }, snippetName: { state: true }, snippets: { state: true }, snippetStatus: { state: true }, capabilities: { state: true }, anchorStyle: { state: true }, anchorSide: { state: true } };
    query = '';
    regex = false;
    pattern = '';
    flags = 'i';
    error = '';
    expanded = false;
    category = 'tokens';
    token = '.';
    fragment = '';
    captureName = 'name';
    captureIndex = 1;
    minimum = 1;
    maximum = 3;
    literal = '';
    sample = '';
    replacement = '$&';
    preview: RegexResponse = { id: 0 };
    previewBusy = false;
    matchIndex = 0;
    snippetName = '';
    snippets: RegexSnippet[] = [];
    snippetStatus = '';
    capabilities = false;
    anchorStyle = '';
    anchorSide = 'below';
    private placeBuilder = () => { if (!this.expanded)
        return; const rect = this.getBoundingClientRect(), width = Math.min(680, window.innerWidth - 32), below = window.innerHeight - rect.bottom - 24, above = rect.top - 24; this.anchorSide = below < 280 && above > below ? 'above' : 'below'; const height = Math.max(32, Math.min(window.innerHeight * .75, this.anchorSide === 'above' ? above : below)); const left = Math.max(16, Math.min(rect.left, window.innerWidth - width - 16)); const top = this.anchorSide === 'above' ? Math.max(16,rect.top-height-8) : rect.bottom+8; this.anchorStyle = `width:${width}px;max-height:${height}px;left:${left}px;top:${top}px;bottom:auto;right:auto`; };
    private closeBuilder() { this.expanded = false; clearTimeout(this.previewDebounce); this.previewSequence++; this.previewSession.cancel(); this.previewBusy = false; (this.renderRoot.querySelector('.row md-outlined-button') as HTMLElement | null)?.focus(); }
    private filterSession = new RegexSession();
    private previewSession = new RegexSession();
    private previewDebounce?: ReturnType<typeof setTimeout>;
    private previewSequence = 0;
    private availableFlags = supportedFlags();
    static styles = css `:host{display:block;position:relative;min-width:0}.row{display:flex;gap:8px;align-items:center}md-outlined-text-field,md-filled-select{width:100%;min-width:0;--md-outlined-text-field-container-shape:14px}.row md-outlined-text-field{flex:1}.builder{box-sizing:border-box;position:fixed;inset:auto;top:calc(100% + 8px);right:0;z-index:70;margin:0;width:min(680px,calc(100vw - 48px));max-height:min(75vh,840px);overflow:auto;overscroll-behavior:contain;background:var(--surface,#152422);border:1px solid var(--outline,#314843);border-radius:24px;padding:20px;box-shadow:0 16px 48px #0008;display:grid;gap:14px}.builder[data-side=above]{top:auto;bottom:calc(100% + 8px)}.options{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.error{color:#ffb4ab}.flag{display:flex;align-items:center;gap:5px;font-size:12px}.section{border-top:1px solid var(--outline,#314843);padding-top:14px;display:grid;gap:10px}.two{display:grid;grid-template-columns:1fr 1fr;gap:10px}.capture{white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.6 ui-monospace,monospace;background:#0002;padding:12px;border-radius:12px}.muted{font-size:12px;color:var(--muted,#a6bbb4)}@media(max-width:760px){.two{grid-template-columns:1fr}.builder{padding:14px}}@media(prefers-reduced-motion:reduce){*{transition:none!important}}`;
    protected updated(){const builder=this.renderRoot.querySelector<HTMLElement>('.builder');if(builder&&!builder.matches(':popover-open'))builder.showPopover();}
    connectedCallback() { super.connectedCallback(); this.loadSnippets(); window.addEventListener('resize', this.placeBuilder); window.addEventListener('scroll', this.placeBuilder, true); }
    disconnectedCallback() { super.disconnectedCallback(); this.filterSession.cancel(); this.previewSession.cancel(); clearTimeout(this.previewDebounce); window.removeEventListener('resize', this.placeBuilder); window.removeEventListener('scroll', this.placeBuilder, true); }
    private storageKey() { return `material-git.regex.v1.${encodeURIComponent(this.getAttribute('search-id') || this.getAttribute('label') || 'search')}`; }
    private loadSnippets() { try {
        const cached = localStorage.getItem(this.storageKey());
        if (cached) {
            if (cached.length > 524288)
                throw new Error('Snippet cache exceeds its size limit.');
            this.snippets = validateSnippets(JSON.parse(cached));
        }
    }
    catch {
        this.snippets = [];
        this.snippetStatus = 'Saved snippets could not be validated. Original search behavior is unchanged.';
    } }
    private persistSnippets() { try {
        localStorage.setItem(this.storageKey(), JSON.stringify({ schemaVersion: 1, snippets: this.snippets }));
    }
    catch {
        this.snippetStatus = 'Local storage is unavailable; snippets remain in memory for this session.';
    } }
    private changed() { this.dispatchEvent(new CustomEvent('search-change', { detail: { query: this.query, regex: this.regex, pattern: this.pattern, flags: this.flags }, bubbles: true, composed: true })); this.schedulePreview(); }
    private schedulePreview() { clearTimeout(this.previewDebounce); const generation = ++this.previewSequence; this.previewSession.cancel(); this.previewBusy = this.expanded; if (!this.expanded)
        return; this.previewDebounce = setTimeout(async () => { const result = await this.previewSession.run({ kind: 'preview', pattern: this.pattern || this.query, flags: this.flags, sample: this.sample, replacement: this.replacement }); if (generation !== this.previewSequence)
        return; this.preview = result; this.previewBusy = false; this.matchIndex = 0; }, 120); }
    async matchValues(values: string[]): Promise<boolean[]> {
        if (!this.regex) {
            this.filterSession.cancel();
            this.error = '';
            return values.map(value => value.toLocaleLowerCase().includes(this.query.toLocaleLowerCase()));
        }
        const result = await this.filterSession.run({ kind: 'filter', pattern: this.pattern || this.query, flags: this.flags, values });
        if (!result.cancelled)
            this.error = result.error || '';
        return result.matches || values.map(() => false);
    }
    private chooseCategory(value: string) { this.category = value; this.token = REGEX_TOKENS[value][0].value; }
    private insertToken() {
        if (this.token.startsWith('{') && (!Number.isInteger(this.minimum) || this.minimum < 0 || this.minimum > 10000 || !Number.isInteger(this.maximum) || this.maximum < 0 || this.maximum > 10000 || (this.token === '{min,max}' && this.maximum < this.minimum))) {
            this.error = 'Repeat counts must be integers from 0 to 10000, with maximum at least minimum.';
            return;
        }
        let value = this.token;
        const definition = REGEX_TOKENS[this.category].find(item => item.value === value);
        if (definition?.unsupported)
            return;
        if (value === '(?<name>)') {
            if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(this.captureName)) {
                this.error = 'Use an ASCII identifier for the named capture.';
                return;
            }
            value = `(?<${this.captureName}>${this.fragment})`;
        }
        else if (value === '\\1') {
            if (!Number.isInteger(this.captureIndex) || this.captureIndex < 1 || this.captureIndex > 99) {
                this.error = 'Backreference number must be an integer from 1 to 99.';
                return;
            }
            value = '\\' + this.captureIndex;
        }
        else if (value === '\\k<name>')
            value = `\\k<${this.captureName}>`;
        else if (['()', '(?:)', '(?=)', '(?!)', '(?<=)', '(?<!)'].includes(value))
            value = value.slice(0, -1) + this.fragment + ')';
        else if (value === '[]' || value === '[^]')
            value = value.slice(0, -1) + this.fragment + ']';
        else if (value === '{n}')
            value = `{${this.minimum}}`;
        else if (value === '{min,max}')
            value = `{${this.minimum},${this.maximum}}`;
        else if (value === '{min,}')
            value = `{${this.minimum},}`;
        if (this.pattern.length + value.length > REGEX_LIMITS.pattern) {
            this.error = 'Pattern exceeds the 4096-character bound.';
            return;
        }
        this.pattern += value;
        this.changed();
    }
    private flagChanged(flag: string, enabled: boolean) { if (enabled) {
        if (flag === 'u')
            this.flags = this.flags.replace('v', '');
        if (flag === 'v')
            this.flags = this.flags.replace('u', '');
        if (!this.flags.includes(flag))
            this.flags += flag;
    }
    else
        this.flags = this.flags.replace(flag, ''); this.changed(); }
    private explanations() {
        const pattern = this.pattern || this.query;
        const lexemes = pattern.match(/\\[pP]\{[^}]*\}|\\k<[^>]*>|\(\?<[^=>][^>]*>|\(\?[=:!]|\(\?<=[^)]*\)|\(\?<![^)]*\)|\\.|\[[^\]]*\]|\{\d+(?:,\d*)?\}\??|[+*?]\??|[()^$|.]|[^\\[\]{}()+*?^$|.]+/g) || [];
        return lexemes.slice(0, 40).map(token => { const entry = Object.values(REGEX_TOKENS).flat().find(item => item.value === token); return { token, meaning: entry?.explanation || (token.startsWith('(?<') ? 'Named capture or lookbehind; the engine validates its exact syntax.' : token.startsWith('[') ? 'Character set; ranges and escapes are interpreted by JavaScript.' : token.startsWith('\\') ? 'Escape or character-class token.' : token.startsWith('{') ? 'Counted repetition.' : token === '(' ? 'Open capturing group.' : token === ')' ? 'Close group.' : 'Literal text or a grouped expression fragment.') }; });
    }
    private saveSnippet() { try {
        const snippet = { name: this.snippetName.trim(), pattern: this.pattern || this.query, flags: this.flags, replacement: this.replacement, sample: this.sample };
        const next = [...this.snippets.filter(item => item.name !== snippet.name), snippet];
        this.snippets = validateSnippets({ schemaVersion: 1, snippets: next });
        this.persistSnippets();
        this.snippetStatus = 'Snippet saved locally for this search.';
    }
    catch (error) {
        this.snippetStatus = error instanceof Error ? error.message : String(error);
    } }
    private async importSnippets(event: Event) { const input = event.target as HTMLInputElement; const file = input.files?.[0]; if (!file)
        return; try {
        if (file.size > 524288)
            throw new Error('Snippet file exceeds 512 KiB.');
        const parsed = validateSnippets(JSON.parse(await file.text()));
        this.snippets = parsed;
        this.persistSnippets();
        this.snippetStatus = 'Snippet file imported. Previous snippets were replaced.';
    }
    catch (error) {
        this.snippetStatus = error instanceof Error ? error.message : String(error);
    }
    finally {
        input.value = '';
    } }
    private selectSnippet(name: string) { const snippet = this.snippets.find(item => item.name === name); if (!snippet)
        return; this.pattern = snippet.pattern; this.flags = snippet.flags; this.replacement = snippet.replacement; this.sample = snippet.sample; this.snippetName = snippet.name; this.changed(); }
    private capabilitiesView() { const probe = (pattern: string, flags = '') => { try {
        new RegExp(pattern, flags);
        return true;
    }
    catch {
        return false;
    } }; const version = typeof navigator !== 'undefined' ? (navigator.userAgent.match(/(?:Electron|Chrome)\/[\d.]+/g) || []).join(' · ') : ''; return html `<mg-text kind="muted">Engine: native JavaScript RegExp · ECMAScript runtime ${version || 'version unavailable'}. No PCRE or RE2 compatibility is claimed.</mg-text><mg-layout column>${[['Named captures and backreferences', probe('(?<name>a)\\k<name>'), '(?<name>…) / \\k<name>'], ['Lookahead', probe('(?=a)'), '(?=…) / (?!…)'], ['Lookbehind', probe('(?<=a)b'), '(?<=…) / (?<!…)'], ['Unicode properties', probe('\\p{Letter}', 'u'), 'u or v required'], ['Match indices', this.availableFlags.includes('d'), 'd flag'], ['Unicode sets', this.availableFlags.includes('v'), 'v flag; mutually exclusive with u'], ['Atomic groups', false, 'Unsupported by JavaScript RegExp'], ['Possessive quantifiers', false, 'Unsupported by JavaScript RegExp'], ['Conditional expressions', false, 'Unsupported by JavaScript RegExp']].map(([name, supported, detail]) => html `<mg-layout spread><mg-text>${name}</mg-text><md-assist-chip label=${supported ? 'Available' : 'Unsupported'} ?disabled=${!supported}></md-assist-chip><mg-text kind="muted">${detail}</mg-text></mg-layout>`)}</mg-layout>`; }
    render() {
        const definition = REGEX_TOKENS[this.category].find(item => item.value === this.token);
        const matches = this.preview.results || [];
        const selected = matches[this.matchIndex];
        return html `<div class="row"><md-outlined-text-field label=${this.getAttribute('label') || 'Search'} .value=${this.query} @input=${(e: Event) => { this.query = (e.target as HTMLInputElement).value; this.changed(); }}></md-outlined-text-field><md-outlined-button aria-label="Configure regular expression" aria-expanded=${this.expanded} @click=${() => { if (this.expanded)
            this.closeBuilder();
        else {
            this.expanded = true;
            this.placeBuilder();
            this.schedulePreview();
        } }}>${this.regex ? 'Regex on' : 'Regex'}</md-outlined-button></div>${this.expanded ? html `<div class="builder" popover="manual" data-side=${this.anchorSide} style=${this.anchorStyle} @keydown=${(event: KeyboardEvent) => { if (event.key === 'Escape') {
            event.stopPropagation();
            this.closeBuilder();
        } }} role="dialog" aria-label="Regular expression workbench"><mg-layout spread><mg-text kind="eyebrow">Regular expression workbench</mg-text><md-text-button @click=${() => this.closeBuilder()}>Done</md-text-button></mg-layout><mg-layout><md-switch aria-label="Use regular expression for this search" .selected=${this.regex} @change=${(e: Event) => { this.regex = (e.target as unknown as {
            selected: boolean;
        }).selected; this.changed(); }}></md-switch><mg-text>Use regular expression for this search</mg-text></mg-layout><md-outlined-text-field label="Pattern" supporting-text="JavaScript syntax · maximum 4096 characters" .value=${this.pattern} @input=${(e: Event) => { this.pattern = (e.target as HTMLInputElement).value; this.changed(); }}></md-outlined-text-field><div class="options">${[['d', 'Indices'], ['g', 'Global'], ['i', 'Ignore case'], ['m', 'Multiline'], ['s', 'Dot all'], ['u', 'Unicode'], ['v', 'Unicode sets'], ['y', 'Sticky']].map(([flag, label]) => html `<label class="flag"><md-checkbox aria-label=${`${label} (${flag})${this.availableFlags.includes(flag) ? '' : ' — unsupported by this engine'}`} ?disabled=${!this.availableFlags.includes(flag)} .checked=${this.flags.includes(flag)} @change=${(e: Event) => this.flagChanged(flag, (e.target as HTMLInputElement).checked)}></md-checkbox>${flag} · ${label}</label>`)}</div><mg-text kind="muted">Search resets lastIndex for each record. Sticky anchors at record position 0. Preview lists up to 200 matches; replacement follows the selected global flag.</mg-text>${this.error ? html `<mg-text class="error" role="alert">${this.error}</mg-text>` : nothing}
        <div class="section"><mg-text kind="eyebrow">Build an expression</mg-text><div class="two"><md-filled-select label="Token family" .value=${this.category} @change=${(e: Event) => this.chooseCategory((e.target as HTMLSelectElement).value)}>${Object.keys(REGEX_TOKENS).map(category => html `<md-select-option value=${category} ?selected=${this.category===category}><div slot="headline">${category[0].toUpperCase() + category.slice(1)}</div></md-select-option>`)}</md-filled-select><md-filled-select label="Token" .value=${this.token} @change=${(e: Event) => this.token = (e.target as HTMLSelectElement).value}>${REGEX_TOKENS[this.category].map(item => html `<md-select-option value=${item.value} ?selected=${this.token===item.value} ?disabled=${Boolean(item.unsupported)}><div slot="headline">${item.label}</div><div slot="supporting-text">${item.unsupported || item.value}</div></md-select-option>`)}</md-filled-select></div><mg-text kind="muted">${definition?.unsupported || definition?.explanation}</mg-text>${this.category === 'groups' || this.category === 'classes' ? html `<md-outlined-text-field label="Group contents or set members" .value=${this.fragment} @input=${(e: Event) => this.fragment = (e.target as HTMLInputElement).value}></md-outlined-text-field>` : nothing}${this.token === '(?<name>)' || this.token === '\\k<name>' ? html `<md-outlined-text-field label="Capture name" .value=${this.captureName} @input=${(e: Event) => this.captureName = (e.target as HTMLInputElement).value}></md-outlined-text-field>` : nothing}${this.token === '\\1' ? html `<md-outlined-text-field label="Capture number" type="number" min="1" max="99" .value=${String(this.captureIndex)} @input=${(e: Event) => this.captureIndex = Number((e.target as HTMLInputElement).value)}></md-outlined-text-field>` : nothing}${this.token.startsWith('{') ? html `<div class="two"><md-outlined-text-field label="Minimum or exact count" type="number" min="0" max="10000" .value=${String(this.minimum)} @input=${(e: Event) => this.minimum = Number((e.target as HTMLInputElement).value)}></md-outlined-text-field><md-outlined-text-field label="Maximum count" type="number" min="0" max="10000" ?disabled=${this.token !== '{min,max}'} .value=${String(this.maximum)} @input=${(e: Event) => this.maximum = Number((e.target as HTMLInputElement).value)}></md-outlined-text-field></div>` : nothing}<md-outlined-button ?disabled=${Boolean(definition?.unsupported)} @click=${() => this.insertToken()}>Insert token</md-outlined-button><div class="two"><md-outlined-text-field label="Literal text to escape" .value=${this.literal} @input=${(e: Event) => this.literal = (e.target as HTMLInputElement).value}></md-outlined-text-field><md-outlined-button @click=${() => { const escaped = escapeLiteral(this.literal); if (this.pattern.length + escaped.length > REGEX_LIMITS.pattern) {
            this.error = 'Escaped literal exceeds the pattern limit.';
            return;
        } this.pattern += escaped; this.changed(); }}>Insert escaped literal</md-outlined-button></div></div>
        <div class="section"><mg-text kind="eyebrow">Live test and replacement</mg-text><md-outlined-text-field type="textarea" rows="3" label="Sample text" .value=${this.sample} @input=${(e: Event) => { this.sample = (e.target as HTMLInputElement).value; this.schedulePreview(); }}></md-outlined-text-field><md-outlined-text-field label="Replacement template" supporting-text="Supports $$, $&, $1…$99, $<name>, prefix and suffix tokens" .value=${this.replacement} @input=${(e: Event) => { this.replacement = (e.target as HTMLInputElement).value; this.schedulePreview(); }}></md-outlined-text-field>${this.previewBusy ? html `<md-linear-progress indeterminate aria-label="Evaluating sample in isolated worker"></md-linear-progress>` : nothing}${this.preview.error ? html `<mg-text class="error" role="alert">${this.preview.error}</mg-text>` : html `<mg-text kind="muted">${matches.length} matches · worker ${this.preview.elapsedMs?.toFixed(2) || '0'} ms${this.preview.limited ? ' · Preview limited by match or output bounds' : ''}</mg-text><mg-layout spread><md-outlined-button ?disabled=${this.matchIndex <= 0} @click=${() => this.matchIndex--}>Previous match</md-outlined-button><mg-text>${matches.length ? `Match ${this.matchIndex + 1} of ${matches.length}` : 'No matches'}</mg-text><md-outlined-button ?disabled=${this.matchIndex >= matches.length - 1} @click=${() => this.matchIndex++}>Next match</md-outlined-button></mg-layout>${selected ? html `<mg-surface><mg-text kind="eyebrow">Positions ${selected.index}–${selected.end}${selected.text === '' ? ' · zero-width match' : ''}</mg-text><mg-text kind="code">${selected.text || '(empty)'}</mg-text><mg-text kind="muted">Captures: ${selected.captures.map((capture, index) => `${index + 1}: ${capture === null ? 'unmatched' : JSON.stringify(capture)}${selected.captureIndices?.[index] ? ` @ ${selected.captureIndices[index]![0]}–${selected.captureIndices[index]![1]}` : ''}`).join(' · ') || 'none'}</mg-text><mg-text kind="muted">Named captures: ${Object.entries(selected.groups).map(([name, value]) => `${name}: ${value === null ? 'unmatched' : JSON.stringify(value)}`).join(' · ') || 'none'}</mg-text></mg-surface>` : nothing}<mg-text kind="eyebrow">Replacement preview</mg-text><mg-text kind="code">${this.preview.replacement ?? ''}</mg-text>`}</div>
        <div class="section"><mg-text kind="eyebrow">Token explanation</mg-text><mg-text kind="muted">Lexical guide, not a full syntax tree. Native engine validation above is authoritative.</mg-text>${this.explanations().map(item => html `<mg-layout spread><mg-text kind="code">${item.token}</mg-text><mg-text kind="muted">${item.meaning}</mg-text></mg-layout>`)}</div>
        <div class="section"><mg-text kind="eyebrow">Local snippets</mg-text><md-outlined-text-field label="Snippet name" .value=${this.snippetName} @input=${(e: Event) => this.snippetName = (e.target as HTMLInputElement).value}></md-outlined-text-field><mg-layout><md-outlined-button @click=${() => this.saveSnippet()}>Save snippet</md-outlined-button><md-outlined-button @click=${() => this.renderRoot.querySelector<HTMLInputElement>('input[type=file]')?.click()}>Import JSON</md-outlined-button><md-outlined-button ?disabled=${!this.snippets.length} @click=${async () => { try {
            await window.material.exportData({ schemaVersion: 1, snippets: this.snippets }, 'json');
        }
        catch (error) {
            this.snippetStatus = error instanceof Error ? error.message : String(error);
        } }}>Export JSON</md-outlined-button><md-text-button @click=${() => { this.snippets = []; this.persistSnippets(); this.snippetStatus = 'Local snippets cleared.'; }}>Clear snippets</md-text-button><md-text-button @click=${() => { this.pattern = ''; this.flags = 'i'; this.sample = ''; this.replacement = '$&'; this.regex = false; this.error = ''; this.literal = ''; this.fragment = ''; this.captureName = 'name'; this.captureIndex = 1; this.minimum = 1; this.maximum = 3; this.category = 'tokens'; this.token = '.'; this.snippetName = ''; this.changed(); }}>Reset workbench</md-text-button></mg-layout><input hidden type="file" accept="application/json,.json" aria-hidden="true" tabindex="-1" @change=${(e: Event) => this.importSnippets(e)}><mg-layout>${this.snippets.map(snippet => html `<md-assist-chip label=${snippet.name} @click=${() => this.selectSnippet(snippet.name)}></md-assist-chip>`)}</mg-layout><mg-text role="status" kind="muted">${this.snippetStatus || (this.snippets.length ? `${this.snippets.length} local snippets. Sample text stays local until explicitly exported.` : 'No snippets supplied. Snippets and sample text stay in local browser storage until explicitly exported.')}</mg-text></div>
        <div class="section"><md-text-button aria-expanded=${this.capabilities} @click=${() => this.capabilities = !this.capabilities}>Engine capabilities and limits</md-text-button>${this.capabilities ? this.capabilitiesView() : nothing}<mg-text kind="muted">250 ms isolated worker deadline. Pattern 4096 characters; sample 65,536; 200 preview matches; search input 2 MiB. Zero-width matches advance one Unicode code point when u or v is enabled. Each search and preview owns a separate worker session.</mg-text></div></div>` : nothing}`;
    }
}
customElements.define('mg-search', Search);
