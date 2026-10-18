import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RULE_HEADER, ACTION_NAME, validateAllowWrites } from '../scripts/lib/write-rules.mjs';

test('all inherited write-rule forms validate', () => {
  validateAllowWrites(['/path', 're:^/api/.*$', '/path [Next-Action=id]', '/path [Next-Action-Name=x]', '/path [header:x-y=z]', 're:^/api [header:content-type=application/json]'], 'config');
  assert.ok('/path [Next-Action=id]'.match(RULE_HEADER));
  assert.ok('/path [Next-Action-Name=x]'.match(ACTION_NAME));
});

test('malformed rules name the entry and the reason', () => {
  for (const rule of ['', null, 1, '/path [x=y]', '/path [Next-Action=]', '/path [Next-Action-Name=]', '/path [header:bad name=z]', ' [Next-Action=id]', 're:[']) {
    assert.throws(() => validateAllowWrites([rule], 'config'), /^Error: config: allowWrites entry /);
  }
  assert.throws(() => validateAllowWrites([' [header:x=y]'], 'config'), /needs a path before its header condition/);
  assert.throws(() => validateAllowWrites(['re:['], 'config'), /not a valid regex/);
  assert.throws(() => validateAllowWrites(['/path [x=y]'], 'config'), /must end in/);
});
