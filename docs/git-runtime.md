# Native Git runtime verification

| Property | Pinned value |
| --- | --- |
| Official release | `git-for-windows/git`, `v2.56.0.windows.2` |
| Asset | `PortableGit-2.56.0.2-64-bit.7z.exe` |
| Size | 60,027,568 bytes |
| SHA-256 | `075e158ef8e1f0ab80b347e245405d3eca735c2dc88fd8e032e137d0ca61f61b` |
| Download | https://github.com/git-for-windows/git/releases/download/v2.56.0.windows.2/PortableGit-2.56.0.2-64-bit.7z.exe |


Windows uses the official PortableGit 2.56.0.windows.2 archive, pinned by its published SHA-256 in `scripts/fetch-git.mjs`. The full core runtime retains Bash, Perl, SSH, signing tools and the official subtree helper. The optional Git LFS extension is excluded; the core command inventory does not include that extension.

Extraction uses the package-lock-pinned installer dependency's 7-Zip executable as a data extractor. Recursive filename exclusions prevent the extension executable and documentation from entering the fresh staging directory. The build removes preconfigured extension filter sections only from configuration files inside that owned stage. It rejects residual extension payloads, indirect configuration references and post-install scripts that mention the excluded extension.

The official portable README requires post-install after manual extraction. Before execution, the batch file is compared against the SHA-256 of its pinned official source, with CRLF normalized to LF. The batch's own instructions specify `git-bash.exe --no-needs-console --hide --no-cd --command=post-install.bat`. The build uses that exact invocation in the owned stage with an isolated global Git configuration, without requesting a console in the hidden worker. It verifies that these instructions remain present in the checksum-bound batch. Launch failures report bounded, redacted stdout and stderr together with exit status, signal and process error code. Successful post-install removes its own batch file; the final payload verifier therefore requires runtime files rather than that temporary installation file. Verification checks actual Git, Bash, GPG and subtree help execution, then repeats policy validation after packaging. Only a verified stage replaces the previous vendor directory.

The Linux fixtures prove configuration removal and rejection behavior, and confirm the pinned dependency extractor exists. A separate data-only extraction of the actual checksum-verified PortableGit archive, using bundled 7-Zip 26.04 with the same recursive exclusion, also passed policy validation. The actual archive's post-install file matched the pinned normalized SHA-256 `fbadaec06d213c42fc7b9f7729c2b94b75610f07108da792ad7a5032e0459038`, and all five shipped post-install scripts passed inspection. No Windows executable or excluded extension was invoked. These checks do not prove Windows extraction or executable behavior. A native Windows build must pass the entire staging and packaged-payload verification before release.

An earlier Windows build reached data extraction but failed during post-install with blank stderr. That invocation incorrectly used `--needs-console`. The corrected documented argument and a real subprocess fixture verify argument forwarding, owned working directory, bounded execution and useful diagnostics even when a child exits without output. Linux cannot prove that the Windows launcher now succeeds; the next native Windows build must establish that result.

Linux retains the actual installed Git core version and adds an application-owned subtree helper. It does not replace system Git or write a global libexec directory. The helper comes from official Git commit `a018953688f1b10bddf91bff8747068f5f4746a4` (Git 2.56.0), with these exact checksums:

| File | SHA-256 |
| --- | --- |
| `contrib/subtree/git-subtree.sh` | `444416f46ec74b1c5cfed1df07ce89fe32f17b368950c86780079ded3a3577ae` |
| `COPYING` | `5b2198d1645f767585e8a88ac0499b04472164c0d2da22e75ecf97ef443ab32e` |

The bootstrap stores only the checked helper and license under `vendor/git-linux`. GitService accepts that main-process directory, verifies the source bytes and directory inventory again, and prepends it only to each owned subprocess PATH. Git's actual compiled libexec directory supplies `git-sh-setup` and its normal helpers. The application reports the core version separately from the helper version.

Dependency downloads honor configured HTTP/HTTPS proxies and CA trust through supported Node flags; they do not disable TLS verification or bypass a managed proxy. Download bytes have explicit size limits and pinned digests. An unsupported proxy-capable Node runtime fails with a precise message.

The current Linux proof uses Git core 2.52.0 plus the checked Git subtree 2.56.0 helper. Real isolated fixtures add and pull a subtree, split its history and publish to an explicitly approved owned local repository and fresh branch. They preserve the source's checked-out branch. This proof does not establish every subtree option or Windows subtree execution.


Linux keeps the actual system Git core version distinct from the pinned official Git 2.56 subtree script. The helper is stored in an application-owned directory, checksum verified, and added to the owned Git process search path without replacing the system executable directory or writing global configuration.

## Cantonese note

Windows 套件保留完整 Git 核心、Bash、Perl、SSH、簽署工具同 subtree。額外 Git LFS 擴充會喺解壓時排除，相關預設篩選設定只會由新建嘅套件暫存目錄移除。正式發布之前，Windows 必須實際驗證解壓、安裝後程序同打包後嘅執行檔；Linux 測試唔會當作 Windows 執行證明。
