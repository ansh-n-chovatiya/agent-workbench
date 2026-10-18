import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTimeMap, sourceAt, outputAt } from '../scripts/lib/compose/timemap.mjs';
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
test('identity, trims, speeds, rates and half-open boundaries', () => {
  const identity = buildTimeMap({ duration: 10 });
  for (let x = 0; x <= 10; x += 0.125) near(identity.toSource(x).t, x);
  assert.equal(buildTimeMap({ duration: 10, trims: [{ start: 2, end: 4 }] }).outputDuration, 8);
  const map = buildTimeMap({ duration: 10, speeds: [{ start: 2, end: 6, rate: 2 }] });
  assert.equal(map.outputDuration, 8);
  assert.equal(map.toSource(3).rate, 2);
  near(map.toSource(2 - 1e-10).t, 2);
  near(map.toSource(2 + 1e-10).t, 2);
  const trim = buildTimeMap({ duration: 10, trims: [{ start: 2, end: 4 }] });
  assert.equal(trim.toOutput(2), null);
  assert.equal(trim.toOutput(3), null);
  assert.equal(trim.toOutput(4), 2);
  assert.equal(trim.toSource(2).t, 4);
  assert.equal(trim.toSource(-1).t, 0);
  assert.equal(trim.toSource(20).t, 10);
});
test('cards and crossfades prefer main and clamp source time', () => {
  const map = buildTimeMap({ duration: 5, lead: 2, tail: 2, fade: 0.4, trims: [{ start: 0, end: 1 }] });
  near(map.mainStart, 1.6); near(map.mainEnd, 5.6); near(map.outroStart, 5.2); near(map.outputDuration, 7.2);
  assert.deepEqual(map.toSource(0), { t: 1, rate: 1, section: 'title', alphaTitle: 1, alphaOutro: 0 });
  assert.equal(map.toSource(1.8).section, 'main'); near(map.toSource(1.8).alphaTitle, 0.5);
  near(map.toSource(5.4).alphaOutro, 0.5);
  assert.equal(map.toSource(7).section, 'outro'); assert.equal(map.toSource(7).t, 5);
  const json = JSON.parse(JSON.stringify(map));
  assert.deepEqual(sourceAt(json, 3), map.toSource(3)); near(outputAt(json, 3), map.toOutput(3));
});
test('seeded edits round trip, stay monotone, and account for every removed/speed-adjusted second', () => {
  let seed = 123456;
  const rand = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 2 ** 32);
  for (let run = 0; run < 100; run++) {
    const trims = [], speeds = [];
    for (let start = 1; start < 19; start += 2) {
      const end = start + 0.1 + rand() * 0.8;
      if (rand() < 0.5) trims.push({ start, end }); else speeds.push({ start, end, rate: 0.25 + rand() * 7.75 });
    }
    const map = buildTimeMap({ duration: 20, trims, speeds, lead: 2, tail: 2, fade: 0.4 });
    const expected = 20 - trims.reduce((s, r) => s + r.end - r.start, 0) - speeds.reduce((s, r) => s + (r.end - r.start) * (1 - 1 / r.rate), 0);
    near(map.mainEnd - map.mainStart, expected);
    let prev = -Infinity;
    for (let n = 0; n < 300; n++) {
      const t = map.mainStart + (map.mainEnd - map.mainStart) * n / 300;
      const source = map.toSource(t).t;
      assert.ok(source >= prev); prev = source;
      near(map.toOutput(source), t);
    }
  }
});
test('invalid edits report their index, and inputs remain unchanged', () => {
  for (const edits of [
    { trims: [{ start: -1, end: 2 }] }, { trims: [{ start: 2, end: 2 }] },
    { trims: [{ start: 0, end: 3 }, { start: 2, end: 4 }] },
    { trims: [{ start: 4, end: 5 }, { start: 1, end: 2 }] },
    { speeds: [{ start: 0, end: 11, rate: 2 }] }, { speeds: [{ start: 0, end: 1, rate: 0.24 }] },
    { speeds: [{ start: 0, end: 1, rate: NaN }] },
    { trims: [{ start: 1, end: 3 }], speeds: [{ start: 2, end: 4, rate: 2 }] },
  ]) assert.throws(() => buildTimeMap({ duration: 10, ...edits }), /\[\d+\]/);
  for (const value of [-1, NaN, Infinity]) assert.throws(() => buildTimeMap({ duration: value }));
  const input = { duration: 5, trims: [{ start: 1, end: 2 }], speeds: [{ start: 3, end: 4, rate: 2 }] };
  const before = structuredClone(input); buildTimeMap(input); assert.deepEqual(input, before);
});
test('zero duration, fully trimmed source, trailing trim, and very short cards remain finite', () => {
  for (const input of [{ duration: 0 }, { duration: 3, trims: [{ start: 0, end: 3 }] }, { duration: 0.1, lead: 0.1, tail: 0.1, fade: 0.4 }]) {
    const map = buildTimeMap(input);
    assert.ok(map.outputDuration >= 0);
    for (const t of [0, map.outputDuration]) assert.ok(Number.isFinite(map.toSource(t).t));
  }
  const short = buildTimeMap({ duration: 0.1, lead: 1, fade: 0.4 });
  assert.equal(short.toSource(0.8).section, 'title');
  assert.equal(short.toSource(0.8).alphaOutro, 0);
  assert.equal(buildTimeMap({ duration: 3, trims: [{ start: 2, end: 3 }] }).toOutput(3), null);
});
