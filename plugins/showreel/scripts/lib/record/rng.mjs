export function hashString(s) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    hash = Math.imul(hash ^ s.charCodeAt(i), 0x01000193);
  }
  return hash >>> 0;
}

export function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export const rngFor = (key) => mulberry32(hashString(key));
