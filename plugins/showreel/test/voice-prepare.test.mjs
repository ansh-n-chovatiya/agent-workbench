import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepareText, applyPronunciations, chunkText, clampSpeed, stripMarkdown } from '../scripts/lib/voice/prepare.mjs';

test('markdown is stripped and whitespace collapsed (CRLF safe)', () => {
  assert.equal(stripMarkdown('# Title\r\n**bold** and `code` [link](http://x.y)').trim(), 'Title\nbold and code link');
  const { segments } = prepareText('Hello   there\r\n\r\nworld.');
  assert.deepEqual(segments, [{ type: 'speech', text: 'Hello there world.' }]);
});
test('pronunciations are whole-word, case-insensitive, longest first, single pass', () => {
  const map = { SQL: 'sequel', 'SQL Server': 'sequel server', ui: 'you eye', a: 'ay' };
  assert.equal(applyPronunciations('Use SQL Server, sql, and UI. Squid; a cat', map), 'Use sequel server, sequel, and you eye. Squid; ay cat');
  assert.equal(applyPronunciations('x', { x: 'x.y', 'a.b': 'dot' }), 'x.y');
  assert.equal(applyPronunciations('a.b and aXb', { 'a.b': 'dot' }), 'dot and aXb');
  assert.equal(applyPronunciations('text', null), 'text');
});
test('captions are untouched: only the prepared text changes', () => {
  const caption = 'Open the API page';
  const { preparedText } = prepareText(caption, { pronunciations: { API: 'A P I' } });
  assert.equal(preparedText, 'Open the A P I page'); assert.equal(caption, 'Open the API page');
});
test('pause markers split speech and clamp to 0.1 to 3 seconds with warnings', () => {
  const { segments, warnings, preparedText } = prepareText('One. [pause 0.4] Two. [pause 9] Three [pause 0.01]');
  assert.deepEqual(segments.map((s) => s.type === 'speech' ? s.text : s.seconds), ['One.', 0.4, 'Two.', 3, 'Three', 0.1]);
  assert.equal(warnings.length, 2); assert.match(preparedText, /\[pause 0.4\]/);
  assert.deepEqual(prepareText('[pause 1]').segments, [{ type: 'silence', seconds: 1, explicit: true }]);
});
test('long text splits on sentence boundaries into chunks of at most 350 characters with 120 ms gaps', () => {
  const sentence = 'This is a reasonably long sentence about a dashboard. ';
  const text = sentence.repeat(20);
  const chunks = chunkText(text);
  assert.ok(chunks.length > 2); assert.ok(chunks.every((c) => c.length <= 350)); assert.ok(chunks.every((c) => c.endsWith('.')));
  const { segments } = prepareText(text);
  const gaps = segments.filter((s) => s.type === 'silence');
  assert.equal(gaps.length, chunks.length - 1); assert.ok(gaps.every((g) => g.seconds === 0.12 && !g.explicit));
});
test('a single over-long sentence is split on commas or spaces, and an unbroken word is hard-cut', () => {
  const long = Array.from({ length: 80 }, (_, i) => `word${i}`).join(' ') + '.';
  assert.ok(chunkText(long).every((c) => c.length <= 350));
  assert.deepEqual(chunkText('x'.repeat(800)).map((c) => c.length), [350, 350, 100]);
});
test('edge cases: empty, whitespace, only markers, unicode, no terminal punctuation', () => {
  assert.deepEqual(prepareText('').segments, []); assert.deepEqual(prepareText('   \n ').segments, []);
  assert.deepEqual(prepareText('Café déjà vu').segments, [{ type: 'speech', text: 'Café déjà vu' }]);
  assert.equal(prepareText(null).preparedText, '');
});
test('speed is clamped to 0.7 to 1.3 and defaults to 1', () => {
  assert.equal(clampSpeed(0.1), 0.7); assert.equal(clampSpeed(9), 1.3); assert.equal(clampSpeed(1.1), 1.1);
  assert.equal(clampSpeed('x'), 1); assert.equal(clampSpeed(undefined), 1);
});
