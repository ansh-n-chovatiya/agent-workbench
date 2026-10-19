// Pinned versions for the voice engine. Changing any value here changes cache keys or the install.
export const KOKORO_JS_VERSION = '1.2.1';
export const KOKORO_MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
export const KOKORO_DTYPE = 'q8';
export const KOKORO_MODEL_FILE = 'model_quantized.onnx';
// SHA-256 of the q8 model file. null until Claude measures it on a real install (then install records the computed hash).
export const KOKORO_Q8_SHA256 = 'fbae9257e1e05ffc727e951ef9b9c98418e6d79f1c9b6b13bd59f5c9028a1478'; // matches the LFS sha256 published by Hugging Face for onnx/model_quantized.onnx (92361116 bytes)
export const REQUIRED_DISK_BYTES = 400 * 1024 * 1024;
export const DEFAULT_VOICE = 'af_heart';
export const SAMPLE_TEXT = 'Hi, this is how I sound. A quick tour of your product starts now.';
export const SAMPLE_RATE = 24000;
export const REQUEST_TIMEOUT_MS = 120000;
export const FAKE_ENGINE = 'fake';
export const isFakeEngine = (env = process.env) => env.SHOWREEL_VOICE_ENGINE === FAKE_ENGINE;
