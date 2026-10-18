import { test } from 'node:test';
import assert from 'node:assert/strict';
import { THEMES } from '../scripts/lib/compose/themes.mjs';
test('themes contain drawing tokens and are deeply frozen', () => {
  assert.deepEqual(Object.keys(THEMES), ['clean', 'dark']);
  for (const [name, theme] of Object.entries(THEMES)) {
    assert.equal(theme.name, name); assert.equal(theme.font, 'Inter');
    assert.equal(theme.background.type, 'gradient'); assert.equal(theme.background.colors.length, 2);
    for (const key of ['frame', 'cursor', 'ripple', 'caption', 'card']) assert.ok(theme[key]);
    assert.equal(Object.isFrozen(theme.background.colors), true);
    assert.throws(() => { theme.background.colors.push('#000000'); });
  }
  assert.deepEqual(THEMES.clean.background.colors, ['#eef2f7', '#dbe4f0']);
  assert.deepEqual(THEMES.dark.background.colors, ['#0b1220', '#172033']);
  assert.equal(THEMES.clean.card.titleColor, '#111827');
  assert.equal(THEMES.clean.caption.background, 'rgba(17,24,39,0.86)');
});
