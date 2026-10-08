# Element appearance and portable themes

Open an element’s appearance action to edit its stable design identifier. The editor supports normal, hover, focus, pressed, selected, disabled, dragged, validation, loading, success, warning and error states. Normal values inherit naturally through CSS; other states retain explicit overrides. Temporary scheduled appearance merges above the local base and disappears without rewriting the base cache. Styles are installed in the element’s actual document or shadow root, so nested components are not skipped.

Typography includes family, free numeric size and slider, weight, style, underline/strikethrough, letter spacing, line height and alignment. Installed families come from the native font inventory with an honest system fallback. Colour entry accepts hexadecimal, RGB and HSL with bounded channels, palettes, recent colours and a text/background contrast readout. The readout explicitly assumes opaque colours; it does not claim to validate arbitrary image backgrounds or alpha-composited output.

Each state holds up to 32 ordered named layers with groups, visibility, edit locks, duplicate, rename, reorder and reset. CSS composition supports solid and image fills, linear/radial/conic gradients, stripes, dots and checker patterns, blend modes, borders, outlines, multiple shadows, glows, filters and backdrop blur. Geometry includes numeric dimensions, spacing, corner shape, rotation, translation, scale, skew, perspective and transform origin. Rectangular, elliptical and SVG path clipping are non-destructive. Local PNG/JPEG/WebP fills are decoded and converted to a bounded local PNG; SVG, animation and external image URLs are refused.

The searchable inspector uses the application regex builder. Property, layer, state, element and global reset, undo/redo, local style copy/paste, named themes and JSON import/export are available. Every commit retains a bounded local history snapshot and exports use appearance schema version 2; version-1 element exports remain readable. The cache is validated as a whole, unknown fields and unsafe CSS choices are rejected, and an invalid import changes nothing. Global reset clears saved element appearances; scheduled overrides continue until their rules are disabled.

The capability disclosure names platform limits: pixel channels, brush painting, freehand sampling, mesh warp and smart-object editing need a raster/vector document engine. The current editor operates on DOM CSS composition; these tools are not implemented or claimed. Layer groups are labels for organization, not nested raster documents. This is a real reversible CSS editor, and it does not satisfy Photoshop raster-tool parity.

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
| Raster/vector document tools | Existing CSS fills, masks, transforms and layers | Channels, brush painting, color-range/freehand selections, smart objects, mesh warp, guides and a full document compositor remain unavailable |
| Complete parity | No claim of complete Word/Photoshop parity | Live variable-axis discovery, every-property localization, global rainbow color animation and platform-specific evidence remain open |

The component browser test uses a clearly labeled local fixture and a fixture font bridge. It does not establish provider permissions, Windows installation, native font enumeration or the final integrated app's behavior. No fixture image belongs in the product gallery.
