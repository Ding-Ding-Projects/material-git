# Building Material Git

On Windows, run `.\build.bat --run` from a checkout. The script uses an existing compatible Node.js runtime or downloads the pinned Node.js 22.20.0 portable archive from nodejs.org, verifies its recorded SHA-256, and activates it for the current process. It installs locked npm dependencies, fetches the bundled GitHub CLI, builds the application, and launches only after success. No administrator access or persistent execution-policy change is needed.

`build.bat /s` builds without a prompt or launch. `/s`, `--silent`, and `SILENT=1` are equivalent. `/run`, `--run`, and `RUN_AFTER_BUILD=1` request launch explicitly; `/s /run` is an explicit automation launch. `fetch-dependencies.bat /s` obtains dependencies without building. `build-installer.bat /s` performs dependency installation, builds, and packages an unsigned Squirrel.Windows installer. It never publishes.

The package output is `out/installer/Setup.exe`, `RELEASES`, full `.nupkg` packages, and `SHA256SUMS`. Packaging verifies nonempty application executable and ASAR files, complete Squirrel outputs, and the Setup executable header, then prints SHA-256 hashes. Windows may warn about an unknown publisher. The packaged app includes the renderer, main process, preload, command catalog, provenance, and bundled CLI; application use does not fetch runtime code from a CDN.

For Linux development with Node.js 22.12 or newer, run `npm run fetch-dependencies`, then `npm run build` or `npm run dev`. Development starts the built Electron app directly; no preview server is required. Electron needs the host's desktop libraries and display services. Linux is a development route; released installers target Windows x64.

## Release dependency inventory

The Windows release job uses Windows PowerShell, portable or compatible Node.js, bundled npm, locked npm packages (including Electron, Vite, esbuild, Electron Packager and electron-winstaller), the verified GitHub CLI dependency, and GitHub Actions checkout/upload actions. Squirrel's packaging tools come from electron-winstaller; no signing key, signing service, compiler, or separate SDK is requested. Runtime and npm dependency versions are declared in `scripts/bootstrap.ps1`, `package.json`, and `package-lock.json`; CLI versions and integrity metadata are declared by the CLI fetcher.

CI derives the package version as `0.RUN_NUMBER.RUN_ATTEMPT`, so every run and rerun has a distinct increasing Squirrel version. The build provenance, staged application manifest, installer metadata, and release title share this version; local builds retain the manifest version. The release tag remains unique per run and attempt.

Every push and manual dispatch builds through the root batch entrypoints and publishes a unique release. CI runs no tests, lint, or type checking. Repository and organization runner inventory could not be inspected because their APIs returned HTTP 403; the workflow uses the pinned `windows-2022` hosted fallback. Release API credentials resolve through `RELEASE_TOKEN`, then `ORG_TOKEN`, then `GITHUB_TOKEN`, without printing them.

Safe installer outputs and provenance are collected after success or failure, with bounded retention. Source, dependency trees, caches, and credentials are excluded. Windows bootstrap and Squirrel installation require a real Windows run for verification; Linux source or build checks do not prove those behaviors. Fresh-machine verification has not yet been recorded.

Windows builds also fetch official MinGit 2.56.0.2 x64 from the Git for Windows release, verify its published SHA-256, and include its complete runtime and license. The executable is `resources/app.asar.unpacked/vendor/git/cmd/git.exe`; the main process adds its directory to the child-process PATH so GitHub CLI clone and checkout workflows need no separately installed Git. Linux development requires system Git.
