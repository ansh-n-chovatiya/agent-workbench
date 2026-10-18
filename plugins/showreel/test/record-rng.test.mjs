import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashString, mulberry32, rngFor } from '../scripts/lib/record/rng.mjs';

test('FNV-1a matches published ASCII vectors and returns unsigned words', () => {
  for (const [input, expected] of [['', 0x811c9dc5], ['a', 0xe40c292c], ['foobar', 0xbf9cf968]]) {
    assert.equal(hashString(input), expected);
  }
  for (let i = 0; i < 256; i++) {
    const hash = hashString(`s${i}:0`);
    assert.ok(Number.isInteger(hash) && hash >= 0 && hash <= 0xffffffff);
  }
});

test('mulberry32 has a known stream and seeded streams repeat in [0,1)', () => {
  const known = mulberry32(1);
  assert.deepEqual([known(), known(), known()], [
    0.6270739405881613, 0.002735721180215478, 0.5274470399599522,
  ]);
  const streams = new Set();
  for (let i = 0; i < 256; i++) {
    const key = `s${i}:2`;
    const a = rngFor(key), b = rngFor(key), c = mulberry32(hashString(key));
    const values = Array.from({ length: 100 }, () => a());
    assert.ok(values.every((value) => value >= 0 && value < 1));
    assert.deepEqual(values, Array.from({ length: 100 }, () => b()));
    assert.deepEqual(values, Array.from({ length: 100 }, () => c()));
    streams.add(JSON.stringify(values));
  }
  assert.equal(streams.size, 256);
});
