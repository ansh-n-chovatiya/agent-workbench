import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_BRIEF } from '../scripts/lib/brief.mjs';
import { buildComposition, changeComposition, resolveComposition, validateComposition } from '../scripts/lib/compose/composition.mjs';

function base() {
  const brief = { ...structuredClone(DEFAULT_BRIEF), topic: 'Demo' };
  const events = { viewport: { width: 1280, height: 720 }, scale: 1, steps: [], targets: [], cursor: [], clicks: [], keys: [] };
  return buildComposition({ brief, storyboard: { steps: [] }, events, record: { runId: 'r1', durationSec: 5, scale: { used: 1 } } });
}
test('switching theme brings the new theme card text, caption and frame look', () => {
  // A composition that froze the clean theme's resolved values, like an older saved file.
  const frozen = { ...JSON.parse(JSON.stringify(resolveComposition({ theme: 'clean' }))), run: { id: 'r1' }, theme: 'clean' };
  frozen.cards.title.title = 'Demo'; frozen.cards.outro.text = 'Thanks';
  const bold = resolveComposition(changeComposition(frozen, 'theme', 'bold'));
  assert.equal(bold.cards.title.titleColor, '#ffffff', 'bold card text is white on the gradient');
  assert.deepEqual(bold.cards.title.background.colors, ['#6d28d9', '#ea3788']);
  assert.equal(bold.captions.fontWeight, 700);
  assert.equal(validateComposition(changeComposition(frozen, 'theme', 'bold')).ok, true);
});
test('values the person chose by hand survive a theme switch', () => {
  let c = changeComposition(base(), 'cards.title.titleColor', '#ff0000');
  c = changeComposition(c, 'theme', 'bold');
  assert.equal(resolveComposition(c).cards.title.titleColor, '#ff0000');
  assert.equal(resolveComposition(c).cards.outro.titleColor, '#ffffff');
});
