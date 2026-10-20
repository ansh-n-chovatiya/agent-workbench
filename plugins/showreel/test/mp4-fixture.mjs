// Minimal structural fixture: payload bytes are deliberately not encoded media.
export function box(type, ...parts) {
  const data = Buffer.concat(parts), b = Buffer.alloc(8 + data.length);
  b.writeUInt32BE(b.length); b.write(type, 4); data.copy(b, 8); return b;
}
export function fixture({ first = true, co64 = false, audio = true, edited = false, fragmented = false, duration = 483840, timescale = 48000, movieScale = 1000 } = {}) {
  const timing = (scale, duration) => { const b = Buffer.alloc(24); b.writeUInt32BE(scale, 12); b.writeUInt32BE(duration, 16); return b; };
  const track = handler => {
    const h = Buffer.alloc(25); h.write(handler, 8);
    const offsets = Buffer.alloc(co64 ? 16 : 12); offsets.writeUInt32BE(1, 4);
    const edit = Buffer.alloc(20); edit.writeUInt32BE(1, 4); edit.writeUInt32BE(9500, 8); edit.writeInt32BE(100, 12); edit.writeInt16BE(1, 16);
    const tkhd = Buffer.alloc(84); tkhd.writeUInt32BE(3, 0); tkhd.writeUInt32BE(handler === 'vide' ? 1 : 2, 12); tkhd.writeUInt32BE(10000, 20);
    return box('trak', box('tkhd', tkhd), ...(edited && handler === 'soun' ? [box('edts', box('elst', edit))] : []), box('mdia', box('mdhd', timing(timescale, duration)), box('hdlr', h), box('minf', box('stbl', box(co64 ? 'co64' : 'stco', offsets)))));
  };
  const ftyp = box('ftyp', Buffer.from('isom\0\0\0\0isom')), mdat = box('mdat', Buffer.alloc(128, 0xa5));
  const moov = box('moov', box('mvhd', timing(movieScale, 10000), Buffer.alloc(76)), track('vide'), ...(audio ? [track('soun')] : []), ...(fragmented ? [box('mvex')] : []));
  const bytes = Buffer.concat(first ? [ftyp, moov, mdat] : [ftyp, mdat, moov]);
  const offset = ftyp.length + (first ? moov.length : 0) + 8;
  // Locate known offset table signatures without importing the parser under test.
  for (let i = 4; i < bytes.length - 12; i++) if (bytes.toString('ascii', i, i + 4) === (co64 ? 'co64' : 'stco')) {
    if (co64) bytes.writeBigUInt64BE(BigInt(offset), i + 12); else bytes.writeUInt32BE(offset, i + 12);
  }
  return bytes;
}
