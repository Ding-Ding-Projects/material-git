import {applyTheme, argbFromHex, hexFromArgb, themeFromSourceColor} from '@material/material-color-utilities';

/** Material 3 tonal surfaces are newer than the legacy Scheme export. */
export function applyMaterialTheme(seed: string, dark: boolean, target: HTMLElement) {
  const theme = themeFromSourceColor(argbFromHex(seed));
  applyTheme(theme, {target, dark});
  const tones = dark
    ? {surface: 6, 'surface-dim': 6, 'surface-bright': 24, 'surface-container-lowest': 4, 'surface-container-low': 10, 'surface-container': 12, 'surface-container-high': 17, 'surface-container-highest': 22}
    : {surface: 98, 'surface-dim': 87, 'surface-bright': 98, 'surface-container-lowest': 100, 'surface-container-low': 96, 'surface-container': 94, 'surface-container-high': 92, 'surface-container-highest': 90};
  for (const [role, tone] of Object.entries(tones)) {
    target.style.setProperty(`--md-sys-color-${role}`, hexFromArgb(theme.palettes.neutral.tone(tone)));
  }
}
