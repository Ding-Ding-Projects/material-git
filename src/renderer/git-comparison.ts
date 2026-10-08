import {LitElement, html, css, nothing} from './material';
import './components';
import type {GitRow, GitResponse} from '../shared/git';
import type {GitComparisonKind, GitComparisonBridge} from '../shared/git-comparison';

const destinations: ReadonlyArray<readonly [GitComparisonKind, string, string]> = [
  ['shortlog', 'Contributors', '貢獻者'], ['cherry', 'Patch equivalence', '修補等價比較'],
  ['range-diff', 'Compare patch series', '比較修補系列'], ['name-rev', 'Reference names', '參照名稱'],
  ['check-mailmap', 'Identity mapping', '身份對應'], ['patch-id', 'Identify patch', '識別修補檔'],
  ['stripspace', 'Normalize draft', '整理草稿'],
];
const yue: Record<string, string> = {
  'Run comparison': '執行比較', 'Running comparison': '比較進行中', 'Selected references': '所選參照',
  'Contributor grouping': '貢獻者分組', Author: '作者', Committer: '提交者', 'Show email addresses': '顯示電郵地址',
  'Commits per page': '每頁提交數目', Previous: '上一頁', Next: '下一頁', Page: '頁',
  'Upstream reference': '上游參照', 'Head reference': '目前參照', 'Lower boundary': '下限參照', 'No lower boundary': '唔設下限',
  'Old base': '舊共同版本', 'Old tip': '舊系列末端', 'New base': '新共同版本', 'New tip': '新系列末端',
  'Creation factor': '新增權重', 'Reference scope': '參照範圍', 'All references': '所有參照', Tags: '標籤', Branches: '分支',
  'Selected commits': '所選提交', 'Identities, one per line': '身份資料，每行一個', 'Patch content': '修補檔內容',
  'Patch identity strategy': '修補識別策略', 'Stable (ignore whitespace)': '穩定（忽略空白）', 'Verbatim (preserve whitespace)': '逐字（保留空白）',
  'Draft text': '草稿文字', 'Comment handling': '註解處理', 'Keep comments': '保留註解', 'Remove # comments': '移除 # 註解', 'Add # comments': '加入 # 註解',
  'No matching records': '冇符合記錄', 'Count': '數目', Contributor: '貢獻者', Equivalent: '等價', Unique: '獨有',
  'Commit': '提交', 'Commit details': '提交詳情',
  'Comparison cancelled.': '比較已取消。', 'Comparison failed.': '比較失敗。', 'Native comparison returned an unexpected response.': '原生比較傳回非預期回應。', 'Reference name': '參照名稱', 'Mapped identity': '對應身份', 'Patch ID': '修補識別碼',
  'Open a repository to enable comparisons.': '開啟儲存庫先可以進行比較。',
  'Contributor totals apply to the selected commit window on this page.': '貢獻數目只計算呢頁所選提交範圍。',
  'Compare commits by their patches; equivalent changes may have different commit IDs.': '按修補內容比較提交；等價變更可以有唔同提交識別碼。',
  'Compare two base-to-tip series without changing either branch.': '比較兩組由共同版本到末端嘅系列，唔會改動分支。',
  'Choose up to 100 commits and resolve their names from repository references.': '選擇最多 100 個提交，按儲存庫參照解析名稱。',
  'Use Name <email@example.com>, one identity per line, up to 100 identities.': '每行輸入一個 Name <email@example.com>，最多 100 個身份。',
  'Paste a Git patch of at most 200 KiB. This computes its identity without applying it.': '貼上最多 200 KiB 嘅 Git 修補檔。只計算識別碼，唔會套用內容。',
  'Normalize at most 200 KiB of draft text. The result does not overwrite your draft.': '整理最多 200 KiB 嘅草稿文字。結果唔會覆寫草稿。',
  'No commits selected. Select commits from History first.': '未選擇提交。請先喺歷史揀選提交。',
};
const descriptions: Record<GitComparisonKind, string> = {
  shortlog: 'Contributor totals apply to the selected commit window on this page.',
  cherry: 'Compare commits by their patches; equivalent changes may have different commit IDs.',
  'range-diff': 'Compare two base-to-tip series without changing either branch.',
  'name-rev': 'Choose up to 100 commits and resolve their names from repository references.',
  'check-mailmap': 'Use Name <email@example.com>, one identity per line, up to 100 identities.',
  'patch-id': 'Paste a Git patch of at most 200 KiB. This computes its identity without applying it.',
  stripspace: 'Normalize at most 200 KiB of draft text. The result does not overwrite your draft.',
};
const initialFields: Record<GitComparisonKind, Record<string, unknown>> = {
  shortlog: {refs: ['HEAD'], group: 'author', email: false, page: 0, pageSize: 200},
  cherry: {upstream: '', head: 'HEAD', limit: ''},
  'range-diff': {oldBase: '', oldTip: '', newBase: '', newTip: '', creationFactor: 60},
  'name-rev': {commits: [], nameScope: 'all'}, 'check-mailmap': {identities: []},
  'patch-id': {patch: '', strategy: 'stable'}, stripspace: {text: '', comments: 'keep'},
};
interface ResultRow {values: string[];}
/** Material comparison panel. Native execution and cancellation remain owned by the host. */
export class GitComparison extends LitElement {
  static properties = {bridge: {attribute: false}, references: {attribute: false}, commits: {attribute: false}, language: {}, kind: {state: true}, drafts: {state: true}, busy: {state: true}, error: {state: true}, output: {state: true}, resultRows: {state: true}, hasResult: {state: true}, resultKind: {state: true}, resultPage: {state: true}};
  bridge?: GitComparisonBridge;
  references: GitRow[] = [];
  commits: GitRow[] = [];
  language = 'en';
  kind: GitComparisonKind = 'shortlog';
  drafts = Object.fromEntries(Object.entries(initialFields).map(([key, value]) => [key, {...value}])) as Record<GitComparisonKind, Record<string, unknown>>;
  busy = false; error = ''; output = ''; resultRows: ResultRow[] = []; hasResult = false;
  resultKind: GitComparisonKind = 'shortlog'; resultPage = 0;
  static styles = css`
    :host{display:block;min-width:0;color:var(--md-sys-color-on-surface,#18201b);--surface:var(--md-sys-color-surface-container-low,#f0f4ef);--outline:var(--md-sys-color-outline-variant,#c0ccc3)}
    .panel,.fields,.results{display:grid;gap:12px}.destinations,.actions,.flag{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .fields{grid-template-columns:repeat(2,minmax(0,1fr))}.wide{grid-column:1/-1}.entities{max-height:220px;overflow:auto;display:grid;gap:4px}
    .entity{display:flex;align-items:center;gap:8px;overflow-wrap:anywhere}.entity span{min-width:0}
    md-outlined-select,md-outlined-text-field{width:100%;min-width:0}.hint{color:var(--md-sys-color-on-surface-variant,#40534b);font-size:12px;line-height:1.5}
    .error{color:var(--md-sys-color-error,#ba1a1a)}.output{font:12px/1.6 ui-monospace,monospace;white-space:pre-wrap;overflow-wrap:anywhere;max-height:420px;overflow:auto;background:var(--md-sys-color-surface-container-high,#e7ece6);border-radius:12px;padding:12px}
    .table-scroll{overflow:auto}table{width:100%;border-collapse:collapse;text-align:left}th,td{padding:9px;border-bottom:1px solid var(--md-sys-color-outline-variant,#c0ccc3);overflow-wrap:anywhere}th{font-size:12px}
    .entities,.output,.table-scroll{scrollbar-width:thin;scrollbar-color:var(--md-sys-color-primary,#006b55) transparent}.entities::-webkit-scrollbar,.output::-webkit-scrollbar,.table-scroll::-webkit-scrollbar{width:8px;height:8px}.entities::-webkit-scrollbar-thumb,.output::-webkit-scrollbar-thumb,.table-scroll::-webkit-scrollbar-thumb{background:var(--md-sys-color-primary,#006b55);border-radius:8px}
    @media(max-width:680px){.fields{grid-template-columns:1fr}}@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
  `;
  private label(value: string) {return this.language === 'yue' ? yue[value] ?? value : this.language === 'both' && yue[value] ? `${value} · ${yue[value]}` : value;}
  private destinationLabel(entry: readonly [GitComparisonKind, string, string]) {return this.language === 'yue' ? entry[2] : this.language === 'both' ? `${entry[1]} · ${entry[2]}` : entry[1];}
  private get fields() {return this.drafts[this.kind];}
  private setField(key: string, value: unknown) {this.drafts = {...this.drafts, [this.kind]: {...this.fields, [key]: value}};this.hasResult = false;this.error = '';}
  private referenceOptions() {const rows = [{id: 'HEAD', label: 'HEAD', detail: ''}, ...this.references, ...this.commits]; return [...new Map(rows.map(row => [row.id, row])).values()];}
  private select(key: string, label: string, options: Array<readonly [string, string]>, allowEmpty = false) {
    return html`<md-outlined-select .label=${this.label(label)} .value=${String(this.fields[key] ?? '')} ?disabled=${this.busy} @change=${(event: Event) => this.setField(key, (event.target as HTMLSelectElement).value)}>
      ${allowEmpty ? html`<md-select-option value=""><div slot="headline">${this.label('No lower boundary')}</div></md-select-option>` : nothing}
      ${options.map(([value, name]) => html`<md-select-option .value=${value}><div slot="headline">${name}</div></md-select-option>`)}
    </md-outlined-select>`;
  }
  private reference(key: string, label: string, optional = false) {return this.select(key, label, this.referenceOptions().map(row => [row.id, row.label] as const), optional);}
  private number(key: string, label: string, min: number, max: number) {return html`<md-outlined-text-field type="number" .label=${this.label(label)} .value=${String(this.fields[key] ?? '')} min=${min} max=${max} step="1" ?disabled=${this.busy} @input=${(event: Event) => {const value = (event.target as HTMLInputElement).value; this.setField(key, value === '' ? '' : Number(value));}}></md-outlined-text-field>`;}
  private text(key: string, label: string, lines = 5) {const value = key === 'identities' ? (this.fields[key] as string[]).join('\n') : String(this.fields[key] ?? '');return html`<md-outlined-text-field class="wide" type="textarea" .label=${this.label(label)} .value=${value} rows=${lines} ?disabled=${this.busy} @input=${(event: Event) => {const value = (event.target as HTMLTextAreaElement).value;this.setField(key, key === 'identities' ? value.split(/\r?\n/).filter(line => line.trim()) : value);}}></md-outlined-text-field>`;}
  private entities(key: 'refs' | 'commits', label: string, rows: GitRow[], max: number) {
    const selected = this.fields[key] as string[];
    return html`<div class="wide"><mg-text kind="title-small">${this.label(label)}</mg-text><div class="entities">${rows.map(row => html`<label class="entity"><md-checkbox aria-label=${row.label} .checked=${selected.includes(row.id)} ?disabled=${this.busy || (!selected.includes(row.id) && selected.length >= max)} @change=${(event: Event) => this.setField(key, (event.target as HTMLInputElement).checked ? [...selected, row.id] : selected.filter(id => id !== row.id))}></md-checkbox><span>${row.label}<span class="hint"> ${row.detail}</span></span></label>`)}</div></div>`;
  }
  private form() {
    switch (this.kind) {
      case 'shortlog': return html`${this.entities('refs', 'Selected references', this.referenceOptions().filter(row => row.id === 'HEAD' || this.references.some(ref => ref.id === row.id)), 20)}${this.select('group', 'Contributor grouping', [['author', this.label('Author')], ['committer', this.label('Committer')]])}${this.number('pageSize', 'Commits per page', 1, 1000)}<label class="flag"><md-checkbox aria-label=${this.label('Show email addresses')} .checked=${!!this.fields.email} ?disabled=${this.busy} @change=${(event: Event) => this.setField('email', (event.target as HTMLInputElement).checked)}></md-checkbox>${this.label('Show email addresses')}</label>`;
      case 'cherry': return html`${this.reference('upstream', 'Upstream reference')}${this.reference('head', 'Head reference')}${this.reference('limit', 'Lower boundary', true)}`;
      case 'range-diff': return html`${this.reference('oldBase', 'Old base')}${this.reference('oldTip', 'Old tip')}${this.reference('newBase', 'New base')}${this.reference('newTip', 'New tip')}${this.number('creationFactor', 'Creation factor', 1, 999)}`;
      case 'name-rev': return html`${this.commits.length ? this.entities('commits', 'Selected commits', this.commits, 100) : html`<p class="hint wide">${this.label('No commits selected. Select commits from History first.')}</p>`}${this.select('nameScope', 'Reference scope', [['all', this.label('All references')], ['tags', this.label('Tags')], ['branches', this.label('Branches')]])}`;
      case 'check-mailmap': return this.text('identities', 'Identities, one per line');
      case 'patch-id': return html`${this.select('strategy', 'Patch identity strategy', [['stable', this.label('Stable (ignore whitespace)')], ['verbatim', this.label('Verbatim (preserve whitespace)')]])}${this.text('patch', 'Patch content', 8)}`;
      case 'stripspace': return html`${this.select('comments', 'Comment handling', [['keep', this.label('Keep comments')], ['remove', this.label('Remove # comments')], ['add', this.label('Add # comments')]])}${this.text('text', 'Draft text', 8)}`;
    }
  }
  private parse(text: string, kind: GitComparisonKind): ResultRow[] {
    const lines = text.split('\n').filter(line => line.trim());
    switch (kind) {
      case 'shortlog': return lines.map(line => {const match = line.match(/^\s*(\d+)\s+(.+)$/);return {values: match ? [match[1], match[2]] : ['', line]};});
      case 'cherry': return lines.map(line => {const match = line.match(/^([+-]) ([a-f0-9]+) ?(.*)$/);return {values: match ? [match[1] === '-' ? 'Equivalent' : 'Unique', match[2], match[3]] : ['', '', line]};});
      case 'name-rev': return lines.map(line => {const space = line.indexOf(' ');return {values: [line.slice(0, space), line.slice(space + 1)]};});
      case 'check-mailmap': return lines.map(line => ({values: [line]}));
      case 'patch-id': return lines.map(line => ({values: line.split(' ')}));
      default: return [];
    }
  }
  private headings(): string[] {switch(this.resultKind) {case 'shortlog': return ['Count', 'Contributor'];case 'cherry': return ['Patch equivalence', 'Commit', 'Commit details'];case 'name-rev': return ['Commit', 'Reference name'];case 'check-mailmap': return ['Mapped identity'];case 'patch-id': return ['Patch ID', 'Commit'];default: return [];}}
  private async run(page = 0) {
    if (this.busy || !this.bridge) return;
    this.busy = true; this.error = ''; this.dispatchEvent(new CustomEvent('comparison-state', {detail: {busy: true}, bubbles: true, composed: true}));
    const kind = this.kind; const fields = {...this.fields, ...(kind === 'shortlog' ? {page} : {})};
    try {
      const response: GitResponse = await this.bridge(kind, fields);
      if (response.kind === 'cancelled') throw new Error(this.label('Comparison cancelled.'));
      let output: string;
      if (response.kind === 'text') output = response.text;
      else if (response.kind === 'result') {if (!response.ok) throw new Error(response.error || response.output || this.label('Comparison failed.'));output = response.output;}
      else throw new Error(this.label('Native comparison returned an unexpected response.'));
      this.output = output; this.resultKind = kind; this.resultRows = this.parse(output, kind); this.hasResult = true; this.resultPage = page;
      if (kind === 'shortlog') this.drafts = {...this.drafts, shortlog: {...this.drafts.shortlog, page}};
    } catch (error) {this.error = error instanceof Error ? error.message : String(error);}
    finally {this.busy = false; this.dispatchEvent(new CustomEvent('comparison-state', {detail: {busy: false}, bubbles: true, composed: true}));}
  }
  render() {
    return html`<mg-surface level="low"><div class="panel"><div class="destinations" aria-label=${this.label('Run comparison')}>${destinations.map(entry => html`<md-filter-chip .label=${this.destinationLabel(entry)} .selected=${this.kind === entry[0]} ?disabled=${this.busy} @click=${() => {this.kind = entry[0];this.hasResult = false;this.output = '';this.error = '';}}></md-filter-chip>`)}</div>
      <p class="hint">${this.label(descriptions[this.kind])}</p><div class="fields">${this.form()}</div>
      ${!this.bridge ? html`<p class="hint">${this.label('Open a repository to enable comparisons.')}</p>` : nothing}
      <div class="actions"><md-filled-button ?disabled=${this.busy || !this.bridge} @click=${() => this.run()}>${this.label(this.busy ? 'Running comparison' : 'Run comparison')}</md-filled-button>${this.busy ? html`<md-linear-progress indeterminate aria-label=${this.label('Running comparison')}></md-linear-progress>` : nothing}</div>
      ${this.error ? html`<p class="error" role="alert">${this.error}</p>` : nothing}
      ${this.hasResult ? html`<div class="results" aria-live="polite">${this.resultRows.length ? html`<div class="table-scroll"><table><thead><tr>${this.headings().map(label => html`<th scope="col">${this.label(label)}</th>`)}</tr></thead><tbody>${this.resultRows.map(row => html`<tr>${row.values.map((value, index) => html`<td>${this.resultKind === 'cherry' && index === 0 ? this.label(value) : value}</td>`)}</tr>`)}</tbody></table></div>` : this.output ? html`<pre class="output">${this.output}</pre>` : html`<p>${this.label('No matching records')}</p>`}
      ${this.resultKind === 'shortlog' ? html`<div class="actions"><md-outlined-button ?disabled=${this.busy || !this.resultPage} @click=${() => this.run(this.resultPage - 1)}>${this.label('Previous')}</md-outlined-button><span>${this.label('Page')} ${this.resultPage + 1}</span><md-outlined-button ?disabled=${this.busy || !this.resultRows.length} @click=${() => this.run(this.resultPage + 1)}>${this.label('Next')}</md-outlined-button></div>` : nothing}</div>` : nothing}
    </div></mg-surface>`;
  }
}
customElements.define('mg-git-comparison', GitComparison);
