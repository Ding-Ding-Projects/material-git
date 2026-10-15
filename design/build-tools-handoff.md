# Build and installer workspaces

Source baseline: `3a83fa1`. Framework: Lit with registered Material Web components. The existing application shell owns navigation and repository context.

The Build and run workspace opens with detected project adapters and the selected repository grant. Detection is evidence, not execution trust. Selecting an adapter fills an editable recipe with an executable, argument array, relative working directory, expected output paths and optional launch command. Native executable selection supports other toolchains. A review shows exact commands, missing prerequisites, source fingerprint, output expectations and the execution-trust acknowledgement. Starting consumes a short-lived review. Changed source or recipe requires a new review.

Jobs show bounded compiler output, phase, exit status and cancellation. A build succeeds only after expected regular files are validated. A launch records its owned PID and observed termination; starting a process alone is not proof that the application works.

The Installers workspace lists immutable owned artifacts with source revision and fingerprint, recipe, target platform, version, SHA-256, size and verification status. Selection enables export to a native-selected directory without overwriting existing files. Reveal, open and install require explicit review; packaging never silently installs. Deletion reviews exact records and owned copies, then rechecks identity. Foreign files remain untouched.

Each recipe, job and installer list has independent search state and an adjacent regular-expression builder. Invalid expressions show errors and never silently become a match-all. Filters, selection, review and progress are keyboard accessible, use 44px minimum controls and expose state through text and live announcements. Enumerations use selects. Use the shell's English, Cantonese and bilingual rendering where provided.

Reference states: `build.detected`, `build.review`, `build.running`, `build.cancelled`, `build.failed`, `build.completed`, `installers.empty`, `installers.selected`, `installers.exported`, `installers.delete-review`, `installers.identity-changed`. Normal viewport 1440x900, minimum 800x600; light/dark; English/Cantonese/bilingual; display scale 100%, 125%, 150%, 200%. Build evidence and real captures are required before those tuples are claimed verified.

Windows root `build.bat` and `build-installer.bat` are canonical when present. Linux equivalents are used only on their supported host. Suggested recipes cover actual manifests and installed tools. Arbitrary languages participate through explicit trusted executable recipes. Windows installer packaging uses genuine Squirrel.Windows; no Linux result claims Windows installer proof.
