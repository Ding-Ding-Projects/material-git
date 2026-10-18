import test from 'node:test';
import assert from 'node:assert/strict';
import {argbFromHex, lstarFromArgb} from '@material/material-color-utilities';
import {applyMaterialTheme} from '../src/renderer/material-theme';

test('theme changes replace every tonal surface and retain readable theme foregrounds', () => {
  const values = new Map<string, string>();
  const target = {style: {setProperty: (name: string, value: string) => values.set(name, value)}} as unknown as HTMLElement;
  for (const dark of [true, false, true]) {
    applyMaterialTheme('#46b98b', dark, target);
    const tone = (role: string) => lstarFromArgb(argbFromHex(values.get(`--md-sys-color-${role}`)!));
    assert.ok(Math.abs(tone('surface') - (dark ? 6 : 98)) < .6);
    assert.ok(Math.abs(tone('surface-container') - (dark ? 12 : 94)) < .6);
    assert.ok(dark ? tone('surface-container-highest') > tone('surface-container-lowest') : tone('surface-container-highest') < tone('surface-container-lowest'));
    assert.ok(Math.abs(tone('on-surface') - tone('surface')) > 70);
  }
});
