# Native Git runtime verification

Windows uses the official PortableGit 2.56.0.windows.2 archive, pinned by its published SHA-256 in `scripts/fetch-git.mjs`. The full core runtime retains Bash, Perl, SSH, signing tools and the official subtree helper. The optional Git LFS extension is excluded; the core command inventory does not include that extension.

Extraction uses the package-lock-pinned installer dependency's 7-Zip executable as a data extractor. Recursive filename exclusions prevent the extension executable and documentation from entering the fresh staging directory. The build removes preconfigured extension filter sections only from configuration files inside that owned stage. It rejects residual extension payloads, indirect configuration references and post-install scripts that mention the excluded extension.

The official portable README requires post-install after manual extraction. Before execution, the batch file is compared against the SHA-256 of its pinned official source, with CRLF normalized to LF. Its documented launcher runs in the owned stage with an isolated global Git configuration. Successful post-install removes its own batch file; the final payload verifier therefore requires runtime files rather than that temporary installation file. Verification checks actual Git, Bash, GPG and subtree help execution, then repeats policy validation after packaging. Only a verified stage replaces the previous vendor directory.

The Linux fixtures prove configuration removal and rejection behavior, and confirm the pinned dependency extractor exists. They do not prove Windows extraction or executable behavior. A native Windows build must pass the entire staging and packaged-payload verification before release.

Linux keeps the actual system Git core version distinct from the pinned official Git 2.56 subtree script. The helper is stored in an application-owned directory, checksum verified, and added to the owned Git process search path without replacing the system executable directory or writing global configuration.

## Cantonese note

Windows 套件保留完整 Git 核心、Bash、Perl、SSH、簽署工具同 subtree。額外 Git LFS 擴充會喺解壓時排除，相關預設篩選設定只會由新建嘅套件暫存目錄移除。正式發布之前，Windows 必須實際驗證解壓、安裝後程序同打包後嘅執行檔；Linux 測試唔會當作 Windows 執行證明。
