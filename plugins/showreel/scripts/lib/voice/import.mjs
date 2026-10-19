import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { parseWav, encodeWav, MAX_WAV_BYTES } from './wav.mjs';
import { clipFile } from './paths.mjs';
import { atomicWrite } from './atomic.mjs';

const HINT = 'Only WAV files are accepted here (PCM 16/24/32-bit or 32-bit float, mono or stereo). The editor converts MP3, M4A, OGG and other formats; or convert with an audio tool first.';

// Pure: validates bytes and returns { wav: Buffer (16-bit PCM), durationSec, sampleRate, channels, key }.
export function convertImport(bytes, { maxBytes = MAX_WAV_BYTES } = {}) {
  let parsed;
  try { parsed = parseWav(bytes, { maxBytes }); }
  catch (err) { throw new Error(`${err.message}. ${HINT}`); }
  if (parsed.channels > 2) throw new Error(`Only mono or stereo WAV is supported (this file has ${parsed.channels} channels)`);
  if (parsed.frames < 1) throw new Error('The WAV file contains no audio');
  const wav = encodeWav(parsed.data, parsed.sampleRate);
  return { wav, durationSec: parsed.frames / parsed.sampleRate, sampleRate: parsed.sampleRate, channels: parsed.channels, key: createHash('sha256').update(wav).digest('hex') };
}
export async function importWavFile(name, file, { maxBytes = MAX_WAV_BYTES } = {}) {
  const st = await stat(file).catch(() => { throw new Error(`Cannot read ${file}`); });
  if (!st.isFile()) throw new Error(`${file} is not a file`);
  if (st.size > maxBytes) throw new Error(`${path.basename(file)} is too large (${st.size} bytes; limit ${maxBytes})`);
  if (!/\.wav$/i.test(file)) throw new Error(`${path.basename(file)} is not a .wav file. ${HINT}`);
  const result = convertImport(await readFile(file), { maxBytes });
  await atomicWrite(clipFile(name, result.key), result.wav);
  return result;
}
