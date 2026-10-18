export async function writeChunk(file, data, position) {
  if (!Number.isSafeInteger(position) || position < 0) throw new Error('Invalid chunk position');
  let offset = 0;
  while (offset < data.length) {
    const result = await file.write(data, offset, data.length - offset, position + offset);
    if (!result.bytesWritten) throw new Error('Encoder write made no progress');
    offset += result.bytesWritten;
  }
  return position + data.length;
}
