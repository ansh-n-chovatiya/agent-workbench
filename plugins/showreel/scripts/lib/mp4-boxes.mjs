// Shared, dependency-free ISO BMFF reader. Media payloads are never parsed.
const containers = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'edts', 'mvex']);
export function parseBoxes(bytes, start = 0, end = bytes.length) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), boxes = [];
  for (let at = start; at < end;) {
    if (end - at < 8) throw new Error('Truncated MP4 box header');
    let size = view.getUint32(at), header = 8;
    const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8));
    if (size === 1) { if (end - at < 16) throw new Error('Truncated extended box'); size = Number(view.getBigUint64(at + 8)); header = 16; }
    if (size === 0) size = end - at;
    if (!Number.isSafeInteger(size) || size < header || at + size > end) throw new Error(`Invalid ${type} box size`);
    const box = { type, start: at, end: at + size, size, header, data: at + header };
    if (containers.has(type)) box.children = parseBoxes(bytes, box.data, box.end);
    boxes.push(box); at += size;
  }
  return boxes;
}
export const child = (box, type) => box?.children?.find(b => b.type === type);
export function walkBoxes(boxes) { return boxes.flatMap(b => [b, ...walkBoxes(b.children ?? [])]); }
export function mp4Metadata(bytes, boxes = parseBoxes(bytes)) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u32 = (box, offset) => { if (!box || box.data + offset + 4 > box.end) throw new Error('Truncated MP4 metadata'); return view.getUint32(box.data + offset); };
  const timing = box => {
    const version = u32(box, 0) >>> 24;
    if (version > 1) throw new Error('Unsupported timing version');
    const timescale = u32(box, version ? 20 : 12);
    const duration = version ? (u32(box, 24) * 2 ** 32 + u32(box, 28)) : u32(box, 16);
    if (!timescale || !Number.isSafeInteger(duration)) throw new Error('Invalid MP4 timescale/duration');
    return { timescale, duration };
  };
  const moov = boxes.find(b => b.type === 'moov');
  if (!moov) throw new Error('Missing moov');
  const fragmented = boxes.some(b => b.type === 'moof') || !!child(moov, 'mvex');
  const movie = timing(child(moov, 'mvhd'));
  const tracks = (moov.children ?? []).filter(b => b.type === 'trak').map(trak => {
    const mdia = child(trak, 'mdia'), hdlr = child(mdia, 'hdlr');
    u32(hdlr, 8);
    const handler = String.fromCharCode(...bytes.subarray(hdlr.data + 8, hdlr.data + 12));
    const media = timing(child(mdia, 'mdhd')), elst = child(child(trak, 'edts'), 'elst');
    let edits = null;
    if (elst) {
      const version = u32(elst, 0) >>> 24, count = u32(elst, 4), width = version ? 20 : 12;
      if (version > 1 || count > (elst.size - elst.header - 8) / width) throw new Error('Invalid edit list');
      edits = Array.from({ length: count }, (_, i) => {
        const p = elst.data + 8 + i * width;
        return { segmentDuration: version ? Number(view.getBigUint64(p)) : view.getUint32(p), mediaTime: version ? Number(view.getBigInt64(p + 8)) : view.getInt32(p + 4) };
      });
    }
    return { trak, mdia, handler, ...media, edits };
  });
  return { moov, movie, tracks, fragmented };
}
export function chunkOffsets(bytes, boxes = parseBoxes(bytes)) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), entries = [];
  for (const b of walkBoxes(boxes).filter(b => ['stco', 'co64'].includes(b.type))) {
    if (b.end - b.data < 8) throw new Error('Truncated chunk table');
    const count = view.getUint32(b.data + 4), width = b.type === 'co64' ? 8 : 4;
    if (b.end - b.data !== 8 + count * width) throw new Error('Invalid chunk table');
    for (let i = 0; i < count; i++) {
      const position = b.data + 8 + i * width;
      const offset = width === 8 ? Number(view.getBigUint64(position)) : view.getUint32(position);
      if (!Number.isSafeInteger(offset)) throw new Error('Unsafe chunk offset');
      entries.push({ position, width, offset });
    }
  }
  return entries;
}
