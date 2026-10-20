import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm, readdir, open } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { alignAudioTrack, parseBoxes, mp4Metadata, chunkOffsets, readMp4Metadata } from '../scripts/lib/mp4-align.mjs';
import { child } from '../scripts/lib/mp4-boxes.mjs';
import { fixture, box } from './mp4-fixture.mjs';
const options = { primingSamples: 2112, videoDurationSec: 10 };
for (const first of [true, false]) for (const co64 of [false, true]) for (const edited of [false, true]) {
  test(`aligns ${first ? 'leading' : 'trailing'} moov; co64=${co64}; replace=${edited}`, async () => {
    const before = fixture({ first, co64, edited }), snapshot = Buffer.from(before);
    const result = await alignAudioTrack(before, options);
    assert.equal(result.aligned, true, result.reason); assert.deepEqual(before, snapshot);
    const after = result.buffer, meta = mp4Metadata(after), original = mp4Metadata(before);
    const a = meta.tracks.find(t => t.handler === 'soun'), old = original.tracks.find(t => t.handler === 'soun');
    assert.deepEqual(a.edits, [{ segmentDuration: 10000, mediaTime: 2112 }]);
    const elst = child(child(a.trak, 'edts'), 'elst');
    assert.equal(after.readInt16BE(elst.data + 16), 1); assert.equal(after.readInt16BE(elst.data + 18), 0);
    assert.equal(a.trak.size - old.trak.size, edited ? 0 : 36);
    assert.equal(after.readUInt32BE(child(a.trak, 'tkhd').data + 20), 10000);
    assert.equal(meta.moov.size - original.moov.size, after.length - before.length);
    assert.equal(a.trak.children.findIndex(b => b.type === 'edts') + 1, a.trak.children.findIndex(b => b.type === 'mdia'));
    assert.deepEqual(chunkOffsets(after).map(e => e.offset), chunkOffsets(before).map(e => e.offset + (first ? after.length - before.length : 0)));
    const mdat = parseBoxes(after).find(b => b.type === 'mdat');
    assert.deepEqual(after.subarray(mdat.data, mdat.end), Buffer.alloc(128, 0xa5), 'media payload preserved');
    assert.deepEqual((await alignAudioTrack(after, options)).buffer, after, 'idempotent');
  });
}
test('caps duration at available media after priming and uses version 1 when needed', async () => {
  const short = await alignAudioTrack(fixture({ duration: 480000 }), options);
  assert.equal(mp4Metadata(short.buffer).tracks[1].edits[0].segmentDuration, 9956);
  const long = await alignAudioTrack(fixture({ duration: 0xffffffff, timescale: 1, movieScale: 2 }), { primingSamples: 0x80000000, videoDurationSec: 2147483647 });
  assert.equal(long.aligned, true, long.reason);
  const a = mp4Metadata(long.buffer).tracks[1];
  assert.equal(long.buffer[child(child(a.trak, 'edts'), 'elst').data], 1);
  assert.deepEqual(a.edits, [{ mediaTime: 0x80000000, segmentDuration: 4294967294 }]);
});
test('no audio, fragments, corrupt inputs, invalid offsets/options remain unchanged', async () => {
  const badOffset = fixture(); const entry = chunkOffsets(badOffset)[0]; badOffset.writeUInt32BE(badOffset.length, entry.position);
  for (const [input, pattern] of [[fixture({ audio: false }), /No audio/], [fixture({ fragmented: true }), /Fragmented/], [Buffer.concat([fixture(), box('moof')]), /Fragmented/], [fixture().subarray(0, -1), /size/], [Buffer.alloc(4), /Truncated/], [badOffset, /offset/]]) {
    const snapshot = Buffer.from(input), result = await alignAudioTrack(input, options);
    assert.equal(result.aligned, false); assert.match(result.reason, pattern); assert.deepEqual(result.buffer, snapshot); assert.deepEqual(input, snapshot);
  }
  assert.equal((await alignAudioTrack(fixture(), { ...options, primingSamples: -1 })).aligned, false);
});
test('file writes are atomic, reparsed, idempotent, and failures preserve original', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'showreel-align-'));
  try {
    const file = path.join(dir, 'video.mp4');
    for (const first of [true, false]) {
      const input = fixture({ first }); await writeFile(file, input);
      const expected = (await alignAudioTrack(input, options)).buffer;
      assert.equal((await alignAudioTrack(file, options)).aligned, true);
      assert.deepEqual(await readFile(file), expected);
      await alignAudioTrack(file, options); assert.deepEqual(await readFile(file), expected);
      assert.equal((await readMp4Metadata(file)).metadata.tracks[1].edits[0].mediaTime, 2112);
    }
    const broken = fixture().subarray(0, -2); await writeFile(file, broken);
    assert.equal((await alignAudioTrack(file, options)).aligned, false);
    assert.deepEqual(await readFile(file), broken); assert.deepEqual(await readdir(dir), ['video.mp4']);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('streams files at the 512 MiB threshold in both moov orders', { timeout: 120000 }, async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'showreel-align-large-'));
  try {
    const file = path.join(dir, 'large.mp4'), size = 512 * 1024 * 1024;
    for (const first of [true, false]) {
      const bytes = fixture({ first }), boxes = parseBoxes(bytes), mdat = boxes.find(b => b.type === 'mdat'), moov = boxes.find(b => b.type === 'moov');
      const expandedSize = size - bytes.length + mdat.size;
      const h = await open(file, 'w');
      try {
        await h.write(bytes.subarray(0, first ? mdat.data : mdat.start), 0, first ? mdat.data : mdat.start, 0);
        const header = Buffer.alloc(8); header.writeUInt32BE(expandedSize); header.write('mdat', 4);
        await h.write(header, 0, 8, mdat.start);
        if (!first) await h.write(bytes.subarray(moov.start, moov.end), 0, moov.size, mdat.start + expandedSize);
        await h.truncate(size);
      } finally { await h.close(); }
      const result = await alignAudioTrack(file, options);
      assert.equal(result.aligned, true, result.reason);
      const info = await readMp4Metadata(file);
      assert.equal(info.size, size + 36);
      assert.deepEqual(info.metadata.tracks[1].edits, [{ segmentDuration: 10000, mediaTime: 2112 }]);
      assert.deepEqual(chunkOffsets(info.bytes).map(e => e.offset), chunkOffsets(bytes).map(e => e.offset + (first ? 36 : 0)));
      await rm(file);
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});
