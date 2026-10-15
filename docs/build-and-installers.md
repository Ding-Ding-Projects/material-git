# Build, run and manage installers

Open an approved local repository and choose **Build and run**. Detected manifests suggest project recipes for Node.js (npm, pnpm, Yarn and Bun), Deno, Cargo, Go, Python, .NET, Maven, Gradle, CMake, Meson, Make, Swift and Flutter. Detection does not mean a project has been built successfully or every toolchain is installed. Configure the project's actual build arguments, working directory and exact expected output files before reviewing execution.

On Windows, existing root `build.bat` and `build-installer.bat` entrypoints take precedence. Supported Linux equivalents use root `build.sh` and `build-installer.sh`. Material Git documents `npm run build` as its Linux development build. Installer production for Material Git remains Windows-only.

Custom recipes use a native-selected executable, individual arguments and a relative working directory. Arguments are passed directly without shell interpolation. This allows other languages to participate through their real build tools. A build review lists the exact commands, expected files, missing tools, source revision and fingerprint. Explicit execution trust is required. Changing source, tool identity or worktree permission invalidates the review. Reviews expire after two minutes and can be used once.

Builds have a configurable bounded time limit, bounded redacted output and cancellation of their owned process tree. A successful command is insufficient: every expected output must be a newly created or changed nonempty regular file. The source fingerprint must still match after the build. Optional launch records the actual owned PID and its observed exit. This is process evidence, not proof that every application feature works.

Recipes can be saved per repository. Drafts, independent search expressions and installer selections survive workspace navigation within the current app session. Each collection has its own search and adjacent regex builder. The shell receives dirty and busy state so it can protect ongoing work.

The **Installers** page stores owned copies of verified package files with source revision, source fingerprint, recipe, platform, version, size and SHA-256. Export selects a directory through the native picker, refuses existing destination files and verifies copied bytes. Deletion reviews exact owned records and copies; exported copies and foreign files remain. Changed or missing artifact identities block actions. Opening or installing an artifact requires a separate explicit review and native operating-system handoff. Packaging does not install software or imply elevation consent.

Windows installer recipes must produce genuine Squirrel.Windows `Setup.exe`, `RELEASES` and at least one full `.nupkg`. The catalogue checks executable/package signatures and RELEASES hashes and sizes. Other hosts accept recognized package formats, including portable `.tar.gz` and `.zip`, Debian/RPM packages and AppImage. A recognized format check does not establish successful installation on another host.

For an already-built Windows application, the included `scripts/package-app.mjs` helper wraps the same pinned `electron-winstaller` dependency as Material Git's packaging path. It accepts any genuine Windows app payload, validates the PE executable and payload paths, creates an exclusive fresh output directory and verifies Squirrel's outputs. It does not overwrite an old package directory, sign, install, publish or elevate. Use a reviewed native-selected Node executable and individual arguments such as:

```text
scripts/package-app.mjs
--app-directory
out/MyApp-win32-x64
--exe
MyApp.exe
--name
MyApp
--version
1.2.3
--authors
Example Author
--output-directory
out/installer-1.2.3
```

The helper and its pinned dependency must be present in the project's reviewed packaging route. Integrate that route into an existing canonical `build-installer.bat` when present. List the exact generated `Setup.exe`, `RELEASES` and versioned full package paths as expected outputs. Windows packaging and native installation require Windows verification; Linux fixtures do not establish them.

Failed builds offer an optional Codex CLI or OpenCode repair. Repair can modify repository files, and missing CLI acquisition follows the selected provider's official installation route. Automatic approval is off for every run. Enabling it explicitly grants the provider's broad unattended execution mode for that run. Repair has independent cancellation and bounded diagnostics. After repair, inspect changed source and obtain a new build review before retrying.
