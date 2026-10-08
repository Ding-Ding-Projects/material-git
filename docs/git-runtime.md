# Full Git runtimes

Windows packages use the official full PortableGit distribution rather than MinGit. The native binary remains `vendor/git/cmd/git.exe`, so renderer workflow contracts do not change. `scripts/fetch-git.mjs` downloads the pinned asset, checks SHA-256, extracts into a fresh owned stage and runs native verification before replacing the active dependency. Packaging runs the same verification against the unpacked application payload.

| Property | Pinned value |
| --- | --- |
| Official release | `git-for-windows/git`, `v2.56.0.windows.2` |
| Asset | `PortableGit-2.56.0.2-64-bit.7z.exe` |
| Size | 60,027,568 bytes |
| SHA-256 | `075e158ef8e1f0ab80b347e245405d3eca735c2dc88fd8e032e137d0ca61f61b` |
| Download | https://github.com/git-for-windows/git/releases/download/v2.56.0.windows.2/PortableGit-2.56.0.2-64-bit.7z.exe |

Static inspection of the actual checksum-verified asset found 9,624 archive entries, including `cmd/git.exe`, `usr/bin/bash.exe`, `usr/bin/gpg.exe`, `usr/bin/perl.exe`, `usr/bin/ssh.exe`, `ucrt64/libexec/git-core/git-subtree`, `post-install.bat`, `LICENSE.txt` and `README.portable`. This static inspection does not prove Windows execution.

The official self-extractor runs its hidden `post-install.bat` route through `git-bash.exe`. The pinned official build source is https://github.com/git-for-windows/build-extra/blob/75e6f0e19c23c701dc1d56905a32e5efc28c8a8d/portable/release.sh. Its bundled README explicitly requires the post-install step after manual extraction. The fetcher invokes the verified self-extractor with `-y`, `-gm2` and a bound `-InstallPath` in its fresh owned stage. No global Git installation, registry registration or PATH change is requested. Native Windows checks require the expected Git version plus working Bash, subtree help and GPG. They remain a Windows execution requirement until the actual Windows run succeeds.

Linux retains the actual installed Git core version and adds an application-owned subtree helper. It does not replace system Git or write a global libexec directory. The helper comes from official Git commit `a018953688f1b10bddf91bff8747068f5f4746a4` (Git 2.56.0), with these exact checksums:

| File | SHA-256 |
| --- | --- |
| `contrib/subtree/git-subtree.sh` | `444416f46ec74b1c5cfed1df07ce89fe32f17b368950c86780079ded3a3577ae` |
| `COPYING` | `5b2198d1645f767585e8a88ac0499b04472164c0d2da22e75ecf97ef443ab32e` |

The bootstrap stores only the checked helper and license under `vendor/git-linux`. GitService accepts that main-process directory, verifies the source bytes and directory inventory again, and prepends it only to each owned subprocess PATH. Git's actual compiled libexec directory supplies `git-sh-setup` and its normal helpers. The application reports the core version separately from the helper version.

Dependency downloads honor configured HTTP/HTTPS proxies and CA trust through supported Node flags; they do not disable TLS verification or bypass a managed proxy. Download bytes have explicit size limits and pinned digests. An unsupported proxy-capable Node runtime fails with a precise message.

The current Linux proof uses Git core 2.52.0 plus the checked Git subtree 2.56.0 helper. Real isolated fixtures add and pull a subtree, split its history and publish to an explicitly approved owned local repository and fresh branch. They preserve the source's checked-out branch. This proof does not establish every subtree option or Windows subtree execution.

# 完整 Git 執行環境

Windows 會隨程式提供官方 PortableGit 完整套件，包括 Bash、GPG 同 subtree，下載後核對固定 SHA-256，再喺獨立暫存目錄完成解壓同原生驗證。安裝流程唔會要求全域 Git 安裝、登錄設定或者修改系統 PATH。靜態套件檢查唔代表 Windows 已成功執行，仍然要等真實 Windows 驗證。

Linux 保留實際系統 Git 核心版本，只喺程式擁有嘅目錄加入已核對來源同授權嘅 subtree 工具。每個受控程序先用呢個工具目錄，唔會改全域 libexec。介面會分開顯示核心同工具版本。隔離測試已用真正本機儲存庫驗證 subtree 加入、拉取、拆分同發佈，唔會改動用戶遠端。
