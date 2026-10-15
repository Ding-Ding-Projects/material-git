import { LitElement, html, css, nothing } from './material';
import './components';
import type { FinishBatch, FinishContribution, FinishRepository, FinishReview, FinishSelection, RepositoryFinishAction, RepositoryFinishPayload, RepositoryFinishResponse } from '../shared/repository-finish';
export class RepositoryFinish extends LitElement {
    static properties = { invoke: { attribute: false }, repositories: { attribute: false }, language: {}, selected: { state: true }, prepared: { state: true }, selections: { state: true }, review: { state: true }, batch: { state: true }, history: { state: true }, busy: { state: true }, error: { state: true }, searchMatches: { state: true }, concurrency: { state: true }, confirmed: { state: true }, branchMatches: { state: true } };
    invoke?: (action: RepositoryFinishAction, payload?: RepositoryFinishPayload) => Promise<RepositoryFinishResponse>;
    repositories: {
        id: string;
        name: string;
        root: string;
    }[] = [];
    language = 'en';
    selected: string[] = [];
    branchMatches: Record<string, boolean[]> = {};
    prepared: FinishRepository[] = [];
    selections: FinishSelection[] = [];
    review: FinishReview | null = null;
    batch: FinishBatch | null = null;
    history: FinishBatch[] = [];
    busy = false;
    error = '';
    searchMatches: boolean[] = [];
    concurrency = 3;
    confirmed = false;
    private timer?: ReturnType<typeof setTimeout>;
    private searchGeneration = 0;
    private collectionGenerations: Record<string, number> = {};
    private lastWorkState = "";
    protected updated(changed: Map<string, unknown>) { if (changed.has("invoke") && this.invoke)
        void this.loadHistory(); const busy = this.busy || this.batch?.state === "running", dirty = !!this.review || this.prepared.length > 0 || this.selected.length > 0; const signature = JSON.stringify({ busy, dirty }); if (signature !== this.lastWorkState) {
        this.lastWorkState = signature;
        this.dispatchEvent(new CustomEvent("repository-finish-work-state", { detail: { busy, dirty }, bubbles: true, composed: true }));
    } }
    discardDrafts(): boolean { if (this.busy || this.batch?.state === "running")
        return false; this.selected = []; this.prepared = []; this.selections = []; this.review = null; this.confirmed = false; return true; }
    static styles = css `:host{display:block;min-width:0;color:var(--md-sys-color-on-surface)}.workspace{display:grid;gap:16px;padding:20px;max-width:1200px;margin:auto}.row{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.grow{flex:1;min-width:0}.panel{display:grid;gap:12px;padding:16px;border:1px solid var(--md-sys-color-outline-variant);border-radius:16px;min-width:0}.muted{color:var(--md-sys-color-on-surface-variant)}.error{color:var(--md-sys-color-error)}label{display:flex;gap:8px;align-items:center;min-height:48px}h1{font:var(--md-sys-typescale-headline-small-font,500 24px system-ui);margin:0}h2,h3{margin:0;font:500 18px system-ui}p{margin:0;line-height:1.5}code,pre{overflow-wrap:anywhere;white-space:pre-wrap;font:12px/1.6 monospace}pre{max-height:300px;overflow:auto;scrollbar-width:thin;padding:12px;background:var(--md-sys-color-surface-container)}.path{overflow-wrap:anywhere;font:12px monospace}md-outlined-text-field{width:100%}details{min-width:0}summary{cursor:pointer;min-height:40px;padding:4px}ol{padding-left:22px}li{margin:5px 0}button:focus-visible,summary:focus-visible{outline:2px solid var(--md-sys-color-primary)}@media(max-width:600px){.workspace{padding:12px}.panel{padding:12px}.row>*{max-width:100%}}`;
    private l(en: string, yue: string) { return this.language === 'yue' ? yue : this.language === 'both' ? en + ' · ' + yue : en; }
    private reviewText(value: string) {
        const translations: Record<string, string> = {
            'Revalidate all reviewed content and remote references': '重新驗證所有已確認內容同遠端參照',
            'Create verified private recovery archive': '建立並驗證私人復原備份',
            'Commit reviewed dirty files on their owning branches': '將已確認更改提交至所屬分支',
            'Push and verify every selected source branch without force': '推送並驗證所有所選來源分支，唔會強制改寫歷史',
            'Merge approved contributions in an isolated integration working tree; retain checked-out user default branches unchanged': '喺獨立整合工作樹合併已確認貢獻，保留使用者已簽出嘅預設分支',
            'Push default branch and verify exact remote tip and ancestry; advance an unoccupied local default reference only by compare-and-swap': '推送預設分支並驗證遠端提交同祖先關係；只喺未簽出而且舊參照仍然相符時更新本機預設參照',
            'Refresh and verify private archive before exact owned cleanup': '清理指定工作項目前重新建立並驗證私人備份',
            'Repository programs run only with explicit trust. Remote transport authentication follows the selected Git configuration.': '儲存庫程式只會喺明確信任後執行。遠端認證依照所選 Git 設定。',
            'Ignored files are excluded from archives. Working trees containing ignored files are retained.': '備份唔包括忽略檔案。包含忽略檔案嘅工作樹會保留。',
            'Stashes and unselected branches are retained. Conflicts and cancellation preserve partial effects.': '保留暫存堆同未選取分支。發生衝突或取消時，已完成嘅變更會保留。',
            'Remote source deletion uses an exact expected-tip lease; a concurrently changed remote branch is retained.': '移除遠端來源前會原子核對預期提交；同時被更改嘅遠端分支會保留。',
            'A resumed job requires new native inventory and explicit review; completed steps are never blindly replayed.': '恢復工作前需要重新讀取本機狀態並明確確認，唔會盲目重做已完成步驟。'
        };
        return translations[value] ? this.l(value, translations[value]) : value;
    }
    connectedCallback() { super.connectedCallback(); void this.loadHistory(); }
    disconnectedCallback() { super.disconnectedCallback(); clearTimeout(this.timer); }
    private async loadHistory() {
        try {
            const response = await this.invoke?.('status');
            if (response?.kind === 'batches') {
                this.history = response.batches;
                if (!this.batch)
                    this.batch = this.history.find(b => b.state === 'running') || null;
                if (this.batch?.state === 'running')
                    this.poll();
            }
        }
        catch (error) {
            this.error = String(error);
        }
    }
    private async act(action: RepositoryFinishAction, payload: RepositoryFinishPayload = {}) {
        if (!this.invoke || this.busy)
            return;
        this.busy = true;
        this.error = '';
        try {
            const response = await this.invoke(action, payload);
            if (response.kind === 'prepared') {
                this.prepared = response.repositories;
                this.selections = response.repositories.map(repo => ({ worktreeId: repo.worktreeId, fingerprint: repo.fingerprint, remote: repo.remote, defaultBranch: repo.defaultBranch, trustPrograms: repo.transportTrusted,transportFingerprint:repo.transportFingerprint,contributions: [] }));
                this.review = null;
                this.confirmed = false;
            }
            if (response.kind === 'review') {
                this.review = response.review;
                this.confirmed = false;
            }
            if (response.kind === 'batch') {
                this.batch = response.batch;
                if (this.batch.state === 'running')
                    this.poll();
                if (action === 'start') {
                    this.selected = [];
                    this.prepared = [];
                    this.selections = [];
                    this.review = null;
                    this.confirmed = false;
                }
            }
        }
        catch (error) {
            this.error = error instanceof Error ? error.message : String(error);
        }
        finally {
            this.busy = false;
        }
    }
    private poll() {
        clearTimeout(this.timer);
        this.timer = setTimeout(async () => {
            if (!this.isConnected || !this.batch || !this.invoke)
                return;
            try {
                const response = await this.invoke('status', { batchId: this.batch.id });
                if (response.kind === 'batch')
                    this.batch = response.batch;
            }
            catch (error) {
                this.error = String(error);
            }
            if (this.batch?.state === 'running')
                this.poll();
            else
                void this.loadHistory();
        }, 500);
    }
    private includeContribution(index: number, ref: string, included: boolean) { this.selections = this.selections.map((selection, i) => i === index ? { ...selection, contributions: included ? [...selection.contributions, { ref, commitMessage: '', integrate: false, cleanup: false, owned: false, inactive: false, ignoredFilesRebuildable: false }] : selection.contributions.filter(c => c.ref !== ref) } : selection); this.review = null; this.confirmed = false; }
    private async filterCollection(event: Event, key: string, values: string[]) { const generation = (this.collectionGenerations[key] || 0) + 1; this.collectionGenerations[key] = generation; const control = event.currentTarget as HTMLElement & {
        matchValues: (values: string[]) => Promise<boolean[]>;
    }; const matches = await control.matchValues(values); if (this.collectionGenerations[key] === generation)
        this.branchMatches = { ...this.branchMatches, [key]: matches }; }
    private changeContribution(repoIndex: number, ref: string, key: keyof FinishContribution, value: string | boolean) { this.selections = this.selections.map((s, index) => index === repoIndex ? { ...s, contributions: s.contributions.map(c => c.ref === ref ? { ...c, [key]: value } : c) } : s); this.review = null; this.confirmed = false; }
    private async filter(event: Event) {
        const generation = ++this.searchGeneration;
        const control = event.currentTarget as HTMLElement & {
            matchValues: (values: string[]) => Promise<boolean[]>;
        };
        const matches = await control.matchValues(this.repositories.map(r => r.name + ' ' + r.root));
        if (generation === this.searchGeneration)
            this.searchMatches = matches;
    }
    private state(value: string) {
        const labels: Record<string, [
            string,
            string
        ]> = { queued: ['Queued', '等候中'], running: ['Running', '執行中'], completed: ['Completed', '已完成'], failed: ['Failed', '失敗'], cancelled: ['Cancelled', '已取消'], interrupted: ['Interrupted', '已中斷'], attempted: ['Attempted', '已嘗試'], retained: ['Retained', '已保留'], validate: ['Validating', '驗證中'], archive: ['Recovery archive', '復原備份'], commit: ['Preservation commit', '保留提交'], push: ['Push', '推送'], integrate: ['Integration', '整合'], verify: ['Verification', '驗證'], cleanup: ['Cleanup', '清理'], 'default-checkout': ['Default checkout', '預設工作樹'] };
        return labels[value] ? this.l(...labels[value]) : value;
    }
    render() {
        const running = this.batch?.state === 'running';
        return html `<section class="workspace"><div class="row"><mg-icon name="repo"></mg-icon><h1>${this.l('Complete repositories', '完成儲存庫工作')}</h1></div><p class="muted">${this.l('Review preservation commits, push source branches, integrate into the remote default branch, verify a private recovery archive, then remove only explicitly owned inactive contributions. Up to three independent repositories can run together.', '檢查保留提交、推送來源分支、合併至遠端預設分支，驗證私人復原備份，再移除明確屬於此工作而且未使用嘅貢獻。最多同時處理三個獨立儲存庫。')}</p><div class="panel"><h2>${this.l('1. Select repositories', '1. 揀儲存庫')}</h2><mg-search search-id="repository-completion" .label=${this.l('Search open repositories', '搜尋已開啟儲存庫')} @search-change=${this.filter}></mg-search>${!this.repositories.length ? html `<p>${this.l('Open local repositories using the native folder picker first. Reconnect restored tabs before running completion.', '先用原生資料夾選擇器開啟本機儲存庫。還原嘅分頁需要重新連接先可以執行。')}</p>` : nothing}${this.repositories.map((repo, index) => this.searchMatches[index] === false ? nothing : html `<label><md-checkbox ?disabled=${this.busy || running} ?checked=${this.selected.includes(repo.id)} @change=${(e: Event) => { this.selected = (e.target as HTMLInputElement).checked ? [...this.selected, repo.id] : this.selected.filter(id => id !== repo.id); this.review = null; this.prepared = []; this.selections = []; }}></md-checkbox><span class="grow">${repo.name}<div class="path">${repo.root}</div></span></label>`)}<div class="row"><md-filled-button ?disabled=${!this.selected.length || this.busy || running} @click=${() => this.act('prepare', { worktreeIds: this.selected,selections:this.selections })}>${this.l('Inspect selected repositories', '檢查所選儲存庫')}</md-filled-button><md-outlined-select .label=${this.l('Concurrent repositories', '同時執行數目')} .value=${String(this.concurrency)} ?disabled=${this.busy || running} @change=${(event: Event) => { this.concurrency = Number((event.target as HTMLSelectElement).value); }}>${[1, 2, 3].map(n => html `<md-select-option value=${String(n)}><div slot="headline">${n}</div></md-select-option>`)}</md-outlined-select></div></div>
 ${this.prepared.map((repo, index) => html `<section class="panel"><h2>${repo.name}</h2><p class="path">${repo.root}</p><p><strong>${this.l('Push destination', '推送目的地')}:</strong> ${repo.remote} · ${repo.remoteUrl}</p><p><strong>${this.l('Default branch', '預設分支')}:</strong> ${repo.defaultBranch} · <code>${repo.remoteDefaultHead}</code></p><p><strong>${this.l('Commit identity', '提交身份')}:</strong> ${repo.identity}</p><details><summary>${this.l('All working trees','所有工作樹')} (${repo.worktrees.length})</summary><mg-search .label=${this.l('Search working trees','搜尋工作樹')} search-id=${'finish-trees-'+repo.worktreeId} @search-change=${(event:Event)=>this.filterCollection(event,'trees-'+repo.worktreeId,repo.worktrees.map(tree=>tree.root+' '+tree.branch+' '+tree.head))}></mg-search>${repo.worktrees.map((tree,treeIndex)=>this.branchMatches['trees-'+repo.worktreeId]?.[treeIndex]===false?nothing:html`<div class="panel"><p class="path">${tree.root}</p><p class="path">${tree.branch||this.l('Detached checkout; retained','分離工作樹；保留')} · ${tree.head}</p><p>${tree.active?this.l('Selected working tree · ','所選工作樹 · '):''}${tree.locked?this.l('Locked · ','已鎖定 · '):''}${tree.dirty?this.l('Uncommitted changes','有未提交更改'):this.l('Clean','無未提交更改')} · ${this.l('Changed files','更改檔案')}: ${tree.files.length} · ${this.l('Ignored files','忽略檔案')}: ${tree.ignoredCount}</p></div>`)}</details><p class="muted">${this.l('Git transport uses its configured authentication. The application does not infer a hosting account from a URL.', 'Git 傳輸使用已設定嘅認證。應用程式唔會由網址推斷託管帳戶。')}</p>${repo.blockers.map(blocker => html `<p class="error" role="alert">${blocker}</p>`)}${repo.trust.length||repo.blockers.length ? html `<label><md-checkbox ?disabled=${running || this.busy} ?checked=${this.selections[index]?.trustPrograms} @change=${(e: Event) => { this.selections = this.selections.map((s, i) => i === index ? { ...s, trustPrograms: (e.target as HTMLInputElement).checked } : s); this.review = null; }}></md-checkbox>${this.l('Trust these configured repository programs', '信任以下已設定儲存庫程式')}: ${repo.trust.join(', ')||this.l('Git transport authentication','Git 傳輸認證')}</label><md-outlined-button ?disabled=${running||this.busy||!this.selections[index]?.trustPrograms} @click=${()=>this.act('prepare',{worktreeIds:this.prepared.map(item=>item.worktreeId),selections:this.selections})}>${this.l('Retry inspection with the exact trusted configuration','用確切已信任設定重新檢查')}</md-outlined-button>` : nothing}<mg-search .label=${this.l('Search branches', '搜尋分支')} search-id=${'finish-branches-' + repo.worktreeId} @search-change=${(event: Event) => this.filterCollection(event, repo.worktreeId, repo.branches.map(branch => branch.ref + ' ' + branch.head))}></mg-search>${repo.branches.map((branch, branchIndex) => { if (this.branchMatches[repo.worktreeId]?.[branchIndex] === false)
            return nothing; const included = this.selections[index]?.contributions.some(c => c.ref === branch.ref); const contribution = this.selections[index]?.contributions.find(c => c.ref === branch.ref) || { ref: branch.ref, commitMessage: "", integrate: false, cleanup: false, owned: false, inactive: false, ignoredFilesRebuildable: false }, wt = repo.worktrees.find(w => w.branch === branch.ref); const safeCleanup = branch.ref !== 'refs/heads/' + repo.defaultBranch && !wt?.active && !wt?.locked && !wt?.ignoredCount; return html `<div class="panel"><h3>${branch.ref.slice(11)}</h3><p class="path">${branch.head}${wt ? ' · ' + wt.root : ''}</p><label><md-checkbox ?disabled=${running || this.busy} ?checked=${included} @change=${(event: Event) => this.includeContribution(index, branch.ref, (event.target as HTMLInputElement).checked)}></md-checkbox>${this.l("Preserve and push this branch", "保留並推送此分支")}</label><label><md-checkbox ?disabled=${running || this.busy || !included} ?checked=${contribution.integrate} @change=${(e: Event) => this.changeContribution(index, branch.ref, 'integrate', (e.target as HTMLInputElement).checked)}></md-checkbox>${this.l('Integrate this contribution', '合併此貢獻')}</label>${wt?.dirty ? html `<md-outlined-text-field .label=${this.l('Preservation commit message', '保留提交訊息')} .value=${contribution.commitMessage} ?disabled=${running || this.busy || !included} @input=${(e: Event) => this.changeContribution(index, branch.ref, 'commitMessage', (e.target as HTMLInputElement).value)}></md-outlined-text-field><details><summary>${this.l('Review changed files and diff', '檢查更改檔案同差異')} (${wt.files.length})</summary>${wt.files.map(file => html `<p class="path">${file.status} · ${file.path} · ${file.bytes} B</p>`)}<pre tabindex="0">${wt.diff}</pre></details>` : nothing}<p class="muted">${wt?.ignoredCount ? this.l(`${wt.ignoredCount} ignored files are excluded from archives. This working tree will be retained.`, `${wt.ignoredCount} 個忽略檔案唔會備份，會保留此工作樹。`) : this.l('Ignored files are excluded from recovery archives.', '復原備份唔包括忽略檔案。')}</p>${safeCleanup ? html `<label><md-checkbox ?disabled=${running || this.busy || !included} ?checked=${contribution.owned} @change=${(e: Event) => this.changeContribution(index, branch.ref, 'owned', (e.target as HTMLInputElement).checked)}></md-checkbox>${this.l('This contribution belongs to this task', '此貢獻屬於此工作')}</label><label><md-checkbox ?disabled=${running || this.busy || !included} ?checked=${contribution.inactive} @change=${(e: Event) => this.changeContribution(index, branch.ref, 'inactive', (e.target as HTMLInputElement).checked)}></md-checkbox>${this.l('No session is using it and no release process depends on it', '冇工作階段使用中，亦冇發佈流程依賴佢')}</label><label><md-checkbox ?disabled=${running || this.busy || !contribution.owned || !contribution.inactive || !contribution.integrate} ?checked=${contribution.cleanup} @change=${(e: Event) => this.changeContribution(index, branch.ref, 'cleanup', (e.target as HTMLInputElement).checked)}></md-checkbox>${this.l('Remove this exact local/remote branch and its working tree after verification', '驗證後移除此本機及遠端分支同工作樹')}</label>` : html `<p>${this.l('Retained: active, default, locked, or containing ignored files.', '保留：使用中、預設、已鎖定或包含忽略檔案。')}</p>`}</div>`; })}<p>${this.l('Stashes retained', '保留嘅暫存堆')}: ${repo.stashes.length}</p><mg-search .label=${this.l("Search retained stashes", "搜尋保留暫存堆")} search-id=${"finish-stashes-" + repo.worktreeId} @search-change=${(event: Event) => this.filterCollection(event, "stashes-" + repo.worktreeId, repo.stashes.map(stash => stash.ref + " " + stash.subject))}></mg-search>${repo.stashes.map((s, stashIndex) => this.branchMatches["stashes-" + repo.worktreeId]?.[stashIndex] === false ? nothing : html `<p class="path">${s.ref} · ${s.head} · ${s.subject}</p>`)}</section>`)}
 ${this.prepared.length ? html `<md-filled-button ?disabled=${this.busy || running || this.prepared.some(r => r.blockers.length > 0)} @click=${() => this.act('review', { selections: this.selections })}>${this.l('2. Prepare exact review', '2. 準備詳細確認')}</md-filled-button>` : nothing}${this.review ? html `<section class="panel"><h2>${this.l('Review before execution', '執行前確認')}</h2>${this.review.selections.map(selection => html `<div class="panel"><h3>${this.review!.repositories.find(repo => repo.worktreeId === selection.worktreeId)?.name}</h3>${selection.contributions.map(contribution => html `<p class="path">${contribution.ref} · ${this.l("Preserve and push", "保留並推送")}${contribution.integrate ? this.l(" · Integrate", " · 合併") : ""}${contribution.cleanup ? this.l(" · Remove owned source", " · 移除所屬來源") : ""}${contribution.commitMessage ? " · " + contribution.commitMessage : ""}</p>`)}</div>`)}<ol>${this.review.steps.map(step => html `<li>${this.reviewText(step)}</li>`)}</ol>${this.review.warnings.map(warning => html `<p class="muted">${this.reviewText(warning)}</p>`)}<p>${this.l('Expires', '到期')}: ${this.review.expiresAt}</p><label><md-checkbox ?checked=${this.confirmed} @change=${(e: Event) => { this.confirmed = (e.target as HTMLInputElement).checked; }}></md-checkbox>${this.l('I reviewed the exact repositories, branch messages, destination and cleanup choices above', '我已檢查以上確切儲存庫、分支訊息、目的地同清理選項')}</label><md-filled-button ?disabled=${!this.confirmed || this.busy || running} @click=${() => this.act('start', { reviewId: this.review!.id, confirmed: true, concurrency: this.concurrency })}>${this.l('3. Run reviewed operations', '3. 執行已確認操作')}</md-filled-button></section>` : nothing}
 ${this.busy ? html `<md-linear-progress indeterminate aria-label=${this.l('Preparing review', '準備確認中')}></md-linear-progress>` : nothing}${this.error ? html `<p role="alert" class="error">${this.error}</p>` : nothing}${this.batch ? html `<section class="panel" aria-live="polite"><div class="row"><h2 class="grow">${this.l('Batch progress', '批次進度')}</h2>${running ? html `<md-outlined-button @click=${() => this.act('cancel', { batchId: this.batch!.id })}>${this.l('Cancel all remaining work', '取消所有餘下工作')}</md-outlined-button>` : nothing}</div>${this.batch.jobs.map(job => html `<div class="panel"><h3>${job.name} · ${this.state(job.state)}</h3><p>${this.state(job.step)}</p>${job.state === 'running' ? html `<md-linear-progress indeterminate></md-linear-progress>` : nothing}${['running', 'queued'].includes(job.state) ? html `<md-outlined-button @click=${() => this.act('cancel', { batchId: this.batch!.id, jobId: job.id })}>${this.l('Cancel this repository', '取消此儲存庫')}</md-outlined-button>` : nothing}${job.error ? html `<p class="error">${job.error}</p>` : nothing}${job.partialEffects ? html `<p>${this.l('Changes may already exist. Inspect the retained work and remote refs before preparing a new review.', '可能已經有變更。重新確認之前，請檢查保留嘅工作同遠端參照。')}</p>` : nothing}${job.archive ? html `<p class="path">${this.l('Verified private archive', '已驗證私人備份')}: ${job.archive.path} · ${job.archive.entries} · ${job.archive.bytes} B</p>` : nothing}<details><summary>${this.l('Operation journal', '操作記錄')}</summary><mg-search .label=${this.l("Search operation journal", "搜尋操作記錄")} search-id=${"finish-journal-" + job.id} @search-change=${(event: Event) => this.filterCollection(event, "journal-" + job.id, job.events.map(entry => entry.at + " " + entry.state + " " + entry.detail))}></mg-search>${job.events.map((event, eventIndex) => this.branchMatches["journal-" + job.id]?.[eventIndex] === false ? nothing : html `<p class="path">${event.at} · ${this.state(event.state)} · ${event.detail}</p>`)}</details></div>`)}${!running && this.batch.jobs.some(j => j.state !== 'completed') ? html `<md-outlined-button ?disabled=${this.busy} @click=${() => this.act('resume', { batchId: this.batch!.id, worktreeIds: this.repositories.map(r => r.id) })}>${this.l('Inspect unfinished repositories for a new review', '重新檢查未完成儲存庫')}</md-outlined-button>` : nothing}</section>` : nothing}${this.history.length ? html `<details class="panel"><summary>${this.l('Saved batches', '已儲存批次')}</summary><mg-search .label=${this.l("Search saved batches", "搜尋已儲存批次")} search-id="finish-history" @search-change=${(event: Event) => this.filterCollection(event, "history", this.history.map(batch => batch.createdAt + " " + batch.jobs.map(job => job.name + " " + job.state).join(" ")))}></mg-search>${this.history.map((batch, batchIndex) => this.branchMatches.history?.[batchIndex] === false ? nothing : html `<md-text-button @click=${() => {
            this.batch = batch;
            if (batch.state === 'running')
                this.poll();
        }}>${batch.createdAt} · ${batch.jobs.length} · ${this.state(batch.state)}</md-text-button>`)}</details>` : nothing}</section>`;
    }
}
customElements.define('mg-repository-finish', RepositoryFinish);
