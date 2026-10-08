# Repository comparisons

The `mg-git-comparison` Material panel offers focused read-only comparisons. References and commits come from the host's native repository records. It contains no command console or arbitrary argument field.

For three local text files, use the separate [native file merge guide](git-file-merge.md), including its [Cantonese counterpart](git-file-merge.yue.md). That workflow offers editable conflict previews and a reviewed fresh-file save; it does not change the read-only scope of this comparison panel.

| Destination | Native form | Supported choices |
| --- | --- | --- |
| Contributors | `shortlog --summary --numbered --group=… --max-count=… --skip=… <refs> --` | 1 to 20 selected references; author or committer; optional email; commit-window paging |
| Patch equivalence | `cherry -v <upstream> <head> [lower-boundary]` | Selected upstream, head, and optional lower boundary |
| Compare patch series | `range-diff --no-color --no-dual-color --no-ext-diff --no-textconv <old-base>..<old-tip> <new-base>..<new-tip> --` | Four selected endpoints; optional integer creation factor 1 to 999 |
| Reference names | `name-rev --always [scope] -- <commits>` | 1 to 100 selected commits; all references, tags, or branches |
| Identity mapping | `check-mailmap --stdin` | 1 to 100 identities, each formatted as `Name <email@example.com>` |
| Identify patch | `patch-id --stable` or `--verbatim` | UTF-8 Git patch, at most 200 KiB; stable or whitespace-preserving identity |
| Normalize draft | `stripspace [--strip-comments or --comment-lines]` | UTF-8 text, at most 200 KiB; keep, remove, or add `#` comments |

Contributor totals cover only the selected commit window on the current page. The default window contains up to 200 commits; users may select 1 to 1000. These are not full-history contributor totals split into contributor pages. The next page is allowed while the current window has contributors; a final empty page reports no matching records.

Patch equivalence uses Git's patch comparison rather than object-ID equality. A minus sign means the selected head contains a patch equivalent to a change upstream; a plus sign means Git did not find an equivalent upstream patch. Range comparison shows Git's series alignment and patch differences without changing either branch. External diff drivers and text conversion are disabled explicitly.

The native helper `buildGitComparison(kind, fields, context)` returns `{argv, input?}`. It validates exact field names, value types, enumerated strategies, reference bounds, and UTF-8 input limits. Caller-owned reference validation is followed by a second check rejecting option prefixes, range expressions, object-path expressions, wildcard patterns, and control characters. The host must use its existing owned native runner with `shell: false`, output limits, timeout, trust policy, and cancellation. The helper does not execute processes or accept filesystem paths.

The registered panel accepts these properties:

- `bridge: (kind, fields) => Promise<GitResponse>`, returning native `text` or successful `result` responses.
- `references: GitRow[]` and `commits: GitRow[]`, with native reference or commit IDs in `id` and friendly descriptions in `label` and `detail`.
- `language: 'en' | 'yue' | 'both'` for English, Cantonese, or bilingual labels.

It emits bubbling, composed `comparison-state` events with `{busy: boolean}` for observation. The host owns operation IDs, cancellation, repository grants, and error redaction. Recreate or reset the panel when switching repositories so selections and results cannot refer to the previous repository. Changing form fields hides stale output. The panel does not write normalized drafts or apply patches.

`tests/git-comparison.test.ts` uses isolated temporary repositories, empty global configuration, no system configuration, separate subprocess arguments, and no remotes. Native fixtures verify all seven forms, real cherry-picked equivalence, series comparison, mailmap mappings, commit-window paging, patch identities, and comment normalization. A headless Chromium test bundles the actual registered Material component and sends its bridge requests to native Git, then checks rendered contributor and reference tables, identity mapping, draft normalization, Cantonese labels, light-theme text color, a narrow layout, and absence of page errors. This proves the tested browser panel and native forms, not Windows installer execution or complete support for every Git option.

## 粵語

比較面板提供貢獻者統計、修補等價比較、修補系列比較、參照名稱、身份對應、修補識別碼同草稿整理。參照同提交由原生儲存庫記錄提供，使用選擇器揀選，唔接受任意指令參數。

貢獻者數目只計算目前頁面嘅提交範圍，預設最多 200 個提交，可設定 1 至 1000 個。修補等價比較按內容判斷，唔係比較提交識別碼。系列比較會停用外部差異工具同文字轉換。所有比較都唔會改動分支、套用修補檔或者覆寫草稿。

身份資料最多 100 個，每行使用 `Name <email@example.com>`。修補檔同草稿文字最多 200 KiB。介面提供英文、粵語同雙語標籤；原生執行、取消、輸出限制同錯誤遮罩由主程式負責。現有證據涵蓋隔離 Git 測試同實際瀏覽器 Material 面板，唔代表 Windows 安裝程式或者所有 Git 選項已經驗證。
