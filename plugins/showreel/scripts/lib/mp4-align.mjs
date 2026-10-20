import { open, readFile, rename, rm, stat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { parseBoxes, mp4Metadata, chunkOffsets, child } from './mp4-boxes.mjs';
import { renameRetry } from './fs-retry.mjs';
export { parseBoxes, mp4Metadata, chunkOffsets } from './mp4-boxes.mjs';
function setDuration(bytes, node, value, offset0, offset1) {
  const version = bytes[node.data];
  if (version > 1 || !Number.isSafeInteger(value) || value < 0) throw new Error('Invalid presentation duration');
  const at = node.data + (version ? offset1 : offset0), width = version ? 8 : 4;
  if (at + width > node.end || (!version && value > 0xffffffff)) throw new Error('Presentation duration overflow');
  if (version) bytes.writeBigUInt64BE(BigInt(value), at); else bytes.writeUInt32BE(value, at);
}
const MEMORY_LIMIT = 512 * 1024 * 1024;
function box(type, data) {
  const b = Buffer.alloc(8 + data.length); b.writeUInt32BE(b.length); b.write(type, 4); data.copy(b, 8); return b;
}
function resize(bytes, node, delta) {
  if (node.header === 16) bytes.writeBigUInt64BE(BigInt(node.size + delta), node.start + 8);
  else { if (node.size + delta > 0xffffffff) throw new Error('Box size overflow'); bytes.writeUInt32BE(node.size + delta, node.start); }
}
function validate(bytes, top, fileSize) {
  const meta = mp4Metadata(bytes);
  for (const { offset } of chunkOffsets(bytes)) {
    if (offset >= fileSize || !top.some(b => b.type === 'mdat' && offset >= b.start + b.header && offset < b.end)) throw new Error('Chunk offset outside mdat');
  }
  return meta;
}
function patch(moovBytes, top, options) {
  if (top.filter(b => b.type === 'moov').length !== 1) throw new Error('Expected one moov');
  const meta = validate(moovBytes, top, top.at(-1).end);
  if (meta.fragmented || top.some(b => b.type === 'moof')) throw new Error('Fragmented MP4 skipped');
  const audio = meta.tracks.filter(t => t.handler === 'soun');
  if (!audio.length) throw new Error('No audio track');
  if (audio.length !== 1) throw new Error('Multiple audio tracks unsupported');
  const { primingSamples, videoDurationSec } = options;
  if (!Number.isSafeInteger(primingSamples) || primingSamples < 0 || !Number.isFinite(videoDurationSec) || videoDurationSec <= 0) throw new Error('Invalid alignment options');
  const a = audio[0], duration = Math.round(Math.min((a.duration - primingSamples) / a.timescale, videoDurationSec) * meta.movie.timescale);
  if (!Number.isSafeInteger(duration) || duration <= 0) throw new Error('Audio shorter than priming');
  const version = duration > 0xffffffff || primingSamples > 0x7fffffff ? 1 : 0;
  const entry = Buffer.alloc(version ? 28 : 20); entry[0] = version; entry.writeUInt32BE(1, 4);
  if (version) { entry.writeBigUInt64BE(BigInt(duration), 8); entry.writeBigInt64BE(BigInt(primingSamples), 16); entry.writeInt16BE(1, 24); }
  else { entry.writeUInt32BE(duration, 8); entry.writeInt32BE(primingSamples, 12); entry.writeInt16BE(1, 16); }
  const edts = box('edts', box('elst', entry));
  // Preserve any other edit-container metadata while replacing all prior edit lists.
  const existing = a.trak.children.filter(b => b.type === 'edts');
  const extras = existing.flatMap(b => b.children.filter(c => c.type !== 'elst').map(c => moovBytes.subarray(c.start, c.end)));
  const replacement = extras.length ? box('edts', Buffer.concat([edts.subarray(8), ...extras])) : edts;
  const parts = a.trak.children.filter(b => b.type !== 'edts');
  if (!child(a.trak, 'tkhd') || parts.findIndex(b => b.type === 'tkhd') > parts.findIndex(b => b.type === 'mdia')) throw new Error('Invalid track ordering');
  const body = Buffer.concat(parts.flatMap(b => b === a.mdia ? [replacement, moovBytes.subarray(b.start, b.end)] : [moovBytes.subarray(b.start, b.end)]));
  const delta = body.length - (a.trak.size - a.trak.header);
  const result = Buffer.concat([moovBytes.subarray(0, a.trak.data), body, moovBytes.subarray(a.trak.end)]);
  resize(result, a.trak, delta); resize(result, meta.moov, delta);
  // Presentation headers must agree with the edit to avoid a padded movie tail.
  const updated = mp4Metadata(result);
  setDuration(result, child(updated.tracks.find(t => t.handler === 'soun').trak, 'tkhd'), duration, 20, 28);
  setDuration(result, child(updated.moov, 'mvhd'), Math.round(videoDurationSec * meta.movie.timescale), 16, 24);
  const originalMoov = top.find(b => b.type === 'moov');
  for (const e of chunkOffsets(result)) {
    const offset = e.offset >= originalMoov.end ? e.offset + delta : e.offset;
    if (e.width === 4) { if (offset > 0xffffffff) throw new Error('stco overflow'); result.writeUInt32BE(offset, e.position); }
    else result.writeBigUInt64BE(BigInt(offset), e.position);
  }
  const shifted = top.map(b => b === originalMoov ? { ...b, size: b.size + delta, end: b.end + delta } : b.start >= originalMoov.end ? { ...b, start: b.start + delta, end: b.end + delta } : b);
  validate(result, shifted, top.at(-1).end + delta);
  return { bytes: result, aligned: true, primingSamples, durationSec: duration / meta.movie.timescale, delta };
}
async function readExactly(handle, length, position) {
  const bytes = Buffer.alloc(length); let at = 0;
  while (at < length) { const { bytesRead } = await handle.read(bytes, at, length - at, position + at); if (!bytesRead) throw new Error('Truncated MP4 file'); at += bytesRead; }
  return bytes;
}
// Read top-level headers and moov only, regardless of media size.
export async function readMp4Metadata(file) {
  const handle = await open(file, 'r');
  try {
    const { size } = await handle.stat(), top = [];
    for (let at = 0; at < size;) {
      const h = await readExactly(handle, Math.min(16, size - at), at);
      if (h.length < 8) throw new Error('Truncated MP4 box');
      let length = h.readUInt32BE(), header = 8;
      if (length === 1) { if (h.length < 16) throw new Error('Truncated extended box'); length = Number(h.readBigUInt64BE(8)); header = 16; }
      if (!length) length = size - at;
      if (!Number.isSafeInteger(length) || length < header || at + length > size) throw new Error('Invalid MP4 box size');
      top.push({ type: h.toString('ascii', 4, 8), start: at, end: at + length, size: length, header }); at += length;
    }
    const moovs = top.filter(b => b.type === 'moov');
    if (moovs.length !== 1) throw new Error('Expected one moov');
    const m = moovs[0], bytes = await readExactly(handle, m.size, m.start);
    return { bytes, top, size, metadata: validate(bytes, top, size) };
  } finally { await handle.close(); }
}
export async function alignAudioTrack(input, options) {
  let temp;
  try {
    if (Buffer.isBuffer(input) || input instanceof Uint8Array) {
      const bytes = Buffer.from(input), top = parseBoxes(bytes), moov = top.find(b => b.type === 'moov');
      if (!moov) throw new Error('Missing moov');
      const result = patch(bytes.subarray(moov.start, moov.end), top, options);
      const buffer = Buffer.concat([bytes.subarray(0, moov.start), result.bytes, bytes.subarray(moov.end)]);
      parseBoxes(buffer);
      return { ...result, bytes: undefined, buffer };
    }
    const info = await readMp4Metadata(input), result = patch(info.bytes, info.top, options);
    const moov = info.top.find(b => b.type === 'moov');
    temp = `${input}.${randomUUID()}.align.tmp`;
    let original, output;
    try {
      original = await open(input, 'r'); output = await open(temp, 'wx', (await stat(input)).mode);
      if (info.size < MEMORY_LIMIT) {
        const bytes = await readFile(input);
        await output.writeFile(Buffer.concat([bytes.subarray(0, moov.start), result.bytes, bytes.subarray(moov.end)]));
      } else {
        // Always stage in the same directory: even a trailing moov must survive write failures.
        const copy = async (start, end) => {
          for (let at = start; at < end; at += 1024 * 1024) await output.writeFile(await readExactly(original, Math.min(1024 * 1024, end - at), at));
        };
        await copy(0, moov.start); await output.writeFile(result.bytes); await copy(moov.end, info.size);
      }
      await output.sync();
    } finally { await Promise.all([original?.close(), output?.close()]); }
    await readMp4Metadata(temp);
    await renameRetry(temp, input); temp = null;
    return { ...result, bytes: undefined };
  } catch (error) { return { aligned: false, reason: error.message, ...((Buffer.isBuffer(input) || input instanceof Uint8Array) ? { buffer: input } : {}) }; }
  finally { if (temp) await rm(temp, { force: true }).catch(() => {}); }
}
