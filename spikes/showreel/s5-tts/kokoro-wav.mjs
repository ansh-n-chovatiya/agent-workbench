import { KokoroTTS } from 'kokoro-js';
const text = 'This dashboard shows every deployment at a glance. Click a service to see its latest build, its owner, and whether anything needs your attention today.';
const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' });
const audio = await tts.generate(text, { voice: 'af_heart' });
await audio.save('../scratch/s5/kokoro.wav');
console.log('saved');
process.exit(0);
