import path from 'node:path';
import { HOME_DIR, projectDir } from '../paths.mjs';

// All voice state lives under SHOWREEL_HOME; callers write with atomicWrite below (temp file, then rename).
export const engineDir = () => path.join(HOME_DIR, 'engines', 'kokoro');
export const modelDir = () => path.join(HOME_DIR, 'models');
export const sampleDir = () => path.join(HOME_DIR, 'voice-samples');
export const projectVoiceDir = (name) => path.join(projectDir(name), 'voice');
export const clipsDir = (name) => path.join(projectVoiceDir(name), 'clips');
export const clipsIndexFile = (name) => path.join(projectVoiceDir(name), 'clips.json');
export const pronunciationsFile = (name) => path.join(projectVoiceDir(name), 'pronunciations.json');
export const clipFile = (name, key) => path.join(clipsDir(name), `${key}.wav`);
