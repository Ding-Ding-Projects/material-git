# Element appearance and portable themes

Open an element’s appearance action to edit its stable design identifier. The editor supports normal, hover, focus, pressed, selected, disabled, dragged, validation, loading, success, warning and error states. Normal values inherit naturally through CSS; other states retain explicit overrides. Temporary scheduled appearance merges above the local base and disappears without rewriting the base cache. Styles are installed in the element’s actual document or shadow root, so nested components are not skipped.

Typography includes family, free numeric size and slider, weight, style, underline/strikethrough, letter spacing, line height and alignment. Installed families come from the native font inventory with an honest system fallback. Colour entry accepts hexadecimal, RGB and HSL with bounded channels, palettes, recent colours and a text/background contrast readout. The readout explicitly assumes opaque colours; it does not claim to validate arbitrary image backgrounds or alpha-composited output.

Each state holds up to 32 ordered named layers with groups, visibility, edit locks, duplicate, rename, reorder and reset. CSS composition supports solid and image fills, linear/radial/conic gradients, stripes, dots and checker patterns, blend modes, borders, outlines, multiple shadows, glows, filters and backdrop blur. Geometry includes numeric dimensions, spacing, corner shape, rotation, translation, scale, skew, perspective and transform origin. Rectangular, elliptical and SVG path clipping are non-destructive. Local PNG/JPEG/WebP fills are decoded and converted to a bounded local PNG; SVG, animation and external image URLs are refused.

The searchable inspector uses the application regex builder. Property, layer, state, element and global reset, undo/redo, local style copy/paste, named themes and JSON import/export are available. Every commit retains a bounded local history snapshot and exports use appearance schema version 2; version-1 element exports remain readable. The cache is validated as a whole, unknown fields and unsafe CSS choices are rejected, and an invalid import changes nothing. Global reset clears saved element appearances; scheduled overrides continue until their rules are disabled.

The capability disclosure names platform limits: pixel channels, brush painting, raster color sampling, mesh warp and smart-object editing need a raster/vector document engine. The current editor operates on DOM CSS composition; these tools are not implemented or claimed. Layer groups are labels for organization, not nested raster documents. This is a real reversible CSS editor, and it does not satisfy Photoshop raster-tool parity.

Tests cover all twelve states, property bounds, duplicate layer identifiers, forbidden remote/SVG fills, path injection and contrast ratios. `node tests/preferences.browser.mjs` additionally drives actual editor font application, undo/redo, layer rename, local copy/paste and narrow settings layout in the built desktop. These checks are not a complete per-click capture ledger for every possible CSS property or a Windows visual-parity certification.

## Non-modal access and typography

The application can install `installAppearanceRoutes` once and dispose it with the window. `Ctrl+Alt+A` opens the focused element; ordinary context access offers **Edit appearance…**, while Shift+right-click opens directly. Existing handled tab menus retain their management actions and delegate appearance by ID. The editor uses a non-modal top-layer panel, tracks the selected element during scrolling and resizing, closes when its target disappears, and returns focus. Controls inside the editor can themselves be selected without removing the parent editor.

Explicit application design IDs remain the preferred persistent identity. Other rendered controls derive an opaque ID from their structural position across open shadow roots; text, values, provider labels and file paths are excluded. Structural IDs follow the layout position, so changing an unkeyed list's order or replacing its structure can associate a style with that position. Persistent per-record identity for unkeyed provider rows remains an open requirement.

Property tabs separate typography, color, geometry and effects. Typography adds word spacing, indentation, baseline offsets, superscript/subscript, small capitals, number forms, kerning, direction, capitalization, overline, double/wavy/dotted decoration, decoration color/thickness/offset, text outline, shadow and highlight. Variable font axes accept validated four-character tags and numeric values. An axis affects rendering only if the selected font implements it; axis enumeration is not claimed. Installed font search has its own regular-expression builder and names render in their own font face.

## Continuous color translation

The color editor has a continuous saturation/brightness field, keyboard-accessible numeric equivalents, hue and alpha controls, HEX/HEX8, CSS named-color input, and translations among RGB, HSL, HSV/HSB, HWB, CIELAB/LCH with D50 reference white, OKLab/OKLCH with D65 reference white, and mathematical CMYK. CMYK is unprofiled and does not claim printer ICC accuracy. Copy preserves the selected representation and alpha. The contrast readout composites alpha against the supplied background, with white behind a transparent background.

Out-of-sRGB values remain a pending choice: the editor warns before changing the saved style, and requires **Apply clipped sRGB**. Cancel keeps the original style. The saved CSS model remains sRGB; this is not a wide-gamut document engine.

## Capability and evidence boundaries

| Capability | Implementation and persistence | Evidence or remaining boundary |
| --- | --- | --- |
| Expanded typography | Validated state/layer values, CSS rendering, existing undo/history/import/export | Pure validation and emitted CSS regression checks; physical Electron fixture edits font weight |
| Nine color spaces and alpha | Bidirectional numeric transforms, explicit clipping, saved HSL and alpha | Primary/mixed-color round trips, out-of-gamut and alpha contrast tests; physical color-space and cancel checks |
| Universal focus/context route | Composed tree and structural/explicit target IDs; anchored non-modal panel | Compiled Electron fixture, keyboard, mouse, focus return, narrow viewport; integrated app hook owned by shell |
| Application history | `appearance-change` emits schema version, target ID, validated record and timestamp | Local bounded history exists; native append-only Git history requires the shell/native integration |
| Raster/vector document tools | Bounded PNG crop/transform and numeric vector composition, plus CSS fills/masks/layers | Channels, brush painting, color-range/freehand selections, smart objects, mesh warp, guides and a full document compositor remain unavailable |
| Complete parity | No claim of complete Word/Photoshop parity | Live variable-axis discovery, every-property localization and platform-specific evidence remain open |

The component browser test uses a clearly labeled local fixture and a fixture font bridge. It does not establish provider permissions, Windows installation, native font enumeration or the final integrated app's behavior. No fixture image belongs in the product gallery.

## Animated rainbow

Foreground, background and border color modes can select **Animated rainbow** from the same color editor. This is a validated mode marker, not a hex string or palette swatch. Solid colors remain saved underneath; returning to solid restores them. Rainbow renders at full saturation and 50% lightness while retaining the selected alpha.

One application-wide speed level is stored locally. Levels 1–5 map to 32, 16, 8, 4 and 2 seconds per cycle. A single registered CSS custom property animates on the document root and is inherited by every rainbow surface, including shadow-root controls. There are no per-frame renderer callbacks or per-element animation clocks. System reduced motion or the app's motion-off setting stops the cycle at hue 270. The color editor explains the shared scope and duration. Corrupt or invalid stored speed returns to level 3; out-of-range writes are rejected.

Pure tests cover the sentinel, speed validation and reduced-motion rules. The compiled Electron fixture verifies actual hue changes, then emulates reduced motion and verifies that the rendered color stays fixed. The global speed remains a local setting; appearance-record export currently carries the per-element mode but not this global speed.

## Non-destructive PNG crop and transform

Existing local PNG fills now expose source-pixel crop bounds, clockwise quarter-turn rotation and horizontal/vertical flips. The preview is generated from the preserved original; **Apply image transform** commits the derived PNG plus the original and numeric recipe to the selected state/layer. Repeated edits start from the original instead of repeatedly resampling previous output. Undo, layer switching and imported records reload the stored recipe. Reset preview restores the full original geometry without changing the active fill until Apply.

The PNG preflight bounds encoded bytes to 36 KiB, data URLs to 48 KiB, dimensions to 512 × 512 and decoded pixels to 262,144. It checks the signature, chunk framing, header, image data and end marker before Chromium decoding. Animation and compressed metadata chunks are rejected. The decoder must agree with the header dimensions; derived PNG bytes are checked again before Apply. A failed preview preserves the active fill and original. The existing local-image importer produces smaller 128-pixel display fills; these tools do not recover discarded source detail or modify the chosen file.

A pixel regression drives real Material crop, rotation and flip controls in Electron, decodes the actual emitted PNG and checks its exact dimensions and RGBA pixels. This is a labeled component fixture, not a real document or public gallery capture. Broad raster painting, channels, freehand/color-range selection, advanced vector boolean operations, smart objects and warp remain unimplemented.

The shell/palette can call `focusProperty(state, field)` on `mg-appearance`. It validates the state, clears property filtering, selects the actual property group, waits for rendering, then focuses the exact visible Material control. It returns `false` for missing or disabled controls, including raster controls when no fill exists.

## Bounded vector composition

Each appearance state/layer can retain a versioned vector document alongside its derived PNG fill. **Vector shapes and paths** opens a real canvas composition with rectangle, ellipse, triangle, cubic-curve and elliptical-arc presets. An ellipse uses four cubic segments. Select a shape to change its name, visibility, lock, ordering, duplicate/delete state, fill, stroke width/color/join, opacity and one of six blend operations. Supported blends are source-over, multiply, screen, overlay, darken and lighten; fill rules are nonzero and evenodd. Shape opacity is applied once after fill and stroke are combined, matching SVG group opacity at overlapping edges.

Blue handles move endpoints and orange handles move Bézier controls. Drag a handle or focus it and use arrow keys; Shift changes the step from one to ten source pixels. Coordinate fields provide the same operations without dragging. Paths support numeric move, line, quadratic, cubic, elliptical-arc and close commands (M/L/Q/C/A/Z), append/delete operations, and segment conversion. Quadratic-to-cubic degree elevation is exact. Converting cubic to quadratic approximates the curve, and converting a curve to a line removes controls; the editor discloses both changes and keeps Undo available.

The preview is rendered through the canvas compositor. Applying emits the validated vector source plus its derived PNG and resets the raster crop recipe to that new source. Existing appearance Undo/history retains the previous applied record. Unapplied vector edits have their own 30-step Undo/Redo history and remain separate from the active layer. Switching states/layers retains mounted previews by context. Closing an editor with any such preview asks whether to discard it; opening a nested appearance editor does not clear the parent's dirty state. Drafts are not durable until Apply and are not included in exports of other contexts.

Bounds are explicit: canvas dimensions 16–512 pixels, at most 16 shapes, 128 commands per shape, 512 commands total, 32 KiB source JSON, finite coordinates between -1024 and 1024, and the existing PNG fill limits. Input accepts only the versioned vector JSON schema. Arbitrary SVG markup, scripts, external URLs, unknown commands/properties, duplicate shape IDs and excessive geometry are rejected. SVG export is regenerated from numeric geometry and allowlisted paint; shape names never enter markup. Exported image paint is static, so that nested color picker visibly disables rainbow with an explanation; the containing UI layer retains its separate animated color modes.

Source JSON uses the existing reviewed export flow. Builds with the optional native `exportAppearance` bridge also offer SVG/PNG files through the native save picker; otherwise those choices show their unavailable boundary. The bridge takes `{document, format: 'svg' | 'png', png?}` and returns `{saved, name?}`. Native code validates the source, regenerates SVG and validates/reencodes PNG, but does not prove document-to-PNG correspondence by independently rendering it. The renderer regression separately verifies that correspondence for the exercised fixtures.

The Electron fixture physically drags endpoints, moves curve controls by keyboard, undoes edits, checks state-scoped preview retention and discard review, exercises nested dirty guards, changes actual compositing controls, and checks exported SVG and PNG pixels. Its owned file-writing bridge is explicitly a fixture, not evidence for the production native save dialog. Boolean path operations, text-to-outline conversion, mesh warps, raster painting, channels and complete Photoshop parity remain unavailable.

### Integration handoff

The shared module exports `validateVector`, `vectorSvg`, `vectorPath`, `vectorPreset` and `convertVectorCommand`. The appearance route emits aggregate `appearance-work-state` with `{id: "appearance", busy, dirty}` across nested editors. The shell should include that state in its existing close/update guard. The anchored editor owns draft-discard confirmation; saved-record history remains the existing `appearance-change` integration. `focusProperty(state, "vector")` focuses the real vector control.

Validation for this checkpoint: TypeScript, 18 appearance source tests, 14 vector Electron fixture checks and 15 existing appearance Electron fixture checks passed. These checks cover the bounded workflow above; they do not certify every property, every platform or the optional production native export bridge.

### Elliptical arc paths

**Add arc** creates an editable elliptical arc. Its endpoint uses the same pointer/keyboard handle as other paths; numeric fields edit radii (0–1024 source pixels), axis rotation (-360–360 degrees) and endpoint coordinates. Long-arc and clockwise-sweep chips select the two SVG arc flags. The renderer uses the browser’s native bounded `Path2D` geometry, and SVG export preserves the exact numeric arc command. Radii expand when necessary to connect the endpoints; zero radius becomes a straight line and coincident endpoints produce no arc, following SVG semantics. **Replace arc with line** removes curvature with an explicit label and remains reversible through Undo. Conversion to quadratic/cubic approximations is unavailable. Tests compare real rotated-arc coverage between Canvas and decoded SVG, alongside numeric/schema rejection checks.

Arc records retain vector schema version 1 with an expanded command allowlist; older builds that lack `A` support reject them explicitly instead of dropping geometry. The native serializer uses the same shared validator and needs no new IPC field.

### Freehand source and simplification

**Freehand path** captures one pointer stroke on an empty preview, sampling points at least one source pixel apart and retaining the final endpoint when the 256-point cap allows. At the cap, the tool visibly reports that only the captured prefix remains. Keyboard users can enter X/Y coordinates, add numeric points and remove the last point. Generated path commands retain the existing numeric editor and keyboard handles.

Blue shows the sampled source and orange shows the proposed simplified polyline. The source/proposed counts and explicit geometry-loss disclosure precede **Create path**. Iterative Ramer–Douglas–Peucker simplification uses the chosen 0–32 source-pixel tolerance; zero retains every sampled point. The tool never silently raises tolerance or truncates commands to fit. More than 128 proposed commands disables creation until the user explicitly changes tolerance or points. Pointer sampling cannot reconstruct movement between samples.

The optional per-shape `freehand` recipe retains the original points and chosen tolerance alongside editable M/L commands. Later handle edits leave that source intact. **Regenerate path** explicitly replaces those edits from the source and remains undoable. Each recipe allows at most 256 points, the document at most 1024 retained source points, and the existing 32 KiB document and 512-command limits still apply. JSON import preserves source recipes and edited commands without resampling or simplification. Native SVG export uses the current generated/edited commands.

Uncreated freehand previews participate in state/shape-scoped draft protection and the existing close review. Active pointer capture reports busy; saved appearance cannot be applied while a freehand preview is unresolved. The Electron fixture draws a real pointer stroke, drives numeric keyboard creation, checks simplification counts, verifies close protection, regenerates and undoes to the previous retained source. Boolean paths, text outlines, warp and raster brushes remain unavailable.
