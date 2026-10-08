# Reviewed desktop captures

These nine unedited captures come from the running Material Git desktop application, using an isolated Playwright Electron session on Linux x64. The application authenticated to GitHub and loaded the public `Ding-Ding-Projects/material-git` repository. The capture receipt recorded no application errors. This is Linux desktop evidence; it does not establish Windows installer verification or completion of every control visible in a screenshot. The accounts receipt records one authenticated account after refresh completed, with no reported account error.

- Application version: `0.1.0`.
- Application source: [`44dc9d8dc30a4e327a98c8a6936f97a946feab55`](https://github.com/Ding-Ding-Projects/material-git/commit/44dc9d8dc30a4e327a98c8a6936f97a946feab55).
- Build time: `2026-10-08T12:44:38.887Z`.
- Every image: 1500 × 950 pixels. Capture timestamps below use UTC.
- Captures are copied without cropping, annotation, simulated content, or image generation.
- The adjacent `captures.json` records original SHA-256 hashes. Each copy was checked against its capture receipt before commit.

| Capture | Captured at (UTC) | Observed content |
| --- | --- | --- |
| [Desktop workspace](desktop.png) | `2026-10-08T12:46:10.780Z` | The genuine desktop workspace, showing the live public repository and its detail panel. |
| [Repository details](repositories.png) | `2026-10-08T12:46:10.705Z` | The authenticated repository view for Ding-Ding-Projects/material-git, captured from the running application. |
| [Issues: real empty state](issues.png) | `2026-10-08T12:46:11.307Z` | GitHub returned no open issues for this repository at capture time. The empty state contains no sample records. |
| [Pull requests: real empty state](pull-requests.png) | `2026-10-08T12:46:11.907Z` | GitHub returned no open pull requests for this repository at capture time. No fixture data is displayed. |
| [Actions runs and jobs](actions.png) | `2026-10-08T12:46:13.524Z` | Live GitHub Actions history, with 15 returned runs and details of a successful Windows release job. |
| [Release history and notes](releases.png) | `2026-10-08T12:46:14.963Z` | Live release history, with 10 returned records and the selected release’s original notes. |
| [Active account and credential source](accounts.png) | `2026-10-08T12:50:16.799Z` | The authenticated active account and its environment-token notice. Environment credentials take precedence over saved accounts; no credential value is visible. |
| [Desktop preferences](settings.png) | `2026-10-08T12:46:15.924Z` | The desktop preferences screen, showing language, app name and playfulness controls and the available settings sections. |
| [Local source control](source-control.png) | `2026-10-08T12:46:16.337Z` | The actual local Git repository opened through the native picker, with a clean worktree and explicit repository trust controls. This frame does not verify a commit operation. |

The previous command-catalog `desktop.png` has been replaced with the genuine desktop workspace capture. The narrow desktop capture is withheld while its known layout issue is corrected and reviewed again.

## 廣東話說明

呢九張未經修改嘅畫面，係由 Linux x64 上實際執行嘅 Material Git 桌面應用程式擷取。應用程式已登入 GitHub，並載入公開嘅 `Ding-Ding-Projects/material-git` 倉庫。Issues 同 pull requests 畫面係擷取嗰陣嘅真實空白狀態，冇加入示範記錄。帳戶畫面喺重新整理完成後擷取，顯示一個已驗證帳戶，同環境憑證優先於已儲存帳戶嘅提示。擷取記錄冇應用程式錯誤，但唔代表 Windows 安裝程式已驗證，亦唔代表畫面上每個控制項都已完成驗證。

舊指令目錄畫面已換成真實桌面工作空間。窄畫面擷取仍然保留唔公開，等已知排版問題修正同重新檢查。每個圖像檔案嘅 SHA-256 都已同擷取記錄核對。
