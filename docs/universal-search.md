# Universal search

Ctrl+Shift+F opens the bounded or full-window search palette. Its registry includes every base setting, nested scheduled settings, security controls, local vocabulary controls, native contextual GitHub actions, command schemas, offline articles, and title-bar appearance properties in all twelve states. These entries exist before their pages are mounted. Saved schedule rules are indexed from the native preferences status; private tokens and image payloads are never indexed.

Base setting rows contain working switches, bounded sliders and numeric inputs, searched choices, a color control, and the actual installed-language voice choices. They use the existing settings validator and native settings bridge, so native persistence and managed history are the same as the original settings page. Font choices use native font enumeration. Missing saved voices remain selected rather than being silently replaced. The custom image row opens the owning upload control; its explanation names why image conversion needs that full editor.

Each choice popup owns its text search and adjacent full regex builder. Search filtering preserves its selected value. Palette selection has explicit page, matching-set and inverse scopes. Only the current result page constructs inline controls.

Selecting an off-page result asks the application to open its owning workspace and then calls `focusDiscoveryResult`. Settings open the exact hidden tab; a schedule result selects its saved rule. Contextual task handoffs use the original workspace's busy and draft guards, expose the reviewed form, and never submit or automatically read a task. Appearance results open the anchored title-bar editor and focus the exact state/property. An unavailable or refused target is reported by the application, without silently changing unrelated work. Command entries without a registered contextual control explicitly disclose that boundary and open documentation rather than executing a generic command.

The renderer integration binds the actual presentation mode and native preferences status to the palette. When the shared presentation mode is enabled, hidden language, vocabulary and humor capabilities are omitted from discovery, including articles about them. Its user-selected name is passed to the security result instead of exposing a shipped name.

Verification: `tests/workspace-discovery-render.test.ts` runs bundled registered Material controls, checks off-page registry coverage, changes a real settings slider, rejects an invalid numeric update, and focuses the timezone field in the hidden scheduled-settings tab. This establishes deterministic fixture behavior; live provider permissions and platform font/voice availability remain native runtime facts.

[廣東話](universal-search.yue.md) · [Workspace](workspace.md)
