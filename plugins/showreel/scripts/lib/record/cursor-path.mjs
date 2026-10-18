import { rngFor } from './rng.mjs';

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const jerk = (t) => t ** 3 * (10 + t * (-15 + 6 * t));
const mix = (a, b, t) => a + (b - a) * t;

function bezier(a, b, c, d, t) {
  const u = 1 - t;
  return u ** 3 * a + 3 * u ** 2 * t * b + 3 * u * t ** 2 * c + t ** 3 * d;
}

export function planMove(from, to, { key, hz = 60 }) {
  if (!Number.isFinite(hz) || hz <= 0) throw new Error('hz must be a positive finite number');
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 2) return { durationMs: 0, samples: [{ t: 0, x: to.x, y: to.y }] };
  const rng = rngFor(key);
  const durationMs = clamp(180 + 110 * Math.log2(1 + distance / 40), 280, 1100)
    * (0.9 + 0.2 * rng());
  const ux = dx / distance;
  const uy = dy / distance;
  const overshoot = distance > 350 ? Math.min(18, 0.03 * distance) : 0;
  const target = { x: to.x + ux * overshoot, y: to.y + uy * overshoot };
  const control = (fraction) => {
    const offset = clamp(distance * 0.06 * (rng() * 2 - 1), -40, 40);
    return {
      x: mix(from.x, target.x, fraction) - uy * offset,
      y: mix(from.y, target.y, fraction) + ux * offset,
    };
  };
  const c1 = control(0.3);
  const c2 = control(0.7);
  const phases = [rng() * 2 * Math.PI, rng() * 2 * Math.PI];
  // Short moves need proportionately smaller tremor so it cannot dominate the motion.
  const amplitude = Math.min(0.6, distance * 0.01);
  const split = overshoot ? 0.88 : 1;
  function sample(t) {
    if (t === 0) return { t, x: from.x, y: from.y };
    if (t === durationMs) return { t, x: to.x, y: to.y };
    const tau = t / durationMs;
    let x, y;
    if (tau <= split) {
      const progress = jerk(tau / split);
      x = bezier(from.x, c1.x, c2.x, target.x, progress);
      y = bezier(from.y, c1.y, c2.y, target.y, progress);
    } else {
      const progress = jerk((tau - split) / (1 - split));
      x = mix(target.x, to.x, progress);
      y = mix(target.y, to.y, progress);
    }
    // Smooth ramps prevent a phase-dependent jump at either endpoint.
    const envelope = jerk(clamp(tau / 0.15, 0, 1))
      * jerk(clamp((1 - tau) / 0.15, 0, 1));
    const jitter = amplitude / 2 * envelope * (
      Math.sin(2 * Math.PI * tau + phases[0])
      + Math.sin(4 * Math.PI * tau + phases[1])
    );
    return { t, x: x - uy * jitter, y: y + ux * jitter };
  }
  const samples = [];
  for (let i = 0; i * 1000 / hz < durationMs; i++) samples.push(sample(i * 1000 / hz));
  samples.push(sample(durationMs));
  return { durationMs, samples };
}

const between = (key, low, high) => low + (high - low) * rngFor(key)();
export const dwellMs = (key) => between(key, 110, 230);
export const pressMs = (key) => between(key, 60, 110);
export const settleAfterClickMs = (key) => between(key, 250, 450);

export function typingDelays(text, { cps = 14, key }) {
  if (!Number.isFinite(cps) || cps <= 0) throw new Error('cps must be a positive finite number');
  const rng = rngFor(key);
  return Array.from(text, (character) => {
    let delay = 1000 / cps * (0.65 + 0.7 * rng());
    if (/[ ,.;:!?]/.test(character)) delay += 60 + 80 * rng();
    if (rng() < 0.03) delay += 150 + 150 * rng();
    return Math.max(25, delay);
  });
}

export function holdMs({ caption = '', narration, explicit }) {
  if (typeof explicit === 'number') {
    if (!Number.isFinite(explicit) || explicit < 0 || explicit > 10000) {
      throw new Error('explicit hold must be a number from 0 to 10000');
    }
    return explicit;
  }
  const words = narration?.trim() ? narration.trim().split(/\s+/).length : 0;
  return Math.min(15000, Math.max(1800, (caption?.length ?? 0) * 55, words * 400));
}

export function targetPoint(box, { key }) {
  if (box.w < 8 || box.h < 8) {
    return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
  }
  const rng = rngFor(key);
  const axis = (start, size) => {
    const inset = Math.max(4, size / 4);
    return start + inset + (size - 2 * inset) * rng();
  };
  return { x: axis(box.x, box.w), y: axis(box.y, box.h) };
}
